import { fetchUsuarios, fetchUsuario, fetchPartidos, fetchApuesta, fetchTodasLasApuestas, savePronostico } from "./db.js";
import { calcularRanking } from "./scoring.js";
import { $, el, emptyRow, rankClass, formatResult, renderMatchCard, renderLeaderboard } from "./ui.js";

let currentUser    = null;
let cachedPartidos = [];

const CUTOFF_MINUTES = 15;

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const usuarios = await fetchUsuarios();
        const select   = $('player-select');
        usuarios.forEach(({ id, nombre }) => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = nombre;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Error cargando usuarios:", e);
    }
});

$('btn-login').addEventListener('click', async () => {
    const playerId = $('player-select').value;
    const pin      = $('player-pin').value;
    if (!playerId || !pin) return alert('Elige tu nombre e ingresa tu PIN.');

    try {
        const usuario = await fetchUsuario(playerId);
        if (!usuario || usuario.pin !== pin) return alert('PIN incorrecto o usuario inválido.');

        currentUser = { id: playerId, nombre: usuario.nombre, pin };
        $('login-screen').classList.remove('active');
        $('main-nav').classList.remove('hidden');
        $('main-container').classList.remove('hidden');
        $('nav-username').textContent = currentUser.nombre;
        switchScreen('screen-apostar');
    } catch {
        alert('Error de conexión. Intenta nuevamente.');
    }
});

document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.addEventListener('click', e => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        switchScreen(e.currentTarget.dataset.target);
    })
);

function switchScreen(id) {
    document.querySelectorAll('.sub-screen').forEach(s => {
        s.classList.add('hidden');
        s.classList.remove('active');
    });
    const target = $(id);
    target.classList.remove('hidden');
    target.classList.add('active');

    const loaders = {
        'screen-apostar':       loadApostar,
        'screen-mis-apuestas':  loadMisApuestas,
        'screen-posiciones':    loadTabla,
    };
    loaders[id]?.();
}

async function loadApostar() {
    const container = $('fixture-container');
    container.innerHTML = `<p class="state-empty">Verificando cronograma...</p>`;

    try {
        const [apuesta, partidos] = await Promise.all([
            fetchApuesta(currentUser.id),
            fetchPartidos(),
        ]);

        const previas   = apuesta?.pronosticos ?? {};
        cachedPartidos  = partidos;
        const ahora     = new Date();
        let visibles    = 0;

        container.innerHTML = '';

        for (const p of cachedPartidos) {
            const cierre = new Date(new Date(p.fechaHora).getTime() - CUTOFF_MINUTES * 60 * 1000);
            if (ahora >= cierre) continue;
            visibles++;
            container.appendChild(renderMatchCard(p, previas));
        }

        if (visibles === 0) {
            container.innerHTML = `<p class="state-empty">No hay partidos disponibles para apostar en este momento.</p>`;
        } else {
            bindCardEvents();
        }
    } catch {
        container.innerHTML = `<p class="state-error">Error al cargar los partidos.</p>`;
    }
}

function bindCardEvents() {
    const container = $('fixture-container');

    container.querySelectorAll('.btn-opt').forEach(btn => {
        btn.onclick = function () {
            const card       = this.closest('.match-card');
            const { type, val } = this.dataset;
            card.querySelectorAll(`.btn-opt[data-type="${type}"]`).forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');

            if (type === '90min') {
                const extra = card.querySelector('.extra-section');
                if (val === 'X') {
                    extra.classList.add('visible');
                } else {
                    extra.classList.remove('visible');
                    extra.querySelectorAll('.btn-opt').forEach(b => b.classList.remove('selected'));
                }
            }
        };
    });

    container.querySelectorAll('.btn-guardar-individual').forEach(btn => {
        btn.onclick = async function () {
            const card    = this.closest('.match-card');
            const matchId = card.dataset.matchId;
            const btn90   = card.querySelector('.btn-opt[data-type="90min"].selected');
            if (!btn90) return alert('Selecciona tu pronóstico.');

            const res90     = btn90.dataset.val;
            const btnQ      = card.querySelector('.btn-opt[data-type="qualify"].selected');
            const clasifica = res90 === 'X' ? (btnQ?.dataset.val ?? null) : res90;
            if (res90 === 'X' && !clasifica) return alert('Elige quién clasifica en caso de empate.');

            try {
                await savePronostico(currentUser.id, currentUser.nombre, currentUser.pin, matchId, { resultado90: res90, clasifica });
                alert('Partido guardado correctamente.');
            } catch {
                alert('Error al guardar. Intenta nuevamente.');
            }
        };
    });
}

