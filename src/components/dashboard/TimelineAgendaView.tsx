import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ChevronLeft, ChevronRight, CalendarDays, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Filter, Trash2, Star, Plus, Link2, X } from 'lucide-react';

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
}

const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export const TimelineAgendaView = ({
    calendarEvents, projects = [], rutinas = [], missions = [], habits = [],
    onRemoveEvent, onToggleMission, updateRoutine, updateCalendarEvent, addRoutine, addCalendarEvent
}: TimelineAgendaViewProps) => {
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    const [viewMode, setViewMode] = useState<'timeline' | 'month' | 'appointments' | 'tasks'>('timeline');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editingItem, setEditingItem] = useState<{ type: 'calendar' | 'routine' | 'timeblock' | 'new', data: any } | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
    const [rightPanelMode, setRightPanelMode] = useState<'citas' | 'rutinas' | 'tareas' | 'habitos' | 'mision'>('mision');
    const [activeFilters, setActiveFilters] = useState({
        citas: true,
        rutinas: true,
        tareas: true,
        habitos: true,
        mision: true,
        notion: true
    });
    
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
        if (!activeFilters.citas) return [];
        const delivs: any[] = [];
        projects.forEach(p => {
            (p.objectives || []).forEach((obj: any) => {
                if (obj.deliveryDate === todayStr) {
                    delivs.push({ ...obj, projectColor: p.color });
                }
            });
        });
        return delivs;
    }, [projects, todayStr, activeFilters.citas]);

    // 4. Eventos y Misiones con hora
    const dayEvents = useMemo(() => {
        const items = (calendarEvents || [])
            .filter(e => e.date === todayStr)
            .filter(e => (e.notionId ? activeFilters.notion : activeFilters.citas))
            .map(e => ({
                ...e,
                itemType: 'event',
                color: e.notionId ? '#191919' : (e.color || '#3b82f6'),
                startMin: toMin(e.startTime),
                endMin: toMin(e.endTime)
            }));
        return items.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    }, [calendarEvents, todayStr, activeFilters.citas, activeFilters.notion]);

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
                .filter(e => (e.notionId ? activeFilters.notion : activeFilters.citas))
                .map(e => ({
                    ...e,
                    startMin: toMin(e.startTime),
                    endMin: toMin(e.endTime),
                    color: e.notionId ? '#191919' : (e.color || '#6366F1')
                }));

            const rts = !activeFilters.rutinas ? [] : (rutinas || []).filter(r => r.repeatDays?.includes(dIdx));
            const hbs = !activeFilters.habitos ? [] : (habits || []).filter(h => h.schedule?.includes(dIdx));

            days.push({ 
                date: d, 
                dateStr: dStr, 
                dayIdx: dIdx, 
                isToday: dStr === new Date().toLocaleDateString('en-CA'),
                evs,
                rts,
                hbs
            });
        }
        return days;
    }, [selectedDate, calendarEvents, rutinas, habits, activeFilters]);

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
            {/* Sidebar PC Only */}
            <aside className={`agenda-sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
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
                        { key: 'notion', label: 'Notion', color: '#191919', icon: <Link2 size={14} />, type: 'SYNC' }
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
                                    style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${f.color}`, background: activeFilters[f.key as keyof typeof activeFilters] ? f.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} 
                                >
                                    {activeFilters[f.key as keyof typeof activeFilters] && <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '2px' }} />}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Area */}
            <main className="agenda-main-content">
                <div style={{ padding: '0.5rem 1rem', background: 'white', borderBottom: 'none', zIndex: 100 }}>
                    <div className="timeline-header-grid" style={{ marginBottom: dayDeliveries.length > 0 ? '0.75rem' : '0' }}>
                        <div className="timeline-title-block" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button 
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="desktop-only"
                                style={{ 
                                    background: '#F8FAFC', 
                                    border: 'none', 
                                    borderRadius: '10px', 
                                    padding: '8px', 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                                title={sidebarOpen ? "Contraer lateral" : "Expandir lateral"}
                            >
                                {sidebarOpen ? <PanelLeftClose size={18} color="var(--domain-orange)" /> : <PanelLeftOpen size={18} color="#64748B" />}
                            </button>
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
                                style={{ background: 'var(--domain-orange)', border: 'none', borderRadius: '10px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'white' }}
                            >
                                <Plus size={16} />
                            </button>
                            <button onClick={() => viewMode === 'month' ? changeMonth(-1) : changeDate(viewMode === 'timeline' ? (isMobile ? -1 : -7) : -1)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '6px', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
                            <button onClick={() => { setSelectedDate(new Date()); scrollToNow(); setTimeout(scrollToNow, 300); }} style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '6px 10px', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer' }}>HOY</button>
                            <button onClick={() => viewMode === 'month' ? changeMonth(1) : changeDate(viewMode === 'timeline' ? (isMobile ? 1 : 7) : 1)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '6px', cursor: 'pointer' }}><ChevronRight size={16} /></button>
                            
                            {/* Separador */}
                            <div className="desktop-only" style={{ width: '1px', height: '20px', background: '#E2E8F0', margin: '0 4px' }} />
                            
                            {/* Toggle Panel Derecho (Misiones) */}
                            <button 
                                onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                                className="desktop-only"
                                style={{ 
                                    background: rightSidebarOpen ? 'var(--domain-orange)' : '#F8FAFC', 
                                    border: 'none', 
                                    borderRadius: '10px', 
                                    padding: '6px', 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                                title={rightSidebarOpen ? "Ocultar Misiones" : "Ver Misiones"}
                            >
                                {rightSidebarOpen ? <PanelRightClose size={16} color="white" /> : <PanelRightOpen size={16} color="#64748B" />}
                            </button>
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
                           {!isMobile && (
                               <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', display: 'grid', gridTemplateColumns: gridCols, borderBottom: '1px solid #E2E8F0' }}>
                                   <div />
                                   {visibleDays.map(wd => (
                                       <div key={wd.dateStr} onClick={() => setSelectedDate(wd.date)} style={{ textAlign: 'center', padding: '6px 0', borderLeft: '1px solid #E2E8F0', cursor: 'pointer', background: wd.isToday ? 'rgba(255,140,66,0.08)' : 'transparent' }}>
                                           <div style={{ fontSize: '0.6rem', fontWeight: 900, color: wd.isToday ? 'var(--domain-orange)' : '#94A3B8' }}>{dayNames[wd.dayIdx]}</div>
                                           <div style={{ fontSize: '1.05rem', fontWeight: 900 }}>{wd.date.getDate()}</div>
                                       </div>
                                   ))}
                               </div>
                           )}
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
                                   <div key={i} style={{ position: 'relative', borderRight: '1px solid #F1F5F9' }}>
                                       {hours.map(h => (
                                            <div key={h} style={{ height: '60px', borderBottom: h % 3 === 2 ? '1px solid #E2E8F0' : '1px solid #F1F5F9', background: (h < 6 || h >= 22) ? '#F8FAFC' : '#FFFFFF' }} />
                                       ))}
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
                            {monthDays.padding.map((_, i) => <div key={i} />)}
                            {monthDays.days.map(d => (
                                <div key={d} onClick={() => { setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d)); setViewMode('timeline'); }} style={{ height: '70px', background: 'white', borderRadius: '12px', padding: '6px', textAlign: 'center' }}>{d}</div>
                            ))}
                        </div>
                    )}
                    {viewMode === 'tasks' && (
                        <div style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {dayMissions.map((m: any) => (
                                    <div key={m.id} style={{ background: 'white', padding: '14px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <button onClick={() => onToggleMission?.(m.id)} style={{ width: '24px', height: '24px', borderRadius: '8px', background: m.completed ? 'var(--domain-green)' : 'white', border: '2px solid #EEE' }} />
                                        <div style={{ fontWeight: 700 }}>{m.title || m.text}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Panel Lateral Derecho: Inspector (Solo PC) */}
            <aside className={`agenda-right-sidebar ${!rightSidebarOpen ? 'collapsed' : ''}`}>
                {(() => {
                    const configOptions: Record<string, any> = {
                        mision: { title: 'Misión Diaria (Timeline)', icon: <Star size={16} />, color: 'var(--domain-orange)' },
                        tareas: { title: 'Tareas Individuales', icon: <Filter size={16} />, color: '#F59E0B' },
                        citas: { title: 'Citas y Eventos', icon: <Clock size={16} />, color: '#6366F1' },
                        rutinas: { title: 'Rutinas y Bloques', icon: <CalendarDays size={16} />, color: '#10B981' },
                        habitos: { title: 'Hábitos Diarios', icon: <CalendarDays size={16} />, color: '#EC4899' }
                    };
                    const config = configOptions[rightPanelMode] || { title: '', icon: null, color: '' };

                    return (
                        <>
                            <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #F1F5F9' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: config.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    {config.icon}
                                </div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-carbon)', flex: 1 }}>{config.title}</div>
                                <button
                                    onClick={() => setRightSidebarOpen(false)}
                                    title="Cerrar panel"
                                    style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748B', flexShrink: 0 }}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div style={{ padding: '20px 16px 20px 0', flex: 1, overflowY: 'auto' }}>
                                <div style={{ position: 'relative', paddingLeft: '8px' }}>
                                    {/* Línea vertical base */}
                                    <div style={{ position: 'absolute', left: '72px', top: '10px', bottom: '10px', width: '2px', background: '#F1F5F9', zIndex: 0 }} />

                                    {/* MISIONES (TIMELINE GLOBAL) o SOLO TAREAS */}
                                    {(rightPanelMode === 'mision' || rightPanelMode === 'tareas') && (() => {
                                        // Construir Timeline Global al instante para Misiones
                                        let allItems: any[] = [];
                                        
                                        // 1. Tareas (Misiones sueltas)
                                        dayMissions.forEach((m: any) => {
                                            allItems.push({
                                                id: `m-${m.id}`, rawId: m.id, time: m.dueTime || '09:00', type: 'tarea', label: m.title || m.text, completed: m.completed, color: '#F59E0B', raw: m
                                            });
                                        });

                                        if (rightPanelMode === 'mision') {
                                            // 2. Rutinas
                                            dayRoutines.forEach((r: any) => {
                                                allItems.push({
                                                    id: `r-${r.id}`, type: 'rutina', time: r.startTime || '07:00', label: r.title, color: r.color || '#10B981', items: r.items, raw: r
                                                });
                                            });

                                            // 3. Hábitos
                                            dayHabits.forEach((h: any) => {
                                                allItems.push({
                                                    id: `h-${h.id}`, type: 'habito', time: h.timeOfDay || '08:00', label: h.name, color: '#EC4899', raw: h, completed: (h.completedDates || []).includes(todayStr)
                                                });
                                            });

                                            // 4. Citas
                                            dayEvents.forEach((e: any) => {
                                                allItems.push({
                                                    id: `e-${e.id}`, type: 'cita', time: e.startTime || '10:00', endTime: e.endTime, label: e.title, color: e.color || '#6366F1', raw: e
                                                });
                                            });
                                        }

                                        allItems.sort((a, b) => a.time.localeCompare(b.time));

                                        return allItems.map((item: any) => (
                                            <div key={item.id} style={{ display: 'flex', gap: '15px', marginBottom: '16px', position: 'relative' }}>
                                                <div style={{ width: '45px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: '4px', flexShrink: 0 }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{item.time}</span>
                                                    {item.endTime && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#AAA' }}>{item.endTime}</span>}
                                                </div>
                                                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: item.completed ? item.color : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '8px', zIndex: 1, boxShadow: '0 0 0 4px white', flexShrink: 0 }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.type === 'rutina' || item.type === 'cita' ? item.color : 'white' }} />
                                                </div>
                                                
                                                <div 
                                                    onClick={() => item.type === 'tarea' && onToggleMission && onToggleMission(item.rawId)} 
                                                    style={{ flex: 1, padding: '12px', borderRadius: '16px', border: '1px solid #F8FAFC', borderLeft: `4px solid ${item.color}`, background: item.type === 'rutina' ? `${item.color}08` : 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', cursor: item.type === 'tarea' ? 'pointer' : 'default', opacity: item.completed ? 0.7 : 1 }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {(item.type === 'tarea' || item.type === 'habito') && (
                                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${item.completed ? 'var(--domain-green)' : '#E2E8F0'}`, background: item.completed ? 'var(--domain-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                {item.completed && <span style={{ color: 'white', fontSize: '0.65rem', fontWeight: 900 }}>✓</span>}
                                                            </div>
                                                        )}
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: item.completed ? '#94A3B8' : 'var(--text-carbon)', textDecoration: item.completed ? 'line-through' : 'none' }}>
                                                            {item.label}
                                                        </span>
                                                    </div>

                                                    {item.type === 'rutina' && item.items && item.items.length > 0 && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                                                            {item.items.map((sub: any) => (
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
                                                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{h.timeOfDay || '08:00'}</span>
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
                                {editingItem.type === 'routine' ? 'Editar rutina' : editingItem.type === 'calendar' ? 'Editar evento' : editingItem.type === 'new' ? 'Agregar manualmente' : 'Editar bloque'}
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
