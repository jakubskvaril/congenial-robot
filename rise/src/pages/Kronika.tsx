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
          ← Zpět na mapu
        </a>
        <h1 className="mt-5 text-[30px] sm:text-[38px]">Kronika a správa</h1>
        <p className="mt-2 max-w-[62ch] text-[16px] opacity-70">
          Účty říše. Čísla, zápisy a zákony — beze zkratek.
        </p>
      </header>

      <Sekce cislo={1} titul="Držené pozice">
        <DrzenePozice portfolio={portfolio} />
        <div className="mt-6">
          <NastrojHordy portfolio={portfolio} />
        </div>
      </Sekce>

      <Sekce cislo={2} titul="Přidat vklad">
        <PridatVklad aktiva={stav.aktiva} />
      </Sekce>

      <Sekce cislo={3} titul="Historie vkladů">
        <HistorieVkladu portfolio={portfolio} />
      </Sekce>

      <Sekce
        cislo={4}
        titul="Ceny a kurzy"
        popis="Ruční zadání je plnohodnotná cesta. Když načtení selže, drží se poslední známá cena a je to vidět."
      >
        <CenyAKurzy />
      </Sekce>

      <Sekce
        cislo={5}
        titul="Zákony říše"
        popis="Pravidla, která sis stanovil sám. Aplikace je jen hlídá a hlásí stav."
      >
        <ZakonyRise zakony={zakony} />
      </Sekce>

      {stav.nastaveni.zobrazitProjekce && (
        <Sekce cislo={6} titul="Projekce">
          <ProjekceSekce portfolio={portfolio} vychoziSazbySfer={vychoziSazby(stav.aktiva)} />
        </Sekce>
      )}

      <Sekce cislo={7} titul="Kronika">
        <Letopis udalosti={stav.kronika} />
      </Sekce>

      <Sekce cislo={8} titul="Data">
        <DataSekce />
      </Sekce>

      <footer className="mt-16 border-t-[1.8px] border-[var(--inkoust)] pt-5 text-[14px] opacity-60">
        <p className="max-w-[70ch]">
          Říše ukazuje čísla a data z tvých vlastních zápisů. Nedává daňová ani investiční
          doporučení a neradí, co koupit nebo prodat.
        </p>
      </footer>
    </div>
  );
}

function Letopis({ udalosti }: { udalosti: readonly Udalost[] }) {
  if (udalosti.length === 0) return <Prazdno>Kronika je zatím prázdná.</Prazdno>;

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
