(async function () {
  const headline = document.getElementById("headline");
  const avatarBadge = document.getElementById("avatar-badge");
  const input = document.getElementById("query");
  const results = document.getElementById("results");
  const subhead = document.getElementById("subhead");

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const LANG_COLORS = {
    JavaScript: "#f1c40f", TypeScript: "#4f8ef0", Python: "#4fc3a1",
    Rust: "#e0895f", Go: "#38bdd6", Java: "#c48a3f", "C++": "#e0648f",
    C: "#9aa0b0", HTML: "#e0704a", CSS: "#9b8bf4", Ruby: "#e0616f",
    Shell: "#6fbf6f", Jupyter: "#e08a3f",
  };
  const DEFAULT_LANG_COLOR = "#7a8094";

  let engine;
  try {
    engine = await SearchEngine.loadFromUrl(chrome.runtime.getURL("index.json"));
  } catch (err) {
    subhead.textContent = "Couldn't load index.json.";
    return;
  }

  const docs = engine.index.documents;
  const username = engine.index.username;
  const isSample = username.startsWith("YOUR_USERNAME");

  headline.textContent = isSample ? "Repo Search" : `${username}'s repos`;
  avatarBadge.textContent = isSample ? "?" : username.charAt(0).toUpperCase();
  subhead.textContent = `${docs.length} ${docs.length === 1 ? "repo" : "repos"} indexed`;

  renderDefaultView();

  input.addEventListener("input", () => {
    const query = input.value.trim();
    if (!query) {
      renderDefaultView();
      return;
    }
    renderResults(engine.search(query, { limit: 10 }), query);
  });

  function renderDefaultView() {
    renderResults(docs.slice(0, 10));
  }

  function renderResults(hits, query) {
    if (hits.length === 0) {
      results.innerHTML = `<p class="empty-state">No repos matched &ldquo;${escapeHtml(query)}&rdquo;.</p>`;
      return;
    }
    results.innerHTML = hits
      .map((doc, i) => {
        const rank = String(i + 1).padStart(2, "0");
        const delay = prefersReducedMotion ? 0 : Math.min(i, 8) * 0.05;
        return `
          <article class="result" style="animation-delay:${delay}s">
            <span class="result-rank">${rank}</span>
            <div class="result-body">
              <h2 class="result-title" style="margin:0;">
                <a href="${escapeAttr(doc.url)}" target="_blank" rel="noopener">${escapeHtml(doc.title)}</a>
              </h2>
              ${doc.description ? `<p class="result-description">${escapeHtml(doc.description)}</p>` : ""}
              <p class="result-meta">${formatMeta(doc)}</p>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function formatMeta(doc) {
    const items = [];
    if (doc.language) {
      const color = LANG_COLORS[doc.language] || DEFAULT_LANG_COLOR;
      items.push(
        `<span class="meta-item"><span class="lang-dot" style="background:${color}"></span>${escapeHtml(doc.language)}</span>`
      );
    }
    if (typeof doc.stars === "number") {
      items.push(`<span class="meta-item">${doc.stars} stars</span>`);
    }
    return items.join("");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, "&quot;");
  }
})();
