// GIJO Arcade 서비스 워커 — 한 번 열어 두면 인터넷 없이도 실행된다.
//
// · 화면(index.html)은 인터넷이 되면 새 것을 받아 캐시를 갱신하고, 안 되면 캐시로 연다.
//   그래서 게임을 고쳐 올려도 VERSION 을 올리지 않아도 다음 접속 때 새 판이 뜬다.
// · 그림·아이콘·글꼴은 한 번 받은 것을 계속 쓴다. 그림 파일을 같은 이름으로 바꿔 올렸다면 VERSION 을 올린다.
const VERSION = 'v3';
const CACHE = 'gijoarcade-' + VERSION;
const BASE = new URL('./', self.location.href).pathname; // GitHub Pages 는 /<저장소이름>/ 아래에서 열린다
const PRECACHE = [
  "",
  "index.html",
  "manifest.json",
  "manifest-casino.json",
  "casino-180.png",
  "casino-192.png",
  "casino-512.png",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
  "assets/slot_spicy_bonus_ultra.jpg",
  "assets/slot_jackpot_fever_ultra.jpg",
  "assets/slot_double_gamble_ultra.jpg"
].map((p) => BASE + p);
const isFont = (url) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // 하나가 실패해도 나머지는 담는다(addAll 은 하나만 실패해도 전부 버린다).
      .then((cache) => Promise.all(PRECACHE.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gijoarcade-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin && url.pathname.startsWith(BASE);
  if (!sameOrigin && !isFont(url)) return;

  // 화면: 인터넷 먼저, 안 되면 캐시.
  if (sameOrigin && (req.mode === 'navigate' || url.pathname === BASE || url.pathname === BASE + 'index.html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(BASE + 'index.html', copy)); }
          return res;
        })
        .catch(() => caches.match(BASE + 'index.html').then((hit) => hit || caches.match(BASE)))
    );
    return;
  }

  // 그림·아이콘·글꼴: 캐시 먼저, 없으면 받아서 담는다.
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
