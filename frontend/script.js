const $ = id => document.getElementById(id);
const oldEl = $("oldSource"), newEl = $("newSource"), docEl = $("documentation");
const sampleBtn = $("sampleBtn"); if (sampleBtn) sampleBtn.addEventListener("click", loadSample);
$("analyzeBtn").addEventListener("click", analyze);
async function loadSample() {
  $("statusMessage").textContent = "Loading sample...";
  try {
    const r = await fetch("/api/sample");
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Could not load sample");
    oldEl.value = d.oldSource; newEl.value = d.newSource;
    docEl.value = d.documentation[0].content;
    $("statusMessage").textContent = "Sample loaded. Click Analyse documentation.";
  } catch (e) { $("statusMessage").textContent = e.message; }
}
async function analyze() {
  if (!oldEl.value.trim() || !newEl.value.trim() || !docEl.value.trim()) {
    $("statusMessage").textContent = "Please fill all three input areas."; return;
  }
  const btn = $("analyzeBtn"); btn.disabled = true; btn.textContent = "Analysing...";
  $("statusMessage").textContent = "Running code and documentation analysis...";
  try {
    const r = await fetch("/api/analyze", { method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({oldSource:oldEl.value,newSource:newEl.value,documentation:[{filename:"README.md",content:docEl.value}]}) });
    const data = await r.json();
    if (!r.ok || !data.success) throw new Error(data.error || "Analysis failed");
    render(data); $("statusMessage").textContent = "Analysis completed.";
  } catch(e) { $("statusMessage").textContent = e.message; }
  finally { btn.disabled = false; btn.textContent = "✦ Analyse documentation"; }
}
function render(data) {
  $("changeCount").textContent = data.summary.totalChanges;
  $("issueCount").textContent = data.summary.issuesFound;
  $("reviewCount").textContent = data.summary.needsReview;
  $("resultBadge").textContent = `${data.findings.length} finding(s)`;
  if (!data.findings.length) {
    $("results").innerHTML = '<div class="empty"><b>No mapped documentation mismatch detected.</b><p>This does not prove that every document is complete or correct.</p></div>'; return;
  }
  $("results").innerHTML = data.findings.map((f,i)=>`<article class="finding">
    <div class="finding-top"><h3>${esc(f.type.replaceAll("_"," "))}</h3><span class="tag ${esc(f.status)}">${esc(f.status.replaceAll("_"," ").toUpperCase())}</span></div>
    <div class="meta">${esc(f.filename)} · Line ${f.line} · ${esc(f.symbol||"")}</div>
    <p>${esc(f.explanation)}</p>
    <div class="evidence"><b>Documentation:</b><br>${esc(f.oldSentence)}<br><br><b>Old code:</b> ${esc(f.oldEvidence||"Not available")}<br><b>Updated code:</b> ${esc(f.newEvidence||"Not available")}</div>
    ${f.suggestedSentence?`<div class="suggestion"><b>Suggested correction</b><br><span>${esc(f.suggestedSentence)}</span><br><button class="copy" data-copy="${encodeURIComponent(f.suggestedSentence)}">Copy correction</button></div>`:""}
  </article>`).join("");
  document.querySelectorAll("[data-copy]").forEach(b=>b.addEventListener("click",async()=>{
    try { await navigator.clipboard.writeText(decodeURIComponent(b.dataset.copy)); b.textContent="Copied!"; }
    catch { b.textContent="Clipboard unavailable"; }
  }));
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
loadSample();

// GitHub repository change tracking (public repositories; no token is sent by the browser).
$("githubBtn").addEventListener("click", () => checkGithubRepository());
let lastGithubSha = null;
let githubPollTimer = null;
async function checkGithubRepository(options = {}) {
  const silent = Boolean(options.silent);
  const url = $("githubUrl").value.trim();
  if (!url) { $("githubStatus").textContent = "Paste a GitHub repository URL first."; return; }
  const btn = $("githubBtn");
  if (!silent) { btn.disabled = true; btn.textContent = "Checking..."; $("githubStatus").textContent = "Contacting GitHub and comparing the latest commit..."; $("githubResults").innerHTML = ""; }
  try {
    const response = await fetch("/api/github/changes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || "Could not inspect repository.");
    if (silent && data.latestCommit && data.latestCommit.sha === lastGithubSha) return;
    const detectedNewCommit = silent && lastGithubSha && data.latestCommit && data.latestCommit.sha !== lastGithubSha;
    lastGithubSha = data.latestCommit ? data.latestCommit.sha : null;
    renderGithubResults(data);
    if (silent) {
      $("githubStatus").textContent = detectedNewCommit ? `New commit detected: ${data.latestCommit.shortSha}. Review the changed files below; click Check for changes to load it into the analysis workspace.` : `Watching ${data.repository}. No earlier commit was recorded; latest commit is ${data.latestCommit.shortSha}.`;
      return;
    }
    if (data.oldSource && data.newSource && data.documentation) {
      oldEl.value = data.oldSource; newEl.value = data.newSource; docEl.value = data.documentation;
      $("githubStatus").textContent = `Loaded ${data.selectedCodeFile} and README documentation into the analysis workspace. Automatic checks run every 60 seconds while this page stays open.`;
      await analyze();
    } else {
      $("githubStatus").textContent = (data.note || "Repository changes loaded. No supported changed source file and README pair was available for automatic analysis; inspect the file list and diffs below.") + " Automatic checks run every 60 seconds while this page stays open.";
    }
    if (githubPollTimer) clearInterval(githubPollTimer);
    githubPollTimer = setInterval(() => checkGithubRepository({ silent: true }), 60000);
  } catch (error) { if (!silent) $("githubStatus").textContent = error.message; }
  finally { if (!silent) { btn.disabled = false; btn.textContent = "↻ Check for changes"; } }
}
function renderGithubResults(data) {
  const commit = data.latestCommit || {};
  const date = commit.date ? new Date(commit.date).toLocaleString() : "Date unavailable";
  const files = data.files || [];
  const fileHtml = files.length ? files.map(file => `<article class="github-file">
    <div class="github-file-head"><b class="github-file-name">${esc(file.filename)}</b><span class="file-status ${esc(file.status)}">${esc(file.status)}</span></div>
    <small>+${Number(file.additions)||0} additions · −${Number(file.deletions)||0} deletions · ${Number(file.changes)||0} changes</small>
    <details><summary>View GitHub diff</summary><pre>${esc(file.patch || "No patch available for this file.")}</pre></details>
  </article>`).join("") : '<div class="empty">No file changes were reported for the latest commit.</div>';
  $("githubResults").innerHTML = `<div class="github-summary"><strong>${esc(data.repository)} / ${esc(data.branch)}</strong>
    <p><b>Latest commit:</b> ${esc(commit.shortSha || "—")} · ${esc(commit.author || "Unknown author")} · ${esc(date)}<br>${esc(commit.message || "No commit message")}</p>
    ${data.compareUrl ? `<a class="github-link" href="${esc(data.compareUrl)}" target="_blank" rel="noopener noreferrer">Open full comparison on GitHub ↗</a>` : ""}
    <p>${files.length} changed file(s) in the latest commit.</p></div><div class="github-files"><b>Changed files</b>${fileHtml}</div>`;
}
