const { getRelevantKnowledge } = require("../services/ragService");

const { generateAIResponse } = require("../services/groqService");

const chat = async (req, res) => {
  try {
    const { message, conversation = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const question = message.trim();

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    console.log("User Question:", question);

    const relevantKnowledge = await getRelevantKnowledge(question);

    const context = relevantKnowledge.length
      ? relevantKnowledge
          .map((item) => `Retrieved knowledge ${item.id}:\n${item.text}`)
          .join("\n\n")
      : "No relevant information was found in the application knowledge.";

    const reply = await generateAIResponse({
      question,
      context,
      conversation,
    });

    console.log("AI Response:", reply);

    return res.status(200).json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("=================================");
    console.error("CHAT ERROR");
    console.error("=================================");
    console.error(error);
    console.error("Message:", error.message);
    console.error("Status:", error.status);
    console.error("=================================");

    const isRagError = error.code && error.code.startsWith("RAG_");
    return res.status(isRagError ? 503 : 500).json({
      success: false,
      message: isRagError
        ? "The knowledge base is temporarily unavailable. Please try again later."
        : error.message || "Something went wrong",
      error: error.error || null,
    });
  }
};

module.exports = {
  chat,
};
