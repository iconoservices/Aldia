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
            { id: 1, text: 'Pagar Luz (Vence Hoy)', q: 'Q1', critical: true, completed: false },
            { id: 2, text: 'Terminar maquetación AlDía', q: 'Q2', critical: false, completed: false },
            { id: 3, text: 'Diseñar Menú Radial (+)', q: 'Q2', critical: false, completed: false },
            { id: 4, text: 'Revisar emails de suscripciones', q: 'Q3', critical: false, completed: false },
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
        if (sAgenda) setAgenda(JSON.parse(sAgenda));
        else setAgenda([
            { id: 1, title: 'Reunión de Maquetación', startTime: '15:00', endTime: '17:00', description: 'Avanzar en la lógica PWA de AlDía' },
            { id: 2, title: 'Gimnasio / Entreno', startTime: '18:30', endTime: '20:00', description: 'Día de pierna y cardio' },
            { id: 3, title: 'Cena con Equipo', startTime: '21:00', endTime: '22:30', description: 'Revisión mensual de objetivos' }
        ]);

        const sTimeBlocks = localStorage.getItem('aldia_timeblocks');
        if (sTimeBlocks) setTimeBlocks(JSON.parse(sTimeBlocks));
        else setTimeBlocks([
            { id: 1, label: 'Deep Work', start: '09:00', end: '12:00', color: '#3b82f6' },
            { id: 2, label: 'Almuerzo / Break', start: '13:00', end: '14:00', color: '#facc15' },
            { id: 3, label: 'Admin / Mails', start: '14:00', end: '15:00', color: '#10b981' }
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
                lastSync: new Date().toISOString()
            }, { merge: true });
        }
    }, [missions, transactions, balance, habits, agenda, timeBlocks, user, isInitialLoad]);

    // 3. Acciones (Cerebro)

    // Girar misiones (completar/deshacer)
    const toggleMission = (id: number) => {
        setMissions(prev => prev.map(m => m.id === id ? { ...m, completed: !m.completed } : m));
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
    const addMission = (text: string, q: string = 'Q2') => {
        const newMission: Mission = {
            id: Date.now() + Math.random(),
            text,
            q, // Usar el cuadrante proporcionado o Q2 por defecto
            critical: q === 'Q1', // Si es Q1, marcar como crítica automáticamente
            completed: false
        };
        setMissions(prev => [newMission, ...prev]);
    };

    // Añadir cita a la agenda
    const addCalendarEvent = (title: string, startTime: string, endTime: string, description: string) => {
        const newEvent: CalendarEvent = {
            id: Date.now() + Math.random(),
            title,
            startTime,
            endTime,
            description
        };
        setAgenda(prev => [...prev, newEvent].sort((a, b) => a.startTime.localeCompare(b.startTime)));
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
        }
    };
};
