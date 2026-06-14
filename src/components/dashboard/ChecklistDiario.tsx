import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { DailyBlock } from '../../hooks/useAlDiaState';

/* ─── Design Tokens ──────────────────────────────────────────── */
const C = {
    primary:           '#944a18',
    primaryContainer:  '#ff9f66',
    onPrimaryContainer:'#773401',
    secondary:         '#4858ab',
    secondaryContainer:'#96a5ff',
    tertiary:          '#785900',
    tertiaryContainer: '#e6ae00',
    surface:           '#f8f9fa',
    surfaceContainer:  '#edeeef',
    surfaceContainerLow:'#f3f4f5',
    surfaceContainerHigh:'#e7e8e9',
    surfaceContainerHighest:'#e1e3e4',
    surfaceLowest:     '#ffffff',
    onSurface:         '#191c1d',
    onSurfaceVariant:  '#54433a',
    outline:           '#877369',
    outlineVariant:    '#dac2b6',
    errorContainer:    '#ffdad6',
    onError:           '#ffffff',
};

/* ─── Period config ──────────────────────────────────────────── */
type Period = 'Mañana' | 'Tarde' | 'Noche' | 'Otro';

const PERIOD_CFG: Record<Period, { icon: string; label: string; color: string; bg: string }> = {
    'Mañana': { icon: 'wb_sunny',    label: 'MAÑANA', color: '#FFC107', bg: 'rgba(255,193,7,0.12)'  },
    'Tarde':  { icon: 'light_mode',  label: 'TARDE',  color: '#ff9f66', bg: 'rgba(255,159,102,0.12)' },
    'Noche':  { icon: 'dark_mode',   label: 'NOCHE',  color: '#5C6BC0', bg: 'rgba(92,107,192,0.12)'  },
    'Otro':   { icon: 'more_time',   label: 'OTRO',   color: '#877369', bg: 'rgba(135,115,105,0.1)'  },
};

/* ─── Category config ────────────────────────────────────────── */
type CategoryKey = 'Todas' | 'Mañana' | 'Tarde' | 'Noche' | 'Otro';
const CATEGORIES: { key: CategoryKey; label: string; icon: string; color: string }[] = [
    { key: 'Todas',  label: 'Todas',   icon: 'checklist',  color: C.primary   },
    { key: 'Mañana', label: 'Mañana',  icon: 'wb_sunny',   color: '#E6A817'   },
    { key: 'Tarde',  label: 'Tarde',   icon: 'light_mode', color: '#E07040'   },
    { key: 'Noche',  label: 'Noche',   icon: 'dark_mode',  color: '#5C6BC0'   },
    { key: 'Otro',   label: 'Otro',    icon: 'more_time',  color: '#877369'   },
];

/* ─── Styles helpers ─────────────────────────────────────────── */
const bentoCard: React.CSSProperties = {
    background: C.surfaceLowest,
    borderRadius: '2rem',
    border: `1px solid ${C.outlineVariant}`,
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    transition: 'box-shadow 0.2s, transform 0.2s',
    overflow: 'hidden',
};

/* ══════════════════════════════════════════════════════════════ */
interface ChecklistDiarioProps {
    dailyBlocks:     DailyBlock[];
    addDailyBlock:   (label: string, period: Period, date: string, completed?: boolean, projectId?: number, repeatDays?: number[]) => void;
    toggleDailyBlock:(id: number) => void;
    removeDailyBlock:(id: number | number[]) => void;
    projects:        any[];
}

