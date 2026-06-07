import { db } from "./firebase.js";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const fetchUsuarios = async () => {
    const s = await getDocs(collection(db, "usuarios"));
    const l = [];
    s.forEach(d => l.push({ id: d.id, ...d.data() }));
    return l.sort((a, b) => a.nombre.localeCompare(b.nombre));
};

export const fetchUsuario = async id => {
    const s = await getDoc(doc(db, "usuarios", id));
    return s.exists() ? { id: s.id, ...s.data() } : null;
};

export const fetchPartidos = async () => {
    const s = await getDocs(collection(db, "partidos"));
    const l = [];
    s.forEach(d => l.push({ id: d.id, ...d.data() }));
    return l.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
};

export const fetchPartido = async id => {
    const s = await getDoc(doc(db, "partidos", id));
    return s.exists() ? { id: s.id, ...s.data() } : null;
};

export const fetchApuesta = async uid => {
    const s = await getDoc(doc(db, "apuestas", uid));
    return s.exists() ? s.data() : null;
};

export const fetchTodasLasApuestas = async () => {
    const s = await getDocs(collection(db, "apuestas"));
    const l = [];
    s.forEach(d => l.push({ id: d.id, ...d.data() }));
    return l;
};

export const savePronostico = async (uid, nombre, pin, matchId, pron) => {
    const ref = doc(db, "apuestas", uid);
    const s = await getDoc(ref);
    const pronosticos = s.exists() ? s.data().pronosticos || {} : {};
    pronosticos[matchId] = pron;
    await setDoc(ref, { usuario: nombre, pronosticos, ultimoCambio: new Date().toISOString(), pin_verificacion: pin });
};

export const getServerTimeOffset = async () => {
    const ref = doc(db, "_meta", "reloj");
    const antes = Date.now();
    await setDoc(ref, { ts: serverTimestamp() });
    const snap = await getDoc(ref);
    const despues = Date.now();
    const serverMs = snap.data().ts.toMillis();
    // Se corrige por la mitad del round-trip de red para mayor precisión.
    const rtt = despues - antes;
    return (serverMs + rtt / 2) - despues;
};