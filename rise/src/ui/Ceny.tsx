import { useState } from 'react';
import { nactiCenu } from '../data/providers';
import { nactiKurz } from '../data/providers/fx';
import { POSKYTOVATELE } from '../data/providers/yahoo';
import { nastavKurz, pridejCenu, useStav } from '../data/store';
import { dnesIso } from '../domain/datum';
import { formatCenu, formatDatum } from '../domain/money';
import type { Aktivum, Mena } from '../domain/types';
import { kurzKDatu, NAZVY_SFER } from '../domain/valuation';
import { StitekStari } from './Pozice';

export function CenyAKurzy() {
  const stav = useStav();
  const [nacita, setNacita] = useState(false);
  const [zprava, setZprava] = useState<string | null>(null);

  const sKurzem = stav.aktiva.filter((a) => a.ocenovani === 'jednotky');
  const meny = [...new Set(stav.aktiva.map((a) => a.mena))].filter((m) => m !== 'CZK');

  async function nactiVse() {
    setNacita(true);
    setZprava(null);
    const hlasky: string[] = [];

    for (const mena of meny) {
      const kurz = await nactiKurz(mena);
      if (kurz) {
        nastavKurz(kurz.datum, mena as 'EUR' | 'USD', kurz.kurz);
        hlasky.push(`${mena}/CZK ${kurz.kurz.toFixed(3)} k ${formatDatum(kurz.datum)}`);
      } else {
        hlasky.push(`${mena}/CZK se nepodařilo načíst`);
      }
    }

    for (const aktivum of sKurzem) {
      const v = await nactiCenu(aktivum, POSKYTOVATELE);
      if (v.cena) {
        pridejCenu(aktivum.id, v.cena);
        hlasky.push(`${aktivum.ticker ?? aktivum.nazev}: ${v.cena.cena} (${v.zdroj})`);
      } else {
        hlasky.push(`${aktivum.ticker ?? aktivum.nazev}: nenačteno, platí poslední známá cena`);
      }
    }

    setZprava(hlasky.join(' · ') || 'Není co načítat.');
    setNacita(false);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="tlacitko tlacitko-hlavni"
          onClick={nactiVse}
          disabled={nacita}
        >
          {nacita ? 'Načítám…' : 'Načíst ceny'}
        </button>
        <p aria-live="polite" className="max-w-[70ch] text-[14px] italic opacity-75">
          {zprava}
        </p>
      </div>

      {sKurzem.length === 0 ? (
        <p className="text-[15px] italic opacity-60">Žádné aktivum v režimu jednotky.</p>
      ) : (
        <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
          {sKurzem.map((a) => (
            <RucniCena key={a.id} aktivum={a} />
          ))}
        </div>
      )}

      <div className="mt-10">
        <h3 className="popisek mb-3">Kurzy měn</h3>
        {meny.length === 0 ? (
          <p className="text-[15px] italic opacity-60">Všechno je v korunách, kurz není potřeba.</p>
        ) : (
          <table className="ucetni max-w-[520px]">
            <thead>
              <tr>
                <th scope="col">Měna</th>
                <th scope="col" className="cislo">Kurz k dnešku</th>
                <th scope="col" className="cislo">Uloženo dat</th>
              </tr>
            </thead>
            <tbody>
              {meny.map((m) => (
                <tr key={m}>
                  <th scope="row" className="cislo font-normal">{m}/CZK</th>
                  <td className="cislo">
                    {kurzKDatu(stav.kurzy, m, dnesIso())?.toFixed(3) ?? '—'}
                  </td>
                  <td className="cislo">
                    {Object.values(stav.kurzy).filter((k) => typeof k[m] === 'number').length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 max-w-[62ch] text-[14px] opacity-60">
          ECB kurzy nepublikuje o víkendech a svátcích. Vždy se bere nejbližší předchozí
          zveřejněný kurz, ne nejbližší jakýkoli. Historické kurzy se ukládají natrvalo.
        </p>
      </div>
    </div>
  );
}

function RucniCena({ aktivum }: { aktivum: Aktivum }) {
  const [cena, setCena] = useState('');
  const [datum, setDatum] = useState(dnesIso());
  const posledni = aktivum.ceny[aktivum.ceny.length - 1];

  function uloz(e: React.FormEvent) {
    e.preventDefault();
    const c = Number(cena.replace(',', '.'));
    if (!Number.isFinite(c) || c <= 0 || !datum || datum > dnesIso()) return;
    pridejCenu(aktivum.id, { datum, cena: c, zdroj: 'rucne' });
    setCena('');
  }

  return (
    <form onSubmit={uloz}>
      <h3 className="text-[15px] font-semibold">
        <span className="font-mono text-[13px] opacity-70">{NAZVY_SFER[aktivum.sferaId]}</span>{' '}
        {aktivum.ticker ?? aktivum.nazev}
      </h3>
      <p className="mb-3 mt-1 text-[14px]">
        {posledni ? (
          <>
            Cena {formatCenu(posledni.cena, aktivum.mena)} k{' '}
            <span className="cislo">{formatDatum(posledni.datum)}</span>
            <span className="ml-1 opacity-55">({posledni.zdroj})</span>
            <StitekStari datum={posledni.datum} />
          </>
        ) : (
          <span className="stitek stitek-cerveny">zatím žádná cena</span>
        )}
      </p>
      <div className="flex flex-wrap items-end gap-4">
        <label className="block w-[150px]">
          <span className="popisek">Cena v {aktivum.mena}</span>
          <input
            type="number"
            step="0.0001"
            min="0"
            className="pole"
            value={cena}
            onChange={(e) => setCena(e.target.value)}
          />
        </label>
        <label className="block w-[160px]">
          <span className="popisek">K datu</span>
          <input
            type="date"
            className="pole"
            value={datum}
            max={dnesIso()}
            onChange={(e) => setDatum(e.target.value)}
          />
        </label>
        <button type="submit" className="tlacitko">
          Zapsat cenu
        </button>
      </div>
    </form>
  );
}

export type { Mena };
