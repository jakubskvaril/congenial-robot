import { describe, expect, it } from 'vitest';
import { xirr } from './xirr';

describe('xirr', () => {
  it('případ 1 — jeden vklad, jeden výběr o rok později → 5,00 %', () => {
    const r = xirr([
      { datum: '2026-07-31', castka: -80_000 },
      { datum: '2027-07-31', castka: 84_000 },
    ]);
    expect(r).not.toBeNull();
    expect(r! * 100).toBeCloseTo(5.0, 2);
  });

  it('případ 2 — dva nepravidelné vklady; XIRR ≠ prostý zisk', () => {
    const r = xirr([
      { datum: '2026-01-01', castka: -100_000 },
      { datum: '2026-07-01', castka: -100_000 },
      { datum: '2027-01-01', castka: 210_000 },
    ]);
    expect(r).not.toBeNull();
    expect(r! * 100).toBeGreaterThan(6.6);
    expect(r! * 100).toBeLessThan(6.8);
    // prostý zisk je 5,0 % — přesně proto se počítá XIRR
    expect(r! * 100).toBeGreaterThan(5.0);
  });

  it('případ 3 — ztráta za dva roky → ≈ −10,6 %', () => {
    const r = xirr([
      { datum: '2026-01-01', castka: -50_000 },
      { datum: '2028-01-01', castka: 40_000 },
    ]);
    expect(r).not.toBeNull();
    expect(r! * 100).toBeGreaterThan(-10.7);
    expect(r! * 100).toBeLessThan(-10.5);
  });

  it('případ 4 — jediný vklad, žádná hodnota → null', () => {
    expect(xirr([{ datum: '2026-07-31', castka: -80_000 }])).toBeNull();
  });

  it('všechny cashflow stejného znaménka → null', () => {
    expect(
      xirr([
        { datum: '2026-01-01', castka: -10_000 },
        { datum: '2026-06-01', castka: -10_000 },
      ]),
    ).toBeNull();
  });

  it('prázdné pole → null', () => {
    expect(xirr([])).toBeNull();
  });

  it('nulové cashflow se ignorují', () => {
    expect(
      xirr([
        { datum: '2026-01-01', castka: -10_000 },
        { datum: '2026-06-01', castka: 0 },
      ]),
    ).toBeNull();
  });

  it('všechno ve stejný den → null', () => {
    expect(
      xirr([
        { datum: '2026-01-01', castka: -10_000 },
        { datum: '2026-01-01', castka: 11_000 },
      ]),
    ).toBeNull();
  });

  it('nezáleží na pořadí vstupu', () => {
    const a = xirr([
      { datum: '2027-01-01', castka: 210_000 },
      { datum: '2026-07-01', castka: -100_000 },
      { datum: '2026-01-01', castka: -100_000 },
    ]);
    const b = xirr([
      { datum: '2026-01-01', castka: -100_000 },
      { datum: '2026-07-01', castka: -100_000 },
      { datum: '2027-01-01', castka: 210_000 },
    ]);
    expect(a).toBeCloseTo(b!, 9);
  });

  it('drtivá ztráta uvnitř intervalu se dopočítá (fallback na bisekci)', () => {
    // −100 000 → 500 za rok: kořen je −0,995, tedy uvnitř ⟨−0,999; 10⟩
    const r = xirr([
      { datum: '2026-01-01', castka: -100_000 },
      { datum: '2027-01-01', castka: 500 },
    ]);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(-0.995, 4);
  });

  it('kořen pod dolní mezí intervalu → null místo nesmyslného čísla', () => {
    // −100 000 → 1 Kč za rok znamená r ≈ −0,99999, mimo ⟨−0,999; 10⟩
    expect(
      xirr([
        { datum: '2026-01-01', castka: -100_000 },
        { datum: '2027-01-01', castka: 1 },
      ]),
    ).toBeNull();
  });

  it('mnoho pravidelných vkladů konverguje', () => {
    const cf = Array.from({ length: 12 }, (_, i) => ({
      datum: `2026-${String(i + 1).padStart(2, '0')}-01`,
      castka: -10_000,
    }));
    const r = xirr([...cf, { datum: '2027-01-01', castka: 126_000 }]);
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(0);
    expect(r!).toBeLessThan(0.2);
  });
});
