// Webhook de Notion -> Firestore de AlDia.
// Notion pega aca cada vez que algo cambia en la base "Agenda" (dentro de
// "Agenda Calendario"). El primer POST es una verificacion (trae
// verification_token, sin firma todavia); los siguientes son eventos reales,
// firmados con HMAC-SHA256 usando ese mismo token como secreto.
//
// Variables de entorno requeridas en Vercel:
//   NOTION_TOKEN                 -> token de la conexion "AlDia Sync"
//   NOTION_WEBHOOK_SECRET         -> verification_token (se obtiene la primera vez, ver logs)
//   FIREBASE_SERVICE_ACCOUNT_JSON -> contenido completo de firebase-service-account.json, como string
//   ALDIA_USER_UID                -> uid del usuario de Firebase (users/{uid})

import { createHmac, timingSafeEqual } from 'crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const config = { api: { bodyParser: false } };

const NOTION_DATABASE_ID = '219d689c-60c5-81ab-90d6-e13c2d1a3e20';

function getFirebaseApp() {
    if (getApps().length) return getApps()[0];
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return initializeApp({ credential: cert(serviceAccount) });
}

async function readRawBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8');
}

function isValidSignature(rawBody, signatureHeader, secret) {
    if (!signatureHeader || !secret) return false;
    const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    return a.length === b.length && timingSafeEqual(a, b);
}

async function fetchNotionPage(pageId) {
    const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        headers: {
            Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28'
        }
    });
    if (!res.ok) return null;
    return res.json();
}

// Lee fecha/hora literal del string ISO de Notion (ya viene en la zona horaria
// que uso en Notion, ej. "2026-08-09T15:00:00.000-05:00") sin pasar por Date,
// para no depender de en que zona horaria corre el servidor (Vercel = UTC).
function parseNotionDate(iso) {
    const [datePart, timePart] = iso.split('T');
    return { date: datePart, time: timePart ? timePart.slice(0, 5) : null };
}

function addMinutesToTime(time, minutes) {
    const [h, m] = time.split(':').map(Number);
    const total = (h * 60 + m + minutes + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Las propiedades tipo "formula" traen el valor bajo una key que depende de su
// tipo resuelto (number/string/date/boolean) — no siempre es la misma.
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
    // Firestore rechaza valores `undefined`: los campos opcionales que Notion
    // no tenga completos (Precio vacío, sin Proyecto, etc.) se omiten en vez
    // de mandarse como undefined.
    return Object.fromEntries(Object.entries(event).filter(([, v]) => v !== undefined));
}

function notionIdToNumber(uuid) {
    let hash = 0;
    for (const ch of uuid) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return hash;
}

async function upsertEvent(event) {
    const db = getFirestore(getFirebaseApp());
    const docRef = db.collection('users').doc(process.env.ALDIA_USER_UID);
    const snap = await docRef.get();
    const data = snap.data() || {};

    if (data.preferences?.notionSyncEnabled === false) return { skipped: true };

    const agenda = Array.isArray(data.agenda) ? data.agenda : [];
    const idx = agenda.findIndex((e) => e.notionId === event.notionId);
    const nextAgenda = idx === -1 ? [...agenda, event] : agenda.map((e, i) => (i === idx ? event : e));

    await docRef.set({ agenda: nextAgenda, lastSync: new Date().toISOString() }, { merge: true });
    return { upserted: true };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'method not allowed' });
        return;
    }

    const rawBody = await readRawBody(req);
    let body;
    try {
        body = JSON.parse(rawBody);
    } catch {
        res.status(400).json({ error: 'invalid json' });
        return;
    }

    // 1) Handshake de verificacion: Notion manda esto una sola vez, al crear/editar la suscripcion.
    if (body.verification_token) {
        console.log('NOTION VERIFICATION TOKEN:', body.verification_token);
        res.status(200).json({ ok: true });
        return;
    }

    // 2) Eventos reales: vienen firmados.
    const signature = req.headers['x-notion-signature'];
    if (!isValidSignature(rawBody, signature, process.env.NOTION_WEBHOOK_SECRET)) {
        res.status(401).json({ error: 'invalid signature' });
        return;
    }

    const entity = body.entity;
    const parentDb = body.data?.parent?.id || body.data?.parent?.database_id;

    // Solo nos interesan cambios en paginas de la base "Agenda". Otros eventos se ignoran en silencio.
    if (entity?.type !== 'page' || (parentDb && parentDb !== NOTION_DATABASE_ID)) {
        res.status(200).json({ ignored: true });
        return;
    }

    try {
        const page = await fetchNotionPage(entity.id);
        if (!page || page.archived) {
            res.status(200).json({ ok: true, skipped: 'not found or archived' });
            return;
        }
        const event = toCalendarEvent(page);
        if (!event) {
            res.status(200).json({ ok: true, skipped: 'sin titulo o fecha' });
            return;
        }
        const result = await upsertEvent(event);
        res.status(200).json(result);
    } catch (err) {
        console.error('notion-webhook error:', err);
        res.status(500).json({ error: 'internal error' });
    }
}
