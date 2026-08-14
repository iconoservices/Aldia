import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, Trash2, MoreVertical, Play, Pause, Square, CheckCircle2, Flame, RotateCcw, Circle, CheckCircle, Sparkles, GripVertical, ArrowUpDown, Timer, PieChart, Pin, Image as ImageIcon, Check, TimerReset } from "lucide-react";
import {
    DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CalendarEvent, NotionEstado, SporadicProject } from "../../hooks/useAlDiaState";
import { NOTION_ESTADOS } from "../../hooks/useAlDiaState";
import { C, bento, campo, botonPrimario, etiqueta, useIsMobile, paddingPagina, cabecera, tituloPagina, subtituloPagina } from "../../theme";
import { ConfirmDialog } from "../ui/ConfirmDialog";

const ORDER_STORAGE_KEY = "aldia_esporadicos_custom_order";

const ESTADO_COLOR: Record<NotionEstado, string> = {
    'Agendado': '#6366F1',
    'Realizado': '#8B5CF6',
    'En Edición': '#E6A817',
    'Terminado': '#10B981',
    'Entregado': '#059669',
};

// Escribe el Estado de vuelta en Notion; el llamador ya actualiza el estado local
// de forma optimista, esto solo intenta reflejarlo también allá (best-effort).
const pushNotionEstado = (notionId: string, estado: NotionEstado) => {
    fetch('/api/update-notion-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notionId, estado })
    }).catch(err => console.error('No se pudo actualizar Estado en Notion:', err));
};

/* ══════════════════════════════════════════════════════════════════
   EsporadicosDashboard — proyectos puntuales con fecha de entrega
   (videos, encargos), a diferencia de Proyectos que es continuo y sin
   deadline. La lista se ordena sola por urgencia (prioridad = días de
   atraso + complejidad), cada tarjeta trae cronómetro para registrar
   horas reales y barra de avance del rango inicio→entrega. La racha
   cuenta días consecutivos con al menos un registro de trabajo, sin
   importar en qué proyecto.
══════════════════════════════════════════════════════════════════ */

interface EsporadicosProps {
    sporadicProjects: SporadicProject[];
    addSporadicProject: (title: string, dueDate: string, complexityHours: number, startDate?: string) => number;
    updateSporadicProject: (id: number, updates: Partial<SporadicProject>) => void;
    removeSporadicProject: (id: number) => void;
    startSporadicTimer: (id: number, stage?: string) => void;
    pauseSporadicTimer: (id: number) => void;
    stopSporadicTimer: (id: number) => void;
    startPhotoTimer: (id: number) => void;
    pausePhotoTimer: (id: number) => void;
    finishPhotoTimer: (id: number) => void;
    cancelPhotoTimer: (id: number) => void;
    resetSporadicWorkedTime: (id: number) => void;
    resetSporadicPhotoLog: (id: number) => void;
    calendarEvents: CalendarEvent[];
    updateCalendarEvent: (id: number, updates: Partial<CalendarEvent>) => void;
}

const todayStr = () => new Date().toLocaleDateString('en-CA');
const daysBetween = (a: string, b: string) => Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);

const formatElapsed = (ms: number) => {
    const totalSec = Math.max(Math.floor(ms / 1000), 0);
    const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

/** Reloj vivo: mientras `enabled`, se actualiza cada segundo (para el cronómetro, la barra de horas y el aviso de Pomodoro). */
const useNowTicking = (enabled: boolean) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!enabled) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [enabled]);
    return now;
};

const formatHM = (date: Date) => date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

// Sonido corto de aviso (dos beeps) sin depender de un archivo de audio.
const playPomodoroBeep = () => {
    try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AC();
        [0, 0.35].forEach(delay => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.18, ctx.currentTime + delay);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.25);
        });
    } catch { /* el navegador puede bloquear audio sin interacción previa; no es crítico */ }
};

const POMODORO_MINUTES = 25;

const priorityOf = (p: SporadicProject) => {
    if (p.status === 'completado') return -9999;
    const daysLate = daysBetween(p.dueDate, todayStr());
    return daysLate + p.complexityHours;
};

const urgency = (p: SporadicProject): { color: string; label: string } => {
    if (p.status === 'completado') return { color: C.verde, label: 'Completado' };
    const daysLeft = daysBetween(todayStr(), p.dueDate);
    if (daysLeft < 0) return { color: C.rojo, label: `${Math.abs(daysLeft)}d de atraso` };
    if (daysLeft <= 1) return { color: C.ambar, label: daysLeft === 0 ? 'Hoy' : 'Mañana' };
    return { color: C.verde, label: `${daysLeft}d restantes` };
};

