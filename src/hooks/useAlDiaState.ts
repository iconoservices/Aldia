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
    projectId?: number; // Referencia opcional a un proyecto
    repeatDays?: number[]; // Índices 0-6 (L-D) para repetición personalizada
}

export interface Routine {
    id: number;
    title: string; // "Mañana", "Tarde", "Noche"
    color: string;
    isActive: boolean;
    repeatDays?: number[]; // [0,1,2,3,4,5,6]
    startTime?: string;
    endTime?: string;
    items: { id: number; text: string; completed: boolean }[];
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

export interface FixedExpense {
    id: number;
    text: string;
    amount: number;
    active: boolean;
}

export interface CalendarEvent {
    id: number;
    title: string;
    date: string;      // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
    description?: string;
    projectId?: number;
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
    projectId?: number;
}

export interface Project {
    id: number;
    name: string;
    color: string;
    status: 'activo' | 'pausado' | 'completado';
    targetHoursPerWeek?: number;
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
    const [projects, setProjects] = useState<Project[]>([]);
    const [rutinas, setRutinas] = useState<Routine[]>([]);
    const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
    const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);

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
                    
                    // Lógica de "Mezcla" (Merge): Priorizar Cloud, pero si falta algo, usar Local
                    const localData = getLocalBackup();

                    setMissions(data.missions || localData.missions);
                    setTransactions(data.transactions || localData.transactions);
                    setBalance(data.balance !== undefined ? data.balance : localData.balance);
                    setHabits(data.habits || localData.habits);
                    setAgenda(data.agenda || localData.agenda);
                    setTimeBlocks(data.timeBlocks || localData.timeBlocks);
                    setNotes(data.notes || localData.notes);
                    setProjects(data.projects || localData.projects);
                    setRutinas(data.rutinas || localData.rutinas);
                    setMonthlyBudget(data.monthlyBudget !== undefined ? data.monthlyBudget : localData.monthlyBudget);
                    setFixedExpenses(data.fixedExpenses || localData.fixedExpenses);
                } else {
                    // Si no hay documento en cloud, cargar todo de local
                    loadFromLocal();
                }
            } else {
                // Si no hay usuario, cargar de local
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

        const sProjects = localStorage.getItem('aldia_projects');
        if (sProjects) setProjects(JSON.parse(sProjects));
        else setProjects([
            { id: 1, name: 'AlDía App', color: '#ff8c42', status: 'activo', targetHoursPerWeek: 10 },
            { id: 2, name: 'Personal/Life', color: '#3b82f6', status: 'activo', targetHoursPerWeek: 5 },
            { id: 3, name: 'Trabajo / Oficina', color: '#10b981', status: 'activo', targetHoursPerWeek: 40 }
        ]);

        const sRutinas = localStorage.getItem('aldia_rutinas');
        if (sRutinas) setRutinas(JSON.parse(sRutinas));
        else setRutinas([
            { id: 1, title: 'Rutina Mañana', color: '#f59e0b', isActive: true, repeatDays: [0,1,2,3,4,5,6], startTime: '07:00', endTime: '09:00', items: [] },
            { id: 2, title: 'Rutina Tarde', color: '#8b5cf6', isActive: true, repeatDays: [0,1,2,3,4,5,6], startTime: '13:00', endTime: '15:00', items: [] },
            { id: 3, title: 'Rutina Noche', color: '#3b82f6', isActive: true, repeatDays: [0,1,2,3,4,5,6], startTime: '21:00', endTime: '23:00', items: [] }
        ]);

        const sMonthlyBudget = localStorage.getItem('aldia_monthly_budget');
        if (sMonthlyBudget) setMonthlyBudget(parseFloat(sMonthlyBudget));

        const sFixedExpenses = localStorage.getItem('aldia_fixed_expenses');
        if (sFixedExpenses) setFixedExpenses(JSON.parse(sFixedExpenses));
    };

    const getLocalBackup = () => {
        const sMissions = localStorage.getItem('aldia_missions');
        const sTransactions = localStorage.getItem('aldia_transactions');
        const sBalance = localStorage.getItem('aldia_balance');
        const sHabits = localStorage.getItem('aldia_habits');
        const sAgenda = localStorage.getItem('aldia_agenda');
        const sTimeBlocks = localStorage.getItem('aldia_timeblocks');
        const sNotes = localStorage.getItem('aldia_notes');
        const sProjects = localStorage.getItem('aldia_projects');
        const sRutinas = localStorage.getItem('aldia_rutinas');
        const sMonthlyBudget = localStorage.getItem('aldia_monthly_budget');
        const sFixedExpenses = localStorage.getItem('aldia_fixed_expenses');

        return {
            missions: sMissions ? JSON.parse(sMissions) : [],
            transactions: sTransactions ? JSON.parse(sTransactions) : [],
            balance: sBalance ? parseFloat(sBalance) : 4250.00,
            habits: sHabits ? JSON.parse(sHabits) : [],
            agenda: sAgenda ? JSON.parse(sAgenda) : [],
            timeBlocks: sTimeBlocks ? JSON.parse(sTimeBlocks) : [],
            notes: sNotes ? JSON.parse(sNotes) : [],
            projects: sProjects ? JSON.parse(sProjects) : [],
            rutinas: sRutinas ? JSON.parse(sRutinas) : [],
            monthlyBudget: sMonthlyBudget ? parseFloat(sMonthlyBudget) : 0,
            fixedExpenses: sFixedExpenses ? JSON.parse(sFixedExpenses) : []
        };
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
        localStorage.setItem('aldia_projects', JSON.stringify(projects));
        localStorage.setItem('aldia_rutinas', JSON.stringify(rutinas));
        localStorage.setItem('aldia_monthly_budget', JSON.stringify(monthlyBudget));
        localStorage.setItem('aldia_fixed_expenses', JSON.stringify(fixedExpenses));

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
                projects,
                rutinas,
                monthlyBudget,
                fixedExpenses,
                lastSync: new Date().toISOString()
            }, { merge: true });
        }
    }, [missions, transactions, balance, habits, agenda, timeBlocks, notes, projects, rutinas, monthlyBudget, fixedExpenses, user, isInitialLoad]);

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

    const updateMission = (id: number, updates: Partial<Mission>) => {
        setMissions(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    };

    const removeMission = (id: number) => {
        setMissions(prev => prev.filter(m => m.id !== id));
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
    const addMission = (text: string, q: string = 'Q2', repeat: 'none' | 'daily' | 'weekly' | 'monthly' = 'none', noteId?: number, labels: string[] = [], dueDate?: string, dueTime?: string, habitId?: number, projectId?: number, repeatDays?: number[]) => {
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
            habitId,
            projectId,
            repeatDays
        };
        setMissions(prev => [newMission, ...prev]);
    };

    // Añadir cita a la agenda
    const addCalendarEvent = (title: string, date: string, startTime: string, endTime: string, description: string, projectId?: number) => {
        const newEvent: CalendarEvent = {
            id: Date.now() + Math.random(),
            title,
            date,
            startTime,
            endTime,
            description,
            projectId
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
        updateMission,
        addMission,
        removeMission,
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
        removeHabit: (id: number) => {
            setHabits(prev => prev.filter(h => h.id !== id));
        },
        agenda,
        addCalendarEvent,
        timeBlocks,
        addTimeBlock: (label: string, start: string, end: string, color: string, projectId?: number) => {
            const newBlock: TimeBlock = { id: Date.now(), label, start, end, color, projectId };
            setTimeBlocks(prev => [...prev, newBlock].sort((a,b) => a.start.localeCompare(b.start)));
        },
        removeTimeBlock: (id: number) => {
            setTimeBlocks(prev => prev.filter(b => b.id !== id));
        },
        projects,
        addProject: (name: string, color: string, targetHoursPerWeek?: number) => {
            const newProject: Project = { 
                id: Date.now() + Math.random(), 
                name, 
                color, 
                status: 'activo',
                targetHoursPerWeek
            };
            setProjects(prev => [newProject, ...prev]);
        },
        updateProject: (id: number, updates: Partial<Project>) => {
            setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        },
        deleteProject: (id: number) => {
            setProjects(prev => prev.filter(p => p.id !== id));
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
        },
        rutinas,
        addRoutineItem: (routineId: number, text: string) => {
            setRutinas(prev => prev.map(r => {
                if (r.id !== routineId) return r;
                return {
                    ...r,
                    items: [...r.items, { id: Date.now() + Math.random(), text, completed: false }]
                };
            }));
        },
        toggleRoutineItem: (routineId: number, itemId: number) => {
            setRutinas(prev => prev.map(r => {
                if (r.id !== routineId) return r;
                return {
                    ...r,
                    items: r.items.map(it => it.id === itemId ? { ...it, completed: !it.completed } : it)
                };
            }));
        },
        removeRoutineItem: (routineId: number, itemId: number) => {
            setRutinas(prev => prev.map(r => {
                if (r.id !== routineId) return r;
                return {
                    ...r,
                    items: r.items.filter(it => it.id !== itemId)
                };
            }));
        },
        updateRoutine: (id: number, updates: Partial<Routine>) => {
            setRutinas(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
        },
        addRoutine: (title: string, color: string = '#8a5cf6') => {
            setRutinas(prev => [...prev, {
                id: Date.now(),
                title,
                color,
                isActive: true,
                repeatDays: [0,1,2,3,4,5,6],
                startTime: '09:00',
                endTime: '10:00',
                items: []
            }]);
        },
        removeRoutine: (id: number) => {
            setRutinas(prev => prev.filter(r => r.id !== id));
        },
        monthlyBudget,
        updateMonthlyBudget: (amount: number) => setMonthlyBudget(amount),
        fixedExpenses,
        addFixedExpense: (text: string, amount: number) => {
            const newExpense: FixedExpense = { id: Date.now() + Math.random(), text, amount, active: true };
            setFixedExpenses(prev => [...prev, newExpense]);
        },
        removeFixedExpense: (id: number) => {
            setFixedExpenses(prev => prev.filter(e => e.id !== id));
        },
        toggleFixedExpense: (id: number) => {
            setFixedExpenses(prev => prev.map(e => e.id === id ? { ...e, active: !e.active } : e));
        }
    };
};
