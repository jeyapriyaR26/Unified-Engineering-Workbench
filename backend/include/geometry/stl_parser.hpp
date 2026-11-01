#pragma once
#include <string>
#include <vector>
#include "../nlohmann/json.hpp"

namespace workbench {

struct Vec3 {
    double x{0.0};
    double y{0.0};
    double z{0.0};
};

struct Triangle {
    Vec3 normal;
    Vec3 v1;
    Vec3 v2;
    Vec3 v3;
};

struct BoundingBox {
    Vec3 min;
    Vec3 max;
    Vec3 center;
    Vec3 dimensions;
};

struct StlParseResult {
    bool valid{false};
    std::string error_message;
    std::string solid_name;
    size_t triangle_count{0};
    double surface_area{0.0};
    BoundingBox bbox;
    std::vector<Triangle> triangles;

    nlohmann::json to_json(bool include_triangles = true, size_t max_triangles_export = 5000) const;
};

class StlParser {
public:
    static StlParseResult parse_ascii_string(const std::string& stl_content);
    static StlParseResult parse_ascii_file(const std::string& filepath);
};

} // namespace workbench
