#include "../../include/geometry/stl_parser.hpp"
#include <fstream>
#include <sstream>
#include <cmath>
#include <algorithm>
#include <limits>
#include <cctype>

namespace workbench {

static inline bool is_finite_vec(const Vec3& v) {
    return std::isfinite(v.x) && std::isfinite(v.y) && std::isfinite(v.z);
}

static inline double triangle_area(const Vec3& a, const Vec3& b, const Vec3& c) {
    Vec3 ab{b.x - a.x, b.y - a.y, b.z - a.z};
    Vec3 ac{c.x - a.x, c.y - a.y, c.z - a.z};
    Vec3 cross{
        ab.y * ac.z - ab.z * ac.y,
        ab.z * ac.x - ab.x * ac.z,
        ab.x * ac.y - ab.y * ac.x
    };
    return 0.5 * std::sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
}

StlParseResult StlParser::parse_ascii_file(const std::string& filepath) {
    std::ifstream file(filepath);
    if (!file.is_open()) {
        StlParseResult res;
        res.valid = false;
        res.error_message = "Failed to open STL file: " + filepath;
        return res;
    }
    std::stringstream buffer;
    buffer << file.rdbuf();
    return parse_ascii_string(buffer.str());
}

StlParseResult StlParser::parse_ascii_string(const std::string& content) {
    StlParseResult result;
    result.valid = false;

    if (content.empty()) {
        result.error_message = "Empty STL input: File contains no data.";
        return result;
    }

    std::istringstream stream(content);
    std::string line;
    std::string token;

    // Read first meaningful line
    bool found_solid = false;
    while (std::getline(stream, line)) {
        // Trim leading whitespace
        size_t first_non_space = line.find_first_not_of(" \t\r\n");
        if (first_non_space == std::string::npos) continue;
        std::string trimmed = line.substr(first_non_space);
        if (trimmed.rfind("solid", 0) == 0) {
            found_solid = true;
            if (trimmed.length() > 6) {
                result.solid_name = trimmed.substr(6);
                // trim name
                size_t end = result.solid_name.find_last_not_of(" \t\r\n");
                if (end != std::string::npos) {
                    result.solid_name = result.solid_name.substr(0, end + 1);
                }
            } else {
                result.solid_name = "unnamed_solid";
            }
            break;
        } else {
            result.error_message = "Malformed ASCII STL: File must begin with 'solid' keyword.";
            return result;
        }
    }

    if (!found_solid) {
        result.error_message = "Malformed ASCII STL: No 'solid' header found.";
        return result;
    }

    double min_x = std::numeric_limits<double>::infinity();
    double min_y = std::numeric_limits<double>::infinity();
    double min_z = std::numeric_limits<double>::infinity();
    double max_x = -std::numeric_limits<double>::infinity();
    double max_y = -std::numeric_limits<double>::infinity();
    double max_z = -std::numeric_limits<double>::infinity();

    Triangle current_tri;
    int vertex_count = 0;
    bool in_facet = false;
    bool in_loop = false;
    double total_area = 0.0;
    int line_num = 1;

    while (std::getline(stream, line)) {
        line_num++;
        std::istringstream line_stream(line);
        if (!(line_stream >> token)) continue;

        // Convert token to lowercase for case-insensitive check
        std::string lower_token = token;
        std::transform(lower_token.begin(), lower_token.end(), lower_token.begin(), ::tolower);

        if (lower_token == "facet") {
            std::string normal_kw;
            line_stream >> normal_kw;
            double nx, ny, nz;
            if (!(line_stream >> nx >> ny >> nz)) {
                result.error_message = "Malformed facet normal at line " + std::to_string(line_num);
                return result;
            }
            current_tri.normal = {nx, ny, nz};
            in_facet = true;
            vertex_count = 0;
        } else if (lower_token == "outer") {
            std::string loop_kw;
            line_stream >> loop_kw;
            in_loop = true;
        } else if (lower_token == "vertex") {
            if (!in_facet || !in_loop) {
                result.error_message = "Unexpected vertex outside facet loop at line " + std::to_string(line_num);
                return result;
            }
            double vx, vy, vz;
            if (!(line_stream >> vx >> vy >> vz)) {
                result.error_message = "Invalid or non-numeric vertex coordinate at line " + std::to_string(line_num);
                return result;
            }
            Vec3 v{vx, vy, vz};
            if (!is_finite_vec(v)) {
                result.error_message = "Non-finite coordinate (NaN/Inf) detected at line " + std::to_string(line_num);
                return result;
            }

            if (vertex_count == 0) current_tri.v1 = v;
            else if (vertex_count == 1) current_tri.v2 = v;
            else if (vertex_count == 2) current_tri.v3 = v;
            else {
                result.error_message = "More than 3 vertices in facet loop at line " + std::to_string(line_num);
                return result;
            }

            min_x = std::min(min_x, v.x);
            min_y = std::min(min_y, v.y);
            min_z = std::min(min_z, v.z);
            max_x = std::max(max_x, v.x);
            max_y = std::max(max_y, v.y);
            max_z = std::max(max_z, v.z);

            vertex_count++;
        } else if (lower_token == "endloop") {
            if (vertex_count != 3) {
                result.error_message = "Facet loop closed with " + std::to_string(vertex_count) + " vertices (expected 3) at line " + std::to_string(line_num);
                return result;
            }
            in_loop = false;
        } else if (lower_token == "endfacet") {
            in_facet = false;
            double area = triangle_area(current_tri.v1, current_tri.v2, current_tri.v3);
            total_area += area;
            result.triangles.push_back(current_tri);
        } else if (lower_token == "endsolid") {
            break;
        }
    }

    if (result.triangles.empty()) {
        result.error_message = "Valid solid header found but no facets/triangles parsed.";
        return result;
    }

    result.valid = true;
    result.triangle_count = result.triangles.size();
    result.surface_area = total_area;
    result.bbox.min = {min_x, min_y, min_z};
    result.bbox.max = {max_x, max_y, max_z};
    result.bbox.center = {
        (min_x + max_x) * 0.5,
        (min_y + max_y) * 0.5,
        (min_z + max_z) * 0.5
    };
    result.bbox.dimensions = {
        max_x - min_x,
        max_y - min_y,
        max_z - min_z
    };

    return result;
}

nlohmann::json StlParseResult::to_json(bool include_triangles, size_t max_triangles_export) const {
    nlohmann::json j;
    j["valid"] = valid;
    j["error_message"] = error_message;
    j["solid_name"] = solid_name;
    j["triangle_count"] = triangle_count;
    j["surface_area"] = surface_area;

    j["bbox"] = {
        {"min", {{"x", bbox.min.x}, {"y", bbox.min.y}, {"z", bbox.min.z}}},
        {"max", {{"x", bbox.max.x}, {"y", bbox.max.y}, {"z", bbox.max.z}}},
        {"center", {{"x", bbox.center.x}, {"y", bbox.center.y}, {"z", bbox.center.z}}},
        {"dimensions", {{"x", bbox.dimensions.x}, {"y", bbox.dimensions.y}, {"z", bbox.dimensions.z}}}
    };

    if (include_triangles) {
        // Flatten into flat float array for Three.js BufferGeometry: [x1,y1,z1, x2,y2,z2, x3,y3,z3, ...]
        std::vector<float> vertices;
        std::vector<float> normals;
        size_t count = std::min(triangles.size(), max_triangles_export);
        vertices.reserve(count * 9);
        normals.reserve(count * 9);

        for (size_t i = 0; i < count; ++i) {
            const auto& t = triangles[i];
            vertices.push_back(static_cast<float>(t.v1.x));
            vertices.push_back(static_cast<float>(t.v1.y));
            vertices.push_back(static_cast<float>(t.v1.z));
            vertices.push_back(static_cast<float>(t.v2.x));
            vertices.push_back(static_cast<float>(t.v2.y));
            vertices.push_back(static_cast<float>(t.v2.z));
            vertices.push_back(static_cast<float>(t.v3.x));
            vertices.push_back(static_cast<float>(t.v3.y));
            vertices.push_back(static_cast<float>(t.v3.z));

            for (int k = 0; k < 3; ++k) {
                normals.push_back(static_cast<float>(t.normal.x));
                normals.push_back(static_cast<float>(t.normal.y));
                normals.push_back(static_cast<float>(t.normal.z));
            }
        }
        j["vertices"] = vertices;
        j["normals"] = normals;
    }

    return j;
}

} // namespace workbench
