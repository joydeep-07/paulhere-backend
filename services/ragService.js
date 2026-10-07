const fs = require("fs/promises");
const path = require("path");

const { createEmbedding } = require("./embeddingService");

const INDEX_PATH = path.join(__dirname, "..", "data", "knowledge-index.json");
let cachedIndex;
let cachedMtimeMs;

const ragError = (message, code, cause) => {
  const error = new Error(message);
  error.code = code;
  error.cause = cause;
  return error;
};

const getNumberFromEnv = (name, defaultValue) => {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isInteger(value) && value > 0 ? value : defaultValue;
};

const loadIndex = async () => {
  try {
    const stats = await fs.stat(INDEX_PATH);
    if (cachedIndex && cachedMtimeMs === stats.mtimeMs) return cachedIndex;

    const index = JSON.parse(await fs.readFile(INDEX_PATH, "utf8"));
    if (!Array.isArray(index.chunks) || index.chunks.length === 0) {
      throw ragError("The knowledge index has no chunks.", "RAG_INDEX_INVALID");
    }

    cachedIndex = index;
    cachedMtimeMs = stats.mtimeMs;
    return index;
  } catch (error) {
    if (error.code === "ENOENT") {
      throw ragError("Knowledge base has not been indexed. Run `npm run ingest` first.", "RAG_INDEX_NOT_FOUND", error);
    }
    if (error.code && error.code.startsWith("RAG_")) throw error;
    throw ragError("Unable to load the knowledge index.", "RAG_INDEX_LOAD_FAILED", error);
  }
};

const cosineSimilarity = (first, second) => {
  if (!Array.isArray(first) || !Array.isArray(second) || first.length !== second.length) return -1;

  let dotProduct = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;
  for (let index = 0; index < first.length; index += 1) {
    dotProduct += first[index] * second[index];
    firstMagnitude += first[index] ** 2;
    secondMagnitude += second[index] ** 2;
  }
  if (!firstMagnitude || !secondMagnitude) return -1;
  return dotProduct / Math.sqrt(firstMagnitude * secondMagnitude);
};

/** Retrieves only the most relevant PDF chunks for one chat message. */
const getRelevantKnowledge = async (question) => {
  const index = await loadIndex();
  let questionEmbedding;
  try {
    questionEmbedding = await createEmbedding(question);
  } catch (error) {
    throw ragError("Unable to create an embedding for this question.", "RAG_EMBEDDING_FAILED", error);
  }

  const topK = getNumberFromEnv("TOP_K", 5);
  const matches = index.chunks
    .map((chunk) => ({ ...chunk, score: cosineSimilarity(questionEmbedding, chunk.embedding) }))
    .filter((chunk) => chunk.score >= 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, topK);

  console.log(`RAG retrieved ${matches.length} relevant chunk(s).`);
  return matches;
};

module.exports = { getRelevantKnowledge };
