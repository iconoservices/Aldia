import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Trash2, ChevronDown, Plus, X } from "lucide-react";
import type { Note } from "../../hooks/useAlDiaState";
import { C, bento, useIsMobile, paddingPagina, cabecera, tituloPagina, subtituloPagina, RADIO, etiqueta } from "../../theme";
import { ConfirmDialog } from "../ui/ConfirmDialog";

/* ══════════════════════════════════════════════════════════════════
   QuieroHacerDashboard — lo que quieres hacer, por temas.

   Sin fechas ni urgencia: es el espacio de deseos y proyectos de vida
   (viajes, aprender, casa, salud…). Cada TEMA es una tarjeta con su
   propia lista; marcas lo que ya cumpliste.

   Es UNA Note (type 'checklist') con q: 'quiero-hacer', se auto-crea.
   Los temas viven en `content` (JSON string[]) y cada ítem apunta a su
   tema con `tags: [tema]`.
══════════════════════════════════════════════════════════════════ */

interface Props {
    notes: Note[];
    addNote: (title: string, content: string, type: 'text' | 'checklist', items: any[], q: string, color: string) => void;
    updateNote: (id: number, updates: Partial<Note>) => void;
}

type Item = Note['items'][number];

const nuevoId = () => Date.now() + Math.floor(Math.random() * 100000);

const inputStyle: React.CSSProperties = {
    padding: "10px 12px", borderRadius: RADIO.campo, border: `1px solid ${C.outlineVariant}`,
    fontSize: "16px", outline: "none", background: C.surfaceLowest, color: C.onSurface,
    boxSizing: "border-box", width: "100%", fontFamily: "inherit",
};

const iconBtn: React.CSSProperties = {
    background: "none", border: "none", cursor: "pointer", color: C.outline,
    width: "32px", height: "32px", borderRadius: "8px",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};

