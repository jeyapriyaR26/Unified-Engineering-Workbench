import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Power,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Table as TableIcon,
  HelpCircle,
  Activity,
  Layers,
  ArrowRight,
  ShieldAlert,
  Server,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';
import { DeviceInfoData, HardwarePinEntry } from '../types/workbench';

interface HardwarePageProps {
  onComputationStart: (msg: string) => void;
  onComputationEnd: (msg: string, isError?: boolean) => void;
  onDeviceStateChange: () => void;
}

export const HardwarePage: React.FC<HardwarePageProps> = ({
  onComputationStart,
  onComputationEnd,
  onDeviceStateChange,
}) => {
  const [devices, setDevices] = useState<DeviceInfoData[]>([]);
  const [pinTable, setPinTable] = useState<HardwarePinEntry[]>([]);
  const [jtagAnalysis, setJtagAnalysis] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'devices' | 'diagram' | 'pinout' | 'analysis'>('devices');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('mcu_stm32h7');

  useEffect(() => {
    fetchHardwareInfo();
  }, []);

  const fetchHardwareInfo = async () => {
    try {
      const data = await api.getHardwareDevices();
      setDevices(data.devices);
      setPinTable(data.pin_table);
      setJtagAnalysis(data.jtag_analysis);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleConnect = async (deviceId: string, simulateTimeout: boolean = false) => {
    try {
      onComputationStart(
        simulateTimeout
          ? `Simulating target communication timeout on ${deviceId}...`
          : `Connecting to ${deviceId} via C++ mock driver...`
      );
      await api.connectHardware(deviceId, simulateTimeout);
      await fetchHardwareInfo();
      onDeviceStateChange();

      if (simulateTimeout) {
        onComputationEnd(
          `RECOVERABLE TIMEOUT TRIGGERED: ${deviceId} is unresponsive. Click "Recover Device" to restore.`,
          true
        );
      } else {
        onComputationEnd(`Device ${deviceId} connected successfully.`);
      }
    } catch (err: any) {
      onComputationEnd(err.message, true);
    }
  };

  const handleDisconnect = async (deviceId: string) => {
    try {
      onComputationStart(`Disconnecting ${deviceId}...`);
      await api.disconnectHardware(deviceId);
      await fetchHardwareInfo();
      onDeviceStateChange();
      onComputationEnd(`Device ${deviceId} safely disconnected.`);
    } catch (err: any) {
      onComputationEnd(err.message, true);
    }
  };

  const handleRecover = async (deviceId: string) => {
    try {
      onComputationStart(`Issuing reset & bus recovery sequence on ${deviceId}...`);
      await api.recoverHardware(deviceId);
      await fetchHardwareInfo();
      onDeviceStateChange();
      onComputationEnd(`Device ${deviceId} successfully recovered and re-synchronized.`);
    } catch (err: any) {
      onComputationEnd(err.message, true);
    }
  };

  const pollTelemetry = async (deviceId: string) => {
    try {
      await api.getHardwareTelemetry(deviceId);
      await fetchHardwareInfo();
    } catch (err: any) {
      console.error(err);
    }
  };

  const selectedDevice = devices.find((d) => d.device_id === selectedDeviceId) || devices[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0f172a] p-4 rounded-lg border border-slate-700">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-mono mb-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>TASK E • EMBEDDED HARDWARE INTERFACE & MOCK LAB</span>
          </div>
          <h2 className="text-lg font-bold text-white">Host-Connected Hardware Workbench</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Architectural simulation of an ARM Cortex-M7 MCU, Xilinx Artix-7 FPGA, and Segger J-Link JTAG Probe with voltage domains and fault recovery.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800 text-xs font-mono">
            SIMULATED BEHAVIOR • NO PHYSICAL HARDWARE REQUIRED
          </span>
          <button
            onClick={fetchHardwareInfo}
            className="p-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
            title="Refresh devices"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab('devices')}
          className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 ${
            activeTab === 'devices'
              ? 'bg-blue-950/60 border border-blue-600 text-blue-300 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Device Discovery & Telemetry
        </button>
        <button
          onClick={() => setActiveTab('diagram')}
          className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 ${
            activeTab === 'diagram'
              ? 'bg-blue-950/60 border border-blue-600 text-blue-300 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          System Block Diagram
        </button>
        <button
          onClick={() => setActiveTab('pinout')}
          className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 ${
            activeTab === 'pinout'
              ? 'bg-blue-950/60 border border-blue-600 text-blue-300 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          Interface & Pin-Voltage Table
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 ${
            activeTab === 'analysis'
              ? 'bg-blue-950/60 border border-blue-600 text-blue-300 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          JTAG vs Computing Core Analysis
        </button>
      </div>

      {/* TAB 1: Devices & Telemetry View */}
      {activeTab === 'devices' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3 Device Cards in Column 1 & 2 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {devices.map((dev) => {
                const isSelected = selectedDeviceId === dev.device_id;
                const isConnected = dev.state === 2;
                const isTimeout = dev.state === 3;

                return (
                  <div
                    key={dev.device_id}
                    onClick={() => setSelectedDeviceId(dev.device_id)}
                    className={`bg-[#0f172a] border p-4 rounded-lg cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-500 shadow-md shadow-blue-950/50'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                            dev.type === 0
                              ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                              : dev.type === 1
                              ? 'bg-purple-950 text-purple-400 border border-purple-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {dev.type === 0 ? 'MICROCONTROLLER' : dev.type === 1 ? 'FPGA TARGET' : 'JTAG PROBE'}
                        </span>

                        <span
                          className={`w-2 h-2 rounded-full ${
                            isConnected
                              ? 'bg-emerald-400 animate-pulse'
                              : isTimeout
                              ? 'bg-rose-500 animate-ping'
                              : 'bg-slate-600'
                          }`}
                        />
                      </div>

                      <h4 className="font-bold text-slate-100 text-xs mb-1 line-clamp-1">{dev.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mb-2">S/N: {dev.serial_number}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">STATE:</span>
                        <span
                          className={`font-bold ${
                            isConnected
                              ? 'text-emerald-400'
                              : isTimeout
                              ? 'text-rose-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {isConnected ? 'ONLINE' : isTimeout ? 'TIMEOUT' : 'OFFLINE'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        {!isConnected && !isTimeout && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConnect(dev.device_id, false);
                            }}
                            className="flex-1 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono text-[10px] font-bold transition"
                          >
                            Connect
                          </button>
                        )}

                        {isConnected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDisconnect(dev.device_id);
                            }}
                            className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] transition"
                          >
                            Disconnect
                          </button>
                        )}

                        {isTimeout && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRecover(dev.device_id);
                            }}
                            className="flex-1 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-[10px] font-bold transition"
                          >
                            Recover
                          </button>
                        )}

                        {!isTimeout && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConnect(dev.device_id, true);
                            }}
                            className="py-1 px-2 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-mono text-[10px] transition"
                            title="Simulate recoverable timeout fault"
                          >
                            Fault
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Device Deep Telemetry Card */}
            {selectedDevice && (
              <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 font-mono text-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-blue-400" />
                      {selectedDevice.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Interface: {selectedDevice.interface} • Firmware: {selectedDevice.firmware_version}
                    </p>
                  </div>

                  <button
                    onClick={() => pollTelemetry(selectedDevice.device_id)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Query Telemetry
                  </button>
                </div>

                {/* 4 Telemetry Gauges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block mb-1">CORE TEMP</span>
                    <span className="text-base font-bold text-amber-400">
                      {selectedDevice.telemetry?.temp_C ? `${selectedDevice.telemetry.temp_C.toFixed(1)} °C` : 'N/A'}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block mb-1">CURRENT DRAW</span>
                    <span className="text-base font-bold text-cyan-400">
                      {selectedDevice.telemetry?.current_mA ? `${selectedDevice.telemetry.current_mA.toFixed(1)} mA` : 'N/A'}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block mb-1">CORE / IO RAILS</span>
                    <span className="text-base font-bold text-emerald-400">
                      {selectedDevice.telemetry?.vcc_core_V?.toFixed(2)}V / {selectedDevice.telemetry?.vcc_io_V?.toFixed(2)}V
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block mb-1">CLOCK FREQ</span>
                    <span className="text-base font-bold text-purple-400">
                      {selectedDevice.telemetry?.clock_mhz?.toFixed(1)} MHz
                    </span>
                  </div>
                </div>

                {/* Active State & Register Dump */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ACTIVE STATE:</span>
                    <span className="text-white font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {selectedDevice.telemetry?.state_desc || 'STANDBY'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">HARDWARE REGISTERS & SCAN CHAINS:</span>
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {selectedDevice.telemetry?.registers &&
                        Object.entries(selectedDevice.telemetry.registers).map(([reg, val]) => (
                          <div key={reg} className="flex justify-between border-b border-slate-900 pb-0.5">
                            <span className="text-cyan-400 font-semibold">{reg}:</span>
                            <span className="text-slate-300 font-mono">{val}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Device Silicon Capabilities */}
                <div>
                  <span className="text-slate-400 text-[11px] block mb-1">SILICON CAPABILITIES & PERIPHERALS:</span>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {selectedDevice.capabilities.map((cap, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Fault Injection & Architecture Note */}
          <div className="space-y-4">
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-3">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider pb-1 border-b border-slate-800 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                FAULT INJECTION CONTROLS
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Test workbench resilience against hardware timeout errors. Triggering a communication timeout changes device state to <code className="text-rose-400 font-mono">ERROR_TIMEOUT</code>, requiring a safe re-synchronization procedure.
              </p>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleConnect(selectedDeviceId, true)}
                  className="w-full py-2 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold transition flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Simulate Target Timeout
                </button>

                <button
                  onClick={() => handleRecover(selectedDeviceId)}
                  className="w-full py-2 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-bold transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Execute Timeout Recovery
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-800/40 rounded-lg p-4 text-xs font-sans text-slate-300 space-y-2 leading-relaxed">
              <h4 className="font-bold text-blue-300 font-mono flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                Multi-Board Topology
              </h4>
              <p className="text-[11px]">
                The workbench represents a professional laboratory instrumentation setup where the host workstation talks over USB to a dedicated JTAG hardware probe, which dynamically level-shifts signals to inspect the MCU and FPGA target boards without common-mode voltage damage.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: System Block Diagram */}
      {activeTab === 'diagram' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Laboratory System Interconnect & Signal Ownership Diagram
            </h3>
            <span className="text-xs font-mono text-cyan-400">IEEE 1149.1 / SWD Bus Topology</span>
          </div>

          {/* Visual Block Diagram using styled nodes */}
          <div className="p-6 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs overflow-x-auto">
            <div className="min-w-[700px] flex items-center justify-between gap-4">
              {/* Host PC Node */}
              <div className="w-48 p-4 rounded-lg bg-slate-900 border-2 border-slate-600 text-center space-y-2">
                <div className="text-slate-400 font-bold uppercase text-[10px]">HOST WORKSTATION</div>
                <div className="text-white font-bold text-sm">Engineering PC</div>
                <div className="text-[10px] text-cyan-300 bg-slate-800 py-1 rounded">
                  Workbench App (C++17)
                </div>
                <div className="text-[10px] text-slate-500">USB 2.0 / 3.0 Host</div>
              </div>

              {/* USB Bus Link */}
              <div className="flex-1 flex flex-col items-center">
                <span className="text-[10px] text-cyan-400 font-semibold mb-1">USB 480 Mbps Bulk</span>
                <div className="w-full h-1 bg-cyan-600 relative">
                  <div className="absolute right-0 -top-1 w-2 h-2 border-t-2 border-r-2 border-cyan-400 rotate-45" />
                  <div className="absolute left-0 -top-1 w-2 h-2 border-b-2 border-l-2 border-cyan-400 rotate-45" />
                </div>
                <span className="text-[9px] text-slate-500 mt-1">VBUS 5.0V / D+ / D- / GND</span>
              </div>

              {/* JTAG Probe Node (Center Adapter) */}
              <div className="w-56 p-4 rounded-lg bg-amber-950/40 border-2 border-amber-600 text-center space-y-2 relative">
                <div className="text-amber-400 font-bold uppercase text-[10px]">DEBUG INTERFACE (MASTER)</div>
                <div className="text-white font-bold text-sm">Segger J-Link Probe</div>
                <div className="text-[10px] text-amber-200 bg-amber-900/60 py-1 rounded border border-amber-700">
                  TAP State Controller
                </div>
                <div className="text-[9px] text-slate-400">
                  Level Shifters: 74LVC2T45<br />Vref Sense: 1.2V - 3.6V
                </div>
              </div>

              {/* JTAG Bus Link */}
              <div className="flex-1 flex flex-col items-center">
                <span className="text-[10px] text-amber-400 font-semibold mb-1">JTAG / SWD Link</span>
                <div className="w-full h-1 bg-amber-600 relative">
                  <div className="absolute right-0 -top-1 w-2 h-2 border-t-2 border-r-2 border-amber-400 rotate-45" />
                  <div className="absolute left-0 -top-1 w-2 h-2 border-b-2 border-l-2 border-amber-400 rotate-45" />
                </div>
                <span className="text-[9px] text-slate-500 mt-1">TCK, TMS, TDI, TDO, VTref</span>
              </div>

              {/* Target Systems (MCU & FPGA) */}
              <div className="space-y-3 w-52">
                {/* MCU Target */}
                <div className="p-3 rounded-lg bg-cyan-950/40 border-2 border-cyan-600 text-center space-y-1">
                  <div className="text-cyan-400 font-bold text-[10px]">TARGET COMPUTING DEVICE</div>
                  <div className="text-white font-bold text-xs">STM32H7 MCU (ARM)</div>
                  <div className="text-[9px] text-slate-400">3.3V Logic • 480 MHz Core</div>
                </div>

                {/* FPGA Target */}
                <div className="p-3 rounded-lg bg-purple-950/40 border-2 border-purple-600 text-center space-y-1">
                  <div className="text-purple-400 font-bold text-[10px]">TARGET LOGIC FABRIC</div>
                  <div className="text-white font-bold text-xs">Artix-7 FPGA (Xilinx)</div>
                  <div className="text-[9px] text-slate-400">1.0V Core / 3.3V Banks</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Interface & Pin-Voltage Table */}
      {activeTab === 'pinout' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 font-mono text-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Comprehensive Subsystem Interconnect & Pin-Voltage Specifications
            </h3>
            <span className="text-[11px] text-slate-400">Hardware Layer Matrix</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-2.5">Subsystem</th>
                  <th className="py-2 px-2.5">Signal Name</th>
                  <th className="py-2 px-2.5">Nominal Voltage</th>
                  <th className="py-2 px-2">Direction</th>
                  <th className="py-2 px-2">Connector</th>
                  <th className="py-2 px-2.5">Level Shifting & Buffering</th>
                  <th className="py-2 px-3">Ownership Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pinTable.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2 px-2.5 font-bold text-cyan-300">{row.subsystem}</td>
                    <td className="py-2 px-2.5 font-bold text-white">{row.signal_name}</td>
                    <td className="py-2 px-2.5 text-amber-300 font-semibold">{row.voltage_nominal}</td>
                    <td className="py-2 px-2 text-slate-300">{row.direction}</td>
                    <td className="py-2 px-2 text-slate-400">{row.connector}</td>
                    <td className="py-2 px-2.5 text-slate-300">{row.level_shifting}</td>
                    <td className="py-2 px-3 text-slate-200">{row.ownership_role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Theoretical Analysis (JTAG vs Interchangeable Computing) */}
      {activeTab === 'analysis' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-6 text-xs text-slate-300 space-y-4 font-sans leading-relaxed">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-2">
            Why a JTAG Adapter is a Debugging Interface Rather Than a Generic Interchangeable Computing Board
          </h3>

          <div className="p-4 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] whitespace-pre-wrap leading-relaxed text-slate-300">
            {jtagAnalysis}
          </div>
        </div>
      )}
    </div>
  );
};
