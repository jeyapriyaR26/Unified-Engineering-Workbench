#include "../../include/geometry/temperature_csv.hpp"
#include <fstream>
#include <sstream>
#include <cmath>
#include <algorithm>
#include <limits>
#include <cctype>

namespace workbench {

static std::string trim_str(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\r\n");
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \t\r\n");
    return str.substr(first, (last - first + 1));
}

TemperatureCsvResult TemperatureCsvParser::parse_csv_file(const std::string& filepath) {
    std::ifstream file(filepath);
    if (!file.is_open()) {
        TemperatureCsvResult res;
        res.valid = false;
        res.error_message = "Failed to open CSV file: " + filepath;
        return res;
    }
    std::stringstream buffer;
    buffer << file.rdbuf();
    return parse_csv_string(buffer.str());
}

TemperatureCsvResult TemperatureCsvParser::parse_csv_string(const std::string& content) {
    TemperatureCsvResult result;
    result.valid = false;

    if (content.empty()) {
        result.error_message = "Empty CSV input: File contains no data.";
        return result;
    }

    std::istringstream stream(content);
    std::string line;

    // Header check
    if (!std::getline(stream, line)) {
        result.error_message = "Empty CSV content.";
        return result;
    }

    std::string trimmed_header = trim_str(line);
    // Remove potential UTF-8 BOM
    if (trimmed_header.size() >= 3 && 
        (unsigned char)trimmed_header[0] == 0xEF && 
        (unsigned char)trimmed_header[1] == 0xBB && 
        (unsigned char)trimmed_header[2] == 0xBF) {
        trimmed_header = trimmed_header.substr(3);
    }

    // Expected columns: node_id,x_m,y_m,z_m,temperature_C
    std::vector<std::string> headers;
    std::istringstream header_stream(trimmed_header);
    std::string col;
    while (std::getline(header_stream, col, ',')) {
        headers.push_back(trim_str(col));
    }

    if (headers.size() != 5) {
        result.error_message = "Invalid CSV schema: Expected exactly 5 columns (node_id,x_m,y_m,z_m,temperature_C), found " + std::to_string(headers.size());
        return result;
    }

    if (headers[0] != "node_id" || headers[1] != "x_m" || headers[2] != "y_m" || headers[3] != "z_m" || headers[4] != "temperature_C") {
        result.error_message = "Invalid CSV header: Expected 'node_id,x_m,y_m,z_m,temperature_C', found '" + trimmed_header + "'";
        return result;
    }

    double min_x = std::numeric_limits<double>::infinity();
    double min_y = std::numeric_limits<double>::infinity();
    double min_z = std::numeric_limits<double>::infinity();
    double max_x = -std::numeric_limits<double>::infinity();
    double max_y = -std::numeric_limits<double>::infinity();
    double max_z = -std::numeric_limits<double>::infinity();

    double min_temp = std::numeric_limits<double>::infinity();
    double max_temp = -std::numeric_limits<double>::infinity();
    double sum_temp = 0.0;
    double sum_sq_temp = 0.0;

    int line_num = 1;
    while (std::getline(stream, line)) {
        line_num++;
        std::string trimmed_line = trim_str(line);
        if (trimmed_line.empty()) continue;

        std::vector<std::string> tokens;
        std::istringstream line_stream(trimmed_line);
        std::string token;
        while (std::getline(line_stream, token, ',')) {
            tokens.push_back(trim_str(token));
        }

        if (tokens.size() != 5) {
            result.error_message = "Malformed CSV at line " + std::to_string(line_num) + ": Expected 5 comma-separated values, found " + std::to_string(tokens.size());
            return result;
        }

        // Parse node_id
        int node_id = 0;
        try {
            size_t idx = 0;
            node_id = std::stoi(tokens[0], &idx);
            if (idx != tokens[0].size()) throw std::invalid_argument("trailing characters");
        } catch (...) {
            result.error_message = "Invalid node_id at line " + std::to_string(line_num) + ": '" + tokens[0] + "' is not an integer.";
            return result;
        }

        // Parse x, y, z, temperature
        double coords[4];
        for (int i = 0; i < 4; ++i) {
            try {
                size_t idx = 0;
                coords[i] = std::stod(tokens[i + 1], &idx);
                if (idx != tokens[i + 1].size()) throw std::invalid_argument("trailing characters");
            } catch (...) {
                result.error_message = "Invalid numeric value at line " + std::to_string(line_num) + " col " + std::to_string(i + 2) + ": '" + tokens[i + 1] + "'";
                return result;
            }

            if (!std::isfinite(coords[i])) {
                result.error_message = "Non-finite floating-point value (NaN or Inf) detected at line " + std::to_string(line_num) + " col " + std::to_string(i + 2);
                return result;
            }
        }

        TemperatureNode node;
        node.node_id = node_id;
        node.x = coords[0];
        node.y = coords[1];
        node.z = coords[2];
        node.temperature = coords[3];

        min_x = std::min(min_x, node.x);
        min_y = std::min(min_y, node.y);
        min_z = std::min(min_z, node.z);
        max_x = std::max(max_x, node.x);
        max_y = std::max(max_y, node.y);
        max_z = std::max(max_z, node.z);

        min_temp = std::min(min_temp, node.temperature);
        max_temp = std::max(max_temp, node.temperature);
        sum_temp += node.temperature;
        sum_sq_temp += node.temperature * node.temperature;

        result.nodes.push_back(node);
    }

    if (result.nodes.empty()) {
        result.error_message = "CSV contains header but zero data rows.";
        return result;
    }

    size_t n = result.nodes.size();
    double mean_temp = sum_temp / n;
    double variance = (sum_sq_temp / n) - (mean_temp * mean_temp);
    if (variance < 0.0) variance = 0.0;
    double std_temp = std::sqrt(variance);

    result.valid = true;
    result.stats.node_count = n;
    result.stats.min_temp = min_temp;
    result.stats.max_temp = max_temp;
    result.stats.mean_temp = mean_temp;
    result.stats.std_temp = std_temp;
    result.stats.bbox.min = {min_x, min_y, min_z};
    result.stats.bbox.max = {max_x, max_y, max_z};
    result.stats.bbox.center = {(min_x + max_x) * 0.5, (min_y + max_y) * 0.5, (min_z + max_z) * 0.5};
    result.stats.bbox.dimensions = {max_x - min_x, max_y - min_y, max_z - min_z};

    return result;
}

nlohmann::json TemperatureCsvResult::to_json() const {
    nlohmann::json j;
    j["valid"] = valid;
    j["error_message"] = error_message;
    j["stats"] = {
        {"node_count", stats.node_count},
        {"min_temp_C", stats.min_temp},
        {"max_temp_C", stats.max_temp},
        {"mean_temp_C", stats.mean_temp},
        {"std_temp_C", stats.std_temp},
        {"bbox", {
            {"min", {{"x", stats.bbox.min.x}, {"y", stats.bbox.min.y}, {"z", stats.bbox.min.z}}},
            {"max", {{"x", stats.bbox.max.x}, {"y", stats.bbox.max.y}, {"z", stats.bbox.max.z}}},
            {"center", {{"x", stats.bbox.center.x}, {"y", stats.bbox.center.y}, {"z", stats.bbox.center.z}}},
            {"dimensions", {{"x", stats.bbox.dimensions.x}, {"y", stats.bbox.dimensions.y}, {"z", stats.bbox.dimensions.z}}}
        }}
    };

    nlohmann::json node_list = nlohmann::json::array();
    for (const auto& node : nodes) {
        node_list.push_back({
            {"node_id", node.node_id},
            {"x_m", node.x},
            {"y_m", node.y},
            {"z_m", node.z},
            {"temperature_C", node.temperature}
        });
    }
    j["nodes"] = node_list;

    return j;
}

} // namespace workbench
