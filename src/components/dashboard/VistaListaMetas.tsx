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

    // Expandir / colapsar
    const toggleColapso = (key: string) => {
        setColapsados(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const expandirTodo = () => setColapsados({});
    const colapsarTodo = () => {
        const todos: Record<string, boolean> = {};
        gruposNiveles.forEach(gn => {
            todos[`nivel-${gn.nivelNum}`] = true;
            gn.gruposProyecto.forEach(gp => {
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

    const term = busqueda.trim().toLowerCase();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '920px' }}>
            {/* Barra superior minimalista: buscador y acciones */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                paddingBottom: '12px',
                borderBottom: `1px solid ${C.outlineVariant}`,
            }}>
                {/* Buscador limpio sin bordes pesados */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flex: movil ? '1 1 100%' : '1 1 280px',
                    maxWidth: '400px',
                    background: C.surfaceContainerLow || '#f5f5f5',
                    borderRadius: '999px',
                    padding: '5px 14px',
                }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '17px', color: C.outline }}>search</span>
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
                        <button type="button" onClick={() => setBusqueda('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: C.outline, padding: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                        </button>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.74rem', color: C.outline, fontFamily: MONO, fontWeight: 700 }}>
                        {totalMetas} metas · {totalTareasHechas}/{totalTareas} tareas
                    </span>

                    <button
                        type="button"
                        onClick={expandirTodo}
                        title="Expandir todo"
                        style={{ background: 'none', border: 'none', color: C.outline, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>unfold_more</span>
                        Expandir
                    </button>

                    <button
                        type="button"
                        onClick={colapsarTodo}
                        title="Colapsar todo"
                        style={{ background: 'none', border: 'none', color: C.outline, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>unfold_less</span>
                        Colapsar
                    </button>
                </div>
            </div>

            {/* Lista plana estilo esquema / títulos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {gruposNiveles.map(gn => {
                    const keyNivel = `nivel-${gn.nivelNum}`;
                    const nivelColapsado = !!colapsados[keyNivel];

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
                        <div key={gn.nivelNum} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* TÍTULO NIVEL 1: PASO (H1 limpio con línea de color) */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingBottom: '6px',
                                borderBottom: `2px solid ${gn.info.color}35`,
                            }}>
                                <div
                                    onClick={() => toggleColapso(keyNivel)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <span className="material-symbols-outlined" style={{
                                        fontSize: '18px',
                                        color: gn.info.color,
                                        transform: nivelColapsado ? 'rotate(-90deg)' : 'none',
                                        transition: 'transform 0.15s ease',
                                    }}>
                                        expand_more
                                    </span>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: gn.info.color }}>
                                        {gn.info.icono}
                                    </span>
                                    <span style={{ fontSize: '0.98rem', fontWeight: 900, color: gn.info.color, letterSpacing: '0.04em' }}>
                                        {gn.info.titulo}
                                    </span>
                                    <span style={{
                                        fontSize: '0.66rem',
                                        fontWeight: 700,
                                        padding: '1px 7px',
                                        borderRadius: '999px',
                                        background: `${gn.info.color}15`,
                                        color: gn.info.color,
                                    }}>
                                        {gn.info.horizonte}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: C.outline, fontFamily: MONO }}>
                                        {gn.completadas}/{gn.totalMetas} metas
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ tipo: 'meta', inicial: { nivel: gn.nivelNum, color: gn.info.color } })}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: gn.info.color,
                                            fontWeight: 800,
                                            fontSize: '0.74rem',
                                            cursor: 'pointer',
                                            fontFamily: 'inherit',
                                            padding: '2px 6px',
                                        }}
                                    >
                                        + Meta
                                    </button>
                                </div>
                            </div>

                            {/* CONTENIDO DEL PASO: VISIÓN Y METAS (sin tarjeta, texto fluido) */}
                            {!nivelColapsado && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingLeft: '8px' }}>
                                    {gruposFiltrados.map(gp => {
                                        const colorVis = gp.proyecto?.color || gn.info.color;

                                        return (
                                            <div key={gp.proyecto?.id || 'sin'} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {/* TÍTULO NIVEL 2: VISIÓN / PROYECTO (H2) */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.outline }}>
                                                            {gp.proyecto ? '🧭' : '•'}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '0.92rem',
                                                            fontWeight: 900,
                                                            color: colorVis,
                                                        }}>
                                                            {gp.proyecto ? gp.proyecto.name : 'Otras metas'}
                                                        </span>
                                                        <span style={{ fontSize: '0.7rem', color: C.outline, fontFamily: MONO, fontWeight: 700 }}>
                                                            ({gp.metas.length})
                                                        </span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setForm({
                                                            tipo: 'meta',
                                                            inicial: {
                                                                projectId: gp.proyecto?.id,
                                                                nivel: gn.nivelNum,
                                                                color: colorVis,
                                                                area: gp.proyecto ? 'Negocio' : 'Personal',
                                                            },
                                                        })}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: colorVis,
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            fontFamily: 'inherit',
                                                            padding: '2px 4px',
                                                        }}
                                                    >
                                                        + Meta
                                                    </button>
                                                </div>

                                                {/* METAS (H3 / Items principales con sangría y línea guía sutil) */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingLeft: '14px', borderLeft: `2px solid ${colorVis}25` }}>
                                                    {gp.metas.map(g => {
                                                        const keyMeta = `meta-${g.id}`;
                                                        const metaColapsada = !!colapsados[keyMeta];
                                                        const colorMeta = g.color || colorVis;
                                                        const milestones = g.milestones || [];
                                                        const hechos = milestones.filter(m => m.completed).length;
                                                        const tot = milestones.length;

                                                        const plazosConfig: GoalHorizon[] = ['corto', 'mediano', 'largo'];
                                                        const nombresPlazo = g.nombresPlazo || {};

                                                        return (
                                                            <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                {/* TÍTULO NIVEL 3: META */}
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                                    <div
                                                                        onClick={() => toggleColapso(keyMeta)}
                                                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', flex: 1, minWidth: 0 }}
                                                                    >
                                                                        <span className="material-symbols-outlined" style={{
                                                                            fontSize: '16px',
                                                                            color: C.outline,
                                                                            transform: metaColapsada ? 'rotate(-90deg)' : 'none',
                                                                            transition: 'transform 0.15s ease',
                                                                        }}>
                                                                            expand_more
                                                                        </span>
                                                                        <span style={{ fontSize: '15px' }}>{g.icon || '🎯'}</span>
                                                                        <span style={{
                                                                            fontSize: '0.94rem',
                                                                            fontWeight: 800,
                                                                            color: g.status === 'completado' ? C.outline : C.onSurface,
                                                                            textDecoration: g.status === 'completado' ? 'line-through' : 'none',
                                                                            wordBreak: 'break-word',
                                                                        }}>
                                                                            {g.title}
                                                                        </span>
                                                                        <span style={{
                                                                            fontSize: '0.65rem',
                                                                            fontWeight: 700,
                                                                            padding: '1px 6px',
                                                                            borderRadius: '4px',
                                                                            background: `${colorMeta}15`,
                                                                            color: colorMeta,
                                                                        }}>
                                                                            {g.area || 'Meta'}
                                                                        </span>
                                                                        <span style={{ fontSize: '0.7rem', color: C.outline, fontFamily: MONO, fontWeight: 700 }}>
                                                                            ({hechos}/{tot})
                                                                        </span>
                                                                    </div>

                                                                    {/* Acciones de la Meta */}
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                                        {/* Switch Activa / Pausada */}
                                                                        <button
                                                                            type="button"
                                                                            role="switch"
                                                                            aria-checked={!g.inactiva}
                                                                            onClick={() => onUpdateGoal(g.id, { inactiva: !g.inactiva })}
                                                                            title={g.inactiva ? 'Meta en pausa · Toca para activar' : 'Meta activa · Toca para pausar'}
                                                                            style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                padding: '1px 5px',
                                                                                borderRadius: '999px',
                                                                                border: `1px solid ${!g.inactiva ? '#10B981' : C.outlineVariant}`,
                                                                                background: !g.inactiva ? 'rgba(16,185,129,0.12)' : 'transparent',
                                                                                cursor: 'pointer',
                                                                            }}
                                                                        >
                                                                            <span style={{
                                                                                width: '16px', height: '9px', borderRadius: '999px',
                                                                                background: !g.inactiva ? '#10B981' : C.outlineVariant,
                                                                                position: 'relative', display: 'inline-block',
                                                                            }}>
                                                                                <span style={{
                                                                                    position: 'absolute', top: '1px',
                                                                                    left: !g.inactiva ? '8px' : '1px',
                                                                                    width: '7px', height: '7px', borderRadius: '50%',
                                                                                    background: '#fff',
                                                                                }} />
                                                                            </span>
                                                                        </button>

                                                                        {/* Abrir modal */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => onAbrirPlazo(g.id, 'corto')}
                                                                            title="Abrir detalle"
                                                                            style={{ border: 'none', background: 'transparent', color: C.outline, cursor: 'pointer', padding: '2px', display: 'flex' }}
                                                                        >
                                                                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span>
                                                                        </button>

                                                                        {/* Editar meta */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => onEditarMeta(g)}
                                                                            title="Editar meta"
                                                                            style={{ border: 'none', background: 'transparent', color: C.outline, cursor: 'pointer', padding: '2px', display: 'flex' }}
                                                                        >
                                                                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>more_vert</span>
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* TAREAS Y PLAZOS DE LA META (Líneas simples) */}
                                                                {!metaColapsada && (
                                                                    <div style={{
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: '10px',
                                                                        paddingLeft: '18px',
                                                                        borderLeft: `1.5px solid ${colorMeta}20`,
                                                                        marginLeft: '6px',
                                                                    }}>
                                                                        {plazosConfig.map(plazo => {
                                                                            const tareasPlazo = milestones.filter(m => (m.plazo || 'corto') === plazo);
                                                                            const nombrePropio = nombresPlazo[plazo] || (plazo === 'corto' ? 'Corto plazo · este mes' : plazo === 'mediano' ? 'Mediano plazo' : 'Largo plazo');
                                                                            const keyInput = `${g.id}-${plazo}`;

                                                                            if (tareasPlazo.length === 0 && plazo !== 'corto') return null;

                                                                            return (
                                                                                <div key={plazo} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                                                    {/* TÍTULO DE PLAZO: texto pequeño discreto */}
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                                                        <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.outline }}>
                                                                                            ⏱️ {nombrePropio}
                                                                                        </span>
                                                                                        <span style={{ fontSize: '0.66rem', color: C.outline, fontFamily: MONO, fontWeight: 700 }}>
                                                                                            ({tareasPlazo.filter(t => t.completed).length}/{tareasPlazo.length})
                                                                                        </span>
                                                                                    </div>

                                                                                    {/* Tareas del plazo */}
                                                                                    {tareasPlazo.map(m => {
                                                                                        const tienePasos = (m.pasos || []).length > 0;
                                                                                        const pasosAbierto = !!pasosAbiertos[m.id];
                                                                                        const pasosHechos = (m.pasos || []).filter(p => p.completed).length;
                                                                                        const totPasos = (m.pasos || []).length;
                                                                                        const bloquesRep = getBloquesRepetitivos(g.id, m);
                                                                                        const esRepetitiva = bloquesRep.length > 0;
                                                                                        const repActiva = esRepetitiva && bloquesRep.some(b => b.isActive !== false);

                                                                                        return (
                                                                                            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                                                {/* Fila de tarea limpia */}
                                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0' }}>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => onToggleMilestone(g.id, m.id)}
                                                                                                        title={m.completed ? 'Marcar como pendiente' : 'Marcar como hecha'}
                                                                                                        style={{
                                                                                                            width: '18px',
                                                                                                            height: '18px',
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
                                                                                                        {m.completed && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 900 }}>✓</span>}
                                                                                                    </button>

                                                                                                    <span
                                                                                                        onClick={() => onAbrirDetalle(g.id, m.id, plazo)}
                                                                                                        style={{
                                                                                                            flex: 1,
                                                                                                            minWidth: 0,
                                                                                                            fontSize: '0.88rem',
                                                                                                            fontWeight: 500,
                                                                                                            color: m.completed ? C.outline : C.onSurface,
                                                                                                            textDecoration: m.completed ? 'line-through' : 'none',
                                                                                                            cursor: 'pointer',
                                                                                                            wordBreak: 'break-word',
                                                                                                        }}
                                                                                                    >
                                                                                                        {m.text}
                                                                                                    </span>

                                                                                                    {/* Badge de repetitiva */}
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
                                                                                                            title={repActiva ? 'Pausar repetitiva' : 'Activar repetitiva'}
                                                                                                            style={{
                                                                                                                background: 'none',
                                                                                                                border: 'none',
                                                                                                                color: repActiva ? colorMeta : C.outline,
                                                                                                                fontSize: '0.68rem',
                                                                                                                fontWeight: 700,
                                                                                                                cursor: 'pointer',
                                                                                                                display: 'inline-flex',
                                                                                                                alignItems: 'center',
                                                                                                                gap: '2px',
                                                                                                            }}
                                                                                                        >
                                                                                                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>repeat</span>
                                                                                                            <span>{repActiva ? 'Activa' : 'Pausada'}</span>
                                                                                                        </button>
                                                                                                    )}

                                                                                                    {/* Desplegable de subpasos */}
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => setPasosAbiertos(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                                                                                                        title={pasosAbierto ? 'Ocultar pasos' : 'Ver pasos'}
                                                                                                        style={{
                                                                                                            background: 'none',
                                                                                                            border: 'none',
                                                                                                            color: tienePasos ? colorMeta : C.outline,
                                                                                                            fontSize: '0.7rem',
                                                                                                            fontWeight: 700,
                                                                                                            cursor: 'pointer',
                                                                                                            fontFamily: MONO,
                                                                                                            padding: '1px 4px',
                                                                                                        }}
                                                                                                    >
                                                                                                        {tienePasos ? `${pasosHechos}/${totPasos} pasos` : '+ pasos'}
                                                                                                    </button>

                                                                                                    {/* Convertir a hoy o repetitiva */}
                                                                                                    {!m.completed && (
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() => setConvT(convT?.id === m.id ? null : { id: m.id, rep: false, dias: [1, 2, 3, 4, 5], goalId: g.id })}
                                                                                                            title="Convertir en tarea de hoy o repetitiva"
                                                                                                            style={{ border: 'none', background: 'transparent', color: convT?.id === m.id ? colorMeta : C.outline, cursor: 'pointer', padding: '1px', display: 'flex' }}
                                                                                                        >
                                                                                                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>today</span>
                                                                                                        </button>
                                                                                                    )}

                                                                                                    {/* Quitar tarea */}
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => {
                                                                                                            if (window.confirm(`¿Quitar la tarea "${m.text}"?`)) {
                                                                                                                onRemoveMilestone(g.id, m.id);
                                                                                                            }
                                                                                                        }}
                                                                                                        title="Eliminar tarea"
                                                                                                        style={{ border: 'none', background: 'transparent', color: C.outline, cursor: 'pointer', padding: '1px', display: 'flex' }}
                                                                                                    >
                                                                                                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                                                                                                    </button>
                                                                                                </div>

                                                                                                {/* Menú de conversión rápido */}
                                                                                                {convT?.id === m.id && (
                                                                                                    <div style={{
                                                                                                        marginLeft: '26px',
                                                                                                        padding: '6px 8px',
                                                                                                        background: `${colorMeta}08`,
                                                                                                        borderRadius: '6px',
                                                                                                        display: 'flex',
                                                                                                        alignItems: 'center',
                                                                                                        gap: '8px',
                                                                                                        flexWrap: 'wrap',
                                                                                                    }}>
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() => { convertirTarea(g.id, m); setConvT(null); }}
                                                                                                            style={{ padding: '3px 8px', borderRadius: '4px', border: 'none', background: colorMeta, color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                                                                                        >
                                                                                                            📅 Hoy
                                                                                                        </button>
                                                                                                        <div style={{ display: 'flex', gap: '2px' }}>
                                                                                                            {DIAS_SEMANA.map(({ l, d }) => {
                                                                                                                const activo = convT.dias.includes(d);
                                                                                                                return (
                                                                                                                    <button
                                                                                                                        key={d}
                                                                                                                        type="button"
                                                                                                                        onClick={() => setConvT(prev => prev ? { ...prev, dias: activo ? prev.dias.filter(x => x !== d) : [...prev.dias, d] } : null)}
                                                                                                                        style={{ width: '18px', height: '18px', borderRadius: '3px', border: 'none', background: activo ? colorMeta : C.surfaceContainer, color: activo ? '#fff' : C.outline, fontSize: '0.6rem', fontWeight: 800, cursor: 'pointer' }}
                                                                                                                    >
                                                                                                                        {l}
                                                                                                                    </button>
                                                                                                                );
                                                                                                            })}
                                                                                                        </div>
                                                                                                        {convT.dias.length > 0 && (
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => { convertirTarea(g.id, m, convT.dias); setConvT(null); }}
                                                                                                                style={{ padding: '3px 8px', borderRadius: '4px', border: 'none', background: colorMeta, color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                                                                                            >
                                                                                                                Crear ({convT.dias.length}d)
                                                                                                            </button>
                                                                                                        )}
                                                                                                    </div>
                                                                                                )}

                                                                                                {/* Sub-pasos sin tarjetas: líneas limpias con sangría */}
                                                                                                {pasosAbierto && (
                                                                                                    <div style={{
                                                                                                        paddingLeft: '22px',
                                                                                                        borderLeft: `1.5px solid ${colorMeta}25`,
                                                                                                        marginLeft: '8px',
                                                                                                        display: 'flex',
                                                                                                        flexDirection: 'column',
                                                                                                        gap: '3px',
                                                                                                    }}>
                                                                                                        {(m.pasos || []).map(p => (
                                                                                                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '1px 0' }}>
                                                                                                                <button
                                                                                                                    type="button"
                                                                                                                    onClick={() => toggleSubPaso(g, m, p.id)}
                                                                                                                    style={{
                                                                                                                        width: '14px',
                                                                                                                        height: '14px',
                                                                                                                        borderRadius: '3px',
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
                                                                                                                    {p.completed && <span style={{ color: '#fff', fontSize: '8px', fontWeight: 900 }}>✓</span>}
                                                                                                                </button>
                                                                                                                <span style={{
                                                                                                                    flex: 1,
                                                                                                                    minWidth: 0,
                                                                                                                    fontSize: '0.82rem',
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
                                                                                                                    style={{ border: 'none', background: 'transparent', color: C.outline, cursor: 'pointer', padding: 0 }}
                                                                                                                >
                                                                                                                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                                                                                                                </button>
                                                                                                            </div>
                                                                                                        ))}

                                                                                                        {/* Input simple para nuevo sub-paso */}
                                                                                                        <form
                                                                                                            onSubmit={e => {
                                                                                                                e.preventDefault();
                                                                                                                agregarSubPaso(g, m);
                                                                                                            }}
                                                                                                            style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
                                                                                                        >
                                                                                                            <span style={{ color: C.outline, fontSize: '0.75rem' }}>+</span>
                                                                                                            <input
                                                                                                                type="text"
                                                                                                                value={nuevoPasoTexto[m.id] || ''}
                                                                                                                onChange={e => setNuevoPasoTexto(prev => ({ ...prev, [m.id]: e.target.value }))}
                                                                                                                placeholder="Escribir paso... (Enter)"
                                                                                                                style={{
                                                                                                                    border: 'none',
                                                                                                                    background: 'transparent',
                                                                                                                    outline: 'none',
                                                                                                                    fontSize: '0.78rem',
                                                                                                                    color: C.onSurface,
                                                                                                                    flex: 1,
                                                                                                                    fontFamily: 'inherit',
                                                                                                                }}
                                                                                                            />
                                                                                                        </form>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })}

                                                                                    {/* Input simple para nueva tarea */}
                                                                                    <form
                                                                                        onSubmit={e => {
                                                                                            e.preventDefault();
                                                                                            const t = (nuevaTareaTexto[keyInput] || '').trim();
                                                                                            if (!t) return;
                                                                                            onAddMilestone(g.id, t, plazo);
                                                                                            setNuevaTareaTexto(prev => ({ ...prev, [keyInput]: '' }));
                                                                                        }}
                                                                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0' }}
                                                                                    >
                                                                                        <span style={{ color: colorMeta, fontSize: '0.8rem' }}>+</span>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={nuevaTareaTexto[keyInput] || ''}
                                                                                            onChange={e => setNuevaTareaTexto(prev => ({ ...prev, [keyInput]: e.target.value }))}
                                                                                            placeholder={`+ Escribir tarea en ${nombrePropio.toLowerCase()}... (Enter)`}
                                                                                            style={{
                                                                                                border: 'none',
                                                                                                background: 'transparent',
                                                                                                outline: 'none',
                                                                                                fontSize: '0.8rem',
                                                                                                color: C.outline,
                                                                                                flex: 1,
                                                                                                fontFamily: 'inherit',
                                                                                            }}
                                                                                        />
                                                                                    </form>
                                                                                </div>
                                                                            );
                                                                        })}

                                                                        {/* Ideas: viñetas limpias */}
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: colorMeta }}>
                                                                                    💡 Ideas (aún no son tareas)
                                                                                </span>
                                                                            </div>

                                                                            {(g.listaSimple || []).map(it => (
                                                                                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '1px 0' }}>
                                                                                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: colorMeta, flexShrink: 0 }} />
                                                                                    <span style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', color: C.onSurfaceVariant, wordBreak: 'break-word' }}>
                                                                                        {it.text}
                                                                                    </span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => convertirIdeaATarea(g, it.id, it.text)}
                                                                                        style={{ background: 'none', border: 'none', color: colorMeta, fontSize: '0.66rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
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
                                                                                        style={{ border: 'none', background: 'transparent', color: C.outline, cursor: 'pointer', padding: 0 }}
                                                                                    >
                                                                                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                                                                                    </button>
                                                                                </div>
                                                                            ))}

                                                                            <form
                                                                                onSubmit={e => {
                                                                                    e.preventDefault();
                                                                                    agregarIdea(g);
                                                                                }}
                                                                                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                                                            >
                                                                                <span style={{ fontSize: '0.75rem', color: colorMeta }}>+</span>
                                                                                <input
                                                                                    type="text"
                                                                                    value={nuevaIdeaTexto[g.id] || ''}
                                                                                    onChange={e => setNuevaIdeaTexto(prev => ({ ...prev, [g.id]: e.target.value }))}
                                                                                    placeholder="Anotar idea que podría hacer... (Enter)"
                                                                                    style={{
                                                                                        border: 'none',
                                                                                        background: 'transparent',
                                                                                        outline: 'none',
                                                                                        fontSize: '0.76rem',
                                                                                        color: C.outline,
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
