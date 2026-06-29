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

        <div class="campo">
          <label for="campo-categoria">Categoria</label>
          <input type="text" id="campo-categoria" value="${escapeHtml(valori.categoria)}" list="lista-categorie" autocomplete="off">
          <datalist id="lista-categorie">
            ${meta.liste.categorie.map(function (c) { return '<option value="' + escapeHtml(c) + '">'; }).join("")}
          </datalist>
        </div>

        <div class="campo">
          <label for="campo-sottocategoria">Sottocategoria</label>
          <input type="text" id="campo-sottocategoria" value="${escapeHtml(valori.sottocategoria)}" list="lista-sottocategorie" autocomplete="off">
          <datalist id="lista-sottocategorie">
            ${meta.liste.sottocategorie.map(function (s) { return '<option value="' + escapeHtml(s) + '">'; }).join("")}
          </datalist>
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
    collegaEventi(valori);
  }

  /**
   * Disegna il campo Descrizione: tendina chiusa se Fisso=Sì,
   * testo libero con suggerimenti se Fisso=No.
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
        </select>
      `;
      const select = document.getElementById("campo-descrizione");
      if (valoreAttuale) select.value = valoreAttuale;

      select.addEventListener("change", function () {
        precompilaDaNome(select.value);
      });
    } else {
      contenitore.innerHTML = `
        <label for="campo-descrizione">Descrizione</label>
        <input type="text" id="campo-descrizione" value="${escapeHtml(valoreAttuale)}" autocomplete="off" placeholder="Es. Regalo compleanno Luca">
        <div class="suggerimenti-lista" id="lista-suggerimenti"></div>
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
   * Precompila Tipo/Categoria/Sottocategoria/Importo da un suggerimento
   * selezionato, mantenendo intatta la Descrizione scritta dall'utente.
   */
  function precompilaDaSuggerimento(suggerimento) {
    document.getElementById("campo-tipo").value = suggerimento.tipo;
    document.getElementById("campo-categoria").value = suggerimento.categoria;
    document.getElementById("campo-sottocategoria").value = suggerimento.sottocategoria || "";
    document.getElementById("campo-importo").value = ImportoUtil.formatta(suggerimento.importo);
  }

  /**
   * Usata quando si seleziona un nome dalla tendina dei Fissi: trova
   * i dati dell'ultima occorrenza e precompila tutto, inclusa la
   * possibilità di sovrascrivere la descrizione stessa con il nome
   * scelto (per i fissi, a differenza delle occasionali, ha senso che
   * la Descrizione coincida col nome scelto).
   */
  function precompilaDaNome(nome) {
    const meta = Stato.getMeta();
    const trovato = meta.nomiFissi.find(function (f) {
      return f.descrizione === nome;
    });
    if (!trovato) return;

    document.getElementById("campo-tipo").value = trovato.tipo;
    document.getElementById("campo-categoria").value = trovato.categoria;
    document.getElementById("campo-sottocategoria").value = trovato.sottocategoria || "";
    document.getElementById("campo-importo").value = ImportoUtil.formatta(trovato.importo);
  }

  function collegaEventi(valoriIniziali) {
    document.getElementById("campo-fisso").addEventListener("change", function (e) {
      const meta = Stato.getMeta();
      const opzioniFissi = meta.nomiFissi
        .map(function (f) {
          return '<option value="' + escapeHtml(f.descrizione) + '">' + escapeHtml(f.descrizione) + "</option>";
        })
        .join("");
      aggiornaCampoDescrizione(e.target.checked, "", opzioniFissi);
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
    const categoria = document.getElementById("campo-categoria").value.trim();
    const sottocategoria = document.getElementById("campo-sottocategoria").value.trim();
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
