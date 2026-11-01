import React, { useState, useMemo } from 'react';
import type { DailyBlock, Goal, GoalHorizon, Project, GoalMilestone } from '../../hooks/useAlDiaState';
import { C, MONO } from '../../theme';

export interface VistaListaMetasProps {
    goals: Goal[];
    projects: Project[];
    dailyBlocks?: DailyBlock[];
    movil: boolean;
    gruposNiveles: {
        nivelNum: number;
        info: {
            numero: number;
            titulo: string;
            subtitulo: string;
            horizonte: string;
            color: string;
            icono: string;
        };
        gruposProyecto: { proyecto?: Project; metas: Goal[] }[];
        totalMetas: number;
        completadas: number;
    }[];
    onToggleMilestone: (goalId: number, milestoneId: number) => void;
    onRemoveMilestone: (goalId: number, milestoneId: number) => void;
    onAddMilestone: (goalId: number, text: string, plazo?: GoalHorizon) => void;
    onUpdateGoal: (goalId: number, update: Partial<Goal>) => void;
    onEditarMeta: (goal: Goal) => void;
    onAbrirPlazo: (goalId: number, plazo: GoalHorizon) => void;
    onAbrirDetalle: (goalId: number, milestoneId: number, plazo: GoalHorizon) => void;
    setForm: (form: any) => void;
    updateDailyBlock?: (id: number, u: Partial<DailyBlock>) => void;
    addDailyBlock?: (label: string, period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro', date: string, completed?: boolean, projectId?: number, repeatDays?: number[], time?: string, isActive?: boolean, isHabit?: boolean, goalId?: number) => void;
}

const DIAS_SEMANA = [
    { l: 'L', d: 1 },
    { l: 'M', d: 2 },
    { l: 'X', d: 3 },
    { l: 'J', d: 4 },
    { l: 'V', d: 5 },
    { l: 'S', d: 6 },
    { l: 'D', d: 0 },
];

export const VistaListaMetas: React.FC<VistaListaMetasProps> = ({
    goals,
    dailyBlocks,
    movil,
    gruposNiveles,
    onToggleMilestone,
    onRemoveMilestone,
    onAddMilestone,
    onUpdateGoal,
    onEditarMeta,
    onAbrirPlazo,
    onAbrirDetalle,
    setForm,
    updateDailyBlock,
    addDailyBlock,
}) => {
    const [busqueda, setBusqueda] = useState('');
    const [colapsados, setColapsados] = useState<Record<string, boolean>>({});
    const [nuevaTareaTexto, setNuevaTareaTexto] = useState<Record<string, string>>({});
    const [nuevoPasoTexto, setNuevoPasoTexto] = useState<Record<number, string>>({});
    const [nuevaIdeaTexto, setNuevaIdeaTexto] = useState<Record<number, string>>({});
    const [pasosAbiertos, setPasosAbiertos] = useState<Record<number, boolean>>({});
    const [convT, setConvT] = useState<{ id: number; rep: boolean; dias: number[]; goalId: number } | null>(null);

    // Expandir / colapsar helpers
    const toggleColapso = (key: string) => {
        setColapsados(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const expandirTodo = () => setColapsados({});
    const colapsarTodo = () => {
        const todos: Record<string, boolean> = {};
        gruposNiveles.forEach(gn => {
            todos[`nivel-${gn.nivelNum}`] = true;
            gn.gruposProyecto.forEach(gp => {
                todos[`vis-${gn.nivelNum}-${gp.proyecto?.id || 'sin'}`] = true;
                gp.metas.forEach(g => {
                    todos[`meta-${g.id}`] = true;
                });
            });
        });
        setColapsados(todos);
    };

    // Estadísticas
    const totalMetas = goals.filter(g => !g.parentId).length;
    const totalTareas = useMemo(() => {
        return goals.reduce((acc, g) => acc + (g.milestones?.length || 0), 0);
    }, [goals]);
    const totalTareasHechas = useMemo(() => {
        return goals.reduce((acc, g) => acc + (g.milestones?.filter(m => m.completed).length || 0), 0);
    }, [goals]);

    // Helpers para tareas repetitivas
    const getBloquesRepetitivos = (goalId: number, m: GoalMilestone) => {
        if (!dailyBlocks) return [];
        const textos = new Set([
            m.text.trim().toLowerCase(),
            ...(m.pasos || []).map(p => p.text.trim().toLowerCase()),
        ]);
        return dailyBlocks.filter(b => b.goalId === goalId && textos.has(b.label.trim().toLowerCase()) && !!(b.repeatDays && b.repeatDays.length > 0));
    };

    // Toggle sub-paso
    const toggleSubPaso = (goal: Goal, m: GoalMilestone, pasoId: number) => {
        if (!m.pasos) return;
        const nuevosPasos = m.pasos.map(p => p.id === pasoId ? { ...p, completed: !p.completed } : p);
        const reales = nuevosPasos.filter(p => !p.repetitiva);
        const todosHechos = reales.length > 0 && reales.every(p => p.completed);
        onUpdateGoal(goal.id, {
            milestones: goal.milestones.map(item => item.id === m.id ? {
                ...item,
                pasos: nuevosPasos,
                completed: todosHechos ? true : item.completed,
            } : item),
        });
    };

    // Agregar sub-paso
    const agregarSubPaso = (goal: Goal, m: GoalMilestone) => {
        const txt = (nuevoPasoTexto[m.id] || '').trim();
        if (!txt) return;
        const nuevos = [...(m.pasos || []), { id: Date.now() + Math.random(), text: txt, completed: false }];
        onUpdateGoal(goal.id, {
            milestones: goal.milestones.map(item => item.id === m.id ? { ...item, pasos: nuevos } : item),
        });
        setNuevoPasoTexto(prev => ({ ...prev, [m.id]: '' }));
    };

    // Eliminar sub-paso
    const eliminarSubPaso = (goal: Goal, m: GoalMilestone, pasoId: number) => {
        if (!m.pasos) return;
        onUpdateGoal(goal.id, {
            milestones: goal.milestones.map(item => item.id === m.id ? {
                ...item,
                pasos: item.pasos?.filter(p => p.id !== pasoId),
            } : item),
        });
    };

    // Agregar idea a meta
    const agregarIdea = (goal: Goal) => {
        const txt = (nuevaIdeaTexto[goal.id] || '').trim();
        if (!txt) return;
        const nueva = { id: Date.now() + Math.random(), text: txt, completed: false };
        onUpdateGoal(goal.id, { listaSimple: [...(goal.listaSimple || []), nueva] });
        setNuevaIdeaTexto(prev => ({ ...prev, [goal.id]: '' }));
    };

    // Convertir idea a tarea
    const convertirIdeaATarea = (goal: Goal, ideaId: number, text: string) => {
        onAddMilestone(goal.id, text, 'corto');
        onUpdateGoal(goal.id, {
            listaSimple: (goal.listaSimple || []).filter(it => it.id !== ideaId),
        });
    };

    // Convertir tarea a Mi Día / Repetitiva
    const convertirTarea = (goalId: number, m: GoalMilestone, dias?: number[]) => {
        if (!addDailyBlock) return;
        const hoy = new Date().toLocaleDateString('en-CA');
        if (m.pasos?.length) {
            m.pasos.filter(p => !p.completed).forEach(p => {
                addDailyBlock(p.text, 'Otro', hoy, false, undefined, dias, undefined, true, false, goalId);
            });
        } else {
            addDailyBlock(m.text, 'Otro', hoy, false, undefined, dias, undefined, true, false, goalId);
        }
    };

    // Filtrado por búsqueda
    const term = busqueda.trim().toLowerCase();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Barra de herramientas de la lista */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '10px 14px',
                background: C.surfaceLowest || '#fff',
                borderRadius: '14px',
                border: `1px solid ${C.outlineVariant}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}>
                {/* Buscador rápido */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flex: movil ? '1 1 100%' : '1 1 300px',
                    maxWidth: '450px',
                    background: C.surfaceContainer,
                    borderRadius: '999px',
                    padding: '6px 14px',
                }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: C.outline }}>
                        search
                    </span>
                    <input
                        type="text"
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        placeholder="Buscar meta, tarea o idea..."
                        style={{
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            fontSize: '0.84rem',
                            color: C.onSurface,
                            width: '100%',
                            fontFamily: 'inherit',
                        }}
                    />
                    {busqueda && (
                        <button
                            type="button"
                            onClick={() => setBusqueda('')}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: C.outline, padding: 0 }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                        </button>
                    )}
                </div>

                {/* Métricas y botones de colapso */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: C.onSurfaceVariant,
                        padding: '4px 10px',
                        background: C.surfaceContainer,
                        borderRadius: '999px',
                        fontFamily: MONO,
                    }}>
                        {totalMetas} metas · {totalTareasHechas}/{totalTareas} tareas
                    </span>

                    <button
                        type="button"
                        onClick={expandirTodo}
                        title="Expandir todas las secciones"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: `1px solid ${C.outlineVariant}`,
                            background: C.surfaceLowest,
                            color: C.onSurfaceVariant,
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>unfold_more</span>
                        {!movil && <span>Expandir</span>}
                    </button>

                    <button
                        type="button"
                        onClick={colapsarTodo}
                        title="Colapsar todas las secciones"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: `1px solid ${C.outlineVariant}`,
                            background: C.surfaceLowest,
                            color: C.onSurfaceVariant,
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>unfold_less</span>
                        {!movil && <span>Colapsar</span>}
                    </button>
                </div>
            </div>

            {/* Listado jerárquico */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {gruposNiveles.map(gn => {
                    const keyNivel = `nivel-${gn.nivelNum}`;
                    const nivelColapsado = !!colapsados[keyNivel];

                    // Filtrado
                    const gruposFiltrados = gn.gruposProyecto.map(gp => {
                        const metasFiltradas = gp.metas.filter(g => {
                            if (!term) return true;
                            if (g.title.toLowerCase().includes(term)) return true;
                            if (gp.proyecto?.name.toLowerCase().includes(term)) return true;
                            if (g.milestones?.some(m => m.text.toLowerCase().includes(term) || m.pasos?.some(p => p.text.toLowerCase().includes(term)))) return true;
                            if (g.listaSimple?.some(it => it.text.toLowerCase().includes(term))) return true;
                            return false;
                        });
                        return { ...gp, metas: metasFiltradas };
                    }).filter(gp => gp.metas.length > 0 || !term);

                    if (term && gruposFiltrados.every(gp => gp.metas.length === 0)) return null;

                    return (
                        <div
                            key={gn.nivelNum}
                            style={{
                                background: '#fff',
                                borderRadius: '16px',
                                border: `1px solid ${gn.info.color}35`,
                                borderLeft: `6px solid ${gn.info.color}`,
                                overflow: 'hidden',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                            }}
                        >
                            {/* Cabecera del Nivel / Paso */}
                            <div
                                onClick={() => toggleColapso(keyNivel)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: movil ? '10px 14px' : '14px 20px',
                                    background: `${gn.info.color}08`,
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    borderBottom: nivelColapsado ? 'none' : `1px solid ${gn.info.color}20`,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                    <span className="material-symbols-outlined" style={{
                                        fontSize: '20px',
                                        color: gn.info.color,
                                        transform: nivelColapsado ? 'rotate(-90deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.15s ease',
                                    }}>
                                        expand_more
                                    </span>
                                    <span className="material-symbols-outlined" style={{ fontSize: '22px', color: gn.info.color }}>
                                        {gn.info.icono}
                                    </span>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.94rem', fontWeight: 900, color: gn.info.color, letterSpacing: '0.04em' }}>
                                                {gn.info.titulo}
                                            </span>
                                            <span style={{
                                                fontSize: '0.68rem',
                                                fontWeight: 700,
                                                padding: '1px 8px',
                                                borderRadius: '999px',
                                                background: `${gn.info.color}20`,
                                                color: gn.info.color,
                                            }}>
                                                {gn.info.horizonte}
                                            </span>
                                        </div>
                                        {!movil && (
                                            <div style={{ fontSize: '0.74rem', color: C.onSurfaceVariant, marginTop: '2px', fontWeight: 500 }}>
                                                {gn.info.subtitulo}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                    <span style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        padding: '3px 10px',
                                        borderRadius: '999px',
                                        background: gn.completadas === gn.totalMetas && gn.totalMetas > 0 ? '#10B981' : '#fff',
                                        color: gn.completadas === gn.totalMetas && gn.totalMetas > 0 ? '#fff' : C.onSurface,
                                        border: `1px solid ${C.outlineVariant}`,
                                        fontFamily: MONO,
                                    }}>
                                        {gn.completadas}/{gn.totalMetas} metas
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setForm({ tipo: 'meta', inicial: { nivel: gn.nivelNum, color: gn.info.color } });
                                        }}
                                        title={`Agregar meta al Paso ${gn.nivelNum}`}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            fontSize: '0.72rem',
                                            fontWeight: 800,
                                            padding: '4px 10px',
                                            borderRadius: '999px',
                                            background: `${gn.info.color}15`,
                                            color: gn.info.color,
                                            border: `1px solid ${gn.info.color}35`,
                                            cursor: 'pointer',
                                            fontFamily: 'inherit',
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
                                        <span>Meta</span>
                                    </button>
                                </div>
                            </div>

                            {/* Contenido del Nivel (Visiones y Metas) */}
                            {!nivelColapsado && (
                                <div style={{ display: 'flex', flexDirection: 'column', padding: movil ? '8px 10px 14px' : '12px 18px 18px', gap: '14px' }}>
                                    {gruposFiltrados.map(gp => {
                                        const keyVis = `vis-${gn.nivelNum}-${gp.proyecto?.id || 'sin'}`;
                                        const visColapsada = !!colapsados[keyVis];
                                        const colorVis = gp.proyecto?.color || gn.info.color;

                                        return (
                                            <div
                                                key={gp.proyecto?.id || 'sin'}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '10px',
                                                    background: C.surfaceContainerLow || '#fafafa',
                                                    borderRadius: '14px',
                                                    padding: movil ? '10px 12px' : '12px 16px',
                                                    border: `1px solid ${C.outlineVariant}`,
                                                }}
                                            >
                                                {/* Cabecera de Visión / Proyecto */}
                                                <div
                                                    onClick={() => toggleColapso(keyVis)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        cursor: 'pointer',
                                                        userSelect: 'none',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span className="material-symbols-outlined" style={{
                                                            fontSize: '18px',
                                                            color: C.outline,
                                                            transform: visColapsada ? 'rotate(-90deg)' : 'rotate(0deg)',
                                                            transition: 'transform 0.15s ease',
                                                        }}>
                                                            arrow_drop_down
                                                        </span>
                                                        <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.outline }}>
                                                            {gp.proyecto ? '🧭 Visión' : 'Otras metas'}
                                                        </span>
                                                        {gp.proyecto && (
                                                            <span style={{
                                                                fontSize: '0.9rem',
                                                                fontWeight: 800,
                                                                color: colorVis,
                                                                padding: '1px 8px',
                                                                borderRadius: '6px',
                                                                background: `${colorVis}12`,
                                                            }}>
                                                                {gp.proyecto.name}
                                                            </span>
                                                        )}
                                                        <span style={{ fontSize: '0.72rem', color: C.outline, fontFamily: MONO, fontWeight: 700 }}>
                                                            ({gp.metas.length})
                                                        </span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setForm({
                                                                tipo: 'meta',
                                                                inicial: {
                                                                    projectId: gp.proyecto?.id,
                                                                    nivel: gn.nivelNum,
                                                                    color: colorVis,
                                                                    area: gp.proyecto ? 'Negocio' : 'Personal',
                                                                },
                                                            });
                                                        }}
                                                        title="Agregar meta a esta visión"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '3px',
                                                            fontSize: '0.68rem',
                                                            fontWeight: 800,
                                                            padding: '2px 8px',
                                                            borderRadius: '999px',
                                                            background: `${colorVis}15`,
                                                            color: colorVis,
                                                            border: `1px solid ${colorVis}35`,
                                                            cursor: 'pointer',
                                                            fontFamily: 'inherit',
                                                        }}
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>add</span>
                                                        <span>Meta</span>
                                                    </button>
                                                </div>

                                                {/* Listado de Metas de esta Visión */}
                                                {!visColapsada && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        {gp.metas.map(g => {
                                                            const keyMeta = `meta-${g.id}`;
                                                            const metaColapsada = !!colapsados[keyMeta];
                                                            const colorMeta = g.color || colorVis;
                                                            const milestones = g.milestones || [];
                                                            const hechos = milestones.filter(m => m.completed).length;
                                                            const tot = milestones.length;

                                                            // Agrupar tareas por plazo
                                                            const plazosConfig: GoalHorizon[] = ['corto', 'mediano', 'largo'];
                                                            const nombresPlazo = g.nombresPlazo || {};

                                                            return (
                                                                <div
                                                                    key={g.id}
                                                                    style={{
                                                                        background: '#fff',
                                                                        borderRadius: '12px',
                                                                        border: `1px solid ${C.outlineVariant}`,
                                                                        overflow: 'hidden',
                                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                                                    }}
                                                                >
                                                                    {/* Fila Principal de la Meta */}
                                                                    <div style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'space-between',
                                                                        padding: '10px 14px',
                                                                        gap: '10px',
                                                                        borderBottom: metaColapsada ? 'none' : `1px solid ${C.surfaceContainer}`,
                                                                    }}>
                                                                        <div
                                                                            onClick={() => toggleColapso(keyMeta)}
                                                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, cursor: 'pointer' }}
                                                                        >
                                                                            <span className="material-symbols-outlined" style={{
                                                                                fontSize: '18px',
                                                                                color: C.outline,
                                                                                transform: metaColapsada ? 'rotate(-90deg)' : 'rotate(0deg)',
                                                                                transition: 'transform 0.15s ease',
                                                                            }}>
                                                                                expand_more
                                                                            </span>
                                                                            <span style={{ fontSize: '18px' }}>{g.icon || '🎯'}</span>
                                                                            <span style={{
                                                                                fontSize: '0.92rem',
                                                                                fontWeight: 800,
                                                                                color: g.status === 'completado' ? C.outline : C.onSurface,
                                                                                textDecoration: g.status === 'completado' ? 'line-through' : 'none',
                                                                                wordBreak: 'break-word',
                                                                            }}>
                                                                                {g.title}
                                                                            </span>

                                                                            {/* Badges de meta */}
                                                                            <span style={{
                                                                                fontSize: '0.68rem',
                                                                                fontWeight: 700,
                                                                                padding: '2px 8px',
                                                                                borderRadius: '999px',
                                                                                background: `${colorMeta}15`,
                                                                                color: colorMeta,
                                                                            }}>
                                                                                {g.area || 'Meta'}
                                                                            </span>

                                                                            {g.status === 'completado' && (
                                                                                <span style={{
                                                                                    fontSize: '0.66rem',
                                                                                    fontWeight: 800,
                                                                                    padding: '2px 7px',
                                                                                    borderRadius: '999px',
                                                                                    background: 'rgba(16,185,129,0.15)',
                                                                                    color: '#10B981',
                                                                                }}>
                                                                                    Lograda
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* Acciones y progreso de la meta */}
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                                            {/* Switch de pausada / activa */}
                                                                            <button
                                                                                type="button"
                                                                                role="switch"
                                                                                aria-checked={!g.inactiva}
                                                                                onClick={() => onUpdateGoal(g.id, { inactiva: !g.inactiva })}
                                                                                title={g.inactiva ? 'Meta en pausa · Toca para activar' : 'Meta activa · Toca para pausar'}
                                                                                style={{
                                                                                    display: 'inline-flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '4px',
                                                                                    padding: '2px 6px',
                                                                                    borderRadius: '999px',
                                                                                    border: `1px solid ${!g.inactiva ? '#10B981' : C.outlineVariant}`,
                                                                                    background: !g.inactiva ? 'rgba(16,185,129,0.12)' : C.surfaceContainerLow,
                                                                                    cursor: 'pointer',
                                                                                }}
                                                                            >
                                                                                <span style={{
                                                                                    width: '18px', height: '10px', borderRadius: '999px',
                                                                                    background: !g.inactiva ? '#10B981' : C.outlineVariant,
                                                                                    position: 'relative', display: 'inline-block',
                                                                                }}>
                                                                                    <span style={{
                                                                                        position: 'absolute', top: '1px',
                                                                                        left: !g.inactiva ? '9px' : '1px',
                                                                                        width: '8px', height: '8px', borderRadius: '50%',
                                                                                        background: '#fff',
                                                                                    }} />
                                                                                </span>
                                                                            </button>

                                                                            {/* Contador de tareas */}
                                                                            <span style={{
                                                                                fontSize: '0.72rem',
                                                                                fontWeight: 800,
                                                                                padding: '2px 8px',
                                                                                borderRadius: '999px',
                                                                                background: C.surfaceContainer,
                                                                                color: C.onSurface,
                                                                                fontFamily: MONO,
                                                                            }}>
                                                                                {hechos}/{tot}
                                                                            </span>

                                                                            {/* Abrir modal de plazos */}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => onAbrirPlazo(g.id, 'corto')}
                                                                                title="Abrir vista detallada de la meta"
                                                                                style={{
                                                                                    border: 'none',
                                                                                    background: 'transparent',
                                                                                    color: C.outline,
                                                                                    cursor: 'pointer',
                                                                                    padding: '2px',
                                                                                    display: 'flex',
                                                                                }}
                                                                            >
                                                                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>open_in_new</span>
                                                                            </button>

                                                                            {/* Editar meta */}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => onEditarMeta(g)}
                                                                                title="Editar meta"
                                                                                style={{
                                                                                    border: 'none',
                                                                                    background: 'transparent',
                                                                                    color: C.outline,
                                                                                    cursor: 'pointer',
                                                                                    padding: '2px',
                                                                                    display: 'flex',
                                                                                }}
                                                                            >
                                                                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>more_vert</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Contenido de la Meta: Plazos, Tareas, Sub-pasos e Ideas */}
                                                                    {!metaColapsada && (
                                                                        <div style={{
                                                                            padding: '10px 14px 14px 28px',
                                                                            borderLeft: `3px solid ${colorMeta}40`,
                                                                            marginLeft: '14px',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            gap: '14px',
                                                                        }}>
                                                                            {/* Plazos de la meta */}
                                                                            {plazosConfig.map(plazo => {
                                                                                const tareasPlazo = milestones.filter(m => (m.plazo || 'corto') === plazo);
                                                                                const nombrePropio = nombresPlazo[plazo] || (plazo === 'corto' ? 'Corto plazo · este mes' : plazo === 'mediano' ? 'Mediano plazo' : 'Largo plazo');
                                                                                const keyInput = `${g.id}-${plazo}`;

                                                                                // Mostrar plazo si tiene tareas o si es corto plazo
                                                                                if (tareasPlazo.length === 0 && plazo !== 'corto') return null;

                                                                                return (
                                                                                    <div key={plazo} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                                        {/* Título del plazo */}
                                                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: colorMeta }}>
                                                                                                    schedule
                                                                                                </span>
                                                                                                <span style={{
                                                                                                    fontSize: '0.72rem',
                                                                                                    fontWeight: 800,
                                                                                                    letterSpacing: '0.06em',
                                                                                                    textTransform: 'uppercase',
                                                                                                    color: C.onSurfaceVariant,
                                                                                                }}>
                                                                                                    {nombrePropio}
                                                                                                </span>
                                                                                                <span style={{ fontSize: '0.7rem', color: C.outline, fontFamily: MONO, fontWeight: 700 }}>
                                                                                                    ({tareasPlazo.filter(t => t.completed).length}/{tareasPlazo.length})
                                                                                                </span>
                                                                                            </div>

                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => onAbrirPlazo(g.id, plazo)}
                                                                                                title={`Ver plazo ${nombrePropio} completo`}
                                                                                                style={{
                                                                                                    background: 'none',
                                                                                                    border: 'none',
                                                                                                    color: colorMeta,
                                                                                                    cursor: 'pointer',
                                                                                                    fontSize: '0.7rem',
                                                                                                    fontWeight: 700,
                                                                                                    padding: '2px 4px',
                                                                                                }}
                                                                                            >
                                                                                                Abrir plazo →
                                                                                            </button>
                                                                                        </div>

                                                                                        {/* Lista de Tareas en este plazo */}
                                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                                            {tareasPlazo.map(m => {
                                                                                                const tienePasos = (m.pasos || []).length > 0;
                                                                                                const pasosAbierto = !!pasosAbiertos[m.id];
                                                                                                const pasosHechos = (m.pasos || []).filter(p => p.completed).length;
                                                                                                const totPasos = (m.pasos || []).length;
                                                                                                const bloquesRep = getBloquesRepetitivos(g.id, m);
                                                                                                const esRepetitiva = bloquesRep.length > 0;
                                                                                                const repActiva = esRepetitiva && bloquesRep.some(b => b.isActive !== false);

                                                                                                return (
                                                                                                    <div
                                                                                                        key={m.id}
                                                                                                        style={{
                                                                                                            display: 'flex',
                                                                                                            flexDirection: 'column',
                                                                                                            gap: '4px',
                                                                                                            background: m.completed ? 'transparent' : C.surfaceLowest || '#fff',
                                                                                                            borderRadius: '8px',
                                                                                                            padding: '6px 8px',
                                                                                                            border: `1px solid ${m.completed ? 'transparent' : C.outlineVariant}`,
                                                                                                        }}
                                                                                                    >
                                                                                                        {/* Fila de la tarea */}
                                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                                            {/* Checkbox circular de tarea */}
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => onToggleMilestone(g.id, m.id)}
                                                                                                                title={m.completed ? 'Marcar como pendiente' : 'Marcar como hecha'}
                                                                                                                style={{
                                                                                                                    width: '20px',
                                                                                                                    height: '20px',
                                                                                                                    borderRadius: '50%',
                                                                                                                    border: `2px solid ${m.completed ? colorMeta : C.outlineVariant}`,
                                                                                                                    background: m.completed ? colorMeta : 'transparent',
                                                                                                                    display: 'flex',
                                                                                                                    alignItems: 'center',
                                                                                                                    justifyContent: 'center',
                                                                                                                    cursor: 'pointer',
                                                                                                                    flexShrink: 0,
                                                                                                                    padding: 0,
                                                                                                                    transition: 'all 0.15s ease',
                                                                                                                }}
                                                                                                            >
                                                                                                                {m.completed && (
                                                                                                                    <span style={{ color: '#fff', fontSize: '11px', fontWeight: 900 }}>✓</span>
                                                                                                                )}
                                                                                                            </button>

                                                                                                            {/* Texto de la tarea */}
                                                                                                            <span
                                                                                                                onClick={() => onAbrirDetalle(g.id, m.id, plazo)}
                                                                                                                style={{
                                                                                                                    flex: 1,
                                                                                                                    minWidth: 0,
                                                                                                                    fontSize: '0.86rem',
                                                                                                                    fontWeight: 600,
                                                                                                                    color: m.completed ? C.outline : C.onSurface,
                                                                                                                    textDecoration: m.completed ? 'line-through' : 'none',
                                                                                                                    cursor: 'pointer',
                                                                                                                    wordBreak: 'break-word',
                                                                                                                }}
                                                                                                            >
                                                                                                                {m.text}
                                                                                                            </span>

                                                                                                            {/* Badge de repetitiva / Switch de activación masiva */}
                                                                                                            {esRepetitiva && (
                                                                                                                <button
                                                                                                                    type="button"
                                                                                                                    role="switch"
                                                                                                                    aria-checked={repActiva}
                                                                                                                    onClick={() => {
                                                                                                                        if (!updateDailyBlock) return;
                                                                                                                        const nuevo = !repActiva;
                                                                                                                        bloquesRep.forEach(b => updateDailyBlock(b.id, { isActive: nuevo }));
                                                                                                                    }}
                                                                                                                    title={repActiva ? 'Pausar serie repetitiva' : 'Activar serie repetitiva'}
                                                                                                                    style={{
                                                                                                                        display: 'inline-flex',
                                                                                                                        alignItems: 'center',
                                                                                                                        gap: '4px',
                                                                                                                        padding: '1px 6px',
                                                                                                                        borderRadius: '999px',
                                                                                                                        border: `1px solid ${repActiva ? colorMeta : C.outlineVariant}`,
                                                                                                                        background: repActiva ? `${colorMeta}15` : C.surfaceContainerLow,
                                                                                                                        fontSize: '0.66rem',
                                                                                                                        fontWeight: 700,
                                                                                                                        color: repActiva ? colorMeta : C.outline,
                                                                                                                        cursor: 'pointer',
                                                                                                                    }}
                                                                                                                >
                                                                                                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>repeat</span>
                                                                                                                    <span>{repActiva ? 'Activa' : 'Desactivada'}</span>
                                                                                                                </button>
                                                                                                            )}

                                                                                                            {/* Contador de pasos y toggle de pasos */}
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => setPasosAbiertos(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                                                                                                                title={pasosAbierto ? 'Ocultar pasos' : 'Ver o agregar pasos'}
                                                                                                                style={{
                                                                                                                    display: 'inline-flex',
                                                                                                                    alignItems: 'center',
                                                                                                                    gap: '3px',
                                                                                                                    padding: '2px 7px',
                                                                                                                    borderRadius: '999px',
                                                                                                                    border: `1px solid ${tienePasos ? `${colorMeta}40` : C.outlineVariant}`,
                                                                                                                    background: tienePasos ? `${colorMeta}10` : 'transparent',
                                                                                                                    color: tienePasos ? colorMeta : C.outline,
                                                                                                                    fontSize: '0.68rem',
                                                                                                                    fontWeight: 700,
                                                                                                                    cursor: 'pointer',
                                                                                                                    fontFamily: MONO,
                                                                                                                }}
                                                                                                            >
                                                                                                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                                                                                                                    {tienePasos ? 'account_tree' : 'add'}
                                                                                                                </span>
                                                                                                                <span>{tienePasos ? `${pasosHechos}/${totPasos}` : 'Pasos'}</span>
                                                                                                            </button>

                                                                                                            {/* Convertir a hoy o repetitiva */}
                                                                                                            {!m.completed && (
                                                                                                                <button
                                                                                                                    type="button"
                                                                                                                    onClick={() => setConvT(convT?.id === m.id ? null : { id: m.id, rep: false, dias: [1, 2, 3, 4, 5], goalId: g.id })}
                                                                                                                    title="Convertir en tarea de hoy o repetitiva"
                                                                                                                    style={{
                                                                                                                        border: 'none',
                                                                                                                        background: 'transparent',
                                                                                                                        color: convT?.id === m.id ? colorMeta : C.outline,
                                                                                                                        cursor: 'pointer',
                                                                                                                        padding: '2px',
                                                                                                                        display: 'flex',
                                                                                                                    }}
                                                                                                                >
                                                                                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>today</span>
                                                                                                                </button>
                                                                                                            )}

                                                                                                            {/* Eliminar tarea */}
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => {
                                                                                                                    if (window.confirm(`¿Quitar la tarea "${m.text}"?`)) {
                                                                                                                        onRemoveMilestone(g.id, m.id);
                                                                                                                    }
                                                                                                                }}
                                                                                                                title="Eliminar tarea"
                                                                                                                style={{
                                                                                                                    border: 'none',
                                                                                                                    background: 'transparent',
                                                                                                                    color: C.outline,
                                                                                                                    cursor: 'pointer',
                                                                                                                    padding: '2px',
                                                                                                                    display: 'flex',
                                                                                                                }}
                                                                                                            >
                                                                                                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                                                                                                            </button>
                                                                                                        </div>

                                                                                                        {/* Menú de conversión rápida de tarea */}
                                                                                                        {convT?.id === m.id && (
                                                                                                            <div style={{
                                                                                                                marginTop: '6px',
                                                                                                                padding: '8px 10px',
                                                                                                                background: `${colorMeta}0A`,
                                                                                                                borderRadius: '8px',
                                                                                                                border: `1px solid ${colorMeta}25`,
                                                                                                                display: 'flex',
                                                                                                                flexDirection: 'column',
                                                                                                                gap: '8px',
                                                                                                            }}>
                                                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                                                    <button
                                                                                                                        type="button"
                                                                                                                        onClick={() => {
                                                                                                                            convertirTarea(g.id, m);
                                                                                                                            setConvT(null);
                                                                                                                        }}
                                                                                                                        style={{
                                                                                                                            padding: '4px 10px',
                                                                                                                            borderRadius: '6px',
                                                                                                                            border: 'none',
                                                                                                                            background: colorMeta,
                                                                                                                            color: '#fff',
                                                                                                                            fontSize: '0.72rem',
                                                                                                                            fontWeight: 700,
                                                                                                                            cursor: 'pointer',
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        📅 Tarea de hoy
                                                                                                                    </button>

                                                                                                                    <span style={{ fontSize: '0.7rem', color: C.outline }}>o elegir días:</span>

                                                                                                                    <div style={{ display: 'flex', gap: '3px' }}>
                                                                                                                        {DIAS_SEMANA.map(({ l, d }) => {
                                                                                                                            const activo = convT.dias.includes(d);
                                                                                                                            return (
                                                                                                                                <button
                                                                                                                                    key={d}
                                                                                                                                    type="button"
                                                                                                                                    onClick={() => setConvT(prev => prev ? {
                                                                                                                                        ...prev,
                                                                                                                                        dias: activo ? prev.dias.filter(x => x !== d) : [...prev.dias, d],
                                                                                                                                    } : null)}
                                                                                                                                    style={{
                                                                                                                                        width: '20px',
                                                                                                                                        height: '20px',
                                                                                                                                        borderRadius: '4px',
                                                                                                                                        border: 'none',
                                                                                                                                        background: activo ? colorMeta : C.surfaceContainer,
                                                                                                                                        color: activo ? '#fff' : C.outline,
                                                                                                                                        fontSize: '0.62rem',
                                                                                                                                        fontWeight: 800,
                                                                                                                                        cursor: 'pointer',
                                                                                                                                    }}
                                                                                                                                >
                                                                                                                                    {l}
                                                                                                                                </button>
                                                                                                                            );
                                                                                                                        })}
                                                                                                                    </div>

                                                                                                                    {convT.dias.length > 0 && (
                                                                                                                        <button
                                                                                                                            type="button"
                                                                                                                            onClick={() => {
                                                                                                                                convertirTarea(g.id, m, convT.dias);
                                                                                                                                setConvT(null);
                                                                                                                            }}
                                                                                                                            style={{
                                                                                                                                padding: '4px 10px',
                                                                                                                                borderRadius: '6px',
                                                                                                                                border: 'none',
                                                                                                                                background: colorMeta,
                                                                                                                                color: '#fff',
                                                                                                                                fontSize: '0.72rem',
                                                                                                                                fontWeight: 700,
                                                                                                                                cursor: 'pointer',
                                                                                                                            }}
                                                                                                                        >
                                                                                                                            Crear repetitiva ({convT.dias.length}d)
                                                                                                                        </button>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        )}

                                                                                                        {/* Sub-pasos indentados */}
                                                                                                        {pasosAbierto && (
                                                                                                            <div style={{
                                                                                                                paddingLeft: '22px',
                                                                                                                borderLeft: `2px solid ${colorMeta}30`,
                                                                                                                marginLeft: '10px',
                                                                                                                marginTop: '6px',
                                                                                                                display: 'flex',
                                                                                                                flexDirection: 'column',
                                                                                                                gap: '5px',
                                                                                                            }}>
                                                                                                                {(m.pasos || []).map(p => (
                                                                                                                    <div
                                                                                                                        key={p.id}
                                                                                                                        style={{
                                                                                                                            display: 'flex',
                                                                                                                            alignItems: 'center',
                                                                                                                            gap: '8px',
                                                                                                                            padding: '3px 0',
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        <button
                                                                                                                            type="button"
                                                                                                                            onClick={() => toggleSubPaso(g, m, p.id)}
                                                                                                                            style={{
                                                                                                                                width: '16px',
                                                                                                                                height: '16px',
                                                                                                                                borderRadius: '4px',
                                                                                                                                border: `1.5px solid ${p.completed ? colorMeta : C.outlineVariant}`,
                                                                                                                                background: p.completed ? colorMeta : 'transparent',
                                                                                                                                display: 'flex',
                                                                                                                                alignItems: 'center',
                                                                                                                                justifyContent: 'center',
                                                                                                                                cursor: 'pointer',
                                                                                                                                padding: 0,
                                                                                                                                flexShrink: 0,
                                                                                                                            }}
                                                                                                                        >
                                                                                                                            {p.completed && (
                                                                                                                                <span style={{ color: '#fff', fontSize: '9px', fontWeight: 900 }}>✓</span>
                                                                                                                            )}
                                                                                                                        </button>
                                                                                                                        <span style={{
                                                                                                                            flex: 1,
                                                                                                                            minWidth: 0,
                                                                                                                            fontSize: '0.8rem',
                                                                                                                            color: p.completed ? C.outline : C.onSurface,
                                                                                                                            textDecoration: p.completed ? 'line-through' : 'none',
                                                                                                                            wordBreak: 'break-word',
                                                                                                                        }}>
                                                                                                                            {p.text}
                                                                                                                        </span>
                                                                                                                        <button
                                                                                                                            type="button"
                                                                                                                            onClick={() => eliminarSubPaso(g, m, p.id)}
                                                                                                                            title="Quitar paso"
                                                                                                                            style={{
                                                                                                                                border: 'none',
                                                                                                                                background: 'transparent',
                                                                                                                                color: C.outline,
                                                                                                                                cursor: 'pointer',
                                                                                                                                padding: '2px',
                                                                                                                            }}
                                                                                                                        >
                                                                                                                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                                                                                                                        </button>
                                                                                                                    </div>
                                                                                                                ))}

                                                                                                                {/* Input para agregar sub-paso */}
                                                                                                                <form
                                                                                                                    onSubmit={e => {
                                                                                                                        e.preventDefault();
                                                                                                                        agregarSubPaso(g, m);
                                                                                                                    }}
                                                                                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}
                                                                                                                >
                                                                                                                    <span style={{ color: C.outline, fontSize: '0.8rem' }}>+</span>
                                                                                                                    <input
                                                                                                                        type="text"
                                                                                                                        value={nuevoPasoTexto[m.id] || ''}
                                                                                                                        onChange={e => setNuevoPasoTexto(prev => ({ ...prev, [m.id]: e.target.value }))}
                                                                                                                        placeholder="Agregar paso... (Enter)"
                                                                                                                        style={{
                                                                                                                            border: 'none',
                                                                                                                            borderBottom: `1px solid ${C.outlineVariant}`,
                                                                                                                            background: 'transparent',
                                                                                                                            outline: 'none',
                                                                                                                            fontSize: '0.78rem',
                                                                                                                            color: C.onSurface,
                                                                                                                            flex: 1,
                                                                                                                            padding: '2px 0',
                                                                                                                            fontFamily: 'inherit',
                                                                                                                        }}
                                                                                                                    />
                                                                                                                </form>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>

                                                                                        {/* Input para agregar tarea rápida en este plazo */}
                                                                                        <form
                                                                                            onSubmit={e => {
                                                                                                e.preventDefault();
                                                                                                const t = (nuevaTareaTexto[keyInput] || '').trim();
                                                                                                if (!t) return;
                                                                                                onAddMilestone(g.id, t, plazo);
                                                                                                setNuevaTareaTexto(prev => ({ ...prev, [keyInput]: '' }));
                                                                                            }}
                                                                                            style={{
                                                                                                display: 'flex',
                                                                                                alignItems: 'center',
                                                                                                gap: '8px',
                                                                                                padding: '5px 8px',
                                                                                                background: 'rgba(0,0,0,0.015)',
                                                                                                borderRadius: '8px',
                                                                                                border: `1px dashed ${C.outlineVariant}`,
                                                                                                marginTop: '2px',
                                                                                            }}
                                                                                        >
                                                                                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: colorMeta }}>add</span>
                                                                                            <input
                                                                                                type="text"
                                                                                                value={nuevaTareaTexto[keyInput] || ''}
                                                                                                onChange={e => setNuevaTareaTexto(prev => ({ ...prev, [keyInput]: e.target.value }))}
                                                                                                placeholder={`+ Nueva tarea en ${nombrePropio.toLowerCase()}... (Enter)`}
                                                                                                style={{
                                                                                                    border: 'none',
                                                                                                    background: 'transparent',
                                                                                                    outline: 'none',
                                                                                                    fontSize: '0.8rem',
                                                                                                    color: C.onSurface,
                                                                                                    flex: 1,
                                                                                                    fontFamily: 'inherit',
                                                                                                }}
                                                                                            />
                                                                                        </form>
                                                                                    </div>
                                                                                );
                                                                            })}

                                                                            {/* Ideas / Cosas que podría hacer de la Meta */}
                                                                            <div style={{
                                                                                marginTop: '8px',
                                                                                padding: '8px 12px',
                                                                                background: `${colorMeta}08`,
                                                                                borderRadius: '10px',
                                                                                border: `1px dashed ${colorMeta}30`,
                                                                                display: 'flex',
                                                                                flexDirection: 'column',
                                                                                gap: '6px',
                                                                            }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color: colorMeta }}>lightbulb</span>
                                                                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: colorMeta }}>
                                                                                        Ideas / Cosas que podría hacer
                                                                                    </span>
                                                                                    <span style={{ fontSize: '0.66rem', color: C.outline }}>(aún no son tareas)</span>
                                                                                </div>

                                                                                {/* Lista de ideas */}
                                                                                {(g.listaSimple || []).map(it => (
                                                                                    <div
                                                                                        key={it.id}
                                                                                        style={{
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            gap: '8px',
                                                                                            padding: '2px 0',
                                                                                        }}
                                                                                    >
                                                                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: colorMeta, flexShrink: 0 }} />
                                                                                        <span style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', color: C.onSurface, wordBreak: 'break-word' }}>
                                                                                            {it.text}
                                                                                        </span>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => convertirIdeaATarea(g, it.id, it.text)}
                                                                                            title="Pasar a tarea formal de corto plazo"
                                                                                            style={{
                                                                                                background: `${colorMeta}18`,
                                                                                                border: 'none',
                                                                                                borderRadius: '4px',
                                                                                                color: colorMeta,
                                                                                                fontSize: '0.66rem',
                                                                                                fontWeight: 700,
                                                                                                cursor: 'pointer',
                                                                                                padding: '2px 6px',
                                                                                            }}
                                                                                        >
                                                                                            + Pasar a tarea
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                onUpdateGoal(g.id, {
                                                                                                    listaSimple: (g.listaSimple || []).filter(x => x.id !== it.id),
                                                                                                });
                                                                                            }}
                                                                                            title="Eliminar idea"
                                                                                            style={{ border: 'none', background: 'transparent', color: C.outline, cursor: 'pointer', padding: 0 }}
                                                                                        >
                                                                                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                                                                                        </button>
                                                                                    </div>
                                                                                ))}

                                                                                {/* Input rápida de idea */}
                                                                                <form
                                                                                    onSubmit={e => {
                                                                                        e.preventDefault();
                                                                                        agregarIdea(g);
                                                                                    }}
                                                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}
                                                                                >
                                                                                    <span style={{ fontSize: '0.75rem', color: colorMeta }}>+</span>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={nuevaIdeaTexto[g.id] || ''}
                                                                                        onChange={e => setNuevaIdeaTexto(prev => ({ ...prev, [g.id]: e.target.value }))}
                                                                                        placeholder="Anotar algo que podría hacer... (Enter)"
                                                                                        style={{
                                                                                            border: 'none',
                                                                                            background: 'transparent',
                                                                                            outline: 'none',
                                                                                            fontSize: '0.76rem',
                                                                                            color: C.onSurface,
                                                                                            flex: 1,
                                                                                            fontFamily: 'inherit',
                                                                                        }}
                                                                                    />
                                                                                </form>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
