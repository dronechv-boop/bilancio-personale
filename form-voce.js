// ============================================================
// FORM - Logica del form di inserimento/modifica voce
// ============================================================

const FormVoce = (function () {
  let elementoContenitore = null;
  let modalitaModifica = false;
  let idInModifica = null;
  let timeoutSuggerimenti = null;

  function inizializza(contenitore) {
    elementoContenitore = contenitore;
  }

  /**
   * Apre il form vuoto per una nuova voce, sotto il bottone
   * "+ Nuova voce".
   */
  function apriPerNuovaVoce() {
    modalitaModifica = false;
    idInModifica = null;
    renderizzaForm({
      fisso: false,
      descrizione: "",
      tipo: "Spesa",
      categoria: "",
      sottocategoria: "",
      importo: "",
      data: DateUtil.oggiStringa(),
      dataCompetenza: "",
      haCompetenza: false
    });
    apri();
  }

  /**
   * Apre il form precompilato per modificare una voce esistente.
   */
  function apriPerModifica(voce) {
    modalitaModifica = true;
    idInModifica = voce.id;
    renderizzaForm({
      fisso: voce.fisso,
      descrizione: voce.descrizione,
      tipo: voce.tipo,
      categoria: voce.categoria,
      sottocategoria: voce.sottocategoria,
      importo: ImportoUtil.formatta(voce.importo),
      data: voce.data,
      dataCompetenza: voce.dataCompetenza || "",
      haCompetenza: !!voce.dataCompetenza
    });
    apri();
  }

  function apri() {
    elementoContenitore.classList.add("aperto");
    elementoContenitore.classList.remove("nascosto");
  }

  function chiudi() {
    elementoContenitore.classList.remove("aperto");
    setTimeout(function () {
      elementoContenitore.innerHTML = "";
    }, 250);
  }

  function renderizzaForm(valori) {
    const meta = Stato.getMeta();

    const opzioniFissi = meta.nomiFissi
      .map(function (f) {
        return '<option value="' + escapeHtml(f.descrizione) + '">' + escapeHtml(f.descrizione) + "</option>";
      })
      .join("");

    elementoContenitore.innerHTML = `
      <div class="form-voce">
        <div class="toggle-riga">
          <input type="checkbox" id="campo-fisso" ${valori.fisso ? "checked" : ""}>
          <label for="campo-fisso">Spesa/entrata fissa</label>
        </div>

        <div class="campo" id="contenitore-descrizione">
          <!-- popolato da aggiornaCampoDescrizione() -->
        </div>

        <div class="campo">
          <label for="campo-tipo">Tipo</label>
          <select id="campo-tipo">
            <option value="Spesa" ${valori.tipo === "Spesa" ? "selected" : ""}>Spesa</option>
            <option value="Entrata" ${valori.tipo === "Entrata" ? "selected" : ""}>Entrata</option>
          </select>
        </div>

        <div class="campo" id="contenitore-categoria">
          <!-- popolato da renderizzaCampoConAggiunta() -->
        </div>

        <div class="campo" id="contenitore-sottocategoria">
          <!-- popolato da renderizzaCampoConAggiunta() -->
        </div>

        <div class="campo">
          <label for="campo-importo">Importo (€)</label>
          <input type="text" id="campo-importo" value="${escapeHtml(valori.importo)}" inputmode="decimal" placeholder="0,00">
        </div>

        <div class="campo">
          <label for="campo-data">Data</label>
          <input type="date" id="campo-data" value="${valori.data}">
        </div>

        <div class="toggle-riga">
          <input type="checkbox" id="campo-toggle-competenza" ${valori.haCompetenza ? "checked" : ""}>
          <label for="campo-toggle-competenza">Riguarda un periodo futuro</label>
        </div>

        <div class="campo ${valori.haCompetenza ? "" : "nascosto"}" id="contenitore-data-competenza">
          <label for="campo-data-competenza">Data di competenza</label>
          <input type="date" id="campo-data-competenza" value="${valori.dataCompetenza}">
        </div>

        <div class="azioni-form">
          <button type="button" class="btn-annulla" id="btn-annulla-form">Annulla</button>
          ${modalitaModifica ? '<button type="button" class="btn-elimina" id="btn-elimina-form">Elimina</button>' : ""}
          <button type="button" class="btn-salva" id="btn-salva-form">Salva</button>
        </div>
      </div>
    `;

    // Datalist nascosta usata solo per i fissi (la rendering del campo
    // descrizione varia in base al toggle Fisso, gestito separatamente)
    aggiornaCampoDescrizione(valori.fisso, valori.descrizione, opzioniFissi);
    renderizzaCampoConAggiunta(
      "categoria", "Categoria",
      Stato.getCategorieOrdinatePerFrequenza(), valori.categoria, "Nuova categoria",
      aggiornaSottocategoriaDaCategoria
    );
    renderizzaCampoConAggiunta(
      "sottocategoria", "Sottocategoria",
      Stato.getSottocategoriePerCategoria(valori.categoria || ""), valori.sottocategoria, "Nuova sottocategoria"
    );
    collegaEventi(valori);
  }

  /**
   * Ricostruisce la tendina Sottocategoria in base alla Categoria
   * attualmente selezionata (mostra solo le sottocategorie già usate
   * insieme a quella categoria, ordinate dall'ultima usata). Chiamata
   * ogni volta che il valore di Categoria cambia manualmente.
   */
  function aggiornaSottocategoriaDaCategoria() {
    const categoriaAttuale = leggiValoreConAggiunta("categoria");
    renderizzaCampoConAggiunta(
      "sottocategoria", "Sottocategoria",
      Stato.getSottocategoriePerCategoria(categoriaAttuale || ""), "", "Nuova sottocategoria"
    );
  }

  /**
   * Disegna un campo come tendina con tutte le opzioni già usate, più
   * una voce speciale "+ Aggiungi nuova..." che, se scelta, trasforma
   * il campo in un testo libero per inserire un valore non ancora
   * presente in elenco. Usata per Categoria e Sottocategoria.
   */
  function renderizzaCampoConAggiunta(nomeCampo, etichetta, opzioniEsistenti, valoreAttuale, placeholderNuovo, onCambiamento) {
    const contenitore = document.getElementById("contenitore-" + nomeCampo);
    if (!contenitore) return;

    const valoreNonInElenco = valoreAttuale && opzioniEsistenti.indexOf(valoreAttuale) === -1;

    const opzioniHtml = opzioniEsistenti
      .map(function (o) {
        return '<option value="' + escapeHtml(o) + '" ' + (o === valoreAttuale ? "selected" : "") + ">" + escapeHtml(o) + "</option>";
      })
      .join("");

    contenitore.innerHTML = `
      <label for="campo-${nomeCampo}">${etichetta}</label>
      <select id="campo-${nomeCampo}" class="${valoreNonInElenco ? "nascosto" : ""}">
        <option value="">Seleziona...</option>
        ${opzioniHtml}
        <option value="__nuovo__">➕ Aggiungi nuova...</option>
      </select>
      <input type="text" id="campo-${nomeCampo}-testo" class="${valoreNonInElenco ? "" : "nascosto"}" value="${escapeHtml(valoreNonInElenco ? valoreAttuale : "")}" placeholder="${placeholderNuovo}" autocomplete="off">
      <button type="button" class="link-torna-a-tendina ${valoreNonInElenco && opzioniEsistenti.length > 0 ? "" : "nascosto"}" id="campo-${nomeCampo}-torna">↺ Scegli da elenco esistente</button>
    `;

    const select = document.getElementById("campo-" + nomeCampo);
    const testo = document.getElementById("campo-" + nomeCampo + "-testo");
    const btnTorna = document.getElementById("campo-" + nomeCampo + "-torna");

    select.addEventListener("change", function () {
      if (select.value === "__nuovo__") {
        select.classList.add("nascosto");
        testo.classList.remove("nascosto");
        testo.value = "";
        testo.focus();
        if (opzioniEsistenti.length > 0) btnTorna.classList.remove("nascosto");
      }
      if (onCambiamento) onCambiamento();
    });

    testo.addEventListener("input", function () {
      if (onCambiamento) onCambiamento();
    });

    btnTorna.addEventListener("click", function () {
      testo.classList.add("nascosto");
      btnTorna.classList.add("nascosto");
      select.classList.remove("nascosto");
      select.value = "";
      if (onCambiamento) onCambiamento();
    });
  }

  /**
   * Legge il valore corrente di un campo "tendina con aggiunta"
   * (Categoria o Sottocategoria), sia che sia in modalità tendina che
   * in modalità testo libero.
   */
  function leggiValoreConAggiunta(nomeCampo) {
    const select = document.getElementById("campo-" + nomeCampo);
    const testo = document.getElementById("campo-" + nomeCampo + "-testo");
    if (select && !select.classList.contains("nascosto")) {
      return select.value === "__nuovo__" ? "" : select.value;
    }
    if (testo) return testo.value.trim();
    return "";
  }

  /**
   * Disegna il campo Descrizione: tendina chiusa se Fisso=Sì,
   * testo libero con suggerimenti se Fisso=No. Quando Fisso=Sì, la
   * tendina include anche un'opzione "Aggiungi nuova voce fissa..."
   * che permette di registrare una voce fissa mai vista prima senza
   * dover disattivare il toggle.
   */
  function aggiornaCampoDescrizione(fisso, valoreAttuale, opzioniFissiHtml) {
    const contenitore = document.getElementById("contenitore-descrizione");
    if (!contenitore) return;

    if (fisso) {
      contenitore.innerHTML = `
        <label for="campo-descrizione">Descrizione</label>
        <select id="campo-descrizione">
          <option value="">Seleziona una voce fissa...</option>
          ${opzioniFissiHtml}
          <option value="__nuovo__">➕ Aggiungi nuova voce fissa...</option>
        </select>
      `;
      const select = document.getElementById("campo-descrizione");
      if (valoreAttuale) select.value = valoreAttuale;

      select.addEventListener("change", function () {
        if (select.value === "__nuovo__") {
          renderizzaDescrizioneTestoLibero("", true);
        } else {
          precompilaDaNome(select.value);
        }
      });
    } else {
      renderizzaDescrizioneTestoLibero(valoreAttuale, false);
    }
  }

  /**
   * Disegna il campo Descrizione come testo libero con suggerimenti.
   * Se mostraTornaAFissi è vero (siamo arrivati qui scegliendo
   * "Aggiungi nuova voce fissa" mentre Fisso resta Sì), mostra anche
   * un link per tornare alla tendina delle voci fisse esistenti.
   */
  function renderizzaDescrizioneTestoLibero(valoreAttuale, mostraTornaAFissi) {
    const contenitore = document.getElementById("contenitore-descrizione");
    contenitore.innerHTML = `
      <label for="campo-descrizione">Descrizione</label>
      <input type="text" id="campo-descrizione" value="${escapeHtml(valoreAttuale)}" autocomplete="off" placeholder="Es. Regalo compleanno Luca">
      <div class="suggerimenti-lista" id="lista-suggerimenti"></div>
      <button type="button" class="link-torna-a-tendina ${mostraTornaAFissi ? "" : "nascosto"}" id="btn-torna-fissi">↺ Scegli da voci fisse esistenti</button>
    `;
    const input = document.getElementById("campo-descrizione");
    input.addEventListener("input", function () {
      gestisciInputDescrizione(input.value);
    });
    input.addEventListener("blur", function () {
      // Piccolo ritardo per permettere il click sul suggerimento
      setTimeout(function () {
        const lista = document.getElementById("lista-suggerimenti");
        if (lista) lista.classList.remove("visibile");
      }, 150);
    });

    if (mostraTornaAFissi) {
      const meta = Stato.getMeta();
      const btnTorna = document.getElementById("btn-torna-fissi");
      btnTorna.addEventListener("click", function () {
        const opzioniFissi = meta.nomiFissi
          .map(function (f) {
            return '<option value="' + escapeHtml(f.descrizione) + '">' + escapeHtml(f.descrizione) + "</option>";
          })
          .join("");
        aggiornaCampoDescrizione(true, "", opzioniFissi);
      });
    }
  }

  function gestisciInputDescrizione(testo) {
    clearTimeout(timeoutSuggerimenti);
    const lista = document.getElementById("lista-suggerimenti");
    if (!lista) return;

    if (!testo || testo.length < 2) {
      lista.classList.remove("visibile");
      lista.innerHTML = "";
      return;
    }

    timeoutSuggerimenti = setTimeout(async function () {
      try {
        const suggerimenti = await Api.getSuggerimenti(testo);
        mostraSuggerimenti(suggerimenti);
      } catch (err) {
        console.error("Errore nel recupero suggerimenti:", err);
      }
    }, 250);
  }

  function mostraSuggerimenti(suggerimenti) {
    const lista = document.getElementById("lista-suggerimenti");
    if (!lista) return;

    if (suggerimenti.length === 0) {
      lista.classList.remove("visibile");
      lista.innerHTML = "";
      return;
    }

    lista.innerHTML = suggerimenti
      .map(function (s, indice) {
        return `
          <div class="suggerimento-voce" data-indice="${indice}">
            <div class="nome">${escapeHtml(s.descrizione)}</div>
            <div class="dettaglio">${escapeHtml(s.categoria)} · ${escapeHtml(s.sottocategoria || "")} · ${ImportoUtil.formattaConSimbolo(s.importo)}</div>
          </div>
        `;
      })
      .join("");

    lista.classList.add("visibile");

    lista.querySelectorAll(".suggerimento-voce").forEach(function (el) {
      el.addEventListener("mousedown", function (e) {
        e.preventDefault(); // evita che il blur dell'input chiuda la lista prima del click
        const indice = parseInt(el.getAttribute("data-indice"), 10);
        const scelto = suggerimenti[indice];
        precompilaDaSuggerimento(scelto);
        lista.classList.remove("visibile");
      });
    });
  }

  /**
   * Imposta il valore di un campo "tendina con aggiunta" in modo
   * intelligente: se il valore esiste già tra le opzioni, seleziona
   * quella voce nella tendina; altrimenti passa automaticamente alla
   * modalità testo libero con quel valore (utile quando un suggerimento
   * porta una categoria non ancora presente in elenco).
   */
  function impostaValoreConAggiunta(nomeCampo, valore) {
    const select = document.getElementById("campo-" + nomeCampo);
    const testo = document.getElementById("campo-" + nomeCampo + "-testo");
    const btnTorna = document.getElementById("campo-" + nomeCampo + "-torna");
    if (!select || !testo) return;

    const esisteTraLeOpzioni = Array.prototype.some.call(select.options, function (o) {
      return o.value === valore;
    });

    if (esisteTraLeOpzioni && valore) {
      select.value = valore;
      select.classList.remove("nascosto");
      testo.classList.add("nascosto");
      if (btnTorna) btnTorna.classList.add("nascosto");
    } else {
      select.classList.add("nascosto");
      testo.classList.remove("nascosto");
      testo.value = valore || "";
      if (btnTorna) btnTorna.classList.remove("nascosto");
    }
  }

  /**
   * Precompila Tipo/Categoria/Sottocategoria da un suggerimento
   * selezionato (spesa/entrata occasionale), mantenendo intatta la
   * Descrizione scritta dall'utente. L'Importo NON viene precompilato
   * qui (per le occasionali l'importo varia quasi sempre): resta
   * comunque visibile nel suggerimento per riferimento.
   */
  function precompilaDaSuggerimento(suggerimento) {
    document.getElementById("campo-tipo").value = suggerimento.tipo;
    impostaValoreConAggiunta("categoria", suggerimento.categoria);
    renderizzaCampoConAggiunta(
      "sottocategoria", "Sottocategoria",
      Stato.getSottocategoriePerCategoria(suggerimento.categoria), suggerimento.sottocategoria || "", "Nuova sottocategoria"
    );
  }

  /**
   * Usata quando si seleziona un nome dalla tendina dei Fissi: trova
   * i dati dell'ultima occorrenza e precompila tutto, inclusa la
   * possibilità di sovrascrivere la descrizione stessa con il nome
   * scelto (per i fissi, a differenza delle occasionali, ha senso che
   * la Descrizione coincida col nome scelto). Qui l'Importo resta
   * precompilato, perché i fissi tendono a ripetersi con cifra simile.
   */
  function precompilaDaNome(nome) {
    const meta = Stato.getMeta();
    const trovato = meta.nomiFissi.find(function (f) {
      return f.descrizione === nome;
    });
    if (!trovato) return;

    document.getElementById("campo-tipo").value = trovato.tipo;
    impostaValoreConAggiunta("categoria", trovato.categoria);
    renderizzaCampoConAggiunta(
      "sottocategoria", "Sottocategoria",
      Stato.getSottocategoriePerCategoria(trovato.categoria), trovato.sottocategoria || "", "Nuova sottocategoria"
    );
    document.getElementById("campo-importo").value = ImportoUtil.formatta(trovato.importo);
  }

  /**
   * Legge il valore attualmente presente nel campo Descrizione,
   * indipendentemente dal fatto che in quel momento sia renderizzato
   * come tendina (Fisso=Sì) o come testo libero (Fisso=No).
   */
  function leggiValoreDescrizioneAttuale() {
    const campo = document.getElementById("campo-descrizione");
    if (!campo) return "";
    if (campo.tagName === "SELECT") {
      return campo.value === "__nuovo__" || campo.value === "" ? "" : campo.value;
    }
    return campo.value || "";
  }

  function collegaEventi(valoriIniziali) {
    document.getElementById("campo-fisso").addEventListener("change", function (e) {
      const meta = Stato.getMeta();
      const opzioniFissi = meta.nomiFissi
        .map(function (f) {
          return '<option value="' + escapeHtml(f.descrizione) + '">' + escapeHtml(f.descrizione) + "</option>";
        })
        .join("");
      const valoreAttuale = leggiValoreDescrizioneAttuale();

      if (e.target.checked) {
        const esisteComeFisso = meta.nomiFissi.some(function (f) { return f.descrizione === valoreAttuale; });
        if (esisteComeFisso) {
          aggiornaCampoDescrizione(true, valoreAttuale, opzioniFissi);
        } else {
          // Il testo digitato non corrisponde a nessun fisso esistente:
          // passiamo direttamente alla modalità "nuova voce fissa",
          // preservando quanto già scritto invece di cancellarlo.
          aggiornaCampoDescrizione(true, "", opzioniFissi);
          renderizzaDescrizioneTestoLibero(valoreAttuale, true);
        }
      } else {
        renderizzaDescrizioneTestoLibero(valoreAttuale, false);
      }
    });

    document.getElementById("campo-toggle-competenza").addEventListener("change", function (e) {
      const contenitore = document.getElementById("contenitore-data-competenza");
      contenitore.classList.toggle("nascosto", !e.target.checked);
    });

    document.getElementById("btn-annulla-form").addEventListener("click", chiudi);

    document.getElementById("btn-salva-form").addEventListener("click", salvaVoce);

    const btnElimina = document.getElementById("btn-elimina-form");
    if (btnElimina) {
      btnElimina.addEventListener("click", eliminaVoce);
    }
  }

  async function salvaVoce() {
    const fisso = document.getElementById("campo-fisso").checked;
    const descrizione = document.getElementById("campo-descrizione").value.trim();
    const tipo = document.getElementById("campo-tipo").value;
    const categoria = leggiValoreConAggiunta("categoria");
    const sottocategoria = leggiValoreConAggiunta("sottocategoria");
    const importoTesto = document.getElementById("campo-importo").value;
    const data = document.getElementById("campo-data").value;
    const haCompetenza = document.getElementById("campo-toggle-competenza").checked;
    const dataCompetenza = haCompetenza ? document.getElementById("campo-data-competenza").value : "";

    const importo = ImportoUtil.parsifica(importoTesto);

    if (!descrizione) {
      alert("Inserisci una descrizione.");
      return;
    }
    if (!categoria) {
      alert("Inserisci una categoria.");
      return;
    }
    if (isNaN(importo) || importo < 0) {
      alert("Inserisci un importo valido.");
      return;
    }
    if (!data) {
      alert("Inserisci una data.");
      return;
    }

    const voce = {
      descrizione: descrizione,
      tipo: tipo,
      categoria: categoria,
      sottocategoria: sottocategoria,
      importo: importo,
      fisso: fisso,
      data: data,
      dataCompetenza: dataCompetenza
    };

    const btnSalva = document.getElementById("btn-salva-form");
    btnSalva.disabled = true;
    btnSalva.textContent = "Salvataggio...";

    try {
      if (modalitaModifica) {
        voce.id = idInModifica;
        await Api.updateEntry(voce);
      } else {
        await Api.addEntry(voce);
      }
      chiudi();
      await App.ricaricaTuttoERidisegna();
    } catch (err) {
      alert("Errore durante il salvataggio: " + err.message);
      btnSalva.disabled = false;
      btnSalva.textContent = "Salva";
    }
  }

  async function eliminaVoce() {
    const confermato = confirm("Sei sicuro di voler eliminare questa voce?");
    if (!confermato) return;

    const btnElimina = document.getElementById("btn-elimina-form");
    btnElimina.disabled = true;
    btnElimina.textContent = "Eliminazione...";

    try {
      await Api.deleteEntry(idInModifica);
      chiudi();
      await App.ricaricaTuttoERidisegna();
    } catch (err) {
      alert("Errore durante l'eliminazione: " + err.message);
      btnElimina.disabled = false;
      btnElimina.textContent = "Elimina";
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
    inizializza: inizializza,
    apriPerNuovaVoce: apriPerNuovaVoce,
    apriPerModifica: apriPerModifica,
    chiudi: chiudi
  };
})();
