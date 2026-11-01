#include "../../include/performance/benchmark_pool.hpp"
#include "../../include/common/system_info.hpp"
#include <random>
#include <chrono>
#include <thread>
#include <atomic>
#include <algorithm>
#include <cmath>
#include <numeric>

namespace workbench {

std::vector<BenchmarkCase> BenchmarkLab::generate_cases(int count, int mesh_elements, unsigned int seed) {
    std::mt19937_64 rng(seed);
    std::uniform_real_distribution<double> dist_k(5.0, 50.0);       // W/(m K)
    std::uniform_real_distribution<double> dist_q(1000.0, 50000.0); // W/m^3
    std::uniform_real_distribution<double> dist_t0(80.0, 150.0);    // °C
    std::uniform_real_distribution<double> dist_tl(10.0, 40.0);     // °C

    std::vector<BenchmarkCase> cases;
    cases.reserve(count);
    for (int i = 0; i < count; ++i) {
        BenchmarkCase c;
        c.case_id = i;
        c.length = 1.0;
        c.area = 1e-4;
        c.conductivity = dist_k(rng);
        c.heat_gen = dist_q(rng);
        c.temp_left = dist_t0(rng);
        c.temp_right = dist_tl(rng);
        c.num_elements = mesh_elements;
        cases.push_back(c);
    }
    return cases;
}

std::vector<double> BenchmarkLab::solve_batch_serial(const std::vector<BenchmarkCase>& cases) {
    size_t n = cases.size();
    std::vector<double> results(n, 0.0);

    for (size_t i = 0; i < n; ++i) {
        const auto& c = cases[i];
        ThermalParams p;
        p.length = c.length;
        p.area = c.area;
        p.conductivity = c.conductivity;
        p.heat_gen = c.heat_gen;
        p.temp_left = c.temp_left;
        p.temp_right = c.temp_right;
        p.num_elements = c.num_elements;

        ThermalSolveResult sol = ThermalFeaSolver::solve(p);
        // Record center midpoint temperature as representative metric
        int mid_idx = c.num_elements / 2;
        if (!sol.midpoints.empty() && mid_idx < static_cast<int>(sol.midpoints.size())) {
            results[i] = sol.midpoints[mid_idx].temp_fe_mid;
        } else if (!sol.nodes.empty()) {
            results[i] = sol.nodes[sol.nodes.size() / 2].temp_fe;
        }
    }
    return results;
}

std::vector<double> BenchmarkLab::solve_batch_parallel(const std::vector<BenchmarkCase>& cases, int num_threads) {
    size_t n = cases.size();
    std::vector<double> results(n, 0.0);

    if (num_threads <= 1) {
        return solve_batch_serial(cases);
    }

    std::vector<std::thread> workers;
    workers.reserve(num_threads);

    // Bounded worker pool using chunk partitioning for zero contention and deterministic output mapping
    size_t chunk_size = (n + num_threads - 1) / num_threads;

    for (int t = 0; t < num_threads; ++t) {
        size_t start_idx = t * chunk_size;
        size_t end_idx = std::min(start_idx + chunk_size, n);

        workers.emplace_back([&cases, &results, start_idx, end_idx]() {
            for (size_t i = start_idx; i < end_idx; ++i) {
                const auto& c = cases[i];
                ThermalParams p;
                p.length = c.length;
                p.area = c.area;
                p.conductivity = c.conductivity;
                p.heat_gen = c.heat_gen;
                p.temp_left = c.temp_left;
                p.temp_right = c.temp_right;
                p.num_elements = c.num_elements;

                ThermalSolveResult sol = ThermalFeaSolver::solve(p);
                int mid_idx = c.num_elements / 2;
                if (!sol.midpoints.empty() && mid_idx < static_cast<int>(sol.midpoints.size())) {
                    results[i] = sol.midpoints[mid_idx].temp_fe_mid;
                } else if (!sol.nodes.empty()) {
                    results[i] = sol.nodes[sol.nodes.size() / 2].temp_fe;
                }
            }
        });
    }

    for (auto& w : workers) {
        if (w.joinable()) {
            w.join();
        }
    }

    return results;
}

BenchmarkReport BenchmarkLab::run_full_benchmark(const BenchmarkRunConfig& config) {
    BenchmarkReport report;
    report.config = config;
    report.hardware_info = get_system_hardware_info();

    unsigned int max_logical = std::thread::hardware_concurrency();
    if (max_logical == 0) max_logical = 1;

    // Filter thread counts to be <= available logical CPUs, capping at 4 as per prompt
    std::vector<int> active_thread_counts;
    for (int tc : config.thread_counts) {
        if (tc >= 1 && tc <= 4 && tc <= static_cast<int>(max_logical)) {
            active_thread_counts.push_back(tc);
        }
    }
    if (active_thread_counts.empty()) {
        active_thread_counts.push_back(1);
    }
    std::sort(active_thread_counts.begin(), active_thread_counts.end());
    active_thread_counts.erase(std::unique(active_thread_counts.begin(), active_thread_counts.end()), active_thread_counts.end());

    // Generate deterministic test cases
    auto cases = generate_cases(config.case_count, config.mesh_elements, config.random_seed);

    // 1. Warm-up run (excluded from compute timings)
    solve_batch_serial(cases);

    // Compute baseline serial results for correctness verification
    std::vector<double> serial_results = solve_batch_serial(cases);

    double t1_median = 0.0;
    double max_diff = 0.0;

    for (int p_threads : active_thread_counts) {
        ThreadBenchmarkResult t_res;
        t_res.num_threads = p_threads;
        t_res.repetition_times_ms.reserve(config.repetitions);

        std::vector<double> last_results;
        for (int rep = 0; rep < config.repetitions; ++rep) {
            auto start = std::chrono::high_resolution_clock::now();
            if (p_threads == 1) {
                last_results = solve_batch_serial(cases);
            } else {
                last_results = solve_batch_parallel(cases, p_threads);
            }
            auto end = std::chrono::high_resolution_clock::now();

            std::chrono::duration<double, std::milli> duration = end - start;
            t_res.repetition_times_ms.push_back(duration.count());
        }

        // Verify serial vs parallel agreement: max diff <= 1e-8
        for (size_t i = 0; i < serial_results.size(); ++i) {
            double diff = std::abs(serial_results[i] - last_results[i]);
            if (diff > max_diff) max_diff = diff;
        }

        // Compute statistics for the 5 repetitions
        std::vector<double> sorted_times = t_res.repetition_times_ms;
        std::sort(sorted_times.begin(), sorted_times.end());
        t_res.min_time_ms = sorted_times.front();
        t_res.max_time_ms = sorted_times.back();
        t_res.median_time_ms = sorted_times[sorted_times.size() / 2];
        t_res.mean_time_ms = std::accumulate(sorted_times.begin(), sorted_times.end(), 0.0) / sorted_times.size();

        if (p_threads == 1) {
            t1_median = t_res.median_time_ms;
            t_res.speedup = 1.0;
            t_res.efficiency = 1.0;
        } else {
            t_res.speedup = (t_res.median_time_ms > 0.0) ? (t1_median / t_res.median_time_ms) : 1.0;
            t_res.efficiency = t_res.speedup / p_threads;
        }

        report.results.push_back(t_res);
    }

    report.max_serial_parallel_diff = max_diff;
    report.correctness_verified = (max_diff <= 1e-8);
    report.verification_notes = report.correctness_verified 
        ? "PASSED: Maximum serial/parallel difference is " + std::to_string(max_diff) + " °C (<= 1e-8 °C tolerance)."
        : "FAILED: Numerical difference exceeded 1e-8 °C tolerance.";

    report.success = true;
    report.message = "Benchmark completed across " + std::to_string(active_thread_counts.size()) + " thread configurations.";

    return report;
}

nlohmann::json BenchmarkReport::to_json() const {
    nlohmann::json j;
    j["success"] = success;
    j["message"] = message;
    j["hardware_info"] = hardware_info;
    j["config"] = {
        {"case_count", config.case_count},
        {"mesh_elements", config.mesh_elements},
        {"random_seed", config.random_seed},
        {"repetitions", config.repetitions}
    };
    j["max_serial_parallel_diff_C"] = max_serial_parallel_diff;
    j["correctness_verified"] = correctness_verified;
    j["verification_notes"] = verification_notes;

    nlohmann::json res_array = nlohmann::json::array();
    for (const auto& r : results) {
        res_array.push_back({
            {"num_threads", r.num_threads},
            {"repetition_times_ms", r.repetition_times_ms},
            {"median_time_ms", r.median_time_ms},
            {"min_time_ms", r.min_time_ms},
            {"max_time_ms", r.max_time_ms},
            {"mean_time_ms", r.mean_time_ms},
            {"speedup", r.speedup},
            {"efficiency", r.efficiency}
        });
    }
    j["results"] = res_array;

    return j;
}

} // namespace workbench
