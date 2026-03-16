import type { CalendarEvent } from '../../hooks/useAlDiaState';

interface UpcomingListProps {
    agenda: CalendarEvent[];
    hideOnEmpty?: boolean;
    title?: string;
}

export const UpcomingList = ({ agenda, title = "Agenda" }: UpcomingListProps) => {
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

    // No ocultamos el componente entero, solo mostramos estado vacío si no hay citas

    return (
        <div style={{ marginBottom: '0.4rem' }}>
            <h3 style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                marginBottom: '4px',
                fontSize: '0.9rem',
                fontWeight: 900,
                color: 'var(--text-carbon)',
                textTransform: 'none',
                opacity: 0.6
            }}>
                {title}
            </h3>
            <div className="upcoming-list" style={{ display: 'grid', gap: '0.4rem' }}>
                {upcomingEvents.length === 0 ? (
                    <div style={{ 
                        padding: '8px 14px', 
                        background: 'rgba(0,0,0,0.015)', 
                        borderRadius: '14px', 
                        fontSize: '0.7rem', 
                        color: '#AAA',
                        fontWeight: 600,
                        border: '1px dashed #EEE'
                    }}>
                         ✨ Sin citas hoy
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
                                    background: isLive ? 'var(--domain-orange)' : 'rgba(255, 140, 66, 0.04)',
                                    color: isLive ? 'white' : 'var(--text-carbon)',
                                    fontWeight: 800,
                                    padding: '0.6rem 0.9rem', // Aún más compacto
                                    borderRadius: '16px',
                                    border: isLive ? 'none' : '1px solid rgba(255, 140, 66, 0.1)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: isLive ? '0 4px 12px rgba(255,140,66,0.15)' : 'none',
                                    marginBottom: '2px'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                        {isLive && (
                                            <div className="pulse-dot" style={{ minWidth: '6px', height: '6px', borderRadius: '50%', background: 'white' }}></div>
                                        )}
                                        <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.2px' }}>{event.title}</span>
                                    </div>
                                    <span style={{ fontSize: '0.65rem', opacity: 0.7, fontWeight: 800, whiteSpace: 'nowrap' }}>
                                        {event.startTime}
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
