// Crea una pagina nueva en la base "Agenda" de Notion desde AlDia.
// Camino inverso al webhook: AlDia -> Notion (en vez de Notion -> AlDia).
//
// Variables de entorno requeridas en Vercel:
//   NOTION_TOKEN -> token de la conexion "AlDia Sync"

const NOTION_DATABASE_ID = '219d689c-60c5-81ab-90d6-e13c2d1a3e20';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'method not allowed' });
        return;
    }

    const { title, date, startTime, endTime, proyecto, ubicacion, precio, cobrado, celular } = req.body || {};
    if (!title || !date || !startTime) {
        res.status(400).json({ error: 'faltan title, date o startTime' });
        return;
    }

    const startIso = `${date}T${startTime}:00.000-05:00`;
    const endIso = endTime ? `${date}T${endTime}:00.000-05:00` : undefined;

    // Proyecto y Ubicación son "select" en Notion: si el valor no existe como
    // opción todavía, la API lo crea sola (mismo comportamiento que editar la
    // sesión a mano en Notion). Entrega/Saldo/Días Restantes son fórmulas —
    // Notion las calcula solo, así que no se mandan acá.
    const properties = {
        'Título': { title: [{ text: { content: title } }] },
        'Fecha y hora': { date: { start: startIso, end: endIso || null } },
        Estado: { status: { name: 'Agendado' } }
    };
    if (proyecto) properties['Proyecto'] = { select: { name: proyecto } };
    if (ubicacion) properties['Ubicación'] = { select: { name: ubicacion } };
    if (precio !== undefined && precio !== null && precio !== '') properties['Precio'] = { number: Number(precio) };
    if (cobrado !== undefined && cobrado !== null && cobrado !== '') properties['Cobrado'] = { number: Number(cobrado) };
    if (celular) properties['Celular'] = { phone_number: celular };

    try {
        const notionRes = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                parent: { database_id: NOTION_DATABASE_ID },
                properties
            })
        });
        const page = await notionRes.json();
        if (!notionRes.ok) {
            res.status(502).json({ error: 'notion error', detail: page });
            return;
        }
        res.status(200).json({ ok: true, notionId: page.id, url: page.url });
    } catch (err) {
        console.error('create-notion-session error:', err);
        res.status(500).json({ error: 'internal error' });
    }
}
