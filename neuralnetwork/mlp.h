#ifndef MLP_H
#define MLP_H

#include "dynet/nodes.h"
#include "dynet/dynet.h"
#include "dynet/training.h"
#include "dynet/timing.h"
#include "dynet/expr.h"

#include <iostream>
#include <fstream>
#include <sstream>
#include <algorithm>

using namespace std;
using namespace dynet;

enum Activation {
	SIGMOID, /**< `SIGMOID` : Sigmoid function \f$x\longrightarrow \frac {1} {1+e^{-x}}\f$ */
	TANH, /**< `TANH` : Tanh function \f$x\longrightarrow \frac {1-e^{-2x}} {1+e^{-2x}}\f$ */
	RELU, /**< `RELU` : Rectified linear unit \f$x\longrightarrow \max(0,x)\f$ */
	LINEAR, /**< `LINEAR` : Identity function \f$x\longrightarrow x\f$ */
	SOFTMAX /**< `SOFTMAX` : Softmax function \f$\textbf{x}=(x_i)_{i=1,\dots,n}\longrightarrow \frac {e^{x_i}}{\sum_{j=1}^n e^{x_j} })_{i=1,\dots,n}\f$ */
};

struct Layer {
public:
	unsigned input_dim; /**< Input dimension */
	unsigned output_dim; /**< Output dimension */
	Activation activation = LINEAR; /**< Activation function */
	float dropout_rate = 0; /**< Dropout rate */


	Layer(unsigned input_dim, unsigned output_dim, Activation activation, float dropout_rate) :
		input_dim(input_dim),
		output_dim(output_dim),
		activation(activation),
		dropout_rate(dropout_rate) {};
	Layer() {};
};

struct MLP {
protected:
	// Hyper-parameters
	unsigned SIAMESE_LAYERS = 0;
	unsigned UNION_LAYERS = 0;

	// Layers
	vector<Layer> layers;
	vector<Layer> union_layers;
	// Parameters
	vector<vector<Parameter>> params;
	vector<vector<Parameter>> union_params;

	bool dropout_active = true;

public:


	MLP(ParameterCollection & model) {
		SIAMESE_LAYERS = 0;
		UNION_LAYERS = 0;
	}


	MLP(ParameterCollection& model,
			vector<Layer> layers, vector<Layer> union_layers) {
		// Verify layers compatibility
		for (unsigned l = 0; l < layers.size() - 1; ++l) {
			if (layers[l].output_dim != layers[l + 1].input_dim)
				throw invalid_argument("Layer dimensions don't match");
		}

		// Register parameters in model
		for (Layer layer : layers) {
			siamese_append(model, layer);
		}

		// Verify union_layers compatibility
		for (unsigned l = 0; l < union_layers.size() - 1; ++l) {
			if (union_layers[l].output_dim != union_layers[l + 1].input_dim)
				throw invalid_argument("Layer dimensions don't match");
		}

		// Register union_parameters in model
		for (Layer layer : union_layers) {
			union_append(model, layer);
		}
	}



	void siamese_append(ParameterCollection& model, Layer layer) {
		// Check compatibility
		if (SIAMESE_LAYERS > 0)
			if (layers[SIAMESE_LAYERS - 1].output_dim != layer.input_dim)
				throw invalid_argument("Layer dimensions don't match");

		// Add to layers
		layers.push_back(layer);
		SIAMESE_LAYERS++;
		// Register parameters
		Parameter W = model.add_parameters({layer.output_dim, layer.input_dim});
		Parameter b = model.add_parameters({layer.output_dim});
		params.push_back({W, b});
	}

	void union_append(ParameterCollection& model, Layer layer) {
		// Check compatibility
		if (UNION_LAYERS > 0)
			if (union_layers[UNION_LAYERS - 1].output_dim != layer.input_dim)
				throw invalid_argument("Layer dimensions don't match");
		// Add to layers
		union_layers.push_back(layer);
		UNION_LAYERS++;
		// Register parameters
		Parameter W = model.add_parameters({layer.output_dim, layer.input_dim});
		Parameter b = model.add_parameters({layer.output_dim});
		union_params.push_back({W, b});
	}

