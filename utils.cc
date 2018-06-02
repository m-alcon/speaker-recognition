#include "utils.h"

using namespace std;

int main() {
    vector<vector<vector<float>>> test_data = loadData("test");
    Example ex = generateExample(test_data);
    for(unsigned i = 0; i < test_data.size(); i++) {
        for(unsigned j = 0; j < test_data[i].size(); j++) {
            cerr << test_data[i][j].size() << endl;
        }
    }
    cout << endl;
}