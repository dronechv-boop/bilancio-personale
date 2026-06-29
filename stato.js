// ============================================================
// STATO - Stato globale dell'app e logica di aggregazione
// ============================================================

const Stato = (function () {
  let tutteLeRighe = [];
  let meta = { nomiFissi: [], liste: { categorie: [], sottocategorie: [] } };

  const oggi = new Date();
  let annoSelezionato = oggi.getFullYear();
  let meseSelezionato = oggi.getMonth() + 1; // 1-12, null = "Tutto l'anno"

  let vistaAttiva = "mensile"; // "mensile" | "annuale"

  function impostaRighe(righe) {
    tutteLeRighe = righe;
  }

  function impostaMeta(nuoviMeta) {
    meta = nuoviMeta;
  }

  function getMeta() {
    return meta;
  }

  function getAnnoSelezionato() {
    return annoSelezionato;
  }

  function setAnnoSelezionato(anno) {
    annoSelezionato = anno;
  }

  function getMeseSelezionato() {
    return meseSelezionato;
  }

  function setMeseSelezionato(mese) {
    meseSelezionato = mese; // null per "Tutto l'anno"
  }

  function getVistaAttiva() {
    return vistaAttiva;
  }

  function setVistaAttiva(vista) {
    vistaAttiva = vista;
  }

  /**
   * Ritorna l'elenco degli anni distinti presenti nei dati, più l'anno
   * corrente se non già presente (per poter sempre inserire una prima
   * voce nell'anno in corso anche se non ci sono ancora dati).
   */
  function getAnniDisponibili() {
    const anni = new Set();
    tutteLeRighe.forEach(function (r) {
      anni.add(DateUtil.scomponi(r.data).anno);
    });
    anni.add(oggi.getFullYear());
    return Array.from(anni).sort(function (a, b) { return b - a; });
  }

  /**
   * Ritorna i numeri dei mesi (1-12) da mostrare come pillole per
   * l'anno selezionato. Se l'anno è l'anno corrente, nasconde i mesi
   * futuri rispetto a oggi. Se è un anno passato, mostra tutti e 12.
   */
  function getMesiDisponibili() {
    const annoCorrente = oggi.getFullYear();
    const meseCorrente = oggi.getMonth() + 1;

    if (annoSelezionato === annoCorrente) {
      const mesi = [];
      for (let m = 1; m <= meseCorrente; m++) mesi.push(m);
      return mesi;
    }
    // Anno passato (o futuro, caso limite): mostra tutti i 12 mesi
    const tutti = [];
    for (let m = 1; m <= 12; m++) tutti.push(m);
    return tutti;
  }

  /**
   * Filtra le righe per l'anno selezionato, ed eventualmente per il
   * mese selezionato (se non null). Il filtro usa sempre la Data
   * "di cassa", mai la Data Competenza (vista a cassa pura).
   */
  function righeFiltrate(anno, mese) {
    return tutteLeRighe.filter(function (r) {
      const c = DateUtil.scomponi(r.data);
      if (c.anno !== anno) return false;
      if (mese !== null && mese !== undefined && c.mese !== mese) return false;
      return true;
    });
  }

  /**
   * Calcola i totali (entrate, spese, saldo) per un insieme di righe.
   */
  function calcolaTotali(righe) {
    let entrate = 0;
    let spese = 0;
    righe.forEach(function (r) {
      if (r.tipo === "Entrata") entrate += r.importo;
      else spese += r.importo;
    });
    return { entrate: entrate, spese: spese, saldo: entrate - spese };
  }

  /**
   * Calcola il totale spese raggruppato per categoria, per un insieme
   * di righe. Ritorna un array ordinato dal più alto al più basso,
   * utile sia per il grafico a torta che per gli elenchi testuali.
   */
  function calcolaSpesePerCategoria(righe) {
    const mappa = {};
    righe.forEach(function (r) {
      if (r.tipo !== "Spesa") return;
      mappa[r.categoria] = (mappa[r.categoria] || 0) + r.importo;
    });
    return Object.keys(mappa)
      .map(function (cat) { return { categoria: cat, totale: mappa[cat] }; })
      .sort(function (a, b) { return b.totale - a.totale; });
  }

  /**
   * Calcola entrate/spese/saldo per ciascun mese di un anno (1-12),
   * utile per il grafico a barre della vista annuale.
   */
  function calcolaTotaliPerMese(anno) {
    const risultati = [];
    for (let m = 1; m <= 12; m++) {
      const righeDelMese = righeFiltrate(anno, m);
      const totali = calcolaTotali(righeDelMese);
      risultati.push(Object.assign({ mese: m }, totali));
    }
    return risultati;
  }

  return {
    impostaRighe: impostaRighe,
    impostaMeta: impostaMeta,
    getMeta: getMeta,
    getAnnoSelezionato: getAnnoSelezionato,
    setAnnoSelezionato: setAnnoSelezionato,
    getMeseSelezionato: getMeseSelezionato,
    setMeseSelezionato: setMeseSelezionato,
    getVistaAttiva: getVistaAttiva,
    setVistaAttiva: setVistaAttiva,
    getAnniDisponibili: getAnniDisponibili,
    getMesiDisponibili: getMesiDisponibili,
    righeFiltrate: righeFiltrate,
    calcolaTotali: calcolaTotali,
    calcolaSpesePerCategoria: calcolaSpesePerCategoria,
    calcolaTotaliPerMese: calcolaTotaliPerMese,
    getTutteLeRighe: function () { return tutteLeRighe; }
  };
})();
