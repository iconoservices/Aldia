import { useState } from 'react';
import type { RitaMilestone } from '../../components/dashboard/RitaDashboard';

export const useRitaState = () => {
    const [ritaEntries, setRitaEntries] = useState<RitaMilestone[]>([]);

    const addEntry = (title: string, description: string, _photo: string | null, color: string) => {
        const newEntry: RitaMilestone = {
            id: Date.now(),
            icon: '🎯',
            title,
            description,
            cost: 0,
            status: 'pendiente',
            color,
            category: 'negocio',
            subitems: [],
            targetDate: '',
            order: ritaEntries.length
        };
        setRitaEntries(prev => {
            // Prevenir duplicados si ya fue agregado por updateEntry(-1, ...)
            const exists = prev.some(e => e.title === title && e.description === description && Date.now() - e.id < 2000);
            if (exists) return prev;
            return [newEntry, ...prev];
        });
    };

    const removeEntry = (id: number) => {
        setRitaEntries(prev => prev.filter(e => e.id !== id));
    };

    const updateEntry = (id: number, updates: Partial<RitaMilestone>) => {
        if (id === -1) {
            const newEntry: RitaMilestone = {
                id: Date.now(),
                icon: '🎯',
                title: '',
                description: '',
                cost: 0,
                status: 'pendiente',
                color: '#4D96FF',
                category: 'negocio',
                subitems: [],
                order: ritaEntries.length,
                ...updates
            } as RitaMilestone;
            setRitaEntries(prev => {
                // Prevenir duplicados si ya fue agregado por addEntry
                const exists = prev.some(e => e.title === newEntry.title && e.description === newEntry.description && Date.now() - e.id < 2000);
                if (exists) return prev;
                return [newEntry, ...prev];
            });
        } else {
            setRitaEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
        }
    };

    const addSubitem = (entryId: number, text: string) => {
        setRitaEntries(prev => prev.map(e => {
            if (e.id !== entryId) return e;
            return {
                ...e,
                subitems: [...e.subitems, { id: Date.now(), text, completed: false }]
            };
        }));
    };

    const toggleSubitem = (entryId: number, subitemId: number) => {
        setRitaEntries(prev => prev.map(e => {
            if (e.id !== entryId) return e;
            return {
                ...e,
                subitems: e.subitems.map(s => s.id === subitemId ? { ...s, completed: !s.completed } : s)
            };
        }));
    };

    const removeSubitem = (entryId: number, subitemId: number) => {
        setRitaEntries(prev => prev.map(e => {
            if (e.id !== entryId) return e;
            return { ...e, subitems: e.subitems.filter(s => s.id !== subitemId) };
        }));
    };

    return {
        ritaEntries, setRitaEntries,
        addEntry, removeEntry, updateEntry,
        addSubitem, toggleSubitem, removeSubitem
    };
};
