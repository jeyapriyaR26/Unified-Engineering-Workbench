@echo off
setlocal enabledelayedexpansion
title Unified Engineering Workbench - PASS SCIENCE WORKS 2026-2027

echo ==============================================================================
echo       UNIFIED ENGINEERING WORKBENCH - PASS SCIENCE WORKS R^&D INTERNSHIP
echo ==============================================================================
echo [1/3] Checking C++17 Core Engine...
if not exist "build\workbench_engine.exe" (
    echo [INFO] Building C++ backend using CMake...
    cmake -B build -S . -DCMAKE_BUILD_TYPE=Release
    cmake --build build --config Release
)

echo [2/3] Initializing Standalone Application Runtime...
start "" "http://localhost:3000"

echo [3/3] Starting Full-Stack Server on Port 3000...
node server.ts
pause
