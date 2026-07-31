import { useState } from 'react';
import { smazVklad, upravAktivum, upravVklad } from '../data/store';
import { dnesIso } from '../domain/datum';
import {
  formatCenu,
  formatCislo,
  formatDatum,
  formatJednotky,
  formatKcSeZnamenkem,
  formatProcenta,
  formatProcentaSeZnamenkem,
} from '../domain/money';
import { NAZVY_SFER, type OceneniAktiva, type OceneniPortfolia } from '../domain/valuation';
import { Prazdno, Rolovatelne } from './Sekce';

export function DrzenePozice({ portfolio }: { portfolio: OceneniPortfolia }) {
  const vsechna = portfolio.poradi.flatMap((s) => portfolio.sfery[s].aktiva);

  return (
    <Rolovatelne>
      <table className="ucetni">
        <thead>
          <tr>
            <th scope="col">Sféra</th>
            <th scope="col">Nástroj</th>
            <th scope="col">ISIN</th>
            <th scope="col">Měna</th>
            <th scope="col" className="cislo">Vloženo</th>
            <th scope="col" className="cislo">Jednotek</th>
            <th scope="col" className="cislo">Prům. nákup</th>
            <th scope="col" className="cislo">Akt. cena</th>
            <th scope="col">Datum ceny</th>
            <th scope="col" className="cislo">Hodnota</th>
            <th scope="col" className="cislo">Zisk Kč</th>
            <th scope="col" className="cislo">Zisk %</th>
            <th scope="col" className="cislo">p.a.</th>
            <th scope="col" className="cislo">Váha</th>
            <th scope="col">Časový test</th>
          </tr>
        </thead>
        <tbody>
          {vsechna.map((o) => (
            <RadekPozice key={o.aktivum.id} o={o} celek={portfolio.hodnota} />
          ))}
        </tbody>
      </table>
    </Rolovatelne>
  );
}

function RadekPozice({ o, celek }: { o: OceneniAktiva; celek: number }) {
  const a = o.aktivum;
  const prazdne = o.vlozeno === 0;
  const barva = prazdne || Math.round(o.zisk) === 0 ? '' : o.zisk > 0 ? 'zisk' : 'ztrata';
  const stara = o.vyhrady.includes('cena-stara');

  return (
    <tr>
      <th scope="row" className="font-display text-[12px] font-normal tracking-[0.08em]">
        {NAZVY_SFER[a.sferaId]}
      </th>
      <td className="max-w-[220px] text-[14px] leading-tight">
        <span className="font-mono text-[13px]">{a.ticker ?? '—'}</span>
        <span className="block opacity-65">{a.nazev}</span>
      </td>
      <td className="cislo text-[12px]">{a.isin ?? '—'}</td>
      <td className="cislo text-[12px]">{a.mena}</td>
      <td className="cislo">{prazdne ? '—' : formatCislo(o.vlozeno)}</td>
      <td className="cislo">{formatJednotky(o.jednotky)}</td>
      <td className="cislo">{o.prumernaNakupniCena == null ? '—' : formatCenu(o.prumernaNakupniCena, a.mena)}</td>
      <td className="cislo">{o.aktualniCena ? formatCenu(o.aktualniCena.cena, a.mena) : '—'}</td>
      <td className="whitespace-nowrap text-[13px]">
        {o.aktualniCena ? (
          <>
            <span className="cislo">{formatDatum(o.aktualniCena.datum)}</span>
            {stara && <StitekStari datum={o.aktualniCena.datum} />}
          </>
        ) : a.ocenovani === 'sazba' ? (
          <span className="opacity-55">režim sazba</span>
        ) : (
          <span className="stitek stitek-cerveny">nenačteno</span>
        )}
      </td>
      <td className="cislo">{prazdne ? '—' : formatCislo(o.hodnota)}</td>
      <td className={`cislo ${barva}`}>
        {prazdne ? '—' : formatKcSeZnamenkem(o.zisk).replace(' Kč', '')}
      </td>
      <td className={`cislo ${barva}`}>{formatProcentaSeZnamenkem(o.ziskPct)}</td>
      <td className="cislo">{formatProcentaSeZnamenkem(o.vynosPa)}</td>
      <td className="cislo">{celek > 0 ? formatProcenta(o.hodnota / celek) : '—'}</td>
      <td className="text-[13px]">
        {a.rezimDane === 'penzijni' ? (
          <span className="opacity-55">jiný režim výplaty</span>
        ) : o.transe.length === 0 ? (
          '—'
        ) : (
          <CasovyTest o={o} />
        )}
      </td>
    </tr>
  );
}

