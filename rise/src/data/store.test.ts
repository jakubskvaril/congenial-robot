import { describe, expect, it } from 'vitest';
import type { Stav } from '../domain/types';
import { exportCsv, exportJson, letopisnyRadek, migruj } from './store';
import { vychoziStav } from './vychozi';

describe('migrace schématu', () => {
  it('výchozí stav projde beze změny', () => {
    const s = vychoziStav();
    expect(migruj(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('stav bez verze se povýší na 1 a doplní chybějící pole', () => {
    const stary = { aktiva: [], nastaveni: {} };
    const s = migruj(stary);
    expect(s.verze).toBe(1);
    expect(s.kurzy).toEqual({});
    expect(s.kronika).toEqual([]);
    expect(s.nastaveni.nocniRezim).toBe('auto');
    expect(s.nastaveni.prahy.hordaStropVkladu).toBe(45_000);
  });

  it('nesmysl na vstupu nespadne, vrátí výchozí stav', () => {
    expect(migruj(null).verze).toBe(1);
    expect(migruj('nic').aktiva.length).toBe(3);
    expect(migruj(42).aktiva.length).toBe(3);
  });

  it('ceny se srovnají vzestupně podle data', () => {
    const s = migruj({
      verze: 1,
      aktiva: [
        {
          id: 'a',
          sferaId: 'wall',
          nazev: 'X',
          mena: 'EUR',
          ocenovani: 'jednotky',
          planovanaSazbaPa: 0,
          vklady: [],
          ceny: [
            { datum: '2026-08-01', cena: 2, zdroj: 'rucne' },
            { datum: '2026-07-01', cena: 1, zdroj: 'rucne' },
          ],
        },
      ],
    });
    expect(s.aktiva[0]!.ceny.map((c) => c.datum)).toEqual(['2026-07-01', '2026-08-01']);
  });

  it('částečné nastavení se doplní, uživatelské prahy zůstanou', () => {
    const s = migruj({
      verze: 1,
      aktiva: [],
      nastaveni: { nocniRezim: 'noc', prahy: { hordaStropVkladu: 60_000 } },
    });
    expect(s.nastaveni.nocniRezim).toBe('noc');
    expect(s.nastaveni.zobrazitProjekce).toBe(true);
    expect(s.nastaveni.prahy.hordaStropVkladu).toBe(60_000);
    expect(s.nastaveni.prahy.itExpoziceMax).toBe(0.4);
  });
});

describe('export a import', () => {
  it('export → parse → migrace dá identický stav', () => {
    const s = vychoziStav();
    expect(migruj(JSON.parse(exportJson(s)))).toEqual(s);
  });

  it('CSV má hlavičku a řádek za každý vklad', () => {
    const csv = exportCsv(vychoziStav());
    const radky = csv.split('\n');
    expect(radky[0]).toContain('datum,castka_czk');
    expect(radky).toHaveLength(2); // hlavička + jeden vstupní vklad
    expect(radky[1]).toContain('2026-07-31,80000');
  });

  it('CSV escapuje čárky a uvozovky v názvu', () => {
    const s: Stav = vychoziStav();
    s.aktiva[0]!.nazev = 'Fund "A", class B';
    const csv = exportCsv(s);
    expect(csv).toContain('"Fund ""A"", class B"');
  });
});

describe('kronika', () => {
  it('mluví letopisem', () => {
    expect(
      letopisnyRadek({
        id: 'k1',
        datum: '2026-07-31',
        typ: 'vklad',
        text: '80,000 CZK laid in the castle treasury.',
      }),
    ).toBe(
      'In the year of our Lord 2026, on the 31st day of July — 80,000 CZK laid in the castle treasury.',
    );
  });
});
