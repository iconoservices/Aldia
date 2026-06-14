import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
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
import type { DailyBlock } from '../../hooks/useAlDiaState';

/* ─── Design Tokens ─────────────────────────────────────────── */
const C = {
    primary:            '#944a18',
    primaryContainer:   '#ff9f66',
    onPrimaryContainer: '#773401',
    secondary:          '#4858ab',
    surface:            '#f8f9fa',
    surfaceContainer:   '#edeeef',
    surfaceContainerLow:'#f3f4f5',
    surfaceContainerHigh:'#e7e8e9',
    surfaceContainerHighest:'#e1e3e4',
    surfaceLowest:      '#ffffff',
    onSurface:          '#191c1d',
    onSurfaceVariant:   '#54433a',
    outline:            '#877369',
    outlineVariant:     '#dac2b6',
};

/* ─── Period config ─────────────────────────────────────────── */
type Period = 'Mañana' | 'Tarde' | 'Noche' | 'Otro';
const PERIOD_ORDER: Period[] = ['Mañana', 'Tarde', 'Noche', 'Otro'];

const PERIOD_CFG: Record<Period, { icon: string; label: string; color: string; bg: string }> = {
    'Mañana': { icon: 'wb_sunny',   label: 'MAÑANA', color: '#E6A817', bg: 'rgba(230,168,23,0.12)'   },
    'Tarde':  { icon: 'light_mode', label: 'TARDE',  color: '#E07040', bg: 'rgba(224,112,64,0.12)'   },
    'Noche':  { icon: 'dark_mode',  label: 'NOCHE',  color: '#5C6BC0', bg: 'rgba(92,107,192,0.12)'   },
    'Otro':   { icon: 'more_time',  label: 'OTRO',   color: '#877369', bg: 'rgba(135,115,105,0.1)'   },
};

type CategoryKey = 'Todas' | Period;
const CATEGORIES: { key: CategoryKey; label: string; icon: string; color: string }[] = [
    { key: 'Todas',  label: 'Todas',  icon: 'checklist',  color: C.primary   },
    { key: 'Mañana', label: 'Mañana', icon: 'wb_sunny',   color: '#E6A817'   },
    { key: 'Tarde',  label: 'Tarde',  icon: 'light_mode', color: '#E07040'   },
    { key: 'Noche',  label: 'Noche',  icon: 'dark_mode',  color: '#5C6BC0'   },
    { key: 'Otro',   label: 'Otro',   icon: 'more_time',  color: '#877369'   },
];

type SortMode = 'cronologico' | 'proyecto';

/* ─── bento card base style ─────────────────────────────────── */
const bentoCard: React.CSSProperties = {
    background: C.surfaceLowest,
    borderRadius: '1rem',
    border: `1px solid ${C.outlineVariant}`,
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    transition: 'box-shadow 0.2s',
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
    isDragging?: boolean;
    onToggle: () => void;
    onRemove: () => void;
}

