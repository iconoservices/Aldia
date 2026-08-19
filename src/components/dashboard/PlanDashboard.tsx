import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Transaction, FixedExpense, Project, Account } from '../../hooks/useAlDiaState';
import {
    C, bento, money, useIsMobile,
    paddingPagina, cabecera, tituloPagina, subtituloPagina, campo, botonPrimario, TOQUE_MINIMO,
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
    projects:       Project[];
    accounts:       Account[];
    updateFixedExpense:         (id: number, updates: Partial<FixedExpense>) => void;
    markFixedExpensePaid:       (id: number, monthStr: string, accountId?: number) => void;
    unmarkFixedExpensePaid:     (id: number, monthStr: string) => void;
    addTransaction:             (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projId?: number, accId?: number, isCashless?: boolean, cat?: string, contact?: string) => void;
    removeTransaction:          (id: number) => void;
    updatePreference:           (key: 'fixedIncomes', value: string) => void;
}

export const PlanDashboard = ({
    transactions, fixedExpenses, preferences, projects, accounts,
    updateFixedExpense, markFixedExpensePaid, unmarkFixedExpensePaid, addTransaction,
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
    const [lote, setLote] = useState({ projectId: '', amount: '', concepto: '', accountId: '' });
    const [loteOk, setLoteOk] = useState(false);
    const [editandoDia, setEditandoDia] = useState<number | null>(null);
    const [editandoIngreso, setEditandoIngreso] = useState<number | null>(null);
    const [nuevoIngreso, setNuevoIngreso] = useState({ name: '', amount: '', accountId: '' });
    const [mostrarFormIngreso, setMostrarFormIngreso] = useState(false);

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

    const submitNuevoIngreso = (e: React.FormEvent) => {
        e.preventDefault();
        const monto = parseFloat(nuevoIngreso.amount);
        if (!nuevoIngreso.name.trim() || !monto || monto <= 0) return;
        addFixedIncome(nuevoIngreso.name.trim(), monto, nuevoIngreso.accountId ? Number(nuevoIngreso.accountId) : undefined);
        setNuevoIngreso({ name: '', amount: '', accountId: '' });
        setMostrarFormIngreso(false);
    };

    const pendientesOrdenados = useMemo(() => {
        const conDia    = n.fijosPend.filter(f => f.dueDay).sort((a, b) => (a.dueDay || 0) - (b.dueDay || 0));
        const sinDia    = n.fijosPend.filter(f => !f.dueDay);
        return { conDia, sinDia };
    }, [n.fijosPend]);

    return (
        <div style={paddingPagina(movil)}>

            {/* ── Header ── */}
            <div style={cabecera(movil)}>
                <div>
                    <h2 style={tituloPagina}>Proyección</h2>
                    <p style={subtituloPagina}>
                        {nombreMes} · quedan {diasRestantes} {diasRestantes === 1 ? 'día' : 'días'}
                    </p>
                </div>
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
                            <span style={{
                                // En móvil el importe se corta si no baja de tamaño
                                fontSize: movil ? '2.3rem' : '3.2rem',
                                fontWeight: 800, lineHeight: 1,
                                color: n.queda < 0 ? C.rojo : C.primary,
                                wordBreak: 'break-word',
                            }}>
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
                        minWidth: movil ? '100%' : '260px', border: `1px solid ${C.outlineVariant}`,
                        boxSizing: 'border-box',
                    }}>
                        <Linea label="Ingresos previstos" valor={n.ingresoPrevisto} signo="+" />
                        <Linea label="Gastos fijos" valor={n.fijosTotal} signo="−" />
                        <Linea label="Gastos variables" valor={n.gastoVariable} signo="−" />
                        <div style={{ height: '1px', background: C.outlineVariant, margin: '8px 0' }} />
                        <Linea label="Queda" valor={n.queda} signo={n.queda < 0 ? '−' : ''} destacado />
                    </div>
                </div>

                {n.ingresoReal > 0 && (
                    <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: C.outline }}>
                        Llevas {money(n.ingresoReal)} de ingresos registrados este mes
                        {n.ingresoPrevisto > 0 && ` (previsto: ${money(n.ingresoPrevisto)})`}.
                    </p>
                )}
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

            {/* ── 4. Volcado en bloque ── */}
            <section style={{ ...bento, padding: '1.25rem', marginTop: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.onSurface }}>Registrar ingresos en bloque</h3>
                <p style={{ margin: '4px 0 14px', fontSize: '0.8rem', color: C.onSurfaceVariant, maxWidth: '620px' }}>
                    Para volcar de una vez lo de varios trabajos: en vez de anotar cada sesión,
                    apuntas el total del periodo y de dónde vino. El detalle lo sigues teniendo donde ya lo llevas.
                </p>

                <form onSubmit={submitLote} style={{
                    display: 'flex', gap: '10px', alignItems: movil ? 'stretch' : 'center',
                    flexWrap: 'wrap', flexDirection: movil ? 'column' : 'row',
                }}>
                    <select
                        value={lote.projectId}
                        onChange={e => setLote(v => ({ ...v, projectId: e.target.value }))}
                        style={{ ...campo(movil), background: C.surfaceContainerLow, cursor: 'pointer', width: movil ? '100%' : undefined, minWidth: movil ? 0 : '160px' }}
                    >
                        <option value="">¿De dónde vino?</option>
                        {projects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                    </select>

                    <input
                        value={lote.concepto}
                        onChange={e => setLote(v => ({ ...v, concepto: e.target.value }))}
                        placeholder={movil ? 'Concepto' : 'Concepto (ej: 5 sesiones del 1 al 15)'}
                        style={{ ...campo(movil), background: C.surfaceContainerLow, flex: movil ? undefined : '1 1 240px', width: movil ? '100%' : undefined }}
                    />

                    <div style={{ display: 'flex', gap: '10px', width: movil ? '100%' : undefined }}>
                        {accounts.length > 0 && (
                            <select
                                value={lote.accountId}
                                onChange={e => setLote(v => ({ ...v, accountId: e.target.value }))}
                                style={{ ...campo(movil), background: C.surfaceContainerLow, cursor: 'pointer', flex: movil ? 1 : undefined, minWidth: movil ? 0 : undefined }}
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
                            inputMode="decimal"
                            style={{ ...campo(movil), background: C.surfaceContainerLow, fontWeight: 700, width: movil ? undefined : '120px', flex: movil ? 1 : undefined, minWidth: movil ? 0 : undefined }}
                        />
                    </div>

                    <button type="submit" disabled={!parseFloat(lote.amount)} style={{
                        ...botonPrimario(movil),
                        width: movil ? '100%' : undefined,
                        background: parseFloat(lote.amount) ? C.verde : C.surfaceContainerHigh,
                        color: parseFloat(lote.amount) ? '#fff' : C.onSurfaceVariant,
                        boxShadow: parseFloat(lote.amount) ? '0 4px 14px rgba(16,185,129,0.25)' : 'none',
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
