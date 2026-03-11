import { useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { JoyMatrixModal } from '../features/JoyMatrixModal';
import { Repeat, Link, Calendar, Clock } from 'lucide-react';
import type { Mission } from '../../hooks/useAlDiaState';

interface MissionListProps {
    missions: Mission[];
    toggleMission: (id: number) => void;
    onOpenNote?: (id: number) => void;
    title?: string;
    showTimeBlock?: boolean;
    showMatrixLinks?: boolean;
    hideOnEmpty?: boolean;
    onTimelineClick?: () => void;
}

export const MissionList = ({ missions, toggleMission, onOpenNote, title = 'Tareas', showTimeBlock = true, showMatrixLinks = true, hideOnEmpty = false, onTimelineClick }: MissionListProps) => {
    const [isMatrixOpen, setIsMatrixOpen] = useState(false);

    const handleToggle = (id: number, q: string) => {
        const mission = missions.find(m => m.id === id);
        if (mission?.completed) {
            toggleMission(id);
            return;
        }

        // Disparar confeti si se está completando
        const scalar = 2;
        const triangle = confetti.shapeFromPath({ path: 'M0 10 L5 0 L10 10z' });

        confetti({
            particleCount: q === 'Q1' ? 100 : 40,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FF8C42', '#FFA500', '#FFD700'],
            shapes: [triangle, 'circle'],
            scalar
        });

        toggleMission(id);
    };

    if (hideOnEmpty && missions.length === 0) return null;

    return (
        <div style={{ marginTop: '0.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                <h3 style={{ margin: 0 }}>{title}</h3>
                {showMatrixLinks && (
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <span 
                            onClick={() => setIsMatrixOpen(true)}
                            style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            ⊞ Matriz Joy
                        </span>
                        <span 
                            onClick={onTimelineClick}
                            style={{ fontSize: '0.75rem', color: 'var(--domain-orange)', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Timeline ⭢
                        </span>
                    </div>
                )}
            </div>

            <div
                className={showTimeBlock ? "time-block-container" : ""}
                style={showTimeBlock ? { background: '#F0EBE6', padding: '0.6rem', borderRadius: '20px', position: 'relative' } : {}}
            >
                <div className="mission-list">
                    {missions.length === 0 ? (
                        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.5)', border: '2px dashed #DDD' }}>
                            <p style={{ margin: 0, fontWeight: 700, color: '#AAA' }}>No hay misiones hoy</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#BBB' }}>Pulsa el botón + para empezar</p>
                        </div>
                    ) : [...missions].sort((a, b) => Number(a.completed) - Number(b.completed)).map((mission) => (
                        <motion.div
                            layout // Añadir layout para animación suave de reordenamiento
                            key={mission.id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleToggle(mission.id, mission.q)}
                            className={`mission-item ${mission.critical && !mission.completed ? 'critical-alert' : ''}`}
                            style={{
                                opacity: mission.completed ? 0.6 : 1,
                                background: mission.completed ? '#f5f5f5' : (mission.critical ? 'var(--domain-orange)' : 'white'),
                            }}
                        >
                            {mission.critical && !mission.completed && (
                                <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '140%', height: '200%', background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
                            )}

                            <div className="circle-check" style={{
                                borderColor: mission.completed ? 'var(--domain-green)' : (mission.critical ? 'white' : '#DDD'),
                                background: mission.completed ? 'var(--domain-green)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {mission.completed && <span style={{ color: 'white', fontSize: '0.8rem' }}>✓</span>}
                            </div>

                            <div style={{ width: '100%', zIndex: 1 }}>
                                {(!mission.critical || mission.completed) && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 900,
                                            color: mission.completed ? '#888' : 'var(--domain-orange)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px'
                                        }}>
                                            {mission.completed ? 'Misión Cumplida' : 'En Curso'}
                                        </span>
                                        <span style={{
                                            fontSize: '0.6rem',
                                            color: '#888',
                                            fontWeight: 800,
                                            background: '#F0EBE6',
                                            padding: '2px 6px',
                                            borderRadius: '8px'
                                        }}>
                                            {mission.q}
                                        </span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: (mission.critical && !mission.completed) ? '0' : '2px' }}>
                                    <p style={{
                                        margin: '0',
                                        fontWeight: 800,
                                        color: mission.critical ? 'white' : (mission.completed ? '#888' : 'var(--text-carbon)'),
                                        fontSize: '0.95rem',
                                        textDecoration: mission.completed ? 'line-through' : 'none'
                                    }}>
                                        {mission.text}
                                    </p>
                                    {(mission.critical && !mission.completed) && (
                                        <span style={{
                                            fontSize: '0.6rem',
                                            color: 'white',
                                            fontWeight: 800,
                                            background: 'rgba(255,255,255,0.2)',
                                            padding: '2px 6px',
                                            borderRadius: '8px'
                                        }}>
                                            {mission.q}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                    {mission.repeat !== 'none' && (
                                        <span style={{ 
                                            fontSize: '0.6rem', 
                                            color: mission.critical ? 'white' : 'var(--domain-orange)', 
                                            fontWeight: 800,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            background: mission.critical ? 'rgba(255,255,255,0.1)' : '#F9F9F9',
                                            padding: '2px 6px',
                                            borderRadius: '6px'
                                        }}>
                                            <Repeat size={10} /> {mission.repeat === 'daily' ? 'Diaria' : mission.repeat === 'weekly' ? 'Semanal' : 'Mensual'}
                                        </span>
                                    )}
                                    {mission.noteId && (
                                        <span 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenNote && onOpenNote(mission.noteId!);
                                            }}
                                            style={{ 
                                                fontSize: '0.6rem', 
                                                color: mission.critical ? 'white' : '#666', 
                                                fontWeight: 800,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                background: mission.critical ? 'rgba(255,255,255,0.1)' : '#F5F5F5',
                                                padding: '2px 6px',
                                                borderRadius: '6px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Link size={10} /> Nota
                                        </span>
                                    )}
                                    {mission.labels?.map((label, idx) => (
                                        <span key={idx} style={{ 
                                            fontSize: '0.6rem', 
                                            color: mission.critical ? 'white' : 'var(--domain-green)', 
                                            fontWeight: 800,
                                            background: mission.critical ? 'rgba(255,255,255,0.1)' : '#ECFDF5',
                                            padding: '2px 6px',
                                            borderRadius: '6px'
                                        }}>
                                            #{label}
                                        </span>
                                    ))}
                                    {mission.dueDate && (
                                        <span style={{ 
                                            fontSize: '0.6rem', 
                                            color: mission.critical ? 'white' : '#888', 
                                            fontWeight: 800,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            padding: '2px 6px'
                                        }}>
                                            <Calendar size={10} /> {new Date(mission.dueDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                        </span>
                                    )}
                                    {mission.dueTime && (
                                        <span style={{ 
                                            fontSize: '0.6rem', 
                                            color: mission.critical ? 'white' : 'var(--domain-orange)', 
                                            fontWeight: 800,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            background: mission.critical ? 'rgba(255,255,255,0.1)' : 'rgba(255,140,66,0.1)',
                                            padding: '2px 6px',
                                            borderRadius: '6px'
                                        }}>
                                            <Clock size={10} /> {mission.dueTime}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <JoyMatrixModal 
                isOpen={isMatrixOpen}
                onClose={() => setIsMatrixOpen(false)}
                missions={missions}
                toggleMission={handleToggle}
            />
        </div>
    );
};
