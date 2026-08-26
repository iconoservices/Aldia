// Sincronización manual, disparada por el botón "Sincronizar ahora" de la
// pestaña Agenda. Hace lo mismo que scripts/sync-notion.js (trae TODAS las
// sesiones de la base "Agenda" de Notion y las mergea en el calendario de
// Firestore evitando duplicados) pero como función serverless, usando las
// mismas variables de entorno que notion-webhook.js en vez de archivos locales.
//
// Variables de entorno requeridas en Vercel:
//   NOTION_TOKEN                  -> token de la conexion "AlDia Sync"
//   FIREBASE_SERVICE_ACCOUNT_JSON -> contenido completo de firebase-service-account.json, como string
//   ALDIA_USER_UID                -> uid del usuario de Firebase (users/{uid})

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const NOTION_DATABASE_ID = '219d689c-60c5-81ab-90d6-e13c2d1a3e20';

function getFirebaseApp() {
    if (getApps().length) return getApps()[0];
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return initializeApp({ credential: cert(serviceAccount) });
}

async function fetchAllNotionSessions() {
    const results = [];
    let cursor;
    do {
        const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
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

function parseNotionDate(iso) {
    const [datePart, timePart] = iso.split('T');
    return { date: datePart, time: timePart ? timePart.slice(0, 5) : null };
}

function addMinutesToTime(time, minutes) {
    const [h, m] = time.split(':').map(Number);
    const total = (h * 60 + m + minutes + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function readFormula(prop) {
    const f = prop?.formula;
    if (!f) return undefined;
    return f[f.type];
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
    const entregaDate = readFormula(props['Entrega ']);

    const event = {
        id: notionIdToNumber(page.id),
        notionId: page.id,
        title: location ? `${title} (${location})` : title,
        date,
        startTime,
        endTime,
        description: status ? `Importado de Notion — ${status}` : 'Importado de Notion',
        notionProyecto: props['Proyecto']?.select?.name,
        notionEstado: status,
        notionPrecio: props['Precio']?.number,
        notionCobrado: props['Cobrado']?.number,
        notionSaldoPorCobrar: readFormula(props['Saldo por cobrar']),
        notionEntregaFecha: entregaDate?.start ? parseNotionDate(entregaDate.start).date : undefined,
        notionDiasRestantes: readFormula(props['Dias Restantes']),
        notionCelular: props['Celular']?.phone_number
    };
    return Object.fromEntries(Object.entries(event).filter(([, v]) => v !== undefined));
}

function notionIdToNumber(uuid) {
    let hash = 0;
    for (const ch of uuid) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return hash;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'method not allowed' });
        return;
    }

    try {
        const db = getFirestore(getFirebaseApp());
        const docRef = db.collection('users').doc(process.env.ALDIA_USER_UID);
        const snap = await docRef.get();
        const data = snap.data() || {};

        const existingAgenda = Array.isArray(data.agenda) ? data.agenda : [];
        const existingNotionIds = new Set(existingAgenda.filter((e) => e.notionId).map((e) => e.notionId));

        const pages = await fetchAllNotionSessions();
        const fetchedEvents = pages.map(toCalendarEvent).filter(Boolean);
        const fetchedNotionIds = new Set(fetchedEvents.map((e) => e.notionId));

        let added = 0, updated = 0, removed = 0;
        fetchedEvents.forEach((e) => { if (existingNotionIds.has(e.notionId)) updated++; else added++; });
        existingNotionIds.forEach((id) => { if (!fetchedNotionIds.has(id)) removed++; });

        // Reconstruye agenda: eventos no-Notion tal cual, más los eventos de Notion
        // exactamente como están AHORA en Notion (fetchAllNotionSessions ya solo
        // devuelve páginas vivas, sin archivar/borrar). Antes esto arrancaba de
        // existingAgenda y solo agregaba/actualizaba encima sin nunca quitar, así
        // que una página borrada en Notion se quedaba pegada en AlDía para siempre.
        const nonNotion = existingAgenda.filter((e) => !e.notionId);
        const nextAgenda = [...nonNotion, ...fetchedEvents];

        await docRef.set(
            { agenda: nextAgenda, lastSync: new Date().toISOString() },
            { merge: true }
        );

        res.status(200).json({ ok: true, added, updated, removed, total: fetchedEvents.length });
    } catch (err) {
        console.error('sync-notion-now error:', err);
        res.status(500).json({ error: 'internal error' });
    }
}
