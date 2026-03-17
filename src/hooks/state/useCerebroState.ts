import { useState } from 'react';
import type { Note } from '../useAlDiaState';

export const useCerebroState = () => {
    const [notes, setNotes] = useState<Note[]>([]);

    const addNote = (title: string, content: string, type: 'text' | 'checklist', items: { text: string; completed: boolean }[], q: string, color: string) => {
        const newNote: Note = {
            id: Date.now(),
            title: title || 'Sin Título',
            content,
            type,
            items: items.map((it, idx) => ({ id: Date.now() + idx, ...it })),
            q,
            color,
            date: new Date().toISOString()
        };
        setNotes(prev => [newNote, ...prev]);
    };

    const removeNote = (id: number) => {
        setNotes(prev => prev.filter(n => n.id !== id));
    };

    const toggleNoteItem = (noteId: number, itemId: number) => {
        setNotes(prev => prev.map(n => {
            if (n.id !== noteId) return n;
            return {
                ...n,
                items: n.items.map(it => it.id === itemId ? { ...it, completed: !it.completed } : it)
            };
        }));
    };

    return {
        notes,
        setNotes,
        addNote,
        removeNote,
        toggleNoteItem
    };
};
