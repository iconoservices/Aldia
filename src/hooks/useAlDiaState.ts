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
    items: { id: number; text: string; completed: boolean; time?: string; linkedProjectId?: number; linkedTaskId?: number }[];
}

export interface Transaction {
    id: number;
    text: string;
    amount: number;
    type: 'ingreso' | 'gasto';
    isDebt: boolean;
    isCashless?: boolean;
    date: string;     // HH:mm
    fullDate: string; // YYYY-MM-DD
    projectId?: number;
    accountId?: number;
    category?: string;
}

export interface Account {
    id: number;
    name: string;
    color: string;
    projectIds?: number[];
}

export interface FixedExpense {
    id: number;
    text: string;
    amount: number;
    active: boolean;
    projectId?: number;
    lastPaidMonth?: string; // YYYY-MM
    dueDay?: number; // 1-31 (Día de cobro en el mes)
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
    checklist?: { id: number; text: string; completed: boolean; linkedRoutineId?: number; linkedRoutineItemId?: number }[];
    inventoryItems?: { id: number; text: string; quantity: number }[];
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
        transactions, setTransactions, balance, 
        monthlyBudget, setMonthlyBudget, fixedExpenses, setFixedExpenses,
        addTransaction, addFixedExpense, removeFixedExpense, toggleFixedExpense, 
        updateFixedExpense, markFixedExpensePaid, unmarkFixedExpensePaid, repayDebt: repayDebtBase, 
        todayIncome, todayExpense, todayNet, todayIncomeReal, todayExpenseReal,
        totalIncomeReal, totalExpenseReal, totalNetReal, debtsOwe, debtsOwed,
        removeTransaction, updateTransaction
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
        addInventoryItem, updateInventoryItemQuantity, removeInventoryItem,
        addRoutineItem, updateRoutineItem, toggleRoutineItem, removeRoutineItem,
        updateRoutine, addRoutine, removeRoutine, updateProjectTask
    } = useProyectosState();

    const {
        notes, setNotes, addNote, removeNote, toggleNoteItem, updateNote
    } = useCerebroState();

    const [accounts, setAccounts] = useState<Account[]>([]);

    // 2. Lógica de Carga (LocalStorage First)
    useEffect(() => {
        // Carga inmediata de LocalStorage para evitar estados vacíos y condiciones de carrera
        const loadInitialLocal = () => {
            const keys = {
                missions: 'aldia_missions',
                transactions: 'aldia_transactions',
                habits: 'aldia_habits',
                agenda: 'aldia_agenda',
                timeblocks: 'aldia_timeblocks',
                notes: 'aldia_notes',
                projects: 'aldia_projects',
                rutinas: 'aldia_rutinas',
                budget: 'aldia_monthly_budget',
                fixed: 'aldia_fixed_expenses',
                accounts: 'aldia_accounts'
            };

            const data = {
                missions: JSON.parse(localStorage.getItem(keys.missions) || '[]'),
                transactions: JSON.parse(localStorage.getItem(keys.transactions) || '[]'),
                habits: JSON.parse(localStorage.getItem(keys.habits) || '[]'),
                agenda: JSON.parse(localStorage.getItem(keys.agenda) || '[]'),
                timeblocks: JSON.parse(localStorage.getItem(keys.timeblocks) || '[]'),
                notes: JSON.parse(localStorage.getItem(keys.notes) || '[]'),
                projects: JSON.parse(localStorage.getItem(keys.projects) || '[]'),
                rutinas: JSON.parse(localStorage.getItem(keys.rutinas) || '[]'),
                budget: parseFloat(localStorage.getItem(keys.budget) || '0'),
                fixed: JSON.parse(localStorage.getItem(keys.fixed) || '[]'),
                accounts: JSON.parse(localStorage.getItem(keys.accounts) || '[]')
            };

            // Aplicar estados iniciales
            setMisionesDirect(data.missions);
            setTransactions(data.transactions);
            setHabits(data.habits);
            setAgenda(data.agenda);
            setTimeBlocks(data.timeblocks);
            setNotes(data.notes);
            setProjects(data.projects);
            setRutinas(data.rutinas);
            setMonthlyBudget(data.budget);
            setFixedExpenses(data.fixed);
            setAccounts(data.accounts);

            return data;
        };

        const localData = loadInitialLocal();

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

                        setMisionesDirect(prev => smartMerge(cloud.missions, prev.length > 0 ? prev : localData.missions));
                        setTransactions(prev => smartMerge(cloud.transactions, prev.length > 0 ? prev : localData.transactions));
                        setHabits(prev => smartMerge(cloud.habits, prev.length > 0 ? prev : localData.habits));
                        setAgenda(prev => smartMerge(cloud.agenda, prev.length > 0 ? prev : localData.agenda));
                        setNotes(prev => smartMerge(cloud.notes, prev.length > 0 ? prev : localData.notes));
                        setProjects(prev => smartMerge(cloud.projects, prev.length > 0 ? prev : localData.projects));
                        setRutinas(prev => smartMerge(cloud.rutinas, prev.length > 0 ? prev : localData.rutinas));
                        setFixedExpenses(prev => smartMerge(cloud.fixedExpenses, prev.length > 0 ? prev : localData.fixed));
                        setTimeBlocks(prev => smartMerge(cloud.timeBlocks, prev.length > 0 ? prev : localData.timeblocks));

                        if (cloud.monthlyBudget !== undefined) setMonthlyBudget(Number(cloud.monthlyBudget));
                        if (cloud.accounts) setAccounts(prev => smartMerge(cloud.accounts, prev.length > 0 ? prev : localData.accounts));
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
    }, [misionesState, transactions, habits, agenda, timeBlocks, notes, projects, rutinas, monthlyBudget, fixedExpenses, user, isInitialLoad, accounts]);

    // 4. Migración y Recuperación de Datos (Post-Carga)
    useEffect(() => {
        if (isInitialLoad) return;

        // Migrar Cuentas (projectId -> projectIds)
        const needsAccountMigration = accounts.some(acc => {
            const a = acc as any;
            return a.projectId !== undefined && (!a.projectIds || a.projectIds.length === 0);
        });

        if (needsAccountMigration) {
            setAccounts(prev => prev.map(acc => {
                const a = acc as any;
                if (a.projectId !== undefined && (!a.projectIds || a.projectIds.length === 0)) {
                    const { projectId, ...rest } = a;
                    return { ...rest, projectIds: [projectId] } as Account;
                }
                return acc;
            }));
        }

        // Recuperar Proyecto "Personal" si hay huérfanos con ID 1
        const hasId1References = 
            transactions.some(tx => tx.projectId === 1) || 
            misionesState.some(m => m.projectId === 1) ||
            accounts.some(acc => (acc as any).projectId === 1 || acc.projectIds?.includes(1));
            
        const project1Exists = projects.some(p => p.id === 1);

        if (hasId1References && !project1Exists) {
            setProjects(prev => [
                { id: 1, name: '☕ Personal (Recuperado)', color: '#888', status: 'activo', checklist: [] },
                ...prev
            ]);
        }
    }, [isInitialLoad, transactions.length, accounts.length, projects.length, misionesState.length]);

    // 3. Lógica Derivada
    const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
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
        setHabits([]);
        setAgenda([]);
        setNotes([]);
        setProjects([]);
        setRutinas([]);
        setMonthlyBudget(0);
        setFixedExpenses([]);
        setAccounts([]);
        localStorage.clear();

        if (user) {
            const docRef = doc(db, 'users', user.uid);
            await setDoc(docRef, {
                missions: [],
                transactions: [],
                habits: [],
                agenda: [],
                notes: [],
                projects: [],
                rutinas: [],
                monthlyBudget: 0,
                fixedExpenses: [],
                accounts: [],
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
        transactions, 
        addTransaction: (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projectId?: number, accountId?: number, isCashless?: boolean, category?: string) => {
            addTransaction(text, amount, type, isDebt, projectId, accountId, isCashless, category);
            if (projectId && accountId) {
                setAccounts(prev => prev.map(acc => {
                    if (acc.id === accountId && !acc.projectIds?.includes(projectId)) {
                        return { ...acc, projectIds: [...(acc.projectIds || []), projectId] };
                    }
                    return acc;
                }));
            }
        },
        balance,
        todayIncome, todayExpense, todayNet, todayIncomeReal, todayExpenseReal,
        totalIncomeReal, totalExpenseReal, totalNetReal, debtsOwe, debtsOwed,
        monthlyBudget, updateMonthlyBudget: (amount: number) => setMonthlyBudget(amount),
        fixedExpenses, addFixedExpense, removeFixedExpense, toggleFixedExpense, updateFixedExpense, markFixedExpensePaid, unmarkFixedExpensePaid,
        repayDebt: repayDebtBase,
        removeTransaction,
        updateTransaction,

        // Proyectos & Rutinas
        projects, addProject, addProjectTask, toggleProjectTask, removeProjectTask, reorderProjectTasks,
        promoteTaskToRoutine, updateProject, deleteProject, updateProjectTask,
        addInventoryItem, updateInventoryItemQuantity, removeInventoryItem,
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
