# My Repo Search

A search engine you actually built: it crawls your own GitHub repos, indexes
them, and ranks results with **BM25** — the same core ranking function used
inside Elasticsearch and Lucene. No external search API, no server, no
database. Just a static JSON index and some JavaScript.

Three pieces, one shared brain (`search-engine.js`):

```
my-search-engine/
├── indexer/
│   ├── build-index.js         crawls YOUR real GitHub repos → docs/index.json
│   └── build-sample-index.js  generates fake demo data (already run for you)
├── docs/                      the website — deploy this folder to GitHub Pages
│   ├── index.html / style.css / app.js
│   ├── search-engine.js       the actual search engine (tokenizer + BM25)
│   └── index.json             the generated index (currently: sample data)
├── extension/                 the Chrome extension (bundles its own copy)
│   ├── manifest.json, popup.html/css/js
│   ├── search-engine.js
│   └── index.json
└── .github/workflows/reindex.yml   optional: auto-rebuild the index weekly
```

Right now `docs/index.json` contains **made-up sample repos** so you can see
it working immediately. Follow the steps below to point it at your real
GitHub account.

## 1. Index your real repos

```bash
cd indexer
node build-index.js YOUR_GITHUB_USERNAME
cp ../docs/index.json ../extension/index.json   # keep the extension in sync
```

This calls the public GitHub API (no login needed) to fetch your public,
non-fork repos plus their READMEs, and writes `docs/index.json`. GitHub
allows 60 unauthenticated requests/hour — fine for most profiles. If you
have many repos or hit the rate limit, generate a
[personal access token](https://github.com/settings/tokens) (no special
scopes needed for public data) and run:

```bash
GITHUB_TOKEN=ghp_yourtokenhere node build-index.js YOUR_GITHUB_USERNAME
```

## 2. Try it locally

Open `docs/index.html` directly in a browser, or serve it so `fetch()` works
reliably:

```bash
cd docs
python3 -m http.server 8000
# visit http://localhost:8000
```

Type a repo name, a topic, or a word from a README — results rank by BM25
score in real time, no page reload.

## 3. Deploy the website to GitHub Pages

1. Push this whole project to a GitHub repo.
2. In the repo, go to **Settings → Pages**.
3. Under "Build and deployment", choose **Deploy from a branch**, branch
   `main`, folder **/docs**. Save.
4. GitHub gives you a URL like `https://YOUR_USERNAME.github.io/REPO_NAME/`
   within a minute or two.

## 4. Load the Chrome extension

1. Go to `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the `extension/` folder.
4. Pin it from the puzzle-piece icon in your toolbar, click it, and search.

The extension bundles its own `index.json`, so it works offline and needs
zero permissions — but it only updates when you copy a fresh `index.json`
into `extension/` (step 1 does this for you).

## 5. (Optional) Keep the index fresh automatically

`.github/workflows/reindex.yml` rebuilds the index every Monday using
GitHub Actions' built-in token (no secrets to set up) and commits the
result. Edit the `YOUR_USERNAME` inside that file to your GitHub username.
You'll still need to manually reload the unpacked extension after a
reindex, since Chrome doesn't auto-refresh unpacked extensions.

## How the ranking actually works

- `indexer/build-index.js` tokenizes each repo's name, description, topics,
  and README into words, and builds an **inverted index**: for every word,
  which repos contain it and how many times.
- `search-engine.js` scores a query with **BM25**: rarer words count for
  more (inverse document frequency), repeated words in a doc count for more
  but with diminishing returns, and shorter/more-focused docs are favored
  over long ones for the same term frequency.
- Both the website and the extension load the same `search-engine.js` and
  the same index format, so results are identical everywhere.

## Ideas to extend it

- Index more than repos: blog posts, notes, bookmarks — anything you can
  turn into `{ title, url, text }` documents.
- Add fuzzy matching for typos (e.g. edit-distance fallback when a term has
  zero postings).
- Highlight matched terms in the description using the query tokens.
- Set the extension as a custom search-engine keyword in Chrome settings
  (Settings → Search engine → Manage search engines) pointing at the
  GitHub Pages URL with a `?q=%s` parameter, so you can search from the
  address bar.
