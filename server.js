require("dotenv").config({ quiet: true });

const express = require("express");
const cors = require("cors");

const chatRoutes = require("./routes/chatRoutes");

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/chat", chatRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI Chatbot Backend is running",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server Started On Port ${PORT}`);
});
