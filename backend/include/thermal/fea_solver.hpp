#pragma once
#include <vector>
#include <string>
#include "../nlohmann/json.hpp"

namespace workbench {

struct ThermalParams {
    double length{1.0};            // m
    double area{1e-4};            // m^2
    double conductivity{10.0};    // W/(m K)
    double heat_gen{10000.0};     // W/m^3
    double temp_left{100.0};       // °C
    double temp_right{20.0};       // °C
    int num_elements{20};         // N elements
};

struct ThermalNodeResult {
    int index{0};
    double x{0.0};
    double temp_fe{0.0};
    double temp_analytical{0.0};
    double error{0.0};
};

struct ThermalElementResult {
    int element_id{0};
    double x_mid{0.0};
    double temp_fe_mid{0.0};
    double temp_exact_mid{0.0};
    double abs_error_mid{0.0};
    double relative_error_mid{0.0};
};

struct ConvergenceStudyPoint {
    int num_elements{0};
    double h{0.0};
    double max_abs_error{0.0};
    double l2_error{0.0};
    double convergence_rate{0.0};
};

struct ThermalSolveResult {
    bool success{false};
    std::string message;
    ThermalParams params;
    std::vector<ThermalNodeResult> nodes;
    std::vector<ThermalElementResult> midpoints;
    double max_abs_midpoint_error{0.0};
    double max_rel_midpoint_error{0.0};
    double l2_midpoint_error{0.0};
    double rmse{0.0};

    // Global stiffness matrix representation (for educational inspection)
    std::vector<std::vector<double>> global_k_sample;
    std::vector<double> global_f_sample;

    nlohmann::json to_json() const;
};

struct ConvergenceStudyResult {
    bool success{false};
    std::vector<ConvergenceStudyPoint> points;
    double observed_convergence_rate{2.0};
    std::string theoretical_analysis;

    nlohmann::json to_json() const;
};

class ThermalFeaSolver {
public:
    static double exact_solution(double x, const ThermalParams& params);
    static ThermalSolveResult solve(const ThermalParams& params);
    static ConvergenceStudyResult run_convergence_study(ThermalParams base_params = ThermalParams());
};

} // namespace workbench
