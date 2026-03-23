import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, UserMinus, UserPlus, Wallet, History, CreditCard, Trash2, Edit2, Check, X, Plus } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import type { Transaction, Account } from '../../hooks/useAlDiaState';

interface DebtDetailViewProps {
    transactions: Transaction[];
    accounts: Account[];
    initialMode: 'owe' | 'owed';
    onClose: () => void;
    repayDebt: (originalTx: Transaction, amount: number, accountId: number) => void;
    removeTransaction: (id: number) => void;
    updateTransactionGroup: (oldText: string, oldContact: string | undefined, updates: { text?: string, contact?: string, amount?: number }, originalId: number) => void;
    addTransaction: (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projectId?: number, accountId?: number, isCashless?: boolean, category?: string, contact?: string) => void;
}

export const DebtDetailView = ({ transactions, accounts, initialMode, onClose, repayDebt, removeTransaction, updateTransactionGroup, addTransaction }: DebtDetailViewProps) => {
    const [mode, setMode] = useState<'owe' | 'owed'>(initialMode);
    const [repayingId, setRepayingId] = useState<number | null>(null);
    const [repayAmount, setRepayAmount] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState<number>(accounts[0]?.id || 0);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editContact, setEditContact] = useState('');
    
    // New Debt Form
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [newName, setNewName] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newContact, setNewContact] = useState('');
    const [isCashTransaction, setIsCashTransaction] = useState(false); // ¿Salió/entró efectivo real?

    const debtList = useMemo(() => {
        // Obtenemos todas las deudas del tipo seleccionado
        const relevant = transactions.filter(t => {
            if (mode === 'owe') {
                return t.isDebt && ((t.type === 'gasto' && t.isCashless) || (t.type === 'ingreso' && !t.isCashless));
            } else {
                return t.isDebt && ((t.type === 'ingreso' && t.isCashless) || (t.type === 'gasto' && !t.isCashless));
            }
        });

        // Agrupamos por descripción/persona para calcular el saldo neto
        // (Un pago es una transacción de tipo opuesto con el mismo texto y isDebt: true)
        const groups: Record<string, { total: number, originalTxs: Transaction[] }> = {};
        
        relevant.forEach(tx => {
            const baseText = tx.text.startsWith('Pago: ') ? tx.text.replace('Pago: ', '') : tx.text;
            const contact = tx.contact || '';
            const key = contact ? `${contact}::${baseText}` : `::${baseText}`;
            
            if (!groups[key]) groups[key] = { total: 0, originalTxs: [] };
            
            if (tx.text.startsWith('Pago: ')) {
                groups[key].total -= Math.abs(tx.amount);
            } else {
                groups[key].total += Math.abs(tx.amount);
                groups[key].originalTxs.push(tx);
            }
        });

        return Object.entries(groups)
            .filter(([_, data]) => data.total > 0.01)
            .map(([key, data]) => {
                const [contact, text] = key.split('::');
                return {
                    name: text,
                    contact: contact,
                    amount: data.total,
                    originalTx: data.originalTxs[0]
                };
            });
    }, [transactions, mode]);

    const totalAmount = useMemo(() => debtList.reduce((sum, item) => sum + item.amount, 0), [debtList]);

    const handleRepay = (item: any) => {
        const amount = parseFloat(repayAmount) || item.amount;
        if (amount > 0 && selectedAccountId) {
            repayDebt(item.originalTx, amount, selectedAccountId);
            setRepayingId(null);
            setRepayAmount('');
        }
    };

    const handleDelete = (txId: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta deuda? También se perderá el registro de sus abonos asociados.')) {
            // Nota: En una implementación más robusta, buscaríamos transacciones de pago con el mismo texto y las borraríamos también.
            // Por ahora, borramos la deuda original.
            removeTransaction(txId);
        }
    };

    const handleUpdate = (item: any) => {
        updateTransactionGroup(item.name, item.contact, {
            text: editName,
            amount: parseFloat(editAmount) || 0,
            contact: editContact
        }, item.originalTx.id);
        setEditingId(null);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{ 
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                background: '#F8F9FA', zIndex: 1000, 
                padding: '1.5rem', overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: '1.5rem'
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={onClose} style={{ background: 'white', border: 'none', borderRadius: '12px', padding: '8px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <ArrowLeft size={20} />
                </button>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin:0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-carbon)' }}>Gestión de Deudas</h2>
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#AAA', textTransform: 'uppercase' }}>FINANZAS Y CALENDARIO</span>
                </div>
            </div>

            {/* Toggle Mode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#E2E8F0', padding: '4px', borderRadius: '16px', gap: '4px' }}>
                <button 
                    onClick={() => setMode('owe')}
                    style={{ 
                        padding: '10px', borderRadius: '12px', border: 'none', 
                        background: mode === 'owe' ? 'white' : 'transparent',
                        color: mode === 'owe' ? '#f87171' : '#64748B',
                        fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                >
                    <UserMinus size={16} /> DEBO
                </button>
                <button 
                    onClick={() => setMode('owed')}
                    style={{ 
                        padding: '10px', borderRadius: '12px', border: 'none', 
                        background: mode === 'owed' ? 'white' : 'transparent',
                        color: mode === 'owed' ? '#10B981' : '#64748B',
                        fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                >
                    <UserPlus size={16} /> ME DEBEN
                </button>
            </div>

            {/* Quick Add Debt Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {!isAddingMode ? (
                    <button 
                        onClick={() => setIsAddingMode(true)}
                        style={{ 
                            background: 'white', border: '2px dashed #CBD5E1', borderRadius: '16px', padding: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                            color: '#64748B', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer'
                        }}
                    >
                        <Plus size={18} /> AGREGAR REGISTRO MANUAL
                    </button>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card" 
                        style={{ padding: '1rem', background: 'white', border: `2px solid ${mode === 'owe' ? '#fee2e2' : '#dcfce7'}`, display: 'flex', flexDirection: 'column', gap: '10px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 900, color: mode === 'owe' ? '#ef4444' : '#10b981' }}>
                                NUEVO {mode === 'owe' ? 'DEUDA' : 'PRÉSTAMO'}
                            </h3>
                            <button onClick={() => setIsAddingMode(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={16} color="#AAA" /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ position: 'relative' }}>
                                <label style={{ fontSize: '0.55rem', fontWeight: 900, color: '#AAA', position: 'absolute', top: '4px', left: '8px', textTransform: 'uppercase' }}>Persona / Entidad</label>
                                <input 
                                    autoFocus
                                    placeholder="Ej. Juan Pérez, Banco..." 
                                    value={newContact}
                                    onChange={(e) => setNewContact(e.target.value)}
                                    style={{ width: '100%', padding: '14px 10px 4px 10px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '0.9rem', fontWeight: 800, boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <label style={{ fontSize: '0.55rem', fontWeight: 900, color: '#AAA', position: 'absolute', top: '4px', left: '8px', textTransform: 'uppercase' }}>Monto</label>
                                    <input 
                                        type="number"
                                        placeholder="0.00" 
                                        value={newAmount}
                                        onChange={(e) => setNewAmount(e.target.value)}
                                        style={{ width: '100%', padding: '14px 10px 4px 10px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '0.9rem', fontWeight: 900, boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div style={{ position: 'relative', flex: 2 }}>
                                    <label style={{ fontSize: '0.55rem', fontWeight: 900, color: '#AAA', position: 'absolute', top: '4px', left: '8px', textTransform: 'uppercase' }}>Concepto</label>
                                    <input 
                                        placeholder="Por qué..." 
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        style={{ width: '100%', padding: '14px 10px 4px 10px', borderRadius: '10px', border: '1px solid #EEE', fontSize: '0.9rem', fontWeight: 700, boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            <button 
                                type="button"
                                onClick={() => setIsCashTransaction(!isCashTransaction)}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '8px', background: isCashTransaction ? (mode === 'owe' ? '#fee2e2' : '#dcfce7') : '#F8FAFC', 
                                    padding: '8px 12px', borderRadius: '10px', border: '1px solid #EEE', cursor: 'pointer', transition: 'all 0.2s' 
                                }}
                            >
                                <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: isCashTransaction ? (mode === 'owe' ? '#ef4444' : '#10b981') : 'white', border: '1px solid #DDD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {isCashTransaction && <Check size={12} color="white" strokeWidth={4} />}
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isCashTransaction ? '#333' : '#AAA' }}>
                                    {mode === 'owe' ? '¿Recibiste el efectivo hoy?' : '¿Entregaste el efectivo hoy?'}
                                </span>
                            </button>

                            <button 
                                onClick={() => {
                                    if (!newAmount || !newContact) return;
                                    
                                    // DEBO (owe):
                                    // - Si recibí efectivo: ingreso real (type: ingreso, isCashless: false)
                                    // - Si es fiao: gasto sin efectivo (type: gasto, isCashless: true)
                                    // ME DEBEN (owed):
                                    // - Si entregué efectivo: gasto real (type: gasto, isCashless: false)
                                    // - Si es fiao: ingreso sin efectivo (type: ingreso, isCashless: true)
                                    
                                    const type = mode === 'owe' 
                                        ? (isCashTransaction ? 'ingreso' : 'gasto')
                                        : (isCashTransaction ? 'gasto' : 'ingreso');

                                    addTransaction(
                                        newName || (mode === 'owe' ? 'Deuda' : 'Préstamo'),
                                        parseFloat(newAmount),
                                        type,
                                        true, // isDebt
                                        undefined, // projId
                                        accounts[0]?.id, // default account
                                        !isCashTransaction, // isCashless
                                        'Deudas',
                                        newContact
                                    );
                                    setIsAddingMode(false);
                                    setNewAmount('');
                                    setNewName('');
                                    setNewContact('');
                                }}
                                style={{ 
                                    background: mode === 'owe' ? '#ef4444' : '#10b981', color: 'white', border: 'none', 
                                    borderRadius: '12px', padding: '12px', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer',
                                    marginTop: '4px', boxShadow: `0 4px 12px ${mode === 'owe' ? '#ef444440' : '#10b98140'}`
                                }}
                            >
                                GUARDAR {mode === 'owe' ? 'DEUDA' : 'PRÉSTAMO'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Summary Card */}
            <GlassCard style={{ background: mode === 'owe' ? '#fee2e2' : '#dcfce7', border: 'none', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                <div style={{ background: 'white', padding: '12px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    {mode === 'owe' ? <UserMinus size={24} color="#ef4444" /> : <UserPlus size={24} color="#10b981" />}
                </div>
                <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, opacity: 0.6, textTransform: 'uppercase' }}>
                        {mode === 'owe' ? 'Total por Pagar' : 'Total por Cobrar'}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-carbon)' }}>
                        S/.{totalAmount.toLocaleString()}
                    </h3>
                </div>
            </GlassCard>

            {/* List */}
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                    <History size={16} color="#888" />
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: '#666' }}>MOVIMIENTOS PENDIENTES</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {debtList.map((item, idx) => (
                        <div key={idx} className="glass-card" style={{ padding: '1rem', background: 'white', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    {editingId === idx ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <input 
                                                value={editContact}
                                                onChange={(e) => setEditContact(e.target.value)}
                                                placeholder="Nombre / Cliente"
                                                style={{ padding: '6px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '0.8rem', fontWeight: 800, background: '#F8FAFC' }}
                                            />
                                            <input 
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                style={{ padding: '6px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '0.85rem', fontWeight: 900 }}
                                            />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input 
                                                    type="number"
                                                    value={editAmount}
                                                    onChange={(e) => setEditAmount(e.target.value)}
                                                    style={{ width: '80px', padding: '6px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '0.85rem', fontWeight: 900 }}
                                                />
                                                <button onClick={() => handleUpdate(item)} style={{ background: 'var(--domain-green)', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer' }}><Check size={14} color="white" /></button>
                                                <button onClick={() => setEditingId(null)} style={{ background: '#EEE', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer' }}><X size={14} color="#888" /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {item.contact && (
                                                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: mode === 'owe' ? '#ef4444' : '#10b981', background: mode === 'owe' ? '#fee2e2' : '#dcfce7', padding: '2px 8px', borderRadius: '6px', marginBottom: '4px', display: 'inline-block' }}>
                                                    👤 {item.contact.toUpperCase()}
                                                </span>
                                            )}
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{item.name}</h4>
                                            <span style={{ fontSize: '0.65rem', color: '#AAA', fontWeight: 600 }}>{item.originalTx.date} - {item.originalTx.fullDate}</span>
                                        </>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                    <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 900, color: mode === 'owe' ? '#ef4444' : '#10b981' }}>
                                        S/.{item.amount.toLocaleString()}
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            onClick={() => { 
                                                setEditingId(idx); 
                                                setEditName(item.name); 
                                                setEditAmount(item.originalTx.amount.toString()); 
                                                setEditContact(item.contact || '');
                                            }}
                                            style={{ background: 'transparent', border: 'none', color: '#CBD5E1', cursor: 'pointer', padding: '4px' }}
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(item.originalTx.id)}
                                            style={{ background: 'transparent', border: 'none', color: '#fee2e2', cursor: 'pointer', padding: '4px' }}
                                        >
                                            <Trash2 size={12} color="#f87171" style={{ opacity: 0.5 }} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <AnimatePresence>
                                {repayingId === idx ? (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ overflow: 'hidden', borderTop: '1px dashed #EEE', paddingTop: '10px', marginTop: '4px' }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <input 
                                                    type="number" 
                                                    placeholder={`Monto (máx S/.${item.amount})`}
                                                    value={repayAmount}
                                                    onChange={(e) => setRepayAmount(e.target.value)}
                                                    style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', border: '1px solid #DDD', fontSize: '0.8rem', fontWeight: 600 }}
                                                />
                                                <select 
                                                    value={selectedAccountId}
                                                    onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                                                    style={{ padding: '8px', borderRadius: '10px', border: '1px solid #DDD', fontSize: '0.75rem', fontWeight: 700, background: 'white' }}
                                                >
                                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                                </select>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button 
                                                    onClick={() => setRepayingId(null)}
                                                    style={{ flex: 1, background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: '10px', padding: '8px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}
                                                >CANCELAR</button>
                                                <button 
                                                    onClick={() => handleRepay(item)}
                                                    style={{ flex: 2, background: mode === 'owe' ? '#ef4444' : '#10b981', color: 'white', border: 'none', borderRadius: '10px', padding: '8px', fontWeight: 900, fontSize: '0.7rem', cursor: 'pointer' }}
                                                >
                                                    CONFIRMAR {mode === 'owe' ? 'PAGO' : 'COBRO'}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <button 
                                        onClick={() => { setRepayingId(idx); setRepayAmount(item.amount.toString()); }}
                                        style={{ 
                                            width: '100%', padding: '8px', borderRadius: '12px', border: 'none',
                                            background: mode === 'owe' ? '#fee2e2' : '#dcfce7',
                                            color: mode === 'owe' ? '#ef4444' : '#10B981',
                                            fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                        }}
                                    >
                                        {mode === 'owe' ? <CreditCard size={14} /> : <Wallet size={14} />}
                                        {mode === 'owe' ? 'REGISTRAR PAGO' : 'REGISTRAR COBRO'}
                                    </button>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}

                    {debtList.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'white', borderRadius: '24px', border: '2px dashed #E2E8F0' }}>
                            <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.85rem', fontWeight: 600 }}>No hay {mode === 'owe' ? 'deudas' : 'préstamos'} pendientes.</p>
                            <span style={{ fontSize: '0.7rem', color: '#CBD5E1' }}>¡Todo al día por aquí! 🎉</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
