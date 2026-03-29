import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ChevronLeft, ChevronRight, CalendarDays, PanelLeftClose, PanelLeftOpen, Filter, Trash2, X } from 'lucide-react';

interface TimelineAgendaViewProps {
    calendarEvents: any[];
    projects: any[];
    rutinas?: any[];
    habits?: any[];
    timeBlocks?: any[];
    onRemoveEvent?: (id: number) => void;
    onUpdateEvent?: (id: number, updates: any) => void;
    onRemoveRoutine?: (id: number) => void;
    onUpdateRoutine?: (id: number, updates: any) => void;
    onRemoveTimeBlock?: (id: number) => void;
    onUpdateTimeBlock?: (id: number, updates: any) => void;
    missions?: any[];
    onToggleMission?: (id: number) => void;
}

export const TimelineAgendaView = ({ 
    calendarEvents, projects, rutinas = [], timeBlocks = [], missions = [], 
    onRemoveEvent, onUpdateEvent, onRemoveRoutine, onUpdateRoutine, onRemoveTimeBlock, onUpdateTimeBlock, 
    onToggleMission
}: TimelineAgendaViewProps) => {
    const [viewMode, setViewMode] = useState<'timeline' | 'month' | 'appointments' | 'tasks'>('timeline');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editingItem, setEditingItem] = useState<{ type: 'calendar' | 'routine' | 'timeblock', data: any } | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeFilters, setActiveFilters] = useState({
        citas: true,
        rutinas: true,
        tareas: true,
        bloques: true
    });
    
    // Estado para edición
    const [editTitle, setEditTitle] = useState('');
    const [editStart, setEditStart] = useState('');
    const [editEnd, setEditEnd] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sincronizar estado de edición al abrir el modal
    useEffect(() => {
        if (editingItem) {
            const { type, data } = editingItem;
            if (type === 'calendar') {
                setEditTitle(data.title || '');
                setEditStart(data.startTime || '');
                setEditEnd(data.endTime || '');
            } else if (type === 'routine') {
                setEditTitle(data.title || '');
                setEditStart(data.startTime || '');
                setEditEnd(data.endTime || '');
            } else if (type === 'timeblock') {
                setEditTitle(data.label || '');
                setEditStart(data.start || '');
                setEditEnd(data.end || '');
            }
        }
    }, [editingItem]);
    
    // Formato YYYY-MM-DD local para comparación con eventos e identificación de día
    const todayStr = selectedDate.toLocaleDateString('en-CA');
    const dayIdx = (selectedDate.getDay() + 6) % 7; // 0=Lunes, ..., 6=Domingo
    const isActualToday = todayStr === new Date().toLocaleDateString('en-CA');
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // 1. Auto-scroll al momento actual — dispara en mount y al cambiar de vista
    useEffect(() => {
        if (viewMode !== 'timeline' || !isActualToday) return;
        
        const scrollToNow = () => {
            const container = scrollRef.current;
            if (!container) return;
            const now = new Date();
            // 60px por hora, offset para centrar la línea roja
            const targetPx = Math.max(0, (now.getHours() * 60 + now.getMinutes()) - 80);
            container.scrollTop = targetPx;
        };

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
        if (!activeFilters.citas) return [];
        const items = (calendarEvents || []).filter(e => e.date === todayStr).map(e => ({
            ...e,
            itemType: 'event',
            color: e.color || '#3b82f6',
            startMin: toMin(e.startTime),
            endMin: toMin(e.endTime)
        }));
        return items.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    }, [calendarEvents, todayStr, activeFilters.citas]);

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
            const evs = !activeFilters.citas ? [] : (calendarEvents || []).filter(e => e.date === dStr).map(e => ({
                ...e,
                startMin: toMin(e.startTime),
                endMin: toMin(e.endTime),
                color: e.color || '#6366F1'
            }));

            const rts = !activeFilters.rutinas ? [] : (rutinas || []).filter(r => r.repeatDays?.includes(dIdx));

            days.push({ 
                date: d, 
                dateStr: dStr, 
                dayIdx: dIdx, 
                isToday: dStr === new Date().toLocaleDateString('en-CA'),
                evs,
                rts
            });
        }
        return days;
    }, [selectedDate, calendarEvents, rutinas, activeFilters.citas, activeFilters.rutinas]);

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
                        color: !isCurrentMonth ? '#CBD5E1' : isSelected ? 'white' : (isToday ? 'var(--domain-orange)' : '#64748B'),
                        fontWeight: isToday || isSelected ? 900 : 700
                    }}
                >
                    {dayNum}
                </div>
            );
        });

        return (
            <div style={{ padding: '0 8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
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
                <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--domain-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Calendar size={18} />
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-carbon)' }}>Agenda Central</div>
                </div>

                <div style={{ padding: '16px 0', borderBottom: '1px solid #F1F5F9' }}>
                    {renderMiniCalendar()}
                </div>

                <div className="sidebar-section-title">Categorías</div>
                <div style={{ padding: '0 8px' }}>
                    {[
                        { key: 'citas', label: 'Citas y Eventos', color: '#6366F1', icon: <Clock size={14} /> },
                        { key: 'rutinas', label: 'Rutinas Diarias', color: '#10B981', icon: <CalendarDays size={14} /> },
                        { key: 'tareas', label: 'Misiones/Tareas', color: '#F59E0B', icon: <Filter size={14} /> },
                        { key: 'bloques', label: 'Bloques Tiempo', color: '#8B5CF6', icon: <Calendar size={14} /> },
                    ].map(f => (
                        <div 
                            key={f.key} 
                            className="filter-toggle"
                            onClick={() => setActiveFilters(prev => ({ ...prev, [f.key]: !prev[f.key as keyof typeof prev] }))}
                            style={{ opacity: activeFilters[f.key as keyof typeof activeFilters] ? 1 : 0.5 }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ color: f.color }}>{f.icon}</div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>{f.label}</span>
                            </div>
                            <div style={{ width: '12px', height: '12px', borderRadius: '4px', border: `2px solid ${f.color}`, background: activeFilters[f.key as keyof typeof activeFilters] ? f.color : 'transparent' }} />
                        </div>
                    ))}
                </div>

                <div className="sidebar-section-title">Rutinas de Hoy</div>
                <div style={{ padding: '0 12px 20px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {dayMissions.slice(0, 5).map((m: any) => (
                        <div 
                            key={m.id} 
                            onClick={() => onToggleMission && onToggleMission(m.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#F8FAFC', borderRadius: '12px', cursor: 'pointer' }}
                        >
                            <div style={{ width: '18px', height: '18px', borderRadius: '6px', border: '2px solid #E2E8F0', background: m.completed ? '#10B981' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {m.completed && <div style={{ width: '8px', height: '2px', background: 'white', borderRadius: '1px' }} />}
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: m.completed ? '#94A3B8' : '#475569', textDecoration: m.completed ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {m.title || m.text}
                            </span>
                        </div>
                    ))}
                    {dayMissions.length === 0 && <div style={{ fontSize: '0.65rem', color: '#CBD5E1', textAlign: 'center', padding: '10px' }}>No hay rutinas activas</div>}
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
                                    {viewMode === 'month' ? monthNames[selectedDate.getMonth()] : (viewMode === 'timeline' ? `Semana: ${weekDays[0].date.getDate()} - ${weekDays[6].date.getDate()} ${monthNames[selectedDate.getMonth()]}` : todayStr)}
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

                        <div className="timeline-nav-buttons" style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            <button onClick={() => viewMode === 'month' ? changeMonth(-1) : changeDate(viewMode === 'timeline' ? -7 : -1)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '6px', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
                            <button onClick={() => setSelectedDate(new Date())} style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '6px 10px', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer' }}>HOY</button>
                            <button onClick={() => viewMode === 'month' ? changeMonth(1) : changeDate(viewMode === 'timeline' ? 7 : 1)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '6px', cursor: 'pointer' }}><ChevronRight size={16} /></button>
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

                <div style={{ flex: 1, overflow: 'auto', position: 'relative' }} ref={scrollRef}>
                    {viewMode === 'timeline' && (
                        <div style={{ position: 'relative', minHeight: '1440px', minWidth: '800px' }}>
                           <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid #E2E8F0' }}>
                               <div />
                               {weekDays.map(wd => (
                                   <div key={wd.dateStr} onClick={() => setSelectedDate(wd.date)} style={{ textAlign: 'center', padding: '6px 0', borderLeft: '1px solid #E2E8F0', cursor: 'pointer', background: wd.isToday ? 'rgba(255,140,66,0.08)' : 'transparent' }}>
                                       <div style={{ fontSize: '0.6rem', fontWeight: 900, color: wd.isToday ? 'var(--domain-orange)' : '#94A3B8' }}>{dayNames[wd.dayIdx]}</div>
                                       <div style={{ fontSize: '1.05rem', fontWeight: 900 }}>{wd.date.getDate()}</div>
                                   </div>
                               ))}
                           </div>
                           <div style={{ flex: 1, position: 'relative', display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)' }}>
                               {weekDays.some(w => w.isToday) && (
                                   <div style={{ position: 'absolute', top: currentPos, left: 60, right: 0, height: '2px', background: '#ef4444', zIndex: 10 }} />
                               )}
                               <div style={{ borderRight: '1px solid #E2E8F0' }}>
                                   {hours.map(h => <div key={h} style={{ height: '60px', borderBottom: '1px solid #F1F5F9', textAlign: 'right', paddingRight: '8px', fontSize: '0.65rem', color: '#94A3B8' }}>{h}:00</div>)}
                               </div>
                               {weekDays.map((wd, i) => (
                                   <div key={i} style={{ position: 'relative', borderRight: '1px solid #F1F5F9' }}>
                                       {hours.map(h => <div key={h} style={{ height: '60px', borderBottom: '1px solid #F1F5F9' }} />)}
                                       {wd.evs.map(e => (
                                            <div key={e.id} onClick={() => setEditingItem({ type: 'calendar', data: e })} style={{ position: 'absolute', top: e.startMin, left: 4, right: 4, height: Math.max(e.endMin - e.startMin, 50), background: e.color, borderRadius: '8px', padding: '6px', color: 'white', zIndex: 6, fontSize: '0.7rem', fontWeight: 800 }}>{e.title}</div>
                                       ))}
                                       {wd.rts.map(r => {
                                            const s = toMin(r.startTime), e = toMin(r.endTime);
                                            return <div key={r.id} onClick={() => setEditingItem({ type: 'routine', data: r })} style={{ position: 'absolute', top: s, left: 2, right: 2, height: e - s, background: `${r.color}15`, borderLeft: `3px solid ${r.color}`, fontSize: '0.6rem', padding: '4px' }}>{r.title}</div>
                                       })}
                                   </div>
                               ))}
                           </div>
                        </div>
                    )}
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

            <AnimatePresence>
                {editingItem && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', width: '300px' }}>
                            <h3 style={{ marginTop: 0 }}>Editar</h3>
                            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ width: '100%', marginBottom: '10px' }} />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setEditingItem(null)}>Cancelar</button>
                                <button onClick={() => setEditingItem(null)} style={{ background: 'var(--domain-orange)', color: 'white' }}>Guardar</button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
