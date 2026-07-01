// ============================================================
// APP - Orchestrazione principale dell'applicazione
// ============================================================

const App = (function () {
  async function inizializza() {
    await attendiChartJsPronta();
    FormVoce.inizializza(document.getElementById("form-voce-mensile-contenitore"));
    collegaEventiGlobali();
    gestisciTastiera();
    await ricaricaTuttoERidisegna();
  }

  /**
   * Chart.js si carica da CDN in modo asincrono. Se App.inizializza()
   * viene eseguito prima che lo script esterno sia pronto, l'oggetto
   * globale "Chart" non esiste ancora, e disegnare i grafici lancia
   * un errore che blocca il resto del rendering. Questa funzione
   * attende, riprovando ogni 100ms, finché Chart non è disponibile
   * (con un limite massimo per evitare un'attesa infinita in caso di
   * problemi di rete).
   */
  function attendiChartJsPronta() {
    return new Promise(function (resolve) {
      let tentativi = 0;
      const massimoTentativi = 50; // 50 x 100ms = 5 secondi massimo

      const intervallo = setInterval(function () {
        tentativi++;
        const pronta = typeof Chart !== "undefined";

        if (pronta || tentativi >= massimoTentativi) {
          clearInterval(intervallo);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Nasconde la tab bar in basso quando la tastiera del dispositivo è
   * aperta, usando l'API visualViewport per rilevare la riduzione di
   * altezza visibile della pagina. Se il browser non supporta questa
   * API, la tab bar resta semplicemente sempre visibile (comportamento
   * precedente, nessun peggioramento).
   */
  function gestisciTastiera() {
    if (!window.visualViewport) return;
    const tabBar = document.querySelector(".tab-bar");
    if (!tabBar) return;
    const sogliaPixel = 150; // differenza di altezza che indica tastiera aperta

    function aggiorna() {
      const differenza = window.innerHeight - window.visualViewport.height;
      tabBar.classList.toggle("tastiera-aperta", differenza > sogliaPixel);
    }

    window.visualViewport.addEventListener("resize", aggiorna);
    window.visualViewport.addEventListener("scroll", aggiorna);
  }

  async function ricaricaTuttoERidisegna() {
    mostraCaricamento(true);
    try {
      const [datiRisposta, metaRisposta] = await Promise.all([
        Api.getDati(),
        Api.getMeta()
      ]);
      Stato.impostaRighe(datiRisposta.righe);
      Stato.impostaMeta(metaRisposta);
      Grafici.aggiornaMappaColori();
      ridisegnaVistaAttiva();
    } catch (err) {
      mostraErroreCaricamento(err.message);
    } finally {
      mostraCaricamento(false);
    }
  }

  function mostraCaricamento(mostra) {
    const spinner = document.getElementById("spinner-caricamento");
    if (spinner) spinner.classList.toggle("nascosto", !mostra);
  }

  function mostraErroreCaricamento(messaggio) {
    const contenitore = document.getElementById("contenitore-errore");
    if (contenitore) {
      contenitore.textContent = "Errore nel caricamento dei dati: " + messaggio;
      contenitore.classList.remove("nascosto");
    }
  }

  function collegaEventiGlobali() {
    document.getElementById("btn-tab-mensile").addEventListener("click", function () {
      cambiaVista("mensile");
    });
    document.getElementById("btn-tab-annuale").addEventListener("click", function () {
      cambiaVista("annuale");
    });

    document.getElementById("select-anno-mensile").addEventListener("change", function (e) {
      Stato.setAnnoSelezionato(parseInt(e.target.value, 10));
      // Quando cambia l'anno, riallinea il mese selezionato se non più disponibile
      const mesiDisponibili = Stato.getMesiDisponibili();
      if (Stato.getMeseSelezionato() !== null && mesiDisponibili.indexOf(Stato.getMeseSelezionato()) === -1) {
        Stato.setMeseSelezionato(mesiDisponibili[mesiDisponibili.length - 1]);
      }
      renderizzaVistaMensile();
    });

    document.getElementById("select-anno-annuale").addEventListener("change", function (e) {
      Stato.setAnnoSelezionato(parseInt(e.target.value, 10));
      renderizzaVistaAnnuale();
    });

    document.getElementById("btn-nuova-voce").addEventListener("click", function () {
      FormVoce.apriPerNuovaVoce();
    });
  }

  function cambiaVista(vista) {
    Stato.setVistaAttiva(vista);
    document.getElementById("vista-mensile").classList.toggle("attiva", vista === "mensile");
    document.getElementById("vista-annuale").classList.toggle("attiva", vista === "annuale");
    document.getElementById("btn-tab-mensile").classList.toggle("attivo", vista === "mensile");
    document.getElementById("btn-tab-annuale").classList.toggle("attivo", vista === "annuale");
    ridisegnaVistaAttiva();
  }

  function ridisegnaVistaAttiva() {
    if (Stato.getVistaAttiva() === "mensile") {
      renderizzaVistaMensile();
    } else {
      renderizzaVistaAnnuale();
    }
  }

  // ============================================================
  // VISTA MENSILE
  // ============================================================

  function renderizzaVistaMensile() {
    popolaSelectAnno("select-anno-mensile");
    renderizzaPilloleMese();

    const anno = Stato.getAnnoSelezionato();
    const mese = Stato.getMeseSelezionato();
    const righe = Stato.righeFiltrate(anno, mese);
    const totali = Stato.calcolaTotali(righe);
    const speseCategorie = Stato.calcolaSpesePerCategoria(righe);

    renderizzaRiepilogo("riepilogo-mensile", totali);
    Grafici.disegnaTortaMensile(speseCategorie);
    renderizzaListaMovimenti(righe);
  }

  function renderizzaPilloleMese() {
    const contenitore = document.getElementById("pillole-mese");
    const mesiDisponibili = Stato.getMesiDisponibili();
    const meseSelezionato = Stato.getMeseSelezionato();

    let html = '<button class="pillola ' + (meseSelezionato === null ? "attiva" : "") + '" data-mese="tutto">Tutto l\'anno</button>';
    mesiDisponibili.forEach(function (m) {
      const attiva = meseSelezionato === m;
      html += '<button class="pillola ' + (attiva ? "attiva" : "") + '" data-mese="' + m + '">' + DateUtil.nomeMese(m, true) + "</button>";
    });

    contenitore.innerHTML = html;

    contenitore.querySelectorAll(".pillola").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const valore = btn.getAttribute("data-mese");
        Stato.setMeseSelezionato(valore === "tutto" ? null : parseInt(valore, 10));
        renderizzaVistaMensile();
      });
    });

    // Scrolla automaticamente la pillola attiva in vista
    const pillolaAttiva = contenitore.querySelector(".pillola.attiva");
    if (pillolaAttiva) {
      pillolaAttiva.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }

  function renderizzaListaMovimenti(righe) {
    const contenitore = document.getElementById("lista-movimenti-mensile");

    if (righe.length === 0) {
      contenitore.innerHTML = '<div class="lista-vuota">Nessun movimento in questo periodo.</div>';
      return;
    }

    const righeOrdinate = righe.slice().sort(function (a, b) {
      return DateUtil.confronta(b.data, a.data); // più recenti prima
    });

    contenitore.innerHTML = righeOrdinate.map(function (r) {
      return creaHtmlRigaMovimento(r);
    }).join("");

    // Form di modifica espandibile sotto ogni riga
    righeOrdinate.forEach(function (r) {
      const btn = document.getElementById("riga-" + r.id);
      const formContenitore = document.getElementById("form-riga-" + r.id);
      if (!btn || !formContenitore) return;

      btn.addEventListener("click", function () {
        const giaAperto = formContenitore.classList.contains("aperto");
        chiudiTuttiIFormRiga();
        if (!giaAperto) {
          FormVoce.inizializza(formContenitore);
          formContenitore.classList.remove("nascosto");
          FormVoce.apriPerModifica(r);
        }
      });
    });
  }

  function chiudiTuttiIFormRiga() {
    document.querySelectorAll(".form-riga-movimento").forEach(function (el) {
      el.classList.remove("aperto");
      el.classList.add("nascosto");
      el.innerHTML = "";
    });
  }

  function creaHtmlRigaMovimento(r) {
    const classeValore = r.tipo === "Entrata" ? "positivo" : "negativo";
    const badgeCompetenza = r.dataCompetenza
      ? '<span class="badge-competenza">→ ' + DateUtil.scomponi(r.dataCompetenza).giorno + " " +
        DateUtil.nomeMese(DateUtil.scomponi(r.dataCompetenza).mese, true) + " " +
        DateUtil.scomponi(r.dataCompetenza).anno + "</span>"
      : "";

    return `
      <div class="riga-movimento-contenitore">
        <button class="riga-movimento" id="riga-${r.id}">
          <div class="colonna-sinistra">
            <div class="data">${DateUtil.formattaPerVisualizzazione(r.data)}</div>
            <div class="descrizione">${escapeHtml(r.descrizione)}</div>
            <div class="categoria-riga">${escapeHtml(r.categoria)}${r.sottocategoria ? " · " + escapeHtml(r.sottocategoria) : ""}${badgeCompetenza}</div>
          </div>
          <div class="colonna-destra ${classeValore}">${ImportoUtil.formattaConSegno(r.importo, r.tipo)}</div>
        </button>
        <div class="form-voce-contenitore form-riga-movimento nascosto" id="form-riga-${r.id}"></div>
      </div>
    `;
  }

  // ============================================================
  // VISTA ANNUALE
  // ============================================================

  function renderizzaVistaAnnuale() {
    popolaSelectAnno("select-anno-annuale");

    const anno = Stato.getAnnoSelezionato();
    const righeAnno = Stato.righeFiltrate(anno, null);
    const totaliAnno = Stato.calcolaTotali(righeAnno);
    const totaliPerMese = Stato.calcolaTotaliPerMese(anno);

    renderizzaRiepilogo("riepilogo-annuale", totaliAnno);
    Grafici.disegnaBarreAnnuali(totaliPerMese);
    renderizzaSchedeMensili(anno);
  }

  function renderizzaSchedeMensili(anno) {
    Grafici.distruggiTorteSchede();
    const contenitore = document.getElementById("schede-mensili");
    const mesiDisponibili = Stato.getMesiDisponibili().slice().reverse(); // più recente prima

    contenitore.innerHTML = mesiDisponibili.map(function (m) {
      return creaHtmlSchedaMese(anno, m);
    }).join("");

    mesiDisponibili.forEach(function (m) {
      const righeDelMese = Stato.righeFiltrate(anno, m);
      const speseCategorie = Stato.calcolaSpesePerCategoria(righeDelMese);
      if (speseCategorie.length > 0) {
        Grafici.disegnaTortaScheda("torta-scheda-" + anno + "-" + m, speseCategorie);
      }

      const btnApri = document.getElementById("apri-scheda-" + anno + "-" + m);
      if (btnApri) {
        btnApri.addEventListener("click", function () {
          Stato.setAnnoSelezionato(anno);
          Stato.setMeseSelezionato(m);
          cambiaVista("mensile");
        });
      }
    });
  }

  function creaHtmlSchedaMese(anno, mese) {
    const righeDelMese = Stato.righeFiltrate(anno, mese);
    const totali = Stato.calcolaTotali(righeDelMese);
    const speseCategorie = Stato.calcolaSpesePerCategoria(righeDelMese);
    const canvasId = "torta-scheda-" + anno + "-" + mese;
    const classeSaldo = totali.saldo >= 0 ? "positivo" : "negativo";

    if (righeDelMese.length === 0) {
      return `
        <div class="scheda-mese">
          <div class="scheda-mese-header">
            <h3>${DateUtil.nomeMese(mese)} ${anno}</h3>
            <button class="scheda-mese-apri" id="apri-scheda-${anno}-${mese}" aria-label="Apri ${DateUtil.nomeMese(mese)}">▸</button>
          </div>
          <div class="scheda-mese-vuota">Nessun movimento</div>
        </div>
      `;
    }

    const elencoCategorie = speseCategorie
      .map(function (s) { return escapeHtml(s.categoria) + ": " + ImportoUtil.formattaConSimbolo(s.totale); })
      .join(" · ");

    return `
      <div class="scheda-mese">
        <div class="scheda-mese-header">
          <h3>${DateUtil.nomeMese(mese)} ${anno}</h3>
          <button class="scheda-mese-apri" id="apri-scheda-${anno}-${mese}" aria-label="Apri ${DateUtil.nomeMese(mese)}">▸</button>
        </div>
        <div class="scheda-mese-corpo">
          <div class="contenitore-torta-scheda">
            <canvas id="${canvasId}" width="56" height="56"></canvas>
          </div>
          <div class="scheda-mese-dettagli">
            <div class="scheda-mese-saldo ${classeSaldo}">Saldo: ${ImportoUtil.formattaConSegno(totali.saldo, totali.saldo >= 0 ? "Entrata" : "Spesa")}</div>
            <div class="scheda-mese-categorie">${elencoCategorie}</div>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================
  // HELPER CONDIVISI
  // ============================================================

  function popolaSelectAnno(idSelect) {
    const select = document.getElementById(idSelect);
    const anni = Stato.getAnniDisponibili();
    const annoSelezionato = Stato.getAnnoSelezionato();

    select.innerHTML = anni.map(function (a) {
      return '<option value="' + a + '" ' + (a === annoSelezionato ? "selected" : "") + ">" + a + "</option>";
    }).join("");
  }

  function renderizzaRiepilogo(idContenitore, totali) {
    const contenitore = document.getElementById(idContenitore);
    contenitore.innerHTML = `
      <div class="riepilogo-voce">
        <div class="etichetta">Entrate</div>
        <div class="valore positivo">${ImportoUtil.formattaConSimbolo(totali.entrate)}</div>
      </div>
      <div class="riepilogo-voce">
        <div class="etichetta">Spese</div>
        <div class="valore negativo">${ImportoUtil.formattaConSimbolo(totali.spese)}</div>
      </div>
      <div class="riepilogo-voce">
        <div class="etichetta">Saldo</div>
        <div class="valore ${totali.saldo >= 0 ? "positivo" : "negativo"}">${ImportoUtil.formattaConSegno(totali.saldo, totali.saldo >= 0 ? "Entrata" : "Spesa")}</div>
      </div>
    `;
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
    inizializza: inizializza,
    ricaricaTuttoERidisegna: ricaricaTuttoERidisegna
  };
})();

// Assegnazione esplicita a window: le dichiarazioni "const" a livello
// di script non diventano automaticamente proprietà di window (a
// differenza delle vecchie dichiarazioni "var"), quindi serve farlo
// a mano perché auth.js possa accedervi tramite window.App.
window.App = App;

// Nota: App.inizializza() viene chiamato da Auth (auth.js) solo dopo
// un login Google riuscito con l'email autorizzata, non automaticamente
// al caricamento della pagina.
