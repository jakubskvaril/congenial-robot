import { useRef, useState } from 'react';
import { exportCsv, exportJson, importJson, useStav, vymazVse } from '../data/store';
import { dnesIso } from '../domain/datum';

export function DataSekce() {
  const stav = useStav();
  const vstup = useRef<HTMLInputElement>(null);
  const [zprava, setZprava] = useState<string | null>(null);
  const [mazani, setMazani] = useState<0 | 1 | 2>(0);

  function stahni(obsah: string, jmeno: string, typ: string) {
    const blob = new Blob([obsah], { type: `${typ};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = jmeno;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function nactiSoubor(soubor: File) {
    const text = await soubor.text();
    const v = importJson(text);
    setZprava(v.ok ? 'Stav obnoven ze zálohy.' : `Import selhal — ${v.chyba}`);
    if (vstup.current) vstup.current.value = '';
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="tlacitko"
          onClick={() => {
            stahni(exportJson(stav), `rise-${dnesIso()}.json`, 'application/json');
            setZprava('Záloha JSON stažena.');
          }}
        >
          Export JSON
        </button>

        <button
          type="button"
          className="tlacitko"
          onClick={() => vstup.current?.click()}
        >
          Import JSON
        </button>
        <input
          ref={vstup}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void nactiSoubor(f);
          }}
        />

        <button
          type="button"
          className="tlacitko"
          onClick={() => {
            stahni(exportCsv(stav), `rise-vklady-${dnesIso()}.csv`, 'text/csv');
            setZprava('CSV s vklady staženo.');
          }}
        >
          Export CSV
        </button>
      </div>

      <p aria-live="polite" className="mt-4 text-[15px] italic">
        {zprava}
      </p>

      <div className="mt-10 border-t-[1.8px] border-[var(--inkoust)] pt-5">
        <h3 className="popisek mb-2">Vymazat vše</h3>
        <p className="mb-4 max-w-[62ch] text-[14px] opacity-70">
          Smaže uložený stav a vrátí aplikaci do výchozího nastavení. Zálohu si udělej předem —
          zpět to nejde.
        </p>

        {mazani === 0 && (
          <button type="button" className="tlacitko tlacitko-varovne" onClick={() => setMazani(1)}>
            Vymazat vše
          </button>
        )}

        {mazani === 1 && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[15px]">Opravdu smazat celý uložený stav?</span>
            <button type="button" className="tlacitko tlacitko-varovne" onClick={() => setMazani(2)}>
              Ano, pokračovat
            </button>
            <button type="button" className="tlacitko" onClick={() => setMazani(0)}>
              Zpět
            </button>
          </div>
        )}

        {mazani === 2 && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[15px] text-[var(--rumelka)]">
              Poslední potvrzení. Stav bude nenávratně pryč.
            </span>
            <button
              type="button"
              className="tlacitko tlacitko-varovne"
              onClick={() => {
                vymazVse();
                setMazani(0);
                setZprava('Vymazáno. Říše začíná znovu.');
              }}
            >
              Vymazat nenávratně
            </button>
            <button type="button" className="tlacitko" onClick={() => setMazani(0)}>
              Zpět
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
