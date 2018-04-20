#ifndef UTILS_H
#define UTILS_H

#include "mlp.h"

using namespace std;

void readTrainData(vector<vector<string>> &train_labels, vector<vector<float>> &train_data) {
    ifstream labels_file ("./data/2004-2008_labels_final.ndx", ifstream::in);
    int i = 0;
    // Vector of pairs (speaker_id, file_name)

    if (labels_file.is_open()) {
        string file_name, id;

        while (labels_file >> file_name >> id) {
            cout << "\rLoading train data: " << 100*i/18141 << " %";
            vector<string> speaker_vec = {id,file_name};

            ifstream speaker_file ("./data/train/"+file_name+".sv", ifstream::in);

            float value;
            vector<float> speaker_data = vector<float> ();
            while (speaker_file >> value) {
                speaker_data.push_back(value);
            }
            train_data.push_back(speaker_data);
            ++i;
        }
    }
    cout << endl;
}

#endif