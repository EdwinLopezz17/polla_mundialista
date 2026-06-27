import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore, doc, getDoc, setDoc, collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const db = getFirestore(initializeApp({
    apiKey:            "AIzaSyCEtoklMJRM4q8JDc2RJSGDDDXdTBI3-Qs",
    authDomain:        "pollafutbolera-cd2e5.firebaseapp.com",
    projectId:         "pollafutbolera-cd2e5",
    storageBucket:     "pollafutbolera-cd2e5.firebasestorage.app",
    messagingSenderId: "770223946672",
    appId:             "1:770223946672:web:2e6e57a229977abdcaf475"
}));

// ── State ────────────────────────────────────────────────
let currentUser   = null;
let cachedPartidos = [];

// ── Utils ────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const el = (tag, cls, html = '') => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
};

const formatResult = v =>
    v === '1' ? 'Gana Local' : v === '2' ? 'Gana Visita' : 'Empate (X)';

const emptyRow = (cols, msg, cls = 'state-empty') =>
    `<tr><td colspan="${cols}" class="${cls}">${msg}</td></tr>`;

const rankClass = i => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';

// ── Boot: load users ─────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
    const select = $('player-select');
    try {
        const snap = await getDocs(collection(db, "usuarios"));
        const users = [];
        snap.forEach(d => users.push({ id: d.id, ...d.data() }));
        users
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .forEach(({ id, nombre }) => {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = nombre;
                select.appendChild(opt);
            });
    } catch (e) {
        console.error("Error cargando usuarios:", e);
    }
});

// ── Login ────────────────────────────────────────────────
$('btn-login').addEventListener('click', async () => {
    const playerId = $('player-select').value;
    const pin = $('player-pin').value;
    if (!playerId || !pin) return alert('Elige tu nombre e ingresa tu PIN.');

    try {
        const snap = await getDoc(doc(db, "usuarios", playerId));
        if (!snap.exists() || snap.data().pin !== pin)
            return alert('PIN incorrecto o usuario inválido.');

        currentUser = { id: playerId, nombre: snap.data().nombre, pin: pin };
        $('login-screen').classList.remove('active');
        $('main-nav').classList.remove('hidden');
        $('main-container').classList.remove('hidden');
        $('nav-username').textContent = currentUser.nombre;
        switchScreen('screen-apostar');
    } catch {
        alert('Error de conexión. Intenta nuevamente.');
    }
});

// ── Navigation ───────────────────────────────────────────
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

    ({ 'screen-apostar': loadApostar, 'screen-mis-apuestas': loadMisApuestas, 'screen-posiciones': loadTabla })[id]?.();
}

// ── Screen: Apostar ──────────────────────────────────────
async function loadApostar() {
    const container = $('fixture-container');
    container.innerHTML = `<p class="state-empty">Verificando cronograma...</p>`;

    try {
        const [apuestaDoc, partidosSnap] = await Promise.all([
            getDoc(doc(db, "apuestas", currentUser.id)),
            getDocs(collection(db, "partidos")),
        ]);

        const previas = apuestaDoc.exists() ? apuestaDoc.data().pronosticos || {} : {};

        cachedPartidos = [];
        partidosSnap.forEach(d => cachedPartidos.push({ id: d.id, ...d.data() }));
        cachedPartidos.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));

        container.innerHTML = '';
        const ahora = new Date();
        let visibles = 0;

        for (const p of cachedPartidos) {
            const inicio = new Date(p.fechaHora);
            if (ahora >= new Date(inicio.getTime() - 15 * 60 * 1000)) continue;

            visibles++;
            const fechaStr = inicio.toLocaleString('es-PE', {
                day: '2-digit', month: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
            const voto = previas[p.id] || {};
            const sel  = (type, val) => voto[type] === val ? 'selected' : '';

            const card = el('div', 'match-card');
            card.dataset.matchId = p.id;
            card.innerHTML = `
                <div class="match-meta">
                    <span class="match-phase">${p.fase}</span>
                    <span class="match-time">Cierra: ${fechaStr}</span>
                </div>
                <div class="match-row">
                    <div class="team home">${p.local}</div>
                    <div class="vs-badge">VS</div>
                    <div class="team away">${p.visitante}</div>
                </div>
                <div class="prediction-section">
                    <div class="options-grid">
                        <button class="btn-opt ${sel('resultado90','1')}" data-type="90min" data-val="1">Gana Local</button>
                        <button class="btn-opt ${sel('resultado90','X')}" data-type="90min" data-val="X">Empate (X)</button>
                        <button class="btn-opt ${sel('resultado90','2')}" data-type="90min" data-val="2">Gana Visita</button>
                    </div>
                    <div class="extra-section ${voto.resultado90 === 'X' ? 'visible' : ''}">
                        <div class="extra-title">¿Quién clasifica en penales?</div>
                        <div class="extra-grid">
                            <button class="btn-opt ${sel('clasifica','1')}" data-type="qualify" data-val="1">${p.local}</button>
                            <button class="btn-opt ${sel('clasifica','2')}" data-type="qualify" data-val="2">${p.visitante}</button>
                        </div>
                    </div>
                    <button class="btn-action btn-guardar-individual">Guardar partido</button>
                </div>`;
            container.appendChild(card);
        }

        if (visibles === 0)
            container.innerHTML = `<p class="state-empty">No hay partidos disponibles para apostar en este momento.</p>`;
        else
            bindCardEvents();
    } catch {
        container.innerHTML = `<p class="state-error">Error al cargar los partidos.</p>`;
    }
}

