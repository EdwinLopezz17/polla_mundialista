export const $ = id => document.getElementById(id);

export const el = (tag, cls, html = '') => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
};

export const emptyRow = (cols, msg, cls = 'state-empty') => `<tr><td colspan="${cols}" class="${cls}">${msg}</td></tr>`;

export const rankClass = i => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';

export const formatResult = (v, local, visita) => v === '1' ? (local ?? 'Gana Local') : v === '2' ? (visita ?? 'Gana Visita') : 'Empate (X)';

export const formatFecha = iso => new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true });

export function renderMatchCard(p, votos) {
    const v = votos[p.id] ?? {};
    const sel = (t, val) => v[t] === val ? 'selected' : '';
    const card = el('div', 'match-card');
    card.dataset.matchId = p.id;
    card.innerHTML = `
        <div class="match-meta">
            <span class="match-phase">${p.fase}</span>
            <span class="match-time">Cierra: ${formatFecha(p.fechaHora)}</span>
        </div>
        <div class="match-row">
            <div class="team home">${p.local}</div>
            <div class="vs-badge">VS</div>
            <div class="team away">${p.visitante}</div>
        </div>
        <div class="prediction-section">
            <div class="options-grid">
                <button class="btn-opt ${sel('resultado90','1')}" data-type="90min" data-val="1">${p.local}</button>
                <button class="btn-opt ${sel('resultado90','X')}" data-type="90min" data-val="X">Empate</button>
                <button class="btn-opt ${sel('resultado90','2')}" data-type="90min" data-val="2">${p.visitante}</button>
            </div>
            <div class="extra-section ${v.resultado90 === 'X' ? 'visible' : ''}">
                <div class="extra-title">¿Quién clasifica en penales?</div>
                <div class="extra-grid">
                    <button class="btn-opt ${sel('clasifica','1')}" data-type="qualify" data-val="1">${p.local}</button>
                    <button class="btn-opt ${sel('clasifica','2')}" data-type="qualify" data-val="2">${p.visitante}</button>
                </div>
            </div>
            <button class="btn-action btn-guardar-individual">Guardar partido</button>
        </div>`;
    return card;
}

export function renderLeaderboard(ranking, partidos) {
    const jugados = partidos.filter(p => p.resultado90_real).slice().reverse();

    const headers = [
        '<th style="width:44px">Pos</th>',
        '<th style="text-align:left">Participante</th>',
        '<th style="width:64px">Total</th>',
        ...jugados.map(p => `<th class="col-pts" title="${p.local} vs ${p.visitante}">${p.local.slice(0,3).toUpperCase()}<br>vs<br>${p.visitante.slice(0,3).toUpperCase()}</th>`),
        '<th class="col-pts" title="Puntaje base">Base</th>',
    ].join('');

    let pos = 1;
    const rows = ranking.map(({ nombre, puntajeBase, porPartido, total }, i) => {
        if (i > 0 && ranking[i].total < ranking[i - 1].total) pos++;
        const medal = rankClass(pos - 1);
        const celdas = jugados.map(p => {
            const pts = porPartido[p.id] ?? 0;
            const cls = pts >= 3 ? 'pts-cell-win' : pts === 2 ? 'pts-cell-draw' : 'pts-cell-miss';
            return `<td class="${cls}">${pts > 0 ? pts : '<span style="color:var(--border)">—</span>'}</td>`;
        }).join('');
        return `<tr><td><span class="lb-pos ${medal}">${pos}</span></td><td><span class="lb-name">${nombre}</span></td><td class="lb-total">${total}</td>${celdas}<td class="lb-base">${puntajeBase}</td></tr>`;
    }).join('');

    return { headers, rows, colCount: 4 + jugados.length };
}

export function renderApuestasVisibles(usuarios, partidos, apuestas, ahora = Date.now()) {
    const cerrados = partidos.filter(p => ahora >= new Date(p.fechaHora).getTime() - 15 * 60 * 1000).reverse();
    if (!cerrados.length) return '<p class="state-empty">Aún no cerró ningún partido.</p>';

    const aMap = Object.fromEntries(apuestas.map(a => [a.id, a.pronosticos ?? {}]));

    const headers = ['<th>Participante</th>', ...cerrados.map(p =>
        `<th class="col-pts" title="${p.local} vs ${p.visitante}">${p.local.slice(0,3).toUpperCase()}<br>vs<br>${p.visitante.slice(0,3).toUpperCase()}</th>`
    )].join('');

    const rows = usuarios.map(u => {
        const pron = aMap[u.id] ?? {};
        const celdas = cerrados.map(p => {
            const v = pron[p.id];
            if (!v) return `<td class="cell-muted">—</td>`;
            const res = v.resultado90 === '1' ? p.local.slice(0,3).toUpperCase() : v.resultado90 === '2' ? p.visitante.slice(0,3).toUpperCase() : 'Emp';
            const cla = v.resultado90 === 'X' && v.clasifica ? (v.clasifica === '1' ? p.local.slice(0,3).toUpperCase() : p.visitante.slice(0,3).toUpperCase()) : null;
            return `<td><span class="bet-pill">${res}</span>${cla ? `<span class="bet-pill qualify">${cla}</span>` : ''}</td>`;
        }).join('');
        return `<tr><td>${u.nombre}</td>${celdas}</tr>`;
    }).join('');

    return `<div class="table-responsive leaderboard-scroll"><table class="data-table bets-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
}