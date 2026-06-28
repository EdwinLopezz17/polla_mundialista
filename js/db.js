import { db } from "./firebase.js";
import {
    doc, getDoc, setDoc, collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function fetchUsuarios() {
    const snap = await getDocs(collection(db, "usuarios"));
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    return list.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function fetchUsuario(id) {
    const snap = await getDoc(doc(db, "usuarios", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

export async function fetchPartidos() {
    const snap = await getDocs(collection(db, "partidos"));
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    return list.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
}

export async function fetchApuesta(userId) {
    const snap = await getDoc(doc(db, "apuestas", userId));
    if (!snap.exists()) return null;
    return snap.data();
}

export async function fetchTodasLasApuestas() {
    const snap = await getDocs(collection(db, "apuestas"));
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    return list;
}

export async function savePronostico(userId, userName, userPin, matchId, pronostico) {
    const docRef = doc(db, "apuestas", userId);
    const snap   = await getDoc(docRef);
    const pronosticos = snap.exists() ? snap.data().pronosticos || {} : {};
    pronosticos[matchId] = pronostico;
    await setDoc(docRef, {
        usuario:           userName,
        pronosticos,
        ultimoCambio:      new Date().toISOString(),
        pin_verificacion:  userPin,
    });
}