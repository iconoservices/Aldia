import { useState, useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { NuevaMetaModal, PLAZOS_INFO } from './NuevaMetaModal';
import type { NuevaMeta } from './NuevaMetaModal';
import type { DailyBlock, Goal, GoalHorizon, GoalStatus, Project } from '../../hooks/useAlDiaState';
import { SelectPropio } from '../ui/SelectPropio';
import { avance, tareasDeMeta, actualVigente, clavePeriodo, etiquetaDias } from './metasAvance';
import type { TareaEnlazada } from './metasAvance';
import {
    C, MONO, useIsMobile,
    paddingPagina, campo,
} from '../../theme';

/* Metas:
   🧭 Visión (un Proyecto, opcional) → Meta (número + plazo) → columnas Corto/Mediano/Largo.
   En cada columna viven las sub-metas (escalones: 10 clientes → 100 → 500) con sus tareas,
   y tareas sueltas. Las tareas de Tareas/Mi Día se enlazan con mission.goalId. */

interface MetasDashboardProps {
    goals: Goal[];
    projects?: Project[];
    dailyBlocks?: DailyBlock[];
    toggleDailyBlock?: (id: number) => void;
    linkTaskToGoal?: (blockId: number, goalId: number | undefined) => void;
    removeDailyBlock?: (id: number) => void;
    addDailyBlock?: (label: string, period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro', date: string, completed?: boolean, projectId?: number, repeatDays?: number[], time?: string, isActive?: boolean, isHabit?: boolean, goalId?: number) => void;
    addProject?: (name: string, color: string) => number | void;
    addGoal: (title: string, horizon: GoalHorizon, area: string, color: string, icon?: string, targetDate?: string, projectId?: number, milestones?: Goal['milestones'], nombresPlazo?: Goal['nombresPlazo'], extra?: Partial<Goal>) => void;
    updateGoal: (id: number, updates: Partial<Goal>) => void;
    removeGoal: (id: number) => void;
    reorderGoals?: (goals: Goal[]) => void;
    updateDailyBlock?: (id: number, updates: Partial<DailyBlock>) => void;
    addGoalMilestone: (goalId: number, text: string, plazo?: GoalHorizon) => void;
    toggleGoalMilestone: (goalId: number, milestoneId: number) => void;
    removeGoalMilestone: (goalId: number, milestoneId: number) => void;
}

const STATUS_INFO: Record<GoalStatus, { label: string; color: string; bg: string }> = {
    'pendiente':    { label: 'Pendiente',    color: C.outline, bg: C.surfaceContainerLow },
    'en-progreso':  { label: 'En progreso',  color: C.ambar,   bg: 'rgba(230,168,23,0.12)' },
    'completado':   { label: 'Lograda',      color: C.verde,   bg: 'rgba(16,185,129,0.12)' },
};

const STATUS_ORDEN: GoalStatus[] = ['pendiente', 'en-progreso', 'completado'];
const STATUS_ICONO: Record<GoalStatus, string> = { 'pendiente': 'radio_button_unchecked', 'en-progreso': 'timelapse', 'completado': 'check_circle' };

const nombrePlazo = (goal: Goal, k: GoalHorizon) =>
    goal.nombresPlazo?.[k]?.trim() || PLAZOS_INFO.find(p => p.k === k)!.titulo;

const diasRestantes = (fecha?: string) => {
    if (!fecha) return null;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const objetivo = new Date(fecha + 'T00:00:00');
    return Math.round((objetivo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
};

const Barra = ({ pct, color, alto = 4 }: { pct: number; color: string; alto?: number }) => (
    <div style={{ height: `${alto}px`, background: C.surfaceContainerHigh, borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '999px', transition: 'width 0.25s' }} />
    </div>
);

// Qué formulario está abierto: crear/editar meta, o crear/editar sub-meta.
type Form =
    | { tipo: 'meta'; goal?: Goal }
    | { tipo: 'sub'; padre: Goal; goal?: Goal; inicial?: Partial<NuevaMeta> };

const aForm = (g: Goal): Partial<NuevaMeta> => ({
    title: g.title, area: g.area, icon: g.icon, color: g.color, targetDate: g.targetDate || '',
    objetivo: g.objetivo != null ? String(g.objetivo) : '', actual: g.actual != null || g.periodo ? String(actualVigente(g)) : '',
    unidad: g.unidad || '', periodo: g.periodo ?? '', projectId: g.projectId, horizon: g.horizon,
});
const num = (s: string) => { const n = parseFloat(s); return isFinite(n) ? n : undefined; };

// Intercambia `id` con su vecino (arriba/abajo) dentro de `hermanas`, en el arreglo completo.
// El orden en pantalla es el orden del arreglo, así que con eso basta para que se guarde.
const moverEn = (goals: Goal[], hermanas: Goal[], id: number, dir: -1 | 1): Goal[] | null => {
    const i = hermanas.findIndex(g => g.id === id);
    const vecina = hermanas[i + dir];
    if (i < 0 || !vecina) return null;
    const a = goals.findIndex(g => g.id === id), b = goals.findIndex(g => g.id === vecina.id);
    const out = [...goals];
    [out[a], out[b]] = [out[b], out[a]];
    return out;
};

export const MetasDashboard = ({
    goals, projects = [], dailyBlocks = [], toggleDailyBlock, updateDailyBlock, linkTaskToGoal, addDailyBlock, removeDailyBlock, addProject,
    addGoal, updateGoal, removeGoal, reorderGoals, addGoalMilestone, toggleGoalMilestone, removeGoalMilestone,
}: MetasDashboardProps) => {
    const movil = useIsMobile();
    const [form, setForm] = useState<Form | null>(null);
    useEffect(() => {
        const abrir = () => setForm({ tipo: 'meta' });
        window.addEventListener('aldia:nueva-meta', abrir);
        return () => window.removeEventListener('aldia:nueva-meta', abrir);
    }, []);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [subAbierta, setSubAbierta] = useState<number | null>(null);
    const [plazoAbierto, setPlazoAbierto] = useState<{ goalId: number; plazo: GoalHorizon } | null>(null);
    const [detalle, setDetalle] = useState<{ goalId: number; milestoneId: number; plazo: GoalHorizon } | null>(null);

    const raiz = goals.filter(g => !g.parentId);
    const subsDe = (id: number) => goals.filter(g => g.parentId === id);

    // Agrupar por visión (proyecto). Las metas sin visión van al final.
    const grupos: { proyecto?: Project; metas: Goal[] }[] = [];
    raiz.forEach(g => {
        const p = projects.find(x => x.id === g.projectId);
        const grupo = grupos.find(gr => gr.proyecto?.id === p?.id);
        if (grupo) grupo.metas.push(g); else grupos.push({ proyecto: p, metas: [g] });
    });
    grupos.sort((a, b) => (a.proyecto ? 0 : 1) - (b.proyecto ? 0 : 1));
    const conVisiones = grupos.some(g => g.proyecto);

    // Meta raíz: sube/baja dentro de su visión; en el borde del grupo, mueve la
    // visión entera con respecto a la vecina (así también se pueden ordenar las
    // metas cuando cada visión tiene una sola). "Sin visión" siempre queda al final.
    const grupoVecino = (gi: number, dir: -1 | 1) => {
        const g = grupos[gi], v = grupos[gi + dir];
        return v && !!g.proyecto === !!v.proyecto ? v : undefined;
    };
    const puedeMover = (gi: number, i: number, dir: -1 | 1) => {
        const n = grupos[gi].metas.length;
        return dir === -1 ? i > 0 || !!grupoVecino(gi, -1) : i < n - 1 || !!grupoVecino(gi, 1);
    };
    const mover = (gi: number, id: number, dir: -1 | 1) => {
        if (!reorderGoals) return;
        const metas = grupos[gi].metas;
        const i = metas.findIndex(g => g.id === id);
        const dentro = i + dir >= 0 && i + dir < metas.length;
        if (dentro) { const nuevo = moverEn(goals, metas, id, dir); if (nuevo) reorderGoals(nuevo); return; }
        if (!grupoVecino(gi, dir)) return;
        const orden = [...grupos];
        [orden[gi], orden[gi + dir]] = [orden[gi + dir], orden[gi]];
        const planas = orden.flatMap(gr => gr.metas);
        let k = 0;
        reorderGoals(goals.map(g => (g.parentId ? g : planas[k++])));
    };
    // Arrastre desde el ⋮ de la tarjeta (solo escritorio): se suelta sobre otra meta
    // y toma su lugar. Dentro de una visión reordena las metas; hacia otra visión
    // mueve la visión entera a esa posición (sin cambiar a qué visión pertenece cada meta).
    const [arrastrando, setArrastrando] = useState<number | null>(null);
    const [sobreMeta, setSobreMeta] = useState<number | null>(null);
    const soltarMeta = (destinoId: number) => {
        const origenId = arrastrando;
        setArrastrando(null); setSobreMeta(null);
        if (!reorderGoals || origenId == null || origenId === destinoId) return;
        const go = grupos.findIndex(gr => gr.metas.some(m => m.id === origenId));
        const gd = grupos.findIndex(gr => gr.metas.some(m => m.id === destinoId));
        if (go < 0 || gd < 0) return;
        let orden = [...grupos];
        if (go === gd) {
            const metas = [...grupos[go].metas];
            const dragged = metas.splice(metas.findIndex(m => m.id === origenId), 1)[0];
            metas.splice(grupos[go].metas.findIndex(m => m.id === destinoId), 0, dragged);
            orden[go] = { ...grupos[go], metas };
        } else {
            if (!!grupos[go].proyecto !== !!grupos[gd].proyecto) return; // "Sin visión" siempre al final
            const [g] = orden.splice(go, 1);
            orden.splice(gd, 0, g);
        }
        const planas = orden.flatMap(gr => gr.metas);
        let k = 0;
        reorderGoals(goals.map(g => (g.parentId ? g : planas[k++])));
    };
    const moverSub = (hermanas: Goal[], id: number, dir: -1 | 1) => {
        const nuevo = reorderGoals && moverEn(goals, hermanas, id, dir);
        if (nuevo) reorderGoals!(nuevo);
    };
    const hermanasDeSub = (s: Goal) => goals.filter(g => g.parentId === s.parentId && g.horizon === s.horizon);

    const guardarForm = (m: NuevaMeta) => {
        if (!form) return;
        const numeros = { objetivo: num(m.objetivo), actual: num(m.actual), unidad: m.unidad || undefined, periodo: m.periodo || undefined, periodoClave: m.periodo ? clavePeriodo(m.periodo) : undefined };
        if (form.tipo === 'meta') {
            if (form.goal) updateGoal(form.goal.id, { title: m.title, area: m.area, icon: m.icon, color: m.color, targetDate: m.targetDate || undefined, projectId: m.projectId, ...numeros });
            else addGoal(m.title, 'mediano', m.area || 'Personal', m.color, m.icon, m.targetDate || undefined, m.projectId, [], undefined, numeros);
        } else {
            const p = form.padre;
            if (form.goal) updateGoal(form.goal.id, { title: m.title, horizon: m.horizon, ...numeros });
            else addGoal(m.title, m.horizon, p.area, p.color, '🎯', undefined, undefined, [], undefined, { ...numeros, parentId: p.id });
        }
        setForm(null);
    };

    const sub = subAbierta != null ? goals.find(g => g.id === subAbierta) : undefined;
    const padreDeSub = sub ? goals.find(g => g.id === sub.parentId) : undefined;
    const metaPlazo = plazoAbierto ? goals.find(g => g.id === plazoAbierto.goalId) : undefined;

    const filaMeta = (goal: Goal, i: number, gi: number) => {
        const subs = subsDe(goal.id);
        const columnas = (
            <Columnas
                goal={goal} subs={subs} dailyBlocks={dailyBlocks} movil={movil}
                onAbrirSub={id => setSubAbierta(id)}
                onAbrirPlazo={plazo => setPlazoAbierto({ goalId: goal.id, plazo })}
                onNuevaSub={plazo => setForm({ tipo: 'sub', padre: goal, inicial: { horizon: plazo } })}
                onToggleTarea={mid => toggleGoalMilestone(goal.id, mid)}
            />
        );
        const tarjeta = (
            <TarjetaMeta
                goal={goal} subs={subs} dailyBlocks={dailyBlocks} movil={movil}
                expandido={movil && expandedId === goal.id}
                onToggleExpand={() => movil && setExpandedId(expandedId === goal.id ? null : goal.id)}
                onSetStatus={status => updateGoal(goal.id, { status })}
                onEditar={() => setForm({ tipo: 'meta', goal })}
                onRemove={() => { if (subs.length === 0 || window.confirm(`Se borrará "${goal.title}" y sus ${subs.length} sub-meta(s).`)) removeGoal(goal.id); }}
                onUpdate={u => updateGoal(goal.id, u)}
                onSubir={reorderGoals && puedeMover(gi, i, -1) ? () => mover(gi, goal.id, -1) : undefined}
                onBajar={reorderGoals && puedeMover(gi, i, 1) ? () => mover(gi, goal.id, 1) : undefined}
                onArrastrar={reorderGoals && !movil ? {
                    start: ev => {
                        ev.dataTransfer.effectAllowed = 'move';
                        ev.dataTransfer.setData('text/plain', String(goal.id));
                        const fila = (ev.currentTarget as HTMLElement).closest('[data-meta-fila]') as HTMLElement | null;
                        if (fila) ev.dataTransfer.setDragImage(fila, 24, 24);
                        setArrastrando(goal.id);
                    },
                    end: () => { setArrastrando(null); setSobreMeta(null); },
                } : undefined}
                toggleDailyBlock={toggleDailyBlock} updateDailyBlock={updateDailyBlock} linkTaskToGoal={linkTaskToGoal}
            >
                {movil && columnas}
            </TarjetaMeta>
        );
        return movil ? <Fragment key={goal.id}>{tarjeta}</Fragment> : (
            <div
                key={goal.id} data-meta-fila
                onDragOver={arrastrando != null ? ev => { ev.preventDefault(); if (sobreMeta !== goal.id) setSobreMeta(goal.id); } : undefined}
                onDrop={arrastrando != null ? ev => { ev.preventDefault(); soltarMeta(goal.id); } : undefined}
                style={{
                    display: 'flex', gap: '12px', alignItems: 'stretch', borderRadius: '16px',
                    opacity: arrastrando === goal.id ? 0.45 : 1,
                    outline: sobreMeta === goal.id && arrastrando !== goal.id ? `2px dashed ${C.primary}` : 'none', outlineOffset: '4px',
                }}
            >
                <div style={{ width: '260px', flexShrink: 0 }}>{tarjeta}</div>
                <div style={{ flex: 1, minWidth: 0 }}>{columnas}</div>
            </div>
        );
    };

    if (metaPlazo && plazoAbierto) {
        return (
            <PlazoModal pagina
                removeDailyBlock={removeDailyBlock}
                onCambiarPlazo={k => setPlazoAbierto({ goalId: metaPlazo.id, plazo: k })}
                goal={metaPlazo} plazo={plazoAbierto?.plazo ?? null} movil={movil}
                onClose={() => setPlazoAbierto(null)}
                onAdd={t => metaPlazo && plazoAbierto && addGoalMilestone(metaPlazo.id, t, plazoAbierto.plazo)}
                onToggle={mid => metaPlazo && toggleGoalMilestone(metaPlazo.id, mid)}
                onRemove={mid => metaPlazo && removeGoalMilestone(metaPlazo.id, mid)}
                onUpdate={u => metaPlazo && updateGoal(metaPlazo.id, u)}
                onAbrirTarea={mid => { if (metaPlazo && plazoAbierto) { setDetalle({ goalId: metaPlazo.id, milestoneId: mid, plazo: plazoAbierto.plazo }); setPlazoAbierto(null); } }}
                addDailyBlock={addDailyBlock}
                dailyBlocks={dailyBlocks} toggleDailyBlock={toggleDailyBlock} updateDailyBlock={updateDailyBlock} linkTaskToGoal={linkTaskToGoal}
            />
        );
    }

    const metaDetalle = detalle ? goals.find(g => g.id === detalle.goalId) : undefined;
    const tareaDetalle = metaDetalle?.milestones.find(m => m.id === detalle?.milestoneId);
    if (detalle && metaDetalle && tareaDetalle) {
        return (
            <TareaDetalle
                goal={metaDetalle} tarea={tareaDetalle} plazo={detalle.plazo} movil={movil} dailyBlocks={dailyBlocks}
                onVolver={() => { setPlazoAbierto({ goalId: detalle.goalId, plazo: detalle.plazo }); setDetalle(null); }}
                onUpdate={u => updateGoal(metaDetalle.id, u)}
                onToggle={mid => toggleGoalMilestone(metaDetalle.id, mid)}
                onRemove={mid => removeGoalMilestone(metaDetalle.id, mid)}
                toggleDailyBlock={toggleDailyBlock} updateDailyBlock={updateDailyBlock} linkTaskToGoal={linkTaskToGoal} addDailyBlock={addDailyBlock}
            />
        );
    }

    return (
        <div style={paddingPagina(movil)}>
            {raiz.length === 0 && (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: C.onSurfaceVariant }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '36px', color: C.outlineVariant, display: 'block', marginBottom: '8px' }}>flag</span>
                    <p style={{ margin: 0, fontSize: '0.82rem' }}>Todavía no hay metas acá.</p>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {grupos.map((gr, gi) => (
                    <section key={gr.proyecto?.id ?? 'sin'} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {conVisiones && (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.outline }}>
                                    {gr.proyecto ? '🧭 Visión' : 'Sin visión'}
                                </span>
                                {gr.proyecto && <span style={{ fontSize: '0.95rem', fontWeight: 800, color: gr.proyecto.color || C.onSurface }}>{gr.proyecto.name}</span>}
                            </div>
                        )}
                        <AnimatePresence initial={false}>
                            {gr.metas.map((g, i) => filaMeta(g, i, gi))}
                        </AnimatePresence>
                    </section>
                ))}
            </div>

            <NuevaMetaModal
                open={!!form} movil={movil} tipo={form?.tipo ?? 'meta'} editando={!!form?.goal}
                inicial={form?.goal ? aForm(form.goal) : form?.tipo === 'sub' ? form.inicial : undefined}
                padre={form?.tipo === 'sub' ? form.padre : undefined}
                projects={projects} onCrearVision={addProject}
                onClose={() => setForm(null)} onSave={guardarForm}
            />

            <SubMetaModal
                sub={sub} padre={padreDeSub} movil={movil} dailyBlocks={dailyBlocks} toggleDailyBlock={toggleDailyBlock} updateDailyBlock={updateDailyBlock} linkTaskToGoal={linkTaskToGoal} addDailyBlock={addDailyBlock}
                onClose={() => setSubAbierta(null)}
                onUpdate={u => sub && updateGoal(sub.id, u)}
                onEditar={() => sub && padreDeSub && setForm({ tipo: 'sub', padre: padreDeSub, goal: sub })}
                onSiguiente={() => {
                    if (!sub || !padreDeSub) return;
                    const orden: GoalHorizon[] = ['corto', 'mediano', 'largo'];
                    const sig = orden[Math.min(orden.indexOf(sub.horizon) + 1, 2)];
                    setSubAbierta(null);
                    setForm({ tipo: 'sub', padre: padreDeSub, inicial: { title: sub.title, unidad: sub.unidad || '', horizon: sig } });
                }}
                onRemove={() => { if (sub) { removeGoal(sub.id); setSubAbierta(null); } }}
                onMover={reorderGoals && sub && hermanasDeSub(sub).length > 1 ? dir => moverSub(hermanasDeSub(sub), sub.id, dir) : undefined}
                posicion={sub ? { i: hermanasDeSub(sub).findIndex(g => g.id === sub.id), n: hermanasDeSub(sub).length } : undefined}
                onAddTarea={t => sub && addGoalMilestone(sub.id, t)}
                onToggleTarea={mid => sub && toggleGoalMilestone(sub.id, mid)}
                onRemoveTarea={mid => sub && removeGoalMilestone(sub.id, mid)}
            />
        </div>
    );
};

/* ─── Tarjeta de la meta (izquierda en escritorio; en móvil se expande) ─── */

interface TarjetaMetaProps {
    goal: Goal;
    subs: Goal[];
    dailyBlocks: DailyBlock[];
    movil: boolean;
    expandido: boolean;
    onToggleExpand: () => void;
    onSetStatus: (status: GoalStatus) => void;
    onEditar: () => void;
    onRemove: () => void;
    onUpdate: (updates: Partial<Goal>) => void;
    onSubir?: () => void;
    onBajar?: () => void;
    onArrastrar?: { start: (ev: React.DragEvent) => void; end: () => void };
    toggleDailyBlock?: (id: number) => void;
    updateDailyBlock?: (id: number, updates: Partial<DailyBlock>) => void;
    linkTaskToGoal?: (blockId: number, goalId: number | undefined) => void;
    children?: React.ReactNode;
}

const TarjetaMeta = ({ goal, subs, dailyBlocks, movil, expandido, onToggleExpand, onSetStatus, onEditar, onRemove, onUpdate, onSubir, onBajar, onArrastrar, toggleDailyBlock, updateDailyBlock, linkTaskToGoal, children }: TarjetaMetaProps) => {
    const [menu, setMenu] = useState(false);
    const [detalles, setDetalles] = useState(false);
    const av = avance(goal, subs, dailyBlocks);
    const restantes = diasRestantes(goal.targetDate);
    // El estado fluye solo: una meta "pendiente" que ya avanzó se ve "en progreso", y cuando llega
    // al 100% se ofrece marcarla lograda. Lograda solo se marca a propósito (nunca con un clic suelto).
    const estado: GoalStatus = goal.status === 'pendiente' && av.pct > 0 ? 'en-progreso' : goal.status;
    const status = STATUS_INFO[estado];
    const listaParaLograr = goal.status !== 'completado' && av.pct === 100 && !!av.texto;
    const [estadoAbierto, setEstadoAbierto] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
            style={{
                height: movil ? undefined : '100%', boxSizing: 'border-box', borderRadius: '12px',
                border: `1px solid ${C.outlineVariant}`,
                background: goal.status === 'completado' ? 'rgba(16,185,129,0.04)' : C.surfaceContainerLow,
            }}
        >
            <div style={{ padding: '10px 12px', cursor: movil ? 'pointer' : 'default' }} onClick={onToggleExpand}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem', flexShrink: 0, lineHeight: 1.3 }}>{goal.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: C.onSurface, textDecoration: goal.status === 'completado' ? 'line-through' : 'none', wordBreak: 'break-word' }}>
                            {goal.title}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: `${goal.color}22`, color: goal.color }}>
                                {goal.area}
                            </span>
                            <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={() => setEstadoAbierto(v => !v)}
                                    title="Cambiar el estado de la meta"
                                    style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px 2px 5px', borderRadius: '999px', background: status.bg, color: status.color, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>{STATUS_ICONO[estado]}</span>
                                    {status.label}
                                    <span className="material-symbols-outlined" style={{ fontSize: '13px', marginLeft: '-1px' }}>expand_more</span>
                                </button>
                                {estadoAbierto && (
                                    <>
                                        <div onClick={() => setEstadoAbierto(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
                                        <div style={{ position: 'absolute', left: 0, top: '26px', zIndex: 21, minWidth: '160px', background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '4px' }}>
                                            {STATUS_ORDEN.map(k => (
                                                <button
                                                    key={k}
                                                    onClick={() => { onSetStatus(k); setEstadoAbierto(false); }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', background: goal.status === k ? STATUS_INFO[k].bg : 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 700, color: STATUS_INFO[k].color }}
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{STATUS_ICONO[k]}</span>
                                                    {STATUS_INFO[k].label}
                                                    {goal.status === k && <span className="material-symbols-outlined" style={{ fontSize: '16px', marginLeft: 'auto' }}>check</span>}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            {listaParaLograr && (
                                <button
                                    onClick={e => { e.stopPropagation(); onSetStatus('completado'); }}
                                    title="Llegaste al 100%: márcala como lograda"
                                    style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px 2px 5px', borderRadius: '999px', background: STATUS_INFO.completado.color, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check_circle</span>
                                    ¡Márcala lograda!
                                </button>
                            )}
                            {goal.targetDate && (
                                <span style={{ fontSize: '0.68rem', color: restantes !== null && restantes < 0 && goal.status !== 'completado' ? C.rojo : C.outline, fontWeight: 600 }}>
                                    {restantes !== null && goal.status !== 'completado'
                                        ? restantes >= 0 ? `${restantes}d restantes` : `${Math.abs(restantes)}d de retraso`
                                        : new Date(goal.targetDate + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            )}
                        </div>
                        {(av.texto || goal.objetivo) && (
                            <div style={{ marginTop: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: C.onSurfaceVariant, fontFamily: MONO, marginBottom: '4px' }}>
                                    <span>{av.texto}</span><span style={{ color: goal.color }}>{av.pct}%</span>
                                </div>
                                <Barra pct={av.pct} color={goal.color} />
                            </div>
                        )}
                    </div>
                    <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setMenu(m => !m)}
                            title={onArrastrar ? 'Opciones · arrástrala para ordenar' : 'Opciones'}
                            draggable={!!onArrastrar}
                            onDragStart={onArrastrar?.start}
                            onDragEnd={onArrastrar?.end}
                            style={{ background: 'none', border: 'none', cursor: onArrastrar ? 'grab' : 'pointer', color: C.outline, width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>more_vert</span>
                        </button>
                        {menu && (
                            <>
                                <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
                                <div style={{ position: 'absolute', right: 0, top: '34px', zIndex: 21, minWidth: '170px', background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '4px' }}>
                                    <MenuItem icono="edit" texto="Editar meta" onClick={() => { setMenu(false); onEditar(); }} />
                                    {/* Subir/Bajar dejan el menú abierto para mover varias posiciones seguidas. */}
                                    {onSubir && <MenuItem icono="arrow_upward" texto="Subir" onClick={onSubir} />}
                                    {onBajar && <MenuItem icono="arrow_downward" texto="Bajar" onClick={onBajar} />}
                                    <MenuItem icono="notes" texto={detalles ? 'Ocultar notas' : 'Notas y tareas'} onClick={() => { setMenu(false); setDetalles(v => !v); }} />
                                    <MenuItem icono="delete" texto="Eliminar" color={C.rojo} onClick={() => { setMenu(false); onRemove(); }} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
                {goal.objetivo ? (
                    <div onClick={e => e.stopPropagation()} style={{ marginTop: '8px' }}>
                        <AvanceNumero goal={goal} onUpdate={onUpdate} movil={movil} />
                    </div>
                ) : null}
            </div>

            {(detalles || (movil && expandido)) && (
                <div onClick={e => e.stopPropagation()} style={{ padding: '10px 12px 12px', borderTop: `1px solid ${C.outlineVariant}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {movil && expandido && children}
                    {(detalles || (movil && expandido)) && (
                        <>
                            <textarea
                                value={goal.description || ''}
                                onChange={e => onUpdate({ description: e.target.value })}
                                placeholder="Notas / plan..."
                                rows={2}
                                style={{ ...campo(movil), width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
                            />
                            <TareasEnlazadas goal={goal} dailyBlocks={dailyBlocks} toggleDailyBlock={toggleDailyBlock} updateDailyBlock={updateDailyBlock} linkTaskToGoal={linkTaskToGoal} movil={movil} />
                        </>
                    )}
                </div>
            )}
        </motion.div>
    );
};

const MenuItem = ({ icono, texto, onClick, color = C.onSurface }: { icono: string; texto: string; onClick: () => void; color?: string }) => (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 12px', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color, fontFamily: 'inherit' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icono}</span> {texto}
    </button>
);

// "Llevo [ 3200 ] de S/ 10,000" con − / + para avanzar rápido.
const AvanceNumero = ({ goal, onUpdate, movil }: { goal: Goal; onUpdate: (u: Partial<Goal>) => void; movil: boolean }) => {
    const [txt, setTxt] = useState<string | null>(null);
    const actual = actualVigente(goal);
    const paso = (goal.objetivo ?? 0) >= 1000 ? 100 : 1;
    const fijar = (n: number) => onUpdate({ actual: Math.max(0, n), periodoClave: goal.periodo ? clavePeriodo(goal.periodo) : undefined, status: goal.objetivo && !goal.periodo && n >= goal.objetivo ? 'completado' : goal.status === 'completado' ? 'en-progreso' : goal.status });
    const boton: React.CSSProperties = { width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${C.outlineVariant}`, background: C.surfaceLowest, color: C.onSurfaceVariant, cursor: 'pointer', fontWeight: 800, fontSize: '1rem', fontFamily: 'inherit', flexShrink: 0 };
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', color: C.outline, fontWeight: 600 }}>Llevo</span>
            <button type="button" onClick={() => fijar(actual - paso)} style={boton} title={`-${paso}`}>−</button>
            <input
                type="number" inputMode="decimal" value={txt ?? String(actual)}
                onFocus={e => { setTxt(String(actual)); e.currentTarget.select(); }}
                onChange={e => setTxt(e.target.value)}
                onBlur={() => { const n = parseFloat(txt ?? ''); if (isFinite(n)) fijar(n); setTxt(null); }}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                aria-label="Avance actual"
                style={{ ...campo(movil), flex: 1, minWidth: 0, width: '70px', padding: '6px 8px', textAlign: 'center', fontFamily: MONO, boxSizing: 'border-box' }}
            />
            <button type="button" onClick={() => fijar(actual + paso)} style={boton} title={`+${paso}`}>+</button>
        </div>
    );
};

/* ─── Columnas Corto → Mediano → Largo con sub-metas y tareas sueltas ─── */

interface ColumnasProps {
    goal: Goal;
    subs: Goal[];
    dailyBlocks: DailyBlock[];
    movil: boolean;
    onAbrirSub: (id: number) => void;
    onAbrirPlazo: (plazo: GoalHorizon) => void;
    onNuevaSub: (plazo: GoalHorizon) => void;
    onToggleTarea?: (milestoneId: number) => void;
    onAbrirTarea?: (plazo: GoalHorizon, milestoneId: number) => void;
}

const Columnas = ({ goal, subs, dailyBlocks, movil, onAbrirSub, onAbrirPlazo, onNuevaSub, onToggleTarea, onAbrirTarea }: ColumnasProps) => (
    <div style={{ display: 'flex', flexDirection: movil ? 'column' : 'row', alignItems: 'stretch', gap: movil ? '4px' : '0', height: movil ? undefined : '100%' }}>
        {PLAZOS_INFO.map((pl, idx) => {
            const subsPlazo = subs.filter(s => s.horizon === pl.k);
            const tareas = goal.milestones.filter(m => (m.plazo ?? 'corto') === pl.k);
            const pendientes = tareas.filter(m => !m.completed);
            const accion: React.CSSProperties = { background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: goal.color, fontFamily: 'inherit' };
            return (
                <Fragment key={pl.k}>
                    {idx > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: goal.color, flexShrink: 0, padding: movil ? '0' : '0 8px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{movil ? 'arrow_downward' : 'arrow_forward'}</span>
                        </div>
                    )}
                    <div style={{
                        flex: 1, minWidth: 0, padding: '10px', borderRadius: '10px', boxSizing: 'border-box',
                        background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderTop: `3px solid ${goal.color}`,
                        display: 'flex', flexDirection: 'column', gap: '6px',
                    }}>
                        <button onClick={() => onAbrirPlazo(pl.k)} title="Ver tareas sueltas y renombrar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                            <span style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.outline }}>
                                {nombrePlazo(goal, pl.k)} <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>· {pl.sub}</span>
                            </span>
                            {tareas.length > 0 && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: C.outline, fontFamily: MONO }}>{tareas.length - pendientes.length}/{tareas.length}</span>}
                        </button>
                        {tareas.length > 0 && <Barra pct={Math.round(((tareas.length - pendientes.length) / tareas.length) * 100)} color={goal.color} alto={3} />}

                        {subsPlazo.map(s => <SubMetaChip key={s.id} sub={s} color={goal.color} dailyBlocks={dailyBlocks} onClick={() => onAbrirSub(s.id)} />)}

                        {pendientes.slice(0, 3).map(m => (
                            <Fragment key={m.id}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '2px 0' }}>
                                
                                <span onClick={() => (onAbrirTarea ? onAbrirTarea(pl.k, m.id) : onAbrirPlazo(pl.k))} title={m.text} style={{ flex: 1, minWidth: 0, fontSize: '0.8rem', lineHeight: 1.3, color: C.onSurface, cursor: 'pointer', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{m.text}</span>
                                {!!m.pasos?.some(p => !p.repetitiva) && <span style={{ fontSize: '0.66rem', fontWeight: 700, color: C.outline, fontFamily: MONO, whiteSpace: 'nowrap' }}>{m.pasos.filter(p => !p.repetitiva && p.completed).length}/{m.pasos.filter(p => !p.repetitiva).length}</span>}
                                {!!m.pasos?.some(p => p.repetitiva) && <span className="material-symbols-outlined" title="Tiene tareas repetitivas" style={{ fontSize: '14px', color: goal.color }}>repeat</span>}
                            </div>
                            {m.pasos?.filter(p => p.repetitiva || !p.completed).slice(0, 3).map(p => {
                                const rep = p.repetitiva ? tareasDeMeta(goal.id, dailyBlocks).find(t => t.repetitiva && t.label.trim().toLowerCase() === p.text.trim().toLowerCase()) : undefined;
                                return (
                                <div key={p.id} onClick={() => (onAbrirTarea ? onAbrirTarea(pl.k, m.id) : onAbrirPlazo(pl.k))} style={{ display: 'flex', alignItems: 'center', gap: '7px', margin: '-2px 0 0 10px', fontSize: '0.74rem', color: C.onSurfaceVariant, cursor: 'pointer', minWidth: 0 }}>
                                    {p.repetitiva
                                        ? <span className="material-symbols-outlined" style={{ fontSize: '12px', color: goal.color, flexShrink: 0 }}>repeat</span>
                                        : <span style={{ width: '10px', height: '10px', borderRadius: '3px', border: `1.5px solid ${goal.color}`, flexShrink: 0, opacity: 0.8 }} />}
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.text}</span>
                                    {rep?.dias?.length ? <span style={{ fontSize: '0.64rem', fontWeight: 700, color: goal.color, whiteSpace: 'nowrap' }}>{etiquetaDias(rep.dias)}</span> : null}
                                </div>
                                );
                            })}
                            </Fragment>
                        ))}
                        {pendientes.length > 3 && <button onClick={() => onAbrirPlazo(pl.k)} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.72rem', fontWeight: 600, color: C.outline }}>+{pendientes.length - 3} más</button>}
                        {tareas.length > 0 && pendientes.length === 0 && <div style={{ fontSize: '0.76rem', color: C.outline }}>✓ Todo hecho</div>}
                        {subsPlazo.length === 0 && tareas.length === 0 && <div style={{ fontSize: '0.78rem', color: C.outline }}>Nada todavía</div>}

                        <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', flexWrap: 'wrap' }}>
                            <button onClick={() => onNuevaSub(pl.k)} style={accion}>+ Sub-meta</button>
                            <button onClick={() => onAbrirPlazo(pl.k)} style={{ ...accion, color: C.outline }}>{tareas.length ? 'Tareas' : '+ Tarea'}</button>
                        </div>
                    </div>
                </Fragment>
            );
        })}
    </div>
);

const SubMetaChip = ({ sub, color, dailyBlocks, onClick }: { sub: Goal; color: string; dailyBlocks: DailyBlock[]; onClick: () => void }) => {
    const av = avance(sub, [], dailyBlocks);
    const lograda = sub.status === 'completado';
    const pendientes = sub.milestones.filter(m => !m.completed);
    return (
        <button onClick={onClick} style={{
            textAlign: 'left', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${lograda ? 'rgba(16,185,129,0.35)' : C.outlineVariant}`, background: lograda ? 'rgba(16,185,129,0.06)' : C.surfaceContainerLow,
            display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', boxSizing: 'border-box',
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ fontSize: '0.85rem', lineHeight: 1.3 }}>{lograda ? '✅' : '🎯'}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: '0.82rem', fontWeight: 700, color: lograda ? C.outline : C.onSurface, textDecoration: lograda ? 'line-through' : 'none', wordBreak: 'break-word' }}>{sub.title}</span>
                {av.texto && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: C.outline, fontFamily: MONO, whiteSpace: 'nowrap' }}>{av.texto}</span>}
            </div>
            {av.texto && !lograda && <Barra pct={av.pct} color={color} alto={3} />}
            {!lograda && pendientes.slice(0, 2).map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.76rem', color: C.onSurfaceVariant, paddingLeft: '20px', minWidth: 0 }}>
                    <span style={{ width: '11px', height: '11px', borderRadius: '50%', border: `1.5px solid ${color}`, flexShrink: 0, opacity: 0.8 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.text}</span>
                </div>
            ))}
            {!lograda && pendientes.length > 2 && <div style={{ fontSize: '0.7rem', color: C.outline, paddingLeft: '20px' }}>+{pendientes.length - 2} más</div>}
        </button>
    );
};

/* ─── Tareas de Tareas/Mi Día enlazadas a una meta ─── */

const TareasEnlazadas = ({ goal, dailyBlocks, toggleDailyBlock, updateDailyBlock, linkTaskToGoal, movil }: { goal: Goal; dailyBlocks: DailyBlock[]; toggleDailyBlock?: (id: number) => void; updateDailyBlock?: (id: number, updates: Partial<DailyBlock>) => void; linkTaskToGoal?: (blockId: number, goalId: number | undefined) => void; movil: boolean }) => {
    if (!linkTaskToGoal) return null;
    const enlazadas = tareasDeMeta(goal.id, dailyBlocks);
    // Para enlazar: sueltas pendientes y una fila por cada repetitiva (la serie entera).
    const vistas = new Set<string>();
    const libres = dailyBlocks.filter(b => {
        if (b.goalId !== undefined) return false;
        if (!b.repeatDays?.length) return !b.completed;
        const k = `${b.label.trim().toLowerCase()}|${b.period}`;
        if (vistas.has(k)) return false;
        vistas.add(k);
        return b.isActive !== false;
    }).sort((a, b) => Number(!!b.repeatDays?.length) - Number(!!a.repeatDays?.length));
    return (
        <div>
            <div style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.outline, marginBottom: '6px' }}>
                Tareas de Mi Día que aportan
            </div>
            {enlazadas.map(t => {
                const pausada = t.repetitiva && !t.activa;
                // Pausar/activar la serie entera (misma etiqueta y período, ligada a esta meta), igual que en Tareas.
                const alternarActiva = () => {
                    const base = dailyBlocks.find(b => b.id === t.id);
                    if (!base || !updateDailyBlock) return;
                    dailyBlocks
                        .filter(b => b.goalId === goal.id && b.label.trim().toLowerCase() === base.label.trim().toLowerCase() && b.period === base.period)
                        .forEach(b => updateDailyBlock(b.id, { isActive: pausada }));
                };
                return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', margin: '0 -8px', borderRadius: '10px', opacity: pausada ? 0.55 : 1, background: pausada ? C.surfaceContainerLow : 'transparent' }}>
                    {t.repetitiva ? (
                        <span className="material-symbols-outlined" title="Repetitiva" style={{ fontSize: '20px', color: goal.color, width: '22px', flexShrink: 0 }}>repeat</span>
                    ) : (
                        <Check marcado={t.hecha} color={goal.color} onClick={() => toggleDailyBlock?.(t.id)} />
                    )}
                    <span style={{ flex: 1, minWidth: 0, fontSize: '0.88rem', color: !t.repetitiva && t.hecha ? C.outline : C.onSurface, textDecoration: !t.repetitiva && t.hecha ? 'line-through' : 'none', wordBreak: 'break-word' }}>
                        {t.label}
                        {t.repetitiva && t.semana && (
                            <span style={{ display: 'block', color: C.outline, fontSize: '0.72rem', fontWeight: 600 }}>
                                {pausada ? 'Pausada · no cuenta en el avance' : `${t.dias?.length ? etiquetaDias(t.dias) + ' · ' : ''}esta semana ${t.semana.hechos}/${t.semana.toca}${t.hecha ? ' · hoy ✓' : ''}`}
                            </span>
                        )}
                    </span>
                    {t.repetitiva && updateDailyBlock && (
                        <button onClick={alternarActiva} title={pausada ? 'Activar' : 'Pausar'} style={{ background: pausada ? goal.color : 'none', border: pausada ? 'none' : `1px solid ${C.outlineVariant}`, borderRadius: '8px', cursor: 'pointer', color: pausada ? '#fff' : C.outline, display: 'flex', alignItems: 'center', gap: '2px', padding: pausada ? '3px 8px' : '2px', fontFamily: 'inherit', fontSize: '0.7rem', fontWeight: 700 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{pausada ? 'play_arrow' : 'pause'}</span>
                            {pausada && 'Activar'}
                        </button>
                    )}
                    <button onClick={() => linkTaskToGoal(t.id, undefined)} title="Desenlazar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>link_off</span>
                    </button>
                </div>
                );
            })}
            <select
                value=""
                onChange={e => { const id = Number(e.target.value); if (id) linkTaskToGoal(id, goal.id); }}
                style={{ ...campo(movil), width: '100%', marginTop: '8px', boxSizing: 'border-box', color: C.onSurfaceVariant }}
            >
                <option value="">{libres.length ? '+ Enlazar una tarea de Mi Día…' : 'No hay tareas para enlazar'}</option>
                {libres.map(b => <option key={b.id} value={b.id}>{b.repeatDays?.length ? '🔁 ' : ''}{b.label}</option>)}
            </select>
        </div>
    );
};

// Tarea de Mi Día ligada a la meta, mostrada como una fila más de la lista (repetitiva: con sus días).
const FilasEnlazadas = ({ goal, dailyBlocks, toggleDailyBlock, updateDailyBlock, linkTaskToGoal, movil, incluir, excluir, compacto, asignar, plano, onBorrar }: { onBorrar?: (t: TareaEnlazada) => void; plano?: boolean; incluir?: string[]; excluir?: string[]; compacto?: boolean; asignar?: { tareas: Tarea[]; onAsignar: (milestoneId: number, texto: string) => void }; goal: Goal; dailyBlocks: DailyBlock[]; toggleDailyBlock?: (id: number) => void; updateDailyBlock?: (id: number, updates: Partial<DailyBlock>) => void; linkTaskToGoal?: (blockId: number, goalId: number | undefined) => void; movil: boolean }) => (
    <>
        {tareasDeMeta(goal.id, dailyBlocks).filter(t => {
            const k = t.label.trim().toLowerCase();
            if (incluir) return incluir.some(x => x.trim().toLowerCase() === k);
            return !excluir?.some(x => x.trim().toLowerCase() === k);
        }).map(t => {
            const pausada = t.repetitiva && !t.activa;
            const alternarActiva = () => {
                const base = dailyBlocks.find(b => b.id === t.id);
                if (!base || !updateDailyBlock) return;
                dailyBlocks
                    .filter(b => b.goalId === goal.id && b.label.trim().toLowerCase() === base.label.trim().toLowerCase() && b.period === base.period)
                    .forEach(b => updateDailyBlock(b.id, { isActive: pausada }));
            };
            return (
                <div key={t.id} style={compacto
                    ? { padding: '8px 0', display: 'flex', alignItems: 'center', gap: '12px', opacity: pausada ? 0.55 : 1 }
                    : plano ? { padding: movil ? '10px 2px' : '10px 4px', borderBottom: `1px solid ${C.outlineVariant}`, opacity: pausada ? 0.55 : 1, display: 'flex', alignItems: 'center', gap: movil ? '12px' : '16px' }
                    : { padding: movil ? '12px 14px' : '16px 20px', marginBottom: '12px', borderRadius: '16px', boxSizing: 'border-box', background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, opacity: pausada ? 0.55 : 1, display: 'flex', alignItems: 'center', gap: movil ? '12px' : '16px' }}>
                    <Check cuadrado={compacto} marcado={t.hecha} color={goal.color} tam={compacto ? 18 : 26} onClick={() => toggleDailyBlock?.(t.id)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.95rem', color: !t.repetitiva && t.hecha ? C.outline : C.onSurface, textDecoration: !t.repetitiva && t.hecha ? 'line-through' : 'none', wordBreak: 'break-word' }}>{t.label}</div>
                        {t.repetitiva && t.semana && (
                            <div style={{ color: C.outline, fontSize: '0.74rem', fontWeight: 600, marginTop: '2px' }}>
                                <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', fontSize: '14px' }}>repeat</span> {pausada ? 'Pausada · no cuenta en el avance' : `${t.dias?.length ? etiquetaDias(t.dias) + ' · ' : ''}esta semana ${t.semana.hechos}/${t.semana.toca}${t.hecha ? ' · hoy ✓' : ''}`}
                            </div>
                        )}
                    </div>
                    {t.repetitiva && asignar && asignar.tareas.length > 0 && (
                        <SelectPropio value="" onChange={e => asignar.onAsignar(Number(e.target.value), t.label)} style={{ padding: '6px 10px', border: `1px dashed ${C.outlineVariant}`, borderRadius: '10px', fontSize: '0.74rem', fontWeight: 700, color: C.outline, flexShrink: 0, maxWidth: '190px' }}>
                            <option value="">Asignar a una tarea…</option>
                            {asignar.tareas.map(x => <option key={x.id} value={x.id}>{x.text}</option>)}
                        </SelectPropio>
                    )}
                    {t.repetitiva && updateDailyBlock && (
                        <button onClick={alternarActiva} title={pausada ? 'Activar' : 'Pausar'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{pausada ? 'play_arrow' : 'pause'}</span>
                        </button>
                    )}
                    {onBorrar && (
                        <button onClick={() => onBorrar(t)} title="Borrar tarea" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.rojo, display: 'flex', padding: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                        </button>
                    )}
                    {linkTaskToGoal && (
                        <button onClick={() => linkTaskToGoal(t.id, undefined)} title="Quitar de esta meta" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>link_off</span>
                        </button>
                    )}
                </div>
            );
        })}
    </>
);

const Check = ({ marcado, color, onClick, tam = 22, cuadrado }: { marcado: boolean; color: string; onClick: () => void; tam?: number; cuadrado?: boolean }) => (
    <button
        onClick={onClick}
        title={marcado ? 'Marcar como pendiente' : 'Marcar como hecha'}
        style={{
            width: `${tam}px`, height: `${tam}px`, borderRadius: cuadrado ? '6px' : '50%', flexShrink: 0, padding: 0, cursor: 'pointer',
            background: marcado ? color : 'transparent', border: `2px solid ${marcado ? color : C.outlineVariant}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, border-color 0.15s',
        }}
    >
        {marcado && <span style={{ color: '#fff', fontSize: `${Math.round(tam * 0.55)}px`, fontWeight: 900, lineHeight: 1 }}>✓</span>}
    </button>
);

// Texto de una tarea que se edita tocándolo: Enter o salir guarda, Escape cancela.
const TareaEditable = ({ texto, completada, onGuardar, grande }: { texto: string; completada: boolean; onGuardar: (t: string) => void; grande?: boolean }) => {
    const [draft, setDraft] = useState<string | null>(null);
    const estilo: React.CSSProperties = { flex: 1, minWidth: 0, fontSize: grande ? '1.5rem' : '0.92rem', fontWeight: grande ? 800 : undefined, lineHeight: 1.35, wordBreak: 'break-word', fontFamily: 'inherit' };
    if (draft === null) return (
        <span onClick={() => setDraft(texto)} title="Toca para editar" style={{ ...estilo, cursor: 'text', color: completada ? C.outline : C.onSurface, textDecoration: completada ? 'line-through' : 'none' }}>{texto}</span>
    );
    const guardar = () => { const t = draft.trim(); if (t && t !== texto) onGuardar(t); setDraft(null); };
    return (
        <textarea
            autoFocus value={draft} rows={1}
            onChange={e => setDraft(e.target.value)}
            onFocus={e => { const el = e.currentTarget; el.setSelectionRange(el.value.length, el.value.length); el.style.height = el.scrollHeight + 'px'; }}
            onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); guardar(); } if (e.key === 'Escape') { e.stopPropagation(); setDraft(null); } }}
            onBlur={guardar}
            style={{ ...estilo, resize: 'none', overflow: 'hidden', border: `1px solid ${C.primary}`, borderRadius: '8px', padding: '4px 8px', outline: 'none', color: C.onSurface, background: C.surfaceLowest }}
        />
    );
};

// Lista de tareas con check, edición en línea, quitar y agregar.
type Tarea = Goal['milestones'][number];
type Paso = NonNullable<Tarea['pasos']>[number];
const DIAS_SEMANA: { l: string; d: number }[] = [{ l: 'L', d: 1 }, { l: 'M', d: 2 }, { l: 'X', d: 3 }, { l: 'J', d: 4 }, { l: 'V', d: 5 }, { l: 'S', d: 6 }, { l: 'D', d: 0 }];

const ListaTareas = ({ tareas, color, movil, onToggle, onRemove, onEditar, onAdd, onCambiar, onConvertir, extra, repDe, onToggleRep, onAbrir, detalle, plano, onBorrarRep }: {
    onBorrarRep?: (t: TareaEnlazada | undefined, texto: string) => void; // borra la repetitiva de un paso
    plano?: boolean; // filas planas separadas por una línea, sin tarjetas
    // En lista: tocar la tarea abre su pantalla de detalle. `detalle`: se muestra una sola tarea a pantalla completa, sin tarjeta.
    onAbrir?: (id: number) => void;
    detalle?: boolean;
    // Pasos ya convertidos en repetitiva: datos de su serie (días, avance) y cómo marcar hoy.
    repDe?: (texto: string) => TareaEnlazada | undefined;
    onToggleRep?: (blockId: number) => void;
    extra?: React.ReactNode; // filas adicionales (ej. repetitivas enlazadas) dentro de la misma lista
    tareas: Goal['milestones']; color: string; movil: boolean;
    // Convierte un paso en tarea suelta ('suelta') o en tarea repetitiva (días de la semana, getDay).
    onConvertir?: (tarea: Tarea, paso: Paso, destino: 'suelta' | number[]) => void;
    onToggle: (id: number) => void; onRemove: (id: number) => void; onEditar: (id: number, t: string) => void; onAdd: (t: string) => void;
    onCambiar?: (id: number, updates: Partial<Goal['milestones'][number]>) => void;
}) => {
    const [texto, setTexto] = useState('');
    const [sobre, setSobre] = useState<number | null>(null);
    // Panel de pasos: por defecto abierto si la tarea ya tiene pasos; el usuario lo puede plegar/abrir.
    const [panel, setPanel] = useState<Record<number, boolean>>({});
    const [nuevoPaso, setNuevoPaso] = useState<Record<number, string>>({});
    // Paso con el menú de conversión abierto; `rep` = eligiendo los días de la repetitiva.
    const [conv, setConv] = useState<{ paso: number; rep: boolean; dias: number[] } | null>(null);
    const alternarPasos = (id: number, abiertaAhora: boolean) => setPanel(prev => ({ ...prev, [id]: !abiertaAhora }));
    // Cambia los pasos de una tarea; si hay pasos, la tarea queda hecha solo cuando todos lo están.
    const cambiarPasos = (m: Goal['milestones'][number], pasos: NonNullable<Goal['milestones'][number]['pasos']>) =>
        { const reales = pasos.filter(p => !p.repetitiva); onCambiar?.(m.id, { pasos, completed: reales.length ? reales.every(p => p.completed) : m.completed }); }
    const hechas = tareas.filter(m => m.completed).length;
    // Pendientes primero, hechas al final (el orden relativo se conserva).
    const ordenadas = [...tareas.filter(m => !m.completed), ...tareas.filter(m => m.completed)];
    return (
        <div>
            {tareas.length > 0 && !detalle && !plano && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '6px 0 18px' }}>
                    <div style={{ flex: 1 }}><Barra pct={Math.round((hechas / tareas.length) * 100)} color={color} alto={6} /></div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: C.outline, fontFamily: MONO }}>{hechas}/{tareas.length}</span>
                </div>
            )}
            {ordenadas.map(m => {
                const tot = m.pasos?.length || 0;
                const reales = (m.pasos || []).filter(p => !p.repetitiva);
                const np = reales.length;
                const pasosHechos = reales.filter(p => p.completed).length;
                const abierta = detalle || (panel[m.id] ?? (plano ? true : tot > 0));
                const panelVisible = detalle || abierta;
                return (
                <div
                    key={m.id}
                    onMouseEnter={() => setSobre(m.id)} onMouseLeave={() => setSobre(null)}
                    style={detalle ? { padding: 0 } : plano ? { padding: movil ? '10px 2px' : '10px 4px', borderBottom: `1px solid ${C.outlineVariant}` } : {
                        padding: movil ? '12px 14px' : '16px 20px', marginBottom: '12px', borderRadius: '16px', boxSizing: 'border-box',
                        background: m.completed ? C.surfaceContainerLow : C.surfaceLowest,
                        border: `1px solid ${abierta || sobre === m.id ? `color-mix(in srgb, ${color} 45%, ${C.outlineVariant})` : C.outlineVariant}`,
                        boxShadow: sobre === m.id && !m.completed ? '0 2px 10px rgba(12,42,32,0.06)' : 'none',
                        transition: 'border-color 0.12s, box-shadow 0.12s',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: movil ? '10px' : '12px' }}>
                        {onCambiar && !detalle && (
                            <button onClick={() => alternarPasos(m.id, abierta)} title={abierta ? 'Cerrar detalle' : 'Ver detalle'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: 0, marginLeft: '-6px', flexShrink: 0 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '22px', transform: abierta ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>chevron_right</span>
                            </button>
                        )}
                        <Check
                            marcado={m.completed} color={color} tam={26}
                            onClick={() => m.pasos?.length && onCambiar
                                ? onCambiar(m.id, { completed: !m.completed, pasos: m.pasos.map(p => p.repetitiva ? p : { ...p, completed: !m.completed }) })
                                : onToggle(m.id)}
                        />
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <TareaEditable grande={detalle} texto={m.text} completada={m.completed} onGuardar={t => onEditar(m.id, t)} />
                            {tot > 0 && !detalle && (() => {
                                const reps = (m.pasos || []).filter(p => p.repetitiva).map(p => repDe?.(p.text));
                                const dias = reps.filter(Boolean).map(r => r!.dias?.length ? etiquetaDias(r!.dias) : '');
                                const unicos = [...new Set(dias.filter(Boolean))];
                                const resumenDias = unicos.length === 1 ? unicos[0] : unicos.length > 1 ? 'varios días' : '';
                                return (
                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.74rem', fontWeight: 700 }}>
                                        {np > 0 && <span style={{ color: C.outline }}>{pasosHechos}/{np} pasos</span>}
                                        {reps.length > 0 && (
                                            <span style={{ color, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>repeat</span>
                                                {reps.length} repetitiva{reps.length !== 1 ? 's' : ''}{resumenDias ? ` · ${resumenDias}` : ''}
                                            </span>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                        {onCambiar && !detalle && (
                            <button
                                onClick={() => alternarPasos(m.id, abierta)} title={abierta ? 'Ocultar pasos' : 'Ver o agregar pasos'}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '999px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.7rem', fontWeight: 700,
                                    padding: '4px 9px 4px 7px', whiteSpace: 'nowrap', flexShrink: 0,
                                    color: tot ? color : C.outline,
                                    background: tot ? `color-mix(in srgb, ${color} 10%, white)` : 'transparent',
                                    border: `1px ${tot ? 'solid' : 'dashed'} ${tot ? `color-mix(in srgb, ${color} 35%, white)` : C.outlineVariant}`,
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{tot ? (np ? 'checklist' : 'repeat') : 'add'}</span>
                                <span style={{ fontFamily: np ? MONO : 'inherit' }}>{np ? `${pasosHechos}/${np}` : 'Pasos'}</span>
                            </button>
                        )}
                        {!detalle && <button onClick={() => onRemove(m.id)} title="Quitar tarea" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: '2px', flexShrink: 0, opacity: movil || sobre === m.id ? 0.9 : 0, transition: 'opacity 0.12s' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                        </button>}
                    </div>
                    {np > 0 && !abierta && (
                        <div style={{ margin: '8px 0 0 34px' }}><Barra pct={Math.round((pasosHechos / np) * 100)} color={color} alto={3} /></div>
                    )}
                    {onCambiar && panelVisible && (
                        <div style={{ margin: detalle ? '26px 0 2px 0' : plano ? '6px 0 4px 38px' : '14px 0 2px 12px', padding: '2px 0 2px 18px', borderLeft: `3px solid color-mix(in srgb, ${color} 40%, white)` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: tot ? '8px' : '4px' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color }}>Pasos</span>
                                {np > 0 && <div style={{ flex: 1 }}><Barra pct={Math.round((pasosHechos / np) * 100)} color={color} alto={5} /></div>}
                                {np > 0 && <span style={{ fontSize: '0.74rem', fontWeight: 700, color: C.outline, fontFamily: MONO }}>{pasosHechos}/{np}</span>}
                                {tot === 0 && !plano && <span style={{ fontSize: '0.78rem', color: C.outline }}>Divide esta tarea en partes más chicas.</span>}
                                {onAbrir && !detalle && (
                                    <button onClick={() => onAbrir(m.id)} title="Abrir en pantalla completa" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: C.outline, fontFamily: 'inherit', fontSize: '0.74rem', fontWeight: 700, padding: '2px 4px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_full</span> Abrir
                                    </button>
                                )}
                            </div>
                            {(m.pasos || []).map((p, pi) => {
                                const menu = conv?.paso === p.id ? conv : null;
                                return (
                                <div key={p.id} style={{ borderTop: pi > 0 ? `1px solid color-mix(in srgb, ${color} 10%, white)` : 'none' }}>
                                    {p.repetitiva ? (() => {
                                        const t = repDe?.(p.text);
                                        const pausada = !!t && !t.activa;
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 0', opacity: pausada ? 0.55 : 1 }}>
                                                <Check cuadrado marcado={!!t?.hecha} color={color} tam={18} onClick={() => t && onToggleRep?.(t.id)} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.92rem', color: C.onSurface, wordBreak: 'break-word' }}>{p.text}</div>
                                                    <div style={{ marginTop: '2px', fontSize: '0.72rem', fontWeight: 700, color }}>
                                                        <span style={{ verticalAlign: 'middle', fontSize: '14px' }} className="material-symbols-outlined">repeat</span>{' '}
                                                        {t?.dias?.length ? (
                                                            <span style={{ display: 'inline-flex', gap: '3px', verticalAlign: 'middle', marginRight: '8px' }}>
                                                                {DIAS_SEMANA.map(({ l, d }) => (
                                                                    <span key={d} title={etiquetaDias(t.dias!)} style={{ width: '18px', height: '18px', borderRadius: '5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 800, background: t.dias!.includes(d) ? color : C.surfaceContainer, color: t.dias!.includes(d) ? '#fff' : C.outline }}>{l}</span>
                                                                ))}
                                                            </span>
                                                        ) : null}
                                                        {t ? (pausada ? 'Pausada' : `${t.dias?.length ? '' : 'Repetitiva'}${t.semana ? `esta semana ${t.semana.hechos}/${t.semana.toca}` : ''}${t.hecha ? ' · hoy ✓' : ''}`) : 'Repetitiva'}
                                                    </div>
                                                </div>
                                                <button onClick={() => { if (onBorrarRep) { if (!window.confirm(`¿Quitar "${p.text}" y borrar su tarea repetitiva?`)) return; onBorrarRep(t, p.text); } cambiarPasos(m, (m.pasos || []).filter(x => x.id !== p.id)); }} title="Quitar y borrar la tarea repetitiva" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: '4px', opacity: 0.7 }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                                                </button>
                                            </div>
                                        );
                                    })() : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 0', opacity: p.completed ? 0.6 : 1 }}>
                                            <Check cuadrado marcado={p.completed} color={color} tam={18} onClick={() => cambiarPasos(m, (m.pasos || []).map(x => x.id === p.id ? { ...x, completed: !x.completed } : x))} />
                                            <TareaEditable texto={p.text} completada={p.completed} onGuardar={t => cambiarPasos(m, (m.pasos || []).map(x => x.id === p.id ? { ...x, text: t } : x))} />
                                            {onConvertir && (
                                                <button onClick={() => setConv(menu ? null : { paso: p.id, rep: false, dias: [1, 2, 3, 4, 5] })} title="Convertir en tarea suelta o repetitiva" style={{ background: 'none', border: 'none', cursor: 'pointer', color: menu ? color : C.outline, fontFamily: 'inherit', fontSize: '0.74rem', fontWeight: 700, padding: '2px 4px', whiteSpace: 'nowrap', textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: C.outlineVariant }}>
                                                    Convertir
                                                </button>
                                            )}
                                            <button onClick={() => cambiarPasos(m, (m.pasos || []).filter(x => x.id !== p.id))} title="Quitar paso" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: '4px', opacity: 0.7 }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                                            </button>
                                        </div>
                                    )}
                                    {menu && onConvertir && !p.repetitiva && (
                                        <div style={{ margin: '0 0 10px 30px', padding: '4px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.outline }}>Convertir este paso en…</div>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <button onClick={() => { onConvertir(m, p, 'suelta'); setConv(null); }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: `1px solid ${C.outlineVariant}`, background: C.surfaceLowest, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.8rem', color: C.onSurface }}>
                                                    Tarea suelta
                                                </button>
                                                <button onClick={() => setConv({ ...menu, rep: !menu.rep })}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: `1px solid ${menu.rep ? color : C.outlineVariant}`, background: menu.rep ? `color-mix(in srgb, ${color} 12%, white)` : C.surfaceLowest, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.8rem', color: menu.rep ? color : C.onSurface }}>
                                                    Tarea repetitiva
                                                </button>
                                            </div>
                                            {menu.rep && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        {DIAS_SEMANA.map(({ l, d }) => {
                                                            const on = menu.dias.includes(d);
                                                            return (
                                                                <button key={d} onClick={() => setConv({ ...menu, dias: on ? menu.dias.filter(x => x !== d) : [...menu.dias, d] })}
                                                                    style={{ width: '34px', height: '34px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '0.78rem', background: on ? color : C.surfaceContainer, color: on ? '#fff' : C.onSurfaceVariant }}>
                                                                    {l}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    <button disabled={menu.dias.length === 0} onClick={() => { onConvertir(m, p, menu.dias); setConv(null); }}
                                                        style={{ alignSelf: 'flex-start', padding: '9px 16px', borderRadius: '12px', border: 'none', background: menu.dias.length ? color : C.surfaceContainerHigh, color: '#fff', fontWeight: 800, fontSize: '0.82rem', cursor: menu.dias.length ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                                                        Crear repetitiva
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                            <form
                                onSubmit={e => {
                                    e.preventDefault();
                                    const t = (nuevoPaso[m.id] || '').trim();
                                    if (!t) return;
                                    cambiarPasos(m, [...(m.pasos || []), { id: Date.now() + Math.floor(Math.random() * 1000), text: t, completed: false }]);
                                    setNuevoPaso(prev => ({ ...prev, [m.id]: '' }));
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: tot ? '8px' : 0, padding: '10px 12px', borderRadius: '10px', background: C.surfaceLowest, border: `1px dashed ${C.outlineVariant}` }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: C.outline }}>add</span>
                                <input
                                    value={nuevoPaso[m.id] || ''} onChange={e => setNuevoPaso(prev => ({ ...prev, [m.id]: e.target.value }))}
                                    placeholder={tot ? 'Agregar otro paso…' : 'Primer paso de esta tarea…'} enterKeyHint="done"
                                    style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', padding: 0, fontFamily: 'inherit', fontSize: '0.9rem', color: C.onSurface, outline: 'none' }}
                                />
                            </form>
                        </div>
                    )}
                </div>
                );
            })}
            {!detalle && extra}
            {!detalle && <form onSubmit={e => { e.preventDefault(); if (texto.trim()) { onAdd(texto.trim()); setTexto(''); } }} style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <input
                    value={texto} onChange={e => setTexto(e.target.value)}
                    placeholder="Nueva tarea…" enterKeyHint="done"
                    style={{ ...campo(movil), flex: 1, minWidth: 0, padding: '13px 16px' }}
                />
                <button type="submit" disabled={!texto.trim()} title="Agregar" style={{
                    width: '50px', flexShrink: 0, border: 'none', borderRadius: '12px', cursor: texto.trim() ? 'pointer' : 'default',
                    background: texto.trim() ? color : C.surfaceContainerHigh, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <span className="material-symbols-outlined">add</span>
                </button>
            </form>}
        </div>
    );
};

// Hoja/ventana base para los dos modales de esta pantalla.
const Hoja = ({ abierta, movil, color, onClose, ancho = 480, children }: { abierta: boolean; movil: boolean; color: string; onClose: () => void; ancho?: number; children: React.ReactNode }) => {
    useEffect(() => {
        if (!abierta) return;
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [abierta, onClose]);
    return createPortal(
        <AnimatePresence>
            {abierta && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999, display: 'flex',
                        alignItems: movil ? 'flex-end' : 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: movil ? 0 : '20px',
                    }}
                >
                    <motion.div
                        onClick={e => e.stopPropagation()}
                        initial={{ y: movil ? 60 : 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: movil ? 60 : 20, opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        style={{
                            background: C.surfaceLowest, width: '100%', maxWidth: `${ancho}px`, maxHeight: movil ? '88dvh' : '86dvh', overflowY: 'auto', boxSizing: 'border-box',
                            borderRadius: movil ? '24px 24px 0 0' : '20px', padding: movil ? '20px 18px 24px' : '30px 34px 32px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.18)', borderTop: `4px solid ${color}`,
                        }}
                    >
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
};

const botonIcono: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: '4px' };

const BotonX = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} title="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: '4px' }}>
        <span className="material-symbols-outlined">close</span>
    </button>
);

/* ─── Sub-meta: número, tareas, tareas enlazadas, lograda → siguiente ─── */

interface SubMetaModalProps {
    sub?: Goal;
    padre?: Goal;
    movil: boolean;
    dailyBlocks: DailyBlock[];
    toggleDailyBlock?: (id: number) => void;
    updateDailyBlock?: (id: number, updates: Partial<DailyBlock>) => void;
    linkTaskToGoal?: (blockId: number, goalId: number | undefined) => void;
    onClose: () => void;
    onUpdate: (u: Partial<Goal>) => void;
    onEditar: () => void;
    onSiguiente: () => void;
    onRemove: () => void;
    onAddTarea: (t: string) => void;
    onToggleTarea: (id: number) => void;
    onRemoveTarea: (id: number) => void;
    onMover?: (dir: -1 | 1) => void;
    posicion?: { i: number; n: number };
    addDailyBlock?: MetasDashboardProps['addDailyBlock'];
}

const SubMetaModal = ({ sub, padre, movil, dailyBlocks, toggleDailyBlock, updateDailyBlock, linkTaskToGoal, addDailyBlock, onClose, onUpdate, onEditar, onSiguiente, onRemove, onAddTarea, onToggleTarea, onRemoveTarea, onMover, posicion }: SubMetaModalProps) => {
    const color = padre?.color ?? C.primary;
    const lograda = sub?.status === 'completado';
    const av = sub ? avance(sub, [], dailyBlocks) : { pct: 0, texto: '' };
    return (
        <Hoja abierta={!!sub && !!padre} movil={movil} color={color} onClose={onClose} ancho={640}>
            {sub && padre && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.outline }}>
                                {padre.icon} {padre.title} · {nombrePlazo(padre, sub.horizon)}
                            </div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: C.onSurface, marginTop: '2px', wordBreak: 'break-word', textDecoration: lograda ? 'line-through' : 'none' }}>
                                🎯 {sub.title}
                            </div>
                        </div>
                        {onMover && posicion && (
                            <>
                                <button onClick={() => onMover(-1)} disabled={posicion.i <= 0} title="Subir en la columna" style={{ ...botonIcono, opacity: posicion.i <= 0 ? 0.3 : 1 }}>
                                    <span className="material-symbols-outlined">arrow_upward</span>
                                </button>
                                <button onClick={() => onMover(1)} disabled={posicion.i >= posicion.n - 1} title="Bajar en la columna" style={{ ...botonIcono, opacity: posicion.i >= posicion.n - 1 ? 0.3 : 1 }}>
                                    <span className="material-symbols-outlined">arrow_downward</span>
                                </button>
                            </>
                        )}
                        <button onClick={onEditar} title="Editar sub-meta" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: '4px' }}>
                            <span className="material-symbols-outlined">edit</span>
                        </button>
                        <BotonX onClick={onClose} />
                    </div>

                    {sub.objetivo ? (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: C.onSurfaceVariant, fontFamily: MONO, marginBottom: '6px' }}>
                                <span>{av.texto}</span><span style={{ color }}>{av.pct}%</span>
                            </div>
                            <Barra pct={av.pct} color={color} alto={6} />
                            <div style={{ marginTop: '10px' }}><AvanceNumero goal={sub} onUpdate={onUpdate} movil={movil} /></div>
                        </div>
                    ) : (
                        <button onClick={onEditar} style={{ alignSelf: 'flex-start', background: 'none', border: `1px dashed ${C.outlineVariant}`, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: C.outline, fontFamily: 'inherit' }}>
                            + Ponerle un número (ej. 20 clientes)
                        </button>
                    )}

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => onUpdate({ status: lograda ? 'en-progreso' : 'completado' })}
                            style={{ flex: 1, minWidth: '140px', padding: '11px', borderRadius: '12px', border: lograda ? `2px solid ${C.outlineVariant}` : 'none', background: lograda ? C.surfaceLowest : C.verde, color: lograda ? C.onSurfaceVariant : '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            {lograda ? 'Desmarcar' : '✓ Marcar lograda'}
                        </button>
                        {lograda && (
                            <button onClick={onSiguiente} style={{ flex: 1, minWidth: '140px', padding: '11px', borderRadius: '12px', border: 'none', background: color, color: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                                Crear la siguiente →
                            </button>
                        )}
                    </div>

                    <div>
                        <div style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.outline }}>Tareas para lograrla</div>
                        <ListaTareas
                            tareas={sub.milestones} color={color} movil={movil}
                            onToggle={onToggleTarea} onRemove={onRemoveTarea} onAdd={onAddTarea}
                            onEditar={(id, t) => onUpdate({ milestones: sub.milestones.map(x => x.id === id ? { ...x, text: t } : x) })}
                            onCambiar={(id, u) => onUpdate({ milestones: sub.milestones.map(x => x.id === id ? { ...x, ...u } : x) })}
                            onConvertir={addDailyBlock ? convertirPaso(sub, undefined, onUpdate, addDailyBlock) : undefined}
                        />
                    </div>

                    <TareasEnlazadas goal={sub} dailyBlocks={dailyBlocks} toggleDailyBlock={toggleDailyBlock} updateDailyBlock={updateDailyBlock} linkTaskToGoal={linkTaskToGoal} movil={movil} />

                    <button
                        onClick={() => { if (window.confirm(`¿Borrar la sub-meta "${sub.title}"?`)) onRemove(); }}
                        style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', color: C.rojo, fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span> Borrar sub-meta
                    </button>
                </div>
            )}
        </Hoja>
    );
};

/* ─── Tareas sueltas de UN plazo de UNA meta (y su nombre propio) ─── */

interface PlazoModalProps {
    goal?: Goal;
    plazo: GoalHorizon | null;
    movil: boolean;
    onClose: () => void;
    onAdd: (t: string) => void;
    onToggle: (milestoneId: number) => void;
    onRemove: (milestoneId: number) => void;
    onUpdate: (updates: Partial<Goal>) => void;
    onAbrirTarea?: (milestoneId: number) => void;
    onCambiarPlazo?: (plazo: GoalHorizon) => void;
    removeDailyBlock?: (id: number) => void;
    pagina?: boolean; // pantalla completa (con el menú lateral visible) en vez de ventana flotante
    addDailyBlock?: MetasDashboardProps['addDailyBlock'];
    dailyBlocks?: DailyBlock[];
    toggleDailyBlock?: (id: number) => void;
    updateDailyBlock?: (id: number, updates: Partial<DailyBlock>) => void;
    linkTaskToGoal?: (blockId: number, goalId: number | undefined) => void;
}

// Pantalla completa de UNA tarea: sus pasos, repetitivas y detalles. El menú lateral sigue a la vista.
const TareaDetalle = ({ goal, tarea, plazo, movil, dailyBlocks, onVolver, onUpdate, onToggle, onRemove, toggleDailyBlock, updateDailyBlock, linkTaskToGoal, addDailyBlock }: {
    goal: Goal; tarea: Tarea; plazo: GoalHorizon; movil: boolean; dailyBlocks: DailyBlock[];
    onVolver: () => void; onUpdate: (u: Partial<Goal>) => void; onToggle: (id: number) => void; onRemove: (id: number) => void;
    toggleDailyBlock?: (id: number) => void; updateDailyBlock?: (id: number, updates: Partial<DailyBlock>) => void;
    linkTaskToGoal?: (blockId: number, goalId: number | undefined) => void; addDailyBlock?: MetasDashboardProps['addDailyBlock'];
}) => {
    const total = tarea.pasos?.filter(p => !p.repetitiva).length || 0;
    const hechos = tarea.pasos?.filter(p => !p.repetitiva && p.completed).length || 0;
    return (
        <div style={{ ...paddingPagina(movil), maxWidth: '860px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            <button onClick={onVolver} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: C.onSurfaceVariant, fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem', padding: '4px 0', marginBottom: '18px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span> Metas
            </button>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.outline, marginBottom: '10px' }}>
                {goal.icon} {goal.title} · {nombrePlazo(goal, plazo)}
            </div>
            <ListaTareas
                detalle
                tareas={[tarea]} color={goal.color} movil={movil}
                onToggle={onToggle} onRemove={onRemove} onAdd={() => { /* no aplica */ }}
                onEditar={(id, t) => onUpdate({ milestones: goal.milestones.map(x => x.id === id ? { ...x, text: t } : x) })}
                onCambiar={(id, u) => onUpdate({ milestones: goal.milestones.map(x => x.id === id ? { ...x, ...u } : x) })}
                onConvertir={addDailyBlock ? convertirPaso(goal, plazo, onUpdate, addDailyBlock) : undefined}
                repDe={txt => tareasDeMeta(goal.id, dailyBlocks).find(t => t.repetitiva && t.label.trim().toLowerCase() === txt.trim().toLowerCase())}
                onToggleRep={toggleDailyBlock}
            />
            {total > 0 && (
                <div style={{ margin: '4px 0 0', fontSize: '0.78rem', color: C.outline, fontFamily: MONO }}>{hechos}/{total} pasos hechos</div>
            )}
            <div style={{ marginTop: '34px', paddingTop: '18px', borderTop: `1px solid ${C.outlineVariant}` }}>
                <button
                    onClick={() => { if (window.confirm(`¿Borrar la tarea "${tarea.text}"?`)) { onRemove(tarea.id); onVolver(); } }}
                    style={{ background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', color: C.rojo, fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span> Borrar tarea
                </button>
            </div>
        </div>
    );
};

// Saca un paso de su tarea y lo vuelve tarea suelta (misma lista) o repetitiva (bloque de Mi Día ligado a la meta).
const convertirPaso = (
    goal: Goal, plazo: GoalHorizon | undefined, onUpdate: (u: Partial<Goal>) => void,
    addDailyBlock: MetasDashboardProps['addDailyBlock'],
) => (t: Tarea, p: Paso, destino: 'suelta' | number[]) => {
    // Suelta: el paso sale de la tarea y pasa a ser una tarea más. Repetitiva: se queda en su lugar, marcado.
    const pasos = destino === 'suelta' ? (t.pasos || []).filter(x => x.id !== p.id) : (t.pasos || []).map(x => x.id === p.id ? { ...x, repetitiva: true } : x);
    const reales = pasos.filter(q => !q.repetitiva);
    const milestones = goal.milestones.map(x => x.id === t.id ? { ...x, pasos, completed: reales.length ? reales.every(q => q.completed) : x.completed } : x);
    if (destino === 'suelta') {
        milestones.push({ id: Date.now() + Math.floor(Math.random() * 1000), text: p.text, completed: p.completed, ...(plazo && { plazo }) });
    } else if (addDailyBlock) {
        addDailyBlock(p.text, 'Otro', new Date().toLocaleDateString('en-CA'), false, undefined, destino, undefined, true, false, goal.id);
    } else return;
    onUpdate({ milestones });
};

const PlazoModal = ({ goal, plazo, movil, onClose, onAdd, onToggle, onRemove, onUpdate, addDailyBlock, dailyBlocks = [], toggleDailyBlock, updateDailyBlock, linkTaskToGoal, onAbrirTarea, onCambiarPlazo, removeDailyBlock, pagina }: PlazoModalProps) => {
    const info = PLAZOS_INFO.find(p => p.k === plazo);
    // Dirección de la animación al pasar de un plazo a otro (+1 siguiente, -1 anterior).
    const ORDEN: GoalHorizon[] = ['corto', 'mediano', 'largo'];
    const previo = useRef<GoalHorizon | null>(plazo);
    const dir = plazo && previo.current ? Math.sign(ORDEN.indexOf(plazo) - ORDEN.indexOf(previo.current)) || 1 : 1;
    useEffect(() => { previo.current = plazo; }, [plazo]);
    const idx = plazo ? ORDEN.indexOf(plazo) : 0;
    const irA = (i: number) => { if (goal && onCambiarPlazo && i >= 0 && i < ORDEN.length) onCambiarPlazo(ORDEN[i]); };
    useEffect(() => {
        if (!pagina) return;
        const h = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
            if (e.key === 'ArrowRight') irA(idx + 1);
            if (e.key === 'ArrowLeft') irA(idx - 1);
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    });
    const pasos = goal && plazo ? goal.milestones.filter(m => (m.plazo ?? 'corto') === plazo) : [];
    const envolver = (children: React.ReactNode) => pagina ? (
        <div style={{ ...paddingPagina(movil), maxWidth: '1180px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
            <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: C.onSurfaceVariant, fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem', padding: '4px 0', marginBottom: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span> Metas
            </button>
                {onCambiarPlazo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button onClick={() => irA(idx - 1)} disabled={idx <= 0} title="Plazo anterior (←)" style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${C.outlineVariant}`, background: C.surfaceLowest, cursor: idx <= 0 ? 'default' : 'pointer', opacity: idx <= 0 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.onSurfaceVariant }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>chevron_left</span>
                        </button>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {ORDEN.map((k, i) => (
                                <button key={k} onClick={() => irA(i)} title={goal ? nombrePlazo(goal, k) : k} style={{ width: i === idx ? '22px' : '8px', height: '8px', borderRadius: '999px', border: 'none', padding: 0, cursor: 'pointer', background: i === idx ? (goal?.color ?? C.primary) : C.outlineVariant, transition: 'width 0.25s, background 0.25s' }} />
                            ))}
                        </div>
                        <button onClick={() => irA(idx + 1)} disabled={idx >= ORDEN.length - 1} title="Plazo siguiente (→)" style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '36px', padding: '0 14px 0 16px', borderRadius: '999px', border: 'none', background: idx >= ORDEN.length - 1 ? C.surfaceContainerHigh : (goal?.color ?? C.primary), color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: '0.82rem', cursor: idx >= ORDEN.length - 1 ? 'default' : 'pointer', opacity: idx >= ORDEN.length - 1 ? 0.5 : 1 }}>
                            {idx >= ORDEN.length - 1 ? 'Último plazo' : `${goal ? nombrePlazo(goal, ORDEN[idx + 1]) : 'Siguiente'}`}
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_forward</span>
                        </button>
                    </div>
                )}
            </div>
            {children}
        </div>
    ) : (
        <Hoja abierta={!!goal && !!info} movil={movil} color={goal?.color ?? C.primary} onClose={onClose} ancho={680}>{children}</Hoja>
    );
    return envolver(
        <>
            {goal && plazo && info && (
                <>
                    <motion.div key={pagina ? plazo : 'modal'} initial={pagina ? { opacity: 0, x: 48 * dir, scale: 0.985 } : false} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }} style={pagina && !movil ? { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '44px', alignItems: 'start' } : undefined}>
                        <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: pagina ? '8px' : '20px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.outline }}>
                                {goal.icon} {goal.title}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                                <input
                                    value={goal.nombresPlazo?.[plazo] ?? info.titulo}
                                    onChange={e => onUpdate({ nombresPlazo: { ...goal.nombresPlazo, [plazo]: e.target.value } })}
                                    onBlur={() => { if (!(goal.nombresPlazo?.[plazo] ?? '').trim()) onUpdate({ nombresPlazo: { ...goal.nombresPlazo, [plazo]: undefined } }); }}
                                    maxLength={28} title="Toca para cambiar el nombre"
                                    style={{ minWidth: 0, flex: '0 1 auto', width: `${Math.max(6, (goal.nombresPlazo?.[plazo] ?? info.titulo).length + 1)}ch`, border: 'none', borderBottom: `2px dashed ${C.outlineVariant}`, outline: 'none', background: 'transparent', fontSize: movil ? '1.15rem' : '1.4rem', fontWeight: 800, color: C.onSurface, padding: 0, fontFamily: 'inherit' }}
                                />
                                <span style={{ fontWeight: 500, fontSize: '0.85rem', color: C.outline, whiteSpace: 'nowrap' }}>· {info.sub}</span>
                            </div>
                        </div>
                        {!pagina && <BotonX onClick={onClose} />}
                    </div>
                    {!pagina && (
                        <p style={{ margin: '0 0 14px', fontSize: '0.88rem', color: C.onSurfaceVariant }}>
                            {pasos.length === 0 ? 'Tareas sueltas de este plazo. Las de una sub-meta van dentro de ella.' : 'Tareas sueltas de este plazo'}
                        </p>
                    )}
                    <ListaTareas
                        plano={pagina}
                        tareas={pasos} color={goal.color} movil={movil}
                        onToggle={onToggle} onRemove={onRemove} onAdd={onAdd}
                        onEditar={(id, t) => onUpdate({ milestones: goal.milestones.map(x => x.id === id ? { ...x, text: t } : x) })}
                        onCambiar={(id, u) => onUpdate({ milestones: goal.milestones.map(x => x.id === id ? { ...x, ...u } : x) })}
                        onAbrir={onAbrirTarea}
                        onConvertir={addDailyBlock ? convertirPaso(goal, plazo, onUpdate, addDailyBlock) : undefined}
                        repDe={txt => tareasDeMeta(goal.id, dailyBlocks).find(t => t.repetitiva && t.label.trim().toLowerCase() === txt.trim().toLowerCase())}
                        onToggleRep={toggleDailyBlock}
                        onBorrarRep={removeDailyBlock ? (_t, txt) => {
                            dailyBlocks.filter(b => b.goalId === goal.id && b.repeatDays?.length && b.label.trim().toLowerCase() === txt.trim().toLowerCase()).forEach(b => removeDailyBlock(b.id));
                        } : undefined}
                        extra={<FilasEnlazadas plano={pagina} onBorrar={removeDailyBlock ? t => {
                            if (!window.confirm(`¿Borrar la tarea "${t.label}"${t.repetitiva ? ' y todos sus registros' : ''}?`)) return;
                            const base = dailyBlocks.find(b => b.id === t.id);
                            if (!base) return;
                            dailyBlocks.filter(b => b.goalId === goal.id && b.label.trim().toLowerCase() === base.label.trim().toLowerCase() && (!t.repetitiva || b.period === base.period)).forEach(b => removeDailyBlock(b.id));
                        } : undefined} asignar={{ tareas: goal.milestones.filter(m => (m.plazo ?? 'corto') === plazo && !m.completed), onAsignar: (mid, txt) => { if (mid) onUpdate({ milestones: goal.milestones.map(x => x.id === mid ? { ...x, pasos: [...(x.pasos || []), { id: Date.now() + Math.floor(Math.random() * 1000), text: txt, completed: false, repetitiva: true }] } : x) }); } }} excluir={goal.milestones.flatMap(m => (m.pasos || []).filter(q => q.repetitiva).map(q => q.text))} goal={goal} dailyBlocks={dailyBlocks} toggleDailyBlock={toggleDailyBlock} updateDailyBlock={updateDailyBlock} linkTaskToGoal={linkTaskToGoal} movil={movil} />}
                    />
                        </div>
                        {pagina && (() => {
                            const hechasT = pasos.filter(m => m.completed).length;
                            const pctT = pasos.length ? Math.round((hechasT / pasos.length) * 100) : 0;
                            const reps = tareasDeMeta(goal.id, dailyBlocks).filter(t => t.repetitiva && t.activa);
                            const eti: React.CSSProperties = { fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.outline, marginBottom: '10px' };
                            return (
                                <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: movil ? 'static' : 'sticky', top: '16px', marginTop: movil ? '28px' : 0 }}>
                                    <div>
                                        <div style={eti}>La meta</div>
                                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: C.onSurface, lineHeight: 1.3 }}>{goal.icon} {goal.title}</div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '8px', fontSize: '0.78rem', color: C.onSurfaceVariant }}>
                                            <span style={{ padding: '2px 10px', borderRadius: '999px', background: STATUS_INFO[goal.status].bg, color: STATUS_INFO[goal.status].color, fontWeight: 700 }}>{STATUS_INFO[goal.status].label}</span>
                                            <span>{goal.area}</span>
                                            {(() => { const d = diasRestantes(goal.targetDate); return d === null ? null : <span style={{ fontWeight: 700, color: d < 0 ? C.rojo : C.onSurfaceVariant }}>{d < 0 ? `${-d} d vencida` : d === 0 ? 'Vence hoy' : `${d} d restantes`}</span>; })()}
                                        </div>
                                        {goal.objetivo ? (() => {
                                            const av = avance(goal, [], dailyBlocks);
                                            return (
                                                <div style={{ marginTop: '16px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: C.onSurfaceVariant, fontFamily: MONO, marginBottom: '6px' }}>
                                                        <span>{av.texto}</span><span style={{ color: goal.color }}>{av.pct}%</span>
                                                    </div>
                                                    <Barra pct={av.pct} color={goal.color} alto={6} />
                                                    <div style={{ marginTop: '10px' }}><AvanceNumero goal={goal} onUpdate={onUpdate} movil={movil} /></div>
                                                </div>
                                            );
                                        })() : null}
                                    </div>
                                    <div>
                                        <div style={eti}>Avance de este plazo</div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                                            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: goal.color, fontFamily: MONO, lineHeight: 1 }}>{pctT}%</span>
                                            <span style={{ fontSize: '0.85rem', color: C.onSurfaceVariant }}>{hechasT} de {pasos.length} tareas</span>
                                        </div>
                                        <div style={{ marginTop: '12px' }}><Barra pct={pctT} color={goal.color} alto={6} /></div>
                                        {reps.length > 0 && (
                                            <div style={{ marginTop: '14px', fontSize: '0.8rem', color: C.onSurfaceVariant }}>
                                                {reps.length} repetitiva{reps.length !== 1 ? 's' : ''} · {reps.reduce((a, t) => a + (t.semana?.hechos ?? 0), 0)}/{reps.reduce((a, t) => a + (t.semana?.toca ?? 0), 0)} esta semana
                                            </div>
                                        )}
                                    </div>
                                    {onCambiarPlazo && (
                                        <div>
                                            <div style={eti}>Plazos de esta meta</div>
                                            {PLAZOS_INFO.map(pl => {
                                                const n = goal.milestones.filter(m => (m.plazo ?? 'corto') === pl.k).length;
                                                const activo = pl.k === plazo;
                                                return (
                                                    <button key={pl.k} onClick={() => onCambiarPlazo(pl.k)} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', width: '100%', background: 'none', border: 'none', borderLeft: `3px solid ${activo ? goal.color : 'transparent'}`, padding: '8px 0 8px 12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                                                        <span title={`${nombrePlazo(goal, pl.k)} · ${pl.sub}`} style={{ fontSize: '0.9rem', fontWeight: activo ? 800 : 600, color: activo ? C.onSurface : C.onSurfaceVariant, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombrePlazo(goal, pl.k)}</span>
                                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: C.outline, fontFamily: MONO }}>{n}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </aside>
                            );
                        })()}
                    </motion.div>
                </>
            )}
        </>,
    );
};
