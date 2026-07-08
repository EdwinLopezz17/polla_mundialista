// api.js
// Toda la comunicación con el backend vive aquí. Ningún otro archivo hace fetch() directo.

const API = (() => {
  const BASE = CONFIG.API_BASE_URL;

  async function handle(res) {
    if (!res.ok) {
      let msg = `Error ${res.status}`;
      try {
        const text = await res.text();
        if (text) msg = text;
      } catch (_) {}
      throw new Error(msg);
    }
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return res.json();
    }
    return res.text();
  }

  return {
    // ---------- USERS ----------
    getUsers() {
      return fetch(`${BASE}/users`).then(handle);
    },
    getUserById(id) {
      return fetch(`${BASE}/users/${id}`).then(handle);
    },
    login(userId, pin) {
      const params = new URLSearchParams({ id: userId, pin });
      return fetch(`${BASE}/users/login?${params.toString()}`, {
        method: "POST"
      }).then(handle);
    },

    // ---------- MATCHES ----------
    getMatches() {
      return fetch(`${BASE}/matches`).then(handle);
    },

    // ---------- BETS ----------
    getAllBets() {
      return fetch(`${BASE}/bets`).then(handle);
    },
    getBetsByUser(userId) {
      return fetch(`${BASE}/bets/user/${userId}`).then(handle);
    },
    getBetsByMatch(matchId) {
      return fetch(`${BASE}/bets/match/${matchId}`).then(handle);
    },
    saveBet(betPayload) {
      return fetch(`${BASE}/bets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(betPayload)
      }).then(handle);
    },

    // ---------- REPORTS ----------
    getScoreMatrix() {
      return fetch(`${BASE}/reports/score-matrix`).then(handle);
    }
  };
})();