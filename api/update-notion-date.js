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

    const { notionId, date, startTime, endTime } = req.body || {};
    if (!notionId || !date || !startTime) {
        res.status(400).json({ error: 'faltan notionId, date o startTime' });
        return;
    }

    try {
        const notionRes = await fetch(`https://api.notion.com/v1/pages/${notionId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                properties: {
                    'Fecha y hora': {
                        date: {
                            start: `${date}T${startTime}:00.000${OFFSET}`,
                            end: endTime ? `${date}T${endTime}:00.000${OFFSET}` : null
                        }
                    }
                }
            })
        });
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
