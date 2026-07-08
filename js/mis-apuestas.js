// mis-apuestas.js
// Lista las apuestas del usuario: pendientes primero, cerradas al final con
// el detalle de puntos ganados y qué predicciones acertó.

(function () {
  const session = AUTH.requireAuth();
  if (!session) return;

  UI.paintUserBadge("userName", session);
  UI.bindLogout();

  const msgEl = document.getElementById("msg");
  const pendingEl = document.getElementById("pendingList");
  const closedEl = document.getElementById("closedList");

  function computeHits(bet, match) {
    const isDraw = (match.fullTimeResult || "").toUpperCase() === "X";

    const resultHit =
      bet.fullTimePrediction.toUpperCase() === (match.fullTimeResult || "").toUpperCase();

    const qualifiedApplies = isDraw;
    const qualifiedHit =
      isDraw &&
      (bet.qualifiedTeamPrediction || "").toUpperCase() ===
        (match.qualifiedTeam || "").toUpperCase();

    const scoreHit =
      bet.homeGoalsPrediction === match.homeGoals && bet.awayGoalsPrediction === match.awayGoals;

    const penaltyHit = bet.penaltyPrediction === match.penaltyAwarded;
    const yellowHit = bet.yellowCardPrediction === match.yellowCard;
    const redHit = bet.redCardPrediction === match.redCard;

    return { resultHit, qualifiedApplies, qualifiedHit, scoreHit, penaltyHit, yellowHit, redHit };
  }

  function renderPending(bet, match) {
    const row = document.createElement("div");
    row.className = "panel bet-row";
    row.innerHTML = `
      <div class="bet-row-top">
        <span class="teams">${match.homeTeam} vs ${match.awayTeam}</span>
        <span class="status-tag pending">Pendiente</span>
      </div>
      <div class="bet-details">
        <span>Fecha: ${UI.formatDateTime(match.matchDate)}</span>
        <span>Tu resultado: ${UI.resultLabel(bet.fullTimePrediction, match.homeTeam, match.awayTeam)}</span>
        <span>Marcador: ${bet.homeGoalsPrediction} - ${bet.awayGoalsPrediction}</span>
        <span>Penal: ${UI.boolLabel(bet.penaltyPrediction)}</span>
        <span>Amarilla: ${UI.boolLabel(bet.yellowCardPrediction)}</span>
        <span>Roja: ${UI.boolLabel(bet.redCardPrediction)}</span>
      </div>
    `;
    return row;
  }

  function renderClosed(bet, match) {
    const hits = computeHits(bet, match);
    const row = document.createElement("div");
    row.className = "panel bet-row";
    row.innerHTML = `
      <div class="bet-row-top">
        <span class="teams">${match.homeTeam} vs ${match.awayTeam}</span>
        <span class="status-tag closed">Cerrada</span>
      </div>
      <div class="bet-details">
        <span>Fecha: ${UI.formatDateTime(match.matchDate)}</span>
        <span>Resultado real: ${UI.resultLabel(match.fullTimeResult, match.homeTeam, match.awayTeam)} (${match.homeGoals}-${match.awayGoals})</span>
        <span class="points-total">Puntos: ${bet.pointsEarned}</span>
      </div>
      <div class="hits">
        ${UI.hitBadge(hits.resultHit, "Resultado")}
        ${hits.qualifiedApplies ? UI.hitBadge(hits.qualifiedHit, "Clasificado") : `<span class="hit">— Clasificado (no aplicó)</span>`}
        ${UI.hitBadge(hits.scoreHit, "Marcador exacto")}
        ${UI.hitBadge(hits.penaltyHit, "Penal")}
        ${UI.hitBadge(hits.yellowHit, "Amarilla")}
        ${UI.hitBadge(hits.redHit, "Roja")}
      </div>
    `;
    return row;
  }

  async function load() {
    pendingEl.innerHTML = `<p class="empty-state">Cargando…</p>`;
    closedEl.innerHTML = "";
    try {
      const [bets, matches] = await Promise.all([
        API.getBetsByUser(session.userId),
        API.getMatches()
      ]);
      const matchById = new Map(matches.map((m) => [m.id, m]));

      const withMatch = bets
        .map((b) => ({ bet: b, match: matchById.get(b.match.id) }))
        .filter((x) => x.match);

      const pending = withMatch
        .filter((x) => !x.match.fullTimeResult)
        .sort((a, b) => new Date(a.match.matchDate) - new Date(b.match.matchDate));

      const closed = withMatch
        .filter((x) => !!x.match.fullTimeResult)
        .sort((a, b) => new Date(b.match.matchDate) - new Date(a.match.matchDate));

      pendingEl.innerHTML = "";
      if (!pending.length) {
        pendingEl.innerHTML = `<p class="empty-state panel">No tienes apuestas pendientes.</p>`;
      } else {
        pending.forEach((x) => pendingEl.appendChild(renderPending(x.bet, x.match)));
      }

      closedEl.innerHTML = "";
      if (!closed.length) {
        closedEl.innerHTML = `<p class="empty-state panel">Aún no tienes apuestas cerradas.</p>`;
      } else {
        closed.forEach((x) => closedEl.appendChild(renderClosed(x.bet, x.match)));
      }
    } catch (err) {
      UI.showMessage(msgEl, "No se pudieron cargar tus apuestas.", "error");
      pendingEl.innerHTML = "";
    }
  }

  load();
})();