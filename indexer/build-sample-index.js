#!/usr/bin/env node
// Generates a small demo docs/index.json using fake repos, so the search
// engine works immediately when you open it — before you've pointed
// build-index.js at your own GitHub username.
const fs = require("fs");
const path = require("path");

const STOPWORDS = new Set(
  ("a an the and or but if while is are was were be been being to of in on " +
    "for with as by at from this that it its it's you your i we our not no " +
    "do does did can could should would will just also into over under more " +
    "most such only own same so than too very s t don now")
    .split(/\s+/)
);
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[`*_#>\[\]()!~-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

const SAMPLE_REPOS = [
  {
    name: "weather-dash",
    description: "A React Native weather dashboard with 5-day forecast and radar overlays",
    topics: ["react-native", "weather", "api"],
    language: "TypeScript",
    stars: 14,
    updated_at: "2026-05-12T00:00:00Z",
    readme: "Weather Dash pulls forecast data from a public weather API and renders a five day outlook, hourly breakdown, and animated radar map. Built with React Native and Expo.",
  },
  {
    name: "todo-cli",
    description: "A fast command-line todo list manager written in Rust",
    topics: ["rust", "cli", "productivity"],
    language: "Rust",
    stars: 41,
    updated_at: "2026-01-03T00:00:00Z",
    readme: "todo-cli is a minimal command line task manager. Add, complete, and prioritize tasks from your terminal. Stores data in a local SQLite file, no account needed.",
  },
  {
    name: "my-search-engine",
    description: "A from-scratch search engine over my own GitHub repos, using BM25 ranking",
    topics: ["search", "bm25", "github-pages", "chrome-extension"],
    language: "JavaScript",
    stars: 7,
    updated_at: "2026-09-01T00:00:00Z",
    readme: "This project builds a static inverted index of a GitHub user's repositories and ranks results with BM25, the same ranking function used by Elasticsearch and Lucene. Hosted on GitHub Pages, with a companion Chrome extension.",
  },
  {
    name: "recipe-notes",
    description: "Personal collection of recipes in Markdown, rendered as a static site",
    topics: ["cooking", "markdown", "static-site"],
    language: "HTML",
    stars: 3,
    updated_at: "2025-11-20T00:00:00Z",
    readme: "A growing collection of family recipes, written in Markdown and built into a static site with a simple table of contents.",
  },
];

const documents = [];
const postings = {};
let totalLength = 0;

SAMPLE_REPOS.forEach((r, docId) => {
  const fullText = [r.name, r.name, r.description, r.topics.join(" "), r.language, r.readme].join("\n");
  const tokens = tokenize(fullText);
  const tf = {};
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
  for (const [term, freq] of Object.entries(tf)) {
    postings[term] = postings[term] || {};
    postings[term][docId] = freq;
  }
  documents.push({
    id: docId,
    title: r.name,
    url: `https://github.com/YOUR_USERNAME/${r.name}`,
    description: r.description,
    stars: r.stars,
    language: r.language,
    updated: r.updated_at,
    length: tokens.length,
  });
  totalLength += tokens.length;
});

const index = {
  generatedAt: new Date().toISOString(),
  username: "YOUR_USERNAME (sample data — run build-index.js)",
  docCount: documents.length,
  avgDocLength: totalLength / documents.length,
  documents,
  postings,
};

const outPath = path.resolve(__dirname, "../docs/index.json");
fs.writeFileSync(outPath, JSON.stringify(index, null, 2));
console.log(`Wrote sample index with ${documents.length} docs to ${outPath}`);
