// One-off: agrega un resumen de lo urgente a la Bandeja (nota q:'bandeja')
// en el doc real de Firestore del usuario. Aditivo, con backup previo.
// Uso:  node scripts/seed-bandeja.mjs
import { readFileSync, writeFileSync } from 'fs';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const USER_UID = '9g75PBn61RhlVd0qN8GarYiqMZC2'; // jnmcsky@gmail.com

const RESUMEN = [
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
    console.log(`Backup: backups/notes-${stamp}.json (${notes.length} notas)`);

    let bandeja = notes.find(n => n.type === 'checklist' && n.q === 'bandeja');
    let creada = false;
    if (!bandeja) {
        bandeja = { id: nid(), title: 'Bandeja', content: '', type: 'checklist', items: [], q: 'bandeja', color: '#FFFFFF', date: new Date().toISOString() };
        notes.unshift(bandeja);
        creada = true;
    }

    const existentes = new Set(bandeja.items.map(i => i.text.trim()));
    const nuevos = RESUMEN.filter(t => !existentes.has(t.trim())).map(t => ({ id: nid(), text: t, completed: false }));

    if (nuevos.length === 0) {
        console.log('El resumen ya estaba en la Bandeja. Nada que agregar.');
        return;
    }

    bandeja.items = [...nuevos, ...bandeja.items]; // lo nuevo arriba, como en la UI

    await ref.set({ notes }, { merge: true });
    console.log(`${creada ? 'Bandeja creada. ' : ''}${nuevos.length} línea(s) agregada(s). Total en Bandeja: ${bandeja.items.length}.`);
}

main()
    .catch(err => { console.error('ERROR:', err); process.exitCode = 1; })
    .finally(() => deleteApp(app));
