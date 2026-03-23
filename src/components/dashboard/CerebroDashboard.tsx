import { Trash2, CheckCircle2, Circle, ListTodo, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Note } from '../../hooks/useAlDiaState';

interface CerebroProps {
    notes: Note[];
    removeNote: (id: number) => void;
    toggleNoteItem: (noteId: number, itemId: number) => void;
    onOpenNote?: (id: number) => void;
}

export const CerebroDashboard = ({ notes, removeNote, toggleNoteItem, onOpenNote }: CerebroProps) => {
    return (
        <div style={{ paddingBottom: '5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-carbon)' }}>🧠 Cerebro</h2>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#AAA', background: '#F5F5F5', padding: '4px 10px', borderRadius: '10px' }}>
                    {notes.length} BLOQUES
                </span>
            </div>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                gap: '10px',
                alignItems: 'start'
            }}>
                {notes.map((note) => (
                    <motion.div
                        key={note.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => onOpenNote && onOpenNote(note.id)}
                        style={{
                            background: note.color || '#FFFFFF',
                            borderRadius: '20px',
                            padding: '1.2rem',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                            border: '1px solid rgba(0,0,0,0.03)',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            {note.type === 'checklist' ? <ListTodo size={16} color="#666" /> : <FileText size={16} color="#666" />}
                            <div style={{ display: 'flex', gap: '8px' }}>

                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeNote(note.id);
                                    }}
                                    style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', opacity: 0.3 }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#1A1A1A' }}>{note.title}</h4>
                        
                        {note.type === 'text' ? (
                            <p style={{ 
                                margin: 0, 
                                fontSize: '0.8rem', 
                                color: '#555', 
                                lineHeight: 1.4,
                                display: '-webkit-box',
                                WebkitLineClamp: 5,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                // Si el título es la primera línea, saltamos la primera línea en el preview
                                // Pero por simplicidad ahora mostramos todo con opacidad suave
                                opacity: 0.8
                            }}>
                                {note.content.split('\n').slice(1).join('\n') || note.content}
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {note.items.slice(1, 6).map((item) => (
                                    <div 
                                        key={item.id} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleNoteItem(note.id, item.id);
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                                    >
                                        {item.completed ? (
                                            <CheckCircle2 size={12} color="var(--domain-orange)" />
                                        ) : (
                                            <Circle size={12} color="#CCC" />
                                        )}
                                        <span style={{ 
                                            fontSize: '0.75rem', 
                                            color: item.completed ? '#AAA' : '#555',
                                            textDecoration: item.completed ? 'line-through' : 'none',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {item.text}
                                        </span>
                                    </div>
                                ))}
                                {note.items.length > 6 && (
                                    <span style={{ fontSize: '0.65rem', color: '#AAA', fontWeight: 700 }}>
                                        + {note.items.length - 6} más...
                                    </span>
                                )}
                            </div>
                        )}

                        <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ 
                                fontSize: '0.6rem', 
                                fontWeight: 800, 
                                opacity: 0.5,
                                color: '#000'
                            }}>
                                {note.q}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
