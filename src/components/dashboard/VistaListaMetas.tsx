import React, { useState, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { DailyBlock, Goal, GoalHorizon, Project, GoalMilestone } from '../../hooks/useAlDiaState';
import { C, MONO } from '../../theme';

export interface VistaListaMetasProps {
    goals: Goal[];
    projects: Project[];
    dailyBlocks?: DailyBlock[];
    movil: boolean;
    gruposNiveles: {
        nivelNum: number;
        info: {
            numero: number;
            titulo: string;
            subtitulo: string;
            horizonte: string;
            color: string;
            icono: string;
        };
        gruposProyecto: { proyecto?: Project; metas: Goal[] }[];
        totalMetas: number;
        completadas: number;
    }[];
    onToggleMilestone: (goalId: number, milestoneId: number) => void;
    onRemoveMilestone: (goalId: number, milestoneId: number) => void;
    onAddMilestone: (goalId: number, text: string, plazo?: GoalHorizon) => void;
    onUpdateGoal: (goalId: number, update: Partial<Goal>) => void;
    reorderGoals?: (goals: Goal[]) => void;
    onEditarMeta: (goal: Goal) => void;
    onAbrirPlazo: (goalId: number, plazo: GoalHorizon) => void;
    onAbrirDetalle: (goalId: number, milestoneId: number, plazo: GoalHorizon) => void;
    setForm: (form: any) => void;
    updateDailyBlock?: (id: number, u: Partial<DailyBlock>) => void;
    addDailyBlock?: (label: string, period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro', date: string, completed?: boolean, projectId?: number, repeatDays?: number[], time?: string, isActive?: boolean, isHabit?: boolean, goalId?: number) => void;
}

const DIAS_SEMANA = [
    { l: 'L', d: 1 },
    { l: 'M', d: 2 },
    { l: 'X', d: 3 },
    { l: 'J', d: 4 },
    { l: 'V', d: 5 },
    { l: 'S', d: 6 },
    { l: 'D', d: 0 },
];

/* ─── FILA DE TAREA EN LA LISTA UNIFICADA (Estilo Tarjetas) ─── */
interface TareaPlanaItem {
    id: string; // `m:${goal.id}:${milestone.id}`
    goal: Goal;
    milestone: GoalMilestone;
    proyecto?: Project;
    nivelNum: number;
    color: string;
    plazo: GoalHorizon;
    order: number;
}

interface SortableMilestoneFilaUnicaProps {
    item: TareaPlanaItem;
    onToggleMilestone: (goalId: number, milestoneId: number) => void;
    onRemoveMilestone: (goalId: number, milestoneId: number) => void;
    onAbrirDetalle: (goalId: number, milestoneId: number, plazo: GoalHorizon) => void;
    onUpdateGoal: (goalId: number, update: Partial<Goal>) => void;
    bloquesRep: DailyBlock[];
    updateDailyBlock?: (id: number, u: Partial<DailyBlock>) => void;
    pasosAbiertos: Record<number, boolean>;
    setPasosAbiertos: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
    convT: { id: number; rep: boolean; dias: number[]; goalId: number } | null;
    setConvT: React.Dispatch<React.SetStateAction<{ id: number; rep: boolean; dias: number[]; goalId: number } | null>>;
    nuevoPasoTexto: Record<number, string>;
    setNuevoPasoTexto: React.Dispatch<React.SetStateAction<Record<number, string>>>;
    toggleSubPaso: (goal: Goal, m: GoalMilestone, pasoId: number) => void;
    agregarSubPaso: (goal: Goal, m: GoalMilestone) => void;
    eliminarSubPaso: (goal: Goal, m: GoalMilestone, pasoId: number) => void;
    convertirTarea: (goalId: number, m: GoalMilestone, dias?: number[]) => void;
}

const SortableMilestoneFilaUnica: React.FC<SortableMilestoneFilaUnicaProps> = ({
    item,
    onToggleMilestone,
    onRemoveMilestone,
    onAbrirDetalle,
    bloquesRep,
    updateDailyBlock,
    pasosAbiertos,
    setPasosAbiertos,
    convT,
    setConvT,
    nuevoPasoTexto,
    setNuevoPasoTexto,
    toggleSubPaso,
    agregarSubPaso,
    eliminarSubPaso,
    convertirTarea,
}) => {
    const { goal, milestone: m, proyecto, color, plazo } = item;
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
        data: {
            type: 'milestone-unica',
            goalId: goal.id,
            milestone: m,
        },
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
    };

    const tienePasos = (m.pasos || []).length > 0;
    const pasosAbierto = !!pasosAbiertos[m.id];
    const pasosHechos = (m.pasos || []).filter(p => p.completed).length;
    const totPasos = (m.pasos || []).length;
    const esRepetitiva = bloquesRep.length > 0;
    const repActiva = esRepetitiva && bloquesRep.some(b => b.isActive !== false);

    return (
        <div ref={setNodeRef} style={style}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: isDragging ? 'rgba(15,169,122,0.06)' : 'transparent',
                    borderBottom: '1px solid #F1F5F4',
                    transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F8FAF9'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isDragging ? 'rgba(15,169,122,0.06)' : 'transparent'; }}
            >
                {/* Lado izquierdo: Grip + Checkbox redondeado + Texto */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    {/* Grip handle */}
                    <button
                        type="button"
                        {...attributes}
                        {...listeners}
                        title="Arrastrar para intercalar o reordenar"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            width: '18px',
                            height: '22px',
                            cursor: isDragging ? 'grabbing' : 'grab',
                            color: C.outlineVariant,
                            opacity: 0.35,
                            touchAction: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            flexShrink: 0,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                        onMouseLeave={e => { if (!isDragging) (e.currentTarget as HTMLElement).style.opacity = '0.35'; }}
                    >
                        <GripVertical size={14} strokeWidth={2.3} />
                    </button>

                    {/* Checkbox redondeado con borde del color del proyecto */}
                    <button
                        type="button"
                        onClick={() => onToggleMilestone(goal.id, m.id)}
                        title={m.completed ? 'Marcar como pendiente' : 'Marcar como hecha'}
                        style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            border: `2px solid ${m.completed ? color : C.outlineVariant}`,
                            background: m.completed ? color : '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            padding: 0,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {m.completed && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 900 }}>✓</span>}
                    </button>

                    {/* Texto de la tarea */}
                    <span
                        onClick={() => onAbrirDetalle(goal.id, m.id, plazo)}
                        style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: '0.89rem',
                            fontWeight: 500,
                            color: m.completed ? C.outline : C.onSurface,
                            textDecoration: m.completed ? 'line-through' : 'none',
                            cursor: 'pointer',
                            wordBreak: 'break-word',
                        }}
                    >
                        {m.text}
                    </span>
                </div>

                {/* Lado derecho: Subpasos + Badge del Proyecto/Color + Hoy + Eliminar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {/* Badge de repetitiva si aplica */}
                    {esRepetitiva && (
                        <button
                            type="button"
                            role="switch"
                            aria-checked={repActiva}
                            onClick={() => {
                                if (!updateDailyBlock) return;
                                const nuevo = !repActiva;
                                bloquesRep.forEach(b => updateDailyBlock(b.id, { isActive: nuevo }));
                            }}
                            title={repActiva ? 'Pausar repetitiva' : 'Activar repetitiva'}
                            style={{
                                background: 'none', border: 'none', color: repActiva ? color : C.outline,
                                fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: '2px',
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>repeat</span>
                            <span>{repActiva ? 'Activa' : 'Pausada'}</span>
                        </button>
                    )}

                    {/* Botón de subpasos */}
                    <button
                        type="button"
                        onClick={() => setPasosAbiertos(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                        title={pasosAbierto ? 'Ocultar pasos' : 'Ver pasos'}
                        style={{
                            background: tienePasos ? `${color}12` : 'transparent',
                            border: tienePasos ? `1px solid ${color}30` : 'none',
                            borderRadius: '4px',
                            color: tienePasos ? color : C.outline,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: MONO,
                            padding: '2px 5px',
                        }}
                    >
                        {tienePasos ? `${pasosHechos}/${totPasos} pasos` : '+ pasos'}
                    </button>

                    {/* 🏷️ BADGE DEL PROYECTO / COLOR A LA DERECHA */}
                    <div
                        title={`Proyecto: ${proyecto ? proyecto.name : 'Sin visión'} | Meta: ${goal.title}`}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: `${color}14`,
                            border: `1px solid ${color}35`,
                            color: color,
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                        }}
                    >
                        <span>{proyecto ? '🧭' : '🎯'}</span>
                        <span>{proyecto ? proyecto.name : goal.title}</span>
                        {proyecto && (
                            <span style={{ opacity: 0.65, fontWeight: 600, fontSize: '0.68rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                · {goal.title}
                            </span>
                        )}
                    </div>

                    {/* Botón convertir a Hoy */}
                    {!m.completed && (
                        <button
                            type="button"
                            onClick={() => setConvT(convT?.id === m.id ? null : { id: m.id, rep: false, dias: [1, 2, 3, 4, 5], goalId: goal.id })}
                            title="Convertir en tarea de hoy o repetitiva"
                            style={{ border: 'none', background: 'transparent', color: convT?.id === m.id ? color : C.outline, cursor: 'pointer', padding: '1px', display: 'flex' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>today</span>
                        </button>
                    )}

                    {/* Quitar tarea */}
                    <button
                        type="button"
                        onClick={() => {
                            if (window.confirm(`¿Quitar la tarea "${m.text}"?`)) {
                                onRemoveMilestone(goal.id, m.id);
                            }
                        }}
                        title="Eliminar tarea"
                        style={{ border: 'none', background: 'transparent', color: C.outline, cursor: 'pointer', padding: '1px', display: 'flex' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                    </button>
                </div>
            </div>

            {/* Menú de conversión rápido */}
            {convT?.id === m.id && (
                <div style={{
                    marginLeft: '32px',
                    padding: '6px 8px',
                    background: `${color}08`,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                    marginTop: '4px',
                }}>
                    <button
                        type="button"
                        onClick={() => { convertirTarea(goal.id, m); setConvT(null); }}
                        style={{ padding: '3px 8px', borderRadius: '4px', border: 'none', background: color, color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                        📅 Hoy
                    </button>
                    <div style={{ display: 'flex', gap: '2px' }}>
                        {DIAS_SEMANA.map(({ l, d }) => {
                            const activo = convT.dias.includes(d);
                            return (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setConvT(prev => prev ? { ...prev, dias: activo ? prev.dias.filter(x => x !== d) : [...prev.dias, d] } : null)}
                                    style={{ width: '18px', height: '18px', borderRadius: '3px', border: 'none', background: activo ? color : C.surfaceContainer, color: activo ? '#fff' : C.outline, fontSize: '0.6rem', fontWeight: 800, cursor: 'pointer' }}
                                >
                                    {l}
                                </button>
                            );
                        })}
                    </div>
                    {convT.dias.length > 0 && (
                        <button
                            type="button"
                            onClick={() => { convertirTarea(goal.id, m, convT.dias); setConvT(null); }}
                            style={{ padding: '3px 8px', borderRadius: '4px', border: 'none', background: color, color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Crear ({convT.dias.length}d)
                        </button>
                    )}
                </div>
            )}

            {/* Sub-pasos identados */}
            {pasosAbierto && (
                <div style={{
                    paddingLeft: '32px',
                    borderLeft: `2px solid ${color}25`,
                    marginLeft: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    marginTop: '4px',
                    marginBottom: '4px',
                }}>
                    {(m.pasos || []).map(p => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '1px 0' }}>
                            <button
                                type="button"
                                onClick={() => toggleSubPaso(goal, m, p.id)}
                                style={{
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '3px',
                                    border: `1.5px solid ${p.completed ? color : C.outlineVariant}`,
                                    background: p.completed ? color : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    padding: 0,
                                    flexShrink: 0,
                                }}
                            >
                                {p.completed && <span style={{ color: '#fff', fontSize: '8px', fontWeight: 900 }}>✓</span>}
                            </button>
                            <span style={{
                                flex: 1,
                                minWidth: 0,
                                fontSize: '0.82rem',
                                color: p.completed ? C.outline : C.onSurface,
                                textDecoration: p.completed ? 'line-through' : 'none',
                                wordBreak: 'break-word',
                            }}>
                                {p.text}
                            </span>
                            <button
                                type="button"
                                onClick={() => eliminarSubPaso(goal, m, p.id)}
                                title="Quitar paso"
                                style={{ border: 'none', background: 'transparent', color: C.outline, cursor: 'pointer', padding: 0 }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                            </button>
                        </div>
                    ))}

                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            agregarSubPaso(goal, m);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
                    >
                        <span style={{ color: C.outline, fontSize: '0.75rem' }}>+</span>
                        <input
                            type="text"
                            value={nuevoPasoTexto[m.id] || ''}
                            onChange={e => setNuevoPasoTexto(prev => ({ ...prev, [m.id]: e.target.value }))}
                            placeholder="Escribir paso... (Enter)"
                            style={{
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                fontSize: '0.78rem',
                                color: C.onSurface,
                                flex: 1,
                                fontFamily: 'inherit',
                            }}
                        />
                    </form>
                </div>
            )}
        </div>
    );
};

/* ─── COMPONENTE PRINCIPAL ─── */
export const VistaListaMetas: React.FC<VistaListaMetasProps> = ({
    goals,
    projects,
    dailyBlocks,
    movil,
    gruposNiveles,
    onToggleMilestone,
    onRemoveMilestone,
    onAddMilestone,
    onUpdateGoal,
    reorderGoals,
    onEditarMeta,
    onAbrirPlazo: _onAbrirPlazo,
    onAbrirDetalle,
    setForm,
    updateDailyBlock,
    addDailyBlock,
}) => {
    // Modo de vista: 'unica' (por defecto: todo en una sola lista intercalada) o 'estructurada' (por proyectos)
    const [vistaModo, setVistaModo] = useState<'unica' | 'estructurada'>('unica');
    const [busqueda, setBusqueda] = useState('');
    const [pasoFiltro, setPasoFiltro] = useState<number | null>(null);
    const [proyectoFiltro, setProyectoFiltro] = useState<number | null>(null);
    const [colapsados, setColapsados] = useState<Record<string, boolean>>({});
    const [nuevaTareaTexto, setNuevaTareaTexto] = useState('');
    const [metaDestinoId, setMetaDestinoId] = useState<number | null>(() => {
        const primera = goals.find(g => !g.parentId);
        return primera ? primera.id : null;
    });
    const [nuevoPasoTexto, setNuevoPasoTexto] = useState<Record<number, string>>({});
    const [pasosAbiertos, setPasosAbiertos] = useState<Record<number, boolean>>({});
    const [convT, setConvT] = useState<{ id: number; rep: boolean; dias: number[]; goalId: number } | null>(null);

    const toggleColapso = (key: string) => {
        setColapsados(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Helper repetitivas
    const getBloquesRepetitivos = (goalId: number, m: GoalMilestone) => {
        if (!dailyBlocks) return [];
        const textos = new Set([
            m.text.trim().toLowerCase(),
            ...(m.pasos || []).map(p => p.text.trim().toLowerCase()),
        ]);
        return dailyBlocks.filter(b => b.goalId === goalId && textos.has(b.label.trim().toLowerCase()) && !!(b.repeatDays && b.repeatDays.length > 0));
    };

    const toggleSubPaso = (goal: Goal, m: GoalMilestone, pasoId: number) => {
        if (!m.pasos) return;
        const nuevosPasos = m.pasos.map(p => p.id === pasoId ? { ...p, completed: !p.completed } : p);
        const reales = nuevosPasos.filter(p => !p.repetitiva);
        const todosHechos = reales.length > 0 && reales.every(p => p.completed);
        onUpdateGoal(goal.id, {
            milestones: (goal.milestones || []).map(item => item.id === m.id ? {
                ...item,
                pasos: nuevosPasos,
                completed: todosHechos ? true : item.completed,
            } : item),
        });
    };

    const agregarSubPaso = (goal: Goal, m: GoalMilestone) => {
        const txt = (nuevoPasoTexto[m.id] || '').trim();
        if (!txt) return;
        const nuevos = [...(m.pasos || []), { id: Date.now() + Math.random(), text: txt, completed: false }];
        onUpdateGoal(goal.id, {
            milestones: (goal.milestones || []).map(item => item.id === m.id ? { ...item, pasos: nuevos } : item),
        });
        setNuevoPasoTexto(prev => ({ ...prev, [m.id]: '' }));
    };

    const eliminarSubPaso = (goal: Goal, m: GoalMilestone, pasoId: number) => {
        if (!m.pasos) return;
        onUpdateGoal(goal.id, {
            milestones: (goal.milestones || []).map(item => item.id === m.id ? {
                ...item,
                pasos: item.pasos?.filter(p => p.id !== pasoId),
            } : item),
        });
    };

    const convertirTarea = (goalId: number, m: GoalMilestone, dias?: number[]) => {
        if (!addDailyBlock) return;
        const hoy = new Date().toLocaleDateString('en-CA');
        const goal = goals.find(g => g.id === goalId);
        if (!goal) return;

        const esRepetitiva = !!(dias && dias.length > 0);
        const pasosActuales = m.pasos || [];
        const noCompletados = pasosActuales.filter(p => !p.completed);
        const candidatos = noCompletados.length > 0 ? noCompletados : pasosActuales;

        if (candidatos.length > 0) {
            candidatos.forEach(p => {
                const clave = p.text.trim().toLowerCase();
                const existente = dailyBlocks?.find(b => b.goalId === goalId && b.label.trim().toLowerCase() === clave);
                if (existente && updateDailyBlock) {
                    updateDailyBlock(existente.id, { repeatDays: dias, isActive: true, date: hoy });
                } else {
                    addDailyBlock(p.text, 'Otro', hoy, false, undefined, dias, undefined, true, false, goalId);
                }
            });
            const nuevosPasos = pasosActuales.map(p =>
                candidatos.some(q => q.id === p.id) ? { ...p, repetitiva: esRepetitiva } : p
            );
            onUpdateGoal(goalId, {
                milestones: (goal.milestones || []).map(x => x.id === m.id ? { ...x, pasos: nuevosPasos } : x)
            });
        } else {
            const clave = m.text.trim().toLowerCase();
            const existente = dailyBlocks?.find(b => b.goalId === goalId && b.label.trim().toLowerCase() === clave);
            if (existente && updateDailyBlock) {
                updateDailyBlock(existente.id, { repeatDays: dias, isActive: true, date: hoy });
            } else {
                addDailyBlock(m.text, 'Otro', hoy, false, undefined, dias, undefined, true, false, goalId);
            }
            onUpdateGoal(goalId, {
                milestones: (goal.milestones || []).map(x => x.id === m.id ? {
                    ...x,
                    pasos: [{ id: Date.now(), text: m.text, completed: false, repetitiva: esRepetitiva }]
                } : x)
            });
        }
    };

    /* ─── REUNIR TODAS LAS TAREAS EN UNA LISTA UNIFICADA ─── */
    const todasLasTareas = useMemo(() => {
        const list: TareaPlanaItem[] = [];
        let maxExisting = 0;
        goals.forEach(g => {
            (g.milestones || []).forEach(m => {
                if (m.order !== undefined && m.order > maxExisting) {
                    maxExisting = m.order;
                }
            });
        });

        let counter = maxExisting > 0 ? maxExisting + 10 : 0;
        goals.forEach(g => {
            const p = projects.find(x => x.id === g.projectId);
            const color = g.color || p?.color || '#0FA97A';
            const nivel = g.nivel || 1;
            (g.milestones || []).forEach(m => {
                const orderVal = m.order !== undefined ? m.order : (counter += 10);
                list.push({
                    id: `m:${g.id}:${m.id}`,
                    goal: g,
                    milestone: m,
                    proyecto: p,
                    nivelNum: nivel,
                    color,
                    plazo: m.plazo || 'corto',
                    order: orderVal,
                });
            });
        });

        list.sort((a, b) => a.order - b.order);
        return list;
    }, [goals, projects]);

    // Filtrar tareas por búsqueda, paso y proyecto
    const term = busqueda.trim().toLowerCase();
    const tareasFiltradas = useMemo(() => {
        return todasLasTareas.filter(t => {
            if (pasoFiltro !== null && t.nivelNum !== pasoFiltro) return false;
            if (proyectoFiltro !== null && t.proyecto?.id !== proyectoFiltro) return false;
            if (!term) return true;
            return (
                t.milestone.text.toLowerCase().includes(term) ||
                t.goal.title.toLowerCase().includes(term) ||
                (t.proyecto && t.proyecto.name.toLowerCase().includes(term))
            );
        });
    }, [todasLasTareas, pasoFiltro, proyectoFiltro, term]);

    // Estadísticas
    const totalMetas = goals.filter(g => !g.parentId).length;
    const totalTareas = todasLasTareas.length;
    const totalTareasHechas = todasLasTareas.filter(t => t.milestone.completed).length;

    // ── Sensors para Drag & Drop ──
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const [activeMilestone, setActiveMilestone] = useState<TareaPlanaItem | null>(null);

    const handleDragStart = (e: DragStartEvent) => {
        const item = todasLasTareas.find(t => t.id === e.active.id);
        if (item) setActiveMilestone(item);
    };

    /* Reordenamiento total en la lista unificada */
    const handleDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        setActiveMilestone(null);
        if (!over || active.id === over.id) return;

        const oldIndex = todasLasTareas.findIndex(t => t.id === active.id);
        const newIndex = todasLasTareas.findIndex(t => t.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(todasLasTareas, oldIndex, newIndex);

        // Asignar nuevo orden secuencial a cada tarea
        const orderMap = new Map<number, number>();
        reordered.forEach((t, idx) => {
            orderMap.set(t.milestone.id, (idx + 1) * 10);
        });

        if (reorderGoals) {
            const nextGoals = goals.map(g => {
                const arr = (g.milestones || []).map(m => {
                    const o = orderMap.get(m.id);
                    return o !== undefined ? { ...m, order: o } : m;
                });
                arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                return { ...g, milestones: arr };
            });
            reorderGoals(nextGoals);
        } else {
            goals.forEach(g => {
                const arr = (g.milestones || []).map(m => {
                    const o = orderMap.get(m.id);
                    return o !== undefined ? { ...m, order: o } : m;
                });
                arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                onUpdateGoal(g.id, { milestones: arr });
            });
        }
    };

    // Información del nivel actualmente filtrado
    const nivelActivoInfo = pasoFiltro !== null ? gruposNiveles.find(gn => gn.nivelNum === pasoFiltro) : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%' }}>

            {/* ── 1. BARRA DE PILLS DE PASOS (Estilo Tarjetas) ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '4px',
                scrollbarWidth: 'none',
            }}>
                <button
                    type="button"
                    onClick={() => setPasoFiltro(null)}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '999px',
                        border: pasoFiltro === null ? 'none' : `1px solid ${C.outlineVariant}`,
                        background: pasoFiltro === null ? '#0FA97A' : '#FFFFFF',
                        color: pasoFiltro === null ? '#FFFFFF' : C.onSurface,
                        boxShadow: pasoFiltro === null ? '0 2px 8px rgba(15,169,122,0.35)' : '0 1px 3px rgba(0,0,0,0.04)',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>list_alt</span>
                    <span>TODOS LOS PASOS</span>
                </button>

                {gruposNiveles.map(gn => {
                    const isSelected = pasoFiltro === gn.nivelNum;
                    return (
                        <button
                            key={gn.nivelNum}
                            type="button"
                            onClick={() => setPasoFiltro(isSelected ? null : gn.nivelNum)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 14px',
                                borderRadius: '999px',
                                border: isSelected ? 'none' : `1px solid ${gn.info.color}35`,
                                background: isSelected ? gn.info.color : '#FFFFFF',
                                color: isSelected ? '#FFFFFF' : C.onSurface,
                                boxShadow: isSelected ? `0 2px 8px ${gn.info.color}40` : '0 1px 3px rgba(0,0,0,0.04)',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isSelected ? '#FFFFFF' : gn.info.color }} />
                            <span>{gn.info.titulo}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── 2. BANNER INFORMATIVO (Estilo Tarjetas) ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                background: nivelActivoInfo ? `${nivelActivoInfo.info.color}0D` : 'rgba(15, 169, 122, 0.05)',
                border: `1px solid ${nivelActivoInfo ? nivelActivoInfo.info.color + '35' : 'rgba(15, 169, 122, 0.25)'}`,
                borderLeftWidth: '5px',
                borderLeftColor: nivelActivoInfo ? nivelActivoInfo.info.color : '#0FA97A',
                borderRadius: '14px',
                padding: movil ? '10px 12px' : '12px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '220px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px', color: nivelActivoInfo ? nivelActivoInfo.info.color : '#0FA97A' }}>
                        {nivelActivoInfo ? nivelActivoInfo.info.icono : 'format_list_bulleted'}
                    </span>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{
                                fontSize: '0.94rem',
                                fontWeight: 900,
                                color: nivelActivoInfo ? nivelActivoInfo.info.color : '#0FA97A',
                                letterSpacing: '0.04em',
                            }}>
                                {nivelActivoInfo ? nivelActivoInfo.info.titulo : 'LISTA UNIFICADA DE METAS Y TAREAS'}
                            </span>
                            <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '1px 8px',
                                borderRadius: '999px',
                                background: nivelActivoInfo ? `${nivelActivoInfo.info.color}20` : 'rgba(15,169,122,0.15)',
                                color: nivelActivoInfo ? nivelActivoInfo.info.color : '#0FA97A',
                            }}>
                                {nivelActivoInfo ? nivelActivoInfo.info.horizonte : 'Todas las metas intercaladas'}
                            </span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: C.onSurfaceVariant, marginTop: '2px', fontWeight: 500 }}>
                            {nivelActivoInfo ? nivelActivoInfo.info.subtitulo : 'Arrastra cualquier tarea para intercalarla con la prioridad que desees'}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: '999px',
                        background: '#FFFFFF',
                        color: C.onSurface,
                        border: `1px solid ${C.outlineVariant}`,
                        fontFamily: MONO,
                    }}>
                        {totalTareasHechas}/{totalTareas} tareas hechas ({totalMetas} metas)
                    </span>

                    <button
                        type="button"
                        onClick={() => setForm({ tipo: 'meta', inicial: { nivel: pasoFiltro || 1, color: nivelActivoInfo?.info.color || '#0FA97A' } })}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            background: nivelActivoInfo ? nivelActivoInfo.info.color : '#0FA97A',
                            border: 'none',
                            color: '#FFFFFF',
                            borderRadius: '999px',
                            padding: '4px 12px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
                        Meta
                    </button>
                </div>
            </div>

            {/* ── 3. TARJETA BLANCA CONTENEDORA (Estilo Tarjetas) ── */}
            <div style={{
                width: '100%',
                boxSizing: 'border-box',
                borderRadius: '16px',
                border: `1px solid ${C.outlineVariant}`,
                background: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                padding: movil ? '12px' : '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
            }}>
                {/* Barra superior de la tarjeta: Buscador + Filtros por Proyecto + Toggle de Vista */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    paddingBottom: '10px',
                    borderBottom: `1px solid ${C.outlineVariant}`,
                }}>
                    {/* Buscador limpio */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flex: movil ? '1 1 100%' : '1 1 240px',
                        maxWidth: '360px',
                        background: C.surfaceContainerLow || '#F8FAF9',
                        borderRadius: '999px',
                        padding: '5px 12px',
                        border: `1px solid ${C.outlineVariant}`,
                    }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: C.outline }}>search</span>
                        <input
                            type="text"
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar tarea o proyecto..."
                            style={{
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                fontSize: '0.82rem',
                                color: C.onSurface,
                                width: '100%',
                                fontFamily: 'inherit',
                            }}
                        />
                        {busqueda && (
                            <button type="button" onClick={() => setBusqueda('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: C.outline, padding: 0 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                            </button>
                        )}
                    </div>

                    {/* Chips de Proyectos (Filtro rápido) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', maxWidth: movil ? '100%' : '400px', scrollbarWidth: 'none' }}>
                        <button
                            type="button"
                            onClick={() => setProyectoFiltro(null)}
                            style={{
                                padding: '3px 9px',
                                borderRadius: '999px',
                                border: proyectoFiltro === null ? 'none' : `1px solid ${C.outlineVariant}`,
                                background: proyectoFiltro === null ? '#0FA97A' : 'transparent',
                                color: proyectoFiltro === null ? '#FFFFFF' : C.onSurfaceVariant,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Todos
                        </button>
                        {projects.map(p => {
                            const isPSelected = proyectoFiltro === p.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setProyectoFiltro(isPSelected ? null : p.id)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '3px 9px',
                                        borderRadius: '999px',
                                        border: isPSelected ? 'none' : `1px solid ${p.color || '#0FA97A'}35`,
                                        background: isPSelected ? p.color || '#0FA97A' : `${p.color || '#0FA97A'}10`,
                                        color: isPSelected ? '#FFFFFF' : p.color || '#0FA97A',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <span>🧭</span>
                                    <span>{p.name}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Selector de modo: Lista única vs Por proyectos */}
                    <div style={{
                        display: 'inline-flex',
                        padding: '2px',
                        background: C.surfaceContainerLow || '#F1F5F4',
                        borderRadius: '8px',
                        border: `1px solid ${C.outlineVariant}`,
                    }}>
                        <button
                            type="button"
                            onClick={() => setVistaModo('unica')}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: vistaModo === 'unica' ? '#FFFFFF' : 'transparent',
                                color: vistaModo === 'unica' ? C.onSurface : C.outline,
                                fontWeight: vistaModo === 'unica' ? 800 : 600,
                                fontSize: '0.74rem',
                                cursor: 'pointer',
                                boxShadow: vistaModo === 'unica' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: vistaModo === 'unica' ? '#0FA97A' : 'inherit' }}>
                                format_list_bulleted
                            </span>
                            Lista única
                        </button>
                        <button
                            type="button"
                            onClick={() => setVistaModo('estructurada')}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: vistaModo === 'estructurada' ? '#FFFFFF' : 'transparent',
                                color: vistaModo === 'estructurada' ? C.onSurface : C.outline,
                                fontWeight: vistaModo === 'estructurada' ? 800 : 600,
                                fontSize: '0.74rem',
                                cursor: 'pointer',
                                boxShadow: vistaModo === 'estructurada' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: vistaModo === 'estructurada' ? '#0FA97A' : 'inherit' }}>
                                account_tree
                            </span>
                            Por proyectos
                        </button>
                    </div>
                </div>

                {/* ── 4. CONTENIDO: LISTA UNIFICADA O POR PROYECTOS ── */}
                {vistaModo === 'unica' ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragCancel={() => setActiveMilestone(null)}
                    >
                        {tareasFiltradas.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '36px 16px', color: C.outline }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '32px', opacity: 0.4 }}>playlist_add_check</span>
                                <p style={{ margin: '8px 0 0', fontSize: '0.88rem' }}>No hay tareas que coincidan con el filtro.</p>
                            </div>
                        ) : (
                            <SortableContext
                                items={tareasFiltradas.map(t => t.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {tareasFiltradas.map(t => (
                                        <SortableMilestoneFilaUnica
                                            key={t.id}
                                            item={t}
                                            onToggleMilestone={onToggleMilestone}
                                            onRemoveMilestone={onRemoveMilestone}
                                            onAbrirDetalle={onAbrirDetalle}
                                            onUpdateGoal={onUpdateGoal}
                                            bloquesRep={getBloquesRepetitivos(t.goal.id, t.milestone)}
                                            updateDailyBlock={updateDailyBlock}
                                            pasosAbiertos={pasosAbiertos}
                                            setPasosAbiertos={setPasosAbiertos}
                                            convT={convT}
                                            setConvT={setConvT}
                                            nuevoPasoTexto={nuevoPasoTexto}
                                            setNuevoPasoTexto={setNuevoPasoTexto}
                                            toggleSubPaso={toggleSubPaso}
                                            agregarSubPaso={agregarSubPaso}
                                            eliminarSubPaso={eliminarSubPaso}
                                            convertirTarea={convertirTarea}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        )}

                        {/* DragOverlay flotante */}
                        <DragOverlay dropAnimation={null}>
                            {activeMilestone ? (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 14px',
                                    background: '#FFFFFF',
                                    borderRadius: '10px',
                                    boxShadow: '0 10px 28px rgba(0,0,0,0.2)',
                                    border: `1px solid ${C.outlineVariant}`,
                                    maxWidth: '450px',
                                    pointerEvents: 'none',
                                }}>
                                    <GripVertical size={14} strokeWidth={2.3} color="#0FA97A" />
                                    <div style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '6px',
                                        border: `2px solid ${activeMilestone.color}`,
                                        flexShrink: 0,
                                    }} />
                                    <span style={{
                                        fontSize: '0.88rem',
                                        fontWeight: 600,
                                        color: C.onSurface,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {activeMilestone.milestone.text}
                                    </span>
                                    <div style={{
                                        marginLeft: 'auto',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: `${activeMilestone.color}18`,
                                        color: activeMilestone.color,
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                    }}>
                                        {activeMilestone.proyecto?.name || activeMilestone.goal.title}
                                    </div>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                ) : (
                    /* ── VISTA POR PROYECTOS (Con estilo Tarjetas blancas limpias) ── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {gruposNiveles.map(gn => {
                            if (pasoFiltro !== null && gn.nivelNum !== pasoFiltro) return null;
                            const keyNivel = `nivel-${gn.nivelNum}`;
                            const nivelColapsado = !!colapsados[keyNivel];

                            return (
                                <div key={gn.nivelNum} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div
                                        onClick={() => toggleColapso(keyNivel)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            background: `${gn.info.color}10`,
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            border: `1px solid ${gn.info.color}30`,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="material-symbols-outlined" style={{
                                                fontSize: '18px',
                                                color: gn.info.color,
                                                transform: nivelColapsado ? 'rotate(-90deg)' : 'none',
                                                transition: 'transform 0.15s ease',
                                            }}>
                                                expand_more
                                            </span>
                                            <span style={{ fontSize: '0.88rem', fontWeight: 900, color: gn.info.color }}>
                                                {gn.info.titulo}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: gn.info.color }}>
                                            {gn.completadas}/{gn.totalMetas} metas
                                        </span>
                                    </div>

                                    {!nivelColapsado && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '6px' }}>
                                            {gn.gruposProyecto.map(gp => {
                                                const colorVis = gp.proyecto?.color || gn.info.color;
                                                return (
                                                    <div key={gp.proyecto?.id || 'sin'} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                                            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: colorVis }}>
                                                                🧭 VISIÓN {gp.proyecto ? gp.proyecto.name : 'Otras metas'}
                                                            </span>
                                                        </div>

                                                        {gp.metas.map(g => {
                                                            const colorMeta = g.color || colorVis;
                                                            const isDone = g.status === 'completado';
                                                            const milestones = g.milestones || [];
                                                            return (
                                                                <div
                                                                    key={g.id}
                                                                    style={{
                                                                        borderRadius: '12px',
                                                                        border: `1px solid ${C.outlineVariant}`,
                                                                        background: '#FFFFFF',
                                                                        padding: '10px 14px',
                                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: '8px',
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <span style={{ fontSize: '15px' }}>{g.icon || '🎯'}</span>
                                                                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: isDone ? C.outline : C.onSurface }}>
                                                                                {g.title}
                                                                            </span>
                                                                            <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', background: `${colorMeta}15`, color: colorMeta }}>
                                                                                {g.area || 'Meta'}
                                                                            </span>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => onEditarMeta(g)}
                                                                            style={{ border: 'none', background: 'transparent', color: C.outline, cursor: 'pointer', padding: 0 }}
                                                                        >
                                                                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>more_vert</span>
                                                                        </button>
                                                                    </div>

                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px' }}>
                                                                        {milestones.map(m => (
                                                                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => onToggleMilestone(g.id, m.id)}
                                                                                        style={{
                                                                                            width: '18px', height: '18px', borderRadius: '5px',
                                                                                            border: `2px solid ${m.completed ? colorMeta : C.outlineVariant}`,
                                                                                            background: m.completed ? colorMeta : '#fff',
                                                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                                                                                        }}
                                                                                    >
                                                                                        {m.completed && <span style={{ color: '#fff', fontSize: '10px' }}>✓</span>}
                                                                                    </button>
                                                                                    <span style={{ fontSize: '0.86rem', color: m.completed ? C.outline : C.onSurface, textDecoration: m.completed ? 'line-through' : 'none' }}>
                                                                                        {m.text}
                                                                                    </span>
                                                                                </div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => onRemoveMilestone(g.id, m.id)}
                                                                                    style={{ border: 'none', background: 'transparent', color: C.outline, cursor: 'pointer', padding: 0 }}
                                                                                >
                                                                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── 5. FORMULARIO RÁPIDO PARA AÑADIR NUEVA TAREA ── */}
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        const t = nuevaTareaTexto.trim();
                        if (!t) return;
                        const targetId = metaDestinoId || goals.find(g => !g.parentId)?.id;
                        if (!targetId) return;
                        onAddMilestone(targetId, t, 'corto');
                        setNuevaTareaTexto('');
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        background: C.surfaceContainerLow || '#F8FAF9',
                        borderRadius: '12px',
                        border: `1px solid ${C.outlineVariant}`,
                        marginTop: '6px',
                    }}
                >
                    <span style={{ color: '#0FA97A', fontSize: '18px', fontWeight: 800 }}>+</span>
                    <input
                        type="text"
                        value={nuevaTareaTexto}
                        onChange={e => setNuevaTareaTexto(e.target.value)}
                        placeholder="Añadir nueva tarea a la lista... (Enter)"
                        style={{
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            fontSize: '0.86rem',
                            color: C.onSurface,
                            flex: 1,
                            fontFamily: 'inherit',
                        }}
                    />

                    {/* Selector de Meta/Proyecto destino */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: C.outline, fontWeight: 700 }}>Para:</span>
                        <select
                            value={metaDestinoId || ''}
                            onChange={e => setMetaDestinoId(Number(e.target.value))}
                            style={{
                                border: `1px solid ${C.outlineVariant}`,
                                background: '#FFFFFF',
                                borderRadius: '8px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                padding: '4px 8px',
                                color: C.onSurface,
                                cursor: 'pointer',
                                maxWidth: '200px',
                                outline: 'none',
                            }}
                        >
                            {goals.filter(g => !g.parentId).map(g => {
                                const p = projects.find(x => x.id === g.projectId);
                                return (
                                    <option key={g.id} value={g.id}>
                                        {p ? `${p.name} · ` : ''}{g.title}
                                    </option>
                                );
                            })}
                        </select>

                        <button
                            type="submit"
                            style={{
                                background: '#0FA97A',
                                border: 'none',
                                color: '#FFFFFF',
                                borderRadius: '8px',
                                padding: '5px 14px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                boxShadow: '0 1px 3px rgba(15,169,122,0.3)',
                            }}
                        >
                            Agregar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
