const { getRelevantKnowledge } = require("../services/knowledgeService");

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

    const relevantKnowledge = getRelevantKnowledge(question);

    console.log("Relevant Knowledge:", relevantKnowledge);

    const context = relevantKnowledge.length
      ? relevantKnowledge
          .map((item) => `Topic: ${item.topic}\nInformation: ${item.content}`)
          .join("\n\n")
      : "No relevant information was found in the application knowledge.";

    console.log("Context:", context);

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

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
      error: error.error || null,
    });
  }
};

module.exports = {
  chat,
};