function bindCardEvents() {
    const container = $('fixture-container');

    container.querySelectorAll('.btn-opt').forEach(btn => {
        btn.onclick = function () {
            const card = this.closest('.match-card');
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
        btn.onclick = async function (e) { 
            const card    = this.closest('.match-card');
            const matchId = card.dataset.matchId;
            const btn90   = card.querySelector('.btn-opt[data-type="90min"].selected');
            if (!btn90) return alert('Selecciona tu pronóstico de 90 minutos.');

            const res90     = btn90.dataset.val;
            const btnQ      = card.querySelector('.btn-opt[data-type="qualify"].selected');
            const clasifica = res90 === 'X' ? (btnQ?.dataset.val ?? null) : res90;

            if (res90 === 'X' && !clasifica) return alert('Elige quién clasifica en caso de empate.');

            try {
                const docRef      = doc(db, "apuestas", currentUser.id);
                const snap        = await getDoc(docRef);
                const pronosticos = snap.exists() ? snap.data().pronosticos || {} : {};
                pronosticos[matchId] = { resultado90: res90, clasifica };
                
                await setDoc(docRef, {
                    usuario: currentUser.nombre,
                    pronosticos,
                    ultimoCambio: new Date().toISOString(),
                    pin_verificacion: currentUser.pin
                });
                alert('Partido guardado correctamente.');
            } catch (error) {
                console.error("Error real de Firebase:", error); 
                alert('Error al guardar. Intenta nuevamente.');
            }
        };
    });
}

// ── Screen: Mis Apuestas ─────────────────────────────────
async function loadMisApuestas() {
    const tbody = $('my-bets-table-body');
    if (!tbody) return;
    tbody.innerHTML = emptyRow(3, 'Cargando tus apuestas...');

    try {
        const [partidosSnap, apuestaDoc] = await Promise.all([
            getDocs(collection(db, "partidos")),
            getDoc(doc(db, "apuestas", currentUser.id)),
        ]);

        const mapa = {};
        partidosSnap.forEach(d => { mapa[d.id] = d.data(); });

        if (!apuestaDoc.exists()) {
            tbody.innerHTML = emptyRow(3, 'No se encontraron apuestas para tu usuario.');
            return;
        }

        const misVotos = apuestaDoc.data().pronosticos || {};
        const ids      = Object.keys(misVotos);

        if (!ids.length) {
            tbody.innerHTML = emptyRow(3, 'Aún no has guardado ningún partido.');
            return;
        }

        let html = '';
        for (const matchId of ids) {
            const voto = misVotos[matchId];
            const p    = mapa[matchId];
            if (!p) continue;

            const clasificaTexto = voto.resultado90 === 'X'
                ? (voto.clasifica === '1' ? p.local : p.visitante)
                : null;

            html += `
                <tr>
                    <td>
                        <div class="match-label">${p.local} vs ${p.visitante}</div>
                        <div class="match-sub">${p.fase || 'Fase Eliminatoria'}</div>
                    </td>
                    <td><span class="bet-badge">${formatResult(voto.resultado90)}</span></td>
                    <td>${clasificaTexto
                        ? `<span class="bet-badge qualify">${clasificaTexto}</span>`
                        : `<span style="color:var(--text-muted)">—</span>`
                    }</td>
                </tr>`;
        }

        tbody.innerHTML = html || emptyRow(3, 'Tus apuestas no coinciden con los partidos actuales.');
    } catch {
        tbody.innerHTML = emptyRow(3, 'Error de lectura en Firestore.', 'state-error');
    }
}

// ── Screen: Tabla de posiciones ──────────────────────────
async function loadTabla() {
    const tbody = $('leaderboard-body');
    tbody.innerHTML = emptyRow(3, 'Calculando puntajes...');

    try {
        const [partidosSnap, apuestasSnap] = await Promise.all([
            getDocs(collection(db, "partidos")),
            getDocs(collection(db, "apuestas")),
        ]);

        // Build map of official results
        const realData = {};
        partidosSnap.forEach(d => {
            const { resultado90_real, clasifica_real } = d.data();
            if (resultado90_real)
                realData[d.id] = { res90: resultado90_real, clasifica: clasifica_real };
        });

        // Score each participant
        const ranking = [];
        apuestasSnap.forEach(snap => {
            const { usuario, pronosticos = {} } = snap.data();
            let pts = 0;
            for (const pId in realData) {
                const oficial  = realData[pId];
                const apuesta  = pronosticos[pId];
                if (!apuesta || apuesta.resultado90 !== oficial.res90) continue;
                pts += oficial.res90 === 'X'
                    ? (apuesta.clasifica === oficial.clasifica ? 2 : 1)
                    : 2;
            }
            ranking.push({ nombre: usuario, puntos: pts });
        });

        ranking.sort((a, b) => b.puntos - a.puntos);

        if (!ranking.length) {
            tbody.innerHTML = emptyRow(3, 'Ningún jugador ha enviado apuestas todavía.');
            return;
        }

        tbody.innerHTML = ranking.map(({ nombre, puntos }, i) => `
            <tr>
                <td><span class="rank-pos ${rankClass(i)}">#${i + 1}</span></td>
                <td style="font-weight:700">${nombre}</td>
                <td class="rank-pts">${puntos} pts</td>
            </tr>`).join('');
    } catch {
        tbody.innerHTML = emptyRow(3, 'Error al calcular la tabla.', 'state-error');
    }
}