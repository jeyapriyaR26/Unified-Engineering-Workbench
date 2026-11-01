#pragma once
#include <string>
#include <vector>
#include <map>
#include "../nlohmann/json.hpp"

namespace workbench {

enum class DeviceType {
    MICROCONTROLLER,
    FPGA,
    JTAG_ADAPTER
};

enum class ConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    ERROR_TIMEOUT
};

struct HardwareTelemetry {
    double timestamp_s{0.0};
    double core_temp_C{0.0};
    double vcc_core_V{0.0};
    double vcc_io_V{0.0};
    double current_draw_mA{0.0};
    double clock_mhz{0.0};
    uint64_t packets_transferred{0};
    uint32_t error_count{0};
    std::string active_state_desc;
    std::map<std::string, std::string> registers;
};

struct DeviceInfo {
    std::string device_id;
    std::string name;
    DeviceType type;
    std::string serial_number;
    std::string firmware_version;
    std::string connection_interface;
    std::vector<std::string> capabilities;
    ConnectionState state{ConnectionState::DISCONNECTED};
    HardwareTelemetry telemetry;
};

class HardwareMockManager {
public:
    HardwareMockManager();

    std::vector<DeviceInfo> discover_devices();
    DeviceInfo get_device(const std::string& device_id);
    bool connect_device(const std::string& device_id, bool simulate_timeout = false);
    bool disconnect_device(const std::string& device_id);
    HardwareTelemetry query_telemetry(const std::string& device_id);
    bool recover_timeout(const std::string& device_id);

    nlohmann::json get_interface_pin_table() const;
    std::string get_jtag_distinction_analysis() const;

private:
    std::map<std::string, DeviceInfo> devices_;
    void update_telemetry(DeviceInfo& dev);
};

} // namespace workbench
