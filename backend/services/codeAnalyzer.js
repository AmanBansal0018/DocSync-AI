// MVP parser: supports simple JavaScript function declarations and literal assignments only.
function extractFunctions(source) {
  const out = [], re = /function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = re.exec(source))) out.push({
    name: m[1], params: m[2].split(",").map(x => x.trim()).filter(Boolean),
    body: m[3].replace(/\s+/g, " ").trim()
  });
  return out;
}
function extractAssignments(source) {
  const out = [], re = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]+)\s*;?/g;
  let m;
  while ((m = re.exec(source))) out.push({ name: m[1], value: m[2].trim().replace(/;$/, "") });
  return out;
}
function analyzeCode(oldSource, newSource) {
  const changes = [], oldFns = extractFunctions(oldSource), newFns = extractFunctions(newSource);
  const oldNames = new Set(oldFns.map(x => x.name)), newNames = new Set(newFns.map(x => x.name));
  for (const oldFn of oldFns) {
    if (newNames.has(oldFn.name)) continue;
    const candidates = newFns.filter(n => !oldNames.has(n.name) &&
      JSON.stringify(n.params) === JSON.stringify(oldFn.params) && n.body === oldFn.body);
    if (candidates.length === 1) changes.push({
      type: "function_renamed", symbol: oldFn.name, oldName: oldFn.name,
      newName: candidates[0].name, confidence: "high",
      evidence: "Old and new function parameters and body match; the name changed."
    });
    else changes.push({ type: "function_removed", symbol: oldFn.name, oldName: oldFn.name,
      confidence: "medium", evidence: "Function not found in updated source; review manually." });
  }
  for (const fn of newFns) if (!oldNames.has(fn.name) && !changes.some(c => c.newName === fn.name))
    changes.push({ type: "function_added", symbol: fn.name, newName: fn.name, confidence: "medium" });
  const oldVars = new Map(extractAssignments(oldSource).map(x => [x.name, x.value]));
  const newVars = new Map(extractAssignments(newSource).map(x => [x.name, x.value]));
  for (const [name, oldValue] of oldVars) {
    if (newVars.has(name) && newVars.get(name) !== oldValue)
      changes.push({ type: "configuration_changed", symbol: name, name, oldValue, newValue: newVars.get(name), confidence: "high" });
    else if (!newVars.has(name))
      changes.push({ type: "configuration_removed", symbol: name, name, oldValue, confidence: "medium" });
  }
  return changes;
}
module.exports = { analyzeCode, extractFunctions, extractAssignments };
