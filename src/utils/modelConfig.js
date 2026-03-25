/**
 * modelConfig.js — Multi-LLM routing configuration
 */

export const MODELS = {
  deepseek: {
    name: "DeepSeek-R1",
    provider: "deepseek",
    endpoint: "/api/deepseek",
    reasoning: true,
    costPerToken: { input: 0.00000548, output: 0.0000164 }
  },
  llama: {
    name: "Llama 3.1 (70B)",
    provider: "together",
    endpoint: "/api/llama",
    reasoning: false,
    costPerToken: { input: 0.00000088, output: 0.00000088 }
  },
  qwen: {
    name: "Qwen 2.5 (32B)",
    provider: "together",
    endpoint: "/api/qwen",
    reasoning: false,
    costPerToken: { input: 0.00000088, output: 0.00000088 }
  },
  mixtral: {
    name: "Mixtral 8x7B",
    provider: "together",
    endpoint: "/api/mixtral",
    reasoning: false,
    costPerToken: { input: 0.00000060, output: 0.00000060 }
  }
};

export function getModelConfig(modelId) {
  return MODELS[modelId] || MODELS.deepseek;
}

export function calculateCost(model, inputTokens, outputTokens) {
  const config = getModelConfig(model);
  const inputCost = (inputTokens * config.costPerToken.input);
  const outputCost = (outputTokens * config.costPerToken.output);
  const totalCost = inputCost + outputCost;
  return `USD $${totalCost.toFixed(6)}`;
}
