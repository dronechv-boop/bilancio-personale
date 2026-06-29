// ============================================================
// SERVICE WORKER - Minimo, solo per abilitare l'installazione PWA
// ============================================================
//
// Questo service worker non implementa funzionalità offline complete:
// la webapp richiede sempre una connessione per leggere/scrivere sul
// Google Sheet. Serve solo a soddisfare il requisito tecnico che i
// browser richiedono per permettere "Aggiungi a Home" come vera app.

const NOME_CACHE = "bilancio-v1";

const FILE_DA_PRECACHEARE = [
  "./index.html",
  "./style.css",
  "./config.js",
  "./api.js",
  "./date-util.js",
  "./importo-util.js",
  "./stato.js",
  "./grafici.js",
  "./form-voce.js",
  "./app.js",
  "./auth.js",
  "./manifest.json"
];

self.addEventListener("install", function (evento) {
  evento.waitUntil(
    caches.open(NOME_CACHE).then(function (cache) {
      return cache.addAll(FILE_DA_PRECACHEARE);
    })
  );
});

self.addEventListener("activate", function (evento) {
  evento.waitUntil(
    caches.keys().then(function (chiavi) {
      return Promise.all(
        chiavi
          .filter(function (chiave) { return chiave !== NOME_CACHE; })
          .map(function (chiave) { return caches.delete(chiave); })
      );
    })
  );
});

// Strategia "network first, cache fallback": prova sempre la rete
// (per avere dati aggiornati), usa la cache solo se la rete non risponde
// (es. assenza di connessione momentanea).
self.addEventListener("fetch", function (evento) {
  // Le chiamate verso Apps Script e verso i servizi di login Google
  // non vanno mai gestite dalla cache: devono sempre essere quelle
  // reali e aggiornate.
  if (evento.request.url.indexOf("script.google.com") !== -1 ||
      evento.request.url.indexOf("accounts.google.com") !== -1) {
    return;
  }

  evento.respondWith(
    fetch(evento.request).catch(function () {
      return caches.match(evento.request);
    })
  );
});
