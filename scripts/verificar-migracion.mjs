// Solo lectura: compara cada colección del documento único users/{uid} con su
// documento users/{uid}/datos/{clave} (= igual, ≠ distinto, c compacto). Uso: node scripts/verificar-migracion.mjs [uid]
import { readFileSync } from 'fs';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const USER_UID = process.argv[2] || '9g75PBn61RhlVd0qN8GarYiqMZC2'; // jnmcsky@gmail.com
const app = initializeApp({ credential: cert(JSON.parse(readFileSync(new URL('../firebase-service-account.json', import.meta.url), 'utf8'))) });
const db = getFirestore(app);
const ref = db.collection('users').doc(USER_UID);
const root = (await ref.get()).data() || {};
const datos = Object.fromEntries((await ref.collection('datos').get()).docs.map(d => [d.id, d.data()]));
console.log(`esquema=${root.esquema ?? '(sin)'} migradoEn=${root.migradoEn ?? '-'} · ${Object.keys(datos).length} documentos en datos/`);
for (const [k, d] of Object.entries(datos).sort()) {
    // Formato compacto (campo c): no se compara con el documento viejo, solo se mide.
    const marca = d.c !== undefined ? 'c' : JSON.stringify(root[k]) === JSON.stringify(d.v) ? '=' : '≠';
    console.log(`  ${marca} ${k.padEnd(18)} ${String(Buffer.byteLength(JSON.stringify(d.c ?? d.v))).padStart(7)} B  t=${d.t}`);
}
await deleteApp(app);
