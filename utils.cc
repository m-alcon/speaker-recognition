#include "utils.h"

using namespace std;

int main() {
    vector<vector<vector<float>>> test_data = loadData("test");
    Example ex = generateExample(test_data);
    for(unsigned i = 0; i < 2000; i++) {
        cerr << "\r" << i << "/2000" << endl;
        Example ex = generateExample(test_data);
    }
    cout << endl;
}