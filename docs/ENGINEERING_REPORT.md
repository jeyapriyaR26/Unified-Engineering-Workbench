# UNIFIED ENGINEERING WORKBENCH: TECHNICAL REPORT
## PASS SCIENCE WORKS – R&D INTERNSHIP 2026–2027
**Candidate Assessment Project** | **Target Architecture:** Windows 11 x64 / Linux x86_64 | **Engine:** ISO C++17 Core

---

### EXECUTIVE SUMMARY
The **Unified Engineering Workbench** is an engineering simulation platform developed to satisfy the requirements of the PASS Science Works 2026–2027 R&D assessment. The workbench pairs a React 19 / TypeScript / Three.js frontend with an authoritative ISO C++17 numerical engine. All finite-element boundary value systems, multicore concurrency scaling, geometry parsing, embedded peripheral simulations, and gradient descent optimizations are executed in compiled C++.

---

### SECTION 1: SYSTEM ARCHITECTURE & INTER-PROCESS COMMUNICATION

#### 1.1 Separation of Concerns
1. **Frontend Presentation (React 19, TypeScript, Tailwind CSS, Three.js, Recharts):**
   Renders the dark industrial user interface, provides orbit-control 3D viewport navigation for triangulated meshes and spatial point clouds, and renders telemetry and convergence charts. All computational logic is delegated to the backend.
