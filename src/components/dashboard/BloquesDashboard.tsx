import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, ChevronLeft, ChevronRight, Sun, Sunrise, Moon, Settings, Check, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { DailyBlock } from '../../hooks/useAlDiaState';

interface BloquesDashboardProps {
    dailyBlocks: DailyBlock[];
    addDailyBlock: (label: string, period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro', date: string, completed?: boolean) => void;
    toggleDailyBlock: (id: number) => void;
    removeDailyBlock: (id: number) => void;
    updateDailyBlock: (id: number, updates: Partial<DailyBlock>) => void;
}

export const BloquesDashboard = ({
    dailyBlocks,
    addDailyBlock,
    toggleDailyBlock,
    removeDailyBlock,
    updateDailyBlock
}: BloquesDashboardProps) => {
    // 📅 Fecha de referencia para la semana actual
    const [referenceDate, setReferenceDate] = useState(() => new Date());

    const [newBlockText, setNewBlockText] = useState('');
    const [newBlockPeriod, setNewBlockPeriod] = useState<'Mañana' | 'Tarde' | 'Noche' | 'Otro'>('Mañana');
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');

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
                label: dayName.charAt(0).toUpperCase() + dayName.slice(1, 3),
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

    const getWeekRangeLabel = () => {
        const first = new Date(weekDays[0].date + 'T00:00:00');
        const last = new Date(weekDays[6].date + 'T00:00:00');
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
        return `${first.toLocaleDateString('es-ES', options)} - ${last.toLocaleDateString('es-ES', options)}`;
    };

    // Obtener todas las definiciones únicas de bloques de enfoque para esta semana
    const blockRows = useMemo(() => {
        const uniqueKeys = new Set<string>();
        const rows: { key: string; label: string; period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro' }[] = [];

        // Buscamos bloques de enfoque dentro de los 7 días mostrados
        const weekDates = weekDays.map(d => d.date);
        const weekBlocks = dailyBlocks.filter(b => weekDates.includes(b.date));

        weekBlocks.forEach(b => {
            const key = `${b.label.toLowerCase()}-${b.period}`;
            if (!uniqueKeys.has(key)) {
                uniqueKeys.add(key);
                rows.push({ key, label: b.label, period: b.period });
            }
        });

        // Ordenar filas por período
        const order = { 'Mañana': 0, 'Tarde': 1, 'Noche': 2, 'Otro': 3 };
        return rows.sort((a, b) => order[a.period] - order[b.period]);
    }, [dailyBlocks, weekDays]);

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
            // Si no existe, crearlo directamente completado para ese día
            addDailyBlock(label, period, date, true);

            // Confeti si al crearlo completado, todos los bloques de ese día están completados
            const dayBlocks = dailyBlocks.filter(b => b.date === date);
            const incompleteCount = dayBlocks.filter(b => !b.completed).length;
            if (incompleteCount === 0) { // Al crear este completado, ya no quedan incompletos
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

        // Se agrega inicialmente para el día de hoy o para el primer día de la semana mostrada
        const defaultDate = weekDays.some(d => d.isToday) 
            ? new Date().toLocaleDateString('en-CA') 
            : weekDays[0].date;

        addDailyBlock(newBlockText.trim(), newBlockPeriod, defaultDate);
        setNewBlockText('');
    };

    // Eliminar bloque (Elimina la fila completa, es decir, todos los bloques correspondientes de la semana)
    const handleRemoveRow = (label: string, period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro') => {
        const weekDates = weekDays.map(d => d.date);
        const toRemove = dailyBlocks.filter(b => 
            b.label.toLowerCase() === label.toLowerCase() && 
            b.period === period && 
            weekDates.includes(b.date)
        );
        toRemove.forEach(b => removeDailyBlock(b.id));
    };

    // Guardar cambios en el nombre del bloque para toda la semana
    const handleSaveRowName = (oldLabel: string, period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro') => {
        if (!editingText.trim() || editingText.trim() === oldLabel) {
            setEditingRowId(null);
            return;
        }

        const weekDates = weekDays.map(d => d.date);
        dailyBlocks.forEach(b => {
            if (b.label.toLowerCase() === oldLabel.toLowerCase() && b.period === period && weekDates.includes(b.date)) {
                updateDailyBlock(b.id, { label: editingText.trim() });
            }
        });
        setEditingRowId(null);
    };

    const getPeriodStyles = (period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro') => {
        switch (period) {
            case 'Mañana':
                return { icon: <Sunrise size={13} />, color: '#E06A3B', bg: '#FDF0EA', label: 'Mañana' };
            case 'Tarde':
                return { icon: <Sun size={13} />, color: '#D47D00', bg: '#FFF7E6', label: 'Tarde' };
            case 'Noche':
                return { icon: <Moon size={13} />, color: '#6A29C5', bg: '#F3ECFC', label: 'Noche' };
            default:
                return { icon: <Settings size={13} />, color: '#5A6E72', bg: '#F0F3F4', label: 'Otro' };
        }
    };

    return (
        <div style={{ padding: '0.5rem 0 2rem 0', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Cabecera del Dashboard */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-carbon)', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🧱 Registro de Enfoque Semanal
                    </h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#8A9A9D', fontWeight: 600 }}>Estructura tus prioridades diarias y haz seguimiento visual de tu semana.</p>
                </div>

                {/* Selector de Semana */}
                <div className="glass-card" style={{ display: 'flex', alignItems: 'center', padding: '3px 8px', gap: '4px', borderRadius: '12px', background: 'white', border: '1px solid rgba(61,49,46,0.06)' }}>
                    <button
                        onClick={() => adjustWeek(-1)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#5A6E72', display: 'flex', alignItems: 'center', borderRadius: '6px' }}
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-carbon)', minWidth: '130px', textAlign: 'center', letterSpacing: '-0.1px' }}>
                        {getWeekRangeLabel()}
                    </span>
                    <button
                        onClick={() => adjustWeek(1)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#5A6E72', display: 'flex', alignItems: 'center', borderRadius: '6px' }}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Formulario Compacto de Nueva Fila */}
            <form onSubmit={handleAddRow} className="glass-card" style={{ padding: '0.8rem 1rem', borderRadius: '18px', background: 'white', marginBottom: '1rem', border: '1px solid rgba(61,49,46,0.05)', boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
                        <input
                            type="text"
                            value={newBlockText}
                            onChange={(e) => setNewBlockText(e.target.value)}
                            placeholder="Nuevo bloque de enfoque... (ej: Programar Delva, Gimnasio, Estudiar)"
                            style={{
                                flex: 1,
                                border: '1px solid #ECEFF1',
                                borderRadius: '10px',
                                padding: '8px 12px',
                                fontSize: '0.82rem',
                                outline: 'none',
                                transition: 'all 0.2s',
                                fontWeight: 600,
                                color: 'var(--text-carbon)'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--domain-orange)'}
                            onBlur={(e) => e.target.style.borderColor = '#ECEFF1'}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Selector de Período */}
                        <div style={{ display: 'flex', background: '#F0F3F4', padding: '2px', borderRadius: '10px', gap: '2px' }}>
                            {(['Mañana', 'Tarde', 'Noche', 'Otro'] as const).map((p) => {
                                const styles = getPeriodStyles(p);
                                const isSelected = newBlockPeriod === p;
                                return (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setNewBlockPeriod(p)}
                                        style={{
                                            border: 'none',
                                            background: isSelected ? 'white' : 'transparent',
                                            color: isSelected ? styles.color : '#78909C',
                                            padding: '5px 10px',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {styles.icon}
                                        <span className="desktop-only">{styles.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="submit"
                            style={{
                                background: 'var(--domain-orange)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '8px 16px',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 6px rgba(255, 140, 66, 0.15)'
                            }}
                        >
                            <Plus size={14} strokeWidth={2.5} />
                            <span>Añadir</span>
                        </button>
                    </div>
                </div>
            </form>

            {/* Base de Datos Estilo Notion */}
            <div className="glass-card" style={{ background: 'white', borderRadius: '18px', border: '1px solid rgba(61,49,46,0.06)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.015)' }}>
                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                        <thead>
                            <tr style={{ background: '#FAF9F8', borderBottom: '1px solid #ECEFF1' }}>
                                <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 800, color: '#78909C', width: '35%', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Bloque de Enfoque</th>
                                <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 800, color: '#78909C', width: '15%', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Jornada</th>
                                {weekDays.map(day => (
                                    <th key={day.date} style={{ padding: '10px 8px', fontSize: '0.72rem', fontWeight: 800, color: day.isToday ? 'var(--domain-orange)' : '#78909C', width: '6.5%', textAlign: 'center', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.62rem', fontWeight: 900, opacity: day.isToday ? 1 : 0.7 }}>{day.label}</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 900, marginTop: '1px', background: day.isToday ? '#FFEFE6' : 'transparent', color: day.isToday ? 'var(--domain-orange)' : 'inherit', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                                                {day.dayNum}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                                <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 800, color: '#78909C', width: '5%', textAlign: 'right' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence initial={false}>
                                {blockRows.length > 0 ? (
                                    blockRows.map((row) => {
                                        const styles = getPeriodStyles(row.period);
                                        const isEditing = editingRowId === row.key;

                                        return (
                                            <motion.tr
                                                key={row.key}
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                transition={{ duration: 0.15 }}
                                                style={{ borderBottom: '1px solid #F1F3F4', transition: 'background-color 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FCFCFC'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                {/* Nombre del bloque (editable) */}
                                                <td style={{ padding: '8px 14px', verticalAlign: 'middle' }}>
                                                    {isEditing ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <input
                                                                type="text"
                                                                value={editingText}
                                                                onChange={(e) => setEditingText(e.target.value)}
                                                                style={{
                                                                    border: '1px solid var(--domain-orange)',
                                                                    borderRadius: '6px',
                                                                    padding: '4px 8px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 700,
                                                                    outline: 'none',
                                                                    color: 'var(--text-carbon)',
                                                                    width: '100%',
                                                                    maxWidth: '220px'
                                                                }}
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleSaveRowName(row.label, row.period);
                                                                    if (e.key === 'Escape') setEditingRowId(null);
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => handleSaveRowName(row.label, row.period)}
                                                                style={{ background: '#4ade80', color: 'white', border: 'none', borderRadius: '6px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                            >
                                                                <Check size={12} strokeWidth={3} />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingRowId(null)}
                                                                style={{ background: '#f87171', color: 'white', border: 'none', borderRadius: '6px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                            >
                                                                <X size={12} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span 
                                                            style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-carbon)', cursor: 'pointer' }}
                                                            onClick={() => {
                                                                setEditingRowId(row.key);
                                                                setEditingText(row.label);
                                                            }}
                                                            title="Haz clic para editar nombre"
                                                        >
                                                            {row.label}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Jornada Badge */}
                                                <td style={{ padding: '8px 14px', verticalAlign: 'middle' }}>
                                                    <div style={{
                                                        background: styles.bg,
                                                        color: styles.color,
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.68rem',
                                                        fontWeight: 800,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        {styles.icon}
                                                        <span>{styles.label}</span>
                                                    </div>
                                                </td>

                                                {/* Celdas de los Días de la Semana */}
                                                {weekDays.map(day => {
                                                    const block = dailyBlocks.find(b => 
                                                        b.label.toLowerCase() === row.label.toLowerCase() && 
                                                        b.period === row.period && 
                                                        b.date === day.date
                                                    );

                                                    const isCompleted = block ? block.completed : false;

                                                    return (
                                                        <td 
                                                            key={day.date} 
                                                            style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle' }}
                                                        >
                                                            <button
                                                                onClick={() => handleCellToggle(row.label, row.period, day.date)}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    padding: 0,
                                                                    cursor: 'pointer',
                                                                    margin: '0 auto',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    outline: 'none'
                                                                }}
                                                            >
                                                                <div 
                                                                    style={{
                                                                        width: '20px',
                                                                        height: '20px',
                                                                        borderRadius: '5px', // Formato Notion cuadrado suave
                                                                        border: isCompleted ? 'none' : '2px solid #CFD8DC',
                                                                        background: isCompleted ? 'var(--domain-orange)' : 'transparent',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        color: 'white',
                                                                        transition: 'all 0.15s ease',
                                                                        boxShadow: isCompleted ? '0 2px 4px rgba(255, 140, 66, 0.15)' : 'none'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        if (!isCompleted) e.currentTarget.style.borderColor = 'var(--domain-orange)';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        if (!isCompleted) e.currentTarget.style.borderColor = '#CFD8DC';
                                                                    }}
                                                                >
                                                                    {isCompleted ? (
                                                                        <Check size={13} strokeWidth={3.5} />
                                                                    ) : (
                                                                        <span style={{ fontSize: '0.65rem', color: '#ECEFF1', fontWeight: 900 }}>+</span>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        </td>
                                                    );
                                                })}

                                                {/* Acción eliminar */}
                                                <td style={{ padding: '8px 14px', textAlign: 'right', verticalAlign: 'middle' }}>
                                                    <button
                                                        onClick={() => handleRemoveRow(row.label, row.period)}
                                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#e57373', padding: '4px', display: 'inline-flex', alignItems: 'center', opacity: 0.3, transition: 'opacity 0.2s' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.3'}
                                                        title="Eliminar fila completa"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={10} style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
                                                <span style={{ fontSize: '2.5rem' }}>🧱</span>
                                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-carbon)' }}>
                                                    Sin bloques registrados
                                                </h4>
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#90A4AE', maxWidth: '300px', lineHeight: 1.4 }}>
                                                    Introduce un bloque en el formulario superior para crear una fila y empezar a marcar tu semana.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
