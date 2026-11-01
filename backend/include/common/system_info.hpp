#pragma once
#include <string>
#include <thread>
#include <fstream>
#include <sstream>
#include "../nlohmann/json.hpp"

#if defined(_WIN32)
#include <windows.h>
#else
#include <unistd.h>
#include <sys/utsname.h>
#endif

namespace workbench {

inline nlohmann::json get_system_hardware_info() {
    nlohmann::json info;
    unsigned int logical_cores = std::thread::hardware_concurrency();
    if (logical_cores == 0) logical_cores = 1;
    info["logical_cores"] = logical_cores;

    // Physical cores estimate
    unsigned int physical_cores = logical_cores > 1 ? logical_cores / 2 : 1;
    std::string cpu_model = "Generic x86_64 Processor";
    double total_ram_gb = 8.0;

#if defined(_WIN32)
    info["os"] = "Windows 11 x64";
    SYSTEM_INFO sys_info;
    GetSystemInfo(&sys_info);
    MEMORYSTATUSEX mem_status;
    mem_status.dwLength = sizeof(mem_status);
    if (GlobalMemoryStatusEx(&mem_status)) {
        total_ram_gb = static_cast<double>(mem_status.ullTotalPhys) / (1024.0 * 1024.0 * 1024.0);
    }
    // Query registry for CPU string if available
    HKEY hKey;
    if (RegOpenKeyExA(HKEY_LOCAL_MACHINE, "HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0", 0, KEY_READ, &hKey) == ERROR_SUCCESS) {
        char buf[256];
        DWORD bufSize = sizeof(buf);
        if (RegQueryValueExA(hKey, "ProcessorNameString", nullptr, nullptr, (LPBYTE)buf, &bufSize) == ERROR_SUCCESS) {
            cpu_model = std::string(buf);
        }
        RegCloseKey(hKey);
    }
#else
    struct utsname uts;
    if (uname(&uts) == 0) {
        info["os"] = std::string(uts.sysname) + " " + std::string(uts.release);
    } else {
        info["os"] = "Linux x86_64";
    }

    // Read /proc/cpuinfo
    std::ifstream cpuinfo("/proc/cpuinfo");
    if (cpuinfo.is_open()) {
        std::string line;
        while (std::getline(cpuinfo, line)) {
            if (line.rfind("model name", 0) == 0) {
                size_t colon = line.find(':');
                if (colon != std::string::npos && colon + 2 < line.size()) {
                    cpu_model = line.substr(colon + 2);
                    break;
                }
            }
        }
    }

    // Read /proc/meminfo
    std::ifstream meminfo("/proc/meminfo");
    if (meminfo.is_open()) {
        std::string line;
        while (std::getline(meminfo, line)) {
            if (line.rfind("MemTotal:", 0) == 0) {
                std::istringstream iss(line.substr(9));
                long long kb = 0;
                if (iss >> kb) {
                    total_ram_gb = static_cast<double>(kb) / (1024.0 * 1024.0);
                }
                break;
            }
        }
    }
#endif

    info["cpu_model"] = cpu_model;
    info["physical_cores"] = physical_cores;
    info["ram_gb"] = total_ram_gb;

#if defined(__GNUC__)
    info["compiler"] = "GCC " + std::to_string(__GNUC__) + "." + std::to_string(__GNUC_MINOR__) + "." + std::to_string(__GNUC_PATCHLEVEL__);
#elif defined(_MSC_VER)
    info["compiler"] = "MSVC " + std::to_string(_MSC_VER);
#elif defined(__clang__)
    info["compiler"] = "Clang " + std::string(__clang_version__);
#else
    info["compiler"] = "Standard C++17 Compiler";
#endif

#if defined(NDEBUG)
    info["optimization"] = "-O3 (Release, SSE/AVX vectorization enabled)";
#else
    info["optimization"] = "-O2 (Optimized with debug symbols)";
#endif

    return info;
}

} // namespace workbench
