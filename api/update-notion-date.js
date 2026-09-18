// Cambia la "Fecha y hora" de una página existente en la base "Agenda" de
// Notion desde AlDia — lo usa el botón de reagendar de la pestaña Agenda,
// para que una sesión movida no vuelva a su fecha vieja en la próxima
// sincronización (Notion sigue siendo la fuente de verdad para date/hora).
//
// Variables de entorno requeridas en Vercel:
//   NOTION_TOKEN -> token de la conexion "AlDia Sync"

// Peru no tiene horario de verano: offset fijo, igual que asume el resto
// del pipeline de Notion (ver notion-webhook.js / sync-notion.js).
const OFFSET = '-05:00';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'method not allowed' });
        return;
    }

    // fechaOriginal (opcional, "YYYY-MM-DD"): la fecha que tenía la sesión antes
    // de reagendarla por primera vez. Se guarda en la columna "Fecha original"
    // de Notion para no perder el historial; el cliente solo la manda si esa
    // columna todavía está vacía.
    const { notionId, date, startTime, endTime, fechaOriginal } = req.body || {};
    if (!notionId || !date || !startTime) {
        res.status(400).json({ error: 'faltan notionId, date o startTime' });
        return;
    }

    const properties = {
        'Fecha y hora': {
            date: {
                start: `${date}T${startTime}:00.000${OFFSET}`,
                end: endTime ? `${date}T${endTime}:00.000${OFFSET}` : null
            }
        }
    };
    if (fechaOriginal) properties['Fecha original'] = { date: { start: fechaOriginal } };

    const patch = (props) => fetch(`https://api.notion.com/v1/pages/${notionId}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ properties: props })
    });

    try {
        let notionRes = await patch(properties);
        // Si la columna "Fecha original" no existe (o se borró), reagendar no
        // debe fallar por eso: se reintenta solo con la fecha nueva.
        if (!notionRes.ok && fechaOriginal) {
            notionRes = await patch({ 'Fecha y hora': properties['Fecha y hora'] });
        }
        const page = await notionRes.json();
        if (!notionRes.ok) {
            res.status(502).json({ error: 'notion error', detail: page });
            return;
        }
        res.status(200).json({ ok: true, date, startTime, endTime });
    } catch (err) {
        console.error('update-notion-date error:', err);
        res.status(500).json({ error: 'internal error' });
    }
}
