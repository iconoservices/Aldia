import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, Trash2, Edit2, Check, MoreVertical, ListTodo, Package, CalendarClock, ChevronDown, AlertTriangle, GripVertical } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import type { Note, CalendarEvent } from "../../hooks/useAlDiaState";
import { C, bento, etiqueta, useIsMobile, paddingPagina, cabecera, tituloPagina, subtituloPagina } from "../../theme";
import { ConfirmDialog } from "../ui/ConfirmDialog";

// Marca especial (en `q`) del grupo fijo "por hacer" — va siempre primero y
// recibe tareas arrastradas desde los demás grupos. Se identifica por esta
// marca, no por el título, así el usuario lo puede renombrar sin romperlo.
const Q_POR_HACER = "pendiente-inbox";
const DROP_POR_HACER = "por-hacer-drop";

/* ══════════════════════════════════════════════════════════════════
   PendientesDashboard — el "cerebro" de cosas sueltas por hacer, tal
   como el usuario ya las anota a mano: grupos con encabezado (Reagendar,
   Recados, Edición, Casa...) y sus checklist debajo.

   Reusa el tipo Note (type: 'checklist') con q: 'pendiente' como marca,
   para no crear otro modelo de datos. Las listas reutilizables (kits)
   siguen en "Listas"; acá van las tareas de una sola vez.

   Además, dos grupos AUTOMÁTICOS que salen solos de la Agenda:
   - "Listas para entregar": sesiones en estado Terminado (editadas pero
     aún no entregadas).
   - "Por reagendar": sesiones cuya fecha ya pasó y siguen en Agendado.
══════════════════════════════════════════════════════════════════ */

interface PendientesProps {
    notes: Note[];
    addNote: (title: string, content: string, type: 'text' | 'checklist', items: any[], q: string, color: string) => void;
    removeNote: (id: number) => void;
    toggleNoteItem: (noteId: number, itemId: number) => void;
    updateNote: (id: number, updates: Partial<Note>) => void;
    agenda: CalendarEvent[];
}

const inputStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: "8px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.85rem", outline: "none", background: "white", boxSizing: "border-box", width: "100%" };

const hoyISO = () => new Date().toLocaleDateString('en-CA');

const formatFecha = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    const txt = new Date(y, m - 1, d).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
};

