import type { DailyBlock, Goal, GoalHorizon } from '../../hooks/useAlDiaState';

/* Cálculos de Metas compartidos por Metas, Tareas y Mi Día. */

export const fmt = (n: number) => n.toLocaleString('es-PE', { maximumFractionDigits: 2 });
export type Periodo = 'semana' | 'mes';
// Clave del período en curso: el lunes de esta semana, o el mes.
export const clavePeriodo = (p: Periodo, d = new Date()) => {
    if (p === 'mes') return d.toLocaleDateString('en-CA').slice(0, 7);
    const l = new Date(d); l.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return l.toLocaleDateString('en-CA');
};
// Avance que cuenta hoy: si la meta es por semana/mes y ya cambió el período, vuelve a 0.
export const actualVigente = (g: Goal) =>
    g.periodo && g.periodoClave !== clavePeriodo(g.periodo) ? 0 : (g.actual ?? 0);
export const sufijoPeriodo = (g: Goal) => g.periodo === 'semana' ? ' por semana' : g.periodo === 'mes' ? ' por mes' : '';

export const conUnidad = (n: number, u?: string) => !u ? fmt(n) : u === 'S/' ? `S/ ${fmt(n)}` : u === '%' ? `${fmt(n)}%` : `${fmt(n)} ${u}`;

const NOMBRE_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
// "Todos los días", "Lun a Vie" o "Lun · Mié · Vie".
export const etiquetaDias = (dias: number[]) => {
    const orden = [1, 2, 3, 4, 5, 6, 0].filter(d => dias.includes(d));
    if (orden.length === 7) return 'Todos los días';
    if (orden.length === 5 && !dias.includes(0) && !dias.includes(6)) return 'Lun a Vie';
    return orden.map(d => NOMBRE_DIA[d]).join(' · ');
};

const hoyStr = () => new Date().toLocaleDateString('en-CA');
const claveSerie = (b: DailyBlock) => `${b.label.trim().toLowerCase()}|${b.period}`;

// Una tarea enlazada a una meta: suelta (un bloque) o repetitiva (toda la serie).
export interface TareaEnlazada {
    id: number;            // bloque representativo (para desenlazar / marcar)
    label: string;
    repetitiva: boolean;
    activa: boolean;
    hecha: boolean;        // suelta: completada · repetitiva: hecha hoy
    semana?: { hechos: number; toca: number }; // repetitiva: cumplimiento lunes→hoy
    dias?: number[];       // repetitiva: días de la semana (getDay, 0 = domingo)
}

export const tareasDeMeta = (goalId: number, dailyBlocks: DailyBlock[]): TareaEnlazada[] => {
    const propias = dailyBlocks.filter(b => b.goalId === goalId);
    const sueltas = propias.filter(b => !b.repeatDays?.length);
    const series = new Map<string, DailyBlock[]>();
    propias.filter(b => b.repeatDays?.length).forEach(b => {
        const k = claveSerie(b);
        series.set(k, [...(series.get(k) || []), b]);
    });

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    const today = hoyStr();

    const repetitivas: TareaEnlazada[] = [...series.values()].map(bloques => {
        const plantilla = bloques[bloques.length - 1];
        const dias = plantilla.repeatDays || [];
        const hechas = new Set(bloques.filter(b => b.completed && b.date).map(b => b.date));
        let hechos = 0, toca = 0;
        for (const d = new Date(lunes); d <= hoy; d.setDate(d.getDate() + 1)) {
            const f = d.toLocaleDateString('en-CA');
            if (dias.includes(d.getDay())) toca++;
            if (hechas.has(f)) hechos++;
        }
        return {
            id: plantilla.id, label: plantilla.label, repetitiva: true,
            activa: bloques.every(b => b.isActive !== false),
            hecha: hechas.has(today), semana: { hechos, toca }, dias,
        };
    });
    return [
        ...repetitivas,
        ...sueltas.map(b => ({ id: b.id, label: b.label, repetitiva: false, activa: true, hecha: b.completed })),
    ];
};

// Avance de una meta o sub-meta. Con número: actual/objetivo. Si no: sub-metas
// logradas + tareas propias + tareas enlazadas (cada repetitiva vale su % de la semana).
export const avance = (g: Goal, subs: Goal[], dailyBlocks: DailyBlock[]) => {
    if (g.objetivo && g.objetivo > 0) {
        const actual = actualVigente(g);
        const texto = (g.unidad === 'S/' ? `S/ ${fmt(actual)} / ${fmt(g.objetivo)}` : `${fmt(actual)} / ${conUnidad(g.objetivo, g.unidad)}`) + sufijoPeriodo(g);
        return { pct: Math.max(0, Math.min(100, Math.round((actual / g.objetivo) * 100))), texto };
    }
    const enlazadas = tareasDeMeta(g.id, dailyBlocks).filter(t => t.activa && (!t.repetitiva || (t.semana?.toca ?? 0) > 0));
    const total = subs.length + g.milestones.length + enlazadas.length;
    const hechos = subs.filter(s => s.status === 'completado').length + g.milestones.filter(m => m.completed).length
        + enlazadas.reduce((acc, t) => acc + (t.repetitiva ? Math.min(1, t.semana!.hechos / t.semana!.toca) : t.hecha ? 1 : 0), 0);
    if (total === 0) return { pct: g.status === 'completado' ? 100 : 0, texto: '' };
    // El texto cuenta solo lo terminado; la parte de la semana de las repetitivas va en el %.
    return { pct: Math.round((hechos / total) * 100), texto: `${Math.floor(hechos + 1e-9)}/${total}` };
};

const ORDEN: GoalHorizon[] = ['corto', 'mediano', 'largo'];

// El escalón en el que estás: la primera sub-meta sin lograr (corto → mediano → largo).
export const subMetaActiva = (meta: Goal, goals: Goal[]): Goal | undefined =>
    goals
        .filter(g => g.parentId === meta.id && g.status !== 'completado')
        .sort((a, b) => ORDEN.indexOf(a.horizon) - ORDEN.indexOf(b.horizon) || a.order - b.order || a.id - b.id)[0];

// Metas y sub-metas para un selector: "Meta" y "Meta › Sub-meta".
export const opcionesMeta = (goals: Goal[]) => {
    const raiz = goals.filter(g => !g.parentId && g.status !== 'completado');
    return raiz.flatMap(m => [
        { id: m.id, texto: `${m.icon} ${m.title}` },
        ...goals.filter(s => s.parentId === m.id && s.status !== 'completado')
            .sort((a, b) => ORDEN.indexOf(a.horizon) - ORDEN.indexOf(b.horizon))
            .map(s => ({ id: s.id, texto: `   › ${s.title}` })),
    ]);
};
