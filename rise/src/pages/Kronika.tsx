import { letopisnyRadek, useStav } from '../data/store';
import type { Udalost } from '../domain/types';
import { NAZVY_SFER, vychoziSazby } from '../domain/valuation';
import { CenyAKurzy } from '../ui/Ceny';
import { DataSekce } from '../ui/DataSekce';
import { usePortfolio } from '../ui/hooks';
import { DrzenePozice, HistorieVkladu, NastrojHordy } from '../ui/Pozice';
import { PridatVklad } from '../ui/PridatVklad';
import { ProjekceSekce } from '../ui/ProjekceGraf';
import { Prazdno, Sekce } from '../ui/Sekce';
import { ZakonyRise } from '../ui/Zakony';

export default function Kronika() {
  const stav = useStav();
  const { portfolio, zakony } = usePortfolio();

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-8">
      <header className="mb-14">
        <a href="#/" className="text-[15px] underline underline-offset-4">
          ← Back to the map
        </a>
        <h1 className="mt-5 text-[30px] sm:text-[38px]">Chronicle &amp; ledger</h1>
        <p className="mt-2 max-w-[62ch] text-[16px] opacity-70">
          The realm's books. Figures, entries and laws — no shortcuts.
        </p>
      </header>

      <Sekce cislo={1} titul="Holdings">
        <DrzenePozice portfolio={portfolio} />
        <div className="mt-6">
          <NastrojHordy portfolio={portfolio} />
        </div>
      </Sekce>

      <Sekce cislo={2} titul="Add a contribution">
        <PridatVklad aktiva={stav.aktiva} />
      </Sekce>

      <Sekce cislo={3} titul="Contribution history">
        <HistorieVkladu portfolio={portfolio} />
      </Sekce>

      <Sekce
        cislo={4}
        titul="Prices & rates"
        popis="Entering a price by hand is a first-class path. If a fetch fails, the last known price stands — and it says so."
      >
        <CenyAKurzy />
      </Sekce>

      <Sekce
        cislo={5}
        titul="Laws of the Realm"
        popis="Rules you set for yourself. The app only watches them and reports their state."
      >
        <ZakonyRise zakony={zakony} />
      </Sekce>

      {stav.nastaveni.zobrazitProjekce && (
        <Sekce cislo={6} titul="Projection">
          <ProjekceSekce portfolio={portfolio} vychoziSazbySfer={vychoziSazby(stav.aktiva)} />
        </Sekce>
      )}

      <Sekce cislo={7} titul="Chronicle">
        <Letopis udalosti={stav.kronika} />
      </Sekce>

      <Sekce cislo={8} titul="Data">
        <DataSekce />
      </Sekce>

      <footer className="mt-16 border-t-[1.8px] border-[var(--inkoust)] pt-5 text-[14px] opacity-60">
        <p className="max-w-[70ch]">
          The Realm shows figures and dates from your own entries. It gives no tax or investment
          advice and suggests no trading actions.
        </p>
      </footer>
    </div>
  );
}

function Letopis({ udalosti }: { udalosti: readonly Udalost[] }) {
  if (udalosti.length === 0) return <Prazdno>The chronicle is still empty.</Prazdno>;

  const serazene = [...udalosti].sort((a, b) => (a.datum < b.datum ? 1 : -1));

  return (
    <ol className="list-none">
      {serazene.map((u) => (
        <li
          key={u.id}
          className="flex flex-wrap items-baseline gap-x-3 border-b border-[var(--inkoust-vlas)] py-2.5 last:border-b-0"
        >
          <span className="text-[16px] leading-snug">{letopisnyRadek(u)}</span>
          {u.sferaId && (
            <span className="font-display text-[10px] tracking-[0.12em] opacity-45">
              {NAZVY_SFER[u.sferaId].toUpperCase()}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
