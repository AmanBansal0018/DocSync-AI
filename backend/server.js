const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const analysisRouter = require("./routes/analysis");
const githubRouter = require("./routes/github");
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.get("/api/health", (_req, res) => res.json({ success: true, message: "DocSync AI is running" }));
app.get("/api/sample", (_req, res) => res.json({
  oldSource: `function createUser(name, email) {
  return { name, email };
}

const timeout = 30;`,
  newSource: `function registerUser(name, email) {
  return { name, email };
}

const timeout = 60;`,
  documentation: [{ filename: "README.md", content: `# User Management

Use createUser(name, email) to create a new user account.

The default timeout is 30 seconds.` }]
}));
app.use("/api", analysisRouter);
app.use("/api", githubRouter);
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "..", "frontend", "index.html")));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`DocSync AI running at http://localhost:${port}`));