async function loadMisApuestas() {
    const tbody = $('my-bets-table-body');
    if (!tbody) return;
    tbody.innerHTML = emptyRow(3, 'Cargando tus apuestas...');

    try {
        const [partidos, apuesta] = await Promise.all([
            fetchPartidos(),
            fetchApuesta(currentUser.id),
        ]);

        if (!apuesta) {
            tbody.innerHTML = emptyRow(3, 'No se encontraron apuestas para tu usuario.');
            return;
        }

        const mapaPartidos = Object.fromEntries(partidos.map(p => [p.id, p]));
        const misVotos     = apuesta.pronosticos ?? {};
        const ids          = Object.keys(misVotos);

        if (!ids.length) {
            tbody.innerHTML = emptyRow(3, 'Aún no has guardado ningún partido.');
            return;
        }

        let html = '';
        for (const matchId of ids) {
            const voto = misVotos[matchId];
            const p    = mapaPartidos[matchId];
            if (!p) continue;

            const resTexto       = formatResult(voto.resultado90, p.local, p.visitante);
            const clasificaTexto = voto.resultado90 === 'X'
                ? (voto.clasifica === '1' ? p.local : p.visitante)
                : null;

            html += `
                <tr>
                    <td>
                        <div class="match-label">${p.local} vs ${p.visitante}</div>
                        <div class="match-sub">${p.fase ?? 'Fase Eliminatoria'}</div>
                    </td>
                    <td class="col-center"><span class="bet-badge">${resTexto}</span></td>
                    <td class="col-center">${clasificaTexto
                        ? `<span class="bet-badge qualify">${clasificaTexto}</span>`
                        : `<span class="cell-muted">—</span>`
                    }</td>
                </tr>`;
        }

        tbody.innerHTML = html || emptyRow(3, 'Tus apuestas no coinciden con los partidos actuales.');
    } catch {
        tbody.innerHTML = emptyRow(3, 'Error al leer tus apuestas.', 'state-error');
    }
}

async function loadTabla() {
    const wrap = $('leaderboard-wrap');
    wrap.innerHTML = `<p class="state-empty">Calculando puntajes...</p>`;

    try {
        const [usuarios, partidos, apuestas] = await Promise.all([
            fetchUsuarios(),
            fetchPartidos(),
            fetchTodasLasApuestas(),
        ]);

        const ranking = calcularRanking(usuarios, apuestas, partidos);

        if (!ranking.length) {
            wrap.innerHTML = `<p class="state-empty">Ningún jugador ha enviado apuestas todavía.</p>`;
            return;
        }

        const { headers, rows, colCount } = renderLeaderboard(ranking, partidos);

        wrap.innerHTML = `
            <div class="table-responsive leaderboard-scroll">
                <table class="data-table leaderboard-table">
                    <thead><tr>${headers}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    } catch (e) {
        console.error(e);
        wrap.innerHTML = `<p class="state-error">Error al calcular la tabla.</p>`;
    }
}

$('rules-toggle').addEventListener('click', function () {
    const body = $('rules-body');
    const open = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', String(!open));
    this.textContent = open ? 'Ver reglas' : 'Ocultar';
    body.classList.toggle('open', !open);
});