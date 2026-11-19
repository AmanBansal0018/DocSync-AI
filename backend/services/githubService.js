const API = "https://api.github.com";

function parseRepositoryUrl(input) {
  let url;
  try { url = new URL(String(input || "").trim()); } catch { throw new Error("Enter a valid GitHub repository URL."); }
  if (url.protocol !== "https:" || !["github.com", "www.github.com"].includes(url.hostname.toLowerCase()))
    throw new Error("Only public github.com repository URLs are supported.");
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("Use a repository URL such as https://github.com/owner/repository.");
  const owner = parts[0], repo = parts[1].replace(/\.git$/i, "");
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) throw new Error("The repository URL is not valid.");
  return { owner, repo, branch: parts[2] === "tree" && parts[3] ? parts[3] : null };
}

async function githubJson(path) {
  const response = await fetch(`${API}${path}`, { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "DocSync-AI" } });
  if (!response.ok) {
    if (response.status === 404) throw new Error("Repository or branch not found. Check that it is public and the URL is correct.");
    if (response.status === 403) throw new Error("GitHub API rate limit reached. Please try again later.");
    throw new Error(`GitHub returned ${response.status}. Please try again.`);
  }
  return response.json();
}

async function rawFile(owner, repo, sha, path) {
  const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(sha)}/${path.split("/").map(encodeURIComponent).join("/")}`;
  const response = await fetch(url, { headers: { "User-Agent": "DocSync-AI" } });
  if (!response.ok) return "";
  const text = await response.text();
  return text.length > 500000 ? text.slice(0, 500000) : text;
}

async function inspectRepository(input) {
  const { owner, repo, branch } = parseRepositoryUrl(input);
  const repoInfo = await githubJson(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  const branchName = branch || repoInfo.default_branch;
  const commits = await githubJson(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?sha=${encodeURIComponent(branchName)}&per_page=2`);
  if (!commits.length) throw new Error("No commits were found in this repository branch.");
  const latest = commits[0];
  const parentSha = latest.parents && latest.parents[0] && latest.parents[0].sha;
  if (!parentSha) return { repository: `${owner}/${repo}`, branch: branchName, latestCommit: commitInfo(latest), previousCommit: null, files: [], oldSource: "", newSource: "", documentation: "", note: "This is the first commit on this branch, so there is no earlier version to compare." };
  const comparison = await githubJson(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/compare/${parentSha}...${latest.sha}`);
  const files = (comparison.files || []).map(file => ({ filename: file.filename, status: file.status, additions: file.additions, deletions: file.deletions, changes: file.changes, patch: file.patch || "Patch unavailable (binary, large, or truncated file)." }));
  const codeFile = files.find(f => f.status !== "removed" && /\.(js|jsx|ts|tsx|mjs|cjs|py|java|cpp|c|cs|go|rb|php|swift|kt)$/i.test(f.filename));
  let oldSource = "", newSource = "";
  if (codeFile) [oldSource, newSource] = await Promise.all([
    rawFile(owner, repo, parentSha, codeFile.filename), rawFile(owner, repo, latest.sha, codeFile.filename)
  ]);
  const readme = files.find(f => /^readme(?:\.[^/]+)?$/i.test(f.filename) && f.status !== "removed");
  let documentation = "";
  if (readme) documentation = await rawFile(owner, repo, latest.sha, readme.filename);
  if (!documentation) documentation = await rawFile(owner, repo, latest.sha, "README.md");
  return {
    repository: `${owner}/${repo}`, branch: branchName,
    latestCommit: commitInfo(latest), previousCommit: { sha: parentSha },
    files, selectedCodeFile: codeFile ? codeFile.filename : null,
    oldSource, newSource, documentation,
    compareUrl: `https://github.com/${owner}/${repo}/compare/${parentSha}...${latest.sha}`,
    note: codeFile && (!oldSource || !newSource) ? "A changed code file was found, but GitHub could not provide its full contents. Review the file diff below." : null
  };
}
function commitInfo(commit) {
  return { sha: commit.sha, shortSha: commit.sha.slice(0, 7), message: commit.commit.message, author: (commit.author && commit.author.login) || commit.commit.author.name, date: commit.commit.author.date, url: commit.html_url };
}
module.exports = { inspectRepository, parseRepositoryUrl };
