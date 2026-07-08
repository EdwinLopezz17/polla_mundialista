(function () {
  const session = AUTH.requireAuth();
  if (!session) return;

  UI.paintUserBadge("userName", session);
  UI.bindLogout();

  const listEl = document.getElementById("matchList");
  const msgEl = document.getElementById("msg");

  let myBets = []; // bets ya registrados por el usuario, indexados por matchId

  function betForMatch(matchId) {
    return myBets.find((b) => b.match && b.match.id === matchId);
  }

  function renderCard(match) {
    const existing = betForMatch(match.id);
    const minsLeft = UI.minutesUntil(match.matchDate);

    const card = document.createElement("div");
    card.className = "panel match-card";
    card.dataset.matchId = match.id;

    card.innerHTML = `
      <div class="match-title">
        <span class="teams">${match.homeTeam} vs ${match.awayTeam}</span>
        <span class="when">${UI.formatDateTime(match.matchDate)} · cierra en ${minsLeft - CONFIG.CIERRE_MINUTOS >= 0 ? minsLeft - CONFIG.CIERRE_MINUTOS : 0} min${existing ? '<span class="saved-tag">· pronóstico guardado</span>' : ""}</span>
      </div>
      <form class="bet-form" data-match-id="${match.id}">
        <div class="f">
          <label>Resultado final</label>
          <select name="fullTimePrediction" required>
            <option value="1">Gana ${match.homeTeam}</option>
            <option value="X">Empate</option>
            <option value="2">Gana ${match.awayTeam}</option>
          </select>
        </div>
        <div class="f">
          <label>Si empata, clasifica</label>
          <select name="qualifiedTeamPrediction" required>
            <option value="1">${match.homeTeam}</option>
            <option value="2">${match.awayTeam}</option>
          </select>
        </div>
        <div class="f">
          <label>Marcador exacto</label>
          <div class="score-pair">
            <input type="number" min="0" step="1" inputmode="numeric" name="homeGoalsPrediction" required placeholder="0">
            <span>-</span>
            <input type="number" min="0" step="1" inputmode="numeric" name="awayGoalsPrediction" required placeholder="0">
          </div>
        </div>
        <div class="f">
          <label>¿Habrá penal?</label>
          <select name="penaltyPrediction" required>
            <option value="false">No</option>
            <option value="true">Sí</option>
          </select>
        </div>
        <div class="f">
          <label>¿Tarjeta amarilla?</label>
          <select name="yellowCardPrediction" required>
            <option value="false">No</option>
            <option value="true">Sí</option>
          </select>
        </div>
        <div class="f">
          <label>¿Tarjeta roja?</label>
          <select name="redCardPrediction" required>
            <option value="false">No</option>
            <option value="true">Sí</option>
          </select>
        </div>
        <div class="f save-col">
          <label>&nbsp;</label>
          <button type="submit" class="primary">${existing ? "Actualizar" : "Guardar"}</button>
        </div>
      </form>
    `;

    if (existing) {
      const form = card.querySelector("form");
      form.fullTimePrediction.value = existing.fullTimePrediction;
      form.qualifiedTeamPrediction.value = existing.qualifiedTeamPrediction;
      form.homeGoalsPrediction.value = existing.homeGoalsPrediction;
      form.awayGoalsPrediction.value = existing.awayGoalsPrediction;
      form.penaltyPrediction.value = String(existing.penaltyPrediction);
      form.yellowCardPrediction.value = String(existing.yellowCardPrediction);
      form.redCardPrediction.value = String(existing.redCardPrediction);
    }

    const form = card.querySelector("form");
    syncQualified(form); // deja el "clasifica" en el estado correcto desde el inicio
    form.fullTimePrediction.addEventListener("change", () => syncQualified(form));
    sanitizeGoalsInput(form.homeGoalsPrediction);
    sanitizeGoalsInput(form.awayGoalsPrediction);
    form.addEventListener("submit", onSaveBet);
    return card;
  }

  // Solo permite dígitos: elimina en vivo cualquier signo "-" o punto decimal
  // que el usuario intente escribir en el marcador.
  function sanitizeGoalsInput(input) {
    input.addEventListener("input", () => {
      const cleaned = input.value.replace(/[^0-9]/g, "");
      if (input.value !== cleaned) input.value = cleaned;
    });
    input.addEventListener("keydown", (e) => {
      if (["-", "+", "e", "E", "."].includes(e.key)) {
        e.preventDefault();
      }
    });
  }

  // Si el resultado es 1 o 2, el clasificado es obligatoriamente ese mismo equipo
  // y el select se bloquea. Solo con empate (X) el usuario elige quién clasifica.
  function syncQualified(form) {
    const result = form.fullTimePrediction.value;
    const qualifiedSelect = form.qualifiedTeamPrediction;

    if (result === "1" || result === "2") {
      qualifiedSelect.value = result;
      qualifiedSelect.disabled = true;
    } else {
      qualifiedSelect.disabled = false;
    }
  }

  async function onSaveBet(e) {
    e.preventDefault();
    UI.clearMessage(msgEl);
    const form = e.target;
    const matchId = Number(form.dataset.matchId);
    const btn = form.querySelector("button[type=submit]");
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Guardando…";

    const payload = {
      user: { id: session.userId },
      match: { id: matchId },
      fullTimePrediction: form.fullTimePrediction.value,
      qualifiedTeamPrediction: form.qualifiedTeamPrediction.value,
      homeGoalsPrediction: Number(form.homeGoalsPrediction.value),
      awayGoalsPrediction: Number(form.awayGoalsPrediction.value),
      penaltyPrediction: form.penaltyPrediction.value === "true",
      yellowCardPrediction: form.yellowCardPrediction.value === "true",
      redCardPrediction: form.redCardPrediction.value === "true"
    };

    try {
      const saved = await API.saveBet(payload);
      const idx = myBets.findIndex((b) => b.match && b.match.id === matchId);
      if (idx >= 0) myBets[idx] = saved;
      else myBets.push(saved);
      UI.showMessage(msgEl, "Pronóstico guardado correctamente.", "success");
      btn.textContent = "Actualizar";
    } catch (err) {
      UI.showMessage(msgEl, "No se pudo guardar el pronóstico. Intenta de nuevo.", "error");
      btn.textContent = originalLabel;
    } finally {
      btn.disabled = false;
    }
  }

  async function load() {
    listEl.innerHTML = `<p class="empty-state">Cargando partidos…</p>`;
    try {
      const [matches, bets] = await Promise.all([
        API.getMatches(),
        API.getBetsByUser(session.userId)
      ]);
      myBets = bets;

      const available = matches
        .filter((m) => !m.fullTimeResult) // aún no jugado / cerrado
        .filter((m) => UI.minutesUntil(m.matchDate) > CONFIG.CIERRE_MINUTOS)
        .sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));

      listEl.innerHTML = "";
      if (!available.length) {
        listEl.innerHTML = `<p class="empty-state panel">No hay partidos disponibles para apostar en este momento.</p>`;
        return;
      }
      available.forEach((m) => listEl.appendChild(renderCard(m)));
    } catch (err) {
      UI.showMessage(msgEl, "No se pudieron cargar los partidos.", "error");
      listEl.innerHTML = "";
    }
  }

  load();
})();
