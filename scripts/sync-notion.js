// Trae TODAS las sesiones (pasadas y futuras) de la base "Agenda" de Notion
// y las agrega al calendario real de AlDia (Firestore), evitando duplicados.
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

// Trae TODAS las sesiones (pasadas y futuras), paginando si hace falta.
async function fetchAllNotionSessions() {
    const results = [];
    let cursor;
    do {
        const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${NOTION_TOKEN}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sorts: [{ property: 'Fecha y hora', direction: 'ascending' }],
                ...(cursor ? { start_cursor: cursor } : {})
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error('Notion API error: ' + JSON.stringify(data));
        results.push(...data.results);
        cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);
    return results;
}

// Lee fecha/hora literal del string ISO de Notion (ya viene en la zona horaria
// que uso en Notion) sin pasar por Date, para no depender de la zona horaria
// de la maquina/servidor donde corre este script.
function parseNotionDate(iso) {
    const [datePart, timePart] = iso.split('T');
    return { date: datePart, time: timePart ? timePart.slice(0, 5) : null };
}

function addMinutesToTime(time, minutes) {
    const [h, m] = time.split(':').map(Number);
    const total = (h * 60 + m + minutes + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function toCalendarEvent(page) {
    const props = page.properties;
    const title = props['Título']?.title?.[0]?.plain_text?.trim();
    const dateProp = props['Fecha y hora']?.date;
    if (!title || !dateProp?.start) return null;

    const { date, time: parsedStart } = parseNotionDate(dateProp.start);
    const startTime = parsedStart || '09:00';
    const endTime = dateProp.end
        ? parseNotionDate(dateProp.end).time || addMinutesToTime(startTime, 90)
        : addMinutesToTime(startTime, 90);

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

    const pages = await fetchAllNotionSessions();
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
