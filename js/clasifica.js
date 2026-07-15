(function () {
  const session = AUTH.requireAuth();
  if (!session) return;

  UI.paintUserBadge("userName", session);
  UI.bindLogout();

  const msgEl = document.getElementById("msg");
  const headerRow = document.getElementById("headerRow");
  const bodyRows = document.getElementById("bodyRows");

  async function load() {
    try {
      const [data, users] = await Promise.all([API.getScoreMatrix(), API.getUsers()]);
      const matches = data.matches || [];
      const rows = (data.matrix || []).slice().sort((a, b) => b.totalScore - a.totalScore);

      const baseScoreByName = new Map(users.map((u) => [u.fullName, u.baseScore]));


      headerRow.innerHTML = `
        <th class="col-pos num">Pos</th>
        <th class="col-name text-left">Participante</th>
        <th class="num col-total">Total</th>
      `;
      matches.forEach((m) => {
        const th = document.createElement("th");
        th.className = "num";
        th.title = m.opponents;
        th.textContent = UI.shortCode(m.opponents);
        headerRow.appendChild(th);
      });
      const thBase = document.createElement("th");
      thBase.className = "num";
      thBase.textContent = "Base";
      thBase.title = "Puntaje base (asignado antes de empezar la polla)";
      headerRow.appendChild(thBase);

      // Filas
      bodyRows.innerHTML = "";
      if (!rows.length) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="${matches.length + 4}" class="empty-state">Aún no hay datos de clasificación.</td>`;
        bodyRows.appendChild(tr);
        return;
      }

      let currentPos = 1;
      let prevScore = null;
      let skippedPositions = 0;

      rows.forEach((row, index) => {
        const tr = document.createElement("tr");

        if (prevScore !== null) {
          if (row.totalScore === prevScore) {
            skippedPositions++;
          } else {
            currentPos += skippedPositions + 1;
            skippedPositions = 0;
          }
        }
        prevScore = row.totalScore;

        let posLabel = `${currentPos}.°`;
        if (currentPos === 1) {
          tr.className = "podium-1";
          posLabel = "🥇 1.°";
        } else if (currentPos === 2) {
          tr.className = "podium-2";
          posLabel = "🥈 2.°";
        } else if (currentPos === 3) {
          tr.className = "podium-3";
          posLabel = "🥉 3.°";
        }

        // Columna Posición
        const tdPos = document.createElement("td");
        tdPos.className = "col-pos num text-left font-bold";
        tdPos.innerHTML = posLabel;
        tr.appendChild(tdPos);

        const tdName = document.createElement("th");
        tdName.scope = "row";
        tdName.className = "col-name text-left";
        tdName.title = row.userName;
        tdName.textContent = row.userName;
        tr.appendChild(tdName);

        const tdTotal = document.createElement("td");
        tdTotal.className = "total col-total";
        tdTotal.textContent = row.totalScore;
        tr.appendChild(tdTotal);

        matches.forEach((m) => {
          const td = document.createElement("td");
          td.className = "num";
          const score = row.scoresByMatch ? row.scoresByMatch[m.id] : undefined;
          td.textContent = score !== undefined && score !== null ? score : "-";
          tr.appendChild(td);
        });

        const tdBase = document.createElement("td");
        tdBase.className = "num subtle";
        const baseScore = baseScoreByName.get(row.userName);
        tdBase.textContent = baseScore !== undefined && baseScore !== null ? baseScore : "-";
        tr.appendChild(tdBase);

        bodyRows.appendChild(tr);
      });
    } catch (err) {
      UI.showMessage(msgEl, "No se pudo cargar la tabla de posiciones.", "error");
    }
  }

  load();
})();