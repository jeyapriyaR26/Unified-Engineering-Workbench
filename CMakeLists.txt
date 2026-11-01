cmake_minimum_required(VERSION 3.14)
project(UnifiedEngineeringWorkbench VERSION 2026.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Optimization and warning flags
if(MSVC)
    add_compile_options(/W4 /EHsc /O2 /permissive-)
else()
    add_compile_options(-Wall -Wextra -Wpedantic -O3)
endif()

# Threading
find_package(Threads REQUIRED)

# Common library for modules
add_library(workbench_core STATIC
    backend/src/geometry/stl_parser.cpp
    backend/src/geometry/temperature_csv.cpp
    backend/src/thermal/fea_solver.cpp
    backend/src/performance/benchmark_pool.cpp
    backend/src/hardware/mock_adapters.cpp
    backend/src/ml/backpropagation.cpp
)

target_include_directories(workbench_core PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/backend/include
)

target_link_libraries(workbench_core PUBLIC
    Threads::Threads
)

# Main IPC and CLI executable
add_executable(workbench_engine
    backend/src/main.cpp
)

target_link_libraries(workbench_engine PRIVATE
    workbench_core
)

# Standalone Launcher Executable
add_executable(Launch
    scripts/Launch.cpp
)

# Automated Test Suite
enable_testing()

add_executable(workbench_tests
    tests/test_main.cpp
    tests/test_geometry.cpp
    tests/test_thermal.cpp
    tests/test_performance.cpp
    tests/test_hardware.cpp
    tests/test_ml.cpp
)

target_link_libraries(workbench_tests PRIVATE
    workbench_core
)

add_test(NAME AllWorkbenchTests COMMAND workbench_tests)
