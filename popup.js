document.querySelectorAll('[data-i18n]').forEach((el) => {
  const msg = chrome.i18n.getMessage(el.dataset.i18n);
  if (msg) el.textContent = msg;
});

const STORAGE_KEY = 'shortsAutoScroll_enabled';
const SPEED_KEY = 'shortsAutoScroll_speed';

const toggle = document.getElementById('toggle');
const speedBtns = document.querySelectorAll('.speed-btn');
const openBtn = document.getElementById('openWindow');

chrome.storage.sync.get([STORAGE_KEY, SPEED_KEY], (result) => {
  toggle.checked = result[STORAGE_KEY] !== false;
  setActiveSpeed(result[SPEED_KEY] || 1);
});

toggle.addEventListener('change', () => {
  chrome.storage.sync.set({ [STORAGE_KEY]: toggle.checked });
});

speedBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const speed = parseFloat(btn.dataset.speed);
    chrome.storage.sync.set({ [SPEED_KEY]: speed });
    setActiveSpeed(speed);
  });
});

function setActiveSpeed(speed) {
  speedBtns.forEach((btn) => {
    btn.classList.toggle('active', parseFloat(btn.dataset.speed) === speed);
  });
}

openBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url || '';
    const match = url.match(/youtube\.com\/shorts\/([^/?&]+)/);
    if (!match) return;
    const shortsUrl = `https://www.youtube.com/shorts/${match[1]}`;
    chrome.windows.create({
      url: shortsUrl,
      type: 'popup',
      width: 390,
      height: 700,
    });
  });
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0]?.url || '';
  if (!url.match(/youtube\.com\/shorts\//)) openBtn.disabled = true;
});

document.getElementById('footerLink').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://www.youtube.com/shorts' });
});
