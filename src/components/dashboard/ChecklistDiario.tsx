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
    onMenuClick: (e: React.MouseEvent, label: string, period: Period) => void;
}

const TaskCard = ({
    id, label, period, isDone, projColor, projName,
    isDragging = false, onToggle, onMenuClick,
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

                {/* Menu */}
                <button
                    onClick={(e) => onMenuClick(e, label, period)}
                    title="Más opciones"
                    className="menu-btn"
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#877369', opacity: 0, transition: 'opacity 0.15s',
                        padding: '4px', display: 'flex', alignItems: 'center',
                        borderRadius: '8px', flexShrink: 0,
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>more_vert</span>
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
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileAddForm, setShowMobileAddForm] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ label: string; period: Period } | null>(null);
    const [editingTask, setEditingTask] = useState<{ label: string; period: Period } | null>(null);
    const [editText, setEditText] = useState('');
    const [openMenu, setOpenMenu] = useState<{ label: string; period: Period; anchor: HTMLElement | null } | null>(null);
    const [editingRepeat, setEditingRepeat] = useState<{ label: string; period: Period; repeatDays: number[] } | null>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    const handleSaveEdit = useCallback(() => {
        if (!editingTask || !editText.trim()) return;
        const ids = dailyBlocks.filter(b => b.label.toLowerCase() === editingTask.label.toLowerCase() && b.period === editingTask.period).map(b => b.id);
        ids.forEach(id => {
            removeDailyBlock(id);
            addDailyBlock(editText.trim(), editingTask.period, todayStr, false, undefined, [0,1,2,3,4,5,6]);
        });
        setEditingTask(null);
        setEditText('');
    }, [editingTask, editText, dailyBlocks, removeDailyBlock, addDailyBlock, todayStr]);

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
        const ids = dailyBlocks.filter(b => b.label.toLowerCase() === editingRepeat.label.toLowerCase() && b.period === editingRepeat.period).map(b => b.id);
        ids.forEach(id => {
            removeDailyBlock(id);
            addDailyBlock(editingRepeat.label, editingRepeat.period, todayStr, false, undefined, repeatDays);
        });
        setEditingRepeat(null);
    }, [editingRepeat, dailyBlocks, removeDailyBlock, addDailyBlock, todayStr]);

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
    if (isMobile) {
        return (
            <div style={{ padding: '12px 12px 6rem', minHeight: '100%' }}>
                
                {/* Search / Filter toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', width: '100%' }}>
                    {/* Search */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: C.surfaceContainerLow, padding: '6px 12px',
                        borderRadius: '999px', border: `1px solid ${C.outlineVariant}`,
                        flex: 1,
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

                    {/* Pendientes primero toggle */}
                    <button
                        onClick={() => setPendientesFirst(v => !v)}
                        title={pendientesFirst ? 'Pendientes primero: ON' : 'Pendientes primero: OFF'}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: pendientesFirst ? 'rgba(148,74,24,0.10)' : C.surfaceContainerHigh,
                            border: `1.5px solid ${pendientesFirst ? C.primary : C.outlineVariant}`,
                            borderRadius: '999px', padding: '6px 10px',
                            cursor: 'pointer',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: pendientesFirst ? C.primary : C.onSurfaceVariant }}>
                            vertical_align_top
                        </span>
                    </button>

                    {/* Sort mode */}
                    <button
                        onClick={() => { setSortMode(nextSort[sortMode]); saveOrder([]); }}
                        title="Cambiar orden base"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: C.surfaceContainerHigh, border: 'none',
                            borderRadius: '999px', padding: '6px 10px',
                            cursor: 'pointer',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: C.onSurfaceVariant }}>sort</span>
                    </button>

                    {/* Reset custom order */}
                    {customOrder.length > 0 && (
                        <button
                            onClick={resetOrder}
                            title="Restaurar orden automático"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(148,74,24,0.08)', border: 'none',
                                borderRadius: '999px', padding: '6px 10px',
                                cursor: 'pointer',
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: C.primary }}>restart_alt</span>
                        </button>
                    )}
                </div>

                {/* Progress Card */}
                <div style={{
                    background: '#ffffff',
                    border: `1px solid ${C.outlineVariant}`,
                    borderRadius: '1.25rem',
                    padding: '1.25rem',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    marginBottom: '1rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: C.onSurface }}>
                                Tu progreso hoy
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: C.onSurfaceVariant, fontWeight: 500 }}>
                                {progressPct === 100 ? '¡Jornada completada! 🎉' : 
                                 progressPct >= 75 ? '¡Casi terminas tu jornada!' : 
                                 progressPct >= 50 ? '¡Vas por la mitad, sigue así!' : 
                                 progressPct > 0 ? '¡Buen comienzo, adelante!' : 
                                 'Sin tareas completadas hoy.'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', color: C.primary }}>
                            <span style={{ fontSize: '2.2rem', fontWeight: 800 }}>{progressPct}</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>%</span>
                        </div>
                    </div>

                    <div style={{ width: '100%', height: '8px', background: C.surfaceContainer, borderRadius: '999px', overflow: 'hidden', marginBottom: '16px' }}>
                        <motion.div
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 0.7, ease: 'easeOut' }}
                            style={{ height: '100%', background: '#ff9f66', borderRadius: '999px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'rgba(148,74,24,0.08)', color: C.primary,
                            padding: '6px 12px', borderRadius: '999px',
                            fontSize: '0.75rem', fontWeight: 700,
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            {completedToday} completadas
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: C.surfaceContainer, color: C.onSurfaceVariant,
                            padding: '6px 12px', borderRadius: '999px',
                            fontSize: '0.75rem', fontWeight: 700,
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
                            {totalToday - completedToday} pendientes
                        </div>
                    </div>
                </div>

                {/* Horizontal Category scroll */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    padding: '4px 0 12px',
                    width: '100%',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }} className="mobile-categories-scroll">
                    {CATEGORIES.map(cat => {
                        const isActive = activeCategory === cat.key;
                        return (
                            <button
                                key={cat.key}
                                onClick={() => setActiveCategory(cat.key)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    borderRadius: '999px',
                                    border: `1px solid ${isActive ? C.primary : C.outlineVariant}`,
                                    background: isActive ? C.primary : '#ffffff',
                                    color: isActive ? '#ffffff' : C.onSurfaceVariant,
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                                    transition: 'all 0.15s',
                                    flexShrink: 0,
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: isActive ? '#ffffff' : cat.color }}>
                                    {cat.icon}
                                </span>
                                {cat.label}
                            </button>
                        );
                    })}
                </div>

                {/* Mobile Quick Add Form slide-down */}
                <AnimatePresence>
                    {showMobileAddForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden', marginBottom: '12px' }}
                        >
                            <form
                                onSubmit={(e) => {
                                    handleQuickAdd(e);
                                    setShowMobileAddForm(false);
                                }}
                                style={{
                                    display: 'flex', flexDirection: 'column', gap: '10px',
                                    padding: '16px',
                                    background: '#ffffff',
                                    border: `1.5px dashed ${C.outlineVariant}`,
                                    borderRadius: '1.25rem',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: C.primary }}>add_circle</span>
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
                                        autoFocus
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                    <select
                                        value={quickAddPeriod}
                                        onChange={e => setQuickAddPeriod(e.target.value as Period)}
                                        style={{
                                            background: C.surfaceContainer, border: 'none', outline: 'none',
                                            borderRadius: '8px', padding: '6px 12px',
                                            fontSize: '0.75rem', fontWeight: 700, color: C.onSurfaceVariant,
                                            cursor: 'pointer', fontFamily: 'inherit',
                                        }}
                                    >
                                        <option value="Mañana">☀️ Mañana</option>
                                        <option value="Tarde">🌤 Tarde</option>
                                        <option value="Noche">🌙 Noche</option>
                                        <option value="Otro">⏱ Otro</option>
                                    </select>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setShowMobileAddForm(false)}
                                            style={{
                                                background: 'transparent', border: 'none', color: C.onSurfaceVariant,
                                                padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!quickAddText.trim()}
                                            style={{
                                                background: quickAddText.trim() ? C.primary : C.surfaceContainer,
                                                color: quickAddText.trim() ? '#fff' : C.onSurfaceVariant,
                                                border: 'none', borderRadius: '8px',
                                                padding: '6px 16px', fontSize: '0.8rem', fontWeight: 700,
                                                cursor: quickAddText.trim() ? 'pointer' : 'default',
                                            }}
                                        >
                                            Añadir
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* DnD Tasks List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                                                onMenuClick={handleMenuClick}
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

                {/* Motivational Banner at the bottom */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    textAlign: 'center',
                    marginTop: '24px',
                    padding: '24px 16px 40px',
                    color: '#877369',
                }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        background: '#ffffff', border: `1px solid ${C.outlineVariant}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '24px', color: C.primary, fontVariationSettings: "'FILL' 1" }}>verified</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, maxWidth: '240px', lineHeight: 1.4 }}>
                        Vas por buen camino. Completa tus tareas para alcanzar tu meta diaria.
                    </p>
                </div>

                {/* Mobile FAB */}
                <button
                    onClick={() => setShowMobileAddForm(v => !v)}
                    style={{
                        position: 'fixed',
                        bottom: '84px',
                        right: '20px',
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: '#ff9f66',
                        color: '#ffffff',
                        border: 'none',
                        boxShadow: '0 4px 16px rgba(255, 159, 102, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 999,
                    }}
                    title="Añadir tarea"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '28px', fontVariationSettings: "'wght' 600" }}>add</span>
                </button>

                {/* CSS styles for mobile category scroll hide */}
                <style>{`
                    .mobile-categories-scroll::-webkit-scrollbar {
                        display: none;
                    }
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
                                <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: '#191c1d' }}>Editar tarea</h4>
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
                                        color: '#54433a', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    }}>Cancelar</button>
                                    <button onClick={handleSaveEdit} style={{
                                        flex: 1, padding: '10px', borderRadius: '12px',
                                        border: 'none', background: '#944a18', color: 'white',
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
        <div style={{ padding: '1.5rem 2rem 3rem', minHeight: '100%' }}>
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
                            <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: '#191c1d' }}>Editar tarea</h4>
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
                                    color: '#54433a', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                }}>Cancelar</button>
                                <button onClick={handleSaveEdit} style={{
                                    flex: 1, padding: '10px', borderRadius: '12px',
                                    border: 'none', background: '#944a18', color: 'white',
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
                    <section style={{ padding: '0.25rem 0' }}>
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
                                        data-icon-color={cat.color}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            borderRight: `4px solid ${isActive ? C.primary : 'transparent'}`,
                                            cursor: 'pointer', width: '100%', textAlign: 'left',
                                            background: isActive ? C.surfaceContainerHigh : 'transparent',
                                            color: isActive ? C.primary : C.onSurfaceVariant,
                                            fontFamily: 'inherit', fontWeight: isActive ? 700 : 500,
                                            fontSize: '0.88rem', transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => {
                                            if (!isActive) {
                                                const btn = e.currentTarget as HTMLButtonElement;
                                                btn.style.background = C.surfaceContainerHigh;
                                                btn.style.color = C.primary;
                                                const icon = btn.querySelector('.cat-icon') as HTMLElement;
                                                if (icon) icon.style.color = C.primary;
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!isActive) {
                                                const btn = e.currentTarget as HTMLButtonElement;
                                                btn.style.background = 'transparent';
                                                btn.style.color = C.onSurfaceVariant;
                                                const icon = btn.querySelector('.cat-icon') as HTMLElement;
                                                if (icon) icon.style.color = btn.getAttribute('data-icon-color') || '';
                                            }
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span 
                                                className="material-symbols-outlined cat-icon" 
                                                style={{ 
                                                    fontSize: '18px', 
                                                    color: isActive ? C.primary : cat.color,
                                                    transition: 'color 0.15s',
                                                }}
                                            >
                                                {cat.icon}
                                            </span>
                                            <span>{cat.label}</span>
                                        </div>
                                        <span style={{
                                            fontSize: '0.72rem', fontWeight: 700,
                                            background: isActive ? C.primary : C.surfaceContainerHigh,
                                            color: isActive ? '#fff' : C.onSurfaceVariant,
                                            padding: '2px 8px', borderRadius: '8px',
                                            transition: 'all 0.15s',
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
                                                onMenuClick={handleMenuClick}
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
                        <h4 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#191c1d' }}>Repetir tarea</h4>
                        <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#877369' }}>
                            ¿Qué días de la semana se repite "{editingRepeat.label}"?
                        </p>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
                            {['L','M','X','J','V','S','D'].map((day, i) => {
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
                                            background: selected ? '#944a18' : 'transparent',
                                            color: selected ? '#fff' : '#54433a',
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
                                color: '#54433a', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                            }}>Cancelar</button>
                            <button onClick={() => handleSaveRepeat(editingRepeat.repeatDays)} style={{
                                flex: 1, padding: '10px', borderRadius: '12px',
                                border: 'none', background: '#944a18', color: 'white',
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
                fontSize: '0.85rem', color: '#54433a', fontWeight: 600,
            }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F3F4F5'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>today</span>
                Quitar de hoy
            </button>
            <button onClick={() => { onEditName(label, period); onClose(); }} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '10px 14px', border: 'none', background: 'transparent',
                borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                fontSize: '0.85rem', color: '#54433a', fontWeight: 600,
            }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F3F4F5'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                Editar nombre
            </button>
            <button onClick={() => { onEditRepeat(label, period); onClose(); }} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '10px 14px', border: 'none', background: 'transparent',
                borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                fontSize: '0.85rem', color: '#54433a', fontWeight: 600,
            }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F3F4F5'}
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
                fontSize: '0.85rem', color: '#DC2626', fontWeight: 600,
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
