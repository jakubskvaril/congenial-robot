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
    setZprava(v.ok ? 'State restored from the backup.' : `Import failed — ${v.chyba}`);
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
            setZprava('JSON backup downloaded.');
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
            setZprava('CSV of contributions downloaded.');
          }}
        >
          Export CSV
        </button>
      </div>

      <p aria-live="polite" className="mt-4 text-[15px] italic">
        {zprava}
      </p>

      <div className="mt-10 border-t-[1.8px] border-[var(--inkoust)] pt-5">
        <h3 className="popisek mb-2">Erase everything</h3>
        <p className="mb-4 max-w-[62ch] text-[14px] opacity-70">
          Deletes the saved state and returns the app to its defaults. Take a backup first —
          there is no way back.
        </p>

        {mazani === 0 && (
          <button type="button" className="tlacitko tlacitko-varovne" onClick={() => setMazani(1)}>
            Erase everything
          </button>
        )}

        {mazani === 1 && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[15px]">Erase the entire saved state?</span>
            <button type="button" className="tlacitko tlacitko-varovne" onClick={() => setMazani(2)}>
              Yes, continue
            </button>
            <button type="button" className="tlacitko" onClick={() => setMazani(0)}>
              Back
            </button>
          </div>
        )}

        {mazani === 2 && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[15px] text-[var(--rumelka)]">
              Last confirmation. The state will be gone for good.
            </span>
            <button
              type="button"
              className="tlacitko tlacitko-varovne"
              onClick={() => {
                vymazVse();
                setMazani(0);
                setZprava('Erased. The realm begins again.');
              }}
            >
              Erase permanently
            </button>
            <button type="button" className="tlacitko" onClick={() => setMazani(0)}>
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
