// Mide cuánto ocupa el estado que se sube a Firestore. Firestore limita cada
// documento a 1 MiB; el tamaño real que cuenta Firestore no es idéntico al de
// JSON.stringify (nombres de campo + valores), pero queda muy cerca y sirve
// para saber qué colección crece y cuándo hay que actuar.

export const LIMITE_DOC_BYTES = 1024 * 1024;
export const UMBRAL_AVISO = 0.7;

export const NOMBRES_COLECCION: Record<string, string> = {
    missions: 'Misiones',
    transactions: 'Transacciones',
    habits: 'Hábitos (lista vieja)',
    agenda: 'Agenda',
    timeBlocks: 'Bloques de horario',
    notes: 'Notas',
    projects: 'Proyectos',
    rutinas: 'Rutinas',
    monthlyBudget: 'Presupuesto',
    fixedExpenses: 'Gastos fijos',
    accounts: 'Cuentas',
    contacts: 'Contactos',
    preferences: 'Preferencias',
    incomeCategories: 'Categorías de ingreso',
    expenseCategories: 'Categorías de gasto',
    dailyBlocks: 'Tareas de Mi Día',
    shoppingList: 'Lista de compras',
    sporadicProjects: 'Proyectos esporádicos',
    phaseTemplates: 'Plantillas de fases',
    recipes: 'Recetas',
    mealPlanEntries: 'Plan de comidas',
    nutritionGoals: 'Metas de nutrición',
    ritaEntries: 'Hoja de Rita',
    negocioProjects: 'Negocio',
    goals: 'Metas',
    trash: 'Papelera',
    dailyCheckins: 'Check-ins diarios',
};

export interface MedidaColeccion {
    clave: string;
    nombre: string;
    bytes: number;
    items: number | null; // null si no es una lista
}

export interface MedidaDatos {
    total: number;
    fraccion: number; // total / LIMITE_DOC_BYTES
    colecciones: MedidaColeccion[]; // de mayor a menor
}

const encoder = new TextEncoder();
export const bytesJSON = (valor: unknown) => encoder.encode(JSON.stringify(valor) ?? '').length;

export const medirDatos = (estado: Record<string, unknown>): MedidaDatos => {
    const colecciones = Object.entries(estado).map(([clave, valor]) => ({
        clave,
        nombre: NOMBRES_COLECCION[clave] ?? clave,
        bytes: bytesJSON(valor),
        items: Array.isArray(valor) ? valor.length : null,
    })).sort((a, b) => b.bytes - a.bytes);
    const total = colecciones.reduce((s, c) => s + c.bytes, 0);
    return { total, fraccion: total / LIMITE_DOC_BYTES, colecciones };
};

export const formatoKB = (bytes: number) =>
    bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
        : bytes >= 1024 ? `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
            : `${bytes} B`;
