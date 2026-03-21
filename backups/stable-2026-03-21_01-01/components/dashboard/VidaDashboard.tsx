import { Plus, Check, Trash2, Calendar, LayoutGrid, Clock, Edit2 } from 'lucide-react';
import type { Habit, Routine } from '../../hooks/useAlDiaState';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { RoutineEditOverlay } from '../features/RoutineEditOverlay';

interface VidaProps {
    habits: Habit[];
    toggleHabit: (id: number, dayIndex: number) => void;
    addHabit: (name: string) => void;
    removeHabit: (id: number) => void;
    rutinas: Routine[];
    addRoutineItem: (routineId: number, text: string) => void;
    toggleRoutineItem: (routineId: number, itemId: number) => void;
    removeRoutineItem: (routineId: number, itemId: number) => void;
    updateRoutine: (id: number, updates: Partial<Routine>) => void;
    updateRoutineItem: (routineId: number, itemId: number, updates: Partial<{ text: string, completed: boolean, time: string }>) => void;
    addRoutine: (title: string) => void;
    removeRoutine: (id: number) => void;
}

export const VidaDashboard = ({ 
    habits, toggleHabit, addHabit, removeHabit,
    rutinas, addRoutineItem, toggleRoutineItem, removeRoutineItem, updateRoutine,
    updateRoutineItem, addRoutine, removeRoutine
}: VidaProps) => {
    const [viewMode, setViewMode] = useState<'hoy' | 'semana'>('hoy');
    const [sortMode, setSortMode] = useState<'agregado' | 'hora'>('agregado');
    const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
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
                <div className="glass-card" style={{ padding: '1.2rem', background: 'white', borderRadius: '24px', border: '1px solid rgba(138, 92, 246, 0.1)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {habits.map((habit, hIdx) => (
                            <div 
                                key={habit.id} 
                                style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    padding: '12px 0', 
                                    borderBottom: hIdx === habits.length - 1 ? 'none' : '1px solid #F5F5F5' 
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div 
                                        onClick={() => {
                                            if(confirm(`¿Borrar hábito "${habit.name}"?`)) removeHabit(habit.id);
                                        }}
                                        style={{ cursor: 'pointer', opacity: 0.2, transition: 'opacity 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.2'}
                                    >
                                        <Trash2 size={12} color="#f87171" />
                                    </div>
                                    <div style={{ width: '4px', height: '14px', borderRadius: '4px', background: 'var(--domain-purple)' }}></div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{habit.name}</h4>
                                        <p style={{ margin: 0, fontSize: '0.6rem', color: '#BBB', fontWeight: 800, textTransform: 'uppercase' }}>Racha: {habit.completedDays.length}</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '4px', background: '#F9F9F9', padding: '4px', borderRadius: '8px' }}>
                                    {days.map((day, idx) => {
                                        const isCompleted = habit.completedDays.includes(idx);
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => toggleHabit(habit.id, idx)}
                                                style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    borderRadius: '4px',
                                                    background: isCompleted ? 'var(--domain-purple)' : 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    boxShadow: isCompleted ? '0 2px 4px rgba(138, 92, 246, 0.2)' : 'none',
                                                    border: isCompleted ? 'none' : '1px solid #EEE'
                                                }}
                                            >
                                                <span style={{ 
                                                    fontSize: '0.55rem', 
                                                    fontWeight: 900, 
                                                    color: isCompleted ? 'white' : '#CCC' 
                                                }}>
                                                    {day}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        {habits.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#CCC', fontSize: '0.8rem', padding: '2rem 0' }}>No hay hábitos registrados todavía.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* SECCIÓN DE RUTINAS */}
            <div>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1rem',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>⚡ Rutinas</h3>
                        <div style={{ display: 'flex', background: '#F0EBE6', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                            <button 
                                onClick={() => setViewMode('hoy')}
                                style={{ 
                                    background: viewMode === 'hoy' ? 'white' : 'transparent',
                                    border: 'none', padding: '4px 8px', borderRadius: '8px', cursor: 'pointer',
                                    fontSize: '0.65rem', fontWeight: 900, color: viewMode === 'hoy' ? 'var(--domain-purple)' : '#888',
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                            >
                                <LayoutGrid size={12} /> HOY
                            </button>
                            <button 
                                onClick={() => setViewMode('semana')}
                                style={{ 
                                    background: viewMode === 'semana' ? 'white' : 'transparent',
                                    border: 'none', padding: '4px 8px', borderRadius: '8px', cursor: 'pointer',
                                    fontSize: '0.65rem', fontWeight: 900, color: viewMode === 'semana' ? 'var(--domain-purple)' : '#888',
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                            >
                                <Calendar size={12} /> SEMANA
                            </button>
                        </div>
                        {viewMode === 'hoy' && (
                            <button 
                                onClick={() => setSortMode(prev => prev === 'agregado' ? 'hora' : 'agregado')}
                                style={{ 
                                    background: '#F0EBE6', border: 'none', padding: '6px 8px', borderRadius: '10px', cursor: 'pointer',
                                    fontSize: '0.65rem', fontWeight: 900, color: sortMode === 'hora' ? 'var(--domain-purple)' : '#888',
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                                title={sortMode === 'hora' ? "Ordenando por hora" : "Ordenando por creación"}
                            >
                                <Clock size={12} /> {sortMode === 'hora' ? 'HORA' : 'ORIGINAL'}
                            </button>
                        )}
                    </div>
                    <button 
                        onClick={() => {
                            const name = prompt('Nombre de la nueva Rutina:');
                            if (name) addRoutine(name);
                        }}
                        style={{ 
                            background: 'var(--domain-orange)', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '12px', 
                            padding: '8px 14px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            cursor: 'pointer', 
                            fontWeight: 900, 
                            fontSize: '0.75rem',
                            boxShadow: '0 4px 12px rgba(255, 140, 66, 0.2)',
                            transition: 'all 0.2s ease',
                            flexShrink: 0
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <Plus size={16} strokeWidth={3} /> NUEVA RUTINA
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {viewMode === 'hoy' ? (
                        <motion.div 
                            key="hoy"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="glass-card"
                            style={{ 
                                padding: '1.2rem', 
                                background: 'white', 
                                borderRadius: '24px', 
                                border: '1px solid rgba(138, 92, 246, 0.1)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            {(() => {
                                let displayRutinas = [...rutinas];
                                if (sortMode === 'hora') {
                                    displayRutinas.sort((a, b) => {
                                        const timeA = a.startTime || '99:99';
                                        const timeB = b.startTime || '99:99';
                                        return timeA.localeCompare(timeB);
                                    });
                                }
                                return displayRutinas.map((rutina, rIdx, arr) => (
                                    <div 
                                        key={rutina.id} 
                                        style={{ 
                                            padding: '1.2rem 0',
                                            borderBottom: rIdx === arr.length - 1 ? 'none' : '1px solid #F5F5F5',
                                            opacity: rutina.isActive ? 1 : 0.4,
                                            transition: 'all 0.3s ease',
                                            position: 'relative'
                                        }}
                                    >
                                    {/* Color Indicator Accent */}
                                    <div style={{ position: 'absolute', left: '-1.2rem', top: '1.2rem', bottom: '1.2rem', width: '4px', borderRadius: '0 4px 4px 0', background: rutina.color }}></div>

                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        marginBottom: '12px',
                                        flexWrap: 'wrap',
                                        gap: '12px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'min-content' }}>
                                            <div 
                                                onClick={() => removeRoutine(rutina.id)}
                                                style={{ cursor: 'pointer', opacity: 0.2, transition: 'opacity 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.2'}
                                            >
                                                <Trash2 size={12} color="#f87171" style={{ marginRight: '4px' }} />
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{rutina.title}</h4>
                                                    <button 
                                                        onClick={() => setEditingRoutine(rutina)}
                                                        style={{ background: 'transparent', border: 'none', color: '#CCC', cursor: 'pointer', padding: '4px', display: 'flex' }}
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', gap: '3px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                    {days.map((day, dIdx) => {
                                                        const isSet = rutina.repeatDays?.includes(dIdx);
                                                        return (
                                                            <div 
                                                                key={dIdx}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const currentDays = rutina.repeatDays || [];
                                                                    const nextDays = isSet ? currentDays.filter(d => d !== dIdx) : [...currentDays, dIdx];
                                                                    updateRoutine(rutina.id, { repeatDays: nextDays });
                                                                }}
                                                                style={{ 
                                                                    fontSize: '0.55rem', fontWeight: 900, width: '16px', height: '16px', 
                                                                    borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    cursor: 'pointer', background: isSet ? rutina.color : '#F0F0F0',
                                                                    color: isSet ? 'white' : '#CCC'
                                                                }}
                                                            >
                                                                {day}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                                            {/* Editable Times */}
                                            <div style={{ display: 'flex', gap: '4px', padding: '4px 8px', background: '#F9F9F9', borderRadius: '8px', alignItems: 'center' }}>
                                                <Clock size={10} color="#AAA" />
                                                <input 
                                                    type="time" 
                                                    value={rutina.startTime || ''} 
                                                    onChange={(e) => updateRoutine(rutina.id, { startTime: e.target.value })}
                                                    style={{ border: 'none', background: 'transparent', fontSize: '0.65rem', fontWeight: 800, color: '#666', outline: 'none', width: '45px' }}
                                                />
                                                <span style={{ fontSize: '0.65rem', color: '#CCC' }}>-</span>
                                                <input 
                                                    type="time" 
                                                    value={rutina.endTime || ''} 
                                                    onChange={(e) => updateRoutine(rutina.id, { endTime: e.target.value })}
                                                    style={{ border: 'none', background: 'transparent', fontSize: '0.65rem', fontWeight: 800, color: '#666', outline: 'none', width: '45px' }}
                                                />
                                            </div>
                                            {/* FB Style Switch */}
                                            <div 
                                                onClick={() => updateRoutine(rutina.id, { isActive: !rutina.isActive })}
                                                style={{ 
                                                    width: '32px', height: '18px', borderRadius: '20px', 
                                                    background: rutina.isActive ? 'var(--domain-green)' : '#DDD', 
                                                    position: 'relative', cursor: 'pointer', transition: 'all 0.3s ease',
                                                    flexShrink: 0
                                                }}
                                            >
                                                <motion.div 
                                                    animate={{ x: rutina.isActive ? 16 : 2 }}
                                                    style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {rutina.isActive && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginTop: '12px' }}>
                                            {rutina.items.map(item => {
                                                const isDone = item.completed;
                                                return (
                                                    <div 
                                                        key={item.id}
                                                        onClick={() => toggleRoutineItem(rutina.id, item.id)}
                                                        style={{ 
                                                            display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', 
                                                            background: isDone ? '#F9F9F9' : 'transparent', borderRadius: '12px', 
                                                            cursor: 'pointer', border: '1px solid #EEE'
                                                        }}
                                                    >
                                                        <div style={{ 
                                                            width: '16px', height: '16px', borderRadius: '5px', 
                                                            border: `2px solid ${isDone ? 'var(--domain-green)' : '#DDD'}`,
                                                            background: isDone ? 'var(--domain-green)' : 'transparent',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                        }}>
                                                            {isDone && <Check size={10} color="white" />}
                                                        </div>
                                                        <input 
                                                            value={item.text}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => updateRoutineItem(rutina.id, item.id, { text: e.target.value })}
                                                            style={{ 
                                                                fontSize: '0.75rem', 
                                                                fontWeight: 800, 
                                                                color: isDone ? '#CCC' : 'var(--text-carbon)', 
                                                                textDecoration: isDone ? 'line-through' : 'none', 
                                                                flex: 1,
                                                                background: 'transparent',
                                                                border: 'none',
                                                                outline: 'none',
                                                                padding: '0'
                                                            }}
                                                        />
                                                        
                                                        {/* Item Time */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F0F0F0', padding: '2px 6px', borderRadius: '6px' }}>
                                                            <Clock size={10} color="#888" />
                                                            <input 
                                                                type="time" 
                                                                value={item.time || ''} 
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => updateRoutineItem(rutina.id, item.id, { time: e.target.value })}
                                                                style={{ border: 'none', background: 'transparent', fontSize: '0.65rem', fontWeight: 850, color: '#555', outline: 'none', width: '45px' }}
                                                            />
                                                        </div>

                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); removeRoutineItem(rutina.id, item.id); }}
                                                            style={{ background: 'transparent', border: 'none', color: '#EEE', cursor: 'pointer', padding: '4px', opacity: 0.1 }}
                                                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.1'}
                                                        >
                                                            <Trash2 size={10} color="#f87171" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', border: '1px dashed #DDD', borderRadius: '12px' }}>
                                                <Plus size={12} color="#CCC" />
                                                <input 
                                                    placeholder="Añadir..."
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && e.currentTarget.value) {
                                                            addRoutineItem(rutina.id, e.currentTarget.value);
                                                            e.currentTarget.value = '';
                                                        }
                                                    }}
                                                    style={{ border: 'none', background: 'transparent', fontSize: '0.75rem', fontWeight: 600, outline: 'none', width: '100%' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))})()}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="semana"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="glass-card"
                            style={{ background: 'white', padding: '1.5rem', borderRadius: '24px', overflowX: 'auto' }}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', gap: '12px', minWidth: '700px' }}>
                                <div />
                                {days.map((d, i) => (
                                    <div key={i} style={{ textAlign: 'center', fontWeight: 900, fontSize: '0.7rem', color: '#888' }}>{d}</div>
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
                                                    <div key={day} style={{ height: '40px', background: '#FBFBFB', borderRadius: '8px', position: 'relative', border: '1px solid #F0F0F0' }}>
                                                        {activeRoutines.map(r => (
                                                            <div 
                                                                key={r.id}
                                                                style={{ 
                                                                    position: 'absolute', inset: '2px', background: r.color, borderRadius: '6px',
                                                                    opacity: r.isActive ? 0.9 : 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    padding: '4px', cursor: 'pointer'
                                                                }}
                                                                onClick={() => updateRoutine(r.id, { isActive: !r.isActive })}
                                                            >
                                                                <span style={{ fontSize: '0.5rem', fontWeight: 900, color: 'white', textTransform: 'uppercase' }}>{r.title.split(' ')[1] || r.title}</span>
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
            </div>

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
        </div>
    );
};
