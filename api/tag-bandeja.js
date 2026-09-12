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

    const prompt = `Eres un clasificador de contexto para una lista de tareas/notas cortas en español.

Una ETIQUETA es una categoría AMPLIA y reusable que agrupa varias tareas por lugar, área de la vida o proyecto (ejemplos: "casa", "trabajo", "salud", "finanzas", "lectura", "mandados", "centro", "personal"). Debe poder aplicarse a muchas tareas distintas.

REGLA MÁS IMPORTANTE: la etiqueta NUNCA puede ser el mismo texto (o casi el mismo) que la tarea — eso no agrupa nada, es inútil. Ejemplos de lo que NO debes hacer:
- tarea "correr" -> etiqueta "correr" ❌ (correcto sería "salud" o "deporte")
- tarea "leer" -> etiqueta "leer" ❌ (correcto sería "lectura" o "personal")
- tarea "llamar al dentista" -> etiqueta "dentista" ❌ (correcto sería "salud")

Etiquetas que ya existen en este tablero — prioriza reusar una si encaja, aunque sea a grandes rasgos: ${etiquetasDisponibles.length ? etiquetasDisponibles.join(', ') : '(ninguna todavía)'}

Si de verdad ninguna encaja, propone una etiqueta nueva corta (una palabra, minúscula, sin acentos) que sea una CATEGORÍA reusable, no el nombre de la tarea.

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
                model: 'openai/gpt-oss-20b',
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
