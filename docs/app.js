(async function () {
  const headline = document.getElementById("headline");
  const avatarBadge = document.getElementById("avatar-badge");
  const input = document.getElementById("query");
  const results = document.getElementById("results");
  const form = document.getElementById("search-form");
  const statNumber = document.getElementById("stat-number");
  const miniBars = document.getElementById("mini-bars");
  const railButtons = document.querySelectorAll(".rail-btn");

  const LANG_COLORS = {
    JavaScript: "#f1c40f",
    TypeScript: "#4f8ef0",
    Python: "#3fa7a1",
    Rust: "#e0895f",
    Go: "#38bdd6",
    Java: "#c48a3f",
    "C++": "#e0648f",
    C: "#8b8f9c",
    HTML: "#e0704a",
    CSS: "#8a6fd8",
    Ruby: "#c0495a",
    Shell: "#6fbf6f",
    Jupyter: "#e08a3f",
  };
  const DEFAULT_LANG_COLOR = "#a7abb8";
  const BAR_PALETTE = ["#6a5bd6", "#4f8ef0", "#3fa7a1", "#e0895f"];

  let engine;
  try {
    engine = await SearchEngine.loadFromUrl("index.json");
  } catch (err) {
    results.innerHTML = `<p class="empty-state">Couldn't load index.json — build it first with the indexer script.</p>`;
    return;
  }

  const docs = engine.index.documents;
  const username = engine.index.username;
  const isSample = username.startsWith("YOUR_USERNAME");

  headline.textContent = isSample ? "Search your GitHub" : `Search ${username}'s GitHub`;
  avatarBadge.textContent = isSample ? "?" : username.charAt(0).toUpperCase();
  statNumber.textContent = docs.length;
  renderMiniBars();

  let activeFilter = "all";
  renderDefaultView();

  railButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      railButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      input.value = "";
      renderDefaultView();
    });
  });

  form.addEventListener("submit", (e) => e.preventDefault());
  input.addEventListener("input", () => {
    const query = input.value.trim();
    if (!query) {
      renderDefaultView();
      return;
    }
    renderResults(engine.search(query, { limit: 15 }), { mode: "search", query });
  });

  function renderMiniBars() {
    const counts = {};
    for (const d of docs) {
      const lang = d.language || "Other";
      counts[lang] = (counts[lang] || 0) + 1;
    }
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const max = top.length ? top[0][1] : 1;

    miniBars.innerHTML = top
      .map(([lang, count], i) => {
        const heightPct = Math.max(18, Math.round((count / max) * 100));
        const color = BAR_PALETTE[i % BAR_PALETTE.length];
        return `
          <div class="mini-bar-col">
            <div class="mini-bar" style="height:${heightPct}%; background:${color};" title="${escapeAttr(lang)}: ${count}"></div>
            <div class="mini-bar-label">${escapeHtml(lang)}</div>
          </div>`;
      })
      .join("");
  }

  function renderDefaultView() {
    let list = docs.slice();
    if (activeFilter === "starred") {
      list.sort((a, b) => (b.stars || 0) - (a.stars || 0));
    } else if (activeFilter === "recent") {
      list.sort((a, b) => new Date(b.updated || 0) - new Date(a.updated || 0));
    } else if (activeFilter === "shuffle") {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }
    renderResults(list.slice(0, 15), { mode: "browse" });
  }

  function renderResults(hits, { mode, query } = {}) {
    if (hits.length === 0) {
      results.innerHTML = mode === "search"
        ? `<p class="empty-state">No repositories match &ldquo;${escapeHtml(query)}&rdquo;. Try a different word from a name, description, or README.</p>`
        : `<p class="empty-state">No repositories indexed yet.</p>`;
      return;
    }

    results.innerHTML = hits
      .map((doc, i) => {
        const rank = String(i + 1).padStart(2, "0");
        return `
          <article class="result">
            <span class="result-rank">${rank}</span>
            <div class="result-body">
              <h2 class="result-title"><a href="${escapeAttr(doc.url)}" target="_blank" rel="noopener">${escapeHtml(doc.title)}</a></h2>
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
    if (doc.updated) {
      items.push(`<span class="meta-item">updated ${formatDate(doc.updated)}</span>`);
    }
    return items.join("");
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short" });
    } catch {
      return iso;
    }
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
