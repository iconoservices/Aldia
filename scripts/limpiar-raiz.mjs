// Borra de users/{uid} los campos del esquema viejo (documento único), una vez que
// todas las colecciones existen en users/{uid}/datos/*. Antes deja un respaldo en backups/.
// Uso: node scripts/limpiar-raiz.mjs [uid] [--aplicar]   (sin --aplicar solo muestra)
import { readFileSync, writeFileSync } from 'fs';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const aplicar = args.includes('--aplicar');
const USER_UID = args.find(a => !a.startsWith('--')) || '9g75PBn61RhlVd0qN8GarYiqMZC2'; // jnmcsky@gmail.com
const MANTENER = new Set(['esquema', 'migradoEn', 'lastSync']);

const app = initializeApp({ credential: cert(JSON.parse(readFileSync(new URL('../firebase-service-account.json', import.meta.url), 'utf8'))) });
const db = getFirestore(app);
const ref = db.collection('users').doc(USER_UID);

const root = (await ref.get()).data() || {};
const datos = Object.fromEntries((await ref.collection('datos').get()).docs.map(d => [d.id, d.data()]));
if (root.esquema !== 2) throw new Error('Todavía no migrado (esquema != 2): no se toca nada.');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
writeFileSync(new URL(`../backups/firestore-doc.${stamp}.antes-limpiar-raiz.json`, import.meta.url), JSON.stringify({ raiz: root, datos }, null, 2));
console.log(`Backup: backups/firestore-doc.${stamp}.antes-limpiar-raiz.json`);

const viejos = Object.keys(root).filter(k => !MANTENER.has(k));
// Cada colección vieja tiene que existir ya en datos/ (salvo campos sueltos sin colección, p. ej. "balance").
const faltan = viejos.filter(k => !(k in datos) && Array.isArray(root[k]) && root[k].length);
if (faltan.length) throw new Error(`Faltan en datos/: ${faltan.join(', ')} — no se borra nada.`);

const bytes = Buffer.byteLength(JSON.stringify(Object.fromEntries(viejos.map(k => [k, root[k]]))));
console.log(`Campos viejos (${viejos.length}, ${(bytes / 1024).toFixed(1)} KB): ${viejos.join(', ')}`);
if (!aplicar) { console.log('Solo vista previa. Usa --aplicar para borrar.'); }
else {
    await ref.update(Object.fromEntries(viejos.map(k => [k, FieldValue.delete()])));
    console.log('Borrados. Queda:', JSON.stringify((await ref.get()).data()));
}
await deleteApp(app);
