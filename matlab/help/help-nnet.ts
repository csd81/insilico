// Help entries for the Deep Learning Toolbox, extracted from nnet.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

export const HELP_NNET: Record<string, HelpEntry | string> = {
    trainNetwork: {
      summary: 'Train deep learning neural network',
      syntax: [
        'net = trainNetwork(X,Y,layers,options)',
        'net = trainNetwork(imds,layers,options)',
      ],
      description: [
        'net = trainNetwork(X,Y,layers,options) trains a network defined by layers on data X with labels Y.',
        'X is [features × N] (or [N × features]), Y is [classes × N] (one-hot) for classification or [outputs × N] for regression.',
        'Supports FC layers, ReLU/sigmoid/tanh/GELU/leaky-ReLU, batch normalisation, dropout. Uses Adam by default.',
        'Returns a trained SeriesNetwork object. Use predict(net,X) or classify(net,X) for inference.',
      ],
      seealso: ['trainingOptions', 'predict', 'classify', 'fullyConnectedLayer', 'reluLayer'],
    },
    trainingOptions: {
      summary: 'Options for training deep learning neural network',
      syntax: [
        "options = trainingOptions('adam')",
        "options = trainingOptions('sgdm','MaxEpochs',20,'MiniBatchSize',64)",
        "options = trainingOptions('rmsprop','InitialLearnRate',1e-3,'Verbose',false)",
      ],
      description: [
        "options = trainingOptions(solver,Name,Value) creates a training options object.",
        'Solver: "adam" (default), "sgdm", "rmsprop".',
        'Key options: MaxEpochs (30), MiniBatchSize (128), InitialLearnRate (0.001), Verbose (true), Shuffle.',
      ],
      seealso: ['trainNetwork', 'dlnetwork', 'adamupdate'],
    },
    predict: {
      summary: 'Predict responses using trained deep learning network',
      syntax: ['Y = predict(net,X)', 'Y = predict(net,X,MiniBatchSize=n)'],
      description: [
        'Y = predict(net,X) runs the forward pass of net on X in inference mode (dropout disabled, batch-norm uses running stats).',
        'Returns raw network output (pre-softmax for classification; use classify for argmax labels).',
      ],
      seealso: ['classify', 'trainNetwork', 'activations'],
    },
    classify: {
      summary: 'Classify data using trained deep learning network',
      syntax: ['labels = classify(net,X)'],
      description: [
        'labels = classify(net,X) predicts class indices (1-based) by taking the argmax of the network output over the class dimension.',
      ],
      seealso: ['predict', 'trainNetwork', 'onehotdecode'],
    },
    fullyConnectedLayer: {
      summary: 'Fully connected layer',
      syntax: ['layer = fullyConnectedLayer(outputSize)'],
      description: [
        'layer = fullyConnectedLayer(n) creates a fully connected layer with n output neurons.',
        'Implements Z = W*X + b. Weights initialised with Xavier/Glorot uniform.',
      ],
      seealso: ['reluLayer', 'softmaxLayer', 'batchNormalizationLayer', 'trainNetwork'],
    },
    reluLayer: {
      summary: 'Rectified linear unit (ReLU) layer',
      syntax: ['layer = reluLayer'],
      description: ['layer = reluLayer creates a ReLU activation layer: f(x) = max(0,x).'],
      seealso: ['leakyReluLayer', 'geluLayer', 'sigmoidLayer', 'tanhLayer'],
    },
    sigmoidLayer: {
      summary: 'Sigmoid activation layer',
      syntax: ['layer = sigmoidLayer'],
      description: ['f(x) = 1/(1+e^{-x}).'],
      seealso: ['reluLayer', 'tanhLayer', 'softmaxLayer'],
    },
    tanhLayer: {
      summary: 'Hyperbolic tangent activation layer',
      syntax: ['layer = tanhLayer'],
      description: ['f(x) = tanh(x).'],
      seealso: ['reluLayer', 'sigmoidLayer'],
    },
    softmaxLayer: {
      summary: 'Softmax layer',
      syntax: ['layer = softmaxLayer'],
      description: ['Normalises each column to a probability distribution. Typically the penultimate layer before classificationLayer.'],
      seealso: ['classificationLayer', 'fullyConnectedLayer'],
    },
    geluLayer: {
      summary: 'Gaussian error linear unit (GELU) activation layer',
      syntax: ['layer = geluLayer'],
      description: ['f(x) = 0.5*x*(1 + tanh(sqrt(2/pi)*(x + 0.044715*x^3))). Used in transformer architectures.'],
      seealso: ['reluLayer', 'leakyReluLayer'],
    },
    leakyReluLayer: {
      summary: 'Leaky ReLU layer',
      syntax: ['layer = leakyReluLayer', 'layer = leakyReluLayer(scale)'],
      description: ['f(x) = x if x>0, scale*x otherwise (default scale=0.01).'],
      seealso: ['reluLayer', 'geluLayer'],
    },
    batchNormalizationLayer: {
      summary: 'Batch normalisation layer',
      syntax: ['layer = batchNormalizationLayer'],
      description: [
        'Normalises each feature to zero mean and unit variance over the mini-batch.',
        'Learns scale (gamma) and offset (beta) parameters. Maintains running mean/variance for inference.',
      ],
      seealso: ['reluLayer', 'dropoutLayer', 'fullyConnectedLayer'],
    },
    dropoutLayer: {
      summary: 'Dropout regularisation layer',
      syntax: ['layer = dropoutLayer', 'layer = dropoutLayer(p)'],
      description: ['layer = dropoutLayer(p) randomly sets p fraction of inputs to zero during training (default p=0.5). Inverted dropout: active units are scaled by 1/(1-p).'],
      seealso: ['batchNormalizationLayer', 'reluLayer'],
    },
    imageInputLayer: {
      summary: 'Image input layer',
      syntax: ['layer = imageInputLayer(inputSize)'],
      description: ["layer = imageInputLayer([h w c]) defines the network's image input dimensions."],
      seealso: ['featureInputLayer', 'sequenceInputLayer'],
    },
    featureInputLayer: {
      summary: 'Feature input layer',
      syntax: ['layer = featureInputLayer(numFeatures)'],
      description: ['Defines a 1-D feature vector input of length numFeatures.'],
      seealso: ['imageInputLayer', 'fullyConnectedLayer'],
    },
    classificationLayer: {
      summary: 'Classification output layer',
      syntax: ['layer = classificationLayer'],
      description: ['Computes cross-entropy loss during training. Paired with softmaxLayer.'],
      seealso: ['softmaxLayer', 'regressionLayer'],
    },
    regressionLayer: {
      summary: 'Regression output layer',
      syntax: ['layer = regressionLayer'],
      description: ['Computes half mean squared error (MSE) loss during training.'],
      seealso: ['classificationLayer', 'mse'],
    },
    lstmLayer: {
      summary: 'Long short-term memory (LSTM) layer',
      syntax: ['layer = lstmLayer(numHiddenUnits)', "layer = lstmLayer(n,'OutputMode','last')"],
      description: ['Processes sequential data with gated memory cells. Forward pass only (no backprop through time in this implementation).'],
      seealso: ['gruLayer', 'sequenceInputLayer', 'lstm'],
    },
    gruLayer: {
      summary: 'Gated recurrent unit (GRU) layer',
      syntax: ['layer = gruLayer(numHiddenUnits)'],
      description: ['Two-gate variant of LSTM. Forward pass only.'],
      seealso: ['lstmLayer', 'gru'],
    },
    convolution2dLayer: {
      summary: '2-D convolutional layer',
      syntax: ['layer = convolution2dLayer(filterSize,numFilters)', "layer = convolution2dLayer(3,8,'Padding','same')"],
      description: ['Defines a 2-D conv layer. Layer constructor only — backprop for conv not yet implemented; use with trainNetwork for FC-only networks.'],
      seealso: ['maxPooling2dLayer', 'batchNormalizationLayer', 'reluLayer'],
    },
    maxPooling2dLayer: {
      summary: '2-D max pooling layer',
      syntax: ['layer = maxPooling2dLayer(poolSize)', "layer = maxPooling2dLayer(2,'Stride',2)"],
      seealso: ['convolution2dLayer', 'averagePooling2dLayer'],
    },
    averagePooling2dLayer: {
      summary: '2-D average pooling layer',
      syntax: ['layer = averagePooling2dLayer(poolSize)'],
      seealso: ['maxPooling2dLayer', 'convolution2dLayer'],
    },
    dlnetwork: {
      summary: 'Deep learning neural network for custom training loops',
      syntax: ['net = dlnetwork(layers)', 'net = dlnetwork(lgraph)'],
      description: [
        'net = dlnetwork(layers) creates a network from a layer array for use in custom training loops.',
        'Use with adamupdate for parameter updates.',
      ],
      seealso: ['trainNetwork', 'adamupdate', 'dlarray'],
    },
    dlarray: {
      summary: 'Labelled array for deep learning',
      syntax: ["X = dlarray(data)", "X = dlarray(data,'CB')", "X = dlarray(data,'SSCB')"],
      description: [
        "X = dlarray(data,fmt) wraps data with a dimension label string for use with dlarray operations.",
        "Common formats: 'CB' (channel×batch), 'SSCB' (spatial×spatial×channel×batch).",
      ],
      seealso: ['extractdata', 'fullyconnect', 'relu'],
    },
    extractdata: {
      summary: 'Extract data from dlarray',
      syntax: ['Y = extractdata(X)'],
      description: ['Y = extractdata(X) returns the underlying numeric array from a dlarray object.'],
      seealso: ['dlarray'],
    },
    adamupdate: {
      summary: 'Update parameters using adaptive moment estimation (Adam)',
      syntax: [
        '[netUpdated,avgGrad,avgSqGrad] = adamupdate(net,grad,avgGrad,avgSqGrad,iteration)',
        '[p,m,v] = adamupdate(p,grad,m,v,t,lr)',
      ],
      description: [
        'Performs one Adam step: m = beta1*m + (1-beta1)*grad; v = beta2*v + (1-beta2)*grad^2;',
        'p = p - lr * mHat/(sqrt(vHat)+eps).  Default lr=0.001, beta1=0.9, beta2=0.999.',
      ],
      seealso: ['dlnetwork', 'trainingOptions'],
    },
    dlgradient: { summary: 'Gradients via automatic differentiation', syntax: ['[g1,…] = dlgradient(loss, x1, …)'], description: ['dlgradient(loss, x1, …) returns the gradients of the scalar dlarray loss with respect to each traced dlarray xi, by reverse-mode automatic differentiation. Build loss from dlarray inputs using the supported ops (+, -, .*, ./, *, .^, sum, mean, exp, log, sqrt, sigmoid, tanh, relu, mse). Typically called inside dlfeval.'], seealso: ['dlfeval', 'dlarray', 'adamupdate'] },
    dlfeval: { summary: 'Evaluate a function enabling automatic differentiation', syntax: ['[…] = dlfeval(fcn, x1, …)'], description: ['dlfeval(fcn, x1, …) calls fcn with automatic differentiation enabled and returns its outputs. Use it to wrap a model/loss function that calls dlgradient, e.g. [loss,grad] = dlfeval(@modelLoss, x).'], seealso: ['dlgradient', 'dlarray'] },
    fullyconnect: {
      summary: 'Sum all weighted input data and apply a bias',
      syntax: ['Y = fullyconnect(X,weights,bias)'],
      description: ['Y = fullyconnect(X,W,b) computes W*X + b. X is [inSize × batch], Y is [outSize × batch].'],
      seealso: ['relu', 'softmax', 'crossentropy'],
    },
    relu: {
      summary: 'Apply rectified linear unit activation',
      syntax: ['Y = relu(X)'],
      description: ['Y = relu(X) applies max(0,X) element-wise.'],
      seealso: ['sigmoid', 'softmax', 'leakyrelu', 'gelu'],
    },
    sigmoid: {
      summary: 'Apply sigmoid activation',
      syntax: ['Y = sigmoid(X)'],
      description: ['Y = sigmoid(X) applies 1/(1+exp(-X)) element-wise.'],
      seealso: ['relu', 'softmax', 'tanh'],
    },
    softmax: {
      summary: 'Apply softmax activation to channel dimension',
      syntax: ['Y = softmax(X)'],
      description: ['Y = softmax(X) applies column-wise softmax: exp(x_i)/sum(exp(x)).'],
      seealso: ['crossentropy', 'sigmoid', 'onehotdecode'],
    },
    crossentropy: {
      summary: 'Cross-entropy loss for classification tasks',
      syntax: ['loss = crossentropy(Y,targets)'],
      description: ['loss = crossentropy(Y,T) computes mean cross-entropy over a batch: -mean(sum(T.*log(Y),1)).'],
      seealso: ['mse', 'l2loss', 'softmax'],
    },
    mse: {
      summary: 'Half mean squared error',
      syntax: ['loss = mse(Y,targets)'],
      description: ['loss = mse(Y,T) computes 0.5*mean(||Y-T||^2) over the batch.'],
      seealso: ['crossentropy', 'l2loss'],
    },
    l2loss: {
      summary: 'L2 loss for regression tasks',
      syntax: ['loss = l2loss(Y,targets)', 'loss = l2loss(Y,targets,weights)'],
      description: ['loss = l2loss(Y,T) computes mean(||Y-T||^2) per sample.'],
      seealso: ['mse', 'crossentropy'],
    },
    lstm: {
      summary: 'Long short-term memory forward pass',
      syntax: ['Y = lstm(X,H0,C0,weights,recurrentWeights,bias)', '[Y,H,C] = lstm(___)'],
      description: [
        'lstm(X,H0,C0,W,R,b) applies the LSTM recurrence over the time dimension of X.',
        'X: [inputSize × seqLen]; W: [4H × inputSize]; R: [4H × H]; b: [4H × 1].',
        'Returns Y [H × seqLen], final hidden state H [H × 1], cell state C [H × 1].',
      ],
      seealso: ['gru', 'lstmLayer', 'fullyconnect'],
    },
    gru: {
      summary: 'Gated recurrent unit forward pass',
      syntax: ['Y = gru(X,H0,weights,recurrentWeights,bias)', '[Y,H] = gru(___)'],
      description: [
        'gru(X,H0,W,R,b) applies the GRU recurrence over the time dimension of X.',
        'X: [inputSize × seqLen]; W: [3H × inputSize]; R: [3H × H]; b: [3H × 1].',
      ],
      seealso: ['lstm', 'gruLayer'],
    },
    batchnorm: {
      summary: 'Normalize data across all observations for each channel',
      syntax: ['Y = batchnorm(X,offset,scaleFactor)'],
      description: ['Y = batchnorm(X,beta,gamma) normalises X to zero mean and unit variance then scales by gamma and shifts by beta.'],
      seealso: ['batchNormalizationLayer', 'layernorm'],
    },
    maxpool: {
      summary: 'Pool data to maximum value',
      syntax: ['Y = maxpool(X,poolsize)', '[Y,indx,inputSize] = maxpool(X,poolsize)'],
      description: ['Y = maxpool(X,[h w]) applies 2-D max pooling with the given pool size.'],
      seealso: ['maxPooling2dLayer', 'averagePooling2dLayer'],
    },
    gelu: {
      summary: 'Apply Gaussian error linear unit (GELU) activation',
      syntax: ['Y = gelu(X)'],
      description: ['Y = gelu(X) applies the GELU activation: 0.5*x*(1+tanh(sqrt(2/pi)*(x+0.044715*x^3))).'],
      seealso: ['relu', 'leakyrelu', 'geluLayer'],
    },
    leakyrelu: {
      summary: 'Apply leaky rectified linear unit activation',
      syntax: ['Y = leakyrelu(X)', 'Y = leakyrelu(X,scaleFactor)'],
      description: ['Y = leakyrelu(X,a) applies f(x)=x for x>0, f(x)=a*x for x<=0 (default a=0.01).'],
      seealso: ['relu', 'gelu', 'leakyReluLayer'],
    },
    onehotdecode: {
      summary: 'Decode probability vectors into class labels',
      syntax: ['A = onehotdecode(B,classes,featureDim)'],
      description: [
        'A = onehotdecode(B,classes,1) returns the 1-based index of the maximum probability in each column of B.',
        'classes is a string array of class names (currently ignored; returns numeric indices).',
      ],
      seealso: ['classify', 'softmax', 'crossentropy'],
    },
    layerGraph: {
      summary: 'Graph of network layers for deep learning',
      syntax: ['lgraph = layerGraph', 'lgraph = layerGraph(layers)'],
      description: ['lgraph = layerGraph(layers) creates a layer graph from a layer array, for use with trainNetwork or dlnetwork.'],
      seealso: ['dlnetwork', 'trainNetwork', 'analyzenetwork'],
    },
    analyzenetwork: {
      summary: 'Analyze deep learning network architecture',
      syntax: ['analyzenetwork(net)', 'info = analyzenetwork(net)'],
      description: ['analyzenetwork(net) returns a summary with NumLayers and TotalLearnables counts.'],
      seealso: ['trainNetwork', 'dlnetwork', 'layerGraph'],
    },
  };
