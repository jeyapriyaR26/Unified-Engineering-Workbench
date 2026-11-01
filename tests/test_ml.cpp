#include <functional>
#include <cmath>
#include "../backend/include/ml/backpropagation.hpp"

extern void register_test(const std::string& name, std::function<bool()> test_fn);

#define TEST_ASSERT(cond, msg) if (!(cond)) return false;

void init_ml_tests() {
    register_test("Backprop: Forward pass and initial loss calculation", []() -> bool {
        workbench::ModelParameters p;
        p.w = 0.5; p.b = 0.0; p.v = 1.0; p.c = 0.0;
        double x = 1.0;
        double target_y = 2.0;

        double loss = workbench::ManualBackpropLab::compute_loss(x, target_y, p);
        // h = tanh(0.5) = 0.46211715726
        // y_hat = 0.46211715726
        // diff = -1.53788284274
        // loss = 0.5 * (-1.53788284274)^2 = 1.18254181
        TEST_ASSERT(std::abs(loss - 1.18254181) < 1e-6, "Initial loss must equal 1.18254181");
        return true;
    });

    register_test("Backprop: Analytical chain-rule gradients match expected step-0 values", []() -> bool {
        workbench::ModelParameters p;
        p.w = 0.5; p.b = 0.0; p.v = 1.0; p.c = 0.0;
        double x = 1.0;
        double target_y = 2.0;
        double z = 0.0, h = 0.0, y_hat = 0.0;

        auto g = workbench::ManualBackpropLab::compute_analytical_gradients(x, target_y, p, z, h, y_hat);

        TEST_ASSERT(std::abs(g.dJ_dc - (-1.53788284)) < 1e-6, "dJ/dc must equal -1.53788284");
        TEST_ASSERT(std::abs(g.dJ_dv - (-0.71068205)) < 1e-6, "dJ/dv must equal -0.71068205");
        TEST_ASSERT(std::abs(g.dJ_dw - (-1.20946430)) < 1e-6, "dJ/dw must equal -1.20946430");
        TEST_ASSERT(std::abs(g.dJ_db - (-1.20946430)) < 1e-6, "dJ/db must equal -1.20946430");
        return true;
    });

    register_test("Backprop: Central finite-difference verification tolerance (error <= 1e-5)", []() -> bool {
        workbench::ModelParameters p;
        p.w = 0.5; p.b = 0.0; p.v = 1.0; p.c = 0.0;
        double x = 1.0;
        double target_y = 2.0;
        double z = 0.0, h = 0.0, y_hat = 0.0;

        auto ana_g = workbench::ManualBackpropLab::compute_analytical_gradients(x, target_y, p, z, h, y_hat);
        auto num_g = workbench::ManualBackpropLab::compute_numerical_gradients(x, target_y, p, 1e-6);

        double diff_w = std::abs(ana_g.dJ_dw - num_g.dJ_dw);
        double diff_b = std::abs(ana_g.dJ_db - num_g.dJ_db);
        double diff_v = std::abs(ana_g.dJ_dv - num_g.dJ_dv);
        double diff_c = std::abs(ana_g.dJ_dc - num_g.dJ_dc);

        TEST_ASSERT(diff_w <= 1e-5, "w gradient verification failed");
        TEST_ASSERT(diff_b <= 1e-5, "b gradient verification failed");
        TEST_ASSERT(diff_v <= 1e-5, "v gradient verification failed");
        TEST_ASSERT(diff_c <= 1e-5, "c gradient verification failed");
        return true;
    });

    register_test("Backprop: 100-step training convergence and strict loss reduction", []() -> bool {
        auto result = workbench::ManualBackpropLab::train(100, 0.1);
        TEST_ASSERT(result.success, "Training should succeed");
        TEST_ASSERT(result.history.size() == 101, "History must contain 101 records (0 to 100)");
        TEST_ASSERT(result.all_verifications_passed, "All finite-difference checks must pass");
        TEST_ASSERT(result.final_loss < result.initial_loss * 0.01, "Final loss must decrease by at least 99%");
        TEST_ASSERT(result.max_verification_error <= 1e-5, "Max verification error must be <= 1e-5");
        return true;
    });
}

struct AutoRegisterMl {
    AutoRegisterMl() { init_ml_tests(); }
} g_auto_register_ml;
