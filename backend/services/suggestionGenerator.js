function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
}
function generateSuggestions(findings) {
  return findings.map(f => {
    let suggestedSentence = null;
    if (f.status === "outdated" && f.type === "function_renamed")
      suggestedSentence = f.oldSentence.replace(new RegExp(`\\\\b${escapeRegExp(f.change.oldName)}\\\\b`, "g"), f.change.newName);
    if (f.status === "outdated" && f.type === "configuration_changed")
      suggestedSentence = f.oldSentence.replace(new RegExp(`\\\\b${escapeRegExp(f.change.oldValue)}\\\\b`, "g"), String(f.change.newValue));
    return { ...f, suggestedSentence };
  });
}
module.exports = { generateSuggestions };
