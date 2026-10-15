import { useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Goal, GoalHorizon, GoalStatus, Project } from '../../hooks/useAlDiaState';
import {
    C, bento, useIsMobile,
    paddingPagina, cabecera, tituloPagina, subtituloPagina, campo, botonPrimario, TOQUE_MINIMO,
} from '../../theme';

interface MetasDashboardProps {
    goals: Goal[];
    projects?: Project[];
    addGoal: (title: string, horizon: GoalHorizon, area: string, color: string, icon?: string, targetDate?: string) => void;
    updateGoal: (id: number, updates: Partial<Goal>) => void;
    removeGoal: (id: number) => void;
    addGoalMilestone: (goalId: number, text: string, plazo?: GoalHorizon) => void;
    toggleGoalMilestone: (goalId: number, milestoneId: number) => void;
    removeGoalMilestone: (goalId: number, milestoneId: number) => void;
}

const ICONOS = ['🎯', '💰', '🏠', '💻', '🌱', '❤️', '📚', '✈️', '🏆', '🛠️'];
const COLORES = ['#0FA97A', '#4858ab', '#0E9F6E', '#B9760A', '#C77DFF', '#C63C3C', '#4D96FF', '#06D6A0'];
const AREAS_SUGERIDAS = ['Negocio', 'Finanzas', 'Salud', 'Personal', 'Aprendizaje', 'Familia'];

const STATUS_INFO: Record<GoalStatus, { label: string; color: string; bg: string }> = {
    'pendiente':    { label: 'Pendiente',    color: C.outline, bg: C.surfaceContainerLow },
    'en-progreso':  { label: 'En progreso',  color: C.ambar,   bg: 'rgba(230,168,23,0.12)' },
    'completado':   { label: 'Completado',   color: C.verde,   bg: 'rgba(16,185,129,0.12)' },
};

const PLAZOS: { k: GoalHorizon; titulo: string; sub: string }[] = [
    { k: 'corto', titulo: 'Corto plazo', sub: 'este mes' },
    { k: 'mediano', titulo: 'Mediano plazo', sub: 'próximos meses' },
    { k: 'largo', titulo: 'Largo plazo', sub: '1+ años' },
];

const NEXT_STATUS: Record<GoalStatus, GoalStatus> = {
    'pendiente': 'en-progreso',
    'en-progreso': 'completado',
    'completado': 'pendiente',
};

