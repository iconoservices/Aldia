import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';

// Tipos de datos
export interface Mission {
    id: number;
    text: string;
    q: string;
    critical: boolean;
    completed: boolean;
    repeat: 'none' | 'daily' | 'weekly' | 'monthly';
    dueDate?: string; // YYYY-MM-DD
    dueTime?: string; // HH:mm
    noteId?: number; // Referencia opcional a una nota del cerebro
    labels?: string[]; // Etiquetas para categorizar
    habitId?: number; // Si es un hábito, ID de la fábrica
}

export interface Transaction {
    id: number;
    text: string;
    amount: number;
    type: 'ingreso' | 'gasto';
    isDebt: boolean;
    date: string;     // HH:mm
    fullDate: string; // YYYY-MM-DD
}

export interface CalendarEvent {
    id: number;
    title: string;
    date: string;      // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
    description?: string;
}

export interface Habit {
    id: number;
    name: string;
    completedDays: number[]; // Array de índices 0-6 (L-D)
}

export interface TimeBlock {
    id: number;
    label: string;
    start: string; // HH:mm
    end: string;   // HH:mm
    color: string;
}

export interface Note {
    id: number;
    title: string;
    content: string;
    type: 'text' | 'checklist';
    items: { id: number; text: string; completed: boolean }[];
    q: string; // Cuadrante (opcional, para relevancia)
    color: string;
    date: string;
}

