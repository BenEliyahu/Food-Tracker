import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile, MealEntry, WeightEntry, FavoriteMeal } from './types';

const userDoc = (uid: string) => doc(db, 'users', uid);
const subCol = (uid: string, name: string) => collection(db, 'users', uid, name);
const subDoc = (uid: string, col: string, id: string) => doc(db, 'users', uid, col, id);

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(userDoc(uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function saveProfile(uid: string, profile: UserProfile): Promise<void> {
  await setDoc(userDoc(uid), profile, { merge: true });
}

export async function getMeals(uid: string): Promise<MealEntry[]> {
  const snap = await getDocs(subCol(uid, 'meals'));
  return snap.docs.map(d => d.data() as MealEntry);
}

export async function getMealsByDate(uid: string, date: string): Promise<MealEntry[]> {
  const meals = await getMeals(uid);
  return meals.filter(m => m.date === date);
}

export async function saveMeal(uid: string, meal: MealEntry): Promise<void> {
  await setDoc(subDoc(uid, 'meals', meal.id), meal);
}

export async function deleteMeal(uid: string, id: string): Promise<void> {
  await deleteDoc(subDoc(uid, 'meals', id));
}

export async function getWeightLog(uid: string): Promise<WeightEntry[]> {
  const snap = await getDocs(subCol(uid, 'weight'));
  return snap.docs
    .map(d => d.data() as WeightEntry)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function addWeight(uid: string, entry: WeightEntry): Promise<void> {
  await setDoc(subDoc(uid, 'weight', entry.date), entry);
}

export async function getWaterByDate(uid: string, date: string): Promise<number> {
  const snap = await getDoc(subDoc(uid, 'water', date));
  return snap.exists() ? (snap.data().glasses as number) : 0;
}

export async function setWater(uid: string, date: string, glasses: number): Promise<void> {
  await setDoc(subDoc(uid, 'water', date), { glasses });
}

export async function getFavorites(uid: string): Promise<FavoriteMeal[]> {
  const snap = await getDocs(subCol(uid, 'favorites'));
  return snap.docs
    .map(d => d.data() as FavoriteMeal)
    .sort((a, b) => b.savedAt - a.savedAt);
}

export async function saveFavorite(uid: string, fav: FavoriteMeal): Promise<void> {
  await setDoc(subDoc(uid, 'favorites', fav.id), fav);
}

export async function deleteFavorite(uid: string, id: string): Promise<void> {
  await deleteDoc(subDoc(uid, 'favorites', id));
}
