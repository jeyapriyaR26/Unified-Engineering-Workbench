import React, { useState, useEffect } from 'react';
import {
  Flame,
  Play,
  Download,
  BarChart2,
  CheckCircle2,
  Table as TableIcon,
  HelpCircle,
  TrendingDown,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { api } from '../services/api';
import {
  ThermalParams,
  ThermalSolveData,
  ConvergenceStudyData,
} from '../types/workbench';

interface ThermalPageProps {
  onComputationStart: (msg: string) => void;
  onComputationEnd: (msg: string, isError?: boolean) => void;
  onSolutionUpdate: (sol: ThermalSolveData) => void;
}

export const ThermalPage: React.FC<ThermalPageProps> = ({
  onComputationStart,
  onComputationEnd,
  onSolutionUpdate,
}) => {
  const [params, setParams] = useState<ThermalParams>({
    length: 1.0,
    area: 0.0001,
    conductivity: 10.0,
    heat_gen: 10000.0,
    temp_left: 100.0,
    temp_right: 20.0,
    num_elements: 20,
  });

  const [solveResult, setSolveResult] = useState<ThermalSolveData | null>(null);
  const [convergenceData, setConvergenceData] = useState<ConvergenceStudyData | null>(null);
  const [activeTab, setActiveTab] = useState<'solution' | 'convergence' | 'matrix' | 'theory'>('solution');

  // Run solve on initial mount
  useEffect(() => {
    runFeaSolve(params);
    runConvergence();
  }, []);

  const runFeaSolve = async (customParams?: ThermalParams) => {
    const p = customParams || params;
    try {
      onComputationStart(`Solving 1D Thermal FEA with N=${p.num_elements} elements in C++...`);
      const res = await api.solveThermal(p);
      setSolveResult(res);
      onSolutionUpdate(res);
      onComputationEnd(
        `FEA solve finished. Max midpoint error: ${res.max_abs_midpoint_error_C.toFixed(5)} °C (RMSE: ${res.rmse_C.toFixed(5)} °C)`
      );
    } catch (err: any) {
      onComputationEnd(err.message, true);
    }
  };

  const runConvergence = async () => {
    try {
      const res = await api.runConvergenceStudy({
        length: params.length,
        conductivity: params.conductivity,
        heat_gen: params.heat_gen,
      });
      setConvergenceData(res);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleMeshPreset = (n: number) => {
    const updated = { ...params, num_elements: n };
    setParams(updated);
    runFeaSolve(updated);
  };

  const exportNumericalCsv = () => {
    if (!solveResult) return;
    let csv = 'element_id,x_mid_m,temp_fe_mid_C,temp_exact_mid_C,abs_error_mid_C,relative_error_pct\n';
    solveResult.midpoints.forEach((m) => {
      csv += `${m.element_id},${m.x_mid_m.toFixed(5)},${m.temp_fe_mid_C.toFixed(5)},${m.temp_exact_mid_C.toFixed(5)},${m.abs_error_mid_C.toFixed(7)},${m.relative_error_mid_pct.toFixed(5)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thermal_fea_results_N${params.num_elements}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare chart series: Sample points for FEA vs exact
  const chartData = solveResult?.midpoints.map((m) => ({
    x: Number(m.x_mid_m.toFixed(4)),
    T_FE: Number(m.temp_fe_mid_C.toFixed(3)),
    T_Exact: Number(m.temp_exact_mid_C.toFixed(3)),
    Error_C: Number(m.abs_error_mid_C.toFixed(5)),
  })) || [];

  // Convergence chart series
  const convChartData = convergenceData?.points.map((p) => ({
    elements: `N=${p.num_elements}`,
    h: Number(p.h_m.toFixed(4)),
    maxError: Number(p.max_abs_error_C.toFixed(6)),
    theoreticalError: Number(((10000 / (8 * 10)) * p.h_m * p.h_m).toFixed(6)),
  })) || [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0f172a] p-4 rounded-lg border border-slate-700">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-mono mb-1">
            <Flame className="w-3.5 h-3.5" />
            <span>TASK C • 1D STEADY-STATE THERMAL FINITE ELEMENT ANALYSIS</span>
          </div>
          <h2 className="text-lg font-bold text-white">Uniform Rod Conduction Solver</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Solves <code className="text-amber-300">-d/dx[k A dT/dx] = q A</code> with Dirichlet boundary conditions <code className="text-cyan-300">T(0)=100°C</code> and <code className="text-cyan-300">T(L)=20°C</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mesh Preset Buttons (N=10, 20, 40, 80) */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-md border border-slate-700 text-xs font-mono">
            <span className="text-[10px] text-slate-500 px-1.5 uppercase font-semibold">MESH:</span>
            {[10, 20, 40, 80].map((n) => (
              <button
                key={n}
                onClick={() => handleMeshPreset(n)}
                className={`px-2.5 py-1 rounded transition ${
                  params.num_elements === n
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                N={n}
              </button>
            ))}
          </div>

          <button
            onClick={() => runFeaSolve()}
            className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 transition shadow-md shadow-amber-950"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Solve in C++
          </button>

          <button
            onClick={exportNumericalCsv}
            disabled={!solveResult}
            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-mono flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Main Grid: Parameters Form & Sub-View Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Solver Parameters Form */}
        <div className="space-y-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 text-xs font-mono space-y-3">
            <h3 className="font-bold text-slate-200 uppercase tracking-wider pb-1 border-b border-slate-800">
              PHYSICAL PARAMETERS
            </h3>

            <div>
              <label className="text-slate-400 block mb-1">Length L [m]:</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={params.length}
                onChange={(e) => setParams({ ...params, length: parseFloat(e.target.value) || 1.0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Cross-section A [m²]:</label>
              <input
                type="number"
                step="0.00001"
                value={params.area}
                onChange={(e) => setParams({ ...params, area: parseFloat(e.target.value) || 1e-4 })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Conductivity k [W/(m·K)]:</label>
              <input
                type="number"
                step="1"
                value={params.conductivity}
                onChange={(e) => setParams({ ...params, conductivity: parseFloat(e.target.value) || 10.0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Heat Generation q [W/m³]:</label>
              <input
                type="number"
                step="1000"
                value={params.heat_gen}
                onChange={(e) => setParams({ ...params, heat_gen: parseFloat(e.target.value) || 10000.0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">T(0) [°C]:</label>
                <input
                  type="number"
                  step="5"
                  value={params.temp_left}
                  onChange={(e) => setParams({ ...params, temp_left: parseFloat(e.target.value) || 100.0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">T(L) [°C]:</label>
                <input
                  type="number"
                  step="5"
                  value={params.temp_right}
                  onChange={(e) => setParams({ ...params, temp_right: parseFloat(e.target.value) || 20.0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Mesh Elements N:</label>
              <input
                type="number"
                min="1"
                max="200"
                value={params.num_elements}
                onChange={(e) => setParams({ ...params, num_elements: parseInt(e.target.value) || 20 })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
              />
            </div>

            <button
              onClick={() => runFeaSolve()}
              className="w-full mt-2 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-cyan-300 font-bold text-xs"
            >
              Update FEA Solve
            </button>
          </div>

          {/* Quick Result Metrics */}
          {solveResult && (
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 text-xs font-mono space-y-2">
              <h3 className="font-bold text-slate-200 uppercase tracking-wider pb-1 border-b border-slate-800">
                NUMERICAL METRICS
              </h3>
              <div className="flex justify-between text-slate-400">
                <span>Mesh Size h:</span>
                <span className="text-white">{(params.length / params.num_elements).toFixed(4)} m</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Max Midpoint Error:</span>
                <span className="text-amber-400 font-bold">{solveResult.max_abs_midpoint_error_C.toFixed(5)} °C</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Max Relative Error:</span>
                <span className="text-white">{solveResult.max_rel_midpoint_error_pct.toFixed(3)} %</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>RMSE:</span>
                <span className="text-cyan-400 font-bold">{solveResult.rmse_C.toFixed(5)} °C</span>
              </div>
            </div>
          )}
        </div>

        {/* Right 3 Columns: Interactive Visualization Tabs */}
        <div className="lg:col-span-3 space-y-4">
          {/* Sub Navigation Bar */}
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-xs font-mono">
            <button
              onClick={() => setActiveTab('solution')}
              className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 ${
                activeTab === 'solution'
                  ? 'bg-amber-950/60 border border-amber-600 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Solution vs Analytical
            </button>
            <button
              onClick={() => setActiveTab('convergence')}
              className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 ${
                activeTab === 'convergence'
                  ? 'bg-amber-950/60 border border-amber-600 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              Mesh Convergence Study
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 ${
                activeTab === 'matrix'
                  ? 'bg-amber-950/60 border border-amber-600 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Error Table & K Matrix
            </button>
            <button
              onClick={() => setActiveTab('theory')}
              className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 ${
                activeTab === 'theory'
                  ? 'bg-amber-950/60 border border-amber-600 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Engineering Derivation
            </button>
          </div>

          {/* TAB 1: Solution vs Analytical Line Chart */}
          {activeTab === 'solution' && (
            <div className="space-y-4">
              <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">
                      Temperature Distribution Along Uniform Rod (L = {params.length} m)
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      X-Axis: Position x [m] • Y-Axis: Temperature T [°C] • N = {params.num_elements} Elements
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <span className="flex items-center gap-1 text-cyan-400">
                      <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                      FEA Solution T_fe
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <span className="w-3 h-0.5 bg-amber-400 border-b border-dashed inline-block" />
                      Analytical T_exact
                    </span>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="x"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                        label={{
                          value: 'Position along rod x [m]',
                          position: 'insideBottom',
                          offset: -12,
                          fill: '#94a3b8',
                          fontSize: 11,
                        }}
                      />
                      <YAxis
                        stroke="#64748b"
                        domain={['auto', 'auto']}
                        tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                        label={{
                          value: 'Temperature [°C]',
                          angle: -90,
                          position: 'insideLeft',
                          fill: '#94a3b8',
                          fontSize: 11,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="T_FE"
                        stroke="#06b6d4"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#06b6d4' }}
                        name="Finite Element T_fe [°C]"
                      />
                      <Line
                        type="monotone"
                        dataKey="T_Exact"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                        name="Analytical T_exact [°C]"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sub-chart: Absolute Pointwise Error Distribution */}
              <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Midpoint FEA Interpolation Error Distribution: |T_fe(x_mid) - T_exact(x_mid)| [°C]
                  </h4>
                  <span className="text-[11px] font-mono text-cyan-400">
                    Max: {solveResult?.max_abs_midpoint_error_C.toFixed(5)} °C
                  </span>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="x"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Error_C"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 2.5, fill: '#ef4444' }}
                        name="Midpoint Error [°C]"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Mesh Convergence Study */}
          {activeTab === 'convergence' && (
            <div className="space-y-4">
              <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">
                      Mesh Convergence Study Across Elements N = 10, 20, 40, 80
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      Evaluating asymptotic convergence rate p = ln(E1/E2) / ln(h1/h2)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-slate-400">Observed Rate:</span>
                    <div className="text-sm font-bold text-emerald-400 font-mono">
                      p ≈ {convergenceData?.observed_convergence_rate.toFixed(4)} (2nd Order O(h²))
                    </div>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={convChartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="elements"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                        label={{
                          value: 'Max Absolute Error [°C]',
                          angle: -90,
                          position: 'insideLeft',
                          fill: '#94a3b8',
                          fontSize: 11,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="maxError"
                        stroke="#06b6d4"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#06b6d4' }}
                        name="C++ FEA Measured Error [°C]"
                      />
                      <Line
                        type="monotone"
                        dataKey="theoreticalError"
                        stroke="#10b981"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        dot={false}
                        name="Theoretical (q/8k) h² [°C]"
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Convergence Table */}
              <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 font-mono text-xs">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider mb-2">
                  Convergence Rate Table
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-1.5 px-2">Elements N</th>
                        <th className="py-1.5 px-2">Mesh Size h [m]</th>
                        <th className="py-1.5 px-2">Max Abs Error [°C]</th>
                        <th className="py-1.5 px-2">L2 Error</th>
                        <th className="py-1.5 px-2">Convergence Rate p</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {convergenceData?.points.map((pt) => (
                        <tr key={pt.num_elements} className="hover:bg-slate-800/40">
                          <td className="py-1.5 px-2 font-bold text-white">N = {pt.num_elements}</td>
                          <td className="py-1.5 px-2 text-slate-300">{pt.h_m.toFixed(4)}</td>
                          <td className="py-1.5 px-2 text-amber-400 font-bold">{pt.max_abs_error_C.toFixed(6)}</td>
                          <td className="py-1.5 px-2 text-slate-300">{pt.l2_error.toFixed(6)}</td>
                          <td className="py-1.5 px-2 text-emerald-400 font-bold">
                            {pt.convergence_rate > 0 ? pt.convergence_rate.toFixed(4) : 'Baseline'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 p-3 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                  {convergenceData?.theoretical_analysis}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Midpoint Error Table & Sample K Matrix */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              {/* Sample Global Stiffness Matrix and RHS Vector */}
              <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 font-mono text-xs">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-cyan-400" />
                    Global Stiffness Matrix [K] Sample (First 6×6 Nodes)
                  </h4>
                  <span className="text-[10px] text-slate-500">Tridiagonal Structure</span>
                </div>
                <div className="overflow-x-auto bg-slate-950 p-3 rounded border border-slate-800">
                  <div className="grid grid-cols-7 gap-2 text-center text-[10px]">
                    <span className="text-slate-500 font-bold">Row</span>
                    <span className="text-slate-500">Col 0</span>
                    <span className="text-slate-500">Col 1</span>
                    <span className="text-slate-500">Col 2</span>
                    <span className="text-slate-500">Col 3</span>
                    <span className="text-slate-500">Col 4</span>
                    <span className="text-slate-500">Col 5</span>
                    {solveResult?.global_k_sample.map((row, rIdx) => (
                      <React.Fragment key={rIdx}>
                        <span className="font-bold text-slate-400">#{rIdx}</span>
                        {row.map((val, cIdx) => (
                          <span
                            key={cIdx}
                            className={`p-1 rounded ${
                              val !== 0
                                ? rIdx === cIdx
                                  ? 'bg-cyan-950 text-cyan-300 font-bold'
                                  : 'bg-slate-900 text-slate-300'
                                : 'text-slate-600'
                            }`}
                          >
                            {val.toFixed(3)}
                          </span>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              {/* Numerical Error Table */}
              <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 font-mono text-xs">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider mb-2">
                  Midpoint FEA Interpolation & Error Analysis Table
                </h4>
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="sticky top-0 bg-[#0f172a] border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="py-1.5 px-2">Element #</th>
                        <th className="py-1.5 px-2">x_mid [m]</th>
                        <th className="py-1.5 px-2">T_fe_mid [°C]</th>
                        <th className="py-1.5 px-2">T_exact_mid [°C]</th>
                        <th className="py-1.5 px-2">Abs Error [°C]</th>
                        <th className="py-1.5 px-2">Rel Error [%]</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {solveResult?.midpoints.map((m) => (
                        <tr key={m.element_id} className="hover:bg-slate-800/40">
                          <td className="py-1 px-2 font-bold text-white">e_{m.element_id}</td>
                          <td className="py-1 px-2 text-slate-300">{m.x_mid_m.toFixed(4)}</td>
                          <td className="py-1 px-2 text-cyan-300">{m.temp_fe_mid_C.toFixed(4)}</td>
                          <td className="py-1 px-2 text-amber-300">{m.temp_exact_mid_C.toFixed(4)}</td>
                          <td className="py-1 px-2 text-rose-300 font-semibold">{m.abs_error_mid_C.toFixed(6)}</td>
                          <td className="py-1 px-2 text-slate-400">{m.relative_error_mid_pct.toFixed(4)} %</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Theory, Assumptions & Debugging Insight */}
          {activeTab === 'theory' && (
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 text-xs text-slate-300 space-y-4 leading-relaxed font-sans">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-2 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Engineering Problem Formulation & Verification Notes
              </h3>

              <div className="space-y-2">
                <h4 className="font-bold text-cyan-300 font-mono">1. GOVERNING DIFFERENTIAL EQUATION & ASSUMPTIONS</h4>
                <p>
                  The physical system is modeled as a uniform one-dimensional metallic conduction rod under steady-state conditions:
                  <br />
                  <code className="text-amber-300 font-mono bg-slate-900 px-2 py-0.5 rounded block my-1">
                    - d/dx [ k · A · (dT/dx) ] = q · A
                  </code>
                  Assumptions:
                  <br />
                  • Constant cross-sectional area <code className="text-slate-100 font-mono">A = 1×10⁻⁴ m²</code>.
                  <br />
                  • Constant isotropic thermal conductivity <code className="text-slate-100 font-mono">k = 10 W/(m·K)</code>.
                  <br />
                  • Uniform volumetric internal heat generation <code className="text-slate-100 font-mono">q = 10,000 W/m³</code>.
                  <br />
                  • Perfectly insulated lateral rod boundaries (pure 1D heat flow along x-axis).
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-cyan-300 font-mono">2. EXACT ANALYTICAL INTEGRATION</h4>
                <p>
                  Integrating twice with respect to x yields the parabolic temperature profile:
                  <br />
                  <code className="text-emerald-300 font-mono bg-slate-900 px-2 py-0.5 rounded block my-1">
                    T_exact(x) = 100 - (80 · x / L) + [ q / (2 · k) ] · x · (L - x)
                  </code>
                  With parameters <code className="text-slate-200 font-mono">L = 1 m, k = 10 W/(m·K), q = 10,000 W/m³</code>:
                  <br />
                  • At <code className="text-slate-200 font-mono">x = 0 m</code>: <code className="text-amber-400 font-mono">T = 100°C</code> (Left Dirichlet).
                  <br />
                  • At <code className="text-slate-200 font-mono">x = 0.5 m</code>: <code className="text-amber-400 font-mono">T = 100 - 40 + 500(0.5)(0.5) = 185°C</code>.
                  <br />
                  • At <code className="text-slate-200 font-mono">x = 1.0 m</code>: <code className="text-amber-400 font-mono">T = 100 - 80 + 0 = 20°C</code> (Right Dirichlet).
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-cyan-300 font-mono">3. FINITE ELEMENT WEAK FORM & ASSEMBLY</h4>
                <p>
                  Two-node linear elements with shape functions <code className="text-slate-100 font-mono">N₁(ξ) = 1 - ξ/h</code>, <code className="text-slate-100 font-mono">N₂(ξ) = ξ/h</code>.
                  <br />
                  Element stiffness matrix:
                  <code className="text-cyan-300 font-mono bg-slate-900 px-2 py-0.5 rounded block my-1">
                    Kᵉ = (k · A / h) · [ [ 1, -1 ], [ -1, 1 ] ]
                  </code>
                  Element load vector:
                  <code className="text-cyan-300 font-mono bg-slate-900 px-2 py-0.5 rounded block my-1">
                    Fᵉ = (q · A · h / 2) · [ 1, 1 ]ᵀ
                  </code>
                  Linear system solved via the <strong>Thomas Algorithm (TDMA)</strong> in optimal <strong>O(N)</strong> time complexity.
                </p>
              </div>

              <div className="p-3 rounded bg-amber-950/40 border border-amber-800/60 space-y-1">
                <h4 className="font-bold text-amber-300 font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  KEY DEBUGGING INSIGHT
                </h4>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  <strong>Dirichlet Boundary Condition Coupling & RHS Load Adjustment:</strong>
                  When applying essential boundary conditions <code className="text-amber-100 font-mono">T₀ = 100°C</code> and <code className="text-amber-100 font-mono">T_N = 20°C</code>, simply zeroing the first row and setting <code className="text-amber-100 font-mono">K₀₀ = 1</code> without updating the adjacent row equation (<code className="text-amber-100 font-mono">Row 1</code>) destroys matrix symmetry and introduces boundary coupling errors.
                  The implementation subtracts <code className="text-amber-100 font-mono">K₁₀ · T₀</code> from <code className="text-amber-100 font-mono">d₁</code> and <code className="text-amber-100 font-mono">K[N-1, N] · T_N</code> from <code className="text-amber-100 font-mono">d[N-1]</code>.
                  This ensures that all interior nodal temperatures match the exact analytical solution to within numerical precision (<code className="text-amber-100 font-mono">~10⁻¹⁴ °C</code>), yielding exact theoretical midpoint error <code className="text-amber-100 font-mono">e_mid = (q / 8k) · h² = 125 · h²</code>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
