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

  // Tri-estado: true/false/null(aún no disponible para apostar). Se usa en
  // celdas de tabla compactas (admin, transparencia).
  function boolLabel(v) {
    if (v === null || v === undefined) return "-";
    return v ? "Sí" : "No";
  }

  // Versión verbosa para líneas de detalle (mis apuestas): deja explícito que
  // "no disponible" no es lo mismo que haber apostado "No".
  function predictionLabel(v) {
    if (v === null || v === undefined) return "No disponible";
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

  // Estado de un partido respecto a las apuestas: abierta / bloqueada / cerrada
  function matchStatus(match) {
    if (match.fullTimeResult) return { label: "Cerrada", cls: "closed" };
    if (minutesUntil(match.matchDate) <= CONFIG.CIERRE_MINUTOS) return { label: "Bloqueada", cls: "locked" };
    return { label: "Abierta", cls: "pending" };
  }

  // Panel reutilizable: un partido + la tabla de pronósticos de todos los que apostaron.
  // Se usa tanto en /admin (todos los partidos) como en clasifica.html (solo los bloqueados/cerrados,
  // para que sea transparente cómo apostó cada quien una vez que ya no se puede cambiar el pronóstico).
  function renderMatchBetsPanel(match, bets) {
    const status = matchStatus(match);
    const finished = !!match.fullTimeResult;

    const sortedBets = bets
      .slice()
      .sort((a, b) => (a.user.fullName || "").localeCompare(b.user.fullName || ""));

    const rowsHtml = sortedBets
      .map((bet) => {
        const isDraw = (bet.fullTimePrediction || "").toUpperCase() === "X";
        return `
          <tr>
            <td>${bet.user.fullName}</td>
            <td>${resultLabel(bet.fullTimePrediction, match.homeTeam, match.awayTeam)}</td>
            <td>${isDraw ? teamLabel(bet.qualifiedTeamPrediction, match.homeTeam, match.awayTeam) : "-"}</td>
            <td class="num">${bet.homeGoalsPrediction}-${bet.awayGoalsPrediction}</td>
            <td class="num">${boolLabel(bet.penaltyPrediction)}</td>
            <td class="num">${boolLabel(bet.yellowCardPrediction)}</td>
            <td class="num">${boolLabel(bet.redCardPrediction)}</td>
            ${finished ? `<td class="num">${bet.pointsEarned}</td>` : ""}
          </tr>
        `;
      })
      .join("");

    const card = document.createElement("div");
    card.className = "panel bet-row";
    card.innerHTML = `
      <div class="bet-row-top">
        <span class="teams">${match.homeTeam} vs ${match.awayTeam}</span>
        <span class="status-tag ${status.cls}">${status.label}</span>
      </div>
      <div class="bet-details">
        <span>Fecha: ${formatDateTime(match.matchDate)}</span>
        ${finished ? `<span>Resultado real: ${resultLabel(match.fullTimeResult, match.homeTeam, match.awayTeam)} (${match.homeGoals}-${match.awayGoals})</span>` : ""}
      </div>
      ${
        sortedBets.length
          ? `<div class="mini-table-wrap"><table>
              <thead><tr>
                <th>Usuario</th><th>Resultado</th><th>Clasifica</th>
                <th class="num">Marcador</th><th class="num">Penal</th>
                <th class="num">Amarilla</th><th class="num">Roja</th>
                ${finished ? `<th class="num">Puntos</th>` : ""}
              </tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table></div>`
          : `<p class="empty-state">Nadie ha apostado aún.</p>`
      }
    `;
    return card;
  }

  return {
    showMessage,
    clearMessage,
    formatDateTime,
    minutesUntil,
    shortCode,
    boolLabel,
    predictionLabel,
    resultLabel,
    teamLabel,
    hitBadge,
    bindLogout,
    paintUserBadge,
    matchStatus,
    renderMatchBetsPanel
  };
})();
