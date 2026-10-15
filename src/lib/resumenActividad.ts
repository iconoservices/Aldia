import type { DailyBlock, Mission } from '../hooks/useAlDiaState';

/*
 * Métricas de "Datos" calculadas desde lo que el usuario realmente usa:
 * las tareas de Mi Día (dailyBlocks). Una tarea es una plantilla (nombre +
 * franja) que se repite en `repeatDays` (getDay: 0 = domingo) o vive en una
 * sola fecha; cada día que se marca queda un bloque con esa fecha y
 * completed = true. Los hábitos son tareas con isHabit y se agrupan solo
 * por nombre (igual que en useAlDiaState).
 *
 * Antes la pantalla salía de `missions` (la lista vieja), que casi no se usa:
 * por eso el puntaje daba 0 y el mapa estaba fijo en vacío.
 */

export interface DiaActividad {
    fecha: string;       // YYYY-MM-DD
    programadas: number; // tareas que tocaban ese día
    hechas: number;      // tareas marcadas ese día
}

export interface HabitoConstancia {
    nombre: string;
    hechos: number;
    programados: number;
    pct: number;
}

export interface ResumenActividad {
    dias: DiaActividad[];           // últimos 35 días, del más viejo a hoy
    hechas7: number;
    programadas7: number;
    cumplimiento7: number;          // 0-100
    hechas30: number;
    rachaDias: number;              // días seguidos (hasta hoy o ayer) con al menos una tarea hecha
    habitos: HabitoConstancia[];    // constancia de los últimos 30 días
    constanciaHabitos: number | null; // promedio; null si no hay hábitos
    pendientesAbiertos: number;
    pendientesVencidos: number;
}

const fechaLocal = (d: Date) => d.toLocaleDateString('en-CA');
const restarDias = (fecha: string, n: number) => {
    const d = new Date(fecha + 'T00:00:00');
    d.setDate(d.getDate() - n);
    return fechaLocal(d);
};
const diaSemana = (fecha: string) => new Date(fecha + 'T00:00:00').getDay();

interface Plantilla {
    nombre: string;
    esHabito: boolean;
    repeatDays: number[];
    primeraFecha: string;
    pausada: boolean;
    fechas: Set<string>;   // fechas con bloque
    hechas: Set<string>;   // fechas con bloque completado
}

export const calcularResumen = (dailyBlocks: DailyBlock[], missions: Mission[], hoy = fechaLocal(new Date())): ResumenActividad => {
    const bloques = Array.isArray(dailyBlocks) ? dailyBlocks : [];
    const etiquetasHabito = new Set(bloques.filter(b => b.isHabit).map(b => b.label.trim().toLowerCase()));

    const plantillas = new Map<string, Plantilla>();
    bloques.forEach(b => {
        if (!b?.label || !b.date) return;
        const nombre = b.label.trim().toLowerCase();
        const esHabito = etiquetasHabito.has(nombre);
        const k = esHabito ? `h:${nombre}` : `${nombre}||${b.period}`;
        let p = plantillas.get(k);
        if (!p) {
            p = { nombre: b.label.trim(), esHabito, repeatDays: [], primeraFecha: b.date, pausada: false, fechas: new Set(), hechas: new Set() };
            plantillas.set(k, p);
        }
        if (!p.repeatDays.length && b.repeatDays?.length) p.repeatDays = b.repeatDays;
        if (b.date < p.primeraFecha) p.primeraFecha = b.date;
        if (b.isActive === false) p.pausada = true;
        p.fechas.add(b.date);
        if (b.completed) p.hechas.add(b.date);
    });

    // ¿Le tocaba a esta tarea el día `fecha`? Una repetitiva cuenta desde su
    // primer bloque (no se castiga por días antes de crearla); una pausada solo
    // cuenta los días en que igual se marcó.
    const tocaba = (p: Plantilla, fecha: string) => {
        if (p.hechas.has(fecha)) return true;
        if (p.pausada) return false;
        if (p.repeatDays.length) return fecha >= p.primeraFecha && fecha <= hoy && p.repeatDays.includes(diaSemana(fecha));
        return p.fechas.has(fecha);
    };

    const lista = [...plantillas.values()];
    const dias: DiaActividad[] = Array.from({ length: 35 }, (_, i) => {
        const fecha = restarDias(hoy, 34 - i);
        let programadas = 0, hechas = 0;
        lista.forEach(p => {
            if (!tocaba(p, fecha)) return;
            programadas++;
            if (p.hechas.has(fecha)) hechas++;
        });
        return { fecha, programadas, hechas };
    });

    const ult7 = dias.slice(-7);
    const hechas7 = ult7.reduce((s, d) => s + d.hechas, 0);
    const programadas7 = ult7.reduce((s, d) => s + d.programadas, 0);
    const hechas30 = dias.slice(-30).reduce((s, d) => s + d.hechas, 0);

    // Racha: si hoy todavía no marcaste nada, se cuenta desde ayer.
    let rachaDias = 0;
    for (let i = dias.length - 1; i >= 0; i--) {
        if (dias[i].hechas > 0) rachaDias++;
        else if (i === dias.length - 1) continue;
        else break;
    }

    const ult30 = dias.slice(-30).map(d => d.fecha);
    const habitos = lista.filter(p => p.esHabito).map(p => {
        const prog = ult30.filter(f => tocaba(p, f));
        const hechos = prog.filter(f => p.hechas.has(f)).length;
        return { nombre: p.nombre, hechos, programados: prog.length, pct: prog.length ? Math.round(hechos / prog.length * 100) : 0 };
    }).filter(h => h.programados > 0).sort((a, b) => b.pct - a.pct);
    const constanciaHabitos = habitos.length
        ? Math.round(habitos.reduce((s, h) => s + h.pct, 0) / habitos.length)
        : null;

    const pendientes = (Array.isArray(missions) ? missions : []).filter(m => m && !m.completed && !m.isHabit && !m.isRoutine);
    const pendientesVencidos = pendientes.filter(m => m.dueDate && m.dueDate < hoy).length;

    return {
        dias, hechas7, programadas7,
        cumplimiento7: programadas7 ? Math.round(hechas7 / programadas7 * 100) : 0,
        hechas30, rachaDias, habitos, constanciaHabitos,
        pendientesAbiertos: pendientes.length, pendientesVencidos,
    };
};