2. **Authoritative Computational Core (C++17 \`workbench_engine\`):**
   Modular C++ library and CLI engine containing modules for geometry (\`stl_parser\`, \`temperature_csv\`), thermal analysis (\`fea_solver\`), multicore performance (\`benchmark_pool\`), embedded hardware (\`mock_adapters\`), and machine learning (\`backpropagation\`).
3. **Local IPC Layer (Express Bridge):**
   Handles HTTP requests from the browser and executes \`workbench_engine --cmd <command> --payload '<json>'\`, serializing and deserializing JSON via \`nlohmann::json\`.

#### 1.2 Directory Layout
\`\`\`
unified-engineering-workbench/
├── backend/
│   ├── include/
│   │   ├── common/        (ipc_protocol.hpp, system_info.hpp)
│   │   ├── geometry/      (stl_parser.hpp, temperature_csv.hpp)
│   │   ├── thermal/       (fea_solver.hpp)
│   │   ├── performance/   (benchmark_pool.hpp)
│   │   ├── hardware/      (mock_adapters.hpp)
│   │   ├── ml/            (backpropagation.hpp)
│   │   └── nlohmann/      (json.hpp)
│   └── src/
│       ├── geometry/      (stl_parser.cpp, temperature_csv.cpp)
│       ├── thermal/       (fea_solver.cpp)
│       ├── performance/   (benchmark_pool.cpp)
│       ├── hardware/      (mock_adapters.cpp)
│       ├── ml/            (backpropagation.cpp)
│       └── main.cpp
├── tests/                 (test_main.cpp, test_geometry.cpp, test_thermal.cpp, ...)
├── data/                  (sample_bracket.stl, sample_temperature_field.csv)
├── docs/                  (ENGINEERING_REPORT.md, AI_DISCLOSURE.md, ...)
├── scripts/               (Launch.cpp)
├── src/                   (React components, pages, services, types)
├── CMakeLists.txt
├── Launch.bat
├── Launch.exe
└── README.md
\`\`\`

---

### SECTION 2: 1D THERMAL FINITE ELEMENT ANALYSIS & VERIFICATION

#### 2.1 Governing Differential Equation
Uniform metallic rod with length $L = 1.0\text{ m}$, area $A = 1\times 10^{-4}\text{ m}^2$, thermal conductivity $k = 10.0\text{ W}/(\text{m}\cdot\text{K})$, and volumetric heat generation $q = 10,000\text{ W}/\text{m}^3$:
$$-\frac{d}{dx}\left(k A \frac{dT}{dx}\right) = q A \implies -k \frac{d^2T}{dx^2} = q$$
Dirichlet boundary conditions:
$$T(0) = 100^\circ\text{C}, \quad T(L) = 20^\circ\text{C}$$

#### 2.2 Analytical Integration
Integrating twice:
$$\frac{dT}{dx} = -\frac{q}{k}x + C_1$$
$$T(x) = -\frac{q}{2k}x^2 + C_1 x + C_2$$
Using $T(0) = 100 \implies C_2 = 100$.
Using $T(L) = 20 \implies 20 = -\frac{q L^2}{2k} + C_1 L + 100 \implies C_1 = -\frac{80}{L} + \frac{q L}{2k}$.
Analytical solution:
$$T_{\text{exact}}(x) = 100 - 80\frac{x}{L} + \left[\frac{q}{2k}\right] x(L - x) = 100 - 80x + 500x(1 - x)$$
At midpoint $x = 0.5\text{ m}$:
$$T_{\text{exact}}(0.5) = 100 - 40 + 500(0.5)(0.5) = 185.0^\circ\text{C}$$

#### 2.3 Linear Finite Element Weak Form & Thomas Elimination
Discretizing into $N$ linear two-node elements of length $h = L/N$.
Element stiffness matrix:
$$K^e = \frac{k A}{h}\begin{bmatrix} 1 & -1 \\ -1 & 1 \end{bmatrix}$$
Element load vector:
$$F^e = \frac{q A h}{2}\begin{bmatrix} 1 \\ 1 \end{bmatrix}$$
The global stiffness matrix is symmetric tridiagonal. Dirichlet boundaries are applied by zeroing row 0 ($b_0 = 1, d_0 = T_{\text{left}}$) and row $N$ ($b_N = 1, d_N = T_{\text{right}}$), and adjusting row 1 ($d_1 \leftarrow d_1 - a_1 T_{\text{left}}$) and row $N-1$ ($d_{N-1} \leftarrow d_{N-1} - c_{N-1} T_{\text{right}}$).
Linear system is solved via the **Thomas Algorithm** in $O(N)$ operations.

#### 2.4 Theoretical & Measured Convergence Study
Theoretical interpolation error at element midpoints for linear elements:
$$e_{\text{midpoint}} = \frac{q}{8k} h^2 = \frac{10000}{80} h^2 = 125 h^2$$

| Mesh Elements $N$ | Element Size $h$ [m] | Measured Max Error [°C] | Theoretical $125 h^2$ [°C] | Convergence Rate $p$ |
|:---:|:---:|:---:|:---:|:---:|
| $N = 10$ | $0.1000$ | $1.250000$ | $1.250000$ | Baseline |
| $N = 20$ | $0.0500$ | $0.312500$ | $0.312500$ | $2.0000$ |
| $N = 40$ | $0.0250$ | $0.078125$ | $0.078125$ | $2.0000$ |
| $N = 80$ | $0.0125$ | $0.019531$ | $0.019531$ | $2.0000$ |

**Conclusion:** The observed rate $p = 2.0000$ strictly confirms second-order spatial convergence ($O(h^2)$).

---

### SECTION 3: MULTICORE PARALLEL COMPUTATION & BENCHMARKING

#### 3.1 Workload Generation & Concurrency Model
A pseudo-random Mersenne Twister generator (\`std::mt19937_64\` with seed 42) produces 1,000 independent thermal test cases with varied positive thermal conductivity $k \in [5, 50]\text{ W/(m K)}$ and internal heat generation $q \in [1000, 50000]\text{ W/m}^3$.
Cases are partitioned deterministically across worker threads into contiguous slices ($chunk = \lceil N / p \rceil$).

#### 3.2 Benchmark Timings & Speedup Metrics
Measurements are taken via \`std::chrono::high_resolution_clock\` over 5 repetitions per configuration after 1 warmup cycle.
- **Speedup:** $S_p = T_1 / T_p$
- **Parallel Efficiency:** $E_p = S_p / p$
- **Numerical Difference Tolerance:**
  $$\max |T_{\text{serial}} - T_{\text{parallel}}| \le 1\times 10^{-8\circ}\text{C}$$
Observed maximum difference was $0.0\text{ °C}$ ($< 10^{-14\circ}\text{C}$), demonstrating zero floating-point divergence.

---

### SECTION 4: EMBEDDED HARDWARE INTERFACING & JTAG ARCHITECTURE

#### 4.1 Subsystem Specifications & Voltage Domains
1. **STM32H753ZI Microcontroller (ARM Cortex-M7):**
   - 480 MHz core clock, 3.3V logic level, USB CDC virtual COM port, SWD/JTAG debug target.
2. **Xilinx Artix-7 XC7A100T FPGA Platform:**
   - 1.0V internal logic core, 1.8V auxiliary rail, 3.3V I/O banks, bidirectional level shifters, boundary-scan TAP receiver.
3. **Segger J-Link Ultra+ JTAG Probe:**
   - Hardware bus master driving TCK, TMS, TDI and sampling TDO. Level-shifted via target reference voltage $V_{\text{Tref}}$ (1.2V to 3.6V).

#### 4.2 Why a JTAG Adapter is Not an Interchangeable Computing Board
A JTAG adapter does not execute application code or numerical algorithms. It is an **instrumentation bridge and state machine controller**:
- **16-State TAP Controller:** Its sole function is clocking IEEE 1149.1 state machine transitions (Test-Logic-Reset, Run-Test/Idle, Select-DR/IR, Shift-DR/IR).
- **Bus Ownership:** The adapter acts exclusively as a master controller for boundary scan cells and processor halt/step registers.
- **Power Enslavement:** The probe's I/O buffers are powered by the target device's reference rail ($V_{\text{Tref}}$) to prevent back-powering target silicon when powered off.

---

### SECTION 5: MANUAL BACKPROPAGATION LAB & FINITE DIFFERENCE VERIFICATION

#### 5.1 Architecture & Derivation
- Single hidden neuron regression: $x = 1$, target $y = 2$.
- $z = w \cdot x + b$, $h = \tanh(z)$, $\hat{y} = v \cdot h + c$.
- Loss $J = \frac{1}{2}(\hat{y} - y)^2$.
- Initial weights: $w_0 = 0.5, b_0 = 0, v_0 = 1.0, c_0 = 0$. Initial loss $J_0 = 1.182542$.
- Learning rate $\alpha = 0.1$.

Analytical chain-rule gradients evaluated at Step 0:
$$\frac{\partial J}{\partial c} = \hat{y} - y = -1.53788284$$
$$\frac{\partial J}{\partial v} = (\hat{y} - y) h = (-1.53788284)(0.46211716) = -0.71068205$$
$$\frac{\partial J}{\partial w} = (\hat{y} - y) v (1 - h^2) x = -1.20946430$$
$$\frac{\partial J}{\partial b} = (\hat{y} - y) v (1 - h^2) = -1.20946430$$

#### 5.2 Central Finite Difference Verification ($\epsilon = 1\times 10^{-6}$)
$$\frac{\partial J_{\text{num}}}{\partial \theta} = \frac{J(\theta + \epsilon) - J(\theta - \epsilon)}{2\epsilon}$$
Maximum absolute error across all parameters:
$$\max |\nabla_{\text{analytical}} - \nabla_{\text{numerical}}| = 3.2\times 10^{-11} \le 1.0\times 10^{-5} \quad \text{[STRICTLY VERIFIED]}$$
Training converged over 100 steps to a final loss of $0.000014$, representing a $99.998\%$ error reduction.

---

### SECTION 6: SOFTWARE TESTING EVIDENCE & LIMITATIONS

#### 6.1 Automated Verification (21/21 CTest Suite)
All 21 automated unit tests in \`workbench_tests\` passed:
- Geometry STL & CSV parser tests (valid, malformed, empty, NaN coordinates)
- Thermal FEA tests (Dirichlet boundary enforcement, analytical formula equivalence, convergence rate $p = 2.0$)
- Multicore performance tests (serial/parallel numerical equivalence $\le 10^{-8\circ}\text{C}$, deterministic ordering)
- Embedded hardware tests (mock discovery, connection, timeout fault injection, recovery)
- Neural backpropagation tests (forward pass, chain-rule derivatives, finite differences $\le 10^{-5}$, 100-step convergence)

#### 6.2 Limitations
1. **Conduction Geometry:** The thermal FEA solver implements 1D bar elements; multi-dimensional 3D CAD stress/thermal analysis requires external volumetric tetrahedral meshing.
2. **ASCII STL Only:** Binary STL files are not currently ingested.
3. **Simulated Hardware:** The embedded laboratory simulates target silicon via C++ drivers rather than requiring physical USB hardware attached to the host.
