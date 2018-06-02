#include "utils.h"

using namespace std;

int main() {
    vector<vector<vector<float>>> train_data = loadData("train");
    vector<float> positive1, positive2, negative1, negative2;
    generateExample(train_data, positive1, positive2, negative1, negative2);
    for(unsigned i = 0; i < positive1.size(); i++) {
        cout << positive1[i] << " ";
    }
    cout << endl;
}