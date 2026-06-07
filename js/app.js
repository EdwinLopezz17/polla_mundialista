import { fetchUsuarios, fetchUsuario, fetchPartidos, fetchPartido, fetchApuesta, fetchTodasLasApuestas, savePronostico, getServerTimeOffset } from "./db.js";
import { calcularRanking } from "./scoring.js";
import { $, el, formatResult, renderMatchCard, renderLeaderboard, renderApuestasVisibles } from "./ui.js";

let user = null;
let partidosCache = [];
const CUTOFF_MS = 15 * 60 * 1000;

let serverOffset = 0;
const serverNow = () => Date.now() + serverOffset;

const vencido = p => serverNow() >= new Date(p.fechaHora).getTime() - CUTOFF_MS;

async function sincronizarReloj() {
    try { serverOffset = await getServerTimeOffset(); }
    catch (e) { console.error('No se pudo sincronizar el reloj con el servidor:', e); }
}

window.addEventListener('DOMContentLoaded', async () => {
    await sincronizarReloj();
    setInterval(sincronizarReloj, 5 * 60 * 1000);
    try {
        const usuarios = await fetchUsuarios();
        const sel = $('player-select');
        usuarios.forEach(({ id, nombre }) => sel.add(new Option(nombre, id)));
    } catch (e) { console.error(e); }
});

$('btn-login').addEventListener('click', async () => {
    const id = $('player-select').value, pin = $('player-pin').value;
    if (!id || !pin) return alert('Elige tu nombre e ingresa tu PIN.');
    try {
        const u = await fetchUsuario(id);
        if (!u || u.pin !== pin) return alert('PIN incorrecto o usuario inválido.');
        user = { id, nombre: u.nombre, pin };
        $('login-screen').classList.remove('active');
        $('main-nav').classList.remove('hidden');
        $('main-container').classList.remove('hidden');
        $('nav-username').textContent = user.nombre;
        switchScreen('screen-apostar');
    } catch { alert('Error de conexión. Intenta nuevamente.'); }
});

document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', e => {
    document.querySelectorAll('.nav-btn').forEach(x => x.classList.remove('active'));
    e.currentTarget.classList.add('active');
    switchScreen(e.currentTarget.dataset.target);
}));

function switchScreen(id) {
    document.querySelectorAll('.sub-screen').forEach(s => { s.classList.add('hidden'); s.classList.remove('active'); });
    const t = $(id);
    t.classList.remove('hidden');
    t.classList.add('active');
    ({ 'screen-apostar': loadApostar, 'screen-mis-apuestas': loadMisApuestas, 'screen-posiciones': loadTabla }[id])?.();
}

async function loadApostar() {
    const c = $('fixture-container');
    c.innerHTML = `<p class="state-empty">Verificando cronograma...</p>`;
    try {
        const [apuesta, partidos] = await Promise.all([fetchApuesta(user.id), fetchPartidos()]);
        const previas = apuesta?.pronosticos ?? {};
        partidosCache = partidos;
        const visibles = partidos.filter(p => !vencido(p));
        c.innerHTML = '';
        if (!visibles.length) return c.innerHTML = `<p class="state-empty">No hay partidos disponibles para apostar en este momento.</p>`;
        visibles.forEach(p => c.appendChild(renderMatchCard(p, previas)));
        bindCardEvents();
    } catch { c.innerHTML = `<p class="state-error">Error al cargar los partidos.</p>`; }
}

function bindCardEvents() {
    const c = $('fixture-container');

    c.querySelectorAll('.btn-opt').forEach(btn => {
        btn.onclick = function () {
            const card = this.closest('.match-card');
            const { type, val } = this.dataset;
            card.querySelectorAll(`.btn-opt[data-type="${type}"]`).forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            if (type === '90min') {
                const extra = card.querySelector('.extra-section');
                if (val === 'X') extra.classList.add('visible');
                else { extra.classList.remove('visible'); extra.querySelectorAll('.btn-opt').forEach(b => b.classList.remove('selected')); }
            }
        };
    });

    c.querySelectorAll('.btn-guardar-individual').forEach(btn => {
        btn.onclick = async function () {
            const card = this.closest('.match-card');
            const matchId = card.dataset.matchId;

            let fresco;
            try { fresco = await fetchPartido(matchId); } catch { return alert('Error de conexión. Intenta nuevamente.'); }

            if (!fresco || vencido(fresco)) {
                alert('Lo sentimos, el tiempo para apostar en este partido ha expirado. La apuesta no será guardada.');
                card.remove();
                if (!c.children.length) c.innerHTML = `<p class="state-empty">No hay partidos disponibles para apostar en este momento.</p>`;
                return;
            }

            const btn90 = card.querySelector('.btn-opt[data-type="90min"].selected');
            if (!btn90) return alert('Selecciona tu pronóstico.');
            const res90 = btn90.dataset.val;
            const btnQ = card.querySelector('.btn-opt[data-type="qualify"].selected');
            const clasifica = res90 === 'X' ? (btnQ?.dataset.val ?? null) : res90;
            if (res90 === 'X' && !clasifica) return alert('Elige quién clasifica en caso de empate.');

            try {
                await savePronostico(user.id, user.nombre, user.pin, matchId, { resultado90: res90, clasifica });
                alert('Partido guardado correctamente.');
            } catch { alert('Error al guardar. Intenta nuevamente.'); }
        };
    });
}

