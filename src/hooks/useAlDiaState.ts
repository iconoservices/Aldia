import { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useFinanzasState } from './state/useFinanzasState';
import { useMisionesState } from './state/useMisionesState';
import { useProyectosState } from './state/useProyectosState';
import { useCerebroState } from './state/useCerebroState';
import { useRitaState } from './state/useRitaState';
import { useNegocioState } from './state/useNegocioState';
import { useMetasState } from './state/useMetasState';

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
    items: { 
        id: number; 
        text: string; 
        completed: boolean; 
        time?: string; 
        linkedProjectId?: number; 
        linkedTaskId?: number;
        linkedObjectiveId?: number;
        linkedNodeId?: number;
        completedDate?: string;
    }[];
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
    dueDate?: string; // YYYY-MM-DD, opcional — usado por deudas/préstamos
    notes?: string; // Detalle libre, separado del concepto (text) y de quién (contact)
}

export interface Account {
    id: number;
    name: string;
    color: string;
    projectIds?: number[];
}

// Registro liviano de a quién le debo / quién me debe. Transaction.contact sigue
// guardando el nombre como string (no contactId) para no migrar datos viejos: este
// registro es solo el lugar donde vive el dato extra (teléfono, notas) de ese nombre.
export interface Contact {
    id: number;
    name: string;
    phone?: string;
    notes?: string;
}

export interface FixedExpense {
    id: number;
    text: string;
    amount: number;
    active: boolean;
    projectId?: number;
    accountId?: number; // Cuenta desde la que se paga habitualmente
    frequency?: 'monthly' | 'weekly'; // Ausente = 'monthly' (compatibilidad con datos antiguos)
    lastPaidMonth?: string; // Período ya cubierto: "YYYY-MM" si es mensual, "YYYY-Www" (ISO) si es semanal
    dueDay?: number; // 1-31 (Día de cobro en el mes), solo si frequency === 'monthly'
    dueWeekday?: number; // 0-6 (Dom-Sáb, como Date.getDay()), solo si frequency === 'weekly'
    partialPaid?: { month: string; amount: number }; // Abono parcial del período en curso, aún no cubre el total
    pendingPeriods?: { period: string; amountPaid: number }[]; // Períodos anteriores que quedaron sin saldar (arrastre), cada uno con lo ya abonado
    currentPeriodStart?: string; // Fecha (YYYY-MM-DD) usada como ancla para detectar cuándo arrancó un período nuevo
    contact?: string; // A quién se le debe (préstamo a plazos, pandero), si aplica
    totalAmount?: number; // Si existe, este gasto fijo es un préstamo a plazos: se paga en cuotas de `amount` hasta cubrir este tope
    paidToDate?: number; // Acumulado pagado hacia totalAmount (solo relevante si totalAmount está definido)
    nota?: string; // Comentario libre corto ("subió a S/500 desde marzo", "pagar antes del 5 o cobran mora"...)
}

// Avanza una fecha un período completo (mes o semana) según la frecuencia del gasto fijo.
export function addPeriod(dateStr: string, frequency: 'monthly' | 'weekly' | undefined): string {
    const d = new Date(dateStr + 'T00:00:00');
    if (frequency === 'weekly') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('en-CA');
}

// Clave de período para un gasto/ingreso fijo: "YYYY-MM" si es mensual (igual que antes),
// o semana ISO "YYYY-Www" si es semanal. Se usa tanto para marcar "ya pagado este período"
// como para saber a qué período pertenece una transacción ya generada (ver unmarkFixedExpensePaid).
export function getPeriodKey(frequency: 'monthly' | 'weekly' | undefined, dateStr: string): string {
    if (frequency !== 'weekly') return dateStr.substring(0, 7);
    const d = new Date(dateStr + 'T00:00:00');
    const dayNum = (d.getDay() + 6) % 7; // Lunes=0 ... Domingo=6
    d.setDate(d.getDate() - dayNum + 3); // Jueves de esa semana (ancla ISO)
    const firstThursday = new Date(d.getFullYear(), 0, 4);
    const firstDayNum = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstDayNum + 3);
    const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000));
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export type NotionEstado = 'Agendado' | 'Realizado' | 'En Edición' | 'Terminado' | 'Entregado';
export const NOTION_ESTADOS: NotionEstado[] = ['Agendado', 'Realizado', 'En Edición', 'Terminado', 'Entregado'];

export interface CalendarEvent {
    id: number;
    title: string;
    date: string;      // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
    description?: string;
    projectId?: number;
    notionId?: string; // ID de la pagina de Notion de origen, si vino importado
    // Campos extra de la base "Agenda" de Notion (solo presentes si notionId existe).
    notionProyecto?: string;         // Proyecto (select): "JuanMa Producer" | "Personal"
    notionEstado?: NotionEstado;     // Estado (status): flujo de 5 pasos
    notionPrecio?: number;
    notionCobrado?: number;
    notionSaldoPorCobrar?: number;
    notionEntregaFecha?: string;     // YYYY-MM-DD, fecha de entrega calculada en Notion
    notionDiasRestantes?: string;    // texto ya formateado por Notion, ej. "🟢 A tiempo: 18 días"
    notionCelular?: string;          // Celular (phone_number) del cliente, tal cual en Notion
}

export interface Habit {
    id: number;
    name: string;
    schedule: number[]; // Array de índices 0-6 (L-D) - Días que debe aparecer
    completedDates: string[]; // Array de fechas YYYY-MM-DD en que se completó
    linkedRoutineId?: number;     // Rutina de origen (si fue promovido desde rutina)
    linkedRoutineItemId?: number; // Ítem de rutina de origen
}

export interface TimeBlock {
    id: number;
    label: string;
    start: string; // HH:mm
    end: string;   // HH:mm
    color: string;
    projectId?: number;
}

export interface DailyBlock {
    id: number;
    label: string;
    completed: boolean;
    period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro';
    date: string; // YYYY-MM-DD
    projectId?: number;
    repeatDays?: number[];
}

export interface TrashItem {
    block: DailyBlock;
    deletedAt: number;
}

// Cosas por comprar: un gasto que todavía no ha ocurrido.
// Vive aparte de Transaction porque aún no es dinero movido, solo previsto;
// al marcarlo como comprado se convierte en una transacción real.
export interface ShoppingItem {
    id: number;
    text: string;
    estimatedAmount: number;
    priority: 'necesito' | 'quiero';
    createdAt: string;          // YYYY-MM-DD
    purchasedAt?: string;       // YYYY-MM-DD, presente solo si ya se compró
    projectId?: number;
    note?: string;
    category?: string;          // Tecnología, Hogar, Ropa... libre, sin catálogo fijo
    status?: 'planning' | 'saving' | 'ready'; // en qué etapa está el ahorro para comprarlo
    storeName?: string;         // ej. "Amazon"
    storeUrl?: string;
    nivel?: 1 | 2 | 3;           // Arquitectura de Abastecimiento: 1 OPEX, 2 CAPEX, 3 Cuarentena (deseo)
}

export interface Recipe {
    id: number;
    name: string;
    kcal: number;
    protein: number;    // gramos
    carbs: number;       // gramos
    prepMinutes?: number;
    ingredients?: string; // uno por línea, para generar la lista de compras
}

export type MealType = 'desayuno' | 'almuerzo' | 'cena' | 'snacks';

export interface MealPlanEntry {
    id: number;
    date: string;        // YYYY-MM-DD
    mealType: MealType;
    recipeId: number;
}

export interface NutritionGoals {
    calories: number;
    protein: number;
    carbs: number;
}

export const DEFAULT_NUTRITION_GOALS: NutritionGoals = { calories: 2200, protein: 150, carbs: 250 };

// Proyectos esporádicos: entregables puntuales con fecha de entrega (videos,
// encargos, trabajos por proyecto), a diferencia de Project que es un proyecto
// continuo/organizativo sin fecha límite. Cada log de trabajo es un registro
// de "empecé/terminé de editar", usado para la racha y para estimar el ritmo real.
export interface SporadicWorkLog {
    id: number;
    date: string;  // YYYY-MM-DD
    hours: number;
    stage?: string; // Estado de Notion (o status local) activo cuando arrancó esta sesión — para el desglose "cuánto tiempo se va en cada etapa"
}

// Duración de editar UNA foto puntual, aparte del cronómetro de sesión general:
// arranca al marcar "Iniciar foto" y cierra al marcar "Foto lista", para saber
// el ritmo real por foto (no solo cuánto duró la sesión completa).
export interface SporadicPhotoLog {
    id: number;
    date: string;  // YYYY-MM-DD
    seconds: number;
}

// Un paso de flujo de trabajo (ej. "Colorización", "Suavizado de ropa") dentro
// de una plantilla de fases reutilizable (ver FaseTemplate) o ya copiado a un
// proyecto puntual (ver ProjectFase, que además le suma estado + cronómetro).
export interface FaseStep {
    id: number;
    label: string;
}

// Plantilla reutilizable de fases (ej. "Fotografía": Selección -> Revelado ->
// Photoshop -> Revisión, con sus pasos). Vive aparte de los proyectos: se crea
// una vez y se aplica a cualquier cantidad de proyectos.
export interface FaseTemplate {
    id: number;
    name: string;
    steps: FaseStep[];
}

// Copia de un FaseStep dentro de un proyecto puntual — se desengancha de la
// plantilla al aplicarla (editar un proyecto no toca la plantilla original,
// y viceversa), y le suma su propio cronómetro (mismo patrón pausa/resume que
// photoActiveSince/photoPausedAccumSeconds, pero por fase en vez de por foto).
export interface ProjectFase {
    id: number;
    label: string;
    done: boolean;
    activeSince?: number;        // timestamp ms si el cronómetro de esta fase está corriendo ahora mismo
    pausedAccumSeconds?: number; // segundos ya acumulados de esta fase, de tramos previos a una pausa
    seconds?: number;            // segundos totales ya cerrados (una vez marcada "hecha")
}

