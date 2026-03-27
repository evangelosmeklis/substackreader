'use strict';

// Load saved settings into UI
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

function notify(settings) {
  chrome.storage.sync.set(settings);
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_CHANGED', settings });
    }
  });
}

document.getElementById('progressBar').addEventListener('change', () => {
  notify({ progressBar: document.getElementById('progressBar').checked });
});

document.getElementById('bionicReading').addEventListener('change', () => {
  updateIntensityVisibility();
  notify({ bionicReading: document.getElementById('bionicReading').checked });
});

document.querySelectorAll('.segmented button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const intensity = btn.dataset.intensity;
    updateIntensityUI(intensity);
    notify({ bionicIntensity: intensity });
  });
});
