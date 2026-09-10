import { useEffect, useMemo, useRef, useState } from "react";
import { Inbox, Check, Trash2, CornerUpRight, Edit2, ChevronDown, X, GripVertical, Type } from "lucide-react";
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Note } from "../../hooks/useAlDiaState";
import { C, bento, useIsMobile, paddingPagina, cabecera, tituloPagina, subtituloPagina, RADIO, TOQUE_MINIMO, etiqueta } from "../../theme";

/* ══════════════════════════════════════════════════════════════════
   BandejaDashboard — el volcado sin orden.

   Un solo sitio para tirar lo que tengas en la cabeza. Enter y sigue.
   Cuando tengas calma, "reparte": cada línea se marca hecha, se manda a
   Pendientes o se descarta. Se puede arrastrar para ordenar y agrupar
   bajo subtítulos.

   Es UNA Note (type 'checklist') con q: 'bandeja'. Se auto-crea la
   primera vez. Un ítem cuyo texto empieza con '#' es un SUBTÍTULO
   (sin checkbox), para separar bloques sin cambiar el modelo de datos.
══════════════════════════════════════════════════════════════════ */

interface BandejaProps {
    notes: Note[];
    addNote: (title: string, content: string, type: 'text' | 'checklist', items: any[], q: string, color: string) => void;
    updateNote: (id: number, updates: Partial<Note>) => void;
}

type Item = Note['items'][number];

