import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ReferenceLine,
} from 'recharts';
import type { UserProfile } from '../lib/types';
import { calculateTargets } from '../lib/calculations';
import { generateInsights } from '../lib/openai';
import * as db from '../lib/db';

interface Props {
  uid: string;
  profile: UserProfile;
}

interface DayData {
  date: string;
  day: string;
  Calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
}

export default function WeeklyChart({ uid, profile }: Props) {
  const targets = calculateTargets(profile);
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [weightData, setWeightData] = useState<{ date: string; Weight: number }[]>([]);
  const [avgCal, setAvgCal] = useState(0);
  const [trackedDays, setTrackedDays] = useState(0);
  const [insights, setInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    const days = getLast7Days();
    Promise.all(days.map(date => db.getMealsByDate(uid, date))).then(results => {
      const data: DayData[] = results.map((meals, i) => ({
        date: days[i],
        day: DAYS[new Date(days[i] + 'T12:00:00').getDay()],
        Calories: meals.reduce((s, m) => s + m.total_calories, 0),
        protein: meals.reduce((s, m) => s + m.total_protein_g, 0),
        carbs: meals.reduce((s, m) => s + m.total_carbs_g, 0),
        fat: meals.reduce((s, m) => s + m.total_fat_g, 0),
      }));
      setWeekData(data);
      const active = data.filter(d => d.Calories > 0);
      setTrackedDays(active.length);
      setAvgCal(active.length ? Math.round(active.reduce((s, d) => s + d.Calories, 0) / active.length) : 0);
    });

    db.getWeightLog(uid).then(log => {
      setWeightData(log.slice(-14).map(e => ({ date: e.date.slice(5), Weight: e.weight })));
    });
  }, [uid]);

  const handleGetInsights = async () => {
    setLoadingInsights(true);
    setInsights(null);
    try {
      const insightData = weekData.map(d => ({
        date: d.date,
        calories: d.Calories,
        protein: Math.round(d.protein),
        carbs: Math.round(d.carbs),
        fat: Math.round(d.fat),
      }));
      const text = await generateInsights(insightData, targets);
      setInsights(text);
    } catch {
      setInsights('Could not generate insights. Check your API key has credits.');
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      <div className="bg-emerald-500 text-white px-4 pt-10 pb-6">
        <h1 className="text-2xl font-bold">📊 Statistics</h1>
        <p className="text-emerald-100 text-sm">Last 7 days</p>
      </div>

      <div className="mx-4 mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
            <div className="text-2xl font-bold text-emerald-600">{avgCal || '—'}</div>
            <div className="text-xs text-gray-500">Avg cal/day</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
            <div className="text-2xl font-bold text-blue-500">{trackedDays}</div>
            <div className="text-xs text-gray-500">Days tracked</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-700 mb-4">🔥 Daily Calories</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekData} barSize={32} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v} cal`, 'Calories']} />
              <ReferenceLine y={targets.calories} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Goal', position: 'right', fontSize: 11, fill: '#10b981' }} />
              <Bar dataKey="Calories" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-center text-gray-400 mt-1">Dashed line = goal {targets.calories} cal</p>
        </div>

        {/* AI Insights */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">✨ AI Insights</h3>
            <button
              onClick={handleGetInsights}
              disabled={loadingInsights}
              className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl disabled:opacity-60 flex items-center gap-1.5 hover:bg-emerald-600 transition-colors"
            >
              {loadingInsights ? (
                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Thinking...</>
              ) : '🤖 Analyze week'}
            </button>
          </div>
          {insights ? (
            <div className="bg-emerald-50 rounded-xl p-3 pop-in">
              {insights.split('\n').filter(l => l.trim()).map((line, i) => (
                <p key={i} className="text-sm text-gray-700 leading-relaxed mb-1 last:mb-0">{line}</p>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-sm text-center py-3">
              {loadingInsights ? 'Analyzing your week...' : 'Tap the button to get personalized insights'}
            </p>
          )}
        </div>

        {weightData.length >= 2 ? (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-semibold text-gray-700 mb-4">⚖️ Weight Tracking</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weightData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                <Tooltip formatter={(v) => [`${v} kg`, 'Weight']} />
                <Line
                  type="monotone"
                  dataKey="Weight"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <p className="text-gray-300 text-sm py-4">Log your weight in Profile to see the chart</p>
          </div>
        )}
      </div>
    </div>
  );
}
