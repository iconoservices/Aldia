import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, X, Trash2, MoreVertical, Play, Pause, Square, CheckCircle2, Flame, RotateCcw, Circle, CheckCircle, Sparkles, GripVertical, ArrowUpDown, Timer, PieChart, Pin, Image as ImageIcon, Check, TimerReset, Settings, Coffee, Bell, BellOff, ListChecks, AlertTriangle, Pencil, Send, Usb, Target, StickyNote, Search, Loader2, Camera } from "lucide-react";
import {
    DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CalendarEvent, NotionEstado, SporadicProject, FaseTemplate, ProjectFase } from "../../hooks/useAlDiaState";
import { NOTION_ESTADOS } from "../../hooks/useAlDiaState";
import { C, RADIO, bento, campo, botonPrimario, etiqueta, useIsMobile, paddingPagina } from "../../theme";
import { ConfirmDialog } from "../ui/ConfirmDialog";

const ORDER_STORAGE_KEY = "aldia_esporadicos_custom_order";

const ESTADO_COLOR: Record<NotionEstado, string> = {
    'Agendado': '#6366F1',
    'Realizado': '#8B5CF6',
    'En Edición': '#E6A817',
    // Azul, no verde: "Terminado" es solo "ya no le falta edición", NO que ya se
    // entregó -- si usa el mismo verde que "Entregado" (o que el resto de la app
    // usa para "listo/hecho"), la pastilla da la falsa sensación de que ya está
    // todo resuelto y el USB físico se queda sin salir porque parece innecesario.
    'Terminado': '#2563EB',
    'Entregado': '#059669',
};

// Escribe el Estado de vuelta en Notion; el llamador ya actualiza el estado local
// de forma optimista, esto solo intenta reflejarlo también allá (best-effort).
// Devuelve si de verdad se guardó -- si no, el cambio local queda "colgado" y el
// próximo sync (que lee el Notion real, sin tocar) lo va a pisar de vuelta, así
// que el llamador necesita saberlo para avisar en vez de dejarlo como misterio.
const pushNotionEstado = async (notionId: string, estado: NotionEstado): Promise<boolean> => {
    try {
        const res = await fetch('/api/update-notion-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notionId, estado })
        });
        if (!res.ok) throw new Error(`respuesta no ok: ${res.status}`);
        return true;
    } catch (err) {
        console.error('No se pudo actualizar Estado en Notion:', err);
        return false;
    }
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
    rescheduleSporadicProject: (id: number, newDueDate: string) => void;
    startSporadicTimer: (id: number, stage?: string) => void;
    pauseSporadicTimer: (id: number) => void;
    stopSporadicTimer: (id: number) => void;
    startPhotoTimer: (id: number) => void;
    pausePhotoTimer: (id: number) => void;
    finishPhotoTimer: (id: number) => void;
    cancelPhotoTimer: (id: number) => void;
    adjustPhotoManualExtra: (id: number, delta: number) => void;
    resetSporadicWorkedTime: (id: number) => void;
    resetSporadicPhotoLog: (id: number) => void;
    removeLastPhotoLog: (id: number) => void;
    calendarEvents: CalendarEvent[];
    updateCalendarEvent: (id: number, updates: Partial<CalendarEvent>) => void;
    phaseTemplates: FaseTemplate[];
    addFaseTemplate: (name: string) => number;
    removeFaseTemplate: (id: number) => void;
    addFaseTemplateStep: (templateId: number, label: string, stage?: NotionEstado) => void;
    removeFaseTemplateStep: (templateId: number, stepId: number) => void;
    setFaseTemplateStepStage: (templateId: number, stepId: number, stage: NotionEstado | undefined) => void;
    applyFaseTemplate: (projectId: number, templateId: number) => void;
    addProjectFase: (projectId: number, label: string, stage?: NotionEstado) => void;
    removeProjectFase: (projectId: number, faseId: number) => void;
    toggleProjectFase: (projectId: number, faseId: number) => void;
    setProjectFaseStage: (projectId: number, faseId: number, stage: NotionEstado | undefined) => void;
    startFaseTimer: (projectId: number, faseId: number) => void;
    pauseFaseTimer: (projectId: number, faseId: number) => void;
    finishFaseTimer: (projectId: number, faseId: number) => void;
}

const todayStr = () => new Date().toLocaleDateString('en-CA');
const daysBetween = (a: string, b: string) => Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
const dateMinusDays = (dateStr: string, days: number) => {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() - days);
    return d.toLocaleDateString('en-CA');
};
const DIAS_ADELANTO_SUGERIDO = 5;
const DIAS_SESION_SUGERIDO = 5;

