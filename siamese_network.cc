#include "utils.h"
#include "dynet/io.h"
#include "dynet/../examples/cpp-utils/getpid.h"
#include "dynet/../examples/cpp-utils/cl-args.h"
#include "dynet/../examples/cpp-utils/data-io.h"

using namespace std;
using namespace dynet;

int main(int argc, char** argv) {
    // Fetch dynet params ----------------------------------------------------------------------------
    auto dyparams = dynet::extract_dynet_params(argc, argv);
    dynet::initialize(dyparams);
    // Fetch program specific parameters (see ../utils/cl-args.h) ------------------------------------
    Params params;

    get_args(argc, argv, params, TRAIN_SUP);

    vector<vector<string>> train_labels = vector<vector<string>> ();
    vector<vector<float>> train_data = vector<vector<float>> ();

    readTrainData(train_labels, train_data);

    ParameterCollection model;

    AdamTrainer trainer(model);
    trainer.clip_threshold *= params.BATCH_SIZE;

    MLP nn1(model, vector<Layer>({
        Layer(/* input_dim */ 10240, /* output_dim */ 5000, /* activation */ RELU, /* dropout_rate */ 0.2),
        Layer(/* input_dim */ 5000, /* output_dim */ 400, /* activation */ RELU, /* dropout_rate */ 0.2),
        Layer(/* input_dim */ 400, /* output_dim */ 400, /* activation */ LINEAR, /* dropout_rate */ 0.0)
    }));

    MLP nn2(model, vector<Layer>({
        Layer(/* input_dim */ 10240, /* output_dim */ 5000, /* activation */ RELU, /* dropout_rate */ 0.2),
        Layer(/* input_dim */ 5000, /* output_dim */ 400, /* activation */ RELU, /* dropout_rate */ 0.2),
        Layer(/* input_dim */ 400, /* output_dim */ 400, /* activation */ LINEAR, /* dropout_rate */ 0.0)
    }));

    MLP nn_join(model, vector<Layer>({
        Layer(/* input_dim */ 400, /* output_dim */ 1, /* activation */ SIGMOID, /* dropout_rate */ 0.2),
    }));

    // Load preexisting weights (if provided)
    if (params.model_file != "") {
        TextFileLoader loader(params.model_file);
        loader.populate(model);
    }

    // Initialize variables for training -------------------------------------------------------------
    // Worst accuracy
    double worst = 0;

    // Number of batches in training set
    unsigned num_batches = train_data.size()  / params.BATCH_SIZE - 1;

    // Random indexing
    unsigned si;
    vector<unsigned> order(num_batches);
    for (unsigned i = 0; i < num_batches; ++i) order[i] = i;

    unsigned epoch = 0;
    vector<Expression> cur_batch;
    vector<string> cur_labels;

    //// static_cast<int> -> change value epoch to int
    while (static_cast<int>(epoch) < params.NUM_EPOCHS || params.NUM_EPOCHS < 0) {
        // Reshuffle the dataset
        cerr << "**SHUFFLE\n";
        random_shuffle(order.begin(), order.end());
        // Initialize loss and number of samples processed (to average loss)
        double loss = 0;
        double num_samples = 0;

        // Start timer
        std::unique_ptr<Timer> iteration(new Timer("completed in"));

        // Activate dropout
        nn1.enable_dropout();
        nn2.enable_dropout();
        nn_join.enable_dropout();

        for (si = 0; si < num_batches; ++si) {
            // build graph for this instance
            ComputationGraph cg;
            // Compute batch start id and size
            int id = order[si] * params.BATCH_SIZE;
            unsigned bsize = std::min((unsigned) train_data.size() - id, params.BATCH_SIZE);
            // Get input batch
            cur_batch = vector<Expression>(bsize);
            cur_labels = vector<unsigned>(bsize);
            for (unsigned idx = 0; idx < bsize; ++idx) {
                cur_batch[idx] = input(cg, {10240}, train_data[id + idx]);
                cur_labels[idx] = train_labels[id + idx][1];
            }
            ////
        }
    }
}
