import type { UserProfile, MacroTargets } from './types';

export function calculateBMR(p: UserProfile): number {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export function calculateTDEE(p: UserProfile): number {
  return Math.round(calculateBMR(p) * p.activityLevel);
}

export function calculateTargets(p: UserProfile): MacroTargets {
  const tdee = calculateTDEE(p);
  let cal = tdee;
  if (p.goal === 'lose') cal = tdee - 500;
  if (p.goal === 'gain') cal = tdee + 300;
  cal = Math.max(1200, cal);

  return {
    calories: Math.round(cal),
    protein: Math.round((cal * 0.30) / 4),
    carbs: Math.round((cal * 0.40) / 4),
    fat: Math.round((cal * 0.30) / 9),
  };
}

export function calculateBMI(p: UserProfile): number {
  const hm = p.height / 100;
  return Math.round((p.weight / (hm * hm)) * 10) / 10;
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export const ACTIVITY_LABELS: Record<number, string> = {
  1.2: 'Sedentary (little or no exercise)',
  1.375: 'Light (1-3x/week)',
  1.55: 'Moderate (3-5x/week)',
  1.725: 'Active (6-7x/week)',
  1.9: 'Very active (twice/day)',
};
