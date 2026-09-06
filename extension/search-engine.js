/**
 * search-engine.js
 * -----------------------------------------------------------------------
 * This IS the search engine. It loads the static index built by
 * indexer/build-index.js and ranks documents with BM25 — the same core
 * ranking function used inside Elasticsearch/Lucene. Everything runs
 * client-side: no server, no API key, no external search service.
 *
 * Used identically by docs/index.html (the website) and
 * extension/popup.js (the Chrome extension popup).
 * -----------------------------------------------------------------------
 */

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

/**
 * SearchEngine wraps a loaded index and answers ranked queries.
 * BM25 params k1/b are the standard defaults used by most search systems.
 */
class SearchEngine {
  constructor(index, { k1 = 1.5, b = 0.75 } = {}) {
    this.index = index;
    this.k1 = k1;
    this.b = b;
    this.docCount = index.docCount;
    this.avgDocLength = index.avgDocLength || 1;
  }

  static async loadFromUrl(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load index at ${url} (${res.status})`);
    const index = await res.json();
    return new SearchEngine(index);
  }

  idf(term) {
    const postings = this.index.postings[term];
    const df = postings ? Object.keys(postings).length : 0;
    // BM25's smoothed IDF — stays positive even for very common terms.
    return Math.log((this.docCount - df + 0.5) / (df + 0.5) + 1);
  }

  search(query, { limit = 10 } = {}) {
    const terms = [...new Set(tokenize(query))];
    if (terms.length === 0) return [];

    const scores = new Map(); // docId -> score

    for (const term of terms) {
      const postings = this.index.postings[term];
      if (!postings) continue;
      const idf = this.idf(term);

      for (const [docIdStr, tf] of Object.entries(postings)) {
        const docId = Number(docIdStr);
        const doc = this.index.documents[docId];
        const lengthNorm = 1 - this.b + this.b * (doc.length / this.avgDocLength);
        const termScore = (idf * (tf * (this.k1 + 1))) / (tf + this.k1 * lengthNorm);
        scores.set(docId, (scores.get(docId) || 0) + termScore);
      }
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([docId, score]) => ({ ...this.index.documents[docId], score }));
  }
}

// Works both as a browser global (<script src="search-engine.js">) and,
// if you ever bundle things, as a CommonJS export.
if (typeof module !== "undefined") module.exports = { SearchEngine, tokenize };
