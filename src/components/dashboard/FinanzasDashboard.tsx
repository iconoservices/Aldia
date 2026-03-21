import { useState, useMemo } from 'react';
import { 
    Wallet, Plus, TrendingUp, TrendingDown, 
    Trash2, Edit2, PieChart, 
    UserMinus, UserPlus, Check, X, Calculator, PiggyBank, ArrowDownCircle 
} from 'lucide-react';
import { AnalyticsView } from './AnalyticsView';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { ProjectDetailView } from './ProjectDetailView';
import { DebtDetailView } from './DebtDetailView';
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
    addFixedExpense: (text: string, amount: number, projectId?: number, dueDay?: number) => void;
    removeFixedExpense: (id: number) => void;
    toggleFixedExpense: (id: number) => void;
    updateFixedExpense: (id: number, updates: Partial<FixedExpense>) => void;
    markFixedExpensePaid: (id: number, monthStr: string, accountId?: number) => void;
    unmarkFixedExpensePaid: (id: number, monthStr: string) => void;
    repayDebt: (originalTx: Transaction, amount: number, accountId: number) => void;
    removeTransaction: (id: number) => void;
    updateTransaction: (id: number, updates: Partial<Transaction>) => void;
    projects: { id: number, name: string, color: string }[];
    accounts: { id: number, name: string, color: string, projectIds?: number[] }[];
    setAccounts: React.Dispatch<React.SetStateAction<{ id: number; name: string; color: string; projectIds?: number[] }[]>>;
}

