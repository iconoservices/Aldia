import { useState } from 'react';
import { X, Trash2, Calendar, ListTodo, FileText, Send, CalendarDays, Check, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Note, Project } from '../../hooks/useAlDiaState';

interface NoteDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    note: Note | null;
    removeNote: (id: number) => void;
    toggleNoteItem: (noteId: number, itemId: number) => void;
    addMission: (text: string, q: string, repeat: 'none' | 'daily' | 'weekly' | 'monthly', noteId?: number, labels?: string[], dueDate?: string, dueTime?: string, habitId?: number, projectId?: number) => void;
    projects: Project[];
    addProjectTask: (projectId: number, text: string) => void;
}

export const NoteDetailsModal = ({ 
    isOpen, 
    onClose, 
    note, 
    removeNote, 
    toggleNoteItem, 
    addMission,
    projects,
    addProjectTask
}: NoteDetailsModalProps) => {
    const [promotingItemId, setPromotingItemId] = useState<number | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    if (!note) return null;

    const handlePromoteToMission = (itemText: string, date: string) => {
        addMission(itemText, note.q, 'none', note.id, [], date);
        setPromotingItemId(null);
    };

    const handlePromoteToProject = (itemText: string, projectId: number) => {
        addProjectTask(projectId, itemText);
        setPromotingItemId(null);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px'
                }}>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{ position: 'absolute', width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        style={{
                            width: '100%', maxWidth: '440px', background: note.color || '#FFF',
                            borderRadius: '32px', padding: '1.5rem', position: 'relative',
                            boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)',
                            display: 'flex', flexDirection: 'column', gap: '1rem',
                            maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.3)'
                        }}
                    >
                        {/* HEADER */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: 'rgba(0,0,0,0.05)', padding: '12px', borderRadius: '16px' }}>
                                    {note.type === 'checklist' ? <ListTodo size={24} color="#000" /> : <FileText size={24} color="#000" />}
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#000', letterSpacing: '-0.5px' }}>{note.title}</h2>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#FFF', background: '#000', padding: '2px 8px', borderRadius: '6px' }}>
                                            {note.q}
                                        </span>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={12} /> {new Date(note.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={20} color="#000" />
                            </button>
                        </div>

                        {/* CONTENT AREA */}
                        <div style={{ flex: 1 }}>
                            {note.type === 'text' ? (
                                <p style={{ margin: 0, fontSize: '1.05rem', color: '#1A1A1A', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                                    {note.content}
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {note.items.map((item: any, idx: number) => (
                                        <div key={item.id || `node-item-${idx}`} style={{ 
                                            background: 'rgba(255,255,255,0.5)', 
                                            borderRadius: '20px', 
                                            overflow: 'hidden',
                                            border: promotingItemId === item.id ? '2px solid #000' : '1px solid rgba(0,0,0,0.03)',
                                            transition: 'all 0.2s ease'
                                        }}>
                                            <div 
                                                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' }}
                                                onClick={() => {
                                                    // Si estamos en modo promoción, el click fuera de los botones cierra la promoción
                                                    if (promotingItemId === item.id) setPromotingItemId(null);
                                                    else toggleNoteItem(note.id, item.id);
                                                }}
                                            >
                                                <div style={{ 
                                                    width: '22px', height: '22px', borderRadius: '7px', 
                                                    border: item.completed ? 'none' : '2px solid rgba(0,0,0,0.2)',
                                                    background: item.completed ? 'var(--domain-green)' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    {item.completed && <Check size={14} color="white" strokeWidth={4} />}
                                                </div>
                                                <span style={{ 
                                                    flex: 1, fontSize: '0.95rem', fontWeight: 700, 
                                                    color: item.completed ? '#AAA' : '#000',
                                                    textDecoration: item.completed ? 'line-through' : 'none'
                                                }}>
                                                    {item.text}
                                                </span>
                                                
                                                {!item.completed && (
                                                    <button
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            setPromotingItemId(promotingItemId === item.id ? null : item.id); 
                                                        }}
                                                        style={{ 
                                                            background: promotingItemId === item.id ? '#000' : 'var(--domain-orange)', 
                                                            color: 'white', border: 'none', 
                                                            width: '32px', height: '32px', borderRadius: '10px', 
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                            cursor: 'pointer', transition: 'transform 0.2s ease'
                                                        }}
                                                    >
                                                        {promotingItemId === item.id ? <X size={18} /> : <PlusCircle size={18} />}
                                                    </button>
                                                )}
                                            </div>

                                            {/* PROMOTE MENU */}
                                            <AnimatePresence>
                                                {promotingItemId === item.id && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        style={{ background: 'rgba(0,0,0,0.02)', padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                                                    >
                                                        <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)' }} />
                                                        
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button 
                                                                onClick={() => handlePromoteToMission(item.text, new Date().toISOString().split('T')[0])}
                                                                style={{ flex: 1, background: 'var(--domain-orange)', color: 'white', border: 'none', padding: '12px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                                                            >
                                                                <Send size={14} /> HOY
                                                            </button>
                                                            
                                                            <div style={{ flex: 1, position: 'relative' }}>
                                                                <input 
                                                                    type="date" 
                                                                    value={selectedDate}
                                                                    onChange={(e) => {
                                                                        setSelectedDate(e.target.value);
                                                                        handlePromoteToMission(item.text, e.target.value);
                                                                    }}
                                                                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                                                />
                                                                <button style={{ width: '100%', background: '#EEE', color: '#666', border: 'none', padding: '12px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                                    <CalendarDays size={14} /> FECHA
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* PROJECT LIST */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            {projects.length > 0 ? (
                                                                <select 
                                                                    onChange={(e) => e.target.value && handlePromoteToProject(item.text, Number(e.target.value))}
                                                                    style={{ width: '100%', background: '#1A1A1A', color: 'white', border: 'none', padding: '12px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: 900, outline: 'none', cursor: 'pointer' }}
                                                                >
                                                                    <option value="">📁 ENVIAR A PROYECTO...</option>
                                                                    {projects.map((p: any) => (
                                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <div style={{ fontSize: '0.7rem', color: '#888', textAlign: 'center', background: 'rgba(0,0,0,0.03)', padding: '10px', borderRadius: '12px', border: '1px dashed rgba(0,0,0,0.1)' }}>
                                                                    Pestaña de Proyectos vacía.<br/>Crea uno para enviar tareas allí.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.2rem', display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => { removeNote(note.id); onClose(); }}
                                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', width: '50px', height: '50px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                title="Eliminar Nota"
                            >
                                <Trash2 size={20} />
                            </button>
                            
                            <button 
                                onClick={onClose}
                                style={{ flex: 1, background: '#000', color: 'white', border: 'none', borderRadius: '16px', fontSize: '0.9rem', fontWeight: 900, cursor: 'pointer' }}
                            >
                                CERRAR DETALLES
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
