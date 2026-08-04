import React, { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PermitsManager from '../components/admin/PermitsManager';
import LicensePlateScanner from '../components/admin/LicensePlateScanner';
import ViolationManager from '../components/admin/ViolationManager';
import PermitPrinter from '../components/admin/PermitPrinter';
import DataImportExport from '../components/admin/DataImportExport';
import RulesEditor from '../components/admin/RulesEditor';
import ViolationTypesEditor from '../components/admin/ViolationTypesEditor';

export default function AdminDashboard({ 
  permits, 
  setPermits, 
  violations, 
  setViolations, 
  rulesText, 
  setRulesText,
  violationTypes,
  setViolationTypes,
  unregisteredVehicles,
  setUnregisteredVehicles
}) {
  const [activeAdminTab, setActiveAdminTab] = useState('PERMITS');

  return (
    <AdminLayout activeAdminTab={activeAdminTab} setActiveAdminTab={setActiveAdminTab}>
      <div className="admin-content-pad">
        {activeAdminTab === 'PERMITS' && (
          <PermitsManager permits={permits} setPermits={setPermits} />
        )}

        {activeAdminTab === 'OCR_SCANNER' && (
          <LicensePlateScanner 
            permits={permits} 
            violations={violations} 
            setViolations={setViolations}
            violationTypes={violationTypes}
            unregisteredVehicles={unregisteredVehicles}
            setUnregisteredVehicles={setUnregisteredVehicles}
          />
        )}

        {activeAdminTab === 'VIOLATIONS' && (
          <ViolationManager 
            violations={violations} 
            setViolations={setViolations} 
          />
        )}

        {activeAdminTab === 'PRINTING' && (
          <PermitPrinter permits={permits} />
        )}

        {activeAdminTab === 'SETTINGS' && (
          <div className="settings-tab-stack space-y-8">
            <DataImportExport permits={permits} setPermits={setPermits} />
            <ViolationTypesEditor 
              violationTypes={violationTypes} 
              setViolationTypes={setViolationTypes} 
            />
            <RulesEditor rulesText={rulesText} setRulesText={setRulesText} />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

