const { splitIntoSentences } = require("../utils/textUtils");
function mapDocumentation(changes, documentation) {
  const mappings = [];
  for (const change of changes) {
    const terms = [change.symbol, change.oldName, change.newName, change.name]
      .filter(Boolean).map(String);
    for (const doc of documentation) {
      for (const sentence of splitIntoSentences(doc.content)) {
        const matchedTerms = terms.filter(term => sentence.text.toLowerCase().includes(term.toLowerCase()));
        if (matchedTerms.length) mappings.push({
          change, filename: doc.filename, sentence: sentence.text,
          line: sentence.line, matchedTerms
        });
      }
    }
  }
  return mappings;
}
module.exports = { mapDocumentation };