export const ChecklistDiario = ({
    dailyBlocks,
    addDailyBlock,
    toggleDailyBlock,
    removeDailyBlock,
    projects,
}: ChecklistDiarioProps) => {
    const todayStr   = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
    const todayIndex = useMemo(() => (new Date().getDay() + 6) % 7, []); // 0=Lun
    const todayLabel = useMemo(() => new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }), []);

    const [activeCategory, setActiveCategory] = useState<CategoryKey>('Todas');
    const [searchQuery, setSearchQuery]       = useState('');
    const [quickAddText, setQuickAddText]     = useState('');
    const [quickAddPeriod, setQuickAddPeriod] = useState<Period>('Mañana');

    /* ── Derive unique task templates ── */
    const uniqueTemplates = useMemo(() => {
        const keys = new Set<string>();
        const list: { label: string; period: Period; projectId?: number; repeatDays?: number[] }[] = [];
        dailyBlocks.forEach(b => {
            const key = `${b.label.toLowerCase()}-${b.period}`;
            if (!keys.has(key)) {
                keys.add(key);
                list.push({ label: b.label, period: b.period as Period, projectId: b.projectId, repeatDays: b.repeatDays });
            } else {
                const ex = list.find(l => l.label.toLowerCase() === b.label.toLowerCase() && l.period === b.period);
                if (ex) {
                    if (!ex.projectId && b.projectId) ex.projectId = b.projectId;
                    if ((!ex.repeatDays || !ex.repeatDays.length) && b.repeatDays?.length) ex.repeatDays = b.repeatDays;
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
        const b = dailyBlocks.find(b => b.label.toLowerCase() === t.label.toLowerCase() && b.period === t.period && b.date === todayStr);
        return b?.completed;
    }).length;
    const progressPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

    /* ── Filtered + searched tasks ── */
    const visibleTasks = useMemo(() => {
        let list = todayTemplates;
        if (activeCategory !== 'Todas') list = list.filter(t => t.period === activeCategory);
        if (searchQuery.trim()) list = list.filter(t => t.label.toLowerCase().includes(searchQuery.toLowerCase()));
        return list;
    }, [todayTemplates, activeCategory, searchQuery]);

    /* ── Category counts ── */
    const catCount = useMemo(() => {
        const counts: Record<CategoryKey, number> = { Todas: todayTemplates.length, Mañana: 0, Tarde: 0, Noche: 0, Otro: 0 };
        todayTemplates.forEach(t => { counts[t.period as CategoryKey] = (counts[t.period as CategoryKey] || 0) + 1; });
        return counts;
    }, [todayTemplates]);

    /* ── Toggle / create block ── */
    const handleToggle = (label: string, period: Period) => {
        const existing = dailyBlocks.find(b =>
            b.label.toLowerCase() === label.toLowerCase() &&
            b.period === period &&
            b.date === todayStr
        );
        if (existing) {
            const willComplete = !existing.completed;
            toggleDailyBlock(existing.id);
            if (willComplete) {
                const dayBlocks = dailyBlocks.filter(b => b.date === todayStr);
                if (dayBlocks.filter(b => !b.completed).length === 1) {
                    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#ff9f66', '#FFD700', '#A8DADC'] });
                }
            }
        } else {
            const tmpl = dailyBlocks.find(b => b.label.toLowerCase() === label.toLowerCase() && b.period === period);
            addDailyBlock(label, period, todayStr, true, tmpl?.projectId, tmpl?.repeatDays);
            const remaining = dailyBlocks.filter(b => b.date === todayStr && !b.completed).length;
            if (remaining === 0) {
                confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#ff9f66', '#FFD700', '#A8DADC'] });
            }
        }
    };

    const handleRemove = (label: string, period: Period) => {
        const ids = dailyBlocks.filter(b => b.label.toLowerCase() === label.toLowerCase() && b.period === period).map(b => b.id);
        if (ids.length) removeDailyBlock(ids);
    };

    const handleQuickAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickAddText.trim()) return;
        addDailyBlock(quickAddText.trim(), quickAddPeriod, todayStr, false, undefined, [0,1,2,3,4,5,6]);
        setQuickAddText('');
    };

    /* ────────────────────────────────────────────────────────── */
    return (
        <div style={{ padding: '1.5rem 2rem 3rem', minHeight: '100%', background: C.surface }}>

            {/* ── Top Header ── */}
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
                    minWidth: '220px',
                }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: C.onSurfaceVariant }}>search</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar tarea..."
                        style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.85rem', color: C.onSurface, width: '100%' }}
                    />
                </div>
            </div>

            {/* ── Main Grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>

                {/* ── LEFT COLUMN ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Progress Bento */}
                    <section
                        style={{
                            ...bentoCard,
                            background: `rgba(148,74,24,0.06)`,
                            border: 'none',
                            padding: '1.5rem',
                            position: 'relative',
                        }}
                    >
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: C.primary }}>Progreso Diario</h3>
                                <span style={{
                                    background: C.primaryContainer, color: C.onPrimaryContainer,
                                    padding: '3px 10px', borderRadius: '999px',
                                    fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
                                }}>HOY</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '4rem', fontWeight: 800, lineHeight: 1, color: C.primary }}>{progressPct}</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: C.primary }}>%</span>
                            </div>

                            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: C.onSurfaceVariant }}>
                                {completedToday} de {totalToday} tareas completadas hoy.
                            </p>

                            {/* Progress bar */}
                            <div style={{ width: '100%', height: '10px', background: C.surfaceContainerHighest, borderRadius: '999px', overflow: 'hidden' }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPct}%` }}
                                    transition={{ duration: 0.7, ease: 'easeOut' }}
                                    style={{ height: '100%', background: C.primary, borderRadius: '999px' }}
                                />
                            </div>
                        </div>

                        {/* Background icon */}
                        <div style={{ position: 'absolute', right: '-16px', bottom: '-16px', opacity: 0.08 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '140px', color: C.primary }}>analytics</span>
                        </div>
                    </section>

                    {/* Categories */}
                    <section style={{ ...bentoCard, padding: '1.25rem' }}>
                        <h3 style={{
                            margin: '0 0 12px 4px',
                            fontSize: '0.68rem', fontWeight: 700, color: C.onSurfaceVariant,
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                        }}>Jornada</h3>

                        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {CATEGORIES.map(cat => {
                                const isActive = activeCategory === cat.key;
                                return (
                                    <button
                                        key={cat.key}
                                        onClick={() => setActiveCategory(cat.key)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '10px 14px', borderRadius: '12px', border: 'none',
                                            cursor: 'pointer', width: '100%', textAlign: 'left',
                                            background: isActive ? C.primary : 'transparent',
                                            color: isActive ? '#fff' : C.onSurfaceVariant,
                                            fontFamily: 'inherit', fontWeight: isActive ? 700 : 500,
                                            fontSize: '0.9rem', transition: 'all 0.15s',
                                            borderRight: isActive ? `4px solid ${C.primaryContainer}` : '4px solid transparent',
                                        }}
                                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = C.surfaceContainerHigh; }}
                                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: '20px', color: isActive ? '#fff' : cat.color }}
                                            >{cat.icon}</span>
                                            <span>{cat.label}</span>
                                        </div>
                                        <span style={{
                                            fontSize: '0.75rem', fontWeight: 600,
                                            background: isActive ? 'rgba(255,255,255,0.2)' : C.surfaceContainerHigh,
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

                {/* ── RIGHT COLUMN ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: C.onSurface }}>
                            Lista de Tareas
                        </h3>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '8px', color: C.onSurfaceVariant, transition: 'background 0.15s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.surfaceContainer}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>sort</span>
                            </button>
                        </div>
                    </div>

                    {/* Task list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <AnimatePresence initial={false}>
                            {visibleTasks.length > 0 ? visibleTasks.map(task => {
                                const block = dailyBlocks.find(b =>
                                    b.label.toLowerCase() === task.label.toLowerCase() &&
                                    b.period === task.period &&
                                    b.date === todayStr
                                );
                                const isDone = block?.completed ?? false;
                                const project = projects.find(p => p.id === task.projectId);
                                const projColor = project?.color || C.outline;
                                const projName  = project?.name || 'General';
                                const periodCfg = PERIOD_CFG[task.period] || PERIOD_CFG['Otro'];

                                return (
                                    <motion.div
                                        key={`${task.label}-${task.period}`}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        style={{
                                            ...bentoCard,
                                            borderRadius: '1rem',
                                            padding: '14px 16px',
                                            display: 'flex', alignItems: 'center', gap: '14px',
                                            background: isDone ? '#f3f4f5' : C.surfaceLowest,
                                            opacity: isDone ? 0.75 : 1,
                                        }}
                                        whileHover={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', translateY: -2 } as any}
                                    >
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => handleToggle(task.label, task.period)}
                                            style={{
                                                width: '22px', height: '22px', minWidth: '22px',
                                                borderRadius: '6px', border: `2px solid ${isDone ? projColor : C.outlineVariant}`,
                                                background: isDone ? projColor : 'transparent',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.15s', padding: 0,
                                            }}
                                        >
                                            {isDone && (
                                                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#fff', fontVariationSettings: "'FILL' 1" }}>check</span>
                                            )}
                                        </button>

                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div
                                                style={{
                                                    fontSize: '0.95rem', fontWeight: 600, color: C.onSurface,
                                                    textDecoration: isDone ? 'line-through' : 'none',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {task.label}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px', flexWrap: 'wrap' }}>
                                                {/* Category chip */}
                                                <span style={{
                                                    background: periodCfg.bg, color: periodCfg.color,
                                                    fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em',
                                                    padding: '2px 8px', borderRadius: '999px',
                                                }}>
                                                    {periodCfg.label}
                                                </span>
                                                {/* Project chip */}
                                                <span style={{
                                                    display: 'flex', alignItems: 'center', gap: '4px',
                                                    fontSize: '0.72rem', color: C.onSurfaceVariant,
                                                }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: projColor, display: 'inline-block' }} />
                                                    {projName}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Delete */}
                                        <button
                                            onClick={() => handleRemove(task.label, task.period)}
                                            title="Eliminar"
                                            style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                color: '#ba1a1a', opacity: 0, transition: 'opacity 0.15s',
                                                padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '8px',
                                            }}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0'}
                                            className="delete-btn"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                        </button>
                                    </motion.div>
                                );
                            }) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{
                                        ...bentoCard,
                                        borderRadius: '1rem',
                                        padding: '3rem 2rem',
                                        textAlign: 'center', color: C.onSurfaceVariant,
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: C.outlineVariant, display: 'block', marginBottom: '12px' }}>checklist</span>
                                    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.95rem', color: C.onSurface }}>
                                        {searchQuery ? 'Sin resultados' : 'Sin tareas programadas'}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.8rem' }}>
                                        {searchQuery ? 'Intenta con otro término.' : 'Añade una nueva tarea abajo o crea bloques en el Registro Semanal.'}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

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
                                background: C.surfaceLowest,
                                borderRadius: '999px', padding: '4px',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                cursor: 'default',
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

                            {/* Period selector */}
                            <select
                                value={quickAddPeriod}
                                onChange={e => setQuickAddPeriod(e.target.value as Period)}
                                style={{
                                    background: C.surfaceContainerHigh,
                                    border: 'none', outline: 'none',
                                    borderRadius: '8px', padding: '4px 8px',
                                    fontSize: '0.75rem', fontWeight: 700,
                                    color: C.onSurfaceVariant, cursor: 'pointer',
                                    fontFamily: 'inherit',
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
                                    padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700,
                                    cursor: quickAddText.trim() ? 'pointer' : 'default',
                                    transition: 'all 0.15s', fontFamily: 'inherit',
                                }}
                            >
                                Añadir
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Hover reveal for delete buttons */}
            <style>{`
                .delete-btn { opacity: 0 !important; }
                *:hover > .delete-btn { opacity: 1 !important; }
            `}</style>
        </div>
    );
};
