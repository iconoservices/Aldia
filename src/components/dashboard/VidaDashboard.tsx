import { CheckCircle2, ListTodo, CreditCard, Plus, Check, Trash2 } from 'lucide-react';
import type { Habit, Routine } from '../../hooks/useAlDiaState';
import { motion } from 'framer-motion';

interface VidaProps {
    habits: Habit[];
    toggleHabit: (id: number, dayIndex: number) => void;
    addHabit: (name: string) => void;
    rutinas: Routine[];
    addRoutineItem: (routineId: number, text: string) => void;
    toggleRoutineItem: (routineId: number, itemId: number) => void;
    removeRoutineItem: (routineId: number, itemId: number) => void;
}

export const VidaDashboard = ({ 
    habits, toggleHabit, addHabit,
    rutinas, addRoutineItem, toggleRoutineItem, removeRoutineItem
}: VidaProps) => {
    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    return (
        <div style={{ paddingBottom: '5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* MOTOR DE HÁBITOS (SECCIÓN PRINCIPAL) */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>🌿 Fábrica de Hábitos</h3>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
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
                                                width: '32px',
                                                height: '32px',
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
            </div>

            {/* SECCIÓN DE RUTINAS (AHORA MÁS VISUAL) */}
            <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>⚡ Rutinas Diarias</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                    {rutinas.map(rutina => (
                        <div key={rutina.id} className="glass-card" style={{ padding: '1rem', background: '#FFF' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <div style={{ width: '4px', height: '16px', borderRadius: '4px', background: rutina.color }}></div>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{rutina.title}</h4>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {rutina.items.map(item => {
                                    const isDone = item.completed;
                                    return (
                                        <div 
                                            key={item.id}
                                            onClick={() => toggleRoutineItem(rutina.id, item.id)}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', 
                                                background: isDone ? '#F9F9F9' : 'transparent', borderRadius: '12px', 
                                                cursor: 'pointer', border: isDone ? '1px solid #EEE' : '1px solid transparent',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <div style={{ 
                                                width: '18px', height: '18px', borderRadius: '6px', 
                                                border: `2px solid ${isDone ? 'var(--domain-green)' : '#DDD'}`,
                                                background: isDone ? 'var(--domain-green)' : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                {isDone && <Check size={12} color="white" strokeWidth={4} />}
                                            </div>
                                            <span style={{ 
                                                fontSize: '0.8rem', fontWeight: 700, 
                                                color: isDone ? '#AAA' : 'var(--text-carbon)',
                                                textDecoration: isDone ? 'line-through' : 'none',
                                                flex: 1
                                            }}>
                                                {item.text}
                                            </span>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); removeRoutineItem(rutina.id, item.id); }}
                                                style={{ background: 'transparent', border: 'none', color: '#EEE', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    );
                                })}

                                {/* Input para añadir item rápido */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 12px' }}>
                                    <div style={{ width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CCC' }}>
                                        <Plus size={14} />
                                    </div>
                                    <input 
                                        type="text"
                                        placeholder="Añadir..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.currentTarget.value) {
                                                addRoutineItem(rutina.id, e.currentTarget.value);
                                                e.currentTarget.value = '';
                                            }
                                        }}
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            color: 'var(--text-carbon)',
                                            outline: 'none',
                                            width: '100%'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CHECKLISTS (MAESTROS / ASÍNCRONOS) */}
            <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>📋 Listas Maestras</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                    <div className="glass-card" style={{ padding: '1.2rem', textAlign: 'center', border: '1px solid #EAE0FE', cursor: 'pointer' }}>
                        <CreditCard size={28} color="var(--domain-orange)" style={{ marginBottom: '8px' }} />
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>Pagos / Recur.</p>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: '#888', fontWeight: 700 }}>2 pendientes</p>
                    </div>
                    <div className="glass-card" style={{ padding: '1.2rem', textAlign: 'center', border: '1px solid #EAE0FE', cursor: 'pointer' }}>
                        <ListTodo size={28} color="var(--domain-purple)" style={{ marginBottom: '8px' }} />
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>Súper / Mercado</p>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: '#888', fontWeight: 700 }}>12 items</p>
                    </div>
                    <div className="glass-card" style={{ padding: '1.2rem', textAlign: 'center', border: '1px solid #EAE0FE', cursor: 'pointer' }}>
                        <CheckCircle2 size={28} color="var(--domain-green)" style={{ marginBottom: '8px' }} />
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>Procesos OK</p>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: '#888', fontWeight: 700 }}>Verificado</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
