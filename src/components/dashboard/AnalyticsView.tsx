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

// Modal de selección de cuentas: checklist con confirmación explícita
// (Cancelar / Guardar) en vez del popover que aplicaba cada click al instante.
const AccountSelectModal = ({ open, accounts, initialSelection, onSave, onCancel }: {
    open: boolean;
    accounts: AnalyticsAccount[];
    initialSelection: AccountFilter;
    onSave: (sel: AccountFilter) => void;
    onCancel: () => void;
}) => {
    const [draft, setDraft] = useState<AccountFilter>(initialSelection);
    const allKeys = useMemo(() => new Set<AccountKey>([...accounts.map(a => a.id), NONE_ACCOUNT_KEY]), [accounts]);

    // Resetea el borrador al abrir (patrón de "ajustar estado durante el render"
    // de React, en vez de un efecto, para no reflejar el guardado anterior al reabrir).
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) setDraft(initialSelection);
    }

    const isSelected = (key: AccountKey) => draft === 'all' || draft.has(key);
    const toggle = (key: AccountKey) => {
        setDraft(prev => {
            const current = prev === 'all' ? new Set(allKeys) : new Set(prev);
            if (current.has(key)) current.delete(key); else current.add(key);
            if (current.size === allKeys.size) return 'all';
            return current;
        });
    };
    const count = draft === 'all' ? allKeys.size : draft.size;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                    onClick={onCancel}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }}
                        onClick={e => e.stopPropagation()}
                        style={{ background: 'white', borderRadius: '20px', padding: '1.4rem', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
                    >
                        <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-carbon)' }}>¿Qué cuentas quieres ver?</h3>
                        <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#64748B', lineHeight: 1.4 }}>
                            El análisis solo mostrará los movimientos de las cuentas que marques.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', marginBottom: '1rem' }}>
                            <button
                                onClick={() => toggle(NONE_ACCOUNT_KEY)}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', border: `1px solid ${isSelected(NONE_ACCOUNT_KEY) ? '#191c1d' : '#E2E8F0'}`, background: 'white', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                            >
                                <span style={{ width: '18px', height: '18px', borderRadius: '5px', border: '2px solid #191c1d', background: isSelected(NONE_ACCOUNT_KEY) ? '#191c1d' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {isSelected(NONE_ACCOUNT_KEY) && <Check size={12} color="white" />}
                                </span>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#94A3B8', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-carbon)' }}>Sin cuenta</span>
                            </button>
                            {accounts.map(a => (
                                <button
                                    key={a.id}
                                    onClick={() => toggle(a.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', border: `1px solid ${isSelected(a.id) ? '#191c1d' : '#E2E8F0'}`, background: 'white', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                                >
                                    <span style={{ width: '18px', height: '18px', borderRadius: '5px', border: '2px solid #191c1d', background: isSelected(a.id) ? '#191c1d' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {isSelected(a.id) && <Check size={12} color="white" />}
                                    </span>
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-carbon)' }}>{a.name}</span>
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>{count} seleccionada{count === 1 ? '' : 's'}</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={onCancel} style={{ padding: '9px 16px', borderRadius: '10px', border: '1px solid #E2E8F0', background: 'white', color: '#475569', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                                    Cancelar
                                </button>
                                <button onClick={() => onSave(draft)} style={{ padding: '9px 16px', borderRadius: '10px', border: 'none', background: '#191c1d', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                                    Guardar selección
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

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
    const [breakdownType, setBreakdownType] = useState<'gasto' | 'ingreso'>('gasto');
    const [breakdownGroupBy, setBreakdownGroupBy] = useState<'category' | 'account'>('category');
    const [expandedBreakdownKey, setExpandedBreakdownKey] = useState<string | null>(null);

    // ── Filtro por cuenta: todas, o una selección (incluye "Sin cuenta") ──
    const [accountFilter, setAccountFilter] = useState<AccountFilter>('all');
    const [accountModalOpen, setAccountModalOpen] = useState(false);

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

    // Mayor categoría de gasto del periodo — fija, independiente del selector de la
    // tarjeta de distribución, porque alimenta la tarjeta de Salud Financiera.
    const topExpenseCategory = useMemo(() => {
        const cats: Record<string, number> = {};
        periodTxs.filter(t => t.type === 'gasto' && !t.isDebt).forEach(t => {
            const c = t.category || 'Otros';
            cats[c] = (cats[c] || 0) + Math.abs(t.amount);
        });
        const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
        return sorted[0] ? { name: sorted[0][0], amount: sorted[0][1] } : undefined;
    }, [periodTxs]);

    // Desglose interactivo (tarjeta "Distribución"): por categoría o por cuenta,
    // de gastos o de ingresos, según lo que el usuario elija ahí mismo.
    const breakdownData = useMemo(() => {
        const groups: Record<string, number> = {};
        periodTxs.filter(t => t.type === breakdownType && !t.isDebt).forEach(t => {
            const key = breakdownGroupBy === 'category'
                ? (t.category || 'Otros')
                : (accounts.find(a => a.id === t.accountId)?.name || 'Sin cuenta');
            groups[key] = (groups[key] || 0) + Math.abs(t.amount);
        });
        return Object.entries(groups)
            .sort((a, b) => b[1] - a[1])
            .map(([name, amount]) => ({ name, amount }));
    }, [periodTxs, breakdownType, breakdownGroupBy, accounts]);

    const breakdownTotal = breakdownType === 'gasto' ? periodStats.expense : periodStats.income;

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

    const health = useMemo(() => {
        if (periodStats.income <= 0) return { label: 'Sin datos', color: '#64748B', bg: '#F1F5F9' };
        if (savingsRate < 0) return { label: 'En rojo', color: '#ef4444', bg: '#fee2e2' };
        if (savingsRate < 10) return { label: 'Ajustado', color: '#f59e0b', bg: '#fef3c7' };
        if (savingsRate < 20) return { label: 'Aceptable', color: '#f59e0b', bg: '#fef3c7' };
        return { label: 'Saludable', color: '#10b981', bg: '#dcfce7' };
    }, [savingsRate, periodStats.income]);

    const donutGradient = useMemo(() => {
        if (breakdownData.length === 0 || breakdownTotal <= 0) return 'conic-gradient(#F1F5F9 0% 100%)';
        let acc = 0;
        const stops = breakdownData.map((cat, i) => {
            const pct = (cat.amount / breakdownTotal) * 100;
            const start = acc; acc += pct;
            return `${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} ${start}% ${acc}%`;
        });
        return `conic-gradient(${stops.join(', ')})`;
    }, [breakdownData, breakdownTotal]);

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

    const breakdownAccent = breakdownType === 'gasto' ? '#f59e0b' : '#10b981';

    // Al tocar una fila del desglose, muestra la otra dimensión: si agrupas por
    // categoría, cuánto salió de cada cuenta; si agrupas por cuenta, qué categorías la componen.
    const getSubBreakdown = (key: string) => {
        const groups: Record<string, number> = {};
        periodTxs.filter(t => t.type === breakdownType && !t.isDebt).forEach(t => {
            const primaryKey = breakdownGroupBy === 'category' ? (t.category || 'Otros') : (accounts.find(a => a.id === t.accountId)?.name || 'Sin cuenta');
            if (primaryKey !== key) return;
            const secondaryKey = breakdownGroupBy === 'category' ? (accounts.find(a => a.id === t.accountId)?.name || 'Sin cuenta') : (t.category || 'Otros');
            groups[secondaryKey] = (groups[secondaryKey] || 0) + Math.abs(t.amount);
        });
        return Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([name, amount]) => ({ name, amount }));
    };

    const categoriesBlock = (
        <div className="glass-card" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PieChart size={18} color={breakdownAccent} />
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: '#666' }}>
                        DISTRIBUCIÓN {breakdownGroupBy === 'category' ? 'POR CATEGORÍA' : 'POR CUENTA'}
                    </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {accounts.length > 0 && (
                        <button
                            onClick={() => setAccountModalOpen(true)}
                            title={`Cuentas: ${accountFilterLabel}`}
                            style={{ padding: '5px 7px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', background: '#F1F5F9', color: '#64748B' }}
                        >
                            <Filter size={13} />
                        </button>
                    )}
                    <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '10px', gap: '2px' }}>
                        <button
                            onClick={() => setCategoryView('bars')}
                            title="Ver como lista"
                            style={{ padding: '5px 7px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', background: categoryView === 'bars' ? 'white' : 'transparent', color: categoryView === 'bars' ? breakdownAccent : '#94A3B8', boxShadow: categoryView === 'bars' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}
                        >
                            <List size={13} />
                        </button>
                        <button
                            onClick={() => setCategoryView('pie')}
                            title="Ver como gráfico circular"
                            style={{ padding: '5px 7px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', background: categoryView === 'pie' ? 'white' : 'transparent', color: categoryView === 'pie' ? breakdownAccent : '#94A3B8', boxShadow: categoryView === 'pie' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}
                        >
                            <PieChart size={13} />
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
                <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '999px', padding: '3px', gap: '2px', flexShrink: 0 }}>
                    {([['gasto', 'Gastos'], ['ingreso', 'Ingresos']] as ['gasto' | 'ingreso', string][]).map(([t, label]) => (
                        <button
                            key={t}
                            onClick={() => setBreakdownType(t)}
                            style={{ border: 'none', borderRadius: '999px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', padding: '5px 9px', fontSize: '0.66rem', fontWeight: 700, fontFamily: 'inherit', background: breakdownType === t ? 'white' : 'transparent', color: breakdownType === t ? (t === 'gasto' ? '#ef4444' : '#10b981') : '#94A3B8', boxShadow: breakdownType === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {accounts.length > 0 && (
                    <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '999px', padding: '3px', gap: '2px', flexShrink: 0 }}>
                        {([['category', 'Categoría'], ['account', 'Cuenta']] as ['category' | 'account', string][]).map(([g, label]) => (
                            <button
                                key={g}
                                onClick={() => setBreakdownGroupBy(g)}
                                style={{ border: 'none', borderRadius: '999px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', padding: '5px 9px', fontSize: '0.66rem', fontWeight: 700, fontFamily: 'inherit', background: breakdownGroupBy === g ? 'white' : 'transparent', color: breakdownGroupBy === g ? '#475569' : '#94A3B8', boxShadow: breakdownGroupBy === g ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {breakdownData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#BBB', fontWeight: 600 }}>No hay {breakdownType === 'gasto' ? 'gastos' : 'ingresos'} registrados en este periodo.</span>
                </div>
            ) : categoryView === 'bars' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {breakdownData.map((cat, i) => {
                        const percentage = (cat.amount / (breakdownTotal || 1)) * 100;
                        const isExpanded = expandedBreakdownKey === cat.name;
                        const canExpand = breakdownGroupBy === 'account' || accounts.length > 0;
                        return (
                            <div key={cat.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div
                                    onClick={() => canExpand && setExpandedBreakdownKey(isExpanded ? null : cat.name)}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: canExpand ? 'pointer' : 'default' }}
                                >
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
                                {isExpanded && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '8px 0 2px 12px', borderLeft: '2px solid #F1F5F9', marginLeft: '4px' }}>
                                        {getSubBreakdown(cat.name).map(sub => (
                                            <div key={sub.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B' }}>{sub.name}</span>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8' }}>S/.{sub.amount.toLocaleString()} ({((sub.amount / (cat.amount || 1)) * 100).toFixed(0)}%)</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}>
                    <div style={{ width: '160px', height: '160px', borderRadius: '50%', background: donutGradient, position: 'relative', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', inset: '24px', background: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94A3B8' }}>{breakdownType === 'gasto' ? 'GASTO' : 'INGRESO'} TOTAL</span>
                            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-carbon)' }}>S/.{breakdownTotal.toLocaleString()}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        {breakdownData.map((cat, i) => (
                            <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: CATEGORY_COLORS[i % CATEGORY_COLORS.length], flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-carbon)' }}>{cat.name}</span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#666' }}>S/.{cat.amount.toLocaleString()} ({((cat.amount / (breakdownTotal || 1)) * 100).toFixed(1)}%)</span>
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

                    <button
                        onClick={() => setAccountModalOpen(true)}
                        title={`Cuentas: ${accountFilterLabel}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#F1F5F9', border: 'none', borderRadius: '10px', padding: '7px 10px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                        <Filter size={13} /> {isDesktop && <span>Cuentas: {accountFilterLabel}</span>}
                    </button>
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

            {/* Balance neto: el número principal, arriba para que no quede perdido al final del scroll */}
            <GlassCard style={{ padding: '0.9rem 1.1rem', background: periodStats.net >= 0 ? 'var(--domain-green)' : '#ef4444', color: 'white', border: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 800, opacity: 0.8 }}>BALANCE NETO</span>
                        <h4 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>S/.{periodStats.net.toLocaleString()}</h4>
                    </div>
                    {periodStats.net >= 0 ? <TrendingUp size={26} /> : <TrendingDown size={26} />}
                </div>
            </GlassCard>

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
                                {topExpenseCategory && (
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.56rem', fontWeight: 800, color: '#94A3B8' }}>MAYOR GASTO</span>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{topExpenseCategory.name}</div>
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

            <AccountSelectModal
                open={accountModalOpen}
                accounts={accounts}
                initialSelection={accountFilter}
                onSave={sel => { setAccountFilter(sel); setAccountModalOpen(false); }}
                onCancel={() => setAccountModalOpen(false)}
            />
        </motion.div>
    );
};
