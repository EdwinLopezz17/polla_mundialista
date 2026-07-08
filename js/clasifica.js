// clasifica.js
// Renderiza la matriz de puntajes: filas = participantes, columnas = partidos
// (abreviados a 3 letras por equipo), celdas = puntos obtenidos en ese partido.

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

      // El score-matrix solo trae el nombre del usuario, no su id, así que
      // cruzamos por fullName contra /api/users para sacar el baseScore.
      const baseScoreByName = new Map(users.map((u) => [u.fullName, u.baseScore]));

      // Encabezado: Participante y Total van fijas al inicio, luego un partido
      // por columna, y al final el puntaje base (para ver visualmente la suma).
      headerRow.innerHTML = `<th class="col-name">Participante</th><th class="num col-total">Total</th>`;
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
        tr.innerHTML = `<td colspan="${matches.length + 3}" class="empty-state">Aún no hay datos de clasificación.</td>`;
        bodyRows.appendChild(tr);
        return;
      }

      rows.forEach((row) => {
        const tr = document.createElement("tr");

        const tdName = document.createElement("th");
        tdName.scope = "row";
        tdName.className = "col-name";
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