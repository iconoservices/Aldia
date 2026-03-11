import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Clock, Calendar } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuickActionPanelProps {
    isOpen: boolean;
    onClose: () => void;
    actionType: string | null;
    addMission: (text: string, q?: string, repeat?: 'none' | 'daily' | 'weekly' | 'monthly', noteId?: number, labels?: string[], dueDate?: string, dueTime?: string) => void;
    addTransaction: (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean) => void;
    addHabit: (name: string) => void;
    addCalendarEvent?: (title: string, date: string, start: string, end: string, desc: string) => void;
    addNote: (title: string, content: string, type: 'text' | 'checklist', items: { text: string; completed: boolean }[], q: string, color: string) => void;
}

export const QuickActionPanel = ({ isOpen, onClose, actionType, addMission, addTransaction, addHabit, addCalendarEvent, addNote }: QuickActionPanelProps) => {
    const [amount, setAmount] = useState('');
    const [concept, setConcept] = useState('');
    const [isDebt, setIsDebt] = useState(false);
    const [selectedQ, setSelectedQ] = useState('Q2');
    const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
    
    // Estados para Agenda
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [hasTime, setHasTime] = useState(false);

    // Estados para Notas (Cerebro)
    const [noteType, setNoteType] = useState<'text' | 'checklist'>('text');
    const [noteItems, setNoteItems] = useState<string>(''); // Texto crudo para convertir
    const [noteColor, setNoteColor] = useState('#FFFFFF');
    const [labels, setLabels] = useState<string>(''); // Comma separated labels

    // Mapeo visual por tipo de acción
    const uiConfigs: Record<string, { title: string, color: string, isFinancial: boolean }> = {
        'gasto': { title: 'Registrar Gasto', color: '#f87171', isFinancial: true },
        'ingreso': { title: 'Registrar Ingreso', color: '#4ade80', isFinancial: true },
        'tarea': { title: 'Nueva Tarea', color: '#3b82f6', isFinancial: false },
        'sueno': { title: 'Nuevo Hábito', color: '#a855f7', isFinancial: false },
        'nota': { title: 'Nuevo Bloque (Cerebro)', color: '#facc15', isFinancial: false },
        'agenda': { title: 'Nueva Agenda', color: '#f59e0b', isFinancial: false }
    };

    const currentConfig = actionType ? uiConfigs[actionType] : null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (actionType === 'gasto' || actionType === 'ingreso') {
            addTransaction(concept || (actionType === 'gasto' ? 'Gasto' : 'Ingreso'), parseFloat(amount) || 0, actionType, isDebt);
            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
                colors: [actionType === 'gasto' ? '#f87171' : '#4ade80', '#ffffff']
            });
        } else if (actionType === 'tarea') {
            const labelArray = labels.split(',').map(l => l.trim()).filter(l => l !== '');
            addMission(concept || 'Nueva Tarea', selectedQ, repeat, undefined, labelArray, date, hasTime ? startTime : undefined);
            confetti({
                particleCount: 50,
                spread: 50,
                origin: { y: 0.6 },
                colors: ['#3b82f6', '#ffffff']
            });
        } else if (actionType === 'sueno') {
            addHabit(concept || 'Nuevo Hábito');
            confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.6 },
                colors: ['#a855f7', '#ffffff']
            });
        } else if (actionType === 'agenda' && addCalendarEvent) {
            const finalStart = hasTime ? startTime : '00:00';
            const finalEnd = hasTime ? endTime : '23:59';
            addCalendarEvent(concept || 'Agenda', date, finalStart, finalEnd, 'Añadido desde AlDía');
            confetti({
                particleCount: 60,
                spread: 50,
                origin: { y: 0.6 },
                colors: ['#f59e0b', '#ffffff']
            });
        } else if (actionType === 'nota') {
            const items = noteType === 'checklist' 
                ? noteItems.split('\n').filter(it => it.trim()).map(text => ({ text: text.trim(), completed: false }))
                : [];
            
            addNote(concept, noteType === 'text' ? noteItems : '', noteType, items, selectedQ, noteColor);

            confetti({
                particleCount: 50,
                spread: 40,
                origin: { y: 0.6 },
                colors: [noteColor === '#FFFFFF' ? '#facc15' : noteColor, '#ffffff']
            });
        }

        // Simular guardado visual
        setTimeout(() => {
            setAmount('');
            setConcept('');
            setIsDebt(false);
            setDate(new Date().toISOString().split('T')[0]);
            setStartTime('09:00');
            setEndTime('10:00');
            setHasTime(false);
            setNoteType('text');
            setNoteItems('');
            setNoteColor('#FFFFFF');
            setRepeat('none');
            setLabels('');
            onClose();
        }, 150);
    };

    return (
        <AnimatePresence>
            {isOpen && currentConfig && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 1050
                        }}
                    />

                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        style={{
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'white',
                            borderTopLeftRadius: '32px',
                            borderTopRightRadius: '32px',
                            padding: '1.5rem 1.5rem 3rem 1.5rem',
                            boxShadow: '0 -10px 40px rgba(0,0,0,0.1)',
                            zIndex: 1100,
                            maxHeight: '90vh',
                            overflowY: 'auto'
                        }}
                    >
                        <div style={{ width: '40px', height: '5px', background: '#E0E0E0', borderRadius: '4px', margin: '0 auto 1.5rem auto' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-carbon)' }}>
                                {actionType === 'nota' ? (noteType === 'text' ? '📝 Nota' : '✅ Lista') : currentConfig.title}
                            </h2>
                            <button onClick={onClose} style={{ background: '#F5F5F5', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={20} color="#888" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                            {/* CANTIDAD (FINANZAS) */}
                            {currentConfig.isFinancial && (
                                <div style={{ 
                                    background: '#F9F9F9', 
                                    padding: '1.5rem', 
                                    borderRadius: '24px', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    gap: '4px',
                                    border: '1px solid #EEE'
                                }}>
                                    <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Cantidad</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '2rem', fontWeight: 600, color: '#CCC' }}>$</span>
                                        <input
                                            type="number"
                                            autoFocus
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            style={{
                                                fontSize: '2.5rem',
                                                fontWeight: 900,
                                                color: currentConfig.color,
                                                border: 'none',
                                                outline: 'none',
                                                background: 'transparent',
                                                width: '160px',
                                                textAlign: 'center'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* INPUT PRINCIPAL */}
                            <div style={{ position: 'relative' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#AAA', position: 'absolute', top: '10px', left: '16px', textTransform: 'uppercase' }}>
                                    {currentConfig.isFinancial ? 'Concepto' : (actionType === 'sueno' ? 'Hábito' : (actionType === 'nota' ? 'Título' : 'Nombre de la Tarea'))}
                                </label>
                                <input
                                    type="text"
                                    value={concept}
                                    onChange={(e) => setConcept(e.target.value)}
                                    placeholder="..."
                                    style={{
                                        width: '100%',
                                        padding: '24px 16px 12px 16px',
                                        borderRadius: '20px',
                                        border: '2px solid #F5F5F5',
                                        background: '#FAFAFA',
                                        fontSize: '1.1rem',
                                        fontWeight: 700,
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {/* SECCIONES ESPECÍFICAS */}
                            {actionType === 'tarea' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* CUADRANTE + REPETICIÓN (FILA COMPACTA) */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div style={{ background: '#F9F9F9', padding: '12px', borderRadius: '18px' }}>
                                            <p style={{ margin: '0 0 8px 10px', fontWeight: 800, fontSize: '0.6rem', color: '#BBB', textTransform: 'uppercase' }}>Importancia</p>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                                                    <button
                                                        key={q} type="button" onClick={() => setSelectedQ(q)}
                                                        style={{
                                                            flex: 1, padding: '6px 0', borderRadius: '10px', border: 'none',
                                                            fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer',
                                                            background: selectedQ === q ? 'var(--domain-orange)' : 'white',
                                                            color: selectedQ === q ? 'white' : '#CCC',
                                                            boxShadow: selectedQ === q ? '0 4px 10px rgba(255,140,66,0.3)' : 'none'
                                                        }}
                                                    >{q}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ background: '#F9F9F9', padding: '12px', borderRadius: '18px' }}>
                                            <p style={{ margin: '0 0 8px 10px', fontWeight: 800, fontSize: '0.6rem', color: '#BBB', textTransform: 'uppercase' }}>Repetir</p>
                                            <select 
                                                value={repeat} 
                                                onChange={(e) => setRepeat(e.target.value as any)}
                                                style={{ width: '100%', padding: '6px 8px', borderRadius: '10px', border: 'none', background: 'white', fontWeight: 800, fontSize: '0.75rem', color: repeat !== 'none' ? 'var(--domain-orange)' : '#BBB', outline: 'none' }}
                                            >
                                                <option value="none">Una vez</option>
                                                <option value="daily">Diaria</option>
                                                <option value="weekly">Semanal</option>
                                                <option value="monthly">Mensual</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* CATEGORÍAS + FECHA (FILA COMPACTA) */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <label style={{ fontSize: '0.6rem', fontWeight: 800, color: '#BBB', position: 'absolute', top: '6px', left: '12px', textTransform: 'uppercase' }}>Etiquetas</label>
                                            <input
                                                type="text" value={labels} onChange={(e) => setLabels(e.target.value)}
                                                placeholder="Casa, Job..."
                                                style={{ width: '100%', padding: '18px 12px 6px 12px', borderRadius: '16px', border: '1px solid #EEE', fontSize: '0.85rem', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <label style={{ fontSize: '0.6rem', fontWeight: 800, color: '#BBB', position: 'absolute', top: '6px', left: '12px', textTransform: 'uppercase' }}>Fecha</label>
                                            <input
                                                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                                                style={{ width: '100%', padding: '18px 12px 6px 12px', borderRadius: '16px', border: '1px solid #EEE', fontSize: '0.85rem', fontWeight: 600, outline: 'none', boxSizing: 'border-box', appearance: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    {/* HORA OPCIONAL PARA TAREA */}
                                    <div style={{ background: '#F9F9F9', padding: '12px', borderRadius: '20px' }}>
                                        <div 
                                            onClick={() => setHasTime(!hasTime)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: hasTime ? '10px' : '0' }}
                                        >
                                            <div style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '6px',
                                                border: '2px solid #DDD',
                                                background: hasTime ? 'var(--domain-orange)' : 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {hasTime && <Check size={14} color="white" strokeWidth={4} />}
                                            </div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: hasTime ? '#333' : '#888', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Clock size={16} /> Definir hora específica
                                            </span>
                                        </div>
                                        
                                        {hasTime && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                                <input 
                                                    type="time" 
                                                    value={startTime} 
                                                    onChange={(e) => setStartTime(e.target.value)} 
                                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #EEE', fontSize: '1rem', fontWeight: 600, outline: 'none' }} 
                                                />
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {actionType === 'nota' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', background: '#F5F5F5', padding: '4px', borderRadius: '14px', gap: '4px' }}>
                                        <button 
                                            type="button" onClick={() => setNoteType('text')}
                                            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '11px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', background: noteType === 'text' ? 'white' : 'transparent', color: noteType === 'text' ? '#333' : '#AAA', boxShadow: noteType === 'text' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}
                                        >NOTAS</button>
                                        <button 
                                            type="button" onClick={() => setNoteType('checklist')}
                                            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '11px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', background: noteType === 'checklist' ? 'white' : 'transparent', color: noteType === 'checklist' ? '#333' : '#AAA', boxShadow: noteType === 'checklist' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}
                                        >LISTA (KEEP)</button>
                                    </div>

                                    <div style={{ position: 'relative' }}>
                                        <textarea
                                            value={noteItems}
                                            onChange={(e) => setNoteItems(e.target.value)}
                                            placeholder={noteType === 'text' ? 'Contenido de la nota...' : '• Item 1\n• Item 2...'}
                                            rows={6}
                                            style={{ width: '100%', padding: '16px', borderRadius: '20px', border: '2px solid #F5F5F5', background: '#FAFAFA', fontSize: '0.95rem', fontWeight: 500, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', background: '#F9F9F9', padding: '10px', borderRadius: '16px' }}>
                                        {['#FFFFFF', '#FEF9C3', '#DBEAFE', '#F3E8FF', '#DCFCE7', '#FEE2E2'].map(color => (
                                            <button
                                                key={color} type="button" onClick={() => setNoteColor(color)}
                                                style={{ minWidth: '28px', height: '28px', borderRadius: '50%', border: noteColor === color ? '2px solid #333' : '1px solid #DDD', background: color, cursor: 'pointer', transform: noteColor === color ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s' }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {actionType === 'agenda' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <label style={{ fontSize: '0.6rem', fontWeight: 800, color: '#BBB', position: 'absolute', top: '6px', left: '12px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Calendar size={10} /> Fecha
                                            </label>
                                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '18px 12px 6px 12px', borderRadius: '16px', border: '1px solid #EEE', fontSize: '0.85rem', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }} />
                                        </div>
                                        <div 
                                            onClick={() => setHasTime(!hasTime)}
                                            style={{ 
                                                background: !hasTime ? '#F0F9FF' : '#F9F9F9', 
                                                borderRadius: '16px', 
                                                border: !hasTime ? '2px solid #0EA5E9' : '2px solid #EEE',
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                cursor: 'pointer', 
                                                transition: 'all 0.2s',
                                                gap: '8px'
                                            }}
                                        >
                                            <div style={{
                                                width: '18px',
                                                height: '18px',
                                                borderRadius: '4px',
                                                border: '2px solid #DDD',
                                                background: !hasTime ? '#0EA5E9' : 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {!hasTime && <Check size={12} color="white" strokeWidth={4} />}
                                            </div>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: !hasTime ? '#0369A1' : '#AAA' }}>TODO EL DÍA</span>
                                        </div>
                                    </div>
                                    
                                    <div style={{ background: '#F9F9F9', padding: '12px', borderRadius: '20px' }}>
                                        <div 
                                            onClick={() => setHasTime(!hasTime)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: hasTime ? '10px' : '0' }}
                                        >
                                            <div style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '6px',
                                                border: '2px solid #DDD',
                                                background: hasTime ? 'var(--domain-orange)' : 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {hasTime && <Check size={14} color="white" strokeWidth={4} />}
                                            </div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: hasTime ? '#333' : '#888', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Clock size={16} /> Definir horario específico
                                            </span>
                                        </div>
                                        
                                        {hasTime && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <label style={{ fontSize: '0.6rem', fontWeight: 800, color: '#BBB', position: 'absolute', top: '6px', left: '12px', textTransform: 'uppercase' }}>Inicio</label>
                                                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: '100%', padding: '18px 12px 6px 12px', borderRadius: '16px', border: '1px solid #EEE', fontSize: '0.85rem', fontWeight: 600 }} />
                                                </div>
                                                <div style={{ position: 'relative' }}>
                                                    <label style={{ fontSize: '0.6rem', fontWeight: 800, color: '#BBB', position: 'absolute', top: '6px', left: '12px', textTransform: 'uppercase' }}>Fin</label>
                                                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: '100%', padding: '18px 12px 6px 12px', borderRadius: '16px', border: '1px solid #EEE', fontSize: '0.85rem', fontWeight: 600 }} />
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {currentConfig.isFinancial && (
                                <div style={{ background: '#F9F9F9', borderRadius: '20px', padding: '6px', display: 'flex', gap: '4px' }}>
                                    <button
                                        type="button" onClick={() => setIsDebt(false)}
                                        style={{ flex: 1, background: !isDebt ? 'white' : 'transparent', color: !isDebt ? '#333' : '#AAA', border: 'none', padding: '10px', borderRadius: '16px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', boxShadow: !isDebt ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}
                                    >PAGO REAL</button>
                                    <button
                                        type="button" onClick={() => setIsDebt(true)}
                                        style={{ flex: 1, background: isDebt ? currentConfig.color : 'transparent', color: isDebt ? 'white' : '#AAA', border: 'none', padding: '10px', borderRadius: '16px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}
                                    >{actionType === 'gasto' ? 'DEBO' : 'ME DEBEN'}</button>
                                </div>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                style={{
                                    background: currentConfig.color,
                                    color: 'white',
                                    border: 'none',
                                    padding: '18px',
                                    borderRadius: '20px',
                                    fontSize: '1rem',
                                    fontWeight: 900,
                                    marginTop: '0.5rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: `0 10px 25px ${currentConfig.color}40`,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}
                            >
                                <Check size={20} strokeWidth={3} />
                                Confirmar {currentConfig.title.split(' ')[1]}
                            </motion.button>

                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
