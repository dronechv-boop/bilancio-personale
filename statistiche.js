// ============================================================
// STATISTICHE - Vista con ripartizione per categoria e confronto periodi
// ============================================================

const Statistiche = (function () {
  // Stato interno della Sezione A (per categoria)
  let annoSezioneA = new Date().getFullYear();
  let categoriaEspansaSpesa = null;
  let categoriaEspansaEntrata = null;

  // Stato interno della Sezione B (confronto periodi)
  let tipoPeriodoConfronto = "mese"; // "mese" | "anno"
  let periodiSelezionati = []; // array di { anno, mese|null }

  function render() {
    renderizzaSelettoreAnnoA();
    renderizzaSezioneA();
    renderizzaControlliConfronto();
    renderizzaRisultatoConfronto();
  }

  // ============================================================
  // SEZIONE A: PER CATEGORIA
  // ============================================================

  function renderizzaSelettoreAnnoA() {
    const select = document.getElementById("select-anno-statistiche");
    if (!select) return;
    const anni = Stato.getAnniDisponibili();

    let html = '<option value="">Tutti gli anni</option>';
    html += anni.map(function (a) {
      return '<option value="' + a + '" ' + (a === annoSezioneA ? "selected" : "") + ">" + a + "</option>";
    }).join("");
    select.innerHTML = html;
  }

  function renderizzaSezioneA() {
    const ripartizioneSpese = Stato.getRipartizionePerCategoria(annoSezioneA || null, "Spesa");
    const ripartizioneEntrate = Stato.getRipartizionePerCategoria(annoSezioneA || null, "Entrata");

    renderizzaElencoCategorie("elenco-categorie-spese", ripartizioneSpese, "spesa");
    renderizzaElencoCategorie("elenco-categorie-entrate", ripartizioneEntrate, "entrata");
  }

  function renderizzaElencoCategorie(idContenitore, dati, tipoChiave) {
    const contenitore = document.getElementById(idContenitore);
    if (!contenitore) return;

    if (dati.length === 0) {
      contenitore.innerHTML = '<div class="statistiche-vuoto">Nessun dato in questo periodo.</div>';
      return;
    }

    const categoriaEspansa = tipoChiave === "spesa" ? categoriaEspansaSpesa : categoriaEspansaEntrata;

    contenitore.innerHTML = dati.map(function (voce) {
      const espansa = voce.categoria === categoriaEspansa;
      const sottocategorieHtml = voce.sottocategorie.length > 0
        ? voce.sottocategorie.map(function (s) {
            return '<div class="riga-sottocategoria-statistiche"><span>' + escapeHtml(s.nome) + '</span><span>' + ImportoUtil.formattaConSimbolo(s.totale) + "</span></div>";
          }).join("")
        : '<div class="riga-sottocategoria-statistiche statistiche-vuoto">Nessuna sottocategoria</div>';

      return `
        <div class="riga-categoria-statistiche-contenitore">
          <button class="riga-categoria-statistiche" data-categoria="${escapeHtml(voce.categoria)}" data-tipo="${tipoChiave}">
            <span class="nome-categoria-statistiche">${escapeHtml(voce.categoria)}</span>
            <span class="totale-categoria-statistiche">${ImportoUtil.formattaConSimbolo(voce.totale)}</span>
            <span class="freccia-espandi ${espansa ? "ruotata" : ""}">▾</span>
          </button>
          <div class="sottocategorie-statistiche ${espansa ? "aperto" : ""}">${sottocategorieHtml}</div>
        </div>
      `;
    }).join("");

    contenitore.querySelectorAll(".riga-categoria-statistiche").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const categoria = btn.getAttribute("data-categoria");
        const tipo = btn.getAttribute("data-tipo");
        if (tipo === "spesa") {
          categoriaEspansaSpesa = categoriaEspansaSpesa === categoria ? null : categoria;
        } else {
          categoriaEspansaEntrata = categoriaEspansaEntrata === categoria ? null : categoria;
        }
        renderizzaSezioneA();
      });
    });
  }

  // ============================================================
  // SEZIONE B: CONFRONTO PERIODI
  // ============================================================

  function renderizzaControlliConfronto() {
    const btnMese = document.getElementById("btn-tipo-mese");
    const btnAnno = document.getElementById("btn-tipo-anno");
    if (btnMese && btnAnno) {
      btnMese.classList.toggle("attivo", tipoPeriodoConfronto === "mese");
      btnAnno.classList.toggle("attivo", tipoPeriodoConfronto === "anno");
    }

    const contenitore = document.getElementById("selettore-periodi-confronto");
    if (!contenitore) return;

    let opzioni;
    if (tipoPeriodoConfronto === "mese") {
      opzioni = Stato.getMesiDisponibiliConDati().map(function (p) {
        return { chiave: p.anno + "-" + p.mese, etichetta: DateUtil.nomeMese(p.mese, true) + " " + p.anno, anno: p.anno, mese: p.mese };
      });
    } else {
      opzioni = Stato.getAnniDisponibili().map(function (a) {
        return { chiave: String(a), etichetta: String(a), anno: a, mese: null };
      });
    }

    if (opzioni.length === 0) {
      contenitore.innerHTML = '<div class="statistiche-vuoto">Nessun periodo disponibile.</div>';
      return;
    }

    contenitore.innerHTML = opzioni.map(function (o) {
      const selezionata = periodiSelezionati.some(function (p) { return p.anno === o.anno && p.mese === o.mese; });
      return '<button class="pillola ' + (selezionata ? "attiva" : "") + '" data-chiave="' + o.chiave + '">' + o.etichetta + "</button>";
    }).join("");

    contenitore.querySelectorAll(".pillola").forEach(function (btn, indice) {
      btn.addEventListener("click", function () {
        const opzione = opzioni[indice];
        const posizione = periodiSelezionati.findIndex(function (p) { return p.anno === opzione.anno && p.mese === opzione.mese; });
        if (posizione === -1) {
          periodiSelezionati.push({ anno: opzione.anno, mese: opzione.mese });
        } else {
          periodiSelezionati.splice(posizione, 1);
        }
        renderizzaControlliConfronto();
        renderizzaRisultatoConfronto();
      });
    });
  }

  function cambiaTipoPeriodo(tipo) {
    if (tipo === tipoPeriodoConfronto) return;
    tipoPeriodoConfronto = tipo;
    periodiSelezionati = []; // cambiare tipo azzera la selezione, per evitare di mescolare mesi e anni
    renderizzaControlliConfronto();
    renderizzaRisultatoConfronto();
  }

  function renderizzaRisultatoConfronto() {
    const contenitore = document.getElementById("risultato-confronto");
    if (!contenitore) return;

    if (periodiSelezionati.length === 0) {
      contenitore.innerHTML = '<div class="statistiche-vuoto">Seleziona uno o più periodi da confrontare.</div>';
      return;
    }

    const datiPeriodi = periodiSelezionati.map(function (p) {
      const righe = Stato.righeFiltrate(p.anno, p.mese);
      const totali = Stato.calcolaTotali(righe);
      const speseCategorie = Stato.calcolaSpesePerCategoria(righe);
      const etichetta = p.mese ? DateUtil.nomeMese(p.mese) + " " + p.anno : String(p.anno);
      return { etichetta: etichetta, totali: totali, speseCategorie: speseCategorie };
    });

    const schedeHtml = datiPeriodi.map(function (d) {
      return creaSchedaPeriodo(d.etichetta, d.totali, d.speseCategorie, false);
    }).join("");

    const schedaMediaHtml = creaSchedaMedia(datiPeriodi);

    contenitore.innerHTML = schedeHtml + schedaMediaHtml;
  }

  function creaSchedaPeriodo(etichetta, totali, speseCategorie, evidenziata) {
    const classeSaldo = totali.saldo >= 0 ? "positivo" : "negativo";
    const elencoCategorie = speseCategorie.length > 0
      ? speseCategorie.map(function (s) { return escapeHtml(s.categoria) + ": " + ImportoUtil.formattaConSimbolo(s.totale); }).join(" · ")
      : "Nessuna spesa";

    return `
      <div class="scheda-periodo ${evidenziata ? "scheda-periodo-media" : ""}">
        <h3>${escapeHtml(etichetta)}</h3>
        <div class="scheda-periodo-riepilogo">
          <span class="positivo">${ImportoUtil.formattaConSimbolo(totali.entrate)}</span>
          <span class="negativo">${ImportoUtil.formattaConSimbolo(totali.spese)}</span>
          <span class="${classeSaldo}">${ImportoUtil.formattaConSegno(totali.saldo, totali.saldo >= 0 ? "Entrata" : "Spesa")}</span>
        </div>
        <div class="scheda-periodo-categorie">${elencoCategorie}</div>
      </div>
    `;
  }

  function creaSchedaMedia(datiPeriodi) {
    const numero = datiPeriodi.length;
    const mediaEntrate = datiPeriodi.reduce(function (s, d) { return s + d.totali.entrate; }, 0) / numero;
    const mediaSpese = datiPeriodi.reduce(function (s, d) { return s + d.totali.spese; }, 0) / numero;
    const mediaSaldo = mediaEntrate - mediaSpese;

    // Media per categoria: sommiamo il totale di ciascuna categoria su
    // tutti i periodi selezionati (0 se assente in un periodo) e
    // dividiamo per il numero di periodi, così la media riflette
    // l'impatto medio per periodo, non solo tra i periodi in cui compare.
    const sommaPerCategoria = {};
    datiPeriodi.forEach(function (d) {
      d.speseCategorie.forEach(function (s) {
        sommaPerCategoria[s.categoria] = (sommaPerCategoria[s.categoria] || 0) + s.totale;
      });
    });
    const mediaCategorie = Object.keys(sommaPerCategoria)
      .map(function (categoria) { return { categoria: categoria, totale: sommaPerCategoria[categoria] / numero }; })
      .sort(function (a, b) { return b.totale - a.totale; });

    return creaSchedaPeriodo(
      "Media (" + numero + (numero === 1 ? " periodo" : " periodi") + ")",
      { entrate: mediaEntrate, spese: mediaSpese, saldo: mediaSaldo },
      mediaCategorie,
      true
    );
  }

  function collegaEventiControlli() {
    const btnMese = document.getElementById("btn-tipo-mese");
    const btnAnno = document.getElementById("btn-tipo-anno");
    if (btnMese) btnMese.addEventListener("click", function () { cambiaTipoPeriodo("mese"); });
    if (btnAnno) btnAnno.addEventListener("click", function () { cambiaTipoPeriodo("anno"); });

    const selectAnnoA = document.getElementById("select-anno-statistiche");
    if (selectAnnoA) {
      selectAnnoA.addEventListener("change", function (e) {
        annoSezioneA = e.target.value === "" ? null : parseInt(e.target.value, 10);
        renderizzaSezioneA();
      });
    }
  }

  function escapeHtml(testo) {
    if (testo === null || testo === undefined) return "";
    return String(testo)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return {
    render: render,
    collegaEventiControlli: collegaEventiControlli
  };
})();
