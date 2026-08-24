// Actualiza el campo "Cobrado" (number) de una página existente en la base
// "Agenda" de Notion — lo usa el botón "Abonar" de la pestaña Agenda para
// registrar un adelanto/pago sin salir de AlDia. "Saldo por cobrar" es una
// fórmula en Notion (Precio - Cobrado), se recalcula sola allá.
//
// Variables de entorno requeridas en Vercel:
//   NOTION_TOKEN -> token de la conexion "AlDia Sync"

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'method not allowed' });
        return;
    }

    const { notionId, cobrado } = req.body || {};
    if (!notionId || typeof cobrado !== 'number' || !Number.isFinite(cobrado) || cobrado < 0) {
        res.status(400).json({ error: 'faltan notionId o cobrado inválido' });
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
                properties: { Cobrado: { number: cobrado } }
            })
        });
        const page = await notionRes.json();
        if (!notionRes.ok) {
            res.status(502).json({ error: 'notion error', detail: page });
            return;
        }
        res.status(200).json({ ok: true, cobrado });
    } catch (err) {
        console.error('update-notion-cobrado error:', err);
        res.status(500).json({ error: 'internal error' });
    }
}
