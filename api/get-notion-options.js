// Trae las opciones reales (select) de "Proyecto" y "Ubicación" desde el
// esquema de la base "Agenda" de Notion, para mostrarlas como botones en vez
// de que el usuario tenga que escribirlas a mano.
//
// Variables de entorno requeridas en Vercel:
//   NOTION_TOKEN -> token de la conexion "AlDia Sync"

const NOTION_DATABASE_ID = '219d689c-60c5-81ab-90d6-e13c2d1a3e20';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'method not allowed' });
        return;
    }

    try {
        const notionRes = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}`, {
            headers: {
                Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
                'Notion-Version': '2022-06-28'
            }
        });
        const db = await notionRes.json();
        if (!notionRes.ok) {
            res.status(502).json({ error: 'notion error', detail: db });
            return;
        }
        const proyecto = (db.properties?.['Proyecto']?.select?.options || []).map(o => o.name);
        const ubicacion = (db.properties?.['Ubicación']?.select?.options || []).map(o => o.name);
        res.status(200).json({ proyecto, ubicacion });
    } catch (err) {
        console.error('get-notion-options error:', err);
        res.status(500).json({ error: 'internal error' });
    }
}
