# TekDex

An offline-first breeding companion for **ARK: Survival Ascended**.

TekDex runs entirely in your browser. Stat extraction, the creature library, the breeding planner, the pedigree view, and raising timers all stay on this device (IndexedDB). There is no account and no backend.

**Not affiliated with, endorsed by, or sponsored by Studio Wildcard.** ARK: Survival Evolved, ARK: Survival Ascended, and related marks are trademarks of Studio Wildcard. This project does not use official ARK logos or official creature artwork.

## What it does

- **Extract** wild, tamed, TE, imprint, and mutation levels from inventory numbers, with fast keyboard entry and paste, or from an ASA export `.ini`
- **Library** of creatures stored on the device, with top-stat highlighting, `.asb` import/export, and a versioned TekDex JSON export (see `docs/DATA_MODEL.md`)
- **Timers** for incubation or gestation, baby → juvenile → adolescent → adult, imprint/cuddle intervals, mating cooldown, and raising-food estimates
- **Planner** and **pedigree** for pairs and parents already in the library
- **Server multipliers** (official ASA, official single-player, or custom), including hatch, mature, cuddle, imprint, and food-drain rates

There is no OCR. Manual entry and ASA export import are the supported ways to get numbers into the app.

## Run it locally

You need **Node.js 20+** (18 should work) and a current browser.

```bash
npm install
npm test
npm run build
npm run preview
```

Open the URL printed by the preview command, usually <http://127.0.0.1:4173/>.

For daily work: `npm run dev` and open <http://localhost:5173/>.

Do not double-click `index.html`. The species values files are loaded over HTTP, so a static server is required (`npm run preview` is enough).

The library is stored in IndexedDB (`tekdex`). Clearing site data for that origin removes it.

If a locked-down npm skips esbuild’s postinstall and the build fails, run `node node_modules/esbuild/install.js` and build again.

## Data shape

Creature records use stable UUIDs and an explicit `schemaVersion`. The portable library document and field list are documented in [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md).

## Credits & license

Calculation, extraction, breeding probabilities, `.asb` / export `.ini` formats, raising-time and trough-food formulas, and the bundled values files are a TypeScript port and redistribution of [ARK Smart Breeding](https://github.com/cadon/ARKStatsExtractor) by **cadon**, used under the MIT License. Copyright (c) 2015 cadon.

This app is also MIT-licensed. The cadon copyright and MIT permission text are in `LICENSE` and `THIRD_PARTY_NOTICES`. Species numbers are factual game data (upstream: Project Purlovia / Project Obelisk). See `public/data/ATTRIBUTION.md`.

Headings use Cinzel and the interface uses Manrope (SIL Open Font License 1.1).

Timer math is checked against the bundled `values.json` fields and against public figures from the [ARK wiki (Breeding, Imprinting)](https://ark.wiki.gg/wiki/Breeding) and publicly documented calculator results. TekDex is not affiliated with Dododex or the ARK wiki.
