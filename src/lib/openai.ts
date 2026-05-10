import OpenAI from 'openai';
import type { AIFoodResult, MacroTargets } from './types';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string;

export async function analyzeFoodImage(
  imageBase64: string,
  mimeType: string
): Promise<AIFoodResult> {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 500,
    messages: [
      {
        role: 'system',
        content: 'Nutrition analyst. Return ONLY valid JSON, no other text.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: 'low',
            },
          },
          {
            type: 'text',
            text: 'Identify all food. Return JSON: {"items":[{"name":"string","weight_g":number,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}],"total_calories":number,"total_protein_g":number,"total_carbs_g":number,"total_fat_g":number}',
          },
        ],
      },
    ],
  });

  const text = response.choices[0].message.content ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Invalid AI response');
  return JSON.parse(match[0]) as AIFoodResult;
}

export async function analyzeFoodText(description: string): Promise<AIFoodResult> {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 500,
    messages: [
      {
        role: 'system',
        content: 'Nutrition analyst. Return ONLY valid JSON, no other text.',
      },
      {
        role: 'user',
        content: `Estimate nutrition for: "${description}". Return JSON: {"items":[{"name":"string","weight_g":number,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}],"total_calories":number,"total_protein_g":number,"total_carbs_g":number,"total_fat_g":number}`,
      },
    ],
  });

  const text = response.choices[0].message.content ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Invalid AI response');
  return JSON.parse(match[0]) as AIFoodResult;
}

export async function generateInsights(
  weekData: { date: string; calories: number; protein: number; carbs: number; fat: number }[],
  targets: MacroTargets
): Promise<string> {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const rows = weekData
    .filter(d => d.calories > 0)
    .map(d => `${d.date}: ${d.calories} cal, ${d.protein}g protein, ${d.carbs}g carbs, ${d.fat}g fat`)
    .join('\n');

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    messages: [
      {
        role: 'system',
        content: 'You are a friendly nutrition coach. Give 2-3 concise, actionable bullet points. Use plain text, no markdown.',
      },
      {
        role: 'user',
        content: `Daily targets: ${targets.calories} cal, ${targets.protein}g protein, ${targets.carbs}g carbs, ${targets.fat}g fat.\n\nThis week:\n${rows || 'No data logged.'}\n\nGive 2-3 short motivating insights about patterns and what to improve.`,
      },
    ],
  });

  return response.choices[0].message.content ?? 'No insights available.';
}
