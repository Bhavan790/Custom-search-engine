#!/usr/bin/env node
/**
 * build-index.js
 * -----------------------------------------------------------------------
 * Crawls a GitHub user's public repos (name, description, topics, README)
 * and builds a static search index (docs/index.json) that the front-end
 * and the Chrome extension both search over with BM25 ranking.
 *
 * No server, no database, no external search API — this IS the search
 * engine. Re-run this file any time you want to refresh the index
 * (or let the GitHub Action in .github/workflows/reindex.yml do it).
 *
 * Usage:
 *   node build-index.js <github-username> [output-path]
 *   node build-index.js               # uses GITHUB_USERNAME below
 * -----------------------------------------------------------------------
 */

// ---- CONFIG: change this to your own GitHub username -------------------
const GITHUB_USERNAME = process.argv[2] || "octocat"; // <-- swap me!
const OUTPUT_PATH = process.argv[3] || "../docs/index.json";
// A personal access token raises the GitHub API rate limit from 60/hr to
// 5000/hr. Optional for small profiles, useful once you have 20+ repos.
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
// -------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");

const STOPWORDS = new Set(
  ("a an the and or but if while is are was were be been being to of in on " +
   "for with as by at from this that it its it's you your i we our not no " +
   "do does did can could should would will just also into over under more " +
   "most such only own same so than too very s t can will don should now")
    .split(/\s+/)
);

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ") // drop urls
    .replace(/[`*_#>\[\]()!~\-]/g, " ") // strip common markdown punctuation
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

async function ghFetch(url) {
  const headers = { Accept: "application/vnd.github+json" };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} for ${url}: ${await res.text()}`);
  }
  return res.json();
}

async function fetchRepos(username) {
  const repos = [];
  let page = 1;
  while (true) {
    const batch = await ghFetch(
      `https://api.github.com/users/${username}/repos?per_page=100&page=${page}&sort=updated`
    );
    repos.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return repos.filter((r) => !r.fork); // skip forks by default
}

async function fetchReadme(owner, repo) {
  try {
    const data = await ghFetch(
      `https://api.github.com/repos/${owner}/${repo}/readme`
    );
    if (data.content && data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
  } catch (e) {
    // No README, or private, or rate-limited — that's fine, skip it.
  }
  return "";
}

async function main() {
  console.log(`Fetching public repos for "${GITHUB_USERNAME}"...`);
  const repos = await fetchRepos(GITHUB_USERNAME);
  console.log(`Found ${repos.length} non-fork repos. Fetching READMEs...`);

  const documents = [];
  const postings = {}; // term -> { docId: termFrequency }
  let totalLength = 0;

  for (let i = 0; i < repos.length; i++) {
    const r = repos[i];
    process.stdout.write(`  [${i + 1}/${repos.length}] ${r.name}\n`);
    const readme = await fetchReadme(GITHUB_USERNAME, r.name);

    const fullText = [
      r.name,
      r.name, // weight the repo name a bit higher by repeating it
      r.description || "",
      (r.topics || []).join(" "),
      r.language || "",
      readme,
    ].join("\n");

    const tokens = tokenize(fullText);
    const docId = documents.length;

    const tf = {};
    for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
    for (const [term, freq] of Object.entries(tf)) {
      if (!postings[term]) postings[term] = {};
      postings[term][docId] = freq;
    }

    documents.push({
      id: docId,
      title: r.name,
      url: r.html_url,
      description: r.description || "",
      stars: r.stargazers_count,
      language: r.language || "",
      updated: r.updated_at,
      length: tokens.length,
    });
    totalLength += tokens.length;
  }

  const index = {
    generatedAt: new Date().toISOString(),
    username: GITHUB_USERNAME,
    docCount: documents.length,
    avgDocLength: documents.length ? totalLength / documents.length : 0,
    documents,
    postings,
  };

  const outPath = path.resolve(__dirname, OUTPUT_PATH);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(index));
  console.log(
    `\nWrote index for ${documents.length} repos (${(
      fs.statSync(outPath).size / 1024
    ).toFixed(1)} KB) to ${outPath}`
  );
}

main().catch((err) => {
  console.error("Failed to build index:", err.message);
  process.exit(1);
});
