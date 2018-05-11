#include "utils.h"

using namespace std;

int main() {
    vector<vector<string>> train_labels = vector<vector<string>> ();
    vector<vector<float>> train_data = vector<vector<float>> ();

    ifstream speaker_file ("./scripts/data.txt", ifstream::in);
    string speaker1, speaker2;

    while(!speaker_file.eof()) {
        for (int i = 0; i < 20; ++i) {
            speaker_file >> speaker1 >> speaker2;
            cout << speaker1 << speaker2 << endl;
        }
        cout << "==============BATCH==============" << endl;
    }
    cout << "================END================" << endl;
}