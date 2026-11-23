# TekDex data model

This describes the portable documents TekDex stores on the device and writes to files. The goal is a clean, versioned record that can be exported, archived, or later mapped into another game or ledger without renaming fields or recycling identifiers.

TekDex does not ship a backend and does not write to a chain. This document only defines the local schema so a future port — including a long-horizon ARK → ARK II creature bridge — has a stable starting point.

## Versions

| Document | Current version | Identifier |
| --- | --- | --- |
| TekDex library file | **1** | `"schema": "tekdex.library"` plus `"schemaVersion": 1` |
| Creature record | **1** | `"schemaVersion": 1` on each creature |
| Compatible ASB library | ASB **1.13** | `"FormatVersion": "1.13"` (cadon’s field names) |
| IndexedDB | **1** | database name `tekdex`, object store `kv` |

A future breaking change increments `schemaVersion` and is handled by an explicit migration in `src/engine/schema.ts`. Readers must not guess at unknown versions. Additive optional fields may appear in a version without bumping it; required field changes bump the version.

## Stable identifiers

- **`id`** — a UUID issued once when the creature is first saved. It is the primary key in the library, the parent pointer (`motherId` / `fatherId`), and the unit of merge on import. Never reuse an `id` for a different creature.
- **`speciesBlueprint`** — Unreal blueprint path (for example `/Game/PrimalEarth/Dinos/Rex/Rex_Character_BP.Rex_Character_BP`). This is the portable species identity, not the display name.
- **`game`** — which game the record was captured in. v1 uses `"ASA"` or `"ASE"`. A later title would introduce a new value rather than overloading this one.
- **`arkId`** — optional in-game dino id when known. It is *not* a substitute for `id`.

## Creature record (schemaVersion 1)

Required fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string (UUID) | Stable record id |
| `schemaVersion` | number | Creature schema version (`1`) |
| `game` | string | `"ASA"` or `"ASE"` |
| `speciesBlueprint` | string | Portable species key |
| `speciesName` | string | Short species name (not unique) |
| `name` | string | Tribe-facing name |
| `sex` | `"unknown"` \| `"male"` \| `"female"` | |
| `isBred` / `isTamed` | boolean | |
| `levelsWild` / `levelsDom` / `levelsMut` | number[12] | Levels per ASB stat index 0–11 (HP, Stamina, Torpidity, Oxygen, Food, Water, Temperature, Weight, Melee, Speed, Fortitude, Crafting) |
| `tamingEff` | number | 0–1 |
| `imprintingBonus` | number | 0–1 |
| `owner`, `tribe`, `note` | string | |
| `colors` | number[] | Region color ids; not official art |
| `mutationsMaternal` / `mutationsPaternal` | number | Mutation counters |
| `addedAt` | string | ISO-8601 timestamp |
| `tags` | string[] | Free-form labels |

Optional: `fatherId`, `motherId`, `fatherName`, `motherName`, `arkId`. Parent pointers use TekDex `id` values, not names.

`src/engine/schema.ts` (`normalizeCreature`) fills missing `id`, `schemaVersion`, `game`, and pads level arrays when reading older or imported records.

## Library document (schemaVersion 1)

```json
{
  "schema": "tekdex.library",
  "schemaVersion": 1,
  "exportedAt": "2026-11-22T18:00:00.000Z",
  "game": "ASA",
  "multipliers": { },
  "creatures": [ ]
}
```

This is the preferred archive format (`*.json` with `schema: "tekdex.library"`). TekDex also reads and writes ARK Smart Breeding `.asb` JSON (format 1.13) so libraries can move between tools. `.asb` import assigns a `schemaVersion` and `game` and keeps the ASB `guid` as `id` when present.

## Timers and settings

Timers and server multipliers live beside the library in IndexedDB (`kv` keys `timers` and `settings`). They are device convenience state, not part of the creature record. A library export may include the current multipliers so extraction stays reproducible.

## On-device storage

IndexedDB database `tekdex`, version 1, store `kv`:

- `creatures` — `Creature[]` already run through `normalizeCreature`
- `settings` — multipliers and UI flags
- `timers` — raising / mating / cuddle timers (`SavedTimer` in `src/engine/timers.ts`)

On first launch of a renamed v2 profile, TekDex copies `creatures` and `settings` once from the v1 database name `tektribe-breeder` if the new database is empty.

## What this schema is not

- It is not a blockchain schema and does not include wallet, token, or contract fields.
- It does not embed official Studio Wildcard art.
- It is not a live description of any future ARK title. A later game would get its own `game` value and, if needed, a new schema version.
