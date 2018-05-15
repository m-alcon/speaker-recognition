/**
 * Train a multilayer perceptron to classify mnist digits
 *
 * This provide an example of usage of the mlp.h model
 */
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

    unsigned batch_size = 20;
    unsigned epoch_size = 345;

    // ParameterCollection name (for saving) -----------------------------------------------------------------------

    ostringstream os;
    // Store a bunch of information in the model name
    os << "siamese_network"
        << "_" << "mlp"
        << "_" << 10240 << "-" << 5000 << "-relu-" << 0.2
        << "_" << 5000 << "-" << 400 << "-relu-" << 0.2
        << "_" << 400 << "-" << 400 << "-softmax"
        << "_" << getpid()
        << ".params";
    const string fname = os.str();
    cerr << "Parameters will be written to: " << fname << endl;
    // Build model -----------------------------------------------------------------------------------

    ParameterCollection model;
    // Use Adam optimizer
    AdamTrainer trainer(model);
    trainer.clip_threshold *= batch_size;

    // Create model
    MLP nn(model, vector<Layer>({
        Layer(/* input_dim */ 10240, /* output_dim */ 5000, /* activation */ RELU, /* dropout_rate */ 0.2),
        Layer(/* input_dim */ 5000, /* output_dim */ 400, /* activation */ RELU, /* dropout_rate */ 0.2),
        Layer(/* input_dim */ 400, /* output_dim */ 400, /* activation */ RELU, /* dropout_rate */ 0.0)
    }),vector<Layer>({
         Layer(/* input_dim */ 800, /* output_dim */ 1, /* activation */ SIGMOID, /* dropout_rate */ 0.2)
    }));


    // Load preexisting weights (if provided)
    // if (params.model_file != "") {
    //     TextFileLoader loader(params.model_file);
    //     loader.populate(model);
    // }

    // Initialize variables for training -------------------------------------------------------------
    // Worst accuracy
    double worst = 0;


    unsigned epoch = 0;
    vector<Expression> cur_batch1, cur_batch2;
    vector<unsigned> cur_labels;

    ifstream train_file ("./scripts/train.dat", ifstream::in);
    string speaker1, speaker2;
    unsigned label;
    // Run for the given number of epochs (or indefinitely if params.NUM_EPOCHS is negative)
    //while (static_cast<int>(epoch) < params.NUM_EPOCHS || params.NUM_EPOCHS < 0) {
    while(!train_file.eof()) {
        double loss = 0;
        double num_samples = 0;

        // Start timer
        std::unique_ptr<Timer> iteration(new Timer("completed in"));

        // Activate dropout
        nn.enable_dropout();

        for (int i = 0; i < epoch_size; ++i) {
            // build graph for this instance
            ComputationGraph cg;
            // Get input batch
            cur_batch1 = vector<Expression>(batch_size);
            cur_batch2 = vector<Expression>(batch_size);
            cur_labels = vector<unsigned>(batch_size);
            for (int j = 0; j < batch_size; ++j) {
                train_file >> speaker1 >> speaker2 >> label;
                cur_batch1[j] = input(cg, {10240}, readSpeakerFile(speaker1));
                cur_batch2[j] = input(cg, {10240}, readSpeakerFile(speaker2));
                cur_labels[j] = label;
            }
            // Reshape as batch (not very intuitive yet)
            Expression x1_batch = reshape(concatenate_cols(cur_batch1), Dim({10240}, batch_size));
            Expression x2_batch = reshape(concatenate_cols(cur_batch2), Dim({10240}, batch_size));
            // Get negative log likelihood on batch
            Expression loss_expr = nn.get_nll(x1_batch, x2_batch, cur_labels, cg);
            // Get scalar error for monitoring
            loss += as_scalar(cg.forward(loss_expr));
            // Increment number of samples processed
            num_samples += batch_size;
            // Compute gradient with backward pass
            cg.backward(loss_expr);
            // Update parameters
            trainer.update();
            // Print progress every tenth of the dataset
            if (i % 10 == 0) {
                // Print informations
                trainer.status();
                cerr << " E = " << (loss / num_samples) << ' ';
                // Reinitialize timer
                iteration.reset(new Timer("completed in"));
                // Reinitialize loss
                loss = 0;
                num_samples = 0;
            }
        }

        ifstream test_file ("./scripts/test.dat", ifstream::in);
        // Disable dropout for dev testing
        nn.disable_dropout();

        // Show score on dev data
        double dpos = 0;
        unsigned train_size = 0;
        while (test_file >> speaker1 >> speaker2 >> label) {
            // build graph for this instance
            ComputationGraph cg;
            // Get input expression
            Expression x1 = input(cg, {10240}, readSpeakerFile(speaker1));
            Expression x2 = input(cg, {10240}, readSpeakerFile(speaker2));
            // Get negative log likelihood on batch
            unsigned predicted_idx = nn.predict(x1, x2, cg);
            // Increment count of positive classification
            if (predicted_idx == label)
                dpos++;
            ++train_size;
        }
        // If the dev loss is lower than the previous ones, save the model
        if (dpos > worst) {
            worst = dpos;
            TextFileSaver saver(fname);
            saver.save(model);
        }
        // Print informations
        cerr << "\n***DEV [epoch=" << (epoch)
            << "] E = " << (dpos / (double) train_size) << ' ';
        // Reinitialize timer
        iteration.reset(new Timer("completed in"));

        // Increment epoch
        ++epoch;

    }
}