export const PendientesDashboard = ({ notes, addNote, removeNote, toggleNoteItem, updateNote, agenda }: PendientesProps) => {
    const movil = useIsMobile();

    // Grupos del usuario: checklists marcadas como pendiente, más la lista
    // "Pendientes" histórica (la del widget de Agenda) aunque no lleve la marca.
    const grupos = useMemo(
        () => notes.filter(n => n.type === 'checklist' && (n.q === 'pendiente' || n.title.trim().toLowerCase() === 'pendientes')),
        [notes]
    );

    // "Por hacer": grupo fijo, siempre primero, único que recibe tareas
    // arrastradas desde los demás. Se auto-crea una vez si no existe.
    const porHacer = useMemo(
        () => notes.find(n => n.type === 'checklist' && n.q === Q_POR_HACER) || null,
        [notes]
    );
    const creandoPorHacerRef = useRef(false);
    useEffect(() => {
        if (!porHacer && !creandoPorHacerRef.current) {
            creandoPorHacerRef.current = true;
            addNote("Por hacer", "", "checklist", [], Q_POR_HACER, "#FFFFFF");
        }
    }, [porHacer, addNote]);

    const [nuevoGrupo, setNuevoGrupo] = useState("");
    const [creando, setCreando] = useState(false);

    // ── Arrastrar: solo de un grupo del usuario hacia "Por hacer" ──
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    const onDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || over.id !== DROP_POR_HACER || !porHacer) return;
        const data = active.data.current as { item?: Note['items'][number]; sourceGroupId?: number } | undefined;
        const item = data?.item;
        const sourceGroupId = data?.sourceGroupId;
        if (!item || sourceGroupId == null || sourceGroupId === porHacer.id) return;
        const origen = notes.find(n => n.id === sourceGroupId);
        if (!origen) return;
        updateNote(sourceGroupId, { items: origen.items.filter(it => it.id !== item.id) });
        updateNote(porHacer.id, { items: [...porHacer.items, item] });
    };

    const crearGrupo = () => {
        const t = nuevoGrupo.trim();
        if (!t) return;
        addNote(t, "", "checklist", [], "pendiente", "#FFFFFF");
        setNuevoGrupo("");
        setCreando(false);
    };

    // ── Grupos automáticos desde la Agenda ──
    const hoy = hoyISO();
    const porEntregar = useMemo(
        () => agenda
            .filter(e => e.notionEstado === 'Terminado')
            .sort((a, b) => (a.notionEntregaFecha || a.date).localeCompare(b.notionEntregaFecha || b.date)),
        [agenda]
    );
    const porReagendar = useMemo(
        () => agenda
            .filter(e => e.date < hoy && (e.notionId ? (!e.notionEstado || e.notionEstado === 'Agendado') : false))
            .sort((a, b) => a.date.localeCompare(b.date)),
        [agenda, hoy]
    );
    // Entregas cuya fecha de entrega ya venció y todavía no están terminadas ni entregadas.
    const entregasAtrasadas = useMemo(
        () => agenda
            .filter(e => e.notionEntregaFecha && e.notionEntregaFecha < hoy && e.notionEstado !== 'Terminado' && e.notionEstado !== 'Entregado')
            .sort((a, b) => (a.notionEntregaFecha || '').localeCompare(b.notionEntregaFecha || '')),
        [agenda, hoy]
    );

    const totalPendientes = grupos.reduce((n, g) => n + g.items.filter(it => !it.completed).length, 0)
        + (porHacer?.items.filter(it => !it.completed).length ?? 0)
        + porEntregar.length + porReagendar.length + entregasAtrasadas.length;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: movil ? "1rem" : "1.5rem", ...paddingPagina(movil), color: "var(--text-carbon)" }}>
            <div style={cabecera(movil)}>
                <div>
                    <h2 style={tituloPagina}>Pendientes</h2>
                    <p style={subtituloPagina}>
                        Todo lo suelto por hacer, agrupado. {totalPendientes > 0 ? `${totalPendientes} sin cerrar.` : 'Nada sin cerrar.'}
                    </p>
                </div>
            </div>

            {creando ? (
                <div style={{ ...bento, padding: "1rem", display: "flex", gap: "8px", alignItems: "center" }}>
                    <input autoFocus placeholder="Ej. Reagendar · Recados · Edición" value={nuevoGrupo} onChange={e => setNuevoGrupo(e.target.value)} onKeyDown={e => e.key === "Enter" && crearGrupo()} style={inputStyle} />
                    <button onClick={crearGrupo} style={{ background: C.secondary, color: "white", border: "none", borderRadius: "8px", padding: "8px 14px", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap" }}>Crear</button>
                    <button onClick={() => { setCreando(false); setNuevoGrupo(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.outline, padding: "6px" }}><X size={16} /></button>
                </div>
            ) : (
                <button onClick={() => setCreando(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "none", border: `2px dashed ${C.outlineVariant}`, borderRadius: "12px", padding: "12px", cursor: "pointer", color: C.outline, fontWeight: 700, fontSize: "0.85rem" }}>
                    <Plus size={16} /> Nuevo grupo
                </button>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <div style={{ display: "grid", gridTemplateColumns: movil ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: movil ? "0.85rem" : "1.25rem", alignItems: "start" }}>
                {/* "Por hacer" siempre primero: única que recibe tareas arrastradas
                    de los demás grupos. Debajo, tus grupos, y luego los AUTO. */}
                {porHacer && (
                    <GrupoCard grupo={porHacer} removeNote={removeNote} toggleNoteItem={toggleNoteItem} updateNote={updateNote} dropId={DROP_POR_HACER} />
                )}
                {grupos.map(g => (
                    <GrupoCard key={g.id} grupo={g} removeNote={removeNote} toggleNoteItem={toggleNoteItem} updateNote={updateNote} arrastrable />
                ))}

                {porEntregar.length > 0 && (
                    <AutoCard
                        icon={<Package size={15} color={C.verde} />}
                        titulo="Listas para entregar"
                        color={C.verde}
                        items={porEntregar.map(e => ({ id: e.id, texto: e.title, extra: e.notionEntregaFecha ? `entrega ${formatFecha(e.notionEntregaFecha)}` : undefined }))}
                        nota="Editadas, falta entregarlas. Márcalas como Entregado en Agenda."
                    />
                )}
                {entregasAtrasadas.length > 0 && (
                    <AutoCard
                        icon={<AlertTriangle size={15} color={C.rojo} />}
                        titulo="Entregas atrasadas"
                        color={C.rojo}
                        items={entregasAtrasadas.map(e => ({ id: e.id, texto: e.title, extra: e.notionEntregaFecha ? `era ${formatFecha(e.notionEntregaFecha)}` : undefined }))}
                        nota="Su fecha de entrega ya pasó y siguen sin terminar. Ponte al día o reagenda la entrega."
                    />
                )}
                {porReagendar.length > 0 && (
                    <AutoCard
                        icon={<CalendarClock size={15} color={C.rojo} />}
                        titulo="Por reagendar"
                        color={C.rojo}
                        items={porReagendar.map(e => ({ id: e.id, texto: e.title, extra: `era ${formatFecha(e.date)}` }))}
                        nota="Su fecha ya pasó y siguen en Agendado. Reagéndalas o ciérralas en Agenda."
                    />
                )}
            </div>
            </DndContext>

            {grupos.length === 0 && porEntregar.length === 0 && porReagendar.length === 0 && entregasAtrasadas.length === 0 && !creando && (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: C.outline }}>
                    <ListTodo size={32} style={{ opacity: 0.4, marginBottom: "0.5rem" }} />
                    <p style={{ margin: 0, fontSize: "0.85rem" }}>Sin pendientes. Crea el primer grupo arriba.</p>
                </div>
            )}
        </div>
    );
};

/* ── Tarjeta de grupo automático (solo lectura) ──────────────────── */
const AutoCard = ({ icon, titulo, color, items, nota }: { icon: React.ReactNode; titulo: string; color: string; items: { id: number; texto: string; extra?: string }[]; nota: string }) => (
    <div style={{ ...bento, padding: "1.1rem", display: "flex", flexDirection: "column", gap: "0.6rem", border: `1px dashed ${color}66`, background: `${color}0A` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            {icon}
            <span style={{ ...etiqueta, fontSize: "0.9rem", flex: 1 }}>{titulo}</span>
            <span style={{ fontSize: "0.6rem", fontWeight: 900, color, letterSpacing: "0.05em" }}>AUTO</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {items.map(it => (
                <div key={it.id} style={{ display: "flex", alignItems: "baseline", gap: "8px", padding: "3px 0" }}>
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: color, flexShrink: 0, transform: "translateY(-2px)" }} />
                    <span style={{ flex: 1, fontSize: "0.83rem", color: C.onSurface }}>{it.texto}</span>
                    {it.extra && <span style={{ fontSize: "0.66rem", fontWeight: 700, color: C.outline, whiteSpace: "nowrap" }}>{it.extra}</span>}
                </div>
            ))}
        </div>
        <p style={{ margin: 0, fontSize: "0.68rem", color: C.outline, fontStyle: "italic" }}>{nota}</p>
    </div>
);

/* ── Tarjeta de grupo del usuario (editable) ─────────────────────── */
const GrupoCard = ({ grupo, removeNote, toggleNoteItem, updateNote, dropId, arrastrable }: {
    grupo: Note; removeNote: (id: number) => void; toggleNoteItem: (noteId: number, itemId: number) => void; updateNote: (id: number, updates: Partial<Note>) => void;
    dropId?: string; arrastrable?: boolean;
}) => {
    const { setNodeRef: setDropRef, isOver } = useDroppable({ id: dropId ?? `sin-drop-${grupo.id}`, disabled: !dropId });
    const [editandoTitulo, setEditandoTitulo] = useState(false);
    const [tituloDraft, setTituloDraft] = useState(grupo.title);
    const [nuevoItem, setNuevoItem] = useState("");
    const [confirmarBorrar, setConfirmarBorrar] = useState(false);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [itemMenuId, setItemMenuId] = useState<number | null>(null);
    const [editItemId, setEditItemId] = useState<number | null>(null);
    const [editItemText, setEditItemText] = useState("");
    const [verHechos, setVerHechos] = useState(false);

    const pendientes = grupo.items.filter(it => !it.completed);
    const hechos = grupo.items.filter(it => it.completed);

    const agregar = () => {
        const t = nuevoItem.trim();
        if (!t) return;
        updateNote(grupo.id, { items: [...grupo.items, { id: Date.now() + Math.random(), text: t, completed: false }] });
        setNuevoItem("");
    };

    const quitar = (itemId: number) => {
        updateNote(grupo.id, { items: grupo.items.filter(it => it.id !== itemId) });
        setItemMenuId(null);
    };

    const empezarEdit = (itemId: number, text: string) => {
        setEditItemId(itemId);
        setEditItemText(text);
        setItemMenuId(null);
    };

    const guardarEdit = () => {
        if (editItemId == null) return;
        const t = editItemText.trim();
        if (t) updateNote(grupo.id, { items: grupo.items.map(it => it.id === editItemId ? { ...it, text: t } : it) });
        setEditItemId(null);
    };

    const limpiarHechos = () => {
        updateNote(grupo.id, { items: grupo.items.filter(it => !it.completed) });
    };

    const guardarTitulo = () => {
        updateNote(grupo.id, { title: tituloDraft.trim() || grupo.title });
        setEditandoTitulo(false);
    };

    const fila = (item: Note['items'][number], puedeArrastrar: boolean) => (
        <FilaPendiente
            key={item.id}
            item={item}
            grupoId={grupo.id}
            arrastrable={puedeArrastrar}
            editItemId={editItemId}
            editItemText={editItemText}
            setEditItemText={setEditItemText}
            guardarEdit={guardarEdit}
            toggleNoteItem={toggleNoteItem}
            itemMenuId={itemMenuId}
            setItemMenuId={setItemMenuId}
            empezarEdit={empezarEdit}
            quitar={quitar}
        />
    );

    return (
        <div ref={setDropRef} style={{ ...bento, padding: "1.1rem", display: "flex", flexDirection: "column", gap: "0.7rem", ...(dropId ? { border: `1.5px dashed ${isOver ? C.primary : C.outlineVariant}`, background: isOver ? C.surfaceContainerLow : undefined } : {}) }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {editandoTitulo ? (
                    <input autoFocus value={tituloDraft} onChange={e => setTituloDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && guardarTitulo()} onBlur={guardarTitulo} style={{ ...inputStyle, fontWeight: 800, flex: 1 }} />
                ) : (
                    <span style={{ ...etiqueta, flex: 1, fontSize: "0.9rem" }}>{grupo.title}{pendientes.length > 0 ? ` (${pendientes.length})` : ''}</span>
                )}
                <div style={{ position: "relative" }}>
                    <button onClick={() => setMenuAbierto(v => !v)} title="Opciones" style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "3px", display: "flex" }}><MoreVertical size={15} /></button>
                    {menuAbierto && (
                        <div style={{ position: "absolute", top: "100%", right: 0, zIndex: 5, background: "white", border: `1px solid ${C.outlineVariant}`, borderRadius: "9px", boxShadow: "0 4px 14px rgba(0,0,0,0.1)", overflow: "hidden", minWidth: "140px" }}>
                            <button onClick={() => { setTituloDraft(grupo.title); setEditandoTitulo(true); setMenuAbierto(false); }} style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", background: "none", border: "none", padding: "9px 12px", cursor: "pointer", color: C.onSurface, fontSize: "0.78rem", fontWeight: 600, textAlign: "left" }}><Edit2 size={13} /> Renombrar</button>
                            <button onClick={() => { setConfirmarBorrar(true); setMenuAbierto(false); }} style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", background: "none", border: "none", padding: "9px 12px", cursor: "pointer", color: C.rojo, fontSize: "0.78rem", fontWeight: 600, textAlign: "left", borderTop: `1px solid ${C.surfaceContainerLow}` }}><Trash2 size={13} /> Eliminar grupo</button>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {grupo.items.length === 0 && (
                    <p style={{ fontSize: "0.75rem", color: C.outline, margin: 0, fontStyle: "italic" }}>Sin ítems. Agrega uno abajo.</p>
                )}
                {pendientes.map(it => fila(it, !!arrastrable))}
            </div>

            {hechos.length > 0 && (
                <div>
                    <button onClick={() => setVerHechos(v => !v)} style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", padding: 0, color: C.outline, fontSize: "0.7rem", fontWeight: 700 }}>
                        <ChevronDown size={12} style={{ transform: verHechos ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} /> Hechos ({hechos.length})
                    </button>
                    {verHechos && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                            {hechos.map(it => fila(it, false))}
                            <button onClick={limpiarHechos} style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", padding: "2px 0", color: C.rojo, fontSize: "0.68rem", fontWeight: 700 }}>Limpiar hechos</button>
                        </div>
                    )}
                </div>
            )}

            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <input placeholder="+ agregar..." value={nuevoItem} onChange={e => setNuevoItem(e.target.value)} onKeyDown={e => e.key === "Enter" && agregar()} style={{ ...inputStyle, fontSize: "0.8rem", padding: "6px 9px" }} />
                <button onClick={agregar} style={{ background: C.surfaceContainerLow, border: "none", borderRadius: "7px", padding: "6px 9px", cursor: "pointer", color: C.onSurfaceVariant, display: "flex" }}><Plus size={14} /></button>
            </div>

            <ConfirmDialog
                open={confirmarBorrar}
                title="Eliminar grupo"
                message={`¿Eliminar "${grupo.title}"? Se pierden todos sus ítems.`}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => { removeNote(grupo.id); setConfirmarBorrar(false); }}
                onCancel={() => setConfirmarBorrar(false)}
            />
        </div>
    );
};

