import { useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { JoyMatrixModal } from '../features/JoyMatrixModal';
import { Repeat, Link, Calendar, Clock } from 'lucide-react';
import type { Mission, Project } from '../../hooks/useAlDiaState';

interface MissionListProps {
    missions: Mission[];
    toggleMission: (id: number) => void;
    onOpenNote?: (id: number) => void;
    title?: string;
    showTimeBlock?: boolean;
    showMatrixLinks?: boolean;
    hideOnEmpty?: boolean;
    onTimelineClick?: () => void;
    projects?: Project[];
}

export const MissionList = ({ missions, toggleMission, onOpenNote, title = 'Tareas', showTimeBlock = true, showMatrixLinks = true, hideOnEmpty = false, onTimelineClick, projects = [] }: MissionListProps) => {
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
                <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.7 }}>{title}</h3>
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
                <div className="mission-list" style={{ gap: '0.3rem' }}>
                    {missions.length === 0 ? (
                        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.5)', border: '2px dashed #DDD' }}>
                            <p style={{ margin: 0, fontWeight: 700, color: '#AAA' }}>No hay misiones hoy</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#BBB' }}>Pulsa el botón + para empezar</p>
                        </div>
                    ) : [...missions].sort((a, b) => {
                        // 1. Q1 no completadas primero
                        const aQ1 = a.q === 'Q1' && !a.completed;
                        const bQ1 = b.q === 'Q1' && !b.completed;
                        if (aQ1 && !bQ1) return -1;
                        if (!aQ1 && bQ1) return 1;
                        // 2. Por estado completado
                        return Number(a.completed) - Number(b.completed);
                    }).map((mission) => {
                        const isPinnedQ1 = mission.q === 'Q1' && !mission.completed;
                        
                        return (
                            <motion.div
                                layout
                                key={mission.id}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleToggle(mission.id, mission.q)}
                                className={`mission-item ${isPinnedQ1 ? 'critical-alert' : ''}`}
                                style={{
                                    opacity: mission.completed ? 0.6 : 1,
                                    background: mission.completed ? '#f5f5f5' : (isPinnedQ1 ? 'var(--domain-orange)' : 'white'),
                                    position: 'relative'
                                }}
                            >
                                {isPinnedQ1 && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 60%)', pointerEvents: 'none' }}></div>
                                )}

                                <div className="circle-check" style={{
                                    borderColor: mission.completed ? 'var(--domain-green)' : (isPinnedQ1 ? 'white' : '#DDD'),
                                    background: mission.completed ? 'var(--domain-green)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 2
                                }}>
                                    {mission.completed && <span style={{ color: 'white', fontSize: '0.8rem' }}>✓</span>}
                                </div>

                                <div style={{ width: '100%', zIndex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 900,
                                            color: mission.completed ? '#888' : (isPinnedQ1 ? 'white' : 'var(--domain-orange)'),
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            opacity: isPinnedQ1 ? 0.9 : 1
                                        }}>
                                            {mission.completed ? 'Misión Cumplida' : 'En Curso'}
                                        </span>
                                        <span style={{
                                            fontSize: '0.6rem',
                                            color: isPinnedQ1 ? 'white' : '#888',
                                            fontWeight: 800,
                                            background: isPinnedQ1 ? 'rgba(255,255,255,0.2)' : '#F0EBE6',
                                            padding: '2px 6px',
                                            borderRadius: '8px'
                                        }}>
                                            {mission.q}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                        <p style={{
                                            margin: '0',
                                            fontWeight: 800,
                                            color: isPinnedQ1 ? 'white' : (mission.completed ? '#888' : 'var(--text-carbon)'),
                                            fontSize: '0.9rem',
                                            textDecoration: mission.completed ? 'line-through' : 'none',
                                            lineHeight: 1.2
                                        }}>
                                            {mission.text}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                                        {/* BADGE DE PROYECTO */}
                                        {mission.projectId && projects.find(p => p.id === mission.projectId) && (
                                            <span style={{ 
                                                fontSize: '0.6rem', 
                                                color: isPinnedQ1 ? 'white' : projects.find(p => p.id === mission.projectId)!.color, 
                                                fontWeight: 900,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                background: isPinnedQ1 ? 'rgba(255,255,255,0.1)' : `${projects.find(p => p.id === mission.projectId)!.color}20`,
                                                padding: '2px 6px',
                                                borderRadius: '6px',
                                                border: isPinnedQ1 ? 'none' : `1px solid ${projects.find(p => p.id === mission.projectId)!.color}40`,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {projects.find(p => p.id === mission.projectId)!.name}
                                            </span>
                                        )}
                                        {mission.repeat !== 'none' && (
                                            <span style={{ 
                                                fontSize: '0.6rem', 
                                                color: isPinnedQ1 ? 'white' : 'var(--domain-orange)', 
                                                fontWeight: 800,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                background: isPinnedQ1 ? 'rgba(255,255,255,0.1)' : '#F9F9F9',
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
                                                    color: isPinnedQ1 ? 'white' : '#666', 
                                                    fontWeight: 800,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    background: isPinnedQ1 ? 'rgba(255,255,255,0.1)' : '#F5F5F5',
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
                                                color: isPinnedQ1 ? 'white' : 'var(--domain-green)', 
                                                fontWeight: 800,
                                                background: isPinnedQ1 ? 'rgba(255,255,255,0.1)' : '#ECFDF5',
                                                padding: '2px 6px',
                                                borderRadius: '6px'
                                            }}>
                                                #{label}
                                            </span>
                                        ))}
                                        {mission.dueDate && (
                                            <span style={{ 
                                                fontSize: '0.6rem', 
                                                color: isPinnedQ1 ? 'white' : '#888', 
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
                                                color: isPinnedQ1 ? 'white' : 'var(--domain-orange)', 
                                                fontWeight: 800,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                background: isPinnedQ1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,140,66,0.1)',
                                                padding: '2px 6px',
                                                borderRadius: '6px'
                                            }}>
                                                <Clock size={10} /> {mission.dueTime}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
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
