import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ApplicationPortal from './pages/ApplicationPortal';
import AdminDashboard from './pages/AdminDashboard';
import {
  INITIAL_PERMITS,
  INITIAL_VIOLATIONS,
  INITIAL_RULES_TEXT,
  INITIAL_VIOLATION_TYPES,
  INITIAL_UNREGISTERED_VEHICLES
} from './utils/mockData';
import { logVersionBanner, VERSION_INFO } from './config/version';

function MainApp() {
  const [activeTab, setActiveTab] = useState('PORTAL'); // 'PORTAL' | 'ADMIN'

  // Persistent LocalStorage + Mock Data initialization
  const [permits, setPermitsState] = useState(() => {
    const saved = localStorage.getItem('ccps_parking_permits');
    return saved ? JSON.parse(saved) : INITIAL_PERMITS;
  });

  const [violations, setViolationsState] = useState(() => {
    const saved = localStorage.getItem('ccps_parking_violations');
    return saved ? JSON.parse(saved) : INITIAL_VIOLATIONS;
  });

  const [rulesText, setRulesTextState] = useState(() => {
    const saved = localStorage.getItem('ccps_parking_rules');
    return saved ? JSON.parse(saved) : INITIAL_RULES_TEXT;
  });

  const [violationTypes, setViolationTypesState] = useState(() => {
    const saved = localStorage.getItem('ccps_parking_violation_types');
    return saved ? JSON.parse(saved) : INITIAL_VIOLATION_TYPES;
  });

  const [unregisteredVehicles, setUnregisteredVehiclesState] = useState(() => {
    const saved = localStorage.getItem('ccps_parking_unregistered_vehicles');
    return saved ? JSON.parse(saved) : INITIAL_UNREGISTERED_VEHICLES;
  });

  // Keep LocalStorage synced with state changes
  const setPermits = (newVal) => {
    const val = typeof newVal === 'function' ? newVal(permits) : newVal;
    setPermitsState(val);
    localStorage.setItem('ccps_parking_permits', JSON.stringify(val));
  };

  const setViolations = (newVal) => {
    const val = typeof newVal === 'function' ? newVal(violations) : newVal;
    setViolationsState(val);
    localStorage.setItem('ccps_parking_violations', JSON.stringify(val));
  };

  const setRulesText = (newVal) => {
    const val = typeof newVal === 'function' ? newVal(rulesText) : newVal;
    setRulesTextState(val);
    localStorage.setItem('ccps_parking_rules', JSON.stringify(val));
  };

  const setViolationTypes = (newVal) => {
    const val = typeof newVal === 'function' ? newVal(violationTypes) : newVal;
    setViolationTypesState(val);
    localStorage.setItem('ccps_parking_violation_types', JSON.stringify(val));
  };

  const setUnregisteredVehicles = (newVal) => {
    const val = typeof newVal === 'function' ? newVal(unregisteredVehicles) : newVal;
    setUnregisteredVehiclesState(val);
    localStorage.setItem('ccps_parking_unregistered_vehicles', JSON.stringify(val));
  };

  useEffect(() => {
    logVersionBanner();
  }, []);

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-viewport">
        {activeTab === 'PORTAL' ? (
          <ApplicationPortal
            permits={permits}
            setPermits={setPermits}
            rulesText={rulesText}
          />
        ) : (
          <AdminDashboard
            permits={permits}
            setPermits={setPermits}
            violations={violations}
            setViolations={setViolations}
            rulesText={rulesText}
            setRulesText={setRulesText}
            violationTypes={violationTypes}
            setViolationTypes={setViolationTypes}
            unregisteredVehicles={unregisteredVehicles}
            setUnregisteredVehicles={setUnregisteredVehicles}
          />
        )}
      </main>

      <footer className="footer-bar no-print">
        <div className="footer-content">
          <span>© 2026 高雄市中正國小 總務處事務組</span>
          <span className="footer-sep">•</span>
          <span>汽機車停車證與 ETC 智慧管理系統</span>
          <span className="footer-sep">•</span>
          <span className="footer-ver-badge">v{VERSION_INFO.version}</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
