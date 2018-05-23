#include "utils.h"

using namespace std;

int main() {
    vector<float> train_data = readSpeakerFile("jaaa_A");
    cout << train_data.size() << endl;
}