import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AFFILIATION_DISCLAIMER, APP_NAME } from '../appConfig';

const tabs = [
  { to: '/', label: 'Extract', icon: extractIcon },
  { to: '/library', label: 'Library', icon: libraryIcon },
  { to: '/timers', label: 'Timers', icon: timersIcon },
  { to: '/planner', label: 'Planner', icon: plannerIcon },
  { to: '/pedigree', label: 'Pedigree', icon: pedigreeIcon },
  { to: '/settings', label: 'Settings', icon: settingsIcon },
];

function extractIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}
function timersIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 9v4l2.5 1.5M9 4h6" />
    </svg>
  );
}
function libraryIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M5 4h5l2 2h7v14H5z" />
      <path d="M8 12h8M8 16h6" />
    </svg>
  );
}
function plannerIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="7" cy="8" r="3" />
      <circle cx="17" cy="8" r="3" />
      <path d="M7 11v4c0 3 10 3 10 0v-4M12 15v4" />
    </svg>
  );
}
function pedigreeIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="18" r="2.4" />
      <circle cx="6" cy="7" r="2.4" />
      <circle cx="18" cy="7" r="2.4" />
      <path d="M12 15.5V12L6 9.4M12 12l6-2.6" />
    </svg>
  );
}
function settingsIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v2.2M12 17.8V20M4 12h2.2M17.8 12H20M6.4 6.4l1.6 1.6M16 16l1.6 1.6M17.6 6.4 16 8M8 16l-1.6 1.6" />
    </svg>
  );
}

export function AppShell() {
  const location = useLocation();
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <img className="brand-mark" src="/favicon.svg" alt="" width={36} height={36} />
          <div className="brand-text">
            <span className="app-title">{APP_NAME}</span>
          </div>
        </div>
        <div className="header-right">
          <NavLink to="/about" className={({ isActive }) => `icon-btn${isActive ? ' active' : ''}`} aria-label="About" title="About">
            i
          </NavLink>
        </div>
      </header>
      <main className="app-content" key={location.pathname}>
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Main">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
          >
            {tab.icon()}
            <span className="nav-label">{tab.label}</span>
          </NavLink>
        ))}
      </nav>
      <span className="visually-hidden">{AFFILIATION_DISCLAIMER}</span>
    </div>
  );
}