const TaskCard = ({
    id, label, period, isDone, projColor, projName,
    isDragging = false, onToggle, onRemove,
}: TaskCardProps) => {
    const {
        attributes, listeners, setNodeRef,
        transform, transition, isDragging: isSortDragging,
    } = useSortable({ id });

    const periodCfg = PERIOD_CFG[period] || PERIOD_CFG['Otro'];

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
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                    ...bentoCard,
                    padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: isDone ? '#f3f4f5' : C.surfaceLowest,
                    opacity: isDone ? 0.72 : 1,
                    cursor: isDragging ? 'grabbing' : 'default',
                }}
                whileHover={!isSortDragging ? { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' } as any : undefined}
                className="task-card-row"
            >
                {/* Drag handle */}
                <button
                    {...attributes}
                    {...listeners}
                    title="Arrastrar para reordenar"
                    style={{
                        background: 'none', border: 'none', cursor: 'grab',
                        padding: '2px 0', color: C.outlineVariant,
                        display: 'flex', alignItems: 'center',
                        opacity: 0, transition: 'opacity 0.15s',
                        flexShrink: 0,
                    }}
                    className="drag-handle"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>drag_indicator</span>
                </button>

                {/* Checkbox */}
                <button
                    onClick={onToggle}
                    style={{
                        width: '22px', height: '22px', minWidth: '22px',
                        borderRadius: '6px',
                        border: `2px solid ${isDone ? projColor : C.outlineVariant}`,
                        background: isDone ? projColor : 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s', padding: 0, flexShrink: 0,
                    }}
                >
                    {isDone && (
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '14px', color: '#fff', fontVariationSettings: "'FILL' 1" }}
                        >check</span>
                    )}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: '0.92rem', fontWeight: 600, color: C.onSurface,
                        textDecoration: isDone ? 'line-through' : 'none',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {label}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{
                            background: periodCfg.bg, color: periodCfg.color,
                            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em',
                            padding: '2px 8px', borderRadius: '999px',
                        }}>{periodCfg.label}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: C.onSurfaceVariant }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: projColor, display: 'inline-block' }} />
                            {projName}
                        </span>
                    </div>
                </div>

                {/* Delete */}
                <button
                    onClick={onRemove}
                    title="Eliminar"
                    className="delete-btn"
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#ba1a1a', opacity: 0, transition: 'opacity 0.15s',
                        padding: '4px', display: 'flex', alignItems: 'center',
                        borderRadius: '8px', flexShrink: 0,
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                </button>
            </motion.div>
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
    projects:         any[];
}

const SORT_STORAGE_KEY = 'aldia-checklist-custom-order';

