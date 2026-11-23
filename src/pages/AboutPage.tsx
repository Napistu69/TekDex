import { AFFILIATION_DISCLAIMER, APP_NAME, APP_VERSION } from '../appConfig';

export function AboutPage() {
  return (
    <section id="about-page">
      <div className="page-head">
        <div>
          <h1>About</h1>
          <p className="lede">
            {APP_NAME} {APP_VERSION}. Offline-first extraction, library, planner, pedigree, and raising timers.
          </p>
        </div>
      </div>
      <div className="card">
        <h2>What this is</h2>
        <p className="lede" style={{ marginTop: '0.5rem' }}>
          A static, offline-first breeding companion for ARK: Survival Ascended. Stat extraction,
          the creature library, raising timers, the breeding planner, and the pedigree view all
          run in your browser. Nothing is uploaded. Your library lives in IndexedDB on this device.
          There is no OCR — type, paste, or import an ASA export .ini. The creature record shape
          is documented in docs/DATA_MODEL.md (stable UUIDs, explicit schema version).
        </p>
      </div>
      <div className="card">
        <h2>Credits & license</h2>
        <ul className="about-list lede">
          <li>
            Calculation, extraction, breeding probabilities, .asb / export .ini formats, and the
            bundled values files are a TypeScript port and redistribution of{' '}
            <strong>ARK Smart Breeding</strong> by <strong>cadon</strong>, used under the MIT
            License. Copyright (c) 2015 cadon.{' '}
            <a href="https://github.com/cadon/ARKStatsExtractor" target="_blank" rel="noreferrer">
              github.com/cadon/ARKStatsExtractor
            </a>
          </li>
          <li>
            This app is also MIT-licensed. The cadon copyright and MIT permission text are in
            LICENSE and THIRD_PARTY_NOTICES.
          </li>
          <li>
            Upstream factual species numbers are maintained by the community (Project Purlovia /
            Project Obelisk). See public/data/ATTRIBUTION.md.
          </li>
          <li>
            Headings use Cinzel and the interface uses Manrope, both under the SIL Open Font
            License 1.1. The display face is not Jokerman and is freely redistributable.
          </li>
        </ul>
      </div>
      <div className="card">
        <h2>Trademark note</h2>
        <p className="lede" style={{ marginTop: '0.5rem' }}>
          {AFFILIATION_DISCLAIMER} ARK: Survival Evolved, ARK: Survival Ascended, and related marks
          are trademarks of Studio Wildcard. This app does not use official ARK logos or official
          creature artwork.
        </p>
      </div>
      <p className="disclaimer">{AFFILIATION_DISCLAIMER}</p>
    </section>
  );
}
