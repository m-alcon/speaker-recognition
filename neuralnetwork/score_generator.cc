#include "mlp.h"
#include "dynet/io.h"
#include "dynet/../examples/cpp-utils/getpid.h"
#include "dynet/../examples/cpp-utils/cl-args.h"
#include "dynet/../examples/cpp-utils/data-io.h"
#include "utils.h"

using namespace std;
using namespace dynet;

int main(int argc, char** argv) {
    // Fetch dynet params ----------------------------------------------------------------------------
    auto dyparams = dynet::extract_dynet_params(argc, argv);
    dynet::initialize(dyparams);
    // Fetch program specific parameters (see ../utils/cl-args.h) ------------------------------------
    Params params;

    get_args(argc, argv, params, TRAIN_SUP);

    // Build model -----------------------------------------------------------------------------------
    ParameterCollection model;

    // Create model
    MLP nn(model, vector<Layer>({
        Layer(/* input_dim */ 16896, /* output_dim */ 5000, /* activation */ RELU, /* dropout_rate */ 0.0),
        Layer(/* input_dim */ 5000, /* output_dim */ 5000, /* activation */ RELU, /* dropout_rate */ 0.0),
        Layer(/* input_dim */ 5000, /* output_dim */ 1000, /* activation */ RELU, /* dropout_rate */ 0.0),
        Layer(/* input_dim */ 1000, /* output_dim */ 5000, /* activation */ RELU, /* dropout_rate */ 0.0)
    }),vector<Layer>({
         Layer(/* input_dim */ 10000, /* output_dim */ 1000, /* activation */ RELU, /* dropout_rate */ 0.0),
         Layer(/* input_dim */ 1000, /* output_dim */ 1, /* activation */ SIGMOID, /* dropout_rate */ 0.0),
    }));


    TextFileLoader loader("./model/model.params");
    loader.populate(model);

    ifstream iimpostors("./scripts/impostors-score-list.dat.txt");
    ifstream iclients("./scripts/clients-score-list.dat.txt");
    ofstream oclients("./scripts/clients.txt");
    ofstream oimpostors("./scripts/impostors.txt");

    string s1, s2;

    nn.disable_dropout();
    while (iimpostors >> s1 >> s2) {
        ComputationGraph cg;
        Expression x1 = input(cg, {16896}, readTestSpeakerFile(s1));
        Expression x2 = input(cg, {16896}, readTestSpeakerFile(s2));
        float prediction = nn.predict(x1, x2, cg);

        oimpostors << prediction << endl;
    }

    while (iclients >> s1 >> s2) {
        ComputationGraph cg;
        Expression x1 = input(cg, {16896}, readTestSpeakerFile(s1));
        Expression x2 = input(cg, {16896}, readTestSpeakerFile(s2));
        float prediction = nn.predict(x1, x2, cg);

        oclients << prediction << endl;
    }
}