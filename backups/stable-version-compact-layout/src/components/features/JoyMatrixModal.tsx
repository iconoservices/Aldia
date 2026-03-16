import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Zap, Clock, Trash2 } from 'lucide-react';
import type { Mission } from '../../hooks/useAlDiaState';

interface JoyMatrixModalProps {
    isOpen: boolean;
    onClose: () => void;
    missions: Mission[];
    toggleMission: (id: number, q: string) => void;
}

export const JoyMatrixModal = ({ isOpen, onClose, missions, toggleMission }: JoyMatrixModalProps) => {
    const quadrants = [
        { id: 'Q1', title: 'HACER/URGENTE', subtitle: 'Hazlo Ahora', color: '#FF8C42', icon: <Zap size={20} /> },
        { id: 'Q2', title: 'ENFOCAR/NO URGENTE', subtitle: 'Planifica', color: '#3b82f6', icon: <Target size={20} /> },
        { id: 'Q3', title: 'DELEGAR', subtitle: 'Si puedes, delega', color: '#a855f7', icon: <Clock size={20} /> },
        { id: 'Q4', title: 'ELIMINAR', subtitle: 'Fuego lento / Elimina', color: '#94a3b8', icon: <Trash2 size={20} /> },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={overlayStyle}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={backdropStyle}
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        style={containerStyle}
                    >
                        <div style={headerStyle}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>Misión: Matriz Joy ⊞</h2>
                            <button onClick={onClose} style={closeBtnStyle}><X size={24} /></button>
                        </div>

                        <div style={matrixGridStyle}>
                            {quadrants.map(q => (
                                <div key={q.id} style={{ ...quadrantContainerStyle, borderColor: q.color + '33' }}>
                                    <div style={{ ...quadrantHeaderStyle, color: q.color }}>
                                        {q.icon}
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>{q.title}</p>
                                            <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 600, opacity: 0.7 }}>{q.subtitle}</p>
                                        </div>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 900, opacity: 0.2 }}>{q.id}</span>
                                    </div>

                                    <div style={missionListStyle}>
                                        {missions.filter(m => m.q === q.id).length === 0 ? (
                                            <p style={emptyStateStyle}>Vacío</p>
                                        ) : (
                                            missions.filter(m => m.q === q.id).map(mission => (
                                                <div 
                                                    key={mission.id} 
                                                    onClick={() => toggleMission(mission.id, mission.q)}
                                                    style={{ 
                                                        ...missionItemStyle, 
                                                        background: mission.completed ? '#f9f9f9' : 'white',
                                                        opacity: mission.completed ? 0.6 : 1,
                                                        borderLeft: `4px solid ${mission.completed ? '#DDD' : q.color}`
                                                    }}
                                                >
                                                    <span style={{ 
                                                        fontSize: '0.82rem', 
                                                        fontWeight: 700,
                                                        textDecoration: mission.completed ? 'line-through' : 'none',
                                                        color: mission.completed ? '#AAA' : '#333'
                                                    }}>
                                                        {mission.text}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={footerStyle}>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#888', fontWeight: 600 }}>
                                * Prioriza las misiones de <b>Q1</b> y agenda las de <b>Q2</b> para alcanzar tu Performance Score.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' };
const backdropStyle: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(253, 248, 245, 0.9)', backdropFilter: 'blur(10px)' };
const containerStyle: React.CSSProperties = { position: 'relative', width: '100%', maxWidth: '900px', background: 'white', borderRadius: '35px', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' };
const headerStyle: React.CSSProperties = { padding: '1.8rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F0F0F0' };
const closeBtnStyle: React.CSSProperties = { border: 'none', background: '#f5f5f5', borderRadius: '50%', padding: '10px', cursor: 'pointer', color: '#888', display: 'flex' };
const matrixGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '1rem', padding: '1.5rem', flex: 1, overflowY: 'auto' };
const quadrantContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', background: '#FDFDFD', borderRadius: '24px', border: '1px solid transparent', padding: '1.2rem', minHeight: '180px' };
const quadrantHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem' };
const missionListStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.6rem' };
const missionItemStyle: React.CSSProperties = { padding: '0.8rem 1rem', borderRadius: '15px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center' };
const emptyStateStyle: React.CSSProperties = { textAlign: 'center', fontSize: '0.75rem', color: '#BBB', margin: '1rem 0', fontWeight: 600 };
const footerStyle: React.CSSProperties = { padding: '1.5rem 2rem', background: '#F9F9F9', textAlign: 'center' };
