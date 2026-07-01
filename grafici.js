// ============================================================
// GRAFICI - Creazione grafici a torta e a barre con Chart.js
// ============================================================

const Grafici = (function () {
  let istanzaTortaMensile = null;
  let istanzaBarreAnnuali = null;
  const istanzeTorteSchede = {};

  function getColoreAccento() {
    return getComputedStyle(document.documentElement).getPropertyValue("--accento").trim();
  }

  function getColoreTestoSecondario() {
    return getComputedStyle(document.documentElement).getPropertyValue("--testo-secondario").trim();
  }

  function getColoreEntrata() {
    return getComputedStyle(document.documentElement).getPropertyValue("--entrata").trim();
  }

  function getColoreSpesa() {
    return getComputedStyle(document.documentElement).getPropertyValue("--spesa").trim();
  }

  /**
   * Palette estesa per le categorie: 16 colori ben distinguibili tra
   * loro, non solo variazioni di navy, così anche con 10+ categorie
   * ognuna resta facilmente riconoscibile.
   */
  const PALETTE_CATEGORIE = [
    "#1B3A5C", "#2E86AB", "#3DBE79", "#E0A030", "#D64545",
    "#8E44AD", "#16A085", "#E67E22", "#5D6D7E", "#C0392B",
    "#27AE60", "#2980B9", "#F39C12", "#9B59B6", "#1ABC9C",
    "#7F8C8D"
  ];

  let mappaColoriCategorie = null;

  /**
   * Ricostruisce la mappa nome-categoria -> colore, in modo
   * deterministico: le categorie vengono ordinate alfabeticamente
   * (ordine stabile, sempre uguale a parità di dati) e a ciascuna
   * viene assegnato un colore della palette in quell'ordine fisso.
   * Così ogni categoria mantiene sempre lo stesso colore in ogni
   * vista e ad ogni ricarica, finché l'elenco delle categorie non
   * cambia. Va richiamata ogni volta che i dati vengono ricaricati.
   */
  function aggiornaMappaColori() {
    const categorie = new Set();
    Stato.getTutteLeRighe().forEach(function (r) {
      if (r.categoria) categorie.add(r.categoria);
    });
    const elencoOrdinato = Array.from(categorie).sort();

    mappaColoriCategorie = {};
    elencoOrdinato.forEach(function (categoria, indice) {
      mappaColoriCategorie[categoria] = PALETTE_CATEGORIE[indice % PALETTE_CATEGORIE.length];
    });
  }

  function coloreCategoria(nomeCategoria) {
    if (!mappaColoriCategorie) aggiornaMappaColori();
    return mappaColoriCategorie[nomeCategoria] || "#999999";
  }

  /**
   * Disegna (o aggiorna) il grafico a torta delle spese per categoria,
   * nel canvas con id "grafico-torta-mensile".
   */
  function disegnaTortaMensile(speseCategorie) {
    const canvas = document.getElementById("grafico-torta-mensile");
    const contenitoreVuoto = document.getElementById("grafico-torta-mensile-vuoto");
    if (!canvas) return;
    if (typeof Chart === "undefined") {
      console.warn("Chart.js non ancora disponibile, salto il disegno del grafico.");
      return;
    }

    if (speseCategorie.length === 0) {
      canvas.classList.add("nascosto");
      if (contenitoreVuoto) contenitoreVuoto.classList.remove("nascosto");
      if (istanzaTortaMensile) {
        istanzaTortaMensile.destroy();
        istanzaTortaMensile = null;
      }
      return;
    }

    canvas.classList.remove("nascosto");
    if (contenitoreVuoto) contenitoreVuoto.classList.add("nascosto");

    const etichette = speseCategorie.map(function (s) { return s.categoria; });
    const valori = speseCategorie.map(function (s) { return s.totale; });

    if (istanzaTortaMensile) {
      istanzaTortaMensile.data.labels = etichette;
      istanzaTortaMensile.data.datasets[0].data = valori;
      istanzaTortaMensile.data.datasets[0].backgroundColor = etichette.map(coloreCategoria);
      istanzaTortaMensile.update();
      return;
    }

    istanzaTortaMensile = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: etichette,
        datasets: [{
          data: valori,
          backgroundColor: etichette.map(coloreCategoria),
          borderWidth: 0
        }]
      },
      options: {
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: getColoreTestoSecondario(), font: { size: 12 } }
          }
        }
      }
    });
  }

  /**
   * Disegna (o aggiorna) il grafico a barre mese-su-mese (entrate vs
   * spese) per la vista annuale, nel canvas "grafico-barre-annuali".
   */
  function disegnaBarreAnnuali(totaliPerMese) {
    const canvas = document.getElementById("grafico-barre-annuali");
    if (!canvas) return;
    if (typeof Chart === "undefined") {
      console.warn("Chart.js non ancora disponibile, salto il disegno del grafico.");
      return;
    }

    const etichette = totaliPerMese.map(function (t) { return DateUtil.nomeMese(t.mese, true); });
    const entrate = totaliPerMese.map(function (t) { return t.entrate; });
    const spese = totaliPerMese.map(function (t) { return t.spese; });

    if (istanzaBarreAnnuali) {
      istanzaBarreAnnuali.data.labels = etichette;
      istanzaBarreAnnuali.data.datasets[0].data = entrate;
      istanzaBarreAnnuali.data.datasets[1].data = spese;
      istanzaBarreAnnuali.update();
      return;
    }

    istanzaBarreAnnuali = new Chart(canvas, {
      type: "bar",
      data: {
        labels: etichette,
        datasets: [
          { label: "Entrate", data: entrate, backgroundColor: getColoreEntrata() },
          { label: "Spese", data: spese, backgroundColor: getColoreSpesa() }
        ]
      },
      options: {
        scales: {
          x: { ticks: { color: getColoreTestoSecondario() }, grid: { display: false } },
          y: { ticks: { color: getColoreTestoSecondario() }, grid: { color: "rgba(128,128,128,0.15)" } }
        },
        plugins: {
          legend: { labels: { color: getColoreTestoSecondario(), font: { size: 12 } } }
        }
      }
    });
  }

  /**
   * Disegna una piccola torta dentro una scheda mensile della vista
   * annuale. Ogni scheda ha il proprio canvas con id univoco.
   */
  function disegnaTortaScheda(canvasId, speseCategorie) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (typeof Chart === "undefined") {
      console.warn("Chart.js non ancora disponibile, salto il disegno del grafico.");
      return;
    }

    if (istanzeTorteSchede[canvasId]) {
      istanzeTorteSchede[canvasId].destroy();
    }

    if (speseCategorie.length === 0) return;

    const etichette = speseCategorie.map(function (s) { return s.categoria; });
    const valori = speseCategorie.map(function (s) { return s.totale; });

    istanzeTorteSchede[canvasId] = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: etichette,
        datasets: [{
          data: valori,
          backgroundColor: etichette.map(coloreCategoria),
          borderWidth: 0
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        animation: false
      }
    });
  }

  function distruggiTorteSchede() {
    Object.keys(istanzeTorteSchede).forEach(function (id) {
      istanzeTorteSchede[id].destroy();
      delete istanzeTorteSchede[id];
    });
  }

  return {
    disegnaTortaMensile: disegnaTortaMensile,
    disegnaBarreAnnuali: disegnaBarreAnnuali,
    disegnaTortaScheda: disegnaTortaScheda,
    distruggiTorteSchede: distruggiTorteSchede,
    aggiornaMappaColori: aggiornaMappaColori
  };
})();
