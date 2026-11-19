# DocSync AI

DocSync AI compares source-code changes with project documentation and highlights likely documentation drift.

## Features
- Manual comparison of previous code, updated code, and Markdown documentation.
- Public GitHub repository inspection: paste a repository URL to compare its latest commit with its first parent.
- Changed-file list with additions/deletions and GitHub patch excerpts.
- When a supported source file and README are available, the app loads them into the existing documentation analysis workflow automatically.
- Direct link to the full commit comparison on GitHub.

## Setup
1. Install Node.js 18 or newer.
2. Extract this folder and open `DocSync-AI` in VS Code.
3. Open the VS Code terminal in this folder and run `npm install`.
4. Run `npm run dev` (or `npm start`).
5. Open http://localhost:3000.

Click **Load sample project** to try the original manual workflow, or paste a public GitHub repository URL in **Track changes from a GitHub repository**.

## GitHub integration notes
- The current integration supports **public GitHub repositories** and does not require a token.
- It checks the latest commit on the repository's default branch, or on the branch specified in a URL such as `https://github.com/owner/repository/tree/main`.
- It compares that commit with its first parent. While the page stays open after a repository check, it polls GitHub every 60 seconds and reports a newly detected commit. Click **Check for changes** to load the latest source and documentation into the analysis workspace. This is browser-based polling, not a server-side webhook; checks stop when the page is closed.
- GitHub's unauthenticated API has rate limits. Private repositories are not supported in this version.
- Automatic code analysis currently selects the first changed supported source file and the README. The underlying analyzer is an MVP that detects a limited set of simple JavaScript function renames and literal variable changes; it is not a full parser and does not support every language or indirect documentation description. Review all findings and diffs.

## Security
- Do not commit `.env`, access tokens, passwords, or other credentials. `.env` is ignored by Git.
- The GitHub URL is validated on the server and only `github.com` repository URLs are accepted.
- Keep credentials out of uploaded files. Review changes before applying documentation edits.
