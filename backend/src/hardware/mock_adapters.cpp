#include "../../include/hardware/mock_adapters.hpp"
#include <chrono>

namespace workbench {

HardwareMockManager::HardwareMockManager() {
    // 1. Microcontroller board (STM32H753ZI High-Performance ARM Cortex-M7)
    DeviceInfo mcu;
    mcu.device_id = "mcu_stm32h7";
    mcu.name = "STM32H753ZI High-Performance MCU Board";
    mcu.type = DeviceType::MICROCONTROLLER;
    mcu.serial_number = "ST-H7-482910A";
    mcu.firmware_version = "v2.4.1-rtos";
    mcu.connection_interface = "USB CDC / Virtual COM Port (115200 8N1)";
    mcu.capabilities = {
        "ARM Cortex-M7 core @ 480 MHz with Double-Precision FPU",
        "2 MB Dual-Bank Flash, 1 MB SRAM",
        "Dual CAN-FD, Gigabit Ethernet MAC, USB 2.0 OTG FS/HS",
        "SWD / JTAG debug probe interface with ETM trace",
        "Hardware Cryptographic Acceleration (AES, SHA, ECC)"
    };
    mcu.state = ConnectionState::DISCONNECTED;
    mcu.telemetry = {0.0, 38.4, 1.25, 3.30, 142.5, 480.0, 0, 0, "IDLE", {
        {"PC", "0x08001F40"},
        {"SP", "0x2001FC00"},
        {"LR", "0x08000A12"},
        {"RCC_CR", "0x03035A00"},
        {"FLASH_ACR", "0x00000034"}
    }};
    devices_[mcu.device_id] = mcu;

    // 2. FPGA board (Xilinx Artix-7 XC7A100T-1CSG324C)
    DeviceInfo fpga;
    fpga.device_id = "fpga_artix7";
    fpga.name = "Xilinx Artix-7 XC7A100T FPGA Evaluation Platform";
    fpga.type = DeviceType::FPGA;
    fpga.serial_number = "XLX-A7-883921B";
    fpga.firmware_version = "Bitstream rev 3.1.0 (DSP Matrix Accelerator)";
    fpga.connection_interface = "USB-JTAG FT2232H / High-Speed UART (921600 baud)";
    fpga.capabilities = {
        "101,440 Logic Cells, 240 DSP48E1 Slices",
        "4,860 Kb Block RAM, 6 CMTs (PLL/MMCM)",
        "Quad-SPI Flash (128 Mb) Bitstream Configuration",
        "Dual 12-bit 1 MSPS Analog-to-Digital Converter (XADC)",
        "4x PMOD expansion headers, HDMI sink/source"
    };
    fpga.state = ConnectionState::DISCONNECTED;
    fpga.telemetry = {0.0, 46.2, 1.00, 3.30, 485.0, 100.0, 0, 0, "BITSTREAM_LOADED", {
        {"CONFIG_STATUS", "0x00000000_1F5D21"},
        {"XADC_TEMP", "46.2 C"},
        {"VCCINT", "1.002 V"},
        {"VCCAUX", "1.798 V"},
        {"VCCO_33", "3.310 V"}
    }};
    devices_[fpga.device_id] = fpga;

    // 3. JTAG Debugging Adapter (Segger J-Link Ultra+ High-Speed Probe)
    DeviceInfo jtag;
    jtag.device_id = "jtag_probe";
    jtag.name = "Segger J-Link Ultra+ Industrial JTAG / SWD Debug Probe";
    jtag.type = DeviceType::JTAG_ADAPTER;
    jtag.serial_number = "JLINK-81920-ULTRAPLUS";
    jtag.firmware_version = "v7.94f compiled Oct 2026";
    jtag.connection_interface = "USB 2.0 High-Speed 480 Mbps Host Interface";
    jtag.capabilities = {
        "Supports JTAG (IEEE 1149.1 / 1149.7) and ARM SWD protocols",
        "Target Vref sensing (1.2V to 5.0V) with auto level-shifting",
        "Download speeds up to 3.0 MB/s, JTAG clock up to 50 MHz",
        "Hardware boundary-scan verification and memory-mapped flash loader",
        "Real-Time Transfer (RTT) and SystemView telemetry streaming"
    };
    jtag.state = ConnectionState::DISCONNECTED;
    jtag.telemetry = {0.0, 32.1, 5.00, 3.30, 85.0, 50.0, 0, 0, "STANDBY", {
        {"VREF_SENSE", "3.304 V"},
        {"TAP_STATE", "Test-Logic-Reset"},
        {"IR_LENGTH", "4 bits"},
        {"IDCODE", "0x4BA00477 (Cortex-M7 DP)"},
        {"TCK_SPEED", "25.00 MHz"}
    }};
    devices_[jtag.device_id] = jtag;
}

std::vector<DeviceInfo> HardwareMockManager::discover_devices() {
    std::vector<DeviceInfo> list;
    for (const auto& kv : devices_) {
        list.push_back(kv.second);
    }
    return list;
}

DeviceInfo HardwareMockManager::get_device(const std::string& device_id) {
    if (devices_.find(device_id) != devices_.end()) {
        return devices_[device_id];
    }
    DeviceInfo empty;
    empty.device_id = "unknown";
    return empty;
}

bool HardwareMockManager::connect_device(const std::string& device_id, bool simulate_timeout) {
    if (devices_.find(device_id) == devices_.end()) return false;

    if (simulate_timeout) {
        devices_[device_id].state = ConnectionState::ERROR_TIMEOUT;
        devices_[device_id].telemetry.active_state_desc = "TIMEOUT_ERROR: Target unresponsive after 5000 ms. Recovery required.";
        devices_[device_id].telemetry.error_count++;
        return false;
    }

    devices_[device_id].state = ConnectionState::CONNECTED;
    update_telemetry(devices_[device_id]);
    return true;
}

bool HardwareMockManager::disconnect_device(const std::string& device_id) {
    if (devices_.find(device_id) == devices_.end()) return false;
    devices_[device_id].state = ConnectionState::DISCONNECTED;
    devices_[device_id].telemetry.active_state_desc = "DISCONNECTED";
    return true;
}

bool HardwareMockManager::recover_timeout(const std::string& device_id) {
    if (devices_.find(device_id) == devices_.end()) return false;
    devices_[device_id].state = ConnectionState::CONNECTED;
    devices_[device_id].telemetry.active_state_desc = "RECOVERED_AND_ACTIVE";
    update_telemetry(devices_[device_id]);
    return true;
}

HardwareTelemetry HardwareMockManager::query_telemetry(const std::string& device_id) {
    if (devices_.find(device_id) == devices_.end()) return HardwareTelemetry();
    auto& dev = devices_[device_id];
    if (dev.state == ConnectionState::CONNECTED) {
        update_telemetry(dev);
    }
    return dev.telemetry;
}

void HardwareMockManager::update_telemetry(DeviceInfo& dev) {
    dev.telemetry.packets_transferred += 128;
    dev.telemetry.timestamp_s += 1.0;

    if (dev.device_id == "mcu_stm32h7") {
        dev.telemetry.core_temp_C = 38.4 + (dev.telemetry.packets_transferred % 10) * 0.15;
        dev.telemetry.current_draw_mA = 142.5 + (dev.telemetry.packets_transferred % 20) * 0.4;
        dev.telemetry.active_state_desc = "RUNNING_FREE_RTOS";
    } else if (dev.device_id == "fpga_artix7") {
        dev.telemetry.core_temp_C = 46.2 + (dev.telemetry.packets_transferred % 8) * 0.22;
        dev.telemetry.current_draw_mA = 485.0 + (dev.telemetry.packets_transferred % 30) * 0.8;
        dev.telemetry.active_state_desc = "DSP_STREAM_PROCESSING";
    } else if (dev.device_id == "jtag_probe") {
        dev.telemetry.core_temp_C = 32.1 + (dev.telemetry.packets_transferred % 5) * 0.1;
        dev.telemetry.current_draw_mA = 85.0 + (dev.telemetry.packets_transferred % 15) * 0.2;
        dev.telemetry.active_state_desc = "DEBUG_STREAM_SYNCHRONIZED";
    }
}

nlohmann::json HardwareMockManager::get_interface_pin_table() const {
    nlohmann::json table = nlohmann::json::array();

    table.push_back({
        {"subsystem", "Host USB Interface"},
        {"signal_name", "VBUS / D+ / D- / GND"},
        {"voltage_nominal", "5.0 V DC (Data: 3.3V LVTTL)"},
        {"direction", "Bidirectional Host <-> Probe"},
        {"connector", "USB Type-C (JTAG) / Type-B (FPGA) / Micro-B (MCU)"},
        {"level_shifting", "USB Transceiver with 1.5k pullup"},
        {"ownership_role", "Host PC enumerates bus endpoints"}
    });

    table.push_back({
        {"subsystem", "JTAG TAP Master (Probe)"},
        {"signal_name", "TCK (Test Clock)"},
        {"voltage_nominal", "Vref (1.2V - 3.6V target dependent)"},
        {"direction", "Output (Probe -> Target MCU/FPGA)"},
        {"connector", "Standard 20-pin / 10-pin Cortex JTAG Header"},
        {"level_shifting", "Active bidirectional buffer (74LVC2T45)"},
        {"ownership_role", "JTAG Master strictly owns and clocks TCK (up to 50 MHz)"}
    });

    table.push_back({
        {"subsystem", "JTAG TAP Master (Probe)"},
        {"signal_name", "TMS (Test Mode Select)"},
        {"voltage_nominal", "Vref (1.2V - 3.6V target dependent)"},
        {"direction", "Output (Probe -> Target MCU/FPGA)"},
        {"connector", "Standard 20-pin / 10-pin Cortex JTAG Header"},
        {"level_shifting", "Active level-shifter driven by Vref"},
        {"ownership_role", "JTAG Master drives state machine transitions"}
    });

    table.push_back({
        {"subsystem", "JTAG TAP Data (Probe <-> Target)"},
        {"signal_name", "TDI (Test Data In)"},
        {"voltage_nominal", "Vref (1.2V - 3.6V)"},
        {"direction", "Output (Probe -> Target TDI)"},
        {"connector", "JTAG Header Pin 5"},
        {"level_shifting", "Buffered level-shifter"},
        {"ownership_role", "JTAG Master feeds instruction/data shift register"}
    });

    table.push_back({
        {"subsystem", "JTAG TAP Data (Probe <-> Target)"},
        {"signal_name", "TDO (Test Data Out)"},
        {"voltage_nominal", "Vref (1.2V - 3.6V)"},
        {"direction", "Input (Target TDO -> Probe Input)"},
        {"connector", "JTAG Header Pin 13"},
        {"level_shifting", "High-Z receiver with schmitt-trigger"},
        {"ownership_role", "Target shifts out scan chain register bits"}
    });

    table.push_back({
        {"subsystem", "Target Reference & Reset"},
        {"signal_name", "VTref (Voltage Reference)"},
        {"voltage_nominal", "3.3 V DC (Target supplied)"},
        {"direction", "Input to Probe"},
        {"connector", "JTAG Header Pin 1"},
        {"level_shifting", "Reference rail for level-shifter VCCA"},
        {"ownership_role", "Target board supplies power reference to adapter"}
    });

    table.push_back({
        {"subsystem", "FPGA Digital I/O Bank"},
        {"signal_name", "VCCO_33 / VCCINT (FPGA Power Rails)"},
        {"voltage_nominal", "Core: 1.0 V, I/O Bank: 3.3 V"},
        {"direction", "Power Domains"},
        {"connector", "Onboard PMIC / Buck Regulators"},
        {"level_shifting", "TI TXB0108 8-bit bidirectional shifters for 1.8V to 3.3V PMODs"},
        {"ownership_role", "FPGA internal power supervisor with PGOOD detection"}
    });

    table.push_back({
        {"subsystem", "MCU Serial Interconnect"},
        {"signal_name", "USART1 TX/RX (Telemetry Port)"},
        {"voltage_nominal", "3.3 V CMOS"},
        {"direction", "Bidirectional MCU <-> Host UART"},
        {"connector", "Onboard ST-Link VCP Virtual COM Port"},
        {"level_shifting", "Direct 3.3V logic level"},
        {"ownership_role", "MCU streams JSON/binary packets to Workbench Host"}
    });

    return table;
}

std::string HardwareMockManager::get_jtag_distinction_analysis() const {
    return 
        "CRITICAL ARCHITECTURAL DISTINCTION: WHY A JTAG ADAPTER IS A DEBUGGING INTERFACE RATHER THAN A GENERIC COMPUTING BOARD\n\n"
        "1. STATE MACHINE CONTROLLER VS. GENERAL-PURPOSE INSTRUCTION PROCESSOR:\n"
        "A JTAG (Joint Test Action Group, IEEE Std 1149.1 / 1149.7) adapter does NOT execute user applications, software algorithms, or general arithmetic tasks. "
        "Instead, its silicon is architected specifically as a master controller for the 16-state TAP (Test Access Port) state machine "
        "(Test-Logic-Reset -> Run-Test/Idle -> Select-DR-Scan -> Capture-DR -> Shift-DR -> Exit1-DR -> Pause-DR -> Exit2-DR -> Update-DR). "
        "It serially clocks binary test vectors across boundary scan cells, instruction registers (IR), and data registers (DR).\n\n"
        "2. SCAN CHAINS & SILICON INSTRUMENTATION:\n"
        "Microcontrollers (ARM Cortex-M7) and FPGAs (Artix-7) are Target Devices containing computing logic, ALUs, memory arrays, and logic fabrics. "
        "The JTAG adapter is an Instrumentation Bridge that drives TCK/TMS and samples TDO to interrogate target internal registers, "
        "halt processor cores, inject breakpoints, inspect hardware memory, and flash non-volatile bitstreams.\n\n"
        "3. SIGNAL OWNERSHIP & LEVEL ISOLATION:\n"
        "Unlike an autonomous computing board that drives independent peripheral buses, a JTAG adapter's I/O voltage domain is completely enslaved "
        "to the Target Reference Voltage (VTref). If the target board is powered off, the JTAG adapter must tristate all driver pins "
        "(TCK, TMS, TDI, nTRST) to prevent back-powering target silicon through ESD protection diodes.";
}

} // namespace workbench
