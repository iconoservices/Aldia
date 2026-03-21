import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Clock, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuickActionPanelProps {
    isOpen: boolean;
    onClose: () => void;
    actionType: string | null;
    addMission: (text: string, q?: string, repeat?: 'none' | 'daily' | 'weekly' | 'monthly', noteId?: number, labels?: string[], dueDate?: string, dueTime?: string, habitId?: number, projectId?: number, repeatDays?: number[]) => void;
    addTransaction: (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projectId?: number, accountId?: number, isCashless?: boolean, category?: string) => void;
    addHabit: (name: string) => void;
    addRoutineItem?: (routineId: number, text: string, time?: string) => void;
    addCalendarEvent?: (title: string, date: string, start: string, end: string, desc: string, projectId?: number) => void;
    addNote: (title: string, content: string, type: 'text' | 'checklist', items: { text: string; completed: boolean }[], q: string, color: string) => void;
    addTimeBlock: (label: string, start: string, end: string, color: string, projectId?: number) => void;
    addProject?: (name: string, color: string, targetHoursPerWeek?: number) => void;
    projects?: { id: number, name: string, color: string }[];
    accounts?: { id: number, name: string, color: string, projectIds?: number[] }[];
    rutinas?: { id: number, title: string, color: string }[];
}

export const QuickActionPanel = ({ 
    isOpen, onClose, actionType, addMission, addTransaction, addHabit, 
    addRoutineItem, addCalendarEvent, addNote, addTimeBlock, addProject, 
    projects = [], accounts = [], rutinas = [] 
}: QuickActionPanelProps) => {
    const [amount, setAmount] = useState('');
    const [concept, setConcept] = useState('');
    const [debtMode, setDebtMode] = useState<'normal' | 'fiao' | 'prestamo'>('normal');
    const [selectedQ, setSelectedQ] = useState('Q2');
    const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
    const [asHabit, setAsHabit] = useState(false);
    const [asRoutine, setAsRoutine] = useState(false);
    const [routineId, setRoutineId] = useState<number>(1); // Default to Mañana
    const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
    const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(undefined);
    const [repeatDays, setRepeatDays] = useState<number[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('Otros');
    
    // Efecto para manejar el proyecto por defecto según cantidad
    useEffect(() => {
        if (isOpen && projects.length === 1) {
            setSelectedProjectId(projects[0].id);
        } else if (isOpen && projects.length >= 2) {
            setSelectedProjectId(undefined);
        }
    }, [isOpen, projects]);
    
    // Filtro de cuentas: Solo mostramos las del proyecto seleccionado
    const filteredAccounts = useMemo(() => {
        if (!selectedProjectId) return []; // No mostramos cuentas si no hay proyecto
        return accounts.filter(acc => acc.projectIds?.includes(selectedProjectId));
    }, [accounts, selectedProjectId]);

    // Quick Project Creation
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [quickProjectName, setQuickProjectName] = useState('');
    const [quickProjectColor, setQuickProjectColor] = useState('#ff8c42');
    
    // Estados para Agenda/Tiempo
    const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
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
        'agenda': { title: 'Nueva Agenda', color: '#f59e0b', isFinancial: false },
        'bloque': { title: 'Nuevo Bloque de Poder', color: '#8b5cf6', isFinancial: false },
        'proyecto': { title: 'Nuevo Proyecto', color: '#ff8c42', isFinancial: false }
    };

    const currentConfig = actionType ? uiConfigs[actionType] : null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (actionType === 'gasto' || actionType === 'ingreso') {
            if (projects.length > 0 && !selectedProjectId) {
                alert("Debes seleccionar un proyecto");
                return;
            }
            if (!selectedAccountId) {
                alert("Debes seleccionar una cuenta");
                return;
            }
            const isActuallyDebt = debtMode !== 'normal';
            const isCashless = debtMode === 'fiao';
            addTransaction(concept || (actionType === 'gasto' ? 'Gasto' : 'Ingreso'), parseFloat(amount) || 0, actionType as any, isActuallyDebt, selectedProjectId, selectedAccountId, isCashless, selectedCategory);
            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
                colors: [actionType === 'gasto' ? '#f87171' : '#4ade80', '#ffffff']
            });
        } else if (actionType === 'tarea') {
            if (projects.length > 0 && !selectedProjectId) {
                alert("Debes seleccionar un proyecto para la tarea");
                return;
            }
            const labelArray = labels.split(',').map(l => l.trim()).filter(l => l !== '');
            
            let habitId: number | undefined = undefined;
            if (asHabit) {
                const newHId = Date.now();
                addHabit(concept || 'Nuevo Hábito');
                habitId = newHId;
            }

            if (asRoutine && addRoutineItem) {
                addRoutineItem(routineId, concept || 'Nueva Rutina', hasTime ? startTime : undefined);
            } else {
                addMission(concept || 'Nueva Tarea', selectedQ, repeat, undefined, labelArray, date, hasTime ? startTime : undefined, habitId, selectedProjectId, repeatDays.length > 0 ? repeatDays : undefined);
            }

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
            if (projects.length > 0 && !selectedProjectId) {
                alert("Debes seleccionar un proyecto para la agenda");
                return;
            }
            const finalStart = hasTime ? startTime : '00:00';
            const finalEnd = hasTime ? endTime : '23:59';
            addCalendarEvent(concept || 'Agenda', date, finalStart, finalEnd, 'Añadido desde AlDía', selectedProjectId);
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
        } else if (actionType === 'bloque') {
            if (projects.length > 0 && !selectedProjectId) {
                alert("Debes seleccionar un proyecto para el bloque");
                return;
            }
            addTimeBlock(concept || 'Bloque', startTime, endTime, noteColor === '#FFFFFF' ? '#8b5cf6' : noteColor, selectedProjectId);
            confetti({
                particleCount: 60,
                spread: 50,
                origin: { y: 0.6 },
                colors: ['#8b5cf6', '#ffffff']
            });
        } else if (actionType === 'proyecto' && addProject) {
            addProject(concept || 'Proyecto', noteColor === '#FFFFFF' ? '#ff8c42' : noteColor, parseFloat(amount || '0'));
            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#ff8c42', '#ffffff']
            });
        }

        // Simular guardado visual
        setTimeout(() => {
            setAmount('');
            setConcept('');
            setDebtMode('normal');
            setDate(new Date().toLocaleDateString('en-CA'));
            setStartTime('09:00');
            setEndTime('10:00');
            setHasTime(false);
            setAsHabit(false);
            setAsRoutine(false);
            setRoutineId(1);
            setRepeatDays([]);
            setNoteType('text');
            setNoteItems('');
            setNoteColor('#FFFFFF');
            setRepeat('none');
            setLabels('');
            setSelectedProjectId(undefined);
            setSelectedAccountId(undefined);
            setSelectedCategory('Otros');
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
                                    {currentConfig.isFinancial ? 'Concepto' : (actionType === 'sueno' ? 'Hábito' : (actionType === 'nota' ? 'Título' : 'Nombre'))}
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

                            {/* SELECTOR DE CATEGORÍA */}
                            {currentConfig.isFinancial && (
                                <div style={{ background: '#F9F9F9', padding: '12px', borderRadius: '18px' }}>
                                    <p style={{ margin: '0 0 8px 10px', fontWeight: 800, fontSize: '0.6rem', color: '#BBB', textTransform: 'uppercase' }}>Categoría</p>
                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                        {(actionType === 'ingreso' 
                                            ? ['Sueldo', 'Venta', 'Inversión', 'Otros']
                                            : ['Comida', 'Transporte', 'Servicios', 'Suscripciones', 'Salud', 'Ocio', 'Otros']
                                        ).map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setSelectedCategory(cat)}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '12px', border: `1px solid ${selectedCategory === cat ? (actionType === 'ingreso' ? '#4ade80' : '#f87171') : '#EEE'}`,
                                                    background: selectedCategory === cat ? (actionType === 'ingreso' ? '#4ade80' : '#f87171') : 'white',
                                                    color: selectedCategory === cat ? 'white' : '#333',
                                                    fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SELECTOR DE PROYECTO (Para Tareas, Bloques, Agenda y Finanzas) */}
                            {(actionType === 'tarea' || actionType === 'bloque' || actionType === 'agenda' || currentConfig.isFinancial) && (
                                <div style={{ background: '#F9F9F9', padding: '12px', borderRadius: '18px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <p style={{ margin: '0 0 0 10px', fontWeight: 800, fontSize: '0.6rem', color: '#BBB', textTransform: 'uppercase' }}>Proyecto (Opcional)</p>
                                        <button 
                                            type="button" 
                                            onClick={() => setIsCreatingProject(!isCreatingProject)}
                                            style={{ background: isCreatingProject ? 'var(--domain-orange)' : '#EEE', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        >
                                            {isCreatingProject ? <X size={12} color="white" /> : <Plus size={12} color="#888" />}
                                        </button>
                                    </div>

                                    {isCreatingProject ? (
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <input 
                                                type="text" 
                                                placeholder="Nombre del proyecto..." 
                                                value={quickProjectName}
                                                onChange={(e) => setQuickProjectName(e.target.value)}
                                                style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #DDD', fontSize: '0.8rem', fontWeight: 600 }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    {['#ff8c42', '#3b82f6', '#10B911', '#8b5cf6', '#EC4899'].map(c => (
                                                        <button 
                                                            key={c} type="button" onClick={() => setQuickProjectColor(c)}
                                                            style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, border: quickProjectColor === c ? '2px solid #333' : 'none', cursor: 'pointer' }}
                                                        />
                                                    ))}
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        if (quickProjectName && addProject) {
                                                            const newId = Date.now() + Math.random();
                                                            addProject(quickProjectName, quickProjectColor);
                                                            setSelectedProjectId(newId);
                                                            setIsCreatingProject(false);
                                                            setQuickProjectName('');
                                                        }
                                                    }}
                                                    style={{ background: 'var(--domain-green)', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer' }}
                                                >
                                                    CREAR
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px' }}>
                                            {/* Eliminado "Sin Proyecto" por solicitud del usuario */}
                                            {projects.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedProjectId(p.id);
                                                        setSelectedAccountId(undefined);
                                                    }}
                                                    style={{
                                                        padding: '6px 12px', borderRadius: '12px', border: `1px solid ${p.id === selectedProjectId ? p.color : '#EEE'}`,
                                                        background: selectedProjectId === p.id ? p.color : 'white',
                                                        color: selectedProjectId === p.id ? 'white' : '#333',
                                                        fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SELECTOR DE CUENTA (Solo si hay un proyecto seleccionado y tiene cuentas) */}
                            {currentConfig.isFinancial && filteredAccounts.length > 0 && (
                                <div style={{ background: '#F9F9F9', padding: '12px', borderRadius: '18px', border: '2px solid transparent' }}>
                                    <p style={{ margin: '0 0 8px 10px', fontWeight: 800, fontSize: '0.6rem', color: '#BBB', textTransform: 'uppercase' }}>
                                        Cuenta / Tarjeta
                                    </p>
                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                        {filteredAccounts.map(acc => (
                                            <button
                                                key={acc.id}
                                                type="button"
                                                onClick={() => setSelectedAccountId(acc.id)}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '12px', border: `1px solid ${acc.id === selectedAccountId ? acc.color : '#EEE'}`,
                                                    background: selectedAccountId === acc.id ? acc.color : 'white',
                                                    color: selectedAccountId === acc.id ? 'white' : '#333',
                                                    fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap',
                                                    boxShadow: selectedAccountId === acc.id ? `0 4px 10px ${acc.color}40` : 'none'
                                                }}
                                            >
                                                {acc.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SECCIONES ESPECÍFICAS TASKS */}
                            {actionType === 'tarea' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                                                style={{ width: '100%', padding: '18px 12px 6px 12px', borderRadius: '16px', border: '1px solid #EEE', fontSize: '0.85rem', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div style={{ background: '#F9F9F9', padding: '12px', borderRadius: '20px' }}>
                                            <div onClick={() => setHasTime(!hasTime)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: hasTime ? '10px' : '0' }}>
                                                <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: '2px solid #DDD', background: hasTime ? 'var(--domain-orange)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {hasTime && <Check size={14} color="white" strokeWidth={4} />}
                                                </div>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: hasTime ? '#333' : '#888' }}><Clock size={16} /> Hora</span>
                                            </div>
                                            {hasTime && <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '1rem', fontWeight: 600 }} />}
                                        </div>
                                        <div onClick={() => { setAsHabit(!asHabit); if(!asHabit) setAsRoutine(false); }} style={{ background: asHabit ? '#F5F3FF' : '#F9F9F9', padding: '12px', borderRadius: '20px', border: asHabit ? '2px solid #8B5CF6' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: '2px solid #DDD', background: asHabit ? '#8B5CF6' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {asHabit && <Check size={14} color="white" strokeWidth={4} />}
                                            </div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: asHabit ? '#7C3AED' : '#AAA' }}>🔄 Hábito</span>
                                        </div>
                                    </div>

                                    {/* SELECTOR DE DÍAS (Si es repetir o Hábito) */}
                                    {(repeat === 'weekly' || asHabit) && (
                                        <div style={{ background: '#F9F9F9', padding: '12px', borderRadius: '18px' }}>
                                            <p style={{ margin: '0 0 8px 10px', fontWeight: 800, fontSize: '0.6rem', color: '#BBB', textTransform: 'uppercase' }}>Días específicos</p>
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
                                                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, idx) => {
                                                    const isSel = repeatDays.includes(idx);
                                                    return (
                                                        <button
                                                            key={idx} type="button" 
                                                            onClick={() => setRepeatDays(prev => isSel ? prev.filter(d => d !== idx) : [...prev, idx])}
                                                            style={{
                                                                width: '32px', height: '32px', borderRadius: '10px', border: 'none',
                                                                fontWeight: 900, fontSize: '0.7rem', cursor: 'pointer',
                                                                background: isSel ? 'var(--domain-purple)' : 'white',
                                                                color: isSel ? 'white' : '#CCC',
                                                                boxShadow: isSel ? '0 4px 10px rgba(138,92,246,0.3)' : 'none'
                                                            }}
                                                        >{day}</button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* SELECTOR DE RUTINA */}
                                    <div style={{ background: asRoutine ? '#FFFBEB' : '#F9F9F9', padding: '12px', borderRadius: '24px', border: asRoutine ? '2px solid #F59E0B' : '2px solid transparent' }}>
                                        <div onClick={() => { setAsRoutine(!asRoutine); if(!asRoutine) setAsHabit(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: asRoutine ? '12px' : '0' }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: '2px solid #DDD', background: asRoutine ? '#F59E0B' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {asRoutine && <Check size={14} color="white" strokeWidth={4} />}
                                            </div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: asRoutine ? '#B45309' : '#AAA' }}>⚡ Convertir en Rutina</span>
                                        </div>
                                        
                                        {asRoutine && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                                                {rutinas.map(r => (
                                                    <button
                                                        key={r.id} type="button"
                                                        onClick={() => setRoutineId(r.id)}
                                                        style={{
                                                            padding: '8px', borderRadius: '12px', border: 'none',
                                                            background: routineId === r.id ? r.color : 'white',
                                                            color: routineId === r.id ? 'white' : '#AAA',
                                                            fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer',
                                                            boxShadow: routineId === r.id ? `0 4px 12px ${r.color}40` : 'none',
                                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                        }}
                                                    >
                                                        {r.title}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* SECCIÓN NOTA */}
                            {actionType === 'nota' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', background: '#F5F5F5', padding: '4px', borderRadius: '14px', gap: '4px' }}>
                                        <button type="button" onClick={() => setNoteType('text')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '11px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', background: noteType === 'text' ? 'white' : 'transparent', color: noteType === 'text' ? '#333' : '#AAA' }}>NOTAS</button>
                                        <button type="button" onClick={() => setNoteType('checklist')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '11px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', background: noteType === 'checklist' ? 'white' : 'transparent', color: noteType === 'checklist' ? '#333' : '#AAA' }}>LISTA</button>
                                    </div>
                                    <textarea value={noteItems} onChange={(e) => setNoteItems(e.target.value)} placeholder={noteType === 'text' ? 'Contenido...' : '• Item...'} rows={6} style={{ width: '100%', padding: '16px', borderRadius: '20px', border: '2px solid #F5F5F5', background: '#FAFAFA', fontSize: '0.95rem', fontWeight: 500, outline: 'none', resize: 'none' }} />
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', background: '#F9F9F9', padding: '10px', borderRadius: '16px' }}>
                                        {['#FFFFFF', '#FEF9C3', '#DBEAFE', '#F3E8FF', '#DCFCE7', '#FEE2E2'].map(color => (
                                            <button key={color} type="button" onClick={() => setNoteColor(color)} style={{ minWidth: '28px', height: '28px', borderRadius: '50%', border: noteColor === color ? '2px solid #333' : '1px solid #DDD', background: color, cursor: 'pointer' }} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SECCIÓN AGENDA */}
                            {actionType === 'agenda' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <label style={{ fontSize: '0.6rem', fontWeight: 800, color: '#BBB', position: 'absolute', top: '6px', left: '12px', textTransform: 'uppercase' }}>Fecha</label>
                                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '18px 12px 6px 12px', borderRadius: '16px', border: '1px solid #EEE', fontSize: '0.85rem', fontWeight: 600 }} />
                                        </div>
                                        <div onClick={() => setHasTime(!hasTime)} style={{ background: !hasTime ? '#F0F9FF' : '#F9F9F9', borderRadius: '16px', border: !hasTime ? '2px solid #0EA5E9' : '2px solid #EEE', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '8px' }}>
                                            <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: '2px solid #DDD', background: !hasTime ? '#0EA5E9' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {!hasTime && <Check size={12} color="white" strokeWidth={4} />}
                                            </div>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: !hasTime ? '#0369A1' : '#AAA' }}>TODO EL DÍA</span>
                                        </div>
                                    </div>
                                    {hasTime && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '16px', border: '1px solid #EEE' }} />
                                            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '16px', border: '1px solid #EEE' }} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SECCIÓN BLOQUE */}
                            {actionType === 'bloque' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '16px', border: '1px solid #EEE' }} />
                                        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '16px', border: '1px solid #EEE' }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', background: '#F9F9F9', padding: '10px', borderRadius: '16px' }}>
                                        {['#8b5cf6', '#3b82f6', '#FF8C42', '#10B981', '#EC4899', '#6366F1'].map(color => (
                                            <button key={color} type="button" onClick={() => setNoteColor(color)} style={{ minWidth: '28px', height: '28px', borderRadius: '50%', border: noteColor === color ? '2px solid #333' : '1px solid #DDD', background: color, cursor: 'pointer' }} />
                                        ))}
                                    </div>
                                </div>
                            )}

                             {/* SECCIÓN PROYECTO */}
                             {actionType === 'proyecto' && (
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                     <div style={{ background: '#F9F9F9', padding: '1.2rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                         <span style={{ fontSize: '0.65rem', color: '#888', fontWeight: 800, textTransform: 'uppercase' }}>Horas Objetivo (Semana)</span>
                                         <input 
                                            type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" 
                                            style={{ width: '100%', fontSize: '1.5rem', fontWeight: 900, border: 'none', background: 'transparent', outline: 'none', textAlign: 'center', color: 'var(--domain-orange)' }} 
                                         />
                                     </div>
                                     <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', background: '#F9F9F9', padding: '10px', borderRadius: '16px' }}>
                                        {['#ff8c42', '#3b82f6', '#10B911', '#8b5cf6', '#EC4899', '#6366F1'].map(color => (
                                            <button key={color} type="button" onClick={() => setNoteColor(color)} style={{ minWidth: '28px', height: '28px', borderRadius: '50%', border: noteColor === color ? '2px solid #333' : '1px solid #DDD', background: color, cursor: 'pointer' }} />
                                        ))}
                                     </div>
                                 </div>
                             )}

                            {/* FINANZAS */}
                            {currentConfig.isFinancial && (
                                <div style={{ background: '#F9F9F9', padding: '12px', borderRadius: '24px', border: '1px solid #EEE' }}>
                                    <p style={{ margin: '0 0 8px 10px', fontWeight: 800, fontSize: '0.65rem', color: '#BBB', textTransform: 'uppercase' }}>Tipo de Movimiento</p>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {[
                                            { id: 'normal', label: 'Efectivo', color: 'var(--domain-green)' },
                                            { id: 'fiao', label: actionType === 'ingreso' ? 'Por Cobrar' : 'A Cuenta', color: 'var(--domain-orange)' },
                                            { id: 'prestamo', label: actionType === 'ingreso' ? 'Préstamo Recibido' : 'Préstamo Realizado', color: 'var(--domain-blue)' }
                                        ].map(m => (
                                            <button
                                                key={m.id} type="button" onClick={() => setDebtMode(m.id as any)}
                                                style={{
                                                    flex: 1, padding: '12px 6px', borderRadius: '16px', border: 'none',
                                                    fontWeight: 900, fontSize: '0.65rem', cursor: 'pointer',
                                                    background: debtMode === m.id ? m.color : 'white',
                                                    color: debtMode === m.id ? 'white' : '#CCC',
                                                    boxShadow: debtMode === m.id ? `0 4px 12px ${m.color}30` : 'none',
                                                    transition: 'all 0.2s'
                                                }}
                                            >{m.label.toUpperCase()}</button>
                                        ))}
                                    </div>
                                    <p style={{ margin: '8px 0 0 10px', fontSize: '0.6rem', color: '#AAA', fontWeight: 600 }}>
                                        {debtMode === 'normal' && '✓ Afecta tu saldo actual.'}
                                        {debtMode === 'fiao' && '⚠ No mueve efectivo. Solo anota la deuda.'}
                                        {debtMode === 'prestamo' && '⚠ Mueve efectivo y registra la deuda.'}
                                    </p>
                                </div>
                            )}

                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" style={{ background: currentConfig.color, color: 'white', border: 'none', padding: '18px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 900, marginTop: '1rem', cursor: 'pointer', boxShadow: `0 10px 25px ${currentConfig.color}40` }}>
                                <Check size={20} strokeWidth={3} /> GUARDAR
                            </motion.button>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
