import type { CalendarEvent } from '../../hooks/useAlDiaState';
import { Clock } from 'lucide-react';

interface UpcomingListProps {
    agenda: CalendarEvent[];
}

export const UpcomingList = ({ agenda }: UpcomingListProps) => {
    // Obtener la hora actual para filtrar eventos pasados
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    // Filtrar eventos de la agenda que aún no han terminado o que son futuros
    const upcomingEvents = agenda.filter(event => {
        const [endH, endM] = event.endTime.split(':').map(Number);
        const endTimeMinutes = endH * 60 + endM;
        return endTimeMinutes > currentTimeMinutes;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));

    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Clock size={18} color="var(--domain-orange)" />
                Próximas Citas (Agenda)
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
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <span style={{ fontSize: '0.85rem' }}>{event.title}</span>
                                    <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{event.startTime}</span>
                                </div>
                                {isLive && (
                                    <span style={{
                                        fontSize: '0.55rem',
                                        background: 'rgba(255,255,255,0.2)',
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        textTransform: 'uppercase'
                                    }}>Live</span>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
