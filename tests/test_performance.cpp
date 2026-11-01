#include <functional>
#include <cmath>
#include <thread>
#include "../backend/include/performance/benchmark_pool.hpp"

extern void register_test(const std::string& name, std::function<bool()> test_fn);

#define TEST_ASSERT(cond, msg) if (!(cond)) return false;

void init_performance_tests() {
    register_test("Performance: Serial vs Parallel execution numerical equivalence (<= 1e-8 C)", []() -> bool {
        auto cases = workbench::BenchmarkLab::generate_cases(100, 20, 12345);
        auto serial_res = workbench::BenchmarkLab::solve_batch_serial(cases);
        auto parallel_res = workbench::BenchmarkLab::solve_batch_parallel(cases, 2);

        TEST_ASSERT(serial_res.size() == parallel_res.size(), "Size mismatch");
        double max_diff = 0.0;
        for (size_t i = 0; i < serial_res.size(); ++i) {
            double diff = std::abs(serial_res[i] - parallel_res[i]);
            if (diff > max_diff) max_diff = diff;
        }

        TEST_ASSERT(max_diff <= 1e-8, "Serial and parallel outputs must agree within 1e-8 C");
        return true;
    });

    register_test("Performance: Deterministic output mapping across multiple parallel runs", []() -> bool {
        auto cases = workbench::BenchmarkLab::generate_cases(80, 20, 999);
        auto run1 = workbench::BenchmarkLab::solve_batch_parallel(cases, 3);
        auto run2 = workbench::BenchmarkLab::solve_batch_parallel(cases, 3);

        for (size_t i = 0; i < run1.size(); ++i) {
            TEST_ASSERT(std::abs(run1[i] - run2[i]) == 0.0, "Subsequent parallel runs must produce bit-identical results");
        }
        return true;
    });

    register_test("Performance: Full benchmark execution and hardware telemetry reporting", []() -> bool {
        workbench::BenchmarkRunConfig cfg;
        cfg.case_count = 50;
        cfg.mesh_elements = 20;
        cfg.random_seed = 42;
        cfg.repetitions = 5;
        cfg.thread_counts = {1, 2};

        auto report = workbench::BenchmarkLab::run_full_benchmark(cfg);
        TEST_ASSERT(report.success, "Benchmark report should succeed");
        TEST_ASSERT(report.correctness_verified, "Correctness must be verified");
        TEST_ASSERT(report.max_serial_parallel_diff <= 1e-8, "Difference must be <= 1e-8 C");
        TEST_ASSERT(!report.results.empty(), "Should contain thread results");
        TEST_ASSERT(report.results[0].repetition_times_ms.size() == 5, "Must have exactly 5 repetitions");
        return true;
    });
}

struct AutoRegisterPerformance {
    AutoRegisterPerformance() { init_performance_tests(); }
} g_auto_register_perf;
