import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Palette, CheckCircle2 } from 'lucide-react';

interface TimeBlockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (label: string, start: string, end: string, color: string) => void;
}

export const TimeBlockModal = ({ isOpen, onClose, onAdd }: TimeBlockModalProps) => {
    const [label, setLabel] = useState('');
    const [start, setStart] = useState('09:00');
    const [end, setEnd] = useState('10:00');
    const [color, setColor] = useState('#8A5CF6');

    const colors = [
        { name: 'Purple', value: '#8A5CF6' },
        { name: 'Blue', value: '#3B82F6' },
        { name: 'Orange', value: '#FF8C42' },
        { name: 'Green', value: '#10B981' },
        { name: 'Pink', value: '#EC4899' },
        { name: 'Indigo', value: '#6366F1' }
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (label.trim()) {
            onAdd(label, start, end, color);
            setLabel('');
            onClose();
        }
    };

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
                        style={modalStyle}
                    >
                        <div style={headerStyle}>
                            <h2 style={titleStyle}>🛡️ Crear Bloque de Poder</h2>
                            <button onClick={onClose} style={closeButtonStyle}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} style={formStyle}>
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>NOMBRE DEL BLOQUE</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Deep Work, Gimnasio..."
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    autoFocus
                                    style={textInputStyle}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div style={inputGroupStyle}>
                                    <label style={labelStyle}><Clock size={12} style={{marginRight: '4px'}} /> INICIO</label>
                                    <input
                                        type="time"
                                        value={start}
                                        onChange={(e) => setStart(e.target.value)}
                                        style={timeInputStyle}
                                    />
                                </div>
                                <div style={inputGroupStyle}>
                                    <label style={labelStyle}><Clock size={12} style={{marginRight: '4px'}} /> FIN</label>
                                    <input
                                        type="time"
                                        value={end}
                                        onChange={(e) => setEnd(e.target.value)}
                                        style={timeInputStyle}
                                    />
                                </div>
                            </div>

                            <div style={inputGroupStyle}>
                                <label style={labelStyle}><Palette size={12} style={{marginRight: '4px'}} /> COLOR DEL BLOQUE</label>
                                <div style={colorGridStyle}>
                                    {colors.map((c) => (
                                        <div
                                            key={c.value}
                                            onClick={() => setColor(c.value)}
                                            style={{
                                                ...colorItemStyle,
                                                background: c.value,
                                                border: color === c.value ? '3px solid white' : 'none',
                                                boxShadow: color === c.value ? `0 0 0 2px ${c.value}` : 'none',
                                                transform: color === c.value ? 'scale(1.1)' : 'scale(1)'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <button type="submit" style={{
                                ...submitButtonStyle,
                                background: color,
                                boxShadow: `0 10px 20px ${color}33`
                            }}>
                                <CheckCircle2 size={18} style={{marginRight: '8px'}} />
                                GUARDAR BLOQUE
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' };
const backdropStyle: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(253, 248, 245, 0.9)', backdropFilter: 'blur(8px)' };
const modalStyle: React.CSSProperties = { position: 'relative', width: '100%', maxWidth: '400px', background: 'white', borderRadius: '32px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' };
const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' };
const titleStyle: React.CSSProperties = { margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#1A1A1A' };
const closeButtonStyle: React.CSSProperties = { border: 'none', background: '#F5F5F5', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#888' };
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1.2rem' };
const inputGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px' };
const labelStyle: React.CSSProperties = { fontSize: '0.65rem', fontWeight: 900, color: '#AAA', letterSpacing: '1px' };
const textInputStyle: React.CSSProperties = { padding: '12px 16px', borderRadius: '14px', border: '2px solid #F0F0F0', fontSize: '1rem', fontWeight: 700, outline: 'none', color: '#1A1A1A' };
const timeInputStyle: React.CSSProperties = { padding: '10px 14px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '0.9rem', fontWeight: 800, color: '#333' };
const colorGridStyle: React.CSSProperties = { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' };
const colorItemStyle: React.CSSProperties = { width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s ease' };
const submitButtonStyle: React.CSSProperties = { marginTop: '1rem', padding: '14px', border: 'none', borderRadius: '18px', color: 'white', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' };
