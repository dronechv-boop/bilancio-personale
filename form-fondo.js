// ============================================================
// FORM FONDO - Form di inserimento/modifica per la vista Fondo
// ============================================================

const FormFondo = (function () {
  let elementoContenitore = null;
  let modalitaModifica = false;
  let idInModifica = null;

  function inizializza(contenitore) {
    elementoContenitore = contenitore;
  }

  /**
   * Apre il form vuoto per una nuova voce. Il Versato viene
   * precompilato con l'ultimo valore cumulativo registrato (dato che
   * è cumulativo, l'utente deve solo aggiustarlo aggiungendo quanto
   * versato di recente, invece di ricalcolarlo da zero).
   */
  function apriPerNuovaVoce(ultimoVersato) {
    modalitaModifica = false;
    idInModifica = null;
    renderizzaForm({
      data: DateUtil.oggiStringa(),
      versato: ultimoVersato !== undefined ? ImportoUtil.formatta(ultimoVersato) : "",
      valore: "",
      controvalore: ""
    });
    apri();
  }

  function apriPerModifica(voce) {
    modalitaModifica = true;
    idInModifica = voce.id;
    renderizzaForm({
      data: voce.data,
      versato: ImportoUtil.formatta(voce.versato),
      valore: ImportoUtil.formatta(voce.valore),
      controvalore: ImportoUtil.formatta(voce.controvalore)
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
    elementoContenitore.innerHTML = `
      <div class="form-voce">
        <div class="campo">
          <label for="campo-fondo-data">Data</label>
          <input type="date" id="campo-fondo-data" value="${valori.data}">
        </div>
        <div class="campo">
          <label for="campo-fondo-versato">Versato totale (cumulativo)</label>
          <input type="text" id="campo-fondo-versato" value="${escapeHtml(valori.versato)}" inputmode="decimal" placeholder="0,00">
        </div>
        <div class="campo">
          <label for="campo-fondo-valore">Valore</label>
          <input type="text" id="campo-fondo-valore" value="${escapeHtml(valori.valore)}" inputmode="decimal" placeholder="0,00">
        </div>
        <div class="campo">
          <label for="campo-fondo-controvalore">Controvalore</label>
          <input type="text" id="campo-fondo-controvalore" value="${escapeHtml(valori.controvalore)}" inputmode="decimal" placeholder="0,00">
        </div>
        <div class="azioni-form">
          <button type="button" class="btn-annulla" id="btn-fondo-annulla">Annulla</button>
          ${modalitaModifica ? '<button type="button" class="btn-elimina" id="btn-fondo-elimina">Elimina</button>' : ""}
          <button type="button" class="btn-salva" id="btn-fondo-salva">Salva</button>
        </div>
      </div>
    `;

    document.getElementById("btn-fondo-annulla").addEventListener("click", chiudi);
    document.getElementById("btn-fondo-salva").addEventListener("click", salva);
    const btnElimina = document.getElementById("btn-fondo-elimina");
    if (btnElimina) btnElimina.addEventListener("click", elimina);
  }

  async function salva() {
    const data = document.getElementById("campo-fondo-data").value;
    const versato = ImportoUtil.parsifica(document.getElementById("campo-fondo-versato").value);
    const valore = ImportoUtil.parsifica(document.getElementById("campo-fondo-valore").value);
    const controvalore = ImportoUtil.parsifica(document.getElementById("campo-fondo-controvalore").value);

    if (!data) { alert("Inserisci una data."); return; }
    if (isNaN(versato) || versato < 0) { alert("Inserisci un Versato valido."); return; }
    if (isNaN(valore) || valore < 0) { alert("Inserisci un Valore valido."); return; }
    if (isNaN(controvalore) || controvalore < 0) { alert("Inserisci un Controvalore valido."); return; }

    const voce = { data: data, versato: versato, valore: valore, controvalore: controvalore };

    const btnSalva = document.getElementById("btn-fondo-salva");
    btnSalva.disabled = true;
    btnSalva.textContent = "Salvataggio...";

    try {
      if (modalitaModifica) {
        voce.id = idInModifica;
        await Api.updateFondoEntry(voce);
      } else {
        await Api.addFondoEntry(voce);
      }
      chiudi();
      await Fondo.ricaricaERidisegna();
    } catch (err) {
      alert("Errore durante il salvataggio: " + err.message);
      btnSalva.disabled = false;
      btnSalva.textContent = "Salva";
    }
  }

  async function elimina() {
    const confermato = confirm("Sei sicuro di voler eliminare questa voce?");
    if (!confermato) return;

    const btnElimina = document.getElementById("btn-fondo-elimina");
    btnElimina.disabled = true;
    btnElimina.textContent = "Eliminazione...";

    try {
      await Api.deleteFondoEntry(idInModifica);
      chiudi();
      await Fondo.ricaricaERidisegna();
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
