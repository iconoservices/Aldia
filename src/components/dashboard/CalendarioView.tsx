import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import type { CalendarEvent, TimeBlock, Routine } from '../../hooks/useAlDiaState';

interface CalendarioViewProps {
    agenda: CalendarEvent[];
    timeBlocks: TimeBlock[];
    rutinas: Routine[];
}

export const CalendarioView = ({ agenda, timeBlocks, rutinas }: CalendarioViewProps) => {
    // console.log('TimeBlocks ready for V2 visualization:', timeBlocks.length);
    const [viewMode, setViewMode] = useState<'month' | 'week'>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [nowLinePos, setNowLinePos] = useState(new Date().getHours() * 50 + (new Date().getMinutes() / 60) * 50);

    // Actualizar la línea de "Ahora" cada minuto
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setNowLinePos(now.getHours() * 50 + (now.getMinutes() / 60) * 50);
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const goToToday = () => setCurrentDate(new Date());

    // Auxiliares para cálculo de fechas
    const startOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - (day === 0 ? 6 : day - 1); // Ajuste para que empiece en Lunes
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    };

    const weekDays = useMemo(() => {
        const start = startOfWeek(currentDate);
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
    }, [currentDate]);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    
    const monthDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysCount = getDaysInMonth(year, month);
        const firstDay = new Date(year, month, 1).getDay();
        const startPadding = firstDay === 0 ? 6 : firstDay - 1; // Lunes = 0
        
        return {
            padding: Array.from({ length: startPadding }),
            days: Array.from({ length: daysCount }).map((_, i) => i + 1)
        };
    }, [currentDate]);

    const nextPeriod = () => {
        const next = new Date(currentDate);
        if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
        else next.setDate(next.getDate() + 7);
        setCurrentDate(next);
    };

    const prevPeriod = () => {
        const prev = new Date(currentDate);
        if (viewMode === 'month') prev.setMonth(prev.getMonth() - 1);
        else prev.setDate(prev.getDate() - 7);
        setCurrentDate(prev);
    };

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    // Renderizado Sugerido
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
            {/* HEADER DEL CALENDARIO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.8rem 1.2rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'rgba(255, 140, 66, 0.1)', color: 'var(--domain-orange)', padding: '10px', borderRadius: '14px' }}>
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-carbon)' }}>
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#AAA', fontWeight: 600 }}>
                            {viewMode === 'month' ? 'Vista Mensual' : 'Vista Semanal'}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                        onClick={goToToday}
                        style={{ background: '#F0EBE6', border: 'none', padding: '6px 14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 900, color: 'var(--domain-orange)', cursor: 'pointer', marginRight: '8px' }}
                    >
                        HOY
                    </button>

                    <div style={{ display: 'flex', background: '#F5F5F5', padding: '4px', borderRadius: '12px', marginRight: '0.5rem' }}>
                        <button 
                            onClick={() => setViewMode('week')}
                            style={{ padding: '6px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, background: viewMode === 'week' ? 'white' : 'transparent', color: viewMode === 'week' ? 'var(--domain-orange)' : '#AAA', boxShadow: viewMode === 'week' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}>
                            SEMANA
                        </button>
                        <button 
                            onClick={() => setViewMode('month')}
                            style={{ padding: '6px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, background: viewMode === 'month' ? 'white' : 'transparent', color: viewMode === 'month' ? 'var(--domain-orange)' : '#AAA', boxShadow: viewMode === 'month' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}>
                            MES
                        </button>
                    </div>
                    
                    <button onClick={prevPeriod} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #EEE', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} /></button>
                    <button onClick={nextPeriod} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #EEE', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={16} /></button>
                </div>
            </div>

            {/* GRID DEL CALENDARIO */}
            <div className="glass-card" style={{ padding: '0.8rem', background: 'white', minHeight: '400px', overflowY: 'auto' }}>
                {viewMode === 'week' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '0', maxHeight: '500px', overflowY: 'auto', position: 'relative' }}>
                        {/* Horas */}
                        <div style={{ display: 'grid', gridTemplateRows: 'repeat(24, 50px)' }}>
                            {Array.from({ length: 24 }).map((_, i) => (
                                <div key={i} style={{ fontSize: '0.65rem', color: '#CCC', fontWeight: 800, textAlign: 'right', paddingRight: '10px' }}>
                                    {String(i).padStart(2, '0')}:00
                                </div>
                            ))}
                        </div>
                        {/* Columnas de Días */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: '#F9F9F9', position: 'relative' }}>
                            {/* Línea de tiempo "Ahora" */}
                            <div style={{ position: 'absolute', top: `${nowLinePos}px`, left: 0, right: 0, height: '2px', background: '#FF4D4D', zIndex: 10, pointerEvents: 'none' }}>
                                <div style={{ position: 'absolute', left: '-5px', top: '-4px', width: '10px', height: '10px', borderRadius: '50%', background: '#FF4D4D' }} />
                            </div>

                            {weekDays.map((date, idx) => {
                                const isToday = date.toDateString() === new Date().toDateString();
                                const dateStr = date.toISOString().split('T')[0];
                                const dayEvents = agenda.filter(e => e.date === dateStr);
                                const dayBlocks = timeBlocks.filter(() => {
                                    // Por ahora los timeBlocks son diarios recurrentes o necesitan fecha?
                                    // El hook actual no tiene fecha en TimeBlock, asumimos diarios.
                                    return true; 
                                });

                                return (
                                    <div key={idx} style={{ background: isToday ? 'rgba(255,140,66,0.02)' : 'white', minHeight: '1200px', position: 'relative', borderRight: '1px solid #F0F0F0' }}>
                                        <div style={{ textAlign: 'center', padding: '8px', borderBottom: isToday ? '2px solid var(--domain-orange)' : '1px solid #F0F0F0', fontWeight: 900, color: isToday ? 'var(--domain-orange)' : 'var(--text-carbon)', fontSize: '0.75rem' }}>
                                            {dayNames[idx]} {date.getDate()}
                                        </div>
                                        <div style={{ position: 'relative', height: '1200px' }}>
                                            {/* Render real events */}
                                            {dayEvents.map(event => {
                                                const [h, m] = event.startTime.split(':').map(Number);
                                                const [eh, em] = event.endTime.split(':').map(Number);
                                                const top = h * 50 + (m / 60) * 50;
                                                const duration = (eh * 60 + em) - (h * 60 + m);
                                                const height = (duration / 60) * 50;

                                                return (
                                                    <div 
                                                        key={event.id}
                                                        style={{ 
                                                            position: 'absolute', top: `${top}px`, left: '4px', right: '4px', height: `${Math.max(25, height)}px`, 
                                                            background: 'rgba(255, 140, 66, 0.15)', borderLeft: '3px solid var(--domain-orange)',
                                                            borderRadius: '6px', color: 'var(--text-carbon)', padding: '4px 8px', fontSize: '0.65rem', fontWeight: 800, 
                                                            zIndex: 2, overflow: 'hidden'
                                                        }}
                                                    >
                                                        {event.title}
                                                    </div>
                                                );
                                            })}

                                            {/* Render time blocks */}
                                            {dayBlocks.map(block => {
                                                const [h, m] = block.start.split(':').map(Number);
                                                const [eh, em] = block.end.split(':').map(Number);
                                                const top = h * 50 + (m / 60) * 50;
                                                const duration = (eh * 60 + em) - (h * 60 + m);
                                                const height = (duration / 60) * 50;

                                                return (
                                                    <div 
                                                        key={block.id}
                                                        style={{ 
                                                            position: 'absolute', top: `${top}px`, left: '4px', right: '4px', height: `${height}px`, 
                                                            background: `${block.color}15`, borderLeft: `3px solid ${block.color}`,
                                                            borderRadius: '6px', color: '#666', padding: '4px 8px', fontSize: '0.6rem', fontWeight: 700, 
                                                            opacity: 0.6, pointerEvents: 'none'
                                                        }}
                                                    >
                                                        {block.label}
                                                    </div>
                                                );
                                            })}
                                            {/* Render routine blocks */}
                                            {rutinas.filter(r => r.isActive && r.repeatDays?.includes(idx)).map(rutina => {
                                                if (!rutina.startTime || !rutina.endTime) return null;
                                                const [h, m] = rutina.startTime.split(':').map(Number);
                                                const [eh, em] = rutina.endTime.split(':').map(Number);
                                                const top = h * 50 + (m / 60) * 50;
                                                const duration = (eh * 60 + em) - (h * 60 + m);
                                                const height = (duration / 60) * 50;

                                                return (
                                                    <div 
                                                        key={`r-${rutina.id}`}
                                                        style={{ 
                                                            position: 'absolute', top: `${top}px`, left: '8px', right: '8px', height: `${height}px`, 
                                                            background: `${rutina.color}20`, borderLeft: `4px solid ${rutina.color}`,
                                                            borderRadius: '8px', color: '#444', padding: '6px 10px', fontSize: '0.65rem', fontWeight: 900, 
                                                            zIndex: 1, pointerEvents: 'none', overflow: 'hidden'
                                                        }}
                                                    >
                                                        {rutina.title.toUpperCase()}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Líneas horizontales de hora */}
                            {Array.from({ length: 24 }).map((_, i) => (
                                <div key={i} style={{ position: 'absolute', top: `${(i)*50}px`, left: 0, right: 0, height: '1px', background: 'rgba(0,0,0,0.03)', pointerEvents: 'none' }} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                        {dayNames.map(day => (
                            <div key={day} style={{ textAlign: 'center', color: '#888', fontWeight: 900, fontSize: '0.7rem', padding: '10px 0' }}>{day}</div>
                        ))}
                        {/* Padding days */}
                        {monthDays.padding.map((_, i) => (
                            <div key={`p-${i}`} style={{ height: '80px', opacity: 0 }} />
                        ))}
                        {/* Selected month days */}
                        {monthDays.days.map(day => {
                            const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
                            return (
                                <div key={day} style={{ 
                                    height: '80px', 
                                    border: isToday ? '2px solid var(--domain-orange)' : '1px solid #F0F0F0', 
                                    borderRadius: '16px', 
                                    padding: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    background: isToday ? 'rgba(255,140,66,0.05)' : 'white'
                                }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: isToday ? 'var(--domain-orange)' : '#BBB' }}>{day}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* PANEL LATERAL / RESUMEN */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="glass-card" style={{ background: 'white' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={18} color="var(--domain-orange)" /> Estadísticas de Tiempo
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ background: '#FDF8F5', padding: '1rem', borderRadius: '16px' }}>
                            <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 800, color: '#888', textTransform: 'uppercase' }}>Focus Time</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 900, color: 'var(--domain-orange)' }}>24.5h</p>
                        </div>
                        <div style={{ background: '#F5FCF9', padding: '1rem', borderRadius: '16px' }}>
                            <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 800, color: '#888', textTransform: 'uppercase' }}>Descanso</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 900, color: '#10B981' }}>12.2h</p>
                        </div>
                    </div>
                </div>

                <div className="glass-card" style={{ background: 'white' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1rem' }}>Próximos Eventos</h3>
                    {agenda.slice(0, 3).map(event => (
                        <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F5F5F5' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{event.title}</span>
                            <span style={{ fontSize: '0.85rem', color: '#BBB', fontWeight: 800 }}>{event.startTime}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