function CasovyTest({ o }: { o: OceneniAktiva }) {
  const zrajici = o.transe.filter((t) => (t.dniDoUzrani ?? 0) > 0);
  if (zrajici.length === 0) return <span className="zisk">uzrálo vše</span>;
  const nejblizsi = zrajici.reduce((a, b) => ((a.dniDoUzrani ?? 0) <= (b.dniDoUzrani ?? 0) ? a : b));
  return (
    <span>
      zraje, nejbližší za <span className="cislo">{nejblizsi.dniDoUzrani}</span> dní
    </span>
  );
}

export function StitekStari({ datum }: { datum: string }) {
  const dni = Math.round(
    (Date.parse(`${dnesIso()}T00:00:00Z`) - Date.parse(`${datum}T00:00:00Z`)) / 86_400_000,
  );
  if (dni <= 7) return null;
  return (
    <span className={`stitek ml-2 ${dni > 30 ? 'stitek-cerveny' : 'stitek-zluty'}`}>
      {dni} dní stará
    </span>
  );
}

/* --------------------------------------------------- historie vkladů -- */

export function HistorieVkladu({ portfolio }: { portfolio: OceneniPortfolia }) {
  const radky = portfolio.poradi
    .flatMap((s) => portfolio.sfery[s].aktiva)
    .flatMap((o) => o.transe.map((t) => ({ o, t })))
    .sort((a, b) => (a.t.vklad.datum < b.t.vklad.datum ? 1 : -1));

  if (radky.length === 0) return <Prazdno>Zatím žádný zápis. Účty jsou prázdné.</Prazdno>;

  return (
    <Rolovatelne>
      <table className="ucetni">
        <thead>
          <tr>
            <th scope="col">Datum</th>
            <th scope="col">Sféra</th>
            <th scope="col">Nástroj</th>
            <th scope="col" className="cislo">Částka</th>
            <th scope="col" className="cislo">Poplatek</th>
            <th scope="col" className="cislo">Cena za kus</th>
            <th scope="col" className="cislo">Jednotek</th>
            <th scope="col">Uzraje</th>
            <th scope="col">Poznámka</th>
            <th scope="col"><span className="sr-only">Akce</span></th>
          </tr>
        </thead>
        <tbody>
          {radky.map(({ o, t }) => (
            <RadekVkladu key={t.vklad.id} aktivumId={o.aktivum.id} o={o} t={t} />
          ))}
        </tbody>
      </table>
    </Rolovatelne>
  );
}