/** Racha: días consecutivos (contando hoy hacia atrás) con al menos un log de trabajo en cualquier proyecto. */
const computeStreak = (projects: SporadicProject[]) => {
    const daysWithWork = new Set<string>();
    projects.forEach(p => p.logs.forEach(l => daysWithWork.add(l.date)));
    if (daysWithWork.size === 0) return 0;

    let streak = 0;
    const cursor = new Date();
    // Si hoy todavía no hay registro, la racha se cuenta desde ayer (no se rompe hasta medianoche).
    if (!daysWithWork.has(cursor.toLocaleDateString('en-CA'))) cursor.setDate(cursor.getDate() - 1);

    while (daysWithWork.has(cursor.toLocaleDateString('en-CA'))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
};

export const EsporadicosDashboard = ({ sporadicProjects, addSporadicProject, updateSporadicProject, removeSporadicProject, startSporadicTimer, pauseSporadicTimer, stopSporadicTimer, startPhotoTimer, pausePhotoTimer, finishPhotoTimer, cancelPhotoTimer, resetSporadicWorkedTime, resetSporadicPhotoLog, calendarEvents, updateCalendarEvent }: EsporadicosProps) => {
    const movil = useIsMobile();
    const [addingOpen, setAddingOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [dueDate, setDueDate] = useState(todayStr());
    const [complexityHours, setComplexityHours] = useState("");

    // Trae automáticamente las sesiones de Notion como tarjetas esporádicas: no
    // tiene sentido teclear a mano lo que ya está en la Agenda de Notion. Cada
    // sesión con notionId se vincula 1:1 a una SporadicProject (por notionId);
    // se crea si falta, se refresca título/entrega si cambiaron en Notion, y se
    // marca completado sola cuando el Estado real llega a "Entregado".
    //
    // dispatchedRef evita crear duplicados: sin esto, StrictMode invoca este
    // efecto dos veces seguidas en dev con el mismo `sporadicProjects` todavía
    // sin actualizar, y ambas pasadas ven "no existe" y crean dos tarjetas para
    // el mismo notionId. El ref persiste entre esas dos pasadas (a diferencia
    // del closure de sporadicProjects) así que la segunda pasada ya lo ve marcado.
    const dispatchedRef = useRef<Set<string>>(new Set());
    useEffect(() => {
        const notionEvents = calendarEvents.filter(e => e.notionId);
        notionEvents.forEach(e => {
            const notionId = e.notionId!;
            const linked = sporadicProjects.find(p => p.notionId === notionId);
            const dueDate = e.notionEntregaFecha || e.date;
            const isEntregado = e.notionEstado === 'Entregado';

            if (!linked) {
                if (dispatchedRef.current.has(notionId)) return;
                dispatchedRef.current.add(notionId);
                const newId = addSporadicProject(e.title, dueDate, 0, e.date);
                updateSporadicProject(newId, { notionId, status: isEntregado ? 'completado' : 'pendiente' });
                return;
            }
            const updates: Partial<SporadicProject> = {};
            if (linked.title !== e.title) updates.title = e.title;
            if (linked.dueDate !== dueDate) updates.dueDate = dueDate;
            if (isEntregado && linked.status !== 'completado') updates.status = 'completado';
            if (Object.keys(updates).length > 0) updateSporadicProject(linked.id, updates);
        });
    }, [calendarEvents, sporadicProjects, addSporadicProject, updateSporadicProject]);

    const streak = useMemo(() => computeStreak(sporadicProjects), [sporadicProjects]);

    // Orden manual: sustituye al automático (por prioridad) cuando el usuario arrastra
    // una tarjeta, igual que en Checklist. Vive solo en este dispositivo (localStorage).
    const [customOrder, setCustomOrder] = useState<number[]>(() => {
        try {
            const saved = localStorage.getItem(ORDER_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const saveOrder = (order: number[]) => {
        setCustomOrder(order);
        try { localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order)); } catch { /* ignore */ }
    };
    const applyOrder = useCallback((list: SporadicProject[]) => {
        const sorted = customOrder.length === 0
            ? [...list].sort((a, b) => priorityOf(b) - priorityOf(a))
            : [...list].sort((a, b) => {
                const ia = customOrder.indexOf(a.id), ib = customOrder.indexOf(b.id);
                if (ia === -1 && ib === -1) return priorityOf(b) - priorityOf(a);
                if (ia === -1) return 1;
                if (ib === -1) return -1;
                return ia - ib;
            });
        // Lo fijado (o con el cronómetro corriendo — se fija solo al darle Play)
        // siempre sube al principio, manual o automático: es en lo que estás
        // metido ahora, aunque hayas parado el cronómetro un rato.
        return sorted.sort((a, b) => Number(!!b.pinned || !!b.activeSince) - Number(!!a.pinned || !!a.activeSince));
    }, [customOrder]);

    const pendientes = useMemo(
        () => sporadicProjects.filter(p => p.status !== 'completado'),
        [sporadicProjects]
    );
    // "Listos para entregar": ya en Notion dice Terminado (se acabó de editar) pero
    // todavía no Entregado — separados para no perderlos entre lo que aún falta trabajar.
    const listosParaEntregar = useMemo(
        () => applyOrder(pendientes.filter(p => {
            const ev = p.notionId ? calendarEvents.find(e => e.notionId === p.notionId) : undefined;
            return ev?.notionEstado === 'Terminado';
        })),
        [pendientes, calendarEvents, applyOrder]
    );
    const enProgreso = useMemo(
        () => applyOrder(pendientes.filter(p => !listosParaEntregar.some(x => x.id === p.id))),
        [pendientes, listosParaEntregar, applyOrder]
    );
    const completados = useMemo(() => sporadicProjects.filter(p => p.status === 'completado'), [sporadicProjects]);

    // Cuánto tiempo real se va en cada etapa (Agendado/Realizado/En Edición/...), sumando
    // los logs de todos los proyectos. Sirve para detectar el cuello de botella real
    // (ej. "80% del tiempo se va en Edición") en vez de adivinarlo.
    const timeByStage = useMemo(() => {
        const totals = new Map<string, number>();
        sporadicProjects.forEach(p => p.logs.forEach(l => {
            const stage = l.stage || 'Sin etapa';
            totals.set(stage, (totals.get(stage) || 0) + l.hours);
        }));
        return [...totals.entries()].map(([stage, hours]) => ({ stage, hours })).sort((a, b) => b.hours - a.hours);
    }, [sporadicProjects]);
    const totalHoursLogged = useMemo(() => timeByStage.reduce((s, t) => s + t.hours, 0), [timeByStage]);

    // Total acumulado sumando TODOS los proyectos (workedHours ya incluye tanto
    // las sesiones cerradas como el tiempo de fotos sumado sin sesión activa) —
    // a diferencia de timeByStage/totalHoursLogged, que solo cuenta lo que quedó
    // etiquetado con una etapa. Se muestra siempre arriba, sin tener que desplegar nada.
    const totalWorkedAllProjects = useMemo(() => sporadicProjects.reduce((s, p) => s + p.workedHours, 0), [sporadicProjects]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const handleDragEnd = (columnIds: number[]) => (e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const oldIndex = columnIds.indexOf(active.id as number);
        const newIndex = columnIds.indexOf(over.id as number);
        if (oldIndex === -1 || newIndex === -1) return;
        const reordered = arrayMove(columnIds, oldIndex, newIndex);
        const others = (customOrder.length > 0 ? customOrder : sporadicProjects.map(p => p.id)).filter(id => !columnIds.includes(id));
        saveOrder([...reordered, ...others]);
    };

    const submit = () => {
        if (!title.trim() || !dueDate) return;
        addSporadicProject(title.trim(), dueDate, Math.abs(parseFloat(complexityHours)) || 0);
        setTitle(""); setDueDate(todayStr()); setComplexityHours("");
        setAddingOpen(false);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: movil ? "1rem" : "1.5rem", ...paddingPagina(movil), color: "var(--text-carbon)" }}>
            <div style={cabecera(movil)}>
                <div>
                    <h2 style={tituloPagina}>Entregas</h2>
                    <p style={subtituloPagina}>Entregas puntuales — ordenadas solas por qué tan urgentes están.</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {customOrder.length > 0 && (
                        <button onClick={() => saveOrder([])} title="Volver al orden automático por prioridad" style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: `1px solid ${C.outlineVariant}`, borderRadius: "999px", padding: "7px 12px", cursor: "pointer", color: C.onSurfaceVariant, fontSize: "0.72rem", fontWeight: 700 }}>
                            <ArrowUpDown size={13} /> Orden manual
                        </button>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(99,102,241,0.12)", borderRadius: "999px", padding: "8px 16px" }}>
                        <Timer size={18} color={C.secondary} />
                        <span style={{ fontWeight: 800, fontSize: "0.9rem", color: C.onSurface }}>{formatElapsed(totalWorkedAllProjects * 60 * 60 * 1000)}</span>
                        <span style={{ fontSize: "0.75rem", color: C.onSurfaceVariant }}>en total</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(230,168,23,0.12)", borderRadius: "999px", padding: "8px 16px" }}>
                        <Flame size={18} color={C.ambar} fill={streak > 0 ? C.ambar : "none"} />
                        <span style={{ fontWeight: 800, fontSize: "0.9rem", color: C.onSurface }}>{streak}</span>
                        <span style={{ fontSize: "0.75rem", color: C.onSurfaceVariant }}>{streak === 1 ? "día seguido" : "días seguidos"}</span>
                    </div>
                </div>
            </div>

            <details style={{ ...bento, padding: "0.9rem 1rem" }}>
                <summary style={{ ...etiqueta, cursor: "pointer" }}>Spec original de este módulo</summary>
                <div style={{ marginTop: "0.8rem", display: "flex", flexDirection: "column", gap: "0.7rem", fontSize: "0.8rem", color: C.onSurfaceVariant, lineHeight: 1.5 }}>
                    <SpecItem
                        n={1} title="Contador de racha" done
                        body="Igual que Duolingo/GitHub: cuántos días seguidos trabajaste. Ver una racha activa duele romperla, así que empuja a trabajar aunque sean 15 min."
                    />
                    <SpecItem
                        n={2} title="Semáforo de entregas" done
                        body="Lista ordenada por gravedad: rojo = debió entregarse hace días, ámbar = se entrega hoy/mañana, verde = con margen. No un calendario plano que estresa mostrando todo en rojo."
                    />
                    <SpecItem
                        n={3} title="Barra de bloques de tiempo" done
                        body="Barra que va del día que arrancó el trabajo al día de entrega y se va llenando. Si llega al final sin marcar completado, parpadea en negro."
                    />
                    <SpecItem
                        n={4} title="Orden automático por prioridad" done
                        body="Prioridad = días de atraso + complejidad estimada. La app ordena sola qué toca hoy, sin tener que pensarlo."
                    />
                    <SpecItem
                        n={5} title="Diario de edición" done
                        body="Botón Empezar/Terminar que acumula horas reales trabajadas por proyecto, para saber el ritmo real (no el prometido)."
                    />
                    <SpecItem
                        n={6} title="Modo Pánico" done={false}
                        body="Tip de supervivencia pendiente: un botón que oculte todo lo demás y muestre solo el proyecto más urgente + un cronómetro. Aún no construido."
                    />
                    <SpecItem
                        n={7} title="Datos desde Notion" done
                        body="Las sesiones de tu Agenda de Notion aparecen acá solas (fecha de entrega real), y 'Empezar a trabajar' pone el Estado en 'En Edición' allá también."
                    />
                    <SpecItem
                        n={8} title="Orden manual por arrastre" done
                        body="Cada columna se puede reordenar arrastrando las tarjetas; sustituye al orden automático hasta que lo reinicies."
                    />
                    <SpecItem
                        n={9} title="Cronómetro en vivo + desglose por etapa" done
                        body="Mientras corre, muestra el tiempo transcurrido de esa sesión en vivo. Cada sesión queda etiquetada con el Estado (Agendado/En Edición/etc.) que tenías activo al darle Play, para ver después en qué etapa se te va más tiempo."
                    />
                    <SpecItem
                        n={10} title="Barra de progreso por horas trabajadas" done={false}
                        body="Pendiente: colorear la barra según horas trabajadas vs. estimadas (si estimas 10h y llevas 5, que se vea a la mitad), separado de la barra de días que ya existe."
                    />
                    <SpecItem
                        n={11} title="Botón de Pausa" done={false}
                        body="Pendiente: pausar el cronómetro sin cerrar la sesión (para una llamada, un café) y poder reanudarlo, sin que cuente como tiempo trabajado."
                    />
                    <SpecItem
                        n={12} title="Tiempo real vs. estimado + proyección" done={false}
                        body="Pendiente: con las horas ya trabajadas y las estimadas, calcular cuánto falta y a qué hora terminarías al ritmo de hoy; si vas atrasado, cuántas horas diarias necesitas para ponerte al día."
                    />
                    <SpecItem
                        n={13} title="Pomodoro integrado" done={false}
                        body="Pendiente: al dar Play, ciclos de 25 min de trabajo + 5 de descanso con aviso (sonido o notificación)."
                    />
                    <SpecItem
                        n={14} title="Cronómetro por foto" done
                        body="Aparte del cronómetro de sesión: Iniciar/Foto lista marca cuánto tarda cada foto individual, y va sumando conteo, promedio y total — para saber el ritmo real por foto, no solo cuánto duró la sesión."
                    />
                </div>
            </details>

            {timeByStage.length > 0 && (
                <details style={{ ...bento, padding: "0.9rem 1rem" }}>
                    <summary style={{ ...etiqueta, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                        <PieChart size={13} /> Tiempo por etapa ({totalHoursLogged.toFixed(1)}h en total)
                    </summary>
                    <div style={{ marginTop: "0.7rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {timeByStage.map(({ stage, hours }) => (
                            <div key={stage} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                                    <span style={{ fontWeight: 700, color: C.onSurface }}>{stage}</span>
                                    <span style={{ fontWeight: 800, color: C.onSurfaceVariant }}>{hours.toFixed(1)}h · {totalHoursLogged > 0 ? Math.round((hours / totalHoursLogged) * 100) : 0}%</span>
                                </div>
                                <div style={{ height: "6px", borderRadius: "999px", background: C.surfaceContainer, overflow: "hidden" }}>
                                    <div style={{ height: "100%", borderRadius: "999px", width: `${totalHoursLogged > 0 ? (hours / totalHoursLogged) * 100 : 0}%`, background: ESTADO_COLOR[stage as NotionEstado] || C.secondary }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </details>
            )}

            {addingOpen ? (
                <div style={{ ...bento, padding: "1rem", display: "flex", flexDirection: movil ? "column" : "row", gap: "8px", alignItems: movil ? "stretch" : "center" }}>
                    <input autoFocus placeholder="Título (ej. Video cliente X)" value={title} onChange={e => setTitle(e.target.value)} style={{ ...campo(movil), flex: 2 }} />
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ ...campo(movil), flex: 1 }} />
                    <input type="number" min={0} placeholder="Horas estimadas" value={complexityHours} onChange={e => setComplexityHours(e.target.value)} style={{ ...campo(movil), flex: 1 }} />
                    <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={submit} style={botonPrimario(movil)}>Crear</button>
                        <button onClick={() => setAddingOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.outline, padding: "6px" }}><X size={18} /></button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setAddingOpen(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "none", border: `2px dashed ${C.outlineVariant}`, borderRadius: "12px", padding: "12px", cursor: "pointer", color: C.outline, fontWeight: 700, fontSize: "0.85rem" }}>
                    <Plus size={16} /> Nuevo proyecto esporádico
                </button>
            )}

            {sporadicProjects.length === 0 && !addingOpen && (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: C.outline }}>
                    <CheckCircle2 size={32} style={{ opacity: 0.4, marginBottom: "0.5rem" }} />
                    <p style={{ margin: 0, fontSize: "0.85rem" }}>Sin proyectos esporádicos. Crea el primero arriba.</p>
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: movil || listosParaEntregar.length === 0 ? "1fr" : "1fr 1fr", gap: "1.25rem", alignItems: "start" }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(enProgreso.map(p => p.id))}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                        {listosParaEntregar.length > 0 && <span style={etiqueta}>En curso ({enProgreso.length})</span>}
                        <SortableContext items={enProgreso.map(p => p.id)} strategy={verticalListSortingStrategy}>
                            {enProgreso.map(p => (
                                <SortableProjectCard key={p.id} p={p} updateSporadicProject={updateSporadicProject} removeSporadicProject={removeSporadicProject} startSporadicTimer={startSporadicTimer} pauseSporadicTimer={pauseSporadicTimer} stopSporadicTimer={stopSporadicTimer} startPhotoTimer={startPhotoTimer} pausePhotoTimer={pausePhotoTimer} finishPhotoTimer={finishPhotoTimer} cancelPhotoTimer={cancelPhotoTimer} resetSporadicWorkedTime={resetSporadicWorkedTime} resetSporadicPhotoLog={resetSporadicPhotoLog} calendarEvents={calendarEvents} updateCalendarEvent={updateCalendarEvent} />
                            ))}
                        </SortableContext>
                    </div>
                </DndContext>
                {listosParaEntregar.length > 0 && (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(listosParaEntregar.map(p => p.id))}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                            <span style={etiqueta}>Listos para entregar ({listosParaEntregar.length})</span>
                            <SortableContext items={listosParaEntregar.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                {listosParaEntregar.map(p => (
                                    <SortableProjectCard key={p.id} p={p} updateSporadicProject={updateSporadicProject} removeSporadicProject={removeSporadicProject} startSporadicTimer={startSporadicTimer} pauseSporadicTimer={pauseSporadicTimer} stopSporadicTimer={stopSporadicTimer} startPhotoTimer={startPhotoTimer} pausePhotoTimer={pausePhotoTimer} finishPhotoTimer={finishPhotoTimer} cancelPhotoTimer={cancelPhotoTimer} resetSporadicWorkedTime={resetSporadicWorkedTime} resetSporadicPhotoLog={resetSporadicPhotoLog} calendarEvents={calendarEvents} updateCalendarEvent={updateCalendarEvent} />
                                ))}
                            </SortableContext>
                        </div>
                    </DndContext>
                )}
            </div>

            {completados.length > 0 && (
                <details>
                    <summary style={{ ...etiqueta, cursor: "pointer", marginBottom: "0.6rem" }}>Completados ({completados.length})</summary>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "0.6rem" }}>
                        {completados.map(p => (
                            <ProjectCard key={p.id} p={p} updateSporadicProject={updateSporadicProject} removeSporadicProject={removeSporadicProject} startSporadicTimer={startSporadicTimer} pauseSporadicTimer={pauseSporadicTimer} stopSporadicTimer={stopSporadicTimer} startPhotoTimer={startPhotoTimer} pausePhotoTimer={pausePhotoTimer} finishPhotoTimer={finishPhotoTimer} cancelPhotoTimer={cancelPhotoTimer} resetSporadicWorkedTime={resetSporadicWorkedTime} resetSporadicPhotoLog={resetSporadicPhotoLog} calendarEvents={calendarEvents} updateCalendarEvent={updateCalendarEvent} />
                        ))}
                    </div>
                </details>
            )}

            <style>{`
                @keyframes esporadico-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.35; }
                }
            `}</style>
        </div>
    );
};

