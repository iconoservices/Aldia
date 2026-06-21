import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { DailyBlock } from '../../hooks/useAlDiaState';

interface BloquesDashboardProps {
    dailyBlocks: DailyBlock[];
    addDailyBlock: (label: string, period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro', date: string, completed?: boolean, projectId?: number, repeatDays?: number[]) => void;
    toggleDailyBlock: (id: number) => void;
    removeDailyBlock: (id: number | number[]) => void;
    updateDailyBlock: (id: number, updates: Partial<DailyBlock>) => void;
    projects: any[];
}

const getPeriodStyles = (period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro') => {
    switch (period) {
        case 'Mañana':
            return { iconName: 'light_mode', color: '#944a18', bg: 'rgba(148, 74, 24, 0.05)', border: 'rgba(148, 74, 24, 0.1)', label: 'Mañana' };
        case 'Tarde':
            return { iconName: 'wb_sunny', color: '#785900', bg: 'rgba(120, 89, 0, 0.05)', border: 'rgba(120, 89, 0, 0.1)', label: 'Tarde' };
        case 'Noche':
            return { iconName: 'dark_mode', color: '#4858ab', bg: 'rgba(72, 88, 171, 0.05)', border: 'rgba(72, 88, 171, 0.1)', label: 'Noche' };
        default:
            return { iconName: 'settings', color: '#877369', bg: 'rgba(135, 115, 105, 0.05)', border: 'rgba(135, 115, 105, 0.1)', label: 'Otro' };
    }
};

// Sugerencias por defecto basadas en la plantilla
const SUGGESTIONS = [
    { text: 'Resumen Diario', label: 'Revisa tus logros de hoy', icon: 'auto_awesome', period: 'Noche' as const, projectKeyword: 'general', repeatDays: [0, 1, 2, 3, 4, 5, 6] },
    { text: 'Lectura 15 min', label: 'Inspiración de la tarde', icon: 'menu_book', period: 'Tarde' as const, projectKeyword: 'general', repeatDays: [0, 1, 2, 3, 4, 5, 6] },
    { text: 'Meditación Guíada', label: 'Cierra el día en paz', icon: 'mediation', period: 'Noche' as const, projectKeyword: 'general', repeatDays: [0, 1, 2, 3, 4, 5, 6] }
];

export const BloquesDashboard = ({
    dailyBlocks,
    addDailyBlock,
    toggleDailyBlock,
    removeDailyBlock,
    updateDailyBlock,
    projects
}: BloquesDashboardProps) => {
    // 📅 Fecha de referencia para la semana actual
    const [referenceDate, setReferenceDate] = useState(() => new Date());
    const hydratedWeekRef = useRef<string>('');
    const hydratedMonthRef = useRef<string>('');

    const [newBlockText, setNewBlockText] = useState('');
    const [newBlockPeriod, setNewBlockPeriod] = useState<'Mañana' | 'Tarde' | 'Noche' | 'Otro'>('Mañana');
    const [selectedProjectIdForNewBlock, setSelectedProjectIdForNewBlock] = useState<number | undefined>(undefined);
    const [newBlockDays, setNewBlockDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]); // Lunes a Domingo por defecto
    
    // Vista activa principal y sub-vistas
    const [semanalSubView, setSemanalSubView] = useState<'semana' | 'mes' | 'anual'>('semana');
    // Mes de referencia para la vista mensual
    const [refMonthDate, setRefMonthDate] = useState(() => new Date());
    // Año de referencia para la vista anual
    const [viewYear, setViewYear] = useState(() => new Date().getFullYear());

