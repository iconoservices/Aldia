import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C, MONO } from '../../theme';
import type { DailyBlock } from '../../hooks/useAlDiaState';

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
        isActive?: boolean
    ) => void;
    toggleDailyBlock: (id: number) => void;
    removeDailyBlock: (idOrIds: number | number[]) => void;
    updateDailyBlock: (id: number, updates: Partial<DailyBlock>) => void;
    projects: Project[];
}

const DIAS_SEMANA = [
    { idx: 1, label: 'L', full: 'Lun' },
    { idx: 2, label: 'M', full: 'Mar' },
    { idx: 3, label: 'M', full: 'Mié' },
    { idx: 4, label: 'J', full: 'Jue' },
    { idx: 5, label: 'V', full: 'Vie' },
    { idx: 6, label: 'S', full: 'Sáb' },
    { idx: 0, label: 'D', full: 'Dom' },
];

export const TareasDashboard: React.FC<TareasDashboardProps> = ({
    dailyBlocks,
    addDailyBlock,
    toggleDailyBlock,
    removeDailyBlock,
    updateDailyBlock,
    projects,
}) => {
    const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

    // ── Form State ──
    const [label, setLabel] = useState('');
    const [tipo, setTipo] = useState<'repetitiva' | 'suelta'>('suelta');
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // default Lun-Vie
    const [targetDate, setTargetDate] = useState(todayStr);
    const [targetTime, setTargetTime] = useState('');
    const [projectId, setProjectId] = useState<number | undefined>(undefined);
    const [isFormOpen, setIsFormOpen] = useState(false);

    // ── Modo Keep / Nota (Múltiples tareas) ──
    const [modoEntrada, setModoEntrada] = useState<'simple' | 'keep'>('simple');
    const [tituloKeep, setTituloKeep] = useState('');
    const [keepItemsText, setKeepItemsText] = useState('');
    const [keepConPrefijo, setKeepConPrefijo] = useState(false);
    const [keepViewCheckboxes, setKeepViewCheckboxes] = useState(true);

    // ── Edit Modal State ──
    const [editingTask, setEditingTask] = useState<DailyBlock | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [editDays, setEditDays] = useState<number[]>([]);
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editProjectId, setEditProjectId] = useState<number | undefined>(undefined);

    const handleStartEdit = (b: DailyBlock) => {
        setEditingTask(b);
        setEditLabel(b.label);
        setEditDays(b.repeatDays || [0, 1, 2, 3, 4, 5, 6]);
        setEditDate(b.date || todayStr);
        setEditTime(b.time || '');
        setEditProjectId(b.projectId);
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
                    });
                });
        } else {
            updateDailyBlock(editingTask.id, {
                label: editLabel.trim(),
                date: editDate || todayStr,
                time: editTime || undefined,
                period: editingTask.period || 'Otro',
                projectId: editProjectId,
            });
        }

        setEditingTask(null);
    };

    // ── Filter / View State ──
    const [filtroSueltas, setFiltroSueltas] = useState<'todas' | 'pendientes' | 'hoy'>('pendientes');

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
                    if (b.isActive !== undefined && prev.isActive === undefined) {
                        seen.set(key, b);
                    }
                }
            }
        });
        return Array.from(seen.values());
    }, [dailyBlocks]);

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
        // Orden: pendientes primero, luego fecha más cercana
        return list.sort((a, b) => {
            if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
            return (b.date || '').localeCompare(a.date || '');
        });
    }, [sueltas, filtroSueltas, todayStr]);

    // ── Handlers ──
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (modoEntrada === 'simple') {
            const trimmed = label.trim();
            if (!trimmed) return;

            if (tipo === 'repetitiva') {
                addDailyBlock(
                    trimmed,
                    'Otro',
                    todayStr,
                    false,
                    projectId,
                    selectedDays.length > 0 ? selectedDays : [0, 1, 2, 3, 4, 5, 6],
                    targetTime || undefined,
                    true // activa por defecto como una alarma
                );
            } else {
                addDailyBlock(
                    trimmed,
                    'Otro',
                    targetDate || todayStr,
                    false,
                    projectId,
                    undefined, // sin repeatDays = de una sola vez
                    targetTime || undefined,
                    true
                );
            }
        } else {
            // Modo Keep / Nota multilínea
            const rawLines = keepItemsText
                .split('\n')
                .map(l => l.replace(/^[-\*\•\d+\.]\s*/, '').trim())
                .filter(Boolean);

            if (rawLines.length === 0 && !label.trim()) return;
            const items = rawLines.length > 0 ? rawLines : [label.trim()];

            items.forEach(itemText => {
                const finalLabel = (keepConPrefijo && tituloKeep.trim())
                    ? `${tituloKeep.trim()}: ${itemText}`
                    : itemText;

                if (tipo === 'repetitiva') {
                    addDailyBlock(
                        finalLabel,
                        'Otro',
                        todayStr,
                        false,
                        projectId,
                        selectedDays.length > 0 ? selectedDays : [0, 1, 2, 3, 4, 5, 6],
                        targetTime || undefined,
                        true
                    );
                } else {
                    addDailyBlock(
                        finalLabel,
                        'Otro',
                        targetDate || todayStr,
                        false,
                        projectId,
                        undefined,
                        targetTime || undefined,
                        true
                    );
                }
            });
        }

        // Reset form
        setLabel('');
        setTituloKeep('');
        setKeepItemsText('');
        setTargetTime('');
        setIsFormOpen(false);
    };

    const toggleDia = (diaIdx: number) => {
        setSelectedDays(prev =>
            prev.includes(diaIdx) ? prev.filter(d => d !== diaIdx) : [...prev, diaIdx]
        );
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
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '1.25rem 1rem 4rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: C.onSurface, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '28px', color: C.primary }}>alarm_on</span>
                        Tareas
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: C.onSurfaceVariant }}>
                        Organiza tus tareas sueltas y tus rutinas repetitivas tipo alarma en un solo lugar.
                    </p>
                </div>

                <button
                    onClick={() => setIsFormOpen(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: C.primary, color: '#fff', border: 'none',
                        borderRadius: '12px', padding: '10px 18px',
                        fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(15, 169, 122, 0.25)',
                        transition: 'transform 0.15s, opacity 0.15s',
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                    Nueva Tarea
                </button>
            </div>

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

                            {/* Selector Tipo y Modo */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                {/* Selector Tipo */}
                                <div style={{ display: 'flex', gap: '4px', background: C.surfaceContainer, padding: '3px', borderRadius: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setTipo('suelta')}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '5px',
                                            border: 'none', borderRadius: '8px', padding: '6px 14px',
                                            fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                                            background: tipo === 'suelta' ? C.surfaceLowest : 'transparent',
                                            color: tipo === 'suelta' ? C.onSurface : C.onSurfaceVariant,
                                            boxShadow: tipo === 'suelta' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: tipo === 'suelta' ? C.primary : 'inherit' }}>push_pin</span>
                                        De una vez
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setTipo('repetitiva')}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '5px',
                                            border: 'none', borderRadius: '8px', padding: '6px 14px',
                                            fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                                            background: tipo === 'repetitiva' ? C.surfaceLowest : 'transparent',
                                            color: tipo === 'repetitiva' ? C.onSurface : C.onSurfaceVariant,
                                            boxShadow: tipo === 'repetitiva' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: tipo === 'repetitiva' ? C.ambar : 'inherit' }}>alarm</span>
                                        Repetitiva
                                    </button>
                                </div>

                                {/* Selector Formato: Simple vs Keep */}
                                <div style={{ display: 'flex', gap: '3px', background: C.surfaceContainer, padding: '3px', borderRadius: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setModoEntrada('simple')}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                            border: 'none', borderRadius: '7px', padding: '5px 10px',
                                            fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                                            background: modoEntrada === 'simple' ? C.surfaceLowest : 'transparent',
                                            color: modoEntrada === 'simple' ? C.onSurface : C.onSurfaceVariant,
                                            boxShadow: modoEntrada === 'simple' ? '0 2px 5px rgba(0,0,0,0.06)' : 'none',
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check_circle</span>
                                        Simple
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModoEntrada('keep');
                                            if (label && !keepItemsText) setKeepItemsText(label);
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                            border: 'none', borderRadius: '7px', padding: '5px 10px',
                                            fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                                            background: modoEntrada === 'keep' ? C.surfaceLowest : 'transparent',
                                            color: modoEntrada === 'keep' ? '#B9760A' : C.onSurfaceVariant,
                                            boxShadow: modoEntrada === 'keep' ? '0 2px 5px rgba(0,0,0,0.06)' : 'none',
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#B9760A' }}>edit_note</span>
                                        Nota / Keep
                                    </button>
                                </div>
                            </div>

                            {/* Entrada de Tarea según Modo */}
                            {modoEntrada === 'simple' ? (
                                <div>
                                    <input
                                        type="text"
                                        value={label}
                                        onChange={e => setLabel(e.target.value)}
                                        placeholder={tipo === 'repetitiva' ? 'Ej. Tomar vitaminas, Hacer ejercicio, Subir historias...' : 'Ej. Comprar cable HDMI, Llamar al contador, Arreglar puerta...'}
                                        autoFocus
                                        required={modoEntrada === 'simple'}
                                        style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            padding: '12px 14px',
                                            fontSize: '0.95rem',
                                            borderRadius: '10px',
                                            border: `1.5px solid ${C.outlineVariant}`,
                                            background: C.surface,
                                            color: C.onSurface,
                                            fontFamily: 'inherit',
                                            outline: 'none',
                                        }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setModoEntrada('keep');
                                                if (label) setKeepItemsText(label);
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                color: C.primary, fontSize: '0.74rem', fontWeight: 600,
                                            }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>playlist_add</span>
                                            ¿Varias tareas? Escribir en lista tipo Keep
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(230,168,23,0.05)', border: '1.5px solid rgba(230,168,23,0.25)', borderRadius: '12px', padding: '12px' }}>
                                    {/* Título de la nota */}
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#B9760A', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>title</span>
                                            Título o Tema de la Nota (Opcional):
                                        </label>
                                        <input
                                            type="text"
                                            value={tituloKeep}
                                            onChange={e => setTituloKeep(e.target.value)}
                                            placeholder="Ej. Sesión de fotos, Compras de la semana, Trámites..."
                                            style={{
                                                width: '100%', boxSizing: 'border-box',
                                                padding: '8px 12px', borderRadius: '8px',
                                                border: `1px solid ${C.outlineVariant}`, background: C.surfaceLowest,
                                                color: C.onSurface, fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 600,
                                                outline: 'none',
                                            }}
                                        />
                                    </div>

                                    {/* Toolbar de Keep */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: C.onSurfaceVariant, textTransform: 'uppercase' }}>
                                            Tareas / Elementos (uno por línea):
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setKeepViewCheckboxes(v => !v)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                background: keepViewCheckboxes ? 'rgba(15,169,122,0.1)' : C.surfaceContainer,
                                                border: `1px solid ${keepViewCheckboxes ? C.primary : 'transparent'}`,
                                                borderRadius: '6px', padding: '3px 8px',
                                                fontSize: '0.72rem', fontWeight: 600,
                                                color: keepViewCheckboxes ? C.primary : C.onSurfaceVariant,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                                {keepViewCheckboxes ? 'check_box' : 'notes'}
                                            </span>
                                            {keepViewCheckboxes ? 'Casillas activas' : 'Texto libre'}
                                        </button>
                                    </div>

                                    {/* Textarea multilínea estilo Google Keep */}
                                    <div>
                                        <textarea
                                            value={keepItemsText}
                                            onChange={e => setKeepItemsText(e.target.value)}
                                            placeholder={`Escribe o pega tus tareas aquí, una por línea:
${keepViewCheckboxes ? '☑ ' : '- '}Comprar cable HDMI
${keepViewCheckboxes ? '☑ ' : '- '}Llamar al contador
${keepViewCheckboxes ? '☑ ' : '- '}Subir fotos a la galería`}
                                            rows={5}
                                            required={modoEntrada === 'keep'}
                                            style={{
                                                width: '100%', boxSizing: 'border-box',
                                                padding: '10px 12px',
                                                fontSize: '0.88rem', lineHeight: 1.5,
                                                borderRadius: '8px',
                                                border: `1px solid ${C.outlineVariant}`,
                                                background: C.surfaceLowest,
                                                color: C.onSurface,
                                                fontFamily: 'inherit',
                                                outline: 'none',
                                                resize: 'vertical',
                                            }}
                                        />
                                    </div>

                                    {/* Contador y opción de prefijo */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '0.74rem' }}>
                                        <span style={{ color: C.onSurfaceVariant, fontWeight: 600 }}>
                                            {keepItemsText.split('\n').filter(l => l.trim().length > 0).length} tarea(s) detectada(s)
                                        </span>
                                        {tituloKeep.trim() && (
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: C.onSurfaceVariant }}>
                                                <input
                                                    type="checkbox"
                                                    checked={keepConPrefijo}
                                                    onChange={e => setKeepConPrefijo(e.target.checked)}
                                                />
                                                Prefijar título a cada tarea
                                            </label>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Opciones según tipo */}
                            {tipo === 'repetitiva' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: C.onSurfaceVariant, display: 'block', marginBottom: '4px' }}>
                                            Fecha:
                                        </label>
                                        <input
                                            type="date"
                                            value={targetDate}
                                            onChange={e => setTargetDate(e.target.value)}
                                            style={{
                                                padding: '8px 12px', borderRadius: '8px',
                                                border: `1px solid ${C.outlineVariant}`, background: C.surface,
                                                color: C.onSurface, fontFamily: 'inherit', fontSize: '0.85rem',
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
                                    {modoEntrada === 'keep' && keepItemsText.split('\n').filter(l => l.trim().length > 0).length > 1
                                        ? `Guardar ${keepItemsText.split('\n').filter(l => l.trim().length > 0).length} Tareas`
                                        : 'Guardar Tarea'}
                                </button>
                            </div>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Distribución en 2 Columnas / Secciones ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>

                {/* ═══ Columna 1: Tareas Repetitivas (Alarmas) ═══ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: C.ambar }}>alarm</span>
                            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: C.onSurface }}>
                                Repetitivas (Tipo Alarma)
                            </h2>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(185, 118, 10, 0.12)', color: C.ambar, borderRadius: '999px', padding: '1px 8px' }}>
                                {repetitivas.length}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {repetitivas.length === 0 ? (
                            <div style={{ padding: '2rem 1.5rem', textAlign: 'center', background: C.surfaceLowest, borderRadius: '16px', border: `1px dashed ${C.outlineVariant}`, color: C.onSurfaceVariant }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: C.outlineVariant, marginBottom: '6px', display: 'block' }}>alarm_off</span>
                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>No tienes tareas repetitivas activas.</p>
                                <p style={{ margin: '4px 0 0', fontSize: '0.75rem' }}>Crea hábitos o alarmas que se repitan ciertos días de la semana.</p>
                            </div>
                        ) : (
                            repetitivas.map(b => {
                                const project = projects.find(p => p.id === b.projectId);
                                const isEncendida = b.isActive !== false;

                                return (
                                    <div
                                        key={b.id}
                                        style={{
                                            background: C.surfaceLowest,
                                            borderRadius: '14px',
                                            border: `1px solid ${isEncendida ? C.outlineVariant : 'rgba(0,0,0,0.06)'}`,
                                            padding: '12px 14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            opacity: isEncendida ? 1 : 0.6,
                                            transition: 'all 0.15s',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                                {/* Switch tipo alarma */}
                                                <button
                                                    onClick={() => toggleAlarmaActiva(b)}
                                                    title={isEncendida ? 'Alarma activada (Clic para pausar)' : 'Alarma pausada (Clic para activar)'}
                                                    style={{
                                                        width: '36px', height: '20px', borderRadius: '999px',
                                                        background: isEncendida ? C.primary : C.surfaceContainerHighest,
                                                        border: 'none', cursor: 'pointer', padding: '2px',
                                                        display: 'flex', alignItems: 'center',
                                                        justifyContent: isEncendida ? 'flex-end' : 'flex-start',
                                                        transition: 'background 0.2s', flexShrink: 0,
                                                    }}
                                                >
                                                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                                </button>

                                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: C.onSurface, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {b.label}
                                                </span>
                                            </div>

                                            {/* Hora si tiene */}
                                            {b.time && (
                                                <span style={{
                                                    fontSize: '0.75rem', fontWeight: 800, fontFamily: MONO,
                                                    background: 'rgba(15, 169, 122, 0.1)', color: C.primary,
                                                    borderRadius: '6px', padding: '2px 7px', display: 'flex', alignItems: 'center', gap: '3px',
                                                }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>schedule</span>
                                                    {b.time}
                                                </span>
                                            )}

                                            {/* Botón editar */}
                                            <button
                                                onClick={() => handleStartEdit(b)}
                                                title="Editar tarea repetitiva"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: C.outline, display: 'flex', alignItems: 'center' }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                                            </button>

                                            {/* Botón eliminar */}
                                            <button
                                                onClick={() => handleDeleteRepetitiva(b)}
                                                title="Eliminar tarea repetitiva"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: C.outline, display: 'flex', alignItems: 'center' }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                            </button>
                                        </div>

                                        {/* Días y proyecto */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {DIAS_SEMANA.map(d => {
                                                    const activo = b.repeatDays?.includes(d.idx);
                                                    return (
                                                        <span
                                                            key={d.idx}
                                                            style={{
                                                                width: '18px', height: '18px', borderRadius: '5px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '0.62rem', fontWeight: 800,
                                                                background: activo ? (isEncendida ? C.primary : C.outline) : 'transparent',
                                                                color: activo ? '#fff' : C.outlineVariant,
                                                            }}
                                                        >
                                                            {d.label}
                                                        </span>
                                                    );
                                                })}
                                            </div>

                                            {project && (
                                                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: C.onSurfaceVariant, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: project.color }} />
                                                    {project.name}
                                                </span>
                                            )}
                                        </div>
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
                            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: C.onSurface }}>
                                Tareas de una vez (Sueltas)
                            </h2>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(15, 169, 122, 0.12)', color: C.primary, borderRadius: '999px', padding: '1px 8px' }}>
                                {sueltas.filter(s => !s.completed).length} pendientes
                            </span>
                        </div>

                        {/* Filtros */}
                        <div style={{ display: 'flex', gap: '4px', background: C.surfaceContainer, padding: '2px', borderRadius: '8px' }}>
                            <button
                                onClick={() => setFiltroSueltas('pendientes')}
                                style={{
                                    border: 'none', borderRadius: '6px', padding: '3px 8px',
                                    fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                                    background: filtroSueltas === 'pendientes' ? C.surfaceLowest : 'transparent',
                                    color: filtroSueltas === 'pendientes' ? C.primary : C.onSurfaceVariant,
                                }}
                            >
                                Pendientes
                            </button>
                            <button
                                onClick={() => setFiltroSueltas('hoy')}
                                style={{
                                    border: 'none', borderRadius: '6px', padding: '3px 8px',
                                    fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                                    background: filtroSueltas === 'hoy' ? C.surfaceLowest : 'transparent',
                                    color: filtroSueltas === 'hoy' ? C.primary : C.onSurfaceVariant,
                                }}
                            >
                                De Hoy
                            </button>
                            <button
                                onClick={() => setFiltroSueltas('todas')}
                                style={{
                                    border: 'none', borderRadius: '6px', padding: '3px 8px',
                                    fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                                    background: filtroSueltas === 'todas' ? C.surfaceLowest : 'transparent',
                                    color: filtroSueltas === 'todas' ? C.primary : C.onSurfaceVariant,
                                }}
                            >
                                Todas
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {sueltasFiltradas.length === 0 ? (
                            <div style={{ padding: '2rem 1.5rem', textAlign: 'center', background: C.surfaceLowest, borderRadius: '16px', border: `1px dashed ${C.outlineVariant}`, color: C.onSurfaceVariant }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: C.outlineVariant, marginBottom: '6px', display: 'block' }}>task_alt</span>
                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>No hay tareas sueltas en este filtro.</p>
                                <p style={{ margin: '4px 0 0', fontSize: '0.75rem' }}>Agrega una tarea de una sola vez con el botón arriba.</p>
                            </div>
                        ) : (
                            sueltasFiltradas.map(b => {
                                const project = projects.find(p => p.id === b.projectId);
                                const esHoy = b.date === todayStr;

                                return (
                                    <div
                                        key={b.id}
                                        style={{
                                            background: C.surfaceLowest,
                                            borderRadius: '14px',
                                            border: `1px solid ${C.outlineVariant}`,
                                            padding: '10px 14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            transition: 'all 0.15s',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                                        }}
                                    >
                                        {/* Checkbox circular */}
                                        <button
                                            onClick={() => toggleDailyBlock(b.id)}
                                            style={{
                                                width: '20px', height: '20px', borderRadius: '50%',
                                                border: `2px solid ${b.completed ? C.primary : C.outlineVariant}`,
                                                background: b.completed ? C.primary : 'transparent',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0, padding: 0,
                                            }}
                                        >
                                            {b.completed && (
                                                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#fff' }}>check</span>
                                            )}
                                        </button>

                                        {/* Texto y metadatos */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '0.88rem', fontWeight: 600, color: b.completed ? C.outline : C.onSurface,
                                                textDecoration: b.completed ? 'line-through' : 'none',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            }}>
                                                {b.label}
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                                                {/* Badge de fecha */}
                                                <span style={{
                                                    fontSize: '0.68rem', fontWeight: 700,
                                                    color: esHoy ? C.primary : C.onSurfaceVariant,
                                                    background: esHoy ? 'rgba(15, 169, 122, 0.08)' : C.surfaceContainer,
                                                    borderRadius: '4px', padding: '1px 5px',
                                                }}>
                                                    {esHoy ? 'Hoy' : b.date}
                                                </span>

                                                {/* Hora si tiene */}
                                                {b.time && (
                                                    <span style={{ fontSize: '0.68rem', fontFamily: MONO, color: C.onSurfaceVariant }}>
                                                        ⏰ {b.time}
                                                    </span>
                                                )}

                                                {/* Proyecto */}
                                                {project && (
                                                    <span style={{ fontSize: '0.68rem', color: C.onSurfaceVariant, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: project.color }} />
                                                        {project.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Botón editar */}
                                        <button
                                            onClick={() => handleStartEdit(b)}
                                            title="Editar tarea"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: C.outline, display: 'flex', alignItems: 'center' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                                        </button>

                                        {/* Botón eliminar */}
                                        <button
                                            onClick={() => removeDailyBlock(b.id)}
                                            title="Eliminar tarea"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: C.outline, display: 'flex', alignItems: 'center' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                        </button>
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
