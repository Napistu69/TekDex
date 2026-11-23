import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Wordmark } from './components/Wordmark';
import { AboutPage } from './pages/AboutPage';
import { ExtractPage } from './pages/ExtractPage';
import { LibraryPage } from './pages/LibraryPage';
import { PedigreePage } from './pages/PedigreePage';
import { PlannerPage } from './pages/PlannerPage';
import { SettingsPage } from './pages/SettingsPage';
import { TimersPage } from './pages/TimersPage';
import { useAppState } from './state/AppState';
import { AFFILIATION_DISCLAIMER } from './appConfig';

export default function App() {
  const { ready, error } = useAppState();

  if (!ready) {
    return (
      <div className="loading">
        <div className="spinner" aria-hidden />
        <h1>
          <Wordmark />
        </h1>
        <p className="lede">Loading species data…</p>
        <p className="disclaimer">{AFFILIATION_DISCLAIMER}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="boot-error">
        <h1>Could not start</h1>
        <p className="lede">{error}</p>
        <p className="disclaimer">Serve the built app over HTTP (npm run preview). Opening the files directly from disk will not load the species data.</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<ExtractPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/timers" element={<TimersPage />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/pedigree" element={<PedigreePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
