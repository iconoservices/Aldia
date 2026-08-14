// Cambia el Estado (status) de una página existente en la base "Agenda" de
// Notion desde AlDia — el botón de la pestaña Notion llama esto al mover el
// pedido de un paso del flujo a otro (Agendado -> ... -> Entregado).
//
// Variables de entorno requeridas en Vercel:
//   NOTION_TOKEN -> token de la conexion "AlDia Sync"

const ESTADOS_VALIDOS = ['Agendado', 'Realizado', 'En Edición', 'Terminado', 'Entregado'];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'method not allowed' });
        return;
    }

    const { notionId, estado } = req.body || {};
    if (!notionId || !ESTADOS_VALIDOS.includes(estado)) {
        res.status(400).json({ error: 'faltan notionId o estado inválido', estadosValidos: ESTADOS_VALIDOS });
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
                properties: { Estado: { status: { name: estado } } }
            })
        });
        const page = await notionRes.json();
        if (!notionRes.ok) {
            res.status(502).json({ error: 'notion error', detail: page });
            return;
        }
        res.status(200).json({ ok: true, estado });
    } catch (err) {
        console.error('update-notion-status error:', err);
        res.status(500).json({ error: 'internal error' });
    }
}