export const FinanzasDashboard = ({ 
    balance, income, expense, owe, owed, transactions,
    monthlyBudget, updateMonthlyBudget, fixedExpenses, 
    addFixedExpense, removeFixedExpense, toggleFixedExpense, updateFixedExpense, markFixedExpensePaid, unmarkFixedExpensePaid,
    repayDebt, removeTransaction, updateTransaction, projects, accounts, setAccounts
}: FinanzasProps) => {
    const netOperation = useMemo(() => income - expense, [income, expense]);
    const currentMonthStr = useMemo(() => new Date().toLocaleDateString('en-CA').substring(0, 7), []);

    const realIncomeThisMonth = useMemo(() => {
        return transactions
            .filter(tx => tx.type === 'ingreso' && !tx.isDebt && tx.fullDate.startsWith(currentMonthStr))
            .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    }, [transactions, currentMonthStr]);



    const totalFixedPending = useMemo(() => 
        fixedExpenses
            .filter(e => e.active && e.lastPaidMonth !== currentMonthStr)
            .reduce((acc, e) => acc + e.amount, 0), 
    [fixedExpenses, currentMonthStr]);

    const [isAccountsVisible, setIsAccountsVisible] = useState(false);
    const [accountViewMode, setAccountViewMode] = useState<'cuenta' | 'proyecto'>('cuenta');
    const [isBudgetFixed, setIsBudgetFixed] = useState(false);
    const [includeDebts, setIncludeDebts] = useState(false);

    // Lógica dinámica: Si es FIJO, es la base intacta. 
    // Si es META: Base - lo ganado. Y si pasas la meta, el extra suma de nuevo a favor.
    const totalIncomeResource = isBudgetFixed 
        ? monthlyBudget 
        : Math.abs(monthlyBudget - realIncomeThisMonth);

    const totalExpensesExpected = totalFixedPending + (includeDebts ? owe : 0);
    const projectedSavings = totalIncomeResource - totalExpensesExpected;

    const [isAddingAccount, setIsAddingAccount] = useState(false);
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountColor, setNewAccountColor] = useState('#0055FF');
    const [newAccountProjectId, setNewAccountProjectId] = useState<number | undefined>(undefined);

    const [showDebtDetail, setShowDebtDetail] = useState(false);
    const [debtMode, setDebtMode] = useState<'owe' | 'owed'>('owe');
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [chartPeriod, setChartPeriod] = useState<'7d' | '30d'>('7d');
    const [showAnalytics, setShowAnalytics] = useState(false);

    // Cuentas con balance calculado (solo para esta vista)
    const accountsWithBalance = useMemo(() => {
        return accounts.map(acc => {
            const bal = transactions
                .filter(tx => tx.accountId === acc.id && !tx.isCashless)
                .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
            return { ...acc, balance: bal };
        });
    }, [accounts, transactions]);


    const handleAddAccount = () => {
        if (!newAccountName.trim()) return;
        const newAcc = {
            id: Date.now(),
            name: newAccountName,
            color: newAccountColor,
            projectIds: newAccountProjectId ? [newAccountProjectId] : []
        };
        setAccounts(prev => [...prev, newAcc]);
        setNewAccountName('');
        setNewAccountProjectId(undefined);
        setIsAddingAccount(false);
    };

    const historyData = useMemo(() => {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const result = [];
        const count = chartPeriod === '7d' ? 7 : 30;

        for (let i = count - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('en-CA');
            
            let label = '';
            if (chartPeriod === '7d') {
                label = i === 0 ? 'Hoy' : days[d.getDay()];
            } else {
                // Para 30 días, mostramos el número del día o el nombre si es lunes
                label = d.getDate().toString();
                if (d.getDay() === 1) label = days[1]; 
                if (i === 0) label = 'Hoy';
            }
            
            const dayTxs = transactions.filter(tx => tx.fullDate === dateStr);
            const inc = dayTxs.filter(tx => tx.type === 'ingreso' && !tx.isDebt).reduce((s, t) => s + (Number(t.amount) || 0), 0);
            const exp = dayTxs.filter(tx => tx.type === 'gasto' && !tx.isDebt).reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
            
            result.push({ day: label, inc, exp });
        }
        return result;
    }, [transactions, chartPeriod]);

    const handleDeleteAccount = (id: number) => {
        if (window.confirm('¿Eliminar esta cuenta? No se borrarán las transacciones, pero la cuenta ya no aparecerá.')) {
            setAccounts(prev => prev.filter(a => a.id !== id));
        }
    };

    return (
        <div style={{ paddingBottom: '5rem' }}>
            {/* 1. SECCIÓN PRINCIPAL: BALANCES Y RESUMEN */}
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
                                <TrendingUp size={12} color="#4ade80" />
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
                                <TrendingDown size={12} color="#f87171" />
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'white' }}>-{(expense || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* TARJETAS SECUNDARIAS: INDICADORES */}
                <div className="finance-summary-grid" style={{ display: 'grid', gap: '1rem' }}>
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

                    <GlassCard 
                        style={{
                            background: 'white',
                            padding: '1rem',
                            borderLeft: '4px solid var(--domain-orange)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <PiggyBank size={14} color={projectedSavings < 0 ? '#EF4444' : 'var(--domain-orange)'} />
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: projectedSavings < 0 ? '#EF4444' : '#888', textTransform: 'uppercase' }}>
                                Ahorro Proyectado
                            </span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: projectedSavings < 0 ? '#EF4444' : 'var(--text-carbon)', marginBottom: '8px' }}>
                            ${projectedSavings.toLocaleString()}
                        </h3>
                        
                        {/* Progress Bar para Ingresos Reales vs Meta Fija */}
                        {monthlyBudget > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#888', fontWeight: 700 }}>
                                    <span>{isBudgetFixed ? 'Ingreso Fijo Mensual' : 'Ingreso Real logrado'}</span>
                                    <span style={{ color: realIncomeThisMonth >= monthlyBudget ? 'var(--domain-green)' : '#888' }}>
                                        ${realIncomeThisMonth.toLocaleString()} / ${monthlyBudget.toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ width: '100%', height: '4px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, Math.max(0, (realIncomeThisMonth / monthlyBudget) * 100))}%` }}
                                        style={{ height: '100%', background: realIncomeThisMonth >= monthlyBudget ? 'var(--domain-green)' : 'var(--domain-orange)', borderRadius: '4px' }}
                                    />
                                </div>
                            </div>
                        )}
                    </GlassCard>
                </div>

                {/* 2. MIS CUENTAS (COLAPSABLE) */}
                <div style={{ marginBottom: '0.5rem' }}>
                    <button 
                        onClick={() => setIsAccountsVisible(!isAccountsVisible)}
                        style={{ 
                            width: '100%', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            background: '#F8FAFC', 
                            border: '1px solid #E2E8F0',
                            borderRadius: '16px',
                            padding: '10px 16px',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <PiggyBank size={16} color="var(--domain-blue)" />
                            <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#475569' }}>Mis Cuentas y Tarjetas ({accounts.length})</span>
                        </div>
                        <motion.div animate={{ rotate: isAccountsVisible ? 180 : 0 }}>
                            <ArrowDownCircle size={16} color="#888" />
                        </motion.div>
                    </button>

                    <AnimatePresence>
                        {isAccountsVisible && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }} 
                                animate={{ opacity: 1, height: 'auto' }} 
                                exit={{ opacity: 0, height: 0 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <div style={{ padding: '12px 0' }}>
                                    {/* Selector de Modo */}
                                    <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '12px', marginBottom: '12px', gap: '4px' }}>
                                        <button 
                                            onClick={() => setAccountViewMode('cuenta')}
                                            style={{ 
                                                flex: 1, padding: '6px', borderRadius: '8px', border: 'none', fontSize: '0.7rem', fontWeight: 800,
                                                background: accountViewMode === 'cuenta' ? 'white' : 'transparent',
                                                color: accountViewMode === 'cuenta' ? 'var(--domain-blue)' : '#64748B',
                                                boxShadow: accountViewMode === 'cuenta' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                                cursor: 'pointer'
                                            }}
                                        >POR CUENTA</button>
                                        <button 
                                            onClick={() => setAccountViewMode('proyecto')}
                                            style={{ 
                                                flex: 1, padding: '6px', borderRadius: '8px', border: 'none', fontSize: '0.7rem', fontWeight: 800,
                                                background: accountViewMode === 'proyecto' ? 'white' : 'transparent',
                                                color: accountViewMode === 'proyecto' ? 'var(--domain-blue)' : '#64748B',
                                                boxShadow: accountViewMode === 'proyecto' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                                cursor: 'pointer'
                                            }}
                                        >POR PROYECTO</button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                        {/* Botón AGREGAR vertical (ocupa toda la fila o es pequeño?) */}
                                        <button 
                                            onClick={() => setIsAddingAccount(!isAddingAccount)}
                                            style={{ 
                                                gridColumn: '1 / -1', padding: '10px', borderRadius: '14px', border: '2px dashed #CBD5E1',
                                                background: isAddingAccount ? '#0066FF10' : 'white',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer'
                                            }}
                                        >
                                            <Plus size={14} color="#0066FF" />
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0066FF' }}>NUEVA CUENTA</span>
                                        </button>

                                        {accountViewMode === 'cuenta' ? (
                                            <>
                                                {accountsWithBalance.map(acc => (
                                                    <div key={acc.id} style={{ 
                                                        background: 'white', border: '1px solid #EEE',
                                                        borderTop: `3px solid ${acc.color}`, borderRadius: '14px', padding: '8px',
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', position: 'relative'
                                                    }}>
                                                        <button 
                                                            onClick={() => handleDeleteAccount(acc.id)} 
                                                            style={{ position: 'absolute', top: '4px', right: '4px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}
                                                        >
                                                            <Trash2 size={8} color="#f87171" opacity={0.3} />
                                                        </button>
                                                        <span style={{ fontSize: '0.5rem', fontWeight: 800, color: '#AAA', textTransform: 'uppercase', marginBottom: '2px', display: 'block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.name}</span>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#333' }}>${acc.balance.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            /* Vista por Proyecto (Columnas apiladas horizontalmente) */
                                            <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-start' }}>
                                                {projects.map(project => {
                                                    const projectAccs = accountsWithBalance.filter(acc => acc.projectIds?.includes(project.id));
                                                    if (projectAccs.length === 0) return null;
                                                    return (
                                                        <div key={project.id} style={{ flex: '1 1 30%', minWidth: '95px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px', paddingLeft: '4px' }}>
                                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: project.color }} />
                                                                <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#64748B', textTransform: 'uppercase' }}>{project.name}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                {projectAccs.map(acc => (
                                                                    <div key={acc.id} style={{ 
                                                                        background: 'white', border: '1px solid #EEE', borderTop: `3px solid ${acc.color}`, 
                                                                        borderRadius: '12px', padding: '6px', display: 'flex', flexDirection: 'column', 
                                                                        alignItems: 'center', textAlign: 'center', position: 'relative', boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                                                    }}>
                                                                        <button 
                                                                            onClick={() => handleDeleteAccount(acc.id)} 
                                                                            style={{ position: 'absolute', top: '2px', right: '2px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}
                                                                        >
                                                                            <Trash2 size={8} color="#f87171" opacity={0.3} />
                                                                        </button>
                                                                        <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{acc.name}</span>
                                                                        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#333' }}>${acc.balance.toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Formulario Nueva Cuenta */}
                                    <AnimatePresence>
                                        {isAddingAccount && (
                                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '12px', padding: '12px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <input 
                                                            autoFocus placeholder="Nombre (ej. BCP, Efectivo...)" 
                                                            value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)}
                                                            style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #DDD', fontSize: '0.8rem', fontWeight: 600 }}
                                                        />
                                                        <select 
                                                            value={newAccountProjectId || ''} 
                                                            onChange={(e) => setNewAccountProjectId(e.target.value ? Number(e.target.value) : undefined)}
                                                            style={{ padding: '8px', borderRadius: '10px', border: '1px solid #DDD', fontSize: '0.75rem', fontWeight: 700, background: 'white' }}
                                                        >
                                                            <option value="">¿Proyecto?</option>
                                                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            {['#0055FF', '#ff8c42', '#10B911', '#8b5cf6', '#EC4899', '#334155'].map(c => (
                                                                <button key={c} onClick={() => setNewAccountColor(c)} style={{ width: '22px', height: '22px', borderRadius: '50%', background: c, border: newAccountColor === c ? '2px solid #333' : 'none', cursor: 'pointer' }} />
                                                            ))}
                                                        </div>
                                                        <button onClick={handleAddAccount} style={{ background: 'var(--domain-blue)', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer' }}>CREAR CUENTA</button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* 4. FLUJO SEMANAL Y DEUDAS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '8px', background: 'var(--domain-green)', borderRadius: '10px', color: 'white' }}>
                        <Wallet size={16} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-carbon)' }}>FLUJO DE CAJA</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                        onClick={() => setShowAnalytics(true)}
                        style={{ background: 'white', border: '1px solid #EEE', borderRadius: '10px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 900, color: 'var(--domain-purple)' }}
                    >
                        <PieChart size={12} /> VER ANÁLISIS
                    </button>
                    <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '12px', gap: '2px' }}>
                        {(['7d', '30d'] as const).map(p => (
                            <button 
                                key={p}
                                onClick={() => setChartPeriod(p)}
                                style={{ 
                                    padding: '4px 8px', borderRadius: '10px', border: 'none',
                                    background: chartPeriod === p ? 'white' : 'transparent',
                                    color: chartPeriod === p ? 'var(--domain-green)' : '#64748B',
                                    fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer',
                                    boxShadow: chartPeriod === p ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                }}
                            >
                                {p.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.2rem', height: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflowX: chartPeriod === '30d' ? 'auto' : 'visible' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '100px', gap: chartPeriod === '7d' ? '6px' : '2px', paddingBottom: '8px', minWidth: chartPeriod === '30d' ? '500px' : 'auto' }}>
                    {historyData.map((data, i) => {
                        const maxVal = Math.max(...historyData.map(h => Math.max(h.inc, h.exp)), 100);
                        const barWidth = chartPeriod === '7d' ? '6px' : '4px';
                        return (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                                <div style={{ display: 'flex', gap: '1px', alignItems: 'flex-end', height: '100%', width: '100%', justifyContent: 'center' }}>
                                    <motion.div initial={{ height: 0 }} animate={{ height: `${(data.inc / maxVal) * 100}%` }} style={{ width: barWidth, background: 'var(--domain-green)', borderRadius: '2px 2px 0 0', opacity: 0.8 }} />
                                    <motion.div initial={{ height: 0 }} animate={{ height: `${(data.exp / maxVal) * 100}%` }} style={{ width: barWidth, background: '#f87171', borderRadius: '2px 2px 0 0', opacity: 0.8 }} />
                                </div>
                                <span style={{ fontSize: chartPeriod === '7d' ? '0.6rem' : '0.5rem', fontWeight: 800, color: i === historyData.length - 1 ? 'var(--domain-orange)' : '#AAA' }}>{data.day}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="debts-grid" style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                <div 
                    className="glass-card" style={{ padding: '0.8rem', borderTop: '3px solid #f87171', display: 'flex', flexDirection: 'column', position: 'relative' }}
                >
                    {/* Botón para abrir modal de detalle */}
                    <div onClick={() => { setDebtMode('owe'); setShowDebtDetail(true); }} style={{ cursor: 'pointer', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#f87171' }}>
                            <UserMinus size={14} /><span style={{ fontSize: '0.7rem', fontWeight: 800 }}>DEBO</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-carbon)' }}>${owe}</p>
                    </div>
                    {/* Toggle de Inclusión en Proyectado */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setIncludeDebts(!includeDebts); }}
                        title={includeDebts ? 'Restando esta deuda del Ahorro Proyectado' : 'Esta deuda NO afecta tu Ahorro Proyectado (por ahora)'}
                        style={{
                            position: 'absolute', top: '0.8rem', right: '0.8rem',
                            display: 'flex', alignItems: 'center', gap: '4px',
                            background: includeDebts ? '#f87171' : '#F1F5F9',
                            border: 'none', borderRadius: '8px',
                            padding: '4px 8px', cursor: 'pointer',
                            transition: 'all 0.2s', zIndex: 10
                        }}
                    >
                        <span style={{ fontSize: '0.55rem', fontWeight: 900, color: includeDebts ? 'white' : '#94A3B8', whiteSpace: 'nowrap' }}>
                            {includeDebts ? '✓ PAGARÉ HOY' : 'PAGAR LUEGO'}
                        </span>
                    </button>
                </div>
                <div 
                    onClick={() => { setDebtMode('owed'); setShowDebtDetail(true); }}
                    className="glass-card" style={{ padding: '0.8rem', borderTop: '3px solid #4ade80', cursor: 'pointer' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#4ade80' }}>
                        <UserPlus size={14} /><span style={{ fontSize: '0.7rem', fontWeight: 800 }}>ME DEBEN</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-carbon)' }}>${owed}</p>
                </div>
            </div>

            {/* 5. PLANIFICADOR Y MOVIMIENTOS */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-carbon)' }}>📊 Planificador Mensual</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                            onClick={() => setIsBudgetFixed(!isBudgetFixed)}
                            title={isBudgetFixed ? 'Ingreso Fijo: ya existe este dinero' : 'Marcar como ingreso fijo'}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                background: isBudgetFixed ? 'var(--domain-green)' : '#E2E8F0',
                                border: 'none', borderRadius: '8px',
                                padding: '4px 8px', cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span style={{ fontSize: '0.55rem', fontWeight: 900, color: isBudgetFixed ? 'white' : '#64748B', whiteSpace: 'nowrap' }}>
                                {isBudgetFixed ? '✓ FIJO' : 'FIJO?'}
                            </span>
                        </button>
                        <div style={{ background: '#F0EBE6', padding: '4px 8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#888' }}>BASE</span>
                            <input type="number" value={monthlyBudget || ''} onChange={(e) => updateMonthlyBudget(e.target.value === '' ? 0 : Number(e.target.value))} style={{ border: 'none', background: 'transparent', width: '50px', fontSize: '0.75rem', fontWeight: 900, outline: 'none', color: 'var(--domain-blue)' }} />
                        </div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '1rem', background: '#FFF' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {fixedExpenses.map((expense) => (
                            <FixedExpenseItem 
                                key={expense.id} expense={expense} 
                                toggleFixedExpense={toggleFixedExpense} 
                                removeFixedExpense={removeFixedExpense} 
                                updateFixedExpense={updateFixedExpense} 
                                markFixedExpensePaid={markFixedExpensePaid}
                                unmarkFixedExpensePaid={unmarkFixedExpensePaid}
                                projects={projects} 
                            />
                        ))}
                        <div style={{ marginTop: '2px', paddingTop: '8px', borderTop: '1px dashed #EEE' }}>
                            <NewFixedExpenseForm addFixedExpense={addFixedExpense} projects={projects} />
                        </div>
                    </div>
                </div>
            </div>

            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 900 }}>Últimos Movimientos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {transactions.slice(0, 10).map((tx) => (
                    <div key={tx.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: tx.type === 'ingreso' ? '#DCFCE7' : '#FEE2E2', padding: '6px', borderRadius: '10px' }}>
                                {tx.type === 'ingreso' ? <TrendingUp size={16} color="#4ade80" /> : <TrendingDown size={16} color="#f87171" />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-carbon)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.text}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                    <span style={{ fontSize: '0.6rem', color: '#AAA' }}>{tx.date}</span>
                                    {projects.find(p => p.id === tx.projectId) && (
                                        <span style={{ fontSize: '0.55rem', fontWeight: 900, background: `${projects.find(p => p.id === tx.projectId)?.color}15`, color: projects.find(p => p.id === tx.projectId)?.color, padding: '2px 6px', borderRadius: '6px' }}>
                                            @{projects.find(p => p.id === tx.projectId)?.name}
                                        </span>
                                    )}
                                    {accounts.find(a => a.id === tx.accountId) && (
                                        <span style={{ fontSize: '0.55rem', fontWeight: 900, background: '#F0F0F0', color: '#666', padding: '2px 6px', borderRadius: '6px' }}>
                                            {accounts.find(a => a.id === tx.accountId)?.name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: tx.type === 'ingreso' ? '#10B981' : 'var(--text-carbon)' }}>{tx.type === 'ingreso' ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()}</span>
                            <button 
                                onClick={() => {
                                    if (window.confirm('⚠️ ¿Seguro que deseas eliminar este movimiento? Su valor será devuelto a tu balance inmediatamente.')) {
                                        removeTransaction(tx.id);
                                    }
                                }}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
                            >
                                <Trash2 size={14} color="#f87171" opacity={0.5} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {selectedProject && (
                    <ProjectDetailView 
                        project={selectedProject}
                        onClose={() => setSelectedProject(null)}
                        accounts={accounts}
                        setAccounts={setAccounts}
                        transactions={transactions}
                        addProjectTask={() => {}} 
                        toggleProjectTask={() => {}}
                        removeProjectTask={() => {}}
                        updateProjectTask={() => {}}
                        reorderProjectTasks={() => {}}
                        promoteTaskToRoutine={() => {}}
                        rutinas={[]}
                    />
                )}
                
                {showDebtDetail && (
                    <DebtDetailView 
                        transactions={transactions}
                        accounts={accounts}
                        initialMode={debtMode}
                        onClose={() => setShowDebtDetail(false)}
                        repayDebt={repayDebt}
                        removeTransaction={removeTransaction}
                        updateTransaction={updateTransaction}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showAnalytics && (
                    <AnalyticsView 
                        transactions={transactions}
                        onClose={() => setShowAnalytics(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// --- SUB-COMPONENTES AUXILIARES ---

const FixedExpenseItem = ({ expense, toggleFixedExpense, removeFixedExpense, updateFixedExpense, markFixedExpensePaid, unmarkFixedExpensePaid, projects }: { 
    expense: FixedExpense, 
    toggleFixedExpense: (id: number) => void, 
    removeFixedExpense: (id: number) => void,
    updateFixedExpense: (id: number, updates: Partial<FixedExpense>) => void,
    markFixedExpensePaid: (id: number, monthStr: string) => void,
    unmarkFixedExpensePaid: (id: number, monthStr: string) => void,
    projects: { id: number, name: string, color: string }[] 
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(expense.text);
    const [editAmount, setEditAmount] = useState(expense.amount.toString());
    const [editProjectId, setEditProjectId] = useState(expense.projectId);
    const [editDueDay, setEditDueDay] = useState<number | undefined>(expense.dueDay);

    const handleSave = () => {
        updateFixedExpense(expense.id, {
            text: editName,
            amount: parseFloat(editAmount) || 0,
            projectId: editProjectId,
            dueDay: editDueDay
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
                    <input 
                        type="number" value={editDueDay || ''} onChange={(e) => setEditDueDay(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="Día (1-31)" 
                        min="1" max="31"
                        style={{ width: '60px', padding: '6px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '0.8rem', fontWeight: 600 }}
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

    const currentMonthStr = new Date().toLocaleDateString('en-CA').substring(0, 7);
    const isPaid = expense.lastPaidMonth === currentMonthStr;

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
                
                {/* Checkmark de Pago */}
                <button
                    onClick={() => {
                        if (!expense.active) return;
                        if (isPaid) {
                            if (window.confirm('¿Estás seguro de que quieres desmarcar este gasto? Se eliminará la transacción generada de tus pagos.')) {
                                unmarkFixedExpensePaid(expense.id, currentMonthStr);
                            }
                        } else {
                            markFixedExpensePaid(expense.id, currentMonthStr);
                        }
                    }}
                    style={{
                        background: isPaid ? 'var(--domain-green)' : 'transparent',
                        border: isPaid ? 'none' : '2px solid #DDD',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: (!isPaid && expense.active) ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        opacity: expense.active ? 1 : 0.5
                    }}
                >
                    {isPaid && <Check size={12} color="white" />}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-carbon)', textDecoration: isPaid ? 'line-through' : 'none' }}>
                        {expense.text}
                    </span>
                    {project && (
                        <span style={{ fontSize: '0.55rem', fontWeight: 900, color: project.color }}>
                            @{project.name}
                        </span>
                    )}
                    {expense.dueDay && (
                        <span style={{ fontSize: '0.55rem', fontWeight: 900, background: '#FDE68A', color: '#B45309', padding: '2px 4px', borderRadius: '4px' }}>
                            Día {expense.dueDay}
                        </span>
                    )}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isPaid ? 'var(--domain-green)' : '#666' }}>
                    ${expense.amount.toLocaleString()}
                </span>
                <button onClick={() => setIsEditing(true)} style={{ background: 'transparent', border: 'none', color: '#DDD', cursor: 'pointer' }}><Edit2 size={12} /></button>
                <button onClick={() => removeFixedExpense(expense.id)} style={{ background: 'transparent', border: 'none', color: '#EEE', cursor: 'pointer' }}><Trash2 size={12} /></button>
            </div>
        </div>
    );
};

const NewFixedExpenseForm = ({ addFixedExpense, projects }: { addFixedExpense: (t: string, a: number, p?: number, d?: number) => void, projects: { id: number, name: string, color: string }[] }) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [projectId, setProjectId] = useState<number | undefined>(undefined);
    const [dueDay, setDueDay] = useState<number | undefined>(undefined);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleSubmit = () => {
        if (name && amount) {
            addFixedExpense(name, parseFloat(amount), projectId, dueDay);
            setName('');
            setAmount('');
            setProjectId(undefined);
            setDueDay(undefined);
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
                <input 
                    type="number" placeholder="Día" 
                    value={dueDay || ''} onChange={(e) => setDueDay(e.target.value ? Number(e.target.value) : undefined)}
                    min="1" max="31"
                    style={{ width: '45px', padding: '6px', borderRadius: '8px', border: '1px solid #DDD', fontSize: '0.8rem' }}
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
