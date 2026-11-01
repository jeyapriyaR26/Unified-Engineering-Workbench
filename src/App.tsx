import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { OverviewPage } from './pages/OverviewPage';
import { GeometryPage } from './pages/GeometryPage';
import { ThermalPage } from './pages/ThermalPage';
import { PerformancePage } from './pages/PerformancePage';
import { HardwarePage } from './pages/HardwarePage';
import { BackpropPage } from './pages/BackpropPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import {
  EngineStatus,
  ThermalSolveData,
  BenchmarkReportData,
  TrainingResultData,
} from './types/workbench';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [computationStatus, setComputationStatus] = useState<'IDLE' | 'COMPUTING' | 'DONE' | 'ERROR'>('IDLE');
  const [computationMessage, setComputationMessage] = useState<string>('Ready');

  // Shared module results for cross-page metrics and reporting
  const [latestThermal, setLatestThermal] = useState<ThermalSolveData | null>(null);
  const [latestBenchmark, setLatestBenchmark] = useState<BenchmarkReportData | null>(null);
  const [latestTraining, setLatestTraining] = useState<TrainingResultData | null>(null);
  const [deviceConnectedCount, setDeviceConnectedCount] = useState<number>(0);

  // Notifications event log
  const [notifications, setNotifications] = useState<
    Array<{ id: string; time: string; text: string; type: 'info' | 'success' | 'warn' | 'error' }>
  >([
    {
      id: 'init-1',
      time: new Date().toLocaleTimeString(),
      text: 'Unified Engineering Workbench initialized. Authoritative C++17 core ready.',
      type: 'info',
    },
  ]);

  const addNotification = (text: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const newEntry = {
      id: `${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString(),
      text,
      type,
    };
    setNotifications((prev) => [newEntry, ...prev.slice(0, 40)]);
  };

  const fetchStatus = async () => {
    try {
      const status = await api.getStatus();
      setEngineStatus(status);
      addNotification(
        `Connected to C++17 core (${status.system_info.compiler}, ${status.system_info.logical_cores} cores, ${status.system_info.optimization}).`,
        'success'
      );
    } catch (err: any) {
      console.error(err);
      addNotification(`Failed to connect to C++ backend: ${err.message}`, 'error');
    }
  };

  const updateHardwareDevices = async () => {
    try {
      const res = await api.getHardwareDevices();
      const connected = res.devices.filter((d) => d.state === 2).length;
      setDeviceConnectedCount(connected);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchStatus();
    updateHardwareDevices();
  }, []);

  const handleComputationStart = (msg: string) => {
    setComputationStatus('COMPUTING');
    setComputationMessage(msg);
    addNotification(msg, 'info');
  };

  const handleComputationEnd = (msg: string, isError: boolean = false) => {
    setComputationStatus(isError ? 'ERROR' : 'DONE');
    setComputationMessage(msg);
    addNotification(msg, isError ? 'error' : 'success');
  };

  const getModuleTitle = (tab: NavTab): string => {
    switch (tab) {
      case 'overview':
        return 'Overview Dashboard';
      case 'geometry':
        return 'Task B • Geometry Viewer';
      case 'thermal':
        return 'Task C • Thermal Analysis';
      case 'performance':
        return 'Task D • Performance Lab';
      case 'hardware':
        return 'Task E • Hardware Lab';
      case 'backprop':
        return 'Task F • Backpropagation Lab';
      case 'reports':
        return 'Reports & Data Exports';
      case 'settings':
        return 'Settings & Toolchain';
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070c18] text-slate-100 overflow-hidden font-sans">
      {/* Top Application Bar */}
      <TopBar
        currentModule={getModuleTitle(currentTab)}
        engineStatus={engineStatus}
        computationStatus={computationStatus}
        computationMessage={computationMessage}
        notifications={notifications}
        onRefreshStatus={fetchStatus}
      />

      {/* Main Workspace: Sidebar + Scrollable Content Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar currentTab={currentTab} onSelectTab={(t) => setCurrentTab(t)} />

        {/* View Content Canvas */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#070c18]">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'overview' && (
              <OverviewPage
                onNavigate={(t) => setCurrentTab(t)}
                engineStatus={engineStatus}
                latestThermal={latestThermal}
                latestBenchmark={latestBenchmark}
                latestTraining={latestTraining}
                deviceConnectedCount={deviceConnectedCount}
              />
            )}

            {currentTab === 'geometry' && (
              <GeometryPage
                onComputationStart={handleComputationStart}
                onComputationEnd={handleComputationEnd}
              />
            )}

            {currentTab === 'thermal' && (
              <ThermalPage
                onComputationStart={handleComputationStart}
                onComputationEnd={handleComputationEnd}
                onSolutionUpdate={(sol) => setLatestThermal(sol)}
              />
            )}

            {currentTab === 'performance' && (
              <PerformancePage
                onComputationStart={handleComputationStart}
                onComputationEnd={handleComputationEnd}
                onBenchmarkUpdate={(rep) => setLatestBenchmark(rep)}
              />
            )}

            {currentTab === 'hardware' && (
              <HardwarePage
                onComputationStart={handleComputationStart}
                onComputationEnd={handleComputationEnd}
                onDeviceStateChange={updateHardwareDevices}
              />
            )}

            {currentTab === 'backprop' && (
              <BackpropPage
                onComputationStart={handleComputationStart}
                onComputationEnd={handleComputationEnd}
                onTrainingUpdate={(tr) => setLatestTraining(tr)}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsPage
                latestThermal={latestThermal}
                latestBenchmark={latestBenchmark}
                latestTraining={latestTraining}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsPage
                engineStatus={engineStatus}
                onRefreshStatus={fetchStatus}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
