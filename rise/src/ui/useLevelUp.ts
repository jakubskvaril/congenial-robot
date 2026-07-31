import { useEffect, useRef, useState } from 'react';
import { useStav, zapamatujUrovne, zaznamenejLevelUp } from '../data/store';
import { zjistiLevelUpy, type LevelUp } from '../domain/levels';
import type { SferaId } from '../domain/types';

/**
 * Hlídá level-upy porovnáním viděných úrovní s aktuálními. Fronta se
 * přehrává po jedné; po delší nepřítomnosti přijde jen nejvyšší dosažená
 * úroveň per sféra (řeší zjistiLevelUpy). Každý přehraný level-up se
 * zapíše do Kroniky a do `videnUrovne`, takže po reloadu se neopakuje.
 */
export function useLevelUp(aktualniUrovne: Record<SferaId, number>): {
  prehravany: LevelUp | null;
  hotovo: () => void;
} {
  const stav = useStav();
  const [fronta, setFronta] = useState<LevelUp[]>([]);
  const [prehravany, setPrehravany] = useState<LevelUp | null>(null);
  const klic = `${aktualniUrovne.castle}-${aktualniUrovne.wall}-${aktualniUrovne.horde}`;
  const zpracovanyKlic = useRef<string | null>(null);

  useEffect(() => {
    if (zpracovanyKlic.current === klic) return;
    zpracovanyKlic.current = klic;

    const nove = zjistiLevelUpy(stav.videnUrovne, aktualniUrovne);
    if (nove.length === 0) {
      // I pokles úrovně se musí zapamatovat, jinak by se level-up při
      // návratu nad práh přehrál znovu.
      if (
        !stav.videnUrovne ||
        (Object.keys(aktualniUrovne) as SferaId[]).some(
          (s) => stav.videnUrovne![s] !== aktualniUrovne[s],
        )
      ) {
        zapamatujUrovne(aktualniUrovne);
      }
      return;
    }

    for (const up of nove) {
      zaznamenejLevelUp(up.sferaId, up.def.nazev);
    }
    zapamatujUrovne(aktualniUrovne);
    setFronta((f) => [...f, ...nove]);
    // stav.videnUrovne je zdroj, klic je derivát aktualniUrovne
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klic]);

  useEffect(() => {
    if (!prehravany && fronta.length > 0) {
      setPrehravany(fronta[0]!);
      setFronta((f) => f.slice(1));
    }
  }, [fronta, prehravany]);

  return {
    prehravany,
    hotovo: () => setPrehravany(null),
  };
}
