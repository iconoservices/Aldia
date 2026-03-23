import { useState, useEffect } from 'react';
import { X, Trash2, ListTodo, FileText, Send, CalendarDays, Check, PlusCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Note, Project } from '../../hooks/useAlDiaState';

interface NoteDetailViewProps {
    note: Note;
    onClose: () => void;
    removeNote: (id: number) => void;
    toggleNoteItem: (noteId: number, itemId: number) => void;
    addMission: (text: string, q: string, repeat: 'none' | 'daily' | 'weekly' | 'monthly', noteId?: number, labels?: string[], dueDate?: string, dueTime?: string, habitId?: number, projectId?: number) => void;
    projects: Project[];
    addProjectTask: (projectId: number, text: string) => void;
    updateNote: (id: number, updates: Partial<Note>) => void;
}

export const NoteDetailView = ({ 
    note, 
    onClose, 
    removeNote, 
    toggleNoteItem, 
    addMission,
    projects,
    addProjectTask,
    updateNote
}: NoteDetailViewProps) => {
    const [promotingItemId, setPromotingItemId] = useState<number | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
    
    // Internal state for fluid editing
    const [title, setTitle] = useState(note.title);
    const [content, setContent] = useState(note.content);
    const [items, setItems] = useState(note.items || []);

    // Sync internal state when note prop changes (e.g. if updated elsewhere)
    useEffect(() => {
        setTitle(note.title);
        setContent(note.content);
        setItems(note.items || []);
    }, [note.id]);

    const handleTitleChange = (newTitle: string) => {
        setTitle(newTitle);
        updateNote(note.id, { title: newTitle });
    };

    const handleContentChange = (newContent: string) => {
        setContent(newContent);
        updateNote(note.id, { content: newContent });
    };

    const handleUpdateItemText = (itemId: number, text: string) => {
        const newItems = items.map(it => it.id === itemId ? { ...it, text } : it);
        setItems(newItems);
        updateNote(note.id, { items: newItems });
    };

    const handleAddItem = () => {
        const newItem = { id: Date.now(), text: '', completed: false };
        const newItems = [...items, newItem];
        setItems(newItems);
        updateNote(note.id, { items: newItems });
    };

    const handleRemoveItem = (itemId: number) => {
        const newItems = items.filter(it => it.id !== itemId);
        setItems(newItems);
        updateNote(note.id, { items: newItems });
    };

    const handlePromoteToMission = (itemText: string, date: string) => {
        addMission(itemText, note.q, 'none', note.id, [], date);
        setPromotingItemId(null);
    };

    const handlePromoteToProject = (itemText: string, projectId: number) => {
        addProjectTask(projectId, itemText);
        setPromotingItemId(null);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: note.color || '#F8F9FA', zIndex: 1000,
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden'
            }}
        >
            {/* Header Toolbar */}
            <div style={{ 
                padding: '1.2rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={onClose} style={{ background: 'white', border: 'none', borderRadius: '12px', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: 'rgba(0,0,0,0.1)', padding: '8px', borderRadius: '12px' }}>
                            {note.type === 'checklist' ? <ListTodo size={18} color="#000" /> : <FileText size={18} color="#000" />}
                        </div>
                        <div>
                            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#000', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {note.type === 'checklist' ? 'Checklist' : 'Nota de Texto'} • {note.q}
                            </span>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#666' }}>
                                {new Date(note.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={() => {
                            if (confirm('¿Eliminar esta nota?')) {
                                removeNote(note.id);
                                onClose();
                            }
                        }}
                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '12px', padding: '10px', cursor: 'pointer' }}
                    >
                        <Trash2 size={20} />
                    </button>
                    <button 
                        onClick={onClose}
                        style={{ background: '#000', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer' }}
                    >
                        CERRAR
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                maxWidth: '800px',
                width: '100%',
                margin: '0 auto'
            }}>
                {/* Title Editor */}
                <input 
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Título de la nota..."
                    style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '2rem',
                        fontWeight: 900,
                        color: 'var(--text-carbon)',
                        outline: 'none',
                        width: '100%',
                        padding: 0
                    }}
                />

                {/* Content Editor */}
                {note.type === 'text' ? (
                    <textarea 
                        value={content}
                        onChange={(e) => handleContentChange(e.target.value)}
                        placeholder="Escribe algo aquí..."
                        style={{
                            flex: 1,
                            minHeight: '300px',
                            background: 'transparent',
                            border: 'none',
                            fontSize: '1.1rem',
                            lineHeight: 1.6,
                            color: '#1A1A1A',
                            outline: 'none',
                            resize: 'none',
                            padding: 0
                        }}
                    />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {items.map((item) => (
                            <div key={item.id} style={{ 
                                background: 'rgba(255,255,255,0.4)', 
                                borderRadius: '16px', 
                                border: promotingItemId === item.id ? '2px solid #000' : '1px solid rgba(0,0,0,0.03)',
                                transition: 'all 0.2s ease',
                                overflow: 'hidden'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px' }}>
                                    <div 
                                        onClick={() => toggleNoteItem(note.id, item.id)}
                                        style={{ 
                                            width: '24px', height: '24px', borderRadius: '8px', 
                                            border: item.completed ? 'none' : '2px solid rgba(0,0,0,0.15)',
                                            background: item.completed ? 'var(--domain-green)' : 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, cursor: 'pointer'
                                        }}
                                    >
                                        {item.completed && <Check size={16} color="white" strokeWidth={4} />}
                                    </div>
                                    
                                    <input 
                                        value={item.text}
                                        onChange={(e) => handleUpdateItemText(item.id, e.target.value)}
                                        placeholder="Tarea..."
                                        style={{
                                            flex: 1,
                                            background: 'transparent',
                                            border: 'none',
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            color: item.completed ? '#AAA' : '#000',
                                            textDecoration: item.completed ? 'line-through' : 'none',
                                            outline: 'none'
                                        }}
                                    />

                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {!item.completed && (
                                            <button
                                                onClick={() => setPromotingItemId(promotingItemId === item.id ? null : item.id)}
                                                style={{ 
                                                    background: promotingItemId === item.id ? '#000' : 'rgba(0,0,0,0.05)', 
                                                    color: promotingItemId === item.id ? 'white' : '#666',
                                                    border: 'none', width: '30px', height: '30px', borderRadius: '10px', 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                                }}
                                            >
                                                {promotingItemId === item.id ? <X size={16} /> : <PlusCircle size={16} />}
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleRemoveItem(item.id)}
                                            style={{ background: 'transparent', border: 'none', color: '#ff4444', opacity: 0.3, cursor: 'pointer', padding: '4px' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {promotingItemId === item.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            style={{ background: 'rgba(0,0,0,0.03)', padding: '0 12px 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                                        >
                                            <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)' }} />
                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#666', marginLeft: '4px' }}>CONVERTIR EN TAREA</span>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    onClick={() => handlePromoteToMission(item.text, new Date().toLocaleDateString('en-CA'))}
                                                    style={{ flex: 1, background: 'var(--domain-orange)', color: 'white', border: 'none', padding: '10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                                                >
                                                    <Send size={12} /> HOY
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
                                                    <button style={{ width: '100%', background: 'white', color: '#666', border: '1px solid #EEE', padding: '10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                        <CalendarDays size={12} /> FECHA
                                                    </button>
                                                </div>
                                            </div>
                                            {projects.length > 0 && (
                                                <select 
                                                    onChange={(e) => e.target.value && handlePromoteToProject(item.text, Number(e.target.value))}
                                                    style={{ width: '100%', background: '#1A1A1A', color: 'white', border: 'none', padding: '10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 900, outline: 'none', cursor: 'pointer' }}
                                                >
                                                    <option value="">📁 ENVIAR A PROYECTO...</option>
                                                    {projects.map((p) => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                        
                        <button 
                            onClick={handleAddItem}
                            style={{ 
                                marginTop: '8px', padding: '16px', borderRadius: '16px', border: '2px dashed rgba(0,0,0,0.1)', 
                                background: 'rgba(255,255,255,0.3)', color: '#666', fontSize: '0.9rem', fontWeight: 800, 
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' 
                            }}
                        >
                            <PlusCircle size={20} /> AGREGAR NUEVO ITEM
                        </button>
                    </div>
                )}
            </div>

            {/* Quick Action Footer */}
            <div style={{ 
                padding: '1.5rem', 
                background: 'rgba(255,255,255,0.1)',
                borderTop: '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                justifyContent: 'center'
            }}>
                <button 
                    onClick={() => {
                        addMission(note.title || 'Misión desde Nota', note.q, 'none', note.id, [], new Date().toLocaleDateString('en-CA'));
                        onClose();
                    }}
                    style={{ 
                        background: '#000', color: 'white', border: 'none', 
                        borderRadius: '20px', padding: '12px 24px', fontSize: '0.85rem', 
                        fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                    }}
                >
                    <Send size={16} /> CONVERTIR TODA LA NOTA EN MISIÓN
                </button>
            </div>
        </motion.div>
    );
};
