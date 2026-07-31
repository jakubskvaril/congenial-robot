# Říše

Osobní tracker tří investičních pozic převlečený za středověkou mapu. Hrad,
hradby a horda rostou s tím, jak roste portfolio.

Aplikace ukazuje čísla a data z vlastních zápisů. Nedává daňová ani investiční
doporučení a nenavrhuje žádné obchodní kroky.

## Spuštění

```bash
npm install
npm run dev
```

| Příkaz | Co dělá |
|---|---|
| `npm run dev` | vývojový server |
| `npm run build` | typecheck + produkční build do `dist/` |
| `npm test` | Vitest nad celým výpočetním modulem |
| `npm run typecheck` | TypeScript ve strict režimu |
| `npm run test:e2e` | akceptační kritéria proti běžícímu `vite preview` |

E2E potřebuje běžící build a Chromium:

```bash
npm run build
npx vite preview --port 4173 &
npm run test:e2e
```

## Struktura

```
src/
  domain/     čistá logika, nula importů z Reactu
    xirr.ts       Newton-Raphson + bisekce
    valuation.ts  hodnota pozice, zisk, váhy, sparkline
    levels.ts     herní progrese, prahy, prosperita, drobnosti
    rules.ts      Zákony říše
    money.ts      cs-CZ formátování a skloňování
    datum.ts      datumová aritmetika v UTC
  data/       localStorage `rise.v1`, migrace, export/import, cenové adaptéry
  scene/      inline SVG mapa — Castle, Wall, Horde, Teren, Atmosphere, Ramec
  ui/         kartuše, účetní tabulka, formuláře, level-up toast
  pages/      Mapa, Kronika
api/          serverless proxy pro Vercel
```

Výpočty jsou oddělené od Reactu schválně: `domain/` se dá testovat bez DOM
a UI se staví až nad zelenými testy.

## Jak se počítá

- **Režim `jednotky`** — poplatek se odečte před nákupem jednotek, kurz i cena
  se berou k datu vkladu jako *nejbližší předchozí* publikovaná hodnota. ECB
  nepublikuje o víkendech a svátcích, proto nikdy „nejbližší jakákoli".
- **Režim `sazba`** — složené úročení `(1 + sazba)^(dny/365,25)`. Výchozí pro
  penzijní fond; přepínač na `jednotky` je v UI, jakmile začneš zadávat cenu
  penzijní jednotky ručně.
- **Výnos p.a. je vždy XIRR**, nikdy prostý CAGR — při nepravidelných vkladech
  dává CAGR nesmysl. Newton-Raphson od odhadu 0,10, při divergenci bisekce
  v ⟨−0,999; 10⟩. Kořen mimo interval vrací `null` místo nesmyslného čísla.
- **Zaokrouhluje se až při zobrazení**, nikdy uvnitř výpočtu.

Ocenění nese *výhrady* (`bez-ceny`, `bez-kurzu`, `cena-odhadnuta`,
`cena-stara`), takže výpadek dat nikdy nespadne — jen se označí.

## Herní systém

Dvě nezávislé osy:

- **Absolutní hodnota v Kč staví budovy.** Osm úrovní na sféru, plus plynulý
  růst uvnitř úrovně — výška zdi, zuby cimbuří po 2 000 Kč, figury po 5 000 Kč.
  I vklad 5 000 Kč je na mapě vidět.
- **Procentuální zhodnocení řídí prosperitu.** Obloha, saturace a 30 drobností
  na sféru: `clamp(floor(zisk_pct × 100), 0, 30)`. Deterministické — při stejném
  zhodnocení vypadá mapa vždy stejně, a když výnos klesne, drobnosti mizí odzadu.

Level-up se hlídá porovnáním `videnUrovne` s aktuálním stavem. Po delší
nepřítomnosti se přehraje jen *nejvyšší dosažená* úroveň per sféra, ne řetěz
animací. Výchozí vklad se za stavbu nepovažuje — první sekvenci spustí až to,
co vložíš sám.

## Data z internetu

| Co | Odkud | Poznámka |
|---|---|---|
| VWCE, XDWT | Yahoo Finance přes `/api/price` | CORS neumožňuje volat z prohlížeče |
| záloha kurzů | Stooq CSV přes `/api/price?zdroj=stooq` | |
| EUR/CZK, USD/CZK | `api.frankfurter.dev` (ECB) | CORS povolený, volá se přímo |
| ČSOB penzijní fond | ruční zadání | scraper až později, vždy s fallbackem |

Resolver zkouší poskytovatele v pořadí a bere první úspěch. Chyba se nikdy
neprobublá do UI jako výjimka — jen jako stav „nenačteno, poslední známá cena
k datu X". **Ruční zadání ceny je plnohodnotná cesta, ne nouzovka.**

Historické kurzy se cachují v `localStorage` natrvalo — nemění se.

## Perzistence

Stav žije v `localStorage` pod klíčem `rise.v1`. Žádná databáze, žádný login.
Schéma má `verze` a migrační funkci; poškozený nebo neúplný stav se srovná na
výchozí hodnoty místo pádu. Záloha přes export/import JSON, vklady i do CSV.

## Přístupnost

Souhrnná tabulka pod mapou je **přístupnostní ekvivalent mapy** — obsahuje
všechna data, která scéna vizualizuje. Sféry jsou fokusovatelné (Tab, Enter),
`prefers-reduced-motion` vypíná ambientní smyčky i pohyb kamery a level-up
zůstane jen jako toast.

## Deploy

Vercel, statický build plus dvě funkce v `api/`. V nastavení projektu nastav
**Root Directory** na `rise` — repozitář obsahuje i jinou aplikaci.