export const useAlDiaState = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // 1. Estados Iniciales
    const [missions, setMissions] = useState<Mission[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [balance, setBalance] = useState(4250.00);
    const [habits, setHabits] = useState<Habit[]>([]);
    const [agenda, setAgenda] = useState<CalendarEvent[]>([]);
    const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);

    // 2. Manejo de Autenticación y Carga Inicial
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            
            if (user) {
                // Cargar desde Firestore
                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.missions) setMissions(data.missions);
                    if (data.transactions) setTransactions(data.transactions);
                    if (data.balance !== undefined) setBalance(data.balance);
                    if (data.habits) setHabits(data.habits);
                    if (data.agenda) setAgenda(data.agenda);
                    if (data.timeBlocks) setTimeBlocks(data.timeBlocks);
                    if (data.notes) setNotes(data.notes);
                } else {
                    // Si no hay datos en cloud, intentar migrar los locales
                    loadFromLocal();
                }
            } else {
                // Cargar desde LocalStorage si no hay usuario
                loadFromLocal();
            }
            setIsInitialLoad(false);
        });

        return unsubscribe;
    }, []);

    const loadFromLocal = () => {
        const sMissions = localStorage.getItem('aldia_missions');
        if (sMissions) setMissions(JSON.parse(sMissions));
        else setMissions([
            { id: 1, text: 'Pagar Luz (Vence Hoy)', q: 'Q1', critical: true, completed: false, repeat: 'monthly' },
            { id: 2, text: 'Terminar maquetación AlDía', q: 'Q2', critical: false, completed: false, repeat: 'none' },
            { id: 3, text: 'Diseñar Menú Radial (+)', q: 'Q2', critical: false, completed: false, repeat: 'none' },
            { id: 4, text: 'Revisar emails de suscripciones', q: 'Q3', critical: false, completed: false, repeat: 'daily' },
        ]);

        const sTransactions = localStorage.getItem('aldia_transactions');
        if (sTransactions) setTransactions(JSON.parse(sTransactions));

        const sBalance = localStorage.getItem('aldia_balance');
        if (sBalance) setBalance(parseFloat(sBalance));

        const sHabits = localStorage.getItem('aldia_habits');
        if (sHabits) setHabits(JSON.parse(sHabits));
        else setHabits([
            { id: 1, name: 'Tomar 2L de Agua', completedDays: [0, 1, 2] },
            { id: 2, name: 'Leer 15 páginas', completedDays: [1] },
            { id: 3, name: 'Meditar 10 min', completedDays: [] }
        ]);

        const sAgenda = localStorage.getItem('aldia_agenda');
        const todayStr = new Date().toISOString().split('T')[0];
        if (sAgenda) setAgenda(JSON.parse(sAgenda));
        else setAgenda([
            { id: 1, title: 'Reunión de Maquetación', date: todayStr, startTime: '15:00', endTime: '17:00', description: 'Avanzar en la lógica PWA de AlDía' },
            { id: 2, title: 'Gimnasio / Entreno', date: todayStr, startTime: '18:30', endTime: '20:00', description: 'Día de pierna y cardio' },
            { id: 3, title: 'Cena con Equipo', date: todayStr, startTime: '21:00', endTime: '22:30', description: 'Revisión mensual de objetivos' }
        ]);

        const sTimeBlocks = localStorage.getItem('aldia_timeblocks');
        if (sTimeBlocks) setTimeBlocks(JSON.parse(sTimeBlocks));
        else setTimeBlocks([
            { id: 1, label: 'Deep Work', start: '09:00', end: '12:00', color: '#3b82f6' },
            { id: 2, label: 'Almuerzo / Break', start: '13:00', end: '14:00', color: '#facc15' },
            { id: 3, label: 'Admin / Mails', start: '14:00', end: '15:00', color: '#10b981' }
        ]);

        const sNotes = localStorage.getItem('aldia_notes');
        if (sNotes) setNotes(JSON.parse(sNotes));
        else setNotes([
            { id: 1, title: 'Ideas de Contenido', content: 'Hablar de minimalismo digital en el siguiente video.', type: 'text', items: [], q: 'Q2', color: '#FEF9C3', date: new Date().toISOString() },
            { id: 2, title: 'Supermercado', content: '', type: 'checklist', items: [{ id: 1, text: 'Avena', completed: false }, { id: 2, text: 'Café', completed: true }], q: 'Q4', color: '#DBEAFE', date: new Date().toISOString() }
        ]);
    };

    // 3. Persistencia Unificada (Local + Cloud)
    useEffect(() => {
        if (isInitialLoad) return;

        // Siempre guardar en LocalStorage por seguridad / offline
        localStorage.setItem('aldia_missions', JSON.stringify(missions));
        localStorage.setItem('aldia_transactions', JSON.stringify(transactions));
        localStorage.setItem('aldia_balance', JSON.stringify(balance));
        localStorage.setItem('aldia_habits', JSON.stringify(habits));
        localStorage.setItem('aldia_agenda', JSON.stringify(agenda));
        localStorage.setItem('aldia_timeblocks', JSON.stringify(timeBlocks));
        localStorage.setItem('aldia_notes', JSON.stringify(notes));

        // Borrar "old" LocalStorage keys if they were different (not needed here but good practice)

        // Guardar en Firestore si hay usuario
        if (user) {
            const docRef = doc(db, 'users', user.uid);
            setDoc(docRef, {
                missions,
                transactions,
                balance,
                habits,
                agenda,
                timeBlocks,
                notes,
                lastSync: new Date().toISOString()
            }, { merge: true });
        }
    }, [missions, transactions, balance, habits, agenda, timeBlocks, notes, user, isInitialLoad]);

    // 3. Acciones (Cerebro)

    // Girar misiones (completar/deshacer)
    const toggleMission = (id: number) => {
        setMissions(prev => {
            const mission = prev.find(m => m.id === id);
            if (!mission) return prev;

            const isCompleting = !mission.completed;
            let updated = prev.map(m => m.id === id ? { ...m, completed: isCompleting } : m);

            // Si se está completando y es repetitiva, crear la siguiente instancia
            if (isCompleting && mission.repeat !== 'none') {
                let nextDate = mission.dueDate ? new Date(mission.dueDate + 'T12:00:00') : new Date();
                
                if (mission.repeat === 'daily') {
                    nextDate.setDate(nextDate.getDate() + 1);
                } else if (mission.repeat === 'weekly') {
                    nextDate.setDate(nextDate.getDate() + 7);
                } else if (mission.repeat === 'monthly') {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }

                const newInstance: Mission = {
                    ...mission,
                    id: Date.now() + Math.random(),
                    completed: false,
                    dueDate: nextDate.toISOString().split('T')[0]
                };
                updated = [newInstance, ...updated];
            }

            return updated;
        });
    };

    // Girar hábito para un día específico
    const toggleHabit = (habitId: number, dayIndex: number) => {
        setHabits(prev => prev.map(h => {
            if (h.id !== habitId) return h;
            const alreadyCompleted = h.completedDays.includes(dayIndex);
            return {
                ...h,
                completedDays: alreadyCompleted
                    ? h.completedDays.filter(d => d !== dayIndex)
                    : [...h.completedDays, dayIndex]
            };
        }));
    };

    // Añadir nueva misión
    const addMission = (text: string, q: string = 'Q2', repeat: 'none' | 'daily' | 'weekly' | 'monthly' = 'none', noteId?: number, labels: string[] = [], dueDate?: string, dueTime?: string, habitId?: number) => {
        const newMission: Mission = {
            id: Date.now() + Math.random(),
            text,
            q,
            critical: q === 'Q1',
            completed: false,
            repeat,
            noteId,
            labels,
            dueDate: dueDate || new Date().toISOString().split('T')[0],
            dueTime,
            habitId
        };
        setMissions(prev => [newMission, ...prev]);
    };

    // Añadir cita a la agenda
    const addCalendarEvent = (title: string, date: string, startTime: string, endTime: string, description: string) => {
        const newEvent: CalendarEvent = {
            id: Date.now() + Math.random(),
            title,
            date,
            startTime,
            endTime,
            description
        };
        setAgenda(prev => [...prev, newEvent].sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.startTime.localeCompare(b.startTime);
        }));
    };

    // Añadir nuevo hábito
    const addHabit = (name: string) => {
        const newHabit: Habit = {
            id: Date.now() + Math.random(),
            name,
            completedDays: []
        };
        setHabits(prev => [newHabit, ...prev]);
    };

    // Registrar dinero
    const addTransaction = (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean) => {
        const value = Math.abs(amount);

        // Si no es deuda, impacta el balance real ahora
        if (!isDebt) {
            setBalance(prev => type === 'ingreso' ? prev + value : prev - value);
        }

        const newTx: Transaction = {
            id: Date.now() + Math.random(),
            text,
            amount: type === 'ingreso' ? value : -value,
            type,
            isDebt,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fullDate: new Date().toISOString().split('T')[0]
        };
        setTransactions(prev => [newTx, ...prev]);
    };

    // Cálculo de métricas
    const todayStr = new Date().toISOString().split('T')[0];

    const todayIncome = transactions
        .filter(t => t.type === 'ingreso' && !t.isDebt && t.fullDate === todayStr)
        .reduce((acc, t) => acc + t.amount, 0);

    const todayExpense = transactions
        .filter(t => t.type === 'gasto' && !t.isDebt && t.fullDate === todayStr)
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const debtsOwe = transactions
        .filter(t => t.type === 'gasto' && t.isDebt)
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const debtsOwed = transactions
        .filter(t => t.type === 'ingreso' && t.isDebt)
        .reduce((acc, t) => acc + t.amount, 0);

    const completedMissionsCount = missions.filter(m => m.completed).length;
    const totalMissionsCount = missions.length;
    const missionFocusScore = totalMissionsCount > 0 ? (completedMissionsCount / totalMissionsCount) * 100 : 0;

    const habitPerformance = habits.length > 0
        ? (habits.reduce((acc, h) => acc + h.completedDays.length, 0) / (habits.length * 7)) * 100
        : 0;

    const performanceScore = (missionFocusScore + habitPerformance) / 2;

    return {
        missions,
        toggleMission,
        addMission,
        transactions,
        addTransaction,
        balance,
        todayIncome,
        todayExpense,
        debtsOwe,
        debtsOwed,
        habits,
        toggleHabit,
        performanceScore,
        missionFocusScore,
        completedMissionsCount,
        addHabit,
        agenda,
        addCalendarEvent,
        timeBlocks,
        addTimeBlock: (label: string, start: string, end: string, color: string) => {
            const newBlock: TimeBlock = { id: Date.now(), label, start, end, color };
            setTimeBlocks(prev => [...prev, newBlock].sort((a,b) => a.start.localeCompare(b.start)));
        },
        removeTimeBlock: (id: number) => {
            setTimeBlocks(prev => prev.filter(b => b.id !== id));
        },
        notes,
        addNote: (title: string, content: string, type: 'text' | 'checklist', items: { text: string; completed: boolean }[], q: string, color: string) => {
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
        },
        removeNote: (id: number) => {
            setNotes(prev => prev.filter(n => n.id !== id));
        },
        toggleNoteItem: (noteId: number, itemId: number) => {
            setNotes(prev => prev.map(n => {
                if (n.id !== noteId) return n;
                return {
                    ...n,
                    items: n.items.map(it => it.id === itemId ? { ...it, completed: !it.completed } : it)
                };
            }));
        }
    };
};
