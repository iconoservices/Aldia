import { useEffect, useMemo, useRef, useState } from "react";
import { Inbox, Check, Trash2, CornerUpRight, ChevronDown, X, Plus, Tag as TagIcon, GripVertical } from "lucide-react";
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Note } from "../../hooks/useAlDiaState";
import { C, bento, useIsMobile, paddingPagina, cabecera, tituloPagina, subtituloPagina, RADIO, etiqueta } from "../../theme";
import { ConfirmDialog } from "../ui/ConfirmDialog";

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
    const [borrarId, setBorrarId] = useState<number | null>(null);
    const [gestionAbierta, setGestionAbierta] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const items = bandeja?.items ?? [];
    const abiertas = items.filter(it => !it.completed);
    const hechos = items.filter(it => it.completed);

    const setItems = (next: Item[]) => bandeja && updateNote(bandeja.id, { items: next });
    const patchItem = (id: number, patch: Partial<Item>) =>
        bandeja && setItems(bandeja.items.map(it => it.id === id ? { ...it, ...patch } : it));

    // Lista de etiquetas configurada: se guarda como JSON en el `content` de la
    // nota (campo libre que los checklist no usan). Persiste aunque nadie la use.
    const etiquetasConfig = useMemo<string[]>(() => {
        try { const a = JSON.parse(bandeja?.content || "[]"); return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string") : []; }
        catch { return []; }
    }, [bandeja?.content]);

    // Todas: primero las configuradas, luego cualquiera suelta que aún use algún ítem.
    const todasEtiquetas = useMemo(() => {
        const vistas = [...etiquetasConfig];
        for (const it of items) for (const t of it.tags ?? []) if (!vistas.includes(t)) vistas.push(t);
        return vistas;
    }, [items, etiquetasConfig]);

    const crearEtiqueta = (nombre: string) => {
        const t = slug(nombre);
        if (t && !etiquetasConfig.includes(t) && bandeja) {
            updateNote(bandeja.id, { content: JSON.stringify([...etiquetasConfig, t]) });
        }
        return slug(nombre);
    };
    const borrarEtiqueta = (t: string) => {
        if (!bandeja) return;
        const items2 = bandeja.items.map(i => {
            if (!(i.tags ?? []).includes(t)) return i;
            const rest = (i.tags ?? []).filter(x => x !== t);
            return { ...i, tags: rest.length ? rest : undefined };
        });
        updateNote(bandeja.id, { content: JSON.stringify(etiquetasConfig.filter(x => x !== t)), items: items2 });
        setFiltro(f => f.filter(x => x !== t));
    };
    // Para el modal por ítem: crea la etiqueta (si es nueva) y la asigna.
    const crearYAsignar = (id: number, nombre: string) => {
        const t = slug(nombre);
        if (!t || !bandeja) return;
        const cfg = etiquetasConfig.includes(t) ? etiquetasConfig : [...etiquetasConfig, t];
        const items2 = bandeja.items.map(i => i.id === id ? { ...i, tags: [...new Set([...(i.tags ?? []), t])] } : i);
        updateNote(bandeja.id, { content: JSON.stringify(cfg), items: items2 });
    };

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

    // ── Arrastrar: reordenar dentro del grupo y mover entre etiquetas ──
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const onDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || !bandeja) return;
        const fromTag: string | undefined = active.data.current?.tag;
        const toTag: string | undefined = over.data.current?.tag;
        if (fromTag == null || toTag == null) return;
        const activeId = Number(active.id);
        const overId = Number(over.id); // NaN si se soltó sobre el contenedor de un grupo

        if (fromTag === toTag) {
            if (Number.isNaN(overId) || activeId === overId) return;
            const oi = bandeja.items.findIndex(i => i.id === activeId);
            const ni = bandeja.items.findIndex(i => i.id === overId);
            if (oi < 0 || ni < 0) return;
            setItems(arrayMove(bandeja.items, oi, ni));
            return;
        }
        // Mover a otra etiqueta: cambia la etiqueta de origen por la de destino.
        const it = bandeja.items.find(i => i.id === activeId);
        if (!it) return;
        const cur = (it.tags ?? []).filter(t => t !== fromTag);
        const nextTags = toTag === SIN ? cur : [...new Set([...cur, toTag])];
        let next = bandeja.items.map(i => i.id === activeId ? { ...i, tags: nextTags.length ? nextTags : undefined } : i);
        if (!Number.isNaN(overId)) {
            const moved = next.splice(next.findIndex(i => i.id === activeId), 1)[0];
            const ni = next.findIndex(i => i.id === overId);
            next.splice(ni < 0 ? next.length : ni, 0, moved);
        }
        setItems(next);
    };

    const filaProps = (item: Item, grupoTag?: string) => ({
        item, movil, grupoTag,
        abrirPick: () => setPickId(item.id),
        editId, editText, setEditId, setEditText, guardarEdit,
        toggle, descartar: (id: number) => setBorrarId(id), aPendientes,
        onEditar: () => { setEditId(item.id); setEditText(item.text); },
    });

    const itemAEtiquetar = pickId != null ? items.find(i => i.id === pickId) ?? null : null;

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
                {/* Filtro + gestión de etiquetas — arriba del todo */}
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
                    <button onClick={() => setGestionAbierta(true)} title="Gestionar etiquetas" style={{ ...chip(false), background: "transparent", color: C.outline, marginLeft: "auto", flexShrink: 0 }}>
                        <Plus size={14} strokeWidth={2.5} /> etiqueta
                    </button>
                </div>

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
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                            {gruposMostrados.map((g, gi) => (
                                <GrupoDrop key={g.tag} tag={g.tag} style={{ marginTop: gi === 0 ? 0 : "20px" }}>
                                    <div style={{ ...etiqueta, fontSize: "0.72rem", color: g.tag === SIN ? C.outline : C.onSurfaceVariant, padding: "4px 0 8px", display: "flex", alignItems: "center", gap: "6px" }}>
                                        {g.tag === SIN ? "SIN ETIQUETA" : g.tag}
                                        <span style={{ opacity: 0.5 }}>· {g.items.length}</span>
                                    </div>
                                    <SortableContext items={g.items.map(it => it.id)} strategy={verticalListSortingStrategy}>
                                        {g.items.map(item => <SortableFila key={item.id} {...filaProps(item, g.tag)} />)}
                                    </SortableContext>
                                </GrupoDrop>
                            ))}
                        </DndContext>

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

            {itemAEtiquetar && (
                <TagModal
                    item={itemAEtiquetar}
                    todasEtiquetas={todasEtiquetas}
                    toggleTag={toggleTag}
                    crearYAsignar={crearYAsignar}
                    onClose={() => setPickId(null)}
                />
            )}

            {gestionAbierta && (
                <TagManagerModal
                    todas={todasEtiquetas}
                    enUso={new Set(items.flatMap(i => i.tags ?? []))}
                    crear={crearEtiqueta}
                    borrar={borrarEtiqueta}
                    onClose={() => setGestionAbierta(false)}
                />
            )}

            <ConfirmDialog
                open={borrarId != null}
                title="Borrar línea"
                message={`¿Borrar "${items.find(i => i.id === borrarId)?.text ?? ''}"? No se puede deshacer.`}
                confirmLabel="Borrar"
                cancelLabel="Cancelar"
                onConfirm={() => { if (borrarId != null) descartar(borrarId); setBorrarId(null); }}
                onCancel={() => setBorrarId(null)}
            />
        </div>
    );
};

