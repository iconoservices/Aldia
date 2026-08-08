// Trae las sesiones proximas de la base "Agenda" de Notion y las agrega
// al calendario real de AlDia (Firestore), evitando duplicados.
// Uso: npm run sync:notion

process.loadEnvFile(new URL('../.env.local', import.meta.url));

import { readFileSync } from 'fs';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = '219d689c-60c5-81ab-90d6-e13c2d1a3e20'; // Base "Agenda" dentro de "Agenda Calendario"
const USER_UID = '9g75PBn61RhlVd0qN8GarYiqMZC2'; // jnmcsky@gmail.com

if (!NOTION_TOKEN) {
    console.error('Falta NOTION_TOKEN en .env.local');
    process.exit(1);
}

const serviceAccount = JSON.parse(
    readFileSync(new URL('../firebase-service-account.json', import.meta.url), 'utf8')
);
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function fetchUpcomingNotionSessions() {
    const today = new Date().toLocaleDateString('en-CA');
    const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            filter: { property: 'Fecha y hora', date: { on_or_after: today } },
            sorts: [{ property: 'Fecha y hora', direction: 'ascending' }]
        })
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Notion API error: ' + JSON.stringify(data));
    return data.results;
}

function toCalendarEvent(page) {
    const props = page.properties;
    const title = props['Título']?.title?.[0]?.plain_text?.trim();
    const dateProp = props['Fecha y hora']?.date;
    if (!title || !dateProp?.start) return null;

    const start = new Date(dateProp.start);
    const hasTime = dateProp.start.includes('T');
    const date = start.toLocaleDateString('en-CA');
    const startTime = hasTime ? start.toTimeString().slice(0, 5) : '09:00';
    const endTime = dateProp.end
        ? new Date(dateProp.end).toTimeString().slice(0, 5)
        : new Date(start.getTime() + 90 * 60000).toTimeString().slice(0, 5);

    const location = props['Ubicación']?.select?.name;
    const status = props['Estado']?.status?.name;

    return {
        id: notionIdToNumber(page.id),
        notionId: page.id,
        title: location ? `${title} (${location})` : title,
        date,
        startTime,
        endTime,
        description: status ? `Importado de Notion — ${status}` : 'Importado de Notion'
    };
}

// Id numerico estable derivado del UUID de Notion (para el campo `id` legado de CalendarEvent).
function notionIdToNumber(uuid) {
    let hash = 0;
    for (const ch of uuid) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return hash;
}

async function main() {
    const docRef = db.collection('users').doc(USER_UID);
    const snap = await docRef.get();
    const data = snap.data() || {};

    if (data.preferences?.notionSyncEnabled === false) {
        console.log('Sincronizacion con Notion desactivada en Ajustes de AlDia. No se hizo nada.');
        return;
    }

    const existingAgenda = Array.isArray(data.agenda) ? data.agenda : [];
    const existingNotionIds = new Set(existingAgenda.filter((e) => e.notionId).map((e) => e.notionId));

    const pages = await fetchUpcomingNotionSessions();
    const newEvents = pages
        .map(toCalendarEvent)
        .filter((e) => e && !existingNotionIds.has(e.notionId));

    if (newEvents.length === 0) {
        console.log('Nada nuevo que traer de Notion.');
        return;
    }

    await docRef.set(
        { agenda: [...existingAgenda, ...newEvents], lastSync: new Date().toISOString() },
        { merge: true }
    );

    console.log(`Importadas ${newEvents.length} sesion(es) nueva(s) de Notion:`);
    newEvents.forEach((e) => console.log(`  - ${e.title} — ${e.date} ${e.startTime}`));
}

main()
    .catch((err) => {
        console.error('Error en sync-notion:', err);
        process.exitCode = 1;
    })
    .finally(() => deleteApp(app));
