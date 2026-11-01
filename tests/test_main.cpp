#include <iostream>
#include <vector>
#include <string>
#include <functional>

struct TestCase {
    std::string name;
    std::function<bool()> test_fn;
};

static std::vector<TestCase>& get_test_registry() {
    static std::vector<TestCase> registry;
    return registry;
}

void register_test(const std::string& name, std::function<bool()> test_fn) {
    get_test_registry().push_back({name, test_fn});
}

#define TEST_ASSERT(condition, msg) \
    if (!(condition)) { \
        std::cerr << "  FAILED ASSERTION: " << msg << " (" << #condition << ") at " << __FILE__ << ":" << __LINE__ << std::endl; \
        return false; \
    }

int main() {
    std::cout << "========================================================\n";
    std::cout << " UNIFIED ENGINEERING WORKBENCH C++17 VERIFICATION SUITE\n";
    std::cout << "========================================================\n";

    const auto& tests = get_test_registry();
    int passed = 0;
    int failed = 0;

    for (const auto& t : tests) {
        std::cout << "[RUNNING] " << t.name << "... " << std::flush;
        try {
            if (t.test_fn()) {
                std::cout << " [PASS]\n";
                passed++;
            } else {
                std::cout << " [FAIL]\n";
                failed++;
            }
        } catch (const std::exception& e) {
            std::cout << " [EXCEPTION: " << e.what() << "]\n";
            failed++;
        }
    }

    std::cout << "--------------------------------------------------------\n";
    std::cout << "TEST SUMMARY: " << passed << " PASSED, " << failed << " FAILED, TOTAL: " << tests.size() << "\n";
    std::cout << "========================================================\n";

    return (failed == 0) ? 0 : 1;
}
