// Lectura/escritura de colecciones de AlDía desde el servidor (Admin SDK).
// Desde el esquema 2 cada colección vive en users/{uid}/datos/{clave} = { v, t };
// antes todo estaba en users/{uid}. Esto soporta ambos, en una transacción para
// no pisar la migración que hace la app al abrirse.
// (El prefijo _ hace que Vercel no lo publique como función.)

export const ESQUEMA_DATOS = 2;

// claves: colecciones a leer. fn(actual) devuelve { clave: nuevoValor } con lo
// que hay que escribir, o null para no escribir nada.
export async function actualizarDatos(db, uid, claves, fn) {
    const rootRef = db.collection('users').doc(uid);
    return db.runTransaction(async (tx) => {
        const root = (await tx.get(rootRef)).data() || {};
        const v2 = root.esquema === ESQUEMA_DATOS;
        const actual = {};
        if (v2) {
            const snaps = await tx.getAll(...claves.map((c) => rootRef.collection('datos').doc(c)));
            snaps.forEach((s, i) => { actual[claves[i]] = s.exists ? s.data().v : undefined; });
        } else {
            claves.forEach((c) => { actual[c] = root[c]; });
        }

        const cambios = await fn(actual);
        if (!cambios) return null;
        const t = new Date().toISOString();
        if (v2) {
            for (const [k, v] of Object.entries(cambios)) tx.set(rootRef.collection('datos').doc(k), { v, t });
        } else {
            tx.set(rootRef, { ...cambios, lastSync: t }, { merge: true });
        }
        return cambios;
    });
}
