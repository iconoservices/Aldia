import { Plus, Check, Trash2, Calendar, LayoutGrid, Clock, Edit2, GripVertical, Leaf, Folder } from 'lucide-react';
import type { Habit, Routine, Project } from '../../hooks/useAlDiaState';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useState } from 'react';
import { RoutineEditOverlay } from '../features/RoutineEditOverlay';

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
}

export const VidaDashboard = ({ 
    habits, toggleHabit, addHabit, removeHabit,
    rutinas, addRoutineItem, toggleRoutineItem, removeRoutineItem, updateRoutine,
    updateRoutineItem, addRoutine, removeRoutine, reorderRoutineItems,
    projects, promoteRoutineItemToProject
}: VidaProps) => {
    const [viewMode, setViewMode] = useState<'hoy' | 'semana'>('hoy');
    const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
    const [linkingItem, setLinkingItem] = useState<{ rId: number, iId: number } | null>(null);
    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const todayStr = new Date().toLocaleDateString('en-CA');
    const normalizedDay = (new Date().getDay() + 6) % 7;

    return (
        <div style={{ paddingBottom: '5rem' }}>
            <style>{`
                .vida-layout {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                    align-items: start;
                }
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
            
            <div className="vida-layout">
            {/* MOTOR DE HÁBITOS (SECCIÓN PRINCIPAL) */}
            <div className="habitos-col">
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
                                            if (confirm(`¿Borrar hábito "${habit.name}"?`)) {
                                                if (habit.linkedRoutineId && habit.linkedRoutineItemId) {
                                                    const alsoRemoveItem = confirm('¿También eliminar la tarea vinculada de la rutina?');
                                                    removeHabit(habit.id);
                                                    if (alsoRemoveItem) {
                                                        removeRoutineItem(habit.linkedRoutineId, habit.linkedRoutineItemId);
                                                    }
                                                } else {
                                                    removeHabit(habit.id);
                                                }
                                            }
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
                                        <p style={{ margin: 0, fontSize: '0.6rem', color: '#BBB', fontWeight: 800, textTransform: 'uppercase' }}>Programado: {habit.schedule?.length || 0} días</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '4px', background: '#F9F9F9', padding: '4px', borderRadius: '8px' }}>
                                    {days.map((day, idx) => {
                                        const isScheduled = (habit.schedule || []).includes(idx);
                                        const isCompletedToday = (habit.completedDates || []).includes(todayStr);
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => toggleHabit(habit.id, idx)}
                                                style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '6px',
                                                    background: isScheduled ? 'var(--domain-purple)' : 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    boxShadow: isScheduled ? '0 2px 8px rgba(138, 92, 246, 0.25)' : 'none',
                                                    border: isScheduled ? 'none' : '1px solid #EEE',
                                                    position: 'relative'
                                                }}
                                            >
                                                <span style={{ 
                                                    fontSize: '0.65rem', 
                                                    fontWeight: 900, 
                                                    color: isScheduled ? 'white' : '#CCC' 
                                                }}>
                                                    {day}
                                                </span>
                                                {idx === normalizedDay && isCompletedToday && (
                                                    <div style={{ position: 'absolute', top: -2, right: -2, width: '6px', height: '6px', borderRadius: '50%', background: 'var(--domain-green)', border: '1px solid white' }} />
                                                )}
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
                            className="vida-main-container"
                            style={{ 
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            {(() => {
                                let displayRutinas = [...rutinas];
                                displayRutinas.sort((a, b) => {
                                    const timeA = a.startTime || '99:99';
                                    const timeB = b.startTime || '99:99';
                                    return timeA.localeCompare(timeB);
                                });
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
                                                    className="time-input-clean"
                                                    style={{ border: 'none', background: 'transparent', fontSize: '0.65rem', fontWeight: 800, color: '#666', outline: 'none', width: '75px' }}
                                                />
                                                <span style={{ fontSize: '0.65rem', color: '#CCC' }}>-</span>
                                                <input 
                                                    type="time" 
                                                    value={rutina.endTime || ''} 
                                                    onChange={(e) => updateRoutine(rutina.id, { endTime: e.target.value })}
                                                    className="time-input-clean"
                                                    style={{ border: 'none', background: 'transparent', fontSize: '0.65rem', fontWeight: 800, color: '#666', outline: 'none', width: '75px' }}
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
                                            <Reorder.Group 
                                                axis="y" 
                                                values={rutina.items} 
                                                onReorder={(newItems: any[]) => reorderRoutineItems(rutina.id, newItems)}
                                                style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '10px', listStyle: 'none', padding: 0 }}
                                            >
                                                {rutina.items.map(item => {
                                                    const isDone = item.completed;
                                                    return (
                                                        <Reorder.Item 
                                                            key={item.id}
                                                            value={item}
                                                            style={{ 
                                                                display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 8px', 
                                                                background: isDone ? '#F9F9F9' : 'transparent', borderRadius: '10px', 
                                                                cursor: 'default',
                                                                listStyle: 'none'
                                                            }}
                                                        >
                                                            <div style={{ cursor: 'grab', color: '#DDD', display: 'flex', alignItems: 'center' }}>
                                                                <GripVertical size={14} />
                                                            </div>

                                                            <div 
                                                                onClick={() => toggleRoutineItem(rutina.id, item.id)}
                                                                style={{ 
                                                                    width: '16px', height: '16px', borderRadius: '5px', 
                                                                    border: `2px solid ${isDone ? 'var(--domain-green)' : '#DDD'}`,
                                                                    background: isDone ? 'var(--domain-green)' : 'transparent',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
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
                                                                    className="time-input-clean"
                                                                    style={{ border: 'none', background: 'transparent', fontSize: '0.65rem', fontWeight: 850, color: '#555', outline: 'none', width: '70px' }}
                                                                />
                                                            </div>

                                                            {/* Boton Promover/Desvincular Habito */}
                                                            {(() => {
                                                                const linkedHabit = habits.find(h => h.linkedRoutineItemId === item.id && h.linkedRoutineId === rutina.id);
                                                                const isLinked = !!linkedHabit;
                                                                return (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (isLinked) {
                                                                                // Desvincular: preguntar qué eliminar
                                                                                if (confirm(`¿Quitar "${linkedHabit.name}" de los hábitos?`)) {
                                                                                    const alsoRemoveItem = confirm('¿También eliminar esta tarea de la rutina?');
                                                                                    removeHabit(linkedHabit.id);
                                                                                    if (alsoRemoveItem) {
                                                                                        removeRoutineItem(rutina.id, item.id);
                                                                                    }
                                                                                }
                                                                            } else {
                                                                                // Promover a hábito con vínculo
                                                                                addHabit(item.text, rutina.repeatDays, rutina.id, item.id);
                                                                            }
                                                                        }}
                                                                        title={isLinked ? 'Quitar de hábitos' : 'Convertir en hábito'}
                                                                        style={{ background: isLinked ? 'rgba(168,218,220,0.15)' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '3px 5px', opacity: 1, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '3px' }}
                                                                        onMouseEnter={(e) => { e.currentTarget.style.background = isLinked ? 'rgba(168,218,220,0.3)' : 'rgba(0,0,0,0.06)'; }}
                                                                        onMouseLeave={(e) => { e.currentTarget.style.background = isLinked ? 'rgba(168,218,220,0.15)' : 'transparent'; }}
                                                                    >
                                                                        <Leaf size={10} color={isLinked ? 'var(--domain-green)' : '#BBB'} fill={isLinked ? 'var(--domain-green)' : 'none'} />
                                                                    </button>
                                                                );
                                                            })()}

                                                            {/* Botón Vincular con Proyecto */}
                                                            <div style={{ position: 'relative' }}>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (item.linkedProjectId) {
                                                                            // Navegar al proyecto o desvincular (aquí simplemente desvinculamos por simplicidad en este paso)
                                                                            if (confirm('¿Desvincular esta tarea del proyecto?')) {
                                                                                updateRoutineItem(rutina.id, item.id, { linkedProjectId: undefined, linkedTaskId: undefined });
                                                                            }
                                                                        } else {
                                                                            setLinkingItem(linkingItem?.iId === item.id ? null : { rId: rutina.id, iId: item.id });
                                                                        }
                                                                    }}
                                                                    title={item.linkedProjectId ? 'Ver proyecto vinculado' : 'Vincular con proyecto'}
                                                                    style={{ 
                                                                        background: item.linkedProjectId ? 'rgba(67,97,238,0.15)' : 'transparent', 
                                                                        border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '3px 5px', 
                                                                        display: 'flex', alignItems: 'center', transition: 'all 0.2s' 
                                                                    }}
                                                                >
                                                                    <Folder size={10} color={item.linkedProjectId ? 'var(--domain-purple)' : '#BBB'} fill={item.linkedProjectId ? 'var(--domain-purple)' : 'none'} />
                                                                </button>

                                                                {/* Menú de Selección de Proyecto */}
                                                                <AnimatePresence>
                                                                    {linkingItem?.iId === item.id && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                                            style={{ 
                                                                                position: 'absolute', top: '100%', right: 0, zIndex: 100,
                                                                                background: 'white', borderRadius: '12px', padding: '8px', 
                                                                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #EEE',
                                                                                minWidth: '160px', marginTop: '8px'
                                                                            }}
                                                                        >
                                                                            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#AAA', marginBottom: '6px', padding: '0 4px' }}>ENVIAR A PROYECTO:</div>
                                                                            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                                {projects.filter(p => p.status === 'activo').map(proj => (
                                                                                    <div
                                                                                        key={proj.id}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            e.preventDefault();
                                                                                            console.log("Linking to project:", proj.id, "from routine item:", item.id);
                                                                                            promoteRoutineItemToProject(rutina.id, item.id, proj.id);
                                                                                            // Pequeño timeout para asegurar que el estado se procesa antes de desmontar el menú
                                                                                            setTimeout(() => setLinkingItem(null), 100);
                                                                                        }}
                                                                                        style={{ 
                                                                                            textAlign: 'left', background: 'transparent', border: 'none', 
                                                                                            padding: '8px 10px', borderRadius: '8px', fontSize: '0.75rem', 
                                                                                            fontWeight: 800, color: 'var(--text-carbon)', cursor: 'pointer',
                                                                                            display: 'flex', alignItems: 'center', gap: '8px',
                                                                                            transition: 'all 0.2s'
                                                                                        }}
                                                                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F5F7'; e.currentTarget.style.color = proj.color; }}
                                                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-carbon)'; }}
                                                                                    >
                                                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: proj.color, boxShadow: `0 0 10px ${proj.color}44` }} />
                                                                                        {proj.name}
                                                                                    </div>
                                                                                ))}
                                                                                {projects.length === 0 && (
                                                                                    <div style={{ fontSize: '0.65rem', color: '#CCC', textAlign: 'center', padding: '10px' }}>No hay proyectos activos</div>
                                                                                )}
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>

                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); removeRoutineItem(rutina.id, item.id); }}
                                                                style={{ background: 'transparent', border: 'none', color: '#EEE', cursor: 'pointer', padding: '4px', opacity: 0.1 }}
                                                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.1'}
                                                            >
                                                                <Trash2 size={10} color="#f87171" />
                                                            </button>
                                                        </Reorder.Item>
                                                    );
                                                })}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', border: '1px dashed #DDD', borderRadius: '12px' }}>
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
                                            </Reorder.Group>
                                        )}
                                    </div>
                                ));
                            })()}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="semana"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="vida-main-container"
                            style={{ overflowX: 'auto' }}
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
            </div> {/* FIN DE LA COLUMNA DE RUTINAS */}
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
        </div>
    );
};
