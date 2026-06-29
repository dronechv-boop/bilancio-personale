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

  function gestisciRisposta(risposta) {
    const payload = decodificaJwt(risposta.credential);
    const emailVerificata = payload.email_verified === true || payload.email_verified === "true";
    const emailCorrisponde = payload.email && payload.email.toLowerCase() === EMAIL_AUTORIZZATA.toLowerCase();

    if (emailVerificata && emailCorrisponde) {
      sessionStorage.setItem(CHIAVE_SESSIONE, "true");
      mostraApp();
    } else {
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
    document.getElementById("schermata-login").classList.add("nascosto");
    document.getElementById("app-contenitore").classList.remove("nascosto");
    if (window.App && typeof window.App.inizializza === "function") {
      window.App.inizializza();
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
