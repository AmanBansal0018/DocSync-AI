const express = require("express");
const { analyzeCode } = require("../services/codeAnalyzer");
const { mapDocumentation } = require("../services/docMapper");
const { detectDrift } = require("../services/driftDetector");
const { generateSuggestions } = require("../services/suggestionGenerator");
const router = express.Router();
router.post("/analyze", (req, res) => {
  const { oldSource, newSource, documentation } = req.body || {};
  if (typeof oldSource !== "string" || typeof newSource !== "string")
    return res.status(400).json({ success: false, error: "oldSource and newSource must be strings." });
  if (!Array.isArray(documentation) || !documentation.length ||
      !documentation.every(d => d && typeof d.filename === "string" && typeof d.content === "string"))
    return res.status(400).json({ success: false, error: "documentation must be an array of {filename, content}." });
  try {
    const changes = analyzeCode(oldSource, newSource);
    const mappings = mapDocumentation(changes, documentation);
    const findings = generateSuggestions(detectDrift(changes, mappings));
    res.json({ success: true, summary: {
      totalChanges: changes.length,
      issuesFound: findings.filter(f => f.status === "outdated").length,
      needsReview: findings.filter(f => f.status === "needs_review").length,
      documentationFilesChecked: documentation.length
    }, changes, findings });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Analysis failed. Check the server terminal." });
  }
});
module.exports = router;
