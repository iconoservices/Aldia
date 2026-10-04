// Agrega o quita opciones de los selects "Proyecto" / "Ubicación" de la base
// "Agenda" de Notion, para administrarlas desde AlDia sin abrir Notion.
// Ojo: quitar una opción la borra del esquema; las sesiones que la usaban
// quedan sin ese valor en Notion.
//
// Variables de entorno requeridas en Vercel:
//   NOTION_TOKEN -> token de la conexion "AlDia Sync"

const NOTION_DATABASE_ID = '219d689c-60c5-81ab-90d6-e13c2d1a3e20';
const CAMPOS = { proyecto: 'Proyecto', ubicacion: 'Ubicación' };

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'method not allowed' });
        return;
    }

    const { campo, accion, nombre } = req.body || {};
    const prop = CAMPOS[campo];
    const name = typeof nombre === 'string' ? nombre.trim() : '';
    if (!prop || !name || !['add', 'remove'].includes(accion)) {
        res.status(400).json({ error: 'faltan campo, accion o nombre' });
        return;
    }

    const headers = {
        Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
    };

    try {
        const dbRes = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}`, { headers });
        const db = await dbRes.json();
        if (!dbRes.ok) {
            res.status(502).json({ error: 'notion error', detail: db });
            return;
        }
        // Se reenvían solo los nombres actuales (Notion conserva color/id de las
        // que ya existen por nombre).
        let nombres = (db.properties?.[prop]?.select?.options || []).map(o => o.name);
        if (accion === 'add') {
            if (!nombres.includes(name)) nombres.push(name);
        } else {
            nombres = nombres.filter(n => n !== name);
        }
        const patchRes = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ properties: { [prop]: { select: { options: nombres.map(n => ({ name: n })) } } } })
        });
        const out = await patchRes.json();
        if (!patchRes.ok) {
            res.status(502).json({ error: 'notion error', detail: out });
            return;
        }
        res.status(200).json({ ok: true, opciones: nombres });
    } catch (err) {
        console.error('manage-notion-option error:', err);
        res.status(500).json({ error: 'internal error' });
    }
}
