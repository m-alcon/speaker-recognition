#ifndef UTILS_H
#define UTILS_H

#include "mlp.h"

using namespace std;

struct Example {
    vector<float> *positive1;
    vector<float> *positive2;
    vector<float> *negative1;
    vector<float> *negative2;
};

vector<float> readSpeakerFile (string speaker) {

    ifstream speaker_file("./data/train/"+speaker+".sv", ifstream::in);

    float value;
    vector<float> speaker_data = vector<float> ();
    while (speaker_file >> value) {
        speaker_data.push_back(value);
    }
    return speaker_data;
}

vector<vector<vector<float>>> loadData (const string &name) {
    unsigned size = 1097;
    if(name == "test") size = 275;

    ifstream file("./scripts/loader-"+name+".dat");
    string line;
    vector<vector<vector<float>>> data = vector<vector<vector<float>>> (size);
    unsigned i = 0;
    while(getline(file,line)) {
        cerr << "\r["<< i*100/size <<"%] Loading " << name << " data";
        istringstream iss(line);
        string speaker_file;
        vector<vector<float>> speaker_data = vector<vector<float>> ();
        while (iss >> speaker_file) {
            vector<float> single_file = readSpeakerFile(speaker_file);
            speaker_data.push_back(single_file);
        }
        data[i] = speaker_data;
        ++i;
    }
    cerr << endl;
    return data;
}

Example generateExample(vector<vector<vector<float>>> &data) {
    cerr << "====== GENERATE EXAMPLE ======" << endl;
    Example res;
    srand (time(NULL));
    int speaker1 = rand() % (data.size()+1);
    cerr << "[" << data[speaker1].size() << "] speaker1=" << speaker1 << endl;
    int speaker2 = rand() % (data.size()+1);
    while (speaker1 == speaker2) {
        speaker2 = rand() % (data.size()+1);
    }
    cerr << "[" << data[speaker2].size() << "] speaker2=" << speaker2 << endl;
    int file1 = rand() % (data[speaker1].size()+1);
    res.positive1 = &(data[speaker1][file1]);
    int file2 = rand() % (data[speaker1].size()+1);
    res.positive2 = &(data[speaker1][file2]);

    cerr << "p1=" << file1 << endl;
    cerr << "p2=" << file2 << endl;
    file1 = rand() % (data[speaker1].size()+1);
    res.negative1 = &(data[speaker1][file1]);
    file2 = rand() % (data[speaker2].size()+1);
    res.negative2 = &(data[speaker2][file2]);
    cerr << "n1=" << file1 << endl;
    cerr << "n2=" << file2 << endl;
    cerr << "==============================" << endl;
    return res;
}

#endif