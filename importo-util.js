// ============================================================
// IMPORTO - Utility per parsing e formattazione valori monetari
// ============================================================

const ImportoUtil = (function () {
  /**
   * Converte una stringa inserita dall'utente (con virgola o punto come
   * separatore decimale) in un numero JavaScript puro. Ritorna NaN se
   * il testo non è un numero valido.
   */
  function parsifica(testo) {
    if (typeof testo === "number") return testo;
    if (!testo) return NaN;
    const normalizzato = String(testo).trim().replace(",", ".");
    return parseFloat(normalizzato);
  }

  /**
   * Formatta un numero come stringa in formato italiano con simbolo €,
   * es. 1234.5 -> "1.234,50 €"
   */
  function formattaConSimbolo(numero) {
    return formatta(numero) + " €";
  }

  /**
   * Formatta un numero come stringa in formato italiano, senza simbolo,
   * es. 1234.5 -> "1.234,50"
   */
  function formatta(numero) {
    return numero.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Formatta un numero con segno esplicito (+/-) e simbolo €, usato
   * per le righe della lista movimenti. Es: +900,00 € oppure -45,00 €
   */
  function formattaConSegno(numero, tipo) {
    const segno = tipo === "Entrata" ? "+" : "-";
    return segno + formattaConSimbolo(Math.abs(numero));
  }

  return {
    parsifica: parsifica,
    formatta: formatta,
    formattaConSimbolo: formattaConSimbolo,
    formattaConSegno: formattaConSegno
  };
})();
