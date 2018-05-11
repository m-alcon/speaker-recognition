#ifndef UTILS_H
#define UTILS_H

#include "mlp.h"

using namespace std;

vector<float> readSpeakerFile (string speaker) {

    ifstream speaker_file ("./data/train/"+speaker+".sv", ifstream::in);

    float value;
    vector<float> speaker_data = vector<float> ();
    while (speaker_file >> value) {
        speaker_data.push_back(value);
    }
    return speaker_data;
}

#endif