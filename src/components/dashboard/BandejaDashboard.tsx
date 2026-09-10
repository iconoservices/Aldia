import { useEffect, useMemo, useRef, useState } from "react";
import { Inbox, Check, Trash2, CornerUpRight, Edit2, ChevronDown, X, Plus, Tag as TagIcon } from "lucide-react";
import type { Note } from "../../hooks/useAlDiaState";
import { C, bento, useIsMobile, paddingPagina, cabecera, tituloPagina, subtituloPagina, RADIO, etiqueta } from "../../theme";

/* ══════════════════════════════════════════════════════════════════
   BandejaDashboard — el volcado, ordenado por etiquetas.

   Tiras la idea y sigue. Cada línea puede llevar ETIQUETAS de contexto
   (centro, casa, finanzas, laptop…) y la lista se agrupa por etiqueta:
   la etiqueta ES el título del bloque. Así juntas todo lo de un mismo
   lugar y lo haces de una pasada.

   Para etiquetar: el botón "+" de la fila abre la lista de etiquetas
   que ya tienes — las seleccionas, no las escribes. Solo se escribe al
   crear una etiqueta nueva.

   Es UNA Note (type 'checklist') con q: 'bandeja', se auto-crea. Las
   etiquetas viven en `item.tags` (campo opcional, no afecta otras vistas).
══════════════════════════════════════════════════════════════════ */

interface BandejaProps {
    notes: Note[];
    addNote: (title: string, content: string, type: 'text' | 'checklist', items: any[], q: string, color: string) => void;
    updateNote: (id: number, updates: Partial<Note>) => void;
}

type Item = Note['items'][number];

const nuevoId = () => Date.now() + Math.floor(Math.random() * 100000);
const SIN = "::sin::";
const slug = (s: string) => s.trim().toLowerCase().replace(/^@+/, "").replace(/\s+/g, "-").slice(0, 24);

const inputStyle: React.CSSProperties = {
    padding: "12px", borderRadius: RADIO.campo, border: `1px solid ${C.outlineVariant}`,
    fontSize: "16px", outline: "none", background: C.surfaceLowest, color: C.onSurface,
    boxSizing: "border-box", width: "100%", fontFamily: "inherit",
};

const chip = (activo: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: "5px", flexShrink: 0,
    background: activo ? C.primary : C.surfaceContainer,
    color: activo ? "#fff" : C.onSurfaceVariant,
    border: "none", borderRadius: RADIO.chip, padding: "6px 12px",
    fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
});

const miniChip = (activo: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: "4px",
    background: activo ? C.primaryContainer : C.surfaceContainer,
    color: activo ? C.onPrimaryContainer : C.onSurfaceVariant,
    border: "none", borderRadius: RADIO.chip, padding: "5px 10px",
    fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
});

const iconBtn: React.CSSProperties = {
    background: "none", border: "none", cursor: "pointer", color: C.outline,
    width: "32px", height: "32px", borderRadius: "8px",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};