const nuevoId = () => Date.now() + Math.floor(Math.random() * 100000);
const esSubtitulo = (t: string) => t.trimStart().startsWith('#');
const textoSubtitulo = (t: string) => t.trimStart().replace(/^#+\s*/, '');

const inputStyle: React.CSSProperties = {
    padding: "12px", borderRadius: RADIO.campo, border: `1px solid ${C.outlineVariant}`,
    fontSize: "16px", outline: "none", background: C.surfaceLowest, color: C.onSurface,
    boxSizing: "border-box", width: "100%", fontFamily: "inherit",
};

export const BandejaDashboard = ({ notes, addNote, updateNote }: BandejaProps) => {
    const movil = useIsMobile();

    const bandeja = useMemo(
        () => notes.find(n => n.type === 'checklist' && n.q === 'bandeja') || null,
        [notes]
    );

    // Auto-crear la Bandeja la primera vez (una sola vez).
    const creandoRef = useRef(false);
    useEffect(() => {
        if (!bandeja && !creandoRef.current) {
            creandoRef.current = true;
            addNote("Bandeja", "", "checklist", [], "bandeja", "#FFFFFF");
        }
    }, [bandeja, addNote]);

    const [captura, setCaptura] = useState("");
    const [modoSeccion, setModoSeccion] = useState(false);
    const [verHechos, setVerHechos] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [editText, setEditText] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const items = bandeja?.items ?? [];
    // Los subtítulos nunca se "completan": van siempre en la lista principal.
    const visibles = items.filter(it => !it.completed || esSubtitulo(it.text));
    const hechos = items.filter(it => it.completed && !esSubtitulo(it.text));
    const cuentaTareas = visibles.filter(it => !esSubtitulo(it.text)).length;

    const setItems = (next: Item[]) => bandeja && updateNote(bandeja.id, { items: next });

    const tirar = () => {
        const raw = captura.trim();
        if (!raw || !bandeja) return;
        const text = modoSeccion && !esSubtitulo(raw) ? `# ${raw}` : raw;
        // Lo nuevo va arriba; después lo arrastras a su bloque.
        setItems([{ id: nuevoId(), text, completed: false }, ...bandeja.items]);
        setCaptura("");
        setModoSeccion(false);
        inputRef.current?.focus();
    };

    const toggle = (id: number) => {
        if (!bandeja) return;
        setItems(bandeja.items.map(it => it.id === id ? { ...it, completed: !it.completed } : it));
    };

    const descartar = (id: number) => {
        if (!bandeja) return;
        setItems(bandeja.items.filter(it => it.id !== id));
    };

    const limpiarHechos = () => {
        if (!bandeja) return;
        setItems(bandeja.items.filter(it => !it.completed || esSubtitulo(it.text)));
    };

    const guardarEdit = () => {
        if (editId == null || !bandeja) { setEditId(null); return; }
        const t = editText.trim();
        if (t) setItems(bandeja.items.map(it => it.id === editId ? { ...it, text: t } : it));
        setEditId(null);
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

    // ── Reordenar ──
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const onDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id || !bandeja) return;
        const orden = visibles.map(it => it.id);
        const from = orden.indexOf(Number(active.id));
        const to = orden.indexOf(Number(over.id));
        if (from < 0 || to < 0) return;
        const nuevoOrden = arrayMove(visibles, from, to);
        // items = visibles reordenados + los hechos al final (viven en su propia sección).
        setItems([...nuevoOrden, ...hechos]);
    };

    const filaProps = (item: Item) => ({
        item,
        movil,
        editId, editText, setEditId, setEditText, guardarEdit,
        toggle, descartar, aPendientes,
        onEditar: () => { setEditId(item.id); setEditText(item.text); },
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: movil ? "16px" : "24px", ...paddingPagina(movil), color: C.onSurface }}>
            <div style={cabecera(movil)}>
                <div>
                    <h2 style={tituloPagina}>Bandeja</h2>
                    <p style={subtituloPagina}>
                        Vuélcalo acá sin ordenar; después repartes.
                        {cuentaTareas > 0 ? ` ${cuentaTareas} sin repartir.` : ' Está vacía.'}
                    </p>
                </div>
            </div>

            {/* Captura rápida */}
            <form
                onSubmit={e => { e.preventDefault(); tirar(); }}
                style={{ ...bento, padding: "12px", display: "flex", flexDirection: "column", gap: "8px", position: "sticky", top: movil ? "68px" : "0", zIndex: 3 }}
            >
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                        type="button"
                        onClick={() => { setModoSeccion(v => !v); inputRef.current?.focus(); }}
                        title="Subtítulo"
                        style={{
                            flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                            background: modoSeccion ? C.primary : C.surfaceContainer,
                            color: modoSeccion ? "#fff" : C.onSurfaceVariant,
                            border: "none", borderRadius: RADIO.campo,
                            minWidth: `${TOQUE_MINIMO}px`, minHeight: `${TOQUE_MINIMO}px`, padding: "0 12px",
                            fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
                        }}
                    >
                        <Type size={16} strokeWidth={2.5} /> {!movil && (modoSeccion ? "Subtítulo" : "Subtít.")}
                    </button>
                    <input
                        ref={inputRef}
                        autoFocus
                        enterKeyHint="done"
                        placeholder={modoSeccion ? "Nombre del bloque (ej. Entregas) + Enter" : "¿Qué tienes en la cabeza? + Enter"}
                        value={captura}
                        onChange={e => setCaptura(e.target.value)}
                        style={inputStyle}
                    />
                    {/* Botón submit invisible: deja que Enter envíe el form también en móvil. */}
                    <button type="submit" style={{ display: "none" }} aria-hidden tabIndex={-1} />
                </div>
                {modoSeccion && (
                    <span style={{ fontSize: "0.72rem", color: C.outline, paddingLeft: "4px" }}>
                        Un subtítulo separa bloques. Arrastra las líneas debajo para agruparlas.
                    </span>
                )}
            </form>

            {/* Lista */}
            <div style={{ ...bento, padding: movil ? "4px 12px 12px" : "8px 16px 16px" }}>
                {visibles.length === 0 && hechos.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 16px", color: C.outline }}>
                        <Inbox size={32} strokeWidth={2} style={{ opacity: 0.4, marginBottom: "8px" }} />
                        <p style={{ margin: 0, fontSize: "0.88rem" }}>Vacía. Escribe arriba lo primero que se te cruce.</p>
                    </div>
                ) : (
                    <>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                            <SortableContext items={visibles.map(it => it.id)} strategy={verticalListSortingStrategy}>
                                {visibles.map(item => <FilaOrdenable key={item.id} {...filaProps(item)} />)}
                            </SortableContext>
                        </DndContext>

                        {hechos.length > 0 && (
                            <div style={{ marginTop: "12px" }}>
                                <button
                                    onClick={() => setVerHechos(v => !v)}
                                    style={{ ...etiqueta, display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", padding: "8px 0" }}
                                >
                                    <ChevronDown size={14} strokeWidth={2.5} style={{ transform: verHechos ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                                    Hechos ({hechos.length})
                                </button>
                                {verHechos && (
                                    <div style={{ marginTop: "4px" }}>
                                        {hechos.map(item => (
                                            <FilaSimple key={item.id} {...filaProps(item)} />
                                        ))}
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
    );
};

/* ── Fila ─────────────────────────────────────────────────────────── */
interface FilaProps {
    item: Item;
    movil: boolean;
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

const Contenido = (p: FilaProps) => {
    const { item, editId, editText, setEditId, setEditText, guardarEdit, toggle, descartar, aPendientes, onEditar, dragHandle } = p;
    const header = esSubtitulo(item.text);

    if (editId === item.id) {
        return (
            <input
                autoFocus value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") guardarEdit(); if (e.key === "Escape") setEditId(null); }}
                onBlur={guardarEdit}
                style={{ ...inputStyle, fontSize: "16px", padding: "8px", flex: 1 }}
            />
        );
    }

    if (header) {
        return (
            <>
                {dragHandle}
                <span style={{ ...etiqueta, flex: 1, fontSize: "0.72rem", color: C.onSurfaceVariant, cursor: "text" }} onClick={onEditar}>
                    {textoSubtitulo(item.text) || "Subtítulo"}
                </span>
                <button onClick={onEditar} title="Editar" style={iconBtn}><Edit2 size={16} strokeWidth={2.5} /></button>
                <button onClick={() => descartar(item.id)} title="Quitar" style={{ ...iconBtn, color: C.rojo }}><Trash2 size={16} strokeWidth={2.5} /></button>
            </>
        );
    }

    return (
        <>
            {dragHandle}
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
                    flex: 1, fontSize: "0.9rem", cursor: "text",
                    color: item.completed ? C.outline : C.onSurface,
                    textDecoration: item.completed ? "line-through" : "none",
                }}
            >
                {item.text}
            </span>
            {!item.completed && (
                <>
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
    );
};

const filaBox = (movil: boolean, header: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: "8px",
    padding: movil ? "8px 0" : "8px 4px",
    marginTop: header ? "16px" : 0,
    borderBottom: `1px solid ${C.surfaceContainerHigh}`,
});

const FilaSimple = (p: FilaProps) => (
    <div style={filaBox(p.movil, esSubtitulo(p.item.text))}>
        <Contenido {...p} />
    </div>
);

const FilaOrdenable = (p: FilaProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.item.id });
    const style: React.CSSProperties = {
        ...filaBox(p.movil, esSubtitulo(p.item.text)),
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        background: isDragging ? C.surfaceContainerLow : undefined,
    };
    const handle = (
        <button
            {...attributes}
            {...listeners}
            title="Arrastrar para ordenar"
            style={{ ...iconBtn, cursor: "grab", color: C.outlineVariant, touchAction: "none" }}
        >
            <GripVertical size={16} strokeWidth={2.5} />
        </button>
    );
    return (
        <div ref={setNodeRef} style={style}>
            <Contenido {...p} dragHandle={handle} />
        </div>
    );
};

// Botón de ícono: caja de toque de 32px, radio 8, trazo grueso (línea gráfica v1.0).
const iconBtn: React.CSSProperties = {
    background: "none", border: "none", cursor: "pointer", color: C.outline,
    width: "32px", height: "32px", borderRadius: "8px",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};
