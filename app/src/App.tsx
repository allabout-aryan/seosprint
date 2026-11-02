import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './lib/store';
import { Toasts } from './components/ui';
import Shell from './components/Shell';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Overview from './pages/Overview';
import SearchConsole from './pages/SearchConsole';
import Analytics from './pages/Analytics';
import Ads from './pages/Ads';
import Keywords from './pages/Keywords';
import Ranks from './pages/Ranks';
import Audit from './pages/Audit';
import Backlinks from './pages/Backlinks';
import AIVisibility from './pages/AIVisibility';
import Connectors from './pages/Connectors';
import Settings from './pages/Settings';
import Ask from './pages/Ask';

function ScrollTop() {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <ScrollTop />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/app" element={<Shell />}>
            <Route index element={<Overview />} />
            <Route path="ask" element={<Ask />} />
            <Route path="search-console" element={<SearchConsole />} />
            <Route path="keywords" element={<Keywords />} />
            <Route path="ranks" element={<Ranks />} />
            <Route path="audit" element={<Audit />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="ads" element={<Ads />} />
            <Route path="ai" element={<AIVisibility />} />
            <Route path="backlinks" element={<Backlinks />} />
            <Route path="connectors" element={<Connectors />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toasts />
      </HashRouter>
    </AppProvider>
  );
}
