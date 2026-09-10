// One-off: reemplaza las líneas "[tag] ..." que dejó seed-bandeja.mjs por
// una versión con subtítulos (# ...) y en orden. Aditivo para lo demás.
// Uso:  node scripts/reorg-bandeja.mjs
import { readFileSync, writeFileSync } from 'fs';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const USER_UID = '9g75PBn61RhlVd0qN8GarYiqMZC2'; // jnmcsky@gmail.com

// Las 13 líneas que metió seed-bandeja.mjs (se quitan si están tal cual).
const VIEJAS = [
    '[Entrega·HOY] 15 años — atrasada, era 9 sep',
    '[Entrega] Prenatal (embarazada) — mañana 10 sep',
    '[Entrega] Boda — atrasada; un amigo ayuda a editar',
    '[Entrega] Sesión — en 3 días (12 sep)',
    '[Entrega] Retoques + más fotos para el cliente que ya recibió',
    '[Entrega] Libro a mi hermana',
    '[Clientes] Cliente con entrega lista — esperar que escriba',
    '[Clientes] Mensaje a los que dejé en visto (S/20 de adelanto c/u) — reagendar',
    '[Dinero] Alquiler del cuarto S/130 → Fijos',
    '[Dinero] Cuota del pasaje S/300 — vence 15 sep → Fijos',
    '[Dinero] Pago de un video S/120 → Deudas',
    '[Dinero] Hueco total a cubrir ahora: S/550',
    '[Plata] Publicar liquidación de mercadería estancada en marketplaces',
];

// La versión nueva, con subtítulos y en orden.
const NUEVAS = [
    '# Entregas',
    '15 años — atrasada, era hoy 9 sep',
    'Prenatal (embarazada) — entrega mañana 10 sep',
    'Boda — atrasada; un amigo ayuda a editar',
    'Sesión — entrega en 3 días (12 sep)',
    'Retoques + más fotos para el cliente que ya recibió',
    'Libro a mi hermana',
    '# Clientes',
    'Cliente con entrega lista — esperar que escriba',
    'Mensaje a los que dejé en visto (S/20 de adelanto c/u) — reagendar',
    '# Dinero — hueco S/550',
    'Alquiler del cuarto S/130 → Fijos',
    'Cuota del pasaje S/300 — vence 15 sep → Fijos',
    'Pago de un video S/120 → Deudas',
    '# Plata',
    'Publicar liquidación de mercadería estancada en marketplaces',
];

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
    if (!bandeja) { console.log('No hay Bandeja. Nada que hacer.'); return; }

    // Se quitan las 13 líneas viejas y también cualquier línea que ya sea
    // idéntica a una de las nuevas (p. ej. un subtítulo agregado a mano
    // durante las pruebas), para no dejar duplicados.
    const quitar = new Set([...VIEJAS, ...NUEVAS].map(s => s.trim()));
    const conservados = bandeja.items.filter(i => !quitar.has(i.text.trim()));
    const nuevos = NUEVAS.map(t => ({ id: nid(), text: t, completed: false }));

    bandeja.items = [...nuevos, ...conservados];

    await ref.set({ notes }, { merge: true });
    console.log(`Reorganizada: ${nuevos.length} líneas nuevas, ${conservados.length} conservadas. Total: ${bandeja.items.length}.`);
}

main()
    .catch(err => { console.error('ERROR:', err); process.exitCode = 1; })
    .finally(() => deleteApp(app));
