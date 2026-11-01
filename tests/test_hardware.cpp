#include <functional>
#include "../backend/include/hardware/mock_adapters.hpp"

extern void register_test(const std::string& name, std::function<bool()> test_fn);

#define TEST_ASSERT(cond, msg) if (!(cond)) return false;

void init_hardware_tests() {
    register_test("Hardware: Mock discovery returns exactly MCU, FPGA, and JTAG devices", []() -> bool {
        workbench::HardwareMockManager mgr;
        auto devices = mgr.discover_devices();
        TEST_ASSERT(devices.size() == 3, "Expected 3 devices (MCU, FPGA, JTAG)");

        bool has_mcu = false, has_fpga = false, has_jtag = false;
        for (const auto& d : devices) {
            if (d.type == workbench::DeviceType::MICROCONTROLLER) has_mcu = true;
            if (d.type == workbench::DeviceType::FPGA) has_fpga = true;
            if (d.type == workbench::DeviceType::JTAG_ADAPTER) has_jtag = true;
        }
        TEST_ASSERT(has_mcu && has_fpga && has_jtag, "All 3 target device classes must be discovered");
        return true;
    });

    register_test("Hardware: Successful device connection, telemetry update, and disconnection", []() -> bool {
        workbench::HardwareMockManager mgr;
        bool connected = mgr.connect_device("mcu_stm32h7", false);
        TEST_ASSERT(connected, "Connection should succeed");

        auto dev = mgr.get_device("mcu_stm32h7");
        TEST_ASSERT(dev.state == workbench::ConnectionState::CONNECTED, "State must be CONNECTED");

        auto tel = mgr.query_telemetry("mcu_stm32h7");
        TEST_ASSERT(tel.current_draw_mA > 0.0, "Telemetry current draw must be positive");
        TEST_ASSERT(tel.core_temp_C > 0.0, "Core temp must be positive");

        bool disconnected = mgr.disconnect_device("mcu_stm32h7");
        TEST_ASSERT(disconnected, "Disconnection should succeed");
        dev = mgr.get_device("mcu_stm32h7");
        TEST_ASSERT(dev.state == workbench::ConnectionState::DISCONNECTED, "State must be DISCONNECTED");
        return true;
    });

    register_test("Hardware: Recoverable timeout simulation and safe recovery", []() -> bool {
        workbench::HardwareMockManager mgr;
        // Simulate recoverable timeout
        bool ok = mgr.connect_device("jtag_probe", true);
        TEST_ASSERT(!ok, "Connect should fail on simulated timeout");

        auto dev = mgr.get_device("jtag_probe");
        TEST_ASSERT(dev.state == workbench::ConnectionState::ERROR_TIMEOUT, "State must be ERROR_TIMEOUT");

        // Recover from timeout
        bool recovered = mgr.recover_timeout("jtag_probe");
        TEST_ASSERT(recovered, "Recovery action should succeed");
        dev = mgr.get_device("jtag_probe");
        TEST_ASSERT(dev.state == workbench::ConnectionState::CONNECTED, "State must be restored to CONNECTED");
        return true;
    });
}

struct AutoRegisterHardware {
    AutoRegisterHardware() { init_hardware_tests(); }
} g_auto_register_hw;
