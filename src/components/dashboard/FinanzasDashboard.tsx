import { useState, useMemo } from 'react';
import { ArrowUpCircle, ArrowDownCircle, UserMinus, UserPlus, BarChart3, Plus, Trash2, Edit2, Check, X, Calculator, PiggyBank, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { DomainIcon } from '../ui/DomainIcon';
import type { Transaction, FixedExpense } from '../../hooks/useAlDiaState';

interface FinanzasProps {
    balance: number;
    income: number;
    expense: number;
    owe: number;
    owed: number;
    transactions: Transaction[];
    monthlyBudget: number;
    updateMonthlyBudget: (amount: number) => void;
    fixedExpenses: FixedExpense[];
    addFixedExpense: (text: string, amount: number, projectId?: number) => void;
    removeFixedExpense: (id: number) => void;
    toggleFixedExpense: (id: number) => void;
    updateFixedExpense: (id: number, updates: Partial<FixedExpense>) => void;
    projects: { id: number, name: string, color: string }[];
    accounts: { id: number, name: string, color: string, projectIds?: number[] }[];
    setAccounts: React.Dispatch<React.SetStateAction<{ id: number; name: string; color: string; projectIds?: number[] }[]>>;
}

export const FinanzasDashboard = ({ 
    balance, income, expense, owe, owed, transactions,
    monthlyBudget, updateMonthlyBudget, fixedExpenses, 
    addFixedExpense, removeFixedExpense, toggleFixedExpense, updateFixedExpense,
    projects, accounts, setAccounts
}: FinanzasProps) => {
    const netOperation = useMemo(() => income - expense, [income, expense]);
    const totalFixed = useMemo(() => fixedExpenses.filter(e => e.active).reduce((acc, e) => acc + e.amount, 0), [fixedExpenses]);
    const projectedSavings = useMemo(() => monthlyBudget - totalFixed, [monthlyBudget, totalFixed]);

    const [isAddingAccount, setIsAddingAccount] = useState(false);
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountColor, setNewAccountColor] = useState('#ff8c42');

    // Cuentas con balance calculado (solo para esta vista)
    const accountsWithBalance = useMemo(() => {
        return accounts.map(acc => {
            const bal = transactions
                .filter(tx => tx.accountId === acc.id && !tx.isCashless)
                .reduce((sum, tx) => sum + tx.amount, 0);
            return { ...acc, balance: bal };
        });
    }, [accounts, transactions]);

    const handleAddAccount = () => {
        if (!newAccountName.trim()) return;
        const newAcc = {
            id: Date.now(),
            name: newAccountName,
            color: newAccountColor,
            projectIds: []
        };
        setAccounts(prev => [...prev, newAcc]);
        setNewAccountName('');
        setIsAddingAccount(false);
    };

    const handleDeleteAccount = (id: number) => {
        if (window.confirm('¿Eliminar esta cuenta? No se borrarán las transacciones, pero la cuenta ya no aparecerá.')) {
            setAccounts(prev => prev.filter(a => a.id !== id));
        }
    };

    return (
        <div style={{ paddingBottom: '5rem' }}>
            {/* GRID DE TARJETAS FIJAS (ESTILO PREMIUM) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* TARJETA PRINCIPAL: BALANCE TOTAL */}
                <GlassCard 
                    variant="strong"
                    style={{
                        background: 'linear-gradient(135deg, #0055FF 0%, #003399 100%)',
                        color: 'white',
                        padding: '1.5rem',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Wallet size={16} opacity={0.8} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Balance Total</span>
                        </div>
                        <DomainIcon domain="finanzas" variant="solid" size={18} className="text-white opacity-80" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1.5px', color: 'white' }}>
                            ${(balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </h2>

                        {/* INDICADORES DE MOVIMIENTO INTEGRADOS AL COSTADO */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '0.4rem' }}>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                background: 'rgba(255, 255, 255, 0.15)', 
                                padding: '4px 10px', 
                                borderRadius: '10px',
                                backdropFilter: 'blur(5px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                                <ArrowUpCircle size={12} color="#4ade80" />
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'white' }}>+{(income || 0).toLocaleString()}</span>
                            </div>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                background: 'rgba(255, 255, 255, 0.15)', 
                                padding: '4px 10px', 
                                borderRadius: '10px',
                                backdropFilter: 'blur(5px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                                <ArrowDownCircle size={12} color="#f87171" />
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'white' }}>-{(expense || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* NUEVA SECCIÓN: MIS CUENTAS / TARJETAS */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', padding: '0 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PiggyBank size={18} color="var(--domain-blue)" />
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--text-carbon)' }}>Mis Cuentas / Tarjetas</h3>
                        </div>
                        <button 
                            onClick={() => setIsAddingAccount(!isAddingAccount)}
                            style={{ 
                                background: isAddingAccount ? '#FEE2E2' : '#F0F7FF', 
                                border: 'none', 
                                borderRadius: '10px', 
                                padding: '6px 12px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            {isAddingAccount ? <X size={14} color="#f87171" /> : <Plus size={14} color="#0066FF" />}
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isAddingAccount ? '#f87171' : '#0066FF' }}>
                                {isAddingAccount ? 'CANCELAR' : 'NUEVA'}
                            </span>
                        </button>
                    </div>

                    <AnimatePresence>
                        {isAddingAccount && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }} 
                                animate={{ opacity: 1, height: 'auto' }} 
                                exit={{ opacity: 0, height: 0 }}
                                style={{ overflow: 'hidden', marginBottom: '1rem' }}
                            >
                                <GlassCard style={{ padding: '1rem', background: '#F8FAFC', border: '2px dashed #0066FF30' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <input 
                                            autoFocus
                                            placeholder="Nombre de la cuenta (ej. BCP, Efectivo...)" 
                                            value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)}
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '0.9rem', fontWeight: 600, outline: 'none' }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                {['#0055FF', '#ff8c42', '#10B911', '#8b5cf6', '#EC4899', '#334155'].map(c => (
                                                    <button 
                                                        key={c} onClick={() => setNewAccountColor(c)}
                                                        style={{ width: '24px', height: '24px', borderRadius: '50%', background: c, border: newAccountColor === c ? '2px solid #333' : 'none', cursor: 'pointer' }}
                                                    />
                                                ))}
                                            </div>
                                            <button 
                                                onClick={handleAddAccount}
                                                style={{ background: 'var(--domain-green)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer' }}
                                            >
                                                CREAR
                                            </button>
                                        </div>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.8rem' }}>
                        {accountsWithBalance.map(acc => (
                            <motion.div key={acc.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                                <div style={{ 
                                    background: 'white', 
                                    padding: '1rem', 
                                    borderRadius: '20px', 
                                    border: '1px solid #EEE',
                                    borderLeft: `4px solid ${acc.color}`,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                    position: 'relative'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{acc.name}</span>
                                        <button 
                                            onClick={() => handleDeleteAccount(acc.id)}
                                            style={{ background: 'transparent', border: 'none', padding: '0', cursor: 'pointer', opacity: 0.2 }}
                                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.2')}
                                        >
                                            <Trash2 size={12} color="#f87171" />
                                        </button>
                                    </div>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>
                                        ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="finance-summary-grid" style={{ display: 'grid', gap: '1rem' }}>
                    {/* TARJETA: OPERACIÓN HOY */}
                    <GlassCard 
                        style={{
                            background: 'white',
                            padding: '1rem',
                            borderLeft: '4px solid var(--domain-green)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <Calculator size={14} color="var(--domain-green)" />
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#888', textTransform: 'uppercase' }}>Operación Hoy</span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>
                            ${netOperation.toLocaleString()}
                        </h3>
                    </GlassCard>

                    {/* TARJETA: AHORRO PROYECTADO */}
                    <GlassCard 
                        style={{
                            background: 'white',
                            padding: '1rem',
                            borderLeft: '4px solid var(--domain-orange)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <PiggyBank size={14} color="var(--domain-orange)" />
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#888', textTransform: 'uppercase' }}>Ahorro Proyectado</span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>
                            ${projectedSavings.toLocaleString()}
                        </h3>
                    </GlassCard>
                </div>
            </div>

            {/* SECCIÓN DE NEGOCIO / VENTAS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>Flujo Semanal (7d)</h3>
                <BarChart3 size={16} color="#888" />
            </div>

            <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.2rem', height: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '120px', gap: '6px', paddingBottom: '8px' }}>
                    {[
                        { day: 'Lun', exp: 0, inc: 0 },
                        { day: 'Mar', exp: 0, inc: 0 },
                        { day: 'Mié', exp: 0, inc: 0 },
                        { day: 'Jue', exp: 0, inc: 0 },
                        { day: 'Vie', exp: 0, inc: 0 },
                        { day: 'Sáb', exp: 0, inc: 0 },
                        { day: 'Hoy', exp: expense, inc: income }
                    ].map((data, i) => {
                        const maxVal = Math.max(income, expense, 100);
                        const incHeight = (data.inc / maxVal) * 100;
                        const expHeight = (data.exp / maxVal) * 100;

                        return (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                                <div style={{ display: 'flex', gap: '1px', alignItems: 'flex-end', height: '100%', width: '100%', justifyContent: 'center' }}>
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${Math.min(incHeight, 100)}%` }}
                                        transition={{ delay: i * 0.05, duration: 0.8 }}
                                        style={{ width: '6px', background: 'var(--domain-green)', borderRadius: '2px 2px 0 0', opacity: 0.8 }}
                                    />
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${Math.min(expHeight, 100)}%` }}
                                        transition={{ delay: (i + 1) * 0.05, duration: 0.8 }}
                                        style={{ width: '6px', background: '#f87171', borderRadius: '2px 2px 0 0', opacity: 0.8 }}
                                    />
                                </div>
                                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: i === 6 ? 'var(--domain-orange)' : '#AAA' }}>{data.day}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* SECCIÓN DE DEUDAS */}
            <div className="debts-grid" style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '0.8rem', borderTop: '3px solid #f87171' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#f87171' }}>
                        <UserMinus size={14} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>DEBO</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-carbon)' }}>${owe}</p>
                </div>
                <div className="glass-card" style={{ padding: '0.8rem', borderTop: '3px solid #4ade80' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#4ade80' }}>
                        <UserPlus size={14} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>ME DEBEN</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-carbon)' }}>${owed}</p>
                </div>
            </div>


            {/* PLANIFICADOR MENSUAL */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-carbon)' }}>📊 Planificador Mensual</h3>
                    <div style={{ background: '#F0EBE6', padding: '4px 8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#888' }}>BASE</span>
                        <input 
                            type="number" 
                            value={monthlyBudget || ''} 
                            onChange={(e) => updateMonthlyBudget(e.target.value === '' ? 0 : Number(e.target.value))}
                            style={{ border: 'none', background: 'transparent', width: '50px', fontSize: '0.75rem', fontWeight: 900, outline: 'none', color: 'var(--domain-blue)' }}
                        />
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '1rem', background: '#FFF' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {fixedExpenses.map((expense) => (
                            <FixedExpenseItem 
                                key={expense.id} 
                                expense={expense} 
                                toggleFixedExpense={toggleFixedExpense}
                                removeFixedExpense={removeFixedExpense}
                                updateFixedExpense={updateFixedExpense}
                                projects={projects}
                            />
                        ))}
                        
                        <div style={{ marginTop: '2px', paddingTop: '8px', borderTop: '1px dashed #EEE' }}>
                            <NewFixedExpenseForm addFixedExpense={addFixedExpense} projects={projects} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ÚLTIMOS MOVIMIENTOS */}
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 900 }}>Últimos Movimientos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {transactions.slice(0, 10).map((tx) => (
                    <div key={tx.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: tx.type === 'ingreso' ? '#DCFCE7' : '#FEE2E2', padding: '6px', borderRadius: '10px' }}>
                                {tx.type === 'ingreso' ? <ArrowUpCircle size={16} color="#4ade80" /> : <ArrowDownCircle size={16} color="#f87171" />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-carbon)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.text}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                    <span style={{ fontSize: '0.6rem', color: '#AAA' }}>{tx.date}</span>
                                    {projects.find(p => p.id === tx.projectId) && (
                                        <span style={{ 
                                            fontSize: '0.55rem', 
                                            fontWeight: 900, 
                                            background: `${projects.find(p => p.id === tx.projectId)?.color}15`,
                                            color: projects.find(p => p.id === tx.projectId)?.color,
                                            padding: '2px 6px',
                                            borderRadius: '6px'
                                        }}>
                                            @{projects.find(p => p.id === tx.projectId)?.name}
                                        </span>
                                    )}
                                    {accounts.find(a => a.id === tx.accountId) && (
                                        <span style={{ 
                                            fontSize: '0.55rem', 
                                            fontWeight: 900, 
                                            background: '#F0F0F0',
                                            color: '#666',
                                            padding: '2px 6px',
                                            borderRadius: '6px'
                                        }}>
                                            {accounts.find(a => a.id === tx.accountId)?.name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <span style={{ fontWeight: 900, fontSize: '0.9rem', color: tx.type === 'ingreso' ? '#10B981' : 'var(--text-carbon)' }}>
                            {tx.type === 'ingreso' ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()}
                        </span>
                    </div>
                ))}
                {transactions.length === 0 && <p style={{ textAlign: 'center', color: '#888', padding: '1rem', fontSize: '0.8rem' }}>No hay movimientos hoy</p>}
            </div>
        </div>
    );
};

// --- SUB-COMPONENTES AUXILIARES ---

const FixedExpenseItem = ({ expense, toggleFixedExpense, removeFixedExpense, updateFixedExpense, projects }: { 
    expense: FixedExpense, 
    toggleFixedExpense: (id: number) => void, 
    removeFixedExpense: (id: number) => void,
    updateFixedExpense: (id: number, updates: Partial<FixedExpense>) => void,
    projects: { id: number, name: string, color: string }[] 
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(expense.text);
    const [editAmount, setEditAmount] = useState(expense.amount.toString());
    const [editProjectId, setEditProjectId] = useState(expense.projectId);

    const handleSave = () => {
        updateFixedExpense(expense.id, {
            text: editName,
            amount: parseFloat(editAmount) || 0,
            projectId: editProjectId
        });
        setIsEditing(false);
    };

    const project = projects.find(p => p.id === expense.projectId);

    if (isEditing) {
        return (
            <div style={{ background: '#F9F9F9', padding: '10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #EEE' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <input 
                        value={editName} onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nombre.." 
                        style={{ flex: 2, padding: '6px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '0.8rem', fontWeight: 600 }}
                    />
                    <input 
                        type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
                        placeholder="$" 
                        style={{ flex: 1, padding: '6px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '0.8rem', fontWeight: 600 }}
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <select 
                        value={editProjectId || ''} 
                        onChange={(e) => setEditProjectId(e.target.value ? Number(e.target.value) : undefined)}
                        style={{ padding: '4px', borderRadius: '6px', border: '1px solid #DDD', fontSize: '0.7rem', fontWeight: 700, background: 'white' }}
                    >
                        <option value="">Sin Proyecto</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => setIsEditing(false)} style={{ background: '#EEE', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer' }}><X size={14} color="#888" /></button>
                        <button onClick={handleSave} style={{ background: 'var(--domain-green)', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer' }}><Check size={14} color="white" /></button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: expense.active ? 1 : 0.4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div 
                    onClick={() => toggleFixedExpense(expense.id)}
                    style={{ width: '28px', height: '16px', borderRadius: '10px', background: expense.active ? 'var(--domain-blue)' : '#DDD', position: 'relative', cursor: 'pointer' }}
                >
                    <motion.div 
                        animate={{ x: expense.active ? 13 : 2 }}
                        style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px' }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-carbon)' }}>{expense.text}</span>
                    {project && (
                        <span style={{ fontSize: '0.55rem', fontWeight: 900, color: project.color }}>
                            @{project.name}
                        </span>
                    )}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#666' }}>${expense.amount.toLocaleString()}</span>
                <button onClick={() => setIsEditing(true)} style={{ background: 'transparent', border: 'none', color: '#DDD', cursor: 'pointer' }}><Edit2 size={12} /></button>
                <button onClick={() => removeFixedExpense(expense.id)} style={{ background: 'transparent', border: 'none', color: '#EEE', cursor: 'pointer' }}><Trash2 size={12} /></button>
            </div>
        </div>
    );
};

const NewFixedExpenseForm = ({ addFixedExpense, projects }: { addFixedExpense: (t: string, a: number, p?: number) => void, projects: { id: number, name: string, color: string }[] }) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [projectId, setProjectId] = useState<number | undefined>(undefined);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleSubmit = () => {
        if (name && amount) {
            addFixedExpense(name, parseFloat(amount), projectId);
            setName('');
            setAmount('');
            setProjectId(undefined);
            setIsExpanded(false);
        }
    };

    if (!isExpanded) {
        return (
            <button 
                onClick={() => setIsExpanded(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', padding: '0', cursor: 'pointer', width: '100%' }}
            >
                <Plus size={14} color="#CCC" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#AAA' }}>Nuevo gasto fijo...</span>
            </button>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#F8FAFC', padding: '10px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
                <input 
                    autoFocus
                    placeholder="Nombre" 
                    value={name} onChange={(e) => setName(e.target.value)}
                    style={{ flex: 2, padding: '6px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '0.8rem' }}
                />
                <input 
                    type="number" placeholder="$" 
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                    style={{ flex: 1, padding: '6px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '0.8rem' }}
                />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <select 
                    value={projectId || ''} 
                    onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : undefined)}
                    style={{ padding: '4px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.7rem', fontWeight: 700, background: 'white' }}
                >
                    <option value="">Proyecto?</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => setIsExpanded(false)} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: '#E2E8F0', color: '#475569', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}>X</button>
                    <button onClick={handleSubmit} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'var(--domain-blue)', color: 'white', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}>OK</button>
                </div>
            </div>
        </motion.div>
    );
};