	Expression single_siamese_run(const Expression &x,
									ComputationGraph& cg) {
		// Expression for the current hidden state
		Expression h_cur = x;
		for (unsigned l = 0; l < SIAMESE_LAYERS; ++l) {
			// Initialize parameters in computation graph
			Expression W = parameter(cg, params[l][0]);
			Expression b = parameter(cg, params[l][1]);
			// Aplly affine transform
			Expression a = affine_transform({b, W, h_cur});
			// Apply activation function
			Expression h = activate(a, layers[l].activation);
			// Take care of dropout
			Expression h_dropped;
			if (layers[l].dropout_rate > 0) {
				if (dropout_active) {
					// During training, drop random units
					Expression mask = random_bernoulli(cg, {layers[l].output_dim}, 1 - layers[l].dropout_rate);
					h_dropped = cmult(h, mask);
				} else {
					// At test time, multiply by the retention rate to scale
					h_dropped = h * (1 - layers[l].dropout_rate);
				}
			} else {
				// If there's no dropout, don't do anything
				h_dropped = h;
			}
			// Set current hidden state
			h_cur = h_dropped;
		}

		return h_cur;
	}

	Expression union_run(const Expression &x,
									ComputationGraph& cg) {
		// Expression for the current hidden state
		Expression h_cur = x;
		for (unsigned l = 0; l < UNION_LAYERS; ++l) {
			// Initialize parameters in computation graph
			Expression W = parameter(cg, union_params[l][0]);
			Expression b = parameter(cg, union_params[l][1]);
			// Aplly affine transform
			Expression a = affine_transform({b, W, h_cur});
			// Apply activation function
			Expression h = activate(a, union_layers[l].activation);
			// Take care of dropout
			Expression h_dropped;
			if (union_layers[l].dropout_rate > 0) {
				if (dropout_active) {
					// During training, drop random units
					Expression mask = random_bernoulli(cg, {union_layers[l].output_dim}, 1 - union_layers[l].dropout_rate);
					h_dropped = cmult(h, mask);
				} else {
					// At test time, multiply by the retention rate to scale
					h_dropped = h * (1 - union_layers[l].dropout_rate);
				}
			} else {
				// If there's no dropout, don't do anything
				h_dropped = h;
			}
			// Set current hidden state
			h_cur = h_dropped;
		}

		return h_cur;
	}

	Expression get_nll(const Expression &x1, const Expression &x2, const Expression &labels, ComputationGraph& cg) {
		// compute output
		Expression y1 = single_siamese_run(x1, cg);
		Expression y2 = single_siamese_run(x2, cg);
		Expression y_mix = concatenate({y1,y2});
		Expression y = union_run(y_mix,cg);

		Expression losses = binary_log_loss(y, labels);
		// Sum across batches
		return sum_batches(losses);
	}

	float predict(const Expression &x1, const Expression &x2,
							ComputationGraph& cg) {

		Expression y1 = single_siamese_run(x1, cg);
		Expression y2 = single_siamese_run(x2, cg);
		Expression y_mix = concatenate({y1,y2});
		Expression y = union_run(y_mix,cg);
		// Get values
		vector<float> probs = as_vector(cg.forward(y));

		return probs[0];
	}

	vector<float> predict_batch(const Expression &x1, const Expression &x2,
							ComputationGraph& cg) {

		Expression y1 = single_siamese_run(x1, cg);
		Expression y2 = single_siamese_run(x2, cg);
		Expression y_mix = concatenate({y1,y2});
		Expression y = union_run(y_mix,cg);
		// Get values
		vector<float> probs = as_vector(cg.forward(y));

		return probs;
	}

	void enable_dropout() {
		dropout_active = true;
	}

	void disable_dropout() {
		dropout_active = false;
	}

	bool is_dropout_enabled() {
		return dropout_active;
	}

private:
	inline Expression activate(Expression h, Activation f) {
		switch (f) {
		case LINEAR:
			return h;
			break;
		case RELU:
			return rectify(h);
			break;
		case SIGMOID:
			return logistic(h);
			break;
		case TANH:
			return tanh(h);
			break;
		case SOFTMAX:
			return softmax(h);
			break;
		default:
			throw invalid_argument("Unknown activation function");
			break;
		}
	}
};

#endif
