import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DailyBlock, Note, SporadicProject, CalendarEvent, Goal } from '../../hooks/useAlDiaState';
import { MetasHoy } from './MetasHoy';

import { C, bento as bentoCard, useIsMobile, MONO, paddingPagina } from '../../theme';
import { RegistroMovimiento } from '../features/RegistroMovimiento';
import { getDiasPausa, toggleDiaPausa } from '../../lib/diasPausa';

/* ─── Period ────────────────────────────────────────────────────
   El Checklist ya no muestra franjas (Mañana/Tarde/Noche). El campo
   `period` sigue en los datos como parte de la clave de cada tarea;
   las nuevas se crean siempre como 'Otro'. */
type Period = 'Mañana' | 'Tarde' | 'Noche' | 'Otro';

/* Tarjeta de tarea compacta para Mi Día */
const bentoTarea: React.CSSProperties = {
    background: C.surfaceLowest,
    borderRadius: '10px',
    border: `1px solid ${C.outlineVariant}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    transition: 'box-shadow 0.15s, border-color 0.15s',
};

/* ─── Task key helper ───────────────────────────────────────── */
const taskKey = (label: string, period: string) => `${label.toLowerCase()}||${period}`;

/* ══════════════════════════════════════════════════════════════
   SortableTaskCard — individual draggable task item
══════════════════════════════════════════════════════════════ */
interface TaskCardProps {
    id: string;
    label: string;
    period: Period;
    isDone: boolean;
    projColor: string;
    projName: string;
    metaNombre?: string; // meta a la que aporta esta tarea
    metaColor?: string;
    time?: string;
    isDragging?: boolean;
    onToggle: () => void;
    onMenuClick: (e: React.MouseEvent, label: string, period: Period) => void;
}

const TaskCard = ({
    id, label, period, isDone, projColor, projName, metaNombre, metaColor, time,
    isDragging = false, onToggle, onMenuClick,
}: TaskCardProps) => {
    const {
        attributes, listeners, setNodeRef,
        transform, transition, isDragging: isSortDragging,
    } = useSortable({ id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isSortDragging ? 0.3 : 1,
        touchAction: 'none',
    };

    return (
        <div ref={setNodeRef} style={style}>
            <motion.div
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                    padding: '7px 8px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: C.surfaceLowest,
                    borderBottom: `1px solid ${C.outlineVariant}`,
                    opacity: isDone ? 0.6 : 1,
                    cursor: isDragging ? 'grabbing' : 'default',
                    minHeight: '40px',
                    boxSizing: 'border-box',
                }}
                className="task-card-row"
            >
                {/* Drag handle */}
                <button
                    {...attributes}
                    {...listeners}
                    title="Arrastrar para reordenar"
                    style={{
                        background: 'none', border: 'none', cursor: 'grab',
                        padding: 0, color: C.outlineVariant,
                        display: 'flex', alignItems: 'center',
                        opacity: 0, transition: 'opacity 0.15s',
                        flexShrink: 0,
                    }}
                    className="drag-handle"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>drag_indicator</span>
                </button>

                {/* Checkbox */}
                <button
                    onClick={onToggle}
                    style={{
                        width: '20px', height: '20px', minWidth: '20px',
                        borderRadius: '50%',
                        border: `1.5px solid ${isDone ? projColor : C.outline}`,
                        background: isDone ? projColor : 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s', padding: 0, flexShrink: 0,
                    }}
                >
                    {isDone && (
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '13px', color: '#fff', fontVariationSettings: "'FILL' 1" }}
                        >check</span>
                    )}
                </button>

                {/* Content: label + badges on one compact line */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <span style={{
                        fontSize: '0.82rem', fontWeight: 600, color: C.onSurface, lineHeight: 1.25,
                        textDecoration: isDone ? 'line-through' : 'none',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {label}
                    </span>

                    {time && (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '2px',
                            fontSize: '0.64rem', color: C.onSurfaceVariant, fontFamily: MONO,
                            background: 'rgba(0,0,0,0.04)', padding: '1px 5px', borderRadius: '4px',
                            flexShrink: 0,
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '11px', color: C.outline }}>schedule</span>
                            {time}
                        </span>
                    )}

                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                        fontSize: '0.64rem', color: C.onSurfaceVariant,
                        flexShrink: 0,
                    }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: projColor, display: 'inline-block' }} />
                        {projName}
                    </span>

                    {metaNombre && (
                        <span title={`Aporta a la meta: ${metaNombre}`} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '2px', minWidth: 0,
                            fontSize: '0.64rem', fontWeight: 700, color: metaColor || C.primary,
                            background: `color-mix(in srgb, ${metaColor || C.primary} 10%, white)`, padding: '1px 6px', borderRadius: '999px',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '11px', flexShrink: 0 }}>flag</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{metaNombre}</span>
                        </span>
                    )}
                </div>

                {/* Menu */}
                <button
                    onClick={(e) => onMenuClick(e, label, period)}
                    title="Más opciones"
                    className="menu-btn"
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#6C8079', opacity: 0.7, transition: 'opacity 0.15s',
                        padding: '2px', display: 'flex', alignItems: 'center',
                        borderRadius: '6px', flexShrink: 0,
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>more_vert</span>
                </button>
            </motion.div>
        </div>
    );
};

/* ══════════════════════════════════════════════════════════════
   NotaDesplegable / NotasDelDia — el grupo "Por hacer" de Pendientes, a mano en
   Mi Día. Es la MISMA nota (q: 'pendiente-inbox'), así que lo que se
   anota o se marca acá se ve en Pendientes y al revés.
══════════════════════════════════════════════════════════════ */
const Q_POR_HACER = 'pendiente-inbox';

const NotaDesplegable = ({ nota, titulo, soloPendientes, updateNote }: {
    nota: Note;
    titulo: string;
    soloPendientes: boolean;
    updateNote?: (id: number, updates: Partial<Note>) => void;
}) => {
    const [abierto, setAbierto] = useState(false);
    const pendientes = nota.items.filter(i => !i.completed);
    const visibles = soloPendientes ? pendientes : nota.items;

    const marcar = (id: number) => {
        if (!updateNote) return;
        updateNote(nota.id, { items: nota.items.map(i => i.id === id ? { ...i, completed: !i.completed } : i) });
    };

    return (
        <div style={{ ...bentoCard, padding: '0.5rem 0.85rem' }}>
            <button
                onClick={() => setAbierto(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', fontFamily: 'inherit', color: C.onSurface }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: C.primary }}>checklist</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, textAlign: 'left' }}>{titulo}</span>
                {pendientes.length > 0 && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, background: 'rgba(15, 169, 122,0.10)', color: C.primary, borderRadius: '999px', padding: '1px 8px' }}>{pendientes.length}</span>
                )}
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: C.outline, marginLeft: 'auto', transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>expand_more</span>
            </button>
            {abierto && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '4px' }}>
                    {visibles.map(i => (
                        <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                            <button
                                onClick={() => marcar(i.id)}
                                aria-label="Marcar hecho"
                                style={{ width: '18px', height: '18px', minWidth: '18px', borderRadius: '5px', border: `2px solid ${i.completed ? C.secondary : C.outlineVariant}`, background: i.completed ? C.secondary : 'transparent', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                {i.completed && <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#fff' }}>check</span>}
                            </button>
                            <span style={{ fontSize: '0.83rem', color: i.completed ? C.outline : C.onSurface, textDecoration: i.completed ? 'line-through' : 'none', lineHeight: 1.3 }}>{i.text}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/* "Por hacer" de Pendientes (solo lo pendiente; ahí se agrega) + las listas
   que se enviaron a Mi Día desde Listas (con todos sus ítems, para tildarlos). */
const NotasDelDia = ({ notes, updateNote }: { notes: Note[]; updateNote?: (id: number, updates: Partial<Note>) => void }) => {
    const porHacer = notes.find(n => n.type === 'checklist' && n.q === Q_POR_HACER);
    const listas = notes.filter(n => n.type === 'checklist' && n.enMiDia && n.q !== Q_POR_HACER);
    const verPorHacer = porHacer && porHacer.items.some(i => !i.completed);
    if (!verPorHacer && listas.length === 0) return null;
    return (
        <>
            {verPorHacer && <NotaDesplegable nota={porHacer!} titulo="Por hacer" soloPendientes updateNote={updateNote} />}
            {listas.map(l => <NotaDesplegable key={l.id} nota={l} titulo={l.title} soloPendientes={false} updateNote={updateNote} />)}
        </>
    );
};

/* ══════════════════════════════════════════════════════════════
   EntregasEnDesarrollo — mini-sección dentro de Mi Día que muestra
   las entregas que ya están en desarrollo (tienen trabajo encima o
   status 'en-progreso'). Las puramente pendientes sin iniciar no
   aparecen, y las completadas tampoco.
══════════════════════════════════════════════════════════════ */
const ESTADO_COLOR_MINI: Record<string, string> = {
    'Agendado': '#3ED9A0',
    'Realizado': '#8B5CF6',
    'En Edición': '#B9760A',
    'Terminado': '#2563EB',
    'Entregado': '#0FA97A',
};

const daysBetween = (a: string, b: string) =>
    Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);

const semaforoColor = (dias: number) =>
    dias < 0 ? '#C63C3C' : dias <= 2 ? '#B9760A' : '#0FA97A';

const EntregasEnDesarrollo = ({ sporadicProjects, calendarEvents, todayStr, onOpenEntregas, startSporadicTimer, pauseSporadicTimer }: {
    sporadicProjects: SporadicProject[];
    calendarEvents: CalendarEvent[];
    todayStr: string;
    onOpenEntregas?: () => void;
    startSporadicTimer?: (id: number) => void;
    pauseSporadicTimer?: (id: number) => void;
}) => {
    const [abierto, setAbierto] = useState(false);

    const activas = useMemo(() =>
        sporadicProjects.filter(p =>
            p.status !== 'completado' &&
            (p.status === 'en-progreso' || p.workedHours > 0 || !!p.activeSince || !!p.pinned)
        ).sort((a, b) => {
            // Prioridad: pinned/corriendo primero, luego por urgencia (días restantes ASC)
            const pinA = Number(!!a.pinned || !!a.activeSince);
            const pinB = Number(!!b.pinned || !!b.activeSince);
            if (pinA !== pinB) return pinB - pinA;
            return daysBetween(todayStr, a.dueDate) - daysBetween(todayStr, b.dueDate);
        }),
    [sporadicProjects, todayStr]);

    if (activas.length === 0) return null;

    const renderItem = (p: SporadicProject) => {
        const dias = daysBetween(todayStr, p.dueDate);
        const ev = p.notionId ? calendarEvents.find(e => e.notionId === p.notionId) : undefined;
        const estado = ev?.notionEstado;
        const color = semaforoColor(dias);
        const diasLabel = dias < 0
            ? `${Math.abs(dias)}d atraso`
            : dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `${dias}d`;

        return (
            <div
                key={p.id}
                style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 8px', borderRadius: '10px',
                    background: dias < 0 ? 'rgba(198, 60, 60, 0.04)' : 'transparent',
                    cursor: onOpenEntregas ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                }}
                onClick={onOpenEntregas}
                title={`Ir a Entregas — ${p.title}`}
            >
                {/* Semáforo dot */}
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                {/* Título */}
                <span style={{
                    flex: 1, minWidth: 0, fontSize: '0.83rem', fontWeight: 600,
                    color: C.onSurface, lineHeight: 1.3,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{p.title}</span>
                {/* Estado Notion badge */}
                {estado && (
                    <span style={{
                        fontSize: '0.62rem', fontWeight: 700,
                        color: ESTADO_COLOR_MINI[estado] || C.onSurfaceVariant,
                        background: `${ESTADO_COLOR_MINI[estado] || C.outline}14`,
                        borderRadius: '6px', padding: '1px 6px',
                        whiteSpace: 'nowrap', flexShrink: 0,
                    }}>{estado}</span>
                )}
                {/* Días restantes */}
                <span style={{
                    fontSize: '0.68rem', fontWeight: 800, color,
                    whiteSpace: 'nowrap', flexShrink: 0,
                }}>{diasLabel}</span>
                {/* Botón Play / Pause */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (p.activeSince) {
                            pauseSporadicTimer?.(p.id);
                        } else {
                            startSporadicTimer?.(p.id);
                        }
                    }}
                    title={p.activeSince ? 'Pausar cronómetro' : 'Iniciar cronómetro'}
                    style={{
                        width: '26px', height: '26px', borderRadius: '50%',
                        background: p.activeSince ? 'rgba(198, 60, 60, 0.12)' : 'rgba(15, 169, 122, 0.12)',
                        border: 'none',
                        color: p.activeSince ? '#C63C3C' : C.primary,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', flexShrink: 0,
                        transition: 'all 0.15s',
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        {p.activeSince ? 'pause' : 'play_arrow'}
                    </span>
                </button>
                {/* Indicadores extra */}
                {!!p.activeSince && (
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#C63C3C', animation: 'pulse 1.5s infinite', flexShrink: 0 }}>timer</span>
                )}
                {!!p.pinned && !p.activeSince && (
                    <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#B9760A', flexShrink: 0 }}>push_pin</span>
                )}
            </div>
        );
    };

    const principal = activas[0];

    return (
        <div style={{ ...bentoCard, padding: abierto ? '0.5rem 0.85rem' : '0.42rem 0.85rem' }}>
            <button
                onClick={() => setAbierto(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', fontFamily: 'inherit', color: C.onSurface }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#B9760A', flexShrink: 0 }}>
                    {principal?.activeSince ? 'timer' : 'local_fire_department'}
                </span>
                <span style={{
                    fontSize: '0.85rem', fontWeight: 800, textAlign: 'left',
                    flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {principal ? principal.title : 'Entregas'}
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, background: 'rgba(185, 118, 10, 0.10)', color: '#B9760A', borderRadius: '999px', padding: '1px 8px', flexShrink: 0 }}>
                    {activas.length}
                </span>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: C.outline, marginLeft: 'auto', transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                    expand_more
                </span>
            </button>
            {abierto && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px' }}>
                    {activas.map(p => renderItem(p))}
                </div>
            )}
        </div>
    );
};

/* ══════════════════════════════════════════════════════════════
   Main Component
══════════════════════════════════════════════════════════════ */
interface ChecklistDiarioProps {
    dailyBlocks:      DailyBlock[];
    addDailyBlock:    (label: string, period: Period, date: string, completed?: boolean, projectId?: number, repeatDays?: number[]) => void;
    toggleDailyBlock: (id: number) => void;
    removeDailyBlock: (id: number | number[]) => void;
    updateDailyBlock: (id: number, updates: Partial<DailyBlock>) => void;
    projects:         any[];
    addTransaction?:  (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projectId?: number, accountId?: number, isCashless?: boolean, category?: string, contact?: string) => void;
    accounts?:        { id: number; name: string; color: string }[];
    incomeCategories?:  string[];
    expenseCategories?: string[];
    categoryAccountScope?: { ingreso: Record<string, number[]>; gasto: Record<string, number[]> };
    categoryGroups?: { ingreso: Record<string, string>; gasto: Record<string, string> };
    groupAccountScope?: { ingreso: Record<string, number[]>; gasto: Record<string, number[]> };
    onOpenBandeja?: () => void;
    notes?: Note[];
    updateNote?: (id: number, updates: Partial<Note>) => void;
    sporadicProjects?: SporadicProject[];
    calendarEvents?: CalendarEvent[];
    onOpenEntregas?: () => void;
    startSporadicTimer?: (id: number) => void;
    pauseSporadicTimer?: (id: number) => void;
    goals?: Goal[];
    onOpenMetas?: () => void;
    selectedDateStr?: string;
    onChangeDate?: (date: string) => void;
    onOpenFullCalendar?: () => void;
}

const SORT_STORAGE_KEY = 'aldia-checklist-custom-order';

export const ChecklistDiario = ({
    dailyBlocks, addDailyBlock, toggleDailyBlock, removeDailyBlock, updateDailyBlock, projects,
    addTransaction, accounts = [],
    incomeCategories, expenseCategories, categoryAccountScope, categoryGroups, groupAccountScope,
    onOpenBandeja, notes = [], updateNote, goals = [], onOpenMetas,
    sporadicProjects = [], calendarEvents = [], onOpenEntregas,
    startSporadicTimer, pauseSporadicTimer,
    selectedDateStr, onChangeDate, onOpenFullCalendar,
}: ChecklistDiarioProps) => {
    const realToday = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
    const [todayStr, setTodayStr] = useState(() => selectedDateStr || realToday);

    useEffect(() => {
        if (selectedDateStr && selectedDateStr !== todayStr) {
            setTodayStr(selectedDateStr);
        }
    }, [selectedDateStr]);

    /* La fecha se recalcula sola a medianoche solo si el usuario está en "hoy". */
    useEffect(() => {
        const tick = () => {
            const now = new Date().toLocaleDateString('en-CA');
            setTodayStr(prev => (prev === realToday ? now : prev));
        };
        const timer = setInterval(tick, 60_000);
        document.addEventListener('visibilitychange', tick);
        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [realToday]);

    const esHoy = todayStr === realToday;

    const cambiarDia = useCallback((delta: number) => {
        const [y, m, d] = todayStr.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        dt.setDate(dt.getDate() + delta);
        const nueva = dt.toLocaleDateString('en-CA');
        setTodayStr(nueva);
        onChangeDate?.(nueva);
    }, [todayStr, onChangeDate]);

    const irAHoy = useCallback(() => {
        const hoy = new Date().toLocaleDateString('en-CA');
        setTodayStr(hoy);
        onChangeDate?.(hoy);
    }, [onChangeDate]);

    const seleccionarFecha = useCallback((fecha: string) => {
        setTodayStr(fecha);
        onChangeDate?.(fecha);
        setCalendarOpen(false);
    }, [onChangeDate]);

    const badgeOffset = useMemo(() => {
        if (esHoy) return null;
        const [y1, m1, d1] = realToday.split('-').map(Number);
        const [y2, m2, d2] = todayStr.split('-').map(Number);
        const dt1 = new Date(y1, m1 - 1, d1).getTime();
        const dt2 = new Date(y2, m2 - 1, d2).getTime();
        const diffDays = Math.round((dt2 - dt1) / 86400000);
        if (diffDays === -1) return 'Ayer';
        if (diffDays === 1) return 'Mañana';
        if (diffDays < 0) return `${Math.abs(diffDays)}d antes`;
        return `en ${diffDays}d`;
    }, [esHoy, realToday, todayStr]);

    const [calendarOpen, setCalendarOpen] = useState(false);
    const [pickerMonth, setPickerMonth] = useState(() => {
        const [y, m] = (selectedDateStr || realToday).split('-').map(Number);
        return new Date(y, m - 1, 1);
    });

    useEffect(() => {
        if (calendarOpen) {
            const [y, m] = todayStr.split('-').map(Number);
            setPickerMonth(new Date(y, m - 1, 1));
        }
    }, [calendarOpen, todayStr]);

    // Eventos y citas del calendario agendadas para el día visualizado
    const eventosDelDia = useMemo(() => {
        return calendarEvents.filter(e => e.date === todayStr);
    }, [calendarEvents, todayStr]);

    const [diasPausa, setDiasPausa] = useState<string[]>(() => getDiasPausa());
    useEffect(() => {
        const sync = () => setDiasPausa(getDiasPausa());
        window.addEventListener('aldia_pausa_change', sync);
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener('aldia_pausa_change', sync);
            window.removeEventListener('storage', sync);
        };
    }, []);

    const esPausaHoy = diasPausa.includes(todayStr);
    const handleTogglePausa = () => {
        toggleDiaPausa(todayStr);
    };

    // Mismos índices que Tareas (donde se crean las repetitivas): lunes = 1 … sábado = 6, domingo = 0.
    const todayIndex = useMemo(() => new Date(`${todayStr}T00:00:00`).getDay(), [todayStr]);
    const todayLabel = useMemo(() => {
        const raw = new Date(`${todayStr}T00:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    }, [todayStr]);

    const [groupByProject,  setGroupByProject]   = useState(false);
    const [pendientesFirst, setPendientesFirst]  = useState(true);
    const [customOrder,     setCustomOrder]      = useState<string[]>([]);
    const [activeId,       setActiveId]        = useState<string | null>(null);
    const isMobile = useIsMobile();
    const [confirmDelete, setConfirmDelete] = useState<{ label: string; period: Period } | null>(null);
    const [editingTask, setEditingTask] = useState<{ label: string; period: Period } | null>(null);
    const [editText, setEditText] = useState('');
    const [openMenu, setOpenMenu] = useState<{ label: string; period: Period; anchor: HTMLElement | null } | null>(null);
    const [editingRepeat, setEditingRepeat] = useState<{ label: string; period: Period; repeatDays: number[] } | null>(null);

    /* ── Load saved order from localStorage ── */
    useEffect(() => {
        try {
            const saved = localStorage.getItem(SORT_STORAGE_KEY);
            if (saved) setCustomOrder(JSON.parse(saved));
        } catch {}
    }, []);

    const saveOrder = useCallback((order: string[]) => {
        setCustomOrder(order);
        try { localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(order)); } catch {}
    }, []);

    /* ── Derive unique task templates ── */
    const uniqueTemplates = useMemo(() => {
        const keys = new Set<string>();
        const list: { label: string; period: Period; projectId?: number; repeatDays?: number[]; date?: string; isActive?: boolean; time?: string }[] = [];
        // Los hábitos (tareas marcadas como hábito) ya salen como misiones: no se repiten acá.
        const etiquetasHabito = new Set(dailyBlocks.filter(b => b.isHabit).map(b => b.label.trim().toLowerCase()));
        dailyBlocks.forEach(b => {
            if (etiquetasHabito.has(b.label.trim().toLowerCase())) return;
            if (b.isActive === false) return; // Si está desactivada tipo alarma, no aparece
            const k = taskKey(b.label, b.period);
            if (!keys.has(k)) {
                keys.add(k);
                list.push({ label: b.label, period: b.period as Period, projectId: b.projectId, repeatDays: b.repeatDays, date: b.date, isActive: b.isActive, time: b.time });
            } else {
                const ex = list.find(l => taskKey(l.label, l.period) === k);
                if (ex) {
                    if (!ex.projectId && b.projectId) ex.projectId = b.projectId;
                    if ((!ex.repeatDays?.length) && b.repeatDays?.length) ex.repeatDays = b.repeatDays;
                    if (!ex.time && b.time) ex.time = b.time;
                    if (b.date === todayStr) ex.date = todayStr;
                }
            }
        });
        return list;
    }, [dailyBlocks, todayStr]);

    /* ── Tasks active today ── */
    const todayTemplates = useMemo(() =>
        uniqueTemplates.filter(t => {
            if (t.repeatDays && t.repeatDays.length > 0) {
                return t.repeatDays.includes(todayIndex);
            }
            return t.date === todayStr;
        }),
    [uniqueTemplates, todayIndex, todayStr]);

    /* ── Progress ── */
    const totalToday = todayTemplates.length;
    const completedToday = todayTemplates.filter(t => {
        const b = dailyBlocks.find(b =>
            b.label.toLowerCase() === t.label.toLowerCase() && b.period === t.period && b.date === todayStr
        );
        return b?.completed;
    }).length;
    const progressPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

    /* ── Sort tasks ── */
    const sortedTasks = useMemo(() => {
        let list = [...todayTemplates];

        // Orden base: el manual sustituye al automático, no se apila encima.
        // Así "Pendientes primero" sigue funcionando después de arrastrar.
        if (customOrder.length > 0) {
            list.sort((a, b) => {
                const ia = customOrder.indexOf(taskKey(a.label, a.period));
                const ib = customOrder.indexOf(taskKey(b.label, b.period));
                if (ia === -1 && ib === -1) return 0;
                if (ia === -1) return 1;   // las tareas nuevas van al final
                if (ib === -1) return -1;
                return ia - ib;
            });
        }

        // Opcional: agrupar por proyecto (orden estable, respeta el orden base dentro
        // de cada proyecto).
        if (groupByProject) {
            list.sort((a, b) => {
                const nameA = projects.find(p => p.id === a.projectId)?.name || 'ZZ';
                const nameB = projects.find(p => p.id === b.projectId)?.name || 'ZZ';
                return nameA.localeCompare(nameB);
            });
        }

        // Secundario: pendientes primero. Array.sort es estable, así que
        // dentro de cada grupo se respeta el orden base de arriba.
        if (pendientesFirst) {
            list.sort((a, b) => {
                const doneA = dailyBlocks.find(bl => bl.label.toLowerCase() === a.label.toLowerCase() && bl.period === a.period && bl.date === todayStr)?.completed ? 1 : 0;
                const doneB = dailyBlocks.find(bl => bl.label.toLowerCase() === b.label.toLowerCase() && bl.period === b.period && bl.date === todayStr)?.completed ? 1 : 0;
                return doneA - doneB;
            });
        }

        return list;
    }, [todayTemplates, groupByProject, customOrder, dailyBlocks, todayStr, projects, pendientesFirst]);

    const visibleTasks = sortedTasks;

    const visibleIds = useMemo(() => visibleTasks.map(t => taskKey(t.label, t.period)), [visibleTasks]);

    /* ── Toggle / create ── */
    const celebrateIfLast = useCallback(() => {
        // Se cuenta contra las tareas de HOY, no contra los bloques ya materializados:
        // las tareas que nunca se han tocado aún no tienen bloque creado.
        if (totalToday > 0 && completedToday + 1 === totalToday) {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#3ED9A0', '#FFD700', '#A8DADC'] });
        }
    }, [completedToday, totalToday]);

    // Meta a la que aporta una tarea (si la serie está ligada a una), para mostrarla como etiqueta.
    const metaDeTarea = (label: string, period: Period) => {
        const b = dailyBlocks.find(x => x.goalId !== undefined && x.period === period && x.label.trim().toLowerCase() === label.trim().toLowerCase());
        const g = b ? goals.find(x => x.id === b.goalId) : undefined;
        return g ? { metaNombre: g.title, metaColor: g.color } : {};
    };

    const handleToggle = useCallback((label: string, period: Period) => {
        const existing = dailyBlocks.find(b =>
            b.label.toLowerCase() === label.toLowerCase() && b.period === period && b.date === todayStr
        );
        if (existing) {
            const willComplete = !existing.completed;
            toggleDailyBlock(existing.id);
            if (willComplete) celebrateIfLast();
        } else {
            const tmpl = dailyBlocks.find(b => b.label.toLowerCase() === label.toLowerCase() && b.period === period);
            addDailyBlock(label, period, todayStr, true, tmpl?.projectId, tmpl?.repeatDays);
            celebrateIfLast();
        }
    }, [dailyBlocks, todayStr, toggleDailyBlock, addDailyBlock, celebrateIfLast]);

    const handleSaveEdit = useCallback(() => {
        if (!editingTask || !editText.trim()) return;
        const newLabel = editText.trim();

        // Renombrar es renombrar: se edita cada bloque en sitio. Antes se borraban
        // y se recreaban, lo que duplicaba registros y perdía projectId/repeatDays.
        dailyBlocks
            .filter(b => b.label.toLowerCase() === editingTask.label.toLowerCase() && b.period === editingTask.period)
            .forEach(b => updateDailyBlock(b.id, { label: newLabel }));

        // El orden manual se indexa por nombre: hay que mover la clave con la tarea.
        const oldKey = taskKey(editingTask.label, editingTask.period);
        const newKey = taskKey(newLabel, editingTask.period);
        if (oldKey !== newKey && customOrder.includes(oldKey)) {
            saveOrder(customOrder.map(k => (k === oldKey ? newKey : k)));
        }

        setEditingTask(null);
        setEditText('');
    }, [editingTask, editText, dailyBlocks, updateDailyBlock, customOrder, saveOrder]);

    const executeRemove = useCallback(() => {
        if (!confirmDelete) return;
        const matches = dailyBlocks.filter(b =>
            b.label.toLowerCase() === confirmDelete.label.toLowerCase() &&
            b.period === confirmDelete.period
        );
        if (matches.length) removeDailyBlock(matches.map(m => m.id));
        setConfirmDelete(null);
    }, [confirmDelete, dailyBlocks, removeDailyBlock]);

    const handleMenuClick = useCallback((e: React.MouseEvent, label: string, period: Period) => {
        e.stopPropagation();
        const anchor = e.currentTarget as HTMLElement;
        setOpenMenu({ label, period, anchor });
    }, []);

    const handleRemoveToday = useCallback((label: string, period: Period) => {
        const match = dailyBlocks.find(b =>
            b.label.toLowerCase() === label.toLowerCase() &&
            b.period === period && b.date === todayStr
        );
        if (match) removeDailyBlock(match.id);
        setOpenMenu(null);
    }, [dailyBlocks, removeDailyBlock, todayStr]);

    const handleEditName = useCallback((label: string, period: Period) => {
        setEditText(label);
        setEditingTask({ label, period });
        setOpenMenu(null);
    }, []);

    const handleRemoveAll = useCallback((label: string, period: Period) => {
        setConfirmDelete({ label, period });
        setOpenMenu(null);
    }, []);

    const handleEditRepeat = useCallback((label: string, period: Period) => {
        const tmpl = dailyBlocks.find(b => b.label.toLowerCase() === label.toLowerCase() && b.period === period);
        setEditingRepeat({ label, period, repeatDays: tmpl?.repeatDays || [0,1,2,3,4,5,6] });
        setOpenMenu(null);
    }, [dailyBlocks]);

    const handleSaveRepeat = useCallback((repeatDays: number[]) => {
        if (!editingRepeat) return;

        // Igual que al renombrar: se actualiza en sitio, conservando
        // el historial de completadas y el proyecto asignado.
        dailyBlocks
            .filter(b => b.label.toLowerCase() === editingRepeat.label.toLowerCase() && b.period === editingRepeat.period)
            .forEach(b => updateDailyBlock(b.id, { repeatDays }));

        setEditingRepeat(null);
    }, [editingRepeat, dailyBlocks, updateDailyBlock]);

    /* ── DnD sensors ── */
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragStart = (e: DragStartEvent) => {
        setActiveId(e.active.id as string);
    };

    const handleDragEnd = (e: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = e;
        if (!over || active.id === over.id) return;

        // Build a full order from sortedTasks, then swap
        const allKeys = sortedTasks.map(t => taskKey(t.label, t.period));
        const oldIndex = allKeys.indexOf(active.id as string);
        const newIndex = allKeys.indexOf(over.id as string);
        if (oldIndex === -1 || newIndex === -1) return;

        const newOrder = arrayMove(allKeys, oldIndex, newIndex);
        saveOrder(newOrder);
        // Switch to manual mode implicitly (customOrder now drives)
    };

    /* ── Active drag item info ── */
    const activeDragTask = activeId ? sortedTasks.find(t => taskKey(t.label, t.period) === activeId) : null;

    /* ── Reset custom order ── */
    const resetOrder = () => {
        saveOrder([]);
    };

    /* ────────────────────────────────────────────────────────── */
    if (isMobile) {
        return (
            <div style={{ padding: '8px 10px 140px', minHeight: '100%' }}>

                {/* Progress Card Compacta */}
                <div style={{
                    background: '#ffffff',
                    border: `1px solid ${C.outlineVariant}`,
                    borderRadius: '0.85rem',
                    padding: '0.65rem 0.85rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    marginBottom: '0.45rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '0.86rem', fontWeight: 800, color: C.onSurface }}>
                                Progreso hoy
                            </span>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: C.primary, fontFamily: MONO }}>
                                {progressPct}%
                            </span>
                        </div>

                        {/* Filtros compactos */}
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            {onOpenBandeja && (
                                <button
                                    onClick={onOpenBandeja}
                                    title="Abrir la Bandeja"
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: C.surfaceContainerHigh, border: '1px solid transparent',
                                        borderRadius: '999px', width: '26px', height: '26px', padding: 0,
                                        cursor: 'pointer', flexShrink: 0,
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color: C.onSurfaceVariant }}>inbox</span>
                                </button>
                            )}
                            <button
                                onClick={() => setPendientesFirst(v => !v)}
                                title={pendientesFirst ? 'Pendientes primero: ON' : 'Pendientes primero: OFF'}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: pendientesFirst ? 'rgba(15, 169, 122,0.10)' : C.surfaceContainerHigh,
                                    border: `1px solid ${pendientesFirst ? C.primary : C.outlineVariant}`,
                                    borderRadius: '999px', width: '26px', height: '26px', padding: 0,
                                    cursor: 'pointer', flexShrink: 0,
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: pendientesFirst ? C.primary : C.onSurfaceVariant }}>
                                    vertical_align_top
                                </span>
                            </button>
                            <button
                                onClick={() => setGroupByProject(v => !v)}
                                title={groupByProject ? 'Agrupado por proyecto' : 'Agrupar por proyecto'}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: groupByProject ? 'rgba(15, 169, 122,0.10)' : C.surfaceContainerHigh,
                                    border: `1px solid ${groupByProject ? C.primary : 'transparent'}`,
                                    borderRadius: '999px', width: '26px', height: '26px', padding: 0,
                                    cursor: 'pointer', flexShrink: 0,
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: groupByProject ? C.primary : C.onSurfaceVariant }}>folder</span>
                            </button>
                            {customOrder.length > 0 && (
                                <button
                                    onClick={resetOrder}
                                    title="Restaurar orden automático"
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: 'rgba(15, 169, 122,0.08)', border: 'none',
                                        borderRadius: '999px', width: '26px', height: '26px', padding: 0,
                                        cursor: 'pointer', flexShrink: 0,
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color: C.primary }}>restart_alt</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Barra de progreso fina */}
                    <div style={{ width: '100%', height: '4px', background: C.surfaceContainer, borderRadius: '999px', overflow: 'hidden', margin: '7px 0 6px' }}>
                        <motion.div
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 0.7, ease: 'easeOut' }}
                            style={{ height: '100%', background: '#3ED9A0', borderRadius: '999px' }}
                        />
                    </div>

                    {/* Contadores en una línea compacta */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '0.72rem', color: C.onSurfaceVariant }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: completedToday > 0 ? C.primary : C.onSurfaceVariant, fontWeight: 700 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '13px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            {completedToday} {completedToday === 1 ? 'hecha' : 'hechas'}
                        </span>
                        <span style={{ color: C.outlineVariant }}>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>schedule</span>
                            {totalToday - completedToday} por hacer
                        </span>
                    </div>
                </div>


                {/* DnD Tasks List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <MetasHoy goals={goals} dailyBlocks={dailyBlocks} onOpenMetas={onOpenMetas} />
                    <NotasDelDia notes={notes} updateNote={updateNote} />

                    {/* ── Entregas en desarrollo (Móvil) ── */}
                    <EntregasEnDesarrollo
                        sporadicProjects={sporadicProjects}
                        calendarEvents={calendarEvents}
                        todayStr={todayStr}
                        onOpenEntregas={onOpenEntregas}
                        startSporadicTimer={startSporadicTimer}
                        pauseSporadicTimer={pauseSporadicTimer}
                    />

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
                            <AnimatePresence initial={false}>
                                {visibleTasks.length > 0 ? (
                                    visibleTasks.map(task => {
                                        const block = dailyBlocks.find(b =>
                                            b.label.toLowerCase() === task.label.toLowerCase() &&
                                            b.period === task.period && b.date === todayStr
                                        );
                                        const isDone = block?.completed ?? false;
                                        const project = projects.find(p => p.id === task.projectId);
                                        const projColor = project?.color || C.outline;
                                        const projName  = project?.name  || 'General';
                                        const id = taskKey(task.label, task.period);

                                        return (
                                            <TaskCard
                                                key={id}
                                                id={id}
                                                label={task.label}
                                                period={task.period}
                                                isDone={isDone}
                                                projColor={projColor}
                                                projName={projName}
                                                {...metaDeTarea(task.label, task.period)}
                                                time={task.time}
                                                onToggle={() => handleToggle(task.label, task.period)}
                                                onMenuClick={handleMenuClick}
                                            />
                                        );
                                    })
                                ) : (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        style={{ padding: '2.5rem 2rem', textAlign: 'center', color: C.onSurfaceVariant }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: C.outlineVariant, display: 'block', marginBottom: '12px' }}>
                                            checklist
                                        </span>
                                        <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.95rem', color: C.onSurface }}>
                                            Sin tareas programadas
                                        </p>
                                        <p style={{ margin: 0, fontSize: '0.8rem' }}>
                                            Añade tareas en Agenda › Tareas.
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </SortableContext>

                        <DragOverlay>
                            {activeDragTask ? (
                                <div style={{
                                    ...bentoTarea,
                                    padding: '14px 16px',
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                                    background: C.surfaceLowest,
                                    cursor: 'grabbing',
                                    opacity: 0.95,
                                }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: C.primary }}>drag_indicator</span>
                                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: C.onSurface }}>{activeDragTask.label}</div>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </div>

                {/* Context Menu Dropdown */}
                {openMenu && openMenu.anchor && (
                    <DropdownMenu
                        label={openMenu.label}
                        period={openMenu.period}
                        anchor={openMenu.anchor}
                        onClose={() => setOpenMenu(null)}
                        onRemoveToday={handleRemoveToday}
                        onEditName={handleEditName}
                        onRemoveAll={handleRemoveAll}
                        onEditRepeat={handleEditRepeat}
                    />
                )}

                {/* Registrar dinero: barra flotante fija justo encima del nav inferior.
                    OJO: nada de backdrop-filter / transform / filter en el div de abajo.
                    El modal RegistroMovimiento (position: fixed) se renderiza dentro de él;
                    cualquiera de esas propiedades convertiría a ese contenedor en el bloque
                    contenedor del modal y lo posicionaría respecto a esta barrita (fuera de
                    pantalla) en vez de respecto al viewport. */}
                {addTransaction && (
                    <div style={{
                        position: 'fixed',
                        // + safe-area: en la PWA instalada el nav inferior creció ese alto
                        // extra (gesto/home indicator) y esta barra se quedaba montada
                        // encima suyo si el offset era un número fijo.
                        bottom: 'calc(78px + env(safe-area-inset-bottom, 0px))',
                        left: '12px',
                        right: '12px',
                        zIndex: 998,
                        background: '#ffffff',
                        borderRadius: '999px',
                        padding: '6px',
                        boxShadow: '0 6px 22px rgba(0,0,0,0.14)',
                        border: '1px solid rgba(0,0,0,0.06)',
                    }}>
                        <RegistroRapido
                            addTransaction={addTransaction} accounts={accounts}
                            incomeCategories={incomeCategories} expenseCategories={expenseCategories}
                            categoryAccountScope={categoryAccountScope}
                            categoryGroups={categoryGroups} groupAccountScope={groupAccountScope}
                            compacto
                        />
                    </div>
                )}

                <style>{`
                    .drag-handle, .menu-btn {
                        opacity: 1 !important;
                    }
                `}</style>

                <AnimatePresence>
                    {editingTask && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed', inset: 0, zIndex: 9998,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '20px',
                            }}
                            onClick={() => setEditingTask(null)}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                style={{
                                    background: 'white', borderRadius: '20px', padding: '24px',
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                                    width: '100%', maxWidth: '380px', boxSizing: 'border-box',
                                }}
                                onClick={e => e.stopPropagation()}
                            >
                                <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: '#0C2A20' }}>Editar tarea</h4>
                                <input
                                    value={editText}
                                    onChange={e => setEditText(e.target.value)}
                                    autoFocus
                                    style={{
                                        width: '100%', padding: '12px 16px', borderRadius: '12px',
                                        border: '2px solid #E5E7EB', fontSize: '0.9rem', fontWeight: 600,
                                        outline: 'none', boxSizing: 'border-box',
                                    }}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingTask(null); }}
                                />
                                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                    <button onClick={() => setEditingTask(null)} style={{
                                        flex: 1, padding: '10px', borderRadius: '12px',
                                        border: '2px solid #E5E7EB', background: 'white',
                                        color: '#4A5F58', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    }}>Cancelar</button>
                                    <button onClick={handleSaveEdit} style={{
                                        flex: 1, padding: '10px', borderRadius: '12px',
                                        border: 'none', background: '#0FA97A', color: 'white',
                                        fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    }}>Guardar</button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <ConfirmDialog
                    open={!!confirmDelete}
                    title="Eliminar tarea"
                    message={`¿Estás seguro de que quieres enviar "${confirmDelete?.label}" a la papelera?`}
                    confirmLabel="Eliminar"
                    cancelLabel="Cancelar"
                    onConfirm={executeRemove}
                    onCancel={() => setConfirmDelete(null)}
                />
            </div>
        );
    }

    /* ── Desktop ── */
    return (
        <div style={paddingPagina(isMobile)}>
            <AnimatePresence>
                {editingTask && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9998,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '20px',
                        }}
                        onClick={() => setEditingTask(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            style={{
                                background: 'white', borderRadius: '20px', padding: '24px',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                                width: '100%', maxWidth: '380px', boxSizing: 'border-box',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: '#0C2A20' }}>Editar tarea</h4>
                            <input
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                autoFocus
                                style={{
                                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                                    border: '2px solid #E5E7EB', fontSize: '0.9rem', fontWeight: 600,
                                    outline: 'none', boxSizing: 'border-box',
                                }}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingTask(null); }}
                            />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                <button onClick={() => setEditingTask(null)} style={{
                                    flex: 1, padding: '10px', borderRadius: '12px',
                                    border: '2px solid #E5E7EB', background: 'white',
                                    color: '#4A5F58', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                }}>Cancelar</button>
                                <button onClick={handleSaveEdit} style={{
                                    flex: 1, padding: '10px', borderRadius: '12px',
                                    border: 'none', background: '#0FA97A', color: 'white',
                                    fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
}}>Guardar</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {editingTask && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(4px)', zIndex: 9997,
                }} onClick={() => setEditingTask(null)} />
            )}

            {/* ── Modal de Calendario para elegir día ── */}
            <AnimatePresence>
                {calendarOpen && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 9998,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '1rem',
                    }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}
                            onClick={() => setCalendarOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.18 }}
                            style={{
                                position: 'relative', width: '100%', maxWidth: '400px',
                                background: '#FFFFFF', borderRadius: '20px', padding: '1.25rem',
                                boxShadow: '0 20px 45px rgba(0,0,0,0.18)', border: `1px solid ${C.outlineVariant}`,
                                zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.9rem'
                            }}
                        >
                            {/* Cabecera del calendario modal */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '22px', color: C.primary }}>
                                        calendar_month
                                    </span>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: C.onSurface, textTransform: 'capitalize' }}>
                                        {pickerMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                                    </h3>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <button
                                        onClick={() => setPickerMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                                        title="Mes anterior"
                                        style={{
                                            background: C.surfaceContainer, border: 'none', borderRadius: '8px',
                                            width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', color: C.onSurface
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
                                    </button>
                                    <button
                                        onClick={() => setPickerMonth(new Date())}
                                        title="Mes actual"
                                        style={{
                                            background: C.surfaceContainer, border: 'none', borderRadius: '8px',
                                            padding: '4px 8px', fontSize: '0.72rem', fontWeight: 700,
                                            cursor: 'pointer', color: C.onSurface, fontFamily: 'inherit'
                                        }}
                                    >
                                        Hoy
                                    </button>
                                    <button
                                        onClick={() => setPickerMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                                        title="Mes siguiente"
                                        style={{
                                            background: C.surfaceContainer, border: 'none', borderRadius: '8px',
                                            width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', color: C.onSurface
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                                    </button>
                                </div>
                            </div>

                            {/* Días de la semana */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                                {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(dia => (
                                    <div key={dia} style={{ fontSize: '0.72rem', fontWeight: 800, color: C.onSurfaceVariant, padding: '2px 0' }}>
                                        {dia}
                                    </div>
                                ))}
                            </div>

                            {/* Grilla de días */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                {(() => {
                                    const y = pickerMonth.getFullYear();
                                    const m = pickerMonth.getMonth();
                                    const primerDiaSemana = (new Date(y, m, 1).getDay() + 6) % 7; // Lunes = 0
                                    const totalDiasMes = new Date(y, m + 1, 0).getDate();
                                    const cells = [];

                                    for (let i = 0; i < primerDiaSemana; i++) {
                                        cells.push(<div key={`pad-${i}`} style={{ height: '38px' }} />);
                                    }

                                    for (let d = 1; d <= totalDiasMes; d++) {
                                        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                        const isSelected = dateStr === todayStr;
                                        const isCurrentToday = dateStr === realToday;
                                        const dayOfWeek = new Date(y, m, d).getDay();

                                        const hasTasks = uniqueTemplates.some(t =>
                                            (t.repeatDays && t.repeatDays.includes(dayOfWeek)) || t.date === dateStr
                                        );
                                        const hasEvents = calendarEvents.some(e => e.date === dateStr);

                                        cells.push(
                                            <button
                                                key={`day-${d}`}
                                                onClick={() => seleccionarFecha(dateStr)}
                                                style={{
                                                    height: '40px',
                                                    border: isSelected ? 'none' : isCurrentToday ? `2px solid ${C.primary}` : '1px solid transparent',
                                                    borderRadius: '10px',
                                                    background: isSelected ? C.primary : isCurrentToday ? 'rgba(15, 169, 122, 0.08)' : C.surfaceLowest,
                                                    color: isSelected ? '#FFFFFF' : isCurrentToday ? C.primary : C.onSurface,
                                                    fontWeight: isSelected || isCurrentToday ? 800 : 600,
                                                    fontSize: '0.82rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    position: 'relative',
                                                    fontFamily: 'inherit',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                <span>{d}</span>
                                                <div style={{ display: 'flex', gap: '3px', marginTop: '1px', height: '4px' }}>
                                                    {hasTasks && (
                                                        <span style={{
                                                            width: '4px', height: '4px', borderRadius: '50%',
                                                            background: isSelected ? '#FFFFFF' : C.primary,
                                                        }} />
                                                    )}
                                                    {hasEvents && (
                                                        <span style={{
                                                            width: '4px', height: '4px', borderRadius: '50%',
                                                            background: isSelected ? '#FFD700' : '#F59E0B',
                                                        }} />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    }
                                    return cells;
                                })()}
                            </div>

                            {/* Leyenda y botón cerrar */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                paddingTop: '8px', borderTop: `1px solid ${C.outlineVariant}`,
                                flexWrap: 'wrap', gap: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem', color: C.onSurfaceVariant }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.primary }} />
                                        Tareas
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B' }} />
                                        Citas
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {onOpenFullCalendar && (
                                        <button
                                            onClick={() => {
                                                setCalendarOpen(false);
                                                onOpenFullCalendar();
                                            }}
                                            style={{
                                                background: 'none', border: 'none', color: C.primary,
                                                fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer',
                                                textDecoration: 'underline', fontFamily: 'inherit'
                                            }}
                                        >
                                            Ver Agenda
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setCalendarOpen(false)}
                                        style={{
                                            background: C.surfaceContainerHigh, border: 'none',
                                            borderRadius: '8px', padding: '6px 12px',
                                            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                                            color: C.onSurface, fontFamily: 'inherit'
                                        }}
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: C.onSurface, letterSpacing: '-0.02em' }}>
                        Mi Día
                    </h2>

                    {/* Cápsula de fecha y navegación unificada y espaciosa */}
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: '#FFFFFF',
                        border: `1px solid ${C.outlineVariant}`,
                        borderRadius: '999px',
                        padding: '3px 6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        gap: '2px',
                    }}>
                        {/* Chevron día anterior */}
                        <button
                            onClick={() => cambiarDia(-1)}
                            title="Día anterior"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '999px',
                                width: '28px', height: '28px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: C.onSurfaceVariant,
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = C.surfaceContainer; e.currentTarget.style.color = C.onSurface; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.onSurfaceVariant; }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
                        </button>

                        {/* Botón de fecha para abrir calendario */}
                        <button
                            onClick={() => setCalendarOpen(true)}
                            title="Abrir calendario para saltar a otra fecha"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '999px',
                                padding: '4px 8px',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                cursor: 'pointer', fontFamily: 'inherit',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15, 169, 122, 0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: esHoy ? C.primary : '#F59E0B' }}>
                                calendar_today
                            </span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: C.onSurface, letterSpacing: '-0.01em' }}>
                                {todayLabel}
                            </span>
                            {badgeOffset && (
                                <span style={{
                                    fontSize: '0.66rem', fontWeight: 700,
                                    padding: '2px 7px', borderRadius: '999px',
                                    background: '#FEF3C7', color: '#92400E',
                                    letterSpacing: '0.01em',
                                }}>
                                    {badgeOffset}
                                </span>
                            )}
                        </button>

                        {/* Botón Hoy cuando está en otro día */}
                        {!esHoy && (
                            <button
                                onClick={irAHoy}
                                title="Volver al día de hoy"
                                style={{
                                    background: 'rgba(15, 169, 122, 0.12)',
                                    color: C.primary,
                                    border: 'none',
                                    borderRadius: '999px',
                                    padding: '3px 9px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.color = '#FFFFFF'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15, 169, 122, 0.12)'; e.currentTarget.style.color = C.primary; }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>today</span>
                                Hoy
                            </button>
                        )}

                        {/* Chevron día siguiente */}
                        <button
                            onClick={() => cambiarDia(1)}
                            title="Día siguiente"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '999px',
                                width: '28px', height: '28px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: C.onSurfaceVariant,
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = C.surfaceContainer; e.currentTarget.style.color = C.onSurface; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.onSurfaceVariant; }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Botón de Pausa / Día de Descanso */}
                    <button
                        onClick={handleTogglePausa}
                        title={esPausaHoy ? "Reanudar día normal" : "Tomarse el día libre / descanso (no penaliza en el calendario)"}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: esPausaHoy ? 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' : C.surfaceContainerHigh,
                            color: esPausaHoy ? '#92400E' : C.onSurfaceVariant,
                            border: esPausaHoy ? '1px solid #FCD34D' : 'none',
                            borderRadius: '999px', padding: '7px 14px',
                            fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                            transition: 'all 0.15s ease',
                            boxShadow: esPausaHoy ? '0 2px 6px rgba(245, 158, 11, 0.2)' : 'none',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: esPausaHoy ? '#D97706' : undefined }}>
                            {esPausaHoy ? 'coffee' : 'bed'}
                        </span>
                        {esPausaHoy ? 'Día en Pausa ☕' : 'Pausa / Descanso'}
                    </button>

                    {/* Bandeja ya no va en el menú: se abre desde acá */}
                    {onOpenBandeja && (
                        <button
                            onClick={onOpenBandeja}
                            title="Abrir la Bandeja"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: C.surfaceContainerHigh, color: C.onSurfaceVariant,
                                border: 'none', borderRadius: '999px', padding: '7px 14px',
                                fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>inbox</span>
                            Bandeja
                        </button>
                    )}

                    {/* Registrar dinero sin salir del día */}
                    {addTransaction && (
                        <RegistroRapido
                            addTransaction={addTransaction} accounts={accounts}
                            incomeCategories={incomeCategories} expenseCategories={expenseCategories}
                            categoryAccountScope={categoryAccountScope}
                            categoryGroups={categoryGroups} groupAccountScope={groupAccountScope}
                        />
                    )}
                </div>
            </div>

            {/* ── Contenido ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Banner de Modo Descanso / Pausa */}
                {esPausaHoy && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            ...bentoTarea,
                            background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.6) 0%, rgba(253, 230, 138, 0.35) 100%)',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            padding: '0.85rem 1.15rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: '1rem',
                            borderRadius: '14px',
                            flexWrap: 'wrap',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>☕</span>
                            <div>
                                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#92400E' }}>
                                    ¡Modo Descanso activado para este día!
                                </div>
                                <div style={{ fontSize: '0.76rem', color: '#B45309', fontWeight: 600 }}>
                                    Tómate un respiro con total tranquilidad. Tus tareas de hoy no bajarán tu porcentaje en el calendario.
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleTogglePausa}
                            style={{
                                background: '#FFFFFF', border: '1px solid rgba(245, 158, 11, 0.4)',
                                borderRadius: '999px', padding: '5px 12px',
                                fontSize: '0.72rem', fontWeight: 800, color: '#B45309',
                                cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            }}
                        >
                            Reanudar día
                        </button>
                    </motion.div>
                )}

                {/* Progreso Diario — compacto */}
                <section style={{
                    ...bentoTarea, border: 'none',
                    background: esPausaHoy ? 'rgba(245, 158, 11, 0.08)' : 'rgba(15, 169, 122,0.06)',
                    padding: '0.45rem 0.85rem', position: 'relative', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', flexShrink: 0 }}>
                        <motion.span
                            key={progressPct}
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1, color: C.primary }}
                        >{progressPct}</motion.span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: C.primary }}>%</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                            <span style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: C.primary }}>Progreso Diario</span>
                            <span style={{ fontSize: '0.7rem', color: C.onSurfaceVariant, fontWeight: 500 }}>
                                {completedToday} de {totalToday} completadas
                            </span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: C.surfaceContainerHighest, borderRadius: '999px', overflow: 'hidden' }}>
                            <motion.div
                                animate={{ width: `${progressPct}%` }}
                                transition={{ duration: 0.7, ease: 'easeOut' }}
                                style={{ height: '100%', background: C.primary, borderRadius: '999px' }}
                            />
                        </div>
                    </div>
                </section>

                {/* Ayuda: qué es esta lista */}
                <p style={{ margin: '-0.25rem 0 0', fontSize: '0.82rem', color: C.onSurfaceVariant }}>
                    Tu lista de hoy. Arrástrala para ponerla en el orden en que la vas a hacer.
                </p>

                {/* ── Task list ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                    {/* List header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: C.onSurface }}>
                            Lista de Tareas
                            {visibleTasks.length > 0 && (
                                <span style={{ marginLeft: '8px', fontSize: '0.75rem', fontWeight: 500, color: C.onSurfaceVariant }}>
                                    ({visibleTasks.length})
                                </span>
                            )}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Reset custom order */}
                            {customOrder.length > 0 && (
                                <button
                                    onClick={resetOrder}
                                    title="Restaurar orden automático"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        background: 'rgba(15, 169, 122,0.08)', border: 'none',
                                        borderRadius: '8px', padding: '5px 10px',
                                        fontSize: '0.72rem', color: C.primary, fontWeight: 600,
                                        cursor: 'pointer', fontFamily: 'inherit',
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>restart_alt</span>
                                    Resetear
                                </button>
                            )}

                            {/* Pendientes primero toggle */}
                            <button
                                onClick={() => setPendientesFirst(v => !v)}
                                title={pendientesFirst ? 'Pendientes primero: ON' : 'Pendientes primero: OFF'}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '7px',
                                    background: pendientesFirst ? 'rgba(15, 169, 122,0.10)' : C.surfaceContainerHigh,
                                    border: `1.5px solid ${pendientesFirst ? C.primary : C.outlineVariant}`,
                                    borderRadius: '999px', padding: '4px 12px 4px 8px',
                                    fontSize: '0.72rem',
                                    color: pendientesFirst ? C.primary : C.onSurfaceVariant,
                                    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {/* Toggle switch visual */}
                                <div style={{
                                    width: '28px', height: '16px', borderRadius: '999px',
                                    background: pendientesFirst ? C.primary : C.outlineVariant,
                                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                                }}>
                                    <motion.div
                                        animate={{ x: pendientesFirst ? 14 : 2 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        style={{
                                            position: 'absolute', top: '2px',
                                            width: '12px', height: '12px', borderRadius: '50%',
                                            background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        }}
                                    />
                                </div>
                                Pendientes primero
                            </button>

                            {/* Agrupar por proyecto */}
                            <button
                                onClick={() => setGroupByProject(v => !v)}
                                title={groupByProject ? 'Agrupado por proyecto' : 'Agrupar por proyecto'}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    background: groupByProject ? 'rgba(15, 169, 122,0.10)' : C.surfaceContainerHigh,
                                    border: `1.5px solid ${groupByProject ? C.primary : 'transparent'}`,
                                    borderRadius: '8px', padding: '5px 10px',
                                    fontSize: '0.72rem', color: groupByProject ? C.primary : C.onSurfaceVariant, fontWeight: 600,
                                    cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>folder</span>
                                Por proyecto
                            </button>
                        </div>
                    </div>

                    <MetasHoy goals={goals} dailyBlocks={dailyBlocks} onOpenMetas={onOpenMetas} />
                    <NotasDelDia notes={notes} updateNote={updateNote} />

                    {/* ── Entregas en desarrollo ── */}
                    <EntregasEnDesarrollo
                        sporadicProjects={sporadicProjects}
                        calendarEvents={calendarEvents}
                        todayStr={todayStr}
                        onOpenEntregas={onOpenEntregas}
                        startSporadicTimer={startSporadicTimer}
                        pauseSporadicTimer={pauseSporadicTimer}
                    />

                    {/* ── Citas y Sesiones de Agenda del día ── */}
                    {eventosDelDia.length > 0 && (
                        <div style={{
                            ...bentoTarea,
                            background: 'rgba(245, 158, 11, 0.05)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            padding: '0.75rem 1rem',
                            display: 'flex', flexDirection: 'column', gap: '8px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#D97706' }}>event</span>
                                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#92400E' }}>
                                        Citas y Sesiones de este día ({eventosDelDia.length})
                                    </span>
                                </div>
                                {onOpenFullCalendar && (
                                    <button
                                        onClick={onOpenFullCalendar}
                                        style={{ background: 'none', border: 'none', color: '#B45309', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
                                    >
                                        Ir a Calendario
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {eventosDelDia.map(ev => (
                                    <div key={ev.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '6px 10px', borderRadius: '8px', background: '#FFFFFF',
                                        border: '1px solid rgba(245, 158, 11, 0.15)',
                                    }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#B45309', minWidth: '45px' }}>
                                            {ev.startTime || 'Todo el día'}
                                        </span>
                                        <span style={{ flex: 1, minWidth: 0, fontSize: '0.84rem', fontWeight: 600, color: C.onSurface }}>
                                            {ev.title}
                                        </span>
                                        {ev.notionEstado && (
                                            <span style={{
                                                fontSize: '0.66rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                                                background: 'rgba(15, 169, 122, 0.1)', color: '#0FA97A'
                                            }}>
                                                {ev.notionEstado}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DnD List */}
                    <div style={{ background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: '12px', overflow: 'hidden' }}>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
                            <AnimatePresence initial={false}>
                                {visibleTasks.length > 0 ? (
                                    visibleTasks.map(task => {
                                        const block = dailyBlocks.find(b =>
                                            b.label.toLowerCase() === task.label.toLowerCase() &&
                                            b.period === task.period && b.date === todayStr
                                        );
                                        const isDone = block?.completed ?? false;
                                        const project = projects.find(p => p.id === task.projectId);
                                        const projColor = project?.color || C.outline;
                                        const projName  = project?.name  || 'General';
                                        const id = taskKey(task.label, task.period);

                                        return (
                                            <TaskCard
                                                key={id}
                                                id={id}
                                                label={task.label}
                                                period={task.period}
                                                isDone={isDone}
                                                projColor={projColor}
                                                projName={projName}
                                                {...metaDeTarea(task.label, task.period)}
                                                time={task.time}
                                                onToggle={() => handleToggle(task.label, task.period)}
                                                onMenuClick={handleMenuClick}
                                            />
                                        );
                                    })
                                ) : (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        style={{ ...bentoTarea, padding: '3rem 2rem', textAlign: 'center', color: C.onSurfaceVariant }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: C.outlineVariant, display: 'block', marginBottom: '12px' }}>
                                            checklist
                                        </span>
                                        <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.95rem', color: C.onSurface }}>
                                            Sin tareas programadas
                                        </p>
                                        <p style={{ margin: 0, fontSize: '0.8rem' }}>
                                            Añade tareas en Vida › Rutina.
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </SortableContext>

                        {/* Drag overlay */}
                        <DragOverlay>
                            {activeDragTask ? (
                                <div style={{
                                    ...bentoTarea,
                                    padding: '14px 16px',
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                                    background: C.surfaceLowest,
                                    cursor: 'grabbing',
                                    opacity: 0.95,
                                }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: C.primary }}>drag_indicator</span>
                                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: C.onSurface }}>{activeDragTask.label}</div>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                    </div>
                </div>
            </div>

            {/* ── Context Menu ── */}
            {openMenu && openMenu.anchor && (
                <DropdownMenu
                    label={openMenu.label}
                    period={openMenu.period}
                    anchor={openMenu.anchor}
                    onClose={() => setOpenMenu(null)}
                    onRemoveToday={handleRemoveToday}
                    onEditName={handleEditName}
                    onRemoveAll={handleRemoveAll}
                    onEditRepeat={handleEditRepeat}
                />
            )}

            {/* ── Hover styles ── */}
            <style>{`
                .task-card-row:hover .drag-handle { opacity: 1 !important; }
                .task-card-row:hover .menu-btn  { opacity: 1 !important; }
                .task-card-row .menu-btn { opacity: 0.7; }
            `}</style>

            <ConfirmDialog
                open={!!confirmDelete}
                title="Eliminar tarea"
                message={`¿Estás seguro de que quieres borrar "${confirmDelete?.label}"?`}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={executeRemove}
                onCancel={() => setConfirmDelete(null)}
            />

            {/* ── RepeatDays Editor ── */}
            {editingRepeat && (
                <div onClick={() => setEditingRepeat(null)} style={{
                    position: 'fixed', inset: 0, zIndex: 9998,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px',
                }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'white', borderRadius: '20px', padding: '24px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                        width: '100%', maxWidth: '380px', boxSizing: 'border-box',
                    }}>
                        <h4 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0C2A20' }}>Repetir tarea</h4>
                        <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#6C8079' }}>
                            ¿Qué días de la semana se repite "{editingRepeat.label}"?
                        </p>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
                            {[{ l: 'L', i: 1 }, { l: 'M', i: 2 }, { l: 'X', i: 3 }, { l: 'J', i: 4 }, { l: 'V', i: 5 }, { l: 'S', i: 6 }, { l: 'D', i: 0 }].map(({ l: day, i }) => {
                                const selected = editingRepeat.repeatDays.includes(i);
                                return (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            const days = editingRepeat.repeatDays.includes(i)
                                                ? editingRepeat.repeatDays.filter(d => d !== i)
                                                : [...editingRepeat.repeatDays, i];
                                            setEditingRepeat({ ...editingRepeat, repeatDays: days });
                                        }}
                                        style={{
                                            width: '40px', height: '40px', borderRadius: '12px',
                                            border: selected ? 'none' : '2px solid #E5E7EB',
                                            background: selected ? '#0FA97A' : 'transparent',
                                            color: selected ? '#fff' : '#4A5F58',
                                            fontWeight: 700, fontSize: '0.85rem',
                                            cursor: 'pointer', fontFamily: 'inherit',
                                        }}
                                    >{day}</button>
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setEditingRepeat(null)} style={{
                                flex: 1, padding: '10px', borderRadius: '12px',
                                border: '2px solid #E5E7EB', background: 'white',
                                color: '#4A5F58', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                            }}>Cancelar</button>
                            <button onClick={() => handleSaveRepeat(editingRepeat.repeatDays)} style={{
                                flex: 1, padding: '10px', borderRadius: '12px',
                                border: 'none', background: '#0FA97A', color: 'white',
                                fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                            }}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ══════════════════════════════════════════════════════════════
   RegistroRapido — dos botones para apuntar dinero sin salir del día.
   Los gastos sueltos son los que más se olvidan, así que el sitio
   donde se entra a diario es el sitio donde hay que poder apuntarlos.

   Los propios botones abren el modal compartido RegistroMovimiento
   (el mismo que usa Finanzas): mismos campos, mismo aspecto, misma
   lógica de guardado en los dos sitios, en vez de cada uno con su
   propio formulario.
══════════════════════════════════════════════════════════════ */
interface RegistroRapidoProps {
    addTransaction: (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projectId?: number, accountId?: number, isCashless?: boolean, category?: string, contact?: string) => void;
    accounts: { id: number; name: string; color: string }[];
    compacto?: boolean;
    incomeCategories?: string[];
    expenseCategories?: string[];
    categoryAccountScope?: { ingreso: Record<string, number[]>; gasto: Record<string, number[]> };
    categoryGroups?: { ingreso: Record<string, string>; gasto: Record<string, string> };
    groupAccountScope?: { ingreso: Record<string, number[]>; gasto: Record<string, number[]> };
}

const RegistroRapido = ({
    addTransaction, accounts, compacto = false,
    incomeCategories, expenseCategories, categoryAccountScope, categoryGroups, groupAccountScope,
}: RegistroRapidoProps) => {
    const [tipo, setTipo] = useState<'gasto' | 'ingreso' | null>(null);

    return (
        <div style={{ width: compacto ? '100%' : 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                    onClick={() => setTipo('gasto')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px', flex: compacto ? 1 : undefined,
                        justifyContent: 'center',
                        background: 'rgba(239,68,68,0.1)', color: '#C63C3C',
                        border: 'none', borderRadius: '999px', padding: '8px 16px',
                        fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>trending_down</span>
                    Gasto
                </button>
                <button
                    onClick={() => setTipo('ingreso')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px', flex: compacto ? 1 : undefined,
                        justifyContent: 'center',
                        background: 'rgba(16,185,129,0.1)', color: '#0E9F6E',
                        border: 'none', borderRadius: '999px', padding: '8px 16px',
                        fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>trending_up</span>
                    Ingreso
                </button>
            </div>

            <RegistroMovimiento
                open={!!tipo}
                onClose={() => setTipo(null)}
                addTransaction={addTransaction}
                accounts={accounts}
                tipoInicial={tipo || 'gasto'}
                incomeCategories={incomeCategories}
                expenseCategories={expenseCategories}
                categoryAccountScope={categoryAccountScope}
                categoryGroups={categoryGroups}
                groupAccountScope={groupAccountScope}
            />
        </div>
    );
};

/* ══════════════════════════════════════════════════════════════
   DropdownMenu — context menu for task options
══════════════════════════════════════════════════════════════ */
interface DropdownMenuProps {
    label: string;
    period: Period;
    anchor: HTMLElement;
    onClose: () => void;
    onRemoveToday: (label: string, period: Period) => void;
    onRemoveAll: (label: string, period: Period) => void;
    onEditRepeat: (label: string, period: Period) => void;
    onEditName: (label: string, period: Period) => void;
}

const DropdownMenu = ({
    label, period, anchor, onClose,
    onRemoveToday, onRemoveAll, onEditRepeat, onEditName,
}: DropdownMenuProps) => {
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (anchor && !anchor.contains(e.target as Node)) {
                const menu = document.getElementById(`menu-${period}-${label}`);
                if (menu && !menu.contains(e.target as Node)) {
                    onClose();
                }
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [anchor, label, period, onClose]);

    const rect = anchor.getBoundingClientRect();

    return (
        <div
            id={`menu-${period}-${label}`}
            style={{
                position: 'fixed',
                top: rect.bottom + 4,
                left: Math.min(rect.left, window.innerWidth - 220),
                background: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                border: '1px solid #E5E7EB',
                padding: '4px',
                zIndex: 9999,
                minWidth: '200px',
            }}
        >
            <button onClick={() => { onRemoveToday(label, period); onClose(); }} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '10px 14px', border: 'none', background: 'transparent',
                borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                fontSize: '0.85rem', color: '#4A5F58', fontWeight: 600,
            }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F7FAF8'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>today</span>
                Quitar de hoy
            </button>
            <button onClick={() => { onEditName(label, period); onClose(); }} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '10px 14px', border: 'none', background: 'transparent',
                borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                fontSize: '0.85rem', color: '#4A5F58', fontWeight: 600,
            }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F7FAF8'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                Editar nombre
            </button>
            <button onClick={() => { onEditRepeat(label, period); onClose(); }} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '10px 14px', border: 'none', background: 'transparent',
                borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                fontSize: '0.85rem', color: '#4A5F58', fontWeight: 600,
            }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F7FAF8'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>repeat</span>
                Editar recurrencia
            </button>
            <div style={{ height: '1px', background: '#E5E7EB', margin: '4px 8px' }} />
            <button onClick={() => { onRemoveAll(label, period); onClose(); }} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '10px 14px', border: 'none', background: 'transparent',
                borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                fontSize: '0.85rem', color: '#C63C3C', fontWeight: 600,
            }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                Eliminar tarea (todo)
            </button>
        </div>
    );
};
