#include "utils.h"

using namespace std;

int main() {
    vector<vector<vector<float>>> train_data = loadData("train");
    cout << train_data.size() << endl;
    for (int i = 0; i < train_data.size(); ++i) {
        for (int j = 0; j < train_data[i].size(); ++j) {
            for (int k = 0; k < train_data[i][j].size(); ++k) {
                cout << train_data[i][j][k] << endl;
            }
        }
    }
}