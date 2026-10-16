import { Plus, Check, Trash2, Calendar, LayoutGrid, Clock, Edit2, GripVertical, Leaf, Folder, MoreVertical } from 'lucide-react';
import type { Habit, Routine, Project } from '../../hooks/useAlDiaState';
import { motion, AnimatePresence, Reorder, MotionConfig } from 'framer-motion';
import { useState } from 'react';
import { RoutineEditOverlay } from '../features/RoutineEditOverlay';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { C, MONO, useIsMobile, paddingPagina } from '../../theme';

/* ── Estilos compartidos por las 3 sub-pestañas de Vida ─────────────
   Rutina, Hábitos y Horario usan el mismo lenguaje: encabezado con
   título + ayuda + botón pastilla, tarjetas bento y alta en línea. */
const vidaTitulo: React.CSSProperties = { margin: 0, fontSize: '1.15rem', fontWeight: 800, color: C.onSurface, letterSpacing: '-0.01em' };
const vidaAyuda: React.CSSProperties = { margin: '0 0 1rem', fontSize: '0.8rem', color: C.onSurfaceVariant, fontWeight: 500, lineHeight: 1.4 };
const vidaBotonAlta = (color: string): React.CSSProperties => ({
    background: color, color: '#fff', border: 'none', borderRadius: '999px',
    padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '6px',
    cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', fontFamily: 'inherit',
    boxShadow: `0 4px 14px ${color}40`, flexShrink: 0,
});
const vidaCard = (accent: string): React.CSSProperties => ({
    background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`,
    borderLeft: `4px solid ${accent}`, borderRadius: '14px',
    padding: '0.95rem 1.05rem', marginBottom: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
});
const vidaInput: React.CSSProperties = {
    flex: 1, background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`,
    borderRadius: '12px', padding: '10px 14px', fontSize: '0.9rem',
    fontWeight: 600, color: C.onSurface, outline: 'none', fontFamily: 'inherit',
};
const vidaInputBtn = (primary: boolean): React.CSSProperties => ({
    background: primary ? C.primary : C.surfaceContainerHigh,
    color: primary ? '#fff' : C.onSurfaceVariant, border: 'none', borderRadius: '12px',
    padding: primary ? '10px 16px' : '10px 14px', fontWeight: 700, fontSize: '0.82rem',
    cursor: 'pointer', fontFamily: 'inherit',
});
// Botón de ícono chico en cada tarea del horario (hora, hábito, proyecto, quitar).
const iconoFila = (activo: boolean, fondo = 'transparent'): React.CSSProperties => ({
    background: activo ? fondo : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer',
    padding: '4px 5px', display: 'flex', alignItems: 'center', flexShrink: 0,
});
const menuItem = (color: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', background: 'none', border: 'none',
    padding: '9px 12px', cursor: 'pointer', color, fontSize: '0.78rem', fontWeight: 600, textAlign: 'left', fontFamily: 'inherit',
});
// Los íconos de acción de cada tarea se muestran al pasar el mouse; en celular siempre (más tenues).
const HORARIO_CSS = `
.hz-item .hz-acc { opacity: 0; transition: opacity .15s; }
.hz-item:hover .hz-acc, .hz-item:focus-within .hz-acc { opacity: 1; }
@media (hover: none) { .hz-item .hz-acc { opacity: .55; } }
`;
const vidaVacio = (icon: string, text: string): React.ReactElement => (
    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: C.onSurfaceVariant }}>
        <span className="material-symbols-outlined" style={{ fontSize: '40px', color: C.outlineVariant, display: 'block', marginBottom: '10px' }}>{icon}</span>
        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{text}</p>
    </div>
);

/* Formulario de alta en línea, idéntico en las 3 pestañas. */
const InlineAdd = ({ placeholder, value, onChange, onSubmit, onCancel }: {
    placeholder: string; value: string;
    onChange: (v: string) => void; onSubmit: () => void; onCancel: () => void;
}) => (
    <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        style={{ marginBottom: '1rem' }}
    >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
                autoFocus value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
                placeholder={placeholder}
                style={vidaInput}
            />
            <button type="submit" style={vidaInputBtn(true)}>Añadir</button>
            <button type="button" onClick={onCancel} style={vidaInputBtn(false)}>Cancelar</button>
        </div>
    </form>
);

