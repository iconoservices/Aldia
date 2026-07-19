import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Transaction, FixedExpense, ShoppingItem, Project, Account } from '../../hooks/useAlDiaState';

/* ─── Design tokens (alineados con ChecklistDiario) ─────────────── */
const C = {
    primary:            '#944a18',
    primaryContainer:   '#ff9f66',
    onPrimaryContainer: '#773401',
    surface:            '#f8f9fa',
    surfaceContainer:   '#edeeef',
    surfaceContainerLow:'#f3f4f5',
    surfaceContainerHigh:'#e7e8e9',
    surfaceLowest:      '#ffffff',
    onSurface:          '#191c1d',
    onSurfaceVariant:   '#54433a',
    outline:            '#877369',
    outlineVariant:     '#dac2b6',
    verde:              '#10B981',
    rojo:               '#EF4444',
    ambar:              '#E6A817',
};

const bento: React.CSSProperties = {
    background: C.surfaceLowest,
    borderRadius: '1rem',
    border: `1px solid ${C.outlineVariant}`,
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
};

const MONEDA = 'S/';
const money = (n: number) =>
    `${MONEDA} ${Math.abs(n).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

interface FixedIncome {
    id: number;
    name: string;
    amount: number;
    active: boolean;
}

interface PlanDashboardProps {
    transactions:   Transaction[];
    fixedExpenses:  FixedExpense[];
    preferences:    { isBudgetFixed: boolean; fixedIncomes: string };
    projects:       Project[];
    accounts:       Account[];
    shoppingList:   ShoppingItem[];
    addShoppingItem:            (text: string, amount: number, priority: 'necesito' | 'quiero', projectId?: number, note?: string) => void;
    removeShoppingItem:         (id: number) => void;
    markShoppingItemPurchased:  (id: number, finalAmount?: number, accountId?: number) => void;
    unmarkShoppingItemPurchased:(id: number) => void;
    updateFixedExpense:         (id: number, updates: Partial<FixedExpense>) => void;
    markFixedExpensePaid:       (id: number, monthStr: string, accountId?: number) => void;
    unmarkFixedExpensePaid:     (id: number, monthStr: string) => void;
    addTransaction:             (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projId?: number, accId?: number, isCashless?: boolean, cat?: string, contact?: string) => void;
}

export const PlanDashboard = ({
    transactions, fixedExpenses, preferences, projects, accounts, shoppingList,
    addShoppingItem, removeShoppingItem, markShoppingItemPurchased, unmarkShoppingItemPurchased,
    updateFixedExpense, markFixedExpensePaid, unmarkFixedExpensePaid, addTransaction,
}: PlanDashboardProps) => {

    const hoy = new Date();
    const mesActual = hoy.toLocaleDateString('en-CA').slice(0, 7);       // YYYY-MM
    const diasDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    const diaHoy = hoy.getDate();
    const diasRestantes = diasDelMes - diaHoy + 1;
    const nombreMes = hoy.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    /* ── Ingresos fijos (viven como JSON dentro de preferences) ── */
    const ingresosFijos: FixedIncome[] = useMemo(() => {
        try { return JSON.parse(preferences?.fixedIncomes || '[]'); }
        catch { return []; }
    }, [preferences?.fixedIncomes]);

    /* ── Los números del mes ───────────────────────────────────────
       Se calculan por separado y se muestran etiquetados: la idea es que
       siempre se pueda ver de dónde sale el resultado, no un total mágico. */
    const n = useMemo(() => {
        const activos      = fixedExpenses.filter(f => f.active);
        const fijosTotal   = activos.reduce((s, f) => s + (Number(f.amount) || 0), 0);
        const fijosPagados = activos.filter(f => f.lastPaidMonth === mesActual);
        const fijosPend    = activos.filter(f => f.lastPaidMonth !== mesActual);
        const montoPagado  = fijosPagados.reduce((s, f) => s + (Number(f.amount) || 0), 0);
        const montoPend    = fijosPend.reduce((s, f) => s + (Number(f.amount) || 0), 0);

        const ingresoPrevisto = ingresosFijos
            .filter(i => i.active)
            .reduce((s, i) => s + (Number(i.amount) || 0), 0);

        const txMes = transactions.filter(t => (t.fullDate || '').startsWith(mesActual));
        const ingresoReal = txMes
            .filter(t => t.type === 'ingreso')
            .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
        // Los gastos variables excluyen los pagos de fijos, que ya están contados
        // en fijosTotal. Al marcar un fijo como pagado se genera sola una
        // transacción "Pago: <nombre>", así que sin este filtro se restaría dos veces.
        const gastoVariable = txMes
            .filter(t => t.type === 'gasto' && !t.text?.startsWith('Pago: '))
            .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

        const pendientesCompra = shoppingList.filter(i => !i.purchasedAt);
        const comprometido = pendientesCompra.reduce((s, i) => s + (Number(i.estimatedAmount) || 0), 0);
        const necesito = pendientesCompra
            .filter(i => i.priority === 'necesito')
            .reduce((s, i) => s + (Number(i.estimatedAmount) || 0), 0);

        const queda = ingresoPrevisto - fijosTotal - gastoVariable;

        return {
            fijosTotal, montoPagado, montoPend, fijosPend, fijosPagados,
            ingresoPrevisto, ingresoReal, gastoVariable,
            comprometido, necesito, pendientesCompra,
            queda,
            quedaTrasCompras: queda - necesito,
            porDia: diasRestantes > 0 ? queda / diasRestantes : 0,
        };
    }, [fixedExpenses, ingresosFijos, transactions, shoppingList, mesActual, diasRestantes]);

    /* ── Formularios ── */
    const [nuevaCompra, setNuevaCompra] = useState({ text: '', amount: '', priority: 'necesito' as 'necesito' | 'quiero' });
    const [lote, setLote] = useState({ projectId: '', amount: '', concepto: '', accountId: '' });
    const [loteOk, setLoteOk] = useState(false);
    const [editandoDia, setEditandoDia] = useState<number | null>(null);

    const submitCompra = (e: React.FormEvent) => {
        e.preventDefault();
        const monto = parseFloat(nuevaCompra.amount);
        if (!nuevaCompra.text.trim()) return;
        addShoppingItem(nuevaCompra.text.trim(), isNaN(monto) ? 0 : monto, nuevaCompra.priority);
        setNuevaCompra({ text: '', amount: '', priority: 'necesito' });
    };

    const submitLote = (e: React.FormEvent) => {
        e.preventDefault();
        const monto = parseFloat(lote.amount);
        if (!monto || monto <= 0) return;
        const proyecto = projects.find(p => String(p.id) === lote.projectId);
        const concepto = lote.concepto.trim() || `Ingresos ${proyecto?.name || ''} · ${nombreMes}`;
        addTransaction(
            concepto, monto, 'ingreso', false,
            proyecto?.id,
            lote.accountId ? Number(lote.accountId) : undefined,
            false, 'Venta', undefined
        );
        setLote({ projectId: '', amount: '', concepto: '', accountId: '' });
        setLoteOk(true);
        setTimeout(() => setLoteOk(false), 2500);
    };

    const pendientesOrdenados = useMemo(() => {
        const conDia    = n.fijosPend.filter(f => f.dueDay).sort((a, b) => (a.dueDay || 0) - (b.dueDay || 0));
        const sinDia    = n.fijosPend.filter(f => !f.dueDay);
        return { conDia, sinDia };
    }, [n.fijosPend]);

    const compras = useMemo(() => ({
        pendientes: shoppingList.filter(i => !i.purchasedAt),
        compradas:  shoppingList.filter(i => i.purchasedAt).slice(0, 5),
    }), [shoppingList]);

    return (
        <div style={{ padding: '1.5rem 2rem 4rem', minHeight: '100%' }}>

            {/* ── Header ── */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: C.onSurface, letterSpacing: '-0.01em' }}>
                    Plan
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: C.onSurfaceVariant, textTransform: 'capitalize' }}>
                    {nombreMes} · quedan {diasRestantes} {diasRestantes === 1 ? 'día' : 'días'}
                </p>
            </div>

            {/* ── 1. Cuánto me queda ── */}
            <section style={{
                ...bento, border: 'none',
                background: n.queda < 0 ? 'rgba(239,68,68,0.07)' : 'rgba(148,74,24,0.06)',
                padding: '1.5rem', marginBottom: '1.25rem',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: n.queda < 0 ? C.rojo : C.primary }}>
                            Te queda este mes
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                            <span style={{ fontSize: '3.2rem', fontWeight: 800, lineHeight: 1, color: n.queda < 0 ? C.rojo : C.primary }}>
                                {n.queda < 0 ? '−' : ''}{money(n.queda)}
                            </span>
                        </div>
                        <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: C.onSurfaceVariant }}>
                            {n.queda < 0
                                ? 'Tus gastos fijos superan tus ingresos previstos.'
                                : `Unos ${money(n.porDia)} por día durante ${diasRestantes} días.`}
                        </p>
                    </div>

                    {/* El desglose: de dónde sale ese número */}
                    <div style={{
                        background: C.surfaceLowest, borderRadius: '12px', padding: '14px 18px',
                        minWidth: '260px', border: `1px solid ${C.outlineVariant}`,
                    }}>
                        <Linea label="Ingresos previstos" valor={n.ingresoPrevisto} signo="+" />
                        <Linea label="Gastos fijos" valor={n.fijosTotal} signo="−" />
                        <Linea label="Gastos variables" valor={n.gastoVariable} signo="−" />
                        <div style={{ height: '1px', background: C.outlineVariant, margin: '8px 0' }} />
                        <Linea label="Queda" valor={n.queda} signo={n.queda < 0 ? '−' : ''} destacado />
                    </div>
                </div>

                {/* Avisos accionables */}
                {n.necesito > 0 && (
                    <div style={{
                        marginTop: '14px', padding: '10px 14px', borderRadius: '10px',
                        background: n.quedaTrasCompras < 0 ? 'rgba(239,68,68,0.1)' : 'rgba(230,168,23,0.12)',
                        fontSize: '0.82rem', color: C.onSurfaceVariant, fontWeight: 500,
                    }}>
                        Tienes <strong>{money(n.necesito)}</strong> en cosas marcadas como «necesito».
                        {n.quedaTrasCompras < 0
                            ? ` Si las compras todas te pasarías por ${money(n.quedaTrasCompras)}.`
                            : ` Después de comprarlas te quedarían ${money(n.quedaTrasCompras)}.`}
                    </div>
                )}
                {n.ingresoReal > 0 && (
                    <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: C.outline }}>
                        Llevas {money(n.ingresoReal)} de ingresos registrados este mes
                        {n.ingresoPrevisto > 0 && ` (previsto: ${money(n.ingresoPrevisto)})`}.
                    </p>
                )}
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>

                {/* ── 2. Calendario de pagos ── */}
                <section style={{ ...bento, padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.onSurface }}>Pagos del mes</h3>
                        <span style={{
                            background: n.montoPend > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.12)',
                            color: n.montoPend > 0 ? C.rojo : C.verde,
                            padding: '3px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                        }}>
                            {n.montoPend > 0 ? `${money(n.montoPend)} pendiente` : 'Todo pagado'}
                        </span>
                    </div>
                    <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: C.outline }}>
                        {n.fijosPagados.length} de {n.fijosPagados.length + n.fijosPend.length} pagados · {money(n.montoPagado)} de {money(n.fijosTotal)}
                    </p>

                    {n.fijosPend.length === 0 && n.fijosPagados.length === 0 && (
                        <Vacio icono="event_available" titulo="Sin gastos fijos activos" texto="Actívalos en la pestaña Finanzas." />
                    )}

                    {[...pendientesOrdenados.conDia, ...pendientesOrdenados.sinDia].map(f => (
                        <FilaPago
                            key={f.id}
                            gasto={f}
                            diaHoy={diaHoy}
                            pagado={false}
                            editando={editandoDia === f.id}
                            onEditarDia={() => setEditandoDia(editandoDia === f.id ? null : f.id)}
                            onGuardarDia={(dia) => { updateFixedExpense(f.id, { dueDay: dia }); setEditandoDia(null); }}
                            onTogglePago={() => markFixedExpensePaid(f.id, mesActual)}
                        />
                    ))}

                    {n.fijosPagados.map(f => (
                        <FilaPago
                            key={f.id}
                            gasto={f}
                            diaHoy={diaHoy}
                            pagado
                            editando={false}
                            onEditarDia={() => {}}
                            onGuardarDia={() => {}}
                            onTogglePago={() => unmarkFixedExpensePaid(f.id, mesActual)}
                        />
                    ))}
                </section>

                {/* ── 3. Lista de compras ── */}
                <section style={{ ...bento, padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.onSurface }}>Por comprar</h3>
                        {n.comprometido > 0 && (
                            <span style={{
                                background: C.surfaceContainerHigh, color: C.onSurfaceVariant,
                                padding: '3px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                            }}>
                                {money(n.comprometido)} en total
                            </span>
                        )}
                    </div>
                    <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: C.outline }}>
                        Al marcarlo como comprado se registra el gasto solo.
                    </p>

                    <form onSubmit={submitCompra} style={{
                        display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap',
                        padding: '10px', background: C.surfaceContainerLow,
                        border: `1.5px dashed ${C.outlineVariant}`, borderRadius: '12px',
                    }}>
                        <input
                            value={nuevaCompra.text}
                            onChange={e => setNuevaCompra(v => ({ ...v, text: e.target.value }))}
                            placeholder="¿Qué necesitas?"
                            style={{
                                flex: '1 1 140px', minWidth: 0, background: 'transparent', border: 'none',
                                outline: 'none', fontSize: '0.85rem', color: C.onSurface, fontFamily: 'inherit',
                            }}
                        />
                        <input
                            value={nuevaCompra.amount}
                            onChange={e => setNuevaCompra(v => ({ ...v, amount: e.target.value }))}
                            placeholder="S/"
                            type="number" min="0" step="0.01"
                            style={{
                                width: '80px', background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`,
                                borderRadius: '8px', padding: '4px 8px', outline: 'none',
                                fontSize: '0.8rem', color: C.onSurface, fontFamily: 'inherit',
                            }}
                        />
                        <select
                            value={nuevaCompra.priority}
                            onChange={e => setNuevaCompra(v => ({ ...v, priority: e.target.value as 'necesito' | 'quiero' }))}
                            style={{
                                background: C.surfaceContainerHigh, border: 'none', borderRadius: '8px',
                                padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700,
                                color: C.onSurfaceVariant, cursor: 'pointer', fontFamily: 'inherit',
                            }}
                        >
                            <option value="necesito">Necesito</option>
                            <option value="quiero">Quiero</option>
                        </select>
                        <button type="submit" disabled={!nuevaCompra.text.trim()} style={{
                            background: nuevaCompra.text.trim() ? C.primary : C.surfaceContainerHigh,
                            color: nuevaCompra.text.trim() ? '#fff' : C.onSurfaceVariant,
                            border: 'none', borderRadius: '8px', padding: '5px 14px',
                            fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit',
                            cursor: nuevaCompra.text.trim() ? 'pointer' : 'default',
                        }}>Añadir</button>
                    </form>

                    <AnimatePresence initial={false}>
                        {compras.pendientes.length === 0 ? (
                            <Vacio icono="shopping_bag" titulo="Nada apuntado" texto="Lo que necesites comprar, ponlo aquí." />
                        ) : compras.pendientes.map(item => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '10px 12px', marginBottom: '6px',
                                    background: C.surfaceContainerLow, borderRadius: '10px',
                                }}
                            >
                                <button
                                    onClick={() => markShoppingItemPurchased(item.id)}
                                    title="Marcar como comprado (registra el gasto)"
                                    style={{
                                        width: '20px', height: '20px', minWidth: '20px', borderRadius: '6px',
                                        border: `2px solid ${C.outlineVariant}`, background: 'transparent',
                                        cursor: 'pointer', padding: 0, flexShrink: 0,
                                    }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.87rem', fontWeight: 600, color: C.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item.text}
                                    </div>
                                    <span style={{
                                        fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em',
                                        color: item.priority === 'necesito' ? C.rojo : C.outline,
                                    }}>
                                        {item.priority === 'necesito' ? 'NECESITO' : 'QUIERO'}
                                    </span>
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: C.onSurface, flexShrink: 0 }}>
                                    {money(item.estimatedAmount)}
                                </span>
                                <button
                                    onClick={() => removeShoppingItem(item.id)}
                                    title="Quitar"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, padding: '2px', display: 'flex' }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {compras.compradas.length > 0 && (
                        <details style={{ marginTop: '10px' }}>
                            <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: C.outline, fontWeight: 600 }}>
                                Comprado hace poco ({compras.compradas.length})
                            </summary>
                            <div style={{ marginTop: '8px' }}>
                                {compras.compradas.map(item => (
                                    <div key={item.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '7px 12px', marginBottom: '4px', opacity: 0.65,
                                        fontSize: '0.8rem', color: C.onSurfaceVariant,
                                    }}>
                                        <span style={{ flex: 1, textDecoration: 'line-through' }}>{item.text}</span>
                                        <span style={{ fontWeight: 600 }}>{money(item.estimatedAmount)}</span>
                                        <button
                                            onClick={() => unmarkShoppingItemPurchased(item.id)}
                                            title="Devolver a la lista (no borra el gasto ya registrado)"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>undo</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}
                </section>
            </div>

            {/* ── 4. Volcado en bloque ── */}
            <section style={{ ...bento, padding: '1.25rem', marginTop: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.onSurface }}>Registrar ingresos en bloque</h3>
                <p style={{ margin: '4px 0 14px', fontSize: '0.8rem', color: C.onSurfaceVariant, maxWidth: '620px' }}>
                    Para volcar de una vez lo de varios trabajos: en vez de anotar cada sesión,
                    apuntas el total del periodo y de dónde vino. El detalle lo sigues teniendo donde ya lo llevas.
                </p>

                <form onSubmit={submitLote} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                        value={lote.projectId}
                        onChange={e => setLote(v => ({ ...v, projectId: e.target.value }))}
                        style={{
                            background: C.surfaceContainerLow, border: `1px solid ${C.outlineVariant}`,
                            borderRadius: '10px', padding: '9px 12px', fontSize: '0.85rem',
                            color: C.onSurface, cursor: 'pointer', fontFamily: 'inherit', minWidth: '160px',
                        }}
                    >
                        <option value="">¿De dónde vino?</option>
                        {projects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                    </select>

                    <input
                        value={lote.concepto}
                        onChange={e => setLote(v => ({ ...v, concepto: e.target.value }))}
                        placeholder="Concepto (ej: 5 sesiones del 1 al 15)"
                        style={{
                            flex: '1 1 240px', minWidth: 0, background: C.surfaceContainerLow,
                            border: `1px solid ${C.outlineVariant}`, borderRadius: '10px',
                            padding: '9px 12px', outline: 'none', fontSize: '0.85rem',
                            color: C.onSurface, fontFamily: 'inherit',
                        }}
                    />

                    {accounts.length > 0 && (
                        <select
                            value={lote.accountId}
                            onChange={e => setLote(v => ({ ...v, accountId: e.target.value }))}
                            style={{
                                background: C.surfaceContainerLow, border: `1px solid ${C.outlineVariant}`,
                                borderRadius: '10px', padding: '9px 12px', fontSize: '0.85rem',
                                color: C.onSurface, cursor: 'pointer', fontFamily: 'inherit',
                            }}
                        >
                            <option value="">Cuenta…</option>
                            {accounts.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                        </select>
                    )}

                    <input
                        value={lote.amount}
                        onChange={e => setLote(v => ({ ...v, amount: e.target.value }))}
                        placeholder="Total S/"
                        type="number" min="0" step="0.01"
                        style={{
                            width: '120px', background: C.surfaceContainerLow,
                            border: `1px solid ${C.outlineVariant}`, borderRadius: '10px',
                            padding: '9px 12px', outline: 'none', fontSize: '0.85rem',
                            fontWeight: 700, color: C.onSurface, fontFamily: 'inherit',
                        }}
                    />

                    <button type="submit" disabled={!parseFloat(lote.amount)} style={{
                        background: parseFloat(lote.amount) ? C.verde : C.surfaceContainerHigh,
                        color: parseFloat(lote.amount) ? '#fff' : C.onSurfaceVariant,
                        border: 'none', borderRadius: '10px', padding: '9px 20px',
                        fontSize: '0.85rem', fontWeight: 700, fontFamily: 'inherit',
                        cursor: parseFloat(lote.amount) ? 'pointer' : 'default',
                    }}>
                        Registrar
                    </button>

                    <AnimatePresence>
                        {loteOk && (
                            <motion.span
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                style={{ fontSize: '0.8rem', color: C.verde, fontWeight: 700 }}
                            >
                                ✓ Registrado
                            </motion.span>
                        )}
                    </AnimatePresence>
                </form>
            </section>
        </div>
    );
};

/* ══ Sub-componentes ══════════════════════════════════════════════ */

const Linea = ({ label, valor, signo, destacado = false }: { label: string; valor: number; signo: string; destacado?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '20px', padding: '3px 0' }}>
        <span style={{ fontSize: destacado ? '0.8rem' : '0.78rem', color: destacado ? C.onSurface : C.onSurfaceVariant, fontWeight: destacado ? 700 : 500 }}>
            {label}
        </span>
        <span style={{
            fontSize: destacado ? '0.95rem' : '0.85rem',
            fontWeight: destacado ? 800 : 600,
            color: destacado ? (valor < 0 ? C.rojo : C.onSurface) : C.onSurfaceVariant,
            fontVariantNumeric: 'tabular-nums',
        }}>
            {signo}{money(valor)}
        </span>
    </div>
);

