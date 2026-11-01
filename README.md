# UNIFIED ENGINEERING WORKBENCH
## PASS SCIENCE WORKS – R&D INTERNSHIP 2026–2027

A desktop/web engineering simulation application built for the PASS Science Works 2026–2027 R&D assessment. The application combines an authoritative ISO C++17 numerical engine with an interactive TypeScript / React / Three.js frontend.

---

## 1. TECHNOLOGY STACK & ARCHITECTURE

- **Frontend Presentation Layer:**
  - React 19 + TypeScript + Vite
  - Tailwind CSS (v4)
  - Three.js for interactive 3D WebGL mesh rendering and colormapped thermal point clouds
  - Recharts for convergence and telemetry graphs
  - Lucide icons
- **High-Performance Computational Core:**
  - Standard ISO C++17
  - CMake (v3.14+)
  - Bounded multi-threaded concurrency (\`std::thread\` & \`std::chrono\`)
  - Modern JSON serialization via \`nlohmann::json\`
  - Full CTest automated testing suite (21/21 passing tests)
- **Host IPC Layer:**
  - Express server bridge forwarding typed JSON requests to \`workbench_engine\` via command-line arguments and standard pipes.

---

## 2. MODULE OVERVIEW

1. **Overview Dashboard:**
   - Real-time C++ core health, host processor metrics, compiler optimization level, active simulations, and quick jump navigation.
2. **Task B: Geometry Viewer:**
   - C++ ASCII STL parser with facet validation, triangle area summation, and bounding box computation.
   - 5-column temperature CSV validator (\`node_id,x_m,y_m,z_m,temperature_C\`).
   - Interactive Three.js 3D viewport with orbit controls, wireframe modes, cool-to-warm temperature colorbar, and spatial node inspection.
3. **Task C: Thermal Finite Element Analysis:**
   - Real 1D steady-state finite element solver for uniform rod conduction with internal volumetric heat generation.
   - Solves $-d/dx[k A dT/dx] = q A$ with Dirichlet boundary conditions $T(0)=100^\circ\text{C}$ and $T(L)=20^\circ\text{C}$.
   - Tridiagonal Thomas Algorithm ($O(N)$ operations).
   - Mesh convergence study across $N=10, 20, 40, 80$ elements confirming exact theoretical second-order convergence rate $p \approx 2.0000$.
4. **Task D: Multicore Performance Lab:**
   - Genuine multi-core CPU scaling using bounded worker pools with chunk partitioning.
   - Deterministic Mersenne Twister seed generation.
   - Timing over 5 measured repetitions per thread count ($p = 1, 2, 3, 4$ threads).
   - Numerical equivalence verified to $\le 1\times 10^{-8\circ}\text{C}$ between serial and parallel runs.
5. **Task E: Embedded Hardware Lab:**
   - Modular laboratory workbench modeling STM32H7 MCU (ARM Cortex-M7), Xilinx Artix-7 FPGA, and Segger J-Link JTAG probe.
   - System block diagram, complete 8-column pin-voltage interface table, level shifting, and signal ownership.
   - Mock drivers with device discovery, telemetry streaming, simulated recoverable timeout faults, and recovery sequences.
   - Rigorous theoretical analysis explaining why a JTAG adapter is a state-machine debugging interface rather than an interchangeable computing core.
6. **Task F: Manual Backpropagation Lab:**
   - Single-hidden-neuron regression without automatic differentiation.
   - Exact analytical chain-rule derivatives for $w, b, v, c$.
   - Central finite-difference verification ($\epsilon = 1\times 10^{-6}$) confirming error $\le 1\times 10^{-5}$.
   - 100 subsequent training steps with strict monotonic loss reduction and CSV export.
7. **Task 10: Reports and Data Exports:**
   - Complete 6-page technical report adhering to the assessment guidelines.
   - Direct CSV export of all numerical FEA datasets, benchmark matrices, and backprop trajectories.
8. **Settings & Compliance:**
   - Full toolchain inspection, transparent AI disclosure log (Section 14), and Windows 11 packaging documentation.

---

## 3. HOW TO BUILD AND RUN

### Quick Start (Development / Web)
\`\`\`bash
# 1. Compile C++ core and verification test suite
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release -j$(nproc)

# 2. Run automated verification suite (21 unit tests)
./build/workbench_tests

# 3. Start full-stack server
npm run dev
# The application will be live at http://localhost:3000
\`\`\`

### Windows 11 Standalone Execution
1. Extract the project ZIP to a clean Windows 11 machine.
2. Double-click **\`Launch.bat\`** or **\`Launch.exe\`**.
3. The server starts automatically and opens your default browser to \`http://localhost:3000\`.
4. No terminal commands, external packages, or internet access required.

---

## 4. VERIFICATION EVIDENCE SUMMARY

- **Automated CTest Suite:** 21 Tests Passed, 0 Failed (100% Pass Rate).
- **Thermal FEA Convergence:** Second-order spatial accuracy ($p = 2.0000$, error matching theoretical $(q/8k)h^2$).
- **Multicore Agreement:** $\max |T_{\text{serial}} - T_{\text{parallel}}| \le 1\times 10^{-8\circ}\text{C}$.
- **Neural Gradient Precision:** Analytical vs finite-difference error $\le 3.2\times 10^{-11} \le 1\times 10^{-5}$.
