#ifndef MLP_H
#define MLP_H

/**
 * \file rnnlm-batch.h
 * \defgroup ffbuilders ffbuilders
 * \brief Feed forward nets builders
 *
 * An example implementation of a simple multilayer perceptron
 *
 */

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
/**
 * \ingroup ffbuilders
 * Common activation functions used in multilayer perceptrons
 */
enum Activation {
	SIGMOID, /**< `SIGMOID` : Sigmoid function \f$x\longrightarrow \frac {1} {1+e^{-x}}\f$ */
	TANH, /**< `TANH` : Tanh function \f$x\longrightarrow \frac {1-e^{-2x}} {1+e^{-2x}}\f$ */
	RELU, /**< `RELU` : Rectified linear unit \f$x\longrightarrow \max(0,x)\f$ */
	LINEAR, /**< `LINEAR` : Identity function \f$x\longrightarrow x\f$ */
	SOFTMAX /**< `SOFTMAX` : Softmax function \f$\textbf{x}=(x_i)_{i=1,\dots,n}\longrightarrow \frac {e^{x_i}}{\sum_{j=1}^n e^{x_j} })_{i=1,\dots,n}\f$ */
};

/**
 * \ingroup ffbuilders
 * \struct Layer
 * \brief Simple layer structure
 * \details Contains all parameters defining a layer
 *
 */
struct Layer {
public:
	unsigned input_dim; /**< Input dimension */
	unsigned output_dim; /**< Output dimension */
	Activation activation = LINEAR; /**< Activation function */
	float dropout_rate = 0; /**< Dropout rate */
	/**
	 * \brief Build a feed forward layer
	 *
	 * \param input_dim Input dimension
	 * \param output_dim Output dimension
	 * \param activation Activation function
	 * \param dropout_rate Dropout rate
	 */
	Layer(unsigned input_dim, unsigned output_dim, Activation activation, float dropout_rate) :
		input_dim(input_dim),
		output_dim(output_dim),
		activation(activation),
		dropout_rate(dropout_rate) {};
	Layer() {};
};

/**
 * \ingroup ffbuilders
 * \struct MLP
 * \brief Simple multilayer perceptron
 *
 */
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
	/**
	 * \brief Default constructor
	 * \details Dont forget to add layers!
	 */
	MLP(ParameterCollection & model) {
		SIAMESE_LAYERS = 0;
		UNION_LAYERS = 0;
	}
	/**
	 * \brief Returns a Multilayer perceptron
	 * \details Creates a feedforward multilayer perceptron based on a list of layer descriptions
	 *
	 * \param model ParameterCollection to contain parameters
	 * \param layers Layers description
	 */
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

	/**
	 * \brief Append a layer at the end of the network
	 * \details [long description]
	 *
	 * \param model [description]
	 * \param layer [description]
	 */
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

	/**
	 * \brief Run the MLP on an input vector/batch
	 *
	 * \param x Input expression (vector or batch)
	 * \param cg Computation graph
	 *
	 * \return [description]
	 */
	Expression single_siamese_run(Expression x,
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

	Expression union_run(Expression x,
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

	// Expression expressions_fusion(Expression a, Expression b, ComputationGraph& cg) {
	// 	float *p_a = a.value().v;
	// 	float *p_b = b.value().v;
	// 	vector<float> fusion = vector<float> (p_a, p_a+a.dim().size());
	// 	fusion.insert(fusion.end(), p_b, p_b + b.dim().size());

	// 	return input(cg, {800}, fusion);
	// }

	/**
	 * \brief Return the negative log likelihood for the (batched) pair (x,y)
	 * \details For a batched input \f$\{x_i\}_{i=1,\dots,N}\f$, \f$\{y_i\}_{i=1,\dots,N}\f$, this computes \f$\sum_{i=1}^N \log(P(y_i\vert x_i))\f$ where \f$P(\textbf{y}\vert x_i)\f$ is modelled with $\mathrm{softmax}(MLP(x_i))$
	 *
	 * \param x Input batch
	 * \param labels Output labels
	 * \param cg Computation graph
	 * \return Expression for the negative log likelihood on the batch
	 */
	Expression get_nll(Expression x1, Expression x2,Expression labels,ComputationGraph& cg) {
		// compute output
		Expression y1 = single_siamese_run(x1, cg);
		Expression y2 = single_siamese_run(x2, cg);
		Expression y_mix = concatenate({y1,y2});
		Expression y = union_run(y_mix,cg);
		// Do softmax
		//Expression losses = pickneglogsoftmax(y, labels);
		Expression losses = binary_log_loss(y, labels);
		// Sum across batches
		return sum_batches(losses);
	}

	/**
	 * \brief Predict the most probable label
	 * \details Returns the argmax of the softmax of the networks output
	 *
	 * \param x Input
	 * \param cg Computation graph
	 *
	 * \return Label index
	 */
	int predict(Expression x1, Expression x2,
							ComputationGraph& cg) {
		// run MLP to get class distribution
		Expression y1 = single_siamese_run(x1, cg);
		Expression y2 = single_siamese_run(x2, cg);
		Expression y_mix = concatenate({y1,y2});
		Expression y = union_run(y_mix,cg);
		// Get values
		vector<float> probs = as_vector(cg.forward(y));
		// Get argmax
		// unsigned argmax = 0;
		// for (unsigned i = 1; i < probs.size(); ++i) {
		// 	if (probs[i] > probs[argmax])
		// 		argmax = i;
		// }
		return probs[0] >= 0.5f;
	}

	/**
	 * \brief Enable dropout
	 * \details This is supposed to be used during training or during testing if you want to sample outputs using montecarlo
	 */
	void enable_dropout() {
		dropout_active = true;
	}

	/**
	 * \brief Disable dropout
	 * \details Do this during testing if you want a deterministic network
	 */
	void disable_dropout() {
		dropout_active = false;
	}

	/**
	 * \brief Check wether dropout is enabled or not
	 *
	 * \return Dropout state
	 */
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
