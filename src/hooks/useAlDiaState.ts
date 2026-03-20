import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useFinanzasState } from './state/useFinanzasState';
import { useMisionesState } from './state/useMisionesState';
import { useProyectosState } from './state/useProyectosState';
import { useCerebroState } from './state/useCerebroState';

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
    isRoutine?: boolean; // Para identificar tareas que vienen de una rutina
    routineId?: number; // Referencia a la rutina de origen
    isHabit?: boolean; // Para identificar habitos en la lista de misiones
    habitCount?: number; // Para mostrar cuántas veces se ha completado el hábito
    uid?: string; // ID único para renderizado (evitar colisiones)
}

export interface Routine {
    id: number;
    title: string; // "Mañana", "Tarde", "Noche"
    color: string;
    isActive: boolean;
    repeatDays?: number[]; // [0,1,2,3,4,5,6]
    startTime?: string;
    endTime?: string;
    items: { id: number; text: string; completed: boolean; time?: string }[];
}

export interface Transaction {
    id: number;
    text: string;
    amount: number;
    type: 'ingreso' | 'gasto';
    isDebt: boolean;
    date: string;     // HH:mm
    fullDate: string; // YYYY-MM-DD
    projectId?: number;
    accountId?: number;
}

export interface Account {
    id: number;
    name: string;
    color: string;
    projectId?: number;
}

export interface FixedExpense {
    id: number;
    text: string;
    amount: number;
    active: boolean;
    projectId?: number;
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
    checklist?: { id: number; text: string; completed: boolean }[];
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
    
    // Módulos Modularizados
    const { 
        transactions, setTransactions, balance, setBalance, 
        monthlyBudget, setMonthlyBudget, fixedExpenses, setFixedExpenses,
        addTransaction, addFixedExpense, removeFixedExpense, toggleFixedExpense, 
        updateFixedExpense, todayIncome, todayExpense, debtsOwe, debtsOwed 
    } = useFinanzasState();

    const {
        missions: misionesState, setMissions: setMisionesDirect,
        habits, setHabits, agenda, setAgenda,
        toggleMission, updateMission, removeMission, addMission,
        toggleHabit, addHabit, removeHabit, addCalendarEvent,
        reorderMissions,
        performanceScore, missionFocusScore, completedMissionsCount
    } = useMisionesState();
    
    const {
        projects, setProjects, timeBlocks, setTimeBlocks, rutinas, setRutinas,
        addProject, addProjectTask, toggleProjectTask, removeProjectTask,
        promoteTaskToRoutine, updateProject, deleteProject, reorderProjectTasks,
        addTimeBlock, removeTimeBlock,
        addRoutineItem, updateRoutineItem, toggleRoutineItem, removeRoutineItem,
        updateRoutine, addRoutine, removeRoutine, updateProjectTask
    } = useProyectosState();

    const {
        notes, setNotes, addNote, removeNote, toggleNoteItem, updateNote
    } = useCerebroState();

    const [accounts, setAccounts] = useState<Account[]>([
        { id: 1, name: 'Efectivo', color: '#4ade80', projectId: 1 },
        { id: 2, name: 'Yape', color: '#8b5cf6', projectId: 1 },
        { id: 3, name: 'Plin', color: '#3b82f6', projectId: 1 },
        { id: 4, name: 'BCP', color: '#f59e0b', projectId: 1 },
        { id: 5, name: 'BBVA', color: '#004481', projectId: 1 }
    ]);

