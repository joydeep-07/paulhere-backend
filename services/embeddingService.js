const { pipeline } = require("@huggingface/transformers");

const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";
let embeddingPipeline;

/** Loads and caches the local embedding model once per server process. */
const getEmbeddingPipeline = async () => {
  if (!embeddingPipeline) {
    const model = process.env.EMBEDDING_MODEL || DEFAULT_MODEL;
    console.log(`Loading embedding model: ${model}`);
    embeddingPipeline = pipeline("feature-extraction", model);
  }

  return embeddingPipeline;
};

const createEmbedding = async (text) => {
  if (!text || typeof text !== "string") {
    throw new Error("Text is required to create an embedding.");
  }

  const extractor = await getEmbeddingPipeline();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
};

module.exports = { createEmbedding };
