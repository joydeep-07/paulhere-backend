const knowledge = require("../data/knowledge.json");

const getRelevantKnowledge = (question) => {
  const normalizedQuestion = question.toLowerCase();

  const words = normalizedQuestion
    .replace(/[^\w\s]/gi, "")
    .split(/\s+/)
    .filter(Boolean);

  const scoredKnowledge = knowledge.map((item) => {
    let score = 0;

    // Check topic
    if (normalizedQuestion.includes(item.topic.toLowerCase())) {
      score += 5;
    }

    // Check keywords
    item.keywords.forEach((keyword) => {
      if (words.includes(keyword.toLowerCase())) {
        score += 2;
      }
    });

    return {
      ...item,
      score,
    };
  });

  const relevantKnowledge = scoredKnowledge
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return relevantKnowledge;
};

module.exports = {
  getRelevantKnowledge,
};
