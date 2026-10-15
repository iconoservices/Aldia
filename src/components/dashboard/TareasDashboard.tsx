import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C, MONO, useIsMobile, paddingPagina } from '../../theme';
import type { DailyBlock, Goal } from '../../hooks/useAlDiaState';
import { opcionesMeta } from './metasAvance';

interface Project {
    id: number;
    name: string;
    color: string;
}

interface TareasDashboardProps {
    dailyBlocks: DailyBlock[];
    addDailyBlock: (
        label: string,
        period?: 'Mañana' | 'Tarde' | 'Noche' | 'Otro',
        date?: string,
        completed?: boolean,
        projectId?: number,
        repeatDays?: number[],
        time?: string,
        isActive?: boolean,
        isHabit?: boolean,
        goalId?: number
    ) => void;
    toggleDailyBlock: (id: number) => void;
    removeDailyBlock: (idOrIds: number | number[]) => void;
    updateDailyBlock: (id: number, updates: Partial<DailyBlock>) => void;
    projects: Project[];
    goals?: Goal[];
}

// Selector de meta / sub-meta a la que aporta la tarea (se ve en Metas).
const SelectorMeta = ({ goals, value, onChange, etiqueta }: { goals: Goal[]; value?: number; onChange: (id: number | undefined) => void; etiqueta: string }) => {
    const opciones = opcionesMeta(goals);
    const actual = value !== undefined && !opciones.some(o => o.id === value) ? goals.find(g => g.id === value) : undefined;
    if (opciones.length === 0 && !actual) return null;
    return (
        <div style={{ flex: 2, minWidth: '180px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: C.onSurfaceVariant, display: 'block', marginBottom: '4px' }}>{etiqueta}</label>
            <select
                value={value ?? ''}
                onChange={e => onChange(e.target.value ? Number(e.target.value) : undefined)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${C.outlineVariant}`, background: C.surface, color: C.onSurface, fontFamily: 'inherit', fontSize: '0.85rem' }}
            >
                <option value="">(Ninguna)</option>
                {actual && <option value={actual.id}>{actual.title}</option>}
                {opciones.map(o => <option key={o.id} value={o.id}>{o.texto}</option>)}
            </select>
        </div>
    );
};

// Índices de día de la semana de las repetitivas (la referencia para toda la app):
// lunes = 1 … sábado = 6, domingo = 0 (igual que Date.getDay()).
const DIAS_SEMANA = [
    { idx: 1, label: 'L', full: 'Lun' },
    { idx: 2, label: 'M', full: 'Mar' },
    { idx: 3, label: 'M', full: 'Mié' },
    { idx: 4, label: 'J', full: 'Jue' },
    { idx: 5, label: 'V', full: 'Vie' },
    { idx: 6, label: 'S', full: 'Sáb' },
    { idx: 0, label: 'D', full: 'Dom' },
];

/** Extrae tareas de un solo texto: permite una sola tarea, múltiples líneas, o títulos con ':' */
const parseTasksFromText = (text: string): string[] => {
    const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const tasks: string[] = [];
    let currentTitle = '';

    for (const rawLine of rawLines) {
        // Eliminar viñetas o marcas si las pegó o escribió: -, *, •, 1., ☑, ☐
        const clean = rawLine.replace(/^[-\*\•\☑\☐\d+\.]\s*/, '').trim();
        if (!clean) continue;

        // Si la línea es un encabezado o título (termina en ':' o empieza con '#')
        if (clean.endsWith(':') || rawLine.startsWith('#')) {
            currentTitle = clean.replace(/^[#\s]+/, '').replace(/:$/, '').trim();
            continue;
        }

        if (currentTitle) {
            tasks.push(`${currentTitle}: ${clean}`);
        } else {
            tasks.push(clean);
        }
    }

    return tasks;
};

export const TareasDashboard: React.FC<TareasDashboardProps> = ({
    dailyBlocks,
    addDailyBlock,
    toggleDailyBlock,
    removeDailyBlock,
    updateDailyBlock,
    projects,
    goals = [],
}) => {
    const metaDe = (b: DailyBlock) => b.goalId !== undefined ? goals.find(g => g.id === b.goalId) : undefined;
    const chipMeta = (b: DailyBlock) => {
        const m = metaDe(b);
        return m ? (
            <span title="Aporta a esta meta" style={{ fontSize: '0.66rem', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: 'rgba(15,169,122,0.10)', color: C.primary, whiteSpace: 'nowrap', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>🎯 {m.title}</span>
        ) : null;
    };
    const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
    const movil = useIsMobile();
    const [menuFila, setMenuFila] = useState<number | null>(null);
    // Grupos plegables (como en Proyección): cada uno muestra su título y cuántas tareas tiene.
    const [cerrados, setCerrados] = useState<Record<string, boolean>>({ 'sue:Hechas': true });
    const cabeceraGrupo = (clave: string, titulo: string, n: number, color?: string) => (
        <button
            onClick={() => setCerrados(c => ({ ...c, [clave]: !c[clave] }))}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '7px 14px', background: C.surfaceContainerLow, border: 'none', borderBottom: `1px solid ${C.surfaceContainerHigh}`, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
        >
            <span className="material-symbols-outlined" style={{ fontSize: '17px', color: C.outline, transform: cerrados[clave] ? 'rotate(-90deg)' : 'none', transition: 'transform .15s' }}>expand_more</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: color ?? C.onSurfaceVariant }}>{titulo}</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: C.outline }}>{n}</span>
        </button>
    );
    // Las repetitivas ya traen su hora: una sola lista ordenada por hora (las sin hora, al final).
    // Día de hoy con el mismo índice de las repetitivas (lunes = 1 … domingo = 0)
    const hoyIdx = new Date().getDay();
    const mismaTarea = (x: DailyBlock, b: DailyBlock) => x.label.trim().toLowerCase() === b.label.trim().toLowerCase() && x.period === b.period;
    const tocaHoy = (b: DailyBlock) => !!b.repeatDays?.includes(hoyIdx);
    const hechaHoy = (b: DailyBlock) => dailyBlocks.some(x => mismaTarea(x, b) && x.date === todayStr && x.completed);
    // Igual que en Mi Día: se marca creando (o alternando) el bloque de hoy de esa tarea.
    const marcarHoy = (b: DailyBlock) => {
        const existente = dailyBlocks.find(x => mismaTarea(x, b) && x.date === todayStr);
        if (existente) toggleDailyBlock(existente.id);
        else addDailyBlock(b.label, (b.period ?? 'Otro') as any, todayStr, true, b.projectId, b.repeatDays, b.time, b.isActive);
    };
    // Un hábito es una repetitiva marcada como hábito: lleva racha (días seguidos que tocaban y se hicieron)
    const esHabito = (b: DailyBlock) => dailyBlocks.some(x => x.isHabit && mismaTarea(x, b));
    const rachaDe = (b: DailyBlock) => {
        const hechos = new Set(dailyBlocks.filter(x => mismaTarea(x, b) && x.completed && x.date).map(x => x.date));
        const dias = b.repeatDays || [];
        let n = 0;
        for (let i = 0; i < 400; i++) {
            const f = new Date(); f.setDate(f.getDate() - i);
            if (!dias.includes(f.getDay())) continue;            // un día que no toca no rompe la racha
            if (hechos.has(f.toLocaleDateString('en-CA'))) { n++; continue; }
            if (i === 0) continue;                                // hoy todavía pendiente: no rompe
            break;
        }
        return n;
    };
    const GRUPOS_REP = ['Hábitos', 'Repetitivas'];
    const GRUPOS_SUE = ['Vencidas', 'Hoy', 'Próximas', 'Sin fecha', 'Hechas'];
    const estadoDe = (b: DailyBlock) => b.completed ? 'Hechas' : !b.date ? 'Sin fecha' : b.date < todayStr ? 'Vencidas' : b.date === todayStr ? 'Hoy' : 'Próximas';

    // Menú de tres puntos de cada fila (Editar / Eliminar), en vez de dos íconos sueltos.
    const menuAcciones = (id: number, onEditar: () => void, onEliminar: () => void, extra?: { icono: string; texto: string; onClick: () => void } | { icono: string; texto: string; onClick: () => void }[]) => (
        <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={() => setMenuFila(menuFila === id ? null : id)} title="Más opciones" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>more_vert</span>
            </button>
            {menuFila === id && (
                <>
                    <div onClick={() => setMenuFila(null)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
                    <div style={{ position: 'absolute', right: 0, top: '34px', zIndex: 21, minWidth: '150px', background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '4px' }}>
                        {(Array.isArray(extra) ? extra : extra ? [extra] : []).map(ex => (
                            <button key={ex.texto} onClick={() => { setMenuFila(null); ex.onClick(); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 12px', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: C.onSurface, fontFamily: 'inherit' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{ex.icono}</span> {ex.texto}
                            </button>
                        ))}
                        <button onClick={() => { setMenuFila(null); onEditar(); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 12px', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: C.onSurface, fontFamily: 'inherit' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span> Editar
                        </button>
                        <button onClick={() => { setMenuFila(null); onEliminar(); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 12px', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: C.rojo, fontFamily: 'inherit' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span> Eliminar
                        </button>
                    </div>
                </>
            )}
        </div>
    );

    // ── Form State (Texto unificado: 1 tarea o varias en el mismo texto) ──
    const [textoTarea, setTextoTarea] = useState('');
    const [tipo, setTipo] = useState<'repetitiva' | 'suelta'>('suelta');
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // default Lun-Vie
    const [nuevoEsHabito, setNuevoEsHabito] = useState(false);
    const [targetDate, setTargetDate] = useState('');
    const [paraHoy, setParaHoy] = useState(false);
    const [targetTime, setTargetTime] = useState('');
    const [projectId, setProjectId] = useState<number | undefined>(undefined);
    const [goalId, setGoalId] = useState<number | undefined>(undefined);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const parsedTasks = useMemo(() => parseTasksFromText(textoTarea), [textoTarea]);

    // ── Edit Modal State ──
    const [editingTask, setEditingTask] = useState<DailyBlock | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [editDays, setEditDays] = useState<number[]>([]);
    const [editHabito, setEditHabito] = useState(false);
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editProjectId, setEditProjectId] = useState<number | undefined>(undefined);
    const [editGoalId, setEditGoalId] = useState<number | undefined>(undefined);

    const handleStartEdit = (b: DailyBlock) => {
        setEditingTask(b);
        setEditLabel(b.label);
        setEditDays(b.repeatDays || [0, 1, 2, 3, 4, 5, 6]);
        setEditHabito(dailyBlocks.some(x => x.isHabit && x.label.trim().toLowerCase() === b.label.trim().toLowerCase() && x.period === b.period));
        setEditDate(b.date || '');
        setEditTime(b.time || '');
        setEditProjectId(b.projectId);
        setEditGoalId(b.goalId);
    };

    const toggleEditDia = (diaIdx: number) => {
        setEditDays(prev =>
            prev.includes(diaIdx) ? prev.filter(d => d !== diaIdx) : [...prev, diaIdx]
        );
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTask || !editLabel.trim()) return;

        const isRep = editingTask.repeatDays && editingTask.repeatDays.length > 0;
        if (isRep) {
            const oldLabel = editingTask.label.trim().toLowerCase();
            const oldPeriod = editingTask.period;
            dailyBlocks
                .filter(b => b.label.trim().toLowerCase() === oldLabel && b.period === oldPeriod)
                .forEach(b => {
                    updateDailyBlock(b.id, {
                        label: editLabel.trim(),
                        repeatDays: editDays.length > 0 ? editDays : [0, 1, 2, 3, 4, 5, 6],
                        time: editTime || undefined,
                        period: editingTask.period || 'Otro',
                        projectId: editProjectId,
                        isHabit: editHabito,
                        goalId: editGoalId,
                    });
                });
        } else {
            updateDailyBlock(editingTask.id, {
                label: editLabel.trim(),
                date: editDate || undefined,
                time: editTime || undefined,
                period: editingTask.period || 'Otro',
                projectId: editProjectId,
                goalId: editGoalId,
            });
        }

        setEditingTask(null);
    };

    // ── Filter / View State ──
    const [filtroSueltas, setFiltroSueltas] = useState<'todas' | 'pendientes' | 'hoy'>('todas');

    // ── Clasificación Automática ──
    // Tareas repetitivas: aquellas con repeatDays definido y no vacío
    // Evitamos duplicados en caso de que existan varios bloques históricos con el mismo label
    const repetitivas = useMemo(() => {
        const seen = new Map<string, DailyBlock>();
        dailyBlocks.forEach(b => {
            if (b.repeatDays && b.repeatDays.length > 0) {
                const key = `${b.label.trim().toLowerCase()}_${b.period}`;
                if (!seen.has(key)) {
                    seen.set(key, b);
                } else {
                    const prev = seen.get(key)!;
                    // Mantenemos el más reciente o con isActive definido
                    if ((b.isActive !== undefined && prev.isActive === undefined) || (!prev.time && b.time)) {
                        seen.set(key, b);
                    }
                }
            }
        });
        return Array.from(seen.values());
    }, [dailyBlocks]);
    // Orden: pausadas siempre al final; luego las que tocan hoy primero; luego por hora.
    const pausada = (b: typeof repetitivas[number]) => b.isActive === false;
    const repetitivasOrdenadas = [...repetitivas].sort((a, b) =>
        (pausada(a) === pausada(b) ? 0 : pausada(a) ? 1 : -1)
        || (tocaHoy(a) === tocaHoy(b) ? 0 : tocaHoy(a) ? -1 : 1)
        || (a.time || '99:99').localeCompare(b.time || '99:99'));
    const tocanHoy = repetitivas.filter(tocaHoy).length;
    const hechasHoy = repetitivas.filter(b => tocaHoy(b) && hechaHoy(b)).length;

    // Tareas de una sola vez (sueltas): sin repeatDays
    const sueltas = useMemo(() => {
        return dailyBlocks.filter(b => !b.repeatDays || b.repeatDays.length === 0);
    }, [dailyBlocks]);

    const sueltasFiltradas = useMemo(() => {
        let list = [...sueltas];
        if (filtroSueltas === 'pendientes') {
            list = list.filter(b => !b.completed);
        } else if (filtroSueltas === 'hoy') {
            list = list.filter(b => b.date === todayStr);
        }
        // Orden:
        // 1. Tareas no completadas primero
        // 2. Tareas marcadas como "Hoy" ARRIBA (en la cima)
        // 3. Tareas pendientes generales / futuras
        // 4. Tareas completadas al final
        return list.sort((a, b) => {
            if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
            const aEsHoy = a.date === todayStr ? 1 : 0;
            const bEsHoy = b.date === todayStr ? 1 : 0;
            if (aEsHoy !== bEsHoy) return bEsHoy - aEsHoy;
            return (b.date || '').localeCompare(a.date || '') || (b.id - a.id);
        });
    }, [sueltas, filtroSueltas, todayStr]);

    // ── Handlers ──
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const items = parseTasksFromText(textoTarea);
        if (items.length === 0) return;

        items.forEach(itemText => {
            if (tipo === 'repetitiva') {
                addDailyBlock(
                    itemText,
                    'Otro',
                    todayStr,
                    false,
                    projectId,
                    selectedDays.length > 0 ? selectedDays : [0, 1, 2, 3, 4, 5, 6],
                    targetTime || undefined,
                    true, // activa por defecto como una alarma
                    nuevoEsHabito,
                    goalId
                );
            } else {
                const finalDate = paraHoy ? todayStr : (targetDate || undefined);
                addDailyBlock(
                    itemText,
                    'Otro',
                    finalDate,
                    false,
                    projectId,
                    undefined, // sin repeatDays = de una sola vez
                    targetTime || undefined,
                    true,
                    undefined,
                    goalId
                );
            }
        });

        // Reset form
        setTextoTarea('');
        setParaHoy(false);
        setTargetDate('');
        setTargetTime('');
        setIsFormOpen(false);
        setNuevoEsHabito(false);
    };

    const toggleDia = (diaIdx: number) => {
        setSelectedDays(prev =>
            prev.includes(diaIdx) ? prev.filter(d => d !== diaIdx) : [...prev, diaIdx]
        );
    };

    const toggleHabito = (block: DailyBlock) => {
        const nuevo = !esHabito(block);
        dailyBlocks.filter(b => mismaTarea(b, block)).forEach(b => updateDailyBlock(b.id, { isHabit: nuevo }));
    };

    const toggleAlarmaActiva = (block: DailyBlock) => {
        const nuevoEstado = block.isActive === false ? true : false;
        // Si hay varios bloques con el mismo label y period (históricos), actualizamos todos
        dailyBlocks
            .filter(b => b.label.trim().toLowerCase() === block.label.trim().toLowerCase() && b.period === block.period)
            .forEach(b => updateDailyBlock(b.id, { isActive: nuevoEstado }));
    };

    const handleDeleteRepetitiva = (block: DailyBlock) => {
        if (!confirm(`¿Eliminar la tarea repetitiva "${block.label}"?`)) return;
        const ids = dailyBlocks
            .filter(b => b.label.trim().toLowerCase() === block.label.trim().toLowerCase() && b.period === block.period)
            .map(b => b.id);
        removeDailyBlock(ids);
    };

    return (
        <div style={{ ...paddingPagina(movil), paddingTop: movil ? '8px' : '12px', display: 'flex', flexDirection: 'column', gap: movil ? '0.75rem' : '1rem' }}>

            {/* ── Modal Flotante: Nueva Tarea ── */}
            <AnimatePresence>
                {isFormOpen && (
                    <div style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999, padding: '1rem',
                    }}>
                        <motion.form
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.15 }}
                            onSubmit={handleSubmit}
                            style={{
                                background: C.surfaceLowest,
                                borderRadius: '16px',
                                border: `1px solid ${C.outlineVariant}`,
                                width: '100%', maxWidth: '520px',
                                padding: '1.5rem',
                                boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
                                display: 'flex', flexDirection: 'column', gap: '1rem',
                                maxHeight: '90vh', overflowY: 'auto',
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '24px', color: C.primary }}>add_task</span>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: C.onSurface }}>
                                        Nueva Tarea
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, padding: '4px', display: 'flex' }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>close</span>
                                </button>
                            </div>

                            {/* Selector Tipo */}
                            <div style={{ display: 'flex', gap: '6px', background: C.surfaceContainer, padding: '3px', borderRadius: '10px', width: 'fit-content' }}>
                                <button
                                    type="button"
                                    onClick={() => setTipo('suelta')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        border: 'none', borderRadius: '8px', padding: '6px 14px',
                                        fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                                        background: tipo === 'suelta' ? C.surfaceLowest : 'transparent',
                                        color: tipo === 'suelta' ? C.onSurface : C.onSurfaceVariant,
                                        boxShadow: tipo === 'suelta' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: tipo === 'suelta' ? C.primary : 'inherit' }}>push_pin</span>
                                    De una vez (Suelta)
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setTipo('repetitiva')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        border: 'none', borderRadius: '8px', padding: '6px 14px',
                                        fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                                        background: tipo === 'repetitiva' ? C.surfaceLowest : 'transparent',
                                        color: tipo === 'repetitiva' ? C.onSurface : C.onSurfaceVariant,
                                        boxShadow: tipo === 'repetitiva' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: tipo === 'repetitiva' ? C.ambar : 'inherit' }}>alarm</span>
                                    Repetitiva (Como Alarma)
                                </button>
                            </div>

                            {/* Entrada de Tarea(s) en el mismo texto */}
                            <div>
                                <textarea
                                    value={textoTarea}
                                    onChange={e => setTextoTarea(e.target.value)}
                                    placeholder={tipo === 'repetitiva'
                                        ? `Escribe una o varias tareas (una por línea)...
Ej:
Tomar vitaminas
Hacer ejercicio
Leer 10 páginas`
                                        : `Escribe una o varias tareas (una por línea)...
Ej:
Comprar cable HDMI
Llamar al contador

O con títulos:
Supermercado:
- Leche
- Huevos`}
                                    autoFocus
                                    required
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '12px 14px',
                                        fontSize: '0.92rem',
                                        lineHeight: 1.45,
                                        borderRadius: '10px',
                                        border: `1.5px solid ${C.outlineVariant}`,
                                        background: C.surface,
                                        color: C.onSurface,
                                        fontFamily: 'inherit',
                                        outline: 'none',
                                        resize: 'vertical',
                                        minHeight: '110px',
                                    }}
                                />
                                {parsedTasks.length > 1 && (
                                    <div style={{ marginTop: '5px', fontSize: '0.76rem', fontWeight: 700, color: C.primary, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>checklist</span>
                                        {parsedTasks.length} tareas detectadas se crearán juntas
                                    </div>
                                )}
                            </div>

                            {/* Opciones según tipo */}
                            {tipo === 'repetitiva' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: C.onSurface, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={nuevoEsHabito} onChange={e => setNuevoEsHabito(e.target.checked)} style={{ accentColor: C.primary, width: '16px', height: '16px' }} />
                                        Es un hábito <span style={{ color: C.outline, fontWeight: 500 }}>(lleva racha 🔥)</span>
                                    </label>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: C.onSurfaceVariant, textTransform: 'uppercase' }}>
                                        Días en que se repite:
                                    </label>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {DIAS_SEMANA.map(d => {
                                            const activo = selectedDays.includes(d.idx);
                                            return (
                                                <button
                                                    key={d.idx}
                                                    type="button"
                                                    onClick={() => toggleDia(d.idx)}
                                                    style={{
                                                        width: '38px', height: '38px', borderRadius: '10px',
                                                        border: `1.5px solid ${activo ? C.primary : C.outlineVariant}`,
                                                        background: activo ? 'rgba(15, 169, 122, 0.12)' : C.surfaceLowest,
                                                        color: activo ? C.primary : C.onSurfaceVariant,
                                                        fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                                                        transition: 'all 0.15s',
                                                    }}
                                                >
                                                    {d.label}
                                                </button>
                                            );
                                        })}

                                        <div style={{ display: 'flex', gap: '6px', marginLeft: '6px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedDays([0, 1, 2, 3, 4, 5, 6])}
                                                style={{
                                                    border: 'none', background: C.surfaceContainerHigh,
                                                    borderRadius: '8px', padding: '6px 10px',
                                                    fontSize: '0.72rem', fontWeight: 600, color: C.onSurfaceVariant, cursor: 'pointer',
                                                }}
                                            >
                                                Todos los días
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedDays([1, 2, 3, 4, 5])}
                                                style={{
                                                    border: 'none', background: C.surfaceContainerHigh,
                                                    borderRadius: '8px', padding: '6px 10px',
                                                    fontSize: '0.72rem', fontWeight: 600, color: C.onSurfaceVariant, cursor: 'pointer',
                                                }}
                                            >
                                                L a V
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextVal = !paraHoy;
                                            setParaHoy(nextVal);
                                            if (nextVal) setTargetDate(todayStr);
                                            else setTargetDate('');
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 14px', borderRadius: '8px',
                                            border: `1.5px solid ${paraHoy ? C.primary : C.outlineVariant}`,
                                            background: paraHoy ? 'rgba(15, 169, 122, 0.12)' : C.surfaceLowest,
                                            color: paraHoy ? C.primary : C.onSurfaceVariant,
                                            fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: paraHoy ? C.primary : 'inherit' }}>
                                            {paraHoy ? 'wb_sunny' : 'today'}
                                        </span>
                                        {paraHoy ? 'Hacer Hoy (En Mi Día)' : 'Marcar para Hoy'}
                                    </button>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.75rem', color: C.onSurfaceVariant, fontWeight: 600 }}>O fecha:</span>
                                        <input
                                            type="date"
                                            value={targetDate}
                                            onChange={e => {
                                                setTargetDate(e.target.value);
                                                setParaHoy(e.target.value === todayStr);
                                            }}
                                            style={{
                                                padding: '7px 10px', borderRadius: '8px',
                                                border: `1px solid ${C.outlineVariant}`, background: C.surface,
                                                color: C.onSurface, fontFamily: 'inherit', fontSize: '0.82rem',
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Fila extra: Hora opcional (Alarma) y Proyecto */}
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '4px' }}>
                                <div style={{ flex: 1, minWidth: '130px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: C.onSurfaceVariant, display: 'block', marginBottom: '4px' }}>
                                        Hora (Alarma):
                                    </label>
                                    <input
                                        type="time"
                                        value={targetTime}
                                        onChange={e => setTargetTime(e.target.value)}
                                        placeholder="--:--"
                                        style={{
                                            width: '100%', boxSizing: 'border-box',
                                            padding: '8px 12px', borderRadius: '8px',
                                            border: `1px solid ${C.outlineVariant}`, background: C.surface,
                                            color: C.onSurface, fontFamily: MONO, fontSize: '0.85rem',
                                        }}
                                    />
                                </div>

                                <div style={{ flex: 2, minWidth: '180px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: C.onSurfaceVariant, display: 'block', marginBottom: '4px' }}>
                                        Proyecto (Opcional):
                                    </label>
                                    <select
                                        value={projectId || ''}
                                        onChange={e => setProjectId(e.target.value ? Number(e.target.value) : undefined)}
                                        style={{
                                            width: '100%', boxSizing: 'border-box',
                                            padding: '8px 12px', borderRadius: '8px',
                                            border: `1px solid ${C.outlineVariant}`, background: C.surface,
                                            color: C.onSurface, fontFamily: 'inherit', fontSize: '0.85rem',
                                        }}
                                    >
                                        <option value="">(Ninguno / General)</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <SelectorMeta goals={goals} value={goalId} onChange={setGoalId} etiqueta="Aporta a la meta (opcional):" />
                            </div>

                            {/* Botones Footer */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    style={{
                                        padding: '9px 18px', borderRadius: '10px',
                                        border: 'none', background: C.surfaceContainerHigh,
                                        color: C.onSurfaceVariant, fontWeight: 700, fontSize: '0.88rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        background: C.primary, color: '#fff', border: 'none',
                                        borderRadius: '10px', padding: '9px 22px',
                                        fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        boxShadow: '0 4px 12px rgba(15, 169, 122, 0.25)',
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                                    {parsedTasks.length > 1
                                        ? `Guardar ${parsedTasks.length} Tareas`
                                        : 'Guardar Tarea'}
                                </button>
                            </div>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Distribución en 2 Columnas / Secciones ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: movil ? '1rem' : '1.25rem', alignItems: 'start' }}>

                {/* ═══ Columna 1: Tareas Repetitivas (Alarmas) ═══ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: C.ambar }}>alarm</span>
                            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: C.onSurface }}>
                                Repetitivas (Tipo Alarma)
                            </h2>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(15, 169, 122, 0.12)', color: C.primary, borderRadius: '999px', padding: '1px 8px' }} title="Hechas hoy / las que tocan hoy">
                                {hechasHoy}/{tocanHoy} hoy
                            </span>
                        </div>
                        <button
                            onClick={() => setIsFormOpen(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: C.primary, color: '#fff', border: 'none', borderRadius: '999px', padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>add</span>
                            Nueva tarea
                        </button>
                    </div>

                    <div style={{ background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: '14px' }}>
                        {repetitivas.length === 0 ? (
                            <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: C.onSurfaceVariant }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: C.outlineVariant, marginBottom: '6px', display: 'block' }}>alarm_off</span>
                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>No tienes tareas repetitivas activas.</p>
                                <p style={{ margin: '4px 0 0', fontSize: '0.75rem' }}>Crea hábitos o alarmas que se repitan ciertos días de la semana.</p>
                            </div>
                        ) : (
                            GRUPOS_REP.map(g => {
                                const items = repetitivasOrdenadas.filter(x => (esHabito(x) ? 'Hábitos' : 'Repetitivas') === g);
                                if (items.length === 0) return null;
                                const clave = 'rep:' + g;
                                const hayHabitos = repetitivas.some(esHabito);
                                return (
                                    <div key={g}>
                                        {hayHabitos && cabeceraGrupo(clave, g, items.length)}
                                        {!(hayHabitos && cerrados[clave]) && items.map(b => {
                                const project = projects.find(p => p.id === b.projectId);
                                const isEncendida = b.isActive !== false;
                                const toca = tocaHoy(b);
                                const hecha = toca && hechaHoy(b);

                                return (
                                    <div
                                        key={b.id}
                                        style={{
                                            padding: '9px 8px 9px 14px', borderBottom: `1px solid ${C.surfaceContainerHigh}`,
                                            display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                                            opacity: !toca || !isEncendida ? 0.5 : 1,
                                            background: hecha ? 'rgba(15, 169, 122, 0.06)' : 'transparent',
                                        }}
                                    >
                                        {/* Círculo: hecha hoy (solo se puede si hoy toca) */}
                                        <button
                                            onClick={() => toca && marcarHoy(b)}
                                            disabled={!toca}
                                            title={!toca ? 'Hoy no toca' : hecha ? 'Hecha hoy (clic para desmarcar)' : 'Marcar como hecha hoy'}
                                            style={{
                                                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, padding: 0,
                                                border: `2px solid ${hecha ? C.primary : toca ? C.outlineVariant : C.surfaceContainerHigh}`,
                                                background: hecha ? C.primary : 'transparent',
                                                cursor: toca ? 'pointer' : 'default',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}
                                        >
                                            {hecha && <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#fff' }}>check</span>}
                                        </button>

                                        <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: hecha ? C.outline : C.onSurface, textDecoration: hecha ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {b.label}{!isEncendida && <span style={{ marginLeft: '8px', fontSize: '0.62rem', fontWeight: 800, color: C.outline, border: `1px solid ${C.outlineVariant}`, borderRadius: '999px', padding: '0 6px' }}>pausada</span>}
                                            </div>
                                            {(project || esHabito(b) || metaDe(b)) && (
                                                <div style={{ fontSize: '0.68rem', color: C.onSurfaceVariant, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                    {chipMeta(b)}
                                                    {project && (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: project.color }} />
                                                            {project.name}
                                                        </span>
                                                    )}
                                                    {esHabito(b) && rachaDe(b) > 0 && (
                                                        <span title="Días seguidos cumplidos" style={{ fontWeight: 800, color: C.ambar }}>🔥 {rachaDe(b)}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Días de la semana */}
                                        <div style={{ display: 'flex', gap: '3px', order: movil ? 5 : undefined, flexBasis: movil ? '100%' : undefined, paddingLeft: movil ? '44px' : 0 }}>
                                            {DIAS_SEMANA.map(d => {
                                                const activo = b.repeatDays?.includes(d.idx);
                                                return (
                                                    <span key={d.idx} style={{
                                                        width: '19px', height: '19px', borderRadius: '5px', outline: d.idx === hoyIdx && activo ? `2px solid ${C.primary}55` : 'none', outlineOffset: '1px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.62rem', fontWeight: 800,
                                                        background: activo ? (isEncendida ? C.primary : C.outline) : 'transparent',
                                                        color: activo ? '#fff' : C.outlineVariant,
                                                    }}>{d.label}</span>
                                                );
                                            })}
                                        </div>

                                        {/* Hora si tiene */}
                                        {b.time && (
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, fontFamily: MONO, background: 'rgba(15, 169, 122, 0.1)', color: C.primary, borderRadius: '6px', padding: '2px 7px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>schedule</span>
                                                {b.time}
                                            </span>
                                        )}

                                        <button
                                            onClick={() => toggleAlarmaActiva(b)}
                                            title={isEncendida ? 'Activa — clic para desactivar' : 'Desactivada — clic para activar'}
                                            style={{ width: '34px', height: '20px', borderRadius: '999px', border: 'none', cursor: 'pointer', padding: 0, position: 'relative', flexShrink: 0, background: isEncendida ? C.primary : C.outlineVariant, transition: 'background .15s' }}
                                        >
                                            <span style={{ position: 'absolute', top: '2px', left: isEncendida ? '16px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'left .15s' }} />
                                        </button>
                                        {menuAcciones(b.id, () => handleStartEdit(b), () => handleDeleteRepetitiva(b), [{ icono: esHabito(b) ? 'spa' : 'local_fire_department', texto: esHabito(b) ? 'Quitar de hábitos' : 'Marcar como hábito', onClick: () => toggleHabito(b) }, { icono: isEncendida ? 'alarm_off' : 'alarm_on', texto: isEncendida ? 'Pausar alarma' : 'Activar alarma', onClick: () => toggleAlarmaActiva(b) }])}
                                    </div>
                                );
                            })}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ═══ Columna 2: Tareas de Una Vez (Sueltas) ═══ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: C.primary }}>push_pin</span>
                            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: C.onSurface }}>
                                Tareas de una vez (Sueltas)
                            </h2>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(15, 169, 122, 0.12)', color: C.primary, borderRadius: '999px', padding: '1px 8px' }}>
                                {sueltas.filter(s => !s.completed).length} pendientes
                            </span>
                        </div>

                        {/* Filtros */}
                        <div style={{ display: 'flex', gap: '4px', background: C.surfaceContainer, padding: '2px', borderRadius: '8px' }}>
                            <button
                                onClick={() => setFiltroSueltas('todas')}
                                style={{
                                    border: 'none', borderRadius: '6px', padding: '4px 10px',
                                    fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                    background: filtroSueltas === 'todas' ? C.surfaceLowest : 'transparent',
                                    color: filtroSueltas === 'todas' ? C.primary : C.onSurfaceVariant,
                                    boxShadow: filtroSueltas === 'todas' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                                }}
                            >
                                Todas
                            </button>
                            <button
                                onClick={() => setFiltroSueltas('hoy')}
                                style={{
                                    border: 'none', borderRadius: '6px', padding: '4px 10px',
                                    fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                    background: filtroSueltas === 'hoy' ? C.surfaceLowest : 'transparent',
                                    color: filtroSueltas === 'hoy' ? C.primary : C.onSurfaceVariant,
                                    boxShadow: filtroSueltas === 'hoy' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                                }}
                            >
                                De Hoy
                            </button>
                            <button
                                onClick={() => setFiltroSueltas('pendientes')}
                                style={{
                                    border: 'none', borderRadius: '6px', padding: '4px 10px',
                                    fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                    background: filtroSueltas === 'pendientes' ? C.surfaceLowest : 'transparent',
                                    color: filtroSueltas === 'pendientes' ? C.primary : C.onSurfaceVariant,
                                    boxShadow: filtroSueltas === 'pendientes' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                                }}
                            >
                                Pendientes
                            </button>
                        </div>
                    </div>

                    <div style={{ background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: '14px' }}>
                        {sueltasFiltradas.length === 0 ? (
                            <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: C.onSurfaceVariant }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: C.outlineVariant, marginBottom: '6px', display: 'block' }}>task_alt</span>
                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>No hay tareas sueltas en este filtro.</p>
                                <p style={{ margin: '4px 0 0', fontSize: '0.75rem' }}>Agrega una tarea de una sola vez con el botón arriba.</p>
                            </div>
                        ) : (
                            GRUPOS_SUE.map(g => {
                                const items = sueltasFiltradas.filter(x => estadoDe(x) === g);
                                if (items.length === 0) return null;
                                const clave = 'sue:' + g;
                                return (
                                    <div key={g}>
                                        {cabeceraGrupo(clave, g, items.length, g === 'Vencidas' ? C.rojo : g === 'Hoy' ? C.primary : undefined)}
                                        {!cerrados[clave] && items.map(b => {
                                const project = projects.find(p => p.id === b.projectId);
                                const esHoy = b.date === todayStr;

                                const vencida = !!b.date && b.date < todayStr && !b.completed;
                                const fechaCorta = b.date ? new Date(b.date + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }).replace('.', '') : '';

                                return (
                                    <div
                                        key={b.id}
                                        style={{ padding: '8px 8px 8px 14px', borderBottom: `1px solid ${C.surfaceContainerHigh}`, display: 'flex', alignItems: 'center', gap: '10px' }}
                                    >
                                        {/* Checkbox circular */}
                                        <button
                                            onClick={() => toggleDailyBlock(b.id)}
                                            style={{
                                                width: '22px', height: '22px', borderRadius: '50%',
                                                border: `2px solid ${b.completed ? C.primary : C.outlineVariant}`,
                                                background: b.completed ? C.primary : 'transparent',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0, padding: 0,
                                            }}
                                        >
                                            {b.completed && <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#fff' }}>check</span>}
                                        </button>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: b.completed ? C.outline : C.onSurface, textDecoration: b.completed ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {b.label}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                                                {/* Fecha (en rojo si ya venció) */}
                                                {!esHoy && b.date && (
                                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: vencida ? C.rojo : C.onSurfaceVariant, background: vencida ? 'rgba(198,60,60,0.08)' : C.surfaceContainer, borderRadius: '999px', padding: '1px 8px' }}>
                                                        {vencida ? 'Venció ' : ''}{fechaCorta}
                                                    </span>
                                                )}

                                                {/* Botón rápido Hoy / Mi Día */}
                                                <button
                                                    type="button"
                                                    onClick={() => updateDailyBlock(b.id, { date: esHoy ? '' : todayStr })}
                                                    title={esHoy ? 'Marcada para Hoy (clic para quitar de Mi Día)' : 'Clic para marcar para Hoy (aparecerá en Mi Día)'}
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                        fontSize: '0.68rem', fontWeight: 700,
                                                        color: esHoy ? C.primary : C.onSurfaceVariant,
                                                        background: esHoy ? 'rgba(15, 169, 122, 0.12)' : 'transparent',
                                                        border: `1px solid ${esHoy ? 'rgba(15, 169, 122, 0.35)' : C.outlineVariant}`,
                                                        borderRadius: '999px', padding: '1px 8px', cursor: 'pointer',
                                                    }}
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>{esHoy ? 'wb_sunny' : 'add'}</span>
                                                    {esHoy ? 'Hoy' : 'Hoy'}
                                                </button>

                                                {b.time && <span style={{ fontSize: '0.68rem', fontFamily: MONO, color: C.onSurfaceVariant }}>⏰ {b.time}</span>}

                                                {project && (
                                                    <span style={{ fontSize: '0.68rem', color: C.onSurfaceVariant, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: project.color }} />
                                                        {project.name}
                                                    </span>
                                                )}
                                                {chipMeta(b)}
                                            </div>
                                        </div>

                                        {menuAcciones(b.id, () => handleStartEdit(b), () => removeDailyBlock(b.id))}
                                    </div>
                                );
                            })}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

            </div>

            {/* ── Modal de Edición de Tarea ── */}
            <AnimatePresence>
                {editingTask && (
                    <div style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999, padding: '1rem',
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                background: C.surfaceLowest,
                                borderRadius: '16px',
                                border: `1px solid ${C.outlineVariant}`,
                                width: '100%', maxWidth: '480px',
                                padding: '1.25rem 1.5rem',
                                boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
                                display: 'flex', flexDirection: 'column', gap: '1rem',
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '22px', color: C.primary }}>edit_note</span>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: C.onSurface }}>
                                        Editar Tarea
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setEditingTask(null)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, padding: '4px', display: 'flex' }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                                </button>
                            </div>

                            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* Nombre */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: C.onSurfaceVariant, display: 'block', marginBottom: '4px' }}>
                                        Nombre de la tarea:
                                    </label>
                                    <input
                                        type="text"
                                        value={editLabel}
                                        onChange={e => setEditLabel(e.target.value)}
                                        required
                                        autoFocus
                                        style={{
                                            width: '100%', boxSizing: 'border-box',
                                            padding: '10px 12px', borderRadius: '10px',
                                            border: `1.5px solid ${C.outlineVariant}`, background: C.surface,
                                            color: C.onSurface, fontFamily: 'inherit', fontSize: '0.9rem',
                                            outline: 'none',
                                        }}
                                    />
                                </div>

                                {/* Días (si es repetitiva) o Fecha (si es suelta) */}
                                {editingTask.repeatDays && editingTask.repeatDays.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: C.onSurface, cursor: 'pointer', marginBottom: '4px' }}>
                                            <input type="checkbox" checked={editHabito} onChange={e => setEditHabito(e.target.checked)} style={{ accentColor: C.primary, width: '16px', height: '16px' }} />
                                            Es un hábito <span style={{ color: C.outline, fontWeight: 500 }}>(lleva racha 🔥)</span>
                                        </label>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: C.onSurfaceVariant, textTransform: 'uppercase' }}>
                                            Días en que se repite:
                                        </label>
                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            {DIAS_SEMANA.map(d => {
                                                const activo = editDays.includes(d.idx);
                                                return (
                                                    <button
                                                        key={d.idx}
                                                        type="button"
                                                        onClick={() => toggleEditDia(d.idx)}
                                                        style={{
                                                            width: '34px', height: '34px', borderRadius: '8px',
                                                            border: `1.5px solid ${activo ? C.primary : C.outlineVariant}`,
                                                            background: activo ? 'rgba(15, 169, 122, 0.12)' : C.surfaceLowest,
                                                            color: activo ? C.primary : C.onSurfaceVariant,
                                                            fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                                                        }}
                                                    >
                                                        {d.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: C.onSurfaceVariant, display: 'block', marginBottom: '4px' }}>
                                            Fecha:
                                        </label>
                                        <input
                                            type="date"
                                            value={editDate}
                                            onChange={e => setEditDate(e.target.value)}
                                            style={{
                                                padding: '8px 12px', borderRadius: '8px',
                                                border: `1px solid ${C.outlineVariant}`, background: C.surface,
                                                color: C.onSurface, fontFamily: 'inherit', fontSize: '0.85rem',
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Hora de Alarma */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: C.onSurfaceVariant, display: 'block', marginBottom: '4px' }}>
                                        Hora (Alarma):
                                    </label>
                                    <input
                                        type="time"
                                        value={editTime}
                                        onChange={e => setEditTime(e.target.value)}
                                        style={{
                                            width: '100%', boxSizing: 'border-box',
                                            padding: '8px 10px', borderRadius: '8px',
                                            border: `1px solid ${C.outlineVariant}`, background: C.surface,
                                            color: C.onSurface, fontFamily: MONO, fontSize: '0.85rem',
                                        }}
                                    />
                                </div>

                                {/* Proyecto */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: C.onSurfaceVariant, display: 'block', marginBottom: '4px' }}>
                                        Proyecto:
                                    </label>
                                    <select
                                        value={editProjectId || ''}
                                        onChange={e => setEditProjectId(e.target.value ? Number(e.target.value) : undefined)}
                                        style={{
                                            width: '100%', boxSizing: 'border-box',
                                            padding: '8px 10px', borderRadius: '8px',
                                            border: `1px solid ${C.outlineVariant}`, background: C.surface,
                                            color: C.onSurface, fontFamily: 'inherit', fontSize: '0.85rem',
                                        }}
                                    >
                                        <option value="">(Ninguno / General)</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <SelectorMeta goals={goals} value={editGoalId} onChange={setEditGoalId} etiqueta="Aporta a la meta:" />

                                {/* Botones Footer */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setEditingTask(null)}
                                        style={{
                                            padding: '8px 16px', borderRadius: '8px',
                                            border: 'none', background: C.surfaceContainerHigh,
                                            color: C.onSurfaceVariant, fontWeight: 700, fontSize: '0.85rem',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            padding: '8px 20px', borderRadius: '8px',
                                            border: 'none', background: C.primary,
                                            color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
