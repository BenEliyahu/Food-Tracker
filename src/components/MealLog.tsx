import { useState, useEffect } from 'react';
import type { MealEntry } from '../lib/types';
import * as db from '../lib/db';
import { toast } from '../lib/toast';

interface Props {
  uid: string;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: '☀️ Breakfast',
  lunch: '🌤️ Lunch',
  dinner: '🌙 Dinner',
  snack: '🍎 Snacks',
};

const ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

function Skeleton({ className }: { className: string }) {
  return <div className={`skeleton ${className}`} />;
}

export default function MealLog({ uid }: Props) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setMeals(await db.getMealsByDate(uid, date));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [date, uid]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this meal?')) return;
    setDeleting(id);
    try {
      await db.deleteMeal(uid, id);
      setMeals(prev => prev.filter(m => m.id !== id));
      toast('Meal deleted');
    } catch {
      toast('Failed to delete', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const grouped = meals.reduce((acc, m) => {
    if (!acc[m.mealType]) acc[m.mealType] = [];
    acc[m.mealType].push(m);
    return acc;
  }, {} as Record<string, MealEntry[]>);

  const totalCal = meals.reduce((s, m) => s + m.total_calories, 0);

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      <div className="bg-emerald-500 text-white px-4 pt-10 pb-6">
        <h1 className="text-2xl font-bold">📋 Meal Log</h1>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="mt-2 bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-sm border border-emerald-400"
        />
      </div>

      <div className="mx-4 mt-4 space-y-3">
        {totalCal > 0 && !loading && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center pop-in">
            <span className="text-emerald-700 font-semibold">Total: {totalCal} calories</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : (
          ORDER.map(type => (
            <div key={type} className="bg-white rounded-2xl shadow-sm p-4">
              <h3 className="font-semibold text-gray-700 mb-2">{MEAL_LABELS[type]}</h3>
              {!grouped[type]?.length ? (
                <p className="text-gray-300 text-sm">Nothing logged</p>
              ) : (
                <div className="space-y-2">
                  {grouped[type].map(meal => (
                    <div
                      key={meal.id}
                      className={`border border-gray-100 rounded-xl p-3 transition-opacity ${
                        deleting === meal.id ? 'opacity-40' : 'opacity-100'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          {meal.items.map((item, i) => (
                            <div key={i} className="text-sm flex justify-between">
                              <span className="font-medium text-gray-700 truncate">{item.name}</span>
                              <span className="text-gray-400 text-xs ml-2 whitespace-nowrap">
                                {item.weight_g}g · {item.calories} cal
                              </span>
                            </div>
                          ))}
                          <div className="text-xs text-gray-400 mt-1">
                            🥩 {meal.total_protein_g}g · 🍞 {meal.total_carbs_g}g · 🧈 {meal.total_fat_g}g
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="font-bold text-emerald-600 text-sm">{meal.total_calories} cal</span>
                          <button
                            onClick={() => handleDelete(meal.id)}
                            disabled={deleting === meal.id}
                            className="text-red-300 hover:text-red-500 transition-colors text-xs disabled:opacity-40"
                          >
                            {deleting === meal.id ? '...' : '🗑️ Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