export const ChecklistDiario = ({
    dailyBlocks, addDailyBlock, toggleDailyBlock, removeDailyBlock, projects,
}: ChecklistDiarioProps) => {
    const todayStr   = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
    const todayIndex = useMemo(() => (new Date().getDay() + 6) % 7, []);
    const todayLabel = useMemo(() =>
        new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }), []);

    const [activeCategory,  setActiveCategory]  = useState<CategoryKey>('Todas');
    const [searchQuery,     setSearchQuery]      = useState('');
    const [sortMode,        setSortMode]         = useState<SortMode>('cronologico');
    const [pendientesFirst, setPendientesFirst]  = useState(true);
    const [customOrder,     setCustomOrder]      = useState<string[]>([]);
    const [activeId,       setActiveId]        = useState<string | null>(null);
    const [quickAddText,   setQuickAddText]    = useState('');
    const [quickAddPeriod, setQuickAddPeriod]  = useState<Period>('Mañana');

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
        const list: { label: string; period: Period; projectId?: number; repeatDays?: number[] }[] = [];
        dailyBlocks.forEach(b => {
            const k = taskKey(b.label, b.period);
            if (!keys.has(k)) {
                keys.add(k);
                list.push({ label: b.label, period: b.period as Period, projectId: b.projectId, repeatDays: b.repeatDays });
            } else {
                const ex = list.find(l => taskKey(l.label, l.period) === k);
                if (ex) {
                    if (!ex.projectId && b.projectId) ex.projectId = b.projectId;
                    if ((!ex.repeatDays?.length) && b.repeatDays?.length) ex.repeatDays = b.repeatDays;
                }
            }
        });
        return list;
    }, [dailyBlocks]);

    /* ── Tasks active today ── */
    const todayTemplates = useMemo(() =>
        uniqueTemplates.filter(t => t.repeatDays ? t.repeatDays.includes(todayIndex) : true),
    [uniqueTemplates, todayIndex]);

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

        // Base sort
        if (sortMode === 'cronologico') {
            list.sort((a, b) => PERIOD_ORDER.indexOf(a.period) - PERIOD_ORDER.indexOf(b.period));
        } else if (sortMode === 'proyecto') {
            list.sort((a, b) => {
                const nameA = projects.find(p => p.id === a.projectId)?.name || 'ZZ';
                const nameB = projects.find(p => p.id === b.projectId)?.name || 'ZZ';
                return nameA.localeCompare(nameB);
            });
        }

        // Secondary: pendientes primero (stable, preserves base order within each group)
        if (pendientesFirst) {
            list.sort((a, b) => {
                const doneA = dailyBlocks.find(bl => bl.label.toLowerCase() === a.label.toLowerCase() && bl.period === a.period && bl.date === todayStr)?.completed ? 1 : 0;
                const doneB = dailyBlocks.find(bl => bl.label.toLowerCase() === b.label.toLowerCase() && bl.period === b.period && bl.date === todayStr)?.completed ? 1 : 0;
                return doneA - doneB;
            });
        }

        // Apply custom order on top (manual drag takes priority)
        if (customOrder.length > 0) {
            list.sort((a, b) => {
                const ia = customOrder.indexOf(taskKey(a.label, a.period));
                const ib = customOrder.indexOf(taskKey(b.label, b.period));
                if (ia === -1 && ib === -1) return 0;
                if (ia === -1) return 1;
                if (ib === -1) return -1;
                return ia - ib;
            });
        }

        return list;
    }, [todayTemplates, sortMode, customOrder, dailyBlocks, todayStr, projects]);

    /* ── Visible (filtered) tasks ── */
    const visibleTasks = useMemo(() => {
        let list = sortedTasks;
        if (activeCategory !== 'Todas') list = list.filter(t => t.period === activeCategory);
        if (searchQuery.trim()) list = list.filter(t => t.label.toLowerCase().includes(searchQuery.toLowerCase()));
        return list;
    }, [sortedTasks, activeCategory, searchQuery]);

    const visibleIds = useMemo(() => visibleTasks.map(t => taskKey(t.label, t.period)), [visibleTasks]);

    /* ── Category counts ── */
    const catCount = useMemo(() => {
        const counts: Record<CategoryKey, number> = { Todas: todayTemplates.length, Mañana: 0, Tarde: 0, Noche: 0, Otro: 0 };
        todayTemplates.forEach(t => { counts[t.period as CategoryKey] = (counts[t.period as CategoryKey] || 0) + 1; });
        return counts;
    }, [todayTemplates]);

    /* ── Toggle / create ── */
    const handleToggle = useCallback((label: string, period: Period) => {
        const existing = dailyBlocks.find(b =>
            b.label.toLowerCase() === label.toLowerCase() && b.period === period && b.date === todayStr
        );
        if (existing) {
            const willComplete = !existing.completed;
            toggleDailyBlock(existing.id);
            if (willComplete && dailyBlocks.filter(b => b.date === todayStr && !b.completed).length === 1) {
                confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#ff9f66', '#FFD700', '#A8DADC'] });
            }
        } else {
            const tmpl = dailyBlocks.find(b => b.label.toLowerCase() === label.toLowerCase() && b.period === period);
            addDailyBlock(label, period, todayStr, true, tmpl?.projectId, tmpl?.repeatDays);
        }
    }, [dailyBlocks, todayStr, toggleDailyBlock, addDailyBlock]);

    const handleRemove = useCallback((label: string, period: Period) => {
        const ids = dailyBlocks.filter(b => b.label.toLowerCase() === label.toLowerCase() && b.period === period).map(b => b.id);
        if (ids.length) removeDailyBlock(ids);
    }, [dailyBlocks, removeDailyBlock]);

    const handleQuickAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickAddText.trim()) return;
        addDailyBlock(quickAddText.trim(), quickAddPeriod, todayStr, false, undefined, [0,1,2,3,4,5,6]);
        setQuickAddText('');
    };

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

    /* ── Sort label ── */
    const sortLabel: Record<SortMode, string> = {
        cronologico: 'Cronológico',
        proyecto:    'Por Proyecto',
    };
    const nextSort: Record<SortMode, SortMode> = {
        cronologico: 'proyecto',
        proyecto:    'cronologico',
    };

    /* ── Reset custom order ── */
    const resetOrder = () => {
        saveOrder([]);
    };

    /* ────────────────────────────────────────────────────────── */
    return (
        <div style={{ padding: '1.5rem 2rem 3rem', minHeight: '100%', background: C.surface }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: C.onSurface, letterSpacing: '-0.01em' }}>
                        Mi Jornada
                    </h2>
                    <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: C.onSurfaceVariant, textTransform: 'capitalize' }}>
                        {todayLabel}
                    </p>
                </div>

                {/* Search */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: C.surfaceContainerLow, padding: '8px 14px',
                    borderRadius: '999px', border: `1px solid ${C.outlineVariant}`,
                    minWidth: '200px',
                }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: C.onSurfaceVariant }}>search</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar tarea..."
                        style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.85rem', color: C.onSurface, width: '100%', fontFamily: 'inherit' }}
                    />
                </div>
            </div>

            {/* ── Main Grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>

                {/* ── LEFT: Progress + Categories ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Progress Bento */}
                    <section style={{
                        ...bentoCard, border: 'none',
                        background: 'rgba(148,74,24,0.06)',
                        padding: '1.5rem', position: 'relative', overflow: 'hidden',
                    }}>
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: C.primary }}>Progreso Diario</h3>
                                <span style={{
                                    background: C.primaryContainer, color: C.onPrimaryContainer,
                                    padding: '3px 10px', borderRadius: '999px',
                                    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em',
                                }}>HOY</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                                <motion.span
                                    key={progressPct}
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    style={{ fontSize: '4rem', fontWeight: 800, lineHeight: 1, color: C.primary }}
                                >{progressPct}</motion.span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: C.primary }}>%</span>
                            </div>

                            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: C.onSurfaceVariant }}>
                                {completedToday} de {totalToday} tareas completadas.
                            </p>

                            <div style={{ width: '100%', height: '10px', background: C.surfaceContainerHighest, borderRadius: '999px', overflow: 'hidden' }}>
                                <motion.div
                                    animate={{ width: `${progressPct}%` }}
                                    transition={{ duration: 0.7, ease: 'easeOut' }}
                                    style={{ height: '100%', background: C.primary, borderRadius: '999px' }}
                                />
                            </div>
                        </div>

                        {/* BG icon */}
                        <div style={{ position: 'absolute', right: '-16px', bottom: '-16px', opacity: 0.08, pointerEvents: 'none' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '140px', color: C.primary }}>analytics</span>
                        </div>
                    </section>

                    {/* Categories */}
                    <section style={{ ...bentoCard, padding: '1.25rem' }}>
                        <h3 style={{ margin: '0 0 10px 4px', fontSize: '0.65rem', fontWeight: 700, color: C.onSurfaceVariant, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Jornada
                        </h3>
                        <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {CATEGORIES.map(cat => {
                                const isActive = activeCategory === cat.key;
                                return (
                                    <button
                                        key={cat.key}
                                        onClick={() => setActiveCategory(cat.key)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '9px 12px', borderRadius: '10px', border: 'none',
                                            cursor: 'pointer', width: '100%', textAlign: 'left',
                                            background: isActive ? C.primary : 'transparent',
                                            color: isActive ? '#fff' : C.onSurfaceVariant,
                                            fontFamily: 'inherit', fontWeight: isActive ? 700 : 500,
                                            fontSize: '0.88rem', transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = C.surfaceContainerHigh; }}
                                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: isActive ? '#fff' : cat.color }}>
                                                {cat.icon}
                                            </span>
                                            <span>{cat.label}</span>
                                        </div>
                                        <span style={{
                                            fontSize: '0.72rem', fontWeight: 700,
                                            background: isActive ? 'rgba(255,255,255,0.22)' : C.surfaceContainerHigh,
                                            color: isActive ? '#fff' : C.onSurfaceVariant,
                                            padding: '2px 8px', borderRadius: '8px',
                                        }}>
                                            {catCount[cat.key] ?? 0}
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>
                    </section>
                </div>

                {/* ── RIGHT: Task list ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

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
                                        background: 'rgba(148,74,24,0.08)', border: 'none',
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
                                    background: pendientesFirst ? 'rgba(148,74,24,0.10)' : C.surfaceContainerHigh,
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

                            {/* Sort mode */}
                            <button
                                onClick={() => { setSortMode(nextSort[sortMode]); saveOrder([]); }}
                                title="Cambiar orden base"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    background: C.surfaceContainerHigh, border: 'none',
                                    borderRadius: '8px', padding: '5px 10px',
                                    fontSize: '0.72rem', color: C.onSurfaceVariant, fontWeight: 600,
                                    cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.surfaceContainerHighest}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.surfaceContainerHigh}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>sort</span>
                                {customOrder.length > 0 ? 'Manual' : sortLabel[sortMode]}
                            </button>
                        </div>
                    </div>

                    {/* DnD List */}
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
                                                onToggle={() => handleToggle(task.label, task.period)}
                                                onRemove={() => handleRemove(task.label, task.period)}
                                            />
                                        );
                                    })
                                ) : (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        style={{ ...bentoCard, padding: '3rem 2rem', textAlign: 'center', color: C.onSurfaceVariant }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: C.outlineVariant, display: 'block', marginBottom: '12px' }}>
                                            checklist
                                        </span>
                                        <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.95rem', color: C.onSurface }}>
                                            {searchQuery ? 'Sin resultados' : 'Sin tareas programadas'}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '0.8rem' }}>
                                            {searchQuery ? 'Intenta con otro término.' : 'Crea bloques en el Registro Semanal.'}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </SortableContext>

                        {/* Drag overlay */}
                        <DragOverlay>
                            {activeDragTask ? (
                                <div style={{
                                    ...bentoCard,
                                    padding: '14px 16px',
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                                    background: C.surfaceLowest,
                                    cursor: 'grabbing',
                                    opacity: 0.95,
                                }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: C.primary }}>drag_indicator</span>
                                    <div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: C.onSurface }}>{activeDragTask.label}</div>
                                        <span style={{
                                            background: PERIOD_CFG[activeDragTask.period].bg,
                                            color: PERIOD_CFG[activeDragTask.period].color,
                                            fontSize: '0.65rem', fontWeight: 700,
                                            padding: '2px 8px', borderRadius: '999px', marginTop: '4px', display: 'inline-block',
                                        }}>{PERIOD_CFG[activeDragTask.period].label}</span>
                                    </div>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>

                    {/* ── Quick Add ── */}
                    <form
                        onSubmit={handleQuickAdd}
                        style={{
                            marginTop: '4px',
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '12px 16px',
                            background: C.surfaceContainerLow,
                            border: `1.5px dashed ${C.outlineVariant}`,
                            borderRadius: '1rem',
                            transition: 'border-color 0.15s',
                        }}
                        onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = C.primary}
                        onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = C.outlineVariant}
                    >
                        <span className="material-symbols-outlined" style={{
                            fontSize: '20px', color: C.primary,
                            background: C.surfaceLowest, borderRadius: '999px', padding: '4px',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        }}>add</span>

                        <input
                            type="text"
                            value={quickAddText}
                            onChange={e => setQuickAddText(e.target.value)}
                            placeholder="Añadir una nueva tarea para hoy..."
                            style={{
                                flex: 1, background: 'transparent', border: 'none',
                                outline: 'none', fontSize: '0.9rem', color: C.onSurface,
                                fontFamily: 'inherit',
                            }}
                        />

                        <select
                            value={quickAddPeriod}
                            onChange={e => setQuickAddPeriod(e.target.value as Period)}
                            style={{
                                background: C.surfaceContainerHigh, border: 'none', outline: 'none',
                                borderRadius: '8px', padding: '4px 8px',
                                fontSize: '0.75rem', fontWeight: 700, color: C.onSurfaceVariant,
                                cursor: 'pointer', fontFamily: 'inherit',
                            }}
                        >
                            <option value="Mañana">☀️ Mañana</option>
                            <option value="Tarde">🌤 Tarde</option>
                            <option value="Noche">🌙 Noche</option>
                            <option value="Otro">⏱ Otro</option>
                        </select>

                        <button
                            type="submit"
                            disabled={!quickAddText.trim()}
                            style={{
                                background: quickAddText.trim() ? C.primary : C.surfaceContainerHigh,
                                color: quickAddText.trim() ? '#fff' : C.onSurfaceVariant,
                                border: 'none', borderRadius: '10px',
                                padding: '6px 16px', fontSize: '0.82rem', fontWeight: 700,
                                cursor: quickAddText.trim() ? 'pointer' : 'default',
                                transition: 'all 0.15s', fontFamily: 'inherit',
                            }}
                        >
                            Añadir
                        </button>
                    </form>
                </div>
            </div>

            {/* ── Hover styles ── */}
            <style>{`
                .task-card-row:hover .drag-handle { opacity: 1 !important; }
                .task-card-row:hover .delete-btn  { opacity: 1 !important; }
            `}</style>
        </div>
    );
};