const ProjectCard = ({ p, updateSporadicProject, removeSporadicProject, startSporadicTimer, pauseSporadicTimer, stopSporadicTimer, startPhotoTimer, pausePhotoTimer, finishPhotoTimer, cancelPhotoTimer, resetSporadicWorkedTime, resetSporadicPhotoLog, calendarEvents, updateCalendarEvent, dragHandle }: {
    p: SporadicProject;
    updateSporadicProject: (id: number, updates: Partial<SporadicProject>) => void;
    removeSporadicProject: (id: number) => void;
    startSporadicTimer: (id: number, stage?: string) => void;
    pauseSporadicTimer: (id: number) => void;
    stopSporadicTimer: (id: number) => void;
    startPhotoTimer: (id: number) => void;
    pausePhotoTimer: (id: number) => void;
    finishPhotoTimer: (id: number) => void;
    cancelPhotoTimer: (id: number) => void;
    resetSporadicWorkedTime: (id: number) => void;
    resetSporadicPhotoLog: (id: number) => void;
    calendarEvents: CalendarEvent[];
    updateCalendarEvent: (id: number, updates: Partial<CalendarEvent>) => void;
    dragHandle?: React.ReactNode;
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [confirmResetPhotos, setConfirmResetPhotos] = useState(false);
    const [pomodoroAlert, setPomodoroAlert] = useState(false);
    const lastPomodoroThresholdRef = useRef(0);

    const { color, label } = urgency(p);
    const totalSpan = Math.max(daysBetween(p.startDate, p.dueDate), 1);
    const elapsedDays = daysBetween(p.startDate, todayStr());
    const pctElapsed = Math.min(Math.max((elapsedDays / totalSpan) * 100, 0), 100);
    const overdueUnfinished = p.status !== 'completado' && pctElapsed >= 100;
    const running = !!p.activeSince;
    const paused = !running && !!p.pausedAccumHours;
    const inSession = running || paused;
    const linkedEvent = p.notionId ? calendarEvents.find(e => e.notionId === p.notionId) : undefined;

    const now = useNowTicking(running);
    const liveRunningHours = running && p.activeSince ? Math.max((now - p.activeSince) / (1000 * 60 * 60), 0) : 0;
    const sessionHours = (p.pausedAccumHours || 0) + liveRunningHours;
    const effectiveWorkedHours = p.workedHours + sessionHours;

    // Reloj de pared: cuánto tiempo real pasó desde que le diste Play por primera
    // vez a esta sesión, sin importar si estuvo pausada o cuánto editaste de verdad
    // (a diferencia de sessionHours, que sí descuenta las pausas). Tickea aunque
    // esté en pausa, para que se note que el reloj real sigue corriendo.
    const wallNow = useNowTicking(inSession);
    const sinceStartMs = inSession && p.sessionStartedAt ? Math.max(wallNow - p.sessionStartedAt, 0) : 0;

    // Reloj de "cuánto llevo metido en esto sin entregarlo": arranca la primera
    // vez que le diste Play y NUNCA se detiene (ni con pausas, ni al Terminar
    // sesión) hasta que el proyecto quede completado. Solo se resetea a mano
    // desde "Reiniciar horas".
    const trackingSinceFirstStart = !!p.firstStartedAt && p.status !== 'completado';
    const trackNow = useNowTicking(trackingSinceFirstStart);
    const sinceFirstStartMs = trackingSinceFirstStart && p.firstStartedAt ? Math.max(trackNow - p.firstStartedAt, 0) : 0;

    // Cronómetro por foto: independiente del de sesión, para saber cuánto toma
    // editar cada foto individual (no solo cuánto duró la sesión completa).
    // Con pausa propia, mismo patrón que el cronómetro de sesión.
    const photoRunning = !!p.photoActiveSince;
    const photoPaused = !photoRunning && !!p.photoPausedAccumSeconds;
    const photoInSession = photoRunning || photoPaused;
    const photoNow = useNowTicking(photoRunning);
    const livePhotoRunningMs = photoRunning && p.photoActiveSince ? Math.max(photoNow - p.photoActiveSince, 0) : 0;
    const livePhotoMs = livePhotoRunningMs + (p.photoPausedAccumSeconds || 0) * 1000;
    const photoLogs = p.photoLogs || [];
    const photoCount = photoLogs.length;
    const totalPhotoMs = photoLogs.reduce((s, l) => s + l.seconds * 1000, 0);
    const avgPhotoMs = photoCount > 0 ? totalPhotoMs / photoCount : 0;

    // Tiempo por etapa de ESTE proyecto (a diferencia del panel de arriba del
    // dashboard, que suma todos los proyectos juntos) — cuánto de las horas
    // trabajadas se fue en cada Estado (Agendado/En Edición/etc.).
    const stageBreakdown = useMemo(() => {
        const totals = new Map<string, number>();
        p.logs.forEach(l => totals.set(l.stage || 'Sin etapa', (totals.get(l.stage || 'Sin etapa') || 0) + l.hours));
        return [...totals.entries()].map(([stage, hours]) => ({ stage, hours })).sort((a, b) => b.hours - a.hours);
    }, [p.logs]);
    const stageBreakdownTotal = useMemo(() => stageBreakdown.reduce((s, t) => s + t.hours, 0), [stageBreakdown]);

    // Pomodoro: cada 25 min acumulados de esta sesión (corriendo, sumando lo pausado),
    // avisa una vez con sonido + banner. lastPomodoroThresholdRef evita repetir el aviso.
    useEffect(() => {
        if (!running) return;
        const crossedBlocks = Math.floor((sessionHours * 60) / POMODORO_MINUTES);
        if (crossedBlocks > lastPomodoroThresholdRef.current) {
            lastPomodoroThresholdRef.current = crossedBlocks;
            setPomodoroAlert(true);
            playPomodoroBeep();
            setTimeout(() => setPomodoroAlert(false), 8000);
        }
    }, [sessionHours, running]);
    useEffect(() => {
        if (!inSession) lastPomodoroThresholdRef.current = 0;
    }, [inSession]);

    // Al cambiar el paso de trabajo local, si la tarjeta viene de Notion se
    // refleja también allá (best-effort) y de forma optimista acá mismo.
    const setNotionEstado = (estado: NotionEstado) => {
        if (!p.notionId) return;
        pushNotionEstado(p.notionId, estado);
        if (linkedEvent) updateCalendarEvent(linkedEvent.id, { notionEstado: estado });
        updateSporadicProject(p.id, { status: estado === 'Entregado' ? 'completado' : 'en-progreso' });
    };

    // Calculadora tiempo real vs. estimado: cuánto falta, a qué hora terminarías
    // si sigues al ritmo de ahora, y si vas atrasado, cuántas horas diarias hacen falta.
    const remainingHours = Math.max(p.complexityHours - effectiveWorkedHours, 0);
    const daysUntilDue = daysBetween(todayStr(), p.dueDate);
    const eta = remainingHours > 0 ? formatHM(new Date(now + remainingHours * 60 * 60 * 1000)) : null;

    return (
        <div style={{ ...bento, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem", borderLeft: `4px solid ${color}`, opacity: p.status === 'completado' ? 0.7 : 1, position: "relative" }}>
            {pomodoroAlert && (
                <div style={{ position: "absolute", top: "-10px", left: "10px", right: "10px", background: C.ambar, color: "white", borderRadius: "10px", padding: "6px 10px", fontSize: "0.72rem", fontWeight: 800, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 6 }}>
                    ⏰ {POMODORO_MINUTES} min — tómate 5 de descanso
                </div>
            )}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                {dragHandle}
                <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        {p.notionId && <span title="Sincronizado desde Notion" style={{ display: "flex" }}><Sparkles size={12} color={C.secondary} /></span>}
                        <span style={{ fontWeight: 800, fontSize: "0.95rem", color: C.onSurface, textDecoration: p.status === 'completado' ? "line-through" : "none" }}>{p.title}</span>
                        {running && (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", background: C.rojo, color: "white", borderRadius: "999px", padding: "2px 8px", fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "white", animation: "esporadico-blink 1.1s ease-in-out infinite" }} />
                                Trabajando
                            </span>
                        )}
                        {paused && (
                            <span style={{ background: C.ambar, color: "white", borderRadius: "999px", padding: "2px 8px", fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                                En pausa
                            </span>
                        )}
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "3px", fontSize: "0.72rem", color: C.onSurfaceVariant, fontWeight: 700 }}>
                        <span style={{ color }}>{label}</span>
                        <span>Entrega: {p.dueDate}</span>
                        <span>{formatElapsed(effectiveWorkedHours * 60 * 60 * 1000)} / {p.complexityHours}h</span>
                    </div>
                    {trackingSinceFirstStart && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "3px", fontSize: "0.68rem", fontWeight: 700, color: C.outline }}>
                            <Timer size={11} /> Llevas {formatElapsed(sinceFirstStartMs)} metido en esto sin entregarlo
                        </div>
                    )}
                </div>
                <button
                    onClick={() => updateSporadicProject(p.id, { pinned: !p.pinned })}
                    title={p.pinned ? "Desfijar" : "Fijar arriba"}
                    style={{ background: "none", border: "none", cursor: "pointer", color: p.pinned ? C.ambar : C.outlineVariant, padding: "3px", display: "flex", transform: p.pinned ? "rotate(0deg)" : "rotate(35deg)" }}
                >
                    <Pin size={15} fill={p.pinned ? C.ambar : "none"} />
                </button>
                <div style={{ position: "relative" }}>
                    <button onClick={() => setMenuOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "3px", display: "flex" }}><MoreVertical size={16} /></button>
                    {menuOpen && (
                        <div style={{ position: "absolute", top: "100%", right: 0, zIndex: 5, background: "white", border: `1px solid ${C.outlineVariant}`, borderRadius: "9px", boxShadow: "0 4px 14px rgba(0,0,0,0.1)", overflow: "hidden", minWidth: "160px" }}>
                            {p.status !== 'completado' ? (
                                <button onClick={() => { updateSporadicProject(p.id, { status: 'completado' }); setNotionEstado('Entregado'); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", background: "none", border: "none", padding: "9px 12px", cursor: "pointer", color: C.onSurface, fontSize: "0.78rem", fontWeight: 600, textAlign: "left" }}><CheckCircle2 size={13} /> Marcar completado</button>
                            ) : (
                                <button onClick={() => { updateSporadicProject(p.id, { status: 'en-progreso' }); setNotionEstado('En Edición'); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", background: "none", border: "none", padding: "9px 12px", cursor: "pointer", color: C.onSurface, fontSize: "0.78rem", fontWeight: 600, textAlign: "left" }}><RotateCcw size={13} /> Reabrir</button>
                            )}
                            <button onClick={() => { setConfirmReset(true); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", background: "none", border: "none", padding: "9px 12px", cursor: "pointer", color: C.ambar, fontSize: "0.78rem", fontWeight: 600, textAlign: "left", borderTop: `1px solid ${C.surfaceContainerLow}` }}><TimerReset size={13} /> Reiniciar horas</button>
                            <button onClick={() => { setConfirmDelete(true); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", background: "none", border: "none", padding: "9px 12px", cursor: "pointer", color: C.rojo, fontSize: "0.78rem", fontWeight: 600, textAlign: "left", borderTop: `1px solid ${C.surfaceContainerLow}` }}><Trash2 size={13} /> Eliminar</button>
                        </div>
                    )}
                </div>
            </div>

            {p.notionId && (
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                    {NOTION_ESTADOS.map(estado => {
                        const active = linkedEvent?.notionEstado === estado;
                        return (
                            <button
                                key={estado}
                                onClick={() => setNotionEstado(estado)}
                                style={{
                                    background: active ? ESTADO_COLOR[estado] : C.surfaceContainerLow,
                                    color: active ? "white" : C.onSurfaceVariant,
                                    border: "none", borderRadius: "999px", padding: "4px 10px",
                                    fontSize: "0.64rem", fontWeight: 700, cursor: "pointer",
                                }}
                            >
                                {estado}
                            </button>
                        );
                    })}
                </div>
            )}

            {inSession && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", fontWeight: 800, color: running ? C.rojo : C.ambar }}>
                        <Timer size={13} />
                        {formatElapsed(sessionHours * 60 * 60 * 1000)} trabajado
                        {p.activeStage && <span style={{ fontWeight: 600, color: C.onSurfaceVariant }}>· en {p.activeStage}</span>}
                        {paused && <span style={{ fontWeight: 600, color: C.onSurfaceVariant }}>· en pausa</span>}
                    </div>
                    {p.sessionStartedAt && (
                        <div style={{ fontSize: "0.68rem", fontWeight: 600, color: C.outline, paddingLeft: "19px" }}>
                            Le diste Iniciar hace {formatElapsed(sinceStartMs)}
                        </div>
                    )}
                </div>
            )}

            {p.status !== 'completado' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "8px 10px", background: C.surfaceContainerLow, borderRadius: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "4px" }}>
                        <span style={{ fontSize: "0.66rem", fontWeight: 800, color: C.onSurfaceVariant, display: "flex", alignItems: "center", gap: "4px", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                            <ImageIcon size={12} /> Tiempo por foto
                        </span>
                        {photoCount > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: C.onSurfaceVariant }}>
                                    {photoCount} foto{photoCount === 1 ? '' : 's'} · prom. {formatElapsed(avgPhotoMs)} · total {formatElapsed(totalPhotoMs)}
                                </span>
                                <button
                                    onClick={() => setConfirmResetPhotos(true)}
                                    title="Reiniciar contador de fotos"
                                    style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "2px", display: "flex" }}
                                >
                                    <TimerReset size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {!photoInSession ? (
                            <button
                                onClick={() => startPhotoTimer(p.id)}
                                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "white", color: C.onSurfaceVariant, border: `1px solid ${C.outlineVariant}`, borderRadius: "8px", padding: "6px", cursor: "pointer", fontSize: "0.74rem", fontWeight: 700 }}
                            >
                                <Play size={12} /> Iniciar foto
                            </button>
                        ) : (
                            <>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.76rem", fontWeight: 800, color: photoRunning ? C.rojo : C.ambar, minWidth: "48px" }}>
                                        <Timer size={12} /> {formatElapsed(livePhotoMs)}
                                    </span>
                                    {photoPaused && <span style={{ fontSize: "0.68rem", fontWeight: 600, color: C.onSurfaceVariant }}>en pausa</span>}
                                    <button
                                        onClick={() => cancelPhotoTimer(p.id)}
                                        title="Cancelar (no la cuenta)"
                                        style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "4px", display: "flex" }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    {photoRunning && (
                                        <button
                                            onClick={() => pausePhotoTimer(p.id)}
                                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: C.ambar, color: "white", border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer", fontSize: "0.74rem", fontWeight: 700 }}
                                        >
                                            <Pause size={12} /> Pausar
                                        </button>
                                    )}
                                    {photoPaused && (
                                        <button
                                            onClick={() => startPhotoTimer(p.id)}
                                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "white", color: C.onSurfaceVariant, border: `1px solid ${C.outlineVariant}`, borderRadius: "8px", padding: "6px", cursor: "pointer", fontSize: "0.74rem", fontWeight: 700 }}
                                        >
                                            <Play size={12} /> Reanudar
                                        </button>
                                    )}
                                    <button
                                        onClick={() => finishPhotoTimer(p.id)}
                                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: C.verde, color: "white", border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer", fontSize: "0.74rem", fontWeight: 700 }}
                                    >
                                        <Check size={12} /> Foto lista
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div>
                <div style={{ fontSize: "0.6rem", fontWeight: 700, color: C.outline, marginBottom: "2px" }}>Días hasta la entrega</div>
                <div style={{ height: "8px", borderRadius: "999px", background: C.surfaceContainer, overflow: "hidden" }}>
                    <div style={{
                        height: "100%", borderRadius: "999px", width: `${pctElapsed}%`,
                        background: overdueUnfinished ? "#111" : color,
                        animation: overdueUnfinished ? "esporadico-blink 1.1s ease-in-out infinite" : undefined,
                        transition: "width 0.3s",
                    }} />
                </div>
            </div>

            {(p.complexityHours > 0 || effectiveWorkedHours > 0) && (
                <div>
                    <div style={{ fontSize: "0.6rem", fontWeight: 700, color: C.outline, marginBottom: "2px" }}>
                        {p.complexityHours > 0 ? "Horas trabajadas vs. estimado" : "Horas trabajadas (acumulado)"}
                    </div>
                    {p.complexityHours > 0 ? (
                        <div style={{ height: "8px", borderRadius: "999px", background: C.surfaceContainer, overflow: "hidden" }}>
                            <div style={{
                                height: "100%", borderRadius: "999px",
                                width: `${Math.min((effectiveWorkedHours / p.complexityHours) * 100, 100)}%`,
                                background: effectiveWorkedHours >= p.complexityHours ? C.verde : C.secondary,
                                transition: "width 0.3s",
                            }} />
                        </div>
                    ) : (
                        <div style={{ fontSize: "0.78rem", fontWeight: 800, color: C.onSurface }}>{formatElapsed(effectiveWorkedHours * 60 * 60 * 1000)}</div>
                    )}
                </div>
            )}

            {stageBreakdown.length > 0 && (
                <details style={{ fontSize: "0.72rem" }}>
                    <summary style={{ ...etiqueta, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
                        <PieChart size={12} /> Tiempo por etapa (este proyecto)
                    </summary>
                    <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {stageBreakdown.map(({ stage, hours }) => (
                            <div key={stage} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem" }}>
                                    <span style={{ fontWeight: 700, color: C.onSurface }}>{stage}</span>
                                    <span style={{ fontWeight: 800, color: C.onSurfaceVariant }}>{hours.toFixed(1)}h · {stageBreakdownTotal > 0 ? Math.round((hours / stageBreakdownTotal) * 100) : 0}%</span>
                                </div>
                                <div style={{ height: "5px", borderRadius: "999px", background: C.surfaceContainer, overflow: "hidden" }}>
                                    <div style={{ height: "100%", borderRadius: "999px", width: `${stageBreakdownTotal > 0 ? (hours / stageBreakdownTotal) * 100 : 0}%`, background: ESTADO_COLOR[stage as NotionEstado] || C.secondary }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </details>
            )}

            {p.complexityHours > 0 && p.status !== 'completado' && (
                <div style={{ fontSize: "0.7rem", color: C.onSurfaceVariant, lineHeight: 1.4 }}>
                    {remainingHours <= 0 ? (
                        <span style={{ color: C.verde, fontWeight: 700 }}>Ya llegaste a las horas estimadas.</span>
                    ) : (
                        <>
                            Faltan <b>{remainingHours.toFixed(1)}h</b>.
                            {running && eta && <> A este ritmo, terminas ~<b>{eta}</b>.</>}
                            {!running && daysUntilDue > 0 && <> Para llegar a tiempo: <b>{(remainingHours / daysUntilDue).toFixed(1)}h/día</b> por {daysUntilDue} día{daysUntilDue === 1 ? '' : 's'}.</>}
                            {!running && daysUntilDue <= 0 && <span style={{ color: C.rojo, fontWeight: 700 }}> Ya venció — dedícale tiempo hoy.</span>}
                        </>
                    )}
                </div>
            )}

            {p.status !== 'completado' && (
                <div style={{ display: "flex", gap: "6px" }}>
                    {!inSession && (
                        <button
                            onClick={() => { startSporadicTimer(p.id, linkedEvent?.notionEstado); setNotionEstado('En Edición'); }}
                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", background: C.surfaceContainerLow, color: C.onSurfaceVariant, border: "none", borderRadius: "8px", padding: "8px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}
                        >
                            <Play size={13} /> Empezar a trabajar
                        </button>
                    )}
                    {running && (
                        <button
                            onClick={() => pauseSporadicTimer(p.id)}
                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", background: C.ambar, color: "white", border: "none", borderRadius: "8px", padding: "8px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}
                        >
                            <Pause size={13} /> Pausar
                        </button>
                    )}
                    {paused && (
                        <button
                            onClick={() => startSporadicTimer(p.id, p.activeStage)}
                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", background: C.surfaceContainerLow, color: C.onSurfaceVariant, border: "none", borderRadius: "8px", padding: "8px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}
                        >
                            <Play size={13} /> Reanudar
                        </button>
                    )}
                    {inSession && (
                        <button
                            onClick={() => stopSporadicTimer(p.id)}
                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", background: C.rojo, color: "white", border: "none", borderRadius: "8px", padding: "8px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}
                        >
                            <Square size={13} /> Terminar sesión
                        </button>
                    )}
                </div>
            )}

            <ConfirmDialog
                open={confirmDelete}
                title="Eliminar proyecto"
                message={`¿Eliminar "${p.title}"? Se pierde el registro de horas trabajadas.`}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => { removeSporadicProject(p.id); setConfirmDelete(false); }}
                onCancel={() => setConfirmDelete(false)}
            />

            <ConfirmDialog
                open={confirmReset}
                title="Reiniciar horas trabajadas"
                message={`¿Poner en 0h "${p.title}"? Se borran las sesiones y fotos registradas de este proyecto (solo este, no afecta a los demás). El proyecto en sí no se borra.`}
                confirmLabel="Reiniciar"
                cancelLabel="Cancelar"
                onConfirm={() => { resetSporadicWorkedTime(p.id); setConfirmReset(false); }}
                onCancel={() => setConfirmReset(false)}
            />

            <ConfirmDialog
                open={confirmResetPhotos}
                title="Reiniciar contador de fotos"
                message={`¿Borrar el registro de fotos de "${p.title}"? Se pierden el conteo, promedio y total de fotos editadas. No afecta las horas de sesión.`}
                confirmLabel="Reiniciar"
                cancelLabel="Cancelar"
                onConfirm={() => { resetSporadicPhotoLog(p.id); setConfirmResetPhotos(false); }}
                onCancel={() => setConfirmResetPhotos(false)}
            />
        </div>
    );
};

// Envuelve ProjectCard con la lógica de arrastre de @dnd-kit (mismo patrón que
// ChecklistDiario): un handle chico y separado, no toda la tarjeta, para no pelear
// con los clicks de los botones de Estado/menú/cronómetro que ya tiene la tarjeta.
const SortableProjectCard = (props: React.ComponentProps<typeof ProjectCard>) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.p.id });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        touchAction: "none",
    };
    const dragHandle = (
        <button
            {...attributes}
            {...listeners}
            title="Arrastrar para reordenar"
            style={{ background: "none", border: "none", cursor: "grab", padding: "2px", color: C.outlineVariant, display: "flex", flexShrink: 0, marginTop: "2px" }}
        >
            <GripVertical size={15} />
        </button>
    );
    return (
        <div ref={setNodeRef} style={style}>
            <ProjectCard {...props} dragHandle={dragHandle} />
        </div>
    );
};

const SpecItem = ({ n, title, body, done }: { n: number; title: string; body: string; done: boolean }) => (
    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
        {done ? <CheckCircle size={15} color={C.verde} style={{ flexShrink: 0, marginTop: "1px" }} /> : <Circle size={15} color={C.outlineVariant} style={{ flexShrink: 0, marginTop: "1px" }} />}
        <div>
            <span style={{ fontWeight: 800, color: C.onSurface }}>{n}. {title}</span>
            {" — "}{body}
        </div>
    </div>
);