/* ── Fila ─────────────────────────────────────────────────────────── */
interface FilaProps {
    item: Item;
    movil: boolean;
    grupoTag?: string;
    abrirPick: () => void;
    editId: number | null;
    editText: string;
    setEditId: (v: number | null) => void;
    setEditText: (v: string) => void;
    guardarEdit: () => void;
    toggle: (id: number) => void;
    descartar: (id: number) => void;
    aPendientes: (id: number) => void;
    onEditar: () => void;
    dragHandle?: React.ReactNode;
}

const Fila = (p: FilaProps) => {
    const { item, grupoTag, editId, editText, setEditId, setEditText, guardarEdit, toggle, descartar, aPendientes, onEditar, abrirPick, dragHandle } = p;
    const tags = item.tags ?? [];
    // En la vista agrupada no repetimos el chip de la etiqueta del propio grupo.
    const chipsVisibles = tags.filter(t => t !== grupoTag);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "8px 0", borderBottom: `1px solid ${C.surfaceContainerHigh}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {dragHandle}
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
                                <button onClick={abrirPick} title="Etiqueta" style={iconBtn}>
                                    <Plus size={17} strokeWidth={2.5} />
                                </button>
                                <button onClick={() => aPendientes(item.id)} title="Pasar a la pestaña Pendientes" style={iconBtn}>
                                    <CornerUpRight size={16} strokeWidth={2.5} />
                                </button>
                            </>
                        )}
                        <button onClick={() => descartar(item.id)} title="Borrar" style={iconBtn}>
                            <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                    </>
                )}
            </div>

            {/* Etiquetas de la fila (solo muestra; se editan en la ventanita) */}
            {chipsVisibles.length > 0 && (
                <div style={{ paddingLeft: dragHandle ? "62px" : "30px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {chipsVisibles.map(t => (
                        <button key={t} onClick={abrirPick} style={miniChip(true)}>{t}</button>
                    ))}
                </div>
            )}
        </div>
    );
};

/* Zona que recibe el item soltado sobre un grupo (aunque sea fuera de sus filas). */
const GrupoDrop = ({ tag, style, children }: { tag: string; style?: React.CSSProperties; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id: `g:${tag}`, data: { tag } });
    return (
        <div ref={setNodeRef} style={{ ...style, borderRadius: RADIO.campo, background: isOver ? C.surfaceContainerLow : undefined, transition: "background 0.15s" }}>
            {children}
        </div>
    );
};

const SortableFila = (p: FilaProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.item.id, data: { tag: p.grupoTag } });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };
    const handle = (
        <button
            {...attributes}
            {...listeners}
            title="Arrastrar para ordenar o mover de etiqueta"
            style={{ ...iconBtn, cursor: "grab", color: C.outlineVariant, touchAction: "none" }}
        >
            <GripVertical size={16} strokeWidth={2.5} />
        </button>
    );
    return (
        <div ref={setNodeRef} style={style}>
            <Fila {...p} dragHandle={handle} />
        </div>
    );
};

/* Ventanita centrada para elegir la etiqueta de una línea. */
const TagModal = ({ item, todasEtiquetas, toggleTag, crearYAsignar, onClose }: {
    item: Item; todasEtiquetas: string[]; toggleTag: (id: number, t: string) => void; crearYAsignar: (id: number, nombre: string) => void; onClose: () => void;
}) => {
    const [creando, setCreando] = useState(false);
    const [nueva, setNueva] = useState("");
    const tags = item.tags ?? [];
    const opciones = [...new Set([...todasEtiquetas, ...tags])];

    const crear = () => {
        if (nueva.trim()) crearYAsignar(item.id, nueva);
        setNueva("");
        setCreando(false);
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed", inset: 0, zIndex: 9999, padding: "20px",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{ background: C.surfaceLowest, borderRadius: "24px", padding: "22px", width: "100%", maxWidth: "360px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
            >
                <div style={{ ...etiqueta, fontSize: "0.62rem", color: C.outline }}>Etiqueta</div>
                <p style={{ margin: "4px 0 16px", fontSize: "0.92rem", fontWeight: 700, color: C.onSurface, lineHeight: 1.35 }}>{item.text}</p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                    {opciones.length === 0 && !creando && (
                        <span style={{ fontSize: "0.78rem", color: C.outline }}>Aún no tienes etiquetas. Crea la primera →</span>
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
                                style={{ width: "120px", padding: "6px 10px", fontSize: "0.78rem", borderRadius: RADIO.chip, border: `1px solid ${C.outlineVariant}`, outline: "none", background: C.surfaceLowest }}
                            />
                            <button type="submit" style={{ ...miniChip(true), padding: "6px 9px" }}><Check size={13} strokeWidth={3} /></button>
                        </form>
                    ) : (
                        <button onClick={() => setCreando(true)} style={{ ...miniChip(false), border: `1px dashed ${C.outlineVariant}` }}>
                            <Plus size={13} strokeWidth={3} /> nueva
                        </button>
                    )}
                </div>

                <button
                    onClick={onClose}
                    style={{ marginTop: "20px", width: "100%", padding: "12px", borderRadius: "14px", border: "none", background: C.primary, color: "#fff", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}
                >
                    Listo
                </button>
            </div>
        </div>
    );
};

/* Ventanita para configurar la lista de etiquetas (persisten aunque nadie las use). */
const TagManagerModal = ({ todas, enUso, crear, borrar, onClose }: {
    todas: string[]; enUso: Set<string>; crear: (n: string) => void; borrar: (t: string) => void; onClose: () => void;
}) => {
    const [nueva, setNueva] = useState("");
    const [porBorrar, setPorBorrar] = useState<string | null>(null);

    const agregar = () => { if (nueva.trim()) { crear(nueva); setNueva(""); } };

    return (
        <div
            onClick={onClose}
            style={{ position: "fixed", inset: 0, zIndex: 9999, padding: "20px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{ background: C.surfaceLowest, borderRadius: "24px", padding: "22px", width: "100%", maxWidth: "380px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
            >
                <div style={{ ...etiqueta, fontSize: "0.62rem", color: C.outline }}>Etiquetas</div>
                <p style={{ margin: "4px 0 16px", fontSize: "0.82rem", color: C.onSurfaceVariant }}>
                    Se quedan guardadas para reusarlas. Borrar una la quita de todas sus líneas.
                </p>

                <form onSubmit={e => { e.preventDefault(); agregar(); }} style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                    <input
                        autoFocus value={nueva}
                        onChange={e => setNueva(e.target.value)}
                        placeholder="Nueva etiqueta (ej. centro)"
                        style={{ ...inputStyle, fontSize: "0.9rem", padding: "10px 12px" }}
                    />
                    <button type="submit" style={{ flexShrink: 0, background: C.primary, color: "#fff", border: "none", borderRadius: RADIO.campo, padding: "0 16px", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer" }}>
                        Añadir
                    </button>
                </form>

                {todas.length === 0 ? (
                    <p style={{ fontSize: "0.8rem", color: C.outline, margin: "0 0 16px" }}>Todavía no hay etiquetas.</p>
                ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                        {todas.map(t => (
                            <span key={t} style={{ ...miniChip(false), paddingRight: "5px" }}>
                                {t}
                                {enUso.has(t) && <span style={{ opacity: 0.5, fontWeight: 600 }}> · en uso</span>}
                                <button onClick={() => setPorBorrar(t)} title="Borrar etiqueta" style={{ background: "none", border: "none", cursor: "pointer", color: C.outline, display: "flex", padding: "2px", marginLeft: "2px" }}>
                                    <X size={12} strokeWidth={3} />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                <button
                    onClick={onClose}
                    style={{ width: "100%", padding: "12px", borderRadius: "14px", border: "none", background: C.primary, color: "#fff", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}
                >
                    Listo
                </button>
            </div>

            <ConfirmDialog
                open={porBorrar != null}
                title="Borrar etiqueta"
                message={`¿Borrar "${porBorrar}"? Se quita de todas las líneas que la tienen.`}
                confirmLabel="Borrar"
                cancelLabel="Cancelar"
                onConfirm={() => { if (porBorrar) borrar(porBorrar); setPorBorrar(null); }}
                onCancel={() => setPorBorrar(null)}
            />
        </div>
    );
};
