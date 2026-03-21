import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, CheckCircle2, Circle, Star, Zap, Coffee, Moon, Sun, Clock, Wallet } from 'lucide-react';
import type { Mission, Routine, CalendarEvent, FixedExpense } from '../../hooks/useAlDiaState';

interface DayTimelineViewProps {
    isOpen: boolean;
    onClose: () => void;
    missions: Mission[];
    rutinas: Routine[];
    agenda: CalendarEvent[];
    fixedExpenses: FixedExpense[];
    markFixedExpensePaid: (id: number, monthStr: string) => void;
}

export const DayTimelineView = ({ isOpen, onClose, missions, rutinas, agenda, fixedExpenses, markFixedExpensePaid }: DayTimelineViewProps) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
    // Adjust dayOfWeek to match rutinas (0=Mon, 6=Sun if following common ISO, but let's check useAlDiaState)
    // In loadFromLocal: repeatDays: [0,1,2,3,4,5,6] usually means all days.
    // Standard JS getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    // Let's assume routines 0=Mon for now since it's common in Spain/Latam apps, but I'll normalize it.
    const normalizedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=Mon...6=Sun

    const todayStr = today.toLocaleDateString('en-CA');

    // 1. Consolidar Items
    const timelineItems: any[] = [];

    // Rutinas de hoy
    rutinas.filter(r => r.isActive && r.repeatDays?.includes(normalizedDay)).forEach(r => {
        if (r.startTime) {
            timelineItems.push({
                time: r.startTime,
                endTime: r.endTime,
                type: 'routine',
                label: r.title,
                color: r.color,
                items: r.items,
                id: `r-${r.id}`
            });
        }
    });

    // Eventos de hoy
    agenda.filter(e => e.date === todayStr).forEach(e => {
        timelineItems.push({
            time: e.startTime,
            endTime: e.endTime,
            type: 'event',
            label: e.title,
            color: 'var(--domain-orange)',
            id: `e-${e.id}`
        });
    });

    // Misiones de hoy
    missions.filter(m => !m.completed && (m.dueDate === todayStr || !m.dueDate)).forEach(m => {
        timelineItems.push({
            time: m.dueTime || '00:00', // Si no tiene hora, al inicio o manejamos "Todo el día"
            type: 'mission',
            label: m.text,
            q: m.q,
            completed: m.completed,
            id: `m-${m.id}`
        });
    });

    // Gastos Fijos de hoy
    const currentMonthStr = todayStr.substring(0, 7);
    fixedExpenses.filter(e => e.active && e.dueDay === today.getDate()).forEach(e => {
        const isPaid = e.lastPaidMonth === currentMonthStr;
        timelineItems.push({
            time: '08:00', // Ponemos una hora por defecto en la mañana
            type: 'fixed-expense',
            label: `Pagar: ${e.text}`,
            q: `$${e.amount.toLocaleString()}`,
            completed: isPaid,
            expenseId: e.id,
            color: 'var(--domain-green)',
            id: `f-${e.id}`
        });
    });

    // Ordenar por hora
    timelineItems.sort((a, b) => a.time.localeCompare(b.time));

    const getIcon = (type: string, label: string) => {
        if (type === 'routine') {
            const lowLabel = label.toLowerCase();
            if (lowLabel.includes('mañana')) return <Sun size={18} />;
            if (lowLabel.includes('noche')) return <Moon size={18} />;
            if (lowLabel.includes('tarde')) return <Zap size={18} />;
            return <Coffee size={18} />;
        }
        if (type === 'event') return <Calendar size={18} />;
        if (type === 'fixed-expense') return <Wallet size={18} />;
        return <Star size={18} />;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={overlayStyle}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={backdropStyle}
                    />
                    
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        style={panelStyle}
                    >
                        {/* Header */}
                        <div style={headerStyle}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>Línea de Tiempo</h2>
                                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6, fontWeight: 700 }}>
                                    {today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </p>
                            </div>
                            <button onClick={onClose} style={closeButtonStyle}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div style={scrollContentStyle}>
                            <div style={timelineContainerStyle}>
                                {/* Vertical Line */}
                                <div style={verticalLineStyle} />

                                {timelineItems.map((item, idx) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        style={itemRowStyle}
                                    >
                                        {/* Time Column */}
                                        <div style={timeColumnStyle}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                                <Clock size={10} color="#CCC" />
                                                <span style={timeTextStyle}>{item.time}</span>
                                            </div>
                                            {item.endTime && <span style={endTimeTextStyle}>{item.endTime}</span>}
                                        </div>

                                        {/* Node */}
                                        <div style={{ ...nodeStyle, background: item.color || '#DDD' }}>
                                            <div style={nodeDotStyle} />
                                        </div>

                                        {/* Card */}
                                        <div style={{
                                            ...cardStyle,
                                            borderLeft: `4px solid ${item.color || 'var(--domain-blue)'}`,
                                            background: item.type === 'routine' ? `${item.color}08` : 'white'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                                <span style={{ color: item.color || '#666' }}>{getIcon(item.type, item.label)}</span>
                                                <h4 style={cardTitleStyle}>{item.label}</h4>
                                            </div>
                                            
                                            {(item.type === 'mission' || item.type === 'fixed-expense') && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {item.type === 'fixed-expense' && (
                                                        <button 
                                                            onClick={() => {
                                                                if (!item.completed) markFixedExpensePaid(item.expenseId, currentMonthStr);
                                                            }}
                                                            style={{
                                                                background: 'transparent', border: 'none', cursor: item.completed ? 'default' : 'pointer', padding: 0,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                            }}
                                                        >
                                                            {item.completed ? <CheckCircle2 size={16} color="var(--domain-green)" /> : <Circle size={16} color="#CBD5E1" />}
                                                        </button>
                                                    )}
                                                    <span style={{ 
                                                        fontSize: '0.65rem', 
                                                        fontWeight: 800, 
                                                        background: item.type === 'fixed-expense' ? '#DCFCE7' : '#EEE', 
                                                        padding: '2px 6px', 
                                                        borderRadius: '6px',
                                                        color: item.type === 'fixed-expense' ? 'var(--domain-green)' : '#888'
                                                    }}>{item.q}</span>
                                                </div>
                                            )}

                                            {item.type === 'routine' && item.items && item.items.length > 0 && (
                                                <div style={{ marginTop: '8px', display: 'grid', gap: '4px' }}>
                                                    {item.items.map((sub: any) => (
                                                        <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#666' }}>
                                                            {sub.completed ? <CheckCircle2 size={12} color="var(--domain-green)" /> : <Circle size={12} />}
                                                            <span style={{ textDecoration: sub.completed ? 'line-through' : 'none', opacity: sub.completed ? 0.5 : 1 }}>
                                                                {sub.text}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {timelineItems.length === 0 && (
                                <div style={emptyStateStyle}>
                                    <p>No tienes nada programado para hoy todavía. 🌟</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// Styles
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 4000, display: 'flex', justifyContent: 'flex-end' };
const backdropStyle: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' };
const panelStyle: React.CSSProperties = { 
    position: 'relative', width: '100%', maxWidth: '450px', background: 'white', 
    height: '100%', boxShadow: '-10px 0 50px rgba(0,0,0,0.1)', display: 'flex', 
    flexDirection: 'column', borderTopLeftRadius: '30px', borderBottomLeftRadius: '30px',
    overflow: 'hidden'
};

const headerStyle: React.CSSProperties = { 
    padding: '1.5rem 2rem', borderBottom: '1px solid #F0F0F0', display: 'flex', 
    justifyContent: 'space-between', alignItems: 'center', background: 'white',
    zIndex: 10
};

const closeButtonStyle: React.CSSProperties = { 
    border: 'none', background: '#F5F5F5', padding: '10px', borderRadius: '50%', 
    cursor: 'pointer', color: '#888', display: 'flex' 
};

const scrollContentStyle: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '1.5rem 1rem' };
const timelineContainerStyle: React.CSSProperties = { position: 'relative', paddingLeft: '1rem' };
const verticalLineStyle: React.CSSProperties = { 
    position: 'absolute', left: '72px', top: '10px', bottom: '10px', width: '2px', 
    background: '#F0F0F0', zIndex: 0 
};

const itemRowStyle: React.CSSProperties = { display: 'flex', gap: '15px', marginBottom: '1.5rem', position: 'relative' };
const timeColumnStyle: React.CSSProperties = { width: '45px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: '4px' };
const timeTextStyle: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-carbon)' };
const endTimeTextStyle: React.CSSProperties = { fontSize: '0.65rem', fontWeight: 700, color: '#AAA' };

const nodeStyle: React.CSSProperties = { 
    width: '18px', height: '18px', borderRadius: '50%', zIndex: 1, 
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '6px',
    boxShadow: '0 0 0 4px white'
};
const nodeDotStyle: React.CSSProperties = { width: '6px', height: '6px', borderRadius: '50%', background: 'white' };

const cardStyle: React.CSSProperties = { 
    flex: 1, padding: '1rem', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
    border: '1px solid #F5F5F5'
};

const cardTitleStyle: React.CSSProperties = { margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-carbon)' };
const emptyStateStyle: React.CSSProperties = { textAlign: 'center', padding: '4rem 2rem', color: '#AAA', fontWeight: 600 };
