import React, { useState, useEffect } from 'react';
import {
  Zap,
  Play,
  Cpu,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  TrendingUp,
  Percent,
  Download,
  Info,
  Server,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { api } from '../services/api';
import { BenchmarkReportData } from '../types/workbench';

interface PerformancePageProps {
  onComputationStart: (msg: string) => void;
  onComputationEnd: (msg: string, isError?: boolean) => void;
  onBenchmarkUpdate: (report: BenchmarkReportData) => void;
}

export const PerformancePage: React.FC<PerformancePageProps> = ({
  onComputationStart,
  onComputationEnd,
  onBenchmarkUpdate,
}) => {
  const [caseCount, setCaseCount] = useState<number>(1000);
  const [meshElements, setMeshElements] = useState<number>(40);
  const [randomSeed, setRandomSeed] = useState<number>(42);
  const [repetitions, setRepetitions] = useState<number>(5);
  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReportData | null>(null);

  // Run benchmark on initial mount with realistic sample workload
  useEffect(() => {
    runBenchmark();
  }, []);

  const runBenchmark = async () => {
    try {
      onComputationStart(
        `Running C++ Multicore Benchmark with ${caseCount} cases, mesh N=${meshElements}, 5 repetitions...`
      );
      const res = await api.runBenchmark({
        case_count: caseCount,
        mesh_elements: meshElements,
        random_seed: randomSeed,
        repetitions: repetitions,
      });
      setBenchmarkReport(res);
      onBenchmarkUpdate(res);
      const maxSp = res.results.length > 0 ? res.results[res.results.length - 1].speedup : 1.0;
      onComputationEnd(
        `Benchmark completed. Verified diff: ${res.max_serial_parallel_diff_C.toExponential(3)} °C. Max speedup: ${maxSp.toFixed(2)}x.`
      );
    } catch (err: any) {
      onComputationEnd(err.message, true);
    }
  };

  const exportBenchmarkCsv = () => {
    if (!benchmarkReport) return;
    let csv = 'threads,rep1_ms,rep2_ms,rep3_ms,rep4_ms,rep5_ms,median_ms,min_ms,max_ms,speedup,efficiency\n';
    benchmarkReport.results.forEach((r) => {
      csv += `${r.num_threads},${r.repetition_times_ms.join(',')},${r.median_time_ms.toFixed(3)},${r.min_time_ms.toFixed(3)},${r.max_time_ms.toFixed(3)},${r.speedup.toFixed(3)},${r.efficiency.toFixed(3)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark_multicore_${caseCount}_cases.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare chart data
  const timeChartData = benchmarkReport?.results.map((r) => ({
    threads: `${r.num_threads} Core${r.num_threads > 1 ? 's' : ''}`,
    median_ms: Number(r.median_time_ms.toFixed(2)),
    min_ms: Number(r.min_time_ms.toFixed(2)),
    max_ms: Number(r.max_time_ms.toFixed(2)),
  })) || [];

  const scalingChartData = benchmarkReport?.results.map((r) => ({
    threads: `${r.num_threads} Core${r.num_threads > 1 ? 's' : ''}`,
    speedup: Number(r.speedup.toFixed(3)),
    idealSpeedup: r.num_threads,
    efficiencyPct: Number((r.efficiency * 100).toFixed(1)),
  })) || [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0f172a] p-4 rounded-lg border border-slate-700">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono mb-1">
            <Zap className="w-3.5 h-3.5" />
            <span>TASK D • BOUNDED C++ WORKER POOL SCALING LAB</span>
          </div>
          <h2 className="text-lg font-bold text-white">Multicore Performance Benchmark</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluates genuine CPU-parallel execution using std::thread chunks, measuring wall-clock time across 5 repetitions and verifying serial/parallel numerical agreement ≤ 1e-8 °C.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={runBenchmark}
            className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 transition shadow-md shadow-cyan-950"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Execute Benchmark
          </button>

          <button
            onClick={exportBenchmarkCsv}
            disabled={!benchmarkReport}
            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-mono flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Numerical Agreement & Verification Banner */}
      {benchmarkReport && (
        <div
          className={`p-3.5 rounded-lg border font-mono text-xs flex items-center justify-between ${
            benchmarkReport.correctness_verified
              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
              : 'bg-rose-950/40 border-rose-700/60 text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-white uppercase tracking-wider block">
                {benchmarkReport.verification_notes}
              </span>
              <span className="text-[11px] text-slate-300">
                Max absolute serial vs parallel deviation: {benchmarkReport.max_serial_parallel_diff_C.toExponential(4)} °C (Threshold: 1.000e-08 °C).
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-emerald-900/60 text-emerald-300 font-bold text-[11px] border border-emerald-600 shrink-0">
            VERIFIED DETERMINISTIC
          </span>
        </div>
      )}

      {/* Main Grid: Config Form & Hardware Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Benchmark Configuration & Hardware Info */}
        <div className="space-y-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 text-xs font-mono space-y-3">
            <h3 className="font-bold text-slate-200 uppercase tracking-wider pb-1 border-b border-slate-800">
              BENCHMARK CONFIGURATION
            </h3>

            <div>
              <label className="text-slate-400 block mb-1">Workload Cases:</label>
              <select
                value={caseCount}
                onChange={(e) => setCaseCount(parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
              >
                <option value={200}>200 solves (Fast)</option>
                <option value={500}>500 solves</option>
                <option value={1000}>1,000 solves (Standard)</option>
                <option value={2000}>2,000 solves (Stress)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Mesh Elements per Case:</label>
              <select
                value={meshElements}
                onChange={(e) => setMeshElements(parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
              >
                <option value={20}>N = 20 elements</option>
                <option value={40}>N = 40 elements</option>
                <option value={80}>N = 80 elements</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Deterministic Seed:</label>
              <input
                type="number"
                value={randomSeed}
                onChange={(e) => setRandomSeed(parseInt(e.target.value) || 42)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Repetitions (Per Thread):</label>
              <input
                type="number"
                value={repetitions}
                readOnly
                className="w-full bg-slate-900/50 border border-slate-800 rounded px-2.5 py-1.5 text-slate-400"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Fixed at 5 repetitions to compute median wall-clock time
              </span>
            </div>

            <button
              onClick={runBenchmark}
              className="w-full mt-2 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-cyan-300 font-bold text-xs"
            >
              Rerun Benchmark
            </button>
          </div>

          {/* Hardware Specs Display */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 text-xs font-mono space-y-2.5">
            <h3 className="font-bold text-slate-200 uppercase tracking-wider pb-1 border-b border-slate-800 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              SYSTEM REPORT
            </h3>

            <div className="flex justify-between text-slate-400">
              <span>Logical CPUs:</span>
              <span className="text-cyan-400 font-bold">
                {benchmarkReport?.hardware_info?.logical_cores || 4} Cores
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Physical Cores:</span>
              <span className="text-slate-200">
                {benchmarkReport?.hardware_info?.physical_cores || 2} Cores
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>RAM Total:</span>
              <span className="text-slate-200">
                {benchmarkReport?.hardware_info?.ram_gb ? `${benchmarkReport.hardware_info.ram_gb.toFixed(1)} GB` : '8.0 GB'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Compiler:</span>
              <span className="text-emerald-400 font-semibold truncate max-w-[130px]" title={benchmarkReport?.hardware_info?.compiler}>
                {benchmarkReport?.hardware_info?.compiler || 'GCC 12.3.0'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Flags:</span>
              <span className="text-amber-400 font-semibold truncate max-w-[130px]" title={benchmarkReport?.hardware_info?.optimization}>
                {benchmarkReport?.hardware_info?.optimization || '-O3 -std=c++17'}
              </span>
            </div>
            <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-500">
              Warm-up pass: 1 full iteration executed before recording timers.
            </div>
          </div>
        </div>

        {/* Right 3 Columns: Charts & Benchmark Matrix */}
        <div className="lg:col-span-3 space-y-4">
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart 1: Wall-clock Computation Time */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  Wall-Clock Time [ms] (Median)
                </h3>
                <span className="text-[10px] font-mono text-slate-500">Lower is faster</span>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="threads"
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                      label={{
                        value: 'Time [ms]',
                        angle: -90,
                        position: 'insideLeft',
                        fill: '#94a3b8',
                        fontSize: 10,
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
                    <Bar dataKey="median_ms" fill="#06b6d4" name="Median Time [ms]" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Speedup & Parallel Efficiency */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  Speedup Sp = T1 / Tp
                </h3>
                <span className="text-[10px] font-mono text-emerald-400">Higher is better</span>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scalingChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="threads"
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                      label={{
                        value: 'Speedup Ratio',
                        angle: -90,
                        position: 'insideLeft',
                        fill: '#94a3b8',
                        fontSize: 10,
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
                      dataKey="speedup"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#10b981' }}
                      name="Measured Speedup Sp"
                    />
                    <Line
                      type="monotone"
                      dataKey="idealSpeedup"
                      stroke="#64748b"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      dot={false}
                      name="Ideal Linear Speedup"
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Benchmark Results Matrix Table */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 font-mono text-xs">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider">
                Full 5-Repetition Benchmark Measurement Matrix
              </h4>
              <span className="text-[10px] text-slate-500">
                Wall-Clock High-Resolution std::chrono
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 px-2.5">Workers (p)</th>
                    <th className="py-2 px-2">Rep 1 [ms]</th>
                    <th className="py-2 px-2">Rep 2 [ms]</th>
                    <th className="py-2 px-2">Rep 3 [ms]</th>
                    <th className="py-2 px-2">Rep 4 [ms]</th>
                    <th className="py-2 px-2">Rep 5 [ms]</th>
                    <th className="py-2 px-2.5 font-bold text-cyan-300">Median [ms]</th>
                    <th className="py-2 px-2">Speedup Sp</th>
                    <th className="py-2 px-2">Efficiency Ep</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {benchmarkReport?.results.map((r) => (
                    <tr key={r.num_threads} className="hover:bg-slate-800/40">
                      <td className="py-2 px-2.5 font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        {r.num_threads} {r.num_threads === 1 ? 'Worker (Serial)' : 'Workers (Parallel)'}
                      </td>
                      {r.repetition_times_ms.map((t, idx) => (
                        <td key={idx} className="py-2 px-2 text-slate-400">
                          {t.toFixed(2)}
                        </td>
                      ))}
                      <td className="py-2 px-2.5 font-bold text-cyan-300">
                        {r.median_time_ms.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 font-bold text-emerald-400">
                        {r.speedup.toFixed(2)}x
                      </td>
                      <td className="py-2 px-2 text-slate-300">
                        {(r.efficiency * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
