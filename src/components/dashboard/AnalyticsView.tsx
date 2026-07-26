import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, PieChart, BarChart3, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, List, Filter, Check } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { useIsMobile } from '../../theme';
import { getPeriodBounds, periodLabel, shiftPeriod, type PeriodMode } from './FinanzasDashboard';
import type { Transaction } from '../../hooks/useAlDiaState';

interface AnalyticsAccount {
    id: number;
    name: string;
    color: string;
}

interface AnalyticsViewProps {
    transactions: Transaction[];
    onClose: () => void;
    // Deudas activas (no saldadas): cuánto debo y cuánto me deben, para la
    // tarjeta de salud financiera. Opcionales para no romper otros usos de esta vista.
    owe?: number;
    owed?: number;
    accounts?: AnalyticsAccount[];
}

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];
const NONE_ACCOUNT_KEY = 'none' as const;
type AccountKey = number | typeof NONE_ACCOUNT_KEY;
type AccountFilter = 'all' | Set<AccountKey>;

const fmtDate = (d: Date) => d.toLocaleDateString('en-CA');

export const AnalyticsView = ({ transactions, onClose, owe = 0, owed = 0, accounts = [] }: AnalyticsViewProps) => {
    const isDesktop = !useIsMobile();

    // ── Periodo: mismo lenguaje que el resto de Finanzas (Día/Sem/Mes/Año/Todo),
    // más un rango personalizado de fecha a fecha ──────────────────────────────
    const [mode, setMode] = useState<PeriodMode | 'custom'>('month');
    const [refDate, setRefDate] = useState(new Date());
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [mobileTab, setMobileTab] = useState<'chart' | 'categories'>('chart');
    const [categoryView, setCategoryView] = useState<'bars' | 'pie'>('bars');

    // ── Filtro por cuenta: todas, o una selección (incluye "Sin cuenta") ──
    const [accountFilter, setAccountFilter] = useState<AccountFilter>('all');
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const allAccountKeys = useMemo(() => new Set<AccountKey>([...accounts.map(a => a.id), NONE_ACCOUNT_KEY]), [accounts]);

    const toggleAccountKey = (key: AccountKey) => {
        setAccountFilter(prev => {
            const current = prev === 'all' ? new Set(allAccountKeys) : new Set(prev);
            if (current.has(key)) current.delete(key); else current.add(key);
            if (current.size === allAccountKeys.size) return 'all';
            return current;
        });
    };

    const scopedTransactions = useMemo(() => {
        if (accountFilter === 'all') return transactions;
        return transactions.filter(t => accountFilter.has(t.accountId ?? NONE_ACCOUNT_KEY));
    }, [transactions, accountFilter]);

    const effectiveBounds = useMemo(() => {
        if (mode === 'custom') {
            const today = fmtDate(new Date());
            const s = customStart || today;
            const e = customEnd || today;
            return s <= e ? { start: s, end: e } : { start: e, end: s };
        }
        if (mode === 'all') {
            if (scopedTransactions.length === 0) { const t = fmtDate(new Date()); return { start: t, end: t }; }
            const dates = scopedTransactions.map(t => t.fullDate).sort();
            return { start: dates[0], end: dates[dates.length - 1] };
        }
        return getPeriodBounds(mode, refDate);
    }, [mode, refDate, customStart, customEnd, scopedTransactions]);

    const periodTxs = useMemo(() =>
        scopedTransactions.filter(t => t.fullDate >= effectiveBounds.start && t.fullDate <= effectiveBounds.end),
        [scopedTransactions, effectiveBounds]);

    const periodStats = useMemo(() => {
        const income = periodTxs.filter(t => t.type === 'ingreso' && !t.isDebt).reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const expense = periodTxs.filter(t => t.type === 'gasto' && !t.isDebt).reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
        return { income, expense, net: income - expense };
    }, [periodTxs]);

    // Comparación con el periodo anterior equivalente: no tiene sentido para "Todo" o un rango libre
    const prevBounds = useMemo(() => {
        if (mode === 'all' || mode === 'custom') return null;
        return getPeriodBounds(mode, shiftPeriod(mode, refDate, -1));
    }, [mode, refDate]);

    const prevStats = useMemo(() => {
        if (!prevBounds) return null;
        const txs = scopedTransactions.filter(t => t.fullDate >= prevBounds.start && t.fullDate <= prevBounds.end);
        const income = txs.filter(t => t.type === 'ingreso' && !t.isDebt).reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const expense = txs.filter(t => t.type === 'gasto' && !t.isDebt).reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
        return { income, expense };
    }, [scopedTransactions, prevBounds]);

    // Desglose por categorías del periodo activo
    const categoryData = useMemo(() => {
        const cats: Record<string, number> = {};
        periodTxs.filter(t => t.type === 'gasto' && !t.isDebt).forEach(t => {
            const c = t.category || 'Otros';
            cats[c] = (cats[c] || 0) + Math.abs(t.amount);
        });
        return Object.entries(cats)
            .sort((a, b) => b[1] - a[1])
            .map(([name, amount]) => ({ name, amount }));
    }, [periodTxs]);

    // Gráfico de flujo: por día si el rango es corto (<= ~3 meses), por mes si es largo
    const chartBuckets = useMemo(() => {
        if (mode === 'day') return { granularity: 'day' as const, data: [] as { label: string; inc: number; exp: number }[] };
        const start = new Date(effectiveBounds.start);
        const end = new Date(effectiveBounds.end);
        const spanDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

        if (spanDays <= 92) {
            const data = [];
            for (let i = 0; i < spanDays; i++) {
                const d = new Date(start); d.setDate(d.getDate() + i);
                const dateStr = fmtDate(d);
                const dayTxs = periodTxs.filter(t => t.fullDate === dateStr);
                const inc = dayTxs.filter(t => t.type === 'ingreso' && !t.isDebt).reduce((s, t) => s + (Number(t.amount) || 0), 0);
                const exp = dayTxs.filter(t => t.type === 'gasto' && !t.isDebt).reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
                data.push({ label: String(d.getDate()), inc, exp });
            }
            return { granularity: 'day' as const, data };
        }

        const totalMonths = Math.min((end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1, 60);
        const data = [];
        for (let i = 0; i < totalMonths; i++) {
            const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const bucketTxs = periodTxs.filter(t => t.fullDate.startsWith(key));
            const inc = bucketTxs.filter(t => t.type === 'ingreso' && !t.isDebt).reduce((s, t) => s + (Number(t.amount) || 0), 0);
            const exp = bucketTxs.filter(t => t.type === 'gasto' && !t.isDebt).reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
            data.push({ label: d.toLocaleDateString('es-ES', { month: 'short' }), inc, exp });
        }
        return { granularity: 'month' as const, data };
    }, [periodTxs, effectiveBounds, mode]);

    // ── Salud financiera: tasa de ahorro del periodo + una recomendación simple ──
    const savingsRate = periodStats.income > 0 ? (periodStats.net / periodStats.income) * 100 : 0;
    const netDebt = owe - owed;
    const topCategory = categoryData[0];

    const health = useMemo(() => {
        if (periodStats.income <= 0) return { label: 'Sin datos', color: '#64748B', bg: '#F1F5F9' };
        if (savingsRate < 0) return { label: 'En rojo', color: '#ef4444', bg: '#fee2e2' };
        if (savingsRate < 10) return { label: 'Ajustado', color: '#f59e0b', bg: '#fef3c7' };
        if (savingsRate < 20) return { label: 'Aceptable', color: '#f59e0b', bg: '#fef3c7' };
        return { label: 'Saludable', color: '#10b981', bg: '#dcfce7' };
    }, [savingsRate, periodStats.income]);

    const donutGradient = useMemo(() => {
        if (categoryData.length === 0 || periodStats.expense <= 0) return 'conic-gradient(#F1F5F9 0% 100%)';
        let acc = 0;
        const stops = categoryData.map((cat, i) => {
            const pct = (cat.amount / periodStats.expense) * 100;
            const start = acc; acc += pct;
            return `${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} ${start}% ${acc}%`;
        });
        return `conic-gradient(${stops.join(', ')})`;
    }, [categoryData, periodStats.expense]);

    const periodLabelStr = mode === 'custom'
        ? (customStart && customEnd ? `${customStart} → ${customEnd}` : 'Elige un rango de fechas')
        : periodLabel(mode, refDate);

    const canNavigate = mode !== 'all' && mode !== 'custom';

    const accountFilterLabel = useMemo(() => {
        if (accountFilter === 'all') return 'Todas';
        if (accountFilter.size === 0) return 'Ninguna';
        if (accountFilter.size === 1) {
            const key = [...accountFilter][0];
            return key === NONE_ACCOUNT_KEY ? 'Sin cuenta' : (accounts.find(a => a.id === key)?.name || '1 cuenta');
        }
        return `${accountFilter.size} seleccionadas`;
    }, [accountFilter, accounts]);

    const chartTitle = chartBuckets.granularity === 'day' ? 'FLUJO DIARIO' : 'FLUJO MENSUAL';

    // En escritorio hay espacio de sobra para separar barras y se puede
    // desplazar horizontalmente sin problema; en móvil eso obligaba a hacer
    // scroll para ver el mes completo y con datos dispersos parecía "vacío" —
    // ahí es mejor comprimir todo el rango a lo ancho de la pantalla.
    const barGap = isDesktop ? '3px' : '1px';
    const barWidth = isDesktop ? '4px' : '2px';
    const showLabelEvery = isDesktop ? 1 : Math.max(1, Math.ceil(chartBuckets.data.length / 8));

    const monthlyChartBlock = mode === 'day' ? null : (
        <div className="glass-card" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowX: isDesktop ? 'auto' : 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} color="var(--domain-purple)" />
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: '#666' }}>{chartTitle}</h3>
            </div>
            <div style={{
                flex: 1, display: 'flex', alignItems: 'flex-end', gap: barGap, height: '200px', paddingBottom: '1rem',
                ...(isDesktop ? { minWidth: `${Math.max(chartBuckets.data.length * 20, 400)}px` } : { width: '100%' }),
            }}>
                {chartBuckets.data.map((d, i) => {
                    const maxVal = Math.max(...chartBuckets.data.map(v => Math.max(v.inc, v.exp)), 100);
                    const incPct = d.inc > 0 ? Math.max((d.inc / maxVal) * 100, 3) : 0;
                    const expPct = d.exp > 0 ? Math.max((d.exp / maxVal) * 100, 3) : 0;
                    return (
                        <div key={i} style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                            <div style={{ display: 'flex', gap: '1px', alignItems: 'flex-end', height: '100%' }}>
                                <motion.div initial={{ height: 0 }} animate={{ height: `${incPct}%` }} style={{ width: barWidth, background: '#10b981', borderRadius: '2px 2px 0 0' }} />
                                <motion.div initial={{ height: 0 }} animate={{ height: `${expPct}%` }} style={{ width: barWidth, background: '#ef4444', borderRadius: '2px 2px 0 0' }} />
                            </div>
                            <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#AAA', textTransform: 'capitalize', visibility: i % showLabelEvery === 0 ? 'visible' : 'hidden' }}>{d.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const categoriesBlock = (
        <div className="glass-card" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PieChart size={18} color="var(--domain-orange)" />
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: '#666' }}>DISTRIBUCIÓN POR CATEGORÍA</h3>
                </div>
                <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '10px', gap: '2px' }}>
                    <button
                        onClick={() => setCategoryView('bars')}
                        title="Ver como lista"
                        style={{ padding: '5px 7px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', background: categoryView === 'bars' ? 'white' : 'transparent', color: categoryView === 'bars' ? 'var(--domain-orange)' : '#94A3B8', boxShadow: categoryView === 'bars' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}
                    >
                        <List size={13} />
                    </button>
                    <button
                        onClick={() => setCategoryView('pie')}
                        title="Ver como gráfico circular"
                        style={{ padding: '5px 7px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', background: categoryView === 'pie' ? 'white' : 'transparent', color: categoryView === 'pie' ? 'var(--domain-orange)' : '#94A3B8', boxShadow: categoryView === 'pie' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}
                    >
                        <PieChart size={13} />
                    </button>
                </div>
            </div>

            {categoryData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#BBB', fontWeight: 600 }}>No hay gastos registrados en este periodo.</span>
                </div>
            ) : categoryView === 'bars' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {categoryData.map((cat, i) => {
                        const percentage = (cat.amount / (periodStats.expense || 1)) * 100;
                        return (
                            <div key={cat.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-carbon)' }}>{cat.name}</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#666' }}>S/.{cat.amount.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                                </div>
                                <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        style={{ height: '100%', background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}>
                    <div style={{ width: '160px', height: '160px', borderRadius: '50%', background: donutGradient, position: 'relative', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', inset: '24px', background: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94A3B8' }}>GASTO TOTAL</span>
                            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-carbon)' }}>S/.{periodStats.expense.toLocaleString()}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        {categoryData.map((cat, i) => (
                            <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: CATEGORY_COLORS[i % CATEGORY_COLORS.length], flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-carbon)' }}>{cat.name}</span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#666' }}>{((cat.amount / (periodStats.expense || 1)) * 100).toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

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

            {/* Filtros: periodo + proyecto */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'white', padding: '10px 12px', borderRadius: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '999px', padding: '3px', gap: '2px', overflowX: 'auto', flex: 1, minWidth: 0 }}>
                        {([['day', 'Día'], ['week', 'Sem'], ['month', 'Mes'], ['year', 'Año'], ['all', 'Todo'], ['custom', 'Rango']] as [PeriodMode | 'custom', string][]).map(([m, label]) => {
                            const activo = mode === m;
                            return (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    style={{
                                        border: 'none', borderRadius: '999px', cursor: 'pointer', flexShrink: 0,
                                        padding: '6px 11px', fontSize: '0.7rem', fontWeight: 700,
                                        fontFamily: 'inherit', transition: 'all 0.15s',
                                        background: activo ? 'var(--domain-purple, #6366f1)' : 'transparent',
                                        color: activo ? '#fff' : '#64748B',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                            onClick={() => setAccountMenuOpen(v => !v)}
                            title={`Cuentas: ${accountFilterLabel}`}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '7px 10px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}
                        >
                            <Filter size={13} /> {isDesktop && <span>Cuentas: {accountFilterLabel}</span>}
                        </button>
                        <AnimatePresence>
                            {accountMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                    style={{ position: 'absolute', top: '38px', right: 0, background: 'white', borderRadius: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0', overflow: 'hidden', zIndex: 20, minWidth: '200px' }}
                                >
                                    <button
                                        onClick={() => setAccountFilter('all')}
                                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', background: 'none', border: 'none', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#191c1d', textAlign: 'left', fontFamily: 'inherit' }}
                                    >
                                        <span style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>{accountFilter === 'all' && <Check size={13} />}</span>
                                        Todas
                                    </button>
                                    <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                        <button
                                            onClick={() => toggleAccountKey(NONE_ACCOUNT_KEY)}
                                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#191c1d', textAlign: 'left', fontFamily: 'inherit' }}
                                        >
                                            <span style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>{(accountFilter === 'all' || accountFilter.has(NONE_ACCOUNT_KEY)) && <Check size={13} />}</span>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94A3B8', flexShrink: 0 }} />
                                            Sin cuenta
                                        </button>
                                        {accounts.map(a => (
                                            <button
                                                key={a.id}
                                                onClick={() => toggleAccountKey(a.id)}
                                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#191c1d', textAlign: 'left', fontFamily: 'inherit' }}
                                            >
                                                <span style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>{(accountFilter === 'all' || accountFilter.has(a.id)) && <Check size={13} />}</span>
                                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                                                {a.name}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {mode === 'custom' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.78rem', fontFamily: 'inherit' }} />
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700 }}>→</span>
                        <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.78rem', fontFamily: 'inherit' }} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                        <button onClick={() => setRefDate(shiftPeriod(mode, refDate, -1))} disabled={!canNavigate} style={{ background: 'transparent', border: 'none', cursor: canNavigate ? 'pointer' : 'default', opacity: canNavigate ? 1 : 0.25, color: '#64748B' }}><ChevronLeft size={22} /></button>
                        <div style={{ textAlign: 'center' }}>
                            <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-carbon)', textTransform: 'capitalize' }}>{periodLabelStr}</span>
                        </div>
                        <button onClick={() => setRefDate(shiftPeriod(mode, refDate, 1))} disabled={!canNavigate} style={{ background: 'transparent', border: 'none', cursor: canNavigate ? 'pointer' : 'default', opacity: canNavigate ? 1 : 0.25, color: '#64748B' }}><ChevronRight size={22} /></button>
                    </div>
                )}
            </div>

            {/* Salud financiera + Ingresos/Gastos: en escritorio comparten una sola fila para ahorrar espacio vertical */}
            {(() => {
                const saludBlock = (
                    <GlassCard style={{ padding: '0.8rem 1.1rem', background: health.bg, border: 'none', flex: isDesktop ? 2 : undefined }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap', height: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
                                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: health.color, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: health.color, whiteSpace: 'nowrap' }}>{health.label}</span>
                            </div>
                            {isDesktop && <div style={{ width: '1px', height: '22px', background: 'rgba(0,0,0,0.08)', flexShrink: 0 }} />}
                            <div style={{ display: 'flex', gap: '1.3rem', flexWrap: 'wrap' }}>
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.56rem', fontWeight: 800, color: '#94A3B8' }}>AHORRO</span>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{savingsRate.toFixed(0)}%</div>
                                </div>
                                {topCategory && (
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.56rem', fontWeight: 800, color: '#94A3B8' }}>MAYOR GASTO</span>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{topCategory.name}</div>
                                    </div>
                                )}
                                {(owe > 0 || owed > 0) && (
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.56rem', fontWeight: 800, color: '#94A3B8' }}>DEUDA NETA</span>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: netDebt > 0 ? '#ef4444' : '#10b981' }}>
                                            {netDebt >= 0 ? '-' : '+'}S/.{Math.abs(netDebt).toLocaleString()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </GlassCard>
                );

                const ingresosBlock = (
                    <GlassCard style={{ padding: '0.8rem 1.1rem', background: '#dcfce7', border: 'none', flex: isDesktop ? 1 : undefined }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <TrendingUp size={14} color="#10b981" />
                                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#10b981', opacity: 0.8 }}>INGRESOS</span>
                            </div>
                            {prevStats && prevStats.income > 0 && (
                                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: periodStats.income >= prevStats.income ? '#10b981' : '#ef4444' }}>
                                    {periodStats.income >= prevStats.income ? '↑' : '↓'} {Math.abs(((periodStats.income - prevStats.income) / prevStats.income) * 100).toFixed(0)}%
                                </span>
                            )}
                        </div>
                        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-carbon)' }}>S/.{periodStats.income.toLocaleString()}</span>
                    </GlassCard>
                );

                const gastosBlock = (
                    <GlassCard style={{ padding: '0.8rem 1.1rem', background: '#fee2e2', border: 'none', flex: isDesktop ? 1 : undefined }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <TrendingDown size={14} color="#ef4444" />
                                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#ef4444', opacity: 0.8 }}>GASTOS</span>
                            </div>
                            {prevStats && prevStats.expense > 0 && (
                                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: periodStats.expense <= prevStats.expense ? '#10b981' : '#ef4444' }}>
                                    {periodStats.expense <= prevStats.expense ? '↓' : '↑'} {Math.abs(((periodStats.expense - prevStats.expense) / prevStats.expense) * 100).toFixed(0)}%
                                </span>
                            )}
                        </div>
                        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-carbon)' }}>S/.{periodStats.expense.toLocaleString()}</span>
                    </GlassCard>
                );

                return isDesktop ? (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
                        {saludBlock}
                        {ingresosBlock}
                        {gastosBlock}
                    </div>
                ) : (
                    <>
                        {saludBlock}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {ingresosBlock}
                            {gastosBlock}
                        </div>
                    </>
                );
            })()}

            {/* Mode Toggle — solo en móvil y solo si hay gráfico de flujo para alternar */}
            {!isDesktop && monthlyChartBlock && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#E2E8F0', padding: '4px', borderRadius: '16px', gap: '4px' }}>
                    <button
                        onClick={() => setMobileTab('chart')}
                        style={{
                            padding: '10px', borderRadius: '12px', border: 'none',
                            background: mobileTab === 'chart' ? 'white' : 'transparent',
                            color: mobileTab === 'chart' ? 'var(--domain-purple)' : '#64748B',
                            fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        <BarChart3 size={16} /> FLUJO
                    </button>
                    <button
                        onClick={() => setMobileTab('categories')}
                        style={{
                            padding: '10px', borderRadius: '12px', border: 'none',
                            background: mobileTab === 'categories' ? 'white' : 'transparent',
                            color: mobileTab === 'categories' ? 'var(--domain-orange)' : '#64748B',
                            fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        <PieChart size={16} /> CATEGORÍAS
                    </button>
                </div>
            )}

            {/* Main Content: en escritorio ambas vistas lado a lado; en móvil, la seleccionada en el toggle */}
            {isDesktop ? (
                <div style={{ display: 'grid', gridTemplateColumns: monthlyChartBlock ? '1fr 1fr' : '1fr', gap: '1.5rem', flex: 1 }}>
                    {monthlyChartBlock}
                    {categoriesBlock}
                </div>
            ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {(!monthlyChartBlock || mobileTab === 'categories') ? categoriesBlock : monthlyChartBlock}
                </div>
            )}

            {/* Performance Card */}
            <GlassCard style={{ padding: '1.2rem', background: periodStats.net >= 0 ? 'var(--domain-green)' : '#ef4444', color: 'white', border: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, opacity: 0.8 }}>BALANCE NETO</span>
                        <h4 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>S/.{periodStats.net.toLocaleString()}</h4>
                    </div>
                    {periodStats.net >= 0 ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
                </div>
            </GlassCard>
        </motion.div>
    );
};