export interface SporadicProject {
    id: number;
    title: string;
    startDate: string;       // YYYY-MM-DD, cuándo arranca el trabajo
    dueDate: string;         // YYYY-MM-DD, fecha de entrega
    complexityHours: number; // horas estimadas para completarlo
    status: 'pendiente' | 'en-progreso' | 'completado';
    workedHours: number;     // horas acumuladas (suma de logs)
    logs: SporadicWorkLog[];
    activeSince?: number;    // timestamp ms si el cronómetro está corriendo ahora mismo (undefined si está en pausa o parado)
    activeStage?: string;    // etapa (Estado de Notion) que estaba activa al darle Play
    pausedAccumHours?: number; // horas ya acumuladas de esta sesión abierta, de tramos previos a una pausa
    pinned?: boolean;        // se fija arriba de su columna aunque el cronómetro esté parado — "en lo que estoy metido ahora"
    color?: string;
    notionId?: string;       // vincula esta tarjeta a una página de la base "Agenda" de Notion
    photoActiveSince?: number;  // timestamp ms si hay una foto individual en edición ahora mismo
    photoPausedAccumSeconds?: number; // segundos ya acumulados de la foto actual, de tramos previos a una pausa (mismo patrón que pausedAccumHours pero en segundos)
    photoLogs?: SporadicPhotoLog[]; // duración de cada foto ya editada (proyectos viejos no traen este campo)
    sessionStartedAt?: number;  // timestamp ms de cuando se le dio Play por primera vez a la sesión abierta actual (sobrevive pausas, se limpia al Terminar) -- reloj de pared, a diferencia de las horas trabajadas reales que sí descuentan las pausas
    firstStartedAt?: number;    // timestamp ms de la PRIMERA vez que se le dio Play a este proyecto en su vida -- nunca se limpia con pausas ni al Terminar sesión, solo se resetea a mano; mide "cuánto llevo metido en esto sin entregarlo"
    faseTemplateId?: number;    // plantilla de la que se copiaron `fases` (solo referencia informativa, editar `fases` no la toca)
    fases?: ProjectFase[];      // checklist de fases de este proyecto, una vez aplicada una plantilla
    requiresPreview?: boolean;  // el cliente pidió un adelanto (unas fotos de muestra) antes de la entrega final
    previewSent?: boolean;      // ese adelanto ya se envió (solo tiene sentido si requiresPreview)
    previewDaysBefore?: number; // cuántos días antes de dueDate hay que mandar el adelanto (solo tiene sentido si requiresPreview)
    requiresUsb?: boolean;      // la entrega final incluye un USB físico con las fotos
    usbDelivered?: boolean;     // ese USB ya se entregó — independiente de "status: completado" (el proyecto
                                 // puede estar entregado digitalmente y el USB físico seguir pendiente)
    photoGoal?: number;         // cantidad total de fotos a editar en esta entrega (meta, se elige a mano)
    photoManualExtra?: number;  // ajuste a mano (+1/-1 o escrito directo) sobre el conteo del cronómetro
                                 // (photoLogs.length) para el progreso contra photoGoal -- puede ser negativo
                                 // (restar sin borrar el historial del cronómetro). El total mostrado es
                                 // siempre photoLogs.length + photoManualExtra
    note?: string;               // nota corta libre ("falta que confirme la fecha", "no sé si aprobó el edit"...)
                                 // para no depender de una app aparte (Keep) para lo que no encaja en ningún campo fijo
    myDueDateOverride?: string;  // fecha "mía" puesta ENCIMA de dueDate, sin tocarlo -- dueDate sigue siendo
                                 // la fecha real (la de Notion si está vinculado, o la de creación si no) y
                                 // sigue marcando el atraso normal como siempre; esto es solo la fecha a la
                                 // que el usuario se comprometió a sí mismo después de reagendar, para saber
                                 // cuánto le falta para ESA sin tocar Notion ni el atraso real
    rescheduleCount?: number;    // cuántas veces se puso/cambió myDueDateOverride (cada reagendo suma 1, nunca baja)
}

export interface UserPreferences {
    isBudgetFixed: boolean;
    fixedIncomes: string; // JSON: { id: number, name: string, amount: number, active: boolean }[]
    // JSON: { ingreso: Record<categoria, accountId[]>, gasto: Record<categoria, accountId[]> }.
    // Una categoria sin entrada (o con array vacio) aplica a todas las cuentas.
    categoryAccountScope: string;
    // JSON: { ingreso: Record<categoria, grupo>, gasto: Record<categoria, grupo> }.
    // Una categoria sin entrada no pertenece a ningun grupo ("Sin grupo").
    categoryGroups: string;
    // JSON: { ingreso: Record<grupo, accountId[]>, gasto: Record<grupo, accountId[]> }.
    // Mismo mecanismo que categoryAccountScope pero a nivel de grupo: vincula TODAS
    // las categorias de ese grupo a esas cuentas de una sola vez, en vez de repetir
    // "Cuentas..." categoria por categoria.
    groupAccountScope: string;
    notionSyncEnabled: boolean; // Si esta en false, el script de sync con Notion no escribe nada
    blockOrder: string; // JSON: Record<period, string[]> -- orden manual (drag) de las tarjetas de Bloques por franja
    metaSesionesMes?: number; // Meta de cuantas sesiones agendar en el mes (opcional, no todos los meses tienen una)
    // JSON: { fixedExpenses, fixedIncomes, movs } -- el "Plan del mes" (pestaña Proyección).
    // Se siembra una vez desde los gastos/ingresos fijos reales y de ahí en más el usuario
    // lo edita libremente; "Reiniciar" vuelve a sembrar desde los datos reales.
    planDelMes?: string;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
    isBudgetFixed: false,
    fixedIncomes: "[]",
    categoryAccountScope: '{"ingreso":{},"gasto":{}}',
    categoryGroups: '{"ingreso":{},"gasto":{}}',
    groupAccountScope: '{"ingreso":{},"gasto":{}}',
    blockOrder: '{}',
    notionSyncEnabled: true
};

export type CategoryAccountScope = { ingreso: Record<string, number[]>; gasto: Record<string, number[]> };
export type CategoryGroupMap = { ingreso: Record<string, string>; gasto: Record<string, string> };

export interface ProjectNode {
    id: number;
    type: 'task' | 'note' | 'checklist';
    title: string;
    completed?: boolean;
    content?: string;
    subItems?: { id: number; text: string; completed: boolean }[];
    dueDate?: string; // YYYY-MM-DD
    color?: string; // Color específico para esta meta/entrega
    linkedRoutineId?: number;
    linkedRoutineItemId?: number;
}

export interface ProjectObjective {
    id: number;
    title: string;
    completed: boolean;
    nodes: ProjectNode[];
    dueDate?: string; // YYYY-MM-DD
    color?: string; // Color para el objetivo/entrega mayor
    group?: string; // Grupo/Categoría (ej: "Entregas", "Ventas")
    linkedRoutineId?: number;
    linkedRoutineItemId?: number;
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

// Primera plantilla de fases, la del flujo de edición fotográfica.
// IDs fijos y bajos a propósito: nextBlockId() siempre entrega timestamps
// (número gigante), así que nunca va a chocar con estos.
export const DEFAULT_PHASE_TEMPLATES: FaseTemplate[] = [
    {
        id: 1,
        name: 'Fotografía',
        steps: [
            { id: 1, label: 'Selección' },
            { id: 2, label: 'Colorización / revelado' },
            { id: 3, label: 'Retoque de ojos (Claridad y Textura en Lightroom)' },
            { id: 4, label: 'Quitar ruido' },
            { id: 5, label: 'Suavizado de ropa (Photoshop)' },
            { id: 6, label: 'Estilización de vestido (Photoshop, si aplica)' },
            { id: 7, label: 'Revisión final' },
        ],
    },
];

// Metas: planificador de objetivos a mediano (semanas/meses) y largo plazo (años),
// separado de Project (que organiza el trabajo del día a día) y de RitaMilestone
// (que es la hoja de ruta específica del negocio). Una meta puede vivir sola o
// enlazarse a un proyecto ya existente vía projectId.
export interface GoalMilestone {
    id: number;
    text: string;
    completed: boolean;
}

export type GoalHorizon = 'mediano' | 'largo';
export type GoalStatus = 'pendiente' | 'en-progreso' | 'completado';

export interface Goal {
    id: number;
    title: string;
    description?: string;
    horizon: GoalHorizon; // 'mediano' = próximos meses, 'largo' = 1+ años
    area: string;         // categoría de vida libre: Negocio, Salud, Finanzas, Personal...
    icon: string;
    color: string;
    status: GoalStatus;
    targetDate?: string;  // YYYY-MM-DD, para cuándo se quiere lograr
    milestones: GoalMilestone[];
    projectId?: number;   // vínculo opcional a un proyecto existente
    order: number;
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

// Generador de IDs para bloques diarios.
// Date.now() a secas colisionaba: al crear varios bloques en un mismo bucle
// todos caían en el mismo milisegundo y compartían id, de modo que marcar uno
// marcaba todos los que tuviesen ese id.
let lastIssuedBlockId = 0;
const nextBlockId = () => {
    const now = Date.now();
    lastIssuedBlockId = now > lastIssuedBlockId ? now : lastIssuedBlockId + 1;
    return lastIssuedBlockId;
};

export const useAlDiaState = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // 1. Estados Modularizados
    const {
        transactions, setTransactions, balance,
        monthlyBudget, setMonthlyBudget, fixedExpenses, setFixedExpenses,
        addTransaction, addFixedExpense, removeFixedExpense, toggleFixedExpense,
        updateFixedExpense, markFixedExpensePaid, payFixedExpensePartial, unmarkFixedExpensePaid,
        rolloverFixedExpenses, payPendingPeriod, unmarkPendingPeriod, repayDebt: repayDebtBase,
        todayIncome, todayExpense, todayNet, todayIncomeReal, todayExpenseReal,
        totalIncomeReal, totalExpenseReal, totalNetReal, debtsOwe, debtsOwed,
        removeTransaction, updateTransaction, updateTransactionGroup
    } = useFinanzasState();