const formatElapsed = (ms: number) => {
    const totalSec = Math.max(Math.floor(ms / 1000), 0);
    const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

/** Como formatElapsed, pero para duraciones de calendario (p.ej. "sin entregarlo" desde el primer Play):
 *  a partir de 24h antepone "Xd" en vez de dejar que las horas sigan subiendo sin límite. */
const formatElapsedWithDays = (ms: number) => {
    const totalSec = Math.max(Math.floor(ms / 1000), 0);
    const days = Math.floor(totalSec / 86400);
    if (days === 0) return formatElapsed(ms);
    const remSec = totalSec % 86400;
    const h = Math.floor(remSec / 3600), m = Math.floor((remSec % 3600) / 60), s = remSec % 60;
    return `${days}d ${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

/** Input + botón "+" chiquito, reusado para agregar pasos a una plantilla, una plantilla nueva, o un paso suelto a un proyecto. */
const AddInline = ({ placeholder, onAdd }: { placeholder: string; onAdd: (value: string) => void }) => {
    const [value, setValue] = useState("");
    const submit = () => {
        if (!value.trim()) return;
        onAdd(value.trim());
        setValue("");
    };
    return (
        <div style={{ display: "flex", gap: "4px" }}>
            <input
                placeholder={placeholder}
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                style={{ flex: 1, minWidth: 0, border: `1px solid ${C.outlineVariant}`, borderRadius: "8px", padding: "5px 8px", fontSize: "0.74rem", outline: "none", fontFamily: "inherit", background: "white" }}
            />
            <button onClick={submit} title="Agregar" style={{ background: C.surfaceContainer, border: "none", borderRadius: "8px", padding: "0 9px", cursor: "pointer", color: C.onSurfaceVariant, display: "flex", alignItems: "center" }}>
                <Plus size={13} />
            </button>
        </div>
    );
};

/** Menú chico para mover un paso (de plantilla o de proyecto) a otra etapa del
 *  flujo, o dejarlo "sin etapa". Reusado en el editor de plantillas y en la
 *  tarjeta del proyecto. */
const StageSelect = ({ value, onChange }: { value: NotionEstado | undefined; onChange: (stage: NotionEstado | undefined) => void }) => (
    <select
        value={value ?? ''}
        onChange={e => onChange((e.target.value || undefined) as NotionEstado | undefined)}
        title="Mover a otra etapa del flujo"
        onClick={e => e.stopPropagation()}
        style={{ flexShrink: 0, border: `1px solid ${C.outlineVariant}`, borderRadius: "6px", padding: "2px 4px", fontSize: "0.62rem", fontFamily: "inherit", background: "white", color: C.onSurfaceVariant, maxWidth: "94px" }}
    >
        <option value="">Sin etapa</option>
        {NOTION_ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
);

/** Agrupa pasos por etapa del flujo (Agendado…Entregado). Muestra SIEMPRE las 5
 *  etapas, aunque estén vacías, y suma un grupo "Sin etapa" al final solo si hay
 *  pasos sueltos. Cada grupo trae encabezado con color + conteo y su propio input
 *  para agregar un paso directo a esa etapa. `renderRow` debe devolver un
 *  elemento con `key`. */
function StageGroups<T extends { id: number; stage?: NotionEstado; done?: boolean }>({ items, currentStage, renderRow, onAdd, addPlaceholder }: {
    items: T[];
    currentStage?: NotionEstado;
    renderRow: (item: T) => React.ReactNode;
    onAdd: (label: string, stage: NotionEstado | undefined) => void;
    addPlaceholder: string;
}) {
    const groups: (NotionEstado | undefined)[] = [...NOTION_ESTADOS];
    if (items.some(i => !i.stage)) groups.push(undefined);
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {groups.map(stage => {
                const rows = items.filter(i => i.stage === stage);
                const done = rows.filter(r => r.done).length;
                const color = stage ? ESTADO_COLOR[stage] : C.outlineVariant;
                const isCurrent = !!stage && stage === currentStage;
                return (
                    <div key={stage ?? '—'} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "1px 0" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0, boxShadow: isCurrent ? `0 0 0 3px ${color}33` : "none" }} />
                            <span style={{ fontSize: "0.66rem", fontWeight: 800, color: isCurrent ? color : C.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                                {stage ?? 'Sin etapa'}
                            </span>
                            {rows.length > 0 && <span style={{ fontSize: "0.62rem", fontWeight: 700, color: C.outline }}>{done}/{rows.length}</span>}
                            {isCurrent && <span style={{ fontSize: "0.58rem", fontWeight: 800, color }}>· ahora</span>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1px", paddingLeft: "14px" }}>
                            {rows.map(renderRow)}
                            <AddInline placeholder={addPlaceholder} onAdd={label => onAdd(label, stage)} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Una fila de fase dentro de un proyecto: checkbox de hecho/pendiente + su propio
// cronómetro (mismo patrón pausa/resume que el de "Tiempo por foto", pero por
// fase). Componente aparte porque cada fila necesita su propio useNowTicking.
const FaseRow = ({ projectId, fase, toggleProjectFase, removeProjectFase, setProjectFaseStage, startFaseTimer, pauseFaseTimer, finishFaseTimer }: {
    projectId: number;
    fase: ProjectFase;
    toggleProjectFase: (projectId: number, faseId: number) => void;
    removeProjectFase: (projectId: number, faseId: number) => void;
    setProjectFaseStage: (projectId: number, faseId: number, stage: NotionEstado | undefined) => void;
    startFaseTimer: (projectId: number, faseId: number) => void;
    pauseFaseTimer: (projectId: number, faseId: number) => void;
    finishFaseTimer: (projectId: number, faseId: number) => void;
}) => {
    const running = !!fase.activeSince;
    const paused = !running && !!fase.pausedAccumSeconds;
    const now = useNowTicking(running);
    const liveMs = running && fase.activeSince ? Math.max(now - fase.activeSince, 0) : 0;
    const totalMs = liveMs + (fase.pausedAccumSeconds || 0) * 1000;

    return (
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", padding: "3px 0" }}>
            <button onClick={() => toggleProjectFase(projectId, fase.id)} title={fase.done ? "Marcar pendiente" : "Marcar hecho"} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", flexShrink: 0 }}>
                {fase.done ? <CheckCircle size={16} color={C.verde} /> : <Circle size={16} color={C.outlineVariant} />}
            </button>
            <span style={{ flex: 1, minWidth: 0, fontSize: "0.78rem", fontWeight: 600, color: fase.done ? C.outline : C.onSurface, textDecoration: fase.done ? "line-through" : "none" }}>
                {fase.label}
            </span>
            {!fase.done && (running || paused) && (
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: running ? C.rojo : C.ambar, flexShrink: 0 }}>{formatElapsed(totalMs)}</span>
            )}
            {!fase.done && !running && !paused && (
                <button onClick={() => startFaseTimer(projectId, fase.id)} title="Iniciar cronómetro" style={{ background: "none", border: "none", cursor: "pointer", color: C.outline, padding: "2px", display: "flex", flexShrink: 0 }}>
                    <Play size={13} />
                </button>
            )}
            {!fase.done && running && (
                <button onClick={() => pauseFaseTimer(projectId, fase.id)} title="Pausar" style={{ background: "none", border: "none", cursor: "pointer", color: C.ambar, padding: "2px", display: "flex", flexShrink: 0 }}>
                    <Pause size={13} />
                </button>
            )}
            {!fase.done && paused && (
                <button onClick={() => startFaseTimer(projectId, fase.id)} title="Reanudar" style={{ background: "none", border: "none", cursor: "pointer", color: C.outline, padding: "2px", display: "flex", flexShrink: 0 }}>
                    <Play size={13} />
                </button>
            )}
            {!fase.done && (running || paused) && (
                <button onClick={() => finishFaseTimer(projectId, fase.id)} title="Marcar hecho y cerrar el tiempo" style={{ background: "none", border: "none", cursor: "pointer", color: C.verde, padding: "2px", display: "flex", flexShrink: 0 }}>
                    <Check size={13} />
                </button>
            )}
            {fase.done && fase.seconds !== undefined && (
                <span style={{ fontSize: "0.64rem", color: C.outline, fontWeight: 600, flexShrink: 0 }}>{formatElapsed(fase.seconds * 1000)}</span>
            )}
            {!running && !paused && (
                <StageSelect value={fase.stage} onChange={stage => setProjectFaseStage(projectId, fase.id, stage)} />
            )}
            <button onClick={() => removeProjectFase(projectId, fase.id)} title="Quitar de este proyecto" style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "2px", display: "flex", flexShrink: 0 }}>
                <X size={12} />
            </button>
        </div>
    );
};

type PomodoroSound = 'clasico' | 'suave' | 'campana';
type TickSound = 'reloj' | 'suave' | 'digital' | 'analogico';
interface PomodoroPrefs { tickEnabled: boolean; sound: PomodoroSound; tickSound: TickSound; }
const POMODORO_PREFS_KEY = "aldia_pomodoro_prefs";
const DEFAULT_POMODORO_PREFS: PomodoroPrefs = { tickEnabled: false, sound: 'clasico', tickSound: 'reloj' };
const SOUND_LABELS: Record<PomodoroSound, string> = { clasico: 'Clásico (beep doble)', suave: 'Suave', campana: 'Campana' };
const TICK_LABELS: Record<TickSound, string> = { reloj: 'Reloj clásico (tick-tock)', suave: 'Suave', digital: 'Digital', analogico: 'Analógico (reloj de pared, seco)' };

const getAudioCtx = () => {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    return new AC();
};

// Sonido de aviso (fin de bloque de trabajo o de descanso) sin depender de un
// archivo de audio -- varía según la preferencia elegida en Ajustes.
const playAlertSound = (sound: PomodoroSound) => {
    try {
        const ctx = getAudioCtx();
        const patterns: Record<PomodoroSound, { freq: number; delays: number[]; dur: number; gain: number }> = {
            clasico: { freq: 880, delays: [0, 0.35], dur: 0.25, gain: 0.18 },
            suave: { freq: 523, delays: [0], dur: 0.6, gain: 0.12 },
            campana: { freq: 660, delays: [0, 0.5], dur: 0.7, gain: 0.14 },
        };
        const { freq, delays, dur, gain } = patterns[sound];
        delays.forEach(delay => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.connect(g); g.connect(ctx.destination);
            osc.frequency.value = freq;
            g.gain.setValueAtTime(gain, ctx.currentTime + delay);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + dur);
        });
    } catch { /* el navegador puede bloquear audio sin interacción previa; no es crítico */ }
};

// Tic opcional mientras corre un bloque de trabajo, con su propia preferencia
// de sonido (independiente del sonido de aviso). Alterna tick/tock (dos tonos
// distintos por variante) para que suene a reloj real, no a un pitido repetido.
const playTickSound = (tickSound: TickSound, tock: boolean) => {
    try {
        const ctx = getAudioCtx();
        const variants: Record<TickSound, { base: number; tockRatio: number; dur: number; gain: number; type: OscillatorType; dry?: boolean }> = {
            reloj: { base: 900, tockRatio: 0.8, dur: 0.03, gain: 0.05, type: 'sine' },
            suave: { base: 420, tockRatio: 0.85, dur: 0.05, gain: 0.045, type: 'sine' },
            digital: { base: 1400, tockRatio: 0.7, dur: 0.015, gain: 0.06, type: 'square' },
            // Más frío/seco: frecuencia más alta y metálica + decaimiento rápido
            // (en vez de un volumen fijo) para que suene a clic mecánico, no a nota musical.
            analogico: { base: 2600, tockRatio: 0.78, dur: 0.018, gain: 0.09, type: 'triangle', dry: true },
        };
        const { base, tockRatio, dur, gain, type, dry } = variants[tickSound];
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = type;
        osc.frequency.value = tock ? base * tockRatio : base;
        if (dry) {
            g.gain.setValueAtTime(gain, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
        } else {
            g.gain.setValueAtTime(gain, ctx.currentTime);
        }
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + dur);
    } catch { /* el navegador puede bloquear audio sin interacción previa; no es crítico */ }
};

const POMODORO_MINUTES = 25;
const BREAK_MINUTES = 5;

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

export const EsporadicosDashboard = ({ sporadicProjects, addSporadicProject, updateSporadicProject, removeSporadicProject, rescheduleSporadicProject, startSporadicTimer, pauseSporadicTimer, stopSporadicTimer, startPhotoTimer, pausePhotoTimer, finishPhotoTimer, cancelPhotoTimer, adjustPhotoManualExtra, resetSporadicWorkedTime, resetSporadicPhotoLog, removeLastPhotoLog, calendarEvents, updateCalendarEvent, phaseTemplates, addFaseTemplate, removeFaseTemplate, addFaseTemplateStep, removeFaseTemplateStep, setFaseTemplateStepStage, applyFaseTemplate, addProjectFase, removeProjectFase, toggleProjectFase, setProjectFaseStage, startFaseTimer, pauseFaseTimer, finishFaseTimer }: EsporadicosProps) => {
    const movil = useIsMobile();
    // Filtro rápido activado desde las pastillas de arriba: "atrasados" y "en edición"
    // cruzan las dos columnas (en curso / listos para entregar), así que se filtra
    // el render de ambas en vez de duplicar la lista en otro lado.
    const [statFilter, setStatFilter] = useState<'atrasados' | 'enEdicion' | 'prioridad' | 'usbGeneral' | 'usbUrgente' | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
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
            if (isEntregado && linked.status !== 'completado') updates.status = 'completado';
            // Simple asignación, sin pasar por rescheduleSporadicProject: dueDate
            // siempre sigue lo que diga Notion tal cual (acá nunca es un reagendo
            // del usuario). myDueDateOverride/rescheduleCount son de otro campo
            // completamente aparte y esta sincronización nunca los toca.
            if (linked.dueDate !== dueDate) updates.dueDate = dueDate;
            if (Object.keys(updates).length > 0) updateSporadicProject(linked.id, updates);
        });
    }, [calendarEvents, sporadicProjects, addSporadicProject, updateSporadicProject]);

    const streak = useMemo(() => computeStreak(sporadicProjects), [sporadicProjects]);

    // Preferencias del Pomodoro (tic-tac + sonido): una sola vez para toda la app,
    // no por proyecto. Vive solo en este dispositivo (localStorage), igual que el
    // orden manual -- es una preferencia de UI, no datos que haya que sincronizar.
    const [pomodoroPrefs, setPomodoroPrefsState] = useState<PomodoroPrefs>(() => {
        try {
            const saved = localStorage.getItem(POMODORO_PREFS_KEY);
            return saved ? { ...DEFAULT_POMODORO_PREFS, ...JSON.parse(saved) } : DEFAULT_POMODORO_PREFS;
        } catch { return DEFAULT_POMODORO_PREFS; }
    });
    const setPomodoroPrefs = (updates: Partial<PomodoroPrefs>) => {
        setPomodoroPrefsState(prev => {
            const next = { ...prev, ...updates };
            try { localStorage.setItem(POMODORO_PREFS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    };
    const [pomodoroSettingsOpen, setPomodoroSettingsOpen] = useState(false);

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
    const enProgresoAtrasados = useMemo(() => enProgreso.filter(p => daysBetween(todayStr(), p.dueDate) < 0).length, [enProgreso]);
    const listosAtrasados = useMemo(() => listosParaEntregar.filter(p => daysBetween(todayStr(), p.dueDate) < 0).length, [listosParaEntregar]);
    const atrasados = useMemo(
        () => sporadicProjects.filter(p => p.status !== 'completado' && daysBetween(todayStr(), p.dueDate) < 0).length,
        [sporadicProjects]
    );
    const enEdicion = useMemo(
        () => sporadicProjects.filter(p => {
            const ev = p.notionId ? calendarEvents.find(e => e.notionId === p.notionId) : undefined;
            return ev?.notionEstado === 'En Edición';
        }).length,
        [sporadicProjects, calendarEvents]
    );
    // Dos números distintos, no uno: "por entregar" es el total general de lo
    // que sigue ACTIVO (en curso + listos para entregar) y todavía debe un USB
    // -- excluye los ya completados porque esos son entregas viejas y cerradas,
    // no algo que siga pendiente de resolver. "Urgente" es solo lo que ya está
    // en Terminado (columna "Listos para entregar"): ahí sí es una acción
    // suelta que se puede olvidar porque el proyecto ya se siente "hecho"
    // aunque el USB físico siga sin salir.
    const usbPendientes = useMemo(
        () => sporadicProjects.filter(p => p.status !== 'completado' && p.requiresUsb && !p.usbDelivered).length,
        [sporadicProjects]
    );
    const usbUrgente = useMemo(
        () => listosParaEntregar.filter(p => p.requiresUsb && !p.usbDelivered).length,
        [listosParaEntregar]
    );
    // Prioritarios pendientes: no cuenta los ya completados, porque marcar
    // prioritario un proyecto ya entregado no significa nada -- es "cuántos me
    // faltan entregar YA", no un historial de qué se marcó alguna vez.
    const prioritarios = useMemo(
        () => sporadicProjects.filter(p => p.status !== 'completado' && p.pinned).length,
        [sporadicProjects]
    );

    const matchesStatFilter = useCallback((p: SporadicProject) => {
        if (statFilter === 'atrasados') return daysBetween(todayStr(), p.dueDate) < 0;
        if (statFilter === 'enEdicion') {
            const ev = p.notionId ? calendarEvents.find(e => e.notionId === p.notionId) : undefined;
            return ev?.notionEstado === 'En Edición';
        }
        if (statFilter === 'prioridad') return !!p.pinned;
        if (statFilter === 'usbGeneral') return !!p.requiresUsb && !p.usbDelivered;
        if (statFilter === 'usbUrgente') {
            const ev = p.notionId ? calendarEvents.find(e => e.notionId === p.notionId) : undefined;
            return !!p.requiresUsb && !p.usbDelivered && ev?.notionEstado === 'Terminado';
        }
        return true;
    }, [statFilter, calendarEvents]);
    // Buscador por título -- se combina con el filtro de pastillas (AND), no lo reemplaza.
    const matchesSearch = useCallback((p: SporadicProject) => {
        const q = searchQuery.trim().toLowerCase();
        return !q || p.title.toLowerCase().includes(q);
    }, [searchQuery]);
    const visibleEnProgreso = useMemo(() => enProgreso.filter(p => matchesStatFilter(p) && matchesSearch(p)), [enProgreso, matchesStatFilter, matchesSearch]);
    const visibleListosParaEntregar = useMemo(() => listosParaEntregar.filter(p => matchesStatFilter(p) && matchesSearch(p)), [listosParaEntregar, matchesStatFilter, matchesSearch]);
    const visibleCompletados = useMemo(() => completados.filter(matchesSearch), [completados, matchesSearch]);

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

    // Pastillas de estado de la cabecera. En desktop van en una grilla pareja
    // debajo del título; en móvil se meten dentro de un desplegable "Resumen"
    // (más chicas) para no comerse media pantalla.
    const statPills = [
        { label: "por entregar", value: pendientes.length, icon: Timer, color: C.secondary, bg: "rgba(99,102,241,0.12)", filterKey: undefined as undefined | 'atrasados' | 'enEdicion' | 'prioridad' | 'usbGeneral' | 'usbUrgente' },
        { label: "atrasados", value: atrasados, icon: AlertTriangle, color: C.rojo, bg: "rgba(239,68,68,0.12)", filterKey: 'atrasados' as const },
        { label: "en edición", value: enEdicion, icon: Pencil, color: ESTADO_COLOR['En Edición'], bg: "rgba(230,168,23,0.12)", filterKey: 'enEdicion' as const },
        { label: "prioritarios", value: prioritarios, icon: Pin, color: C.ambar, bg: "rgba(230,168,23,0.12)", filterKey: 'prioridad' as const },
        { label: "listos para entregar", value: listosParaEntregar.length, icon: CheckCircle, color: C.ambar, bg: "rgba(230,168,23,0.12)", filterKey: undefined },
        { label: "entregados", value: completados.length, icon: CheckCircle2, color: C.verde, bg: "rgba(16,185,129,0.12)", filterKey: undefined },
        { label: "USB por entregar", value: usbPendientes, icon: Usb, color: C.ambar, bg: "rgba(230,168,23,0.12)", filterKey: 'usbGeneral' as const },
        { label: "USB urgente", value: usbUrgente, icon: Usb, color: C.rojo, bg: "rgba(239,68,68,0.12)", filterKey: 'usbUrgente' as const },
    ];
    const renderStatPill = (stat: typeof statPills[number], compact: boolean) => {
        const clickable = !!stat.filterKey;
        const active = clickable && statFilter === stat.filterKey;
        return (
            <button
                key={stat.label}
                onClick={clickable ? () => setStatFilter(f => f === stat.filterKey ? null : stat.filterKey!) : undefined}
                title={clickable ? (active ? "Quitar filtro" : `Mostrar solo ${stat.label}`) : undefined}
                style={{
                    display: "flex", alignItems: "center", gap: compact ? "4px" : "5px", background: stat.bg, borderRadius: "999px",
                    padding: compact ? "3px 8px" : "5px 10px",
                    border: active ? `2px solid ${stat.color}` : "2px solid transparent",
                    cursor: clickable ? "pointer" : "default", font: "inherit", width: "100%", minWidth: 0,
                }}
            >
                <stat.icon size={compact ? 11 : 12} color={stat.color} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 800, fontSize: compact ? "0.68rem" : "0.76rem", color: C.onSurface }}>{stat.value}</span>
                <span style={{ fontSize: compact ? "0.58rem" : "0.64rem", color: C.onSurfaceVariant, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stat.label}</span>
            </button>
        );
    };
    const totalPill = (compact: boolean) => (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(99,102,241,0.12)", borderRadius: "999px", padding: compact ? "4px 10px" : "6px 12px", flexShrink: 0 }}>
            <Timer size={compact ? 13 : 15} color={C.secondary} />
            <span style={{ fontWeight: 800, fontSize: compact ? "0.72rem" : "0.8rem", color: C.onSurface }}>{formatElapsed(totalWorkedAllProjects * 60 * 60 * 1000)}</span>
            <span style={{ fontSize: compact ? "0.62rem" : "0.68rem", color: C.onSurfaceVariant }}>en total</span>
        </div>
    );
    const streakPill = (compact: boolean) => (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(230,168,23,0.12)", borderRadius: "999px", padding: compact ? "4px 10px" : "6px 12px", flexShrink: 0 }}>
            <Flame size={compact ? 13 : 15} color={C.ambar} fill={streak > 0 ? C.ambar : "none"} />
            <span style={{ fontWeight: 800, fontSize: compact ? "0.72rem" : "0.8rem", color: C.onSurface }}>{streak}</span>
            <span style={{ fontSize: compact ? "0.62rem" : "0.68rem", color: C.onSurfaceVariant }}>{streak === 1 ? "día seguido" : "días seguidos"}</span>
        </div>
    );
    const ordenManualBtn = customOrder.length > 0 ? (
        <button onClick={() => saveOrder([])} title="Volver al orden automático por prioridad" style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: `1px solid ${C.outlineVariant}`, borderRadius: "999px", padding: "6px 10px", cursor: "pointer", color: C.onSurfaceVariant, fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>
            <ArrowUpDown size={12} /> Orden manual
        </button>
    ) : null;
    const quitarFiltroBtn = statFilter ? (
        <button onClick={() => setStatFilter(null)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", color: C.outline, fontSize: "0.68rem", fontWeight: 700, padding: "5px 6px" }}>
            <X size={12} /> Quitar filtro
        </button>
    ) : null;
    const gearMenu = (
        <div style={{ position: "relative", flexShrink: 0 }}>
            <button
                onClick={() => setPomodoroSettingsOpen(v => !v)}
                title="Preferencias del Pomodoro"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", background: C.surfaceContainerLow, border: `1px solid ${C.outlineVariant}`, borderRadius: "999px", width: "32px", height: "32px", cursor: "pointer", color: C.onSurfaceVariant }}
            >
                <Settings size={15} />
            </button>
            {pomodoroSettingsOpen && (
                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "6px", zIndex: 10, background: "white", border: `1px solid ${C.outlineVariant}`, borderRadius: "12px", boxShadow: "0 8px 20px rgba(0,0,0,0.12)", padding: "12px", width: "230px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <span style={{ ...etiqueta }}>Pomodoro</span>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", fontWeight: 600, color: C.onSurface, cursor: "pointer" }}>
                        <input type="checkbox" checked={pomodoroPrefs.tickEnabled} onChange={e => setPomodoroPrefs({ tickEnabled: e.target.checked })} />
                        Tic-tac mientras trabajas
                    </label>
                    <div>
                        <div style={{ fontSize: "0.66rem", fontWeight: 700, color: C.outline, marginBottom: "4px" }}>Sonido de aviso</div>
                        <select value={pomodoroPrefs.sound} onChange={e => setPomodoroPrefs({ sound: e.target.value as PomodoroSound })} style={{ width: "100%", padding: "6px 8px", borderRadius: "8px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.78rem", color: C.onSurface, background: "white" }}>
                            {(Object.keys(SOUND_LABELS) as PomodoroSound[]).map(s => <option key={s} value={s}>{SOUND_LABELS[s]}</option>)}
                        </select>
                    </div>
                    <button onClick={() => playAlertSound(pomodoroPrefs.sound)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: C.surfaceContainerLow, border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer", fontSize: "0.74rem", fontWeight: 700, color: C.onSurfaceVariant }}>
                        Probar sonido
                    </button>
                    <div>
                        <div style={{ fontSize: "0.66rem", fontWeight: 700, color: C.outline, marginBottom: "4px" }}>Sonido del tic-tac</div>
                        <select value={pomodoroPrefs.tickSound} onChange={e => setPomodoroPrefs({ tickSound: e.target.value as TickSound })} style={{ width: "100%", padding: "6px 8px", borderRadius: "8px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.78rem", color: C.onSurface, background: "white" }}>
                            {(Object.keys(TICK_LABELS) as TickSound[]).map(s => <option key={s} value={s}>{TICK_LABELS[s]}</option>)}
                        </select>
                    </div>
                    <button onClick={() => { playTickSound(pomodoroPrefs.tickSound, false); setTimeout(() => playTickSound(pomodoroPrefs.tickSound, true), 500); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: C.surfaceContainerLow, border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer", fontSize: "0.74rem", fontWeight: 700, color: C.onSurfaceVariant }}>
                        Probar tic-tac
                    </button>
                </div>
            )}
        </div>
    );
    const searchBox = (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: C.surfaceContainerLow, borderRadius: "999px", padding: "5px 10px", flex: movil ? "1 1 auto" : "0 0 auto", minWidth: 0, width: movil ? undefined : "170px" }}>
            <Search size={13} color={C.outline} style={{ flexShrink: 0 }} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar por título..." style={{ flex: 1, minWidth: 0, border: "none", background: "none", outline: "none", fontSize: "0.78rem", fontFamily: "inherit", color: C.onSurface }} />
            {searchQuery && (
                <button onClick={() => setSearchQuery("")} title="Limpiar búsqueda" style={{ background: "none", border: "none", cursor: "pointer", color: C.outline, padding: 0, display: "flex", flexShrink: 0 }}>
                    <X size={13} />
                </button>
            )}
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: movil ? "1rem" : "1.5rem", ...paddingPagina(movil), color: "var(--text-carbon)" }}>
            {/* Cabecera. Desktop: fila 1 (título + búsqueda + reloj/racha/ajustes)
                y fila 2 (pastillas en grilla pareja). Móvil: fila 1 compacta + un
                desplegable "Resumen" con las pastillas más chicas, para que no se
                salga de la tarjeta ni ocupe media pantalla. */}
            {movil ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "white", padding: "10px 12px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 900, color: C.onSurface, whiteSpace: "nowrap", flexShrink: 0 }}>Entregas</h2>
                        {searchBox}
                        {gearMenu}
                    </div>
                    <details>
                        <summary style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", cursor: "pointer", listStyle: "none", fontSize: "0.7rem", fontWeight: 800, color: C.onSurfaceVariant }}>
                            <span style={{ textTransform: "uppercase", letterSpacing: "0.02em" }}>Resumen</span>
                            <span style={{ fontWeight: 700, color: atrasados > 0 ? C.rojo : C.onSurfaceVariant }}>
                                {atrasados > 0 ? `${atrasados} atrasados · ` : ""}{pendientes.length} por entregar
                            </span>
                        </summary>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "8px" }}>
                            {totalPill(true)}
                            {streakPill(true)}
                            {ordenManualBtn}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", marginTop: "6px" }}>
                            {statPills.map(s => renderStatPill(s, true))}
                        </div>
                        {quitarFiltroBtn && <div style={{ marginTop: "4px" }}>{quitarFiltroBtn}</div>}
                    </details>
                </div>
            ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "white", padding: "10px 14px", borderRadius: "18px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
              {/* Fila 1: título + búsqueda + reloj/racha/ajustes */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 900, color: C.onSurface, whiteSpace: "nowrap", flexShrink: 0 }}>Entregas</h2>
                {searchBox}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto", flexWrap: "wrap", flexShrink: 0 }}>
                    {ordenManualBtn}
                    {totalPill(false)}
                    {streakPill(false)}
                    {gearMenu}
                </div>
              </div>

              {/* Fila 2: pastillas de estado en grilla pareja. */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: "6px" }}>
                    {statPills.map(s => renderStatPill(s, false))}
                    {quitarFiltroBtn}
              </div>
            </div>
            )}

            <div style={{ display: "flex", flexDirection: movil ? "column" : "row", flexWrap: "wrap", gap: movil ? "0.8rem" : "0.75rem", alignItems: "flex-start" }}>
            <details style={{ ...bento, padding: "0.9rem 1rem", flex: movil ? undefined : "1 1 260px", minWidth: 0, width: movil ? "100%" : undefined }}>
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
                <details style={{ ...bento, padding: "0.9rem 1rem", flex: movil ? undefined : "1 1 260px", minWidth: 0, width: movil ? "100%" : undefined }}>
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

            <details style={{ ...bento, padding: "0.9rem 1rem", flex: movil ? undefined : "1 1 260px", minWidth: 0, width: movil ? "100%" : undefined }}>
                <summary style={{ ...etiqueta, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                    <ListChecks size={13} /> Plantillas de fases ({phaseTemplates.length})
                </summary>
                <div style={{ marginTop: "0.7rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                    {phaseTemplates.map(t => (
                        <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: "5px", padding: "8px", background: C.surfaceContainerLow, borderRadius: "10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontWeight: 800, fontSize: "0.8rem", color: C.onSurface }}>{t.name}</span>
                                <button onClick={() => removeFaseTemplate(t.id)} title="Eliminar plantilla" style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "2px", display: "flex" }}>
                                    <Trash2 size={13} />
                                </button>
                            </div>
                            <StageGroups
                                items={t.steps}
                                addPlaceholder="Agregar paso a esta etapa..."
                                onAdd={(label, stage) => addFaseTemplateStep(t.id, label, stage)}
                                renderRow={s => (
                                    <div key={s.id} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", padding: "1px 0" }}>
                                        <span style={{ flex: 1, minWidth: "80px", fontSize: "0.74rem", color: C.onSurfaceVariant }}>{s.label}</span>
                                        <StageSelect value={s.stage} onChange={stage => setFaseTemplateStepStage(t.id, s.id, stage)} />
                                        <button onClick={() => removeFaseTemplateStep(t.id, s.id)} title="Quitar paso" style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "1px", display: "flex", flexShrink: 0 }}>
                                            <X size={11} />
                                        </button>
                                    </div>
                                )}
                            />
                        </div>
                    ))}
                    <AddInline placeholder="Nueva plantilla (ej. Video, Diseño)..." onAdd={name => addFaseTemplate(name)} />
                </div>
            </details>

            {!addingOpen && (
                <button onClick={() => setAddingOpen(true)} style={{ flex: movil ? undefined : "1 1 260px", width: movil ? "100%" : undefined, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "none", border: `2px dashed ${C.outlineVariant}`, borderRadius: "12px", padding: "12px", cursor: "pointer", color: C.outline, fontWeight: 700, fontSize: "0.85rem" }}>
                    <Plus size={16} /> Nuevo proyecto esporádico
                </button>
            )}
            </div>

            {addingOpen && (
                <div style={{ ...bento, padding: "1rem", display: "flex", flexDirection: movil ? "column" : "row", gap: "8px", alignItems: movil ? "stretch" : "center" }}>
                    <input autoFocus placeholder="Título (ej. Video cliente X)" value={title} onChange={e => setTitle(e.target.value)} style={{ ...campo(movil), flex: 2 }} />
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ ...campo(movil), flex: 1 }} />
                    <input type="number" min={0} placeholder="Horas estimadas" value={complexityHours} onChange={e => setComplexityHours(e.target.value)} style={{ ...campo(movil), flex: 1 }} />
                    <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={submit} style={botonPrimario(movil)}>Crear</button>
                        <button onClick={() => setAddingOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.outline, padding: "6px" }}><X size={18} /></button>
                    </div>
                </div>
            )}

            {sporadicProjects.length === 0 && !addingOpen && (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: C.outline }}>
                    <CheckCircle2 size={32} style={{ opacity: 0.4, marginBottom: "0.5rem" }} />
                    <p style={{ margin: 0, fontSize: "0.85rem" }}>Sin proyectos esporádicos. Crea el primero arriba.</p>
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: movil ? "1fr" : "1fr 1fr", gap: "1.25rem", alignItems: "start" }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(visibleEnProgreso.map(p => p.id))}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                        <span style={etiqueta}>
                            En curso ({(statFilter || searchQuery) ? `${visibleEnProgreso.length} de ` : ""}{enProgreso.length})
                            {enProgresoAtrasados > 0 && <span style={{ color: C.rojo }}> · {enProgresoAtrasados} atrasado{enProgresoAtrasados === 1 ? '' : 's'}</span>}
                        </span>
                        {visibleEnProgreso.length === 0 ? (
                            <div style={{ ...bento, padding: "1.5rem 1rem", textAlign: "center", color: C.outline, fontSize: "0.78rem" }}>
                                Ninguno con este filtro.
                            </div>
                        ) : (
                            <SortableContext items={visibleEnProgreso.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                {visibleEnProgreso.map(p => (
                                    <SortableProjectCard key={p.id} p={p} updateSporadicProject={updateSporadicProject} removeSporadicProject={removeSporadicProject} rescheduleSporadicProject={rescheduleSporadicProject} startSporadicTimer={startSporadicTimer} pauseSporadicTimer={pauseSporadicTimer} stopSporadicTimer={stopSporadicTimer} startPhotoTimer={startPhotoTimer} pausePhotoTimer={pausePhotoTimer} finishPhotoTimer={finishPhotoTimer} cancelPhotoTimer={cancelPhotoTimer} adjustPhotoManualExtra={adjustPhotoManualExtra} resetSporadicWorkedTime={resetSporadicWorkedTime} resetSporadicPhotoLog={resetSporadicPhotoLog} removeLastPhotoLog={removeLastPhotoLog} pomodoroPrefs={pomodoroPrefs} calendarEvents={calendarEvents} updateCalendarEvent={updateCalendarEvent} phaseTemplates={phaseTemplates} applyFaseTemplate={applyFaseTemplate} addProjectFase={addProjectFase} removeProjectFase={removeProjectFase} toggleProjectFase={toggleProjectFase} setProjectFaseStage={setProjectFaseStage} startFaseTimer={startFaseTimer} pauseFaseTimer={pauseFaseTimer} finishFaseTimer={finishFaseTimer} />
                                ))}
                            </SortableContext>
                        )}
                    </div>
                </DndContext>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(visibleListosParaEntregar.map(p => p.id))}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                        <span style={etiqueta}>
                            Listos para entregar ({(statFilter || searchQuery) ? `${visibleListosParaEntregar.length} de ` : ""}{listosParaEntregar.length})
                            {listosAtrasados > 0 && <span style={{ color: C.rojo }}> · {listosAtrasados} atrasado{listosAtrasados === 1 ? '' : 's'}</span>}
                        </span>
                        {visibleListosParaEntregar.length === 0 ? (
                            <div style={{ ...bento, padding: "1.5rem 1rem", textAlign: "center", color: C.outline, fontSize: "0.78rem" }}>
                                {listosParaEntregar.length === 0 ? 'Nada listo todavía — aparecerán acá cuando marques un proyecto como "Terminado".' : "Ninguno con este filtro."}
                            </div>
                        ) : (
                            <SortableContext items={visibleListosParaEntregar.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                {visibleListosParaEntregar.map(p => (
                                    <SortableProjectCard key={p.id} p={p} updateSporadicProject={updateSporadicProject} removeSporadicProject={removeSporadicProject} rescheduleSporadicProject={rescheduleSporadicProject} startSporadicTimer={startSporadicTimer} pauseSporadicTimer={pauseSporadicTimer} stopSporadicTimer={stopSporadicTimer} startPhotoTimer={startPhotoTimer} pausePhotoTimer={pausePhotoTimer} finishPhotoTimer={finishPhotoTimer} cancelPhotoTimer={cancelPhotoTimer} adjustPhotoManualExtra={adjustPhotoManualExtra} resetSporadicWorkedTime={resetSporadicWorkedTime} resetSporadicPhotoLog={resetSporadicPhotoLog} removeLastPhotoLog={removeLastPhotoLog} pomodoroPrefs={pomodoroPrefs} calendarEvents={calendarEvents} updateCalendarEvent={updateCalendarEvent} phaseTemplates={phaseTemplates} applyFaseTemplate={applyFaseTemplate} addProjectFase={addProjectFase} removeProjectFase={removeProjectFase} toggleProjectFase={toggleProjectFase} setProjectFaseStage={setProjectFaseStage} startFaseTimer={startFaseTimer} pauseFaseTimer={pauseFaseTimer} finishFaseTimer={finishFaseTimer} />
                                ))}
                            </SortableContext>
                        )}
                    </div>
                </DndContext>
            </div>

            {completados.length > 0 && (
                <details>
                    <summary style={{ ...etiqueta, cursor: "pointer", marginBottom: "0.6rem" }}>
                        Completados ({searchQuery ? `${visibleCompletados.length} de ` : ""}{completados.length})
                    </summary>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "0.6rem" }}>
                        {visibleCompletados.map(p => (
                            <ProjectCard key={p.id} p={p} updateSporadicProject={updateSporadicProject} removeSporadicProject={removeSporadicProject} rescheduleSporadicProject={rescheduleSporadicProject} startSporadicTimer={startSporadicTimer} pauseSporadicTimer={pauseSporadicTimer} stopSporadicTimer={stopSporadicTimer} startPhotoTimer={startPhotoTimer} pausePhotoTimer={pausePhotoTimer} finishPhotoTimer={finishPhotoTimer} cancelPhotoTimer={cancelPhotoTimer} adjustPhotoManualExtra={adjustPhotoManualExtra} resetSporadicWorkedTime={resetSporadicWorkedTime} resetSporadicPhotoLog={resetSporadicPhotoLog} removeLastPhotoLog={removeLastPhotoLog} pomodoroPrefs={pomodoroPrefs} calendarEvents={calendarEvents} updateCalendarEvent={updateCalendarEvent} phaseTemplates={phaseTemplates} applyFaseTemplate={applyFaseTemplate} addProjectFase={addProjectFase} removeProjectFase={removeProjectFase} toggleProjectFase={toggleProjectFase} setProjectFaseStage={setProjectFaseStage} startFaseTimer={startFaseTimer} pauseFaseTimer={pauseFaseTimer} finishFaseTimer={finishFaseTimer} />
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

/** Reemplaza la fila de 5 botones sólidos de color (uno por Estado de Notion) por
 *  un stepper horizontal: círculo relleno + check en lo ya pasado, anillo en lo
 *  activo, círculo vacío en lo pendiente, unidos por una línea que se va llenando.
 *  Sigue siendo clickeable en cualquier paso (salta directo a ese Estado), solo
 *  cambia cómo se ve -- mismo patrón visual "de una pastilla de color a un
 *  indicador de progreso" que se usó en el resto de la tarjeta. */
const EstadoStepper = ({ current, onSelect }: { current: NotionEstado | undefined; onSelect: (estado: NotionEstado) => void }) => {
    const idx = current ? NOTION_ESTADOS.indexOf(current) : -1;
    const pctDone = idx <= 0 ? 0 : (idx / (NOTION_ESTADOS.length - 1)) * 100;
    return (
        <div style={{ position: "relative", padding: "0 9px" }}>
            <div style={{ position: "absolute", top: "9px", left: "9px", right: "9px", height: "2px", background: C.surfaceContainer, borderRadius: "2px" }}>
                <div style={{ height: "100%", width: `${pctDone}%`, background: C.secondary, borderRadius: "2px", transition: "width 0.2s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
                {NOTION_ESTADOS.map((estado, i) => {
                    const done = i < idx;
                    const active = i === idx;
                    return (
                        <button
                            key={estado}
                            onClick={() => onSelect(estado)}
                            title={estado}
                            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                            <span style={{
                                width: "18px", height: "18px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box",
                                background: done ? C.secondary : "white",
                                border: active ? `2px solid ${C.secondary}` : done ? "none" : `2px solid ${C.outlineVariant}`,
                            }}>
                                {done && <Check size={11} color="white" strokeWidth={3} />}
                                {active && <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: C.secondary }} />}
                            </span>
                            <span style={{ fontSize: "0.58rem", fontWeight: active ? 800 : 600, color: active ? C.secondary : done ? C.onSurfaceVariant : C.outlineVariant, whiteSpace: "nowrap" }}>
                                {estado}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const ProjectCard = ({ p, updateSporadicProject, removeSporadicProject, rescheduleSporadicProject, startSporadicTimer, pauseSporadicTimer, stopSporadicTimer, startPhotoTimer, pausePhotoTimer, finishPhotoTimer, cancelPhotoTimer, adjustPhotoManualExtra, resetSporadicWorkedTime, resetSporadicPhotoLog, removeLastPhotoLog, pomodoroPrefs, calendarEvents, updateCalendarEvent, dragHandle, phaseTemplates, applyFaseTemplate, addProjectFase, removeProjectFase, toggleProjectFase, setProjectFaseStage, startFaseTimer, pauseFaseTimer, finishFaseTimer }: {
    p: SporadicProject;
    updateSporadicProject: (id: number, updates: Partial<SporadicProject>) => void;
    removeSporadicProject: (id: number) => void;
    rescheduleSporadicProject: (id: number, newDueDate: string) => void;
    startSporadicTimer: (id: number, stage?: string) => void;
    pauseSporadicTimer: (id: number) => void;
    stopSporadicTimer: (id: number) => void;
    startPhotoTimer: (id: number) => void;
    pausePhotoTimer: (id: number) => void;
    finishPhotoTimer: (id: number) => void;
    cancelPhotoTimer: (id: number) => void;
    adjustPhotoManualExtra: (id: number, delta: number) => void;
    resetSporadicWorkedTime: (id: number) => void;
    resetSporadicPhotoLog: (id: number) => void;
    removeLastPhotoLog: (id: number) => void;
    pomodoroPrefs: PomodoroPrefs;
    calendarEvents: CalendarEvent[];
    updateCalendarEvent: (id: number, updates: Partial<CalendarEvent>) => void;
    dragHandle?: React.ReactNode;
    phaseTemplates: FaseTemplate[];
    applyFaseTemplate: (projectId: number, templateId: number) => void;
    addProjectFase: (projectId: number, label: string, stage?: NotionEstado) => void;
    removeProjectFase: (projectId: number, faseId: number) => void;
    toggleProjectFase: (projectId: number, faseId: number) => void;
    setProjectFaseStage: (projectId: number, faseId: number, stage: NotionEstado | undefined) => void;
    startFaseTimer: (projectId: number, faseId: number) => void;
    pauseFaseTimer: (projectId: number, faseId: number) => void;
    finishFaseTimer: (projectId: number, faseId: number) => void;
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [confirmResetPhotos, setConfirmResetPhotos] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>(phaseTemplates[0]?.id);
    const [pomodoroAlert, setPomodoroAlert] = useState(false);
    const [pomodoroMuted, setPomodoroMuted] = useState(false);
    const [breakEndAt, setBreakEndAt] = useState<number | null>(null);
    const [breakDoneAlert, setBreakDoneAlert] = useState(false);
    // idle: nada que reportar. syncing: push en vuelo (spinner). ok: se acaba de
    // confirmar (se borra sola a los pocos segundos). error: falló, se queda
    // fijo con botón de Reintentar hasta que se resuelva.
    const [notionSyncState, setNotionSyncState] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');
    const [failedEstado, setFailedEstado] = useState<NotionEstado | null>(null);
    const [editandoAdelanto, setEditandoAdelanto] = useState(false);
    const [diasAdelanto, setDiasAdelanto] = useState(String(p.previewDaysBefore ?? ''));
    const [editandoSesion, setEditandoSesion] = useState(false);
    const [diasSesion, setDiasSesion] = useState(String(p.sessionDaysBefore ?? DIAS_SESION_SUGERIDO));
    const [editandoNota, setEditandoNota] = useState(false);
    const [notaDraft, setNotaDraft] = useState(p.note ?? '');
    const [editandoFecha, setEditandoFecha] = useState(false);
    const [fechaDraft, setFechaDraft] = useState(p.dueDate);
    const lastPomodoroThresholdRef = useRef(0);
    const tickCountRef = useRef(0);
    // Guarda el timeout que apaga sola la confirmación "Sincronizado con Notion"
    // para poder cancelarlo -- si se reagenda antes de que pasen los 2.5s (varios
    // clicks seguidos al stepper) o si la tarjeta se desmonta mientras espera,
    // que no quede corriendo de más ni intente actualizar un componente ya idle.
    const syncOkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (syncOkTimeoutRef.current) clearTimeout(syncOkTimeoutRef.current); }, []);
    // Tiempo por foto y Fases ahora son colapsables (antes eran dos cajas fijas
    // siempre abiertas entre el timer y los botones de sesión). Arrancan abiertas
    // solo si hay algo activo/pendiente ahí; un efecto más abajo las reabre solo
    // si arranca una foto — nunca las fuerza a cerrarse si el usuario las dejó
    // abiertas a mano.
    const [photoDetailsOpen, setPhotoDetailsOpen] = useState(!!p.photoActiveSince);
    const allFasesDone = !!p.fases?.length && p.fases.every(f => f.done);
    const [fasesDetailsOpen, setFasesDetailsOpen] = useState(!p.fases?.length || !allFasesDone);
    // Se cierra sola justo cuando se tilda el último paso pendiente (7/7 con
    // strikethrough ocupaba media tarjeta sin aportar nada ya) — pero solo en
    // esa transición, para no pelear si el usuario la vuelve a abrir a mano.
    const wasAllFasesDoneRef = useRef(allFasesDone);
    useEffect(() => {
        if (allFasesDone && !wasAllFasesDoneRef.current) setFasesDetailsOpen(false);
        wasAllFasesDoneRef.current = allFasesDone;
    }, [allFasesDone]);

    const { color, label } = urgency(p);
    const totalSpan = Math.max(daysBetween(p.startDate, p.dueDate), 1);
    const elapsedDays = daysBetween(p.startDate, todayStr());
    const pctElapsed = Math.min(Math.max((elapsedDays / totalSpan) * 100, 0), 100);
    const overdueUnfinished = p.status !== 'completado' && pctElapsed >= 100;
    const running = !!p.activeSince;
    const paused = !running && !!p.pausedAccumHours;
    const inSession = running || paused;
    // El panel de sesión ("Empezar a trabajar" o el bloque de cronómetro +
    // Pausar/Terminar) y "Tiempo por foto" comparten fila — uno al lado del otro,
    // nunca apilados — mientras el proyecto no esté completado.
    const inlinePhotoRow = p.status !== 'completado';
    const linkedEvent = p.notionId ? calendarEvents.find(e => e.notionId === p.notionId) : undefined;

    const now = useNowTicking(running);
    const liveRunningHours = running && p.activeSince ? Math.max((now - p.activeSince) / (1000 * 60 * 60), 0) : 0;
    const sessionHours = (p.pausedAccumHours || 0) + liveRunningHours;
    const effectiveWorkedHours = p.workedHours + sessionHours;

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
    // Progreso contra la meta: cuenta tanto las fotos cronometradas (photoCount,
    // "Foto lista") como las marcadas a mano (photoManualExtra, para ponerse al
    // día si ya se avanzó sin cronometrar) -- un solo número, no dos separados.
    const photoManualExtra = p.photoManualExtra || 0;
    const photoProgress = Math.max(photoCount + photoManualExtra, 0);
    useEffect(() => { if (photoInSession) setPhotoDetailsOpen(true); }, [photoInSession]);

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
    // Se puede silenciar por sesión con la campanita (pomodoroMuted, no persiste).
    useEffect(() => {
        if (!running || pomodoroMuted) return;
        const crossedBlocks = Math.floor((sessionHours * 60) / POMODORO_MINUTES);
        if (crossedBlocks > lastPomodoroThresholdRef.current) {
            lastPomodoroThresholdRef.current = crossedBlocks;
            setPomodoroAlert(true);
            playAlertSound(pomodoroPrefs.sound);
        }
    }, [sessionHours, running, pomodoroPrefs.sound, pomodoroMuted]);
    // Cuánto falta para el próximo aviso de 25 min, para mostrarlo en la tarjeta.
    const secIntoBlock = (sessionHours * 3600) % (POMODORO_MINUTES * 60);
    const nextAlertMs = Math.max((POMODORO_MINUTES * 60 - secIntoBlock) * 1000, 0);
    useEffect(() => {
        if (!inSession) lastPomodoroThresholdRef.current = 0;
    }, [inSession]);

    // Tic-tac opcional mientras corre el bloque de trabajo (no durante el descanso).
    useEffect(() => {
        if (!running || !pomodoroPrefs.tickEnabled) return;
        const id = setInterval(() => {
            tickCountRef.current += 1;
            playTickSound(pomodoroPrefs.tickSound, tickCountRef.current % 2 === 1);
        }, 1000);
        return () => clearInterval(id);
    }, [running, pomodoroPrefs.tickEnabled, pomodoroPrefs.tickSound]);

    // Descanso de 5 min: lo arranca el usuario a mano desde el aviso de Pomodoro
    // (no es automático). Cuando llega a 0, avisa con sonido y se queda fijo
    // hasta que lo cierren -- igual que el aviso de trabajo.
    const breakNow = useNowTicking(!!breakEndAt);
    useEffect(() => {
        if (!breakEndAt) return;
        if (breakNow >= breakEndAt) {
            setBreakEndAt(null);
            setBreakDoneAlert(true);
            playAlertSound(pomodoroPrefs.sound);
        }
    }, [breakNow, breakEndAt, pomodoroPrefs.sound]);
    const breakMsLeft = breakEndAt ? Math.max(breakEndAt - breakNow, 0) : 0;

    // Al cambiar el paso de trabajo, se ve al toque acá (optimista) mientras el
    // push a Notion viaja en segundo plano. Si ese push falla, se revierte el
    // cambio local en vez de dejarlo divergido -- antes se quedaba mostrando el
    // Estado nuevo indefinidamente "hasta el próximo sync real de Notion", que
    // en la práctica podía tardar mucho o no llegar nunca sin que el usuario
    // tocara "Sincronizar ahora" a mano, y se sentía como que el click "no hizo
    // nada" en Notion aunque en AlDía sí se había movido.
    const setNotionEstado = (estado: NotionEstado) => {
        if (!p.notionId) return;
        const estadoPrevio = linkedEvent?.notionEstado;
        const statusPrevio = p.status;
        if (linkedEvent) updateCalendarEvent(linkedEvent.id, { notionEstado: estado });
        updateSporadicProject(p.id, { status: estado === 'Entregado' ? 'completado' : 'en-progreso' });
        if (syncOkTimeoutRef.current) clearTimeout(syncOkTimeoutRef.current);
        setNotionSyncState('syncing');
        setFailedEstado(null);
        pushNotionEstado(p.notionId, estado).then(ok => {
            if (ok) {
                setNotionSyncState('ok');
                setFailedEstado(null);
                // No hace falta que el usuario la cierre a mano -- confirma y se apaga sola.
                syncOkTimeoutRef.current = setTimeout(() => setNotionSyncState(s => s === 'ok' ? 'idle' : s), 2500);
            } else {
                setNotionSyncState('error');
                setFailedEstado(estado);
                if (linkedEvent && estadoPrevio) updateCalendarEvent(linkedEvent.id, { notionEstado: estadoPrevio });
                updateSporadicProject(p.id, { status: statusPrevio });
            }
        });
    };

    // Calculadora tiempo real vs. estimado: cuánto falta, a qué hora terminarías
    // si sigues al ritmo de ahora, y si vas atrasado, cuántas horas diarias hacen falta.
    const remainingHours = Math.max(p.complexityHours - effectiveWorkedHours, 0);
    const daysUntilDue = daysBetween(todayStr(), p.dueDate);
    const eta = remainingHours > 0 ? formatHM(new Date(now + remainingHours * 60 * 60 * 1000)) : null;
    // Días hasta la fecha "mía" (myDueDateOverride), independiente de daysUntilDue:
    // esa sigue midiendo el atraso real contra dueDate sin tocarse por reagendar.
    const daysUntilOverride = p.myDueDateOverride ? daysBetween(todayStr(), p.myDueDateOverride) : undefined;

    // Cuenta regresiva real (no solo la config "Nd antes") para saber cuánto
    // falta para el vencimiento del adelanto de fotos: fecha de entrega menos
    // los días configurados. Ya no aplica una vez que se marcó como enviado.
    const adelantoDueDate = p.requiresPreview && p.previewDaysBefore != null ? dateMinusDays(p.dueDate, p.previewDaysBefore) : undefined;
    const adelantoDaysLeft = adelantoDueDate && !p.previewSent ? daysBetween(todayStr(), adelantoDueDate) : undefined;

    // Fecha para tener la sesión terminada (fotos tomadas, lista para editar),
    // siempre visible a diferencia del adelanto -- si no se configuró nada usa
    // el sugerido (5 días antes de la entrega) en vez de quedar sin mostrar nada.
    const sessionDaysBefore = p.sessionDaysBefore ?? DIAS_SESION_SUGERIDO;
    const sessionEndDate = dateMinusDays(p.dueDate, sessionDaysBefore);
    const sessionDaysLeft = daysBetween(todayStr(), sessionEndDate);

    return (
        <div style={{
            background: C.surfaceLowest, borderRadius: RADIO.tarjeta, boxShadow: "0 2px 14px rgba(25,28,29,0.07)",
            padding: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem",
            opacity: p.status === 'completado' ? 0.7 : 1, position: "relative",
            // Fijado: contorno dorado grueso + apenas un toque de tinte adentro (mucho
            // más leve que el mostaza de antes, que se sentía muy cargado) -- ni blanco
            // plano ni el fondo saturado original, algo intermedio.
            ...(p.pinned ? { background: "rgba(230,168,23,0.035)", boxShadow: "0 2px 14px rgba(25,28,29,0.07), 0 0 0 3px rgba(230,168,23,0.75)" } : {}),
        }}>
            {pomodoroAlert && (
                <div style={{ position: "absolute", top: "-10px", left: "10px", right: "10px", display: "flex", alignItems: "center", gap: "6px", background: C.ambar, color: "white", borderRadius: "10px", padding: "6px 8px", fontSize: "0.72rem", fontWeight: 800, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 6, flexWrap: "wrap" }}>
                    <span style={{ flex: 1, textAlign: "center" }}>⏰ {POMODORO_MINUTES} min — tómate {BREAK_MINUTES} de descanso</span>
                    <button
                        onClick={() => { setPomodoroAlert(false); setBreakEndAt(Date.now() + BREAK_MINUTES * 60 * 1000); }}
                        title="Iniciar descanso de 5 min"
                        style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.25)", border: "none", borderRadius: "6px", cursor: "pointer", color: "white", padding: "3px 8px", fontSize: "0.68rem", fontWeight: 800, flexShrink: 0 }}
                    >
                        <Play size={11} /> Iniciar descanso
                    </button>
                    <button
                        onClick={() => setPomodoroAlert(false)}
                        title="Ya lo tomé (no contar descanso)"
                        style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.25)", border: "none", borderRadius: "6px", cursor: "pointer", color: "white", padding: "3px 8px", fontSize: "0.68rem", fontWeight: 800, flexShrink: 0 }}
                    >
                        <Check size={11} /> Ya lo tomé
                    </button>
                </div>
            )}
            {breakEndAt && (
                <div style={{ position: "absolute", top: "-10px", left: "10px", right: "10px", display: "flex", alignItems: "center", gap: "8px", background: C.verde, color: "white", borderRadius: "10px", padding: "6px 8px 6px 10px", fontSize: "0.72rem", fontWeight: 800, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 6 }}>
                    <Coffee size={13} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, textAlign: "center" }}>Descanso: {formatElapsed(breakMsLeft)} restante</span>
                    <button
                        onClick={() => setBreakEndAt(null)}
                        title="Ya terminé mi descanso, aunque no se hayan cumplido los 5 min"
                        style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.25)", border: "none", borderRadius: "6px", cursor: "pointer", color: "white", padding: "3px 8px", fontSize: "0.68rem", fontWeight: 800, flexShrink: 0 }}
                    >
                        <Check size={11} /> Listo
                    </button>
                </div>
            )}
            {breakDoneAlert && (
                <div style={{ position: "absolute", top: "-10px", left: "10px", right: "10px", display: "flex", alignItems: "center", gap: "8px", background: C.verde, color: "white", borderRadius: "10px", padding: "6px 8px 6px 10px", fontSize: "0.72rem", fontWeight: 800, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 6 }}>
                    <span style={{ flex: 1, textAlign: "center" }}>☕ ¡Descanso terminado! De vuelta al trabajo</span>
                    <button
                        onClick={() => setBreakDoneAlert(false)}
                        title="Cerrar"
                        style={{ background: "rgba(255,255,255,0.25)", border: "none", borderRadius: "6px", cursor: "pointer", color: "white", padding: "3px", display: "flex", flexShrink: 0 }}
                    >
                        <X size={13} />
                    </button>
                </div>
            )}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                {dragHandle}
                <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        {p.notionId && <span title="Sincronizado desde Notion" style={{ display: "flex" }}><Sparkles size={12} color={C.secondary} /></span>}
                        <span style={{ fontWeight: 800, fontSize: "0.95rem", color: C.onSurface, textDecoration: p.status === 'completado' ? "line-through" : "none" }}>{p.title}</span>
                        {/* Pastilla de urgencia: reemplaza al borde izquierdo de color que tenía
                            antes la tarjeta entera -- mismo semáforo (rojo/ámbar/verde), pero como
                            una pastilla suave junto al título en vez de un marco de la tarjeta. */}
                        <span style={{ background: `${color}1f`, color, borderRadius: "999px", padding: "2px 9px", fontSize: "0.62rem", fontWeight: 800 }}>
                            {label}
                        </span>
                        {/* Prioritario y En pausa son solo informativos (no urgencia ni "hecho"),
                            así que van en gris neutro -- el color de verdad (rojo/ámbar/verde) se
                            reserva para la pastilla de arriba y los estados completado/pendiente,
                            para no competir por atención con demasiados colores a la vez. */}
                        {p.pinned && (
                            <span style={{ display: "flex", alignItems: "center", gap: "3px", background: C.surfaceContainerLow, color: C.onSurfaceVariant, borderRadius: "999px", padding: "2px 8px", fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                                <Pin size={9} fill={C.onSurfaceVariant} /> Prioritario
                            </span>
                        )}
                        {running && (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(239,68,68,0.1)", color: C.rojo, borderRadius: "999px", padding: "2px 8px", fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: C.rojo, animation: "esporadico-blink 1.1s ease-in-out infinite" }} />
                                Trabajando
                            </span>
                        )}
                        {paused && (
                            <span style={{ background: C.surfaceContainerLow, color: C.onSurfaceVariant, borderRadius: "999px", padding: "2px 8px", fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                                En pausa
                            </span>
                        )}
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "3px", fontSize: "0.72rem", color: C.onSurfaceVariant, fontWeight: 700, alignItems: "center" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span>Entrega: {p.dueDate}</span>
                            {/* Reagendar NUNCA toca esta fecha ni la de Notion -- solo pone
                                myDueDateOverride por encima. El atraso de acá arriba sigue
                                midiéndose contra esto tal cual, siempre. */}
                            <button
                                onClick={() => { setFechaDraft(p.myDueDateOverride || p.dueDate); setEditandoFecha(true); }}
                                title="Poner mi propia fecha de entrega (no cambia esta ni la de Notion)"
                                style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "1px", display: "flex" }}
                            ><Pencil size={11} /></button>
                        </span>
                        {editandoFecha && (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <input
                                    type="date"
                                    autoFocus
                                    value={fechaDraft}
                                    onChange={e => setFechaDraft(e.target.value)}
                                    style={{ border: `1px solid ${C.outlineVariant}`, borderRadius: "6px", padding: "2px 5px", fontSize: "0.7rem", fontFamily: "inherit" }}
                                />
                                <button
                                    onClick={() => { if (fechaDraft) rescheduleSporadicProject(p.id, fechaDraft); setEditandoFecha(false); }}
                                    title="Guardar mi fecha"
                                    style={{ background: "none", border: "none", cursor: "pointer", color: C.verde, padding: "1px", display: "flex" }}
                                ><Check size={13} /></button>
                                <button
                                    onClick={() => setEditandoFecha(false)}
                                    title="Cancelar"
                                    style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "1px", display: "flex" }}
                                ><X size={13} /></button>
                            </span>
                        )}
                        {/* Fecha para tener la sesión terminada (fotos tomadas, lista para
                            editar) -- a diferencia del adelanto, esto SIEMPRE se muestra,
                            con un valor sugerido (5d antes) si no se configuró nada, porque
                            aplica a toda entrega y no solo a las que piden un adelanto. */}
                        {editandoSesion ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <Camera size={10} color={C.onSurfaceVariant} />
                                <input
                                    autoFocus
                                    type="number" min="0"
                                    value={diasSesion}
                                    onChange={e => setDiasSesion(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter") {
                                            const d = parseInt(diasSesion, 10);
                                            updateSporadicProject(p.id, { sessionDaysBefore: d >= 0 ? d : undefined });
                                            setEditandoSesion(false);
                                        }
                                        if (e.key === "Escape") setEditandoSesion(false);
                                    }}
                                    onBlur={() => {
                                        const d = parseInt(diasSesion, 10);
                                        updateSporadicProject(p.id, { sessionDaysBefore: d >= 0 ? d : undefined });
                                        setEditandoSesion(false);
                                    }}
                                    placeholder="días"
                                    style={{ width: "46px", fontSize: "0.65rem", fontWeight: 700, padding: "2px 5px", borderRadius: "6px", border: `1px solid ${C.outlineVariant}`, outline: "none", fontFamily: "inherit" }}
                                />
                                <span style={{ fontSize: "0.65rem" }}>días antes</span>
                            </span>
                        ) : (
                            <button
                                onClick={() => { setDiasSesion(String(sessionDaysBefore)); setEditandoSesion(true); }}
                                title="Días antes de la entrega para tener la sesión terminada — tocar para cambiar"
                                style={{
                                    display: "flex", alignItems: "center", gap: "4px",
                                    background: sessionDaysLeft < 0 ? "rgba(239,68,68,0.1)" : sessionDaysLeft <= 1 ? "rgba(230,168,23,0.14)" : C.surfaceContainerLow,
                                    color: sessionDaysLeft < 0 ? C.rojo : sessionDaysLeft <= 1 ? C.ambar : C.onSurfaceVariant,
                                    border: "none", borderRadius: "999px", padding: "2px 8px", fontSize: "0.62rem", fontWeight: 800, cursor: "pointer",
                                }}
                            >
                                <Camera size={10} />
                                Terminar sesión: {sessionEndDate} ({sessionDaysBefore}d antes)
                                <span> · {sessionDaysLeft < 0 ? `atrasada ${Math.abs(sessionDaysLeft)}d` : sessionDaysLeft === 0 ? 'hoy' : `faltan ${sessionDaysLeft}d`}</span>
                            </button>
                        )}
                        {/* Fecha "mía" por encima de la real -- puramente informativa: no
                            cambia dueDate, no toca Notion, y no afecta la pastilla de
                            atraso de arriba (esa sigue midiendo contra la fecha real). Solo
                            dice cuánto falta para la fecha a la que me comprometí yo. */}
                        {!!p.rescheduleCount && (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", background: C.surfaceContainerLow, color: C.onSurfaceVariant, borderRadius: "999px", padding: "2px 8px", fontSize: "0.68rem", fontWeight: 700 }}>
                                Mi fecha: {p.myDueDateOverride}
                                {daysUntilOverride !== undefined && (
                                    <span style={{ fontWeight: 800 }}>
                                        · {daysUntilOverride < 0 ? `${Math.abs(daysUntilOverride)}d atrasada` : daysUntilOverride === 0 ? "hoy" : `faltan ${daysUntilOverride}d`}
                                    </span>
                                )}
                            </span>
                        )}
                        {trackingSinceFirstStart && (
                            <span style={{ color: C.outline, fontWeight: 600 }}>· llevas {formatElapsedWithDays(sinceFirstStartMs)} sin entregarlo</span>
                        )}
                        {/* Solo aparece si el proyecto está marcado como "pide adelanto" (botón Send
                            de al lado). Clickeable: pasa de pendiente a enviado y viceversa, sin
                            abrir ningún menú — es algo que se marca varias veces al día. */}
                        {p.requiresPreview && (
                            <button
                                onClick={() => updateSporadicProject(p.id, { previewSent: !p.previewSent })}
                                title={p.previewSent ? "Adelanto ya enviado — tocar para desmarcar" : "Adelanto pendiente de enviar — tocar para marcar enviado"}
                                style={{
                                    display: "flex", alignItems: "center", gap: "4px",
                                    background: p.previewSent ? "rgba(16,185,129,0.12)" : C.surfaceContainerLow,
                                    color: p.previewSent ? C.verde : C.onSurfaceVariant,
                                    border: "none", borderRadius: "999px", padding: "2px 8px",
                                    fontSize: "0.62rem", fontWeight: 800, cursor: "pointer",
                                }}
                            >
                                <Send size={10} /> {p.previewSent ? "Adelanto enviado" : "Adelanto pendiente"}
                            </button>
                        )}
                        {/* Días antes de la entrega para mandar el adelanto: si no está puesto,
                            avisa en rojo (falta configurar); "sugerido" solo rellena un valor
                            fijo (3 días) que se puede editar igual que si fuera manual. */}
                        {p.requiresPreview && (
                            editandoAdelanto ? (
                                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <input
                                        autoFocus
                                        type="number" min="0"
                                        value={diasAdelanto}
                                        onChange={e => setDiasAdelanto(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === "Enter") {
                                                const d = parseInt(diasAdelanto, 10);
                                                updateSporadicProject(p.id, { previewDaysBefore: d >= 0 ? d : undefined });
                                                setEditandoAdelanto(false);
                                            }
                                            if (e.key === "Escape") setEditandoAdelanto(false);
                                        }}
                                        onBlur={() => {
                                            const d = parseInt(diasAdelanto, 10);
                                            updateSporadicProject(p.id, { previewDaysBefore: d >= 0 ? d : undefined });
                                            setEditandoAdelanto(false);
                                        }}
                                        placeholder="días"
                                        style={{ width: "46px", fontSize: "0.65rem", fontWeight: 700, padding: "2px 5px", borderRadius: "6px", border: `1px solid ${C.outlineVariant}`, outline: "none", fontFamily: "inherit" }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => { setDiasAdelanto(String(DIAS_ADELANTO_SUGERIDO)); updateSporadicProject(p.id, { previewDaysBefore: DIAS_ADELANTO_SUGERIDO }); setEditandoAdelanto(false); }}
                                        title={`Usar sugerido: ${DIAS_ADELANTO_SUGERIDO} días antes de la entrega`}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: C.secondary, fontSize: "0.6rem", fontWeight: 800, textDecoration: "underline", padding: 0 }}
                                    >
                                        sugerido {DIAS_ADELANTO_SUGERIDO}d
                                    </button>
                                </span>
                            ) : p.previewDaysBefore != null ? (
                                <button
                                    onClick={() => { setDiasAdelanto(String(p.previewDaysBefore)); setEditandoAdelanto(true); }}
                                    title="Días antes de la entrega para mandar el adelanto — tocar para cambiar"
                                    style={{
                                        display: "flex", alignItems: "center", gap: "4px",
                                        background: adelantoDaysLeft !== undefined && adelantoDaysLeft < 0 ? "rgba(239,68,68,0.1)" : adelantoDaysLeft !== undefined && adelantoDaysLeft <= 1 ? "rgba(230,168,23,0.14)" : "rgba(148,74,24,0.08)",
                                        color: adelantoDaysLeft !== undefined && adelantoDaysLeft < 0 ? C.rojo : adelantoDaysLeft !== undefined && adelantoDaysLeft <= 1 ? C.ambar : C.secondary,
                                        border: "none", borderRadius: "999px", padding: "2px 8px", fontSize: "0.62rem", fontWeight: 800, cursor: "pointer",
                                    }}
                                >
                                    <Timer size={10} />
                                    Adelanto: {p.previewDaysBefore}d antes
                                    {adelantoDaysLeft !== undefined && (
                                        <span> · {adelantoDaysLeft < 0 ? `atrasado ${Math.abs(adelantoDaysLeft)}d` : adelantoDaysLeft === 0 ? 'hoy' : `faltan ${adelantoDaysLeft}d`}</span>
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={() => setEditandoAdelanto(true)}
                                    title="Falta poner cuántos días antes de la entrega hay que mandar el adelanto"
                                    style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(239,68,68,0.1)", color: C.rojo, border: "none", borderRadius: "999px", padding: "2px 8px", fontSize: "0.62rem", fontWeight: 800, cursor: "pointer" }}
                                >
                                    <AlertTriangle size={10} /> Falta día de adelanto
                                </button>
                            )
                        )}
                        {/* Igual que el pill de Adelanto, pero para el USB físico de la entrega
                            final — independiente de "Marcar completado": el proyecto puede estar
                            entregado (digital) y el USB seguir pendiente de llevar/mandar. */}
                        {p.requiresUsb && (
                            <button
                                onClick={() => updateSporadicProject(p.id, { usbDelivered: !p.usbDelivered })}
                                title={p.usbDelivered ? "USB ya entregado — tocar para desmarcar" : "USB pendiente de entregar — tocar para marcar entregado"}
                                style={{
                                    display: "flex", alignItems: "center", gap: "4px",
                                    background: p.usbDelivered ? "rgba(16,185,129,0.12)" : C.surfaceContainerLow,
                                    color: p.usbDelivered ? C.verde : C.onSurfaceVariant,
                                    border: "none", borderRadius: "999px", padding: "2px 8px",
                                    fontSize: "0.62rem", fontWeight: 800, cursor: "pointer",
                                }}
                            >
                                <Usb size={10} /> {p.usbDelivered ? "USB entregado" : "USB pendiente"}
                            </button>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => updateSporadicProject(p.id, {
                        requiresPreview: !p.requiresPreview,
                        previewSent: p.requiresPreview ? undefined : p.previewSent,
                        // Al activarlo, ya arranca con un plazo por defecto (5d antes de la
                        // entrega) en vez de forzar a configurarlo a mano cada vez — se puede
                        // seguir editando igual desde el pill de abajo.
                        previewDaysBefore: !p.requiresPreview && p.previewDaysBefore == null ? DIAS_ADELANTO_SUGERIDO : p.previewDaysBefore,
                    })}
                    title={p.requiresPreview ? "El cliente pidió adelanto de fotos — tocar para quitarlo" : "Marcar que el cliente pidió un adelanto de fotos antes de la entrega"}
                    style={{ background: "none", border: "none", cursor: "pointer", color: p.requiresPreview ? C.secondary : C.outlineVariant, padding: "3px", display: "flex" }}
                >
                    <Send size={15} fill={p.requiresPreview ? C.secondary : "none"} />
                </button>
                <button
                    onClick={() => updateSporadicProject(p.id, { requiresUsb: !p.requiresUsb, usbDelivered: p.requiresUsb ? undefined : p.usbDelivered })}
                    title={p.requiresUsb ? "La entrega lleva USB físico — tocar para quitarlo" : "Marcar que la entrega final incluye un USB físico"}
                    style={{ background: "none", border: "none", cursor: "pointer", color: p.requiresUsb ? C.secondary : C.outlineVariant, padding: "3px", display: "flex" }}
                >
                    <Usb size={15} />
                </button>
                <button
                    onClick={() => { setNotaDraft(p.note ?? ''); setEditandoNota(v => !v); }}
                    title={p.note ? "Tiene una nota — tocar para editarla" : "Dejar una nota (algo que falta, no está claro, etc.)"}
                    style={{ background: "none", border: "none", cursor: "pointer", color: p.note ? C.ambar : C.outlineVariant, padding: "3px", display: "flex" }}
                >
                    <StickyNote size={15} fill={p.note ? "rgba(230,168,23,0.25)" : "none"} />
                </button>
                <button
                    onClick={() => updateSporadicProject(p.id, { pinned: !p.pinned })}
                    title={p.pinned ? "Quitar prioridad" : "Marcar como prioritario (sube arriba de su columna)"}
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

            {/* Nota libre: para lo que no encaja en ningún campo fijo del proyecto
                ("no sé si aprobó el edit", "falta que confirme la fecha"...) sin
                tener que anotarlo aparte en otra app. Visible siempre que exista,
                sin tener que abrir nada. */}
            {editandoNota ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <textarea
                        autoFocus
                        value={notaDraft}
                        onChange={e => setNotaDraft(e.target.value)}
                        placeholder="Ej. Falta que confirme la fecha, no sé si aprobó el edit..."
                        rows={2}
                        style={{ width: "100%", padding: "7px 9px", borderRadius: "8px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.78rem", outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", gap: "6px" }}>
                        <button
                            onClick={() => { updateSporadicProject(p.id, { note: notaDraft.trim() || undefined }); setEditandoNota(false); }}
                            style={{ background: C.secondary, color: "white", border: "none", borderRadius: "8px", padding: "6px 12px", fontWeight: 800, fontSize: "0.74rem", cursor: "pointer" }}
                        >
                            Guardar
                        </button>
                        {p.note && (
                            <button
                                onClick={() => { updateSporadicProject(p.id, { note: undefined }); setNotaDraft(''); setEditandoNota(false); }}
                                style={{ background: "none", border: "none", cursor: "pointer", color: C.rojo, fontSize: "0.74rem", fontWeight: 700 }}
                            >
                                Quitar nota
                            </button>
                        )}
                        <button onClick={() => setEditandoNota(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.outline, fontSize: "0.74rem", fontWeight: 700, marginLeft: "auto" }}>
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : p.note && (
                <button
                    onClick={() => { setNotaDraft(p.note ?? ''); setEditandoNota(true); }}
                    title="Tocar para editar la nota"
                    style={{ display: "flex", alignItems: "flex-start", gap: "6px", background: "rgba(230,168,23,0.08)", border: "none", borderRadius: "8px", padding: "6px 9px", cursor: "pointer", textAlign: "left", fontSize: "0.76rem", color: C.onSurfaceVariant, fontStyle: "italic" }}
                >
                    <StickyNote size={13} color={C.ambar} style={{ flexShrink: 0, marginTop: "1px" }} />
                    {p.note}
                </button>
            )}

            {/* Si el proyecto viene de Notion pero ya no hay un evento vinculado (linkedEvent),
                es que esa página se borró o se archivó allá -- el sync solo agrega/actualiza,
                nunca borra esta tarjeta sola (perdería horas, notas, fases que solo viven acá),
                así que en vez de desaparecer en silencio o quedarse como si nada, avisa. */}
            {p.notionId && !linkedEvent ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.68rem", color: C.rojo, fontWeight: 700, background: "rgba(239,68,68,0.08)", borderRadius: "8px", padding: "6px 9px" }}>
                    <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                    Ya no está en Notion (se borró o archivó allá) — esta tarjeta se quedó porque tiene horas/notas propias. Bórrala a mano si ya no aplica.
                </div>
            ) : p.notionId && (
                <EstadoStepper current={linkedEvent?.notionEstado} onSelect={setNotionEstado} />
            )}

            {/* Estado del último push a Notion: sincronizando (spinner, mientras viaja),
                confirmado (verde, se apaga sola) o falló (rojo, se queda con botón de
                Reintentar) -- antes el único rastro era un texto chico que solo aparecía
                si fallaba, así que un push que tardaba se sentía como que "no hizo nada". */}
            {notionSyncState === 'syncing' && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.7rem", color: C.onSurfaceVariant, fontWeight: 700, background: C.surfaceContainerLow, borderRadius: "8px", padding: "6px 9px" }}>
                    <Loader2 size={13} className="spin-fast" style={{ flexShrink: 0 }} />
                    Sincronizando con Notion...
                </div>
            )}
            {notionSyncState === 'ok' && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.7rem", color: C.verde, fontWeight: 700, background: "rgba(16,185,129,0.1)", borderRadius: "8px", padding: "6px 9px" }}>
                    <CheckCircle2 size={13} style={{ flexShrink: 0 }} />
                    Sincronizado con Notion
                </div>
            )}
            {notionSyncState === 'error' && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.7rem", color: C.rojo, fontWeight: 700, background: "rgba(239,68,68,0.08)", borderRadius: "8px", padding: "6px 9px" }}>
                    <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>Falló al guardar en Notion — el cambio se revirtió acá también, para no quedar diciendo algo distinto. Revisa tu conexión.</span>
                    {failedEstado && (
                        <button
                            onClick={() => setNotionEstado(failedEstado)}
                            style={{ background: C.rojo, color: "white", border: "none", borderRadius: "6px", padding: "3px 8px", fontSize: "0.66rem", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}
                        >
                            Reintentar
                        </button>
                    )}
                </div>
            )}

            {/* Progreso arriba del todo, junto al estado — para ver de un vistazo
                cómo va el proyecto ANTES de decidir si arrancar. Antes vivía pegado
                al fondo, después de dos cajas completas (fotos y fases). El texto de
                ritmo/ETA se fusiona acá abajo como bajada, en vez de un párrafo
                aparte más abajo en la tarjeta. */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", gap: "12px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", fontSize: "0.6rem", fontWeight: 700, color: C.outline, marginBottom: "2px" }}>
                            <span>Días hasta la entrega</span>
                            <span style={{ flexShrink: 0, color: overdueUnfinished ? "#8A1F1F" : color }}>
                                {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d atrasado` : daysUntilDue === 0 ? "hoy" : `${daysUntilDue}d`}
                            </span>
                        </div>
                        <div style={{ height: "5px", borderRadius: "999px", background: C.surfaceContainer, overflow: "hidden" }}>
                            <div style={{
                                height: "100%", borderRadius: "999px", width: `${pctElapsed}%`,
                                background: overdueUnfinished ? "#8A1F1F" : color,
                                animation: overdueUnfinished ? "esporadico-blink 1.1s ease-in-out infinite" : undefined,
                                transition: "width 0.3s",
                            }} />
                        </div>
                    </div>

                    {p.complexityHours > 0 ? (
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", fontSize: "0.6rem", fontWeight: 700, color: C.outline, marginBottom: "2px" }}>
                                <span>Horas vs. estimado</span>
                                <span style={{ flexShrink: 0 }}>{Math.round(Math.min((effectiveWorkedHours / p.complexityHours) * 100, 100))}%</span>
                            </div>
                            <div style={{ height: "5px", borderRadius: "999px", background: C.surfaceContainer, overflow: "hidden" }}>
                                <div style={{
                                    height: "100%", borderRadius: "999px",
                                    width: `${Math.min((effectiveWorkedHours / p.complexityHours) * 100, 100)}%`,
                                    background: effectiveWorkedHours >= p.complexityHours ? C.verde : C.secondary,
                                    transition: "width 0.3s",
                                }} />
                            </div>
                        </div>
                    ) : !inSession && effectiveWorkedHours > 0 ? (
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.6rem", fontWeight: 700, color: C.outline, marginBottom: "2px" }}>Horas trabajadas</div>
                            <div style={{ fontSize: "0.78rem", fontWeight: 800, color: C.onSurface }}>{formatElapsed(effectiveWorkedHours * 60 * 60 * 1000)}</div>
                        </div>
                    ) : null}
                </div>

                {p.complexityHours > 0 && p.status !== 'completado' && (
                    <div style={{ fontSize: "0.68rem", color: C.onSurfaceVariant, lineHeight: 1.4 }}>
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
            </div>

            {/* Panel de control: cronómetro + botones de sesión agrupados en una sola
                unidad con fondo propio cuando hay sesión activa — antes el timer vivía
                suelto arriba y los botones de Pausar/Terminar quedaban hasta el fondo
                de la tarjeta, después de las cajas de fotos y fases. Es lo que más se
                toca acá, así que ahora va justo debajo del progreso. */}
            <div style={{ display: inlinePhotoRow ? "flex" : "contents", flexWrap: "wrap", gap: "8px", alignItems: "flex-start" }}>
            {(inSession || p.status !== 'completado') && (
                <div style={{
                    display: "flex", flexDirection: "column", gap: "8px",
                    flex: inlinePhotoRow ? (inSession ? "1 1 44%" : "0 0 42%") : undefined,
                    padding: inSession ? "10px" : 0,
                    background: inSession ? (running ? "rgba(239,68,68,0.06)" : "rgba(230,168,23,0.06)") : "transparent",
                    borderRadius: "12px",
                }}>
                    {inSession && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", fontWeight: 800, color: running ? C.rojo : C.ambar }}>
                                <Timer size={13} />
                                {formatElapsed(effectiveWorkedHours * 60 * 60 * 1000)} total del proyecto
                                {p.activeStage && <span style={{ fontWeight: 600, color: C.onSurfaceVariant }}>· en {p.activeStage}</span>}
                                {paused && <span style={{ fontWeight: 600, color: C.onSurfaceVariant }}>· en pausa</span>}
                                {running && !pomodoroMuted && (
                                    <span style={{ fontWeight: 600, color: C.onSurfaceVariant, fontSize: "0.68rem" }}>· próx. descanso en {formatElapsed(nextAlertMs)}</span>
                                )}
                                <button
                                    onClick={() => setPomodoroMuted(m => !m)}
                                    title={pomodoroMuted ? "Activar avisos de Pomodoro" : "Silenciar avisos de Pomodoro (solo esta sesión)"}
                                    style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: pomodoroMuted ? C.outlineVariant : C.onSurfaceVariant, padding: "2px", display: "flex", flexShrink: 0 }}
                                >
                                    {pomodoroMuted ? <BellOff size={13} /> : <Bell size={13} />}
                                </button>
                            </div>
                            <div style={{ fontSize: "0.68rem", fontWeight: 600, color: C.outline, paddingLeft: "19px" }}>
                                Esta sesión: {formatElapsed(sessionHours * 60 * 60 * 1000)}
                            </div>
                        </div>
                    )}
                    {p.status !== 'completado' && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
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
                                    title="Pausar" aria-label="Pausar"
                                    style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: C.ambar, color: "white", border: "none", borderRadius: "8px", padding: "8px 12px", cursor: "pointer" }}
                                >
                                    <Pause size={15} />
                                </button>
                            )}
                            {paused && (
                                <button
                                    onClick={() => startSporadicTimer(p.id, p.activeStage)}
                                    title="Reanudar" aria-label="Reanudar"
                                    style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: C.surfaceContainerLow, color: C.onSurfaceVariant, border: "none", borderRadius: "8px", padding: "8px 12px", cursor: "pointer" }}
                                >
                                    <Play size={15} />
                                </button>
                            )}
                            {inSession && (
                                <button
                                    onClick={() => stopSporadicTimer(p.id)}
                                    title="Terminar sesión" aria-label="Terminar sesión"
                                    style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: C.rojo, color: "white", border: "none", borderRadius: "8px", padding: "8px 12px", cursor: "pointer" }}
                                >
                                    <Square size={15} />
                                </button>
                            )}
                            {inSession && !breakEndAt && !breakDoneAlert && (
                                <button
                                    onClick={() => setBreakEndAt(Date.now() + BREAK_MINUTES * 60 * 1000)}
                                    title="Tomar un descanso de 5 min ahora, sin esperar el aviso" aria-label="Descanso de 5 min"
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: `1px solid ${C.outlineVariant}`, borderRadius: "8px", padding: "8px 12px", cursor: "pointer", color: C.onSurfaceVariant, flexShrink: 0 }}
                                >
                                    <Coffee size={15} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Tiempo por foto: colapsable — antes era una caja fija siempre abierta
                entre el timer y los botones de sesión, aportando poco cuando no se
                está usando. Se reabre sola en cuanto arranca una foto. */}
            {p.status !== 'completado' && (
                <details open={photoDetailsOpen} onToggle={e => setPhotoDetailsOpen(e.currentTarget.open)} style={{ background: C.surfaceContainerLow, borderRadius: "10px", padding: "8px 10px", flex: inlinePhotoRow ? "1 1 210px" : undefined, minWidth: 0 }}>
                    <summary style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "4px", cursor: "pointer", listStyle: "none" }}>
                        <span style={{ fontSize: "0.66rem", fontWeight: 800, color: C.onSurfaceVariant, display: "flex", alignItems: "center", gap: "4px", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                            <ImageIcon size={12} /> Tiempo por foto
                        </span>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: C.onSurfaceVariant, textAlign: "right" }}>
                            {p.photoGoal ? `${photoProgress}/${p.photoGoal} fotos` : (photoProgress > 0 ? `${photoProgress} foto${photoProgress === 1 ? '' : 's'}` : '')}
                            {photoCount > 0 && <> · prom. {formatElapsed(avgPhotoMs)} · total {formatElapsed(totalPhotoMs)}</>}
                        </span>
                    </summary>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", fontWeight: 700, color: C.onSurfaceVariant, flexShrink: 0 }}>
                                <Target size={12} /> Meta
                            </span>
                            <input
                                type="number"
                                min={0}
                                value={p.photoGoal ?? ''}
                                onChange={e => {
                                    const v = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value));
                                    updateSporadicProject(p.id, { photoGoal: v });
                                }}
                                placeholder="cantidad de fotos"
                                style={{ flex: "1 1 70px", minWidth: 0, border: `1px solid ${C.outlineVariant}`, borderRadius: "8px", padding: "4px 8px", fontSize: "0.74rem", fontFamily: "inherit", background: "white", color: C.onSurface }}
                            />
                            <div style={{ marginLeft: "auto", flexShrink: 0, display: "flex", alignItems: "center", gap: "4px" }}>
                                <button
                                    onClick={() => adjustPhotoManualExtra(p.id, -1)}
                                    disabled={photoProgress === 0}
                                    title="Restar una foto"
                                    style={{ background: "none", border: `1px solid ${C.outlineVariant}`, borderRadius: "6px", cursor: photoProgress === 0 ? "default" : "pointer", opacity: photoProgress === 0 ? 0.4 : 1, color: C.onSurfaceVariant, padding: "3px", display: "flex" }}
                                >
                                    <Minus size={12} />
                                </button>
                                <input
                                    type="number"
                                    min={0}
                                    value={photoProgress}
                                    onChange={e => {
                                        const newTotal = Math.max(0, Number(e.target.value) || 0);
                                        updateSporadicProject(p.id, { photoManualExtra: newTotal - photoCount });
                                    }}
                                    title="Fotos hechas — cuenta las cronometradas con 'Foto lista' más las marcadas a mano; se puede escribir directo para ponerse al día"
                                    style={{ width: "44px", textAlign: "center", border: `1px solid ${C.outlineVariant}`, borderRadius: "6px", padding: "3px 2px", fontSize: "0.74rem", fontWeight: 700, fontFamily: "inherit", background: "white", color: C.onSurfaceVariant }}
                                />
                                <button
                                    onClick={() => adjustPhotoManualExtra(p.id, 1)}
                                    title="Sumar una foto a mano (ya avanzada, sin cronómetro)"
                                    style={{ background: "none", border: `1px solid ${C.outlineVariant}`, borderRadius: "6px", cursor: "pointer", color: C.onSurfaceVariant, padding: "3px", display: "flex" }}
                                >
                                    <Plus size={12} />
                                </button>
                            </div>
                        </div>
                        {!!p.photoGoal && (
                            <div style={{ height: "5px", borderRadius: "999px", background: C.surfaceContainer, overflow: "hidden" }}>
                                <div style={{ height: "100%", borderRadius: "999px", width: `${Math.min((photoProgress / p.photoGoal) * 100, 100)}%`, background: photoProgress >= p.photoGoal ? C.verde : C.secondary }} />
                            </div>
                        )}
                        {(photoCount > 0 || photoManualExtra !== 0) && (
                            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "10px" }}>
                                {photoCount > 0 && (
                                    <button
                                        onClick={() => removeLastPhotoLog(p.id)}
                                        title="Quitar solo la última foto cronometrada (ej. un 'Foto lista' de más)"
                                        style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "2px", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.66rem", fontWeight: 700 }}
                                    >
                                        <TimerReset size={12} /> Quitar última
                                    </button>
                                )}
                                <button
                                    onClick={() => setConfirmResetPhotos(true)}
                                    title="Reiniciar todo el contador de fotos"
                                    style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "2px", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.66rem", fontWeight: 700 }}
                                >
                                    <TimerReset size={12} /> Reiniciar todo
                                </button>
                            </div>
                        )}
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
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
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
                </details>
            )}
            </div>

            {/* Fases: colapsable — abierta de entrada si hay pasos pendientes o
                todavía no se aplicó ninguna plantilla, cerrada si ya están todas
                hechas. El usuario puede abrir/cerrar a mano en cualquier momento. */}
            {p.status !== 'completado' && (
                <details open={fasesDetailsOpen} onToggle={e => setFasesDetailsOpen(e.currentTarget.open)} style={{ background: C.surfaceContainerLow, borderRadius: "10px", padding: "8px 10px" }}>
                    <summary style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "4px", cursor: "pointer", listStyle: "none" }}>
                        <span style={{ fontSize: "0.66rem", fontWeight: 800, color: C.onSurfaceVariant, display: "flex", alignItems: "center", gap: "4px", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                            <ListChecks size={12} /> Fases
                        </span>
                        {!!p.fases?.length && (
                            <span style={{ fontSize: "0.68rem", fontWeight: 700, color: C.onSurfaceVariant }}>
                                {p.fases.filter(f => f.done).length}/{p.fases.length}
                            </span>
                        )}
                    </summary>
                    <div style={{ marginTop: "8px" }}>
                        {!p.fases?.length ? (
                            phaseTemplates.length > 0 ? (
                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                    <select
                                        value={selectedTemplateId}
                                        onChange={e => setSelectedTemplateId(Number(e.target.value))}
                                        style={{ flex: 1, minWidth: "120px", border: `1px solid ${C.outlineVariant}`, borderRadius: "8px", padding: "5px 8px", fontSize: "0.74rem", fontFamily: "inherit", background: "white", color: C.onSurfaceVariant }}
                                    >
                                        {phaseTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    <button
                                        onClick={() => selectedTemplateId && applyFaseTemplate(p.id, selectedTemplateId)}
                                        style={{ background: "white", border: `1px solid ${C.outlineVariant}`, borderRadius: "8px", padding: "5px 12px", cursor: "pointer", fontSize: "0.74rem", fontWeight: 700, color: C.onSurfaceVariant }}
                                    >
                                        Aplicar
                                    </button>
                                </div>
                            ) : (
                                <span style={{ fontSize: "0.72rem", color: C.outline }}>Sin plantillas de fases todavía — créalas arriba.</span>
                            )
                        ) : (
                            <StageGroups
                                items={p.fases}
                                currentStage={linkedEvent?.notionEstado}
                                addPlaceholder="Agregar paso a esta etapa..."
                                onAdd={(label, stage) => addProjectFase(p.id, label, stage)}
                                renderRow={f => (
                                    <FaseRow
                                        key={f.id}
                                        projectId={p.id}
                                        fase={f}
                                        toggleProjectFase={toggleProjectFase}
                                        removeProjectFase={removeProjectFase}
                                        setProjectFaseStage={setProjectFaseStage}
                                        startFaseTimer={startFaseTimer}
                                        pauseFaseTimer={pauseFaseTimer}
                                        finishFaseTimer={finishFaseTimer}
                                    />
                                )}
                            />
                        )}
                    </div>
                </details>
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
