import { useEffect, useRef, useState } from "react";
import { Plus, X, Trash2, BookOpen, Circle } from "lucide-react";
import type { Note } from "../../hooks/useAlDiaState";
import { C, bento, campo, botonPrimario, etiqueta, useIsMobile, paddingPagina, cabecera, tituloPagina, subtituloPagina } from "../../theme";
import { ConfirmDialog } from "../ui/ConfirmDialog";

// Ideas para módulos futuros de esta pestaña — anotadas para no perderlas,
// mismo patrón que el "Spec original" de Entregas: todavía sin construir.
const PENDING_IDEAS = [
    {
        title: "Inventario del tiempo",
        body: "Igual que un gasto en soles, anotar el tiempo como \"gasto\" (scroll infinito) o \"inversión\" (editar el video de un cliente). Al final de la semana: \"gastaste 40% de tu tiempo, invertiste 60%\".",
    },
    {
        title: "Log de presencia consciente",
        body: "Un botón de un solo toque, \"Momento de consciencia\", que guarda lugar y hora cada vez que te detienes a notar que estás vivo. Con el tiempo arma un mapa de cuándo y dónde estuviste más presente.",
    },
    {
        title: "Contador de vida restante (memento mori)",
        body: "Una barra que se llena muy lentamente, basada en la esperanza de vida promedio. No para dar miedo, sino enfoque — recordar que el tiempo es finito para no perderlo en lo que no importa.",
    },
];

/* ══════════════════════════════════════════════════════════════════
   TranqueoDeVidaDashboard — reflexiones tipo diario, más largas y
   personales que una nota de Cerebro. Reusa el mismo tipo Note (con
   q: "tranqueo-de-vida" como marca) en vez de un modelo paralelo;
   la única pieza nueva es la pantalla, pensada para leer con calma
   (tipografía más grande, más aire) en vez de para escanear rápido.
══════════════════════════════════════════════════════════════════ */

const MARKER = "tranqueo-de-vida";

const SEED_TITLE = "El cerebro como máquina de crear tiempo";
const SEED_CONTENT = `Diste en el clavo con una de las verdades más densas de la neurociencia y la física: el cerebro es una máquina de crear tiempo para no volverse loco.

En la física pura, el tiempo es una dimensión más — todo está ocurriendo "a la vez" en un flujo continuo. Pero el cerebro humano no puede procesar eso. Si viviéramos en el presente continuo del mundo, seríamos pura reacción, sin identidad.

1. La coherencia como instinto de supervivencia
El cerebro busca coherencia para no morir, literal. El "Yo" solo existe porque hay memoria (pasado) y expectativas (futuro). Si el cerebro dejara de fabricar esa línea de tiempo, ese "Yo" se disolvería. Una app de traqueo de tiempo es, en el fondo, un soporte para el cerebro: anotar "19 días de atraso" obliga al caos del presente continuo a entrar en una estructura lógica — le da una narrativa a la existencia.

2. El presente eterno vs. el tiempo social
El mundo social funciona con un tiempo inventado: relojes, calendarios, fechas de entrega. Los niños y las personas muy conectadas con su parte sensorial viven más en ese presente continuo; el sistema vive en el tiempo construido. El conflicto (y el de muchos neurodivergentes) es percibir que el tiempo social es una construcción, pero saber que para sobrevivir en el sistema hay que jugar a que el tiempo existe.

3. Traquear para no morir en el ahora
Si no se traquea, si no se anota, el presente devora: los días se funden unos con otros y de repente pasaron cinco años sin saber qué se hizo. Traquear horas, pagos y hábitos es una forma de anclarse — como tirar migas de pan en un bosque que se está moviendo constantemente.

4. Por qué esta mezcla no es tan rara
Un negocio es un intento de una organización de ser coherente en el tiempo para no quebrar (morir). Una app es un intento de un software de dar orden a los datos para no corromperse (morir). Una persona es un sistema intentando dar orden a su vida para no perderse en el flujo (morir). Es la misma lucha en distintas escalas.

Al final, una app de gestión de fotos y pollerías no es solo para ganar dinero — es la interfaz para interactuar con esa realidad continua y no dejar que arrastre. Es una forma de decir "yo estuve aquí, hice esto, y me tomó este tiempo". Un acto de rebeldía contra lo efímero.

¿Será por eso que obsesiona un poco el tema de los módulos y el orden? ¿Como una forma de crear un mundo seguro y lógico dentro de este teatro caótico?`;

interface TranqueoProps {
    notes: Note[];
    addNote: (title: string, content: string, type: 'text' | 'checklist', items: unknown[], q: string, color: string) => void;
    removeNote: (id: number) => void;
}

