import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, Calendar, Clock, Tag, Target } from 'lucide-react';
import type { Mission, Project } from '../../hooks/useAlDiaState';

interface MissionEditOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    mission: Mission | null;
    updateMission: (id: number, updates: Partial<Mission>) => void;
    removeMission: (id: number) => void;
    projects: Project[];
}

export const MissionEditOverlay = ({ isOpen, onClose, mission, updateMission, removeMission, projects }: MissionEditOverlayProps) => {
    const [text, setText] = useState('');
    const [q, setQ] = useState('Q2');
    const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [projectId, setProjectId] = useState<number | undefined>(undefined);

    useEffect(() => {
        if (mission) {
            setText(mission.text);
            setQ(mission.q);
            setRepeat(mission.repeat);
            setDueDate(mission.dueDate || '');
            setDueTime(mission.dueTime || '');
            setProjectId(mission.projectId);
        }
    }, [mission]);

    const handleSave = () => {
        if (!mission) return;
        updateMission(mission.id, {
            text,
            q,
            repeat,
            dueDate,
            dueTime,
            projectId
        });
        onClose();
    };

    const handleDelete = () => {
        if (!mission) return;
        if (confirm('¿Estás seguro de que quieres eliminar esta misión?')) {
            removeMission(mission.id);
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && mission && (
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
                            maxWidth: '500px',
                            background: 'white',
                            borderRadius: '32px',
                            padding: '2rem',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-carbon)' }}>Editar Misión</h2>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#888', fontWeight: 600 }}>Refina tus objetivos</p>
                            </div>
                            <button onClick={onClose} style={{ border: 'none', background: '#F5F5F5', padding: '8px', borderRadius: '50%', cursor: 'pointer', color: '#888' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            {/* TEXTO */}
                            <div style={{ background: '#F9F9F9', padding: '1rem', borderRadius: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: '#BBB', textTransform: 'uppercase', marginBottom: '4px' }}>Descripción</label>
                                <input 
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="¿Qué hay que hacer?"
                                    style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '1.1rem', fontWeight: 800, outline: 'none', color: 'var(--text-carbon)' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {/* JOY MATRIX */}
                                <div style={{ background: '#F9F9F9', padding: '1rem', borderRadius: '20px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 900, color: '#BBB', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        <Target size={12} /> Prioridad (Joy)
                                    </label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {['Q1', 'Q2', 'Q3', 'Q4'].map(level => (
                                            <button
                                                key={level}
                                                onClick={() => setQ(level)}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px 0',
                                                    borderRadius: '10px',
                                                    border: 'none',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 900,
                                                    background: q === level ? 'var(--domain-orange)' : '#EEE',
                                                    color: q === level ? 'white' : '#888',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* PROYECTO */}
                                <div style={{ background: '#F9F9F9', padding: '1rem', borderRadius: '20px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 900, color: '#BBB', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        <Tag size={12} /> Proyecto
                                    </label>
                                    <select 
                                        value={projectId || ''}
                                        onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : undefined)}
                                        style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: 700, outline: 'none', color: '#444' }}
                                    >
                                        <option value="">Ninguno</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {/* FECHA */}
                                <div style={{ background: '#F9F9F9', padding: '1rem', borderRadius: '20px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 900, color: '#BBB', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        <Calendar size={12} /> Fecha
                                    </label>
                                    <input 
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: 800, outline: 'none', color: '#444' }}
                                    />
                                </div>

                                {/* HORA */}
                                <div style={{ background: '#F9F9F9', padding: '1rem', borderRadius: '20px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 900, color: '#BBB', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        <Clock size={12} /> Hora
                                    </label>
                                    <input 
                                        type="time"
                                        value={dueTime}
                                        onChange={(e) => setDueTime(e.target.value)}
                                        style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: 800, outline: 'none', color: '#444' }}
                                    />
                                </div>
                            </div>

                            {/* REPETICIÓN */}
                            <div style={{ background: '#FEEDD1', padding: '0.8rem 1rem', borderRadius: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#B45309' }}>Repetición</span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {['none', 'daily', 'weekly', 'monthly'].map(r => (
                                            <button
                                                key={r}
                                                onClick={() => setRepeat(r as any)}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '80px',
                                                    border: 'none',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 900,
                                                    background: repeat === r ? 'white' : 'transparent',
                                                    color: repeat === r ? '#B45309' : 'rgba(180, 83, 9, 0.5)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {r === 'none' ? 'No' : r === 'daily' ? 'Día' : r === 'weekly' ? 'Sem' : 'Mes'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '2.5rem' }}>
                            <button 
                                onClick={handleDelete}
                                style={{ flex: 1, padding: '1.2rem', borderRadius: '20px', border: 'none', background: '#FEE2E2', color: '#EF4444', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                            >
                                <Trash2 size={20} /> Borrar
                            </button>
                            <button 
                                onClick={handleSave}
                                style={{ flex: 2, padding: '1.2rem', borderRadius: '20px', border: 'none', background: 'var(--domain-green)', color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.2)' }}
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
