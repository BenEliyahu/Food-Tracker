import { useEffect, useState, useRef } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import type { UserProfile, MealEntry } from '../lib/types';
import { calculateTargets } from '../lib/calculations';
import * as db from '../lib/db';
import { toast } from '../lib/toast';
import Confetti from './Confetti';

interface Props {
  uid: string;
  profile: UserProfile;
}

function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const pct = Math.min(consumed / target, 1);
  const r = 72;
  const circ = 2 * Math.PI * r;
  const over = consumed > target;

  return (
    <div className="relative flex items-center justify-center w-44 h-44">
      <svg width="176" height="176" className="-rotate-90">
        <circle cx="88" cy="88" r={r} fill="none" stroke="#f0fdf4" strokeWidth="16" />
        <circle
          cx="88" cy="88" r={r} fill="none"
          stroke={over ? '#ef4444' : '#10b981'}
          strokeWidth="16"
          strokeDasharray={`${pct * circ} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold text-gray-800">{consumed}</div>
        <div className="text-xs text-gray-400">of</div>
        <div className="text-sm font-semibold text-gray-500">{target}</div>
      </div>
    </div>
  );
}

function MacroBar({ label, current, target, color }: {
  label: string; current: number; target: number; color: string;
}) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{Math.round(current)}g / {target}g</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%`, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </div>
    </div>
  );
}

function Skeleton({ className }: { className: string }) {
  return <div className={`skeleton ${className}`} />;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: '☀️ Breakfast',
  lunch: '🌤️ Lunch',
  dinner: '🌙 Dinner',
  snack: '🍎 Snack',
};

const MACRO_COLORS = ['#60a5fa', '#fbbf24', '#fb7185'];

