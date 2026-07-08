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
      const data = await API.getScoreMatrix();
      const matches = data.matches || [];
      const rows = (data.matrix || []).slice().sort((a, b) => b.totalScore - a.totalScore);

      // Encabezado
      headerRow.innerHTML = `<th>Participante</th>`;
      matches.forEach((m) => {
        const th = document.createElement("th");
        th.className = "num";
        th.title = m.opponents;
        th.textContent = UI.shortCode(m.opponents);
        headerRow.appendChild(th);
      });
      const thTotal = document.createElement("th");
      thTotal.className = "num";
      thTotal.textContent = "Total";
      headerRow.appendChild(thTotal);

      // Filas
      bodyRows.innerHTML = "";
      if (!rows.length) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="${matches.length + 2}" class="empty-state">Aún no hay datos de clasificación.</td>`;
        bodyRows.appendChild(tr);
        return;
      }

      rows.forEach((row) => {
        const tr = document.createElement("tr");
        const tdName = document.createElement("th");
        tdName.scope = "row";
        tdName.textContent = row.userName;
        tr.appendChild(tdName);

        matches.forEach((m) => {
          const td = document.createElement("td");
          td.className = "num";
          const score = row.scoresByMatch ? row.scoresByMatch[m.id] : undefined;
          td.textContent = score !== undefined && score !== null ? score : "-";
          tr.appendChild(td);
        });

        const tdTotal = document.createElement("td");
        tdTotal.className = "total";
        tdTotal.textContent = row.totalScore;
        tr.appendChild(tdTotal);

        bodyRows.appendChild(tr);
      });
    } catch (err) {
      UI.showMessage(msgEl, "No se pudo cargar la tabla de posiciones.", "error");
    }
  }

  load();
})();