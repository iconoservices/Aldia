// Sugiere etiquetas de contexto para líneas sueltas de la Bandeja usando Groq
// (modelo Llama, gratis/rápido) — el usuario revisa y confirma antes de aplicar,
// esto solo propone.
//
// Variables de entorno requeridas en Vercel:
//   GROQ_API_KEY -> key de https://console.groq.com

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'method not allowed' });
        return;
    }

    const { items, etiquetas } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'faltan items' });
        return;
    }

    const etiquetasDisponibles = Array.isArray(etiquetas) ? etiquetas : [];

    const prompt = `Eres un clasificador de contexto para una lista de tareas/notas cortas en español, para la bandeja de entrada personal de un usuario.

Una ETIQUETA es una categoría AMPLIA y reusable que agrupa varias tareas por lugar, área de la vida, cliente o proyecto. NUNCA puede ser el mismo texto (o casi el mismo) que la tarea — eso no agrupa nada. Ejemplos de lo que NO debes hacer:
- tarea "correr" -> etiqueta "correr" ❌ (correcto: "salud" o "deporte")
- tarea "leer" -> etiqueta "leer" ❌ (correcto: "lectura" o "personal")
- tarea "llamar al dentista" -> etiqueta "dentista" ❌ (correcto: "salud")

PASO 1 — mira las etiquetas que este usuario YA usa (si hay): ${etiquetasDisponibles.length ? etiquetasDisponibles.join(', ') : '(ninguna todavía, es su primera vez)'}
Esas etiquetas te dicen cómo esta persona organiza SU vida — pueden ser áreas de negocio (ej. "clientes", "entregas", "dinero"), no solo genéricas de vida diaria. Antes de inventar una etiqueta nueva, revisa en serio si alguna de las que ya existen encaja, aunque sea a grandes rasgos — se prefiere reusar sobre crear.

PASO 2 — si de verdad ninguna existente encaja, mira TODO el lote de líneas nuevas junto (no una por una): si dos o más líneas del lote comparten el mismo tema, dales la MISMA etiqueta nueva en vez de inventar una distinta para cada una. No repartas en una etiqueta de un solo uso si puedes agrupar.

PASO 3 — la etiqueta nueva debe ser corta (una palabra, minúscula, sin acentos) y del mismo "nivel" que las que ya existen: un ÁREA de la vida/negocio, no una actividad puntual.

Líneas a clasificar (id -> texto):
${items.map(it => `${it.id} -> ${it.text}`).join('\n')}

Responde SOLO con un JSON, sin texto adicional, con esta forma exacta:
{"sugerencias": [{"id": <id numérico tal cual te lo di>, "tag": "<etiqueta>"}]}`;

    try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
                response_format: { type: 'json_object' }
            })
        });

        const data = await groqRes.json();
        if (!groqRes.ok) {
            res.status(502).json({ error: 'groq error', detail: data });
            return;
        }

        const raw = data.choices?.[0]?.message?.content ?? '';
        let sugerencias;
        try {
            const parsed = JSON.parse(raw);
            sugerencias = Array.isArray(parsed) ? parsed : (parsed.sugerencias ?? parsed.items ?? parsed.result ?? []);
        } catch {
            res.status(502).json({ error: 'respuesta no parseable', detail: raw });
            return;
        }

        res.status(200).json({ ok: true, sugerencias });
    } catch (err) {
        console.error('tag-bandeja error:', err);
        res.status(500).json({ error: 'internal error' });
    }
}
