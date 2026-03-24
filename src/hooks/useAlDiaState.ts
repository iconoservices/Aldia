import { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
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
    contact?: string;
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

export interface UserPreferences {
    isBudgetFixed: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
    isBudgetFixed: false
};

export interface ProjectNode {
    id: number;
    type: 'task' | 'note' | 'checklist';
    title: string;
    completed?: boolean;
    content?: string;
    subItems?: { id: number; text: string; completed: boolean }[];
    dueDate?: string; // YYYY-MM-DD
    color?: string; // Color específico para esta meta/entrega
}

export interface ProjectObjective {
    id: number;
    title: string;
    completed: boolean;
    nodes: ProjectNode[];
    dueDate?: string; // YYYY-MM-DD
    color?: string; // Color para el objetivo/entrega mayor
    group?: string; // Grupo/Categoría (ej: "Entregas", "Ventas")
}

export interface Project {
    id: number;
    name: string;
    color: string;
    status: 'activo' | 'pausado' | 'completado';
    parentId?: number;
    targetHoursPerWeek?: number;
    checklist?: { id: number; text: string; completed: boolean; linkedRoutineId?: number; linkedRoutineItemId?: number }[];
    inventoryItems?: { id: number; text: string; quantity: number }[];
    incomeCategories?: string[];
    expenseCategories?: string[];
    objectives?: ProjectObjective[]; // Nuevo sistema de nivel 2
}

export const DEFAULT_INCOME_CATEGORIES = ['Sueldo', 'Venta', 'Inversión', 'Otros'];
export const DEFAULT_EXPENSE_CATEGORIES = ['Comida', 'Transporte', 'Servicios', 'Suscripciones', 'Salud', 'Ocio', 'Otros'];

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

    // 1. Estados Modularizados
    const { 
        transactions, setTransactions, balance, 
        monthlyBudget, setMonthlyBudget, fixedExpenses, setFixedExpenses,
        addTransaction, addFixedExpense, removeFixedExpense, toggleFixedExpense, 
        updateFixedExpense, markFixedExpensePaid, unmarkFixedExpensePaid, repayDebt: repayDebtBase, 
        todayIncome, todayExpense, todayNet, todayIncomeReal, todayExpenseReal,
        totalIncomeReal, totalExpenseReal, totalNetReal, debtsOwe, debtsOwed,
        removeTransaction, updateTransaction, updateTransactionGroup
    } = useFinanzasState();

    const {
        missions: misionesState, setMissions: setMisionesDirect,
        habits, setHabits, agenda, setAgenda,
        toggleMission, updateMission, removeMission, addMission,
        toggleHabit, addHabit, removeHabit, addCalendarEvent, removeCalendarEvent,
        reorderMissions,
        performanceScore, missionFocusScore, completedMissionsCount
    } = useMisionesState();
    
    const {
        projects, setProjects, timeBlocks, setTimeBlocks, rutinas, setRutinas,
        addProject, addProjectTask, toggleProjectTask, removeProjectTask,
        promoteTaskToRoutine, updateProject, deleteProject, reorderProjectTasks, reorderProjects,
        addTimeBlock, removeTimeBlock,
        addInventoryItem, updateInventoryItemQuantity, removeInventoryItem,
        addRoutineItem, updateRoutineItem, toggleRoutineItem, removeRoutineItem,
        updateRoutine, addRoutine, removeRoutine, updateProjectTask,
        addProjectCategory, removeProjectCategory, reorderRoutineItems,
        addProjectObjective, updateProjectObjective, removeProjectObjective,
        addProjectNode, updateProjectNode, removeProjectNode
    } = useProyectosState();

    const {
        notes, setNotes, addNote, removeNote, toggleNoteItem, updateNote
    } = useCerebroState();

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
    const [hasLoadedFromCloud, setHasLoadedFromCloud] = useState(false);
    // Timestamp del último cambio local del usuario. Los snapshots de Firestore con lastSync
    // anterior a este valor serán ignorados para evitar sobreescribir cambios pendientes.
    const localWriteTimestampRef = useRef<number>(0);


    // 2. Lógica de Sincronización Real-Time
    useEffect(() => {
        // Carga inmediata de LocalStorage (Solo al montar)
        try {
            const data = {
                missions: JSON.parse(localStorage.getItem('aldia_missions') || '[]'),
                transactions: JSON.parse(localStorage.getItem('aldia_transactions') || '[]'),
                habits: JSON.parse(localStorage.getItem('aldia_habits') || '[]'),
                agenda: JSON.parse(localStorage.getItem('aldia_agenda') || '[]'),
                timeblocks: JSON.parse(localStorage.getItem('aldia_timeblocks') || '[]'),
                notes: JSON.parse(localStorage.getItem('aldia_notes') || '[]'),
                projects: JSON.parse(localStorage.getItem('aldia_projects') || '[]'),
                rutinas: JSON.parse(localStorage.getItem('aldia_rutinas') || '[]'),
                budget: parseFloat(localStorage.getItem('aldia_monthly_budget') || '0'),
                fixed: JSON.parse(localStorage.getItem('aldia_fixed_expenses') || '[]'),
                accounts: JSON.parse(localStorage.getItem('aldia_accounts') || '[]'),
                preferences: JSON.parse(localStorage.getItem('aldia_preferences') || JSON.stringify(DEFAULT_PREFERENCES))
            };
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
            setPreferences(data.preferences);
        } catch (e) { console.error("Error inicial local:", e); }
    }, []); // Una sola vez al montar

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
            setUser(authUser);
            if (!authUser) {
                setIsInitialLoad(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // 2. Lógica de Sincronización Real-Time
    useEffect(() => {
        if (!user) {
            setHasLoadedFromCloud(false);
            return;
        }

        const userId = user.uid;
        const docRef = doc(db, 'users', userId);
        
        const unsubSnap = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const cloud = docSnap.data();
                
                // Si el snapshot es anterior a nuestro último cambio local, ignorarlo.
                // Esto previene que snapshots con datos viejos sobreescriban transacciones recién añadidas.
                const cloudLastSync = cloud.lastSync ? new Date(cloud.lastSync).getTime() : 0;
                if (cloudLastSync < localWriteTimestampRef.current) {
                    setHasLoadedFromCloud(true);
                    setIsInitialLoad(false);
                    return;
                }

                // Función helper que usa el setter funcional para no depender del valor actual
                const sync = (newValue: any, setter: Function) => {
                    if (newValue !== undefined) {
                        setter((prev: any) => {
                            if (JSON.stringify(newValue) !== JSON.stringify(prev)) {
                                return newValue;
                            }
                            return prev;
                        });
                    }
                };

                // Actualizaciones individuales
                sync(cloud.missions, setMisionesDirect);
                sync(cloud.transactions, setTransactions);
                sync(cloud.habits, setHabits);
                sync(cloud.agenda, setAgenda);
                sync(cloud.notes, setNotes);
                sync(cloud.projects, setProjects);
                sync(cloud.rutinas, setRutinas);
                sync(cloud.fixedExpenses, setFixedExpenses);
                sync(cloud.timeBlocks, setTimeBlocks);
                sync(cloud.accounts, setAccounts);
                sync(cloud.preferences, setPreferences);
                if (cloud.monthlyBudget !== undefined) {
                    setMonthlyBudget(prev => Math.abs(cloud.monthlyBudget - prev) > 0.01 ? Number(cloud.monthlyBudget) : prev);
                }

                setHasLoadedFromCloud(true);
                setIsInitialLoad(false);
            } else {
                setHasLoadedFromCloud(true);
                setIsInitialLoad(false);
            }
        }, (error) => {
            console.error("Error Snapshot Firestore:", error);
            setIsInitialLoad(false);
        });

        return () => unsubSnap();
    }, [user?.uid]); // Solo re-suscribir si cambia el usuario

    // Mantenemos la referencia más reciente del estado completo.
    // Esto previene "stale closures" en el setTimeout del debounced save,
    // donde un array viejo de transactions podía enviarse a Firestore y causar un rollback visual.
    const latestStateRef = useRef({
        missions: misionesState, transactions, habits, agenda, timeBlocks, notes, projects, rutinas, monthlyBudget, fixedExpenses, accounts, preferences
    });
    // Actualizamos la ref en CADA render
    latestStateRef.current = {
        missions: misionesState, transactions, habits, agenda, timeBlocks, notes, projects, rutinas, monthlyBudget, fixedExpenses, accounts, preferences
    };

    // 3. Persistencia Cloud (Debounced) y Local (Immediate)
    useEffect(() => {
        // SEGURIDAD: No guardar si todavía no hemos cargado de la nube
        if (isInitialLoad || !hasLoadedFromCloud) return;

        // Guardado Local inmediato
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
        localStorage.setItem('aldia_preferences', JSON.stringify(preferences));

        // Guardado Cloud debounced
        if (user) {
            const timer = setTimeout(() => {
                const docRef = doc(db, 'users', user.uid);
                const syncTimestamp = new Date().toISOString();
                
                // Sanitizar payload usando latestStateRef para asegurar data fresca
                const payload = JSON.parse(JSON.stringify({
                    ...latestStateRef.current,
                    lastSync: syncTimestamp
                }));

                setDoc(docRef, payload, { merge: true })
                    .then(() => {
                        // El snapshot que vuelva de Firestore tendrá lastSync = syncTimestamp
                        // que será >= localWriteTimestampRef, así que pasará el filtro y sincronizará bien.
                    })
                    .catch(error => {
                        console.error("🔥 Error crítico guardando en Firestore:", error);
                        alert("ERROR DE SINCRONIZACIÓN: No se pudo guardar en la nube. " + error.message);
                    });
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [user, isInitialLoad, hasLoadedFromCloud, misionesState, transactions, habits, agenda, notes, projects, rutinas, fixedExpenses, timeBlocks, monthlyBudget, accounts, preferences]);

    // 4. Migraciones y Lógica Derivada
    useEffect(() => {
        if (isInitialLoad) return;

        // Migración projectId -> projectIds en Cuentas
        const migratedAccounts = accounts.map(acc => {
            const a = acc as any;
            if (a.projectId !== undefined && (!a.projectIds || a.projectIds.length === 0)) {
                const { projectId, ...rest } = a;
                return { ...rest, projectIds: [projectId] } as Account;
            }
            return acc;
        });
        if (JSON.stringify(migratedAccounts) !== JSON.stringify(accounts)) {
            setAccounts(migratedAccounts);
        }

        // Recuperar Proyecto "Personal" con ID 1
        const hasId1 = transactions.some(tx => tx.projectId === 1) || 
                       misionesState.some(m => m.projectId === 1) ||
                       accounts.some(acc => acc.projectIds?.includes(1));
        if (hasId1 && !projects.some(p => p.id === 1)) {
            setProjects(prev => [{ id: 1, name: '☕ Personal (Recuperado)', color: '#888', status: 'activo' }, ...prev]);
        }
    }, [isInitialLoad, transactions.length, misionesState.length, accounts.length, projects.length]);

    const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
    const todayIndex = useMemo(() => (new Date().getDay() + 6) % 7, []); // 0=Mon

    const habitMissions = useMemo(() => habits.map(h => ({
        id: h.id,
        uid: `habit-${h.id}`,
        text: h.name,
        completed: h.completedDays?.includes(todayIndex),
        q: 'Q2' as const, repeat: 'none' as const, critical: false, isHabit: true,
        habitCount: h.completedDays?.length || 0
    })), [habits, todayIndex]);

    const routineMissions = useMemo(() => rutinas
        .filter(r => r.isActive && r.repeatDays?.includes(todayIndex))
        .flatMap(r => (r.items || []).map(item => ({
            id: item.id,
            uid: `routine-${r.id}-${item.id}`,
            text: item.text,
            completed: item.completed,
            dueTime: item.time || r.startTime,
            q: 'Q2' as const, repeat: 'none' as const, critical: false, isRoutine: true, routineId: r.id
        }))), [rutinas, todayIndex]);

    const todayMissions = useMemo(() => {
        const baseMissions = [
            ...misionesState.filter(m => (!m.dueDate || m.dueDate <= todayStr) && !m.isRoutine && !m.isHabit).map(m => ({ ...m, uid: `task-${m.id}` })),
            ...routineMissions,
            ...habitMissions
        ] as Mission[];

        return [...baseMissions].sort((a, b) => {
            if (a.completed === b.completed) return 0;
            return a.completed ? 1 : -1;
        });
    }, [misionesState, routineMissions, habitMissions, todayStr]);

    const clearAllData = async () => {
        setMisionesDirect([]); setTransactions([]); setHabits([]); setAgenda([]);
        setNotes([]); setProjects([]); setRutinas([]); setMonthlyBudget(0);
        setFixedExpenses([]); setAccounts([]);
        localStorage.clear();
        if (user) {
            const docRef = doc(db, 'users', user.uid);
            await setDoc(docRef, { lastSync: new Date().toISOString() }, { merge: false });
        }
    };

    return {
        // Misiones
        missions: misionesState, todayMissions, toggleMission, updateMission, addMission, removeMission, reorderMissions,
        habits, toggleHabit, addHabit, removeHabit, agenda, addCalendarEvent, removeCalendarEvent,
        performanceScore, missionFocusScore, completedMissionsCount,
        // Finanzas
        transactions, balance, todayIncome, todayExpense, todayNet, todayIncomeReal, todayExpenseReal,
        totalIncomeReal, totalExpenseReal, totalNetReal, debtsOwe, debtsOwed,
        monthlyBudget, updateMonthlyBudget: (a: number) => setMonthlyBudget(a),
        fixedExpenses, addFixedExpense, removeFixedExpense, toggleFixedExpense, updateFixedExpense, markFixedExpensePaid, unmarkFixedExpensePaid,
        repayDebt: repayDebtBase,
        addTransaction: (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projId?: number, accId?: number, isCashless?: boolean, cat?: string, contact?: string) => {
            // Marcar timestamp de escritura local ANTES de actualizar el estado
            // para que el régimen de snapshot sepa que hay datos más nuevos que la nube
            localWriteTimestampRef.current = Date.now();
            addTransaction(text, amount, type, isDebt, projId, accId, isCashless, cat, contact);
            if (projId && accId) {
                setAccounts(prev => prev.map(acc => {
                    if (acc.id === accId && !acc.projectIds?.includes(projId)) {
                        return { ...acc, projectIds: [...(acc.projectIds || []), projId] };
                    }
                    return acc;
                }));
            }
        },
        removeTransaction, updateTransaction, updateTransactionGroup,
        // Proyectos
        projects, addProject, addProjectTask, toggleProjectTask, removeProjectTask, reorderProjectTasks, reorderProjects,
        promoteTaskToRoutine, updateProject, deleteProject, updateProjectTask,
        addInventoryItem, updateInventoryItemQuantity, removeInventoryItem,
        timeBlocks, addTimeBlock, removeTimeBlock,
        rutinas, addRoutineItem, updateRoutineItem, toggleRoutineItem, removeRoutineItem,
        updateRoutine, addRoutine, removeRoutine, addProjectCategory, removeProjectCategory,
        reorderRoutineItems,
        // Objetivos y Tareas Profundas (Niveles 2 y 3)
        addProjectObjective, updateProjectObjective, removeProjectObjective,
        addProjectNode, updateProjectNode, removeProjectNode,
        // Otros
        notes, addNote, removeNote, toggleNoteItem, updateNote,
        accounts, setAccounts,
        preferences, updatePreference: (key: keyof UserPreferences, value: any) => setPreferences(prev => ({ ...prev, [key]: value })),
        user, isInitialLoad, clearAllData
    };
};
