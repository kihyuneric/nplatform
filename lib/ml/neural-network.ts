// ─────────────────────────────────────────────────────────
//  Multi-Layer Perceptron – Pure TypeScript Neural Network
//  Zero external dependencies. Supports forward/backward pass.
// ─────────────────────────────────────────────────────────

export type ActivationFn = 'relu' | 'sigmoid' | 'softmax' | 'linear'

/** Single dense layer: weights (out x in), biases (out) */
export interface LayerConfig {
  inputSize: number
  outputSize: number
  activation: ActivationFn
}

interface LayerState {
  weights: number[][]   // [outputSize][inputSize]
  biases: number[]      // [outputSize]
  activation: ActivationFn
  // Cache for backprop
  z: number[]           // pre-activation
  a: number[]           // post-activation
  input: number[]       // input to this layer
}

// ── Activation Functions ──────────────────────────────────

function relu(x: number): number { return Math.max(0, x) }
function reluDeriv(x: number): number { return x > 0 ? 1 : 0 }
function sigmoid(x: number): number { return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))) }
function sigmoidDeriv(a: number): number { return a * (1 - a) }

function applySoftmax(arr: number[]): number[] {
  const max = Math.max(...arr)
  const exps = arr.map(v => Math.exp(v - max))
  const sum = exps.reduce((s, e) => s + e, 0)
  return exps.map(e => e / sum)
}

function activate(z: number[], fn: ActivationFn): number[] {
  switch (fn) {
    case 'relu': return z.map(relu)
    case 'sigmoid': return z.map(sigmoid)
    case 'softmax': return applySoftmax(z)
    case 'linear': return [...z]
  }
}

// ── Xavier Weight Initialization ──────────────────────────

function xavierInit(fanIn: number, fanOut: number): number {
  // Gaussian approximation via Box-Muller
  const u1 = Math.random() || 1e-10
  const u2 = Math.random()
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  const std = Math.sqrt(2 / (fanIn + fanOut))
  return normal * std
}

// ── Neural Network Class ──────────────────────────────────

export class NeuralNetwork {
  private layers: LayerState[] = []

  constructor(configs: LayerConfig[]) {
    for (const cfg of configs) {
      const weights: number[][] = []
      for (let o = 0; o < cfg.outputSize; o++) {
        const row: number[] = []
        for (let i = 0; i < cfg.inputSize; i++) {
          row.push(xavierInit(cfg.inputSize, cfg.outputSize))
        }
        weights.push(row)
      }
      this.layers.push({
        weights,
        biases: new Array(cfg.outputSize).fill(0),
        activation: cfg.activation,
        z: [], a: [], input: [],
      })
    }
  }

  /** Forward pass: input vector -> output vector */
  forward(input: number[]): number[] {
    let current = input
    for (const layer of this.layers) {
      layer.input = current
      const z: number[] = []
      for (let o = 0; o < layer.weights.length; o++) {
        let sum = layer.biases[o]
        for (let i = 0; i < current.length; i++) {
          sum += layer.weights[o][i] * current[i]
        }
        z.push(sum)
      }
      layer.z = z
      layer.a = activate(z, layer.activation)
      current = layer.a
    }
    return current
  }

  /** Backpropagation with SGD. Returns average loss. */
  train(inputs: number[][], targets: number[][], lr: number = 0.01, epochs: number = 1): number {
    let totalLoss = 0
    for (let ep = 0; ep < epochs; ep++) {
      let epochLoss = 0
      for (let s = 0; s < inputs.length; s++) {
        const output = this.forward(inputs[s])

        // MSE loss
        let loss = 0
        let delta: number[] = output.map((o, i) => {
          const err = o - targets[s][i]
          loss += err * err
          return err
        })
        epochLoss += loss / output.length

        // Backward pass through layers
        for (let l = this.layers.length - 1; l >= 0; l--) {
          const layer = this.layers[l]
          const gradA: number[] = new Array(delta.length)

          // Activation derivative
          if (layer.activation === 'relu') {
            for (let j = 0; j < delta.length; j++) gradA[j] = delta[j] * reluDeriv(layer.z[j])
          } else if (layer.activation === 'sigmoid') {
            for (let j = 0; j < delta.length; j++) gradA[j] = delta[j] * sigmoidDeriv(layer.a[j])
          } else {
            // softmax/linear: use delta directly (cross-entropy shortcut for softmax)
            for (let j = 0; j < delta.length; j++) gradA[j] = delta[j]
          }

          // Compute delta for previous layer
          const prevDelta = new Array(layer.input.length).fill(0)
          for (let o = 0; o < layer.weights.length; o++) {
            for (let i = 0; i < layer.input.length; i++) {
              prevDelta[i] += layer.weights[o][i] * gradA[o]
            }
          }

          // Update weights and biases
          for (let o = 0; o < layer.weights.length; o++) {
            for (let i = 0; i < layer.input.length; i++) {
              layer.weights[o][i] -= lr * gradA[o] * layer.input[i]
            }
            layer.biases[o] -= lr * gradA[o]
          }

          delta = prevDelta
        }
      }
      totalLoss = epochLoss / inputs.length
    }
    return totalLoss
  }

  /** Serialize network to JSON-compatible object */
  serialize(): { layers: Array<{ weights: number[][]; biases: number[]; activation: ActivationFn }> } {
    return {
      layers: this.layers.map(l => ({
        weights: l.weights.map(row => [...row]),
        biases: [...l.biases],
        activation: l.activation,
      })),
    }
  }

  /** Load weights from serialized data */
  static deserialize(data: ReturnType<NeuralNetwork['serialize']>): NeuralNetwork {
    const configs: LayerConfig[] = data.layers.map(l => ({
      inputSize: l.weights[0].length,
      outputSize: l.weights.length,
      activation: l.activation,
    }))
    const nn = new NeuralNetwork(configs)
    for (let i = 0; i < data.layers.length; i++) {
      nn.layers[i].weights = data.layers[i].weights.map(row => [...row])
      nn.layers[i].biases = [...data.layers[i].biases]
    }
    return nn
  }

  /** Get layer count */
  get layerCount(): number { return this.layers.length }

  /** Get total parameter count */
  get paramCount(): number {
    return this.layers.reduce((s, l) =>
      s + l.weights.length * l.weights[0].length + l.biases.length, 0)
  }
}
