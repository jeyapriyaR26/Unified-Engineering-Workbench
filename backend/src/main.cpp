#include <iostream>
#include <string>
#include <sstream>
#include "common/ipc_protocol.hpp"
#include "common/system_info.hpp"
#include "geometry/stl_parser.hpp"
#include "geometry/temperature_csv.hpp"
#include "thermal/fea_solver.hpp"
#include "performance/benchmark_pool.hpp"
#include "hardware/mock_adapters.hpp"
#include "ml/backpropagation.hpp"

using namespace workbench;

static HardwareMockManager g_hardware_manager;

int main(int argc, char* argv[]) {
    // Check if arguments specify command mode
    std::string cmd = "";
    std::string payload_str = "{}";

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--cmd" && i + 1 < argc) {
            cmd = argv[++i];
        } else if (arg == "--payload" && i + 1 < argc) {
            payload_str = argv[++i];
        } else if (arg == "--status") {
            cmd = "status";
        }
    }

    // If no command provided on CLI, check if stdin has input
    if (cmd.empty()) {
        std::string line;
        if (std::getline(std::cin, line)) {
            try {
                auto j = json::parse(line);
                if (j.contains("cmd")) cmd = j["cmd"].get<std::string>();
                if (j.contains("payload")) payload_str = j["payload"].dump();
            } catch (...) {
                cmd = "status";
            }
        } else {
            cmd = "status";
        }
    }

    IpcResponse response;
    try {
        json payload = json::parse(payload_str);

        if (cmd == "status") {
            response.success = true;
            response.data = {
                {"engine", "Unified Engineering Workbench C++17 Core"},
                {"version", "2026.1.0-release"},
                {"standard", "ISO/IEC 14882:2017 (C++17)"},
                {"system_info", get_system_hardware_info()},
                {"status", "ONLINE_READY"}
            };
        } else if (cmd == "thermal_solve") {
            ThermalParams p;
            if (payload.contains("length")) p.length = payload["length"].get<double>();
            if (payload.contains("area")) p.area = payload["area"].get<double>();
            if (payload.contains("conductivity")) p.conductivity = payload["conductivity"].get<double>();
            if (payload.contains("heat_gen")) p.heat_gen = payload["heat_gen"].get<double>();
            if (payload.contains("temp_left")) p.temp_left = payload["temp_left"].get<double>();
            if (payload.contains("temp_right")) p.temp_right = payload["temp_right"].get<double>();
            if (payload.contains("num_elements")) p.num_elements = payload["num_elements"].get<int>();

            ThermalSolveResult res = ThermalFeaSolver::solve(p);
            response.success = res.success;
            if (!res.success) response.error = res.message;
            response.data = res.to_json();
        } else if (cmd == "thermal_convergence") {
            ThermalParams p;
            if (payload.contains("length")) p.length = payload["length"].get<double>();
            if (payload.contains("conductivity")) p.conductivity = payload["conductivity"].get<double>();
            if (payload.contains("heat_gen")) p.heat_gen = payload["heat_gen"].get<double>();

            ConvergenceStudyResult res = ThermalFeaSolver::run_convergence_study(p);
            response.success = res.success;
            response.data = res.to_json();
        } else if (cmd == "geometry_parse_stl") {
            StlParseResult res;
            if (payload.contains("file_path")) {
                res = StlParser::parse_ascii_file(payload["file_path"].get<std::string>());
            } else if (payload.contains("content")) {
                res = StlParser::parse_ascii_string(payload["content"].get<std::string>());
            } else {
                res.valid = false;
                res.error_message = "No 'file_path' or 'content' provided for STL parser.";
            }
            response.success = res.valid;
            if (!res.valid) response.error = res.error_message;
            response.data = res.to_json(true);
        } else if (cmd == "geometry_parse_csv") {
            TemperatureCsvResult res;
            if (payload.contains("file_path")) {
                res = TemperatureCsvParser::parse_csv_file(payload["file_path"].get<std::string>());
            } else if (payload.contains("content")) {
                res = TemperatureCsvParser::parse_csv_string(payload["content"].get<std::string>());
            } else {
                res.valid = false;
                res.error_message = "No 'file_path' or 'content' provided for Temperature CSV parser.";
            }
            response.success = res.valid;
            if (!res.valid) response.error = res.error_message;
            response.data = res.to_json();
        } else if (cmd == "performance_benchmark") {
            BenchmarkRunConfig config;
            if (payload.contains("case_count")) config.case_count = payload["case_count"].get<int>();
            if (payload.contains("mesh_elements")) config.mesh_elements = payload["mesh_elements"].get<int>();
            if (payload.contains("random_seed")) config.random_seed = payload["random_seed"].get<unsigned int>();
            if (payload.contains("repetitions")) config.repetitions = payload["repetitions"].get<int>();

            BenchmarkReport report = BenchmarkLab::run_full_benchmark(config);
            response.success = report.success;
            if (!report.success) response.error = report.message;
            response.data = report.to_json();
        } else if (cmd == "hardware_discover") {
            auto devices = g_hardware_manager.discover_devices();
            json dev_array = json::array();
            for (const auto& d : devices) {
                dev_array.push_back({
                    {"device_id", d.device_id},
                    {"name", d.name},
                    {"type", static_cast<int>(d.type)},
                    {"serial_number", d.serial_number},
                    {"firmware_version", d.firmware_version},
                    {"interface", d.connection_interface},
                    {"capabilities", d.capabilities},
                    {"state", static_cast<int>(d.state)},
                    {"telemetry", {
                        {"temp_C", d.telemetry.core_temp_C},
                        {"vcc_core_V", d.telemetry.vcc_core_V},
                        {"vcc_io_V", d.telemetry.vcc_io_V},
                        {"current_mA", d.telemetry.current_draw_mA},
                        {"clock_mhz", d.telemetry.clock_mhz},
                        {"state_desc", d.telemetry.active_state_desc},
                        {"registers", d.telemetry.registers}
                    }}
                });
            }
            response.success = true;
            response.data = {
                {"devices", dev_array},
                {"pin_table", g_hardware_manager.get_interface_pin_table()},
                {"jtag_analysis", g_hardware_manager.get_jtag_distinction_analysis()}
            };
        } else if (cmd == "hardware_connect") {
            std::string dev_id = payload.value("device_id", "");
            bool simulate_timeout = payload.value("simulate_timeout", false);
            bool ok = g_hardware_manager.connect_device(dev_id, simulate_timeout);
            response.success = ok || simulate_timeout;
            auto d = g_hardware_manager.get_device(dev_id);
            response.data = {
                {"device_id", dev_id},
                {"connected", ok},
                {"state", static_cast<int>(d.state)},
                {"telemetry", {
                    {"temp_C", d.telemetry.core_temp_C},
                    {"current_mA", d.telemetry.current_draw_mA},
                    {"state_desc", d.telemetry.active_state_desc},
                    {"registers", d.telemetry.registers}
                }}
            };
        } else if (cmd == "hardware_disconnect") {
            std::string dev_id = payload.value("device_id", "");
            bool ok = g_hardware_manager.disconnect_device(dev_id);
            response.success = ok;
            auto d = g_hardware_manager.get_device(dev_id);
            response.data = {
                {"device_id", dev_id},
                {"state", static_cast<int>(d.state)}
            };
        } else if (cmd == "hardware_recover") {
            std::string dev_id = payload.value("device_id", "");
            bool ok = g_hardware_manager.recover_timeout(dev_id);
            response.success = ok;
            auto d = g_hardware_manager.get_device(dev_id);
            response.data = {
                {"device_id", dev_id},
                {"state", static_cast<int>(d.state)},
                {"recovered", ok}
            };
        } else if (cmd == "hardware_telemetry") {
            std::string dev_id = payload.value("device_id", "");
            auto tel = g_hardware_manager.query_telemetry(dev_id);
            response.success = true;
            response.data = {
                {"device_id", dev_id},
                {"temp_C", tel.core_temp_C},
                {"current_mA", tel.current_draw_mA},
                {"vcc_core_V", tel.vcc_core_V},
                {"vcc_io_V", tel.vcc_io_V},
                {"packets", tel.packets_transferred},
                {"state_desc", tel.active_state_desc},
                {"registers", tel.registers}
            };
        } else if (cmd == "ml_train") {
            int steps = payload.value("steps", 100);
            double lr = payload.value("learning_rate", 0.1);
            ModelParameters p;
            if (payload.contains("w")) p.w = payload["w"].get<double>();
            if (payload.contains("b")) p.b = payload["b"].get<double>();
            if (payload.contains("v")) p.v = payload["v"].get<double>();
            if (payload.contains("c")) p.c = payload["c"].get<double>();

            TrainingResult res = ManualBackpropLab::train(steps, lr, p);
            response.success = res.success;
            response.data = res.to_json();
            if (payload.value("include_csv", false)) {
                response.data["csv_export"] = res.to_csv();
            }
        } else if (cmd == "ml_appendix") {
            response.success = true;
            response.data = {
                {"derivation_text", ManualBackpropLab::get_handwritten_appendix_text()}
            };
        } else {
            response.success = false;
            response.error = "Unrecognized command: " + cmd;
        }
    } catch (const std::exception& e) {
        response.success = false;
        response.error = std::string("C++ Exception during execution: ") + e.what();
    }

    std::cout << response.to_json().dump() << std::endl;
    return response.success ? 0 : 1;
}
