import type { AIFoodResult, MacroTargets } from './types';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

async function chat(messages: object[], maxTokens = 500): Promise<string> {
  if (!apiKey) throw new Error('OpenAI API key not configured (VITE_OPENAI_API_KEY missing)');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: maxTokens,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message ?? `HTTP ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return (data.choices[0].message.content as string) ?? '';
}

function parseJSON(text: string): AIFoodResult {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI returned invalid JSON');
  return JSON.parse(match[0]) as AIFoodResult;
}

const FOOD_SCHEMA =
  'Return JSON: {"items":[{"name":"string","weight_g":number,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}],"total_calories":number,"total_protein_g":number,"total_carbs_g":number,"total_fat_g":number}';

export async function analyzeFoodImage(imageBase64: string, mimeType: string): Promise<AIFoodResult> {
  const text = await chat([
    { role: 'system', content: 'Nutrition analyst. Return ONLY valid JSON, no other text.' },
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'low' } },
        { type: 'text', text: `Identify all food. ${FOOD_SCHEMA}` },
      ],
    },
  ]);
  return parseJSON(text);
}

export async function analyzeFoodText(description: string): Promise<AIFoodResult> {
  const text = await chat([
    { role: 'system', content: 'Nutrition analyst. Return ONLY valid JSON, no other text.' },
    { role: 'user', content: `Estimate nutrition for: "${description}". ${FOOD_SCHEMA}` },
  ]);
  return parseJSON(text);
}

export async function generateInsights(
  weekData: { date: string; calories: number; protein: number; carbs: number; fat: number }[],
  targets: MacroTargets
): Promise<string> {
  const rows = weekData
    .filter(d => d.calories > 0)
    .map(d => `${d.date}: ${d.calories} cal, ${d.protein}g P, ${d.carbs}g C, ${d.fat}g F`)
    .join('\n');

  return chat(
    [
      {
        role: 'system',
        content: 'You are a friendly nutrition coach. Give 2-3 concise, actionable bullet points. Use plain text, no markdown.',
      },
      {
        role: 'user',
        content: `Targets: ${targets.calories} cal, ${targets.protein}g P, ${targets.carbs}g C, ${targets.fat}g F.\n\nThis week:\n${rows || 'No data.'}\n\nGive 2-3 short motivating insights.`,
      },
    ],
    300
  );
}
