import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ChevronLeft, ChevronRight, CalendarDays, Filter, Trash2, X } from 'lucide-react';

interface TimelineAgendaViewProps {
    calendarEvents: any[];
    projects: any[];
    rutinas?: any[];
    timeBlocks?: any[];
    onRemoveEvent?: (id: number) => void;
}

export const TimelineAgendaView = ({ calendarEvents, projects, rutinas = [], timeBlocks = [], onRemoveEvent }: TimelineAgendaViewProps) => {
    const [viewMode, setViewMode] = useState<'timeline' | 'month' | 'appointments'>('timeline');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editingEvent, setEditingEvent] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    
    const todayStr = selectedDate.toISOString().split('T')[0];
    const isActualToday = todayStr === new Date().toISOString().split('T')[0];
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

    // 3. Filtrar entregas del proyecto para el día seleccionado
    const dayDeliveries = useMemo(() => {
        const delivs: any[] = [];
        projects.forEach(p => {
            (p.objectives || []).forEach((obj: any) => {
                if (obj.dueDate === todayStr) delivs.push({ ...obj, projectName: p.name, projectColor: p.color, type: 'objective' });
                (obj.nodes || []).forEach((node: any) => {
                    if (node.dueDate === todayStr) delivs.push({ ...node, projectName: p.name, projectColor: p.color, type: 'meta' });
                });
            });
        });
        return delivs;
    }, [projects, todayStr]);

    // 4. Eventos y Misiones con hora
    const dayEvents = useMemo(() => {
        const items = (calendarEvents || []).filter(e => e.date === todayStr).map(e => ({
            ...e,
            itemType: 'event',
            color: e.color || '#3b82f6'
        }));
        return items.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    }, [calendarEvents, todayStr]);

    // 5. Rutinas del día
    const dayRutinas = useMemo(() => {
        const dayIdx = selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1; // Lunes = 0
        return rutinas.filter(r => r.isActive && r.repeatDays?.includes(dayIdx));
    }, [rutinas, selectedDate]);

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

    const currentTime = new Date();
    const currentPos = (currentTime.getHours() * 60) + currentTime.getMinutes();

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    // Helper: convierte "HH:MM" a minutos desde medianoche → directo a px (1 min = 1 px)
    const toMin = (t?: string) => {
        if (!t) return -1;
        const [hh, mm] = t.split(':').map(Number);
        return hh * 60 + (mm || 0);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
            {/* Header / Navigation */}
            <div style={{ padding: '1rem', background: 'white', borderBottom: '1px solid #E2E8F0', borderRadius: '0 0 24px 24px', zIndex: 100 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>
                            {viewMode === 'month' ? monthNames[selectedDate.getMonth()] : todayStr}
                        </h2>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
                            {viewMode.toUpperCase()}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => viewMode === 'month' ? changeMonth(-1) : changeDate(-1)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer' }}><ChevronLeft size={18} /></button>
                        <button onClick={() => setSelectedDate(new Date())} style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '8px 12px', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer' }}>HOY</button>
                        <button onClick={() => viewMode === 'month' ? changeMonth(1) : changeDate(1)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer' }}><ChevronRight size={18} /></button>
                    </div>
                </div>

                {/* View Switcher */}
                <div style={{ display: 'flex', gap: '8px', background: '#F1F5F9', padding: '4px', borderRadius: '14px', marginBottom: '1rem' }}>
                    <button onClick={() => setViewMode('timeline')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', border: 'none', borderRadius: '10px', background: viewMode === 'timeline' ? 'white' : 'transparent', fontSize: '0.7rem', fontWeight: 800, color: viewMode === 'timeline' ? 'var(--domain-orange)' : '#64748B', transition: 'all 0.2s', boxShadow: viewMode === 'timeline' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}>
                        <Clock size={14} /> TIMELINE
                    </button>
                    <button onClick={() => setViewMode('month')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', border: 'none', borderRadius: '10px', background: viewMode === 'month' ? 'white' : 'transparent', fontSize: '0.7rem', fontWeight: 800, color: viewMode === 'month' ? 'var(--domain-orange)' : '#64748B', transition: 'all 0.2s', boxShadow: viewMode === 'month' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}>
                        <CalendarDays size={14} /> MES
                    </button>
                    <button onClick={() => setViewMode('appointments')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', border: 'none', borderRadius: '10px', background: viewMode === 'appointments' ? 'white' : 'transparent', fontSize: '0.7rem', fontWeight: 800, color: viewMode === 'appointments' ? 'var(--domain-orange)' : '#64748B', transition: 'all 0.2s', boxShadow: viewMode === 'appointments' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}>
                        <Filter size={14} /> CITAS
                    </button>
                </div>

                {/* Resumen de Entregas (Solo hoy/seleccionado) */}
                <AnimatePresence>
                    {viewMode !== 'month' && dayDeliveries.length > 0 && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}
                        >
                            {dayDeliveries.map((d, i) => (
                                <div key={i} style={{ background: 'white', border: `1px solid ${d.projectColor || '#E2E8F0'}`, padding: '10px 14px', borderRadius: '14px', minWidth: '130px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: d.projectColor }}>ENTREGA</div>
                                        <Calendar size={10} color={d.projectColor} opacity={0.6} />
                                    </div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-carbon)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }} ref={scrollRef}>
                {viewMode === 'timeline' && (
                    <div style={{ position: 'relative' }}>
                        {/* Current Time Line */}
                        {isActualToday && (
                            <div style={{ position: 'absolute', top: currentPos, left: 0, right: 0, height: '2px', background: '#ef4444', zIndex: 10, pointerEvents: 'none' }}>
                                <div style={{ position: 'absolute', left: 62, top: -9, background: '#ef4444', color: 'white', fontSize: '0.6rem', padding: '2px 5px', borderRadius: '4px', fontWeight: 900 }}>AHORA</div>
                            </div>
                        )}

                        {/* Rutinas — overlay absoluto que abarca startTime→endTime */}
                        {dayRutinas.map(r => {
                            const startPx = toMin(r.startTime);
                            const endPx = toMin(r.endTime);
                            if (startPx < 0 || endPx <= startPx) return null;
                            const h = endPx - startPx;
                            return (
                                <div key={`rtbg-${r.id}`} style={{ position: 'absolute', top: startPx, left: 60, right: 0, height: h, background: `${r.color}10`, borderLeft: `4px solid ${r.color}50`, pointerEvents: 'none', zIndex: 1, display: 'flex', alignItems: 'flex-start', paddingLeft: '10px', paddingTop: '6px', overflow: 'hidden' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: r.color, opacity: 0.7 }}>{r.title} · {r.startTime}–{r.endTime}</span>
                                </div>
                            );
                        })}

                        {/* TimeBlocks — overlay */}
                        {timeBlocks.map((b: any) => {
                            const startPx = toMin(b.start);
                            const endPx = toMin(b.end);
                            if (startPx < 0 || endPx <= startPx) return null;
                            const h = endPx - startPx;
                            return (
                                <div key={`blkbg-${b.id}`} style={{ position: 'absolute', top: startPx, left: 60, right: 0, height: h, background: `${b.color}06`, borderLeft: `2px dashed ${b.color}40`, pointerEvents: 'none', zIndex: 1, display: 'flex', alignItems: 'flex-end', paddingLeft: '10px', paddingBottom: '4px', overflow: 'hidden' }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: b.color, opacity: 0.5 }}>{b.label}</span>
                                </div>
                            );
                        })}

                        {/* Citas — overlay absoluto posicionado por hora+minuto exactos */}
                        {dayEvents.map((item: any) => {
                            const startPx = toMin(item.startTime);
                            const endPx = toMin(item.endTime);
                            if (startPx < 0) return null;
                            const evH = endPx > startPx ? endPx - startPx : 52;
                            return (
                                <motion.div
                                    key={`ev-${item.id}`}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    style={{ position: 'absolute', top: startPx, left: 64, right: 6, height: evH, background: item.color || '#6366F1', borderRadius: '12px', padding: '6px 10px', color: 'white', zIndex: 5, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}
                                    onClick={() => setEditingEvent(item)}
                                >
                                    <div style={{ fontSize: '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        <Clock size={11} />
                                        {item.title}
                                    </div>
                                    <div style={{ fontSize: '0.6rem', opacity: 0.85 }}>{item.startTime} - {item.endTime || '...'}</div>
                                </motion.div>
                            );
                        })}

                        {/* Hora grid lines */}
                        {hours.map(h => (
                            <div key={h} style={{ height: '60px', borderBottom: '1px solid #F1F5F9', display: 'flex', position: 'relative' }}>
                                <div style={{ width: '60px', flexShrink: 0, fontSize: '0.68rem', color: '#94A3B8', textAlign: 'right', paddingRight: '10px', paddingTop: '6px', fontWeight: 700 }}>
                                    {h.toString().padStart(2, '0')}:00
                                </div>
                                <div style={{ flex: 1 }} />
                            </div>
                        ))}
                    </div>
                )}

                {viewMode === 'appointments' && (
                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#64748B', marginBottom: '10px' }}>CITAS Y AGENDA</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {dayEvents.length > 0 ? dayEvents.map((e: any) => (
                                    <div 
                                        key={e.id} 
                                        onClick={() => setEditingEvent(e)}
                                        style={{ background: 'white', padding: '16px', borderRadius: '18px', borderLeft: `6px solid ${e.color}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                    >
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 900 }}>{e.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700 }}>{e.startTime} - {e.endTime}</div>
                                        </div>
                                        <Clock size={18} color={e.color} />
                                    </div>
                                )) : (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: '#CBD5E1', fontSize: '0.8rem', fontWeight: 700 }}>No hay citas para este día</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'month' && (
                    <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                        {dayNames.map(day => (
                            <div key={day} style={{ textAlign: 'center', color: '#CBD5E1', fontWeight: 900, fontSize: '0.65rem', padding: '8px 0' }}>{day}</div>
                        ))}
                        {monthDays.padding.map((_, i) => (
                            <div key={`p-${i}`} style={{ height: '70px', opacity: 0 }} />
                        ))}
                        {monthDays.days.map(day => {
                            const dateStr = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                            const isToday = dateStr === new Date().toISOString().split('T')[0];
                            const hasEvents = (calendarEvents || []).some(e => e.date === dateStr);
                            
                            return (
                                <div 
                                    key={day} 
                                    onClick={() => {
                                        const newDate = new Date(selectedDate);
                                        newDate.setDate(day);
                                        setSelectedDate(newDate);
                                        setViewMode('timeline');
                                    }}
                                    style={{ 
                                        height: '70px', 
                                        border: isToday ? '2px solid var(--domain-orange)' : '1px solid #F1F5F9', 
                                        borderRadius: '12px', 
                                        padding: '6px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        background: isToday ? 'rgba(255,140,66,0.05)' : 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: isToday ? 'var(--domain-orange)' : '#64748B' }}>{day}</span>
                                    {hasEvents && <div style={{ width: '6px', height: '6px', borderRadius: '3px', background: 'var(--domain-orange)', marginTop: '4px' }} />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de acción de cita */}
            <AnimatePresence>
                {editingEvent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', padding: '1rem' }}
                        onClick={() => setEditingEvent(null)}
                    >
                        <motion.div
                            initial={{ y: 60, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 60, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                            style={{ background: 'white', borderRadius: '24px', padding: '1.5rem', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{editingEvent.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700, marginTop: '2px' }}>{editingEvent.startTime} – {editingEvent.endTime || '...'} · {editingEvent.date}</div>
                                    {editingEvent.description && <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '6px' }}>{editingEvent.description}</div>}
                                </div>
                                <button onClick={() => setEditingEvent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94A3B8' }}><X size={20} /></button>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => {
                                        if (onRemoveEvent) onRemoveEvent(editingEvent.id);
                                        setEditingEvent(null);
                                    }}
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: '14px', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer' }}
                                >
                                    <Trash2 size={16} /> Eliminar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
