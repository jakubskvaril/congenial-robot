import { describe, expect, it } from 'vitest';
import {
  pocetDrobnosti,
  pocetFigur,
  pocetZubu,
  prosperita,
  urovenSfery,
  UROVNE,
  vyskaZdi,
  zjistiLevelUpy,
} from './levels';

describe('urovenSfery', () => {
  it('nula je úroveň 0 u všech sfér', () => {
    expect(urovenSfery('castle', 0).lvl).toBe(0);
    expect(urovenSfery('wall', 0).lvl).toBe(0);
    expect(urovenSfery('horde', 0).lvl).toBe(0);
  });

  it('jedna koruna zvedne na úroveň 1', () => {
    expect(urovenSfery('wall', 1).def.nazev).toBe('Palisáda');
  });

  it('výchozí stav zadání: hrad na 80 000 Kč je Kamenná tvrz', () => {
    const u = urovenSfery('castle', 80_000);
    expect(u.lvl).toBe(2);
    expect(u.def.nazev).toBe('Kamenná tvrz');
    expect(u.dalsi!.nazev).toBe('Opevněný dvorec');
    expect(u.chybi).toBe(70_000);
  });

  it('práh je inkluzivní', () => {
    expect(urovenSfery('wall', 40_000).def.nazev).toBe('Nízká zeď');
    expect(urovenSfery('wall', 39_999).def.nazev).toBe('Palisáda');
  });

  it('postup uvnitř úrovně je lineární', () => {
    // Hradby lvl 2 je 40 000–80 000
    expect(urovenSfery('wall', 60_000).postup).toBeCloseTo(0.5, 9);
    expect(urovenSfery('wall', 40_000).postup).toBeCloseTo(0, 9);
  });

  it('na maximu není další úroveň a postup je 1', () => {
    const u = urovenSfery('castle', 5_000_000);
    expect(u.lvl).toBe(7);
    expect(u.dalsi).toBeNull();
    expect(u.chybi).toBeNull();
    expect(u.postup).toBe(1);
  });

  it('každá sféra má osm úrovní se vzestupnými prahy', () => {
    for (const skala of Object.values(UROVNE)) {
      expect(skala).toHaveLength(8);
      for (let i = 1; i < skala.length; i++) {
        expect(skala[i]!.prah).toBeGreaterThan(skala[i - 1]!.prah);
      }
    }
  });
});

describe('plynulý růst uvnitř úrovně', () => {
  it('vklad 5 000 Kč už přidá zuby cimbuří', () => {
    expect(pocetZubu(0)).toBe(0);
    expect(pocetZubu(5_000)).toBe(2);
    expect(pocetZubu(1_999)).toBe(0);
  });

  it('zuby mají strop 48', () => {
    expect(pocetZubu(10_000_000)).toBe(48);
  });

  it('výška zdi roste uvnitř úrovně', () => {
    const nizka = vyskaZdi(urovenSfery('wall', 40_000));
    const vyssi = vyskaZdi(urovenSfery('wall', 79_000));
    expect(vyssi).toBeGreaterThan(nizka);
  });

  it('jedna figura za 5 000 Kč, strop 40', () => {
    expect(pocetFigur(0)).toBe(0);
    expect(pocetFigur(4_999)).toBe(0);
    expect(pocetFigur(20_000)).toBe(4);
    expect(pocetFigur(10_000_000)).toBe(40);
  });
});

describe('prosperita', () => {
  it('mapuje zhodnocení na náladu podle pásem ze zadání', () => {
    expect(prosperita(-0.2).nalada).toBe('bourka');
    expect(prosperita(-0.05).nalada).toBe('zatazeno');
    expect(prosperita(0.05).nalada).toBe('jasno');
    expect(prosperita(0.15).nalada).toBe('paprsky');
    expect(prosperita(0.3).nalada).toBe('zlataHodina');
  });

  it('ořezává na ⟨−0,25; +0,35⟩', () => {
    expect(prosperita(-5).hodnota).toBe(-0.25);
    expect(prosperita(5).hodnota).toBe(0.35);
  });

  it('null se chová jako nula', () => {
    expect(prosperita(null).nalada).toBe('jasno');
    expect(prosperita(null).hodnota).toBe(0);
  });
});

describe('pocetDrobnosti', () => {
  it('jedna drobnost za každé procento', () => {
    expect(pocetDrobnosti(0.07)).toBe(7);
    expect(pocetDrobnosti(0.0749)).toBe(7);
  });

  it('strop 30 a dolní mez 0', () => {
    expect(pocetDrobnosti(0.9)).toBe(30);
    expect(pocetDrobnosti(-0.2)).toBe(0);
    expect(pocetDrobnosti(null)).toBe(0);
  });

  it('je deterministický', () => {
    expect(pocetDrobnosti(0.123)).toBe(pocetDrobnosti(0.123));
  });
});

describe('zjistiLevelUpy', () => {
  it('při prvním spuštění bez historie nahlásí dosažené úrovně', () => {
    const up = zjistiLevelUpy(undefined, { castle: 2, wall: 0, horde: 0 });
    expect(up).toHaveLength(1);
    expect(up[0]!.sferaId).toBe('castle');
    expect(up[0]!.naUroven).toBe(2);
  });

  it('po skoku o pět úrovní vrátí jen tu nejvyšší, ne řetěz', () => {
    const up = zjistiLevelUpy({ castle: 0, wall: 0, horde: 0 }, { castle: 5, wall: 0, horde: 0 });
    expect(up).toHaveLength(1);
    expect(up[0]!.naUroven).toBe(5);
    expect(up[0]!.def.nazev).toBe('Katedrála');
  });

  it('beze změny nic nehlásí', () => {
    expect(zjistiLevelUpy({ castle: 2, wall: 1, horde: 0 }, { castle: 2, wall: 1, horde: 0 })).toEqual(
      [],
    );
  });

  it('pokles úrovně není level-up', () => {
    expect(zjistiLevelUpy({ castle: 3, wall: 0, horde: 0 }, { castle: 2, wall: 0, horde: 0 })).toEqual(
      [],
    );
  });

  it('zvládne víc sfér najednou', () => {
    const up = zjistiLevelUpy({ castle: 2, wall: 0, horde: 0 }, { castle: 3, wall: 2, horde: 0 });
    expect(up.map((u) => u.sferaId).sort()).toEqual(['castle', 'wall']);
  });
});
