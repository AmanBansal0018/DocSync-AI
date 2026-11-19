const express = require("express");
const { inspectRepository } = require("../services/githubService");
const router = express.Router();
router.post("/github/changes", async (req, res) => {
  try {
    const url = req.body && req.body.url;
    if (typeof url !== "string" || !url.trim()) return res.status(400).json({ success: false, error: "Paste a GitHub repository URL first." });
    const result = await inspectRepository(url);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message || "Could not inspect this repository." });
  }
});
module.exports = router;
