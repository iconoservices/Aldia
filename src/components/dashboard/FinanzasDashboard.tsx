import { TrendingUp, Wallet, ArrowUpCircle, ArrowDownCircle, UserMinus, UserPlus, BarChart3, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
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
    addFixedExpense: (text: string, amount: number) => void;
    removeFixedExpense: (id: number) => void;
    toggleFixedExpense: (id: number) => void;
    projects: { id: number, name: string, color: string }[];
}

export const FinanzasDashboard = ({ 
    balance, income, expense, owe, owed, transactions,
    monthlyBudget, updateMonthlyBudget, fixedExpenses, 
    addFixedExpense, removeFixedExpense, toggleFixedExpense,
    projects 
}: FinanzasProps) => {
    return (
        <div style={{ paddingBottom: '5rem' }}>
            {/* CARD PRINCIPAL: BALANCE GENERAL */}
            <div className="glass-card" style={{
                background: 'linear-gradient(135deg, #0055FF 0%, #003399 100%)',
                color: 'white',
                marginBottom: '1.5rem',
                padding: '1.8rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>Balance Total</span>
                    <Wallet size={20} opacity={0.8} />
                </div>
                <h2 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-1px', color: 'white' }}>
                    ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h2>

                <div style={{ display: 'flex', gap: '15px', marginTop: '1.5rem' }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowUpCircle size={18} color="#4ade80" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>${income}</span>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowDownCircle size={18} color="#f87171" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>${expense}</span>
                    </div>
                </div>
            </div>

            {/* SECCIÓN DE NEGOCIO / VENTAS (Simulada para V1) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Proyectos & Ventas</h3>
                <TrendingUp size={18} color="#888" />
            </div>

            <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text-carbon)' }}>Ventas AlDía SaaS</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>Basado en tus ingresos hoy</p>
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4ade80' }}>+${income > 0 ? income : '87.00'}</span>
                </div>
            </div>

            {/* GRÁFICO DE BARRAS PREMIUM: FLUJO SEMANAL */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Flujo Semanal (7d)</h3>
                <BarChart3 size={18} color="#888" />
            </div>

            <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem', height: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '140px', gap: '8px', paddingBottom: '10px' }}>
                    {[
                        { day: 'Lun', exp: 120, inc: 400 },
                        { day: 'Mar', exp: 450, inc: 100 },
                        { day: 'Mié', exp: 200, inc: 800 },
                        { day: 'Jue', exp: 800, inc: 300 },
                        { day: 'Vie', exp: 300, inc: 1200 },
                        { day: 'Sáb', exp: 1200, inc: 450 },
                        { day: 'Dom', exp: expense, inc: income }
                    ].map((data, i) => {
                        const maxVal = 1200;
                        const incHeight = (data.inc / maxVal) * 100;
                        const expHeight = (data.exp / maxVal) * 100;

                        return (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                                <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '100%', width: '100%', justifyContent: 'center' }}>
                                    {/* Barra de Ingreso */}
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${Math.min(incHeight, 100)}%` }}
                                        transition={{ delay: i * 0.05, duration: 0.8 }}
                                        style={{ width: '8px', background: 'var(--domain-green)', borderRadius: '4px 4px 0 0', opacity: 0.8 }}
                                    />
                                    {/* Barra de Gasto */}
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${Math.min(expHeight, 100)}%` }}
                                        transition={{ delay: (i + 1) * 0.05, duration: 0.8 }}
                                        style={{ width: '8px', background: '#f87171', borderRadius: '4px 4px 0 0', opacity: 0.8 }}
                                    />
                                </div>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: i === 6 ? 'var(--domain-orange)' : '#AAA' }}>{data.day}</span>
                            </div>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--domain-green)' }}></div>
                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#888' }}>INGRESOS</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171' }}></div>
                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#888' }}>GASTOS</span>
                    </div>
                </div>
            </div>

            {/* SECCIÓN DE DEUDAS (DEBO / ME DEBEN) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-card" style={{ padding: '1rem', borderTop: '4px solid #f87171' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#f87171' }}>
                        <UserMinus size={16} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>DEBO</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>${owe}</p>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: '#888' }}>
                        {transactions.filter(tx => tx.type === 'gasto' && tx.isDebt).length} personas pendientes
                    </p>
                </div>
                <div className="glass-card" style={{ padding: '1rem', borderTop: '4px solid #4ade80' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#4ade80' }}>
                        <UserPlus size={16} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>ME DEBEN</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>${owed}</p>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: '#888' }}>
                        {transactions.filter(tx => tx.type === 'ingreso' && tx.isDebt).length} cobros activos
                    </p>
                </div>
            </div>

            {/* PLANIFICADOR MENSUAL: GASTOS FIJOS */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>📊 Planificador Mensual</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ background: '#F0EBE6', padding: '4px 10px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#888' }}>INGRESO BASE</span>
                            <input 
                                type="number" 
                                value={monthlyBudget} 
                                onChange={(e) => updateMonthlyBudget(Number(e.target.value))}
                                style={{ border: 'none', background: 'transparent', width: '60px', fontSize: '0.8rem', fontWeight: 900, outline: 'none', color: 'var(--domain-blue)' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '1.2rem', background: '#FFF' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {fixedExpenses.map((expense) => (
                            <div key={expense.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: expense.active ? 1 : 0.4, transition: 'opacity 0.3s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div 
                                        onClick={() => toggleFixedExpense(expense.id)}
                                        style={{ width: '32px', height: '18px', borderRadius: '20px', background: expense.active ? 'var(--domain-blue)' : '#DDD', position: 'relative', cursor: 'pointer' }}
                                    >
                                        <motion.div 
                                            animate={{ x: expense.active ? 16 : 2 }}
                                            style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px' }}
                                        />
                                    </div>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-carbon)' }}>{expense.text}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#666' }}>${expense.amount}</span>
                                    <button 
                                        onClick={() => removeFixedExpense(expense.id)}
                                        style={{ background: 'transparent', border: 'none', color: '#EEE', cursor: 'pointer' }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = '#EEE'}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', paddingTop: '12px', borderTop: '1px dashed #EEE' }}>
                            <Plus size={16} color="#CCC" />
                            <input 
                                placeholder="Nuevo gasto fijo (ej. Alquiler)..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.currentTarget.value) {
                                        const parts = e.currentTarget.value.split(':');
                                        const text = parts[0];
                                        const amount = parts[1] ? Number(parts[1]) : 0;
                                        if (text && !isNaN(amount)) {
                                            addFixedExpense(text, amount);
                                            e.currentTarget.value = '';
                                        }
                                    }
                                }}
                                style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: 600, outline: 'none', width: '100%' }}
                            />
                            <span style={{ fontSize: '0.6rem', color: '#BBB', whiteSpace: 'nowrap' }}>usa "Nombre: 500"</span>
                        </div>
                    </div>

                    {/* Balance Proyectado */}
                    <div style={{ 
                        marginTop: '1.5rem', 
                        padding: '1rem', 
                        borderRadius: '16px', 
                        background: '#F9F9F9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 900, color: '#888', textTransform: 'uppercase' }}>Balance Proyectado</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#AAA' }}>Lo que te queda después de gastos fijos</p>
                        </div>
                        {(() => {
                            const totalFixed = fixedExpenses.filter(e => e.active).reduce((acc, e) => acc + e.amount, 0);
                            const projected = monthlyBudget - totalFixed;
                            const isNegative = projected < 0;
                            return (
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ 
                                        fontSize: '1.4rem', 
                                        fontWeight: 900, 
                                        color: isNegative ? '#f87171' : 'var(--domain-green)'
                                    }}>
                                        {isNegative ? '-' : ''}${Math.abs(projected).toLocaleString()}
                                    </span>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* ÚLTIMOS MOVIMIENTOS */}
            <h3 style={{ marginBottom: '1rem' }}>Últimos Movimientos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {transactions.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>No hay movimientos hoy</p>
                ) : (
                    transactions.slice(0, 10).map((tx) => (
                        <div key={tx.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: tx.type === 'ingreso' ? '#DCFCE7' : '#FEE2E2', padding: '8px', borderRadius: '12px' }}>
                                    {tx.type === 'ingreso' ? <ArrowUpCircle size={18} color="#4ade80" /> : <ArrowDownCircle size={18} color="#f87171" />}
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{tx.text} {tx.isDebt && <span style={{ color: 'var(--domain-orange)', fontSize: '0.6rem' }}>[DEUDA]</span>}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#888' }}>{tx.date}</p>
                                        {tx.projectId && projects.find(p => p.id === tx.projectId) && (
                                            <span style={{ 
                                                fontSize: '0.6rem', 
                                                fontWeight: 900, 
                                                color: projects.find(p => p.id === tx.projectId)!.color,
                                                background: `${projects.find(p => p.id === tx.projectId)!.color}15`,
                                                padding: '1px 6px',
                                                borderRadius: '6px',
                                                textTransform: 'uppercase'
                                            }}>
                                                {projects.find(p => p.id === tx.projectId)!.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <span style={{ fontWeight: 800, color: tx.type === 'ingreso' ? '#4ade80' : 'var(--text-carbon)' }}>
                                {tx.type === 'ingreso' ? '+' : '-'}${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
