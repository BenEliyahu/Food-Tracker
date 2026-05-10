import { useState, useRef, useEffect } from 'react';
import type { AIFoodResult, MealEntry, FavoriteMeal } from '../lib/types';
import { analyzeFoodImage, analyzeFoodText } from '../lib/openai';
import * as db from '../lib/db';
import { toast } from '../lib/toast';
import BarcodeScanner from './BarcodeScanner';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type Mode = 'photo' | 'manual' | 'barcode';

interface Props {
  uid: string;
  onMealAdded: () => void;
}

const MEAL_OPTIONS: [MealType, string][] = [
  ['breakfast', '☀️ Breakfast'],
  ['lunch', '🌤️ Lunch'],
  ['dinner', '🌙 Dinner'],
  ['snack', '🍎 Snack'],
];

export default function FoodScanner({ uid, onMealAdded }: Props) {
  const [mode, setMode] = useState<Mode>('photo');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState('image/jpeg');
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AIFoodResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('lunch');
  const [showBarcode, setShowBarcode] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([]);
  const [savingFav, setSavingFav] = useState(false);
  const [addingFavId, setAddingFavId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.getFavorites(uid).then(setFavorites).catch(() => {});
  }, [uid]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      const rawBase64 = dataUrl.split(',')[1];
      const mime = file.type || 'image/jpeg';

      // Resize to max 1024px and re-encode as JPEG to keep payload under ~500 KB
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.82).split(',')[1];
        setImageBase64(compressed);
        setImageMime('image/jpeg');
        setResult(null);
        setError(null);
      };
      img.onerror = () => {
        // Fallback: use original if canvas fails
        setImageBase64(rawBase64);
        setImageMime(mime);
        setResult(null);
        setError(null);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setResult(null);
    setError(null);
    setImageBase64(null);
    setTextInput('');
  };

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      let data: AIFoodResult;
      if (mode === 'photo' && imageBase64) {
        data = await analyzeFoodImage(imageBase64, imageMime);
      } else if (mode === 'manual' && textInput.trim()) {
        data = await analyzeFoodText(textInput.trim());
      } else return;
      setResult(data);
      toast('Analysis complete!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Analysis error:', msg);
      setError(`Analysis failed: ${msg}`);
      toast('Analysis failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addToLog = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const meal: MealEntry = {
        id: String(Date.now()),
        date: today,
        mealType: selectedMeal,
        items: result.items,
        total_calories: result.total_calories,
        total_protein_g: result.total_protein_g,
        total_carbs_g: result.total_carbs_g,
        total_fat_g: result.total_fat_g,
        timestamp: Date.now(),
      };
      await db.saveMeal(uid, meal);
      toast(`Added ${result.total_calories} cal to your log!`);
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setImageBase64(null);
        setTextInput('');
        setResult(null);
        setSaveSuccess(false);
        onMealAdded();
      }, 1200);
    } catch {
      toast('Failed to save meal', 'error');
      setSaving(false);
    }
  };

  const handleSaveFavorite = async () => {
    if (!result) return;
    setSavingFav(true);
    try {
      const label = result.items[0]?.name ?? 'Meal';
      const fav: FavoriteMeal = {
        id: String(Date.now()),
        label,
        items: result.items,
        total_calories: result.total_calories,
        total_protein_g: result.total_protein_g,
        total_carbs_g: result.total_carbs_g,
        total_fat_g: result.total_fat_g,
        savedAt: Date.now(),
      };
      await db.saveFavorite(uid, fav);
      setFavorites(prev => [fav, ...prev]);
      toast('Saved to favorites!');
    } catch {
      toast('Failed to save favorite', 'error');
    } finally {
      setSavingFav(false);
    }
  };

  const handleAddFavorite = async (fav: FavoriteMeal) => {
    setAddingFavId(fav.id);
    try {
      const today = new Date().toISOString().split('T')[0];
      const meal: MealEntry = {
        id: String(Date.now()),
        date: today,
        mealType: selectedMeal,
        items: fav.items,
        total_calories: fav.total_calories,
        total_protein_g: fav.total_protein_g,
        total_carbs_g: fav.total_carbs_g,
        total_fat_g: fav.total_fat_g,
        timestamp: Date.now(),
      };
      await db.saveMeal(uid, meal);
      toast(`Added ${fav.total_calories} cal!`);
      onMealAdded();
    } catch {
      toast('Failed to add', 'error');
    } finally {
      setAddingFavId(null);
    }
  };

  const handleDeleteFavorite = async (id: string) => {
    await db.deleteFavorite(uid, id);
    setFavorites(prev => prev.filter(f => f.id !== id));
    toast('Removed from favorites');
  };

  const reset = () => {
    setImageBase64(null);
    setTextInput('');
    setResult(null);
    setError(null);
  };

  const handleBarcodeResult = (barcodeResult: AIFoodResult) => {
    setShowBarcode(false);
    setResult(barcodeResult);
    toast('Product found!');
  };

  const canAnalyze = mode === 'photo' ? !!imageBase64 : textInput.trim().length > 2;

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      {showBarcode && (
        <BarcodeScanner
          onResult={handleBarcodeResult}
          onClose={() => setShowBarcode(false)}
        />
      )}

      <div className="bg-emerald-500 text-white px-4 pt-10 pb-6">
        <h1 className="text-2xl font-bold">🍽️ Log Food</h1>
        <p className="text-emerald-100 text-sm">Photo, barcode, or manual entry</p>
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

      <div className="mx-4 mt-4 space-y-4">

        {/* Favorites quick-add */}
        {!result && favorites.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-semibold text-gray-700 mb-3">⭐ Favorites</h3>
            <div className="space-y-2">
              {favorites.map(fav => (
                <div key={fav.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{fav.label}</p>
                    <p className="text-xs text-gray-400">{fav.total_calories} cal · {fav.total_protein_g}g P · {fav.total_carbs_g}g C · {fav.total_fat_g}g F</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleAddFavorite(fav)}
                      disabled={addingFavId === fav.id}
                      className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60"
                    >
                      {addingFavId === fav.id ? '...' : '+ Add'}
                    </button>
                    <button
                      onClick={() => handleDeleteFavorite(fav.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-sm px-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mode toggle */}
        {!result && (
          <div className="bg-white rounded-2xl p-1.5 flex shadow-sm gap-1">
            {([['photo', '📷', 'Photo'], ['barcode', '🔵', 'Barcode'], ['manual', '✏️', 'Manual']] as [Mode, string, string][]).map(([m, icon, label]) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-0.5 ${
                  mode === m ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Photo mode */}
        {mode === 'photo' && !result && (
          !imageBase64 ? (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => cameraRef.current?.click()}
                className="bg-white rounded-2xl border-2 border-dashed border-emerald-200 hover:border-emerald-400 hover:shadow-md transition-all py-10 flex flex-col items-center gap-2">
                <span className="text-4xl">📸</span>
                <span className="text-sm font-medium text-gray-600">Take Photo</span>
              </button>
              <button onClick={() => galleryRef.current?.click()}
                className="bg-white rounded-2xl border-2 border-dashed border-emerald-200 hover:border-emerald-400 hover:shadow-md transition-all py-10 flex flex-col items-center gap-2">
                <span className="text-4xl">🖼️</span>
                <span className="text-sm font-medium text-gray-600">From Gallery</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <img src={`data:${imageMime};base64,${imageBase64}`} className="max-h-56 w-full object-contain p-2" alt="food" />
            </div>
          )
        )}

        {/* Barcode mode */}
        {mode === 'barcode' && !result && (
          <button
            onClick={() => setShowBarcode(true)}
            className="w-full bg-white rounded-2xl border-2 border-dashed border-emerald-200 hover:border-emerald-400 hover:shadow-md transition-all py-14 flex flex-col items-center gap-3"
          >
            <span className="text-5xl">🔵</span>
            <div className="text-center">
              <p className="text-gray-700 font-semibold">Scan Barcode</p>
              <p className="text-gray-400 text-sm mt-1">Opens camera to scan product barcode</p>
            </div>
          </button>
        )}

        {/* Manual mode */}
        {mode === 'manual' && !result && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-600 block mb-2">What did you eat?</label>
            <textarea
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder={'e.g. 150g grilled chicken, 1 cup white rice, side salad'}
              rows={4}
              className="w-full border border-gray-200 rounded-xl p-3 text-gray-800 text-sm resize-none focus:outline-none focus:border-emerald-400 transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1">Include amounts for more accurate results</p>
          </div>
        )}

        {/* Analyze button */}
        {!result && canAnalyze && (
          <button onClick={analyze} disabled={loading}
            className="w-full bg-emerald-500 text-white py-3.5 rounded-xl font-semibold disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm hover:bg-emerald-600 transition-colors">
            {loading ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyzing with AI...</>
            ) : '🔍 Analyze with AI'}
          </button>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">{error}</div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-white rounded-2xl shadow-sm p-4 pop-in">
            <h3 className="font-bold text-gray-800 mb-3">Results 🎯</h3>
            <div className="space-y-2.5 mb-4">
              {result.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0">
                  <div className="flex-1 mr-2">
                    <div className="font-medium text-gray-700">{item.name}</div>
                    <div className="text-xs text-gray-400">
                      {item.weight_g}g · protein {item.protein_g}g · carbs {item.carbs_g}g · fat {item.fat_g}g
                    </div>
                  </div>
                  <span className="font-bold text-emerald-600 whitespace-nowrap">{item.calories} cal</span>
                </div>
              ))}
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-700">Total Calories</span>
                <span className="text-2xl font-bold text-emerald-600">{result.total_calories}</span>
              </div>
              <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
                <span>🥩 {result.total_protein_g}g protein</span>
                <span>🍞 {result.total_carbs_g}g carbs</span>
                <span>🧈 {result.total_fat_g}g fat</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-2">Add to meal:</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {MEAL_OPTIONS.map(([id, label]) => (
                <button key={id} onClick={() => setSelectedMeal(id)}
                  className={`py-2 rounded-xl text-xs font-medium transition-all ${
                    selectedMeal === id ? 'bg-emerald-500 text-white shadow-sm scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={addToLog} disabled={saving || saveSuccess}
              className={`w-full py-3 rounded-xl font-semibold mb-2 disabled:opacity-80 flex items-center justify-center gap-2 transition-all ${
                saveSuccess ? 'bg-green-500 text-white scale-[1.02]' : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}>
              {saving
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                : saveSuccess
                  ? '✅ Added!'
                  : '✅ Add to Log'}
            </button>
            <button
              onClick={handleSaveFavorite}
              disabled={savingFav}
              className="w-full bg-amber-50 text-amber-600 border border-amber-200 py-2.5 rounded-xl font-semibold mb-2 text-sm disabled:opacity-60 hover:bg-amber-100 transition-colors"
            >
              {savingFav ? '...' : '⭐ Save as Favorite'}
            </button>
            <button onClick={reset} className="w-full text-gray-400 text-sm py-2 hover:text-gray-600 transition-colors">
              Start over
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
