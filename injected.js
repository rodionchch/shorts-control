// MAIN world: запускается Chrome напрямую, CSP не применяется
(function () {
  'use strict';

  if (window.__shortsAutoScrollLoaded) return;
  window.__shortsAutoScrollLoaded = true;

  const LS_KEY = 'shortsAutoScroll';
  const LS_SPEED_KEY = 'shortsAutoScroll_speed';

  function isEnabled() {
    try {
      const v = localStorage.getItem(LS_KEY);
      return v === null ? true : JSON.parse(v);
    } catch (_) { return true; }
  }

  function getSpeed() {
    try {
      const v = localStorage.getItem(LS_SPEED_KEY);
      return v === null ? 1 : JSON.parse(v);
    } catch (_) { return 1; }
  }

  function applySpeed() {
    if (!video) return;
    const speed = getSpeed();
    if (video.playbackRate !== speed) video.playbackRate = speed;
  }

  let video = null;
  let navigating = false;
  let lastTime = 0;
  let navTimer = null;

  function isOnShorts() {
    return window.location.pathname.startsWith('/shorts/');
  }

  function findNextButton() {
    return (
      document.querySelector('#navigation-button-down button') ||
      document.querySelector('ytd-shorts #navigation-button-down button')
    );
  }

  function findPrevButton() {
    return (
      document.querySelector('#navigation-button-up button') ||
      document.querySelector('ytd-shorts #navigation-button-up button')
    );
  }

  function goToPrev() {
    if (navigating || !isOnShorts()) return;
    navigating = true;
    const btn = findPrevButton();
    if (btn) {
      btn.click();
    } else {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowUp', keyCode: 38, bubbles: true, cancelable: true,
      }));
    }
    setTimeout(() => { navigating = false; }, 2000);
  }

  function goToNext(force = false) {
    if ((!force && !isEnabled()) || navigating || !isOnShorts()) return;
    navigating = true;
    clearTimeout(navTimer);

    const btn = findNextButton();
    if (btn) {
      btn.click();
    } else {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowDown', keyCode: 40, bubbles: true, cancelable: true,
      }));
    }

    setTimeout(() => { navigating = false; }, 2000);
  }

  // Таймер планируется один раз при старте воспроизведения / seek,
  // а не пересоздаётся на каждом timeupdate
  function scheduleEndTimer() {
    clearTimeout(navTimer);
    if (!video || !isFinite(video.duration) || video.duration <= 0) return;
    if (!isEnabled() || !isOnShorts()) return;
    const remaining = video.duration - video.currentTime - 0.15;
    if (remaining > 0 && remaining < video.duration) {
      navTimer = setTimeout(() => {
        if (isOnShorts() && isEnabled()) goToNext();
      }, remaining * 1000);
    }
  }

  // YouTube зацикливает через video.loop=true — при loop срабатывает seeking к 0
  function onSeeking() {
    if (!video) return;
    const dur = video.duration;
    if (video.currentTime < 0.5 && isFinite(dur) && lastTime > dur * 0.7) {
      goToNext();
    }
  }

  function onSeeked() {
    // Переплануем таймер после любого seek (loop или пользовательский)
    scheduleEndTimer();
  }

  function onTimeUpdate() {
    if (!video) return;
    const cur = video.currentTime;
    const dur = video.duration;

    // Резервный детектор loop: скачок времени назад
    if (isFinite(dur) && dur > 0 && lastTime > dur * 0.8 && cur < 1.5) {
      goToNext();
    }
    lastTime = cur;
  }

  function onEnded() { goToNext(); }

  function onLoadedMetadata() {
    lastTime = 0;
    navigating = false;
    clearTimeout(navTimer);
    applySpeed();
    scheduleEndTimer();
  }

  function onPlay() {
    applySpeed();
    scheduleEndTimer();
  }

  function onPause() {
    clearTimeout(navTimer);
  }

  // Срабатывает когда YouTube меняет src в том же video-элементе
  function onEmptied() {
    lastTime = 0;
    navigating = false;
    clearTimeout(navTimer);
  }

  function attachVideo(v) {
    if (video === v) return;
    detachVideo();
    video = v;
    video.addEventListener('ended', onEnded);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('emptied', onEmptied);

    // Если видео уже играет в момент attach — применяем скорость и планируем таймер
    if (!v.paused && isFinite(v.duration) && v.duration > 0) {
      applySpeed();
      scheduleEndTimer();
    }
  }

  function detachVideo() {
    if (!video) return;
    video.removeEventListener('ended', onEnded);
    video.removeEventListener('timeupdate', onTimeUpdate);
    video.removeEventListener('seeking', onSeeking);
    video.removeEventListener('seeked', onSeeked);
    video.removeEventListener('loadedmetadata', onLoadedMetadata);
    video.removeEventListener('play', onPlay);
    video.removeEventListener('pause', onPause);
    video.removeEventListener('emptied', onEmptied);
    video = null;
    lastTime = 0;
    clearTimeout(navTimer);
  }

  function findActiveVideo() {
    // Приоритет 1: видео внутри #shorts-player (стабильный ID активного Short)
    const inPlayer = document.querySelector('#shorts-player video');
    if (inPlayer && !inPlayer.paused && isFinite(inPlayer.duration)) return inPlayer;

    // Приоритет 2: видео внутри ytd-reel-video-renderer
    const inRenderer = document.querySelector('ytd-reel-video-renderer video');
    if (inRenderer && !inRenderer.paused && isFinite(inRenderer.duration)) return inRenderer;

    // Приоритет 3: любое играющее видео с loop=true (признак активного Short)
    for (const v of document.querySelectorAll('video')) {
      if (!v.paused && v.loop && isFinite(v.duration) && v.duration > 0) return v;
    }

    // Приоритет 4: shorts-player есть, но видео ещё не играет (только загружается)
    if (inPlayer) return inPlayer;

    return null;
  }

  function findAndAttach() {
    if (!isOnShorts()) return;
    const v = findActiveVideo();
    if (v) attachVideo(v);
  }

  // MutationObserver с дросселированием — не чаще раза в 300мс
  let observerTimer = null;
  const domObserver = new MutationObserver(() => {
    if (!isOnShorts()) return;
    clearTimeout(observerTimer);
    observerTimer = setTimeout(findAndAttach, 300);
  });

  domObserver.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('shortsSpeedChanged', () => {
    applySpeed();
    scheduleEndTimer();
  });

  window.addEventListener('shortsControl', (e) => {
    const cmd = e.detail?.command;
    if (cmd === 'playpause') {
      const v = video || findActiveVideo();
      if (v && video !== v) attachVideo(v);
      if (v) {
        v.click();
        setTimeout(() => { if (!v.paused) scheduleEndTimer(); }, 50);
      }
    } else if (cmd === 'next') {
      navigating = false;
      goToNext(true);
    } else if (cmd === 'prev') {
      navigating = false;
      goToPrev();
    }
  });

  // YouTube генерирует оба события при SPA-навигации
  function onNavigate() {
    navigating = false;
    lastTime = 0;
    clearTimeout(navTimer);
    setTimeout(findAndAttach, 500);
  }

  window.addEventListener('yt-navigate-finish', onNavigate);
  window.addEventListener('yt-page-data-updated', onNavigate);

  findAndAttach();

  // Минимальный UI когда шортс открыт в узком попап-окне
  function injectPopupStyles() {
    if (document.getElementById('__yt-popup-styles')) return;
    const style = document.createElement('style');
    style.id = '__yt-popup-styles';
    style.textContent = `
      ytd-masthead, #masthead-container { display: none !important; }
      #navigation-button-up, #navigation-button-down { display: none !important; }
      .action-container, ytd-shorts-player-controls { display: none !important; }
      ytd-shorts { --ytd-app-gutter-size: 0px !important; }
      ytd-page-manager { padding-top: 0 !important; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function checkPopupMode() {
    if (window.outerWidth < 600 && isOnShorts()) injectPopupStyles();
  }

  window.addEventListener('resize', checkPopupMode);
  window.addEventListener('yt-navigate-finish', () => {
    if (window.outerWidth < 600 && isOnShorts()) injectPopupStyles();
  });
  setTimeout(checkPopupMode, 500);
})();
