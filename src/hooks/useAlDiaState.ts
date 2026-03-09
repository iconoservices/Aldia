import { useState, useEffect } from 'react';

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

export const useAlDiaState = () => {
    // 1. Estados Iniciales / Carga de LocalStorage
    const [missions, setMissions] = useState<Mission[]>(() => {
        const saved = localStorage.getItem('aldia_missions');
        return saved ? JSON.parse(saved) : [
            { id: 1, text: 'Pagar Luz (Vence Hoy)', q: 'Q1', critical: true, completed: false },
            { id: 2, text: 'Terminar maquetación AlDía', q: 'Q2', critical: false, completed: false },
            { id: 3, text: 'Diseñar Menú Radial (+)', q: 'Q2', critical: false, completed: false },
            { id: 4, text: 'Revisar emails de suscripciones', q: 'Q3', critical: false, completed: false },
        ];
    });

    const [transactions, setTransactions] = useState<Transaction[]>(() => {
        const saved = localStorage.getItem('aldia_transactions');
        return saved ? JSON.parse(saved) : [];
    });

    const [balance, setBalance] = useState(() => {
        const saved = localStorage.getItem('aldia_balance');
        return saved ? parseFloat(saved) : 4250.00;
    });

    const [habits, setHabits] = useState<Habit[]>(() => {
        const saved = localStorage.getItem('aldia_habits');
        return saved ? JSON.parse(saved) : [
            { id: 1, name: 'Tomar 2L de Agua', completedDays: [0, 1, 2] },
            { id: 2, name: 'Leer 15 páginas', completedDays: [1] },
            { id: 3, name: 'Meditar 10 min', completedDays: [] }
        ];
    });

    const [agenda, setAgenda] = useState<CalendarEvent[]>(() => {
        const saved = localStorage.getItem('aldia_agenda');
        return saved ? JSON.parse(saved) : [
            { id: 1, title: 'Reunión de Maquetación', startTime: '15:00', endTime: '17:00', description: 'Avanzar en la lógica PWA de AlDía' },
            { id: 2, title: 'Gimnasio / Entreno', startTime: '18:30', endTime: '20:00', description: 'Día de pierna y cardio' },
            { id: 3, title: 'Cena con Equipo', startTime: '21:00', endTime: '22:30', description: 'Revisión mensual de objetivos' }
        ];
    });

    // 2. Persistencia Automática
    useEffect(() => {
        localStorage.setItem('aldia_missions', JSON.stringify(missions));
    }, [missions]);

    useEffect(() => {
        localStorage.setItem('aldia_transactions', JSON.stringify(transactions));
    }, [transactions]);

    useEffect(() => {
        localStorage.setItem('aldia_balance', JSON.stringify(balance));
    }, [balance]);

    useEffect(() => {
        localStorage.setItem('aldia_habits', JSON.stringify(habits));
    }, [habits]);

    useEffect(() => {
        localStorage.setItem('aldia_agenda', JSON.stringify(agenda));
    }, [agenda]);

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
    const addMission = (text: string) => {
        const newMission: Mission = {
            id: Date.now() + Math.random(),
            text,
            q: 'Q2', // Por defecto
            critical: false,
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
        addCalendarEvent
    };
};
