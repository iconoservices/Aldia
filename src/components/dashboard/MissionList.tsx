import { useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export const MissionList = () => {
    const [missions, setMissions] = useState([
        { id: 1, text: 'Pagar Luz (Vence Hoy)', q: 'Q1', critical: true, completed: false },
        { id: 2, text: 'Terminar maquetación AlDía', q: 'Q2', critical: false, completed: false },
        { id: 3, text: 'Diseñar Menú Radial (+)', q: 'Q2', critical: false, completed: false },
        { id: 4, text: 'Revisar emails de suscripciones', q: 'Q3', critical: false, completed: false },
    ]);

    const handleToggle = (id: number, q: string) => {
        setMissions(prev => prev.map(m => {
            if (m.id === id) {
                if (!m.completed) {
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
                }
                return { ...m, completed: !m.completed };
            }
            return m;
        }));
    };

    return (
        <div style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0 }}>Misiones</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ⊞ Matriz Joy
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--domain-orange)', fontWeight: 600, cursor: 'pointer' }}>Timeline ⭢</span>
                </div>
            </div>

            <div className="time-block-container" style={{ background: '#F0EBE6', padding: '0.8rem', borderRadius: '24px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.8rem', color: '#999', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <span>⚡ TRABAJO (14:00 - 18:00)</span>
                </div>

                <div className="mission-list">
                    {missions.map((mission) => (
                        <motion.div
                            key={mission.id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleToggle(mission.id, mission.q)}
                            className={`mission-item ${mission.critical ? 'critical-alert' : ''}`}
                            style={{
                                background: mission.completed ? '#E0D7D0' : (mission.critical ? 'var(--domain-orange)' : 'white'),
                                border: 'none',
                                padding: '0.8rem 1rem',
                                marginBottom: '0.8rem',
                                boxShadow: mission.critical && !mission.completed ? '0 8px 20px rgba(255, 140, 66, 0.3)' : '0 2px 8px rgba(0,0,0,0.02)',
                                position: 'relative',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                opacity: mission.completed ? 0.6 : 1,
                                transition: 'all 0.3s ease'
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={{ 
                                        fontSize: '0.65rem', 
                                        fontWeight: 900, 
                                        color: mission.critical ? 'white' : (mission.completed ? '#888' : 'var(--domain-orange)'),
                                        background: mission.critical ? 'rgba(0,0,0,0.15)' : 'transparent', 
                                        padding: mission.critical ? '2px 6px' : '0', 
                                        borderRadius: '4px', 
                                        textTransform: 'uppercase', 
                                        letterSpacing: '1px' 
                                    }}>
                                        {mission.completed ? 'Misión Cumplida' : (mission.id === 2 ? 'En Curso' : (mission.critical ? '🏆 Hito Alcanzado' : 'Próxima'))}
                                    </span>
                                    <span style={{ 
                                        fontSize: '0.6rem', 
                                        color: mission.critical ? 'white' : '#888', 
                                        fontWeight: 800, 
                                        background: mission.critical ? 'rgba(255,255,255,0.2)' : '#F0EBE6', 
                                        padding: '2px 6px', 
                                        borderRadius: '8px' 
                                    }}>
                                        {mission.q}
                                    </span>
                                </div>
                                <p style={{ 
                                    margin: '2px 0 0 0', 
                                    fontWeight: 800, 
                                    color: mission.critical ? 'white' : (mission.completed ? '#888' : 'var(--text-carbon)'), 
                                    fontSize: '0.95rem',
                                    textDecoration: mission.completed ? 'line-through' : 'none'
                                }}>
                                    {mission.text}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
