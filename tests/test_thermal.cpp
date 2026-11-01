#include <functional>
#include <cmath>
#include "../backend/include/thermal/fea_solver.hpp"

extern void register_test(const std::string& name, std::function<bool()> test_fn);

#define TEST_ASSERT(cond, msg) if (!(cond)) return false;

void init_thermal_tests() {
    register_test("Thermal: Dirichlet boundary conditions exact enforcement", []() -> bool {
        workbench::ThermalParams p;
        p.length = 1.0;
        p.area = 1e-4;
        p.conductivity = 10.0;
        p.heat_gen = 10000.0;
        p.temp_left = 100.0;
        p.temp_right = 20.0;
        p.num_elements = 20;

        auto res = workbench::ThermalFeaSolver::solve(p);
        TEST_ASSERT(res.success, "FEA solve should succeed");
        TEST_ASSERT(!res.nodes.empty(), "Nodes list should not be empty");

        // Verify Left boundary node 0
        TEST_ASSERT(std::abs(res.nodes.front().temp_fe - 100.0) < 1e-9, "T(0) must equal exactly 100.0 C");
        // Verify Right boundary node N
        TEST_ASSERT(std::abs(res.nodes.back().temp_fe - 20.0) < 1e-9, "T(L) must equal exactly 20.0 C");
        return true;
    });

    register_test("Thermal: Analytical solution evaluation matches governing equation", []() -> bool {
        workbench::ThermalParams p;
        p.length = 1.0;
        p.conductivity = 10.0;
        p.heat_gen = 10000.0;
        p.temp_left = 100.0;
        p.temp_right = 20.0;

        // T_exact(0.5) = 100 - 80(0.5) + (10000/(20)) * 0.5 * 0.5 = 60 + 500*0.25 = 185.0 C
        double t_mid = workbench::ThermalFeaSolver::exact_solution(0.5, p);
        TEST_ASSERT(std::abs(t_mid - 185.0) < 1e-9, "Analytical T(0.5) must equal 185.0 C");
        return true;
    });

    register_test("Thermal: Mesh convergence rate matches theoretical second order O(h^2)", []() -> bool {
        workbench::ThermalParams p;
        auto study = workbench::ThermalFeaSolver::run_convergence_study(p);
        TEST_ASSERT(study.success, "Convergence study should succeed");
        TEST_ASSERT(study.points.size() == 4, "Should have 4 points for N=10, 20, 40, 80");

        // Theoretical midpoint error for linear elements = (q / 8k) * h^2 = 125 * h^2
        // N=10 (h=0.1): 1.25 C
        // N=20 (h=0.05): 0.3125 C
        // N=40 (h=0.025): 0.078125 C
        // N=80 (h=0.0125): 0.01953125 C
        TEST_ASSERT(std::abs(study.points[0].max_abs_error - 1.25) < 1e-4, "N=10 error must be ~1.25 C");
        TEST_ASSERT(std::abs(study.points[1].max_abs_error - 0.3125) < 1e-4, "N=20 error must be ~0.3125 C");
        TEST_ASSERT(std::abs(study.points[2].max_abs_error - 0.078125) < 1e-4, "N=40 error must be ~0.078125 C");
        TEST_ASSERT(std::abs(study.points[3].max_abs_error - 0.01953125) < 1e-4, "N=80 error must be ~0.01953125 C");

        // Observed convergence rate should be ~ 2.0
        TEST_ASSERT(std::abs(study.observed_convergence_rate - 2.0) < 0.05, "Observed convergence rate must be ~2.0");
        return true;
    });

    register_test("Thermal: Reject non-physical parameters (negative conductivity, zero elements)", []() -> bool {
        workbench::ThermalParams bad_p;
        bad_p.conductivity = -5.0;
        auto res1 = workbench::ThermalFeaSolver::solve(bad_p);
        TEST_ASSERT(!res1.success, "Negative conductivity must fail");

        bad_p.conductivity = 10.0;
        bad_p.num_elements = 0;
        auto res2 = workbench::ThermalFeaSolver::solve(bad_p);
        TEST_ASSERT(!res2.success, "Zero elements must fail");
        return true;
    });
}

struct AutoRegisterThermal {
    AutoRegisterThermal() { init_thermal_tests(); }
} g_auto_register_thermal;
