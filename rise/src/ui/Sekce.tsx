import type { ReactNode } from 'react';

export function Sekce({
  cislo,
  titul,
  popis,
  akce,
  children,
}: {
  cislo: number;
  titul: string;
  popis?: string;
  akce?: ReactNode;
  children: ReactNode;
}) {
  const id = `sekce-${cislo}`;
  return (
    <section aria-labelledby={id} className="mb-14">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 id={id} className="nadpis-sekce grow">
          <span className="cislo mr-3 opacity-40">{String(cislo).padStart(2, '0')}</span>
          {titul}
        </h2>
        {akce}
      </div>
      {popis && <p className="mb-4 max-w-[62ch] text-[15px] opacity-70">{popis}</p>}
      {children}
    </section>
  );
}

/** Vodorovně scrollovatelný obal — tabulka nikdy nerozjede stránku. */
export function Rolovatelne({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="min-w-[720px]">{children}</div>
    </div>
  );
}

export function Prazdno({ children }: { children: ReactNode }) {
  return <p className="py-6 text-[15px] italic opacity-60">{children}</p>;
}
