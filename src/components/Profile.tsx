import { useState } from 'react';
import type { UserProfile } from '../lib/types';
import {
  calculateBMI, calculateBMR, calculateTDEE,
  calculateTargets, getBMICategory, ACTIVITY_LABELS,
} from '../lib/calculations';
import * as db from '../lib/db';
import { toast } from '../lib/toast';

interface Props {
  uid: string;
  profile: UserProfile;
  onUpdate: (p: UserProfile) => void;
  onSignOut: () => void;
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />;
}

export default function Profile({ uid, profile, onUpdate, onSignOut }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile);
  const [weightInput, setWeightInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingWeight, setSavingWeight] = useState(false);

  const bmi = calculateBMI(profile);
  const bmr = Math.round(calculateBMR(profile));
  const tdee = calculateTDEE(profile);
  const targets = calculateTargets(profile);

  const save = async () => {
    setSaving(true);
    try {
      await db.saveProfile(uid, form);
      onUpdate(form);
      setEditing(false);
      toast('Profile saved!');
    } catch {
      toast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const logWeight = async () => {
    const w = parseFloat(weightInput);
    if (!w || w < 20 || w > 300) return;
    setSavingWeight(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await db.addWeight(uid, { date: today, weight: w });
      const updated = { ...profile, weight: w };
      await db.saveProfile(uid, updated);
      onUpdate(updated);
      setWeightInput('');
      toast(`Weight updated: ${w} kg`);
    } catch {
      toast('Failed to save weight', 'error');
    } finally {
      setSavingWeight(false);
    }
  };

  if (editing) {
    return (
      <div className="pb-24 bg-gray-50 min-h-screen">
        <div className="bg-emerald-500 text-white px-4 pt-10 pb-6">
          <h1 className="text-2xl font-bold">✏️ Edit Profile</h1>
        </div>
        <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm p-4 space-y-4">
          {[
            { label: 'Name', key: 'name', type: 'text', step: undefined },
            { label: 'Age', key: 'age', type: 'number', step: '1' },
            { label: 'Height (cm)', key: 'height', type: 'number', step: '1' },
            { label: 'Weight (kg)', key: 'weight', type: 'number', step: '0.1' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-sm text-gray-500 block mb-1">{f.label}</label>
              <input
                type={f.type}
                step={f.step}
                value={(form as unknown as Record<string, unknown>)[f.key] as string ?? ''}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                  }))
                }
                className="w-full border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
          ))}

          <div>
            <label className="text-sm text-gray-500 block mb-2">Activity Level</label>
            <div className="space-y-1.5">
              {Object.entries(ACTIVITY_LABELS).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, activityLevel: Number(val) }))}
                  className={`w-full text-left px-3 py-2 rounded-xl border-2 text-sm transition-all ${
                    form.activityLevel === Number(val)
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-500 block mb-2">Goal</label>
            <div className="space-y-1.5">
              {[
                { id: 'lose', label: '⬇️ Lose Weight', sub: '500 cal/day deficit' },
                { id: 'maintain', label: '⚖️ Maintain Weight', sub: 'Based on TDEE' },
                { id: 'gain', label: '⬆️ Build Muscle', sub: '300 cal/day surplus' },
              ].map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, goal: g.id as UserProfile['goal'] }))}
                  className={`w-full text-left px-3 py-2 rounded-xl border-2 transition-all ${
                    form.goal === g.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium text-gray-800 text-sm">{g.label}</div>
                  <div className="text-xs text-gray-400">{g.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setEditing(false)}
              className="flex-1 border border-gray-200 text-gray-500 py-3 rounded-xl transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <><Spinner /> Saving...</> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      <div className="bg-emerald-500 text-white px-4 pt-10 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          <p className="text-emerald-100 text-sm">
            {profile.sex === 'male' ? '👨 Male' : '👩 Female'} · {profile.age} yrs · {profile.height} cm
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="bg-white/20 hover:bg-white/30 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          ✏️ Edit
        </button>
      </div>

      <div className="mx-4 mt-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'BMI', value: bmi, sub: getBMICategory(bmi) },
            { label: 'BMR', value: bmr, sub: 'base cal' },
            { label: 'TDEE', value: tdee, sub: 'total cal' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm p-3 text-center">
              <div className="text-xs text-gray-400 mb-0.5">{s.label}</div>
              <div className="text-xl font-bold text-gray-800">{s.value}</div>
              <div className="text-xs text-gray-400">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-700 mb-3">🎯 Daily Targets</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['🔥 Calories', `${targets.calories} cal`],
              ['🥩 Protein', `${targets.protein}g`],
              ['🍞 Carbs', `${targets.carbs}g`],
              ['🧈 Fat', `${targets.fat}g`],
            ].map(([label, val]) => (
              <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                <div className="text-xs text-gray-500">{label}</div>
                <div className="font-bold text-gray-800">{val}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-700 mb-3">⚖️ Log Today's Weight</h3>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              placeholder={`${profile.weight} kg`}
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:border-emerald-400 transition-colors"
            />
            <button
              onClick={logWeight}
              disabled={savingWeight}
              className="bg-emerald-500 text-white px-4 rounded-xl font-semibold disabled:opacity-60 flex items-center gap-1.5 min-w-[72px] justify-center"
            >
              {savingWeight ? <Spinner /> : 'Save'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Current weight</span>
            <span className="text-gray-700 font-medium">{profile.weight} kg</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Activity</span>
            <span className="text-gray-700 font-medium text-right text-xs">{ACTIVITY_LABELS[profile.activityLevel]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Goal</span>
            <span className="text-gray-700 font-medium">
              {{ lose: '⬇️ Lose Weight', maintain: '⚖️ Maintain', gain: '⬆️ Build Muscle' }[profile.goal]}
            </span>
          </div>
          {profile.goalWeight && (
            <div className="flex justify-between">
              <span className="text-gray-400">Target weight</span>
              <span className="text-gray-700 font-medium">{profile.goalWeight} kg</span>
            </div>
          )}
        </div>

        <button
          onClick={onSignOut}
          className="w-full border border-red-200 text-red-400 py-3 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
