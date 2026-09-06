(async function () {
  const headline = document.getElementById("headline");
  const avatarBadge = document.getElementById("avatar-badge");
  const input = document.getElementById("query");
  const results = document.getElementById("results");
  const form = document.getElementById("search-form");
  const statNumber = document.getElementById("stat-number");
  const miniBars = document.getElementById("mini-bars");
  const railButtons = Array.from(document.querySelectorAll(".rail-btn"));
  const railPill = document.getElementById("rail-pill");
  const railButtonsWrap = document.getElementById("rail-buttons");
  const hero = document.getElementById("hero");

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const LANG_COLORS = {
    JavaScript: "#f1c40f", TypeScript: "#4f8ef0", Python: "#4fc3a1",
    Rust: "#e0895f", Go: "#38bdd6", Java: "#c48a3f", "C++": "#e0648f",
    C: "#9aa0b0", HTML: "#e0704a", CSS: "#9b8bf4", Ruby: "#e0616f",
    Shell: "#6fbf6f", Jupyter: "#e08a3f",
  };
  const DEFAULT_LANG_COLOR = "#7a8094";
  const BAR_PALETTE = ["#9b8bf4", "#4f8ef0", "#4fc3a1", "#e0895f"];

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

  animateCountUp(statNumber, docs.length);
  renderMiniBars();
  setupRailPill();
  setupHeroParallax();
  setupRotatingPlaceholder();

  let activeFilter = "all";
  renderDefaultView();

  railButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      railButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      input.value = "";
      moveRailPillTo(btn);
      renderDefaultView();
    });
  });

  window.addEventListener("resize", debounce(() => {
    const active = railButtons.find((b) => b.classList.contains("active"));
    if (active) moveRailPillTo(active, false);
  }, 150));

  form.addEventListener("submit", (e) => e.preventDefault());
  input.addEventListener("input", () => {
    const query = input.value.trim();
    if (!query) {
      renderDefaultView();
      return;
    }
    renderResults(engine.search(query, { limit: 15 }), { mode: "search", query });
  });

  // ---- default browse view (no query typed) ----
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
        const delay = prefersReducedMotion ? 0 : Math.min(i, 8) * 0.05;
        return `
          <article class="result" style="animation-delay:${delay}s">
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
        `<span class="meta-item" style="color:${color}"><span class="lang-dot" style="background:${color}"></span><span style="color:var(--muted)">${escapeHtml(doc.language)}</span></span>`
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

  // ---- mini language bar chart, grows in on load ----
  function renderMiniBars() {
    const counts = {};
    for (const d of docs) {
      const lang = d.language || "Other";
      counts[lang] = (counts[lang] || 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const max = top.length ? top[0][1] : 1;

    miniBars.innerHTML = top
      .map(([lang, count], i) => {
        const color = BAR_PALETTE[i % BAR_PALETTE.length];
        return `
          <div class="mini-bar-col">
            <div class="mini-bar" data-target="${Math.max(18, Math.round((count / max) * 100))}" style="background:${color}" title="${escapeAttr(lang)}: ${count}"></div>
            <div class="mini-bar-label">${escapeHtml(lang)}</div>
          </div>`;
      })
      .join("");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        miniBars.querySelectorAll(".mini-bar").forEach((bar) => {
          bar.style.height = bar.dataset.target + "%";
        });
      });
    });
  }

  // ---- animated counter for the repo count ----
  function animateCountUp(el, target) {
    if (prefersReducedMotion || target === 0) {
      el.textContent = target;
      return;
    }
    const duration = 700;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---- sliding highlight behind the active rail button ----
  function setupRailPill() {
    const active = railButtons.find((b) => b.classList.contains("active"));
    if (active) moveRailPillTo(active, true);
  }

  function moveRailPillTo(btn, instant) {
    const wrapRect = railButtonsWrap.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const x = btnRect.left - wrapRect.left;
    const y = btnRect.top - wrapRect.top;
    if (instant) railPill.style.transition = "none";
    railPill.style.transform = `translate(${x}px, ${y}px)`;
    if (instant) {
      requestAnimationFrame(() => {
        railPill.style.transition = "";
      });
    }
  }

  // ---- cursor-reactive spotlight on the hero gradient ----
  function setupHeroParallax() {
    if (prefersReducedMotion) return;
    hero.addEventListener("mousemove", (e) => {
      const rect = hero.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 100;
      const my = ((e.clientY - rect.top) / rect.height) * 100;
      hero.style.setProperty("--mx", mx + "%");
      hero.style.setProperty("--my", my + "%");
    });
    hero.addEventListener("mouseleave", () => {
      hero.style.setProperty("--mx", "50%");
      hero.style.setProperty("--my", "20%");
    });
  }

  // ---- rotating example queries in the placeholder ----
  function setupRotatingPlaceholder() {
    if (docs.length === 0) return;
    const examples = [];
    for (const d of docs.slice(0, 4)) examples.push(d.title);
    const languages = [...new Set(docs.map((d) => d.language).filter(Boolean))];
    for (const l of languages.slice(0, 2)) examples.push(l);
    if (examples.length === 0) return;

    let i = 0;
    const base = "a repo name, a topic, a word from a README…";
    const rotate = () => {
      if (document.activeElement === input || input.value) return;
      input.placeholder = `Try "${examples[i % examples.length]}"…`;
      i++;
    };
    if (!prefersReducedMotion) {
      setInterval(rotate, 2600);
    }
    input.addEventListener("blur", () => {
      if (!input.value) input.placeholder = base;
    });
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
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
