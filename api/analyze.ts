// Vercel Edge Function — analýza produktu z URL pomocí Claude API.
// Žádný API klíč v kódu! Používá process.env.ANTHROPIC_API_KEY (Vercel env var).
export const config = { runtime: 'edge' };

interface AnalyzeRequest {
  url?: string;
}

function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const PROMPT_TEMPLATE = (url: string) =>
  `Jsi výživový poradce pro kočky. Na základě tohoto odkazu na produkt (kapsička/konzerva pro kočky) vrať POUZE platný JSON bez markdown bloků a bez komentářů:
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
  "notes": "krátké zdůvodnění skóre v češtině"
}

Pravidla pro skóre (1–10):
- Maso jako první ingredience: +2
- Obsah masa ≥ 60 %: +2
- Bez obilovin: +1
- Kompletní krmivo: +1
- Vlhkost ≥ 75 %: +1
- Odečti body za obiloviny, cukr, umělé konzervanty

Pokud konkrétní hodnoty neznáš, odhadni je realisticky podle názvu a typu produktu.

URL produktu: ${url}`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ ok: false, error: 'API klíč není nastaven ve Vercelu (ANTHROPIC_API_KEY)' }, 500);
  }

  let body: AnalyzeRequest;
  try {
    body = (await req.json()) as AnalyzeRequest;
  } catch {
    return json({ ok: false, error: 'Neplatný JSON v požadavku' }, 400);
  }

  const url = body.url?.trim();
  if (!url) {
    return json({ ok: false, error: 'Chybí URL produktu' }, 400);
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: PROMPT_TEMPLATE(url) }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return json(
        { ok: false, error: `Anthropic API chyba (${res.status}): ${errText.slice(0, 200)}` },
        502
      );
    }

    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content?.find(c => c.type === 'text')?.text ?? '').trim();
    if (!text) {
      return json({ ok: false, error: 'Prázdná odpověď z API' }, 502);
    }

    // Odstraň případné ```json … ``` obaly
    const jsonStr = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return json({ ok: false, error: 'Odpověď nešlo zpracovat jako JSON' }, 502);
    }

    return json({ ok: true, data: parsed }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Neznámá chyba';
    return json({ ok: false, error: msg }, 500);
  }
}
