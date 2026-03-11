import type { CalendarEvent } from '../../hooks/useAlDiaState';
import { Clock } from 'lucide-react';

interface UpcomingListProps {
    agenda: CalendarEvent[];
    hideOnEmpty?: boolean;
}

export const UpcomingList = ({ agenda, hideOnEmpty = false }: UpcomingListProps) => {
    // Obtener la hora actual para filtrar eventos pasados
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const todayStr = now.toLocaleDateString('en-CA');
    const upcomingEvents = agenda.filter(event => {
        if (event.date && event.date !== todayStr) return false;
        const [endH, endM] = event.endTime.split(':').map(Number);
        const endTimeMinutes = endH * 60 + endM;
        return endTimeMinutes > currentTimeMinutes;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (hideOnEmpty && upcomingEvents.length === 0) return null;

    return (
        <div style={{ marginBottom: '0.3rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Clock size={18} color="var(--domain-orange)" />
                Agenda
            </h3>
            <div className="upcoming-list" style={{ display: 'grid', gap: '0.8rem' }}>
                {upcomingEvents.length === 0 ? (
                    <div className="glass-card capsule upcoming-item" style={{ background: '#F5F5F5', color: '#AAA', textAlign: 'center', padding: '1rem', borderRadius: '18px' }}>
                        No hay más citas hoy ✨
                    </div>
                ) : (
                    upcomingEvents.slice(0, 3).map(event => {
                        const [startH, startM] = event.startTime.split(':').map(Number);
                        const startTimeMinutes = startH * 60 + startM;
                        const isLive = currentTimeMinutes >= startTimeMinutes;

                        return (
                            <div
                                key={event.id}
                                className="glass-card capsule upcoming-item"
                                style={{
                                    background: isLive ? 'var(--domain-orange)' : 'white',
                                    color: isLive ? 'white' : 'var(--text-carbon)',
                                    fontWeight: 800,
                                    padding: '0.4rem 1rem', // Mucho más delgado
                                    borderRadius: '14px',
                                    border: isLive ? 'none' : '1.5px solid #F0F0F0',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: isLive ? '0 4px 12px rgba(255,140,66,0.15)' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                        {isLive && (
                                            <div className="pulse-dot" style={{ minWidth: '6px', height: '6px', borderRadius: '50%', background: 'white' }}></div>
                                        )}
                                        <span style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</span>
                                    </div>
                                    <span style={{ fontSize: '0.62rem', opacity: 0.8, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                        {event.startTime} - {event.endTime}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
