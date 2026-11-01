#pragma once
#include <string>
#include "../nlohmann/json.hpp"

namespace workbench {

using json = nlohmann::json;

struct IpcRequest {
    std::string command;
    json payload;
};

struct IpcResponse {
    bool success{false};
    std::string error;
    json data;

    json to_json() const {
        return json{
            {"success", success},
            {"error", error},
            {"data", data}
        };
    }
};

} // namespace workbench
