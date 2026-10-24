/* Elloin Pedidos — guarda o app no aparelho para abrir sem internet.
   Ao publicar uma versão nova, troque o número da VERSAO para os aparelhos atualizarem. */
var VERSAO = 'elloin-pedidos-6';
var ARQUIVOS = ['./', './index.html', './config.js', './manifest.webmanifest', './icone-180.png', './icone-192.png', './icone-512.png', './logo.png', './logo-marca.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (nomes) {
    // só apaga versões antigas DESTE app (outros sites no mesmo endereço do GitHub ficam intactos)
    return Promise.all(nomes.filter(function (n) { return n.indexOf('elloin-pedidos-') === 0 && n !== VERSAO; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                                   // pedidos ao servidor (POST) nunca ficam guardados
  var url = new URL(req.url);
  var doApp = url.origin === self.location.origin;
  var pdfjs = url.hostname === 'cdn.jsdelivr.net' && url.pathname.indexOf('/pdfjs-dist@') >= 0;
  if (!doApp && !pdfjs) return;
  var chave = req.mode === 'navigate' ? './index.html' : (doApp && /\/config\.js$/.test(url.pathname) ? './config.js' : null);
  if (doApp && chave) {
    // tela e config.js: tenta a versão nova (até 4 s); sem sinal ou demorando, abre a guardada
    e.respondWith(caches.open(VERSAO).then(function (cc) {
      return cc.match(chave).then(function (guardado) {
        var rede = fetch(req, { cache: 'no-store' }).then(function (r) { if (r && r.ok) cc.put(chave, r.clone()); return r; });
        if (!guardado) return rede;
        var espera = new Promise(function (ok) { setTimeout(function () { ok(guardado); }, 4000); });
        return Promise.race([rede.catch(function () { return guardado; }), espera]);
      });
    }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: doApp }).then(function (guardado) {
    var rede = fetch(req).then(function (r) { if (r && (r.ok || r.type === 'opaque')) { var c = r.clone(); caches.open(VERSAO).then(function (cc) { cc.put(req, c); }); } return r; }).catch(function () { return guardado; });
    return guardado || rede;
  }));
});