    // 2. Lógica de Carga (LocalStorage First)
    useEffect(() => {
        // Carga inmediata de LocalStorage para evitar estados vacíos
        const loadInitialLocal = () => {
            const keys = {
                missions: 'aldia_missions',
                transactions: 'aldia_transactions',
                balance: 'aldia_balance',
                habits: 'aldia_habits',
                agenda: 'aldia_agenda',
                timeblocks: 'aldia_timeblocks',
                notes: 'aldia_notes',
                projects: 'aldia_projects',
                rutinas: 'aldia_rutinas',
                budget: 'aldia_monthly_budget',
                fixed: 'aldia_fixed_expenses'
            };

            const sMissions = localStorage.getItem(keys.missions);
            if (sMissions) setMisionesDirect(JSON.parse(sMissions));
            
            const sTransactions = localStorage.getItem(keys.transactions);
            if (sTransactions) setTransactions(JSON.parse(sTransactions));

            const sBalance = localStorage.getItem(keys.balance);
            if (sBalance) setBalance(parseFloat(sBalance));

            const sHabits = localStorage.getItem(keys.habits);
            if (sHabits) setHabits(JSON.parse(sHabits));

            const sAgenda = localStorage.getItem(keys.agenda);
            if (sAgenda) setAgenda(JSON.parse(sAgenda));

            const sTimeBlocks = localStorage.getItem(keys.timeblocks);
            if (sTimeBlocks) setTimeBlocks(JSON.parse(sTimeBlocks));

            const sNotes = localStorage.getItem(keys.notes);
            if (sNotes) setNotes(JSON.parse(sNotes));

            const sProjects = localStorage.getItem(keys.projects);
            if (sProjects) setProjects(JSON.parse(sProjects));

            const sRutinas = localStorage.getItem(keys.rutinas);
            if (sRutinas) setRutinas(JSON.parse(sRutinas));

            const sBudget = localStorage.getItem(keys.budget);
            if (sBudget) setMonthlyBudget(parseFloat(sBudget));

            const sFixed = localStorage.getItem(keys.fixed);
            if (sFixed) setFixedExpenses(JSON.parse(sFixed));

            const sAccounts = localStorage.getItem('aldia_accounts');
            if (sAccounts) setAccounts(JSON.parse(sAccounts));
        };

        loadInitialLocal();

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            
            if (user) {
                try {
                    const docRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        const cloud = docSnap.data() || {};
                        const validate = (val: any) => Array.isArray(val) ? val : [];

                        // "SMART MERGE" LIGERO: Si Cloud tiene datos, combinarlos con Local por ID
                        const smartMerge = <T extends { id: number }>(cloudArr: any[], localArr: any[]): T[] => {
                            const combined = [...validate(cloudArr)];
                            const cloudIds = new Set(combined.map(item => item?.id).filter(id => id !== undefined));
                            
                            validate(localArr).forEach(item => {
                                if (item?.id && !cloudIds.has(item.id)) combined.push(item);
                            });
                            return combined;
                        };

                        setMisionesDirect(prev => smartMerge(cloud.missions, prev));
                        setTransactions(prev => smartMerge(cloud.transactions, prev));
                        setHabits(prev => smartMerge(cloud.habits, prev));
                        setAgenda(prev => smartMerge(cloud.agenda, prev));
                        setNotes(prev => smartMerge(cloud.notes, prev));
                        setProjects(prev => smartMerge(cloud.projects, prev));
                        setRutinas(prev => smartMerge(cloud.rutinas, prev));
                        setFixedExpenses(prev => smartMerge(cloud.fixedExpenses, prev));
                        setTimeBlocks(prev => smartMerge(cloud.timeBlocks, prev));

                        if (cloud.balance !== undefined) setBalance(Number(cloud.balance));
                        if (cloud.monthlyBudget !== undefined) setMonthlyBudget(Number(cloud.monthlyBudget));
                        if (cloud.accounts) setAccounts(prev => smartMerge(cloud.accounts, prev));
                    }
                } catch (error) {
                    console.error("Error en sincronización Cloud:", error);
                }
            }
            setIsInitialLoad(false);
        });

        return unsubscribe;
    }, []);

    // 3. Persistencia Unificada (Local + Cloud Debounced)
    useEffect(() => {
        if (isInitialLoad) return;

        localStorage.setItem('aldia_missions', JSON.stringify(misionesState));
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
        localStorage.setItem('aldia_accounts', JSON.stringify(accounts));

        if (user) {
            const syncTimer = setTimeout(() => {
                const docRef = doc(db, 'users', user.uid);
                setDoc(docRef, {
                    missions: misionesState,
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
                    accounts,
                    lastSync: new Date().toISOString()
                }, { merge: true });
            }, 2000);

            return () => clearTimeout(syncTimer);
        }
    }, [misionesState, transactions, balance, habits, agenda, timeBlocks, notes, projects, rutinas, monthlyBudget, fixedExpenses, user, isInitialLoad]);

    // 3. Lógica Derivada
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const todayIndex = useMemo(() => (new Date().getDay() + 6) % 7, []); // 0=Mon, 6=Sun

    const routineMissions = useMemo(() => (Array.isArray(rutinas) ? rutinas : [])
        .filter(r => r?.isActive && Array.isArray(r.repeatDays) && r.repeatDays.includes(todayIndex))
        .flatMap(r => (Array.isArray(r.items) ? r.items : []).map(item => ({
            id: item.id,
            uid: `routine-${r.id}-${item.id}`,
            text: item.text,
            completed: item.completed,
            dueTime: item.time || r.startTime,
            q: 'Q2' as const,
            repeat: 'none' as const,
            critical: false as const,
            isRoutine: true,
            routineId: r.id
        }))), [rutinas, todayIndex]);

    const habitMissions = useMemo(() => (Array.isArray(habits) ? habits : []).map(h => ({
        id: h.id,
        uid: `habit-${h.id}`,
        text: h.name,
        completed: Array.isArray(h.completedDays) && h.completedDays.includes(todayIndex),
        q: 'Q2' as const,
        repeat: 'none' as const,
        critical: false as const,
        isHabit: true,
        habitCount: Array.isArray(h.completedDays) ? h.completedDays.length : 0
    })), [habits, todayIndex]);

    const clearAllData = async () => {
        setMisionesDirect([]);
        setTransactions([]);
        setBalance(0);
        setHabits([]);
        setAgenda([]);
        setNotes([]);
        setProjects([]);
        setRutinas([]);
        setMonthlyBudget(0);
        setFixedExpenses([]);
        localStorage.clear();

        if (user) {
            const docRef = doc(db, 'users', user.uid);
            await setDoc(docRef, {
                missions: [],
                transactions: [],
                balance: 0,
                habits: [],
                agenda: [],
                notes: [],
                projects: [],
                rutinas: [],
                monthlyBudget: 0,
                fixedExpenses: [],
                lastSync: new Date().toISOString()
            });
        }
    };

    const todayMissions = useMemo(() => [
        ...(Array.isArray(misionesState) ? misionesState : []).filter(m => m && (!m.dueDate || m.dueDate <= todayStr)).map(m => ({ ...m, uid: `task-${m.id}` })),
        ...routineMissions,
        ...habitMissions
    ] as Mission[], [misionesState, routineMissions, habitMissions, todayStr]);

    // 4. Acciones
    return {
        // Misiones & Hábitos
        missions: misionesState, todayMissions, toggleMission, updateMission, addMission, removeMission, reorderMissions,
        habits, toggleHabit, addHabit, removeHabit,
        agenda, addCalendarEvent,
        performanceScore, missionFocusScore, completedMissionsCount,

        // Finanzas
        transactions, addTransaction, balance,
        todayIncome, todayExpense, debtsOwe, debtsOwed,
        monthlyBudget, updateMonthlyBudget: (amount: number) => setMonthlyBudget(amount),
        fixedExpenses, addFixedExpense, removeFixedExpense, toggleFixedExpense, updateFixedExpense,

        // Proyectos & Rutinas
        projects, addProject, addProjectTask, toggleProjectTask, removeProjectTask, reorderProjectTasks,
        promoteTaskToRoutine, updateProject, deleteProject, updateProjectTask,
        timeBlocks, addTimeBlock, removeTimeBlock,
        rutinas, addRoutineItem, updateRoutineItem, toggleRoutineItem, removeRoutineItem,
        updateRoutine, addRoutine, removeRoutine,

        // Cerebro (Notas)
        notes, addNote, removeNote, toggleNoteItem, updateNote,

        // Cuentas
        accounts, setAccounts,

        // Sistema
        user, isInitialLoad, clearAllData
    };
};
