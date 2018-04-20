#include "utils.h"

using namespace std;

int main() {
    vector<vector<string>> train_labels = vector<vector<string>> ();
    vector<vector<float>> train_data = vector<vector<float>> ();

    readTrainData(train_labels, train_data);
}