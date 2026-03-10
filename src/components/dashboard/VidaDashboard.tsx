import { CheckCircle2, ListTodo, CreditCard, Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import type { Habit, TimeBlock } from '../../hooks/useAlDiaState';
import { motion } from 'framer-motion';

interface VidaProps {
    habits: Habit[];
    toggleHabit: (id: number, dayIndex: number) => void;
    addHabit: (name: string) => void;
    timeBlocks: TimeBlock[];
    addTimeBlock: (label: string, start: string, end: string, color: string) => void;
    removeTimeBlock: (id: number) => void;
}

export const VidaDashboard = ({ habits, toggleHabit, addHabit, timeBlocks, addTimeBlock, removeTimeBlock }: VidaProps) => {
    const [selectedDay, setSelectedDay] = useState(new Date().getDate());
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    // Generar días del mes actual para el mini-calendario
    const currentMonth = new Date().toLocaleString('es-ES', { month: 'long' });
    const today = new Date().getDate();
    const currentYear = new Date().getFullYear();
    const currentMonthIdx = new Date().getMonth();

    // Helper para generar días del mes
    const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonthIdx, 1).getDay(); // 0-6 (Dom-Sab)
    // Ajustar a Lunes inicio (0=Lu, 6=Do)
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    return (
        <div style={{ paddingBottom: '5rem' }}>
            {/* MINI CALENDARIO / VISTA MES INTERACTIVA */}
            <div className="glass-card" style={{ marginBottom: '1.2rem', padding: '1rem', background: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, textTransform: 'capitalize', color: 'var(--text-carbon)' }}>{currentMonth} 2026</h2>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                            onClick={() => setViewMode(viewMode === 'week' ? 'month' : 'week')}
                            style={{ 
                                background: '#F0EBE6', 
                                border: 'none', 
                                borderRadius: '12px', 
                                padding: '4px 10px', 
                                fontSize: '0.65rem', 
                                fontWeight: 800, 
                                color: 'var(--domain-purple)',
                                cursor: 'pointer'
                            }}
                        >
                            {viewMode === 'week' ? 'Ver Mes' : 'Ver Semana'}
                        </button>
                    </div>
                </div>

                {viewMode === 'week' ? (
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none', justifyContent: 'space-between' }}>
                        {[...Array(7)].map((_, i) => {
                            const date = new Date(currentYear, currentMonthIdx, today - 1 + i);
                            const dayNum = date.getDate();
                            const isSelected = selectedDay === dayNum;
                            return (
                                <motion.div 
                                    key={i} 
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setSelectedDay(dayNum)}
                                    style={{ 
                                        minWidth: '45px', 
                                        textAlign: 'center', 
                                        background: isSelected ? 'var(--domain-purple)' : '#F9F9F9', 
                                        color: isSelected ? 'white' : '#888',
                                        borderRadius: '16px', 
                                        padding: '10px 4px', 
                                        cursor: 'pointer',
                                        boxShadow: isSelected ? '0 4px 12px rgba(138, 92, 246, 0.3)' : 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 700, opacity: 0.8 }}>{['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'][ date.getDay() ]}</p>
                                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>{dayNum}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => (
                            <div key={d} style={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#CCC', marginBottom: '4px' }}>{d}</div>
                        ))}
                        {[...Array(startOffset)].map((_, i) => <div key={`empty-${i}`} />)}
                        {[...Array(daysInMonth)].map((_, i) => {
                            const dayNum = i + 1;
                            const isToday = dayNum === today;
                            const isSelected = selectedDay === dayNum;
                            return (
                                <div 
                                    key={dayNum}
                                    onClick={() => { setSelectedDay(dayNum); setViewMode('week'); }}
                                    style={{
                                        aspectRatio: '1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '10px',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        background: isSelected ? 'var(--domain-purple)' : (isToday ? '#FFF5EB' : 'transparent'),
                                        color: isSelected ? 'white' : (isToday ? 'var(--domain-orange)' : '#555'),
                                        border: isToday && !isSelected ? '1px solid var(--domain-orange)' : 'none'
                                    }}
                                >
                                    {dayNum}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* TIME BLOCKING / TIMELINE VISUAL */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CalendarIcon size={18} color="var(--domain-purple)" />
                    Planificación del Día
                </h3>
                <button 
                    onClick={() => {
                        const label = prompt('Nombre del bloque (ej. Gym, Deep Work):');
                        if (label) addTimeBlock(label, '10:00', '11:00', '#8A5CF6');
                    }}
                    style={{ background: 'var(--domain-purple)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <Plus size={18} />
                </button>
            </div>

            <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.2rem', background: '#FFF' }}>
                <div style={{ position: 'relative', paddingLeft: '40px', borderLeft: '2px solid #F0F0F0' }}>
                    {/* Horas de fondo (VISTA COMPACTA) */}
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map(hour => (
                        <div key={hour} style={{ height: '35px', position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '-40px', top: '-6px', fontSize: '0.6rem', fontWeight: 800, color: '#BBB' }}>
                                {hour.toString().padStart(2, '0')}:00
                            </span>
                            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, borderBottom: '1px dashed #F8F8F8', width: '100%' }}></div>
                        </div>
                    ))}

                    {/* Bloques Flotantes */}
                    <div style={{ position: 'absolute', top: 0, left: '6px', right: '6px', height: '100%' }}>
                        {timeBlocks.map((block) => {
                            const [startH, startM] = block.start.split(':').map(Number);
                            const [endH, endM] = block.end.split(':').map(Number);
                            const startTotal = (startH - 8) * 60 + startM;
                            const endTotal = (endH - 8) * 60 + endM;
                            const duration = endTotal - startTotal;
                            
                            const pixelsPerMinute = 35 / 60; // 35px por hora
                            const topPos = startTotal * pixelsPerMinute;
                            const heightPos = duration * pixelsPerMinute;

                            return (
                                <motion.div 
                                    key={block.id}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    style={{ 
                                        position: 'absolute', 
                                        top: topPos, 
                                        left: 0, 
                                        right: 0, 
                                        height: Math.max(heightPos, 20),
                                        background: block.color + '10',
                                        borderLeft: `3px solid ${block.color}`,
                                        borderRadius: '6px',
                                        padding: '4px 8px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        zIndex: 1,
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    <div style={{ overflow: 'hidden' }}>
                                        <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 900, color: block.color, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{block.label}</p>
                                        {heightPos > 25 && <p style={{ margin: 0, fontSize: '0.5rem', fontWeight: 600, color: block.color, opacity: 0.7 }}>{block.start}</p>}
                                    </div>
                                    <Trash2 size={10} color={block.color} style={{ cursor: 'pointer', opacity: 0.4 }} onClick={() => removeTimeBlock(block.id)} />
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* MOTOR DE HÁBITOS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Fábrica de Hábitos</h3>
                <button 
                    onClick={() => {
                        const name = prompt('Nombre del nuevo Hábito:');
                        if (name) addHabit(name);
                    }}
                    style={{ background: '#F0EBE6', color: 'var(--domain-purpleish)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 900 }}
                >
                    +
                </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
                {habits.map((habit) => (
                    <div key={habit.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
                        <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>{habit.name}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>Racha: {habit.completedDays.length} días</p>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {days.map((day, idx) => {
                                const isCompleted = habit.completedDays.includes(idx);
                                return (
                                    <motion.div
                                        key={idx}
                                        whileTap={{ scale: 0.8 }}
                                        onClick={() => toggleHabit(habit.id, idx)}
                                        style={{
                                            width: '26px',
                                            height: '26px',
                                            borderRadius: '50%',
                                            background: isCompleted ? 'var(--domain-purple)' : '#F0EBE6',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.65rem',
                                            color: isCompleted ? 'white' : '#AAA',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            transition: 'background 0.3s ease'
                                        }}
                                    >
                                        {day}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* CHECKLISTS (Maestros / Asíncronos) */}
            <h3 style={{ marginBottom: '1rem' }}>Listas Maestras</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="glass-card" style={{ padding: '1.2rem', textAlign: 'center', border: '1px solid #EAE0FE' }}>
                    <CreditCard size={28} color="var(--domain-orange)" style={{ marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Pagos / Recur.</p>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#888' }}>2 pendientes ⭢</p>
                </div>
                <div className="glass-card" style={{ padding: '1.2rem', textAlign: 'center', border: '1px solid #EAE0FE' }}>
                    <ListTodo size={28} color="var(--domain-purple)" style={{ marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Súper / Mercado</p>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#888' }}>12 items ⭢</p>
                </div>
                <div className="glass-card" style={{ padding: '1.2rem', textAlign: 'center', border: '1px solid #EAE0FE' }}>
                    <CheckCircle2 size={28} color="var(--domain-purple)" style={{ marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Rutina Mañana</p>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#888' }}>4 pasos ⭢</p>
                </div>
            </div>
        </div>
    );
};
