import { CheckCircle2, ListTodo, CreditCard, Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import type { Habit, TimeBlock } from '../../hooks/useAlDiaState';
import { motion, AnimatePresence } from 'framer-motion';
import { TimeBlockModal } from '../features/TimeBlockModal';

interface VidaProps {
    habits: Habit[];
    toggleHabit: (id: number, dayIndex: number) => void;
    addHabit: (name: string) => void;
    timeBlocks: TimeBlock[];
    addTimeBlock: (label: string, start: string, end: string, color: string) => void;
    removeTimeBlock: (id: number) => void;
    missions: any[];
    agenda: any[];
}

export const VidaDashboard = ({ 
    habits, toggleHabit, addHabit, 
    timeBlocks, addTimeBlock, removeTimeBlock,
    missions, agenda
}: VidaProps) => {
    const [selectedDay, setSelectedDay] = useState(new Date().getDate());
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, fontSize: '1.2rem' }}>
                    <CalendarIcon size={20} color="var(--domain-purple)" />
                    Planificación del Día
                </h3>
                <button 
                    onClick={() => setIsBlockModalOpen(true)}
                    style={{ 
                        background: 'var(--domain-purple)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '12px', 
                        padding: '8px 14px',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(138, 92, 246, 0.3)'
                    }}
                >
                    <Plus size={16} /> BLOQUE
                </button>
            </div>

            <TimeBlockModal 
                isOpen={isBlockModalOpen}
                onClose={() => setIsBlockModalOpen(false)}
                onAdd={addTimeBlock}
            />

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

                    {/* Bloques Flotantes, Agenda y Tareas con Hora */}
                    <div style={{ position: 'absolute', top: 0, left: '6px', right: '6px', height: '100%' }}>
                        {/* 1. Bloques de Tiempo Manuales */}
                        {timeBlocks.map((block) => {
                            const [startH, startM] = block.start.split(':').map(Number);
                            const [endH, endM] = block.end.split(':').map(Number);
                            const startTotal = (startH - 8) * 60 + startM;
                            const endTotal = (endH - 8) * 60 + endM;
                            const duration = endTotal - startTotal;
                            const pixelsPerMinute = 35 / 60;
                            const topPos = startTotal * pixelsPerMinute;
                            const heightPos = Math.max(duration * pixelsPerMinute, 25);

                            return (
                                <motion.div 
                                    key={`block-${block.id}`}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    style={{ 
                                        position: 'absolute', top: topPos, left: 0, right: 0, height: heightPos,
                                        background: block.color + '15',
                                        borderLeft: `4px solid ${block.color}`,
                                        borderRadius: '8px', padding: '4px 10px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        zIndex: 1, boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
                                    }}
                                >
                                    <div style={{ overflow: 'hidden' }}>
                                        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 900, color: block.color, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{block.label}</p>
                                        <p style={{ margin: 0, fontSize: '0.55rem', fontWeight: 700, opacity: 0.6, color: block.color }}>{block.start} - {block.end}</p>
                                    </div>
                                    <Trash2 size={12} color={block.color} style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => removeTimeBlock(block.id)} />
                                </motion.div>
                            );
                        })}

                        {/* 2. Eventos de Agenda */}
                        {agenda.filter(event => {
                            const todayStr = new Date().toISOString().split('T')[0];
                            return !event.date || event.date === todayStr;
                        }).map((event) => {
                            const [startH, startM] = event.startTime.split(':').map(Number);
                            const [endH, endM] = event.endTime.split(':').map(Number);
                            const startTotal = (startH - 8) * 60 + startM;
                            const endTotal = (endH - 8) * 60 + endM;
                            const duration = endTotal - startTotal;
                            const topPos = startTotal * (35/60);
                            const heightPos = Math.max(duration * (35/60), 30);

                            return (
                                <motion.div 
                                    key={`agenda-${event.id}`}
                                    style={{ 
                                        position: 'absolute', top: topPos, left: '15px', right: '2px', height: heightPos,
                                        background: 'var(--domain-orange)',
                                        color: 'white',
                                        borderRadius: '10px', padding: '6px 12px',
                                        zIndex: 2, boxShadow: '0 6px 15px rgba(255, 140, 66, 0.2)',
                                        display: 'flex', flexDirection: 'column', justifyContent: 'center'
                                    }}
                                >
                                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 900, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>🗓️ {event.title}</p>
                                    <p style={{ margin: 0, fontSize: '0.5rem', fontWeight: 700, opacity: 0.9 }}>{event.startTime}</p>
                                </motion.div>
                            );
                        })}

                        {/* 3. Tareas con Hora específica */}
                        {missions.filter(m => m.dueTime && !m.completed).map((m) => {
                            const [startH, startM] = (m.dueTime || '12:00').split(':').map(Number);
                            const startTotal = (startH - 8) * 60 + startM;
                            const topPos = startTotal * (35/60);

                            return (
                                <motion.div 
                                    key={`task-${m.id}`}
                                    style={{ 
                                        position: 'absolute', top: topPos, left: '5px', height: '26px',
                                        background: 'white', border: '1.5px solid #EEE',
                                        borderRadius: '20px', padding: '2px 12px',
                                        zIndex: 3, boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                                        display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: m.critical ? 'var(--domain-orange)' : 'var(--domain-purple)' }}></div>
                                    <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 800, color: '#333' }}>{m.text}</p>
                                    <span style={{ fontSize: '0.55rem', fontWeight: 600, color: '#AAA' }}>{m.dueTime}</span>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* MOTOR DE HÁBITOS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>🌿 Fábrica de Hábitos</h3>
                <button 
                    onClick={() => {
                        const name = prompt('Nombre del nuevo Hábito:');
                        if (name) addHabit(name);
                    }}
                    style={{ background: '#F0EBE6', color: 'var(--domain-purple)', border: 'none', borderRadius: '10px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 900, fontSize: '0.7rem' }}
                >
                    <Plus size={14} /> NUEVO
                </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {habits.map((habit) => (
                    <motion.div 
                        key={habit.id} 
                        layout
                        className="glass-card" 
                        style={{ 
                            padding: '1.2rem', 
                            background: 'white',
                            borderRadius: '24px',
                            border: '1px solid rgba(138, 92, 246, 0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <p style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: 'var(--text-carbon)' }}>{habit.name}</p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#AAA', fontWeight: 700 }}>🔥 RACHA DE {habit.completedDays.length}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', background: '#F9F9F9', padding: '8px', borderRadius: '16px' }}>
                            {days.map((day, idx) => {
                                const isCompleted = habit.completedDays.includes(idx);
                                return (
                                    <motion.div
                                        key={idx}
                                        whileTap={{ scale: 0.8 }}
                                        onClick={() => toggleHabit(habit.id, idx)}
                                        style={{
                                            width: '30px',
                                            height: '30px',
                                            borderRadius: '10px',
                                            background: isCompleted ? 'var(--domain-purple)' : 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.65rem',
                                            color: isCompleted ? 'white' : '#CCC',
                                            fontWeight: 900,
                                            cursor: 'pointer',
                                            boxShadow: isCompleted ? '0 4px 10px rgba(138, 92, 246, 0.2)' : '0 2px 5px rgba(0,0,0,0.02)',
                                            border: isCompleted ? 'none' : '1px solid #EEE'
                                        }}
                                    >
                                        {day}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
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