    const {
        missions: misionesState, setMissions: setMisionesDirect,
        habits, setHabits, agenda, setAgenda,
        toggleMission, updateMission, removeMission, addMission,
        toggleHabit, addHabit, removeHabit, addCalendarEvent, removeCalendarEvent, updateCalendarEvent,
        reorderMissions,
        performanceScore, missionFocusScore, completedMissionsCount
    } = useMisionesState();

    const {
        projects, setProjects, timeBlocks, setTimeBlocks, rutinas, setRutinas,
        addProject, addProjectTask, toggleProjectTask, removeProjectTask,
        promoteTaskToRoutine, updateProject, deleteProject, reorderProjectTasks, reorderProjects,
        addTimeBlock, removeTimeBlock, updateTimeBlock,
        addInventoryItem, updateInventoryItemQuantity, removeInventoryItem,
        addRoutineItem, updateRoutineItem, toggleRoutineItem, removeRoutineItem,
        updateRoutine, addRoutine, removeRoutine, updateProjectTask,
        addProjectCategory, removeProjectCategory, reorderRoutineItems,
        addProjectObjective, updateProjectObjective, removeProjectObjective,
        addProjectNode, updateProjectNode, removeProjectNode, promoteNodeToRoutine,
        promoteRoutineItemToProject
    } = useProyectosState();

    const {
        notes, setNotes, addNote, removeNote, toggleNoteItem, updateNote
    } = useCerebroState();

    const {
        ritaEntries, setRitaEntries,
        addEntry: addRitaEntry, removeEntry: removeRitaEntry, updateEntry: updateRitaEntry,
        addSubitem: addRitaSubitem, toggleSubitem: toggleRitaSubitem, removeSubitem: removeRitaSubitem
    } = useRitaState();

    const {
        negocioProjects, setNegocioProjects,
        addNegocioProject, removeNegocioProject, updateNegocioProject,
        addClient, updateClient, removeClient,
        addWorker, updateWorker, removeWorker,
        addExpense, updateExpense, removeExpense
    } = useNegocioState();

    const {
        goals, setGoals,
        addGoal, updateGoal, removeGoal, reorderGoals,
        addGoalMilestone, toggleGoalMilestone, removeGoalMilestone
    } = useMetasState();

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
    const [incomeCategories, setIncomeCategories] = useState<string[]>(DEFAULT_INCOME_CATEGORIES);
    const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
    const [dailyBlocks, setDailyBlocks] = useState<DailyBlock[]>([]);
    const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
    const [sporadicProjects, setSporadicProjects] = useState<SporadicProject[]>([]);
    const [phaseTemplates, setPhaseTemplates] = useState<FaseTemplate[]>(DEFAULT_PHASE_TEMPLATES);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [mealPlanEntries, setMealPlanEntries] = useState<MealPlanEntry[]>([]);
    const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals>(DEFAULT_NUTRITION_GOALS);
    const [trash, setTrash] = useState<TrashItem[]>([]);
    const [hasLoadedFromCloud, setHasLoadedFromCloud] = useState(false);
    // Timestamp del último cambio local del usuario. Los snapshots de Firestore con lastSync
    // anterior a este valor serán ignorados para evitar sobreescribir cambios pendientes.
    const localWriteTimestampRef = useRef<number>(0);
    // Timestamp del último snapshot recibido de Firestore.
    // Si no hubo escritura local después de este punto, no re-guardamos (evita el echo-save
    // que sobreescribía cambios del otro dispositivo).
    const lastSnapshotTimestampRef = useRef<number>(0);


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
                contacts: JSON.parse(localStorage.getItem('aldia_contacts') || '[]'),
                preferences: JSON.parse(localStorage.getItem('aldia_preferences') || JSON.stringify(DEFAULT_PREFERENCES)),
                incomeCategories: JSON.parse(localStorage.getItem('aldia_income_categories') || JSON.stringify(DEFAULT_INCOME_CATEGORIES)),
                expenseCategories: JSON.parse(localStorage.getItem('aldia_expense_categories') || JSON.stringify(DEFAULT_EXPENSE_CATEGORIES)),
                dailyblocks: JSON.parse(localStorage.getItem('aldia_dailyblocks') || '[]'),
                shoppingList: JSON.parse(localStorage.getItem('aldia_shopping_list') || '[]'),
                sporadicProjects: JSON.parse(localStorage.getItem('aldia_sporadic_projects') || '[]'),
                phaseTemplates: JSON.parse(localStorage.getItem('aldia_phase_templates') || JSON.stringify(DEFAULT_PHASE_TEMPLATES)),
                recipes: JSON.parse(localStorage.getItem('aldia_recipes') || '[]'),
                mealPlanEntries: JSON.parse(localStorage.getItem('aldia_meal_plan_entries') || '[]'),
                nutritionGoals: JSON.parse(localStorage.getItem('aldia_nutrition_goals') || JSON.stringify(DEFAULT_NUTRITION_GOALS)),
                ritaEntries: JSON.parse(localStorage.getItem('aldia_rita_entries') || '[]'),
                trash: JSON.parse(localStorage.getItem('aldia_trash') || '[]'),
                negocioProjects: JSON.parse(localStorage.getItem('aldia_negocio_projects') || '[]'),
                goals: JSON.parse(localStorage.getItem('aldia_goals') || '[]')
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
            setContacts(data.contacts);
            setPreferences(data.preferences);
            setIncomeCategories(data.incomeCategories);
            setExpenseCategories(data.expenseCategories);
            setDailyBlocks(data.dailyblocks);
            setShoppingList(data.shoppingList);
            setSporadicProjects(data.sporadicProjects);
            setPhaseTemplates(data.phaseTemplates);
            setRecipes(data.recipes);
            setMealPlanEntries(data.mealPlanEntries);
            setNutritionGoals(data.nutritionGoals);
            setRitaEntries(data.ritaEntries);
            setNegocioProjects(data.negocioProjects);
            setGoals(data.goals);
            setTrash(data.trash.filter((t: TrashItem) => Date.now() - t.deletedAt < 60 * 24 * 60 * 60 * 1000));
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
            // Sin sesión trabajamos en modo local: no hay nube que esperar, así que
            // habilitamos el guardado igualmente. Antes esto quedaba en false y el
            // efecto de persistencia salía por el return, de modo que sin login NADA
            // se escribía en localStorage y el trabajo se perdía al recargar.
            // El guardado a Firestore sigue protegido por su propio `if (user)`.
            setHasLoadedFromCloud(true);
            return;
        }

        const userId = user.uid;
        const docRef = doc(db, 'users', userId);

        const unsubSnap = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const cloud = docSnap.data();

                // NOTA: antes había un chequeo aca que comparaba cloud.lastSync contra
                // localWriteTimestampRef y, si la nube "parecia" mas vieja, se saltaba
                // aplicar sync() PERO igual marcaba hasLoadedFromCloud/isInitialLoad como
                // listos. Eso es lo que causo que se vaciara la cuenta entera una vez:
                // el estado local se quedaba en sus valores iniciales (vacios o con
                // datos sembrados por defecto), el guard de guardado se destrababa
                // igual, y 2s despues ese estado vacio se escribia encima de Firestore,
                // borrando datos reales. La comparacion de timestamps ademas es fragil
                // por naturaleza: cloud.lastSync lo escribe quien sea que haya tocado el
                // documento (este dispositivo, otro, o un script/webhook externo como el
                // de sync de Notion), mientras que localWriteTimestampRef es un reloj de
                // pared local -- no hay garantia de que esten sincronizados, y Firestore
                // ya entrega los snapshots de un mismo listener en orden. Por eso ahora
                // simplemente se aplica siempre lo que llega; el guard anti-echo del
                // guardado (mas abajo, comparando localWriteTimestampRef contra
                // lastSnapshotTimestampRef) sigue evitando reenvios innecesarios.

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
                sync(cloud.contacts, setContacts);
                sync(cloud.preferences, setPreferences);
                sync(cloud.incomeCategories, setIncomeCategories);
                sync(cloud.expenseCategories, setExpenseCategories);
                sync(cloud.dailyBlocks, setDailyBlocks);
                sync(cloud.shoppingList, setShoppingList);
                sync(cloud.sporadicProjects, setSporadicProjects);
                sync(cloud.phaseTemplates, setPhaseTemplates);
                sync(cloud.recipes, setRecipes);
                sync(cloud.mealPlanEntries, setMealPlanEntries);
                sync(cloud.nutritionGoals, setNutritionGoals);
                sync(cloud.ritaEntries, setRitaEntries);
                sync(cloud.negocioProjects, setNegocioProjects);
                sync(cloud.goals, setGoals);
                sync(cloud.trash, setTrash);
                if (cloud.monthlyBudget !== undefined) {
                    setMonthlyBudget(prev => Math.abs(cloud.monthlyBudget - prev) > 0.01 ? Number(cloud.monthlyBudget) : prev);
                }

