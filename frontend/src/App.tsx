import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { CommandCenter } from './pages/CommandCenter';
import { Notifications } from './pages/Notifications';
import { Humans } from './pages/Humans';
import { Vehicles } from './pages/Vehicles';
import { Config } from './pages/Config';
import { DebugPanel } from './components/DebugPanel';
import { useWebSocket } from './hooks/useWebSocket';
import { useSurveillanceStore } from './store';
import { StartupScreen } from './components/StartupScreen';

function AppInner() {
  const [sessionStarted, setSessionStarted] = useState(false);
  const navigate = useNavigate();
  useWebSocket(sessionStarted);
  const { markAlertsRead } = useSurveillanceStore();

  const handleNotificationsClick = () => {
    markAlertsRead();
    navigate('/notifications');
  };

  if (!sessionStarted) return <StartupScreen onEntered={() => setSessionStarted(true)} />;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-900">
      <TopBar onNotificationsClick={handleNotificationsClick} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<CommandCenter />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/humans" element={<Humans />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/config" element={<Config />} />
          </Routes>
        </main>
      </div>
      <DebugPanel />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
