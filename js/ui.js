// ui.js
// Utilidades de presentación compartidas por todas las páginas.

const UI = (() => {
  function showMessage(el, text, type = "info") {
    if (!el) return;
    el.textContent = text;
    el.className = `msg msg-${type}`;
    el.hidden = false;
  }

  function clearMessage(el) {
    if (!el) return;
    el.hidden = true;
    el.textContent = "";
  }

  function formatDateTime(isoString) {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const opts = {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    };
    return d.toLocaleString("es-PE", opts);
  }

  function minutesUntil(isoString) {
    const diffMs = new Date(isoString).getTime() - Date.now();
    return Math.floor(diffMs / 60000);
  }

  // "Argentina vs Noruega" -> "ARG-NOR"
  function shortCode(opponents) {
    const parts = opponents.split(" vs ").map((p) => p.trim());
    if (parts.length !== 2) return opponents.slice(0, 7).toUpperCase();
    const abbr = (s) => s.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
    return `${abbr(parts[0])}-${abbr(parts[1])}`;
  }

  function boolLabel(v) {
    return v ? "Sí" : "No";
  }

  function resultLabel(code, homeTeam, awayTeam) {
    if (code === "1") return `Gana ${homeTeam}`;
    if (code === "2") return `Gana ${awayTeam}`;
    if (code && code.toUpperCase() === "X") return "Empate";
    return "-";
  }

  // Dado "1"/"2", devuelve el nombre del equipo (para mostrar a quién eligió como clasificado)
  function teamLabel(code, homeTeam, awayTeam) {
    if (code === "1") return homeTeam;
    if (code === "2") return awayTeam;
    return "-";
  }

  // Marca de acierto en escala de grises (sin colores, solo peso/opacidad).
  // Si acertó y se le pasan los puntos que valía esa categoría, los muestra: "✓ Resultado (+4)"
  function hitBadge(isHit, label, points) {
    const cls = isHit ? "hit hit-yes" : "hit hit-no";
    const symbol = isHit ? "✓" : "✗";
    const suffix = isHit && points ? ` (+${points})` : "";
    return `<span class="${cls}" title="${label}">${symbol} ${label}${suffix}</span>`;
  }

  function bindLogout(buttonId = "btnLogout") {
    const btn = document.getElementById(buttonId);
    if (btn) btn.addEventListener("click", () => AUTH.logout());
  }

  function paintUserBadge(elId, session) {
    const el = document.getElementById(elId);
    if (el && session) el.textContent = session.fullName;
  }

  return {
    showMessage,
    clearMessage,
    formatDateTime,
    minutesUntil,
    shortCode,
    boolLabel,
    resultLabel,
    teamLabel,
    hitBadge,
    bindLogout,
    paintUserBadge
  };
})();