function RadekVkladu({
  aktivumId,
  o,
  t,
}: {
  aktivumId: string;
  o: OceneniAktiva;
  t: OceneniAktiva['transe'][number];
}) {
  const [upravuje, setUpravuje] = useState(false);
  const [mazani, setMazani] = useState(false);
  const [datum, setDatum] = useState(t.vklad.datum);
  const [castka, setCastka] = useState(String(t.vklad.castka));

  function uloz() {
    const c = Number(castka.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(c) || c <= 0 || !datum || datum > dnesIso()) return;
    upravVklad(aktivumId, t.vklad.id, { datum, castka: c });
    setUpravuje(false);
  }

  if (upravuje) {
    return (
      <tr>
        <td colSpan={10}>
          <div className="flex flex-wrap items-end gap-4 py-2">
            <label className="block w-[160px]">
              <span className="popisek">Datum</span>
              <input
                type="date"
                className="pole"
                value={datum}
                max={dnesIso()}
                onChange={(e) => setDatum(e.target.value)}
              />
            </label>
            <label className="block w-[160px]">
              <span className="popisek">Částka v Kč</span>
              <input
                type="number"
                className="pole"
                value={castka}
                onChange={(e) => setCastka(e.target.value)}
              />
            </label>
            <button type="button" className="tlacitko tlacitko-hlavni" onClick={uloz}>
              Uložit
            </button>
            <button type="button" className="tlacitko" onClick={() => setUpravuje(false)}>
              Zpět
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="cislo whitespace-nowrap">{formatDatum(t.vklad.datum)}</td>
      <td className="text-[13px]">{NAZVY_SFER[o.aktivum.sferaId]}</td>
      <td className="text-[13px]">{o.aktivum.ticker ?? o.aktivum.nazev}</td>
      <td className="cislo">{formatCislo(t.vklad.castka)}</td>
      <td className="cislo">{t.vklad.poplatek ? formatCislo(t.vklad.poplatek) : '—'}</td>
      <td className="cislo">{t.cena == null ? '—' : formatCenu(t.cena, o.aktivum.mena)}</td>
      <td className="cislo">{formatJednotky(t.jednotky)}</td>
      <td className="whitespace-nowrap text-[13px]">
        {t.uzraje ? (
          <>
            <span className="cislo">{formatDatum(t.uzraje)}</span>
            <span className="ml-2 opacity-60">
              {t.dniDoUzrani === 0 ? 'uzrálo' : `zraje, ${t.dniDoUzrani} dní`}
            </span>
          </>
        ) : (
          <span className="opacity-55">jiný režim</span>
        )}
      </td>
      <td className="max-w-[180px] text-[13px] opacity-70">{t.vklad.poznamka ?? '—'}</td>
      <td className="whitespace-nowrap text-right">
        {mazani ? (
          <span className="inline-flex items-center gap-2">
            <span className="text-[13px]">Smazat?</span>
            <button
              type="button"
              className="tlacitko tlacitko-varovne !min-h-0 !px-2 !py-1"
              onClick={() => smazVklad(aktivumId, t.vklad.id)}
            >
              Ano
            </button>
            <button
              type="button"
              className="tlacitko !min-h-0 !px-2 !py-1"
              onClick={() => setMazani(false)}
            >
              Ne
            </button>
          </span>
        ) : (
          <span className="inline-flex gap-2">
            <button
              type="button"
              className="tlacitko !min-h-0 !px-2 !py-1"
              onClick={() => setUpravuje(true)}
            >
              Upravit
            </button>
            <button
              type="button"
              className="tlacitko !min-h-0 !px-2 !py-1"
              onClick={() => setMazani(true)}
            >
              Smazat
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}

/* ------------------------------------------------- výměna nástroje Hordy -- */

export function NastrojHordy({ portfolio }: { portfolio: OceneniPortfolia }) {
  const aktivum = portfolio.sfery.horde.aktiva[0]?.aktivum;
  const [otevreno, setOtevreno] = useState(false);
  const [nazev, setNazev] = useState(aktivum?.nazev ?? '');
  const [isin, setIsin] = useState(aktivum?.isin ?? '');
  const [ticker, setTicker] = useState(aktivum?.ticker ?? '');
  const [mena, setMena] = useState(aktivum?.mena ?? 'EUR');
  const [akumulacni, setAkumulacni] = useState(aktivum?.akumulacni ?? true);

  if (!aktivum) return null;

  if (!otevreno) {
    return (
      <button type="button" className="tlacitko" onClick={() => setOtevreno(true)}>
        Vyměnit nástroj Hordy
      </button>
    );
  }

  return (
    <div className="mt-4 border-t-[1.8px] border-[var(--inkoust)] pt-4">
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block sm:col-span-2">
          <span className="popisek">Název</span>
          <input className="pole" value={nazev} onChange={(e) => setNazev(e.target.value)} />
        </label>
        <label className="block">
          <span className="popisek">ISIN</span>
          <input className="pole" value={isin} onChange={(e) => setIsin(e.target.value)} />
        </label>
        <label className="block">
          <span className="popisek">Ticker</span>
          <input className="pole" value={ticker} onChange={(e) => setTicker(e.target.value)} />
        </label>
        <label className="block">
          <span className="popisek">Měna</span>
          <select
            className="pole"
            value={mena}
            onChange={(e) => setMena(e.target.value as typeof mena)}
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="CZK">CZK</option>
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-[15px]">
          <input
            type="checkbox"
            checked={akumulacni}
            onChange={(e) => setAkumulacni(e.target.checked)}
          />
          Akumulační třída
        </label>
      </div>
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          className="tlacitko tlacitko-hlavni"
          onClick={() => {
            upravAktivum(aktivum.id, {
              nazev,
              isin: isin || undefined,
              ticker: ticker || undefined,
              mena,
              akumulacni,
            });
            setOtevreno(false);
          }}
        >
          Uložit nástroj
        </button>
        <button type="button" className="tlacitko" onClick={() => setOtevreno(false)}>
          Zpět
        </button>
      </div>
      <p className="mt-3 text-[14px] opacity-60">
        Vklady i historie cen zůstanou. Když měníš nástroj, zkontroluj i historii cen.
      </p>
    </div>
  );
}