interface VidaProps {
    habits: Habit[];
    toggleHabit: (id: number, dayIndex: number) => void;
    addHabit: (name: string, schedule?: number[], linkedRoutineId?: number, linkedRoutineItemId?: number) => void;
    removeHabit: (id: number) => void;
    projects: Project[];
    rutinas: Routine[];
    addRoutineItem: (routineId: number, text: string) => void;
    toggleRoutineItem: (routineId: number, itemId: number) => void;
    removeRoutineItem: (routineId: number, itemId: number) => void;
    updateRoutine: (id: number, updates: Partial<Routine>) => void;
    updateRoutineItem: (routineId: number, itemId: number, updates: Partial<{ 
        text: string, completed: boolean, time: string, 
        linkedProjectId?: number, linkedTaskId?: number 
    }>) => void;
    addRoutine: (title: string) => void;
    removeRoutine: (id: number) => void;
    reorderRoutineItems: (routineId: number, newItems: any[]) => void;
    promoteRoutineItemToProject: (routineId: number, itemId: number, projectId: number) => void;
    /** Limita el panel: 'habitos' solo la columna de Hábitos, 'horario' solo la de Horario. */
    only?: 'habitos' | 'horario';
}

export const VidaDashboard = ({
    habits, toggleHabit, addHabit, removeHabit,
    rutinas, addRoutineItem, toggleRoutineItem, removeRoutineItem, updateRoutine,
    updateRoutineItem, addRoutine, removeRoutine, reorderRoutineItems,
    projects, promoteRoutineItemToProject, only
}: VidaProps) => {
    const [viewMode, setViewMode] = useState<'hoy' | 'semana'>('hoy');
    // Arrastre de bloques en la vista Semana: qué bloque se agarra (y de qué día
    // y hora de la celda) y sobre qué celda está pasando.
    const [drag, setDrag] = useState<{ id: number; day: number; hour: number } | null>(null);
    const [dropCell, setDropCell] = useState<{ day: number; hour: number } | null>(null);
    const toMinutes = (t: string) => { const [h, m] = t.split(':'); return parseInt(h) * 60 + (parseInt(m) || 0); };
    const fmtMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    // Suelta el bloque en (day, hour): el horario se corre las horas que
    // hay entre la celda agarrada y la de destino (el bloque entero, sus
    // minutos se conservan) y ese día de la semana pasa al día de destino.
    const soltarBloque = (day: number, hour: number) => {
        const d = drag;
        setDrag(null); setDropCell(null);
        if (!d) return;
        const r = rutinas.find(x => x.id === d.id);
        if (!r || !r.startTime || !r.endTime) return;
        const delta = (hour - d.hour) * 60;
        const ns = toMinutes(r.startTime) + delta, ne = toMinutes(r.endTime) + delta;
        if (ns < 6 * 60 || ne > 24 * 60) return; // fuera de la grilla 06:00–24:00
        const updates: Partial<Routine> = {};
        if (delta !== 0) { updates.startTime = fmtMinutes(ns); updates.endTime = ne === 24 * 60 ? '23:59' : fmtMinutes(ne); }
        if (day !== d.day) {
            const dias = (r.repeatDays || []).filter(x => x !== d.day);
            if (!dias.includes(day)) dias.push(day);
            updates.repeatDays = dias.sort((a, b) => a - b);
        }
        if (Object.keys(updates).length) updateRoutine(r.id, updates);
    };
    const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
    const [linkingItem, setLinkingItem] = useState<{ rId: number, iId: number } | null>(null);
    const [addingBlock, setAddingBlock] = useState(false);
    const [newBlockName, setNewBlockName] = useState('');
    const [deletingBlock, setDeletingBlock] = useState<Routine | null>(null);
    const [addingHabit, setAddingHabit] = useState(false);
    const [newHabitName, setNewHabitName] = useState('');
    const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);
    const [menuBloque, setMenuBloque] = useState<number | null>(null);
    const [horaAbierta, setHoraAbierta] = useState<number | null>(null);
    const movil = useIsMobile();
    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const todayStr = new Date().toLocaleDateString('en-CA');
    const normalizedDay = (new Date().getDay() + 6) % 7;

    return (
        <div style={paddingPagina(movil)}>
            <style>{`
                .vida-layout {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                    align-items: start;
                }
                .vida-layout > * { min-width: 0; }
                .vida-main-container {
                    padding: 1.2rem;
                    background: white;
                    border-radius: 24px;
                    border: 1px solid rgba(138, 92, 246, 0.1);
                    transition: all 0.3s ease;
                }
                .time-input-clean::-webkit-calendar-picker-indicator {
                    display: none;
                    -webkit-appearance: none;
                }
                .time-input-clean {
                    text-align: center;
                }
                @media (min-width: 1024px) {
                    .vida-layout {
                        grid-template-columns: 380px 1fr;
                    }
                    .vida-main-container {
                        background: transparent;
                        border: none;
                        padding: 0;
                        box-shadow: none;
                    }
                }
                @media (max-width: 1023px) {
                    .vida-main-container {
                        box-shadow: 0 10px 30px rgba(0,0,0,0.03);
                    }
                }
                .habitos-col {
                    position: sticky;
                    top: 2rem;
                }
            `}</style>
            
            <div className="vida-layout" style={only ? { gridTemplateColumns: '1fr', maxWidth: only === 'horario' ? undefined : 760 } : undefined}>
            {/* MOTOR DE HÁBITOS (SECCIÓN PRINCIPAL) */}
            {only !== 'horario' && (
            <div className="habitos-col" style={only ? { position: 'static' } : undefined}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                    <h3 style={vidaTitulo}>🌿 Hábitos</h3>
                    <button onClick={() => { setAddingHabit(true); setNewHabitName(''); }} style={vidaBotonAlta(C.primary)}>
                        <Plus size={15} strokeWidth={3} /> Nuevo hábito
                    </button>
                </div>
                <p style={vidaAyuda}>
                    Cosas que quieres hacer con constancia. Se miden por racha, no por hora.
                </p>

                {addingHabit && (
                    <InlineAdd
                        placeholder="Nombre del hábito (ej. Leer 15 min)"
                        value={newHabitName}
                        onChange={setNewHabitName}
                        onSubmit={() => { const n = newHabitName.trim(); if (n) addHabit(n); setNewHabitName(''); setAddingHabit(false); }}
                        onCancel={() => setAddingHabit(false)}
                    />
                )}

                {habits.length === 0 && !addingHabit
                    ? vidaVacio('spa', 'Aún no tienes hábitos. Crea el primero.')
                    : habits.map((habit) => (
                        <div key={habit.id} style={vidaCard(C.secondary)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div
                                        onClick={() => setDeletingHabit(habit)}
                                        title="Eliminar hábito"
                                        style={{ cursor: 'pointer', opacity: 0.35, transition: 'opacity 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.35'}
                                    >
                                        <Trash2 size={13} color={C.rojo} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: C.onSurface }}>{habit.name}</h4>
                                        <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: C.onSurfaceVariant, fontWeight: 600 }}><span className="num">{habit.schedule?.length || 0}</span> días · racha</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '4px', background: C.surfaceContainerLow, padding: '4px', borderRadius: '10px' }}>
                                    {days.map((day, idx) => {
                                        const isScheduled = (habit.schedule || []).includes(idx);
                                        const isCompletedToday = (habit.completedDates || []).includes(todayStr);
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => toggleHabit(habit.id, idx)}
                                                style={{
                                                    width: '18px', height: '18px', borderRadius: '6px',
                                                    background: isScheduled ? C.secondary : C.surfaceLowest,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    border: isScheduled ? 'none' : `1px solid ${C.outlineVariant}`,
                                                    position: 'relative'
                                                }}
                                            >
                                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: isScheduled ? '#fff' : C.outline }}>{day}</span>
                                                {idx === normalizedDay && isCompletedToday && (
                                                    <div style={{ position: 'absolute', top: -2, right: -2, width: '6px', height: '6px', borderRadius: '50%', background: C.verde, border: '1px solid white' }} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
            </div>
            )}

            {/* SECCIÓN DE HORARIO */}
            {only !== 'habitos' && (
            <div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.4rem',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={vidaTitulo}>⏰ Horario</h3>
                        <div style={{ display: 'flex', background: C.surfaceContainerLow, padding: '4px', borderRadius: '10px', gap: '4px' }}>
                            {([['hoy', 'Lista', LayoutGrid], ['semana', 'Semana', Calendar]] as const).map(([m, lbl, Icon]) => (
                                <button
                                    key={m}
                                    onClick={() => setViewMode(m)}
                                    style={{
                                        background: 'transparent', position: 'relative',
                                        border: 'none', padding: '5px 10px', borderRadius: '7px', cursor: 'pointer',
                                        fontSize: '0.68rem', fontWeight: 700, fontFamily: 'inherit',
                                        color: viewMode === m ? C.primary : C.onSurfaceVariant,
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        transition: 'color 0.2s',
                                    }}
                                >
                                    {viewMode === m && (
                                        <motion.span
                                            layoutId="horario-modo-pill"
                                            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                                            style={{ position: 'absolute', inset: 0, borderRadius: '7px', background: C.surfaceLowest, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                                        />
                                    )}
                                    <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}><Icon size={12} /> {lbl}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <button onClick={() => { setAddingBlock(true); setNewBlockName(''); }} style={vidaBotonAlta(C.primary)}>
                        <Plus size={15} strokeWidth={3} /> Nuevo bloque
                    </button>
                </div>
                <p style={vidaAyuda}>
                    Tu horario tipo: bloques con hora fija. Se ven en el Calendario.
                </p>

                {addingBlock && (
                    <InlineAdd
                        placeholder="Nombre del bloque (ej. Bloque productivo)"
                        value={newBlockName}
                        onChange={setNewBlockName}
                        onSubmit={() => { const n = newBlockName.trim(); if (n) addRoutine(n); setNewBlockName(''); setAddingBlock(false); }}
                        onCancel={() => setAddingBlock(false)}
                    />
                )}

                <style>{HORARIO_CSS}</style>
                <MotionConfig reducedMotion="user">
                <AnimatePresence mode="wait">
                    {viewMode === 'hoy' ? (
                        <motion.div
                            key="hoy"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            style={{
                                display: 'grid',
                                // Escritorio: 2 o 3 bloques por fila según el ancho (nunca más de 3); celular: uno debajo de otro.
                                gridTemplateColumns: movil ? '1fr' : 'repeat(auto-fill, minmax(max(300px, calc((100% - 20px) / 3)), 1fr))',
                                gap: '10px', alignItems: 'start',
                            }}
                        >
                            {(() => {
                                let displayRutinas = [...rutinas];
                                displayRutinas.sort((a, b) =>
                                    (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1)
                                    || (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
                                if (displayRutinas.length === 0 && !addingBlock) {
                                    return vidaVacio('schedule', 'Aún no tienes bloques. Crea el primero.');
                                }
                                return displayRutinas.map((rutina, idx) => {
                                    const hechas = rutina.items.filter(i => i.completed).length;
                                    const aMin = (t?: string) => t ? parseInt(t.slice(0, 2)) * 60 + parseInt(t.slice(3, 5)) : -1;
                                    const cruza = rutinas.find(o => o.id !== rutina.id && o.isActive && rutina.isActive
                                        && o.startTime && o.endTime && rutina.startTime && rutina.endTime
                                        && aMin(o.startTime) < aMin(rutina.endTime) && aMin(rutina.startTime) < aMin(o.endTime)
                                        && (o.repeatDays || []).some(d => (rutina.repeatDays || []).includes(d)));
                                    const tocaHoy = (rutina.repeatDays || []).includes(normalizedDay);
                                    return (
                                    <motion.div
                                        key={rutina.id}
                                        layout="position"
                                        initial={{ opacity: 0, y: 14 }}
                                        animate={{ opacity: rutina.isActive ? 1 : 0.55, y: 0 }}
                                        transition={{ duration: 0.25, ease: 'easeOut', delay: Math.min(idx, 8) * 0.04 }}
                                        style={{ background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: '14px', position: 'relative', minWidth: 0, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}
                                    >
                                    {/* Cabecera del bloque */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: movil ? '10px 10px 10px 12px' : '12px 12px 12px 14px', flexWrap: movil ? 'wrap' : 'nowrap' }}>
                                        {/* Franja de hora, con el color del bloque */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px', width: '62px', flexShrink: 0, padding: '6px 0', borderRadius: '10px', background: `${rutina.color}14`, borderLeft: `3px solid ${rutina.color}` }}>
                                            <input type="time" value={rutina.startTime || ''} onChange={(e) => updateRoutine(rutina.id, { startTime: e.target.value })} className="time-input-clean" title="Hora de inicio"
                                                style={{ border: 'none', background: 'transparent', fontFamily: MONO, fontSize: '0.82rem', fontWeight: 800, color: C.onSurface, outline: 'none', width: '52px', textAlign: 'center', padding: 0 }} />
                                            <input type="time" value={rutina.endTime || ''} onChange={(e) => updateRoutine(rutina.id, { endTime: e.target.value })} className="time-input-clean" title="Hora de fin"
                                                style={{ border: 'none', background: 'transparent', fontFamily: MONO, fontSize: '0.68rem', fontWeight: 600, color: C.onSurfaceVariant, outline: 'none', width: '52px', textAlign: 'center', padding: 0 }} />
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <h4 onClick={() => setEditingRoutine(rutina)} title="Editar bloque" style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: C.onSurface, cursor: 'pointer' }}>{rutina.title}</h4>
                                                {!rutina.isActive && <span style={{ fontSize: '0.62rem', fontWeight: 800, color: C.outline, border: `1px solid ${C.outlineVariant}`, borderRadius: '999px', padding: '0 7px' }}>pausado</span>}
                                                {rutina.isActive && tocaHoy && rutina.items.length > 0 && (
                                                    <span style={{ fontSize: '0.64rem', fontWeight: 800, color: hechas === rutina.items.length ? C.primary : C.onSurfaceVariant, background: hechas === rutina.items.length ? 'rgba(15,169,122,0.10)' : C.surfaceContainerLow, borderRadius: '999px', padding: '1px 8px' }}>
                                                        {hechas}/{rutina.items.length}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '5px', flexWrap: 'wrap' }}>
                                                {days.map((day, dIdx) => {
                                                    const isSet = rutina.repeatDays?.includes(dIdx);
                                                    return (
                                                        <button
                                                            key={dIdx}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const currentDays = rutina.repeatDays || [];
                                                                const nextDays = isSet ? currentDays.filter(d => d !== dIdx) : [...currentDays, dIdx];
                                                                updateRoutine(rutina.id, { repeatDays: nextDays });
                                                            }}
                                                            title={isSet ? 'Quitar este día' : 'Agregar este día'}
                                                            style={{
                                                                fontSize: '0.58rem', fontWeight: 800, width: '18px', height: '18px', padding: 0,
                                                                borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer', fontFamily: 'inherit',
                                                                background: isSet ? rutina.color : 'transparent',
                                                                color: isSet ? '#fff' : C.outline,
                                                                border: dIdx === normalizedDay ? `1.5px solid ${C.onSurface}` : isSet ? 'none' : `1px solid ${C.surfaceContainerHigh}`,
                                                            }}
                                                        >
                                                            {day}
                                                        </button>
                                                    );
                                                })}
                                                {cruza && <span style={{ fontSize: '0.66rem', fontWeight: 700, color: C.ambar, marginLeft: '6px' }}>⚠ Se cruza con {cruza.title}</span>}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: movil ? 'auto' : undefined }}>
                                            {/* Interruptor activo / pausado */}
                                            <div
                                                onClick={() => updateRoutine(rutina.id, { isActive: !rutina.isActive })}
                                                title={rutina.isActive ? 'Pausar bloque' : 'Activar bloque'}
                                                style={{
                                                    width: '34px', height: '20px', borderRadius: '20px',
                                                    background: rutina.isActive ? C.primary : C.surfaceContainerHigh,
                                                    position: 'relative', cursor: 'pointer', transition: 'background 0.25s ease', flexShrink: 0,
                                                }}
                                            >
                                                <motion.div
                                                    animate={{ x: rutina.isActive ? 16 : 2 }}
                                                    whileTap={{ scale: 0.85 }}
                                                    transition={{ type: 'spring', stiffness: 600, damping: 30 }}
                                                    style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}
                                                />
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <button onClick={() => setMenuBloque(menuBloque === rutina.id ? null : rutina.id)} title="Más opciones" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, padding: '6px 4px', display: 'flex' }}>
                                                    <MoreVertical size={16} />
                                                </button>
                                                {menuBloque === rutina.id && (
                                                    <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 20, background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.10)', overflow: 'hidden', minWidth: '150px' }}>
                                                        <button onClick={() => { setEditingRoutine(rutina); setMenuBloque(null); }} style={menuItem(C.onSurface)}><Edit2 size={13} /> Editar bloque</button>
                                                        <button onClick={() => { setDeletingBlock(rutina); setMenuBloque(null); }} style={{ ...menuItem(C.rojo), borderTop: `1px solid ${C.surfaceContainerLow}` }}><Trash2 size={13} /> Eliminar</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                        <AnimatePresence initial={false}>
                                        {rutina.isActive && (
                                            <Reorder.Group
                                                axis="y"
                                                values={rutina.items}
                                                onReorder={(newItems: any[]) => reorderRoutineItems(rutina.id, newItems)}
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.22, ease: 'easeInOut' }}
                                                style={{ display: 'flex', flexDirection: 'column', listStyle: 'none', margin: 0, padding: movil ? '0 8px 8px' : '0 10px 10px', borderTop: `1px solid ${C.surfaceContainerLow}`, overflow: 'visible' }}
                                            >
                                                {rutina.items.map(item => {
                                                    const isDone = item.completed;
                                                    const linkedHabit = habits.find(h => h.linkedRoutineItemId === item.id && h.linkedRoutineId === rutina.id);
                                                    return (
                                                        <Reorder.Item
                                                            key={item.id}
                                                            value={item}
                                                            className="hz-item"
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 4px',
                                                                borderBottom: `1px solid ${C.surfaceContainerLow}`,
                                                                cursor: 'default', listStyle: 'none', position: 'relative',
                                                            }}
                                                        >
                                                            <div className="hz-acc" style={{ cursor: 'grab', color: C.outlineVariant, display: 'flex', alignItems: 'center', touchAction: 'none' }}>
                                                                <GripVertical size={14} />
                                                            </div>

                                                            <div
                                                                onClick={() => toggleRoutineItem(rutina.id, item.id)}
                                                                style={{
                                                                    width: '18px', height: '18px', borderRadius: '6px',
                                                                    border: `2px solid ${isDone ? C.primary : C.outlineVariant}`,
                                                                    background: isDone ? C.primary : 'transparent',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                <AnimatePresence initial={false}>
                                                                    {isDone && (
                                                                        <motion.span
                                                                            initial={{ scale: 0, rotate: -30 }}
                                                                            animate={{ scale: 1, rotate: 0 }}
                                                                            exit={{ scale: 0 }}
                                                                            transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                                                                            style={{ display: 'flex' }}
                                                                        >
                                                                            <Check size={11} color="white" strokeWidth={3} />
                                                                        </motion.span>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                            <input
                                                                value={item.text}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => updateRoutineItem(rutina.id, item.id, { text: e.target.value })}
                                                                style={{
                                                                    fontSize: movil ? '16px' : '0.84rem', fontWeight: 600, minWidth: 0,
                                                                    color: isDone ? C.outline : C.onSurface,
                                                                    textDecoration: isDone ? 'line-through' : 'none',
                                                                    flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: 0, fontFamily: 'inherit',
                                                                }}
                                                            />

                                                            {/* Hora de la tarea: chip si tiene, reloj (al pasar el mouse) si no */}
                                                            {item.time || horaAbierta === item.id ? (
                                                                <input
                                                                    type="time"
                                                                    autoFocus={!item.time}
                                                                    value={item.time || ''}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={(e) => updateRoutineItem(rutina.id, item.id, { time: e.target.value })}
                                                                    onBlur={() => setHoraAbierta(null)}
                                                                    className="time-input-clean"
                                                                    style={{ border: 'none', background: C.surfaceContainerLow, borderRadius: '6px', padding: '2px 6px', fontFamily: MONO, fontSize: '0.7rem', fontWeight: 700, color: C.onSurfaceVariant, outline: 'none', width: '58px', flexShrink: 0 }}
                                                                />
                                                            ) : (
                                                                <button className="hz-acc" onClick={(e) => { e.stopPropagation(); setHoraAbierta(item.id); }} title="Poner hora" style={iconoFila(false)}>
                                                                    <Clock size={13} color={C.outline} />
                                                                </button>
                                                            )}

                                                            {/* Hábito: visible si está vinculado; si no, al pasar el mouse */}
                                                            <button
                                                                className={linkedHabit ? undefined : 'hz-acc'}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (linkedHabit) {
                                                                        if (confirm(`¿Quitar "${linkedHabit.name}" de los hábitos?`)) {
                                                                            const alsoRemoveItem = confirm('¿También eliminar esta tarea del bloque de horario?');
                                                                            removeHabit(linkedHabit.id);
                                                                            if (alsoRemoveItem) removeRoutineItem(rutina.id, item.id);
                                                                        }
                                                                    } else {
                                                                        addHabit(item.text, rutina.repeatDays, rutina.id, item.id);
                                                                    }
                                                                }}
                                                                title={linkedHabit ? 'Quitar de hábitos' : 'Convertir en hábito'}
                                                                style={iconoFila(!!linkedHabit, 'rgba(15,169,122,0.12)')}
                                                            >
                                                                <Leaf size={13} color={linkedHabit ? C.primary : C.outline} fill={linkedHabit ? C.primary : 'none'} />
                                                            </button>

                                                            {/* Proyecto: visible si está vinculado; si no, al pasar el mouse */}
                                                            <div style={{ position: 'relative', display: 'flex' }}>
                                                                <button
                                                                    className={item.linkedProjectId ? undefined : 'hz-acc'}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (item.linkedProjectId) {
                                                                            if (confirm('¿Desvincular esta tarea del proyecto?')) {
                                                                                updateRoutineItem(rutina.id, item.id, { linkedProjectId: undefined, linkedTaskId: undefined });
                                                                            }
                                                                        } else {
                                                                            setLinkingItem(linkingItem?.iId === item.id ? null : { rId: rutina.id, iId: item.id });
                                                                        }
                                                                    }}
                                                                    title={item.linkedProjectId ? `Proyecto: ${projects.find(p => p.id === item.linkedProjectId)?.name ?? ''} (tocar para desvincular)` : 'Vincular con proyecto'}
                                                                    style={iconoFila(!!item.linkedProjectId, 'rgba(67,97,238,0.12)')}
                                                                >
                                                                    <Folder size={13} color={item.linkedProjectId ? '#4361EE' : C.outline} fill={item.linkedProjectId ? '#4361EE' : 'none'} />
                                                                </button>

                                                                <AnimatePresence>
                                                                    {linkingItem?.iId === item.id && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, scale: 0.95, y: 6 }}
                                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                            exit={{ opacity: 0, scale: 0.95, y: 6 }}
                                                                            style={{
                                                                                position: 'absolute', top: '100%', right: 0, zIndex: 100,
                                                                                background: C.surfaceLowest, borderRadius: '12px', padding: '8px',
                                                                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: `1px solid ${C.outlineVariant}`,
                                                                                minWidth: '170px', marginTop: '6px'
                                                                            }}
                                                                        >
                                                                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: C.outline, marginBottom: '6px', padding: '0 4px', letterSpacing: '0.06em' }}>ENVIAR A PROYECTO</div>
                                                                            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                                {projects.filter(p => p.status === 'activo').map(proj => (
                                                                                    <button
                                                                                        key={proj.id}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            promoteRoutineItemToProject(rutina.id, item.id, proj.id);
                                                                                            setTimeout(() => setLinkingItem(null), 100);
                                                                                        }}
                                                                                        style={{ ...menuItem(C.onSurface), borderRadius: '8px', padding: '7px 8px' }}
                                                                                    >
                                                                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: proj.color, flexShrink: 0 }} />
                                                                                        {proj.name}
                                                                                    </button>
                                                                                ))}
                                                                                {projects.filter(p => p.status === 'activo').length === 0 && (
                                                                                    <div style={{ fontSize: '0.7rem', color: C.outline, textAlign: 'center', padding: '10px' }}>No hay proyectos activos</div>
                                                                                )}
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>

                                                            <button
                                                                className="hz-acc"
                                                                onClick={(e) => { e.stopPropagation(); removeRoutineItem(rutina.id, item.id); }}
                                                                title="Quitar tarea"
                                                                style={iconoFila(false)}
                                                            >
                                                                <Trash2 size={13} color={C.rojo} />
                                                            </button>
                                                        </Reorder.Item>
                                                    );
                                                })}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 4px 2px 26px' }}>
                                                    <Plus size={14} color={C.outline} />
                                                    <input
                                                        placeholder="Añadir tarea y Enter"
                                                        enterKeyHint="done"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                                                addRoutineItem(rutina.id, e.currentTarget.value.trim());
                                                                e.currentTarget.value = '';
                                                            }
                                                        }}
                                                        style={{ border: 'none', background: 'transparent', fontSize: movil ? '16px' : '0.82rem', fontWeight: 500, color: C.onSurface, outline: 'none', width: '100%', padding: 0, fontFamily: 'inherit' }}
                                                    />
                                                </div>
                                            </Reorder.Group>
                                        )}
                                        </AnimatePresence>
                                    </motion.div>
                                    );
                                });
                            })()}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="semana"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="vida-main-container"
                            style={{ overflowX: 'auto' }}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', gap: '4px', minWidth: '560px' }}>
                                <div />
                                {days.map((d, i) => (
                                    <div key={i} style={{ textAlign: 'center', fontWeight: 900, fontSize: '0.7rem', color: i === normalizedDay ? C.primary : '#888' }}>{d}</div>
                                ))}
                                
                                {/* Generar filas por hora 06:00 a 24:00 de a 1 hora */}
                                {Array.from({ length: 18 }).map((_, h) => {
                                    const hourStr = `${(h + 6).toString().padStart(2, '0')}:00`;
                                    return (
                                        <div key={h} style={{ display: 'contents' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#CCC', display: 'flex', alignItems: 'center' }}>{hourStr}</div>
                                            {Array.from({ length: 7 }).map((_, day) => {
                                                // Encontrar rutina que caiga en esta hora y día
                                                const activeRoutines = rutinas.filter(r => {
                                                    if (!r.startTime || !r.endTime) return false;
                                                    const currentH = h + 6;
                                                    const rStartH = parseInt(r.startTime.split(':')[0]);
                                                    const rEndH = parseInt(r.endTime.split(':')[0]);
                                                    const isCorrectDay = r.repeatDays?.includes(day);
                                                    return isCorrectDay && currentH >= rStartH && currentH < rEndH;
                                                });
                                                
                                                return (
                                                    <div
                                                        key={day}
                                                        onDragOver={drag ? (ev) => { ev.preventDefault(); if (dropCell?.day !== day || dropCell?.hour !== h + 6) setDropCell({ day, hour: h + 6 }); } : undefined}
                                                        onDrop={drag ? (ev) => { ev.preventDefault(); soltarBloque(day, h + 6); } : undefined}
                                                        style={{ height: '40px', background: day === normalizedDay ? 'rgba(15,169,122,0.05)' : '#FBFBFB', borderRadius: '6px', position: 'relative', border: dropCell?.day === day && dropCell?.hour === h + 6 ? '1px dashed #0FA97A' : '1px solid #F0F0F0' }}>
                                                        {activeRoutines.map(r => (
                                                            <div
                                                                key={r.id}
                                                                draggable
                                                                title="Arrástralo para moverlo de hora o de día"
                                                                onDragStart={(ev) => { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', String(r.id)); setDrag({ id: r.id, day, hour: h + 6 }); }}
                                                                onDragEnd={() => { setDrag(null); setDropCell(null); }}
                                                                style={{ position: 'absolute', inset: 0, cursor: 'grab', opacity: drag?.id === r.id ? 0.45 : 1 }}
                                                            >
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: r.isActive ? 0.9 : 0.4, scale: 1 }}
                                                                whileHover={{ scale: 1.04 }}
                                                                whileTap={{ scale: 0.96 }}
                                                                transition={{ duration: 0.2, delay: (h * 7 + day) * 0.004 }}
                                                                style={{
                                                                    position: 'absolute', inset: '2px', background: r.color, borderRadius: '6px',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    padding: '4px', cursor: 'grab'
                                                                }}
                                                                onClick={() => updateRoutine(r.id, { isActive: !r.isActive })}
                                                            >
                                                                <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'white', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{r.title}</span>
                                                            </motion.div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                </MotionConfig>
            </div>
            )}
            </div> {/* FIN DEL LAYOUT GRID */}

            {/* CHECKLISTS (MAESTROS / ASÍNCRONOS) */}
            {/* CHECKLISTS (MAESTROS / ASÍNCRONOS) - Hidden until implemented */}
            {/* <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>📋 Listas Maestras</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                    ...
                </div>
            </div> */}

            {editingRoutine && (
                <RoutineEditOverlay
                    isOpen={!!editingRoutine}
                    onClose={() => setEditingRoutine(null)}
                    routine={editingRoutine}
                    onSave={updateRoutine}
                />
            )}

            <ConfirmDialog
                open={!!deletingBlock}
                title="Eliminar bloque"
                message={`¿Eliminar "${deletingBlock?.title}" del horario? También se borran sus tareas.`}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => { if (deletingBlock) removeRoutine(deletingBlock.id); setDeletingBlock(null); }}
                onCancel={() => setDeletingBlock(null)}
            />

            <ConfirmDialog
                open={!!deletingHabit}
                title="Eliminar hábito"
                message={
                    deletingHabit?.linkedRoutineId
                        ? `¿Eliminar el hábito "${deletingHabit?.name}"? La tarea vinculada en el horario se conserva.`
                        : `¿Eliminar el hábito "${deletingHabit?.name}"?`
                }
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => { if (deletingHabit) removeHabit(deletingHabit.id); setDeletingHabit(null); }}
                onCancel={() => setDeletingHabit(null)}
            />
        </div>
    );
};