function calcStreak(allMeals: MealEntry[]): number {
  const dates = new Set(allMeals.map(m => m.date));
  let streak = 0;
  const d = new Date();
  const todayStr = d.toISOString().split('T')[0];
  if (!dates.has(todayStr)) d.setDate(d.getDate() - 1);
  while (true) {
    const s = d.toISOString().split('T')[0];
    if (!dates.has(s)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export default function Dashboard({ uid, profile }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const targets = calculateTargets(profile);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [water, setWaterState] = useState(0);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [recentMeals, setRecentMeals] = useState<MealEntry[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const prevCalRef = useRef(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      db.getMealsByDate(uid, today).then(setMeals),
      db.getWaterByDate(uid, today).then(setWaterState),
      db.getMeals(uid).then(all => {
        setStreak(calcStreak(all));
        const past = all
          .filter(m => m.date !== today)
          .sort((a, b) => b.timestamp - a.timestamp);
        const seen = new Set<string>();
        const unique: MealEntry[] = [];
        for (const m of past) {
          const key = m.items.map(i => i.name).join(',');
          if (!seen.has(key)) { seen.add(key); unique.push(m); }
          if (unique.length >= 4) break;
        }
        setRecentMeals(unique);
      }),
    ]).finally(() => setLoading(false));
  }, [uid, today]);

  const consumed = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.total_calories,
      protein: acc.protein + m.total_protein_g,
      carbs: acc.carbs + m.total_carbs_g,
      fat: acc.fat + m.total_fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Confetti when goal is first hit
  useEffect(() => {
    if (!loading && consumed.calories >= targets.calories && prevCalRef.current < targets.calories) {
      setShowConfetti(true);
    }
    if (!loading) prevCalRef.current = consumed.calories;
  }, [consumed.calories, targets.calories, loading]);

  const remaining = targets.calories - consumed.calories;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const handleWater = async (i: number) => {
    const newVal = i < water ? i : i + 1;
    setWaterState(newVal);
    await db.setWater(uid, today, newVal);
  };

  const handleQuickAdd = async (meal: MealEntry) => {
    setAddingId(meal.id);
    try {
      const newMeal: MealEntry = {
        ...meal,
        id: String(Date.now()),
        date: today,
        timestamp: Date.now(),
      };
      await db.saveMeal(uid, newMeal);
      setMeals(prev => [...prev, newMeal]);
      toast(`Added ${meal.total_calories} cal!`);
    } catch {
      toast('Failed to add', 'error');
    } finally {
      setAddingId(null);
    }
  };

  const macroDonut = consumed.calories > 0
    ? [
        { name: 'P', value: Math.round(consumed.protein * 4), color: MACRO_COLORS[0] },
        { name: 'C', value: Math.round(consumed.carbs * 4), color: MACRO_COLORS[1] },
        { name: 'F', value: Math.round(consumed.fat * 9), color: MACRO_COLORS[2] },
      ].filter(d => d.value > 0)
    : null;

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      <div className="bg-emerald-500 text-white px-4 pt-10 pb-8 flex justify-between items-start">
        <div>
          <p className="text-emerald-100 text-sm">{greeting},</p>
          <h1 className="text-2xl font-bold">{profile.name} 👋</h1>
        </div>
        {streak > 0 && (
          <div className="bg-white/20 rounded-2xl px-3 py-2 text-center min-w-[56px]">
            <div className="text-xl font-bold">🔥 {streak}</div>
            <div className="text-emerald-100 text-xs">{streak === 1 ? 'day' : 'days'}</div>
          </div>
        )}
      </div>

      {/* Calorie card */}
      <div className="mx-4 -mt-5 bg-white rounded-2xl shadow-sm p-4 mb-4">
        {loading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Skeleton className="w-44 h-44 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-16 mx-auto" />
                <Skeleton className="h-3 w-24 mx-auto" />
                <Skeleton className="h-3 w-20 mx-auto" />
              </div>
            </div>
            <Skeleton className="h-2 w-full mt-2" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <CalorieRing consumed={consumed.calories} target={targets.calories} />
              <div className="flex-1 space-y-1 text-center">
                <div className={`text-2xl font-bold pop-in ${remaining >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {Math.abs(remaining)}
                </div>
                <div className="text-xs text-gray-400">{remaining >= 0 ? 'calories left' : 'calories over'}</div>
                <div className="text-xs text-gray-300">————</div>
                <div className="text-sm text-gray-500">eaten <strong>{consumed.calories}</strong></div>
                <div className="text-sm text-gray-500">goal <strong>{targets.calories}</strong></div>
              </div>
            </div>

            {/* Macro bars + donut */}
            <div className="mt-4 border-t border-gray-50 pt-4 flex items-center gap-3">
              {macroDonut ? (
                <div className="shrink-0">
                  <PieChart width={80} height={80}>
                    <Pie
                      data={macroDonut}
                      cx={36} cy={36}
                      innerRadius={22} outerRadius={38}
                      dataKey="value"
                      paddingAngle={2}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {macroDonut.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                  <div className="flex gap-1.5 justify-center -mt-1">
                    {[['P', MACRO_COLORS[0]], ['C', MACRO_COLORS[1]], ['F', MACRO_COLORS[2]]].map(([l, c]) => (
                      <span key={l} className="text-[10px] font-semibold" style={{ color: c }}>{l}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="w-[80px] h-[80px] shrink-0 rounded-full border-[10px] border-gray-100" />
              )}
              <div className="flex-1 space-y-2.5 min-w-0">
                <MacroBar label="🥩 Protein" current={consumed.protein} target={targets.protein} color="bg-blue-400" />
                <MacroBar label="🍞 Carbs" current={consumed.carbs} target={targets.carbs} color="bg-amber-400" />
                <MacroBar label="🧈 Fat" current={consumed.fat} target={targets.fat} color="bg-rose-400" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Water */}
      <div className="mx-4 bg-white rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <span className="font-semibold text-gray-700">💧 Water</span>
          <span className="text-sm text-gray-400">{water * 250} ml / 2000 ml</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <button
              key={i}
              onClick={() => handleWater(i)}
              className={`flex-1 h-8 rounded-lg transition-all duration-300 ${
                i < water ? 'bg-blue-400 scale-y-100' : 'bg-gray-100'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">{water} / 8 glasses</p>
      </div>

      {/* Quick Re-add */}
      {!loading && recentMeals.length > 0 && (
        <div className="mx-4 bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">⚡ Quick Add</h3>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {recentMeals.map(meal => (
              <button
                key={meal.id}
                onClick={() => handleQuickAdd(meal)}
                disabled={addingId === meal.id}
                className="shrink-0 bg-gray-50 rounded-xl p-2.5 text-left border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 transition-all disabled:opacity-50 w-28"
              >
                <p className="text-xs font-semibold text-gray-700 truncate leading-tight">
                  {meal.items[0]?.name ?? 'Meal'}
                </p>
                {meal.items.length > 1 && (
                  <p className="text-[10px] text-gray-400 truncate">+{meal.items.length - 1} more</p>
                )}
                <p className="text-emerald-600 font-bold text-sm mt-1">{meal.total_calories}</p>
                <p className="text-[10px] text-gray-400">cal</p>
                <div className="mt-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-lg py-0.5 text-center">
                  {addingId === meal.id ? '...' : '+ Add'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Today's Meals */}
      <div className="mx-4 bg-white rounded-2xl shadow-sm p-4">
        <h3 className="font-semibold text-gray-700 mb-3">🍽️ Today's Meals</h3>
        {loading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : meals.length === 0 ? (
          <p className="text-gray-300 text-sm text-center py-6">No meals logged yet<br />Tap 📷 to scan food</p>
        ) : (
          <div className="space-y-2">
            {meals.map(m => (
              <div key={m.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm font-medium text-gray-700">{MEAL_LABELS[m.mealType]}</span>
                  <div className="text-xs text-gray-400">{m.items.map(i => i.name).join(', ')}</div>
                </div>
                <span className="font-bold text-emerald-600 text-sm">{m.total_calories} cal</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
