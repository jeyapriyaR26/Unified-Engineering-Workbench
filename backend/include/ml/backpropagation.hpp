#pragma once
#include <vector>
#include <string>
#include "../nlohmann/json.hpp"

namespace workbench {

struct ModelParameters {
    double w{0.5};
    double b{0.0};
    double v{1.0};
    double c{0.0};
};

struct ModelGradients {
    double dJ_dw{0.0};
    double dJ_db{0.0};
    double dJ_dv{0.0};
    double dJ_dc{0.0};
};

struct StepRecord {
    int step{0};
    ModelParameters params;
    double z{0.0};
    double h{0.0};
    double y_hat{0.0};
    double loss{0.0};
    ModelGradients analytical_grad;
    ModelGradients numerical_grad;
    ModelGradients grad_diff;
    bool verification_passed{false};
};

struct TrainingResult {
    bool success{false};
    std::string message;
    double input_x{1.0};
    double target_y{2.0};
    double learning_rate{0.1};
    double epsilon{1e-6};
    ModelParameters initial_params;
    ModelParameters final_params;
    double initial_loss{0.0};
    double final_loss{0.0};
    double max_verification_error{0.0};
    bool all_verifications_passed{false};
    std::vector<StepRecord> history;
    std::string mathematical_derivation;

    nlohmann::json to_json() const;
    std::string to_csv() const;
};

class ManualBackpropLab {
public:
    static double compute_loss(double x, double target_y, const ModelParameters& p);
    static ModelGradients compute_analytical_gradients(double x, double target_y, const ModelParameters& p, double& out_z, double& out_h, double& out_y_hat);
    static ModelGradients compute_numerical_gradients(double x, double target_y, const ModelParameters& p, double epsilon = 1e-6);
    static TrainingResult train(int steps = 100, double lr = 0.1, ModelParameters initial_p = ModelParameters());
    static std::string get_handwritten_appendix_text();
};

} // namespace workbench
