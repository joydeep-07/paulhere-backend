require("dotenv").config({ quiet: true });

const express = require("express");
const cors = require("cors");

const chatRoutes = require("./routes/chatRoutes");
const authRoutes = require("./routes/authRoutes"); // Added Auth Routes

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://paulhere.netlify.app"],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.use(express.json());

// Routes
app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes); // Wired up Auth Routes

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
