import React, { useState } from 'react';
import {
  Activity,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Bell,
  RefreshCw,
  Terminal,
  X,
  Layers,
} from 'lucide-react';
import { EngineStatus } from '../types/workbench';

interface TopBarProps {
  currentModule: string;
  engineStatus: EngineStatus | null;
  computationStatus: 'IDLE' | 'COMPUTING' | 'DONE' | 'ERROR';
  computationMessage?: string;
  notifications: Array<{ id: string; time: string; text: string; type: 'info' | 'success' | 'warn' | 'error' }>;
  onRefreshStatus: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentModule,
  engineStatus,
  computationStatus,
  computationMessage,
  notifications,
  onRefreshStatus,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-16 bg-[#0f172a] border-b border-[#334155] flex items-center justify-between px-6 z-20 shrink-0">
      {/* Left: App Title and Module Breadcrumb */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-950">
            UE
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
              Unified Engineering Workbench
            </h1>
            <p className="text-xs text-cyan-400 font-mono flex items-center gap-1.5">
              <span>PASS SCIENCE WORKS</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">R&D 2026–2027</span>
            </p>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-700 hidden md:block" />

        <div className="hidden md:flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-400">MODULE:</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-semibold">
            {currentModule}
          </span>
        </div>
      </div>

      {/* Right: Engine status, Computation status, Notifications */}
      <div className="flex items-center space-x-4">
        {/* Backend Connection Badge */}
        <div
          onClick={onRefreshStatus}
          className="flex items-center space-x-2 px-3 py-1.5 rounded bg-[#1e293b] border border-slate-700 hover:border-slate-600 cursor-pointer transition text-xs font-mono"
          title="Click to re-verify C++ Engine connection"
        >
          {engineStatus ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-medium">C++17 CORE</span>
              <span className="text-slate-500 hidden lg:inline">
                ({engineStatus.system_info?.compiler || 'GCC'})
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-amber-300 font-medium">CONNECTING...</span>
            </>
          )}
          <RefreshCw className="w-3 h-3 text-slate-400 hover:text-cyan-400" />
        </div>

        {/* Computation Status Indicator */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded bg-[#1e293b] border border-slate-700 text-xs font-mono">
          {computationStatus === 'COMPUTING' && (
            <>
              <Activity className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span className="text-cyan-400 font-semibold">COMPUTING</span>
            </>
          )}
          {computationStatus === 'IDLE' && (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-slate-400">READY</span>
            </>
          )}
          {computationStatus === 'DONE' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">DONE</span>
            </>
          )}
          {computationStatus === 'ERROR' && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-400 font-semibold">ERROR</span>
            </>
          )}
          {computationMessage && (
            <span className="text-slate-400 hidden xl:inline max-w-xs truncate">
              {computationMessage}
            </span>
          )}
        </div>

        {/* Notifications Icon & Drawer Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded bg-[#1e293b] border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white transition relative"
            title="System Events & Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Drawer */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 bg-[#0f172a] border border-slate-700 rounded-lg shadow-2xl p-4 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  System Activity Log
                </span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 max-h-72 overflow-y-auto space-y-2 font-mono">
                {notifications.length === 0 ? (
                  <p className="text-slate-500 italic py-4 text-center">No recent notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2 rounded border ${
                        n.type === 'error'
                          ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                          : n.type === 'warn'
                          ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                          : n.type === 'success'
                          ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span>{n.time}</span>
                        <span className="uppercase font-semibold tracking-wider text-[9px]">{n.type}</span>
                      </div>
                      <p className="text-xs">{n.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