export const BandejaDashboard = ({ notes, addNote, updateNote }: BandejaProps) => {
    const movil = useIsMobile();

    const bandeja = useMemo(
        () => notes.find(n => n.type === 'checklist' && n.q === 'bandeja') || null,
        [notes]
    );

    const creandoRef = useRef(false);
    useEffect(() => {
        if (!bandeja && !creandoRef.current) {
            creandoRef.current = true;
            addNote("Bandeja", "", "checklist", [], "bandeja", "#FFFFFF");
        }
    }, [bandeja, addNote]);

    const [captura, setCaptura] = useState("");
    const [verHechos, setVerHechos] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [editText, setEditText] = useState("");
    const [pickId, setPickId] = useState<number | null>(null);
    const [filtro, setFiltro] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const items = bandeja?.items ?? [];
    const abiertas = items.filter(it => !it.completed);
    const hechos = items.filter(it => it.completed);

    const setItems = (next: Item[]) => bandeja && updateNote(bandeja.id, { items: next });
    const patchItem = (id: number, patch: Partial<Item>) =>
        bandeja && setItems(bandeja.items.map(it => it.id === id ? { ...it, ...patch } : it));

    // Todas las etiquetas usadas, en orden de primera aparición.
    const todasEtiquetas = useMemo(() => {
        const vistas: string[] = [];
        for (const it of items) for (const t of it.tags ?? []) if (!vistas.includes(t)) vistas.push(t);
        return vistas;
    }, [items]);

    // Grupos: "sin etiqueta" primero (la bandeja cruda), luego una por etiqueta.
    const grupos = useMemo(() => {
        const sin = abiertas.filter(it => (it.tags ?? []).length === 0);
        const porTag = todasEtiquetas
            .map(tag => ({ tag, items: abiertas.filter(it => (it.tags ?? []).includes(tag)) }))
            .filter(g => g.items.length > 0);
        const out: { tag: string; items: Item[] }[] = [];
        if (sin.length) out.push({ tag: SIN, items: sin });
        out.push(...porTag);
        return out;
    }, [abiertas, todasEtiquetas]);

    const gruposMostrados = filtro.length ? grupos.filter(g => filtro.includes(g.tag)) : grupos;

    const tirar = () => {
        const t = captura.trim();
        if (!t || !bandeja) return;
        setItems([{ id: nuevoId(), text: t, completed: false }, ...bandeja.items]);
        setCaptura("");
        inputRef.current?.focus();
    };

    const toggle = (id: number) => patchItem(id, { completed: !bandeja!.items.find(i => i.id === id)?.completed });
    const descartar = (id: number) => bandeja && setItems(bandeja.items.filter(it => it.id !== id));
    const limpiarHechos = () => bandeja && setItems(bandeja.items.filter(it => !it.completed));

    const guardarEdit = () => {
        if (editId == null || !bandeja) { setEditId(null); return; }
        const t = editText.trim();
        if (t) patchItem(editId, { text: t });
        setEditId(null);
    };

    const toggleTag = (id: number, tag: string) => {
        const it = bandeja?.items.find(i => i.id === id);
        if (!it) return;
        const ts = it.tags ?? [];
        const next = ts.includes(tag) ? ts.filter(x => x !== tag) : [...ts, tag];
        patchItem(id, { tags: next.length ? next : undefined });
    };

    const aPendientes = (id: number) => {
        if (!bandeja) return;
        const item = bandeja.items.find(it => it.id === id);
        if (!item) return;
        const grupo = notes.find(n => n.type === 'checklist' && n.q === 'pendiente' && n.title.trim().toLowerCase() === 'de la bandeja');
        if (grupo) {
            updateNote(grupo.id, { items: [...grupo.items, { id: nuevoId(), text: item.text, completed: false }] });
        } else {
            addNote("De la Bandeja", "", "checklist", [{ id: nuevoId(), text: item.text, completed: false }], "pendiente", "#FFFFFF");
        }
        setItems(bandeja.items.filter(it => it.id !== id));
    };

    const toggleFiltro = (t: string) => setFiltro(f => f.includes(t) ? f.filter(x => x !== t) : [...f, t]);

    const filaProps = (item: Item, grupoTag?: string) => ({
        item, movil, grupoTag,
        abierto: pickId === item.id,
        abrirPick: () => setPickId(pickId === item.id ? null : item.id),
        cerrarPick: () => setPickId(null),
        editId, editText, setEditId, setEditText, guardarEdit,
        toggle, descartar, aPendientes, toggleTag,
        todasEtiquetas,
        onEditar: () => { setEditId(item.id); setEditText(item.text); },
    });

    const totalAbiertas = abiertas.length;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: movil ? "16px" : "24px", ...paddingPagina(movil), color: C.onSurface }}>
            <div style={cabecera(movil)}>
                <div>
                    <h2 style={tituloPagina}>Bandeja</h2>
                    <p style={subtituloPagina}>
                        Tíralo acá y etiquétalo por contexto.
                        {totalAbiertas > 0 ? ` ${totalAbiertas} sin repartir.` : ' Está vacía.'}
                    </p>
                </div>
            </div>

            {/* Un solo bloque: filtro + captura + lista */}
            <div style={{ ...bento, padding: 0, overflow: "hidden" }}>
                {/* Filtro por etiqueta — arriba del todo */}
                {todasEtiquetas.length > 0 && (
                    <div style={{ display: "flex", gap: "8px", flexWrap: movil ? "nowrap" : "wrap", overflowX: movil ? "auto" : "visible", alignItems: "center", padding: "10px 12px", borderBottom: `1px solid ${C.surfaceContainerHigh}` }}>
                        <TagIcon size={15} strokeWidth={2.5} style={{ color: C.outline, flexShrink: 0 }} />
                        {grupos.map(g => (
                            <button key={g.tag} onClick={() => toggleFiltro(g.tag)} style={chip(filtro.includes(g.tag))}>
                                {g.tag === SIN ? "sin etiqueta" : g.tag} <span style={{ opacity: 0.7 }}>{g.items.length}</span>
                            </button>
                        ))}
                        {filtro.length > 0 && (
                            <button onClick={() => setFiltro([])} style={{ ...chip(false), background: "transparent", color: C.rojo }}>
                                <X size={13} strokeWidth={2.5} /> ver todo
                            </button>
                        )}
                    </div>
                )}

                {/* Captura */}
                <form
                    onSubmit={e => { e.preventDefault(); tirar(); }}
                    style={{ padding: "12px", background: C.surfaceLowest, borderBottom: `1px solid ${C.surfaceContainerHigh}` }}
                >
                    <input
                        ref={inputRef}
                        autoFocus
                        enterKeyHint="done"
                        placeholder="¿Qué tienes en la cabeza? + Enter"
                        value={captura}
                        onChange={e => setCaptura(e.target.value)}
                        style={inputStyle}
                    />
                    <button type="submit" style={{ display: "none" }} aria-hidden tabIndex={-1} />
                </form>

                {/* Lista agrupada */}
                <div style={{ padding: movil ? "8px 12px 12px" : "12px 16px 16px" }}>
                {abiertas.length === 0 && hechos.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 16px", color: C.outline }}>
                        <Inbox size={32} strokeWidth={2} style={{ opacity: 0.4, marginBottom: "8px" }} />
                        <p style={{ margin: 0, fontSize: "0.88rem" }}>Vacía. Escribe arriba lo primero que se te cruce.</p>
                    </div>
                ) : (
                    <>
                        {gruposMostrados.map((g, gi) => (
                            <div key={g.tag} style={{ marginTop: gi === 0 ? 0 : "20px" }}>
                                <div style={{ ...etiqueta, fontSize: "0.72rem", color: g.tag === SIN ? C.outline : C.onSurfaceVariant, padding: "4px 0 8px", display: "flex", alignItems: "center", gap: "6px" }}>
                                    {g.tag === SIN ? "SIN ETIQUETA" : g.tag}
                                    <span style={{ opacity: 0.5 }}>· {g.items.length}</span>
                                </div>
                                {g.items.map(item => <Fila key={item.id} {...filaProps(item, g.tag)} />)}
                            </div>
                        ))}

                        {hechos.length > 0 && (
                            <div style={{ marginTop: "20px" }}>
                                <button
                                    onClick={() => setVerHechos(v => !v)}
                                    style={{ ...etiqueta, display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", padding: "8px 0" }}
                                >
                                    <ChevronDown size={14} strokeWidth={2.5} style={{ transform: verHechos ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                                    Hechos ({hechos.length})
                                </button>
                                {verHechos && (
                                    <div style={{ marginTop: "4px" }}>
                                        {hechos.map(item => <Fila key={item.id} {...filaProps(item)} />)}
                                        <button
                                            onClick={limpiarHechos}
                                            style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "8px", background: "none", border: "none", cursor: "pointer", padding: "4px 0", color: C.rojo, fontSize: "0.72rem", fontWeight: 700 }}
                                        >
                                            <X size={12} strokeWidth={2.5} /> Limpiar hechos
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
                </div>
            </div>
        </div>
    );
};

/* ── Fila ─────────────────────────────────────────────────────────── */
interface FilaProps {
    item: Item;
    movil: boolean;
    grupoTag?: string;
    abierto: boolean;
    abrirPick: () => void;
    cerrarPick: () => void;
    editId: number | null;
    editText: string;
    setEditId: (v: number | null) => void;
    setEditText: (v: string) => void;
    guardarEdit: () => void;
    toggle: (id: number) => void;
    descartar: (id: number) => void;
    aPendientes: (id: number) => void;
    toggleTag: (id: number, tag: string) => void;
    todasEtiquetas: string[];
    onEditar: () => void;
}

const Fila = (p: FilaProps) => {
    const { item, grupoTag, editId, editText, setEditId, setEditText, guardarEdit, toggle, descartar, aPendientes, onEditar, abierto, abrirPick, cerrarPick, toggleTag, todasEtiquetas } = p;
    const tags = item.tags ?? [];
    // En la vista agrupada no repetimos el chip de la etiqueta del propio grupo.
    const chipsVisibles = tags.filter(t => t !== grupoTag);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "8px 0", borderBottom: `1px solid ${C.surfaceContainerHigh}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {editId === item.id ? (
                    <input
                        autoFocus value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") guardarEdit(); if (e.key === "Escape") setEditId(null); }}
                        onBlur={guardarEdit}
                        style={{ ...inputStyle, fontSize: "16px", padding: "8px", flex: 1 }}
                    />
                ) : (
                    <>
                        <div
                            onClick={() => toggle(item.id)}
                            title="Marcar hecho"
                            style={{
                                width: "22px", height: "22px", borderRadius: "8px", flexShrink: 0, cursor: "pointer",
                                border: `2px solid ${item.completed ? C.secondary : C.outlineVariant}`,
                                background: item.completed ? C.secondary : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                        >
                            {item.completed && <Check size={14} color="#fff" strokeWidth={3} />}
                        </div>
                        <span
                            onClick={onEditar}
                            style={{
                                flex: 1, minWidth: 0, fontSize: "0.9rem", cursor: "text",
                                color: item.completed ? C.outline : C.onSurface,
                                textDecoration: item.completed ? "line-through" : "none",
                            }}
                        >
                            {item.text}
                        </span>
                        {!item.completed && (
                            <>
                                <button onClick={abrirPick} title="Etiquetas" style={{ ...iconBtn, background: abierto ? C.surfaceContainer : "none", color: abierto ? C.primary : C.outline }}>
                                    <Plus size={17} strokeWidth={2.5} />
                                </button>
                                <button onClick={onEditar} title="Editar" style={iconBtn}><Edit2 size={16} strokeWidth={2.5} /></button>
                                <button onClick={() => aPendientes(item.id)} title="Mandar a Pendientes" style={{ ...iconBtn, color: C.primary }}>
                                    <CornerUpRight size={16} strokeWidth={2.5} />
                                </button>
                            </>
                        )}
                        <button onClick={() => descartar(item.id)} title="Descartar" style={{ ...iconBtn, color: C.rojo }}>
                            <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                    </>
                )}
            </div>

            {/* Etiquetas de la fila / selector */}
            {(chipsVisibles.length > 0 || abierto) && (
                <div style={{ paddingLeft: "30px" }}>
                    {abierto
                        ? <TagPicker item={item} todasEtiquetas={todasEtiquetas} toggleTag={toggleTag} onClose={cerrarPick} />
                        : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                {chipsVisibles.map(t => (
                                    <button key={t} onClick={abrirPick} style={miniChip(true)}>{t}</button>
                                ))}
                            </div>
                        )}
                </div>
            )}
        </div>
    );
};

const TagPicker = ({ item, todasEtiquetas, toggleTag, onClose }: {
    item: Item; todasEtiquetas: string[]; toggleTag: (id: number, t: string) => void; onClose: () => void;
}) => {
    const [creando, setCreando] = useState(false);
    const [nueva, setNueva] = useState("");
    const tags = item.tags ?? [];
    const opciones = [...new Set([...todasEtiquetas, ...tags])];

    const crear = () => {
        const t = slug(nueva);
        if (t && !tags.includes(t)) toggleTag(item.id, t);
        setNueva("");
        setCreando(false);
    };

    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", background: C.surfaceContainerLow, borderRadius: RADIO.campo, padding: "8px" }}>
            {opciones.length === 0 && !creando && (
                <span style={{ fontSize: "0.7rem", color: C.outline }}>Aún no tienes etiquetas.</span>
            )}
            {opciones.map(t => (
                <button key={t} onClick={() => toggleTag(item.id, t)} style={miniChip(tags.includes(t))}>
                    {tags.includes(t) && <Check size={11} strokeWidth={3} />}{t}
                </button>
            ))}
            {creando ? (
                <form onSubmit={e => { e.preventDefault(); crear(); }} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <input
                        autoFocus value={nueva}
                        onChange={e => setNueva(e.target.value)}
                        onBlur={() => { if (!nueva.trim()) setCreando(false); }}
                        placeholder="nombre…"
                        style={{ width: "110px", padding: "5px 9px", fontSize: "0.72rem", borderRadius: RADIO.chip, border: `1px solid ${C.outlineVariant}`, outline: "none", background: C.surfaceLowest }}
                    />
                    <button type="submit" style={{ ...miniChip(true), padding: "5px 8px" }}><Check size={12} strokeWidth={3} /></button>
                </form>
            ) : (
                <button onClick={() => setCreando(true)} style={{ ...miniChip(false), border: `1px dashed ${C.outlineVariant}` }}>
                    <Plus size={12} strokeWidth={3} /> nueva
                </button>
            )}
            <button onClick={onClose} style={{ ...miniChip(false), color: C.outline, marginLeft: "auto" }}>listo</button>
        </div>
    );
};
