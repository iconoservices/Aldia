import { CheckCircle2, ListTodo, CalendarRange, CreditCard } from 'lucide-react';
import type { Habit } from '../../hooks/useAlDiaState';
import { motion } from 'framer-motion';

interface VidaProps {
    habits: Habit[];
    toggleHabit: (id: number, dayIndex: number) => void;
}

export const VidaDashboard = ({ habits, toggleHabit }: VidaProps) => {
    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    return (
        <div style={{ paddingBottom: '5rem' }}>
            {/* CABECERA MACRO / CALENDARIO (Solo visual para V1) */}
            <div className="glass-card" style={{ marginBottom: '1.2rem', background: 'linear-gradient(to right, #D4C4FB, #EAE0FE)', padding: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: '#1A1A1A' }}>
                    <CalendarRange size={22} />
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Panorama Macro</h2>
                </div>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '0.4rem' }}>
                    {[...Array(7)].map((_, i) => (
                        <div key={i} style={{ minWidth: '42px', textAlign: 'center', background: 'white', borderRadius: '16px', padding: '8px 4px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
                            <p style={{ margin: 0, fontSize: '0.65rem', color: '#888', fontWeight: 600 }}>{['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'][i]}</p>
                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{15 + i}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* MOTOR DE HÁBITOS */}
            <h3 style={{ marginBottom: '1rem' }}>Fábrica de Hábitos</h3>
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
