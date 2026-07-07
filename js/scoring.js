export const calcularPuntosPartido = (ap, of) => {
    if (!ap || ap.resultado90 !== of.res90) return 0;
    if (of.res90 === 'X') return ap.clasifica === of.clasifica ? 3 : 2;
    return 4;
};

export const buildRealDataMap = ps => {
    const m = {};
    for (const p of ps) if (p.resultado90_real) m[p.id] = { res90: p.resultado90_real, clasifica: p.clasifica_real ?? null };
    return m;
};

export const calcularRanking = (usuarios, apuestas, partidos) => {
    const real = buildRealDataMap(partidos);
    const aMap = Object.fromEntries(apuestas.map(a => [a.id, a]));
    const resueltos = partidos.filter(p => real[p.id]);

    return usuarios.map(u => {
        const pron = aMap[u.id]?.pronosticos ?? {};
        const base = u.puntaje_base ?? 0;
        const porPartido = {};
        let tot = 0;
        for (const p of resueltos) {
            const pts = calcularPuntosPartido(pron[p.id], real[p.id]);
            porPartido[p.id] = pts;
            tot += pts;
        }
        return { id: u.id, nombre: u.nombre, puntajeBase: base, porPartido, total: base + tot };
    }).sort((a, b) => b.total - a.total);
};