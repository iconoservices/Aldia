import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuickActionPanelProps {
    isOpen: boolean;
    onClose: () => void;
    actionType: string | null;
    addMission: (text: string, q?: string, repeat?: 'none' | 'daily' | 'weekly' | 'monthly', noteId?: number, labels?: string[], dueDate?: string) => void;
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
            addMission(concept || 'Nueva Tarea', selectedQ, repeat, undefined, labelArray, date);
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
            setHasTime(true);
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

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

                            {currentConfig.isFinancial && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>CANTIDAD</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '2.5rem', fontWeight: 500, color: '#CCC' }}>$</span>
                                        <input
                                            type="number"
                                            autoFocus
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            style={{
                                                fontSize: '3rem',
                                                fontWeight: 900,
                                                color: currentConfig.color,
                                                border: 'none',
                                                outline: 'none',
                                                background: 'transparent',
                                                width: '180px',
                                                textAlign: 'center',
                                                caretColor: currentConfig.color
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#888', marginLeft: '12px', marginBottom: '4px', display: 'block' }}>
                                    {currentConfig.isFinancial ? 'CONCEPTO' : (actionType === 'sueno' ? 'NOMBRE DEL HÁBITO' : (actionType === 'nota' ? 'TÍTULO' : 'QUÉ VAS A HACER'))}
                                </label>
                                <input
                                    type="text"
                                    value={concept}
                                    onChange={(e) => setConcept(e.target.value)}
                                    placeholder={currentConfig.isFinancial ? 'Ej. Uber, Cena, Venta Logo...' : 'Escribe aquí...'}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        borderRadius: '16px',
                                        border: '2px solid #F0F0F0',
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {actionType === 'nota' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', background: '#F5F5F5', padding: '4px', borderRadius: '14px', gap: '4px' }}>
                                        <button 
                                            type="button"
                                            onClick={() => setNoteType('text')}
                                            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '11px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', background: noteType === 'text' ? 'white' : 'transparent', color: noteType === 'text' ? '#333' : '#888' }}
                                        >
                                            TEXTO
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setNoteType('checklist')}
                                            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '11px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', background: noteType === 'checklist' ? 'white' : 'transparent', color: noteType === 'checklist' ? '#333' : '#888' }}
                                        >
                                            LISTA (Keep)
                                        </button>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#888', marginLeft: '12px', marginBottom: '4px', display: 'block' }}>
                                            {noteType === 'text' ? 'CONTENIDO' : 'ITEMS (Uno por línea)'}
                                        </label>
                                        <textarea
                                            value={noteItems}
                                            onChange={(e) => setNoteItems(e.target.value)}
                                            placeholder={noteType === 'text' ? 'Escribe tu idea...' : 'Avena\nCafé\nHuevos...'}
                                            rows={5}
                                            style={{
                                                width: '100%',
                                                padding: '16px',
                                                borderRadius: '16px',
                                                border: '2px solid #F0F0F0',
                                                fontSize: '0.95rem',
                                                fontWeight: 500,
                                                outline: 'none',
                                                resize: 'none',
                                                boxSizing: 'border-box',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0' }}>
                                        {['#FFFFFF', '#FEF9C3', '#DBEAFE', '#F3E8FF', '#DCFCE7', '#FEE2E2'].map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setNoteColor(color)}
                                                style={{
                                                    minWidth: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    border: noteColor === color ? '2px solid #888' : '1px solid #E0E0E0',
                                                    background: color,
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {actionType === 'tarea' && (
                                <div style={{ background: '#F9F9F9', borderRadius: '16px', padding: '12px' }}>
                                    <p style={{ margin: '0 0 10px 0', fontWeight: 700, fontSize: '0.85rem', color: '#888', textAlign: 'center' }}>CUADRANTE RELEVANCIA</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                        {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                                            <button
                                                key={q}
                                                type="button"
                                                onClick={() => setSelectedQ(q)}
                                                style={{
                                                    padding: '10px 0',
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    fontWeight: 900,
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                    background: selectedQ === q ? 'var(--domain-orange)' : 'white',
                                                    color: selectedQ === q ? 'white' : '#888',
                                                    boxShadow: selectedQ === q ? '0 4px 10px rgba(255,140,66,0.3)' : 'none'
                                                }}
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                    <p style={{ margin: '10px 0 0 0', fontSize: '0.62rem', color: '#AAA', textAlign: 'center', fontWeight: 600 }}>
                                        {selectedQ === 'Q1' ? '🔥 URGENTE / CRÍTICA' : selectedQ === 'Q2' ? '🎯 ENFOQUE / PLAN' : selectedQ === 'Q3' ? '⏱️ APOYO / DELEGAR' : '🗑️ ELIMINAR / IDEAS'}
                                    </p>

                                    <div style={{ marginTop: '1.2rem', borderTop: '1px solid #EEE', paddingTop: '1rem' }}>
                                        <p style={{ margin: '0 0 8px 0', fontWeight: 700, fontSize: '0.85rem', color: '#888', textAlign: 'center' }}>🔄 REPETIR</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                            {[
                                                { id: 'none', label: 'Una vez' },
                                                { id: 'daily', label: 'Diario' },
                                                { id: 'weekly', label: 'Semanal' },
                                                { id: 'monthly', label: 'Mensual' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setRepeat(opt.id as any)}
                                                    style={{
                                                        padding: '8px 0',
                                                        borderRadius: '10px',
                                                        border: '1px solid #EEE',
                                                        fontWeight: 800,
                                                        fontSize: '0.6rem',
                                                        cursor: 'pointer',
                                                        background: repeat === opt.id ? '#333' : 'white',
                                                        color: repeat === opt.id ? 'white' : '#888'
                                                    }}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '1.2rem', borderTop: '1px solid #EEE', paddingTop: '1rem' }}>
                                        <p style={{ margin: '0 0 8px 0', fontWeight: 700, fontSize: '0.85rem', color: '#888', textAlign: 'center' }}>🏷️ CATEGORÍAS (Separadas por coma)</p>
                                        <input
                                            type="text"
                                            value={labels}
                                            onChange={(e) => setLabels(e.target.value)}
                                            placeholder="Ej. Casa, Trabajo, Urgente..."
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '12px',
                                                border: '2px solid #F0F0F0',
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                                outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    <div style={{ marginTop: '1.2rem', borderTop: '1px solid #EEE', paddingTop: '1rem' }}>
                                        <p style={{ margin: '0 0 8px 0', fontWeight: 700, fontSize: '0.85rem', color: '#888', textAlign: 'center' }}>📅 FECHA INICIO / META</p>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '12px',
                                                border: '2px solid #F0F0F0',
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                                outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {actionType === 'agenda' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#888', marginLeft: '12px', marginBottom: '4px', display: 'block' }}>FECHA</label>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #F0F0F0', fontSize: '1rem', fontWeight: 600, outline: 'none', appearance: 'none', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    
                                    <div style={{ background: '#F9F9F9', borderRadius: '16px', padding: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-carbon)' }}>¿Tiene hora específica?</span>
                                            <input 
                                                type="checkbox" 
                                                checked={hasTime} 
                                                onChange={(e) => setHasTime(e.target.checked)}
                                                style={{ width: '20px', height: '20px', accentColor: '#f59e0b' }}
                                            />
                                        </div>
                                        
                                        {hasTime && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#AAA', marginBottom: '4px', display: 'block' }}>INICIO</label>
                                                    <input
                                                        type="time"
                                                        value={startTime}
                                                        onChange={(e) => setStartTime(e.target.value)}
                                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E0E0E0', fontSize: '0.9rem', fontWeight: 600, outline: 'none' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#AAA', marginBottom: '4px', display: 'block' }}>FIN</label>
                                                    <input
                                                        type="time"
                                                        value={endTime}
                                                        onChange={(e) => setEndTime(e.target.value)}
                                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E0E0E0', fontSize: '0.9rem', fontWeight: 600, outline: 'none' }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {currentConfig.isFinancial && (
                                <div style={{ background: '#F9F9F9', borderRadius: '16px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-carbon)' }}>Modo de Transacción</p>
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#888' }}>
                                            {isDebt ? 'Impactará la sección "Deudas"' : 'Afecta tu Balance Total hoy'}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', background: '#E0E0E0', borderRadius: '20px', padding: '4px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setIsDebt(false)}
                                            style={{
                                                background: !isDebt ? 'white' : 'transparent',
                                                color: !isDebt ? 'var(--text-carbon)' : '#888',
                                                border: 'none',
                                                padding: '6px 12px',
                                                borderRadius: '16px',
                                                fontWeight: 800,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            REAL (Cash)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsDebt(true)}
                                            style={{
                                                background: isDebt ? currentConfig.color : 'transparent',
                                                color: isDebt ? 'white' : '#888',
                                                border: 'none',
                                                padding: '6px 12px',
                                                borderRadius: '16px',
                                                fontWeight: 800,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {actionType === 'gasto' ? 'DEBO' : 'ME DEBEN'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                                type="submit"
                                style={{
                                    background: currentConfig.color,
                                    color: 'white',
                                    border: 'none',
                                    padding: '16px',
                                    borderRadius: '16px',
                                    fontSize: '1rem',
                                    fontWeight: 900,
                                    marginTop: '1rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: `0 8px 20px ${currentConfig.color}40`
                                }}
                            >
                                <Check size={20} strokeWidth={3} />
                                CONFIRMAR
                            </motion.button>

                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
