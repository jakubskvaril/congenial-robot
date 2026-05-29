import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

export const config = { runtime: 'edge' };

const client = new Anthropic();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { url } = req.body as { url?: string };
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing url' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'API klíč není nastaven ve Vercelu' });
  }

  const prompt = `Jsi výživový poradce pro kočky. Analyzuj produkt z tohoto URL a vrať JSON (bez markdown bloků):
{
  "name": "název produktu",
  "brand": "výrobce",
  "meatPercent": číslo nebo null,
  "isKitten": boolean,
  "grainFree": boolean,
  "isComplete": boolean,
  "nutrients": {
    "protein": číslo (% vlhká hmota),
    "fat": číslo,
    "moisture": číslo,
    "ash": číslo nebo null,
    "fiber": číslo nebo null
  },
  "kcalPer100g": číslo,
  "score": číslo 1-10,
  "notes": "krátké zdůvodnění skóre"
}

Pravidla pro skóre:
- Maso jako první ingredience: +2
- Obsah masa ≥ 60 %: +2
- Bez obilovin: +1
- Kompletní krmivo: +1
- Vlhkost ≥ 75 %: +1
- Odečíst za obiloviny, cukr, konzervanty

URL produktu: ${url}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonStr = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const data = JSON.parse(jsonStr) as Record<string, unknown>;

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Neznámá chyba';
    return res.status(500).json({ ok: false, error: msg });
  }
}