                lastSnapshotTimestampRef.current = Date.now();
                setHasLoadedFromCloud(true);
                setIsInitialLoad(false);
            } else {
                lastSnapshotTimestampRef.current = Date.now();
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
        missions: misionesState, transactions, habits, agenda, timeBlocks, notes, projects, rutinas, monthlyBudget, fixedExpenses, accounts, contacts, preferences, incomeCategories, expenseCategories, dailyBlocks, shoppingList, sporadicProjects, phaseTemplates, recipes, mealPlanEntries, nutritionGoals, ritaEntries, negocioProjects, goals, trash
    });
    latestStateRef.current = {
        missions: misionesState, transactions, habits, agenda, timeBlocks, notes, projects, rutinas, monthlyBudget, fixedExpenses, accounts, contacts, preferences, incomeCategories, expenseCategories, dailyBlocks, shoppingList, sporadicProjects, phaseTemplates, recipes, mealPlanEntries, nutritionGoals, ritaEntries, negocioProjects, goals, trash
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
        localStorage.setItem('aldia_contacts', JSON.stringify(contacts));
        localStorage.setItem('aldia_preferences', JSON.stringify(preferences));
        localStorage.setItem('aldia_income_categories', JSON.stringify(incomeCategories));
        localStorage.setItem('aldia_expense_categories', JSON.stringify(expenseCategories));
        localStorage.setItem('aldia_dailyblocks', JSON.stringify(dailyBlocks));
        localStorage.setItem('aldia_shopping_list', JSON.stringify(shoppingList));
        localStorage.setItem('aldia_sporadic_projects', JSON.stringify(sporadicProjects));
        localStorage.setItem('aldia_phase_templates', JSON.stringify(phaseTemplates));
        localStorage.setItem('aldia_recipes', JSON.stringify(recipes));
        localStorage.setItem('aldia_meal_plan_entries', JSON.stringify(mealPlanEntries));
        localStorage.setItem('aldia_nutrition_goals', JSON.stringify(nutritionGoals));
        localStorage.setItem('aldia_rita_entries', JSON.stringify(ritaEntries));
        localStorage.setItem('aldia_negocio_projects', JSON.stringify(negocioProjects));
        localStorage.setItem('aldia_goals', JSON.stringify(goals));
        localStorage.setItem('aldia_trash', JSON.stringify(trash));

        // Guardado Cloud debounced
        if (user) {
            const timer = setTimeout(() => {
                // GUARD ANTI-ECHO: Solo guardar si hubo una escritura LOCAL
                // después del último snapshot recibido. Esto evita que el
                // dispositivo A re-envíe a Firestore datos que solo cambiaron
                // porque recibió un snapshot del dispositivo B.
                if (localWriteTimestampRef.current <= lastSnapshotTimestampRef.current) return;

                const docRef = doc(db, 'users', user.uid);
                const syncTimestamp = new Date().toISOString();
                const payload = JSON.parse(JSON.stringify({
                    ...latestStateRef.current,
                    lastSync: syncTimestamp
                }));
                setDoc(docRef, payload, { merge: true })
                    .catch(error => {
                        console.error("🔥 Error crítico guardando en Firestore:", error);
                        alert("ERROR DE SINCRONIZACIÓN: No se pudo guardar en la nube. " + error.message);
                    });
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [user, isInitialLoad, hasLoadedFromCloud, misionesState, transactions, habits, agenda, notes, projects, rutinas, fixedExpenses, timeBlocks, monthlyBudget, accounts, contacts, preferences, incomeCategories, expenseCategories, dailyBlocks, shoppingList, sporadicProjects, phaseTemplates, recipes, mealPlanEntries, nutritionGoals, ritaEntries, negocioProjects, goals, trash]);

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

        // Sembrado automático de proyectos y tareas diarias por defecto del ecosistema
        if (hasLoadedFromCloud) {
            const requiredProjects = [
                { id: 1, name: '☕ Personal', color: '#8A9A9D' },
                { id: 2, name: '🌴 Yo soy de la Selva', color: '#06D6A0' },
                { id: 3, name: '🎬 RCC', color: '#F72585' },
                { id: 4, name: '🛒 Boga Marketplace', color: '#6BCB77' },
                { id: 5, name: '📸 ICONO Agency', color: '#4D96FF' },
                { id: 6, name: '🎞️ Geekoedia', color: '#CBD5E1' },
                { id: 7, name: '👤 Juanma', color: '#FF8E53' }
            ];

            // El sembrado es de una sola vez. Antes se ejecutaba en cada render y
            // recreaba por nombre cualquier proyecto borrado: era imposible eliminar
            // ninguno de los 7 por defecto, resucitaban solos.
            if (!localStorage.getItem('has_seeded_projects')) {
                const updatedProjects = [...projects];
                let projectsChanged = false;

                requiredProjects.forEach(rp => {
                    const searchName = rp.name.split(' ').slice(1).join(' ').toLowerCase();
                    const exists = projects.some(p => p.name.toLowerCase().includes(searchName));
                    if (!exists) {
                        updatedProjects.push({
                            id: rp.id,
                            name: rp.name,
                            color: rp.color,
                            status: 'activo',
                            checklist: [],
                            inventoryItems: []
                        } as any);
                        projectsChanged = true;
                    }
                });

                if (projectsChanged) {
                    setProjects(updatedProjects);
                }
                localStorage.setItem('has_seeded_projects', 'true');
            }

            // Sembrar bloques si dailyBlocks está vacío
            if (dailyBlocks.length === 0 && !localStorage.getItem('has_seeded_daily_blocks')) {
                const current = new Date();
                const day = current.getDay();
                const diff = current.getDate() - day + (day === 0 ? -6 : 1);
                const startOfWeek = new Date(current.setDate(diff));

                const seededBlocks: DailyBlock[] = [];
                const taskTemplates = [
                    { label: 'Bañarme', period: 'Mañana' as const, projectId: 1, repeatDays: [0, 1, 2, 3, 4, 5, 6] },
                    { label: 'Comer', period: 'Mañana' as const, projectId: 1, repeatDays: [0, 1, 2, 3, 4, 5, 6] },
                    { label: 'Leer', period: 'Tarde' as const, projectId: 1, repeatDays: [0, 1, 2, 3, 4, 5, 6] },
                    { label: 'Subir noticia 1', period: 'Mañana' as const, projectId: 2, repeatDays: [0, 1, 2, 3, 4, 5, 6] },
                    { label: 'Subir noticia 2', period: 'Tarde' as const, projectId: 2, repeatDays: [0, 1, 2, 3, 4, 5, 6] },
                    { label: 'Subir noticia 3', period: 'Tarde' as const, projectId: 2, repeatDays: [0, 1, 2, 3, 4, 5, 6] },
                    { label: 'Subir noticia 4', period: 'Noche' as const, projectId: 2, repeatDays: [0, 1, 2, 3, 4, 5, 6] },
                    { label: 'Subir video Geekpedia', period: 'Tarde' as const, projectId: 6, repeatDays: [2, 5] },
                    { label: 'Sesiones de fotos / Grabación', period: 'Tarde' as const, projectId: 5, repeatDays: [0, 1, 2, 3, 4] }
                ];

                for (let i = 0; i < 7; i++) {
                    const tempDate = new Date(startOfWeek);
                    tempDate.setDate(startOfWeek.getDate() + i);
                    const dateStr = tempDate.toLocaleDateString('en-CA');
                    const dayOfWeek = i;

                    taskTemplates.forEach(t => {
                        if (t.repeatDays.includes(dayOfWeek)) {
                            seededBlocks.push({
                                id: nextBlockId(),
                                label: t.label,
                                completed: false,
                                period: t.period,
                                date: dateStr,
                                projectId: t.projectId,
                                repeatDays: t.repeatDays
                            });
                        }
                    });
                }

                if (seededBlocks.length > 0) {
                    setDailyBlocks(seededBlocks);
                    localStorage.setItem('has_seeded_daily_blocks', 'true');
                }
            }
        }
    }, [isInitialLoad, transactions.length, misionesState.length, accounts.length, projects.length, hasLoadedFromCloud, dailyBlocks.length]);

    // Migración de una sola vez: IDs duplicados en dailyBlocks.
    // addDailyBlock usaba Date.now() a secas, así que los bloques creados dentro de
    // un mismo bucle (una semana entera, p.ej.) compartían id. Como toggleDailyBlock
    // busca por id, marcar una tarea marcaba a todos sus gemelos, incluso de otros
    // días y de otras tareas. Reasignamos ids únicos conservando todo lo demás.
    useEffect(() => {
        if (isInitialLoad || !hasLoadedFromCloud || dailyBlocks.length === 0) return;

        const vistos = new Set<number>();
        const hayDuplicados = dailyBlocks.some(b => {
            if (vistos.has(b.id)) return true;
            vistos.add(b.id);
            return false;
        });
        if (!hayDuplicados) return;

        // El contador arranca por encima de cualquier id existente para no chocar
        // con los que se conservan.
        let siguienteId = Math.max(Date.now(), ...dailyBlocks.map(b => Number(b.id) || 0));
        const usados = new Set<number>();
        let reasignados = 0;

        const reparados = dailyBlocks.map(b => {
            if (!usados.has(b.id)) {
                usados.add(b.id);
                return b;
            }
            siguienteId += 1;
            usados.add(siguienteId);
            reasignados += 1;
            return { ...b, id: siguienteId };
        });

        localWriteTimestampRef.current = Date.now();
        setDailyBlocks(reparados);
        console.info(`[AlDía] Migración de IDs: ${reasignados} de ${dailyBlocks.length} bloques reasignados.`);
    }, [isInitialLoad, hasLoadedFromCloud, dailyBlocks]);

    // Limpieza de una sola vez: proyectos sembrados por defecto que nunca se usaron.
    // El sembrado antiguo los recreaba en cada render, así que se acumularon duplicados
    // (p. ej. "📸 ICONO Agency" junto al "Icono Growth" real del usuario).
    // Triple condición para no borrar nada de valor: tiene que ser un id del sembrado,
    // estar vacío, y no estar referenciado por ningún otro dato.
    useEffect(() => {
        if (isInitialLoad || !hasLoadedFromCloud || projects.length === 0) return;
        if (localStorage.getItem('has_cleaned_seeded_projects')) return;

        const IDS_SEMBRADOS = [1, 2, 3, 4, 5, 6, 7];

        const estaEnUso = (id: number) =>
            transactions.some(t => t.projectId === id) ||
            dailyBlocks.some(b => b.projectId === id) ||
            fixedExpenses.some(f => f.projectId === id) ||
            misionesState.some(m => m.projectId === id) ||
            accounts.some(a => (a.projectIds || []).includes(id)) ||
            timeBlocks.some(t => t.projectId === id);

        const estaVacio = (p: Project) =>
            !p.checklist?.length && !p.objectives?.length && !p.inventoryItems?.length;

        const aBorrar = projects.filter(p =>
            IDS_SEMBRADOS.includes(p.id) && estaVacio(p) && !estaEnUso(p.id)
        );

        if (aBorrar.length) {
            localWriteTimestampRef.current = Date.now();
            setProjects(prev => prev.filter(p => !aBorrar.some(b => b.id === p.id)));
            console.info(`[AlDía] Limpieza: ${aBorrar.length} proyectos sembrados sin usar eliminados (${aBorrar.map(p => p.name).join(', ')}).`);
        }
        localStorage.setItem('has_cleaned_seeded_projects', 'true');
    }, [isInitialLoad, hasLoadedFromCloud, projects, transactions, dailyBlocks, fixedExpenses, misionesState, accounts, timeBlocks]);

    // Migración de una sola vez: lo normal es entregar USB junto con la entrega,
    // así que los proyectos esporádicos ya existentes (creados antes de que
    // requiresUsb quedara activado por defecto) se activan también. Solo toca
    // los que nunca se tocaron (undefined) -- si alguien ya lo desmarcó a mano
    // queda en `false` explícito, y eso no se pisa. Los ya completados quedan
    // afuera: son entregas viejas y cerradas, activarles el USB ahora no suma
    // nada, solo infla "USB por entregar" con historial que ya no importa.
    useEffect(() => {
        if (isInitialLoad || !hasLoadedFromCloud || sporadicProjects.length === 0) return;
        if (localStorage.getItem('has_migrated_usb_default')) return;

        const sinTocar = sporadicProjects.filter(p => p.requiresUsb === undefined && p.status !== 'completado');
        if (sinTocar.length) {
            localWriteTimestampRef.current = Date.now();
            setSporadicProjects(prev => prev.map(p => p.requiresUsb === undefined && p.status !== 'completado' ? { ...p, requiresUsb: true } : p));
            console.info(`[AlDía] Migración: USB activado por defecto en ${sinTocar.length} proyecto(s) existente(s) sin completar.`);
        }
        localStorage.setItem('has_migrated_usb_default', 'true');
    }, [isInitialLoad, hasLoadedFromCloud, sporadicProjects]);

    const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
    const todayIndex = useMemo(() => (new Date().getDay() + 6) % 7, []); // 0=Mon

    const habitMissions = useMemo(() => habits
        .filter(h => h.schedule?.includes(todayIndex))
        .map(h => ({
            id: h.id,
            uid: `habit-${h.id}`,
            text: h.name,
            completed: h.completedDates?.includes(todayStr),
            q: 'Q2' as const, repeat: 'none' as const, critical: false, isHabit: true,
            habitCount: h.completedDates?.length || 0
        })), [habits, todayIndex, todayStr]);

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

    // Categorías globales de Ingreso/Gasto (usadas en RegistroMovimiento, el modal
    // compartido entre Checklist y Finanzas). Empiezan en los defaults pero el
    // usuario puede agregar o quitar las que quiera desde Finanzas.
    const addCategory = (type: 'ingreso' | 'gasto', name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const setter = type === 'ingreso' ? setIncomeCategories : setExpenseCategories;
        setter(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    };

    const removeCategory = (type: 'ingreso' | 'gasto', name: string) => {
        const setter = type === 'ingreso' ? setIncomeCategories : setExpenseCategories;
        setter(prev => prev.filter(c => c !== name));
        setCategoryAccounts(type, name, []);
        setCategoryGroup(type, name, null);
    };

    // Renombrar reasigna también los movimientos ya existentes con esa categoría,
    // para que el historial no quede huérfano con un nombre que ya no existe.
    // Si el nuevo nombre coincide con una categoría existente, el efecto es fusionar.
    const renameCategory = (type: 'ingreso' | 'gasto', oldName: string, newName: string) => {
        const trimmed = newName.trim();
        if (!trimmed || trimmed === oldName) return;
        const setter = type === 'ingreso' ? setIncomeCategories : setExpenseCategories;
        setter(prev => prev.includes(trimmed) ? prev.filter(c => c !== oldName) : prev.map(c => c === oldName ? trimmed : c));
        setTransactions(prev => prev.map(t => t.type === type && t.category === oldName ? { ...t, category: trimmed } : t));
        const carriedScope = categoryAccountScope[type][oldName];
        if (carriedScope) {
            setCategoryAccounts(type, oldName, []);
            setCategoryAccounts(type, trimmed, carriedScope);
        }
        const carriedGroup = categoryGroups[type][oldName];
        if (carriedGroup) {
            setCategoryGroup(type, oldName, null);
            setCategoryGroup(type, trimmed, carriedGroup);
        }
    };

    const mergeCategory = (type: 'ingreso' | 'gasto', sourceName: string, targetName: string) => {
        if (sourceName === targetName) return;
        const setter = type === 'ingreso' ? setIncomeCategories : setExpenseCategories;
        setter(prev => prev.filter(c => c !== sourceName));
        setTransactions(prev => prev.map(t => t.type === type && t.category === sourceName ? { ...t, category: targetName } : t));
        setCategoryAccounts(type, sourceName, []);
        setCategoryGroup(type, sourceName, null);
    };

    // Categorías con alcance por cuenta: sin entrada (o array vacío) = aplica en
    // todas las cuentas. Guardado dentro de preferences (mismo mecanismo que
    // fixedIncomes) para no tocar el resto del pipeline de sync con Firestore.
    const categoryAccountScope: CategoryAccountScope = useMemo(() => {
        try {
            const parsed = JSON.parse(preferences.categoryAccountScope || '{"ingreso":{},"gasto":{}}');
            return { ingreso: parsed.ingreso || {}, gasto: parsed.gasto || {} };
        } catch { return { ingreso: {}, gasto: {} }; }
    }, [preferences.categoryAccountScope]);

    const setCategoryAccounts = (type: 'ingreso' | 'gasto', name: string, accountIds: number[]) => {
        setPreferences(prev => {
            let current: CategoryAccountScope;
            try {
                const parsed = JSON.parse(prev.categoryAccountScope || '{"ingreso":{},"gasto":{}}');
                current = { ingreso: parsed.ingreso || {}, gasto: parsed.gasto || {} };
            } catch { current = { ingreso: {}, gasto: {} }; }
            const next = { ...current, [type]: { ...current[type] } };
            if (accountIds.length === 0) delete next[type][name];
            else next[type][name] = accountIds;
            return { ...prev, categoryAccountScope: JSON.stringify(next) };
        });
    };

    // Grupos de categorías (ej: "Golosinas" y "Compras" dentro del grupo "Bodega").
    // Cada categoría pertenece a lo sumo a un grupo; no hay una lista separada de
    // grupos, existen implícitamente mientras alguna categoría los referencie.
    // Guardado dentro de preferences, mismo mecanismo que categoryAccountScope.
    const categoryGroups: CategoryGroupMap = useMemo(() => {
        try {
            const parsed = JSON.parse(preferences.categoryGroups || '{"ingreso":{},"gasto":{}}');
            return { ingreso: parsed.ingreso || {}, gasto: parsed.gasto || {} };
        } catch { return { ingreso: {}, gasto: {} }; }
    }, [preferences.categoryGroups]);

    const setCategoryGroup = (type: 'ingreso' | 'gasto', name: string, groupName: string | null) => {
        setPreferences(prev => {
            let current: CategoryGroupMap;
            try {
                const parsed = JSON.parse(prev.categoryGroups || '{"ingreso":{},"gasto":{}}');
                current = { ingreso: parsed.ingreso || {}, gasto: parsed.gasto || {} };
            } catch { current = { ingreso: {}, gasto: {} }; }
            const next = { ...current, [type]: { ...current[type] } };
            const trimmed = groupName?.trim();
            if (!trimmed) delete next[type][name];
            else next[type][name] = trimmed;
            return { ...prev, categoryGroups: JSON.stringify(next) };
        });
    };

    const renameCategoryGroup = (type: 'ingreso' | 'gasto', oldGroupName: string, newGroupName: string) => {
        const trimmed = newGroupName.trim();
        if (!trimmed || trimmed === oldGroupName) return;
        setPreferences(prev => {
            let current: CategoryGroupMap;
            try {
                const parsed = JSON.parse(prev.categoryGroups || '{"ingreso":{},"gasto":{}}');
                current = { ingreso: parsed.ingreso || {}, gasto: parsed.gasto || {} };
            } catch { current = { ingreso: {}, gasto: {} }; }
            const next = { ...current, [type]: { ...current[type] } };
            Object.keys(next[type]).forEach(cat => { if (next[type][cat] === oldGroupName) next[type][cat] = trimmed; });
            return { ...prev, categoryGroups: JSON.stringify(next) };
        });
        const carriedAccounts = groupAccountScope[type][oldGroupName];
        if (carriedAccounts) {
            setGroupAccounts(type, oldGroupName, []);
            setGroupAccounts(type, trimmed, carriedAccounts);
        }
    };

    const deleteCategoryGroup = (type: 'ingreso' | 'gasto', groupName: string) => {
        setPreferences(prev => {
            let current: CategoryGroupMap;
            try {
                const parsed = JSON.parse(prev.categoryGroups || '{"ingreso":{},"gasto":{}}');
                current = { ingreso: parsed.ingreso || {}, gasto: parsed.gasto || {} };
            } catch { current = { ingreso: {}, gasto: {} }; }
            const next = { ...current, [type]: { ...current[type] } };
            Object.keys(next[type]).forEach(cat => { if (next[type][cat] === groupName) delete next[type][cat]; });
            return { ...prev, categoryGroups: JSON.stringify(next) };
        });
        setGroupAccounts(type, groupName, []);
    };

    // Cuentas a las que un GRUPO entero está vinculado (a diferencia de
    // categoryAccountScope, que es por categoría suelta). Mismo mecanismo,
    // guardado aparte en preferences para no pisar categoryAccountScope.
    const groupAccountScope: CategoryAccountScope = useMemo(() => {
        try {
            const parsed = JSON.parse(preferences.groupAccountScope || '{"ingreso":{},"gasto":{}}');
            return { ingreso: parsed.ingreso || {}, gasto: parsed.gasto || {} };
        } catch { return { ingreso: {}, gasto: {} }; }
    }, [preferences.groupAccountScope]);

    const setGroupAccounts = (type: 'ingreso' | 'gasto', groupName: string, accountIds: number[]) => {
        setPreferences(prev => {
            let current: CategoryAccountScope;
            try {
                const parsed = JSON.parse(prev.groupAccountScope || '{"ingreso":{},"gasto":{}}');
                current = { ingreso: parsed.ingreso || {}, gasto: parsed.gasto || {} };
            } catch { current = { ingreso: {}, gasto: {} }; }
            const next = { ...current, [type]: { ...current[type] } };
            if (accountIds.length === 0) delete next[type][groupName];
            else next[type][groupName] = accountIds;
            return { ...prev, groupAccountScope: JSON.stringify(next) };
        });
    };

    const clearAllData = async () => {
        setMisionesDirect([]); setTransactions([]); setHabits([]); setAgenda([]);
        setNotes([]); setProjects([]); setRutinas([]); setMonthlyBudget(0);
        setFixedExpenses([]); setAccounts([]); setDailyBlocks([]); setRitaEntries([]);
        setNegocioProjects([]);
        localStorage.clear();
        if (user) {
            const docRef = doc(db, 'users', user.uid);
            await setDoc(docRef, { lastSync: new Date().toISOString() }, { merge: false });
        }
    };

    // Reinicio selectivo del pilar Finanzas: a diferencia de clearAllData, deja
    // Checklist, Negocio y el resto intactos. Las deudas viven dentro del mismo
    // array de transacciones (flag isDebt), así que se filtran aparte para que
    // se puedan borrar transacciones normales sin tocar deudas, o al revés.
    const clearFinanzasSelectivo = (opciones: {
        transacciones?: boolean; deudas?: boolean; cuentas?: boolean;
        presupuesto?: boolean; gastosFijos?: boolean;
    }) => {
        if (opciones.transacciones || opciones.deudas) {
            setTransactions(prev => prev.filter(t => {
                if (opciones.transacciones && !t.isDebt) return false;
                if (opciones.deudas && t.isDebt) return false;
                return true;
            }));
        }
        if (opciones.cuentas) setAccounts([]);
        if (opciones.presupuesto) setMonthlyBudget(0);
        if (opciones.gastosFijos) setFixedExpenses([]);
    };

    const addDailyBlock = (label: string, period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro', date: string, completed: boolean = false, projectId?: number, repeatDays?: number[]) => {
        const newBlock: DailyBlock = {
            id: nextBlockId(),
            label,
            completed,
            period,
            date,
            projectId,
            repeatDays
        };
        setDailyBlocks(prev => [...prev, newBlock]);
    };

    const toggleDailyBlock = (id: number) => {
        setDailyBlocks(prev => prev.map(b => b.id === id ? { ...b, completed: !b.completed } : b));
    };

    const removeDailyBlock = (idOrIds: number | number[]) => {
        const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
        const removed = dailyBlocks.filter(b => ids.includes(b.id));
        if (removed.length) {
            setTrash(t => {
                const existingIds = new Set(t.map(i => i.block.id));
                return [...t, ...removed.filter(b => !existingIds.has(b.id)).map(block => ({ block, deletedAt: Date.now() }))];
            });
        }
        setDailyBlocks(prev => prev.filter(b => !ids.includes(b.id)));
    };

    const restoreFromTrash = (id: number) => {
        setTrash(prev => {
            const item = prev.find(t => t.block.id === id);
            if (item) {
                setDailyBlocks(b => [...b, item.block]);
                return prev.filter(t => t.block.id !== id);
            }
            return prev;
        });
    };

    const clearTrash = () => setTrash([]);

    // Auto-limpiar items de la papelera después de 60 días
    const TRASH_EXPIRY_MS = 60 * 24 * 60 * 60 * 1000;
    useEffect(() => {
        const now = Date.now();
        setTrash(prev => {
            const filtered = prev.filter(t => now - t.deletedAt < TRASH_EXPIRY_MS);
            return filtered.length !== prev.length ? filtered : prev;
        });
    }, [trash.length]);

    const updateDailyBlock = (id: number, updates: Partial<DailyBlock>) => {
        setDailyBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    /* ── Lista de compras ─────────────────────────────────────────── */

    const addShoppingItem = (
        text: string,
        estimatedAmount: number,
        priority: 'necesito' | 'quiero' = 'necesito',
        projectId?: number,
        note?: string,
        category?: string,
        status: 'planning' | 'saving' | 'ready' = 'planning',
        storeName?: string,
        storeUrl?: string,
        nivel?: 1 | 2 | 3
    ) => {
        const item: ShoppingItem = {
            id: nextBlockId(),
            text,
            estimatedAmount: Math.abs(estimatedAmount) || 0,
            priority,
            createdAt: new Date().toLocaleDateString('en-CA'),
            projectId,
            note,
            category,
            status,
            storeName,
            storeUrl,
            nivel,
        };
        setShoppingList(prev => [item, ...prev]);
    };

    const updateShoppingItem = (id: number, updates: Partial<ShoppingItem>) => {
        setShoppingList(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    };

    const removeShoppingItem = (id: number) => {
        setShoppingList(prev => prev.filter(i => i.id !== id));
    };

    // Marcar como comprado registra el gasto real de una vez, para no tener que
    // teclear la misma compra dos veces. El importe final puede diferir del estimado.
    const markShoppingItemPurchased = (id: number, finalAmount?: number, accountId?: number) => {
        const item = shoppingList.find(i => i.id === id);
        if (!item || item.purchasedAt) return;

        const amount = finalAmount !== undefined ? Math.abs(finalAmount) : item.estimatedAmount;
        addTransaction(item.text, amount, 'gasto', false, item.projectId, accountId, false, 'Compras', undefined);
        setShoppingList(prev => prev.map(i =>
            i.id === id
                ? { ...i, purchasedAt: new Date().toLocaleDateString('en-CA'), estimatedAmount: amount }
                : i
        ));
    };

    const unmarkShoppingItemPurchased = (id: number) => {
        setShoppingList(prev => prev.map(i => {
            if (i.id !== id) return i;
            const { purchasedAt, ...rest } = i;
            return rest as ShoppingItem;
        }));
    };

    /* ── Proyectos esporádicos ────────────────────────────────────── */

    const addSporadicProject = (title: string, dueDate: string, complexityHours: number, startDate?: string, color?: string) => {
        const project: SporadicProject = {
            id: nextBlockId(),
            title,
            startDate: startDate || new Date().toLocaleDateString('en-CA'),
            dueDate,
            complexityHours: Math.abs(complexityHours) || 0,
            status: 'pendiente',
            workedHours: 0,
            logs: [],
            photoLogs: [],
            color,
            requiresUsb: true, // lo normal es entregar USB junto con la entrega -- se puede desmarcar a mano si esta vez no toca
        };
        setSporadicProjects(prev => [project, ...prev]);
        return project.id;
    };

    const updateSporadicProject = (id: number, updates: Partial<SporadicProject>) => {
        setSporadicProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    // Reagendar: NUNCA toca dueDate -- esa sigue siendo la fecha real (la de
    // Notion si el proyecto está vinculado, o la de creación si no) y sigue
    // marcando el atraso normal como siempre, sin tocarla desde acá ni de
    // rebote en Notion. Esto solo pone/actualiza myDueDateOverride, una fecha
    // "mía" por encima, y sube el contador de reagendos.
    const rescheduleSporadicProject = (id: number, newDueDate: string) => {
        setSporadicProjects(prev => prev.map(p => {
            if (p.id !== id || p.myDueDateOverride === newDueDate) return p;
            return {
                ...p,
                myDueDateOverride: newDueDate,
                rescheduleCount: (p.rescheduleCount || 0) + 1,
            };
        }));
    };

    const removeSporadicProject = (id: number) => {
        setSporadicProjects(prev => prev.filter(p => p.id !== id));
    };

    // Cronómetro con pausa: Play arranca (o reanuda si ya había un tramo pausado
    // de esta misma sesión), Pausa guarda lo corrido sin cerrar el log todavía
    // (para que una llamada o un café no cuenten como "sesión terminada"), y
    // Terminar suma todos los tramos (los pausados + el que está corriendo) en
    // un solo log del día, etiquetado con la etapa/Estado que tenías al arrancar.
    // Se fija (pinned) sola al darle Play, para encontrarla arriba después.
    const startSporadicTimer = (id: number, stage?: string) => {
        setSporadicProjects(prev => prev.map(p => p.id === id ? {
            ...p, activeSince: Date.now(), pinned: true,
            activeStage: p.pausedAccumHours ? p.activeStage : stage,
            sessionStartedAt: p.sessionStartedAt || Date.now(),
            firstStartedAt: p.firstStartedAt || Date.now(),
            status: p.status === 'pendiente' ? 'en-progreso' : p.status,
        } : p));
    };

    const pauseSporadicTimer = (id: number) => {
        setSporadicProjects(prev => prev.map(p => {
            if (p.id !== id || !p.activeSince) return p;
            const hours = Math.max((Date.now() - p.activeSince) / (1000 * 60 * 60), 0);
            return { ...p, activeSince: undefined, pausedAccumHours: (p.pausedAccumHours || 0) + hours };
        }));
    };

    const stopSporadicTimer = (id: number) => {
        setSporadicProjects(prev => prev.map(p => {
            if (p.id !== id || (!p.activeSince && !p.pausedAccumHours)) return p;
            const running = p.activeSince ? Math.max((Date.now() - p.activeSince) / (1000 * 60 * 60), 0) : 0;
            const hours = running + (p.pausedAccumHours || 0);
            const log: SporadicWorkLog = { id: nextBlockId(), date: new Date().toLocaleDateString('en-CA'), hours, stage: p.activeStage };
            return { ...p, activeSince: undefined, activeStage: undefined, pausedAccumHours: undefined, sessionStartedAt: undefined, workedHours: p.workedHours + hours, logs: [log, ...p.logs] };
        }));
    };

    // Cronómetro por foto: independiente del de sesión (puede tenerlo corriendo
    // aunque el de sesión esté pausado o parado). Iniciar marca el instante en
    // que arranca esa foto puntual; Terminar cierra el log con la duración real;
    // Cancelar lo descarta sin dejar rastro (por si fue un clic de más).
    //
    // Híbrido con las horas trabajadas: si la sesión general está corriendo,
    // ese cronómetro ya está sumando este mismo tramo, así que el tiempo de la
    // foto NO se vuelve a sumar (se contaría dos veces). Si no hay sesión activa
    // (parada o en pausa), el tiempo de la foto sí se suma directo a workedHours,
    // para no perder el registro cuando trabajas por foto sin darle Play a la sesión.
    const startPhotoTimer = (id: number) => {
        setSporadicProjects(prev => prev.map(p => p.id === id ? { ...p, photoActiveSince: Date.now() } : p));
    };

    // Pausa el cronómetro de la foto actual sin cerrarla (mismo patrón que
    // pauseSporadicTimer): guarda lo corrido en photoPausedAccumSeconds y para
    // de contar hasta que le den Iniciar de nuevo (que reanuda) o Foto lista.
    const pausePhotoTimer = (id: number) => {
        setSporadicProjects(prev => prev.map(p => {
            if (p.id !== id || !p.photoActiveSince) return p;
            const seconds = Math.max(Math.round((Date.now() - p.photoActiveSince) / 1000), 0);
            return { ...p, photoActiveSince: undefined, photoPausedAccumSeconds: (p.photoPausedAccumSeconds || 0) + seconds };
        }));
    };

    const finishPhotoTimer = (id: number) => {
        setSporadicProjects(prev => prev.map(p => {
            if (p.id !== id || (!p.photoActiveSince && !p.photoPausedAccumSeconds)) return p;
            const liveSeconds = p.photoActiveSince ? Math.max(Math.round((Date.now() - p.photoActiveSince) / 1000), 0) : 0;
            const seconds = liveSeconds + (p.photoPausedAccumSeconds || 0);
            const log: SporadicPhotoLog = { id: nextBlockId(), date: new Date().toLocaleDateString('en-CA'), seconds };
            const addToWorked = !p.activeSince;
            return {
                ...p,
                photoActiveSince: undefined,
                photoPausedAccumSeconds: undefined,
                photoLogs: [log, ...(p.photoLogs || [])],
                workedHours: addToWorked ? p.workedHours + seconds / 3600 : p.workedHours,
                status: addToWorked && p.status === 'pendiente' ? 'en-progreso' : p.status,
            };
        }));
    };

    const cancelPhotoTimer = (id: number) => {
        setSporadicProjects(prev => prev.map(p => p.id === id ? { ...p, photoActiveSince: undefined, photoPausedAccumSeconds: undefined } : p));
    };

    // Suma/resta al contador de fotos marcadas a mano (sin cronómetro), para
    // ponerse al día si ya se avanzó antes de acordarse de usar "Iniciar foto".
    // Lee el valor previo dentro del updater (no del render) para que clics
    // seguidos no se pisen entre sí por closures viejos.
    const adjustPhotoManualExtra = (id: number, delta: number) => {
        setSporadicProjects(prev => prev.map(p => {
            if (p.id !== id) return p;
            // photoManualExtra puede ir negativo (para restar sin borrar del historial
            // del cronómetro) mientras el total (cronómetro + manual) no baje de 0.
            const timerCount = (p.photoLogs || []).length;
            return { ...p, photoManualExtra: Math.max(-timerCount, (p.photoManualExtra || 0) + delta) };
        }));
    };

    // Reinicia solo el contador de fotos (conteo/promedio/total) sin tocar las
    // horas de sesión ni lo demás -- para corregir pruebas del cronómetro por foto.
    const resetSporadicPhotoLog = (id: number) => {
        setSporadicProjects(prev => prev.map(p => p.id === id ? {
            ...p, photoLogs: [], photoActiveSince: undefined, photoPausedAccumSeconds: undefined, photoManualExtra: undefined,
        } : p));
    };

    // Deshace solo la última foto cronometrada (ej. un "Foto lista" de más por
    // error) sin perder el resto del registro -- photoLogs[0] es la más nueva
    // porque finishPhotoTimer la agrega al frente con unshift.
    const removeLastPhotoLog = (id: number) => {
        setSporadicProjects(prev => prev.map(p => p.id === id ? { ...p, photoLogs: (p.photoLogs || []).slice(1) } : p));
    };

    // Reinicia solo el registro de tiempo trabajado (sesiones + fotos) sin borrar
    // el proyecto -- para corregir pruebas o arrancar de cero el conteo de horas.
    const resetSporadicWorkedTime = (id: number) => {
        setSporadicProjects(prev => prev.map(p => p.id === id ? {
            ...p,
            workedHours: 0,
            logs: [],
            photoLogs: [],
            activeSince: undefined,
            activeStage: undefined,
            pausedAccumHours: undefined,
            photoActiveSince: undefined,
            photoPausedAccumSeconds: undefined,
            photoManualExtra: undefined,
            sessionStartedAt: undefined,
            firstStartedAt: undefined,
        } : p));
    };

    /* ── Plantillas de fases (flujo de trabajo reutilizable, ej. "Fotografía") ── */

    const addFaseTemplate = (name: string) => {
        const template: FaseTemplate = { id: nextBlockId(), name, steps: [] };
        setPhaseTemplates(prev => [...prev, template]);
        return template.id;
    };

    const removeFaseTemplate = (id: number) => {
        setPhaseTemplates(prev => prev.filter(t => t.id !== id));
    };

    const renameFaseTemplate = (id: number, name: string) => {
        setPhaseTemplates(prev => prev.map(t => t.id === id ? { ...t, name } : t));
    };

    const addFaseTemplateStep = (templateId: number, label: string) => {
        setPhaseTemplates(prev => prev.map(t => t.id === templateId
            ? { ...t, steps: [...t.steps, { id: nextBlockId(), label }] }
            : t));
    };

    const removeFaseTemplateStep = (templateId: number, stepId: number) => {
        setPhaseTemplates(prev => prev.map(t => t.id === templateId
            ? { ...t, steps: t.steps.filter(s => s.id !== stepId) }
            : t));
    };

    /* ── Fases dentro de un proyecto esporádico ────────────────────── */
    // Aplicar una plantilla COPIA sus pasos al proyecto (fases queda propia de
    // ese proyecto, editable sin tocar la plantilla original ni afectar a
    // otros proyectos que ya la hayan aplicado).
    const applyFaseTemplate = (projectId: number, templateId: number) => {
        const template = phaseTemplates.find(t => t.id === templateId);
        if (!template) return;
        const fases: ProjectFase[] = template.steps.map(s => ({ id: nextBlockId(), label: s.label, done: false }));
        setSporadicProjects(prev => prev.map(p => p.id === projectId ? { ...p, faseTemplateId: templateId, fases } : p));
    };

    const addProjectFase = (projectId: number, label: string) => {
        setSporadicProjects(prev => prev.map(p => p.id === projectId
            ? { ...p, fases: [...(p.fases || []), { id: nextBlockId(), label, done: false }] }
            : p));
    };

    const removeProjectFase = (projectId: number, faseId: number) => {
        setSporadicProjects(prev => prev.map(p => p.id === projectId
            ? { ...p, fases: (p.fases || []).filter(f => f.id !== faseId) }
            : p));
    };

    const toggleProjectFase = (projectId: number, faseId: number) => {
        setSporadicProjects(prev => prev.map(p => p.id === projectId
            ? {
                ...p,
                fases: (p.fases || []).map(f => f.id === faseId
                    ? { ...f, done: !f.done, activeSince: undefined, pausedAccumSeconds: undefined }
                    : f)
            }
            : p));
    };

    // Mismo patrón pausa/resume que start/pausePhotoTimer, pero por fase: arrancar
    // de nuevo reanuda (activeSince toggleable), pausar acumula lo corrido.
    const startFaseTimer = (projectId: number, faseId: number) => {
        setSporadicProjects(prev => prev.map(p => p.id === projectId
            ? { ...p, fases: (p.fases || []).map(f => f.id === faseId ? { ...f, activeSince: Date.now() } : f) }
            : p));
    };

    const pauseFaseTimer = (projectId: number, faseId: number) => {
        setSporadicProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p, fases: (p.fases || []).map(f => {
                    if (f.id !== faseId || !f.activeSince) return f;
                    const seconds = Math.max(Math.round((Date.now() - f.activeSince) / 1000), 0);
                    return { ...f, activeSince: undefined, pausedAccumSeconds: (f.pausedAccumSeconds || 0) + seconds };
                })
            };
        }));
    };

    // Cierra el cronómetro de la fase Y la marca como hecha (mismo espíritu que
    // finishPhotoTimer: sumar lo corrido + lo pausado y dejar un total fijo).
    const finishFaseTimer = (projectId: number, faseId: number) => {
        setSporadicProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p, fases: (p.fases || []).map(f => {
                    if (f.id !== faseId) return f;
                    const liveSeconds = f.activeSince ? Math.max(Math.round((Date.now() - f.activeSince) / 1000), 0) : 0;
                    const seconds = liveSeconds + (f.pausedAccumSeconds || 0);
                    return { ...f, activeSince: undefined, pausedAccumSeconds: undefined, seconds, done: true };
                })
            };
        }));
    };

    /* ── Calendario de comidas ─────────────────────────────────────── */

    const addRecipe = (name: string, kcal: number, protein: number, carbs: number, prepMinutes?: number, ingredients?: string) => {
        const recipe: Recipe = {
            id: nextBlockId(),
            name,
            kcal: Math.abs(kcal) || 0,
            protein: Math.abs(protein) || 0,
            carbs: Math.abs(carbs) || 0,
            prepMinutes,
            ingredients,
        };
        setRecipes(prev => [recipe, ...prev]);
        return recipe.id;
    };

    const updateRecipe = (id: number, updates: Partial<Recipe>) => {
        setRecipes(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    };

    // Borrar una receta también saca sus asignaciones del calendario: una entrada
    // apuntando a una receta inexistente no tiene forma de renderizarse.
    const removeRecipe = (id: number) => {
        setRecipes(prev => prev.filter(r => r.id !== id));
        setMealPlanEntries(prev => prev.filter(e => e.recipeId !== id));
    };

    const addMealPlanEntry = (date: string, mealType: MealType, recipeId: number) => {
        const entry: MealPlanEntry = { id: nextBlockId(), date, mealType, recipeId };
        setMealPlanEntries(prev => [...prev, entry]);
    };

    // Mover (drag) una entrada ya puesta a otro día/comida, en vez de crear una nueva.
    const moveMealPlanEntry = (id: number, date: string, mealType: MealType) => {
        setMealPlanEntries(prev => prev.map(e => e.id === id ? { ...e, date, mealType } : e));
    };

    const removeMealPlanEntry = (id: number) => {
        setMealPlanEntries(prev => prev.filter(e => e.id !== id));
    };

    const updateNutritionGoals = (updates: Partial<NutritionGoals>) => {
        setNutritionGoals(prev => ({ ...prev, ...updates }));
    };

    // Helper: marca escritura local antes de cualquier mutación.
    // Garantiza que el debounce de Firestore se active y que el guard anti-echo
    // sepa que este cambio viene del usuario, no de un snapshot.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lw = <T extends any[]>(fn: (...args: T) => any) => (...args: T) => {
        localWriteTimestampRef.current = Date.now();
        return fn(...args);
    };

    return {
        // Misiones
        missions: misionesState, todayMissions,
        toggleMission: lw(toggleMission), updateMission: lw(updateMission),
        addMission: lw(addMission), removeMission: lw(removeMission), reorderMissions: lw(reorderMissions),
        habits, toggleHabit: lw(toggleHabit), addHabit: lw(addHabit), removeHabit: lw(removeHabit),
        agenda, addCalendarEvent: lw(addCalendarEvent), removeCalendarEvent: lw(removeCalendarEvent), updateCalendarEvent: lw(updateCalendarEvent),
        performanceScore, missionFocusScore, completedMissionsCount,
        // Finanzas
        transactions, balance, todayIncome, todayExpense, todayNet, todayIncomeReal, todayExpenseReal,
        totalIncomeReal, totalExpenseReal, totalNetReal, debtsOwe, debtsOwed,
        monthlyBudget, updateMonthlyBudget: lw((a: number) => setMonthlyBudget(a)),
        fixedExpenses, addFixedExpense: lw(addFixedExpense), removeFixedExpense: lw(removeFixedExpense),
        toggleFixedExpense: lw(toggleFixedExpense), updateFixedExpense: lw(updateFixedExpense),
        markFixedExpensePaid: lw(markFixedExpensePaid), payFixedExpensePartial: lw(payFixedExpensePartial), unmarkFixedExpensePaid: lw(unmarkFixedExpensePaid),
        rolloverFixedExpenses: lw(rolloverFixedExpenses), payPendingPeriod: lw(payPendingPeriod), unmarkPendingPeriod: lw(unmarkPendingPeriod),
        repayDebt: lw(repayDebtBase),
        addTransaction: lw((text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projId?: number, accId?: number, isCashless?: boolean, cat?: string, contact?: string, dueDate?: string, notes?: string) => {
            addTransaction(text, amount, type, isDebt, projId, accId, isCashless, cat, contact, dueDate, notes);
            if (projId && accId) {
                setAccounts(prev => prev.map(acc => {
                    if (acc.id === accId && !acc.projectIds?.includes(projId)) {
                        return { ...acc, projectIds: [...(acc.projectIds || []), projId] };
                    }
                    return acc;
                }));
            }
        }),
        removeTransaction: lw(removeTransaction), updateTransaction: lw(updateTransaction), updateTransactionGroup: lw(updateTransactionGroup),
        // Proyectos
        projects, addProject: lw(addProject), addProjectTask: lw(addProjectTask),
        toggleProjectTask: lw(toggleProjectTask), removeProjectTask: lw(removeProjectTask),
        reorderProjectTasks: lw(reorderProjectTasks), reorderProjects: lw(reorderProjects),
        promoteTaskToRoutine: lw(promoteTaskToRoutine), promoteNodeToRoutine: lw(promoteNodeToRoutine),
        updateProject: lw(updateProject), deleteProject: lw(deleteProject), updateProjectTask: lw(updateProjectTask),
        addInventoryItem: lw(addInventoryItem), updateInventoryItemQuantity: lw(updateInventoryItemQuantity), removeInventoryItem: lw(removeInventoryItem),
        addProjectObjective: lw(addProjectObjective), updateProjectObjective: lw(updateProjectObjective), removeProjectObjective: lw(removeProjectObjective),
        addProjectNode: lw(addProjectNode), updateProjectNode: lw(updateProjectNode), removeProjectNode: lw(removeProjectNode),
        addProjectCategory: lw(addProjectCategory), removeProjectCategory: lw(removeProjectCategory),
        timeBlocks, addTimeBlock: lw(addTimeBlock), removeTimeBlock: lw(removeTimeBlock), updateTimeBlock: lw(updateTimeBlock),
        rutinas, addRoutineItem: lw(addRoutineItem), updateRoutineItem: lw(updateRoutineItem),
        toggleRoutineItem: lw(toggleRoutineItem), removeRoutineItem: lw(removeRoutineItem),
        updateRoutine: lw(updateRoutine), addRoutine: lw(addRoutine), removeRoutine: lw(removeRoutine), reorderRoutineItems: lw(reorderRoutineItems),
        promoteRoutineItemToProject: lw(promoteRoutineItemToProject),
        // Otros
        notes, addNote: lw(addNote), removeNote: lw(removeNote), toggleNoteItem: lw(toggleNoteItem), updateNote: lw(updateNote),
        accounts, setAccounts: lw(setAccounts),
        contacts, setContacts: lw(setContacts),
        preferences, updatePreference: lw((key: keyof UserPreferences, value: any) => setPreferences(prev => ({ ...prev, [key]: value }))),
        incomeCategories, expenseCategories, addCategory: lw(addCategory), removeCategory: lw(removeCategory),
        renameCategory: lw(renameCategory), mergeCategory: lw(mergeCategory),
        categoryAccountScope, setCategoryAccounts: lw(setCategoryAccounts),
        categoryGroups, setCategoryGroup: lw(setCategoryGroup),
        renameCategoryGroup: lw(renameCategoryGroup), deleteCategoryGroup: lw(deleteCategoryGroup),
        groupAccountScope, setGroupAccounts: lw(setGroupAccounts),
        // Bloques Diarios
        dailyBlocks, addDailyBlock: lw(addDailyBlock), toggleDailyBlock: lw(toggleDailyBlock), removeDailyBlock: lw(removeDailyBlock), updateDailyBlock: lw(updateDailyBlock),
        // Lista de compras
        shoppingList,
        addShoppingItem: lw(addShoppingItem), updateShoppingItem: lw(updateShoppingItem),
        removeShoppingItem: lw(removeShoppingItem),
        sporadicProjects,
        addSporadicProject: lw(addSporadicProject), updateSporadicProject: lw(updateSporadicProject),
        removeSporadicProject: lw(removeSporadicProject), rescheduleSporadicProject: lw(rescheduleSporadicProject),
        startSporadicTimer: lw(startSporadicTimer), pauseSporadicTimer: lw(pauseSporadicTimer), stopSporadicTimer: lw(stopSporadicTimer),
        startPhotoTimer: lw(startPhotoTimer), pausePhotoTimer: lw(pausePhotoTimer), finishPhotoTimer: lw(finishPhotoTimer), cancelPhotoTimer: lw(cancelPhotoTimer),
        adjustPhotoManualExtra: lw(adjustPhotoManualExtra),
        resetSporadicWorkedTime: lw(resetSporadicWorkedTime), resetSporadicPhotoLog: lw(resetSporadicPhotoLog), removeLastPhotoLog: lw(removeLastPhotoLog),
        phaseTemplates,
        addFaseTemplate: lw(addFaseTemplate), removeFaseTemplate: lw(removeFaseTemplate), renameFaseTemplate: lw(renameFaseTemplate),
        addFaseTemplateStep: lw(addFaseTemplateStep), removeFaseTemplateStep: lw(removeFaseTemplateStep),
        applyFaseTemplate: lw(applyFaseTemplate),
        addProjectFase: lw(addProjectFase), removeProjectFase: lw(removeProjectFase), toggleProjectFase: lw(toggleProjectFase),
        startFaseTimer: lw(startFaseTimer), pauseFaseTimer: lw(pauseFaseTimer), finishFaseTimer: lw(finishFaseTimer),
        markShoppingItemPurchased: lw(markShoppingItemPurchased),
        unmarkShoppingItemPurchased: lw(unmarkShoppingItemPurchased),
        // Calendario de comidas
        recipes, addRecipe: lw(addRecipe), updateRecipe: lw(updateRecipe), removeRecipe: lw(removeRecipe),
        mealPlanEntries, addMealPlanEntry: lw(addMealPlanEntry), moveMealPlanEntry: lw(moveMealPlanEntry), removeMealPlanEntry: lw(removeMealPlanEntry),
        nutritionGoals, updateNutritionGoals: lw(updateNutritionGoals),
        trash, restoreFromTrash: lw(restoreFromTrash), clearTrash: lw(clearTrash),
        // Hoja de Rita
        ritaEntries,
        addRitaEntry: lw(addRitaEntry), removeRitaEntry: lw(removeRitaEntry), updateRitaEntry: lw(updateRitaEntry),
        addRitaSubitem: lw(addRitaSubitem), toggleRitaSubitem: lw(toggleRitaSubitem), removeRitaSubitem: lw(removeRitaSubitem),
        // Negocio
        negocioProjects,
        addNegocioProject: lw(addNegocioProject), removeNegocioProject: lw(removeNegocioProject), updateNegocioProject: lw(updateNegocioProject),
        addClient: lw(addClient), updateClient: lw(updateClient), removeClient: lw(removeClient),
        addWorker: lw(addWorker), updateWorker: lw(updateWorker), removeWorker: lw(removeWorker),
        addExpense: lw(addExpense), updateExpense: lw(updateExpense), removeExpense: lw(removeExpense),
        // Metas
        goals,
        addGoal: lw(addGoal), updateGoal: lw(updateGoal), removeGoal: lw(removeGoal), reorderGoals: lw(reorderGoals),
        addGoalMilestone: lw(addGoalMilestone), toggleGoalMilestone: lw(toggleGoalMilestone), removeGoalMilestone: lw(removeGoalMilestone),
        user, isInitialLoad, clearAllData, clearFinanzasSelectivo: lw(clearFinanzasSelectivo)
    };
};
