import type { AIFoodResult } from './types';

export async function lookupBarcode(barcode: string): Promise<AIFoodResult | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  const n = p.nutriments ?? {};
  const g = 100;

  const cal = Math.round(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0);
  const protein = Math.round((n['proteins_100g'] ?? 0) * 10) / 10;
  const carbs = Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10;
  const fat = Math.round((n['fat_100g'] ?? 0) * 10) / 10;

  if (!cal && !protein && !carbs && !fat) return null;

  const name = p.product_name || p.generic_name || 'Unknown product';

  return {
    items: [{ name, weight_g: g, calories: cal, protein_g: protein, carbs_g: carbs, fat_g: fat }],
    total_calories: cal,
    total_protein_g: protein,
    total_carbs_g: carbs,
    total_fat_g: fat,
  };
}
