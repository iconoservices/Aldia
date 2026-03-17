import { useState, useEffect } from 'react';
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
        performanceScore, missionFocusScore, completedMissionsCount
    } = useMisionesState();
    
    const {
        projects, setProjects, timeBlocks, setTimeBlocks, rutinas, setRutinas,
        addProject, addProjectTask, toggleProjectTask, removeProjectTask,
        promoteTaskToRoutine, updateProject, deleteProject,
        addTimeBlock, removeTimeBlock,
        addRoutineItem, updateRoutineItem, toggleRoutineItem, removeRoutineItem,
        updateRoutine, addRoutine, removeRoutine
    } = useProyectosState();

    const {
        notes, setNotes, addNote, removeNote, toggleNoteItem
    } = useCerebroState();

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

                    setMisionesDirect(data.missions || localData.missions);
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
        if (sMissions) setMisionesDirect(JSON.parse(sMissions));
        else setMisionesDirect([
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
            { id: 1, name: 'AlDía App', color: '#ff8c42', status: 'activo', targetHoursPerWeek: 10, checklist: [] },
            { id: 2, name: 'Personal/Life', color: '#3b82f6', status: 'activo', targetHoursPerWeek: 5, checklist: [] },
            { id: 3, name: 'Trabajo / Oficina', color: '#10b981', status: 'activo', targetHoursPerWeek: 40, checklist: [] }
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

        // Borrar "old" LocalStorage keys if they were different (not needed here but good practice)

        // Guardar en Firestore si hay usuario
        if (user) {
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
                lastSync: new Date().toISOString()
            }, { merge: true });
        }
    }, [misionesState, transactions, balance, habits, agenda, timeBlocks, notes, projects, rutinas, monthlyBudget, fixedExpenses, user, isInitialLoad]);

    // 3. Lógica Derivada (Calculada)
    const todayStr = new Date().toISOString().split('T')[0];
    const todayIndex = (new Date().getDay() + 6) % 7; // 0=Mon, 6=Sun

    const routineMissions = (rutinas || [])
        .filter(r => r.isActive && r.repeatDays?.includes(todayIndex))
        .flatMap(r => (r.items || []).map(item => ({
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
        })));

    const habitMissions = (habits || []).map(h => ({
        id: h.id,
        uid: `habit-${h.id}`,
        text: h.name,
        completed: (h.completedDays || []).includes(todayIndex),
        q: 'Q2' as const,
        repeat: 'none' as const,
        critical: false as const,
        isHabit: true,
        habitCount: (h.completedDays || []).length
    }));

    const todayMissions = [
        ...(misionesState || []).filter(m => !m.dueDate || m.dueDate <= todayStr).map(m => ({ ...m, uid: `task-${m.id}` })),
        ...routineMissions,
        ...habitMissions
    ] as Mission[];

    // 4. Acciones (Consolidadas)
    return {
        // Misiones & Hábitos
        missions: misionesState, todayMissions, toggleMission, updateMission, addMission, removeMission,
        habits, toggleHabit, addHabit, removeHabit,
        agenda, addCalendarEvent,
        performanceScore, missionFocusScore, completedMissionsCount,

        // Finanzas
        transactions, addTransaction, balance,
        todayIncome, todayExpense, debtsOwe, debtsOwed,
        monthlyBudget, updateMonthlyBudget: (amount: number) => setMonthlyBudget(amount),
        fixedExpenses, addFixedExpense, removeFixedExpense, toggleFixedExpense, updateFixedExpense,

        // Proyectos & Rutinas
        projects, addProject, addProjectTask, toggleProjectTask, removeProjectTask,
        promoteTaskToRoutine, updateProject, deleteProject,
        timeBlocks, addTimeBlock, removeTimeBlock,
        rutinas, addRoutineItem, updateRoutineItem, toggleRoutineItem, removeRoutineItem,
        updateRoutine, addRoutine, removeRoutine,

        // Cerebro (Notas)
        notes, addNote, removeNote, toggleNoteItem,

        // Sistema
        user, isInitialLoad
    };
};