export const TranqueoDeVidaDashboard = ({ notes, addNote, removeNote }: TranqueoProps) => {
    const movil = useIsMobile();
    const entries = notes.filter(n => n.q === MARKER).sort((a, b) => b.date.localeCompare(a.date));

    const [addingOpen, setAddingOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    // Siembra la reflexión que dio inicio a esta pestaña, una sola vez. El ref
    // evita que StrictMode (que en dev invoca los efectos dos veces seguidas,
    // antes de que `notes` refleje la primera escritura) siembre el texto dos veces.
    const seededRef = useRef(false);
    useEffect(() => {
        if (seededRef.current) return;
        const alreadySeeded = notes.some(n => n.q === MARKER && n.title === SEED_TITLE);
        if (!alreadySeeded) {
            seededRef.current = true;
            addNote(SEED_TITLE, SEED_CONTENT, 'text', [], MARKER, '#FFFFFF');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submit = () => {
        if (!title.trim() || !content.trim()) return;
        addNote(title.trim(), content.trim(), 'text', [], MARKER, '#FFFFFF');
        setTitle(""); setContent("");
        setAddingOpen(false);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: movil ? "1rem" : "1.5rem", ...paddingPagina(movil), color: "var(--text-carbon)" }}>
            <div style={cabecera(movil)}>
                <div>
                    <h2 style={tituloPagina}>Tranqueo de Vida</h2>
                    <p style={subtituloPagina}>Reflexiones más largas — para leer con calma, no para escanear rápido.</p>
                </div>
            </div>

            <details style={{ ...bento, padding: "0.9rem 1rem" }}>
                <summary style={{ ...etiqueta, cursor: "pointer" }}>Ideas pendientes para esta pestaña</summary>
                <div style={{ marginTop: "0.8rem", display: "flex", flexDirection: "column", gap: "0.7rem", fontSize: "0.8rem", color: C.onSurfaceVariant, lineHeight: 1.5 }}>
                    {PENDING_IDEAS.map(({ title: ideaTitle, body }) => (
                        <div key={ideaTitle} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                            <Circle size={15} color={C.outlineVariant} style={{ flexShrink: 0, marginTop: "1px" }} />
                            <div>
                                <span style={{ fontWeight: 800, color: C.onSurface }}>{ideaTitle}</span>
                                {" — "}{body}
                            </div>
                        </div>
                    ))}
                </div>
            </details>

            {addingOpen ? (
                <div style={{ ...bento, padding: "1rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <input autoFocus placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} style={campo(movil)} />
                    <textarea placeholder="Escribe tu reflexión..." value={content} onChange={e => setContent(e.target.value)} rows={8} style={{ ...campo(movil), resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
                    <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={submit} style={botonPrimario(movil)}>Guardar</button>
                        <button onClick={() => { setAddingOpen(false); setTitle(""); setContent(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.outline, padding: "6px" }}><X size={18} /></button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setAddingOpen(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "none", border: `2px dashed ${C.outlineVariant}`, borderRadius: "12px", padding: "12px", cursor: "pointer", color: C.outline, fontWeight: 700, fontSize: "0.85rem" }}>
                    <Plus size={16} /> Nueva reflexión
                </button>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {entries.map(entry => {
                    const isOpen = expandedId === entry.id;
                    const preview = entry.content.split('\n')[0];
                    return (
                        <div key={entry.id} style={{ ...bento, padding: "1.2rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                                <button onClick={() => setExpandedId(isOpen ? null : entry.id)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", textAlign: "left", flex: 1, fontFamily: "inherit" }}>
                                    <BookOpen size={15} color={C.secondary} style={{ flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: "0.95rem", color: C.onSurface }}>{entry.title}</div>
                                        <div style={{ fontSize: "0.7rem", color: C.outline, marginTop: "2px" }}>{new Date(entry.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                    </div>
                                </button>
                                <button onClick={() => setConfirmDeleteId(entry.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "3px", display: "flex", flexShrink: 0 }}><Trash2 size={14} /></button>
                            </div>
                            <div
                                onClick={() => setExpandedId(isOpen ? null : entry.id)}
                                style={{ marginTop: "0.8rem", fontSize: "0.88rem", lineHeight: 1.7, color: C.onSurfaceVariant, whiteSpace: "pre-wrap", cursor: "pointer" }}
                            >
                                {isOpen ? entry.content : preview}
                            </div>
                        </div>
                    );
                })}
                {entries.length === 0 && (
                    <div style={{ textAlign: "center", padding: "3rem 1rem", color: C.outline }}>
                        <p style={{ margin: 0, fontSize: "0.85rem" }}>Sin reflexiones todavía.</p>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={confirmDeleteId !== null}
                title="Eliminar reflexión"
                message="¿Eliminar esta reflexión? No se puede deshacer."
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => { if (confirmDeleteId !== null) removeNote(confirmDeleteId); setConfirmDeleteId(null); }}
                onCancel={() => setConfirmDeleteId(null)}
            />
        </div>
    );
};