export const QuieroHacerDashboard = ({ notes, addNote, updateNote }: Props) => {
    const movil = useIsMobile();

    const nota = useMemo(
        () => notes.find(n => n.type === 'checklist' && n.q === 'quiero-hacer') || null,
        [notes]
    );

    const creandoRef = useRef(false);
    useEffect(() => {
        if (!nota && !creandoRef.current) {
            creandoRef.current = true;
            addNote("Quiero hacer", "[]", "checklist", [], "quiero-hacer", "#FFFFFF");
        }
    }, [nota, addNote]);

    const [nuevoTema, setNuevoTema] = useState("");
    const [creando, setCreando] = useState(false);
    const [borrarTema, setBorrarTema] = useState<string | null>(null);
    const [cerrados, setCerrados] = useState<Set<string>>(new Set());
    const [verHechos, setVerHechos] = useState<Set<string>>(new Set());
    const [editId, setEditId] = useState<number | null>(null);
    const [editText, setEditText] = useState("");
    const [capturas, setCapturas] = useState<Record<string, string>>({});

    const items = nota?.items ?? [];

    // Temas guardados + cualquiera suelto que aún tenga ítems.
    const temas = useMemo<string[]>(() => {
        let cfg: string[] = [];
        try {
            const a = JSON.parse(nota?.content || "[]");
            if (Array.isArray(a)) cfg = a.filter((x): x is string => typeof x === "string");
        } catch { /* contenido vacío o viejo */ }
        for (const it of items) for (const t of it.tags ?? []) if (!cfg.includes(t)) cfg.push(t);
        return cfg;
    }, [nota?.content, items]);

    const guardar = (nextTemas: string[], nextItems: Item[]) =>
        nota && updateNote(nota.id, { content: JSON.stringify(nextTemas), items: nextItems });

    const crearTema = () => {
        const nombre = nuevoTema.trim().slice(0, 30);
        if (!nombre) return;
        if (!temas.some(t => t.toLowerCase() === nombre.toLowerCase())) guardar([...temas, nombre], items);
        setNuevoTema(""); setCreando(false);
    };

    const agregar = (tema: string) => {
        const texto = (capturas[tema] ?? "").trim();
        if (!texto) return;
        guardar(temas, [...items, { id: nuevoId(), text: texto, completed: false, tags: [tema] }]);
        setCapturas(c => ({ ...c, [tema]: "" }));
    };

    const patch = (id: number, p: Partial<Item>) =>
        guardar(temas, items.map(i => i.id === id ? { ...i, ...p } : i));

    const quitarItem = (id: number) => guardar(temas, items.filter(i => i.id !== id));

    const eliminarTema = (tema: string) =>
        guardar(temas.filter(t => t !== tema), items.filter(i => !(i.tags ?? []).includes(tema)));

    const guardarEdicion = () => {
        if (editId == null) return;
        const t = editText.trim();
        if (t) patch(editId, { text: t }); else quitarItem(editId);
        setEditId(null);
    };

    const alternar = (set: Set<string>, setSet: (s: Set<string>) => void, k: string) => {
        const n = new Set(set); if (n.has(k)) n.delete(k); else n.add(k); setSet(n);
    };

    const totalAbiertos = items.filter(i => !i.completed).length;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: movil ? "16px" : "24px", ...paddingPagina(movil), color: C.onSurface }}>
            <div style={cabecera(movil)}>
                <div>
                    <h2 style={tituloPagina}>Quiero hacer</h2>
                    <p style={subtituloPagina}>
                        Lo que quieres vivir, aprender o lograr — por temas, sin apuro.
                        {totalAbiertos > 0 ? ` ${totalAbiertos} por cumplir.` : ''}
                    </p>
                </div>
                {creando ? (
                    <form onSubmit={e => { e.preventDefault(); crearTema(); }} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <input
                            autoFocus value={nuevoTema} onChange={e => setNuevoTema(e.target.value)}
                            placeholder="Nombre del tema" enterKeyHint="done" maxLength={30}
                            style={{ ...inputStyle, width: movil ? "100%" : "220px" }}
                        />
                        <button type="button" onClick={() => { setCreando(false); setNuevoTema(""); }} style={iconBtn} title="Cancelar"><X size={18} strokeWidth={2.5} /></button>
                    </form>
                ) : (
                    <button
                        onClick={() => setCreando(true)}
                        style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px",
                            background: C.primary, color: "#fff", border: "none", borderRadius: RADIO.chip,
                            padding: "10px 16px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
                        }}
                    >
                        <Plus size={16} strokeWidth={2.5} /> Nuevo tema
                    </button>
                )}
            </div>

            {temas.length === 0 && (
                <div style={{ ...bento, padding: "28px 16px", textAlign: "center", color: C.onSurfaceVariant, fontSize: "0.9rem" }}>
                    Aún no hay temas. Crea uno (Viajes, Aprender, Casa, Salud…) y empieza a anotar lo que quieres hacer.
                </div>
            )}

            <div style={{ display: "grid", gap: movil ? "12px" : "16px", gridTemplateColumns: movil ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))", alignItems: "start" }}>
                {temas.map(tema => {
                    const delTema = items.filter(i => (i.tags ?? []).includes(tema));
                    const abiertos = delTema.filter(i => !i.completed);
                    const hechos = delTema.filter(i => i.completed);
                    const colapsado = cerrados.has(tema);
                    return (
                        <div key={tema} style={{ ...bento, padding: 0, overflow: "hidden" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "8px 8px 8px 14px", borderBottom: colapsado ? "none" : `1px solid ${C.surfaceContainerHigh}` }}>
                                <button
                                    onClick={() => alternar(cerrados, setCerrados, tema)}
                                    style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: "6px 0", textAlign: "left", color: C.onSurface, minWidth: 0 }}
                                >
                                    <ChevronDown size={16} strokeWidth={2.5} style={{ color: C.outline, flexShrink: 0, transform: colapsado ? "rotate(-90deg)" : "none", transition: "transform .15s" }} />
                                    <span style={{ ...etiqueta, color: C.onSurface, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tema}</span>
                                    <span style={{ fontSize: "0.7rem", color: C.outline, fontWeight: 700 }}>
                                        {hechos.length}/{delTema.length}
                                    </span>
                                </button>
                                <button onClick={() => setBorrarTema(tema)} style={iconBtn} title="Borrar tema"><Trash2 size={16} strokeWidth={2.5} /></button>
                            </div>

                            {!colapsado && (
                                <div style={{ padding: "8px 12px 12px", display: "flex", flexDirection: "column", gap: "2px" }}>
                                    {abiertos.map(it => (
                                        <Fila key={it.id} it={it}
                                            editando={editId === it.id} editText={editText}
                                            setEditText={setEditText}
                                            empezarEdicion={() => { setEditId(it.id); setEditText(it.text); }}
                                            guardarEdicion={guardarEdicion}
                                            toggle={() => patch(it.id, { completed: !it.completed })}
                                            borrar={() => quitarItem(it.id)} />
                                    ))}

                                    <form onSubmit={e => { e.preventDefault(); agregar(tema); }} style={{ display: "flex", gap: "8px", marginTop: abiertos.length ? "6px" : 0 }}>
                                        <input
                                            value={capturas[tema] ?? ""} onChange={e => setCapturas(c => ({ ...c, [tema]: e.target.value }))}
                                            placeholder="Quiero…" enterKeyHint="done" style={inputStyle}
                                        />
                                        <button type="submit" title="Agregar" style={{ ...iconBtn, width: "44px", height: "44px", background: C.primary, color: "#fff", borderRadius: RADIO.campo }}>
                                            <Plus size={18} strokeWidth={2.5} />
                                        </button>
                                    </form>

                                    {hechos.length > 0 && (
                                        <>
                                            <button
                                                onClick={() => alternar(verHechos, setVerHechos, tema)}
                                                style={{ ...etiqueta, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "10px 0 4px", display: "flex", alignItems: "center", gap: "4px" }}
                                            >
                                                <ChevronDown size={12} strokeWidth={2.5} style={{ transform: verHechos.has(tema) ? "none" : "rotate(-90deg)" }} />
                                                Cumplidas ({hechos.length})
                                            </button>
                                            {verHechos.has(tema) && hechos.map(it => (
                                                <Fila key={it.id} it={it}
                                                    editando={false} editText="" setEditText={() => {}}
                                                    empezarEdicion={() => {}} guardarEdicion={() => {}}
                                                    toggle={() => patch(it.id, { completed: !it.completed })}
                                                    borrar={() => quitarItem(it.id)} />
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <ConfirmDialog
                open={borrarTema != null}
                title="Borrar tema"
                message={`¿Borrar "${borrarTema ?? ''}" y sus ${items.filter(i => (i.tags ?? []).includes(borrarTema ?? '')).length} línea(s)? No se puede deshacer.`}
                confirmLabel="Borrar"
                cancelLabel="Cancelar"
                onConfirm={() => { if (borrarTema) eliminarTema(borrarTema); setBorrarTema(null); }}
                onCancel={() => setBorrarTema(null)}
            />
        </div>
    );
};

interface FilaProps {
    it: Item;
    editando: boolean;
    editText: string;
    setEditText: (s: string) => void;
    empezarEdicion: () => void;
    guardarEdicion: () => void;
    toggle: () => void;
    borrar: () => void;
}

const Fila = ({ it, editando, editText, setEditText, empezarEdicion, guardarEdicion, toggle, borrar }: FilaProps) => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", minHeight: "36px" }}>
        <button
            onClick={toggle} title={it.completed ? "Reabrir" : "Cumplido"}
            style={{
                width: "22px", height: "22px", borderRadius: "6px", flexShrink: 0, cursor: "pointer", padding: 0,
                border: `2px solid ${it.completed ? C.primary : C.outlineVariant}`,
                background: it.completed ? C.primary : "transparent", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}
        >
            {it.completed && <Check size={14} strokeWidth={3} />}
        </button>
        {editando ? (
            <input
                autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                onBlur={guardarEdicion}
                onKeyDown={e => { if (e.key === "Enter") guardarEdicion(); }}
                style={{ ...inputStyle, padding: "6px 8px" }}
            />
        ) : (
            <span
                onClick={it.completed ? undefined : empezarEdicion}
                style={{
                    flex: 1, fontSize: "0.9rem", lineHeight: 1.35, padding: "6px 0", cursor: it.completed ? "default" : "text",
                    color: it.completed ? C.outline : C.onSurface,
                    textDecoration: it.completed ? "line-through" : "none", wordBreak: "break-word",
                }}
            >
                {it.text}
            </span>
        )}
        <button onClick={borrar} style={iconBtn} title="Borrar"><Trash2 size={15} strokeWidth={2.5} /></button>
    </div>
);
