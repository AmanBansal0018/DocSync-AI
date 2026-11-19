const test = require("node:test");
const assert = require("node:assert/strict");
const { parseRepositoryUrl } = require("../backend/services/githubService");

test("parses a standard GitHub repository URL", () => {
  assert.deepEqual(parseRepositoryUrl("https://github.com/octocat/Hello-World"), {
    owner: "octocat", repo: "Hello-World", branch: null
  });
});

test("parses a repository branch URL", () => {
  assert.deepEqual(parseRepositoryUrl("https://github.com/octocat/Hello-World/tree/main"), {
    owner: "octocat", repo: "Hello-World", branch: "main"
  });
});

test("rejects non-GitHub hosts", () => {
  assert.throws(() => parseRepositoryUrl("https://example.com/octocat/repo"), /Only public github.com/);
});

test("rejects incomplete repository URLs", () => {
  assert.throws(() => parseRepositoryUrl("https://github.com/octocat"), /repository URL/);
});
