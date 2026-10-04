// Edita los campos de una página existente en la base "Agenda" de Notion desde
// AlDia (título, fecha/hora, proyecto, ubicación, precio, cobrado, celular).
// Solo manda lo que viene en el body; un string vacío limpia el campo.
//
// Variables de entorno requeridas en Vercel:
//   NOTION_TOKEN -> token de la conexion "AlDia Sync"

const OFFSET = '-05:00';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'method not allowed' });
        return;
    }

    const { notionId, title, date, startTime, endTime, proyecto, ubicacion, precio, cobrado, celular } = req.body || {};
    if (!notionId) {
        res.status(400).json({ error: 'falta notionId' });
        return;
    }

    const properties = {};
    if (title !== undefined) properties['Título'] = { title: [{ text: { content: title } }] };
    if (date !== undefined) {
        properties['Fecha y hora'] = date && startTime
            ? { date: { start: `${date}T${startTime}:00.000${OFFSET}`, end: endTime ? `${date}T${endTime}:00.000${OFFSET}` : null } }
            : { date: null };
    }
    if (proyecto !== undefined) properties['Proyecto'] = { select: proyecto ? { name: proyecto } : null };
    if (ubicacion !== undefined) properties['Ubicación'] = { select: ubicacion ? { name: ubicacion } : null };
    const num = (v) => (v === '' || v === null ? null : Number(v));
    if (precio !== undefined) properties['Precio'] = { number: num(precio) };
    if (cobrado !== undefined) properties['Cobrado'] = { number: num(cobrado) };
    if (celular !== undefined) {
        const digitos = String(celular).replace(/\D/g, '');
        properties['Celular'] = { number: digitos ? Number(digitos) : null };
    }

    try {
        const notionRes = await fetch(`https://api.notion.com/v1/pages/${notionId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ properties })
        });
        const page = await notionRes.json();
        if (!notionRes.ok) {
            res.status(502).json({ error: 'notion error', detail: page });
            return;
        }
        res.status(200).json({ ok: true });
    } catch (err) {
        console.error('update-notion-session error:', err);
        res.status(500).json({ error: 'internal error' });
    }
}
