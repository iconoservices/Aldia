import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import type { Routine } from '../../hooks/useAlDiaState';

interface RoutineEditOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    routine: Routine;
    onSave: (id: number, updates: Partial<Routine>) => void;
}

export const RoutineEditOverlay = ({ isOpen, onClose, routine, onSave }: RoutineEditOverlayProps) => {
    const [title, setTitle] = useState(routine.title);
    const [color, setColor] = useState(routine.color);
    const [repeatDays, setRepeatDays] = useState(routine.repeatDays || [0, 1, 2, 3, 4, 5, 6]);
    const [startTime, setStartTime] = useState(routine.startTime || '09:00');
    const [endTime, setEndTime] = useState(routine.endTime || '10:00');

    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const colors = ['#f59e0b', '#8b5cf6', '#3b82f6', '#10b981', '#ef4444', '#f43f5e', '#6366f1'];

    const handleSave = () => {
        onSave(routine.id, { title, color, repeatDays, startTime, endTime });
        onClose();
    };

    const toggleDay = (idx: number) => {
        setRepeatDays(prev => 
            prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={overlayWrapperStyle}>
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={onClose} 
                        style={backdropStyle} 
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        style={modalStyle}
                    >
                        <button onClick={onClose} style={closeButtonStyle}><X size={20} /></button>
                        
                        <h2 style={titleStyle}>Editar Rutina</h2>
                        
                        <div style={formGroupStyle}>
                            <label style={labelStyle}>NOMBRE</label>
                            <input 
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)} 
                                style={inputStyle}
                                placeholder="Ej. Mañana Focus"
                            />
                        </div>

                        <div style={formGroupStyle}>
                            <label style={labelStyle}>COLOR</label>
                            <div style={colorGridStyle}>
                                {colors.map(c => (
                                    <div 
                                        key={c}
                                        onClick={() => setColor(c)}
                                        style={{ ...colorCircleStyle, background: c, border: color === c ? '3px solid white' : 'none', boxShadow: color === c ? `0 0 0 2px ${c}` : 'none' }}
                                    >
                                        {color === c && <Check size={14} color="white" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={formGroupStyle}>
                            <label style={labelStyle}>REPETIR DÍAS</label>
                            <div style={dayGridStyle}>
                                {days.map((d, i) => (
                                    <div 
                                        key={i}
                                        onClick={() => toggleDay(i)}
                                        style={{ ...dayToggleStyle, background: repeatDays.includes(i) ? color : '#F5F5F5', color: repeatDays.includes(i) ? 'white' : '#888' }}
                                    >
                                        {d}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={formGroupStyle}>
                                <label style={labelStyle}>INICIO</label>
                                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
                            </div>
                            <div style={formGroupStyle}>
                                <label style={labelStyle}>FIN</label>
                                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
                            </div>
                        </div>

                        <button onClick={handleSave} style={{ ...saveButtonStyle, background: color }}>GUARDAR CAMBIOS</button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const overlayWrapperStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' };
const backdropStyle: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(10px)' };
const modalStyle: React.CSSProperties = { position: 'relative', width: '100%', maxWidth: '400px', background: 'white', borderRadius: '32px', padding: '2.5rem 2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.1)' };
const closeButtonStyle: React.CSSProperties = { position: 'absolute', top: '1.2rem', right: '1.2rem', border: 'none', background: '#F5F5F5', padding: '10px', borderRadius: '50%', cursor: 'pointer', color: '#666' };
const titleStyle: React.CSSProperties = { margin: '0 0 2rem 0', fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-carbon)', textAlign: 'center' };
const formGroupStyle: React.CSSProperties = { marginBottom: '1.5rem' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.65rem', fontWeight: 900, color: '#AAA', letterSpacing: '1px', marginBottom: '8px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 16px', borderRadius: '14px', border: '2px solid #F0F0F0', fontSize: '0.9rem', fontWeight: 700, outline: 'none', transition: 'border-color 0.2s', color: 'var(--text-carbon)' };
const colorGridStyle: React.CSSProperties = { display: 'flex', gap: '10px', flexWrap: 'wrap' };
const colorCircleStyle: React.CSSProperties = { width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const dayGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' };
const dayToggleStyle: React.CSSProperties = { height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s' };
const saveButtonStyle: React.CSSProperties = { width: '100%', padding: '1.2rem', borderRadius: '18px', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' };