    // Edición inline
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [editingProjectId, setEditingProjectId] = useState<number | undefined>(undefined);
    const [editingRepeatDays, setEditingRepeatDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
    const [editingPeriod, setEditingPeriod] = useState<'Mañana' | 'Tarde' | 'Noche' | 'Otro'>('Mañana');
    const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

    const [groupBy, setGroupBy] = useState<'period' | 'project' | 'none'>('period');
    const [sortBy, setSortBy] = useState<'period' | 'name' | 'progress'>('period');
    const [showGroupMenu, setShowGroupMenu] = useState(false);
    const [showSortMenu, setShowSortMenu] = useState(false);

    // ── Mobile state ─────────────────────────────────────────────
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileAddModal, setShowMobileAddModal] = useState(false);
    const [mobileEditingRow, setMobileEditingRow] = useState<{ key: string; label: string; period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro'; projectId?: number; repeatDays?: number[] } | null>(null);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

    // Calcular días de la semana actual basados en la fecha de referencia
    const weekDays = useMemo(() => {
        const current = new Date(referenceDate);
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para que inicie el Lunes
        const startOfWeek = new Date(current.setDate(diff));

        const days = [];
        for (let i = 0; i < 7; i++) {
            const tempDate = new Date(startOfWeek);
            tempDate.setDate(startOfWeek.getDate() + i);
            const dateStr = tempDate.toLocaleDateString('en-CA');
            const dayName = tempDate.toLocaleDateString('es-ES', { weekday: 'short' }); // "lun", "mar"...
            const dayNum = tempDate.getDate();
            days.push({
                date: dateStr,
                label: dayName.toUpperCase().slice(0, 3), // e.g. "LUN", "MAR"
                dayNum,
                isToday: dateStr === new Date().toLocaleDateString('en-CA')
            });
        }
        return days;
    }, [referenceDate]);

    // Navegar de semana en semana
    const adjustWeek = (weeks: number) => {
        const nextDate = new Date(referenceDate);
        nextDate.setDate(nextDate.getDate() + weeks * 7);
        setReferenceDate(nextDate);
    };

    // Hidratar bloques faltantes al navegar entre semanas o meses
    useEffect(() => {
        const weekKey = weekDays.map(d => d.date).join(',');
        const monthKey = `${refMonthDate.getFullYear()}-${refMonthDate.getMonth()}`;

        if (hydratedWeekRef.current === weekKey && hydratedMonthRef.current === monthKey) return;

        const templates = new Map<string, { label: string; period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro'; projectId?: number; repeatDays: number[] }>();

        dailyBlocks.forEach(b => {
            if (b.repeatDays && b.repeatDays.length > 0) {
                const key = `${b.label.toLowerCase()}|${b.period}`;
                if (!templates.has(key)) {
                    templates.set(key, { label: b.label, period: b.period, projectId: b.projectId, repeatDays: b.repeatDays });
                }
            }
        });

        const toAdd: { label: string; period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro'; date: string; projectId?: number; repeatDays: number[] }[] = [];

        if (hydratedWeekRef.current !== weekKey) {
            hydratedWeekRef.current = weekKey;
            templates.forEach(template => {
                weekDays.forEach((day, idx) => {
                    if (template.repeatDays.includes(idx)) {
                        const exists = dailyBlocks.some(b =>
                            b.label.toLowerCase() === template.label.toLowerCase() &&
                            b.period === template.period &&
                            b.date === day.date
                        );
                        if (!exists) {
                            toAdd.push({ ...template, date: day.date });
                        }
                    }
                });
            });
        }

        if (hydratedMonthRef.current !== monthKey) {
            hydratedMonthRef.current = monthKey;
            const daysInMonth = new Date(refMonthDate.getFullYear(), refMonthDate.getMonth() + 1, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${refMonthDate.getFullYear()}-${String(refMonthDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayOfWeek = (new Date(dateStr + 'T12:00:00').getDay() + 6) % 7;
                templates.forEach(template => {
                    if (template.repeatDays.includes(dayOfWeek)) {
                        const exists = dailyBlocks.some(b =>
                            b.label.toLowerCase() === template.label.toLowerCase() &&
                            b.period === template.period &&
                            b.date === dateStr
                        );
                        if (!exists) {
                            toAdd.push({ ...template, date: dateStr });
                        }
                    }
                });
            }
        }

        if (toAdd.length > 0) {
            toAdd.forEach(block => addDailyBlock(block.label, block.period, block.date, false, block.projectId, block.repeatDays));
        }
    }, [weekDays, refMonthDate]);

    const getWeekRangeLabel = () => {
        const first = new Date(weekDays[0].date + 'T00:00:00');
        const last = new Date(weekDays[6].date + 'T00:00:00');
        return `del ${first.toLocaleDateString('es-ES', { day: '2-digit' })} al ${last.toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}`;
    };

    // Obtener todas las definiciones únicas de bloques de enfoque para esta semana
    const blockRows = useMemo(() => {
        const uniqueKeys = new Set<string>();
        const rows: { key: string; label: string; period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro'; projectId?: number; repeatDays?: number[] }[] = [];

        // Buscamos bloques de enfoque dentro de los 7 días mostrados
        const weekDates = weekDays.map(d => d.date);
        const weekBlocks = dailyBlocks.filter(b => weekDates.includes(b.date));

        weekBlocks.forEach(b => {
            const key = `${b.label.toLowerCase()}-${b.period}`;
            if (!uniqueKeys.has(key)) {
                uniqueKeys.add(key);
                rows.push({ key, label: b.label, period: b.period, projectId: b.projectId, repeatDays: b.repeatDays });
            } else {
                const existing = rows.find(r => r.key === key);
                if (existing) {
                    if (!existing.projectId && b.projectId) {
                        existing.projectId = b.projectId;
                    }
                    if ((!existing.repeatDays || existing.repeatDays.length === 0) && b.repeatDays && b.repeatDays.length > 0) {
                        existing.repeatDays = b.repeatDays;
                    }
                }
            }
        });

        // Ordenar filas según sortBy o groupBy
        const order = { 'Mañana': 0, 'Tarde': 1, 'Noche': 2, 'Otro': 3 };

        let sorted = [...rows];
        if (groupBy === 'project') {
            sorted = sorted.sort((a, b) => {
                const nameA = projects.find(p => p.id === a.projectId)?.name || 'Z-Sin Proyecto';
                const nameB = projects.find(p => p.id === b.projectId)?.name || 'Z-Sin Proyecto';
                return nameA.localeCompare(nameB);
            });
        } else if (sortBy === 'period') {
            sorted = sorted.sort((a, b) => order[a.period] - order[b.period]);
        } else if (sortBy === 'name') {
            sorted = sorted.sort((a, b) => a.label.localeCompare(b.label));
        } else if (sortBy === 'progress') {
            const getProgress = (row: typeof rows[0]) => {
                const rowBlocks = dailyBlocks.filter(b =>
                    b.label.toLowerCase() === row.label.toLowerCase() &&
                    b.period === row.period &&
                    weekDates.includes(b.date)
                );

                if (rowBlocks.length === 0) return -1;
                return rowBlocks.filter(b => b.completed).length / rowBlocks.length;
            };
            sorted = sorted.sort((a, b) => getProgress(b) - getProgress(a));
        }
        return sorted;
    }, [dailyBlocks, weekDays, sortBy, groupBy, projects]);

    const groupedRows = useMemo(() => {
        const groups: {
            id: string;
            title: string;
            iconName: string;
            color: string;
            bg: string;
            border: string;
            rows: typeof blockRows;
        }[] = [];

        if (groupBy === 'period') {
            const periods: ('Mañana' | 'Tarde' | 'Noche' | 'Otro')[] = ['Mañana', 'Tarde', 'Noche', 'Otro'];
            periods.forEach(p => {
                const rows = blockRows.filter(r => r.period === p);
                if (rows.length > 0) {
                    const styles = getPeriodStyles(p);
                    groups.push({
                        id: `period-${p}`,
                        title: styles.label,
                        iconName: styles.iconName,
                        color: styles.color,
                        bg: styles.bg,
                        border: styles.border,
                        rows
                    });
                }
            });
        } else if (groupBy === 'project') {
            const projectIds = Array.from(new Set(blockRows.map(r => r.projectId)));
            projectIds.forEach(projId => {
                const rows = blockRows.filter(r => r.projectId === projId);
                if (rows.length > 0) {
                    const linkedProj = projects.find(p => p.id === projId);
                    const projName = linkedProj ? linkedProj.name : 'General / Sin Proyecto';
                    const projColor = linkedProj ? linkedProj.color : '#877369';
                    groups.push({
                        id: `project-${projId || 'none'}`,
                        title: projName,
                        iconName: 'folder',
                        color: projColor,
                        bg: `${projColor}0d`, // ~5% opacity
                        border: `${projColor}20`, // ~12% opacity
                        rows
                    });
                }
            });
        } else {
            if (blockRows.length > 0) {
                groups.push({
                    id: 'all',
                    title: 'Bloques de Enfoque',
                    iconName: 'view_week',
                    color: '#944a18',
                    bg: 'rgba(148, 74, 24, 0.05)',
                    border: 'rgba(148, 74, 24, 0.1)',
                    rows: blockRows
                });
            }
        }

        return groups;
    }, [blockRows, groupBy, projects]);

    // Toggle o Creación inteligente de bloque para un día específico
    const handleCellToggle = (label: string, period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro', date: string) => {
        const existingBlock = dailyBlocks.find(b => 
            b.label.toLowerCase() === label.toLowerCase() && 
            b.period === period && 
            b.date === date
        );

        if (existingBlock) {
            const willBeCompleted = !existingBlock.completed;
            toggleDailyBlock(existingBlock.id);

            // Confeti si se completa el último bloque activo de ese día
            if (willBeCompleted) {
                const dayBlocks = dailyBlocks.filter(b => b.date === date);
                const incompleteCount = dayBlocks.filter(b => !b.completed).length;
                if (incompleteCount === 1) { // Faltaba solo el que acabamos de marcar
                    confetti({
                        particleCount: 80,
                        spread: 60,
                        origin: { y: 0.7 },
                        colors: ['#FF8C42', '#FFD700', '#A8DADC', '#0055FF']
                    });
                }
            }
        } else {
            const templateBlock = dailyBlocks.find(b =>
                b.label.toLowerCase() === label.toLowerCase() &&
                b.period === period
            );
            
            addDailyBlock(label, period, date, true, templateBlock?.projectId, templateBlock?.repeatDays);

            // Confeti si al crearlo completado, todos los bloques de ese día están completados
            const dayBlocks = dailyBlocks.filter(b => b.date === date);
            const incompleteCount = dayBlocks.filter(b => !b.completed).length;
            if (incompleteCount === 0) {
                confetti({
                    particleCount: 80,
                    spread: 60,
                    origin: { y: 0.7 },
                    colors: ['#FF8C42', '#FFD700', '#A8DADC', '#0055FF']
                });
            }
        }
    };

    // Agregar nueva fila / bloque en la semana actual
    const handleAddRow = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBlockText.trim()) return;

        const label = newBlockText.trim();
        weekDays.forEach((day, idx) => {
            if (newBlockDays.includes(idx)) {
                const exists = dailyBlocks.some(b =>
                    b.label.toLowerCase() === label.toLowerCase() &&
                    b.period === newBlockPeriod &&
                    b.date === day.date
                );
                if (!exists) {
                    addDailyBlock(label, newBlockPeriod, day.date, false, selectedProjectIdForNewBlock, newBlockDays);
                }
            }
        });
        setNewBlockText('');
        setSelectedProjectIdForNewBlock(undefined);
        setNewBlockDays([0, 1, 2, 3, 4, 5, 6]);
    };

    // Eliminar bloque (Elimina TODOS los bloques con ese label+period)
    const handleRemoveRow = (label: string, period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro') => {
        const toRemove = dailyBlocks.filter(b =>
            b.label.toLowerCase() === label.toLowerCase() &&
            b.period === period
        );
        const ids = toRemove.map(b => b.id);
        if (ids.length > 0) {
            removeDailyBlock(ids);
        }
    };

    // Guardar cambios en el nombre, proyecto, período y días del bloque
    const handleSaveRowName = (oldLabel: string, oldPeriod: 'Mañana' | 'Tarde' | 'Noche' | 'Otro') => {
        const textToSave = editingText.trim() || oldLabel;
        const weekDates = weekDays.map(d => d.date);

        const blocksInWeek = dailyBlocks.filter(b =>
            b.label.toLowerCase() === oldLabel.toLowerCase() && b.period === oldPeriod && weekDates.includes(b.date)
        );

        // Actualizar bloques existentes
        blocksInWeek.forEach(b => {
            updateDailyBlock(b.id, { label: textToSave, projectId: editingProjectId, repeatDays: editingRepeatDays, period: editingPeriod });
        });

        // Agregar bloques para días que ahora están activos y no existían
        weekDays.forEach((day, idx) => {
            if (editingRepeatDays.includes(idx)) {
                const alreadyHasBlock = dailyBlocks.some(b => {
                    const isUpdatedBlock = blocksInWeek.some(ub => ub.date === day.date && ub.id === b.id);
                    if (isUpdatedBlock) return true;
                    return b.label.toLowerCase() === textToSave.toLowerCase() &&
                        b.period === editingPeriod &&
                        b.date === day.date;
                });
                if (!alreadyHasBlock) {
                    addDailyBlock(textToSave, editingPeriod, day.date, false, editingProjectId, editingRepeatDays);
                }
            }
        });

        setEditingRowId(null);
    };

    const handleAddSuggestion = (sug: typeof SUGGESTIONS[0]) => {
        const match = projects.find(p => p.name.toLowerCase().includes(sug.projectKeyword));
        const projId = match ? match.id : undefined;
        
        addDailyBlock(sug.text, sug.period, todayStr, false, projId, sug.repeatDays);
        
        confetti({
            particleCount: 50,
            spread: 40,
            origin: { y: 0.8 }
        });
    };

    // ── Mobile View ──────────────────────────────────────────────
    if (isMobile) {
        // Blocks grouped by period
        const dayBlocksByPeriod = (['Mañana', 'Tarde', 'Noche', 'Otro'] as const).map(period => {
            const rows = blockRows.filter(r => r.period === period);
            return { period, rows };
        }).filter(g => g.rows.length > 0);

        const periodColors: Record<string, { color: string; bg: string; icon: string; accentBg: string }> = {
            'Mañana': { color: '#785900', bg: 'rgba(255, 193, 7, 0.08)', icon: 'light_mode', accentBg: '#e6ae00' },
            'Tarde':  { color: '#944a18', bg: 'rgba(255, 159, 102, 0.08)', icon: 'wb_sunny', accentBg: '#ff9f66' },
            'Noche':  { color: '#4858ab', bg: 'rgba(72, 88, 171, 0.08)', icon: 'dark_mode', accentBg: '#96a5ff' },
            'Otro':   { color: '#877369', bg: 'rgba(135, 115, 105, 0.08)', icon: 'settings', accentBg: '#dac2b6' },
        };

        const handleFormSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!newBlockText.trim()) return;

            if (mobileEditingRow) {
                // Edit Mode
                const weekDates = weekDays.map(d => d.date);
                
                // Find all existing blocks for this definition in this week
                const toUpdate = dailyBlocks.filter(b =>
                    b.label.toLowerCase() === mobileEditingRow.label.toLowerCase() &&
                    b.period === mobileEditingRow.period &&
                    weekDates.includes(b.date)
                );

                if (toUpdate.length > 0) {
                    toUpdate.forEach(b => {
                        updateDailyBlock(b.id, {
                            label: newBlockText.trim(),
                            period: newBlockPeriod,
                            projectId: selectedProjectIdForNewBlock,
                            repeatDays: newBlockDays
                        });
                    });
                } else {
                    const defaultDate = weekDays.some(d => d.isToday) 
                        ? new Date().toLocaleDateString('en-CA') 
                        : weekDays[0].date;
                    addDailyBlock(newBlockText.trim(), newBlockPeriod, defaultDate, false, selectedProjectIdForNewBlock, newBlockDays);
                }

                // Clear state
                setNewBlockText('');
                setSelectedProjectIdForNewBlock(undefined);
                setNewBlockDays([0, 1, 2, 3, 4, 5, 6]);
                setMobileEditingRow(null);
            } else {
                // Add Mode
                const label = newBlockText.trim();
                weekDays.forEach((day, idx) => {
                    if (newBlockDays.includes(idx)) {
                        const exists = dailyBlocks.some(b =>
                            b.label.toLowerCase() === label.toLowerCase() &&
                            b.period === newBlockPeriod &&
                            b.date === day.date
                        );
                        if (!exists) {
                            addDailyBlock(label, newBlockPeriod, day.date, false, selectedProjectIdForNewBlock, newBlockDays);
                        }
                    }
                });
                setNewBlockText('');
                setSelectedProjectIdForNewBlock(undefined);
                setNewBlockDays([0, 1, 2, 3, 4, 5, 6]);
            }
            setShowMobileAddModal(false);
        };

        return (
            <div style={{ background: '#f8f9fa', minHeight: '100%', paddingBottom: '7rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

                {/* ── Sticky Header ── */}
                <div style={{
                    position: 'sticky', top: 0, zIndex: 10,
                    background: '#ffffff',
                    borderBottom: '1px solid #e7e8e9',
                    padding: '14px 20px 14px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#191c1d', letterSpacing: '-0.01em' }}>
                                Registro Semanal
                            </h2>
                            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#54433a', fontWeight: '500', opacity: 0.7 }}>
                                {getWeekRangeLabel()}
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                                onClick={() => adjustWeek(-1)}
                                style={{ background: '#f3f4f5', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#54433a' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_left</span>
                            </button>
                            <button
                                onClick={() => setReferenceDate(new Date())}
                                style={{ background: '#ff9f66', border: 'none', borderRadius: '10px', padding: '6px 12px', cursor: 'pointer', color: '#773401', fontSize: '12px', fontWeight: '700' }}
                            >
                                Hoy
                            </button>
                            <button
                                onClick={() => adjustWeek(1)}
                                style={{ background: '#f3f4f5', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#54433a' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Main Content (Weekly Routines View) ── */}
                <div style={{ padding: '20px 20px 0' }}>

                    {dayBlocksByPeriod.length === 0 ? (
                        /* Empty state */
                        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#877369' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#ffdbc9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#944a18' }}>calendar_view_week</span>
                            </div>
                            <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '16px', color: '#191c1d' }}>Sin bloques esta semana</p>
                            <p style={{ margin: 0, fontSize: '13px', opacity: 0.7 }}>Añade un block con el botón +</p>
                        </div>
                    ) : (
                        dayBlocksByPeriod.map(({ period, rows }) => {
                            const pStyle = periodColors[period] ?? periodColors['Otro'];

                            return (
                                <motion.div 
                                    key={period} 
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{ 
                                        background: '#ffffff',
                                        borderRadius: '16px',
                                        border: '1px solid #e7e8e9',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
                                        padding: '20px 16px',
                                        marginBottom: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '16px'
                                    }}
                                >
                                    {/* Jornada Card Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ 
                                            width: '36px', height: '36px', borderRadius: '50%', 
                                            background: pStyle.bg, display: 'flex', 
                                            alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                                        }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: pStyle.color }}>
                                                {pStyle.icon}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#191c1d' }}>
                                                {period}
                                            </h4>
                                            <p style={{ margin: 0, fontSize: '12px', color: '#877369', fontWeight: '500' }}>
                                                {rows.length} bloque{rows.length !== 1 ? 's' : ''} activo{rows.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>

                                    {/* List of routine blocks */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        {rows.map((row, rIdx) => {
                                            const repeatDays = row.repeatDays || [0, 1, 2, 3, 4, 5, 6];
                                            const totalScheduledDays = repeatDays.length;
                                            
                                            // Count days completed in the current week
                                            let daysCompleted = 0;
                                            weekDays.forEach(day => {
                                                const existingBlock = dailyBlocks.find(b =>
                                                    b.label.toLowerCase() === row.label.toLowerCase() &&
                                                    b.period === row.period &&
                                                    b.date === day.date
                                                );
                                                if (existingBlock?.completed) {
                                                    daysCompleted++;
                                                }
                                            });

                                            const project = projects.find(p => p.id === row.projectId);

                                            return (
                                                <div 
                                                    key={row.key} 
                                                    style={{ 
                                                        borderTop: rIdx > 0 ? '1px solid #f3f4f5' : 'none', 
                                                        paddingTop: rIdx > 0 ? '16px' : '0' 
                                                    }}
                                                >
                                                    {/* Block info row */}
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                <span style={{
                                                                    margin: 0, fontSize: '15px', fontWeight: '700',
                                                                    color: '#191c1d',
                                                                    wordBreak: 'break-word'
                                                                }}>
                                                                    {row.label}
                                                                </span>
                                                                <button
                                                                    onClick={() => {
                                                                        setNewBlockText(row.label);
                                                                        setNewBlockPeriod(row.period);
                                                                        setSelectedProjectIdForNewBlock(row.projectId);
                                                                        setNewBlockDays(repeatDays);
                                                                        setMobileEditingRow(row);
                                                                        setShowMobileAddModal(true);
                                                                    }}
                                                                    style={{
                                                                        background: 'none', border: 'none', color: '#877369',
                                                                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                                                                        padding: '2px', opacity: 0.6
                                                                    }}
                                                                    title="Editar rutina"
                                                                >
                                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                                                                </button>
                                                            </div>
                                                            {project && (
                                                                <span style={{ fontSize: '11px', fontWeight: '600', color: project.color || '#877369', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                                                                    <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>folder</span>
                                                                    {project.name}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Progress badge */}
                                                        <span style={{
                                                            background: 'rgba(72, 88, 171, 0.08)',
                                                            color: '#4858ab',
                                                            borderRadius: '999px',
                                                            padding: '4px 10px',
                                                            fontSize: '11px',
                                                            fontWeight: '700',
                                                            flexShrink: 0
                                                        }}>
                                                            {daysCompleted}/{totalScheduledDays} Días
                                                        </span>
                                                    </div>

                                                    {/* Weekdays inline tracker (L, M, X, J, V, S, D) */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px', marginTop: '12px' }}>
                                                        {weekDays.map((day, idx) => {
                                                            const isRepeatDay = repeatDays.includes(idx);
                                                            
                                                            const existingBlock = dailyBlocks.find(b =>
                                                                b.label.toLowerCase() === row.label.toLowerCase() &&
                                                                b.period === row.period &&
                                                                b.date === day.date
                                                            );
                                                            const isDone = existingBlock?.completed ?? false;
                                                            const isToday = day.isToday;

                                                            const dayLetters = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
                                                            const dayLetter = dayLetters[idx];

                                                            return (
                                                                <div key={day.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                                                                    <span style={{ 
                                                                        fontSize: '11px', 
                                                                        fontWeight: '700', 
                                                                        color: isToday ? pStyle.color : '#877369',
                                                                        opacity: isRepeatDay ? 1 : 0.4,
                                                                        marginBottom: '2px'
                                                                    }}>
                                                                        {dayLetter}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleCellToggle(row.label, row.period, day.date)}
                                                                        disabled={!isRepeatDay}
                                                                        style={{
                                                                            width: '32px',
                                                                            height: '32px',
                                                                            borderRadius: '8px',
                                                                            border: isRepeatDay 
                                                                                ? (isDone ? `2px solid ${pStyle.color}` : `2px solid ${pStyle.accentBg}`) 
                                                                                : 'none',
                                                                            background: isRepeatDay
                                                                                ? (isDone ? pStyle.accentBg : '#ffffff')
                                                                                : '#f3f4f5',
                                                                            cursor: isRepeatDay ? 'pointer' : 'default',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            transition: 'all 0.15s ease'
                                                                        }}
                                                                    >
                                                                        {isRepeatDay && isDone && (
                                                                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#ffffff', fontVariationSettings: "'FILL' 1" }}>
                                                                                check
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {/* ── FAB ── */}
                <button
                    onClick={() => {
                        setMobileEditingRow(null);
                        setNewBlockText('');
                        setNewBlockPeriod('Mañana');
                        setSelectedProjectIdForNewBlock(undefined);
                        setNewBlockDays([0, 1, 2, 3, 4, 5, 6]);
                        setShowMobileAddModal(true);
                    }}
                    style={{
                        position: 'fixed', bottom: '84px', right: '20px',
                        width: '56px', height: '56px', borderRadius: '50%',
                        background: '#944a18', color: '#ffffff', border: 'none',
                        boxShadow: '0 4px 16px rgba(148,74,24,0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', zIndex: 999,
                    }}
                    title="Añadir bloque"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '28px', fontVariationSettings: "'wght' 600" }}>add</span>
                </button>

                {/* ── Add/Edit Modal (Bottom Sheet) ── */}
                <AnimatePresence>
                    {showMobileAddModal && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => {
                                    setShowMobileAddModal(false);
                                    setMobileEditingRow(null);
                                }}
                                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000 }}
                            />
                            <motion.div
                                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                                style={{
                                    position: 'fixed', bottom: 0, left: 0, right: 0,
                                    background: '#ffffff', borderRadius: '24px 24px 0 0',
                                    padding: '20px 20px 40px', zIndex: 1001,
                                    boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
                                    maxHeight: '90vh', overflowY: 'auto'
                                }}
                            >
                                <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#e1e3e4', margin: '0 auto 20px' }} />
                                <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '700', color: '#191c1d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#944a18' }}>
                                        {mobileEditingRow ? 'edit_note' : 'add_circle'}
                                    </span>
                                    {mobileEditingRow ? 'Editar Bloque de Enfoque' : 'Nuevo Bloque de Enfoque'}
                                </h3>

                                <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {/* Nombre */}
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#54433a', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>NOMBRE</label>
                                        <input
                                            type="text"
                                            value={newBlockText}
                                            onChange={e => setNewBlockText(e.target.value)}
                                            placeholder="Ej: Programar, Gimnasio..."
                                            autoFocus
                                            style={{
                                                width: '100%', background: '#f3f4f5', border: 'none',
                                                borderRadius: '12px', padding: '12px 16px',
                                                fontSize: '16px', fontWeight: '500', outline: 'none',
                                                color: '#191c1d', boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>

                                    {/* Franja horaria */}
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#54433a', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>FRANJA</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {(['Mañana', 'Tarde', 'Noche'] as const).map(p => {
                                                const ps = getPeriodStyles(p);
                                                const isSel = newBlockPeriod === p;
                                                return (
                                                    <button key={p} type="button" onClick={() => setNewBlockPeriod(p)}
                                                        style={{
                                                            flex: 1, padding: '10px 4px', borderRadius: '12px', border: 'none',
                                                            background: isSel ? ps.color : '#f3f4f5',
                                                            color: isSel ? '#ffffff' : '#54433a',
                                                            fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                                            transition: 'all 0.15s',
                                                            boxShadow: isSel ? `0 4px 12px ${ps.color}40` : 'none',
                                                        }}
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{ps.iconName}</span>
                                                        {p}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Proyecto */}
                                    {projects.length > 0 && (
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#54433a', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>PROYECTO (OPCIONAL)</label>
                                            <select
                                                value={selectedProjectIdForNewBlock || ''}
                                                onChange={e => setSelectedProjectIdForNewBlock(e.target.value ? Number(e.target.value) : undefined)}
                                                style={{
                                                    width: '100%', background: '#f3f4f5', border: 'none',
                                                    borderRadius: '12px', padding: '12px 16px',
                                                    fontSize: '15px', fontWeight: '600', outline: 'none',
                                                    color: '#191c1d', cursor: 'pointer', boxSizing: 'border-box',
                                                    appearance: 'none',
                                                }}
                                            >
                                                <option value="">Sin Proyecto / General</option>
                                                {projects.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Días activos */}
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#54433a', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>DÍAS ACTIVOS</label>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
                                            {['L','M','X','J','V','S','D'].map((d, i) => {
                                                const isAct = newBlockDays.includes(i);
                                                return (
                                                    <button key={i} type="button"
                                                        onClick={() => setNewBlockDays(prev => prev.includes(i) ? prev.filter(day => day !== i) : [...prev, i].sort())}
                                                        style={{
                                                            width: '38px', height: '38px', borderRadius: '50%', border: 'none',
                                                            background: isAct ? '#ff9f66' : '#f3f4f5',
                                                            color: isAct ? '#773401' : '#54433a',
                                                            fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            transition: 'all 0.1s',
                                                            boxShadow: isAct ? '0 2px 8px rgba(148,74,24,0.2)' : 'none',
                                                        }}
                                                    >{d}</button>
                                                );
                                            })}
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                            {[
                                                { label: 'L–V', days: [0,1,2,3,4] },
                                                { label: 'Fin', days: [5,6] },
                                                { label: 'Todos', days: [0,1,2,3,4,5,6] }
                                            ].map(opt => {
                                                const isActive = newBlockDays.length === opt.days.length && opt.days.every(d => newBlockDays.includes(d));
                                                return (
                                                    <button key={opt.label} type="button"
                                                        onClick={() => setNewBlockDays(opt.days)}
                                                        style={{
                                                            background: 'none', border: 'none',
                                                            color: isActive ? '#944a18' : '#4858ab',
                                                            fontSize: '13px', fontWeight: '700',
                                                            cursor: 'pointer', padding: 0
                                                        }}
                                                    >{opt.label}</button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Submit and Delete */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                        <button
                                            type="submit"
                                            disabled={!newBlockText.trim()}
                                            style={{
                                                width: '100%', height: '50px',
                                                background: newBlockText.trim() ? '#944a18' : '#e1e3e4',
                                                color: newBlockText.trim() ? '#ffffff' : '#877369',
                                                border: 'none', borderRadius: '14px',
                                                fontSize: '16px', fontWeight: '700', cursor: newBlockText.trim() ? 'pointer' : 'default',
                                                transition: 'all 0.15s',
                                                boxShadow: newBlockText.trim() ? '0 4px 16px rgba(148,74,24,0.25)' : 'none',
                                            }}
                                        >
                                            {mobileEditingRow ? 'Guardar Cambios' : 'Añadir Bloque'}
                                        </button>

                                        {mobileEditingRow && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleRemoveRow(mobileEditingRow.label, mobileEditingRow.period);
                                                    setNewBlockText('');
                                                    setSelectedProjectIdForNewBlock(undefined);
                                                    setNewBlockDays([0, 1, 2, 3, 4, 5, 6]);
                                                    setMobileEditingRow(null);
                                                    setShowMobileAddModal(false);
                                                }}
                                                style={{
                                                    width: '100%', height: '50px',
                                                    background: '#ffdad6',
                                                    color: '#ba1a1a',
                                                    border: 'none', borderRadius: '14px',
                                                    fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                                                    transition: 'all 0.15s',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                                }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                                                Eliminar Bloque
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Hide scrollbar on day strip */}
                <style>{`.bloques-day-strip::-webkit-scrollbar { display: none; }`}</style>
            </div>
        );
    }

    return (
        <div style={{ padding: '0.5rem 0 2rem 0', width: '100%', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

            
            {/* Cabecera del Dashboard */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#191c1d', letterSpacing: '-0.02em' }}>
                    Registro Semanal
                </h2>
                
                {/* Selector de Semana en Header */}
                <div style={{ display: 'flex', background: '#edeeef', padding: '4px', borderRadius: '12px', gap: '2px', border: '1px solid #e1e3e4' }}>
                    {([['semana', 'Semana'], ['mes', 'Mes'], ['anual', 'Año']] as const).map(([v, lbl]) => (
                        <button
                            key={v}
                            onClick={() => setSemanalSubView(v)}
                            style={{
                                border: 'none',
                                background: semanalSubView === v ? 'white' : 'transparent',
                                color: semanalSubView === v ? '#944a18' : '#54433a',
                                padding: '6px 16px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                boxShadow: semanalSubView === v ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
                            }}
                        >{lbl}</button>
                    ))}
                </div>
            </div>

            {/* ─── SUB-VISTA: SEMANA (planilla existente) ─── */}
            {semanalSubView === 'semana' && (<>
                {/* Formulario de Nuevo Bloque - Stitch style */}
                <form onSubmit={handleAddRow} className="glass-card" style={{
                    padding: '24px', 
                    borderRadius: '24px', 
                    background: 'rgba(255, 255, 255, 0.7)', 
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    marginBottom: '2.5rem', 
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#191c1d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#944a18' }}>
                                add_circle
                            </span>
                            Añadir Nuevo Bloque de Enfoque
                        </h3>
                        <span style={{ fontSize: '14px', color: '#54433a', opacity: 0.6, fontStyle: 'italic' }}>
                            Crea rutinas repetibles fácilmente
                        </span>
                    </div>

                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(12, 1fr)', 
                        gap: '16px', 
                        alignItems: 'end' 
                    }}>
                        {/* Nombre de la tarea */}
                        <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#54433a', paddingLeft: '4px', letterSpacing: '0.05em' }}>
                                Nombre de la tarea
                            </label>
                            <input
                                type="text"
                                value={newBlockText}
                                onChange={(e) => setNewBlockText(e.target.value)}
                                placeholder="Ej: Programar Delva, Gimnasio..."
                                style={{
                                    width: '100%',
                                    background: '#f3f4f5', 
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '12px 16px',
                                    fontSize: '16px',
                                    fontWeight: '500',
                                    outline: 'none',
                                    color: '#191c1d',
                                    transition: 'all 0.2s',
                                    height: '46px'
                                }}
                            />
                        </div>

                        {/* Proyecto / Categoría */}
                        <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#54433a', paddingLeft: '4px', letterSpacing: '0.05em' }}>
                                Proyecto / Categoría
                            </label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={selectedProjectIdForNewBlock || ''}
                                    onChange={(e) => setSelectedProjectIdForNewBlock(e.target.value ? Number(e.target.value) : undefined)}
                                    style={{
                                        width: '100%',
                                        background: '#f3f4f5',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '12px 32px 12px 16px',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        color: '#191c1d',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        height: '46px',
                                        appearance: 'none'
                                    }}
                                >
                                    <option value="">Sin Proyecto / General</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <span className="material-symbols-outlined text-outline" style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    pointerEvents: 'none',
                                    fontSize: '24px'
                                }}>
                                    expand_more
                                </span>
                            </div>
                        </div>

                        {/* Franja Horaria */}
                        <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#54433a', paddingLeft: '4px', letterSpacing: '0.05em' }}>
                                Franja Horaria
                            </label>
                            <div style={{ display: 'flex', background: '#f3f4f5', padding: '4px', borderRadius: '12px', gap: '4px', height: '46px', alignItems: 'center' }}>
                                {(['Mañana', 'Tarde', 'Noche'] as const).map((p) => {
                                    const styles = getPeriodStyles(p);
                                    const isSelected = newBlockPeriod === p;
                                    return (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setNewBlockPeriod(p)}
                                            style={{
                                                flex: 1,
                                                border: 'none',
                                                height: '100%',
                                                background: isSelected ? 'white' : 'transparent',
                                                color: isSelected ? '#944a18' : '#54433a',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                fontWeight: isSelected ? '700' : '500',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '4px',
                                                boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                                {styles.iconName}
                                            </span>
                                            <span>{p}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Botón de añadir */}
                        <div style={{ gridColumn: 'span 3' }}>
                            <button
                                type="submit"
                                style={{
                                    width: '100%',
                                    height: '46px',
                                    background: '#944a18', 
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '16px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(148, 74, 24, 0.2)',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <span className="material-symbols-outlined">add</span>
                                <span>Añadir</span>
                            </button>
                        </div>

                        {/* Días Activos */}
                        <div style={{ gridColumn: 'span 12', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid rgba(218, 194, 182, 0.3)', paddingTop: '14px', marginTop: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#54433a', letterSpacing: '0.05em' }}>Días activos:</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => {
                                    const isAct = newBlockDays.includes(i);
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                                setNewBlockDays(prev => 
                                                    prev.includes(i) ? prev.filter(day => day !== i) : [...prev, i].sort()
                                                );
                                            }}
                                            style={{
                                                border: 'none',
                                                background: isAct ? '#ff9f66' : '#e1e3e4',
                                                color: isAct ? '#773401' : '#54433a',
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%',
                                                fontSize: '14px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.1s',
                                                boxShadow: isAct ? '0 2px 4px rgba(148, 74, 24, 0.15)' : 'none'
                                            }}
                                        >
                                            {d}
                                        </button>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', gap: '16px', marginLeft: '8px', borderLeft: '1px solid #dac2b6', paddingLeft: '16px' }}>
                                {[
                                    { label: 'Lunes a Viernes', days: [0,1,2,3,4] },
                                    { label: 'Fin de Semana', days: [5,6] },
                                    { label: 'Todos', days: [0,1,2,3,4,5,6] }
                                ].map(opt => {
                                    const isActive = newBlockDays.length === opt.days.length && opt.days.every(d => newBlockDays.includes(d));
                                    return (
                                        <button
                                            key={opt.label}
                                            type="button"
                                            onClick={() => setNewBlockDays(opt.days)}
                                            style={{
                                                border: 'none',
                                                background: 'transparent',
                                                color: isActive ? '#944a18' : '#54433a',
                                                opacity: isActive ? 1 : 0.6,
                                                fontSize: '14px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                transition: 'all 0.1s'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.textDecoration = 'underline'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.opacity = isActive ? '1' : '0.6'; e.currentTarget.style.textDecoration = 'none'; }}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </form>

                {/* Panel de Registro Header Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: 'rgba(148, 74, 24, 0.1)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#944a18' }}>view_week</span>
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#191c1d' }}>Panel de Registro</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <button
                                    onClick={() => adjustWeek(-1)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#54433a', display: 'flex', alignItems: 'center' }}
                                    type="button"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
                                </button>
                                <p style={{ margin: 0, fontSize: '14px', color: '#54433a', opacity: 0.7, fontWeight: 600 }}>
                                    Progreso {getWeekRangeLabel()}
                                </p>
                                <button
                                    onClick={() => adjustWeek(1)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#54433a', display: 'flex', alignItems: 'center' }}
                                    type="button"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        {/* Agrupar por */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => { setShowGroupMenu(v => !v); setShowSortMenu(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    background: 'white',
                                    color: '#54433a',
                                    border: '1px solid #dac2b6',
                                    borderRadius: '12px', padding: '8px 16px', fontSize: '14px', fontWeight: '600',
                                    cursor: 'pointer', transition: 'all 0.15s'
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>filter_list</span>
                                Agrupar
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>expand_more</span>
                            </button>
                            <AnimatePresence>
                                {showGroupMenu && (
                                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                        style={{ position: 'absolute', top: '110%', right: 0, background: 'white', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200, minWidth: '220px', overflow: 'hidden', border: '1px solid #e1e3e4' }}
                                    >
                                        {(['none', 'period', 'project'] as const).map(opt => (
                                            <button key={opt}
                                                onClick={() => { setGroupBy(opt); setShowGroupMenu(false); }}
                                                style={{
                                                    width: '100%', padding: '12px 16px', background: groupBy === opt ? '#fdf0ea' : 'transparent',
                                                    color: groupBy === opt ? '#944a18' : '#191c1d', border: 'none',
                                                    textAlign: 'left', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '8px'
                                                }}
                                            >
                                                {groupBy === opt && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>}
                                                {opt === 'none' ? '❌ Ninguno' : opt === 'period' ? '🌅 Jornada (Mañana...)' : '📁 Proyecto / Tema'}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Ordenar por */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => { setShowSortMenu(v => !v); setShowGroupMenu(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    background: 'white', color: '#54433a',
                                    border: '1px solid #dac2b6',
                                    borderRadius: '12px', padding: '8px 16px', fontSize: '14px', fontWeight: '600',
                                    cursor: 'pointer', transition: 'all 0.15s'
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>swap_vert</span>
                                Ordenar
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>expand_more</span>
                            </button>
                            <AnimatePresence>
                                {showSortMenu && (
                                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                        style={{ position: 'absolute', top: '110%', right: 0, background: 'white', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200, minWidth: '200px', overflow: 'hidden', border: '1px solid #e1e3e4' }}
                                    >
                                        {([['period', '🌅 Jornada'], ['name', '🔤 Nombre A→Z'], ['progress', '📊 Progreso']] as const).map(([opt, label]) => (
                                            <button key={opt}
                                                onClick={() => { setSortBy(opt); setShowSortMenu(false); }}
                                                style={{
                                                    width: '100%', padding: '12px 16px', background: sortBy === opt ? '#fdf0ea' : 'transparent',
                                                    color: sortBy === opt ? '#944a18' : '#191c1d', border: 'none',
                                                    textAlign: 'left', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '8px'
                                                }}
                                            >
                                                {sortBy === opt && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>}
                                                {label}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Bento Table container — Stitch Layout */}
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '1.2rem', marginBottom: '3rem' }}>
                    {/* Table Header Row */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(12, 1fr)', 
                        gap: '10px', 
                        alignItems: 'center', 
                        padding: '10px 16px', 
                        background: '#edeeef',
                        borderRadius: '16px 16px 0 0',
                        borderBottom: '1px solid #dac2b6'
                    }}>
                        <div style={{ gridColumn: 'span 5', fontSize: '12px', fontWeight: '600', color: '#54433a', letterSpacing: '0.05em', textTransform: 'uppercase', paddingLeft: '16px' }}>
                            BLOQUE DE ENFOQUE
                        </div>
                        <div style={{ gridColumn: 'span 7', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                            {weekDays.map((day) => (
                                <div key={day.date} style={{ textAlign: 'center' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '600', display: 'block', color: day.isToday ? '#944a18' : '#54433a', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{day.label}</span>
                                    <span style={{ 
                                        fontSize: '16px', 
                                        fontWeight: '700', 
                                        marginTop: '4px', 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        borderRadius: '50%',
                                        width: '28px',
                                        height: '28px',
                                        backgroundColor: day.isToday ? '#ffdbc9' : 'transparent',
                                        color: day.isToday ? '#944a18' : '#191c1d'
                                    }}>
                                        {day.dayNum}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Grouped Rows */}
                    <AnimatePresence initial={false}>
                        {groupedRows.length > 0 ? (
                            groupedRows.map((group) => (
                                <div 
                                    key={group.id} 
                                    style={{ 
                                        background: 'rgba(255, 255, 255, 0.6)', 
                                        borderRadius: '16px', 
                                        overflow: 'hidden', 
                                        border: '1px solid rgba(218, 194, 182, 0.3)'
                                    }}
                                >
                                    {/* Group Title Bar */}
                                    {groupBy !== 'none' && (
                                        <div style={{ 
                                            backgroundColor: group.bg, 
                                            padding: '8px 16px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '10px', 
                                            borderBottom: `1px solid ${group.border}`
                                        }}>
                                            <span className="material-symbols-outlined" style={{ color: group.color, fontSize: '18px' }}>
                                                {group.iconName}
                                            </span>
                                            <span style={{ 
                                                fontSize: '12px', 
                                                fontWeight: '700', 
                                                color: group.color, 
                                                letterSpacing: '0.05em', 
                                                textTransform: 'uppercase' 
                                            }}>
                                                {group.title}
                                            </span>
                                        </div>
                                    )}

                                    {/* Rows container */}
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {group.rows.map((row) => {
                                            const project = projects.find(p => p.id === row.projectId);
                                            const isEditing = editingRowId === row.key;

                                            return (
                                                <motion.div
                                                    key={row.key}
                                                    initial={{ opacity: 0, y: 4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: -10 }}
                                                    transition={{ duration: 0.15 }}
                                                    style={{ 
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(12, 1fr)',
                                                        gap: '10px',
                                                        alignItems: 'center',
                                                        padding: '8px 16px',
                                                        borderBottom: '1px solid rgba(218, 194, 182, 0.15)',
                                                        backgroundColor: hoveredRowId === row.key ? 'white' : 'transparent',
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                    onMouseEnter={() => setHoveredRowId(row.key)}
                                                    onMouseLeave={() => setHoveredRowId(null)}
                                                >
                                                    {isEditing ? (
                                                        /* Editing mode */
                                                        <div 
                                                            style={{ 
                                                                gridColumn: 'span 12', 
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '10px'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
                                                                <input
                                                                    type="text"
                                                                    value={editingText}
                                                                    onChange={(e) => setEditingText(e.target.value)}
                                                                    style={{
                                                                        border: '1.5px solid #dac2b6',
                                                                        borderRadius: '8px',
                                                                        padding: '6px 12px',
                                                                        fontSize: '14px',
                                                                        fontWeight: '700',
                                                                        outline: 'none',
                                                                        color: '#191c1d',
                                                                        flex: 1,
                                                                        minWidth: '200px',
                                                                        background: 'white'
                                                                    }}
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleSaveRowName(row.label, row.period);
                                                                        if (e.key === 'Escape') setEditingRowId(null);
                                                                    }}
                                                                />

                                                                <div style={{ display: 'flex', background: '#edeeef', padding: '2px', borderRadius: '8px', gap: '2px' }}>
                                                                    {(['Mañana', 'Tarde', 'Noche', 'Otro'] as const).map(p => {
                                                                        const ps = getPeriodStyles(p);
                                                                        const isSel = editingPeriod === p;
                                                                        return (
                                                                            <button
                                                                                key={p}
                                                                                type="button"
                                                                                onClick={() => setEditingPeriod(p)}
                                                                                style={{
                                                                                    border: 'none',
                                                                                    background: isSel ? 'white' : 'transparent',
                                                                                    color: isSel ? ps.color : '#877369',
                                                                                    padding: '4px 8px',
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '12px',
                                                                                    fontWeight: '700',
                                                                                    cursor: 'pointer',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '3px',
                                                                                    transition: 'all 0.1s',
                                                                                    boxShadow: isSel ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                                                                                }}
                                                                            >
                                                                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                                                                    {ps.iconName}
                                                                                </span>
                                                                                <span>{ps.label}</span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>

                                                                <select
                                                                    value={editingProjectId || ''}
                                                                    onChange={(e) => setEditingProjectId(e.target.value ? Number(e.target.value) : undefined)}
                                                                    style={{
                                                                        border: '1.5px solid #dac2b6',
                                                                        borderRadius: '8px',
                                                                        padding: '6px 10px',
                                                                        fontSize: '14px',
                                                                        fontWeight: '700',
                                                                        color: '#191c1d',
                                                                        outline: 'none',
                                                                        background: 'white',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    <option value="">📁 General (Sin Proyecto)</option>
                                                                    {projects.map(p => (
                                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                                    ))}
                                                                </select>

                                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                                    <button
                                                                        onClick={() => handleSaveRowName(row.label, row.period)}
                                                                        style={{ background: '#4ade80', color: 'white', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(74,222,128,0.2)' }}
                                                                        title="Guardar"
                                                                    >
                                                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingRowId(null)}
                                                                        style={{ background: '#f87171', color: 'white', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(248,113,113,0.2)' }}
                                                                        title="Cancelar"
                                                                    >
                                                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', borderTop: '1px dashed #dac2b6', paddingTop: '8px' }}>
                                                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#54433a' }}>Días activos:</span>
                                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                                    {['L','M','X','J','V','S','D'].map((d, i) => {
                                                                        const isAct = editingRepeatDays.includes(i);
                                                                        return (
                                                                            <button
                                                                                key={i}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setEditingRepeatDays(prev =>
                                                                                        prev.includes(i) ? prev.filter(day => day !== i) : [...prev, i].sort()
                                                                                    );
                                                                                }}
                                                                                style={{
                                                                                    border: 'none',
                                                                                    background: isAct ? '#944a18' : '#e7e8e9',
                                                                                    color: isAct ? 'white' : '#877369',
                                                                                    width: '24px',
                                                                                    height: '24px',
                                                                                    borderRadius: '50%',
                                                                                    fontSize: '12px',
                                                                                    fontWeight: '700',
                                                                                    cursor: 'pointer',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    transition: 'all 0.1s',
                                                                                    boxShadow: isAct ? '0 2px 5px rgba(148,74,24,0.3)' : 'none'
                                                                                }}
                                                                            >
                                                                                {d}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* Normal display row — Stitch Layout */
                                                        <>
                                                            {/* Task name & project badge */}
                                                            <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', justifySelf: 'start', paddingLeft: '16px' }}>
                                                                <span style={{ 
                                                                    fontSize: '16px', 
                                                                    fontWeight: '600', 
                                                                    color: hoveredRowId === row.key ? '#944a18' : '#191c1d',
                                                                    transition: 'color 0.2s'
                                                                }}>
                                                                    {row.label}
                                                                </span>
                                                                <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                                                                    {project ? (
                                                                        <span style={{
                                                                            fontSize: '10px', fontWeight: '700',
                                                                            backgroundColor: `${project.color}15`, color: project.color,
                                                                            padding: '2px 6px', borderRadius: '4px', border: `1px solid ${project.color}25`,
                                                                            whiteSpace: 'nowrap', textTransform: 'uppercase'
                                                                        }}>{project.name}</span>
                                                                    ) : (
                                                                        <span style={{
                                                                            fontSize: '10px', fontWeight: '700',
                                                                            backgroundColor: 'rgba(135,115,105,0.1)', color: '#877369',
                                                                            padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(135,115,105,0.2)',
                                                                            whiteSpace: 'nowrap', textTransform: 'uppercase'
                                                                        }}>General</span>
                                                                    )}
                                                                </div>

                                                                {/* Hover actions */}
                                                                {hoveredRowId === row.key && (
                                                                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingRowId(row.key);
                                                                                setEditingText(row.label);
                                                                                setEditingProjectId(row.projectId);
                                                                                setEditingRepeatDays(row.repeatDays || [0,1,2,3,4,5,6]);
                                                                                setEditingPeriod(row.period);
                                                                            }}
                                                                            style={{
                                                                                background: 'white',
                                                                                border: '1px solid #dac2b6',
                                                                                borderRadius: '6px',
                                                                                padding: '2px 8px',
                                                                                fontSize: '12px',
                                                                                fontWeight: '700',
                                                                                color: '#944a18',
                                                                                cursor: 'pointer',
                                                                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                                                                transition: 'all 0.1s'
                                                                            }}
                                                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fdf0ea'; }}
                                                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                                                                            title="Editar tarea"
                                                                        >
                                                                            Editar
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleRemoveRow(row.label, row.period)}
                                                                            style={{
                                                                                background: 'white',
                                                                                border: '1px solid #ffdad6',
                                                                                borderRadius: '6px',
                                                                                padding: '2px 8px',
                                                                                fontSize: '12px',
                                                                                fontWeight: '700',
                                                                                color: '#ba1a1a',
                                                                                cursor: 'pointer',
                                                                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                                                                transition: 'all 0.1s'
                                                                            }}
                                                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#ffdad630'; }}
                                                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                                                                            title="Eliminar tarea"
                                                                        >
                                                                            Eliminar
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* 7 Day cells — individual columns */}
                                                            <div style={{ gridColumn: 'span 7', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', paddingLeft: '4px', paddingRight: '4px' }}>
                                                                {weekDays.map((day, dayIdx) => {
                                                                    const block = dailyBlocks.find(b => 
                                                                        b.label.toLowerCase() === row.label.toLowerCase() && 
                                                                        b.period === row.period && 
                                                                        b.date === day.date
                                                                    );
                                                                    const isCompleted = block ? block.completed : false;
                                                                    const isScheduled = row.repeatDays ? row.repeatDays.includes(dayIdx) : true;

                                                                    return (
                                                                        <div key={day.date} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                                            {isCompleted ? (
                                                                                <button
                                                                                    onClick={() => handleCellToggle(row.label, row.period, day.date)}
                                                                                    style={{
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        justifyContent: 'center',
                                                                                        width: '100%',
                                                                                        aspectRatio: '1',
                                                                                        maxWidth: '38px',
                                                                                        borderRadius: '8px',
                                                                                        border: '2px solid #944a18', // terracotta brand color
                                                                                        background: '#944a18',
                                                                                        color: 'white',
                                                                                        cursor: 'pointer',
                                                                                        transition: 'all 0.15s'
                                                                                    }}
                                                                                    onMouseEnter={(e) => {
                                                                                        e.currentTarget.style.transform = 'scale(1.05)';
                                                                                    }}
                                                                                    onMouseLeave={(e) => {
                                                                                        e.currentTarget.style.transform = 'none';
                                                                                    }}
                                                                                >
                                                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px', fontWeight: 'bold' }}>check</span>
                                                                                </button>
                                                                            ) : isScheduled ? (
                                                                                <button
                                                                                    onClick={() => handleCellToggle(row.label, row.period, day.date)}
                                                                                    style={{
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        justifyContent: 'center',
                                                                                        width: '100%',
                                                                                        aspectRatio: '1',
                                                                                        maxWidth: '38px',
                                                                                        borderRadius: '8px',
                                                                                        border: '2px solid rgba(218, 194, 182, 0.3)', // outline-variant/30
                                                                                        background: 'transparent',
                                                                                        color: '#dac2b6',
                                                                                        cursor: 'pointer',
                                                                                        transition: 'all 0.15s'
                                                                                    }}
                                                                                    onMouseEnter={(e) => {
                                                                                        e.currentTarget.style.borderColor = 'rgba(148, 74, 24, 0.5)';
                                                                                        e.currentTarget.style.color = '#944a18';
                                                                                        e.currentTarget.style.background = 'rgba(148, 74, 24, 0.05)';
                                                                                    }}
                                                                                    onMouseLeave={(e) => {
                                                                                        e.currentTarget.style.borderColor = 'rgba(218, 194, 182, 0.3)';
                                                                                        e.currentTarget.style.color = '#dac2b6';
                                                                                        e.currentTarget.style.background = 'transparent';
                                                                                    }}
                                                                                >
                                                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                                                                                </button>
                                                                            ) : (
                                                                                <div
                                                                                    title="No programado"
                                                                                    style={{
                                                                                        width: '100%',
                                                                                        aspectRatio: '1',
                                                                                        maxWidth: '38px',
                                                                                        borderRadius: '8px',
                                                                                        backgroundColor: '#edeeef', // surface-container
                                                                                        opacity: 0.4
                                                                                    }}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </>
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', background: 'white', borderRadius: '18px', border: '1px solid rgba(61,49,46,0.06)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
                                    <span style={{ fontSize: '2.5rem' }}>🧱</span>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-carbon)' }}>
                                        Sin bloques registrados
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#90A4AE', maxWidth: '300px', lineHeight: 1.4 }}>
                                        Introduce un bloque en el formulario superior para crear una fila y empezar a marcar tu semana.
                                    </p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </>) /* fin semanalSubView === 'semana' */}

            {/* ─── SUB-VISTA: MES ─── */}
            {semanalSubView === 'mes' && (() => {
                const monthStart = new Date(refMonthDate.getFullYear(), refMonthDate.getMonth(), 1);
                const monthEnd   = new Date(refMonthDate.getFullYear(), refMonthDate.getMonth() + 1, 0);
                const monthLabel = refMonthDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

                const startDow = (monthStart.getDay() + 6) % 7;
                const daysInMonth = monthEnd.getDate();

                const statsByDate: Record<string, { total: number; done: number }> = {};
                dailyBlocks.forEach(b => {
                    if (!statsByDate[b.date]) statsByDate[b.date] = { total: 0, done: 0 };
                    statsByDate[b.date].total++;
                    if (b.completed) statsByDate[b.date].done++;
                });

                const adjustMonth = (delta: number) => {
                    const d = new Date(refMonthDate);
                    d.setMonth(d.getMonth() + delta);
                    setRefMonthDate(d);
                    setReferenceDate(new Date(d.getFullYear(), d.getMonth(), 1));
                };

                const todayFull = new Date().toLocaleDateString('en-CA');

                return (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', padding: '3px 8px', borderRadius: '12px', border: '1px solid #ECEFF1' }}>
                                <button onClick={() => adjustMonth(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78909C', padding: '4px', display: 'flex', alignItems: 'center' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
                                </button>
                                <span style={{ fontWeight: 900, fontSize: '0.88rem', color: 'var(--text-carbon)', minWidth: '140px', textAlign: 'center', textTransform: 'capitalize' }}>{monthLabel}</span>
                                <button onClick={() => adjustMonth(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78909C', padding: '4px', display: 'flex', alignItems: 'center' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                                </button>
                            </div>
                            <button onClick={() => { setRefMonthDate(new Date()); setReferenceDate(new Date()); }} style={{ border: '1px solid #dac2b6', background: 'white', borderRadius: '8px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 800, color: '#78909C', cursor: 'pointer' }}>Hoy</button>
                        </div>

                        <div className="glass-card" style={{ background: 'white', borderRadius: '18px', padding: '1.2rem', border: '1px solid rgba(61,49,46,0.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.015)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
                                {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
                                    <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 900, color: '#90A4AE', padding: '4px 0', letterSpacing: '0.3px', textTransform: 'uppercase' }}>{d}</div>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                {Array.from({ length: startDow }).map((_, i) => (
                                    <div key={`empty-${i}`} />
                                ))}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const dayNum = i + 1;
                                    const dateStr = `${refMonthDate.getFullYear()}-${String(refMonthDate.getMonth()+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
                                    const stats = statsByDate[dateStr];
                                    const isToday = dateStr === todayFull;
                                    const isFuture = dateStr > todayFull;
                                    const pct = stats && stats.total > 0 ? stats.done / stats.total : null;

                                    let bg = '#F8FAFC';
                                    let textColor = '#B0BEC5';
                                    if (!isFuture && stats) {
                                        if (pct === 1) { bg = '#6BCB77'; textColor = 'white'; }
                                        else if (pct! >= 0.5) { bg = '#FFD166'; textColor = '#5A4400'; }
                                        else if (pct! > 0) { bg = '#FFA07A'; textColor = 'white'; }
                                        else { bg = '#F1F5F9'; textColor = '#94A3B8'; }
                                    }

                                    return (
                                        <div key={dayNum} style={{
                                            background: bg,
                                            borderRadius: '10px',
                                            padding: '8px 4px 6px',
                                            textAlign: 'center',
                                            border: isToday ? '2px solid #944a18' : '2px solid transparent',
                                            transition: 'all 0.15s',
                                            minHeight: '56px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '2px'
                                        }}>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 900, color: isToday ? '#944a18' : textColor }}>{dayNum}</span>
                                            {stats && stats.total > 0 && (
                                                <>
                                                    <span style={{ fontSize: '0.58rem', fontWeight: 800, color: textColor, opacity: 0.9 }}>{stats.done}/{stats.total}</span>
                                                    <div style={{ width: '70%', height: '3px', background: 'rgba(0,0,0,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${(pct! * 100)}%`, height: '100%', background: pct === 1 ? 'rgba(255,255,255,0.7)' : '#944a18', borderRadius: '2px' }} />
                                                    </div>
                                                </>
                                            )}
                                            {!stats && !isFuture && (
                                                <span style={{ fontSize: '0.55rem', color: '#CBD5E1', fontWeight: 700 }}>—</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#90A4AE' }}>Leyenda:</span>
                                {[ ['#6BCB77', '100%'], ['#FFD166', '≥50%'], ['#FFA07A', '<50%'], ['#F1F5F9', 'Sin datos'] ].map(([c, l]) => (
                                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: c }} />
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#90A4AE' }}>{l}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ─── SUB-VISTA: ANUAL ─── */}
            {semanalSubView === 'anual' && (() => {
                const statsByDate: Record<string, { total: number; done: number }> = {};
                dailyBlocks.forEach(b => {
                    if (b.date.startsWith(String(viewYear))) {
                        if (!statsByDate[b.date]) statsByDate[b.date] = { total: 0, done: 0 };
                        statsByDate[b.date].total++;
                        if (b.completed) statsByDate[b.date].done++;
                    }
                });

                const yearStart = new Date(viewYear, 0, 1);
                const firstMonday = new Date(yearStart);
                const dowStart = (yearStart.getDay() + 6) % 7; 
                firstMonday.setDate(yearStart.getDate() - dowStart);

                const weeks: { date: string; dayNum: number; month: number }[][] = [];
                const cursor = new Date(firstMonday);
                for (let w = 0; w < 53; w++) {
                    const week = [];
                    for (let d = 0; d < 7; d++) {
                        week.push({
                            date: cursor.toLocaleDateString('en-CA'),
                            dayNum: cursor.getDate(),
                            month: cursor.getMonth()
                        });
                        cursor.setDate(cursor.getDate() + 1);
                    }
                    weeks.push(week);
                }

                const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                const todayFull = new Date().toLocaleDateString('en-CA');

                const getColor = (dateStr: string) => {
                    if (dateStr > todayFull) return '#F8FAFC'; 
                    const s = statsByDate[dateStr];
                    if (!s || s.total === 0) return '#EDF2F7';
                    const pct = s.done / s.total;
                    if (pct === 1)    return '#22C55E';
                    if (pct >= 0.75)  return '#4ADE80';
                    if (pct >= 0.5)   return '#86EFAC';
                    if (pct >= 0.25)  return '#BBF7D0';
                    return '#DCFCE7';
                };

                const yearDone  = Object.values(statsByDate).reduce((a,s) => a + s.done, 0);
                const yearTotal = Object.values(statsByDate).reduce((a,s) => a + s.total, 0);
                const streak = (() => {
                    let s = 0;
                    const d = new Date();
                    while (true) {
                        const ds = d.toLocaleDateString('en-CA');
                        const st = statsByDate[ds];
                        if (!st || st.done === 0) break;
                        s++;
                        d.setDate(d.getDate() - 1);
                    }
                    return s;
                })();

                return (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.2rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', padding: '3px 8px', borderRadius: '12px', border: '1px solid #ECEFF1' }}>
                                <button onClick={() => setViewYear(y => y-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78909C', padding: '4px', display: 'flex', alignItems: 'center' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
                                </button>
                                <span style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--text-carbon)', minWidth: '60px', textAlign: 'center' }}>{viewYear}</span>
                                <button onClick={() => setViewYear(y => y+1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78909C', padding: '4px', display: 'flex', alignItems: 'center' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <div style={{ background: 'white', borderRadius: '12px', padding: '6px 14px', border: '1px solid #ECEFF1', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#22C55E' }}>{yearDone}</div>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#90A4AE' }}>completadas</div>
                                </div>
                                <div style={{ background: 'white', borderRadius: '12px', padding: '6px 14px', border: '1px solid #ECEFF1', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#944a18' }}>{yearTotal > 0 ? Math.round((yearDone/yearTotal)*100) : 0}%</div>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#90A4AE' }}>efectividad</div>
                                </div>
                                <div style={{ background: 'white', borderRadius: '12px', padding: '6px 14px', border: '1px solid #ECEFF1', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FF6B6B' }}>🔥 {streak}</div>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#90A4AE' }}>días racha</div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card" style={{ background: 'white', borderRadius: '18px', padding: '1.2rem 1rem', border: '1px solid rgba(61,49,46,0.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.015)', overflowX: 'auto' }}>
                            <div style={{ display: 'flex', gap: '0', minWidth: '680px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '4px', paddingTop: '20px' }}>
                                    {['L','M','X','J','V','S','D'].map(d => (
                                        <div key={d} style={{ height: '11px', fontSize: '0.55rem', fontWeight: 800, color: '#B0BEC5', display: 'flex', alignItems: 'center' }}>{d}</div>
                                    ))}
                                </div>

                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weeks.length}, 1fr)`, gap: '2px', marginBottom: '2px' }}>
                                        {weeks.map((week, wi) => {
                                            const firstOfMonth = week.find(d => d.dayNum === 1 || (wi === 0 && d.month === (new Date(viewYear, 0, 1)).getMonth()));
                                            return (
                                                <div key={wi} style={{ fontSize: '0.52rem', fontWeight: 900, color: '#90A4AE', textAlign: 'left', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                    {firstOfMonth && week[0].dayNum <= 7 ? MONTHS_ES[firstOfMonth.month] : ''}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weeks.length}, 1fr)`, gap: '2px' }}>
                                        {weeks.map((week, wi) =>
                                            week.map((day, di) => {
                                                const inYear = day.date.startsWith(String(viewYear));
                                                const color  = inYear ? getColor(day.date) : 'transparent';
                                                const isToday = day.date === todayFull;
                                                const s = statsByDate[day.date];
                                                const tip = s ? `${day.date}: ${s.done}/${s.total}` : day.date;
                                                return (
                                                    <div
                                                        key={`${wi}-${di}`}
                                                        title={tip}
                                                        style={{
                                                            width: '100%',
                                                            aspectRatio: '1',
                                                            background: color,
                                                            borderRadius: '2px',
                                                            border: isToday ? '1px solid #944a18' : '1px solid transparent',
                                                            transition: 'opacity 0.1s',
                                                            cursor: s ? 'pointer' : 'default'
                                                        }}
                                                    />
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '6px', marginTop: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#90A4AE' }}>Menos</span>
                                {['#EDF2F7','#DCFCE7','#BBF7D0','#86EFAC','#4ADE80','#22C55E'].map(c => (
                                    <div key={c} style={{ width: '12px', height: '12px', borderRadius: '2px', background: c }} />
                                ))}
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#90A4AE' }}>Más</span>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* SUGERENCIAS DEL ECOSISTEMA 💡 */}
            {semanalSubView === 'semana' && (
                <div style={{ marginTop: '3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                        <span className="material-symbols-outlined" style={{ color: '#4858ab', fontSize: '24px' }}>tips_and_updates</span>
                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#191c1d' }}>Sugerencias del Ecosistema</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                        {SUGGESTIONS.map((sug, idx) => {
                            let color = '#944a18'; // primary
                            let bg = 'rgba(148, 74, 24, 0.1)';
                            if (sug.icon === 'menu_book') {
                                color = '#4858ab'; // secondary
                                bg = 'rgba(72, 88, 171, 0.1)';
                            } else if (sug.icon === 'mediation') {
                                color = '#785900'; // tertiary
                                bg = 'rgba(120, 89, 0, 0.1)';
                            }

                            return (
                                <motion.div
                                    key={idx}
                                    className="glass-card"
                                    onClick={() => handleAddSuggestion(sug)}
                                    whileHover={{ y: -4, boxShadow: '0 8px 20px rgba(0,0,0,0.05)' }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.7)',
                                        border: '1px solid rgba(255,255,255,0.5)',
                                        borderRadius: '16px', // rounded-2xl
                                        padding: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                                        transition: 'box-shadow 0.2s, transform 0.2s'
                                    }}
                                >
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px', // rounded-xl
                                        backgroundColor: bg,
                                        color: color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{sug.icon}</span>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#191c1d' }}>{sug.text}</p>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#54433a', opacity: 0.7 }}>{sug.label}</p>
                                    </div>
                                    <button 
                                        className="material-symbols-outlined"
                                        style={{ 
                                            background: 'none', 
                                            border: 'none', 
                                            cursor: 'pointer', 
                                            color: '#877369', // text-outline
                                            fontSize: '24px', 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            transition: 'color 0.15s'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.color = '#944a18'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.color = '#877369'; }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddSuggestion(sug);
                                        }}
                                    >
                                        add_circle
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
