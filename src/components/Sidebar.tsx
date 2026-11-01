import React from 'react';
import {
  LayoutDashboard,
  Box,
  Flame,
  Zap,
  Cpu,
  Brain,
  FileText,
  Settings,
  ChevronRight,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'geometry'
  | 'thermal'
  | 'performance'
  | 'hardware'
  | 'backprop'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const menuItems: Array<{
    id: NavTab;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    taskTag?: string;
  }> = [
    {
      id: 'overview',
      label: 'Overview',
      sublabel: 'Executive Workbench Hub',
      icon: LayoutDashboard,
    },
    {
      id: 'geometry',
      label: 'Geometry Viewer',
      sublabel: 'STL & Temp Point Cloud',
      icon: Box,
      taskTag: 'Task B',
    },
    {
      id: 'thermal',
      label: 'Thermal Analysis',
      sublabel: '1D FEA & Convergence',
      icon: Flame,
      taskTag: 'Task C',
    },
    {
      id: 'performance',
      label: 'Performance Lab',
      sublabel: 'C++ Multicore Threads',
      icon: Zap,
      taskTag: 'Task D',
    },
    {
      id: 'hardware',
      label: 'Hardware Lab',
      sublabel: 'MCU, FPGA & JTAG Probe',
      icon: Cpu,
      taskTag: 'Task E',
    },
    {
      id: 'backprop',
      label: 'Backpropagation Lab',
      sublabel: 'Analytical Gradient Descent',
      icon: Brain,
      taskTag: 'Task F',
    },
    {
      id: 'reports',
      label: 'Reports & Exports',
      sublabel: '6-Page Report & CSVs',
      icon: FileText,
      taskTag: 'Task 10',
    },
    {
      id: 'settings',
      label: 'Settings',
      sublabel: 'Environment & Toolchain',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-[#0b1120] border-r border-[#334155] flex flex-col justify-between shrink-0 select-none">
      {/* Navigation List */}
      <div className="py-4">
        <div className="px-4 pb-3 mb-2 border-b border-slate-800 text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-widest">
          SIMULATION MODULES
        </div>

        <nav className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-md flex items-center justify-between transition group ${
                  isActive
                    ? 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition ${
                      isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-semibold leading-tight">{item.label}</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      {item.sublabel}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  {item.taskTag && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {item.taskTag}
                    </span>
                  )}
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition ${
                      isActive ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600 opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer info */}
      <div className="p-4 border-t border-slate-800 bg-[#090d16]/80 text-[11px] font-mono text-slate-500 space-y-1">
        <div className="flex items-center justify-between">
          <span>HOST ARCH:</span>
          <span className="text-slate-400">x86_64</span>
        </div>
        <div className="flex items-center justify-between">
          <span>STANDARD:</span>
          <span className="text-cyan-400">C++17 (ISO)</span>
        </div>
        <div className="flex items-center justify-between">
          <span>SECURITY:</span>
          <span className="text-emerald-400">LOCAL IPC</span>
        </div>
      </div>
    </aside>
  );
};
