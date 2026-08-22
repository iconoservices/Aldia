import { useState, useMemo } from 'react';
import type { Transaction, FixedExpense, Account } from '../../hooks/useAlDiaState';
import {
    C, bento, money, useIsMobile,
    paddingPagina, campo, TOQUE_MINIMO,
} from '../../theme';

interface FixedIncome {
    id: number;
    name: string;
    amount: number;
    active: boolean;
    accountId?: number;
    lastReceivedMonth?: string;
}

interface PlanDashboardProps {
    transactions:   Transaction[];
    fixedExpenses:  FixedExpense[];
    preferences:    { isBudgetFixed: boolean; fixedIncomes: string };
    accounts:       Account[];
    addFixedExpense:            (text: string, amount: number, projectId?: number, dueDay?: number, accountId?: number, frequency?: 'monthly' | 'weekly', dueWeekday?: number) => void;
    updateFixedExpense:         (id: number, updates: Partial<FixedExpense>) => void;
    markFixedExpensePaid:       (id: number, monthStr: string, accountId?: number) => void;
    unmarkFixedExpensePaid:     (id: number, monthStr: string) => void;
    addTransaction:             (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projId?: number, accId?: number, isCashless?: boolean, cat?: string, contact?: string) => void;
    removeTransaction:          (id: number) => void;
    updatePreference:           (key: 'fixedIncomes', value: string) => void;
}

