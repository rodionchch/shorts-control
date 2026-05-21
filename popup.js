document.querySelectorAll('[data-i18n]').forEach((el) => {
  const msg = chrome.i18n.getMessage(el.dataset.i18n);
  if (msg) el.textContent = msg;
});

const STORAGE_KEY = 'shortsAutoScroll_enabled';
const SPEED_KEY = 'shortsAutoScroll_speed';

const toggle = document.getElementById('toggle');
const speedBtns = document.querySelectorAll('.speed-btn');
const openBtn = document.getElementById('openWindow');
const ctrlBtns = document.querySelectorAll('.ctrl-btn');

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
  const onShorts = !!url.match(/youtube\.com\/shorts\//);
  if (!onShorts) {
    openBtn.disabled = true;
    ctrlBtns.forEach((b) => { b.disabled = true; });
  }
});

function sendControl(command) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (!tabId) return;
    chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (cmd) => {
        window.dispatchEvent(new CustomEvent('shortsControl', { detail: { command: cmd } }));
      },
      args: [command],
    });
  });
}

const ICON_PLAY = 'M8 5v14l11-7z';
const ICON_PAUSE = 'M6 19h4V5H6zm8-14v14h4V5z';

const playPauseBtn = document.getElementById('ctrlPlayPause');
const playPausePath = playPauseBtn.querySelector('path');

function setPlayPauseIcon(paused) {
  playPausePath.setAttribute('d', paused ? ICON_PLAY : ICON_PAUSE);
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tabId = tabs[0]?.id;
  if (!tabId) return;
  chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: () => {
      const v = document.querySelector('#shorts-player video')
        || document.querySelector('ytd-reel-video-renderer video')
        || [...document.querySelectorAll('video')].find((el) => el.loop);
      return v ? v.paused : true;
    },
  }).then(([res]) => { if (res) setPlayPauseIcon(res.result); }).catch(() => {});
});

document.getElementById('ctrlPrev').addEventListener('click', () => sendControl('prev'));

playPauseBtn.addEventListener('click', () => {
  const isPaused = playPausePath.getAttribute('d') === ICON_PLAY;
  setPlayPauseIcon(!isPaused);
  sendControl('playpause');
});

document.getElementById('ctrlNext').addEventListener('click', () => sendControl('next'));

document.getElementById('footerLink').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://www.youtube.com/shorts' });
});
