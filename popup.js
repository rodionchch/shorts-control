const STORAGE_KEY = 'shortsAutoScroll_enabled';
const SPEED_KEY = 'shortsAutoScroll_speed';

const toggle = document.getElementById('toggle');
const speedBtns = document.querySelectorAll('.speed-btn');

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
