// Solo lectura: mide cuánto ocupa users/{uid} (y sus subdocumentos datos/*)
// y deja una copia de seguridad completa en backups/.
// Uso:  node scripts/medir-doc.mjs [uid]
import { readFileSync, writeFileSync } from 'fs';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const USER_UID = process.argv[2] || '9g75PBn61RhlVd0qN8GarYiqMZC2'; // jnmcsky@gmail.com

const serviceAccount = JSON.parse(
    readFileSync(new URL('../firebase-service-account.json', import.meta.url), 'utf8')
);
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const bytes = (v) => Buffer.byteLength(JSON.stringify(v ?? null));
const kb = (b) => `${(b / 1024).toFixed(1)} KB`;

async function main() {
    const ref = db.collection('users').doc(USER_UID);
    const snap = await ref.get();
    const data = snap.data() || {};
    const subs = await ref.collection('datos').get();
    const datos = Object.fromEntries(subs.docs.map(d => [d.id, d.data()]));

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    writeFileSync(new URL(`../backups/firestore-doc.${stamp}.json`, import.meta.url), JSON.stringify({ raiz: data, datos }, null, 2));
    console.log(`Backup: backups/firestore-doc.${stamp}.json\n`);

    const filas = Object.entries(data).map(([k, v]) => [k, bytes(v), Array.isArray(v) ? v.length : '']).sort((a, b) => b[1] - a[1]);
    const total = filas.reduce((s, f) => s + f[1], 0);
    console.log(`Documento raíz: ${kb(total)} de 1024 KB (${(total / 10485.76).toFixed(1)}%)`);
    filas.forEach(([k, b, n]) => console.log(`  ${k.padEnd(20)} ${kb(b).padStart(10)} ${String(n).padStart(6)}`));
    if (subs.size) {
        console.log(`\nSubdocumentos datos/* (${subs.size}):`);
        subs.docs.map(d => [d.id, bytes(d.data())]).sort((a, b) => b[1] - a[1])
            .forEach(([k, b]) => console.log(`  ${k.padEnd(20)} ${kb(b).padStart(10)}`));
    }
    const db2 = Array.isArray(data.dailyBlocks) ? data.dailyBlocks : [];
    if (db2.length) {
        const fechas = new Set(db2.map(b => b.date));
        const hechas = db2.filter(b => b.completed).length;
        const viejas = db2.filter(b => b.date && b.date < new Date(Date.now() - 182 * 864e5).toISOString().slice(0, 10)).length;
        console.log(`\ndailyBlocks: ${db2.length} bloques, ${fechas.size} fechas, ${hechas} completados, ${viejas} de hace >6 meses, ~${Math.round(bytes(db2) / db2.length)} B/bloque`);
        console.log(`  primera fecha ${[...fechas].sort()[0]}, última ${[...fechas].sort().pop()}`);
    }
    await deleteApp(app);
}
main().catch(e => { console.error(e); process.exit(1); });
