// Substack Reader - Content Script

(function () {
  'use strict';

  let settings = {
    progressBar: true,
    bionicReading: false,
    bionicIntensity: 'light', // light | medium | strong
  };

  // Bionic intensity config:
  // boldRatio  – fraction of the word to bold (0–1)
  // minLength  – skip words shorter than this
  // weight     – CSS font-weight for the bold portion
  const INTENSITY = {
    light:  { boldRatio: 0.35, minLength: 4, weight: 600 },
    medium: { boldRatio: 0.45, minLength: 3, weight: 700 },
    strong: { boldRatio: 0.55, minLength: 2, weight: 800 },
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function isArticlePage() {
    const path = window.location.pathname;
    if (path.includes('/post/') || path.includes('/p/')) return true;
    return !!(
      document.querySelector('.post-content') ||
      document.querySelector('.body.markup') ||
      document.querySelector('.available-content') ||
      document.querySelector('[class*="post-body"]') ||
      document.querySelector('article')
    );
  }

  function getArticleElement() {
    return (
      document.querySelector('.post-content') ||
      document.querySelector('.body.markup') ||
      document.querySelector('.available-content') ||
      document.querySelector('[class*="post-body"]') ||
      document.querySelector('article') ||
      document.querySelector('main')
    );
  }

  // ─── Scroll (capture mode catches any inner scroll container) ────────────────

  let scrollContainer = null;

  function getScrollMetrics() {
    const c = scrollContainer;
    if (!c || c === window) {
      return {
        scrollTop: window.scrollY,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: window.innerHeight,
      };
    }
    return {
      scrollTop: c.scrollTop,
      scrollHeight: c.scrollHeight,
      clientHeight: c.clientHeight,
    };
  }

  document.addEventListener('scroll', function (e) {
    const t = e.target;
    if (!t || t === document || t === document.documentElement || t === document.body) {
      scrollContainer = window;
    } else if (t.scrollHeight > t.clientHeight + 5) {
      scrollContainer = t;
    }
    updateProgress();
  }, { passive: true, capture: true });

  window.addEventListener('resize', updateProgress, { passive: true });

  // ─── Reading Progress Bar ─────────────────────────────────────────────────────

  function createProgressBar() {
    if (document.getElementById('sr-progress-container')) return;

    const container = document.createElement('div');
    container.id = 'sr-progress-container';
    const bar = document.createElement('div');
    bar.id = 'sr-progress-bar';
    const label = document.createElement('span');
    label.id = 'sr-progress-label';
    label.textContent = '0%';

    container.appendChild(bar);
    document.body.appendChild(container);
    document.body.appendChild(label);
  }

  function removeProgressBar() {
    document.getElementById('sr-progress-container')?.remove();
    document.getElementById('sr-progress-label')?.remove();
  }

  function updateProgress() {
    const bar = document.getElementById('sr-progress-bar');
    const label = document.getElementById('sr-progress-label');
    if (!bar) return;

    const { scrollTop, scrollHeight, clientHeight } = getScrollMetrics();
    const scrollable = scrollHeight - clientHeight;
    const pct = scrollable > 0 ? Math.min(100, Math.round((scrollTop / scrollable) * 100)) : 0;

    bar.style.width = pct + '%';
    if (label) label.textContent = pct + '%';
  }

  // ─── Bionic Reading ───────────────────────────────────────────────────────────

  function bionicWord(word, cfg) {
    if (word.length < cfg.minLength) return word; // leave short words untouched
    const boldLen = Math.max(1, Math.ceil(word.length * cfg.boldRatio));
    return `<span class="sr-bold" style="font-weight:${cfg.weight}">${word.slice(0, boldLen)}</span>${word.slice(boldLen)}`;
  }

  function processTextNode(node, cfg) {
    const text = node.textContent;
    if (!text.trim()) return;
    const parent = node.parentNode;
    if (!parent) return;
    const tag = parent.tagName;
    if (['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(tag)) return;
    if (parent.classList && (parent.classList.contains('sr-bold') || parent.classList.contains('sr-bionic'))) return;

    const span = document.createElement('span');
    span.className = 'sr-bionic';
    span.innerHTML = text.replace(/(\S+)/g, (w) => bionicWord(w, cfg));
    parent.replaceChild(span, node);
  }

  function applyBionicReading(container) {
    // Remove previous pass first so intensity changes are reflected
    removeBionicReading(container);

    const cfg = INTENSITY[settings.bionicIntensity] || INTENSITY.light;
    container.dataset.srBionic = '1';

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName;
        if (['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(tag)) return NodeFilter.FILTER_REJECT;
        if (p.classList && (p.classList.contains('sr-bold') || p.classList.contains('sr-bionic')))
          return NodeFilter.FILTER_REJECT;
        return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach((node) => processTextNode(node, cfg));
  }

  function removeBionicReading(container) {
    container.querySelectorAll('.sr-bionic').forEach((el) => {
      el.replaceWith(document.createTextNode(el.textContent));
    });
    delete container.dataset.srBionic;
  }

  // ─── Init & Settings ──────────────────────────────────────────────────────────

  function applySettings() {
    const article = getArticleElement();

    if (settings.progressBar) {
      createProgressBar();
    } else {
      removeProgressBar();
    }

    if (article) {
      if (settings.bionicReading) {
        applyBionicReading(article);
      } else {
        removeBionicReading(article);
      }
    }
  }

  function loadSettings() {
    chrome.storage.sync.get(
      ['progressBar', 'bionicReading', 'bionicIntensity'],
      (result) => {
        settings.progressBar = result.progressBar !== false;
        settings.bionicReading = result.bionicReading === true;
        settings.bionicIntensity = result.bionicIntensity || 'light';
        applySettings();
      }
    );
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SETTINGS_CHANGED') {
      Object.assign(settings, msg.settings);
      applySettings();
    }
  });

  if (isArticlePage()) {
    loadSettings();
  } else {
    const observer = new MutationObserver(() => {
      if (isArticlePage() && !document.getElementById('sr-progress-container')) {
        loadSettings();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