export const PlanDashboard = ({
    transactions, fixedExpenses, preferences, accounts,
    addFixedExpense, updateFixedExpense, markFixedExpensePaid, unmarkFixedExpensePaid, addTransaction,
    removeTransaction, updatePreference,
}: PlanDashboardProps) => {

    const movil = useIsMobile();

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

    const saveIngresosFijos = (items: FixedIncome[]) => updatePreference('fixedIncomes', JSON.stringify(items));

    const addFixedIncome = (name: string, amount: number, accountId?: number) =>
        saveIngresosFijos([...ingresosFijos, { id: Date.now(), name, amount, active: true, accountId }]);

    const editFixedIncome = (id: number, updates: Partial<FixedIncome>) =>
        saveIngresosFijos(ingresosFijos.map(f => f.id === id ? { ...f, ...updates } : f));

    const removeFixedIncome = (id: number) =>
        saveIngresosFijos(ingresosFijos.filter(f => f.id !== id));

    const markFixedIncomeReceived = (id: number, monthStr: string) => {
        const item = ingresosFijos.find(f => f.id === id);
        if (!item) return;
        saveIngresosFijos(ingresosFijos.map(f => f.id === id ? { ...f, lastReceivedMonth: monthStr } : f));
        if (item.lastReceivedMonth !== monthStr) {
            addTransaction(`Depósito: ${item.name}`, item.amount, 'ingreso', false, undefined, item.accountId, false, 'Sueldo');
        }
    };

    const unmarkFixedIncomeReceived = (id: number, monthStr: string) => {
        const item = ingresosFijos.find(f => f.id === id);
        if (!item) return;
        saveIngresosFijos(ingresosFijos.map(f => f.id === id ? { ...f, lastReceivedMonth: undefined } : f));
        const objetivo = `Depósito: ${item.name}`;
        transactions.filter(t => t.text === objetivo && (t.fullDate || '').startsWith(monthStr)).forEach(t => removeTransaction(t.id));
    };

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

        const ingresosActivos    = ingresosFijos.filter(i => i.active);
        const ingresoPrevisto    = ingresosActivos.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        const ingresosRecibidos  = ingresosActivos.filter(i => i.lastReceivedMonth === mesActual);
        const ingresosPend       = ingresosActivos.filter(i => i.lastReceivedMonth !== mesActual);
        const montoIngresoRecibido = ingresosRecibidos.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        const montoIngresoPend    = ingresosPend.reduce((s, i) => s + (Number(i.amount) || 0), 0);

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

        const queda = ingresoPrevisto - fijosTotal - gastoVariable;

        return {
            fijosTotal, montoPagado, montoPend, fijosPend, fijosPagados,
            ingresoPrevisto, ingresoReal, gastoVariable,
            ingresosRecibidos, ingresosPend, montoIngresoRecibido, montoIngresoPend,
            queda,
            porDia: diasRestantes > 0 ? queda / diasRestantes : 0,
        };
    }, [fixedExpenses, ingresosFijos, transactions, mesActual, diasRestantes]);

    /* ── Formularios ── */
    const [editandoDia, setEditandoDia] = useState<number | null>(null);
    const [editandoIngreso, setEditandoIngreso] = useState<number | null>(null);
    const [nuevoIngreso, setNuevoIngreso] = useState({ name: '', amount: '', accountId: '' });
    const [mostrarFormIngreso, setMostrarFormIngreso] = useState(false);
    const [nuevoGasto, setNuevoGasto] = useState({ name: '', amount: '', accountId: '' });
    const [mostrarFormGasto, setMostrarFormGasto] = useState(false);

    const submitNuevoIngreso = (e: React.FormEvent) => {
        e.preventDefault();
        const monto = parseFloat(nuevoIngreso.amount);
        if (!nuevoIngreso.name.trim() || !monto || monto <= 0) return;
        addFixedIncome(nuevoIngreso.name.trim(), monto, nuevoIngreso.accountId ? Number(nuevoIngreso.accountId) : undefined);
        setNuevoIngreso({ name: '', amount: '', accountId: '' });
        setMostrarFormIngreso(false);
    };

    const submitNuevoGasto = (e: React.FormEvent) => {
        e.preventDefault();
        const monto = parseFloat(nuevoGasto.amount);
        if (!nuevoGasto.name.trim() || !monto || monto <= 0) return;
        addFixedExpense(nuevoGasto.name.trim(), monto, undefined, undefined, nuevoGasto.accountId ? Number(nuevoGasto.accountId) : undefined);
        setNuevoGasto({ name: '', amount: '', accountId: '' });
        setMostrarFormGasto(false);
    };

    const pendientesOrdenados = useMemo(() => {
        const conDia    = n.fijosPend.filter(f => f.dueDay).sort((a, b) => (a.dueDay || 0) - (b.dueDay || 0));
        const sinDia    = n.fijosPend.filter(f => !f.dueDay);
        return { conDia, sinDia };
    }, [n.fijosPend]);

    return (
        <div style={paddingPagina(movil)}>

            {/* ── Header: misma cápsula compacta que Finanzas/Entregas ── */}
            <div style={{
                display: 'flex', alignItems: movil ? 'flex-start' : 'center', gap: '10px',
                flexWrap: movil ? 'wrap' : 'nowrap', flexDirection: movil ? 'column' : 'row',
                background: C.surfaceLowest, padding: '10px 14px', borderRadius: '18px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '1.25rem',
            }}>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: C.onSurface, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Ingresos y Gastos Fijos
                </h2>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: C.onSurfaceVariant, textTransform: 'capitalize' }}>
                    {nombreMes} · quedan {diasRestantes} {diasRestantes === 1 ? 'día' : 'días'}
                </span>
            </div>

            {/* ── 1. Cuánto me queda: todo en una sola fila ── */}
            <section style={{
                ...bento, border: 'none',
                background: n.queda < 0 ? 'rgba(239,68,68,0.07)' : 'rgba(148,74,24,0.06)',
                padding: '0.7rem 1.1rem', marginBottom: '1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: movil ? 'wrap' : 'nowrap', gap: movil ? '8px' : '1.5rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', minWidth: 0 }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: n.queda < 0 ? C.rojo : C.primary, whiteSpace: 'nowrap' }}>
                        Te queda
                    </span>
                    <span style={{
                        fontSize: movil ? '1.5rem' : '1.7rem',
                        fontWeight: 800, lineHeight: 1,
                        color: n.queda < 0 ? C.rojo : C.primary,
                        whiteSpace: 'nowrap',
                    }}>
                        {n.queda < 0 ? '−' : ''}{money(n.queda)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: C.onSurfaceVariant, whiteSpace: movil ? 'normal' : 'nowrap' }}>
                        {n.queda < 0 ? 'gastos fijos superan tus ingresos' : `unos ${money(n.porDia)} por día`}
                    </span>
                </div>

                {/* El desglose, en línea: de dónde sale ese número */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: movil ? 'wrap' : 'nowrap' }}>
                    <LineaInline label="Ingresos" valor={n.ingresoPrevisto} signo="+" />
                    <LineaInline label="Fijos" valor={n.fijosTotal} signo="−" />
                    <LineaInline label="Variables" valor={n.gastoVariable} signo="−" />
                </div>
            </section>

            <div style={{
                display: 'grid',
                gridTemplateColumns: movil ? '1fr' : 'repeat(auto-fit, minmax(360px, 1fr))',
                gap: '1.25rem', alignItems: 'start',
            }}>

                {/* ── 2. Calendario de pagos (gastos fijos) ── */}
                <section style={{ ...bento, padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.onSurface }}>Pagos del mes</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                background: n.montoPend > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.12)',
                                color: n.montoPend > 0 ? C.rojo : C.verde,
                                padding: '3px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                            }}>
                                {n.montoPend > 0 ? `${money(n.montoPend)} pendiente` : 'Todo pagado'}
                            </span>
                            <button
                                onClick={() => setMostrarFormGasto(v => !v)}
                                title="Añadir gasto fijo"
                                style={{
                                    width: '26px', height: '26px', borderRadius: '8px', border: 'none',
                                    background: mostrarFormGasto ? C.surfaceContainerHigh : C.primary,
                                    color: mostrarFormGasto ? C.onSurfaceVariant : '#fff',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                    {mostrarFormGasto ? 'close' : 'add'}
                                </span>
                            </button>
                        </div>
                    </div>
                    <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: C.outline }}>
                        {n.fijosPagados.length} de {n.fijosPagados.length + n.fijosPend.length} pagados · {money(n.montoPagado)} de {money(n.fijosTotal)}
                    </p>

                    {mostrarFormGasto && (
                        <form onSubmit={submitNuevoGasto} style={{
                            display: 'flex', gap: '8px', marginBottom: '14px',
                            flexWrap: 'wrap', flexDirection: movil ? 'column' : 'row',
                            padding: '10px', background: C.surfaceContainerLow,
                            border: `1.5px dashed ${C.outlineVariant}`, borderRadius: '12px',
                        }}>
                            <input
                                autoFocus
                                value={nuevoGasto.name}
                                onChange={e => setNuevoGasto(v => ({ ...v, name: e.target.value }))}
                                placeholder="¿Qué pagas?"
                                style={{ ...campo(movil), flex: movil ? undefined : '1 1 140px', width: movil ? '100%' : undefined, border: movil ? `1px solid ${C.outlineVariant}` : 'none', background: movil ? C.surfaceLowest : 'transparent' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    value={nuevoGasto.amount}
                                    onChange={e => setNuevoGasto(v => ({ ...v, amount: e.target.value }))}
                                    placeholder="S/"
                                    type="number" min="0" step="0.01"
                                    inputMode="decimal"
                                    style={{ ...campo(movil), width: movil ? '100%' : '80px', flex: movil ? 1 : undefined }}
                                />
                                {accounts.length > 0 && (
                                    <select
                                        value={nuevoGasto.accountId}
                                        onChange={e => setNuevoGasto(v => ({ ...v, accountId: e.target.value }))}
                                        style={{
                                            background: C.surfaceContainerHigh, border: 'none', borderRadius: '8px',
                                            padding: movil ? '10px 12px' : '4px 8px',
                                            minHeight: movil ? `${TOQUE_MINIMO}px` : undefined,
                                            fontSize: movil ? '0.85rem' : '0.75rem', fontWeight: 700,
                                            color: C.onSurfaceVariant, cursor: 'pointer', fontFamily: 'inherit',
                                        }}
                                    >
                                        <option value="">Cuenta…</option>
                                        {accounts.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                                    </select>
                                )}
                            </div>
                            <button type="submit" disabled={!nuevoGasto.name.trim() || !parseFloat(nuevoGasto.amount)} style={{
                                background: nuevoGasto.name.trim() && parseFloat(nuevoGasto.amount) ? C.primary : C.surfaceContainerHigh,
                                color: nuevoGasto.name.trim() && parseFloat(nuevoGasto.amount) ? '#fff' : C.onSurfaceVariant,
                                border: 'none', borderRadius: '8px',
                                padding: movil ? '12px 14px' : '5px 14px',
                                minHeight: movil ? `${TOQUE_MINIMO}px` : undefined,
                                fontSize: movil ? '0.9rem' : '0.8rem', fontWeight: 700, fontFamily: 'inherit',
                                cursor: nuevoGasto.name.trim() && parseFloat(nuevoGasto.amount) ? 'pointer' : 'default',
                            }}>Añadir</button>
                        </form>
                    )}

                    {n.fijosPend.length === 0 && n.fijosPagados.length === 0 && (
                        <Vacio icono="event_available" titulo="Sin gastos fijos activos" texto="Añádelo aquí arriba con el botón +." />
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

                {/* ── 3. Ingresos fijos ── */}
                <section style={{ ...bento, padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.onSurface }}>Ingresos fijos</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                background: n.montoIngresoPend > 0 ? 'rgba(230,168,23,0.14)' : 'rgba(16,185,129,0.12)',
                                color: n.montoIngresoPend > 0 ? C.ambar : C.verde,
                                padding: '3px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                            }}>
                                {n.montoIngresoPend > 0 ? `${money(n.montoIngresoPend)} por recibir` : 'Todo recibido'}
                            </span>
                            <button
                                onClick={() => setMostrarFormIngreso(v => !v)}
                                title="Añadir ingreso fijo"
                                style={{
                                    width: '26px', height: '26px', borderRadius: '8px', border: 'none',
                                    background: mostrarFormIngreso ? C.surfaceContainerHigh : C.primary,
                                    color: mostrarFormIngreso ? C.onSurfaceVariant : '#fff',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                    {mostrarFormIngreso ? 'close' : 'add'}
                                </span>
                            </button>
                        </div>
                    </div>
                    <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: C.outline }}>
                        {n.ingresosRecibidos.length} de {n.ingresosRecibidos.length + n.ingresosPend.length} recibidos · {money(n.montoIngresoRecibido)} de {money(n.ingresoPrevisto)}
                    </p>

                    {mostrarFormIngreso && (
                        <form onSubmit={submitNuevoIngreso} style={{
                            display: 'flex', gap: '8px', marginBottom: '14px',
                            flexWrap: 'wrap', flexDirection: movil ? 'column' : 'row',
                            padding: '10px', background: C.surfaceContainerLow,
                            border: `1.5px dashed ${C.outlineVariant}`, borderRadius: '12px',
                        }}>
                            <input
                                autoFocus
                                value={nuevoIngreso.name}
                                onChange={e => setNuevoIngreso(v => ({ ...v, name: e.target.value }))}
                                placeholder="¿De dónde viene?"
                                style={{ ...campo(movil), flex: movil ? undefined : '1 1 140px', width: movil ? '100%' : undefined, border: movil ? `1px solid ${C.outlineVariant}` : 'none', background: movil ? C.surfaceLowest : 'transparent' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    value={nuevoIngreso.amount}
                                    onChange={e => setNuevoIngreso(v => ({ ...v, amount: e.target.value }))}
                                    placeholder="S/"
                                    type="number" min="0" step="0.01"
                                    inputMode="decimal"
                                    style={{ ...campo(movil), width: movil ? '100%' : '80px', flex: movil ? 1 : undefined }}
                                />
                                {accounts.length > 0 && (
                                    <select
                                        value={nuevoIngreso.accountId}
                                        onChange={e => setNuevoIngreso(v => ({ ...v, accountId: e.target.value }))}
                                        style={{
                                            background: C.surfaceContainerHigh, border: 'none', borderRadius: '8px',
                                            padding: movil ? '10px 12px' : '4px 8px',
                                            minHeight: movil ? `${TOQUE_MINIMO}px` : undefined,
                                            fontSize: movil ? '0.85rem' : '0.75rem', fontWeight: 700,
                                            color: C.onSurfaceVariant, cursor: 'pointer', fontFamily: 'inherit',
                                        }}
                                    >
                                        <option value="">Cuenta…</option>
                                        {accounts.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                                    </select>
                                )}
                            </div>
                            <button type="submit" disabled={!nuevoIngreso.name.trim() || !parseFloat(nuevoIngreso.amount)} style={{
                                background: nuevoIngreso.name.trim() && parseFloat(nuevoIngreso.amount) ? C.primary : C.surfaceContainerHigh,
                                color: nuevoIngreso.name.trim() && parseFloat(nuevoIngreso.amount) ? '#fff' : C.onSurfaceVariant,
                                border: 'none', borderRadius: '8px',
                                padding: movil ? '12px 14px' : '5px 14px',
                                minHeight: movil ? `${TOQUE_MINIMO}px` : undefined,
                                fontSize: movil ? '0.9rem' : '0.8rem', fontWeight: 700, fontFamily: 'inherit',
                                cursor: nuevoIngreso.name.trim() && parseFloat(nuevoIngreso.amount) ? 'pointer' : 'default',
                            }}>Añadir</button>
                        </form>
                    )}

                    {ingresosFijos.length === 0 && (
                        <Vacio icono="payments" titulo="Sin ingresos fijos" texto="Añade tu sueldo u otro ingreso recurrente para proyectar el mes." />
                    )}

                    {[...n.ingresosPend, ...n.ingresosRecibidos].map(i => (
                        <FilaIngreso
                            key={i.id}
                            ingreso={i}
                            recibido={i.lastReceivedMonth === mesActual}
                            editando={editandoIngreso === i.id}
                            onEditar={() => setEditandoIngreso(editandoIngreso === i.id ? null : i.id)}
                            onGuardar={(name, amount) => { editFixedIncome(i.id, { name, amount }); setEditandoIngreso(null); }}
                            onEliminar={() => removeFixedIncome(i.id)}
                            onToggleRecibido={() => i.lastReceivedMonth === mesActual
                                ? unmarkFixedIncomeReceived(i.id, mesActual)
                                : markFixedIncomeReceived(i.id, mesActual)}
                        />
                    ))}

                    {ingresosFijos.filter(i => !i.active).length > 0 && (
                        <details style={{ marginTop: '10px' }}>
                            <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: C.outline, fontWeight: 600 }}>
                                Inactivos ({ingresosFijos.filter(i => !i.active).length})
                            </summary>
                            <div style={{ marginTop: '8px' }}>
                                {ingresosFijos.filter(i => !i.active).map(i => (
                                    <div key={i.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '7px 12px', marginBottom: '4px', opacity: 0.65,
                                        fontSize: '0.8rem', color: C.onSurfaceVariant,
                                    }}>
                                        <span style={{ flex: 1 }}>{i.name}</span>
                                        <span style={{ fontWeight: 600 }}>{money(i.amount)}</span>
                                        <button
                                            onClick={() => editFixedIncome(i.id, { active: true })}
                                            title="Reactivar"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>undo</span>
                                        </button>
                                        <button
                                            onClick={() => removeFixedIncome(i.id)}
                                            title="Eliminar"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}
                </section>
            </div>
        </div>
    );
};

/* ══ Sub-componentes ══════════════════════════════════════════════ */

const LineaInline = ({ label, valor, signo }: { label: string; valor: number; signo: string }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: '0.68rem', color: C.onSurfaceVariant, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '0.78rem', color: C.onSurface, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
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

interface FilaIngresoProps {
    ingreso: FixedIncome;
    recibido: boolean;
    editando: boolean;
    onEditar: () => void;
    onGuardar: (name: string, amount: number) => void;
    onEliminar: () => void;
    onToggleRecibido: () => void;
}

const FilaIngreso = ({ ingreso, recibido, editando, onEditar, onGuardar, onEliminar, onToggleRecibido }: FilaIngresoProps) => {
    const [name, setName] = useState(ingreso.name);
    const [amount, setAmount] = useState(String(ingreso.amount));

    if (editando) {
        return (
            <form
                onSubmit={e => { e.preventDefault(); const a = parseFloat(amount); if (name.trim() && a > 0) onGuardar(name.trim(), a); }}
                style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 12px', marginBottom: '6px', borderRadius: '10px',
                    background: C.surfaceContainerLow, border: `1.5px solid ${C.primary}`,
                }}
            >
                <input
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.87rem', fontWeight: 600, color: C.onSurface, fontFamily: 'inherit' }}
                />
                <input
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    type="number" min="0" step="0.01" inputMode="decimal"
                    style={{ width: '80px', border: `1px solid ${C.outlineVariant}`, borderRadius: '6px', padding: '4px 6px', outline: 'none', fontSize: '0.85rem', fontWeight: 700, color: C.onSurface, fontFamily: 'inherit' }}
                />
                <button type="submit" title="Guardar" style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', display: 'flex' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                </button>
                <button type="button" onClick={onEliminar} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, padding: '2px', display: 'flex' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>delete</span>
                </button>
                <button type="button" onClick={onEditar} title="Cancelar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, padding: '2px', display: 'flex' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                </button>
            </form>
        );
    }

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', marginBottom: '6px', borderRadius: '10px',
            background: recibido ? 'transparent' : C.surfaceContainerLow,
            opacity: recibido ? 0.6 : 1,
        }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: '0.87rem', fontWeight: 600, color: C.onSurface,
                    textDecoration: recibido ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {ingreso.name}
                </div>
            </div>

            <span style={{ fontSize: '0.87rem', fontWeight: 700, color: C.onSurface, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                {money(ingreso.amount)}
            </span>

            <button
                onClick={onEditar}
                title="Editar"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, padding: '2px', display: 'flex', flexShrink: 0 }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
            </button>

            <button
                onClick={onToggleRecibido}
                title={recibido ? 'Desmarcar' : 'Marcar como recibido'}
                style={{
                    background: recibido ? 'transparent' : C.verde,
                    color: recibido ? C.outline : '#fff',
                    border: recibido ? `1px solid ${C.outlineVariant}` : 'none',
                    borderRadius: '8px', padding: '5px 10px', cursor: 'pointer',
                    fontSize: '0.72rem', fontWeight: 700, fontFamily: 'inherit', flexShrink: 0,
                }}
            >
                {recibido ? 'Deshacer' : 'Recibí'}
            </button>
        </div>
    );
};
