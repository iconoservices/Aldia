import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Receipt, TrendingUp, Target, Lightbulb, Calendar } from 'lucide-react';
import { QuickActionPanel } from './QuickActionPanel';

interface SuperFabProps {
    addMission: (text: string, q?: string, repeat?: 'none' | 'daily' | 'weekly' | 'monthly', noteId?: number, labels?: string[], dueDate?: string, dueTime?: string, habitId?: number, projectId?: number) => void;
    addTransaction: (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projectId?: number) => void;
    addHabit: (name: string) => void;
    addCalendarEvent: (title: string, date: string, start: string, end: string, desc: string) => void;
    addNote: (title: string, content: string, type: 'text' | 'checklist', items: { text: string; completed: boolean }[], q: string, color: string) => void;
    addTimeBlock: (label: string, start: string, end: string, color: string, projectId?: number) => void;
    addProject?: (name: string, color: string, targetHoursPerWeek?: number) => void;
    projects?: { id: number, name: string, color: string }[];
    rutinas?: { id: number, title: string, color: string }[];
    forceOpenType?: string | null;
    onForceOpenClose?: () => void;
}

export const SuperFab = ({ addMission, addTransaction, addHabit, addCalendarEvent, addNote, addTimeBlock, addProject, projects = [], rutinas = [], forceOpenType = null, onForceOpenClose }: SuperFabProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [actionType, setActionType] = useState<string | null>(null);

    // Efecto para abrir forzado desde afuera (ej: botón NUEVO en proyectos)
    useEffect(() => {
        if (forceOpenType) {
            setActionType(forceOpenType);
            onForceOpenClose && onForceOpenClose();
        }
    }, [forceOpenType, onForceOpenClose]);

    const menuItems = [
        { id: 'nota', icon: <Lightbulb size={24} />, color: '#facc15', label: 'Nota' },
        { id: 'agenda', icon: <Calendar size={24} />, color: '#f59e0b', label: 'Agenda' },
        { id: 'tarea', icon: <Target size={24} />, color: '#3b82f6', label: 'Tarea' },
    ];

    return (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
            {/* OVERLAY DARK SEMI-TRANSPARENTE */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(4px)',
                            zIndex: -1
                        }}
                    />
                )}
            </AnimatePresence>

            {/* BOTONES RADIALES (BURBUJAS) */}
            <div style={{ position: 'relative' }}>
                <AnimatePresence>
                    {isOpen && menuItems.map((item, index) => {
                        const startAngle = Math.PI * 1.02; // Más cerca de 180 grados
                        const endAngle = Math.PI * 1.55; // Pasa los 270 grados (arriba)
                        const angle = startAngle + (index / (menuItems.length - 1)) * (endAngle - startAngle);

                        const radius = 160; 
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * (radius + 20); // Empujar más alto en el eje Y

                        return (
                            <motion.button
                                key={item.id}
                                initial={{ scale: 0, x: 0, y: 0 }}
                                animate={{ scale: 1, x, y }}
                                exit={{ scale: 0, x: 0, y: 0 }}
                                whileHover={{ scale: 1.15, filter: 'brightness(1.1)' }}
                                transition={{ 
                                    type: 'spring', 
                                    stiffness: 500, // Más rígido para rebote rápido
                                    damping: 15,    // Menos amortiguación para más oscilación
                                    delay: index * 0.03 
                                }}
                                style={{
                                    position: 'absolute',
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '50%',
                                    background: item.color,
                                    border: 'none',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                                    cursor: 'pointer',
                                    left: '4px',
                                    top: '4px'
                                }}
                                onClick={() => {
                                    setActionType(item.id);
                                    setIsOpen(false);
                                }}
                            >
                                {item.icon}
                                <motion.span
                                    initial={{ opacity: 0, y: -10, x: '-50%' }}
                                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                                    style={{
                                        position: 'absolute',
                                        top: '115%', // Debajo del botón
                                        left: '50%', // Centrado horizontal
                                        fontSize: '0.75rem',
                                        fontWeight: 900,
                                        color: '#333',
                                        background: 'rgba(255,255,255,0.95)',
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                        whiteSpace: 'nowrap',
                                        border: `2px solid ${item.color}`
                                    }}
                                >
                                    {item.label}
                                </motion.span>
                            </motion.button>
                        );
                    })}
                </AnimatePresence>

                {/* BOTONES PRINCIPALES RAPIDOS (ENCIMA DEL MAS) */}
                <div style={{ position: 'absolute', bottom: '70px', left: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <AnimatePresence>
                        {!isOpen && (
                            <>
                                <motion.button
                                    initial={{ opacity: 0, scale: 0, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    onClick={() => setActionType('ingreso')}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    style={{
                                        width: '52px', height: '52px', borderRadius: '50%',
                                        background: '#4ade80', border: 'none', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 6px 20px rgba(74, 222, 128, 0.4)', cursor: 'pointer'
                                    }}
                                >
                                    <TrendingUp size={24} />
                                </motion.button>
                                <motion.button
                                    initial={{ opacity: 0, scale: 0, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    onClick={() => setActionType('gasto')}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    style={{
                                        width: '52px', height: '52px', borderRadius: '50%',
                                        background: '#f87171', border: 'none', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 6px 20px rgba(248, 113, 113, 0.4)', cursor: 'pointer'
                                    }}
                                >
                                    <Receipt size={24} />
                                </motion.button>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* BOTÓN PRINCIPAL (+) */}
                <motion.button
                    onClick={() => setIsOpen(!isOpen)}
                    animate={{ rotate: isOpen ? 45 : 0, scale: isOpen ? 0.9 : 1 }}
                    whileTap={{ scale: 0.8 }}
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: isOpen ? '#1A1A1A' : 'var(--domain-orange)',
                        color: 'white',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 25px rgba(255, 140, 66, 0.4)',
                        cursor: 'pointer',
                        zIndex: 10
                    }}
                >
                    {isOpen ? <X size={28} /> : <Plus size={32} strokeWidth={2.5} />}
                </motion.button>
            </div>

            {/* PANEL EMERGENTE DE ACCIÓN */}
            <QuickActionPanel
                isOpen={!!actionType}
                actionType={actionType}
                onClose={() => setActionType(null)}
                addMission={addMission}
                addTransaction={addTransaction}
                addHabit={addHabit}
                addCalendarEvent={addCalendarEvent}
                addNote={addNote}
                addTimeBlock={addTimeBlock}
                addProject={addProject}
                projects={projects}
                rutinas={rutinas}
            />
        </div>
    );
};
