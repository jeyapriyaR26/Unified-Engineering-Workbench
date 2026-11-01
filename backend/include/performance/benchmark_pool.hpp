#pragma once
#include <vector>
#include <string>
#include "../nlohmann/json.hpp"
#include "../thermal/fea_solver.hpp"

namespace workbench {

struct BenchmarkCase {
    int case_id{0};
    double length{1.0};
    double area{1e-4};
    double conductivity{10.0};
    double heat_gen{10000.0};
    double temp_left{100.0};
    double temp_right{20.0};
    int num_elements{40};
};

struct BenchmarkRunConfig {
    int case_count{1000};
    int mesh_elements{40};
    unsigned int random_seed{42};
    std::vector<int> thread_counts{1, 2, 3, 4};
    int repetitions{5};
};

struct ThreadBenchmarkResult {
    int num_threads{1};
    std::vector<double> repetition_times_ms;
    double median_time_ms{0.0};
    double min_time_ms{0.0};
    double max_time_ms{0.0};
    double mean_time_ms{0.0};
    double speedup{1.0};
    double efficiency{1.0};
};

struct BenchmarkReport {
    bool success{false};
    std::string message;
    nlohmann::json hardware_info;
    BenchmarkRunConfig config;
    std::vector<ThreadBenchmarkResult> results;
    double max_serial_parallel_diff{0.0};
    bool correctness_verified{false};
    std::string verification_notes;

    nlohmann::json to_json() const;
};

class BenchmarkLab {
public:
    static std::vector<BenchmarkCase> generate_cases(int count, int mesh_elements, unsigned int seed);
    static std::vector<double> solve_batch_serial(const std::vector<BenchmarkCase>& cases);
    static std::vector<double> solve_batch_parallel(const std::vector<BenchmarkCase>& cases, int num_threads);
    static BenchmarkReport run_full_benchmark(const BenchmarkRunConfig& config);
};

} // namespace workbench
