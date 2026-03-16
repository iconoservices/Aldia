import { X, Trash2, Calendar, ListTodo, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Note } from '../../hooks/useAlDiaState';

interface NoteDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    note: Note | null;
    removeNote: (id: number) => void;
    toggleNoteItem: (noteId: number, itemId: number) => void;
    addMission: (text: string, q: string, repeat: 'none' | 'daily' | 'weekly' | 'monthly', noteId: number) => void;
}

export const NoteDetailsModal = ({ isOpen, onClose, note, removeNote, toggleNoteItem, addMission }: NoteDetailsModalProps) => {
    if (!note) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            background: 'rgba(0,0,0,0.4)',
                            backdropFilter: 'blur(5px)'
                        }}
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        style={{
                            width: '100%',
                            maxWidth: '500px',
                            background: note.color || 'white',
                            borderRadius: '28px',
                            padding: '2rem',
                            position: 'relative',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.2rem',
                            maxHeight: '80vh',
                            overflowY: 'auto'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ 
                                    background: 'rgba(0,0,0,0.05)', 
                                    padding: '8px', 
                                    borderRadius: '12px' 
                                }}>
                                    {note.type === 'checklist' ? <ListTodo size={20} color="#333" /> : <FileText size={20} color="#333" />}
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#1A1A1A' }}>{note.title}</h2>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#666', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '6px' }}>
                                            {note.q}
                                        </span>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={10} /> {new Date(note.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={20} color="#333" />
                            </button>
                        </div>

                        <div style={{ flex: 1 }}>
                            {note.type === 'text' ? (
                                <p style={{ 
                                    margin: 0, 
                                    fontSize: '0.95rem', 
                                    color: '#333', 
                                    lineHeight: 1.6,
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {note.content}
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {note.items.map((item) => (
                                        <div 
                                            key={item.id} 
                                            onClick={() => toggleNoteItem(note.id, item.id)}
                                            style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '12px', 
                                                cursor: 'pointer',
                                                background: 'rgba(255,255,255,0.3)',
                                                padding: '12px',
                                                borderRadius: '12px'
                                            }}
                                        >
                                            <div style={{ 
                                                width: '18px', 
                                                height: '18px', 
                                                borderRadius: '50%', 
                                                border: item.completed ? 'none' : '2px solid rgba(0,0,0,0.1)',
                                                background: item.completed ? 'var(--domain-green)' : 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {item.completed && <span style={{ color: 'white', fontSize: '0.7rem' }}>✓</span>}
                                            </div>
                                            <span style={{ 
                                                flex: 1,
                                                fontSize: '0.9rem', 
                                                fontWeight: 600,
                                                color: item.completed ? '#888' : '#333',
                                                textDecoration: item.completed ? 'line-through' : 'none'
                                            }}>
                                                {item.text}
                                            </span>
                                            {!item.completed && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addMission(item.text, note.q, 'none', note.id);
                                                    }}
                                                    title="Convertir en Tarea"
                                                    style={{
                                                        background: 'var(--domain-orange)',
                                                        color: 'white',
                                                        border: 'none',
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '6px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        fontWeight: 900
                                                    }}
                                                >
                                                    +
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button 
                                onClick={() => {
                                    removeNote(note.id);
                                    onClose();
                                }}
                                style={{ 
                                    background: 'rgba(239, 68, 68, 0.1)', 
                                    color: '#ef4444', 
                                    border: 'none', 
                                    padding: '10px 16px', 
                                    borderRadius: '12px', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 800, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Trash2 size={16} /> ELIMINAR BLOQUE
                            </button>
                            
                            <button 
                                onClick={onClose}
                                style={{ 
                                    background: '#333', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '10px 24px', 
                                    borderRadius: '12px', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                }}
                            >
                                ENTENDIDO
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
