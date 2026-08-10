# YouTube Shorts Auto-Scroll — контекст проекта

## Что делает расширение
Автоматически переключает YouTube Shorts на следующее видео вместо зацикливания.

## Файлы
```
shorts-autoscroll/
├── manifest.json   — MV3, world: MAIN для injected.js
├── content.js      — isolated world, синхронизирует chrome.storage → localStorage
├── injected.js     — MAIN world, вся логика мониторинга видео
├── popup.html/js   — тоггл вкл/выкл
└── icon16/48/128.png
```

## Ключевые технические решения

### Почему world: MAIN
YouTube блокирует инъекцию скриптов через CSP. Content script в isolated world не мог слушать события видео корректно. `world: "MAIN"` в манифесте — Chrome инжектирует напрямую в page context, минуя CSP.

### Почему три видеоэлемента
YouTube создаёт 3 элемента `video.html5-main-video` одновременно (текущий + буферы). `querySelector` возвращал первый (неактивный). Решение — `findActiveVideo()` ищет по приоритету:
1. `#shorts-player video` — стабильный ID активного Short
2. `ytd-reel-video-renderer video`
3. Любое видео с `!paused && loop === true`

### Механизм зацикливания YouTube
`video.loop = true` — браузер зацикливает сам, `ended` не стреляет. При loop срабатывает `seeking` к `currentTime=0`. Три стратегии детектирования:
- `onSeeking`: `currentTime < 0.5 && lastTime > dur * 0.7` → goToNext()
- `onTimeUpdate`: скачок времени назад (резерв)
- Таймер: `setTimeout` за 150мс до конца, планируется в `onPlay`/`onLoadedMetadata`/`onSeeked`

### Навигация
```javascript
document.querySelector('#navigation-button-down button').click()
```
Кнопка найдена по стабильному ID `navigation-button-down` (не зависит от языка интерфейса).

### Передача настроек
`content.js` (isolated) → `localStorage['shortsAutoScroll']` → `injected.js` (MAIN) читает через `isEnabled()`.

## Chrome Web Store
- ID расширения: `gibeidifnfgnjopggackljliodlhbhlh`
- Аккаунт: `rodionchch@gmail.com`
- Статус: отправлено на модерацию (13 мая 2026)
- Срок проверки: 1–3 рабочих дня (до 2 недель при загруженности)
- ZIP для загрузки: `/Users/rodion/Desktop/ext/shorts-autoscroll.zip`
