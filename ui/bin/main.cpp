#include <iostream>
#include <string>
#include <stdlib.h>
#include <chrono>
#include <thread>

using namespace std;

int main() {
    srand (time(NULL));
    this_thread::sleep_for(std::chrono::milliseconds(3000));
    string s1, s2;
    while(cin >> s1 >> s2) {
        int res = rand() % 2;
        this_thread::sleep_for(std::chrono::milliseconds(3000));
        cout << res << endl;
    }
}