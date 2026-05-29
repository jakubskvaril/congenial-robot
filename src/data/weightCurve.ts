// Referenční křivka růstu samce nevské maškarády
// Zdroj: TICA Breed Standard + chovatelské záznamy
export const WEIGHT_CURVE_MALE = [
  { months: 0,  kg: 0.10 }, { months: 1,  kg: 0.35 },
  { months: 2,  kg: 0.65 }, { months: 3,  kg: 1.00 },
  { months: 4,  kg: 1.40 }, { months: 5,  kg: 1.80 },
  { months: 6,  kg: 2.20 }, { months: 7,  kg: 2.60 },
  { months: 8,  kg: 3.00 }, { months: 9,  kg: 3.40 },
  { months: 10, kg: 3.80 }, { months: 11, kg: 4.20 },
  { months: 12, kg: 4.50 }, { months: 15, kg: 5.00 },
  { months: 18, kg: 5.50 }, { months: 24, kg: 6.20 },
  { months: 30, kg: 6.80 }, { months: 36, kg: 7.00 },
];

export function getReferenceWeight(ageMonths: number): number {
  const curve = WEIGHT_CURVE_MALE;
  if (ageMonths <= 0) return curve[0].kg;
  if (ageMonths >= curve[curve.length - 1].months) return curve[curve.length - 1].kg;
  for (let i = 0; i < curve.length - 1; i++) {
    if (ageMonths >= curve[i].months && ageMonths <= curve[i + 1].months) {
      const t = (ageMonths - curve[i].months) / (curve[i + 1].months - curve[i].months);
      return curve[i].kg + t * (curve[i + 1].kg - curve[i].kg);
    }
  }
  return curve[curve.length - 1].kg;
}
