const AUTH = (() => {
  const STORAGE_KEY = "polla_session";

  function getSession() {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function setSession(user) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  function clearSession() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  // Llamar al inicio de cada página protegida (apuestas, mis-apuestas, clasifica)
  function requireAuth() {
    const session = getSession();
    if (!session) {
      window.location.href = "index.html";
      return null;
    }
    return session;
  }

  function logout() {
    clearSession();
    window.location.href = "index.html";
  }

  return { getSession, setSession, clearSession, requireAuth, logout };
})();