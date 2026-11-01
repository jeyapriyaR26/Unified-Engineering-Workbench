import {
  EngineStatus,
  ThermalParams,
  ThermalSolveData,
  ConvergenceStudyData,
  StlGeometryData,
  TemperatureCsvData,
  BenchmarkReportData,
  DeviceInfoData,
  HardwarePinEntry,
  TrainingResultData,
} from '../types/workbench';

export const api = {
  async getStatus(): Promise<EngineStatus> {
    const res = await fetch('/api/status');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to get engine status');
    return json.data;
  },

  async solveThermal(params: ThermalParams): Promise<ThermalSolveData> {
    const res = await fetch('/api/thermal/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Thermal solve failed');
    return json.data;
  },

  async runConvergenceStudy(params?: Partial<ThermalParams>): Promise<ConvergenceStudyData> {
    const res = await fetch('/api/thermal/convergence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {}),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Convergence study failed');
    return json.data;
  },

  async parseStlContent(content: string): Promise<StlGeometryData> {
    const res = await fetch('/api/geometry/stl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to parse STL');
    return json.data;
  },

  async parseTemperatureCsv(content: string): Promise<TemperatureCsvData> {
    const res = await fetch('/api/geometry/csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to parse Temperature CSV');
    return json.data;
  },

  async loadSampleStl(): Promise<{ content: string; filename: string }> {
    const res = await fetch('/api/geometry/sample-stl');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load sample STL');
    return json;
  },

  async loadSampleCsv(): Promise<{ content: string; filename: string }> {
    const res = await fetch('/api/geometry/sample-csv');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load sample CSV');
    return json;
  },

  async runBenchmark(config: {
    case_count: number;
    mesh_elements: number;
    random_seed: number;
    repetitions: number;
  }): Promise<BenchmarkReportData> {
    const res = await fetch('/api/performance/benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Benchmark failed');
    return json.data;
  },

  async getHardwareDevices(): Promise<{
    devices: DeviceInfoData[];
    pin_table: HardwarePinEntry[];
    jtag_analysis: string;
  }> {
    const res = await fetch('/api/hardware/devices');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to get devices');
    return json.data;
  },

  async connectHardware(deviceId: string, simulateTimeout: boolean = false): Promise<any> {
    const res = await fetch('/api/hardware/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, simulate_timeout: simulateTimeout }),
    });
    const json = await res.json();
    return json.data;
  },

  async disconnectHardware(deviceId: string): Promise<any> {
    const res = await fetch('/api/hardware/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId }),
    });
    const json = await res.json();
    return json.data;
  },

  async recoverHardware(deviceId: string): Promise<any> {
    const res = await fetch('/api/hardware/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId }),
    });
    const json = await res.json();
    return json.data;
  },

  async getHardwareTelemetry(deviceId: string): Promise<any> {
    const res = await fetch(`/api/hardware/telemetry/${deviceId}`);
    const json = await res.json();
    return json.data;
  },

  async trainBackprop(config: {
    steps: number;
    learning_rate: number;
    w?: number;
    b?: number;
    v?: number;
    c?: number;
  }): Promise<TrainingResultData> {
    const res = await fetch('/api/ml/train', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, include_csv: true }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Backprop training failed');
    return json.data;
  },

  async getMlAppendix(): Promise<{ derivation_text: string }> {
    const res = await fetch('/api/ml/appendix');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to get appendix');
    return json.data;
  },
};
