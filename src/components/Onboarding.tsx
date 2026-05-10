import { useState } from 'react';
import type { UserProfile } from '../lib/types';
import { ACTIVITY_LABELS } from '../lib/calculations';
import { toast } from '../lib/toast';

interface Props {
  onComplete: (profile: UserProfile) => void;
}

const STEPS = ['Welcome', 'Personal Info', 'Activity', 'Goal'];

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [form, setForm] = useState<Partial<UserProfile>>({
    sex: 'male',
    activityLevel: 1.55,
    goal: 'maintain',
  });

  const setField = (key: keyof UserProfile, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-500 to-emerald-700 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl">
        <div className="flex gap-1 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-emerald-500' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="text-center">
            <div className="text-6xl mb-4">🥗</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Food Tracker AI</h1>
            <p className="text-gray-500 mb-6 text-sm">Snap your food and track calories intelligently with AI</p>
            <label className="block text-left text-sm text-gray-500 mb-1">What's your name?</label>
            <input
              className="w-full border border-gray-200 rounded-xl p-3 mb-4 text-gray-800"
              placeholder="Your name"
              value={form.name ?? ''}
              onChange={e => setField('name', e.target.value)}
            />
            <button
              disabled={!form.name?.trim()}
              onClick={next}
              className="w-full bg-emerald-500 text-white py-3 rounded-xl font-semibold disabled:opacity-40 transition-opacity"
            >
              Get Started →
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Personal Info</h2>
            <div className="flex gap-3 mb-4">
              {(['male', 'female'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setField('sex', s)}
                  className={`flex-1 py-2.5 rounded-xl border-2 font-medium transition-colors text-sm ${
                    form.sex === s
                      ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {s === 'male' ? '👨 Male' : '👩 Female'}
                </button>
              ))}
            </div>
            {[
              { label: 'Age', key: 'age', placeholder: '25', type: 'number', step: '1' },
              { label: 'Height (cm)', key: 'height', placeholder: '175', type: 'number', step: '1' },
              { label: 'Weight (kg)', key: 'weight', placeholder: '70', type: 'number', step: '0.1' },
            ].map(f => (
              <div key={f.key} className="mb-3">
                <label className="block text-sm text-gray-500 mb-1">{f.label}</label>
                <input
                  type={f.type}
                  step={f.step}
                  placeholder={f.placeholder}
                  value={(form as Record<string, unknown>)[f.key] as string ?? ''}
                  onChange={e => setField(f.key as keyof UserProfile, Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl p-3 text-gray-800"
                />
              </div>
            ))}
            <div className="flex gap-3 mt-4">
              <button onClick={back} className="flex-1 border border-gray-200 text-gray-500 py-3 rounded-xl">Back</button>
              <button
                disabled={!form.age || !form.height || !form.weight}
                onClick={next}
                className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-semibold disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Activity Level</h2>
            <div className="space-y-2 mb-4">
              {Object.entries(ACTIVITY_LABELS).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setField('activityLevel', Number(val))}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-colors text-sm ${
                    form.activityLevel === Number(val)
                      ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={back} className="flex-1 border border-gray-200 text-gray-500 py-3 rounded-xl">Back</button>
              <button onClick={next} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-semibold">Next →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">My Goal</h2>
            <div className="space-y-3 mb-4">
              {[
                { id: 'lose', label: '⬇️ Lose Weight', sub: '500 cal/day deficit' },
                { id: 'maintain', label: '⚖️ Maintain Weight', sub: 'Based on TDEE' },
                { id: 'gain', label: '⬆️ Build Muscle', sub: '300 cal/day surplus' },
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => setField('goal', g.id)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                    form.goal === g.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium text-gray-800">{g.label}</div>
                  <div className="text-xs text-gray-400">{g.sub}</div>
                </button>
              ))}
            </div>
            {form.goal !== 'maintain' && (
              <div className="mb-4">
                <label className="block text-sm text-gray-500 mb-1">Target weight (kg)</label>
                <input
                  type="number" step="0.1"
                  placeholder={String(form.weight ?? 70)}
                  value={form.goalWeight ?? ''}
                  onChange={e => setField('goalWeight', Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl p-3 text-gray-800"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={back} className="flex-1 border border-gray-200 text-gray-500 py-3 rounded-xl">Back</button>
              <button
                disabled={finishing}
                onClick={() => {
                  setFinishing(true);
                  toast('Welcome! Setting up your profile...', 'info');
                  onComplete(form as UserProfile);
                }}
                className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {finishing
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Setting up...</>
                  : 'Finish 🎉'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
