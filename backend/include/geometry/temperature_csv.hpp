#pragma once
#include <string>
#include <vector>
#include "../nlohmann/json.hpp"
#include "stl_parser.hpp"

namespace workbench {

struct TemperatureNode {
    int node_id{0};
    double x{0.0};
    double y{0.0};
    double z{0.0};
    double temperature{0.0};
};

struct TemperatureStats {
    double min_temp{0.0};
    double max_temp{0.0};
    double mean_temp{0.0};
    double std_temp{0.0};
    size_t node_count{0};
    BoundingBox bbox;
};

struct TemperatureCsvResult {
    bool valid{false};
    std::string error_message;
    TemperatureStats stats;
    std::vector<TemperatureNode> nodes;

    nlohmann::json to_json() const;
};

class TemperatureCsvParser {
public:
    static TemperatureCsvResult parse_csv_string(const std::string& csv_content);
    static TemperatureCsvResult parse_csv_file(const std::string& filepath);
};

} // namespace workbench
