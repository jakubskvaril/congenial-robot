import type { EnergyResult, LifeStage } from '../types';
import { BOB } from '../types';

export function getEnergy(weightKg: number): EnergyResult {
  const birthDate = BOB.birthDate;
  const neutered = BOB.neutered;
  const ageMs = Date.now() - new Date(birthDate).getTime();
  const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.4375);
  const RER = Math.round(70 * Math.pow(weightKg, 0.75));

  let factor: number;
  if      (ageMonths < 4)  factor = 3.0;
  else if (ageMonths < 7)  factor = neutered ? 2.0 : 2.5;
  else if (ageMonths < 18) factor = neutered ? 1.6 : 2.0;
  else if (ageMonths < 84) factor = neutered ? 1.2 : 1.4;
  else if (ageMonths < 132) factor = neutered ? 1.1 : 1.2;
  else                     factor = 1.0;

  let lifeStage: LifeStage;
  let lifeStageLabel: string;
  if (ageMonths < 18) { lifeStage = 'kitten'; lifeStageLabel = 'Kotě'; }
  else if (ageMonths < 84) { lifeStage = 'adult'; lifeStageLabel = 'Dospělý'; }
  else { lifeStage = 'senior'; lifeStageLabel = 'Senior'; }

  return {
    kcal: Math.round(RER * factor),
    RER,
    factor,
    ageMonths: Math.round(ageMonths * 10) / 10,
    lifeStage,
    lifeStageLabel,
  };
}
