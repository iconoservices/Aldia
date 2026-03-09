import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuickActionPanelProps {
    isOpen: boolean;
    onClose: () => void;
    actionType: string | null;
    addMission: (text: string) => void;
    addTransaction: (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean) => void;
    addHabit: (name: string) => void;
}

export const QuickActionPanel = ({ isOpen, onClose, actionType, addMission, addTransaction, addHabit }: QuickActionPanelProps) => {
    const [amount, setAmount] = useState('');
    const [concept, setConcept] = useState('');
    const [isDebt, setIsDebt] = useState(false);

    // Mapeo visual por tipo de acción
    const uiConfigs: Record<string, { title: string, color: string, isFinancial: boolean }> = {
        'gasto': { title: 'Registrar Gasto', color: '#f87171', isFinancial: true },
        'ingreso': { title: 'Registrar Ingreso', color: '#4ade80', isFinancial: true },
        'tarea': { title: 'Nueva Misión', color: '#3b82f6', isFinancial: false },
        'sueno': { title: 'Nuevo Hábito', color: '#a855f7', isFinancial: false },
        'nota': { title: 'Idea Rápida', color: '#facc15', isFinancial: false }
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
            addMission(concept || 'Nueva Misión');
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
        } else if (actionType === 'nota') {
            // Guardar ideas rápidas como misiones en el cuadrante 4 (Baja Urgencia)
            addMission("💡 " + (concept || 'Sin título'));
            confetti({
                particleCount: 30,
                spread: 40,
                origin: { y: 0.6 },
                colors: ['#facc15', '#ffffff']
            });
        }

        // Simular guardado visual
        setTimeout(() => {
            setAmount('');
            setConcept('');
            setIsDebt(false);
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
                                {currentConfig.title}
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
                                    {currentConfig.isFinancial ? 'CONCEPTO' : (actionType === 'sueno' ? 'NOMBRE DEL HÁBITO' : 'QUÉ VAS A HACER')}
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
