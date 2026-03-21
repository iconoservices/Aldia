import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, PieChart, BarChart3, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import type { Transaction } from '../../hooks/useAlDiaState';

interface AnalyticsViewProps {
    transactions: Transaction[];
    onClose: () => void;
}

export const AnalyticsView = ({ transactions, onClose }: AnalyticsViewProps) => {
    const [viewMode, setViewMode] = useState<'monthly' | 'categories'>('monthly');
    const [viewDate, setViewDate] = useState(new Date());

    const monthStr = useMemo(() => {
        return viewDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    }, [viewDate]);

    // Filtrar transacciones del mes seleccionado
    const monthTxs = useMemo(() => {
        return transactions.filter(tx => {
            const d = new Date(tx.fullDate);
            return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
        });
    }, [transactions, viewDate]);

    // Totales del mes
    const monthStats = useMemo(() => {
        const income = monthTxs.filter(tx => tx.type === 'ingreso' && !tx.isDebt).reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const expense = monthTxs.filter(tx => tx.type === 'gasto' && !tx.isDebt).reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
        return { income, expense, net: income - expense };
    }, [monthTxs]);

    // Totales del mes pasado
    const lastMonthStats = useMemo(() => {
        const lastMonthDate = new Date(viewDate);
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonthTxs = transactions.filter(tx => {
            const d = new Date(tx.fullDate);
            return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
        });
        const income = lastMonthTxs.filter(tx => tx.type === 'ingreso' && !tx.isDebt).reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const expense = lastMonthTxs.filter(tx => tx.type === 'gasto' && !tx.isDebt).reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
        return { income, expense };
    }, [transactions, viewDate]);

    // Datos del gráfico de barras por día
    const dailyData = useMemo(() => {
        const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
        const data = [];
        for (let i = 1; i <= lastDay; i++) {
            const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayTxs = monthTxs.filter(tx => tx.fullDate === dateStr);
            const inc = dayTxs.filter(tx => tx.type === 'ingreso' && !tx.isDebt).reduce((s, t) => s + (Number(t.amount) || 0), 0);
            const exp = dayTxs.filter(tx => tx.type === 'gasto' && !tx.isDebt).reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
            data.push({ day: i, inc, exp });
        }
        return data;
    }, [monthTxs, viewDate]);

    // Desglose por categorías
    const categoryData = useMemo(() => {
        const cats: Record<string, number> = {};
        monthTxs.filter(tx => tx.type === 'gasto' && !tx.isDebt).forEach(tx => {
            const c = tx.category || 'Otros';
            cats[c] = (cats[c] || 0) + Math.abs(tx.amount);
        });
        return Object.entries(cats)
            .sort((a, b) => b[1] - a[1])
            .map(([name, amount]) => ({ name, amount }));
    }, [monthTxs]);

    const changeMonth = (delta: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ 
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                background: '#F8F9FA', zIndex: 1200, 
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
                    <h2 style={{ margin:0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-carbon)' }}>Análisis de Gastos</h2>
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#AAA', textTransform: 'uppercase' }}>ESTADÍSTICAS Y MÁRGENES</span>
                </div>
            </div>

            {/* Month Selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '12px 1rem', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <button onClick={() => changeMonth(-1)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}><ChevronLeft size={24} /></button>
                <div style={{ textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '1rem', fontWeight: 900, color: 'var(--text-carbon)', textTransform: 'capitalize' }}>{monthStr}</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#AAA' }}>PERIODO SELECCIONADO</span>
                </div>
                <button onClick={() => changeMonth(1)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}><ChevronRight size={24} /></button>
            </div>

            {/* Mode Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#E2E8F0', padding: '4px', borderRadius: '16px', gap: '4px' }}>
                <button 
                    onClick={() => setViewMode('monthly')}
                    style={{ 
                        padding: '10px', borderRadius: '12px', border: 'none', 
                        background: viewMode === 'monthly' ? 'white' : 'transparent',
                        color: viewMode === 'monthly' ? 'var(--domain-purple)' : '#64748B',
                        fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                >
                    <BarChart3 size={16} /> MENSUAL
                </button>
                <button 
                    onClick={() => setViewMode('categories')}
                    style={{ 
                        padding: '10px', borderRadius: '12px', border: 'none', 
                        background: viewMode === 'categories' ? 'white' : 'transparent',
                        color: viewMode === 'categories' ? 'var(--domain-orange)' : '#64748B',
                        fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                >
                    <PieChart size={16} /> CATEGORÍAS
                </button>
            </div>

            {/* Summary Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <GlassCard style={{ padding: '1rem', background: '#dcfce7', border: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <TrendingUp size={16} color="#10b981" style={{ marginBottom: '8px' }} />
                            <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 800, color: '#10b981', opacity: 0.8 }}>INGRESOS</span>
                        </div>
                        {lastMonthStats.income > 0 && (
                            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: monthStats.income >= lastMonthStats.income ? '#10b981' : '#ef4444' }}>
                                {monthStats.income >= lastMonthStats.income ? '↑' : '↓'} {Math.abs(((monthStats.income - lastMonthStats.income) / lastMonthStats.income) * 100).toFixed(0)}%
                            </span>
                        )}
                    </div>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>S/.{monthStats.income.toLocaleString()}</span>
                </GlassCard>
                <GlassCard style={{ padding: '1rem', background: '#fee2e2', border: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <TrendingDown size={16} color="#ef4444" style={{ marginBottom: '8px' }} />
                            <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 800, color: '#ef4444', opacity: 0.8 }}>GASTOS</span>
                        </div>
                        {lastMonthStats.expense > 0 && (
                            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: monthStats.expense <= lastMonthStats.expense ? '#10b981' : '#ef4444' }}>
                                {monthStats.expense <= lastMonthStats.expense ? '↓' : '↑'} {Math.abs(((monthStats.expense - lastMonthStats.expense) / lastMonthStats.expense) * 100).toFixed(0)}%
                            </span>
                        )}
                    </div>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>S/.{monthStats.expense.toLocaleString()}</span>
                </GlassCard>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {viewMode === 'monthly' ? (
                    <div className="glass-card" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowX: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart3 size={18} color="var(--domain-purple)" />
                            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: '#666' }}>FLUJO DIARIO DEL MES</h3>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '3px', minWidth: '800px', height: '200px', paddingBottom: '1rem' }}>
                            {dailyData.map((d, i) => {
                                const maxVal = Math.max(...dailyData.map(v => Math.max(v.inc, v.exp)), 100);
                                return (
                                    <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                                        <div style={{ display: 'flex', gap: '1px', alignItems: 'flex-end', height: '100%' }}>
                                            <motion.div initial={{ height: 0 }} animate={{ height: `${(d.inc / maxVal) * 100}%` }} style={{ width: '4px', background: '#10b981', borderRadius: '2px 2px 0 0' }} />
                                            <motion.div initial={{ height: 0 }} animate={{ height: `${(d.exp / maxVal) * 100}%` }} style={{ width: '4px', background: '#ef4444', borderRadius: '2px 2px 0 0' }} />
                                        </div>
                                        <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#AAA' }}>{d.day}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="glass-card" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PieChart size={18} color="var(--domain-orange)" />
                            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: '#666' }}>DISTRIBUCIÓN POR CATEGORÍA</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {categoryData.map((cat, i) => {
                                const percentage = (cat.amount / (monthStats.expense || 1)) * 100;
                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];
                                return (
                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-carbon)' }}>{cat.name}</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#666' }}>S/.{cat.amount.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                                        </div>
                                        <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                                            <motion.div 
                                                initial={{ width: 0 }} 
                                                animate={{ width: `${percentage}%` }} 
                                                style={{ height: '100%', background: colors[i % colors.length] }} 
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {categoryData.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#BBB', fontWeight: 600 }}>No hay gastos registrados este mes.</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Performance Card */}
            <GlassCard style={{ padding: '1.2rem', background: monthStats.net >= 0 ? 'var(--domain-green)' : '#ef4444', color: 'white', border: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, opacity: 0.8 }}>BALANCE NETO</span>
                        <h4 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>S/.{monthStats.net.toLocaleString()}</h4>
                    </div>
                    {monthStats.net >= 0 ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
                </div>
            </GlassCard>
        </motion.div>
    );
};
