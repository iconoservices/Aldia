import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ChevronLeft, ChevronRight, CalendarDays, Filter, Trash2, Star, Plus, Package, Camera, RefreshCw, Loader2, X, Target, AlertTriangle } from 'lucide-react';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Envoltorio sortable de FOCO: la fila/cabecera entera es el asa de arrastre
// (se le pasan ref + estilo + handleProps). Un tap normal sigue funcionando
// gracias al activationConstraint de distancia del sensor.
const FocoSortable = ({ id, children }: {
    id: string;
    children: (h: { ref: (n: HTMLElement | null) => void; style: React.CSSProperties; handleProps: Record<string, unknown> }) => React.ReactNode;
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    return <>{children({
        ref: setNodeRef,
        style: { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, position: 'relative', zIndex: isDragging ? 5 : undefined, touchAction: 'none' },
        handleProps: { ...attributes, ...listeners },
    })}</>;
};

interface TimelineAgendaViewProps {
    calendarEvents: any[];
    projects: any[];
    rutinas?: any[];
    habits?: any[];
    onRemoveEvent?: (id: number) => void;
    missions?: any[];
    onToggleMission?: (id: number) => void;
    updateRoutine?: (id: number, updates: Record<string, any>) => void;
    updateCalendarEvent?: (id: number, updates: Record<string, any>) => void;
    addRoutine?: (title: string, color?: string, startTime?: string, endTime?: string, repeatDays?: number[]) => void;
    addCalendarEvent?: (title: string, date: string, startTime: string, endTime: string, description: string) => void;
    dailyBlocks?: any[];
    addDailyBlock?: (label: string, period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro', date: string, completed?: boolean, projectId?: number, repeatDays?: number[]) => void;
    toggleDailyBlock?: (id: number) => void;
}

const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const PERIOD_TIME: Record<string, string> = { 'Mañana': '07:00', 'Tarde': '13:00', 'Noche': '19:00', 'Otro': '23:00' };

// Botón de las cabeceras del calendario — mismo tamaño en todos lados (header
// principal y cabecera del panel derecho). `HDR_ICON` es el tamaño de icono que
// les corresponde; para los que llevan texto (HOY, "1d") se le suma padding-x.
const HDR_ICON = 16;
const hdrBtn: React.CSSProperties = {
    background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '6px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s', flexShrink: 0, color: '#64748B',
};
const hdrBtnText: React.CSSProperties = { ...hdrBtn, padding: '6px 10px', fontSize: '0.65rem', fontWeight: 900, lineHeight: `${HDR_ICON}px` };

// Color de un chip de entrega: verde si todavía no vence, rojo si la fecha ya
// pasó y sigue sin entregarse (el llamador ya filtra las que están en
// "Entregado"). `fallback` deja pasar el color propio del proyecto para las
// entregas que no son de Notion mientras no estén atrasadas.
const ENTREGA_VERDE = '#059669';
const ENTREGA_ATRASADA = '#DC2626';
const REAL_HOY = () => new Date().toLocaleDateString('en-CA');
const colorEntrega = (fecha: string, fallback: string = ENTREGA_VERDE) => (fecha && fecha < REAL_HOY() ? ENTREGA_ATRASADA : fallback);

// Color de una sesión de Notion en el calendario. Futura o de hoy: negro. Ya
// pasó y sigue "Agendado" (nadie la movió a Realizado): ámbar, avisa que el
// estado quedó sin actualizar o que quizás no se hizo. Ya pasó y sí avanzó de
// estado: gris — es historial, solo referencia.
const SESION_NEGRO = '#191919';
const colorSesionNotion = (fecha: string, estado: string | undefined) => {
    if (!fecha || fecha >= REAL_HOY()) return SESION_NEGRO;
    return estado === 'Agendado' ? '#D97706' : '#94A3B8';
};

export const TimelineAgendaView = ({
    calendarEvents, projects = [], rutinas = [], missions = [], habits = [], dailyBlocks = [],
    onRemoveEvent, onToggleMission, updateRoutine, updateCalendarEvent, addRoutine, addCalendarEvent,
    addDailyBlock, toggleDailyBlock
}: TimelineAgendaViewProps) => {
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    const [viewMode, setViewMode] = useState<'timeline' | 'month' | 'appointments' | 'tasks'>('month');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editingItem, setEditingItem] = useState<{ type: 'calendar' | 'routine' | 'timeblock' | 'new', data: any } | null>(null);
    // Arranca oculto: el usuario todavía no decidió cómo ordenar este panel
    // (mini-calendario + Categorías + Notion). Se abre con el botón de la cabecera.
    const [sidebarOpen, setSidebarOpen] = useState(false);
    // Al entrar al Calendario: vista Mes + panel derecho abierto en modo FOCO
    // (atrasadas / próximas entregas / agenda / checklist).
    const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
    const [rightPanelMode, setRightPanelMode] = useState<'citas' | 'rutinas' | 'tareas' | 'habitos' | 'mision' | 'foco'>('foco');
    // Qué secciones de FOCO están expandidas (por defecto se ven solo las 3
    // primeras filas de cada una + un "ver más").
    const [focoExpandido, setFocoExpandido] = useState<Record<string, boolean>>({});
    // Orden manual de FOCO: `secs` = orden de las secciones, `rows[k]` = orden de
    // las filas de esa sección. Vacío = orden por fecha (auto). Se guarda al
    // arrastrar; no hay modo aparte, FOCO se ve siempre igual.
    type FocoManual = { secs: string[]; rows: Record<string, string[]> };
    const [focoManual, setFocoManual] = useState<FocoManual>(() => {
        try {
            const v = JSON.parse(localStorage.getItem('aldia_foco_manual') || 'null');
            if (v && typeof v === 'object') return { secs: Array.isArray(v.secs) ? v.secs : [], rows: v.rows || {} };
        } catch { /* nada */ }
        return { secs: [], rows: {} };
    });
    const focoTieneOrden = focoManual.secs.length > 0 || Object.keys(focoManual.rows).length > 0;
    const actualizarFocoManual = (updater: (prev: FocoManual) => FocoManual) => {
        setFocoManual(prev => {
            const next = updater(prev);
            try { localStorage.setItem('aldia_foco_manual', JSON.stringify(next)); } catch { /* nada */ }
            return next;
        });
    };
    // Un tirón corto (6px) antes de arrastrar, así un tap normal sigue abriendo
    // el detalle de la fila.
    const focoSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
    const [activeFilters, setActiveFilters] = useState({
        citas: true,
        rutinas: true,
        tareas: true,
        habitos: true,
        mision: true,
        agenda: true,
        entregas: true
    });
    // Interruptor general de Notion (abajo, solito). Apagado = oculta todo lo
    // que viene de Notion (sesiones + entregas), sin importar los filtros de
    // arriba. Encenderlo dispara una sincronizacion. Es aparte de los filtros
    // porque Notion lo usan varias pestañas, no solo el calendario.
    const [notionOn, setNotionOn] = useState(true);
    const [notionSyncing, setNotionSyncing] = useState(false);
    const [notionSyncMsg, setNotionSyncMsg] = useState<string | null>(null);

    const syncNotion = async () => {
        setNotionSyncing(true);
        setNotionSyncMsg(null);
        try {
            const res = await fetch('/api/sync-notion-now', { method: 'POST' });
            const raw = await res.text();
            const data = raw ? JSON.parse(raw) : {};
            if (!res.ok) throw new Error(data?.error || 'error');
            setNotionSyncMsg(`Listo: ${data.added ?? 0} nueva(s), ${data.updated ?? 0} actualizada(s).`);
        } catch (err) {
            console.error('No se pudo sincronizar con Notion:', err);
            setNotionSyncMsg('No se pudo sincronizar. Intenta de nuevo.');
        } finally {
            setNotionSyncing(false);
        }
    };

    const toggleNotion = () => {
        setNotionOn(prev => {
            const next = !prev;
            if (next) syncNotion();
            return next;
        });
    };
    
    // Estado para edición
    const [editTitle, setEditTitle] = useState('');
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [editRepeatDays, setEditRepeatDays] = useState<number[]>([]);
    const [editDate, setEditDate] = useState('');
    const [newItemType, setNewItemType] = useState<'routine' | 'calendar'>('routine');
    const [saveToNotion, setSaveToNotion] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    // Formato YYYY-MM-DD local para comparación con eventos e identificación de día
    const todayStr = selectedDate.toLocaleDateString('en-CA');

    // Sincronizar estado de edición al abrir el modal
    useEffect(() => {
        if (editingItem) {
            const { type, data } = editingItem;
            if (type === 'calendar') {
                setEditTitle(data.title || '');
                setEditStartTime(data.startTime || '');
                setEditEndTime(data.endTime || '');
                setEditDate(data.date || todayStr);
            } else if (type === 'routine') {
                setEditTitle(data.title || '');
                setEditStartTime(data.startTime || '');
                setEditEndTime(data.endTime || '');
                setEditRepeatDays(data.repeatDays || []);
            } else if (type === 'timeblock') {
                setEditTitle(data.label || '');
            } else if (type === 'new') {
                setEditTitle('');
                setEditStartTime('09:00');
                setEditEndTime('10:00');
                setEditRepeatDays([0, 1, 2, 3, 4, 5, 6]);
                setEditDate(todayStr);
                setSaveToNotion(false);
            }
        }
    }, [editingItem, todayStr]);

    const saveEditingItem = () => {
        if (!editingItem) return;
        const { type, data } = editingItem;
        const title = editTitle.trim();
        if (!title) return;
        if (type === 'calendar') {
            updateCalendarEvent?.(data.id, { title, startTime: editStartTime, endTime: editEndTime, date: editDate });
        } else if (type === 'routine') {
            updateRoutine?.(data.id, { title, startTime: editStartTime, endTime: editEndTime, repeatDays: editRepeatDays });
        } else if (type === 'new' && newItemType === 'routine') {
            addRoutine?.(title, undefined, editStartTime, editEndTime, editRepeatDays);
        } else if (type === 'new' && newItemType === 'calendar') {
            addCalendarEvent?.(title, editDate, editStartTime, editEndTime, '');
            if (saveToNotion) {
                fetch('/api/create-notion-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, date: editDate, startTime: editStartTime, endTime: editEndTime })
                }).catch(err => console.error('No se pudo guardar en Notion:', err));
            }
        }
        setEditingItem(null);
    };

    const dayIdx = (selectedDate.getDay() + 6) % 7; // 0=Lunes, ..., 6=Domingo
    const isActualToday = todayStr === new Date().toLocaleDateString('en-CA');
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const scrollToNow = () => {
        const container = scrollRef.current;
        if (!container) return;
        const now = new Date();
        // 60px por hora, offset para centrar la línea roja
        const targetPx = Math.max(0, (now.getHours() * 60 + now.getMinutes()) - 80);
        container.scrollTop = targetPx;
    };

    // 1. Auto-scroll al momento actual — dispara en mount y al cambiar de vista
    useEffect(() => {
        if (viewMode !== 'timeline' || !isActualToday) return;

        // Primer intento inmediato
        scrollToNow();
        // Segundo intento diferido (asegura que el DOM está pintado)
        const timer = setTimeout(scrollToNow, 300);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, isActualToday]);

    // 2. Navegación
    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
    };

    // Swipe horizontal para navegar entre días en la vista mobile (timeline de un solo día)
    const handleTouchStart = (e: React.TouchEvent) => {
        const t = e.touches[0];
        touchStartRef.current = { x: t.clientX, y: t.clientY };
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        const start = touchStartRef.current;
        touchStartRef.current = null;
        if (!start) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // gesto mayormente vertical o muy corto: ignorar
        changeDate(dx < 0 ? 1 : -1);
    };

    const changeMonth = (months: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(selectedDate.getMonth() + months);
        setSelectedDate(newDate);
    };

    // Helper: convierte "HH:MM" a minutos desde medianoche
    const toMin = (t?: string) => {
        if (!t) return -1;
        const [hh, mm] = t.split(':').map(Number);
        return hh * 60 + (mm || 0);
    };

    // 3. Filtrar entregas del proyecto para el día seleccionado
    const dayDeliveries = useMemo(() => {
        if (!activeFilters.entregas) return [];
        const delivs: any[] = [];
        projects.forEach(p => {
            (p.objectives || []).forEach((obj: any) => {
                if (obj.deliveryDate === todayStr) {
                    delivs.push({ ...obj, projectColor: p.color });
                }
            });
        });
        return delivs;
    }, [projects, todayStr, activeFilters.entregas]);

    // 4. Eventos y Misiones con hora
    const dayEvents = useMemo(() => {
        const items = (calendarEvents || [])
            .filter(e => e.date === todayStr)
            .filter(e => (e.notionId ? (activeFilters.agenda && notionOn) : activeFilters.citas))
            .map(e => ({
                ...e,
                itemType: 'event',
                color: e.notionId ? colorSesionNotion(e.date, e.notionEstado) : (e.color || '#3b82f6'),
                startMin: toMin(e.startTime),
                endMin: toMin(e.endTime)
            }));
        return items.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    }, [calendarEvents, todayStr, activeFilters.citas, activeFilters.agenda, notionOn]);

    // 5.1 Misiones (Tareas)
    const dayMissions = useMemo(() => {
        if (!activeFilters.tareas) return [];
        const dayMissionsList = (missions || []).filter(m => {
            if (m.dueDate === todayStr) return true;
            if (m.repeatDays?.includes(dayIdx)) return true;
            return false;
        }).map(m => ({ ...m, type: 'mission' }));
        return dayMissionsList.sort((a, b) => (a.dueTime || '99:99').localeCompare(b.dueTime || '99:99'));
    }, [missions, todayStr, dayIdx, activeFilters.tareas]);

    // 5.2 Rutinas del día (Para el Panel Inspector)
    const dayRoutines = useMemo(() => {
        if (!activeFilters.rutinas) return [];
        const rts = (rutinas || []).filter((r: any) => r.repeatDays?.includes(dayIdx));
        return rts.sort((a: any, b: any) => (a.startTime || '').localeCompare(b.startTime || ''));
    }, [rutinas, dayIdx, activeFilters.rutinas]);

    // 5.3 Hábitos del día (Para el Panel Inspector)
    const dayHabits = useMemo(() => {
        if (!activeFilters.habitos) return [];
        const hbs = (habits || []).filter((h: any) => h.schedule?.includes(dayIdx));
        return hbs.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
    }, [habits, dayIdx, activeFilters.habitos]);

    // 5.4 Tareas del Checklist para el día seleccionado (misma deducción que ChecklistDiario:
    // dailyBlocks mezcla plantilla + registro, así que la tarea "existe hoy" si su repeatDays
    // incluye este día, o si no tiene repeatDays y ya se registró alguna vez).
    const dayChecklistTasks = useMemo(() => {
        const keys = new Set<string>();
        const templates: { label: string; period: string; repeatDays?: number[] }[] = [];
        (dailyBlocks || []).forEach((b: any) => {
            const k = `${b.label.toLowerCase()}||${b.period}`;
            if (!keys.has(k)) {
                keys.add(k);
                templates.push({ label: b.label, period: b.period, repeatDays: b.repeatDays });
            } else if (b.repeatDays?.length) {
                const ex = templates.find(t => `${t.label.toLowerCase()}||${t.period}` === k);
                if (ex && !ex.repeatDays?.length) ex.repeatDays = b.repeatDays;
            }
        });
        return templates
            .filter(t => t.repeatDays ? t.repeatDays.includes(dayIdx) : true)
            .map(t => {
                const record = (dailyBlocks || []).find((b: any) => b.label.toLowerCase() === t.label.toLowerCase() && b.period === t.period && b.date === todayStr);
                return { id: record?.id, label: t.label, period: t.period, completed: !!record?.completed, repeatDays: t.repeatDays };
            });
    }, [dailyBlocks, dayIdx, todayStr]);

    // 5.5 Vista FOCO — "lo primero que necesito de cada cosa", agrupado por tipo
    // y SIEMPRE contra el día real (no el seleccionado): entregas atrasadas,
    // próximas entregas, próximos eventos de agenda y el checklist de hoy.
    const focoData = useMemo(() => {
        const hoy = new Date().toLocaleDateString('en-CA');
        const enDias = (a: string) => Math.round((new Date(a + 'T00:00:00').getTime() - new Date(hoy + 'T00:00:00').getTime()) / 86400000);
        const limite = (() => { const d = new Date(); d.setDate(d.getDate() + 21); return d.toLocaleDateString('en-CA'); })();

        type Entrega = { id: string; title: string; date: string; dias: number; color: string; raw: any };
        const entregas: Entrega[] = [];
        (calendarEvents || []).forEach((e: any) => {
            if (!e.notionId || !e.notionEntregaFecha || e.notionEstado === 'Entregado') return;
            entregas.push({ id: `fe-${e.id}`, title: e.title, date: e.notionEntregaFecha, dias: enDias(e.notionEntregaFecha), color: colorEntrega(e.notionEntregaFecha), raw: e });
        });
        (projects || []).forEach((p: any) => (p.objectives || []).forEach((obj: any) => {
            if (!obj.deliveryDate || obj.completed || obj.done) return;
            entregas.push({ id: `fo-${obj.id ?? obj.title}`, title: obj.title, date: obj.deliveryDate, dias: enDias(obj.deliveryDate), color: colorEntrega(obj.deliveryDate, p.color || ENTREGA_VERDE), raw: null });
        }));
        entregas.sort((a, b) => a.date.localeCompare(b.date));

        const atrasadas = entregas.filter(x => x.date < hoy);
        const proximas = entregas.filter(x => x.date >= hoy && x.date <= limite);

        const eventos = (calendarEvents || [])
            .filter((e: any) => e.date && e.date >= hoy && (e.notionId ? notionOn : true))
            .sort((a: any, b: any) => (a.date + (a.startTime || '99:99')).localeCompare(b.date + (b.startTime || '99:99')))
            .slice(0, 10)
            .map((e: any) => ({ id: `fv-${e.id}`, title: e.title, date: e.date, time: e.startTime, dias: enDias(e.date), isNotion: !!e.notionId, color: e.notionId ? colorSesionNotion(e.date, e.notionEstado) : (e.color || '#6366F1'), raw: e }));

        // checklist de hoy real (misma deducción plantilla+registro que dayChecklistTasks)
        const hoyIdx = (new Date().getDay() + 6) % 7;
        const keys = new Set<string>();
        const templates: { label: string; period: string; repeatDays?: number[] }[] = [];
        (dailyBlocks || []).forEach((b: any) => {
            const k = `${b.label.toLowerCase()}||${b.period}`;
            if (!keys.has(k)) { keys.add(k); templates.push({ label: b.label, period: b.period, repeatDays: b.repeatDays }); }
        });
        const checklist = templates
            .filter(t => t.repeatDays ? t.repeatDays.includes(hoyIdx) : true)
            .map(t => {
                const rec = (dailyBlocks || []).find((b: any) => b.label.toLowerCase() === t.label.toLowerCase() && b.period === t.period && b.date === hoy);
                return { id: rec?.id as number | undefined, label: t.label, period: t.period, completed: !!rec?.completed };
            })
            .filter(t => !t.completed);

        return { atrasadas, proximas, eventos, checklist };
    }, [calendarEvents, projects, dailyBlocks, notionOn]);

    // Contenido de FOCO — se renderiza dentro del panel lateral derecho
    // (rightPanelMode === 'foco'), no como pantalla completa.
    const renderFoco = () => {
        const LIMITE = 3;
        const diasLabel = (d: number) => d < 0 ? `hace ${Math.abs(d)} d${Math.abs(d) === 1 ? 'ía' : 'ías'}` : d === 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`;
        const { atrasadas, proximas, eventos, checklist } = focoData;

        const idCheck = (t: any) => `${t.label}||${t.period}`;
        // Aplica el orden guardado para esa sección (si hay); lo que no esté, al final.
        const ordenar = <T,>(items: T[], idOf: (t: T) => string, key: string): T[] => {
            const ord = focoManual.rows[key] || [];
            if (!ord.length) return items;
            const pos = new Map(ord.map((id, i) => [String(id), i]));
            return [...items].sort((a, b) => (pos.has(idOf(a)) ? pos.get(idOf(a))! : 1e9) - (pos.has(idOf(b)) ? pos.get(idOf(b))! : 1e9));
        };

        const secDefs = [
            { k: 'atrasadas', icon: <AlertTriangle size={15} color="#DC2626" />, title: 'Entregas atrasadas', tint: '#DC2626', empty: 'Nada atrasado 🎉', kind: 'entrega' as const, items: ordenar(atrasadas, (x: any) => String(x.id), 'atrasadas') },
            { k: 'proximas', icon: <Package size={15} color="#059669" />, title: 'Próximas entregas', tint: '#059669', empty: 'Nada en las próximas 3 semanas', kind: 'entrega' as const, items: ordenar(proximas, (x: any) => String(x.id), 'proximas') },
            { k: 'eventos', icon: <Calendar size={15} color="#6366F1" />, title: 'Agenda · próximos eventos', tint: '#6366F1', empty: 'Sin eventos próximos', kind: 'evento' as const, items: ordenar(eventos, (x: any) => String(x.id), 'eventos') },
            { k: 'checklist', icon: <Clock size={15} color="#F59E0B" />, title: 'Checklist de hoy', tint: '#F59E0B', empty: 'Todo listo por hoy ✅', kind: 'check' as const, items: ordenar(checklist, idCheck, 'checklist') },
        ];
        const secOf = (k: string) => secDefs.find(s => s.k === k)!;
        const orderedSecs = focoManual.secs.length
            ? [...secDefs].sort((a, b) => {
                const pa = focoManual.secs.indexOf(a.k); const pb = focoManual.secs.indexOf(b.k);
                return (pa === -1 ? 1e9 : pa) - (pb === -1 ? 1e9 : pb);
            })
            : secDefs;
        const idOfSec = (s: typeof secDefs[number]) => (x: any) => s.kind === 'check' ? idCheck(x) : String(x.id);

        const onDragEnd = (e: DragEndEvent) => {
            const a = String(e.active.id), o = e.over ? String(e.over.id) : '';
            if (!o || a === o) return;
            if (a.startsWith('sec§') && o.startsWith('sec§')) {
                const cur = orderedSecs.map(s => s.k);
                actualizarFocoManual(p => ({ ...p, secs: arrayMove(cur, cur.indexOf(a.slice(4)), cur.indexOf(o.slice(4))) }));
            } else if (a.startsWith('row§') && o.startsWith('row§')) {
                const [, ak, aid] = a.split('§'); const [, ok, oid] = o.split('§');
                if (ak !== ok) return;
                const cur = secOf(ak).items.map(idOfSec(secOf(ak)));
                actualizarFocoManual(p => ({ ...p, rows: { ...p.rows, [ak]: arrayMove(cur, cur.indexOf(aid), cur.indexOf(oid)) } }));
            }
        };

        const rowContent = (s: typeof secDefs[number], it: any) => {
            if (s.kind === 'check') return {
                onClick: () => it.id && toggleDailyBlock?.(it.id),
                borderLeft: undefined as string | undefined,
                node: <>
                    <span style={{ width: '15px', height: '15px', borderRadius: '5px', border: '2px solid #E2E8F0', flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94A3B8', flexShrink: 0 }}>{it.period.toUpperCase()}</span>
                </>,
            };
            const right = s.kind === 'evento' ? `${it.time ? it.time + ' · ' : ''}${diasLabel(it.dias)}` : diasLabel(it.dias);
            return {
                onClick: it.raw ? () => setEditingItem({ type: 'calendar', data: it.raw }) : undefined,
                borderLeft: it.color as string,
                node: <>
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: it.color, whiteSpace: 'nowrap', flexShrink: 0 }}>{right}</span>
                </>,
            };
        };
        const rowBox = (bl?: string): React.CSSProperties => ({
            display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #F1F5F9',
            borderLeft: bl ? `4px solid ${bl}` : '1px solid #F1F5F9', borderRadius: '10px', padding: '8px 10px',
        });

        const renderSeccion = (s: typeof secDefs[number], headerHandle: Record<string, unknown>) => {
            const abierto = !!focoExpandido[s.k];
            const visibles = abierto ? s.items : s.items.slice(0, LIMITE);
            const resto = s.items.length - visibles.length;
            const idOf = idOfSec(s);
            const rows = visibles.map((it: any) => {
                const rid = `row§${s.k}§${idOf(it)}`;
                const c = rowContent(s, it);
                return (
                    <FocoSortable key={rid} id={rid}>
                        {({ ref, style, handleProps }) => (
                            // toda la fila es el asa; el tap sigue abriendo el detalle
                            <div ref={ref} {...handleProps} onClick={c.onClick} style={{ ...rowBox(c.borderLeft), ...style, cursor: c.onClick ? 'pointer' : 'grab' }}>
                                {c.node}
                            </div>
                        )}
                    </FocoSortable>
                );
            });
            return (
                <div>
                    <div {...headerHandle} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '7px', cursor: 'grab' }}>
                        {s.icon}
                        <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{s.title}</span>
                        {s.items.length > 0 && <span style={{ fontSize: '0.64rem', fontWeight: 800, color: s.tint, background: `${s.tint}1a`, borderRadius: '999px', padding: '1px 7px' }}>{s.items.length}</span>}
                    </div>
                    {s.items.length === 0
                        ? <div style={{ fontSize: '0.72rem', color: '#94A3B8', paddingLeft: '22px' }}>{s.empty}</div>
                        : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <SortableContext items={visibles.map((it: any) => `row§${s.k}§${idOf(it)}`)} strategy={verticalListSortingStrategy}>{rows}</SortableContext>
                                {(resto > 0 || abierto) && (
                                    <button onClick={() => setFocoExpandido(e => ({ ...e, [s.k]: !abierto }))}
                                        style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: s.tint, fontSize: '0.68rem', fontWeight: 800, padding: '2px 2px' }}>
                                        {abierto ? 'ver menos' : `ver ${resto} más`}
                                    </button>
                                )}
                            </div>
                        )}
                </div>
            );
        };

        return (
            <div style={{ padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {focoTieneOrden && (
                    <button onClick={() => actualizarFocoManual(() => ({ secs: [], rows: {} }))}
                        style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '0.66rem', fontWeight: 800, padding: 0 }}>
                        ↺ orden por fecha
                    </button>
                )}
                <DndContext sensors={focoSensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={orderedSecs.map(s => `sec§${s.k}`)} strategy={verticalListSortingStrategy}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {orderedSecs.map(s => (
                                <FocoSortable key={s.k} id={`sec§${s.k}`}>
                                    {({ ref, style, handleProps }) => <div ref={ref} style={style}>{renderSeccion(s, handleProps)}</div>}
                                </FocoSortable>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        );
    };

    // 6. Vista Mensual Logic
    const monthDays = useMemo(() => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const padding = firstDay === 0 ? 6 : firstDay - 1;
        return {
            padding: Array.from({ length: padding }),
            days: Array.from({ length: daysInMonth }).map((_, i) => i + 1)
        };
    }, [selectedDate]);

    // 7. SEMANA (Timeline days)
    const weekDays = useMemo(() => {
        const days = [];
        const start = new Date(selectedDate);
        const day = selectedDate.getDay();
        const diff = selectedDate.getDate() - (day === 0 ? 6 : day - 1);
        start.setDate(diff);

        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const dStr = d.toLocaleDateString('en-CA');
            const dIdx = (d.getDay() + 6) % 7;

            // Filtrar eventos y rutinas para este día específico de la semana
            const evs = (calendarEvents || [])
                .filter(e => e.date === dStr)
                .filter(e => (e.notionId ? (activeFilters.agenda && notionOn) : activeFilters.citas))
                .map(e => ({
                    ...e,
                    startMin: toMin(e.startTime),
                    endMin: toMin(e.endTime),
                    color: e.notionId ? colorSesionNotion(dStr, e.notionEstado) : (e.color || '#6366F1')
                }));

            const rts = !activeFilters.rutinas ? [] : (rutinas || []).filter(r => r.repeatDays?.includes(dIdx));
            const hbs = !activeFilters.habitos ? [] : (habits || []).filter(h => h.schedule?.includes(dIdx));

            // Entregas de ese día (sin hora): las de sesiones de Notion y las de
            // objetivos de proyecto. Van en una franja arriba de la columna, no
            // en una hora concreta.
            const dels: any[] = [];
            if (activeFilters.entregas && notionOn) {
                (calendarEvents || []).forEach(e => {
                    if (e.notionId && e.notionEntregaFecha === dStr && e.notionEstado !== 'Entregado') {
                        dels.push({ id: `entrega-${e.id}`, title: e.title, color: colorEntrega(dStr), raw: e });
                    }
                });
            }
            if (activeFilters.entregas) {
                projects.forEach(p => (p.objectives || []).forEach((obj: any) => {
                    if (obj.deliveryDate === dStr) dels.push({ id: `obj-${obj.id ?? obj.title}`, title: obj.title, color: colorEntrega(dStr, p.color || ENTREGA_VERDE), raw: null });
                }));
            }

            days.push({
                date: d,
                dateStr: dStr,
                dayIdx: dIdx,
                isToday: dStr === new Date().toLocaleDateString('en-CA'),
                isSelected: dStr === selectedDate.toLocaleDateString('en-CA'),
                evs,
                rts,
                hbs,
                dels
            });
        }
        return days;
    }, [selectedDate, calendarEvents, rutinas, habits, projects, activeFilters, notionOn]);

    // 7.1 MES — eventos por día del mes visible (citas + sesiones de Notion),
    // para que la vista Mes no sea solo números: aquí es donde se ve "la agenda"
    // (lo que viene de Notion) de un vistazo, sin entrar día por día.
    const monthEventsByDate = useMemo(() => {
        const map: Record<string, any[]> = {};
        (calendarEvents || [])
            .filter(e => e.notionId ? (activeFilters.agenda && notionOn) : activeFilters.citas)
            .forEach(e => {
                if (!e.date) return;
                (map[e.date] ||= []).push({
                    id: e.id,
                    title: e.title,
                    startTime: e.startTime,
                    endTime: e.endTime,
                    isNotion: !!e.notionId,
                    color: e.notionId ? colorSesionNotion(e.date, e.notionEstado) : (e.color || '#6366F1'),
                    raw: e,
                });
            });
        // Entregas de sesiones de Notion (fecha de entrega calculada allá)
        if (activeFilters.entregas && notionOn) {
            (calendarEvents || []).forEach(e => {
                if (!e.notionId || !e.notionEntregaFecha || e.notionEstado === 'Entregado') return;
                (map[e.notionEntregaFecha] ||= []).push({
                    id: `entrega-${e.id}`,
                    title: `Entrega · ${e.title}`,
                    startTime: '',
                    endTime: '',
                    isNotion: true,
                    isDelivery: true,
                    color: colorEntrega(e.notionEntregaFecha),
                    raw: e,
                });
            });
        }
        // Entregas de proyectos (mismas que muestra la barra superior del timeline)
        if (activeFilters.entregas) {
            projects.forEach(p => {
                (p.objectives || []).forEach((obj: any) => {
                    if (!obj.deliveryDate) return;
                    (map[obj.deliveryDate] ||= []).push({
                        id: `obj-${obj.id ?? obj.title}`,
                        title: `Entrega · ${obj.title}`,
                        startTime: '',
                        endTime: '',
                        isDelivery: true,
                        color: colorEntrega(obj.deliveryDate, p.color || ENTREGA_VERDE),
                        raw: null,
                    });
                });
            });
        }
        Object.values(map).forEach(list => list.sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99')));
        return map;
    }, [calendarEvents, projects, activeFilters.agenda, activeFilters.entregas, activeFilters.citas, notionOn]);

    const currentTime = new Date();
    const currentPos = (currentTime.getHours() * 60) + currentTime.getMinutes();

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    // Render Mini Calendar Helper
    const renderMiniCalendar = () => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const padding = firstDay === 0 ? 6 : firstDay - 1;
        
        const days = Array.from({ length: 42 }).map((_, i) => {
            const dayNum = i - padding + 1;
            const d = new Date(year, month, dayNum);
            const isToday = d.toDateString() === new Date().toDateString();
            const isSelected = d.toDateString() === selectedDate.toDateString();
            const isCurrentMonth = d.getMonth() === month;

            if (dayNum < 1 || dayNum > daysInMonth) return <div key={i} />;

            return (
                <div 
                    key={i} 
                    onClick={() => setSelectedDate(d)}
                    className={`mini-date-cell ${isSelected ? 'selected' : ''}`}
                    style={{ 
                        width: '24px', height: '24px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px',
                        fontSize: '0.75rem', cursor: 'pointer',
                        background: isSelected ? 'var(--domain-orange)' : (isToday ? '#FFF7ED' : 'transparent'),
                        color: !isCurrentMonth ? '#CBD5E1' : isSelected ? 'white' : (isToday ? 'var(--domain-orange)' : '#64748B'),
                        fontWeight: isToday || isSelected ? 900 : 700
                    }}
                >
                    {dayNum}
                </div>
            );
        });

        return (
            <div style={{ padding: '0 4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{monthNames[month]} {year}</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => changeMonth(-1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}><ChevronLeft size={14} /></button>
                        <button onClick={() => changeMonth(1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}><ChevronRight size={14} /></button>
                    </div>
                </div>
                <div className="mini-calendar-grid">
                    {dayNames.map(d => <div key={d} style={{ fontSize: '0.6rem', color: '#94A3B8', textAlign: 'center', fontWeight: 900 }}>{d[0]}</div>)}
                    {days}
                </div>
            </div>
        );
    };

    return (
        <div className="agenda-layout-container">
            {/* Sidebar PC Only — va a la derecha (order 2, después del main);
                se reordena por CSS `order` sin tocar el DOM. */}
            <aside
                className={`agenda-sidebar ${!sidebarOpen ? 'collapsed' : ''}`}
                style={{ order: 2, borderRight: 'none', borderLeft: '1px solid #E2E8F0' }}
            >
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--domain-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Calendar size={18} />
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-carbon)' }}>Agenda Central</div>
                </div>

                <div style={{ padding: '4px 0', borderBottom: '1px solid #F1F5F9' }}>
                    {renderMiniCalendar()}
                </div>

                <div className="sidebar-section-title" style={{ marginTop: '0px', marginBottom: '8px' }}>Categorías</div>
                <div style={{ padding: '0 8px' }}>
                    {[
                        { key: 'mision', label: 'Misión Diaria (Timeline)', color: 'var(--domain-orange)', icon: <Star size={14} />, type: 'UNIFICADO' },
                        { key: 'tareas', label: 'Tareas', color: '#F59E0B', icon: <Filter size={14} />, type: 'MICRO' },
                        { key: 'citas', label: 'Citas y Eventos', color: '#6366F1', icon: <Clock size={14} />, type: 'MACRO' },
                        { key: 'rutinas', label: 'Rutinas / Bloques', color: '#10B981', icon: <CalendarDays size={14} />, type: 'MACRO' },
                        { key: 'habitos', label: 'Hábitos (Habits)', color: '#EC4899', icon: <CalendarDays size={14} />, type: 'MICRO' },
                    ].map(f => (
                        <div
                            key={f.key}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: rightSidebarOpen && rightPanelMode === f.key ? `${f.color}15` : 'transparent',
                                border: rightSidebarOpen && rightPanelMode === f.key ? `1px solid ${f.color}30` : '1px solid transparent',
                                marginBottom: '2px',
                                opacity: activeFilters[f.key as keyof typeof activeFilters] ? 1 : 0.6,
                                transition: 'all 0.2s'
                            }}
                        >
                            <div
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}
                                onClick={() => { setRightPanelMode(f.key as any); setRightSidebarOpen(true); }}
                            >
                                <div style={{ color: f.color }}>{f.icon}</div>
                                <span style={{ fontSize: '0.75rem', fontWeight: rightSidebarOpen && rightPanelMode === f.key ? 900 : 800, color: '#475569' }}>{f.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.55rem', fontWeight: 900, color: f.color, opacity: 0.8 }}>{f.type}</span>
                                <div
                                    onClick={(e) => { e.stopPropagation(); setActiveFilters(prev => ({ ...prev, [f.key]: !prev[f.key as keyof typeof prev] })); }}
                                    style={{ width: '13px', height: '13px', borderRadius: '4px', border: `1px solid ${activeFilters[f.key as keyof typeof activeFilters] ? f.color : '#CBD5E1'}`, background: activeFilters[f.key as keyof typeof activeFilters] ? f.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0, cursor: 'pointer' }}
                                >
                                    {activeFilters[f.key as keyof typeof activeFilters] && <span style={{ color: 'white', fontSize: '9px', fontWeight: 900, lineHeight: 1 }}>✓</span>}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Agenda y Entregas — filtros generales: muestran/ocultan sus items
                        vengan de Notion o creados a mano. El sync de Notion es aparte (abajo). */}
                    {([
                        { key: 'agenda', label: 'Agenda', color: '#6366F1', icon: <Camera size={14} /> },
                        { key: 'entregas', label: 'Entregas', color: '#059669', icon: <Package size={14} /> },
                    ] as const).map(f => {
                        const on = activeFilters[f.key];
                        return (
                            <div
                                key={f.key}
                                onClick={() => setActiveFilters(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '12px', cursor: 'pointer', marginBottom: '2px', opacity: on ? 1 : 0.6, border: '1px solid transparent', transition: 'all 0.15s' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ color: f.color }}>{f.icon}</div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>{f.label}</span>
                                </div>
                                <div style={{ width: '13px', height: '13px', borderRadius: '4px', border: `1px solid ${on ? f.color : '#CBD5E1'}`, background: on ? f.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {on && <span style={{ color: 'white', fontSize: '9px', fontWeight: 900, lineHeight: 1 }}>✓</span>}
                                </div>
                            </div>
                        );
                    })}

                    {/* NOTION — interruptor general, solito abajo. Apagado: oculta todo lo
                        sincronizado de Notion (sesiones + entregas). Encenderlo lo vuelve a
                        mostrar y dispara una sincronización. Va aparte porque Notion lo
                        usan varias pestañas, no solo el calendario. */}
                    <div style={{ margin: '8px 4px 0', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
                        <div
                            onClick={notionSyncing ? undefined : toggleNotion}
                            title={notionOn ? 'Apagar Notion (ocultar lo sincronizado)' : 'Prender Notion y sincronizar'}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '12px', cursor: notionSyncing ? 'wait' : 'pointer', background: notionOn ? 'rgba(25,25,25,0.04)' : 'transparent', opacity: notionOn ? 1 : 0.6, transition: 'all 0.15s' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {notionSyncing
                                    ? <Loader2 size={14} color="#191919" style={{ animation: 'spin-slow 0.8s linear infinite' }} />
                                    : <RefreshCw size={14} color="#191919" />}
                                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#475569' }}>Notion</span>
                            </div>
                            <div style={{ width: '34px', height: '18px', borderRadius: '10px', background: notionOn ? '#191919' : '#CBD5E1', position: 'relative', flexShrink: 0, transition: 'background 0.15s' }}>
                                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: notionOn ? '18px' : '2px', transition: 'left 0.15s' }} />
                            </div>
                        </div>
                        {notionSyncMsg && (
                            <div style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: 700, padding: '2px 12px 0' }}>{notionSyncMsg}</div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main className="agenda-main-content" style={{ order: 1 }}>
                <div style={{ padding: '0.5rem 1rem', background: 'white', borderBottom: 'none', zIndex: 100 }}>
                    <div className="timeline-header-grid" style={{ marginBottom: dayDeliveries.length > 0 ? '0.75rem' : '0' }}>
                        <div className="timeline-title-block" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-carbon)', whiteSpace: 'nowrap' }}>
                                    {viewMode === 'month'
                                        ? monthNames[selectedDate.getMonth()]
                                        : viewMode === 'timeline'
                                            ? (isMobile ? `${dayNames[dayIdx]} ${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]}` : `Semana: ${weekDays[0].date.getDate()} - ${weekDays[6].date.getDate()} ${monthNames[selectedDate.getMonth()]}`)
                                            : todayStr}
                                </h2>
                                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', lineHeight: 1 }}>{viewMode === 'timeline' ? 'SEMANA' : viewMode.toUpperCase()}</div>
                            </div>
                        </div>

                        <div className="timeline-tabs-block" style={{ display: 'flex', gap: '2px', background: '#F1F5F9', padding: '3px', borderRadius: '14px', width: '100%' }}>
                            <button onClick={() => setViewMode('timeline')} style={{ flex: 1, padding: '7px 2px', border: 'none', borderRadius: '10px', background: viewMode === 'timeline' ? 'white' : 'transparent', fontSize: '0.6rem', fontWeight: 900, color: viewMode === 'timeline' ? 'var(--domain-orange)' : '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}><Clock size={11} /> TIMELINE</button>
                            <button onClick={() => setViewMode('month')} style={{ flex: 1, padding: '7px 2px', border: 'none', borderRadius: '10px', background: viewMode === 'month' ? 'white' : 'transparent', fontSize: '0.6rem', fontWeight: 900, color: viewMode === 'month' ? 'var(--domain-orange)' : '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}><CalendarDays size={11} /> MES</button>
                            <button onClick={() => setViewMode('appointments')} style={{ flex: 1, padding: '7px 2px', border: 'none', borderRadius: '10px', background: viewMode === 'appointments' ? 'white' : 'transparent', fontSize: '0.6rem', fontWeight: 900, color: viewMode === 'appointments' ? 'var(--domain-orange)' : '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}><Filter size={11} /> CITAS</button>
                            <button onClick={() => setViewMode('tasks')} style={{ flex: 1, padding: '7px 2px', border: 'none', borderRadius: '10px', background: viewMode === 'tasks' ? 'white' : 'transparent', fontSize: '0.6rem', fontWeight: 900, color: viewMode === 'tasks' ? 'var(--domain-orange)' : '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}><Calendar size={11} /> TAREAS</button>
                        </div>

                        <div className="timeline-nav-buttons" style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                                onClick={() => { setNewItemType('routine'); setEditingItem({ type: 'new', data: {} }); }}
                                title="Agregar rutina o cita manualmente"
                                style={{ ...hdrBtn, background: 'var(--domain-orange)', color: 'white' }}
                            >
                                <Plus size={HDR_ICON} />
                            </button>
                            {viewMode === 'timeline' && !isMobile && (
                                <>
                                    <button onClick={() => changeDate(-1)} title="Día anterior" style={{ ...hdrBtnText, gap: '1px' }}><ChevronLeft size={14} />1d</button>
                                    <button onClick={() => changeDate(1)} title="Día siguiente" style={{ ...hdrBtnText, gap: '1px' }}>1d<ChevronRight size={14} /></button>
                                </>
                            )}
                            <button onClick={() => viewMode === 'month' ? changeMonth(-1) : changeDate(viewMode === 'timeline' ? (isMobile ? -1 : -7) : -1)} title={viewMode === 'timeline' && !isMobile ? 'Semana anterior' : undefined} style={hdrBtn}><ChevronLeft size={HDR_ICON} /></button>
                            <button onClick={() => { setSelectedDate(new Date()); scrollToNow(); setTimeout(scrollToNow, 300); }} style={hdrBtnText}>HOY</button>
                            <button onClick={() => viewMode === 'month' ? changeMonth(1) : changeDate(viewMode === 'timeline' ? (isMobile ? 1 : 7) : 1)} title={viewMode === 'timeline' && !isMobile ? 'Semana siguiente' : undefined} style={hdrBtn}><ChevronRight size={HDR_ICON} /></button>

                            {/* Separador — a la derecha van juntos los toggles de los dos
                                paneles laterales (ambos viven de este lado). */}
                            <div className="desktop-only" style={{ width: '1px', height: '20px', background: '#E2E8F0', margin: '0 4px' }} />

                            {/* Panel de Categorías / mini-calendario / Notion */}
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="desktop-only"
                                style={{ ...hdrBtn, background: sidebarOpen ? 'var(--domain-orange)' : hdrBtn.background }}
                                title={sidebarOpen ? 'Ocultar Categorías y calendario' : 'Ver Categorías y calendario'}
                            >
                                <Filter size={HDR_ICON} color={sidebarOpen ? 'white' : '#64748B'} />
                            </button>

                            {/* Panel derecho en modo FOCO (atrasadas / próximas entregas / agenda / checklist) */}
                            {(() => {
                                const on = rightSidebarOpen && rightPanelMode === 'foco';
                                return (
                                    <button
                                        onClick={() => on ? setRightSidebarOpen(false) : (setRightPanelMode('foco'), setRightSidebarOpen(true))}
                                        className="desktop-only"
                                        style={{ ...hdrBtn, background: on ? 'var(--domain-orange)' : hdrBtn.background }}
                                        title={on ? 'Cerrar Foco' : 'Ver Foco'}
                                    >
                                        <Target size={HDR_ICON} color={on ? 'white' : '#64748B'} />
                                    </button>
                                );
                            })()}

                            {/* Panel derecho en modo Misión Diaria */}
                            {(() => {
                                const on = rightSidebarOpen && rightPanelMode === 'mision';
                                return (
                                    <button
                                        onClick={() => on ? setRightSidebarOpen(false) : (setRightPanelMode('mision'), setRightSidebarOpen(true))}
                                        className="desktop-only"
                                        style={{ ...hdrBtn, background: on ? 'var(--domain-orange)' : hdrBtn.background }}
                                        title={on ? 'Cerrar Misión Diaria' : 'Ver Misión Diaria'}
                                    >
                                        <Star size={HDR_ICON} color={on ? 'white' : '#64748B'} />
                                    </button>
                                );
                            })()}
                        </div>
                    </div>

                    <AnimatePresence>
                        {viewMode !== 'month' && dayDeliveries.length > 0 && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginTop: '8px' }}>
                                {dayDeliveries.map((d, i) => (
                                    <div key={i} style={{ background: 'white', border: `1px solid ${d.projectColor}`, padding: '10px 14px', borderRadius: '14px', minWidth: '130px' }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: d.projectColor }}>ENTREGA</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 900 }}>{d.title}</div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div
                    style={{ flex: 1, overflow: 'auto', position: 'relative' }}
                    ref={scrollRef}
                    onTouchStart={isMobile && viewMode === 'timeline' ? handleTouchStart : undefined}
                    onTouchEnd={isMobile && viewMode === 'timeline' ? handleTouchEnd : undefined}
                >
                    {viewMode === 'timeline' && (() => {
                        const visibleDays = isMobile ? [weekDays[dayIdx]] : weekDays;
                        const gridCols = `52px repeat(${visibleDays.length}, 1fr)`;
                        return (
                        <div style={{ position: 'relative', minHeight: '1440px', minWidth: isMobile ? undefined : '800px' }}>
                           {(() => {
                               // Chips de entregas del día — van pegados al encabezado (sticky),
                               // NO dentro de la columna de horas, para que no se tapen con la
                               // línea de "ahora" ni se pierdan al hacer scroll. Van en su
                               // propia franja debajo de la fila de fecha/día, para que los
                               // recuadros de fecha sigan alineados entre columnas.
                               const renderDel = (dl: any) => (
                                   <div
                                       key={dl.id}
                                       onClick={(ev) => { ev.stopPropagation(); if (dl.raw) setEditingItem({ type: 'calendar', data: dl.raw }); }}
                                       title={`Entrega · ${dl.title}`}
                                       style={{
                                           display: 'flex', alignItems: 'center', gap: '3px', maxWidth: '100%', boxSizing: 'border-box',
                                           fontSize: '0.58rem', fontWeight: 800, background: dl.color, color: 'white',
                                           borderRadius: '5px', padding: '2px 5px', cursor: dl.raw ? 'pointer' : 'default',
                                           border: '1px dashed rgba(255,255,255,0.65)'
                                       }}
                                   >
                                       <span style={{ flexShrink: 0 }}>📦</span>
                                       <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Entrega · {dl.title}</span>
                                   </div>
                               );
                               const renderDels = (wd: any) => {
                                   if (!wd?.dels?.length) return null;
                                   return (
                                       <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, width: '100%' }}>
                                           {wd.dels.slice(0, 3).map(renderDel)}
                                           {wd.dels.length > 3 && (
                                               <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94A3B8' }}>+{wd.dels.length - 3} más</div>
                                           )}
                                       </div>
                                   );
                               };
                               const anyDels = visibleDays.some((wd: any) => wd?.dels?.length);
                               return !isMobile ? (
                                   <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.97)', borderBottom: '1px solid #E2E8F0' }}>
                                       <div style={{ display: 'grid', gridTemplateColumns: gridCols }}>
                                           <div />
                                           {visibleDays.map(wd => (
                                               <div key={wd.dateStr} onClick={() => setSelectedDate(wd.date)} style={{ textAlign: 'center', padding: '6px 0', borderLeft: '1px solid #E2E8F0', cursor: 'pointer', background: wd.isToday ? 'rgba(255,140,66,0.08)' : 'transparent', boxShadow: wd.isSelected && !wd.isToday ? 'inset 0 -3px 0 var(--domain-orange)' : 'none' }}>
                                                   <div style={{ fontSize: '0.6rem', fontWeight: 900, color: wd.isToday ? 'var(--domain-orange)' : '#94A3B8' }}>{dayNames[wd.dayIdx]}</div>
                                                   <div style={{ fontSize: '1.05rem', fontWeight: 900, color: wd.isSelected && !wd.isToday ? 'var(--domain-orange)' : undefined }}>{wd.date.getDate()}</div>
                                               </div>
                                           ))}
                                       </div>
                                       {anyDels && (
                                           <div style={{ display: 'grid', gridTemplateColumns: gridCols, borderTop: '1px solid #F1F5F9' }}>
                                               <div />
                                               {visibleDays.map(wd => (
                                                   <div key={wd.dateStr} style={{ minWidth: 0, borderLeft: '1px solid #E2E8F0', padding: '3px', background: wd.isToday ? 'rgba(255,140,66,0.08)' : 'transparent' }}>
                                                       {renderDels(wd)}
                                                   </div>
                                               ))}
                                           </div>
                                       )}
                                   </div>
                               ) : (
                                   visibleDays[0]?.dels?.length ? (
                                       <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.97)', borderBottom: '1px solid #E2E8F0', padding: '4px 6px' }}>
                                           {renderDels(visibleDays[0])}
                                       </div>
                                   ) : null
                               );
                           })()}
                           <div style={{ flex: 1, position: 'relative', display: 'grid', gridTemplateColumns: gridCols }}>
                               {visibleDays.some(w => w?.isToday) && (
                                   <div style={{ position: 'absolute', top: currentPos, left: 52, right: 0, height: '2px', background: '#ef4444', zIndex: 10 }}>
                                       <div style={{ position: 'absolute', left: '-5px', top: '-4px', width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                                   </div>
                               )}
                               <div style={{ borderRight: '1px solid #E2E8F0' }}>
                                   {hours.map(h => {
                                        const isQuiet = h < 6 || h >= 22;
                                        return (
                                            <div key={h} style={{ height: '60px', borderBottom: h % 3 === 2 ? '1px solid #E2E8F0' : '1px solid #F1F5F9', textAlign: 'right', paddingRight: '8px', fontSize: '0.65rem', color: isQuiet ? '#CBD5E1' : '#94A3B8', background: isQuiet ? '#F8FAFC' : '#FFFFFF', fontWeight: 700 }}>{String(h).padStart(2, '0')}:00</div>
                                        );
                                   })}
                               </div>
                               {visibleDays.map((wd, i) => wd && (
                                   <div key={i} style={{ position: 'relative', borderRight: '1px solid #F1F5F9', ...(wd.isToday ? { boxShadow: 'inset 0 0 0 1px rgba(255,140,66,0.25)' } : wd.isSelected ? { boxShadow: 'inset 0 0 0 1px rgba(255,140,66,0.18)' } : {}) }}>
                                       {hours.map(h => {
                                            const isQuiet = h < 6 || h >= 22;
                                            const bg = wd.isToday
                                                ? (isQuiet ? '#FFF3E9' : '#FFF9F4')
                                                : wd.isSelected
                                                    ? (isQuiet ? '#FBFAF9' : '#FFFDFB')
                                                    : (isQuiet ? '#F8FAFC' : '#FFFFFF');
                                            return <div key={h} style={{ height: '60px', borderBottom: h % 3 === 2 ? '1px solid #E2E8F0' : '1px solid #F1F5F9', background: bg }} />;
                                       })}
                                       {wd.evs.map((e: any) => (
                                            <div
                                                key={e.id} onClick={() => setEditingItem({ type: 'calendar', data: e })}
                                                style={{
                                                    position: 'absolute', top: e.startMin, left: 4, right: 4, height: Math.max(e.endMin - e.startMin, 34),
                                                    background: e.color, borderRadius: '10px', padding: '6px 10px', color: 'white', zIndex: 6,
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: 'pointer', overflow: 'hidden'
                                                }}
                                            >
                                                <div style={{ fontSize: '0.72rem', fontWeight: 800, lineHeight: 1.2 }}>{e.title}</div>
                                                <div style={{ fontSize: '0.6rem', fontWeight: 600, opacity: 0.85 }}>{e.startTime} – {e.endTime}</div>
                                            </div>
                                       ))}
                                       {wd.rts.map((r: any) => {
                                            const s = toMin(r.startTime), e = toMin(r.endTime);
                                            return (
                                                <div
                                                    key={r.id} onClick={() => setEditingItem({ type: 'routine', data: r })}
                                                    style={{
                                                        position: 'absolute', top: s, left: 3, right: 3, height: Math.max(e - s, 34),
                                                        background: r.color, borderRadius: '8px',
                                                        padding: '5px 8px', zIndex: 5, cursor: 'pointer', overflow: 'hidden',
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.18)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <CalendarDays size={10} color="white" style={{ flexShrink: 0, opacity: 0.9 }} />
                                                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{r.startTime} – {r.endTime}</div>
                                                    {r.items && r.items.length > 0 && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                                                            {r.items.map((sub: any) => (
                                                                <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', color: 'rgba(255,255,255,0.9)' }}>
                                                                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                        {sub.completed && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'white' }} />}
                                                                    </div>
                                                                    <span style={{ textDecoration: sub.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.text}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                       })}
                                   </div>
                               ))}
                           </div>
                        </div>
                        );
                    })()}
                    {viewMode === 'appointments' && (
                        <div style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {dayEvents.map((e: any) => (
                                    <div key={e.id} onClick={() => setEditingItem({ type: 'calendar', data: e })} style={{ background: 'white', padding: '16px', borderRadius: '18px', borderLeft: `6px solid ${e.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div><div style={{ fontWeight: 900 }}>{e.title}</div><div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{e.startTime} - {e.endTime}</div></div>
                                        <button onClick={(ev) => { ev.stopPropagation(); onRemoveEvent?.(e.id); }} style={{ background: '#FEF2F2', border: 'none', color: '#EF4444', padding: '8px', borderRadius: '10px' }}><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {viewMode === 'month' && (
                        <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                            {dayNames.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 900 }}>{d}</div>)}
                            {monthDays.padding.map((_, i) => <div key={`pad-${i}`} />)}
                            {monthDays.days.map(d => {
                                const cellDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d);
                                const cellStr = cellDate.toLocaleDateString('en-CA');
                                const isToday = cellStr === new Date().toLocaleDateString('en-CA');
                                const evs = monthEventsByDate[cellStr] || [];
                                return (
                                    <div
                                        key={`day-${d}`}
                                        onClick={() => { setSelectedDate(cellDate); setViewMode('timeline'); }}
                                        style={{
                                            minHeight: '84px', background: 'white', borderRadius: '12px', padding: '6px',
                                            display: 'flex', flexDirection: 'column', gap: '3px', cursor: 'pointer',
                                            border: isToday ? '2px solid var(--domain-orange)' : '1px solid #F1F5F9', overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.72rem', fontWeight: 900, color: isToday ? 'var(--domain-orange)' : '#64748B', textAlign: 'right', flexShrink: 0 }}>{d}</div>
                                        {evs.slice(0, 3).map((e: any) => (
                                            <div
                                                key={e.id}
                                                title={e.raw ? `${e.startTime ? e.startTime + ' · ' : ''}${e.title} — clic para ver detalle` : `${e.startTime ? e.startTime + ' · ' : ''}${e.title}`}
                                                onClick={ev => { if (e.raw) { ev.stopPropagation(); setEditingItem({ type: 'calendar', data: e.raw }); } }}
                                                style={{
                                                    fontSize: '0.6rem', fontWeight: 800, lineHeight: 1.25, borderRadius: '5px',
                                                    padding: '2px 4px', color: 'white', background: e.color,
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                    opacity: e.isDelivery ? 0.85 : 1
                                                }}
                                            >
                                                {e.startTime ? `${e.startTime} ` : ''}{e.title}
                                            </div>
                                        ))}
                                        {evs.length > 3 && (
                                            <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#94A3B8' }}>+{evs.length - 3} más</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {viewMode === 'tasks' && (
                        <div style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {dayMissions.map((m: any) => (
                                    <div key={m.id} style={{ background: 'white', padding: '14px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <button onClick={() => onToggleMission?.(m.id)} style={{ width: '24px', height: '24px', borderRadius: '8px', background: m.completed ? 'var(--domain-green)' : 'white', border: '2px solid #EEE' }} />
                                        <div style={{ fontWeight: 700 }}>{m.text}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Panel Lateral Derecho: Inspector (Solo PC) */}
            <aside className={`agenda-right-sidebar ${!rightSidebarOpen ? 'collapsed' : ''}`} style={{ order: 3 }}>
                {(() => {
                    const configOptions: Record<string, any> = {
                        foco: { title: 'Foco', icon: <Target size={15} />, color: 'var(--domain-orange)' },
                        mision: { title: 'Misión Diaria', icon: <Star size={15} />, color: 'var(--domain-orange)' },
                        tareas: { title: 'Tareas', icon: <Filter size={15} />, color: '#F59E0B' },
                        citas: { title: 'Citas y Eventos', icon: <Clock size={15} />, color: '#6366F1' },
                        rutinas: { title: 'Rutinas y Bloques', icon: <CalendarDays size={15} />, color: '#10B981' },
                        habitos: { title: 'Hábitos', icon: <CalendarDays size={15} />, color: '#EC4899' }
                    };
                    const esFoco = rightPanelMode === 'foco';
                    const config = configOptions[rightPanelMode] || { title: '', icon: null, color: '' };

                    return (
                        <>
                            {/* Cabecera del panel en UNA sola fila: título + navegación
                                por día (‹ fecha ›) + cerrar, para ocupar menos alto. La
                                fecha es un botón: si no es hoy, va en naranja y al tocarla
                                vuelve a hoy (reemplaza al link "volver a hoy"). */}
                            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #F1F5F9' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '10px', background: config.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                                    {config.icon}
                                </div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--text-carbon)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{config.title}</div>
                                {!esFoco && <>
                                    <button onClick={() => changeDate(-1)} title="Día anterior" style={hdrBtn}>
                                        <ChevronLeft size={HDR_ICON} />
                                    </button>
                                    <button
                                        onClick={() => setSelectedDate(new Date())}
                                        disabled={isActualToday}
                                        title={isActualToday ? undefined : 'Volver a hoy'}
                                        style={{ ...hdrBtnText, background: 'none', cursor: isActualToday ? 'default' : 'pointer', color: isActualToday ? 'var(--text-carbon)' : 'var(--domain-orange)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}
                                    >
                                        {dayNames[dayIdx]} {selectedDate.getDate()} {monthNames[selectedDate.getMonth()].slice(0, 3).toLowerCase()}
                                    </button>
                                    <button onClick={() => changeDate(1)} title="Día siguiente" style={hdrBtn}>
                                        <ChevronRight size={HDR_ICON} />
                                    </button>
                                </>}
                                <button
                                    onClick={() => setRightSidebarOpen(false)}
                                    title="Cerrar panel"
                                    style={hdrBtn}
                                >
                                    <X size={HDR_ICON} />
                                </button>
                            </div>

                            {esFoco ? (
                                <div style={{ flex: 1, overflowY: 'auto' }}>{renderFoco()}</div>
                            ) : (
                            <div style={{ padding: '20px 16px 20px 0', flex: 1, overflowY: 'auto' }}>
                                <div style={{ position: 'relative', paddingLeft: '8px' }}>
                                    {/* Línea vertical base */}
                                    <div style={{ position: 'absolute', left: '55px', top: '10px', bottom: '10px', width: '2px', background: '#F1F5F9', zIndex: 0 }} />

                                    {/* MISIÓN DIARIA: tareas del Checklist (dailyBlocks) + citas/sesiones de
                                        Notion + entregas del día, todo junto y ordenado por hora. Debajo,
                                        "Próximos días" con lo que viene (mañana, pasado, resto de la semana)
                                        y cuánto falta para cada uno. */}
                                    {rightPanelMode === 'mision' && (() => {
                                        type Row = { id: string; time: string; endTime?: string; kind: 'checklist' | 'event' | 'delivery'; label: string; sub?: string; completed?: boolean; color: string; task?: any; raw?: any };

                                        const renderRow = (item: Row) => (
                                            <div key={item.id} style={{ display: 'flex', gap: '9px', marginBottom: '6px', position: 'relative' }}>
                                                <div style={{ width: '38px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: '7px', flexShrink: 0, lineHeight: 1.15 }}>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: item.completed ? '#CBD5E1' : 'var(--text-carbon)' }}>{item.kind === 'delivery' ? '📦' : item.time}</span>
                                                    {item.kind === 'event' && item.endTime && <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#CBD5E1' }}>{item.endTime}</span>}
                                                </div>
                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.completed ? item.color : '#E2E8F0', marginTop: '9px', zIndex: 1, boxShadow: '0 0 0 3px white', flexShrink: 0 }} />
                                                <div
                                                    onClick={() => {
                                                        if (item.kind === 'checklist') {
                                                            const t = item.task;
                                                            if (t.id !== undefined) toggleDailyBlock?.(t.id);
                                                            else addDailyBlock?.(t.label, t.period as any, todayStr, true, undefined, t.repeatDays);
                                                        } else if (item.raw) {
                                                            setEditingItem({ type: 'calendar', data: item.raw });
                                                        }
                                                    }}
                                                    style={{ flex: 1, minWidth: 0, padding: '7px 9px', borderRadius: '9px', border: '1px solid #EDF1F5', borderLeft: `3px solid ${item.color}`, background: 'white', cursor: 'pointer', opacity: item.completed ? 0.65 : 1, display: 'flex', alignItems: 'center', gap: '7px' }}
                                                >
                                                    {item.kind === 'checklist' ? (
                                                        <div style={{ width: '16px', height: '16px', borderRadius: '5px', border: `2px solid ${item.completed ? 'var(--domain-green)' : '#E2E8F0'}`, background: item.completed ? 'var(--domain-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            {item.completed && <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 900, lineHeight: 1 }}>✓</span>}
                                                        </div>
                                                    ) : (
                                                        <div style={{ width: '16px', height: '16px', borderRadius: '5px', background: `${item.color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            {item.kind === 'delivery' ? <Package size={10} color={item.color} /> : <Clock size={10} color={item.color} />}
                                                        </div>
                                                    )}
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.25, color: item.completed ? '#94A3B8' : 'var(--text-carbon)', textDecoration: item.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {item.label}
                                                        </span>
                                                        {item.sub && <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94A3B8' }}>{item.sub}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );

                                        // ── Hoy (el día seleccionado) ──
                                        const rows: Row[] = [];
                                        dayChecklistTasks.forEach(t => rows.push({
                                            id: `c-${t.label.toLowerCase()}-${t.period}`, time: PERIOD_TIME[t.period] || '23:00',
                                            kind: 'checklist', label: t.label, completed: t.completed, color: '#F59E0B', task: t
                                        }));
                                        dayEvents.forEach((e: any) => rows.push({
                                            id: `e-${e.id}`, time: e.startTime || '00:00', endTime: e.endTime, kind: 'event',
                                            label: e.title,
                                            color: e.notionId ? colorSesionNotion(e.date, e.notionEstado) : (e.color || '#6366F1'), raw: e
                                        }));
                                        if (activeFilters.entregas && notionOn) {
                                            (calendarEvents || []).forEach(e => {
                                                if (e.notionId && e.notionEntregaFecha === todayStr && e.notionEstado !== 'Entregado') {
                                                    rows.push({ id: `d-${e.id}`, time: '23:59', kind: 'delivery', label: `Entrega · ${e.title}`, sub: e.notionDiasRestantes, color: colorEntrega(e.notionEntregaFecha), raw: e });
                                                }
                                            });
                                        }
                                        dayDeliveries.forEach((obj: any) => rows.push({
                                            id: `do-${obj.id ?? obj.title}`, time: '23:59', kind: 'delivery',
                                            label: `Entrega · ${obj.title}`, color: colorEntrega(obj.deliveryDate, obj.projectColor || ENTREGA_VERDE)
                                        }));
                                        rows.sort((a, b) => a.time.localeCompare(b.time));

                                        // ── Próximos días (los 7 siguientes al día seleccionado) ──
                                        const t0 = new Date(); t0.setHours(0, 0, 0, 0);
                                        const upcoming: { dateStr: string; label: string; inDays: number; items: Row[] }[] = [];
                                        for (let i = 1; i <= 7; i++) {
                                            const d = new Date(selectedDate); d.setDate(d.getDate() + i);
                                            const ds = d.toLocaleDateString('en-CA');
                                            const items: Row[] = [];
                                            (calendarEvents || []).forEach(e => {
                                                if (e.date !== ds) return;
                                                const show = e.notionId ? (activeFilters.agenda && notionOn) : activeFilters.citas;
                                                if (!show) return;
                                                items.push({ id: `ue-${e.id}`, time: e.startTime || '00:00', endTime: e.endTime, kind: 'event', label: e.title, color: e.notionId ? '#191919' : (e.color || '#6366F1'), raw: e });
                                            });
                                            if (activeFilters.entregas && notionOn) {
                                                (calendarEvents || []).forEach(e => {
                                                    if (e.notionId && e.notionEntregaFecha === ds && e.notionEstado !== 'Entregado') {
                                                        items.push({ id: `ud-${e.id}`, time: '23:59', kind: 'delivery', label: `Entrega · ${e.title}`, sub: e.notionDiasRestantes, color: colorEntrega(e.notionEntregaFecha), raw: e });
                                                    }
                                                });
                                            }
                                            if (activeFilters.entregas) {
                                                projects.forEach(p => (p.objectives || []).forEach((obj: any) => {
                                                    if (obj.deliveryDate === ds) items.push({ id: `udo-${obj.id ?? obj.title}`, time: '23:59', kind: 'delivery', label: `Entrega · ${obj.title}`, color: p.color || '#059669' });
                                                }));
                                            }
                                            if (!items.length) continue;
                                            items.sort((a, b) => a.time.localeCompare(b.time));
                                            const dm = new Date(d); dm.setHours(0, 0, 0, 0);
                                            const inDays = Math.round((dm.getTime() - t0.getTime()) / 86400000);
                                            const label = inDays === 1 ? 'Mañana' : inDays === 2 ? 'Pasado mañana' : `${dayNames[(d.getDay() + 6) % 7]} ${d.getDate()} ${monthNames[d.getMonth()].slice(0, 3).toLowerCase()}`;
                                            upcoming.push({ dateStr: ds, label, inDays, items });
                                        }

                                        if (rows.length === 0 && upcoming.length === 0) {
                                            return <div style={{ fontSize: '0.75rem', color: '#94A3B8', textAlign: 'center', padding: '20px' }}>Nada para este día ni los próximos</div>;
                                        }

                                        return (
                                            <>
                                                {rows.length > 0 ? rows.map(renderRow) : (
                                                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', paddingLeft: '55px', marginBottom: '12px' }}>Nada para este día.</div>
                                                )}
                                                {upcoming.length > 0 && (
                                                    <>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0 12px', paddingLeft: '55px' }}>
                                                            <span style={{ fontSize: '0.58rem', fontWeight: 900, color: '#94A3B8', letterSpacing: '0.06em' }}>PRÓXIMOS DÍAS</span>
                                                            <div style={{ flex: 1, height: '1px', background: '#F1F5F9' }} />
                                                        </div>
                                                        {upcoming.map(day => (
                                                            <div key={day.dateStr} style={{ marginBottom: '2px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', paddingLeft: '55px', marginBottom: '7px' }}>
                                                                    <span style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--text-carbon)', textTransform: 'capitalize' }}>{day.label}</span>
                                                                    <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--domain-orange)' }}>· {day.inDays === 1 ? 'en 1 día' : `en ${day.inDays} días`}</span>
                                                                </div>
                                                                {day.items.map(renderRow)}
                                                            </div>
                                                        ))}
                                                    </>
                                                )}
                                            </>
                                        );
                                    })()}
                                    {/* TAREAS (Misiones sueltas) */}
                                    {rightPanelMode === 'tareas' && (() => {
                                        let allItems: any[] = [];
                                        dayMissions.forEach((m: any) => {
                                            allItems.push({
                                                id: `m-${m.id}`, rawId: m.id, time: m.dueTime || '09:00', type: 'tarea', label: m.text, completed: m.completed, color: '#F59E0B'
                                            });
                                        });

                                        allItems.sort((a, b) => a.time.localeCompare(b.time));

                                        return allItems.map((item: any) => (
                                            <div key={item.id} style={{ display: 'flex', gap: '15px', marginBottom: '16px', position: 'relative' }}>
                                                <div style={{ width: '45px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: '4px', flexShrink: 0 }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{item.time}</span>
                                                </div>
                                                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: item.completed ? item.color : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '8px', zIndex: 1, boxShadow: '0 0 0 4px white', flexShrink: 0 }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />
                                                </div>
                                                <div
                                                    onClick={() => onToggleMission?.(item.rawId)}
                                                    style={{ flex: 1, padding: '12px', borderRadius: '16px', border: '1px solid #F8FAFC', borderLeft: `4px solid ${item.color}`, background: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', cursor: 'pointer', opacity: item.completed ? 0.7 : 1 }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${item.completed ? 'var(--domain-green)' : '#E2E8F0'}`, background: item.completed ? 'var(--domain-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            {item.completed && <span style={{ color: 'white', fontSize: '0.65rem', fontWeight: 900 }}>✓</span>}
                                                        </div>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: item.completed ? '#94A3B8' : 'var(--text-carbon)', textDecoration: item.completed ? 'line-through' : 'none' }}>
                                                            {item.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                    {rightPanelMode === 'tareas' && (missions || []).length === 0 && dayRoutines.length === 0 && dayEvents.length === 0 && (
                                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', textAlign: 'center', padding: '20px' }}>Tu línea de tiempo está vacía hoy</div>
                                    )}

                                    {/* CITAS */}
                                    {rightPanelMode === 'citas' && dayEvents.map((e: any) => (
                                        <div key={e.id} style={{ display: 'flex', gap: '15px', marginBottom: '16px', position: 'relative' }}>
                                            <div style={{ width: '45px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: '4px', flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{e.startTime}</span>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#AAA' }}>{e.endTime}</span>
                                            </div>
                                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: e.color || config.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '8px', zIndex: 1, boxShadow: '0 0 0 4px white', flexShrink: 0 }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />
                                            </div>
                                            <div style={{ flex: 1, padding: '12px', borderRadius: '16px', border: '1px solid #F8FAFC', borderLeft: `4px solid ${e.color || config.color}`, background: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-carbon)' }}>{e.title}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {rightPanelMode === 'citas' && dayEvents.length === 0 && (
                                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', textAlign: 'center', padding: '20px' }}>No hay citas hoy</div>
                                    )}

                                    {/* RUTINAS / BLOQUES */}
                                    {rightPanelMode === 'rutinas' && dayRoutines.map((r: any) => (
                                        <div key={r.id} style={{ display: 'flex', gap: '15px', marginBottom: '16px', position: 'relative' }}>
                                            <div style={{ width: '45px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: '4px', flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{r.startTime}</span>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#AAA' }}>{r.endTime}</span>
                                            </div>
                                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: r.color || config.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '8px', zIndex: 1, boxShadow: '0 0 0 4px white', flexShrink: 0 }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />
                                            </div>
                                            <div style={{ flex: 1, padding: '12px', borderRadius: '16px', border: '1px solid #F8FAFC', borderLeft: `4px solid ${r.color || config.color}`, background: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-carbon)', marginBottom: '6px' }}>{r.title}</div>
                                                {r.items && r.items.length > 0 && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {r.items.map((sub: any) => (
                                                            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#94A3B8' }}>
                                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    {sub.completed && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--domain-green)' }} />}
                                                                </div>
                                                                <span style={{ textDecoration: sub.completed ? 'line-through' : 'none' }}>{sub.text}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {rightPanelMode === 'rutinas' && dayRoutines.length === 0 && (
                                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', textAlign: 'center', padding: '20px' }}>No hay rutinas activas</div>
                                    )}

                                    {/* HÁBITOS */}
                                    {rightPanelMode === 'habitos' && dayHabits.map((h: any) => (
                                        <div key={h.id} style={{ display: 'flex', gap: '15px', marginBottom: '16px', position: 'relative' }}>
                                            <div style={{ width: '45px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: '4px', flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-carbon)' }}>08:00</span>
                                            </div>
                                            
                                            {(() => {
                                                const isCompleted = (h.completedDates || []).includes(todayStr);
                                                return (
                                                    <>
                                                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: isCompleted ? config.color : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '8px', zIndex: 1, boxShadow: '0 0 0 4px white', flexShrink: 0 }}>
                                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />
                                                        </div>
                                                        <div style={{ flex: 1, padding: '12px', borderRadius: '16px', border: '1px solid #F8FAFC', borderLeft: `4px solid ${config.color}`, background: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', opacity: isCompleted ? 0.7 : 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${isCompleted ? 'var(--domain-green)' : '#E2E8F0'}`, background: isCompleted ? 'var(--domain-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                    {isCompleted && <span style={{ color: 'white', fontSize: '0.65rem', fontWeight: 900 }}>✓</span>}
                                                                </div>
                                                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isCompleted ? '#94A3B8' : 'var(--text-carbon)', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                                                                    {h.name}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    ))}
                                    {rightPanelMode === 'habitos' && dayHabits.length === 0 && (
                                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', textAlign: 'center', padding: '20px' }}>No hay hábitos hoy</div>
                                    )}
                                </div>
                            </div>
                            )}
                        </>
                    );
                })()}
            </aside>

            <AnimatePresence>
                {editingItem && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            style={{ background: 'white', padding: '1.5rem', borderRadius: '24px', width: '320px', maxWidth: '100%' }}
                        >
                            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 900 }}>
                                {editingItem.type === 'routine' ? 'Editar rutina' : editingItem.type === 'calendar' ? (editingItem.data?.notionId ? 'Detalle de sesión' : 'Editar evento') : editingItem.type === 'new' ? 'Agregar manualmente' : 'Editar bloque'}
                            </h3>

                            {editingItem.type === 'new' && (
                                <div style={{ display: 'flex', gap: '6px', background: '#F1F5F9', padding: '4px', borderRadius: '10px', marginBottom: '14px' }}>
                                    <button
                                        onClick={() => setNewItemType('routine')}
                                        style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 900, background: newItemType === 'routine' ? 'white' : 'transparent', color: newItemType === 'routine' ? 'var(--domain-orange)' : '#64748B' }}
                                    >
                                        Rutina (se repite)
                                    </button>
                                    <button
                                        onClick={() => setNewItemType('calendar')}
                                        style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 900, background: newItemType === 'calendar' ? 'white' : 'transparent', color: newItemType === 'calendar' ? 'var(--domain-orange)' : '#64748B' }}
                                    >
                                        Evento puntual
                                    </button>
                                </div>
                            )}

                            {editingItem.type === 'calendar' && editingItem.data?.notionId && (
                                <div style={{ marginBottom: '14px', padding: '10px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Sesión de Notion</div>
                                    {[
                                        ['Estado', editingItem.data.notionEstado],
                                        ['Entrega', editingItem.data.notionEntregaFecha],
                                        ['Días restantes', editingItem.data.notionDiasRestantes],
                                    ].filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => (
                                        <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                            <span style={{ color: '#64748B', fontWeight: 700 }}>{k}</span>
                                            <span style={{ color: '#0F172A', fontWeight: 800 }}>{String(v)}</span>
                                        </div>
                                    ))}
                                    <div style={{ fontSize: '0.66rem', color: '#94A3B8', fontWeight: 600 }}>El estado se cambia desde Entregas o Notion; editar acá solo mueve la cita local.</div>
                                </div>
                            )}

                            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Título</label>
                            <input
                                type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Ej. Edición de fotos"
                                style={{ width: '100%', marginTop: '4px', marginBottom: '14px', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 700, boxSizing: 'border-box' }}
                            />

                            {(() => {
                                const effectiveType = editingItem.type === 'new' ? newItemType : editingItem.type;
                                const showDate = effectiveType === 'calendar';
                                const showRepeat = effectiveType === 'routine';
                                const showNotionOption = editingItem.type === 'new' && effectiveType === 'calendar';
                                if (effectiveType === 'timeblock') return null;
                                return (
                                <>
                                    {showDate && (
                                        <div style={{ marginBottom: '14px' }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Fecha</label>
                                            <input
                                                type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                                                style={{ width: '100%', marginTop: '4px', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 700, boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Inicio</label>
                                            <input
                                                type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)}
                                                style={{ width: '100%', marginTop: '4px', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 700, boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Fin</label>
                                            <input
                                                type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)}
                                                style={{ width: '100%', marginTop: '4px', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 700, boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>

                                    {showNotionOption && (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', cursor: 'pointer', padding: '10px 12px', background: '#F9FAFB', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                            <input
                                                type="checkbox" checked={saveToNotion} onChange={(e) => setSaveToNotion(e.target.checked)}
                                                style={{ width: '16px', height: '16px', accentColor: 'var(--domain-orange)' }}
                                            />
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Guardar también en Notion</span>
                                        </label>
                                    )}

                                    {showRepeat && (
                                        <div style={{ marginBottom: '14px' }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Se repite</label>
                                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                                {DIAS_CORTOS.map((d, i) => {
                                                    const isSet = editRepeatDays.includes(i);
                                                    return (
                                                        <button
                                                            key={i}
                                                            onClick={() => setEditRepeatDays(prev => isSet ? prev.filter(x => x !== i) : [...prev, i].sort())}
                                                            style={{
                                                                width: '30px', height: '30px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                                                fontSize: '0.7rem', fontWeight: 900,
                                                                background: isSet ? 'var(--domain-orange)' : '#F1F5F9',
                                                                color: isSet ? 'white' : '#94A3B8'
                                                            }}
                                                        >
                                                            {d}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                                );
                            })()}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                <button onClick={() => setEditingItem(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0', background: 'white', fontWeight: 800, cursor: 'pointer' }}>Cancelar</button>
                                <button onClick={saveEditingItem} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--domain-orange)', color: 'white', fontWeight: 800, cursor: 'pointer' }}>Guardar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
