function splitIntoSentences(markdown) {
  const result = [];
  markdown.split(/\r?\n/).forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("```")) return;
    result.push({ text: trimmed, line: i + 1 });
  });
  return result;
}
module.exports = { splitIntoSentences };
