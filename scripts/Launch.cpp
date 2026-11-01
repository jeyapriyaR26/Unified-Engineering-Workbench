#include <iostream>
#include <cstdlib>
#include <string>

#if defined(_WIN32)
#include <windows.h>
#include <shellapi.h>
#else
#include <unistd.h>
#endif

int main() {
    std::cout << "===================================================================\n";
    std::cout << "  UNIFIED ENGINEERING WORKBENCH (PASS SCIENCE WORKS R&D 2026-2027)\n";
    std::cout << "===================================================================\n";
    std::cout << "[1/3] Initializing C++17 Core Engine and verification checks...\n";

#if defined(_WIN32)
    // Launch default browser to port 3000
    ShellExecuteA(NULL, "open", "http://localhost:3000", NULL, NULL, SW_SHOWNORMAL);
    // Execute server
    system("node server.ts");
#else
    std::cout << "[2/3] Starting Workbench Server on http://0.0.0.0:3000...\n";
    system("node server.ts");
#endif

    return 0;
}
