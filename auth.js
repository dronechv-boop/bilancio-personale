// ============================================================
// AUTH - Login con Google e verifica dell'email autorizzata
// ============================================================
//
// Usa Google Identity Services (libreria moderna e supportata,
// non la vecchia gapi.auth2 deprecata). Mostra un bottone "Accedi
// con Google" e, una volta autenticato, verifica che l'email
// corrisponda esattamente a quella autorizzata (impostata in
// config.js). Se corrisponde, salva lo stato di accesso e mostra
// l'app; altrimenti blocca con un messaggio chiaro.

const Auth = (function () {
  const CHIAVE_SESSIONE = "bilancio_autenticato";

  function decodificaJwt(token) {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payloadJson = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(payloadJson);
  }

  let giaGestito = false;

  function gestisciRisposta(risposta) {
    if (giaGestito) {
      console.log("[AUTH] Risposta Google ignorata (già gestita in precedenza)");
      return;
    }
    giaGestito = true;

    console.log("[AUTH] Risposta Google ricevuta");
    const payload = decodificaJwt(risposta.credential);
    const emailVerificata = payload.email_verified === true || payload.email_verified === "true";
    const emailCorrisponde = payload.email && payload.email.toLowerCase() === EMAIL_AUTORIZZATA.toLowerCase();
    console.log("[AUTH] Email verificata:", emailVerificata, "- corrisponde:", emailCorrisponde);

    if (emailVerificata && emailCorrisponde) {
      sessionStorage.setItem(CHIAVE_SESSIONE, "true");
      console.log("[AUTH] Chiamo mostraApp()");
      mostraApp();
    } else {
      giaGestito = false; // permette un nuovo tentativo se l'email non era quella giusta
      mostraErroreAccessoNegato(payload.email);
    }
  }

  function mostraErroreAccessoNegato(emailUsata) {
    const contenitore = document.getElementById("schermata-login");
    const messaggio = document.getElementById("messaggio-login-errore");
    if (messaggio) {
      messaggio.textContent = "Accesso non consentito per " + emailUsata + ". Accedi con l'account autorizzato.";
      messaggio.classList.remove("nascosto");
    }
  }

  function mostraApp() {
    console.log("[AUTH] mostraApp() eseguito, nascondo login, mostro app");
    document.getElementById("schermata-login").classList.add("nascosto");
    document.getElementById("app-contenitore").classList.remove("nascosto");
    if (window.App && typeof window.App.inizializza === "function") {
      console.log("[AUTH] Chiamo App.inizializza()");
      window.App.inizializza()
        .then(function () { console.log("[AUTH] App.inizializza() completato con successo"); })
        .catch(function (err) { console.log("[AUTH] ERRORE in App.inizializza():", err); });
    } else {
      console.log("[AUTH] App.inizializza non disponibile!", window.App);
    }
  }

  function mostraLogin() {
    document.getElementById("schermata-login").classList.remove("nascosto");
    document.getElementById("app-contenitore").classList.add("nascosto");
  }

  function eraGiaAutenticato() {
    return sessionStorage.getItem(CHIAVE_SESSIONE) === "true";
  }

  function inizializza() {
    if (eraGiaAutenticato()) {
      mostraApp();
      return;
    }

    mostraLogin();
    attendiLibreriaGoogleEPoiInizializza();
  }

  /**
   * La libreria Google Identity Services si carica in modo asincrono
   * (script con async/defer). Se auth.js viene eseguito prima che lo
   * script esterno sia pronto, l'oggetto globale "google" non esiste
   * ancora. Questa funzione attende, riprovando ogni 100ms, finché
   * l'oggetto non è disponibile (con un limite massimo di tentativi
   * per evitare un ciclo infinito in caso di problemi di rete).
   */
  function attendiLibreriaGoogleEPoiInizializza() {
    let tentativi = 0;
    const massimoTentativi = 50; // 50 x 100ms = 5 secondi massimo

    const intervallo = setInterval(function () {
      tentativi++;
      const pronta = typeof google !== "undefined" && google.accounts && google.accounts.id;

      if (pronta) {
        clearInterval(intervallo);
        inizializzaLibreriaGoogle();
      } else if (tentativi >= massimoTentativi) {
        clearInterval(intervallo);
        mostraErroreLibreriaNonCaricata();
      }
    }, 100);
  }

  function mostraErroreLibreriaNonCaricata() {
    const messaggio = document.getElementById("messaggio-login-errore");
    if (messaggio) {
      messaggio.textContent = "Impossibile caricare il servizio di accesso Google. Controlla la connessione e ricarica la pagina.";
      messaggio.classList.remove("nascosto");
    }
  }

  function inizializzaLibreriaGoogle() {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: gestisciRisposta
    });

    google.accounts.id.renderButton(
      document.getElementById("bottone-google-signin"),
      { theme: "outline", size: "large", text: "signin_with", locale: "it" }
    );

    // Mostra anche il prompt "One Tap" se l'utente ha già una sessione Google attiva
    google.accounts.id.prompt();
  }

  return {
    inizializza: inizializza
  };
})();

document.addEventListener("DOMContentLoaded", function () {
  Auth.inizializza();
});
