import { useState, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { NuevaMetaModal, PLAZOS_INFO } from './NuevaMetaModal';
import type { NuevaMeta } from './NuevaMetaModal';
import type { Goal, GoalHorizon, GoalStatus, Mission, Project } from '../../hooks/useAlDiaState';
import {
    C, MONO, useIsMobile,
    paddingPagina, cabecera, tituloPagina, subtituloPagina, campo,
} from '../../theme';

/* Metas:
   🧭 Visión (un Proyecto, opcional) → Meta (número + plazo) → columnas Corto/Mediano/Largo.
   En cada columna viven las sub-metas (escalones: 10 clientes → 100 → 500) con sus tareas,
   y tareas sueltas. Las tareas de Tareas/Mi Día se enlazan con mission.goalId. */

interface MetasDashboardProps {
    goals: Goal[];
    projects?: Project[];
    missions?: Mission[];
    updateMission?: (id: number, updates: Partial<Mission>) => void;
    addProject?: (name: string, color: string) => number | void;
    addGoal: (title: string, horizon: GoalHorizon, area: string, color: string, icon?: string, targetDate?: string, projectId?: number, milestones?: Goal['milestones'], nombresPlazo?: Goal['nombresPlazo'], extra?: Partial<Goal>) => void;
    updateGoal: (id: number, updates: Partial<Goal>) => void;
    removeGoal: (id: number) => void;
    addGoalMilestone: (goalId: number, text: string, plazo?: GoalHorizon) => void;
    toggleGoalMilestone: (goalId: number, milestoneId: number) => void;
    removeGoalMilestone: (goalId: number, milestoneId: number) => void;
}

const STATUS_INFO: Record<GoalStatus, { label: string; color: string; bg: string }> = {
    'pendiente':    { label: 'Pendiente',    color: C.outline, bg: C.surfaceContainerLow },
    'en-progreso':  { label: 'En progreso',  color: C.ambar,   bg: 'rgba(230,168,23,0.12)' },
    'completado':   { label: 'Lograda',      color: C.verde,   bg: 'rgba(16,185,129,0.12)' },
};

const NEXT_STATUS: Record<GoalStatus, GoalStatus> = {
    'pendiente': 'en-progreso',
    'en-progreso': 'completado',
    'completado': 'pendiente',
};

const nombrePlazo = (goal: Goal, k: GoalHorizon) =>
    goal.nombresPlazo?.[k]?.trim() || PLAZOS_INFO.find(p => p.k === k)!.titulo;

const diasRestantes = (fecha?: string) => {
    if (!fecha) return null;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const objetivo = new Date(fecha + 'T00:00:00');
    return Math.round((objetivo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
};

const fmt = (n: number) => n.toLocaleString('es-PE', { maximumFractionDigits: 2 });
const conUnidad = (n: number, u?: string) => !u ? fmt(n) : u === 'S/' ? `S/ ${fmt(n)}` : u === '%' ? `${fmt(n)}%` : `${fmt(n)} ${u}`;

// Avance de una meta o sub-meta. Con número: actual/objetivo. Si no: sub-metas
// logradas + tareas propias hechas + tareas enlazadas (no repetitivas) hechas.
const avance = (g: Goal, subs: Goal[], missions: Mission[]) => {
    if (g.objetivo && g.objetivo > 0) {
        const actual = g.actual ?? 0;
        const texto = g.unidad === 'S/' ? `S/ ${fmt(actual)} / ${fmt(g.objetivo)}` : `${fmt(actual)} / ${conUnidad(g.objetivo, g.unidad)}`;
        return { pct: Math.max(0, Math.min(100, Math.round((actual / g.objetivo) * 100))), texto };
    }
    const enlazadas = missions.filter(m => m.goalId === g.id && m.repeat === 'none');
    const total = subs.length + g.milestones.length + enlazadas.length;
    const hechos = subs.filter(s => s.status === 'completado').length + g.milestones.filter(m => m.completed).length + enlazadas.filter(m => m.completed).length;
    if (total === 0) return { pct: g.status === 'completado' ? 100 : 0, texto: '' };
    return { pct: Math.round((hechos / total) * 100), texto: `${hechos}/${total}` };
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
    objetivo: g.objetivo != null ? String(g.objetivo) : '', actual: g.actual != null ? String(g.actual) : '',
    unidad: g.unidad || '', projectId: g.projectId, horizon: g.horizon,
});
const num = (s: string) => { const n = parseFloat(s); return isFinite(n) ? n : undefined; };

export const MetasDashboard = ({
    goals, projects = [], missions = [], updateMission, addProject,
    addGoal, updateGoal, removeGoal, addGoalMilestone, toggleGoalMilestone, removeGoalMilestone,
}: MetasDashboardProps) => {
    const movil = useIsMobile();
    const [form, setForm] = useState<Form | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [subAbierta, setSubAbierta] = useState<number | null>(null);
    const [plazoAbierto, setPlazoAbierto] = useState<{ goalId: number; plazo: GoalHorizon } | null>(null);

    const raiz = goals.filter(g => !g.parentId);
    const subsDe = (id: number) => goals.filter(g => g.parentId === id);
    const logradas = raiz.filter(g => g.status === 'completado').length;

    // Agrupar por visión (proyecto). Las metas sin visión van al final.
    const grupos: { proyecto?: Project; metas: Goal[] }[] = [];
    raiz.forEach(g => {
        const p = projects.find(x => x.id === g.projectId);
        const grupo = grupos.find(gr => gr.proyecto?.id === p?.id);
        if (grupo) grupo.metas.push(g); else grupos.push({ proyecto: p, metas: [g] });
    });
    grupos.sort((a, b) => (a.proyecto ? 0 : 1) - (b.proyecto ? 0 : 1));
    const conVisiones = grupos.some(g => g.proyecto);

    const guardarForm = (m: NuevaMeta) => {
        if (!form) return;
        const numeros = { objetivo: num(m.objetivo), actual: num(m.actual), unidad: m.unidad || undefined };
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

    const filaMeta = (goal: Goal) => {
        const subs = subsDe(goal.id);
        const columnas = (
            <Columnas
                goal={goal} subs={subs} missions={missions} movil={movil}
                onAbrirSub={id => setSubAbierta(id)}
                onAbrirPlazo={plazo => setPlazoAbierto({ goalId: goal.id, plazo })}
                onNuevaSub={plazo => setForm({ tipo: 'sub', padre: goal, inicial: { horizon: plazo } })}
            />
        );
        const tarjeta = (
            <TarjetaMeta
                goal={goal} subs={subs} missions={missions} movil={movil}
                expandido={movil && expandedId === goal.id}
                onToggleExpand={() => movil && setExpandedId(expandedId === goal.id ? null : goal.id)}
                onCycleStatus={() => updateGoal(goal.id, { status: NEXT_STATUS[goal.status] })}
                onEditar={() => setForm({ tipo: 'meta', goal })}
                onRemove={() => { if (subs.length === 0 || window.confirm(`Se borrará "${goal.title}" y sus ${subs.length} sub-meta(s).`)) removeGoal(goal.id); }}
                onUpdate={u => updateGoal(goal.id, u)}
                updateMission={updateMission}
            >
                {movil && columnas}
            </TarjetaMeta>
        );
        return movil ? <Fragment key={goal.id}>{tarjeta}</Fragment> : (
            <div key={goal.id} style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                <div style={{ width: '260px', flexShrink: 0 }}>{tarjeta}</div>
                <div style={{ flex: 1, minWidth: 0 }}>{columnas}</div>
            </div>
        );
    };

    return (
        <div style={paddingPagina(movil)}>
            <div style={cabecera(movil)}>
                <div>
                    <h2 style={tituloPagina}>Metas</h2>
                    <p style={subtituloPagina}>
                        {raiz.length === 0 ? 'Visión → meta → escalones por plazo' : `${logradas} de ${raiz.length} logradas · toca una sub-meta para avanzar`}
                    </p>
                </div>
            </div>

            {raiz.length === 0 && (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: C.onSurfaceVariant }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '36px', color: C.outlineVariant, display: 'block', marginBottom: '8px' }}>flag</span>
                    <p style={{ margin: 0, fontSize: '0.82rem' }}>Todavía no hay metas acá.</p>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {grupos.map(gr => (
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
                            {gr.metas.map(filaMeta)}
                        </AnimatePresence>
                    </section>
                ))}
                <button
                    onClick={() => setForm({ tipo: 'meta' })}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '52px', width: '100%',
                        background: 'transparent', border: `2px dashed ${C.outlineVariant}`, borderRadius: '12px',
                        color: C.onSurfaceVariant, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span> Nueva meta
                </button>
            </div>

            <NuevaMetaModal
                open={!!form} movil={movil} tipo={form?.tipo ?? 'meta'} editando={!!form?.goal}
                inicial={form?.goal ? aForm(form.goal) : form?.tipo === 'sub' ? form.inicial : undefined}
                padre={form?.tipo === 'sub' ? form.padre : undefined}
                projects={projects} onCrearVision={addProject}
                onClose={() => setForm(null)} onSave={guardarForm}
            />

            <SubMetaModal
                sub={sub} padre={padreDeSub} movil={movil} missions={missions} updateMission={updateMission}
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
                onAddTarea={t => sub && addGoalMilestone(sub.id, t)}
                onToggleTarea={mid => sub && toggleGoalMilestone(sub.id, mid)}
                onRemoveTarea={mid => sub && removeGoalMilestone(sub.id, mid)}
            />

            <PlazoModal
                goal={metaPlazo} plazo={plazoAbierto?.plazo ?? null} movil={movil}
                onClose={() => setPlazoAbierto(null)}
                onAdd={t => metaPlazo && plazoAbierto && addGoalMilestone(metaPlazo.id, t, plazoAbierto.plazo)}
                onToggle={mid => metaPlazo && toggleGoalMilestone(metaPlazo.id, mid)}
                onRemove={mid => metaPlazo && removeGoalMilestone(metaPlazo.id, mid)}
                onUpdate={u => metaPlazo && updateGoal(metaPlazo.id, u)}
            />
        </div>
    );
};

/* ─── Tarjeta de la meta (izquierda en escritorio; en móvil se expande) ─── */

interface TarjetaMetaProps {
    goal: Goal;
    subs: Goal[];
    missions: Mission[];
    movil: boolean;
    expandido: boolean;
    onToggleExpand: () => void;
    onCycleStatus: () => void;
    onEditar: () => void;
    onRemove: () => void;
    onUpdate: (updates: Partial<Goal>) => void;
    updateMission?: (id: number, updates: Partial<Mission>) => void;
    children?: React.ReactNode;
}

const TarjetaMeta = ({ goal, subs, missions, movil, expandido, onToggleExpand, onCycleStatus, onEditar, onRemove, onUpdate, updateMission, children }: TarjetaMetaProps) => {
    const [menu, setMenu] = useState(false);
    const [detalles, setDetalles] = useState(false);
    const av = avance(goal, subs, missions);
    const restantes = diasRestantes(goal.targetDate);
    const status = STATUS_INFO[goal.status];

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
                            <button
                                onClick={e => { e.stopPropagation(); onCycleStatus(); }}
                                style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: status.bg, color: status.color, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                {status.label}
                            </button>
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
                        <button onClick={() => setMenu(m => !m)} title="Opciones" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>more_vert</span>
                        </button>
                        {menu && (
                            <>
                                <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
                                <div style={{ position: 'absolute', right: 0, top: '34px', zIndex: 21, minWidth: '170px', background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '4px' }}>
                                    <MenuItem icono="edit" texto="Editar meta" onClick={() => { setMenu(false); onEditar(); }} />
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
                            <TareasEnlazadas goal={goal} missions={missions} updateMission={updateMission} movil={movil} />
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
    const actual = goal.actual ?? 0;
    const paso = (goal.objetivo ?? 0) >= 1000 ? 100 : 1;
    const fijar = (n: number) => onUpdate({ actual: Math.max(0, n), status: goal.objetivo && n >= goal.objetivo ? 'completado' : goal.status === 'completado' ? 'en-progreso' : goal.status });
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
    missions: Mission[];
    movil: boolean;
    onAbrirSub: (id: number) => void;
    onAbrirPlazo: (plazo: GoalHorizon) => void;
    onNuevaSub: (plazo: GoalHorizon) => void;
}

const Columnas = ({ goal, subs, missions, movil, onAbrirSub, onAbrirPlazo, onNuevaSub }: ColumnasProps) => (
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
                            {tareas.length > 0 && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: C.outline }}>{tareas.length - pendientes.length}/{tareas.length}</span>}
                        </button>

                        {subsPlazo.map(s => <SubMetaChip key={s.id} sub={s} color={goal.color} missions={missions} onClick={() => onAbrirSub(s.id)} />)}

                        {pendientes.slice(0, 3).map(m => (
                            <div key={m.id} onClick={() => onAbrirPlazo(pl.k)} style={{ fontSize: '0.8rem', color: C.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                                <span style={{ color: goal.color }}>•</span> {m.text}
                            </div>
                        ))}
                        {pendientes.length > 3 && <div style={{ fontSize: '0.72rem', color: C.outline }}>+{pendientes.length - 3} más</div>}
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

const SubMetaChip = ({ sub, color, missions, onClick }: { sub: Goal; color: string; missions: Mission[]; onClick: () => void }) => {
    const av = avance(sub, [], missions);
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
                <div key={m.id} style={{ fontSize: '0.76rem', color: C.onSurfaceVariant, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: '20px' }}>
                    ☐ {m.text}
                </div>
            ))}
            {!lograda && pendientes.length > 2 && <div style={{ fontSize: '0.7rem', color: C.outline, paddingLeft: '20px' }}>+{pendientes.length - 2} más</div>}
        </button>
    );
};

/* ─── Tareas de Tareas/Mi Día enlazadas a una meta ─── */

const TareasEnlazadas = ({ goal, missions, updateMission, movil }: { goal: Goal; missions: Mission[]; updateMission?: (id: number, u: Partial<Mission>) => void; movil: boolean }) => {
    if (!updateMission) return null;
    const enlazadas = missions.filter(m => m.goalId === goal.id);
    const libres = missions.filter(m => !m.goalId && !m.completed && !m.isHabit);
    return (
        <div>
            <div style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.outline, marginBottom: '6px' }}>
                Tareas de Mi Día enlazadas
            </div>
            {enlazadas.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: `1px solid ${C.surfaceContainerHigh}` }}>
                    <Check marcado={m.completed} color={goal.color} onClick={() => updateMission(m.id, { completed: !m.completed })} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: '0.88rem', color: m.completed ? C.outline : C.onSurface, textDecoration: m.completed ? 'line-through' : 'none', wordBreak: 'break-word' }}>
                        {m.text}{m.repeat !== 'none' && <span style={{ color: C.outline, fontSize: '0.72rem' }}> · se repite</span>}
                    </span>
                    <button onClick={() => updateMission(m.id, { goalId: undefined })} title="Desenlazar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>link_off</span>
                    </button>
                </div>
            ))}
            <select
                value=""
                onChange={e => { const id = Number(e.target.value); if (id) updateMission(id, { goalId: goal.id }); }}
                style={{ ...campo(movil), width: '100%', marginTop: '8px', boxSizing: 'border-box', color: C.onSurfaceVariant }}
            >
                <option value="">{libres.length ? '+ Enlazar una tarea pendiente…' : 'No hay tareas pendientes para enlazar'}</option>
                {libres.map(m => <option key={m.id} value={m.id}>{m.text}</option>)}
            </select>
        </div>
    );
};

