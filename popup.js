'use strict';

// ─── Reader settings ──────────────────────────────────────────────────────────

chrome.storage.sync.get(
  ['progressBar', 'bionicReading', 'bionicIntensity'],
  (result) => {
    document.getElementById('progressBar').checked = result.progressBar !== false;
    document.getElementById('bionicReading').checked = result.bionicReading === true;

    const intensity = result.bionicIntensity || 'light';
    updateIntensityUI(intensity);
    updateIntensityVisibility();
  }
);

function updateIntensityVisibility() {
  const on = document.getElementById('bionicReading').checked;
  document.getElementById('bionicIntensity').style.display = on ? 'flex' : 'none';
}

function updateIntensityUI(intensity) {
  document.querySelectorAll('.segmented button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.intensity === intensity);
  });
}

function notifyReader(settings) {
  chrome.storage.sync.set(settings);
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_CHANGED', settings });
    }
  });
}

document.getElementById('progressBar').addEventListener('change', () => {
  notifyReader({ progressBar: document.getElementById('progressBar').checked });
});

document.getElementById('bionicReading').addEventListener('change', () => {
  updateIntensityVisibility();
  notifyReader({ bionicReading: document.getElementById('bionicReading').checked });
});

document.querySelectorAll('.segmented button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const intensity = btn.dataset.intensity;
    updateIntensityUI(intensity);
    notifyReader({ bionicIntensity: intensity });
  });
});

// ─── Archive utilities ────────────────────────────────────────────────────────

function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 120)
    .trim() || 'article';
}

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;');
}

function setArchiveStatus(msg, type = 'info') {
  const el = document.getElementById('archive-status');
  if (!el) return;
  el.textContent = msg;
  el.className = `archive-status visible ${type}`;
}

function clearArchiveStatus() {
  const el = document.getElementById('archive-status');
  if (el) el.className = 'archive-status';
}

// ─── Archive UI ───────────────────────────────────────────────────────────────

function renderNotSubstack() {
  document.getElementById('archive-content').innerHTML = `
    <div class="not-substack">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/>
      </svg>
      Navigate to a Substack article to archive it.
    </div>`;
}

function renderArchiveUI(info) {
  const meta = [info.author, new URL(info.url).hostname].filter(Boolean).join(' · ');
  const defaultFilename = sanitizeFilename(info.title);

  document.getElementById('archive-content').innerHTML = `
    <div class="article-info">
      <div class="article-title" title="${escapeAttr(info.title)}">${escapeHTML(info.title)}</div>
      <div class="article-meta">${escapeHTML(meta)}</div>
    </div>
    <div class="filename-row">
      <label class="filename-label" for="filename-input">Filename</label>
      <div class="filename-input-wrap">
        <input
          id="filename-input"
          class="filename-input"
          type="text"
          value="${escapeAttr(defaultFilename)}"
          spellcheck="false"
          autocomplete="off"
        >
        <span class="filename-ext">.html</span>
      </div>
    </div>
    <button class="btn-archive" id="btn-archive">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <div class="btn-label">
        <span class="btn-title">Download HTML</span>
        <span class="btn-sub">Self-contained file, opens offline</span>
      </div>
    </button>
    <div class="archive-status" id="archive-status"></div>`;

  document.getElementById('btn-archive').addEventListener('click', downloadHTML);
}

// ─── Archive download ─────────────────────────────────────────────────────────

async function downloadHTML() {
  clearArchiveStatus();
  const btn = document.getElementById('btn-archive');
  const btnTitle = btn.querySelector('.btn-title');
  btn.disabled = true;
  const origTitle = btnTitle.textContent;
  btnTitle.textContent = 'Working\u2026';
  setArchiveStatus('Collecting page content\u2026', 'info');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  } catch (_) { /* already injected */ }

  chrome.tabs.sendMessage(tab.id, { action: 'collectHTML' }, async (response) => {
    if (chrome.runtime.lastError || !response) {
      setArchiveStatus('Could not reach page. Try reloading the tab.', 'error');
      btn.disabled = false;
      btnTitle.textContent = origTitle;
      return;
    }

    if (response.error) {
      setArchiveStatus(`Error: ${response.error}`, 'error');
      btn.disabled = false;
      btnTitle.textContent = origTitle;
      return;
    }

    const inputEl = document.getElementById('filename-input');
    const rawName = inputEl ? inputEl.value.trim() : '';
    const filename = (sanitizeFilename(rawName) || 'article') + '.html';

    setArchiveStatus('Saving file\u2026', 'info');

    chrome.runtime.sendMessage(
      { action: 'triggerHTMLDownload', html: response.html, filename },
      (dlResponse) => {
        btn.disabled = false;
        btnTitle.textContent = origTitle;
        if (chrome.runtime.lastError || !dlResponse?.success) {
          setArchiveStatus('Download failed. Check browser download settings.', 'error');
        } else {
          setArchiveStatus(`Saved as "${filename}"`, 'success');
        }
      }
    );
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('brave://')) {
    renderNotSubstack();
    return;
  }

  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  } catch (_) { /* already present */ }

  chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' }, (info) => {
    if (chrome.runtime.lastError || !info || !info.isSubstack) {
      renderNotSubstack();
      return;
    }
    renderArchiveUI(info);
  });
}

document.addEventListener('DOMContentLoaded', init);
