export function calcularPuntosPartido(apuesta, oficial) {
    if (!apuesta || apuesta.resultado90 !== oficial.res90) return 0;
    if (oficial.res90 === 'X') {
        return apuesta.clasifica === oficial.clasifica ? 2 : 1;
    }
    return 2;
}

export function buildRealDataMap(partidos) {
    const map = {};
    for (const p of partidos) {
        if (p.resultado90_real) {
            map[p.id] = { res90: p.resultado90_real, clasifica: p.clasifica_real ?? null };
        }
    }
    return map;
}

export function calcularRanking(usuarios, apuestas, partidos) {
    const realData    = buildRealDataMap(partidos);
    const apuestaMap  = Object.fromEntries(apuestas.map(a => [a.id, a]));
    const partidosOrdenados = partidos.filter(p => realData[p.id]);

    return usuarios
        .map(usuario => {
            const apuesta     = apuestaMap[usuario.id];
            const pronosticos = apuesta?.pronosticos ?? {};
            const puntajeBase = usuario.puntaje_base ?? 0;

            const porPartido = {};
            let totalApuestas = 0;
            for (const p of partidosOrdenados) {
                const pts = calcularPuntosPartido(pronosticos[p.id], realData[p.id]);
                porPartido[p.id] = pts;
                totalApuestas += pts;
            }

            return {
                id: usuario.id,
                nombre: usuario.nombre,
                puntajeBase,
                porPartido,
                total: puntajeBase + totalApuestas,
            };
        })
        .sort((a, b) => b.total - a.total);
}