const Check = ({ marcado, color, onClick }: { marcado: boolean; color: string; onClick: () => void }) => (
    <button
        onClick={onClick}
        style={{
            width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0, padding: 0, cursor: 'pointer',
            background: marcado ? color : 'transparent', border: `2px solid ${marcado ? color : C.outlineVariant}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
    >
        {marcado && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 900 }}>✓</span>}
    </button>
);

// Texto de una tarea que se edita tocándolo: Enter o salir guarda, Escape cancela.
const TareaEditable = ({ texto, completada, onGuardar }: { texto: string; completada: boolean; onGuardar: (t: string) => void }) => {
    const [draft, setDraft] = useState<string | null>(null);
    const estilo: React.CSSProperties = { flex: 1, minWidth: 0, fontSize: '0.92rem', lineHeight: 1.35, wordBreak: 'break-word', fontFamily: 'inherit' };
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
const ListaTareas = ({ tareas, color, movil, onToggle, onRemove, onEditar, onAdd }: {
    tareas: Goal['milestones']; color: string; movil: boolean;
    onToggle: (id: number) => void; onRemove: (id: number) => void; onEditar: (id: number, t: string) => void; onAdd: (t: string) => void;
}) => {
    const [texto, setTexto] = useState('');
    return (
        <div>
            {tareas.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: `1px solid ${C.surfaceContainerHigh}` }}>
                    <Check marcado={m.completed} color={color} onClick={() => onToggle(m.id)} />
                    <TareaEditable texto={m.text} completada={m.completed} onGuardar={t => onEditar(m.id, t)} />
                    <button onClick={() => onRemove(m.id)} title="Quitar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                    </button>
                </div>
            ))}
            <form onSubmit={e => { e.preventDefault(); if (texto.trim()) { onAdd(texto.trim()); setTexto(''); } }} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <input
                    value={texto} onChange={e => setTexto(e.target.value)}
                    placeholder="Nueva tarea…" enterKeyHint="done"
                    style={{ ...campo(movil), flex: 1, minWidth: 0 }}
                />
                <button type="submit" disabled={!texto.trim()} title="Agregar" style={{
                    width: '44px', flexShrink: 0, border: 'none', borderRadius: '12px', cursor: texto.trim() ? 'pointer' : 'default',
                    background: texto.trim() ? color : C.surfaceContainerHigh, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <span className="material-symbols-outlined">add</span>
                </button>
            </form>
        </div>
    );
};

// Hoja/ventana base para los dos modales de esta pantalla.
const Hoja = ({ abierta, movil, color, onClose, children }: { abierta: boolean; movil: boolean; color: string; onClose: () => void; children: React.ReactNode }) => {
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
                            background: C.surfaceLowest, width: '100%', maxWidth: '480px', maxHeight: movil ? '88dvh' : '82dvh', overflowY: 'auto', boxSizing: 'border-box',
                            borderRadius: movil ? '24px 24px 0 0' : '20px', padding: movil ? '20px 18px 24px' : '22px',
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
    missions: Mission[];
    updateMission?: (id: number, u: Partial<Mission>) => void;
    onClose: () => void;
    onUpdate: (u: Partial<Goal>) => void;
    onEditar: () => void;
    onSiguiente: () => void;
    onRemove: () => void;
    onAddTarea: (t: string) => void;
    onToggleTarea: (id: number) => void;
    onRemoveTarea: (id: number) => void;
}

const SubMetaModal = ({ sub, padre, movil, missions, updateMission, onClose, onUpdate, onEditar, onSiguiente, onRemove, onAddTarea, onToggleTarea, onRemoveTarea }: SubMetaModalProps) => {
    const color = padre?.color ?? C.primary;
    const lograda = sub?.status === 'completado';
    const av = sub ? avance(sub, [], missions) : { pct: 0, texto: '' };
    return (
        <Hoja abierta={!!sub && !!padre} movil={movil} color={color} onClose={onClose}>
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
                        />
                    </div>

                    <TareasEnlazadas goal={sub} missions={missions} updateMission={updateMission} movil={movil} />

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
}

const PlazoModal = ({ goal, plazo, movil, onClose, onAdd, onToggle, onRemove, onUpdate }: PlazoModalProps) => {
    const info = PLAZOS_INFO.find(p => p.k === plazo);
    const pasos = goal && plazo ? goal.milestones.filter(m => (m.plazo ?? 'corto') === plazo) : [];
    return (
        <Hoja abierta={!!goal && !!info} movil={movil} color={goal?.color ?? C.primary} onClose={onClose}>
            {goal && plazo && info && (
                <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
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
                                    style={{ minWidth: 0, flex: '0 1 auto', width: `${Math.max(6, (goal.nombresPlazo?.[plazo] ?? info.titulo).length + 1)}ch`, border: 'none', borderBottom: `2px dashed ${C.outlineVariant}`, outline: 'none', background: 'transparent', fontSize: '1.15rem', fontWeight: 800, color: C.onSurface, padding: 0, fontFamily: 'inherit' }}
                                />
                                <span style={{ fontWeight: 500, fontSize: '0.85rem', color: C.outline, whiteSpace: 'nowrap' }}>· {info.sub}</span>
                            </div>
                        </div>
                        <BotonX onClick={onClose} />
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: C.onSurfaceVariant }}>
                        {pasos.length === 0 ? 'Tareas sueltas de este plazo. Las de una sub-meta van dentro de ella.' : 'Tareas sueltas de este plazo'}
                    </p>
                    <ListaTareas
                        tareas={pasos} color={goal.color} movil={movil}
                        onToggle={onToggle} onRemove={onRemove} onAdd={onAdd}
                        onEditar={(id, t) => onUpdate({ milestones: goal.milestones.map(x => x.id === id ? { ...x, text: t } : x) })}
                    />
                </>
            )}
        </Hoja>
    );
};
