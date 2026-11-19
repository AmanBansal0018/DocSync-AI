function detectDrift(_changes, mappings) {
  const findings = [];
  for (const m of mappings) {
    const c = m.change, text = m.sentence.toLowerCase();
    let status = "needs_review", explanation = "This sentence mentions a changed code element. Please review it.";
    let oldEvidence = "", newEvidence = "";
    if (c.type === "function_renamed" && text.includes(c.oldName.toLowerCase()) && !text.includes(c.newName.toLowerCase())) {
      status = "outdated";
      explanation = `Documentation refers to ${c.oldName}, but updated code declares ${c.newName}.`;
      oldEvidence = `Old code: function ${c.oldName}()`;
      newEvidence = `New code: function ${c.newName}()`;
    } else if (c.type === "configuration_changed" &&
      text.includes(String(c.oldValue).toLowerCase()) && !text.includes(String(c.newValue).toLowerCase())) {
      status = "outdated";
      explanation = `Documentation says ${c.oldValue}; updated code assigns ${c.newValue} to ${c.name}.`;
      oldEvidence = `Old value: ${c.oldValue}`;
      newEvidence = `New value: ${c.newValue}`;
    } else if (c.type === "function_removed" || c.type === "configuration_removed") {
      explanation = "The referenced element was not found in updated code. Confirm whether the documentation should be removed or rewritten.";
      oldEvidence = `Old element: ${c.symbol}`;
      newEvidence = "No matching element detected in updated code.";
    } else if (c.type === "function_renamed" && text.includes(c.newName.toLowerCase())) {
      status = "consistent";
      explanation = "This sentence refers to the updated function name.";
    }
    if (c.type !== "function_added") findings.push({
      type: c.type, status, severity: status === "outdated" ? "high" : "medium",
      symbol: c.symbol, filename: m.filename, line: m.line,
      oldSentence: m.sentence, explanation, oldEvidence, newEvidence, change: c
    });
  }
  return findings;
}
module.exports = { detectDrift };
