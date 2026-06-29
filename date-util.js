// ============================================================
// DATE - Utility per gestire le date senza problemi di fuso orario
// ============================================================
//
// Regola seguita ovunque nell'app: le date viaggiano sempre come
// stringhe "YYYY-MM-DD", mai come oggetti Date serializzati. Gli
// oggetti Date si usano solo internamente per confronti/calcoli,
// e sempre costruiti a partire dai componenti locali (anno/mese/giorno),
// mai da conversioni UTC implicite (es. mai new Date().toISOString()).

const DateUtil = (function () {
  const NOMI_MESI = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  const NOMI_MESI_BREVI = [
    "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
    "Lug", "Ago", "Set", "Ott", "Nov", "Dic"
  ];

  /**
   * Ritorna la data di oggi come stringa YYYY-MM-DD, usando i componenti
   * LOCALI del dispositivo (non UTC), per evitare lo sfasamento di un
   * giorno tipico di new Date().toISOString().
   */
  function oggiStringa() {
    const ora = new Date();
    return formattaComponenti(ora.getFullYear(), ora.getMonth() + 1, ora.getDate());
  }

  function formattaComponenti(anno, mese, giorno) {
    const meseStr = String(mese).padStart(2, "0");
    const giornoStr = String(giorno).padStart(2, "0");
    return anno + "-" + meseStr + "-" + giornoStr;
  }

  /**
   * Estrae { anno, mese, giorno } da una stringa YYYY-MM-DD.
   * mese è 1-12 (non 0-11), per evitare confusione nel resto del codice.
   */
  function scomponi(stringaData) {
    const parti = stringaData.split("-");
    return {
      anno: parseInt(parti[0], 10),
      mese: parseInt(parti[1], 10),
      giorno: parseInt(parti[2], 10)
    };
  }

  /**
   * Formatta una stringa YYYY-MM-DD nel formato italiano GG/MM/AAAA,
   * per la visualizzazione nella UI.
   */
  function formattaPerVisualizzazione(stringaData) {
    if (!stringaData) return "";
    const c = scomponi(stringaData);
    return String(c.giorno).padStart(2, "0") + "/" +
      String(c.mese).padStart(2, "0") + "/" + c.anno;
  }

  function nomeMese(numeroMese, breve) {
    const indice = numeroMese - 1;
    return breve ? NOMI_MESI_BREVI[indice] : NOMI_MESI[indice];
  }

  /**
   * Confronta due stringhe YYYY-MM-DD. Funziona per confronto diretto
   * perché il formato è già ordinabile lessicograficamente.
   */
  function confronta(dataA, dataB) {
    return dataA.localeCompare(dataB);
  }

  return {
    oggiStringa: oggiStringa,
    scomponi: scomponi,
    formattaComponenti: formattaComponenti,
    formattaPerVisualizzazione: formattaPerVisualizzazione,
    nomeMese: nomeMese,
    confronta: confronta,
    NOMI_MESI: NOMI_MESI,
    NOMI_MESI_BREVI: NOMI_MESI_BREVI
  };
})();