async function loadMisApuestas() {
    const w = $('mis-apuestas-wrap');
    if (!w) return;
    w.innerHTML = `<p class="state-empty">Cargando tus apuestas...</p>`;
    try {
        const [partidos, apuesta] = await Promise.all([fetchPartidos(), fetchApuesta(user.id)]);
        if (!apuesta) return w.innerHTML = `<p class="state-empty">No se encontraron apuestas para tu usuario.</p>`;
        const votos = apuesta.pronosticos ?? {};
        if (!Object.keys(votos).length) return w.innerHTML = `<p class="state-empty">Aún no has guardado ningún partido.</p>`;

        const resueltos = partidos.filter(p => p.resultado90_real && votos[p.id]);
        const pendientes = partidos.filter(p => !p.resultado90_real && votos[p.id]);

        const fila = (p, v, conRes) => {
            const res = formatResult(v.resultado90, p.local, p.visitante);
            const cla = v.resultado90 === 'X' ? (v.clasifica === '1' ? p.local : p.visitante) : null;

            if (!conRes) return `
                <tr>
                    <td><div class="match-label">${p.local} vs ${p.visitante}</div><div class="match-sub">${p.fase ?? 'Fase Eliminatoria'}</div></td>
                    <td class="col-center"><span class="bet-badge">${res}</span></td>
                    <td class="col-center">${cla ? `<span class="bet-badge qualify">${cla}</span>` : `<span class="cell-muted">—</span>`}</td>
                    <td class="col-center"><span class="cell-muted">Pendiente</span></td>
                </tr>`;

            const acerto = v.resultado90 === p.resultado90_real;
            const pts = acerto ? (p.resultado90_real === 'X' ? (v.clasifica === p.clasifica_real ? 3 : 2) : 4) : 0;
            const gano = pts > 0;

            return `
                <tr class="${gano ? 'row-win' : 'row-loss'}">
                    <td><div class="match-label">${p.local} vs ${p.visitante}</div><div class="match-sub">${p.fase ?? 'Fase Eliminatoria'}</div></td>
                    <td class="col-center"><span class="bet-badge ${gano ? 'badge-win' : 'badge-loss'}">${res}</span></td>
                    <td class="col-center">${cla ? `<span class="bet-badge ${gano ? 'badge-win' : 'badge-loss'} qualify">${cla}</span>` : `<span class="cell-muted">—</span>`}</td>
                    <td class="col-center"><span class="pts-result ${gano ? 'pts-win' : 'pts-loss'}">${gano ? `+${pts} pts` : '0 pts'}</span></td>
                </tr>`;
        };

        const head = `<thead><tr><th>Partido / Fase</th><th class="col-center col-md">Pronóstico</th><th class="col-center col-lg">Clasifica</th><th class="col-center col-sm">Pts</th></tr></thead>`;

        let html = '';
        if (pendientes.length) html += `
            <div class="bets-section-label bets-section-pending"><span class="bets-section-icon">◷</span> Partidos pendientes</div>
            <div class="table-responsive" style="margin-bottom:16px;"><table class="data-table">${head}<tbody>${pendientes.map(p => fila(p, votos[p.id], false)).join('')}</tbody></table></div>`;
        if (resueltos.length) html += `
            <div class="bets-section-label"><span class="bets-section-icon">✓</span> Partidos resueltos</div>
            <div class="table-responsive"><table class="data-table">${head}<tbody>${resueltos.map(p => fila(p, votos[p.id], true)).join('')}</tbody></table></div>`;

        w.innerHTML = html || `<p class="state-empty">Tus apuestas no coinciden con los partidos actuales.</p>`;
    } catch (e) { console.error(e); w.innerHTML = `<p class="state-error">Error al leer tus apuestas.</p>`; }
}

async function loadTabla() {
    const w = $('leaderboard-wrap');
    w.innerHTML = `<p class="state-empty">Calculando puntajes...</p>`;
    try {
        const [usuarios, partidos, apuestas] = await Promise.all([fetchUsuarios(), fetchPartidos(), fetchTodasLasApuestas()]);
        const ranking = calcularRanking(usuarios, apuestas, partidos);
        if (!ranking.length) return w.innerHTML = `<p class="state-empty">Ningún jugador ha enviado apuestas todavía.</p>`;

        const { headers, rows } = renderLeaderboard(ranking, partidos);
        w.innerHTML = `<div class="table-responsive leaderboard-scroll"><table class="data-table leaderboard-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;

        const extra = el('div', '', `
            <div class="section-header" style="margin-top:22px;"><h3 class="section-title" style="font-size:17px;">Apuestas de partidos cerrados</h3><p class="section-desc">Solo visibles una vez cerrada la hora de apuesta.</p></div>
            ${renderApuestasVisibles(usuarios, partidos, apuestas, serverNow())}`);
        w.appendChild(extra);
    } catch (e) { console.error(e); w.innerHTML = `<p class="state-error">Error al calcular la tabla.</p>`; }
}

$('rules-toggle').addEventListener('click', function () {
    const body = $('rules-body');
    const open = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', String(!open));
    this.textContent = open ? 'Ver reglas' : 'Ocultar';
    body.classList.toggle('open', !open);
});