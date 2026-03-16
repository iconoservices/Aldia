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
            <div className="glass-card now-playing-agenda" style={{ padding: '0.8rem 1.2rem', marginBottom: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {upcomingEvents.length === 0 ? (
                        <div style={{ 
                            fontSize: '0.75rem', 
                            color: '#AAA',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                             <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F0F0F0' }}></span>
                             ✨ Pista libre por ahora
                        </div>
                    ) : (
                        upcomingEvents.slice(0, 3).map((event, idx) => {
                            const [startH, startM] = event.startTime.split(':').map(Number);
                            const startTimeMinutes = startH * 60 + startM;
                            const isLive = currentTimeMinutes >= startTimeMinutes;
                            const isNext = !isLive && idx === 0;

                            return (
                                <div
                                    key={event.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '12px',
                                        opacity: (isLive || isNext) ? 1 : 0.6
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                                        <div style={{ 
                                            minWidth: '8px', 
                                            height: '8px', 
                                            borderRadius: '50%', 
                                            background: isLive ? 'var(--domain-orange)' : (isNext ? 'var(--domain-green)' : '#DDD'),
                                            boxShadow: isLive ? '0 0 8px rgba(255,140,66,0.4)' : 'none'
                                        }}></div>
                                        <span style={{ 
                                            fontSize: '0.85rem', 
                                            fontWeight: 800, 
                                            color: isLive ? 'var(--domain-orange)' : 'var(--text-carbon)',
                                            whiteSpace: 'nowrap', 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis' 
                                        }}>
                                            {event.title}
                                        </span>
                                    </div>
                                    <span style={{ 
                                        fontSize: '0.7rem', 
                                        fontWeight: 900, 
                                        color: isLive ? 'var(--domain-orange)' : '#BBB'
                                    }}>
                                        {event.startTime}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
