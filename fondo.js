// ============================================================
// FONDO - Vista per il tracciamento dell'andamento di un investimento
// ============================================================

const Fondo = (function () {
  let righeFondo = null; // caricate al primo accesso alla vista (lazy)
  let istanzaGrafico = null;

  // ============================================================
  // CARICAMENTO DATI
  // ============================================================

  async function assicuraDatiCaricati() {
    if (righeFondo !== null) return;
    const risposta = await Api.getFondoDati();
    righeFondo = risposta.righe.slice().sort(function (a, b) {
      return DateUtil.confronta(a.data, b.data);
    });
  }

  async function render() {
    const contenitoreRiepilogo = document.getElementById("riepilogo-fondo");
    if (righeFondo === null && contenitoreRiepilogo) {
      contenitoreRiepilogo.innerHTML = '<div class="statistiche-vuoto">Caricamento dati fondo...</div>';
    }
    await assicuraDatiCaricati();
    disegnaTutto();
  }

  async function ricaricaERidisegna() {
    righeFondo = null;
    await assicuraDatiCaricati();
    disegnaTutto();
  }

  function disegnaTutto() {
    renderizzaRiepilogo();
    renderizzaGrafico();
    renderizzaLista();
  }

  // ============================================================
  // CALCOLI: giorni trascorsi, XIRR, regressione lineare
  // ============================================================

  function calcolaGiorniDa(dataBase, dataStr) {
    const a = DateUtil.scomponi(dataBase);
    const b = DateUtil.scomponi(dataStr);
    const dA = new Date(a.anno, a.mese - 1, a.giorno);
    const dB = new Date(b.anno, b.mese - 1, b.giorno);
    return Math.round((dB - dA) / (1000 * 60 * 60 * 24));
  }

  function formattaDataDaGiorni(dataBase, giorni) {
    const c = DateUtil.scomponi(dataBase);
    const d = new Date(c.anno, c.mese - 1, c.giorno);
    d.setDate(d.getDate() + Math.round(giorni));
    return DateUtil.formattaComponenti(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  /**
   * Stima il rendimento annualizzato (XIRR) trattando ogni incremento
   * del Versato cumulativo come un versamento avvenuto in quella data,
   * e il valore più recente (Valore o Controvalore) come se fosse
   * incassato oggi. Ritorna null se non ci sono abbastanza dati o se
   * il calcolo non converge, invece di un numero fuorviante.
   */
  function calcolaXirr(righe, campo) {
    if (righe.length < 2) return null;

    const dataBase = righe[0].data;
    const flussi = [];
    let versatoPrecedente = 0;

    righe.forEach(function (r) {
      const delta = r.versato - versatoPrecedente;
      if (delta !== 0) {
        flussi.push({ giorni: calcolaGiorniDa(dataBase, r.data), importo: -delta });
      }
      versatoPrecedente = r.versato;
    });

    const ultima = righe[righe.length - 1];
    flussi.push({ giorni: calcolaGiorniDa(dataBase, ultima.data), importo: ultima[campo] });

    const haNegativo = flussi.some(function (f) { return f.importo < 0; });
    const haPositivo = flussi.some(function (f) { return f.importo > 0; });
    const giorniDistinti = new Set(flussi.map(function (f) { return f.giorni; }));
    if (!haNegativo || !haPositivo || giorniDistinti.size < 2) return null;

    return risolviXirr(flussi);
  }

  function risolviXirr(flussi) {
    function npv(tasso) {
      return flussi.reduce(function (acc, f) {
        return acc + f.importo / Math.pow(1 + tasso, f.giorni / 365);
      }, 0);
    }
    function derivataNpv(tasso) {
      return flussi.reduce(function (acc, f) {
        if (f.giorni === 0) return acc;
        return acc - (f.importo * (f.giorni / 365)) / Math.pow(1 + tasso, f.giorni / 365 + 1);
      }, 0);
    }

    let tasso = 0.1;
    for (let i = 0; i < 100; i++) {
      const valore = npv(tasso);
      const derivata = derivataNpv(tasso);
      if (Math.abs(derivata) < 1e-9) return null;
      let nuovoTasso = tasso - valore / derivata;
      if (!isFinite(nuovoTasso)) return null;
      if (nuovoTasso <= -0.999) nuovoTasso = -0.999;
      if (Math.abs(nuovoTasso - tasso) < 1e-7) return nuovoTasso;
      tasso = nuovoTasso;
    }
    return null; // non converge entro i tentativi massimi
  }

  /**
   * Regressione lineare semplice (minimi quadrati) su un insieme di
   * punti {x, y}. Ritorna {m, b} tali che y = m*x + b, o null se non
   * calcolabile (meno di 2 punti, o punti tutti sulla stessa x).
   */
  function regressioneLineare(punti) {
    const n = punti.length;
    if (n < 2) return null;
    let sommaX = 0, sommaY = 0, sommaXY = 0, sommaX2 = 0;
    punti.forEach(function (p) {
      sommaX += p.x; sommaY += p.y; sommaXY += p.x * p.y; sommaX2 += p.x * p.x;
    });
    const denom = n * sommaX2 - sommaX * sommaX;
    if (denom === 0) return null;
    const m = (n * sommaXY - sommaX * sommaY) / denom;
    const b = (sommaY - m * sommaX) / n;
    return { m: m, b: b };
  }

  // ============================================================
  // RIEPILOGO
  // ============================================================

  function calcolaRiepilogo() {
    if (righeFondo.length === 0) return null;
    const ultima = righeFondo[righeFondo.length - 1];
    const penultima = righeFondo.length >= 2 ? righeFondo[righeFondo.length - 2] : null;

    const guadagnoValore = ultima.valore - ultima.versato;
    const percValore = ultima.versato !== 0 ? (guadagnoValore / ultima.versato) * 100 : null;
    const guadagnoControvalore = ultima.controvalore - ultima.versato;
    const percControvalore = ultima.versato !== 0 ? (guadagnoControvalore / ultima.versato) * 100 : null;

    const variazioneValore = penultima ? ultima.valore - penultima.valore : null;
    const variazionePercValore = penultima && penultima.valore !== 0 ? (variazioneValore / penultima.valore) * 100 : null;
    const variazioneControvalore = penultima ? ultima.controvalore - penultima.controvalore : null;
    const variazionePercControvalore = penultima && penultima.controvalore !== 0 ? (variazioneControvalore / penultima.controvalore) * 100 : null;

    return {
      ultima: ultima,
      penultima: penultima,
      guadagnoValore: guadagnoValore, percValore: percValore,
      guadagnoControvalore: guadagnoControvalore, percControvalore: percControvalore,
      variazioneValore: variazioneValore, variazionePercValore: variazionePercValore,
      variazioneControvalore: variazioneControvalore, variazionePercControvalore: variazionePercControvalore,
      xirrValore: calcolaXirr(righeFondo, "valore"),
      xirrControvalore: calcolaXirr(righeFondo, "controvalore")
    };
  }

  function formattaPercentuale(p) {
    if (p === null || p === undefined || isNaN(p)) return "—";
    return (p >= 0 ? "+" : "") + p.toFixed(1).replace(".", ",") + "%";
  }

  function formattaImportoConSegnoNumero(numero) {
    const segno = numero >= 0 ? "+" : "-";
    return segno + ImportoUtil.formattaConSimbolo(Math.abs(numero));
  }

  function renderizzaRiepilogo() {
    const contenitore = document.getElementById("riepilogo-fondo");
    if (!contenitore) return;

    if (righeFondo.length === 0) {
      contenitore.innerHTML = '<div class="statistiche-vuoto">Nessun dato ancora registrato per il fondo. Aggiungi la prima voce qui sotto.</div>';
      return;
    }

    const r = calcolaRiepilogo();

    contenitore.innerHTML = `
      <div class="riepilogo-fondo-versato">
        <span class="etichetta">Versato totale</span>
        <span class="valore-grande">${ImportoUtil.formattaConSimbolo(r.ultima.versato)}</span>
      </div>
      ${creaBloccoRiepilogo("Valore", r.ultima.valore, r.guadagnoValore, r.percValore, r.variazioneValore, r.variazionePercValore, r.xirrValore)}
      ${creaBloccoRiepilogo("Controvalore", r.ultima.controvalore, r.guadagnoControvalore, r.percControvalore, r.variazioneControvalore, r.variazionePercControvalore, r.xirrControvalore)}
    `;
  }

  function creaBloccoRiepilogo(titolo, valoreAttuale, guadagno, percGuadagno, variazione, percVariazione, xirr) {
    const classeGuadagno = guadagno >= 0 ? "positivo" : "negativo";
    const rigaVariazione = variazione !== null
      ? `<div class="riepilogo-fondo-dettaglio">Rispetto all'ultima rilevazione: <span class="${variazione >= 0 ? "positivo" : "negativo"}">${formattaImportoConSegnoNumero(variazione)} (${formattaPercentuale(percVariazione)})</span></div>`
      : "";
    const rigaXirr = `<div class="riepilogo-fondo-dettaglio">Rendimento annualizzato stimato: ${xirr === null ? "non ancora calcolabile" : '<span class="' + (xirr >= 0 ? "positivo" : "negativo") + '">' + formattaPercentuale(xirr * 100) + "</span>"}</div>`;

    return `
      <div class="riepilogo-fondo-blocco">
        <div class="riepilogo-fondo-titolo">${titolo}</div>
        <div class="riepilogo-fondo-riga-principale">
          <span class="valore-grande">${ImportoUtil.formattaConSimbolo(valoreAttuale)}</span>
          <span class="${classeGuadagno}">${formattaImportoConSegnoNumero(guadagno)} (${formattaPercentuale(percGuadagno)})</span>
        </div>
        ${rigaVariazione}
        ${rigaXirr}
      </div>
    `;
  }

  // ============================================================
  // GRAFICO
  // ============================================================

  function leggiVariabileCss(nome) {
    return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  }

  function renderizzaGrafico() {
    const canvas = document.getElementById("grafico-fondo");
    const contenitoreVuoto = document.getElementById("grafico-fondo-vuoto");
    if (!canvas) return;

    if (righeFondo.length === 0 || typeof Chart === "undefined") {
      canvas.classList.add("nascosto");
      if (contenitoreVuoto) contenitoreVuoto.classList.remove("nascosto");
      return;
    }

    canvas.classList.remove("nascosto");
    if (contenitoreVuoto) contenitoreVuoto.classList.add("nascosto");

    const dataBase = righeFondo[0].data;
    const puntiVersato = righeFondo.map(function (r) { return { x: calcolaGiorniDa(dataBase, r.data), y: r.versato }; });
    const puntiValore = righeFondo.map(function (r) { return { x: calcolaGiorniDa(dataBase, r.data), y: r.valore }; });
    const puntiControvalore = righeFondo.map(function (r) { return { x: calcolaGiorniDa(dataBase, r.data), y: r.controvalore }; });

    const minX = puntiValore[0].x;
    const maxX = puntiValore[puntiValore.length - 1].x;

    const datasets = [
      {
        label: "Versato", data: puntiVersato,
        borderColor: leggiVariabileCss("--testo-secondario"), backgroundColor: leggiVariabileCss("--testo-secondario"),
        borderDash: [4, 4], pointRadius: 2, borderWidth: 2, tension: 0
      },
      {
        label: "Valore", data: puntiValore,
        borderColor: leggiVariabileCss("--accento"), backgroundColor: leggiVariabileCss("--accento"),
        pointRadius: 3, borderWidth: 2, tension: 0
      },
      {
        label: "Controvalore", data: puntiControvalore,
        borderColor: leggiVariabileCss("--competenza"), backgroundColor: leggiVariabileCss("--competenza"),
        pointRadius: 3, borderWidth: 2, tension: 0
      }
    ];

    const trendValore = regressioneLineare(puntiValore);
    if (trendValore) {
      datasets.push({
        label: "Tendenza Valore",
        data: [{ x: minX, y: trendValore.m * minX + trendValore.b }, { x: maxX, y: trendValore.m * maxX + trendValore.b }],
        borderColor: leggiVariabileCss("--accento"), borderDash: [2, 3], borderWidth: 1.5,
        pointRadius: 0, tension: 0
      });
    }

    const trendControvalore = regressioneLineare(puntiControvalore);
    if (trendControvalore) {
      datasets.push({
        label: "Tendenza Controvalore",
        data: [{ x: minX, y: trendControvalore.m * minX + trendControvalore.b }, { x: maxX, y: trendControvalore.m * maxX + trendControvalore.b }],
        borderColor: leggiVariabileCss("--competenza"), borderDash: [2, 3], borderWidth: 1.5,
        pointRadius: 0, tension: 0
      });
    }

    if (istanzaGrafico) {
      istanzaGrafico.destroy();
    }

    istanzaGrafico = new Chart(canvas, {
      type: "line",
      data: { datasets: datasets },
      options: {
        parsing: false,
        scales: {
          x: {
            type: "linear",
            ticks: {
              color: leggiVariabileCss("--testo-secondario"),
              callback: function (valore) {
                const c = DateUtil.scomponi(formattaDataDaGiorni(dataBase, valore));
                return String(c.giorno).padStart(2, "0") + "/" + String(c.mese).padStart(2, "0");
              }
            },
            grid: { display: false }
          },
          y: {
            ticks: { color: leggiVariabileCss("--testo-secondario") },
            grid: { color: "rgba(128,128,128,0.15)" }
          }
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: leggiVariabileCss("--testo-secondario"),
              font: { size: 11 },
              filter: function (item) { return item.text.indexOf("Tendenza") === -1; } // nascondi le tendenze dalla legenda, per non affollarla
            }
          },
          tooltip: {
            callbacks: {
              title: function (contesti) {
                const giorni = contesti[0].parsed.x;
                return DateUtil.formattaPerVisualizzazione(formattaDataDaGiorni(dataBase, giorni));
              }
            }
          }
        }
      }
    });
  }

  // ============================================================
  // LISTA STORICO
  // ============================================================

  function renderizzaLista() {
    const contenitore = document.getElementById("lista-fondo");
    if (!contenitore) return;

    if (righeFondo.length === 0) {
      contenitore.innerHTML = "";
      return;
    }

    const righeOrdinate = righeFondo.slice().sort(function (a, b) {
      return DateUtil.confronta(b.data, a.data); // più recenti prima
    });

    contenitore.innerHTML = righeOrdinate.map(function (r) {
      return creaHtmlRigaFondo(r);
    }).join("");

    righeOrdinate.forEach(function (r) {
      const btn = document.getElementById("riga-fondo-" + r.id);
      const formContenitore = document.getElementById("form-riga-fondo-" + r.id);
      if (!btn || !formContenitore) return;

      btn.addEventListener("click", function () {
        const giaAperto = formContenitore.classList.contains("aperto");
        chiudiTuttiIFormRigaFondo();
        if (!giaAperto) {
          FormFondo.inizializza(formContenitore);
          formContenitore.classList.remove("nascosto");
          FormFondo.apriPerModifica(r);
        }
      });
    });
  }

  function chiudiTuttiIFormRigaFondo() {
    document.querySelectorAll(".form-riga-fondo").forEach(function (el) {
      el.classList.remove("aperto");
      el.classList.add("nascosto");
      el.innerHTML = "";
    });
    const formNuovo = document.getElementById("form-fondo-nuovo-contenitore");
    if (formNuovo) {
      formNuovo.classList.remove("aperto");
      formNuovo.classList.add("nascosto");
      formNuovo.innerHTML = "";
    }
  }

  function creaHtmlRigaFondo(r) {
    const guadagnoValore = r.valore - r.versato;
    return `
      <div class="riga-movimento-contenitore">
        <button class="riga-movimento" id="riga-fondo-${r.id}">
          <div class="colonna-sinistra">
            <div class="data">${DateUtil.formattaPerVisualizzazione(r.data)}</div>
            <div class="descrizione">Versato: ${ImportoUtil.formattaConSimbolo(r.versato)}</div>
            <div class="categoria-riga">Valore: ${ImportoUtil.formattaConSimbolo(r.valore)} · Controvalore: ${ImportoUtil.formattaConSimbolo(r.controvalore)}</div>
          </div>
          <div class="colonna-destra ${guadagnoValore >= 0 ? "positivo" : "negativo"}">${formattaImportoConSegnoNumero(guadagnoValore)}</div>
        </button>
        <div class="form-voce-contenitore form-riga-fondo nascosto" id="form-riga-fondo-${r.id}"></div>
      </div>
    `;
  }

  // ============================================================
  // EVENTI
  // ============================================================

  function collegaEventiControlli() {
    const btnNuovo = document.getElementById("btn-nuova-voce-fondo");
    if (!btnNuovo) return;
    btnNuovo.addEventListener("click", function () {
      const contenitore = document.getElementById("form-fondo-nuovo-contenitore");
      const giaAperto = contenitore.classList.contains("aperto");
      chiudiTuttiIFormRigaFondo();
      if (!giaAperto) {
        FormFondo.inizializza(contenitore);
        contenitore.classList.remove("nascosto");
        const ultimoVersato = righeFondo && righeFondo.length > 0 ? righeFondo[righeFondo.length - 1].versato : undefined;
        FormFondo.apriPerNuovaVoce(ultimoVersato);
      }
    });
  }

  return {
    render: render,
    ricaricaERidisegna: ricaricaERidisegna,
    collegaEventiControlli: collegaEventiControlli
  };
})();
