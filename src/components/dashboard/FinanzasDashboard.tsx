import { TrendingUp, Wallet, ArrowUpCircle, ArrowDownCircle, UserMinus, UserPlus } from 'lucide-react';
import type { Transaction } from '../../hooks/useAlDiaState';

interface FinanzasProps {
    balance: number;
    income: number;
    expense: number;
    owe: number;
    owed: number;
    transactions: Transaction[];
}

export const FinanzasDashboard = ({ balance, income, expense, owe, owed, transactions }: FinanzasProps) => {
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
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#888' }}>{tx.date}</p>
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
