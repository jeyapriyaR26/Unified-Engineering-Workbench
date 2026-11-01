export interface SystemHardwareInfo {
  compiler: string;
  cpu_model: string;
  logical_cores: number;
  physical_cores: number;
  optimization: string;
  os: string;
  ram_gb: number;
}

export interface EngineStatus {
  engine: string;
  version: string;
  standard: string;
  system_info: SystemHardwareInfo;
  status: string;
}

// Thermal FEA
export interface ThermalParams {
  length: number;
  area: number;
  conductivity: number;
  heat_gen: number;
  temp_left: number;
  temp_right: number;
  num_elements: number;
}

export interface ThermalNodeResult {
  index: number;
  x_m: number;
  temp_fe_C: number;
  temp_analytical_C: number;
  error_C: number;
}

export interface ThermalMidpointResult {
  element_id: number;
  x_mid_m: number;
  temp_fe_mid_C: number;
  temp_exact_mid_C: number;
  abs_error_mid_C: number;
  relative_error_mid_pct: number;
}

export interface ThermalSolveData {
  success: boolean;
  message: string;
  params: {
    length_m: number;
    area_m2: number;
    conductivity_W_mK: number;
    heat_gen_W_m3: number;
    temp_left_C: number;
    temp_right_C: number;
    num_elements: number;
  };
  nodes: ThermalNodeResult[];
  midpoints: ThermalMidpointResult[];
  max_abs_midpoint_error_C: number;
  max_rel_midpoint_error_pct: number;
  l2_midpoint_error: number;
  rmse_C: number;
  global_k_sample: number[][];
  global_f_sample: number[];
}

export interface ConvergencePoint {
  num_elements: number;
  h_m: number;
  max_abs_error_C: number;
  l2_error: number;
  convergence_rate: number;
}

export interface ConvergenceStudyData {
  success: boolean;
  observed_convergence_rate: number;
  theoretical_analysis: string;
  points: ConvergencePoint[];
}

// Geometry
export interface BoundingBox3D {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
  center: { x: number; y: number; z: number };
  dimensions: { x: number; y: number; z: number };
}

export interface StlGeometryData {
  valid: boolean;
  error_message?: string;
  solid_name: string;
  triangle_count: number;
  surface_area: number;
  bbox: BoundingBox3D;
  vertices?: number[];
  normals?: number[];
}

export interface TemperatureNodeData {
  node_id: number;
  x_m: number;
  y_m: number;
  z_m: number;
  temperature_C: number;
}

export interface TemperatureCsvData {
  valid: boolean;
  error_message?: string;
  stats: {
    node_count: number;
    min_temp_C: number;
    max_temp_C: number;
    mean_temp_C: number;
    std_temp_C: number;
    bbox: BoundingBox3D;
  };
  nodes: TemperatureNodeData[];
}

// Performance
export interface ThreadBenchmarkResult {
  num_threads: number;
  repetition_times_ms: number[];
  median_time_ms: number;
  min_time_ms: number;
  max_time_ms: number;
  mean_time_ms: number;
  speedup: number;
  efficiency: number;
}

export interface BenchmarkReportData {
  success: boolean;
  message: string;
  hardware_info: SystemHardwareInfo;
  config: {
    case_count: number;
    mesh_elements: number;
    random_seed: number;
    repetitions: number;
  };
  results: ThreadBenchmarkResult[];
  max_serial_parallel_diff_C: number;
  correctness_verified: boolean;
  verification_notes: string;
}

// Hardware Lab
export interface DeviceTelemetry {
  temp_C: number;
  vcc_core_V: number;
  vcc_io_V: number;
  current_mA: number;
  clock_mhz: number;
  state_desc: string;
  registers: Record<string, string>;
  packets?: number;
}

export interface DeviceInfoData {
  device_id: string;
  name: string;
  type: number; // 0=MCU, 1=FPGA, 2=JTAG
  serial_number: string;
  firmware_version: string;
  interface: string;
  capabilities: string[];
  state: number; // 0=DISCONNECTED, 1=CONNECTING, 2=CONNECTED, 3=TIMEOUT
  telemetry: DeviceTelemetry;
}

export interface HardwarePinEntry {
  subsystem: string;
  signal_name: string;
  voltage_nominal: string;
  direction: string;
  connector: string;
  level_shifting: string;
  ownership_role: string;
}

// Backpropagation
export interface ModelParams {
  w: number;
  b: number;
  v: number;
  c: number;
}

export interface StepRecordData {
  step: number;
  w: number;
  b: number;
  v: number;
  c: number;
  z: number;
  h: number;
  y_hat: number;
  loss: number;
  analytical_grad: { dw: number; db: number; dv: number; dc: number };
  numerical_grad: { dw: number; db: number; dv: number; dc: number };
  grad_diff: { dw: number; db: number; dv: number; dc: number };
  verification_passed: boolean;
}

export interface TrainingResultData {
  success: boolean;
  message: string;
  input_x: number;
  target_y: number;
  learning_rate: number;
  epsilon: number;
  initial_params: ModelParams;
  final_params: ModelParams;
  initial_loss: number;
  final_loss: number;
  max_verification_error: number;
  all_verifications_passed: boolean;
  history: StepRecordData[];
  mathematical_derivation: string;
  csv_export?: string;
}