const Vacio = ({ icono, titulo, texto }: { icono: string; titulo: string; texto: string }) => (
    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: C.onSurfaceVariant }}>
        <span className="material-symbols-outlined" style={{ fontSize: '36px', color: C.outlineVariant, display: 'block', marginBottom: '8px' }}>
            {icono}
        </span>
        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.88rem', color: C.onSurface }}>{titulo}</p>
        <p style={{ margin: 0, fontSize: '0.78rem' }}>{texto}</p>
    </div>
);

interface FilaPagoProps {
    gasto: FixedExpense;
    diaHoy: number;
    pagado: boolean;
    editando: boolean;
    onEditarDia: () => void;
    onGuardarDia: (dia: number) => void;
    onTogglePago: () => void;
}

const FilaPago = ({ gasto, diaHoy, pagado, editando, onEditarDia, onGuardarDia, onTogglePago }: FilaPagoProps) => {
    const [dia, setDia] = useState(String(gasto.dueDay || ''));
    const vencido = !pagado && !!gasto.dueDay && gasto.dueDay < diaHoy;
    const hoyToca = !pagado && gasto.dueDay === diaHoy;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', marginBottom: '6px', borderRadius: '10px',
            background: pagado ? 'transparent' : vencido ? 'rgba(239,68,68,0.06)' : C.surfaceContainerLow,
            opacity: pagado ? 0.6 : 1,
        }}>
            {/* Día del mes */}
            {editando ? (
                <input
                    autoFocus
                    value={dia}
                    onChange={e => setDia(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            const d = parseInt(dia, 10);
                            if (d >= 1 && d <= 31) onGuardarDia(d);
                        }
                        if (e.key === 'Escape') onEditarDia();
                    }}
                    onBlur={() => {
                        const d = parseInt(dia, 10);
                        if (d >= 1 && d <= 31) onGuardarDia(d); else onEditarDia();
                    }}
                    type="number" min="1" max="31"
                    placeholder="Día"
                    style={{
                        width: '42px', height: '38px', textAlign: 'center',
                        border: `2px solid ${C.primary}`, borderRadius: '9px',
                        outline: 'none', fontSize: '0.85rem', fontWeight: 800,
                        color: C.onSurface, fontFamily: 'inherit', flexShrink: 0,
                    }}
                />
            ) : (
                <button
                    onClick={onEditarDia}
                    disabled={pagado}
                    title={gasto.dueDay ? 'Cambiar día de pago' : 'Poner día de pago'}
                    style={{
                        width: '42px', height: '38px', flexShrink: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '9px', cursor: pagado ? 'default' : 'pointer',
                        border: gasto.dueDay ? 'none' : `1.5px dashed ${C.outlineVariant}`,
                        background: gasto.dueDay ? (vencido ? 'rgba(239,68,68,0.14)' : hoyToca ? 'rgba(230,168,23,0.18)' : C.surfaceContainerHigh) : 'transparent',
                        color: vencido ? C.rojo : hoyToca ? C.ambar : C.onSurfaceVariant,
                        fontFamily: 'inherit',
                    }}
                >
                    {gasto.dueDay ? (
                        <span style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1 }}>{gasto.dueDay}</span>
                    ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>event</span>
                    )}
                </button>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: '0.87rem', fontWeight: 600, color: C.onSurface,
                    textDecoration: pagado ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {gasto.text?.trim()}
                </div>
                {!pagado && (vencido || hoyToca) && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: vencido ? C.rojo : C.ambar }}>
                        {vencido ? 'VENCIDO' : 'TOCA HOY'}
                    </span>
                )}
                {!pagado && !gasto.dueDay && (
                    <span style={{ fontSize: '0.68rem', color: C.outline }}>sin día · toca para poner</span>
                )}
            </div>

            <span style={{ fontSize: '0.87rem', fontWeight: 700, color: C.onSurface, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                {money(gasto.amount)}
            </span>

            <button
                onClick={onTogglePago}
                title={pagado ? 'Desmarcar' : 'Marcar como pagado'}
                style={{
                    background: pagado ? 'transparent' : C.verde,
                    color: pagado ? C.outline : '#fff',
                    border: pagado ? `1px solid ${C.outlineVariant}` : 'none',
                    borderRadius: '8px', padding: '5px 10px', cursor: 'pointer',
                    fontSize: '0.72rem', fontWeight: 700, fontFamily: 'inherit', flexShrink: 0,
                }}
            >
                {pagado ? 'Deshacer' : 'Pagué'}
            </button>
        </div>
    );
};
