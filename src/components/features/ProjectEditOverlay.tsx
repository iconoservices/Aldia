import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Archive, Play, Palette, Tag } from 'lucide-react';
import type { Project } from '../../hooks/useAlDiaState';

interface ProjectEditOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project | null;
    updateProject: (id: number, updates: Partial<Project>) => void;
}

const PREDEFINED_COLORS = [
    '#3b82f6', // Blue
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#64748b'  // Slate
];

export const ProjectEditOverlay = ({ isOpen, onClose, project, updateProject }: ProjectEditOverlayProps) => {
    const [name, setName] = useState('');
    const [color, setColor] = useState('#3b82f6');
    const [status, setStatus] = useState<'activo' | 'pausado' | 'completado'>('activo');

    useEffect(() => {
        if (project) {
            setName(project.name);
            setColor(project.color);
            setStatus(project.status || 'activo');
        }
    }, [project]);

    const handleSave = () => {
        if (!project) return;
        updateProject(project.id, {
            name,
            color,
            status
        });
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && project && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
                    />
                    
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '450px',
                            background: 'white',
                            borderRadius: '32px',
                            padding: '2rem',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                            overflow: 'hidden'
                        }}
                    >
                        {/* HEADER */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-carbon)' }}>Editar Proyecto</h2>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#888', fontWeight: 600 }}>Personaliza tu entorno de trabajo</p>
                            </div>
                            <button onClick={onClose} style={{ border: 'none', background: '#F5F5F5', padding: '8px', borderRadius: '50%', cursor: 'pointer', color: '#888' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            {/* TEXTO */}
                            <div style={{ background: '#F9F9F9', padding: '1rem', borderRadius: '20px', borderLeft: `6px solid ${color}` }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 900, color: '#BBB', textTransform: 'uppercase', marginBottom: '4px' }}>
                                    <Tag size={12} /> Nombre del Proyecto
                                </label>
                                <input 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Nombre del proyecto..."
                                    style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '1.2rem', fontWeight: 900, outline: 'none', color: 'var(--text-carbon)' }}
                                />
                            </div>

                            {/* COLOR PIPETTE */}
                            <div style={{ background: '#F9F9F9', padding: '1rem', borderRadius: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 900, color: '#BBB', textTransform: 'uppercase', marginBottom: '10px' }}>
                                    <Palette size={12} /> Color de Énfasis
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {PREDEFINED_COLORS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setColor(c)}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%',
                                                background: c,
                                                border: color === c ? '3px solid #333' : '2px solid transparent',
                                                cursor: 'pointer',
                                                transition: 'transform 0.1s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                        />
                                    ))}
                                    <input 
                                        type="color" 
                                        value={color} 
                                        onChange={(e) => setColor(e.target.value)}
                                        style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', overflow: 'hidden', cursor: 'pointer', padding: 0 }}
                                    />
                                </div>
                            </div>

                            {/* STATUS TOGGLE */}
                            <div style={{ background: '#F9F9F9', padding: '1rem', borderRadius: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 900, color: '#BBB', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    Estado del Proyecto
                                </label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        onClick={() => setStatus('activo')}
                                        style={{
                                            flex: 1,
                                            padding: '10px 0',
                                            borderRadius: '12px',
                                            border: 'none',
                                            fontSize: '0.8rem',
                                            fontWeight: 900,
                                            background: status === 'activo' ? 'var(--domain-green)' : '#EEE',
                                            color: status === 'activo' ? 'white' : '#888',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <Play size={14} /> Activo
                                    </button>
                                    <button
                                        onClick={() => setStatus('pausado')}
                                        style={{
                                            flex: 1,
                                            padding: '10px 0',
                                            borderRadius: '12px',
                                            border: 'none',
                                            fontSize: '0.8rem',
                                            fontWeight: 900,
                                            background: status === 'pausado' ? '#64748b' : '#EEE',
                                            color: status === 'pausado' ? 'white' : '#888',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <Archive size={14} /> En Pausa
                                    </button>
                                </div>
                                {status === 'pausado' && (
                                    <p style={{ margin: '8px 0 0 0', fontSize: '0.7rem', color: '#888', fontWeight: 600, textAlign: 'center' }}>
                                        Los proyectos en pausa se ocultan de tu vista principal.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* SAVE BUTTON */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '2.5rem' }}>
                            <button 
                                onClick={handleSave}
                                style={{ flex: 1, padding: '1.2rem', borderRadius: '20px', border: 'none', background: 'var(--text-carbon)', color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
                            >
                                <Check size={20} /> Guardar Cambios
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
