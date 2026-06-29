// ============================================================
// API - Comunicazione con il backend Apps Script
// ============================================================

const Api = (function () {
  function costruisciUrlGet(parametri) {
    const params = new URLSearchParams(parametri);
    params.set("token", TOKEN_SEGRETO);
    return APPS_SCRIPT_URL + "?" + params.toString();
  }

  async function chiamaGet(azione, parametriExtra) {
    const parametri = Object.assign({ azione: azione }, parametriExtra || {});
    const url = costruisciUrlGet(parametri);
    const risposta = await fetch(url);
    const dati = await risposta.json();
    if (dati.errore) {
      throw new Error(dati.errore);
    }
    return dati;
  }

  async function chiamaPost(azione, corpo) {
    const url = costruisciUrlGet({ azione: azione });
    const risposta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(corpo)
    });
    const dati = await risposta.json();
    if (dati.errore) {
      throw new Error(dati.errore);
    }
    return dati;
  }

  return {
    getDati: function () {
      return chiamaGet("getDati");
    },
    getMeta: function () {
      return chiamaGet("getMeta");
    },
    getSuggerimenti: function (testo) {
      return chiamaGet("getSuggerimenti", { testo: testo });
    },
    addEntry: function (voce) {
      return chiamaPost("addEntry", voce);
    },
    updateEntry: function (voce) {
      return chiamaPost("updateEntry", voce);
    },
    deleteEntry: function (id) {
      return chiamaPost("deleteEntry", { id: id });
    }
  };
})();
