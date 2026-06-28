export const $ = id => document.getElementById(id);

export const el = (tag, cls, html = '') => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
};

export const emptyRow = (cols, msg, cls = 'state-empty') =>
    `<tr><td colspan="${cols}" class="${cls}">${msg}</td></tr>`;

export const rankClass = i =>
    i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';

export function formatResult(val, localName, visitanteName) {
    if (val === '1') return localName  ?? 'Gana Local';
    if (val === '2') return visitanteName ?? 'Gana Visita';
    return 'Empate (X)';
}

export function formatFecha(isoString) {
    return new Date(isoString).toLocaleString('es-PE', {
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
}

export function renderMatchCard(partido, votosPrevios) {
    const voto   = votosPrevios[partido.id] ?? {};
    const sel    = (type, val) => voto[type] === val ? 'selected' : '';
    const cierre = formatFecha(partido.fechaHora);

    const card = el('div', 'match-card');
    card.dataset.matchId = partido.id;
    card.innerHTML = `
        <div class="match-meta">
            <span class="match-phase">${partido.fase}</span>
            <span class="match-time">Cierra: ${cierre}</span>
        </div>
        <div class="match-row">
            <div class="team home">${partido.local}</div>
            <div class="vs-badge">VS</div>
            <div class="team away">${partido.visitante}</div>
        </div>
        <div class="prediction-section">
            <div class="options-grid">
                <button class="btn-opt ${sel('resultado90','1')}" data-type="90min" data-val="1">${partido.local}</button>
                <button class="btn-opt ${sel('resultado90','X')}" data-type="90min" data-val="X">Empate</button>
                <button class="btn-opt ${sel('resultado90','2')}" data-type="90min" data-val="2">${partido.visitante}</button>
            </div>
            <div class="extra-section ${voto.resultado90 === 'X' ? 'visible' : ''}">
                <div class="extra-title">¿Quién clasifica en penales?</div>
                <div class="extra-grid">
                    <button class="btn-opt ${sel('clasifica','1')}" data-type="qualify" data-val="1">${partido.local}</button>
                    <button class="btn-opt ${sel('clasifica','2')}" data-type="qualify" data-val="2">${partido.visitante}</button>
                </div>
            </div>
            <button class="btn-action btn-guardar-individual">Guardar partido</button>
        </div>`;
    return card;
}

export function renderLeaderboard(ranking, partidos) {
    const partidosConResultado = partidos.filter(p => p.resultado90_real);

    const headers = [
        '<th class="col-sm">Pos</th>',
        '<th>Participante</th>',
        '<th class="col-center col-sm">Base</th>',
        ...partidosConResultado.map(p =>
            `<th class="col-center col-pts" title="${p.local} vs ${p.visitante}">${p.local.substring(0,3).toUpperCase()}<br>vs<br>${p.visitante.substring(0,3).toUpperCase()}</th>`
        ),
        '<th class="col-center col-md">Total</th>',
    ].join('');

    let pos = 1;
    const rows = ranking.map(({ nombre, puntajeBase, porPartido, total }, i) => {
        if (i > 0 && ranking[i].total < ranking[i - 1].total) pos++;
        const celdas = partidosConResultado.map(p => {
            const pts = porPartido[p.id] ?? 0;
            const cls = pts >= 3 ? 'pts-cell-win' : pts === 2 ? 'pts-cell-draw' : 'pts-cell-miss';
            return `<td class="col-center ${cls}">${pts > 0 ? pts : '—'}</td>`;
        }).join('');

        return `
            <tr>
                <td><span class="rank-pos ${rankClass(pos - 1)}">#${pos}</span></td>
                <td class="rank-name">${nombre}</td>
                <td class="col-center rank-base">${puntajeBase}</td>
                ${celdas}
                <td class="rank-pts">${total} pts</td>
            </tr>`;
    }).join('');

    return { headers, rows, colCount: 4 + partidosConResultado.length };
}

export function renderApuestasVisibles(usuarios, partidos, apuestas) {
    const ahora = new Date();
    const cerrados = partidos.filter(p =>
        ahora >= new Date(new Date(p.fechaHora).getTime() - 15 * 60 * 1000)
    );

    if (!cerrados.length) return '<p class="state-empty">Aún no cerró ningún partido.</p>';

    const apuestaMap = Object.fromEntries(apuestas.map(a => [a.id, a.pronosticos ?? {}]));

    const headers = [
        '<th>Participante</th>',
        ...cerrados.map(p =>
            `<th class="col-center col-pts" title="${p.local} vs ${p.visitante}">
                ${p.local.substring(0,3).toUpperCase()}<br>vs<br>${p.visitante.substring(0,3).toUpperCase()}
            </th>`
        ),
    ].join('');

    const rows = usuarios.map(u => {
        const pronosticos = apuestaMap[u.id] ?? {};
        const celdas = cerrados.map(p => {
            const voto = pronosticos[p.id];
            if (!voto) return `<td class="col-center cell-muted">—</td>`;

            const resTexto = voto.resultado90 === '1' ? p.local
                           : voto.resultado90 === '2' ? p.visitante
                           : 'Empate';
            const clasTexto = voto.resultado90 === 'X' && voto.clasifica
                ? (voto.clasifica === '1' ? p.local : p.visitante)
                : null;

            return `<td class="col-center">
                <span class="bet-badge">${resTexto}</span>
                ${clasTexto ? `<br><span class="bet-badge qualify" style="margin-top:4px">${clasTexto}</span>` : ''}
            </td>`;
        }).join('');

        return `<tr><td class="rank-name">${u.nombre}</td>${celdas}</tr>`;
    }).join('');

    return `
        <div class="table-responsive leaderboard-scroll">
            <table class="data-table leaderboard-table">
                <thead><tr>${headers}</tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}