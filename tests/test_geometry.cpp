#include <functional>
#include <string>
#include <cmath>
#include "../backend/include/geometry/stl_parser.hpp"
#include "../backend/include/geometry/temperature_csv.hpp"

extern void register_test(const std::string& name, std::function<bool()> test_fn);

#define TEST_ASSERT(cond, msg) if (!(cond)) return false;

void init_geometry_tests() {
    register_test("Geometry: Valid ASCII STL parsing and bounding box", []() -> bool {
        std::string valid_stl = 
            "solid test_bracket\n"
            "  facet normal 0.0 0.0 1.0\n"
            "    outer loop\n"
            "      vertex 0.0 0.0 0.0\n"
            "      vertex 1.0 0.0 0.0\n"
            "      vertex 0.0 1.0 0.0\n"
            "    endloop\n"
            "  endfacet\n"
            "  facet normal 0.0 0.0 1.0\n"
            "    outer loop\n"
            "      vertex 1.0 0.0 0.0\n"
            "      vertex 1.0 1.0 0.0\n"
            "      vertex 0.0 1.0 0.0\n"
            "    endloop\n"
            "  endfacet\n"
            "endsolid test_bracket\n";

        auto res = workbench::StlParser::parse_ascii_string(valid_stl);
        TEST_ASSERT(res.valid, "STL should be valid");
        TEST_ASSERT(res.triangle_count == 2, "Triangle count must be 2");
        TEST_ASSERT(std::abs(res.surface_area - 1.0) < 1e-6, "Surface area of 2 unit triangles must be 1.0");
        TEST_ASSERT(res.bbox.dimensions.x == 1.0, "BBox dimension X must be 1.0");
        TEST_ASSERT(res.bbox.dimensions.y == 1.0, "BBox dimension Y must be 1.0");
        return true;
    });

    register_test("Geometry: Reject malformed ASCII STL (missing solid header)", []() -> bool {
        std::string malformed = "not_a_solid\nvertex 1 2 3\n";
        auto res = workbench::StlParser::parse_ascii_string(malformed);
        TEST_ASSERT(!res.valid, "Missing solid keyword must fail");
        return true;
    });

    register_test("Geometry: Reject empty STL file", []() -> bool {
        auto res = workbench::StlParser::parse_ascii_string("");
        TEST_ASSERT(!res.valid, "Empty file must fail");
        return true;
    });

    register_test("Geometry: Reject non-finite coordinates in STL", []() -> bool {
        std::string nan_stl = 
            "solid nan_test\n"
            "  facet normal 0 0 1\n"
            "    outer loop\n"
            "      vertex 0.0 0.0 0.0\n"
            "      vertex NaN 1.0 0.0\n"
            "      vertex 0.0 1.0 0.0\n"
            "    endloop\n"
            "  endfacet\n"
            "endsolid nan_test\n";
        auto res = workbench::StlParser::parse_ascii_string(nan_stl);
        TEST_ASSERT(!res.valid, "NaN coordinate must fail validation");
        return true;
    });

    register_test("CSV: Valid temperature CSV parsing and schema validation", []() -> bool {
        std::string valid_csv = 
            "node_id,x_m,y_m,z_m,temperature_C\n"
            "1,0.0,0.0,0.0,100.0\n"
            "2,0.5,0.0,0.0,185.0\n"
            "3,1.0,0.0,0.0,20.0\n";
        auto res = workbench::TemperatureCsvParser::parse_csv_string(valid_csv);
        TEST_ASSERT(res.valid, "CSV should be valid");
        TEST_ASSERT(res.nodes.size() == 3, "Node count must be 3");
        TEST_ASSERT(res.stats.min_temp == 20.0, "Min temp must be 20.0");
        TEST_ASSERT(res.stats.max_temp == 185.0, "Max temp must be 185.0");
        return true;
    });

    register_test("CSV: Reject missing columns in schema", []() -> bool {
        std::string invalid_schema = 
            "node_id,x_m,temperature_C\n"
            "1,0.0,100.0\n";
        auto res = workbench::TemperatureCsvParser::parse_csv_string(invalid_schema);
        TEST_ASSERT(!res.valid, "Schema with missing columns must fail");
        return true;
    });

    register_test("CSV: Reject invalid non-numeric and non-finite values", []() -> bool {
        std::string bad_csv = 
            "node_id,x_m,y_m,z_m,temperature_C\n"
            "1,0.0,corrupted_val,0.0,100.0\n";
        auto res = workbench::TemperatureCsvParser::parse_csv_string(bad_csv);
        TEST_ASSERT(!res.valid, "String in numeric column must fail");
        return true;
    });
}

struct AutoRegisterGeometry {
    AutoRegisterGeometry() { init_geometry_tests(); }
} g_auto_register_geometry;
