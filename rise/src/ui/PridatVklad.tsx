import { useState } from 'react';
import { pridejVklad } from '../data/store';
import { dnesIso } from '../domain/datum';
import { formatKc } from '../domain/money';
import type { Aktivum } from '../domain/types';
import { NAZVY_SFER } from '../domain/valuation';

interface Chyby {
  aktivum?: string;
  datum?: string;
  castka?: string;
  poplatek?: string;
  cenaZaKus?: string;
}

export function PridatVklad({ aktiva }: { aktiva: readonly Aktivum[] }) {
  const [aktivumId, setAktivumId] = useState(aktiva[0]?.id ?? '');
  const [datum, setDatum] = useState(dnesIso());
  const [castka, setCastka] = useState('');
  const [poplatek, setPoplatek] = useState('');
  const [cenaZaKus, setCenaZaKus] = useState('');
  const [poznamka, setPoznamka] = useState('');
  const [chyby, setChyby] = useState<Chyby>({});
  const [hlaska, setHlaska] = useState<string | null>(null);

  const aktivum = aktiva.find((a) => a.id === aktivumId);

  function odesli(e: React.FormEvent) {
    e.preventDefault();
    const nalezene = zkontroluj({ aktivum, datum, castka, poplatek, cenaZaKus });
    setChyby(nalezene);
    if (Object.keys(nalezene).length > 0 || !aktivum) {
      setHlaska(null);
      return;
    }

    const c = Number(castka.replace(/\s/g, '').replace(',', '.'));
    pridejVklad(aktivum.id, {
      datum,
      castka: c,
      ...(poplatek ? { poplatek: Number(poplatek.replace(',', '.')) } : {}),
      ...(cenaZaKus ? { cenaZaKus: Number(cenaZaKus.replace(',', '.')) } : {}),
      ...(poznamka ? { poznamka } : {}),
    });

    setHlaska(`${NAZVY_SFER[aktivum.sferaId]}: přijato ${formatKc(c)}.`);
    setCastka('');
    setPoplatek('');
    setCenaZaKus('');
    setPoznamka('');
  }

  return (
    <form onSubmit={odesli} noValidate>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <Pole popisek="Aktivum" chyba={chyby.aktivum} sirka="sm:col-span-2 lg:col-span-1">
          <select
            className="pole"
            value={aktivumId}
            onChange={(e) => setAktivumId(e.target.value)}
            aria-invalid={!!chyby.aktivum}
          >
            {aktiva.map((a) => (
              <option key={a.id} value={a.id}>
                {NAZVY_SFER[a.sferaId]} — {a.ticker ?? a.nazev}
              </option>
            ))}
          </select>
        </Pole>

        <Pole popisek="Datum" chyba={chyby.datum}>
          <input
            type="date"
            className="pole"
            value={datum}
            max={dnesIso()}
            onChange={(e) => setDatum(e.target.value)}
            aria-invalid={!!chyby.datum}
          />
        </Pole>

        <Pole popisek="Částka v Kč" chyba={chyby.castka}>
          <input
            type="number"
            inputMode="decimal"
            step="1"
            min="0"
            className="pole"
            value={castka}
            placeholder="0"
            onChange={(e) => setCastka(e.target.value)}
            aria-invalid={!!chyby.castka}
          />
        </Pole>

        <Pole popisek="Poplatek v Kč (nepovinné)" chyba={chyby.poplatek}>
          <input
            type="number"
            inputMode="decimal"
            step="1"
            min="0"
            className="pole"
            value={poplatek}
            placeholder="0"
            onChange={(e) => setPoplatek(e.target.value)}
            aria-invalid={!!chyby.poplatek}
          />
        </Pole>

        <Pole
          popisek={`Cena za kus${aktivum ? ` v ${aktivum.mena}` : ''} (nepovinné)`}
          chyba={chyby.cenaZaKus}
          napoveda={
            aktivum?.ocenovani === 'jednotky'
              ? 'Když necháš prázdné, dohledá se z historie cen.'
              : 'V režimu sazba se cena za kus nepoužije.'
          }
        >
          <input
            type="number"
            inputMode="decimal"
            step="0.0001"
            min="0"
            className="pole"
            value={cenaZaKus}
            placeholder="—"
            disabled={aktivum?.ocenovani !== 'jednotky'}
            onChange={(e) => setCenaZaKus(e.target.value)}
            aria-invalid={!!chyby.cenaZaKus}
          />
        </Pole>

        <Pole popisek="Poznámka (nepovinné)">
          <input
            type="text"
            className="pole"
            value={poznamka}
            maxLength={120}
            onChange={(e) => setPoznamka(e.target.value)}
          />
        </Pole>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <button type="submit" className="tlacitko tlacitko-hlavni">
          Zapsat do účtů
        </button>
        <p aria-live="polite" className="text-[15px] italic">
          {hlaska}
        </p>
      </div>
    </form>
  );
}

function Pole({
  popisek,
  chyba,
  napoveda,
  sirka = '',
  children,
}: {
  popisek: string;
  chyba?: string;
  napoveda?: string;
  sirka?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${sirka}`}>
      <span className="popisek">{popisek}</span>
      {children}
      {chyba ? (
        <span className="mt-1 block text-[13px] text-[var(--rumelka)]">{chyba}</span>
      ) : napoveda ? (
        <span className="mt-1 block text-[13px] opacity-55">{napoveda}</span>
      ) : null}
    </label>
  );
}

function zkontroluj(v: {
  aktivum: Aktivum | undefined;
  datum: string;
  castka: string;
  poplatek: string;
  cenaZaKus: string;
}): Chyby {
  const chyby: Chyby = {};
  if (!v.aktivum) chyby.aktivum = 'Vyber aktivum.';

  if (!v.datum) chyby.datum = 'Zadej datum.';
  else if (v.datum > dnesIso()) chyby.datum = 'Datum nesmí být v budoucnu.';

  const castka = Number(v.castka.replace(/\s/g, '').replace(',', '.'));
  if (!v.castka.trim()) chyby.castka = 'Zadej částku.';
  else if (!Number.isFinite(castka) || castka <= 0) chyby.castka = 'Částka musí být větší než nula.';

  if (v.poplatek.trim()) {
    const poplatek = Number(v.poplatek.replace(',', '.'));
    if (!Number.isFinite(poplatek) || poplatek < 0) chyby.poplatek = 'Poplatek nesmí být záporný.';
    else if (Number.isFinite(castka) && poplatek >= castka)
      chyby.poplatek = 'Poplatek nesmí být vyšší než částka.';
  }

  if (v.cenaZaKus.trim()) {
    const cena = Number(v.cenaZaKus.replace(',', '.'));
    if (!Number.isFinite(cena) || cena <= 0) chyby.cenaZaKus = 'Cena musí být větší než nula.';
  }

  return chyby;
}
