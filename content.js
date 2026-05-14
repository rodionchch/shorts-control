// Isolated world: chrome.storage → localStorage (читает injected.js из MAIN world)
const STORAGE_KEY = 'shortsAutoScroll_enabled';
const SPEED_KEY = 'shortsAutoScroll_speed';
const LS_KEY = 'shortsAutoScroll';
const LS_SPEED_KEY = 'shortsAutoScroll_speed';

function syncToLS(enabled) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(enabled)); } catch (_) {}
}

function syncSpeedToLS(speed) {
  try {
    localStorage.setItem(LS_SPEED_KEY, JSON.stringify(speed));
    window.dispatchEvent(new CustomEvent('shortsSpeedChanged', { detail: speed }));
  } catch (_) {}
}

chrome.storage.sync.get([STORAGE_KEY, SPEED_KEY], (result) => {
  syncToLS(result[STORAGE_KEY] !== false);
  syncSpeedToLS(result[SPEED_KEY] || 1);
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) syncToLS(changes[STORAGE_KEY].newValue);
  if (changes[SPEED_KEY]) syncSpeedToLS(changes[SPEED_KEY].newValue);
});