const diasRestantes = (fecha?: string) => {
    if (!fecha) return null;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const objetivo = new Date(fecha + 'T00:00:00');
    return Math.round((objetivo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
};

export const MetasDashboard = ({
    goals, projects = [], addGoal, updateGoal, removeGoal, addGoalMilestone, toggleGoalMilestone, removeGoalMilestone,
}: MetasDashboardProps) => {
    const movil = useIsMobile();
    const [adding, setAdding] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [nuevaSub, setNuevaSub] = useState<Record<string, string>>({});
    const [form, setForm] = useState({ title: '', area: '', icon: ICONOS[0], color: COLORES[0], targetDate: '' });


    const resetForm = () => setForm({ title: '', area: '', icon: ICONOS[0], color: COLORES[0], targetDate: '' });

    const submitGoal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        addGoal(form.title.trim(), 'mediano', form.area.trim() || 'Personal', form.color, form.icon, form.targetDate || undefined);
        resetForm();
        setAdding(false);
    };


    return (
        <div style={paddingPagina(movil)}>
            <div style={cabecera(movil)}>
                <div>
                    <h2 style={tituloPagina}>Metas</h2>
                    <p style={subtituloPagina}>
                        {goals.filter(g => g.status === 'completado').length} de {goals.length} logradas
                    </p>
                </div>
            </div>

            <div>
                <section style={{ ...bento, padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.onSurface }}>Mis metas</h3>
                            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: C.outline }}>Cada una con su corto, mediano y largo plazo</p>
                        </div>
                        <button
                            onClick={() => { setAdding(a => !a); resetForm(); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                background: adding ? C.surfaceContainerHigh : C.primary,
                                color: adding ? C.onSurfaceVariant : '#fff',
                                border: 'none', borderRadius: '999px', padding: '6px 12px',
                                fontSize: '0.75rem', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                                {adding ? 'close' : 'add'}
                            </span>
                            Meta
                        </button>
                    </div>

                        <AnimatePresence initial={false}>
                            {adding && (
                                <motion.form
                                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                    onSubmit={submitGoal}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', gap: '8px', margin: '10px 0 14px',
                                        padding: '12px', background: C.surfaceContainerLow,
                                        border: `1.5px dashed ${C.outlineVariant}`, borderRadius: '12px',
                                    }}>
                                        <input
                                            autoFocus
                                            value={form.title}
                                            onChange={e => setForm(v => ({ ...v, title: e.target.value }))}
                                            placeholder="¿Qué quieres lograr?"
                                            style={{ ...campo(movil), background: C.surfaceLowest }}
                                        />
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <input
                                                value={form.area}
                                                onChange={e => setForm(v => ({ ...v, area: e.target.value }))}
                                                placeholder="Área (ej. Salud)"
                                                list="areas-metas"
                                                style={{ ...campo(movil), background: C.surfaceLowest, flex: '1 1 130px' }}
                                            />
                                            <datalist id="areas-metas">
                                                {AREAS_SUGERIDAS.map(a => <option key={a} value={a} />)}
                                            </datalist>
                                            <input
                                                type="date"
                                                value={form.targetDate}
                                                onChange={e => setForm(v => ({ ...v, targetDate: e.target.value }))}
                                                style={{ ...campo(movil), background: C.surfaceLowest, flex: '1 1 140px' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            {ICONOS.map(ic => (
                                                <button type="button" key={ic} onClick={() => setForm(v => ({ ...v, icon: ic }))}
                                                    style={{
                                                        width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer',
                                                        border: form.icon === ic ? `2px solid ${C.primary}` : `1px solid ${C.outlineVariant}`,
                                                        background: C.surfaceLowest, fontSize: '0.9rem',
                                                    }}
                                                >{ic}</button>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {COLORES.map(c => (
                                                <button type="button" key={c} onClick={() => setForm(v => ({ ...v, color: c }))}
                                                    style={{
                                                        width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer', background: c,
                                                        border: form.color === c ? `2px solid ${C.onSurface}` : '2px solid transparent',
                                                        padding: 0,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <button type="submit" disabled={!form.title.trim()} style={{
                                            ...botonPrimario(movil), alignSelf: 'flex-start',
                                            background: form.title.trim() ? C.primary : C.surfaceContainerHigh,
                                            color: form.title.trim() ? '#fff' : C.onSurfaceVariant,
                                            cursor: form.title.trim() ? 'pointer' : 'default',
                                        }}>
                                            Guardar meta
                                        </button>
                                    </div>
                                </motion.form>
                            )}
                        </AnimatePresence>

                        {goals.length === 0 && !adding && (
                            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: C.onSurfaceVariant }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '36px', color: C.outlineVariant, display: 'block', marginBottom: '8px' }}>
                                    flag
                                </span>
                                <p style={{ margin: 0, fontSize: '0.82rem' }}>Todavía no hay metas acá.</p>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: movil ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px', alignItems: 'start' }}>
                        <AnimatePresence initial={false}>
                            {goals.map(goal => (
                                <TarjetaMeta
                                    key={goal.id}
                                    goal={goal}
                                    projects={projects}
                                    movil={movil}
                                    expandido={expandedId === goal.id}
                                    onToggleExpand={() => setExpandedId(expandedId === goal.id ? null : goal.id)}
                                    onCycleStatus={() => updateGoal(goal.id, { status: NEXT_STATUS[goal.status] })}
                                    onRemove={() => removeGoal(goal.id)}
                                    onUpdate={updates => updateGoal(goal.id, updates)}
                                    nuevaSub={nuevaSub}
                                    onNuevaSubChange={(plazo, txt) => setNuevaSub(v => ({ ...v, [`${goal.id}:${plazo}`]: txt }))}
                                    onAddSub={plazo => {
                                        const texto = (nuevaSub[`${goal.id}:${plazo}`] || '').trim();
                                        if (!texto) return;
                                        addGoalMilestone(goal.id, texto, plazo);
                                        setNuevaSub(v => ({ ...v, [`${goal.id}:${plazo}`]: '' }));
                                    }}
                                    onToggleSub={mid => toggleGoalMilestone(goal.id, mid)}
                                    onRemoveSub={mid => removeGoalMilestone(goal.id, mid)}
                                />
                            ))}
                        </AnimatePresence>
                        </div>
                </section>
            </div>
        </div>
    );
};

interface TarjetaMetaProps {
    goal: Goal;
    projects: Project[];
    movil: boolean;
    expandido: boolean;
    onToggleExpand: () => void;
    onCycleStatus: () => void;
    onRemove: () => void;
    onUpdate: (updates: Partial<Goal>) => void;
    nuevaSub: Record<string, string>;
    onNuevaSubChange: (plazo: GoalHorizon, texto: string) => void;
    onAddSub: (plazo: GoalHorizon) => void;
    onToggleSub: (milestoneId: number) => void;
    onRemoveSub: (milestoneId: number) => void;
}

const TarjetaMeta = ({
    goal, projects, movil, expandido, onToggleExpand, onCycleStatus, onRemove, onUpdate,
    nuevaSub, onNuevaSubChange, onAddSub, onToggleSub, onRemoveSub,
}: TarjetaMetaProps) => {
    const [editando, setEditando] = useState(false);
    const [titulo, setTitulo] = useState(goal.title);

    const proyecto = projects.find(p => p.id === goal.projectId);
    const pasosProyecto = proyecto?.checklist ?? [];
    // Con proyecto vinculado, el avance sale de su checklist (más los pasos propios de la meta).
    const total = goal.milestones.length + pasosProyecto.length;
    const hechos = goal.milestones.filter(m => m.completed).length + pasosProyecto.filter(i => i.completed).length;
    const progreso = total > 0 ? Math.round((hechos / total) * 100) : goal.status === 'completado' ? 100 : 0;
    const restantes = diasRestantes(goal.targetDate);
    const status = STATUS_INFO[goal.status];

    const guardarTitulo = () => {
        if (titulo.trim()) onUpdate({ title: titulo.trim() });
        else setTitulo(goal.title);
        setEditando(false);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
            style={{
                gridColumn: expandido ? '1 / -1' : undefined,
                borderRadius: '12px', overflow: 'hidden',
                border: `1px solid ${C.outlineVariant}`,
                background: goal.status === 'completado' ? 'rgba(16,185,129,0.04)' : C.surfaceContainerLow,
            }}
        >
            <div style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={() => !editando && onToggleExpand()}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem', flexShrink: 0, lineHeight: 1.3 }}>{goal.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        {editando ? (
                            <input
                                autoFocus
                                value={titulo}
                                onClick={e => e.stopPropagation()}
                                onChange={e => setTitulo(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') guardarTitulo(); if (e.key === 'Escape') { setTitulo(goal.title); setEditando(false); } }}
                                onBlur={guardarTitulo}
                                style={{ ...campo(movil), width: '100%', padding: '4px 8px' }}
                            />
                        ) : (
                            <div style={{
                                fontSize: '0.9rem', fontWeight: 700, color: C.onSurface,
                                textDecoration: goal.status === 'completado' ? 'line-through' : 'none',
                            }}>
                                {goal.title}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px', alignItems: 'center' }}>
                            <span style={{
                                fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                                background: `${goal.color}22`, color: goal.color,
                            }}>
                                {goal.area}
                            </span>
                            <button
                                onClick={e => { e.stopPropagation(); onCycleStatus(); }}
                                style={{
                                    fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                                    background: status.bg, color: status.color, border: 'none', cursor: 'pointer',
                                }}
                            >
                                {status.label}
                            </button>
                            {proyecto && (
                                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: C.surfaceContainer, color: C.onSurfaceVariant }}>
                                    📁 {proyecto.name}
                                </span>
                            )}
                            {goal.targetDate && (
                                <span style={{ fontSize: '0.68rem', color: restantes !== null && restantes < 0 && goal.status !== 'completado' ? C.rojo : C.outline, fontWeight: 600 }}>
                                    {restantes !== null && goal.status !== 'completado'
                                        ? restantes >= 0 ? `${restantes}d restantes` : `${Math.abs(restantes)}d de retraso`
                                        : new Date(goal.targetDate + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            )}
                            {total > 0 && (
                                <span style={{ fontSize: '0.68rem', color: C.outline, fontWeight: 600 }}>{hechos}/{total}</span>
                            )}
                        </div>
                        {goal.milestones.length > 0 && (
                            <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '0.68rem', color: C.outline, fontWeight: 600 }}>
                                {PLAZOS.map(pl => {
                                    const ps = goal.milestones.filter(m => (m.plazo ?? 'corto') === pl.k);
                                    return <span key={pl.k}>{pl.titulo.split(' ')[0]} {ps.filter(m => m.completed).length}/{ps.length}</span>;
                                })}
                            </div>
                        )}
                        {total > 0 && (
                            <div style={{ height: '4px', background: C.surfaceContainerHigh, borderRadius: '999px', marginTop: '8px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${progreso}%`, background: goal.color, borderRadius: '999px', transition: 'width 0.25s' }} />
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                        <button onClick={e => { e.stopPropagation(); setEditando(true); }} title="Editar título" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, padding: '2px', display: 'flex' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
                        </button>
                        <button onClick={e => { e.stopPropagation(); onRemove(); }} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, padding: '2px', display: 'flex' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {expandido && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: '0 12px 12px', borderTop: `1px solid ${C.outlineVariant}`, paddingTop: '10px' }} onClick={e => e.stopPropagation()}>
                            <textarea
                                value={goal.description || ''}
                                onChange={e => onUpdate({ description: e.target.value })}
                                placeholder="Notas / plan..."
                                rows={2}
                                style={{ ...campo(movil), width: '100%', resize: 'vertical', marginBottom: '10px', boxSizing: 'border-box' }}
                            />

                            <div style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.outline, marginBottom: '6px' }}>
                                Proyecto vinculado
                            </div>
                            <select
                                value={goal.projectId ?? ''}
                                onChange={e => onUpdate({ projectId: e.target.value ? Number(e.target.value) : undefined })}
                                style={{ ...campo(movil), width: '100%', marginBottom: '10px', boxSizing: 'border-box' }}
                            >
                                <option value="">Ninguno</option>
                                {projects.filter(p => p.status !== 'completado' || p.id === goal.projectId).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            {pasosProyecto.length > 0 && (
                                <p style={{ margin: '-4px 0 10px', fontSize: '0.72rem', color: C.outline }}>
                                    El avance cuenta también los {pasosProyecto.length} pasos del checklist del proyecto.
                                </p>
                            )}

                            <div style={{ display: 'flex', flexDirection: movil ? 'column' : 'row', alignItems: 'stretch', gap: movil ? '4px' : '0', marginBottom: '10px' }}>
                            {PLAZOS.map((pl, idx) => {
                                const pasos = goal.milestones.filter(m => (m.plazo ?? 'corto') === pl.k);
                                const texto = nuevaSub[`${goal.id}:${pl.k}`] || '';
                                return (
                                    <Fragment key={pl.k}>
                                    {idx > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: goal.color, flexShrink: 0, padding: movil ? '0' : '0 8px' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{movil ? 'arrow_downward' : 'arrow_forward'}</span>
                                        </div>
                                    )}
                                    <div style={{ flex: 1, minWidth: 0, padding: '10px', borderRadius: '10px', background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderTop: `3px solid ${goal.color}` }}>
                                        <div style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.outline, marginBottom: '4px' }}>
                                            {pl.titulo} <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>· {pl.sub}</span>
                                        </div>
                                        {pasos.map(m => (
                                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                                                <button
                                                    onClick={() => onToggleSub(m.id)}
                                                    style={{
                                                        width: '17px', height: '17px', borderRadius: '5px', flexShrink: 0, padding: 0,
                                                        background: m.completed ? goal.color : 'transparent',
                                                        border: `2px solid ${m.completed ? goal.color : C.outlineVariant}`,
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}
                                                >
                                                    {m.completed && <span style={{ color: '#fff', fontSize: '9px', fontWeight: 900 }}>✓</span>}
                                                </button>
                                                <span style={{
                                                    flex: 1, fontSize: '0.82rem', color: m.completed ? C.outline : C.onSurface,
                                                    textDecoration: m.completed ? 'line-through' : 'none',
                                                }}>
                                                    {m.text}
                                                </span>
                                                <button onClick={() => onRemoveSub(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, padding: '2px', display: 'flex' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                                                </button>
                                            </div>
                                        ))}
                                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                            <input
                                                value={texto}
                                                onChange={e => onNuevaSubChange(pl.k, e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') onAddSub(pl.k); }}
                                                placeholder={`Agregar a ${pl.titulo.toLowerCase()}...`}
                                                style={{ ...campo(movil), flex: 1, minWidth: 0, padding: '6px 10px', fontSize: '0.8rem' }}
                                            />
                                            <button
                                                onClick={() => onAddSub(pl.k)}
                                                disabled={!texto.trim()}
                                                style={{
                                                    width: movil ? `${TOQUE_MINIMO}px` : '32px', flexShrink: 0,
                                                    background: texto.trim() ? goal.color : C.surfaceContainerHigh,
                                                    color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                                            </button>
                                        </div>
                                    </div>
                                    </Fragment>
                                );
                            })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
