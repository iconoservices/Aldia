// One-off: convierte los subtítulos "# ..." de la Bandeja en ETIQUETAS.
// Cada "# Entregas" se vuelve la etiqueta `entregas` en las líneas que
// venían debajo, y la línea del subtítulo se elimina.
// Uso:  node scripts/migrar-bandeja-tags.mjs
import { readFileSync, writeFileSync } from 'fs';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const USER_UID = '9g75PBn61RhlVd0qN8GarYiqMZC2'; // jnmcsky@gmail.com

// Etiqueta corta a partir del texto del subtítulo: primera parte antes de
// " — " / "(" , solo letras/números/guiones, minúsculas, máx 24.
const tagDe = (texto) => texto
    .replace(/^#+\s*/, '')
    .split(/\s+[—-]\s+|\(/)[0]
    .trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 24);

const serviceAccount = JSON.parse(
    readFileSync(new URL('../firebase-service-account.json', import.meta.url), 'utf8')
);
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

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

    let curTag = null;
    const nuevos = [];
    let convertidos = 0, cabeceras = 0;
    for (const it of bandeja.items) {
        if (it.text.trimStart().startsWith('#')) {
            curTag = tagDe(it.text) || null;
            cabeceras++;
            continue; // se elimina la línea del subtítulo
        }
        if (curTag) {
            const ts = new Set(it.tags ?? []);
            if (!ts.has(curTag)) { ts.add(curTag); convertidos++; }
            nuevos.push({ ...it, tags: [...ts] });
        } else {
            nuevos.push(it);
        }
    }

    bandeja.items = nuevos;
    await ref.set({ notes }, { merge: true });
    console.log(`${cabeceras} subtítulo(s) → etiqueta. ${convertidos} línea(s) etiquetada(s). Quedan ${nuevos.length} líneas.`);
}

main()
    .catch(err => { console.error('ERROR:', err); process.exitCode = 1; })
    .finally(() => deleteApp(app));
