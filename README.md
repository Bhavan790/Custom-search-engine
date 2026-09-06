<div align="center">

# 🚀 Custom GitHub Search Engine & Extension

An interactive, dark-themed repository search engine and browser extension designed to instantly filter, search, and visualize your GitHub projects with real-time stats and fluid animations.

[![Live Demo](https://img.shields.io/badge/Demo-Live_Site-brightgreen?style=for-the-badge&logo=github)](https://bhavan790.github.io/Custom-search-engine/)
[![GitHub Stars](https://img.shields.io/github/stars/Bhavan790/Custom-search-engine?style=for-the-badge&logo=github)](https://github.com/Bhavan790/Custom-search-engine/stargazers)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

[**Explore Live Demo »**](https://bhavan790.github.io/Custom-search-engine/)

</div>

---

## ✨ Key Features

- 🌌 **Dynamic Animated UI:** Features floating astronaut illustrations, cursor-reactive spotlight effects, drifting background glow particles, and smooth layout transitions.
- ⚡ **Instant Search & Multi-Criteria Filtering:** Search through repositories in real time and sort by **Most Starred**, **Recently Updated**, or **Random Shuffle**.
- 📊 **Interactive Language & Stat Breakdown:** Dynamic count-up stats for total repositories along with visual top-language distribution charts.
- 🧩 **Companion Chrome Extension:** Access your repository search engine directly from your browser toolbar on any web page.
- 🌐 **Zero Server Maintenance:** Fully static, lightweight, and deployed via [GitHub Pages](https://bhavan790.github.io/Custom-search-engine/).

---

## 📸 Preview

| Dark Animated Web UI | Chrome Extension |
| :---: | :---: |
| *(Custom-search-engine/docs/UI)* | *(Custom-search-engine/docs/extension)* |

---

## 📁 Repository Structure

```text
Custom-search-engine/
├── docs/                 # Production web application (GitHub Pages root)
│   ├── index.html        # Main interface
│   ├── style.css         # Dark theme animations & glassmorphism layout
│   └── app.js            # Live search logic & dynamic stats engine
├── extension/            # Manifest V3 Chrome Extension source
│   ├── manifest.json     # Extension configuration
│   ├── popup.html        # Extension UI layout
│   └── popup.js          # Popup search logic
├── indexer/              # Automated build scripts
│   └── build-index.js    # Repository indexing pipeline
└── .github/workflows/    # CI/CD automated deployment pipelines
```

---

## 🧩 Chrome Extension Installation

1. **Clone or download** this repository:
   ```bash
   git clone https://github.com/Bhavan790/Custom-search-engine.git
   ```
2. Open **Google Chrome** and navigate to `chrome://extensions/`.
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the `extension/` folder inside your cloned repository.
6. **Pin the extension** to your Chrome toolbar for quick access!

---

## 💻 Local Web Development

To run the web app locally on your machine:

1. Open your terminal inside the project directory:
   ```bash
   cd Custom-search-engine
   ```
2. Start a local **HTTP server**:
   ```bash
   python -m http.server 8000
   ```
3. Open your browser and navigate to: `http://localhost:8000/docs/`

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (CSS Variables, Keyframe Animations, Glassmorphism), Modern JavaScript (ES6+)
- **Browser Extension:** Chrome Extension API (Manifest V3)
- **Hosting & CI/CD:** GitHub Pages & GitHub Actions

---

