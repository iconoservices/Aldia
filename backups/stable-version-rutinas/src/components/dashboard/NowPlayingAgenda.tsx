import { Clock, ExternalLink } from 'lucide-react';
import type { CalendarEvent } from '../../hooks/useAlDiaState';

interface NowPlayingAgendaProps {
    agenda: CalendarEvent[];
}

export const NowPlayingAgenda = ({ agenda }: NowPlayingAgendaProps) => {
    // Determinar qué toca ahora basado en la hora actual
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const findCurrentEvent = () => {
        return agenda.find(event => {
            const [startH, startM] = event.startTime.split(':').map(Number);
            const [endH, endM] = event.endTime.split(':').map(Number);
            const startTimeMinutes = startH * 60 + startM;
            const endTimeMinutes = endH * 60 + endM;
            return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
        });
    };

    const findNextEvent = () => {
        return agenda.find(event => {
            const [startH, startM] = event.startTime.split(':').map(Number);
            const startTimeMinutes = startH * 60 + startM;
            return startTimeMinutes > currentTimeMinutes;
        });
    };

    const currentEvent = findCurrentEvent();
    const nextEvent = !currentEvent ? findNextEvent() : null;

    // Si no hay nada ahora ni después, usar el primero del día o un placeholder
    const activeEvent = currentEvent || nextEvent || agenda[0];
    const statusLabel = currentEvent ? 'Ahora Mismo' : (nextEvent ? 'Próximo' : 'Agenda');

    return (
        <div className="glass-card now-playing-agenda" style={{
            marginBottom: '1.5rem',
            borderLeft: `4px solid ${currentEvent ? 'var(--domain-orange)' : '#DDD'}`,
            padding: '1.2rem 1.5rem',
            background: 'white',
            boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 900,
                        color: currentEvent ? 'var(--domain-orange)' : '#888',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        background: currentEvent ? 'rgba(255, 140, 66, 0.1)' : '#F5F5F5',
                        padding: '4px 10px',
                        borderRadius: '8px'
                    }}>
                        {statusLabel}
                    </span>
                    {currentEvent && <div className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--domain-orange)' }}></div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#888', fontSize: '0.85rem', fontWeight: 700 }}>
                    <Clock size={14} strokeWidth={2.5} />
                    <span>{activeEvent.startTime} - {activeEvent.endTime}</span>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-carbon)', fontWeight: 900, letterSpacing: '-0.5px' }}>
                        {activeEvent.title}
                    </h3>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#666', fontWeight: 600, lineHeight: 1.4 }}>
                        {activeEvent.description}
                    </p>
                </div>
                <button style={{
                    border: 'none',
                    background: '#F5F5F5',
                    color: '#888',
                    padding: '10px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <ExternalLink size={18} />
                </button>
            </div>

            {/* Pequeño indicador de progreso de la reunión si está activa */}
            {currentEvent && (
                <div style={{ width: '100%', height: '4px', background: '#F0EBE6', borderRadius: '2px', marginTop: '15px', overflow: 'hidden' }}>
                    <div style={{ width: '45%', height: '100%', background: 'var(--domain-orange)', borderRadius: '2px' }}></div>
                </div>
            )}
        </div>
    );
};
