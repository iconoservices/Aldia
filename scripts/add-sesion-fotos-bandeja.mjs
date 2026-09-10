// One-off: agrega "Sesión de fotos por pagar S/50 → Deudas" al bloque Dinero
// de la Bandeja y sube el hueco total de S/550 a S/600. Aditivo, con backup.
// Uso:  node scripts/add-sesion-fotos-bandeja.mjs
import { readFileSync, writeFileSync } from 'fs';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const USER_UID = '9g75PBn61RhlVd0qN8GarYiqMZC2'; // jnmcsky@gmail.com
const NUEVA = 'Sesión de fotos por pagar S/50 → Deudas';
const ANCLA = 'Pago de un video S/120 → Deudas'; // la nueva línea va justo después
const HUECO_VIEJO = 'S/550';
const HUECO_NUEVO = 'S/600';

const serviceAccount = JSON.parse(
    readFileSync(new URL('../firebase-service-account.json', import.meta.url), 'utf8')
);
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const nid = () => Date.now() + Math.floor(Math.random() * 100000);

async function main() {
    const ref = db.collection('users').doc(USER_UID);
    const snap = await ref.get();
    const data = snap.data() || {};
    const notes = Array.isArray(data.notes) ? data.notes : [];

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    writeFileSync(new URL(`../backups/notes-${stamp}.json`, import.meta.url), JSON.stringify(notes, null, 2));
    console.log(`Backup: backups/notes-${stamp}.json`);

    const bandeja = notes.find(n => n.type === 'checklist' && n.q === 'bandeja');
    if (!bandeja) { console.log('No hay Bandeja.'); return; }

    if (bandeja.items.some(i => i.text.trim() === NUEVA)) {
        console.log('La línea ya estaba. Nada que hacer.');
        return;
    }

    const items = [...bandeja.items];
    const at = items.findIndex(i => i.text.trim() === ANCLA);
    const linea = { id: nid(), text: NUEVA, completed: false };
    if (at >= 0) items.splice(at + 1, 0, linea);
    else items.push(linea);

    // Sube el hueco en el subtítulo y en la línea de total.
    for (const it of items) {
        if (it.text.includes(HUECO_VIEJO)) it.text = it.text.replace(HUECO_VIEJO, HUECO_NUEVO);
    }

    bandeja.items = items;
    await ref.set({ notes }, { merge: true });
    console.log(`Agregada "${NUEVA}". Hueco actualizado a ${HUECO_NUEVO}. Total en Bandeja: ${items.length}.`);
}

main()
    .catch(err => { console.error('ERROR:', err); process.exitCode = 1; })
    .finally(() => deleteApp(app));
