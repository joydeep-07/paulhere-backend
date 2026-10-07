require("dotenv").config({ quiet: true });

const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { PDFParse } = require("pdf-parse");
const { createEmbedding } = require("../services/embeddingService");

const ROOT_DIRECTORY = path.join(__dirname, "..");
const PDF_PATH = path.join(ROOT_DIRECTORY, "knowledge.pdf");
const INDEX_PATH = path.join(ROOT_DIRECTORY, "data", "knowledge-index.json");

const getPositiveInteger = (name, defaultValue) => {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isInteger(value) && value > 0 ? value : defaultValue;
};

const cleanText = (text) => text.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();

const splitIntoChunks = (text, chunkSize, chunkOverlap) => {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf(". ", end), text.lastIndexOf("? ", end), text.lastIndexOf("! ", end), text.lastIndexOf(" ", end));
      if (boundary > start + Math.floor(chunkSize * 0.5)) end = boundary + 1;
    }
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= text.length) break;
    start = Math.max(end - chunkOverlap, start + 1);
  }
  return chunks;
};

const main = async () => {
  const chunkSize = getPositiveInteger("CHUNK_SIZE", 1000);
  const chunkOverlap = getPositiveInteger("CHUNK_OVERLAP", 150);
  if (chunkOverlap >= chunkSize) throw new Error("CHUNK_OVERLAP must be smaller than CHUNK_SIZE.");

  let pdfBuffer;
  try {
    pdfBuffer = await fs.readFile(PDF_PATH);
  } catch (error) {
    if (error.code === "ENOENT") throw new Error("knowledge.pdf was not found in the backend root.");
    throw error;
  }

  const parser = new PDFParse({ data: pdfBuffer });
  let textResult;
  let infoResult;
  try {
    // pdf-parse transfers the PDF buffer to its worker, so these calls must be
    // sequential rather than competing to use the same buffer.
    infoResult = await parser.getInfo();
    textResult = await parser.getText();
  } catch (error) {
    throw new Error(`Unable to parse knowledge.pdf: ${error.message}`);
  } finally {
    await parser.destroy();
  }

  const text = cleanText(textResult.text || "");
  if (!text) throw new Error("knowledge.pdf contains no usable text.");
  const rawChunks = splitIntoChunks(text, chunkSize, chunkOverlap);
  if (!rawChunks.length) throw new Error("No chunks could be created from knowledge.pdf.");

  console.log(`PDF loaded successfully (${infoResult.total || "unknown"} page(s)).`);
  console.log(`Created ${rawChunks.length} chunk(s). Generating embeddings...`);
  const chunks = [];
  for (let index = 0; index < rawChunks.length; index += 1) {
    chunks.push({ id: index + 1, text: rawChunks[index], embedding: await createEmbedding(rawChunks[index]) });
  }
  console.log(`Generated ${chunks.length} embedding(s).`);

  const index = {
    version: 1,
    createdAt: new Date().toISOString(),
    source: { file: "knowledge.pdf", sha256: crypto.createHash("sha256").update(pdfBuffer).digest("hex") },
    embeddingModel: process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2",
    chunkSize,
    chunkOverlap,
    chunks,
  };
  await fs.mkdir(path.dirname(INDEX_PATH), { recursive: true });
  const temporaryPath = `${INDEX_PATH}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(index), "utf8");
  await fs.rename(temporaryPath, INDEX_PATH);
  console.log("Knowledge index created successfully.");
};

main().catch((error) => {
  console.error(`Knowledge ingestion failed: ${error.message}`);
  process.exitCode = 1;
});
