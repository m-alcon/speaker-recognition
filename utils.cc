#include "utils.h"

using namespace std;

int main() {
    vector<vector<vector<float>>> train_data = loadData("test");
    Example ex = generateExample(train_data);
    for(unsigned i = 0; i < (*ex.positive1).size(); i++) {
        cout << (*ex.positive1)[i] << " ";
    }
    cout << endl;
}