/* ── Fila de un ítem dentro de un grupo; arrastrable hacia "Por hacer" ── */
const FilaPendiente = ({ item, grupoId, arrastrable, editItemId, editItemText, setEditItemText, guardarEdit, toggleNoteItem, itemMenuId, setItemMenuId, empezarEdit, quitar }: {
    item: Note['items'][number]; grupoId: number; arrastrable: boolean;
    editItemId: number | null; editItemText: string; setEditItemText: (v: string) => void; guardarEdit: () => void;
    toggleNoteItem: (noteId: number, itemId: number) => void;
    itemMenuId: number | null; setItemMenuId: (v: number | ((prev: number | null) => number | null)) => void;
    empezarEdit: (itemId: number, text: string) => void; quitar: (itemId: number) => void;
}) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `pend-${grupoId}-${item.id}`,
        data: { item, sourceGroupId: grupoId },
        disabled: !arrastrable,
    });

    return (
        <div ref={setNodeRef} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 0", opacity: isDragging ? 0.4 : 1 }}>
            {editItemId === item.id ? (
                <input autoFocus value={editItemText} onChange={e => setEditItemText(e.target.value)} onKeyDown={e => e.key === "Enter" && guardarEdit()} onBlur={guardarEdit} style={{ ...inputStyle, fontSize: "0.8rem", padding: "5px 8px", flex: 1 }} />
            ) : (
                <>
                    {arrastrable && (
                        <button {...attributes} {...listeners} title="Arrastrar a Por hacer" style={{ background: "none", border: "none", cursor: "grab", color: C.outlineVariant, padding: "2px", display: "flex", touchAction: "none" }}>
                            <GripVertical size={14} />
                        </button>
                    )}
                    <div
                        onClick={() => toggleNoteItem(grupoId, item.id)}
                        style={{
                            width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0, cursor: "pointer",
                            border: `2px solid ${item.completed ? C.secondary : C.outlineVariant}`,
                            background: item.completed ? C.secondary : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                    >
                        {item.completed && <Check size={12} color="white" strokeWidth={3} />}
                    </div>
                    <span style={{ flex: 1, fontSize: "0.83rem", color: item.completed ? C.outline : C.onSurface, textDecoration: item.completed ? "line-through" : "none" }}>
                        {item.text}
                    </span>
                    <div style={{ position: "relative" }}>
                        <button onClick={() => setItemMenuId(v => v === item.id ? null : item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "2px", display: "flex" }}><MoreVertical size={14} /></button>
                        {itemMenuId === item.id && (
                            <div style={{ position: "absolute", top: "100%", right: 0, zIndex: 5, background: "white", border: `1px solid ${C.outlineVariant}`, borderRadius: "9px", boxShadow: "0 4px 14px rgba(0,0,0,0.1)", overflow: "hidden", minWidth: "110px" }}>
                                <button onClick={() => empezarEdit(item.id, item.text)} style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%", background: "none", border: "none", padding: "8px 10px", cursor: "pointer", color: C.onSurface, fontSize: "0.72rem", fontWeight: 600, textAlign: "left" }}><Edit2 size={12} /> Editar</button>
                                <button onClick={() => quitar(item.id)} style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%", background: "none", border: "none", padding: "8px 10px", cursor: "pointer", color: C.rojo, fontSize: "0.72rem", fontWeight: 600, textAlign: "left", borderTop: `1px solid ${C.surfaceContainerLow}` }}><Trash2 size={12} /> Eliminar</button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
