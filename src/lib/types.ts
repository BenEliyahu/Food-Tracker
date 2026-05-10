export interface UserProfile {
  name: string;
  age: number;
  height: number;
  weight: number;
  sex: 'male' | 'female';
  activityLevel: number;
  goal: 'lose' | 'maintain' | 'gain';
  goalWeight?: number;
  apiKey?: string;
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodItem {
  name: string;
  weight_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface AIFoodResult {
  items: FoodItem[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

export interface MealEntry {
  id: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: FoodItem[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  imageUrl?: string;
  timestamp: number;
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface WaterLog {
  date: string;
  glasses: number;
}

export interface FavoriteMeal {
  id: string;
  label: string;
  items: FoodItem[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  savedAt: number;
}

export type TabType = 'dashboard' | 'scan' | 'log' | 'charts' | 'profile';
