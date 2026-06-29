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
   * Genera una palette di colori per le categorie, basata su variazioni
   * del colore accento, per restare visivamente coerenti col tema navy.
   */
  function paletteCategoria(numero) {
    const base = ["#1B3A5C", "#3D6A99", "#6B95C2", "#9BBAE0", "#2C5170", "#4A7CA8", "#7FA8D4"];
    const palette = [];
    for (let i = 0; i < numero; i++) {
      palette.push(base[i % base.length]);
    }
    return palette;
  }

  /**
   * Disegna (o aggiorna) il grafico a torta delle spese per categoria,
   * nel canvas con id "grafico-torta-mensile".
   */
  function disegnaTortaMensile(speseCategorie) {
    const canvas = document.getElementById("grafico-torta-mensile");
    const contenitoreVuoto = document.getElementById("grafico-torta-mensile-vuoto");
    if (!canvas) return;

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
      istanzaTortaMensile.data.datasets[0].backgroundColor = paletteCategoria(etichette.length);
      istanzaTortaMensile.update();
      return;
    }

    istanzaTortaMensile = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: etichette,
        datasets: [{
          data: valori,
          backgroundColor: paletteCategoria(etichette.length),
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
          backgroundColor: paletteCategoria(etichette.length),
          borderWidth: 0
        }]
      },
      options: {
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
    distruggiTorteSchede: distruggiTorteSchede
  };
})();
