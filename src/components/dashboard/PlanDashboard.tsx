import { useState, useMemo, useEffect } from 'react';
import type { Transaction, FixedExpense, Account } from '../../hooks/useAlDiaState';
import { getPeriodKey } from '../../hooks/useAlDiaState';
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
    frequency?: 'monthly' | 'weekly';
    dueDay?: number;
    dueWeekday?: number;
    lastReceivedMonth?: string;
    partialReceived?: { month: string; amount: number };
}

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const WEEKDAYS_CORTO = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

interface PlanDashboardProps {
    transactions:   Transaction[];
    fixedExpenses:  FixedExpense[];
    preferences:    { isBudgetFixed: boolean; fixedIncomes: string };
    accounts:       Account[];
    addFixedExpense:            (text: string, amount: number, projectId?: number, dueDay?: number, accountId?: number, frequency?: 'monthly' | 'weekly', dueWeekday?: number, contact?: string, totalAmount?: number) => void;
    removeFixedExpense:         (id: number) => void;
    toggleFixedExpense:         (id: number) => void;
    updateFixedExpense:         (id: number, updates: Partial<FixedExpense>) => void;
    payFixedExpensePartial:     (id: number, periodStr: string, amount: number, accountId?: number) => void;
    unmarkFixedExpensePaid:     (id: number, periodStr: string) => void;
    rolloverFixedExpenses:      () => void;
    payPendingPeriod:           (id: number, period: string, amount: number, accountId?: number) => void;
    unmarkPendingPeriod:        (id: number, period: string) => void;
    addTransaction:             (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projId?: number, accId?: number, isCashless?: boolean, cat?: string, contact?: string) => void;
    removeTransaction:          (id: number) => void;
    updatePreference:           (key: 'fixedIncomes', value: string) => void;
}

export const PlanDashboard = ({
    transactions, fixedExpenses, preferences, accounts,
    addFixedExpense, removeFixedExpense, toggleFixedExpense, updateFixedExpense,
    payFixedExpensePartial, unmarkFixedExpensePaid, rolloverFixedExpenses, payPendingPeriod, unmarkPendingPeriod,
    addTransaction, removeTransaction, updatePreference,
}: PlanDashboardProps) => {

    const movil = useIsMobile();

    // Detecta gastos fijos que cruzaron a un período nuevo sin quedar saldados,
    // igual que hacía la pestaña Gastos Fijos (ahora fusionada acá).
    useEffect(() => {
        rolloverFixedExpenses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const hoy = new Date();
    const todayStr = hoy.toLocaleDateString('en-CA');
    const mesActual = todayStr.slice(0, 7);       // YYYY-MM
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

    const addFixedIncome = (name: string, amount: number, accountId?: number, frequency?: 'monthly' | 'weekly', dueDay?: number, dueWeekday?: number) =>
        saveIngresosFijos([...ingresosFijos, { id: Date.now(), name, amount, active: true, accountId, frequency, dueDay, dueWeekday }]);

    const editFixedIncome = (id: number, updates: Partial<FixedIncome>) =>
        saveIngresosFijos(ingresosFijos.map(f => f.id === id ? { ...f, ...updates } : f));

    const removeFixedIncome = (id: number) =>
        saveIngresosFijos(ingresosFijos.filter(f => f.id !== id));

    const toggleFixedIncome = (id: number) =>
        saveIngresosFijos(ingresosFijos.map(f => f.id === id ? { ...f, active: !f.active } : f));

    // Abona (total o parcial) el período en curso. Si cubre el total pendiente, queda como recibido.
    const receiveFixedIncomePartial = (id: number, periodStr: string, amount: number, accountId?: number) => {
        const item = ingresosFijos.find(f => f.id === id);
        if (!item) return;
        const resolvedAccountId = accountId ?? item.accountId;
        const alreadyReceived = item.partialReceived?.month === periodStr ? item.partialReceived.amount : 0;
        const remaining = Math.max(0, item.amount - alreadyReceived);
        const value = Math.min(Math.abs(amount), remaining);
        if (value <= 0) return;
        const totalReceived = alreadyReceived + value;
        const isFullyReceived = totalReceived >= item.amount - 0.005;
        saveIngresosFijos(ingresosFijos.map(f => f.id === id ? {
            ...f,
            lastReceivedMonth: isFullyReceived ? periodStr : f.lastReceivedMonth,
            partialReceived: isFullyReceived ? undefined : { month: periodStr, amount: totalReceived },
        } : f));
        addTransaction(`Depósito: ${item.name}`, value, 'ingreso', false, undefined, resolvedAccountId, false, 'Sueldo');
    };

    const unmarkFixedIncomeReceived = (id: number, periodStr: string) => {
        const item = ingresosFijos.find(f => f.id === id);
        if (!item) return;
        saveIngresosFijos(ingresosFijos.map(f => f.id === id ? { ...f, lastReceivedMonth: undefined, partialReceived: undefined } : f));
        const objetivo = `Depósito: ${item.name}`;
        transactions.filter(t => t.text === objetivo && getPeriodKey(item.frequency, t.fullDate) === periodStr).forEach(t => removeTransaction(t.id));
    };

    /* ── Los números del mes ───────────────────────────────────────
       Se calculan por separado y se muestran etiquetados: la idea es que
       siempre se pueda ver de dónde sale el resultado, no un total mágico.
       El período de cada ítem se calcula según su propia frecuencia
       (mensual o semanal), no siempre "el mes en curso". */
    const n = useMemo(() => {
        const activos      = fixedExpenses.filter(f => f.active);
        const fijosPagados = activos.filter(f => f.lastPaidMonth === getPeriodKey(f.frequency, todayStr));
        const fijosPend    = activos.filter(f => f.lastPaidMonth !== getPeriodKey(f.frequency, todayStr));
        const fijosTotal   = activos.reduce((s, f) => s + (Number(f.amount) || 0), 0);
        const montoPagado  = fijosPagados.reduce((s, f) => s + (Number(f.amount) || 0), 0);
        const montoPend    = fijosPend.reduce((s, f) => s + (Number(f.amount) || 0), 0);

        const ingresosActivos    = ingresosFijos.filter(i => i.active);
        const ingresoPrevisto    = ingresosActivos.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        const ingresosRecibidos  = ingresosActivos.filter(i => i.lastReceivedMonth === getPeriodKey(i.frequency, todayStr));
        const ingresosPend       = ingresosActivos.filter(i => i.lastReceivedMonth !== getPeriodKey(i.frequency, todayStr));
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
    }, [fixedExpenses, ingresosFijos, transactions, mesActual, todayStr, diasRestantes]);

    /* ── Formularios ── */
    const [mostrarFormIngreso, setMostrarFormIngreso] = useState(false);
    const [mostrarFormGasto, setMostrarFormGasto] = useState(false);

    const pendientesOrdenados = useMemo(() => {
        const conDia    = n.fijosPend.filter(f => f.dueDay || f.dueWeekday !== undefined).sort((a, b) => (a.dueDay || 0) - (b.dueDay || 0));
        const sinDia    = n.fijosPend.filter(f => !f.dueDay && f.dueWeekday === undefined);
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
                        <NuevoFijoForm
                            movil={movil}
                            accounts={accounts}
                            placeholderNombre="¿Qué pagas?"
                            conPrestamo
                            onSubmit={(v) => {
                                addFixedExpense(
                                    v.nombre, v.monto, undefined,
                                    v.frequency === 'monthly' ? v.dueDay : undefined,
                                    v.accountId, v.frequency,
                                    v.frequency === 'weekly' ? v.dueWeekday : undefined,
                                    v.esPrestamo ? (v.contact || undefined) : undefined,
                                    v.esPrestamo && v.totalAmount ? v.totalAmount : undefined,
                                );
                                setMostrarFormGasto(false);
                            }}
                        />
                    )}

                    {n.fijosPend.length === 0 && n.fijosPagados.length === 0 && (
                        <Vacio icono="event_available" titulo="Sin gastos fijos activos" texto="Añádelo aquí arriba con el botón +." />
                    )}

                    {[...pendientesOrdenados.conDia, ...pendientesOrdenados.sinDia].map(f => (
                        <FilaFijo
                            key={f.id}
                            item={f}
                            tipo="gasto"
                            periodo={getPeriodKey(f.frequency, todayStr)}
                            diaHoy={diaHoy}
                            hoyWeekday={hoy.getDay()}
                            pagado={false}
                            accounts={accounts}
                            onGuardarFecha={(updates) => updateFixedExpense(f.id, updates)}
                            onPagarParcial={(monto, accountId) => payFixedExpensePartial(f.id, getPeriodKey(f.frequency, todayStr), monto, accountId)}
                            onDeshacer={() => unmarkFixedExpensePaid(f.id, getPeriodKey(f.frequency, todayStr))}
                            onToggleActivo={() => toggleFixedExpense(f.id)}
                            onEliminar={() => removeFixedExpense(f.id)}
                            onEditar={(updates) => updateFixedExpense(f.id, updates)}
                            onPagarPeriodoPendiente={(period, monto, accountId) => payPendingPeriod(f.id, period, monto, accountId)}
                            onDeshacerPeriodoPendiente={(period) => unmarkPendingPeriod(f.id, period)}
                        />
                    ))}

                    {n.fijosPagados.map(f => (
                        <FilaFijo
                            key={f.id}
                            item={f}
                            tipo="gasto"
                            periodo={getPeriodKey(f.frequency, todayStr)}
                            diaHoy={diaHoy}
                            hoyWeekday={hoy.getDay()}
                            pagado
                            accounts={accounts}
                            onGuardarFecha={(updates) => updateFixedExpense(f.id, updates)}
                            onPagarParcial={() => {}}
                            onDeshacer={() => unmarkFixedExpensePaid(f.id, getPeriodKey(f.frequency, todayStr))}
                            onToggleActivo={() => toggleFixedExpense(f.id)}
                            onEliminar={() => removeFixedExpense(f.id)}
                            onEditar={(updates) => updateFixedExpense(f.id, updates)}
                            onPagarPeriodoPendiente={() => {}}
                            onDeshacerPeriodoPendiente={() => {}}
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
                        <NuevoFijoForm
                            movil={movil}
                            accounts={accounts}
                            placeholderNombre="¿De dónde viene?"
                            onSubmit={(v) => {
                                addFixedIncome(v.nombre, v.monto, v.accountId, v.frequency, v.frequency === 'monthly' ? v.dueDay : undefined, v.frequency === 'weekly' ? v.dueWeekday : undefined);
                                setMostrarFormIngreso(false);
                            }}
                        />
                    )}

                    {ingresosFijos.length === 0 && (
                        <Vacio icono="payments" titulo="Sin ingresos fijos" texto="Añade tu sueldo u otro ingreso recurrente para proyectar el mes." />
                    )}

                    {[...n.ingresosPend, ...n.ingresosRecibidos].map(i => (
                        <FilaFijo
                            key={i.id}
                            item={i}
                            tipo="ingreso"
                            periodo={getPeriodKey(i.frequency, todayStr)}
                            diaHoy={diaHoy}
                            hoyWeekday={hoy.getDay()}
                            pagado={i.lastReceivedMonth === getPeriodKey(i.frequency, todayStr)}
                            accounts={accounts}
                            onGuardarFecha={(updates) => editFixedIncome(i.id, updates)}
                            onPagarParcial={(monto, accountId) => receiveFixedIncomePartial(i.id, getPeriodKey(i.frequency, todayStr), monto, accountId)}
                            onDeshacer={() => unmarkFixedIncomeReceived(i.id, getPeriodKey(i.frequency, todayStr))}
                            onToggleActivo={() => toggleFixedIncome(i.id)}
                            onEliminar={() => removeFixedIncome(i.id)}
                            onEditar={(updates) => editFixedIncome(i.id, updates)}
                            onPagarPeriodoPendiente={() => {}}
                            onDeshacerPeriodoPendiente={() => {}}
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

const campoLabel: React.CSSProperties = { fontSize: '0.62rem', fontWeight: 800, color: C.outline, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '3px', display: 'block' };

function pendingPeriodLabel(period: string): string {
    const monthMatch = /^(\d{4})-(\d{2})$/.exec(period);
    if (monthMatch) {
        const [, y, m] = monthMatch;
        const nombre = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-ES', { month: 'long' });
        return nombre.charAt(0).toUpperCase() + nombre.slice(1);
    }
    const weekMatch = /^(\d{4})-W(\d{2})$/.exec(period);
    if (weekMatch) return `Semana ${weekMatch[2]} · ${weekMatch[1]}`;
    return period;
}

/* Item genérico compartido por gastos fijos e ingresos fijos: ambos viven en
   la misma forma de datos (amount, active, frequency, dueDay/dueWeekday,
   lastPaidMonth/lastReceivedMonth según el caso, partialPaid/partialReceived,
   pendingPeriods, y — solo gastos — contact/totalAmount/paidToDate para un
   préstamo a plazos). Para no duplicar la fila entre las dos secciones, el
   componente recibe el campo de "período cubierto" y "abono parcial" ya
   normalizados por quien lo llama en vez de leer los nombres distintos. */
interface FilaFijoProps {
    item: any;
    tipo: 'gasto' | 'ingreso';
    periodo: string;
    diaHoy: number;
    hoyWeekday: number;
    pagado: boolean;
    accounts: Account[];
    onGuardarFecha: (updates: any) => void;
    onPagarParcial: (monto: number, accountId?: number) => void;
    onDeshacer: () => void;
    onToggleActivo: () => void;
    onEliminar: () => void;
    onEditar: (updates: any) => void;
    onPagarPeriodoPendiente: (period: string, monto: number, accountId?: number) => void;
    onDeshacerPeriodoPendiente: (period: string) => void;
}

const FilaFijo = ({
    item, tipo, periodo, diaHoy, hoyWeekday, pagado, accounts,
    onGuardarFecha, onPagarParcial, onDeshacer, onToggleActivo, onEliminar, onEditar,
    onPagarPeriodoPendiente, onDeshacerPeriodoPendiente,
}: FilaFijoProps) => {
    const esGasto = tipo === 'gasto';
    const partial = esGasto ? item.partialPaid : item.partialReceived;

    const [editandoDia, setEditandoDia] = useState(false);
    const [editando, setEditando] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [diaInput, setDiaInput] = useState(String(item.dueDay ?? ''));

    const paidSoFar = pagado ? item.amount : (partial?.month === periodo ? partial.amount : 0);
    const pending = Math.max(0, item.amount - paidSoFar);
    const hasPartial = !pagado && paidSoFar > 0;

    const esSemanal = item.frequency === 'weekly';
    const vencido = !pagado && !esSemanal && !!item.dueDay && item.dueDay < diaHoy;
    const hoyToca = !pagado && (esSemanal ? item.dueWeekday === hoyWeekday : item.dueDay === diaHoy);

    const [payAmount, setPayAmount] = useState('');
    const [payAccountId, setPayAccountId] = useState<number | undefined>(item.accountId);

    const openPay = () => { setPayAmount(pending.toFixed(2)); setPayAccountId(item.accountId); setIsPaying(true); };
    const confirmPay = () => {
        const value = parseFloat(payAmount);
        if (!value || value <= 0 || !payAccountId) return;
        onPagarParcial(value, payAccountId);
        setIsPaying(false);
    };

    const guardarDia = () => {
        if (esSemanal) { setEditandoDia(false); return; }
        const d = parseInt(diaInput, 10);
        if (d >= 1 && d <= 31) onGuardarFecha({ dueDay: d });
        setEditandoDia(false);
    };

    if (editando) return (
        <FilaFijoEditForm
            item={item}
            esGasto={esGasto}
            accounts={accounts}
            onCancel={() => setEditando(false)}
            onGuardar={(updates: any) => { onEditar(updates); setEditando(false); }}
        />
    );

    return (
        <div style={{
            padding: '10px 12px', marginBottom: '6px', borderRadius: '10px',
            background: pagado ? 'transparent' : vencido ? 'rgba(239,68,68,0.06)' : C.surfaceContainerLow,
            opacity: (pagado || item.active) ? (pagado ? 0.6 : 1) : 0.5,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Día del mes / de la semana */}
                {editandoDia ? (
                    esSemanal ? (
                        <select
                            autoFocus
                            value={item.dueWeekday ?? 1}
                            onChange={e => { onGuardarFecha({ dueWeekday: Number(e.target.value) }); setEditandoDia(false); }}
                            onBlur={() => setEditandoDia(false)}
                            style={{ width: '52px', height: '38px', textAlign: 'center', border: `2px solid ${C.primary}`, borderRadius: '9px', outline: 'none', fontSize: '0.72rem', fontWeight: 800, color: C.onSurface, fontFamily: 'inherit', flexShrink: 0 }}
                        >
                            {WEEKDAYS_CORTO.map((w, i) => <option key={i} value={i}>{w}</option>)}
                        </select>
                    ) : (
                        <input
                            autoFocus
                            value={diaInput}
                            onChange={e => setDiaInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') guardarDia(); if (e.key === 'Escape') setEditandoDia(false); }}
                            onBlur={guardarDia}
                            type="number" min="1" max="31"
                            placeholder="Día"
                            style={{ width: '42px', height: '38px', textAlign: 'center', border: `2px solid ${C.primary}`, borderRadius: '9px', outline: 'none', fontSize: '0.85rem', fontWeight: 800, color: C.onSurface, fontFamily: 'inherit', flexShrink: 0 }}
                        />
                    )
                ) : (
                    <button
                        onClick={() => { setDiaInput(String(item.dueDay ?? '')); setEditandoDia(true); }}
                        disabled={pagado}
                        title={esSemanal ? 'Cambiar día de la semana' : (item.dueDay !== undefined ? 'Cambiar día de pago' : 'Poner día de pago')}
                        style={{
                            width: '42px', height: '38px', flexShrink: 0,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '9px', cursor: pagado ? 'default' : 'pointer',
                            border: (esSemanal || item.dueDay !== undefined) ? 'none' : `1.5px dashed ${C.outlineVariant}`,
                            background: (esSemanal || item.dueDay !== undefined) ? (vencido ? 'rgba(239,68,68,0.14)' : hoyToca ? 'rgba(230,168,23,0.18)' : C.surfaceContainerHigh) : 'transparent',
                            color: vencido ? C.rojo : hoyToca ? C.ambar : C.onSurfaceVariant,
                            fontFamily: 'inherit',
                        }}
                    >
                        {esSemanal ? (
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, lineHeight: 1 }}>{WEEKDAYS_CORTO[item.dueWeekday ?? 1]}</span>
                        ) : item.dueDay !== undefined ? (
                            <span style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1 }}>{item.dueDay === 0 ? '31' : item.dueDay}</span>
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
                        {(item.text ?? item.name)?.trim()}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                        {!pagado && vencido && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: C.rojo }}>VENCIDO</span>}
                        {!pagado && hoyToca && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: C.ambar }}>TOCA HOY</span>}
                        {esSemanal && <span style={{ fontSize: '0.68rem', color: C.outline }}>cada {WEEKDAYS[item.dueWeekday ?? 1]}</span>}
                        {item.totalAmount != null && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: C.primary }}>{item.contact ? `Deuda: ${item.contact}` : 'Deuda a plazos'}</span>
                        )}
                    </div>
                </div>

                <span style={{ fontSize: '0.87rem', fontWeight: 700, color: C.onSurface, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {money(item.amount)}
                </span>

                {!isPaying && !pagado && (
                    <button
                        onClick={openPay}
                        title={hasPartial ? `Abonar resto · ${money(pending)}` : (esGasto ? 'Marcar pagado' : 'Marcar como recibido')}
                        style={{
                            background: C.verde, color: '#fff', border: 'none',
                            borderRadius: '8px', padding: '5px 10px', cursor: 'pointer',
                            fontSize: '0.72rem', fontWeight: 700, fontFamily: 'inherit', flexShrink: 0,
                        }}
                    >
                        {esGasto ? 'Pagué' : 'Recibí'}
                    </button>
                )}
                {pagado && (
                    <button onClick={onDeshacer} title="Deshacer" style={{ background: 'transparent', color: C.outline, border: `1px solid ${C.outlineVariant}`, borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'inherit', flexShrink: 0 }}>
                        Deshacer
                    </button>
                )}

                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button onClick={() => setMenuOpen(v => !v)} title="Más opciones" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, padding: '2px', display: 'flex' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>more_vert</span>
                    </button>
                    {menuOpen && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 5, background: 'white', border: `1px solid ${C.outlineVariant}`, borderRadius: '9px', boxShadow: '0 4px 14px rgba(0,0,0,0.1)', overflow: 'hidden', minWidth: '140px' }}>
                            <button onClick={() => { setEditando(true); setMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '100%', background: 'none', border: 'none', padding: '9px 12px', cursor: 'pointer', color: C.onSurface, fontSize: '0.78rem', fontWeight: 600, textAlign: 'left' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span> Editar
                            </button>
                            <button onClick={() => { onToggleActivo(); setMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '100%', background: 'none', border: 'none', padding: '9px 12px', cursor: 'pointer', color: C.onSurface, fontSize: '0.78rem', fontWeight: 600, textAlign: 'left', borderTop: `1px solid ${C.surfaceContainerLow}` }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{item.active ? 'visibility_off' : 'visibility'}</span> {item.active ? 'Desactivar' : 'Activar'}
                            </button>
                            <button onClick={() => { onEliminar(); setMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '100%', background: 'none', border: 'none', padding: '9px 12px', cursor: 'pointer', color: C.rojo, fontSize: '0.78rem', fontWeight: 600, textAlign: 'left', borderTop: `1px solid ${C.surfaceContainerLow}` }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>delete</span> Eliminar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isPaying && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: C.surfaceContainerHigh, padding: '6px', borderRadius: '9px', marginTop: '8px' }}>
                    {!item.accountId && (
                        <select autoFocus value={payAccountId ?? ''} onChange={e => setPayAccountId(e.target.value ? Number(e.target.value) : undefined)} style={{ padding: '6px', borderRadius: '7px', border: `1px solid ${!payAccountId ? C.rojo : C.outlineVariant}`, fontSize: '0.75rem', fontWeight: 700, outline: 'none', background: 'white', cursor: 'pointer' }}>
                            <option value="">{esGasto ? '¿De qué cuenta sale?' : '¿A qué cuenta entra?'}</option>
                            {accounts?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    )}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', fontWeight: 700, color: C.onSurfaceVariant }}>S/</span>
                            <input autoFocus={!!item.accountId} type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmPay()} style={{ width: '100%', padding: '6px 6px 6px 26px', borderRadius: '7px', border: `1px solid ${C.outlineVariant}`, fontSize: '0.8rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <button onClick={() => setPayAmount(pending.toFixed(2))} style={{ padding: '6px 8px', borderRadius: '7px', border: 'none', background: C.surfaceContainer, color: C.onSurfaceVariant, fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>Todo</button>
                        <button onClick={confirmPay} disabled={!payAccountId} title={!payAccountId ? 'Elige primero la cuenta' : undefined} style={{ padding: '6px 10px', borderRadius: '7px', border: 'none', background: payAccountId ? C.verde : C.outlineVariant, color: 'white', fontSize: '0.7rem', fontWeight: 800, cursor: payAccountId ? 'pointer' : 'not-allowed' }}>{esGasto ? 'Pagar' : 'Cobrar'}</button>
                        <button onClick={() => setIsPaying(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outlineVariant, padding: '4px', display: 'flex' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                        </button>
                    </div>
                </div>
            )}

            {hasPartial && !isPaying && (
                <div style={{ marginTop: '8px' }}>
                    <div style={{ height: '5px', borderRadius: '999px', background: C.surfaceContainer, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (paidSoFar / item.amount) * 100)}%`, background: C.ambar, borderRadius: '999px' }} />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: C.outline, marginTop: '3px', fontWeight: 600 }}>
                        Abonado {money(paidSoFar)} de {money(item.amount)} · falta {money(pending)}
                    </div>
                </div>
            )}

            {esGasto && item.totalAmount != null && (
                <div style={{ marginTop: '8px' }}>
                    <div style={{ height: '5px', borderRadius: '999px', background: C.surfaceContainer, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, ((item.paidToDate ?? 0) / item.totalAmount) * 100)}%`, background: item.active ? C.primary : C.verde, borderRadius: '999px' }} />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: C.outline, marginTop: '3px', fontWeight: 600 }}>
                        {item.active
                            ? `${money(item.paidToDate ?? 0)} de ${money(item.totalAmount)} · faltan ${money(Math.max(0, item.totalAmount - (item.paidToDate ?? 0)))}`
                            : `Deuda saldada · ${money(item.totalAmount)} pagados en total`}
                    </div>
                </div>
            )}

            {item.pendingPeriods && item.pendingPeriods.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
                    {item.pendingPeriods.map((p: { period: string; amountPaid: number }) => (
                        <PeriodoPendienteFila
                            key={p.period}
                            item={item}
                            entry={p}
                            accounts={accounts}
                            onPagar={(monto: number, accountId?: number) => onPagarPeriodoPendiente(p.period, monto, accountId)}
                            onDeshacer={() => onDeshacerPeriodoPendiente(p.period)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const PeriodoPendienteFila = ({ item, entry, accounts, onPagar, onDeshacer }: any) => {
    const [isPaying, setIsPaying] = useState(false);
    const pending = Math.max(0, item.amount - entry.amountPaid);
    const [payAmount, setPayAmount] = useState(pending.toFixed(2));
    const [payAccountId, setPayAccountId] = useState<number | undefined>(item.accountId);

    const openPay = () => { setPayAmount(pending.toFixed(2)); setPayAccountId(item.accountId); setIsPaying(true); };
    const confirmPay = () => {
        const value = parseFloat(payAmount);
        if (!value || value <= 0 || !payAccountId) return;
        onPagar(value, payAccountId);
        setIsPaying(false);
    };

    return (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '9px', padding: '7px 9px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.rojo }}>
                    {pendingPeriodLabel(entry.period)} · falta {money(pending)}
                    {entry.amountPaid > 0 && <span style={{ color: C.outline, fontWeight: 600 }}> (abonado {money(entry.amountPaid)})</span>}
                </div>
                {!isPaying && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <button onClick={openPay} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.secondary, fontSize: '0.72rem', fontWeight: 800 }}>Pagar</button>
                        {entry.amountPaid > 0 && (
                            <button onClick={onDeshacer} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.outline, fontSize: '0.68rem', fontWeight: 700 }}>Deshacer</button>
                        )}
                    </div>
                )}
            </div>
            {isPaying && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {!item.accountId && (
                        <select autoFocus value={payAccountId ?? ''} onChange={e => setPayAccountId(e.target.value ? Number(e.target.value) : undefined)} style={{ padding: '6px', borderRadius: '7px', border: `1px solid ${!payAccountId ? C.rojo : C.outlineVariant}`, fontSize: '0.75rem', fontWeight: 700, outline: 'none', background: 'white', cursor: 'pointer' }}>
                            <option value="">¿De qué cuenta sale?</option>
                            {accounts?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    )}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', fontWeight: 700, color: C.onSurfaceVariant }}>S/</span>
                            <input autoFocus={!!item.accountId} type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmPay()} style={{ width: '100%', padding: '6px 6px 6px 26px', borderRadius: '7px', border: `1px solid ${C.outlineVariant}`, fontSize: '0.8rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <button onClick={() => setPayAmount(pending.toFixed(2))} style={{ padding: '6px 8px', borderRadius: '7px', border: 'none', background: C.surfaceContainerHigh, color: C.onSurfaceVariant, fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>Todo</button>
                        <button onClick={confirmPay} disabled={!payAccountId} title={!payAccountId ? 'Elige primero de qué cuenta sale' : undefined} style={{ padding: '6px 10px', borderRadius: '7px', border: 'none', background: payAccountId ? C.verde : C.outlineVariant, color: 'white', fontSize: '0.7rem', fontWeight: 800, cursor: payAccountId ? 'pointer' : 'not-allowed' }}>Pagar</button>
                        <button onClick={() => setIsPaying(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outlineVariant, padding: '4px', display: 'flex' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

/* Formulario de edición in-place, compartido por gastos e ingresos fijos.
   El préstamo a plazos (contact/totalAmount) solo aplica a gastos. */
const FilaFijoEditForm = ({ item, esGasto, accounts, onCancel, onGuardar }: any) => {
    const [nombre, setNombre] = useState(item.text ?? item.name ?? '');
    const [monto, setMonto] = useState(String(item.amount));
    const [accountId, setAccountId] = useState<number | undefined>(item.accountId);
    const [frequency, setFrequency] = useState<'monthly' | 'weekly'>(item.frequency ?? 'monthly');
    const [dueDay, setDueDay] = useState<number | undefined>(item.dueDay);
    const [dueWeekday, setDueWeekday] = useState<number>(item.dueWeekday ?? 1);
    const [esPrestamo, setEsPrestamo] = useState(item.totalAmount != null);
    const [contact, setContact] = useState(item.contact ?? '');
    const [totalAmount, setTotalAmount] = useState(item.totalAmount != null ? String(item.totalAmount) : '');

    const guardar = () => {
        const montoNum = parseFloat(monto);
        if (!nombre.trim() || !montoNum || montoNum <= 0) return;
        const total = esGasto && esPrestamo && totalAmount ? Number(totalAmount) : undefined;
        const updates: any = {
            amount: montoNum, accountId, frequency,
            dueDay: frequency === 'monthly' ? dueDay : undefined,
            dueWeekday: frequency === 'weekly' ? dueWeekday : undefined,
        };
        if (esGasto) {
            updates.text = nombre.trim();
            updates.contact = esPrestamo ? (contact.trim() || undefined) : undefined;
            updates.totalAmount = total;
            updates.paidToDate = total != null ? (item.paidToDate ?? 0) : undefined;
        } else {
            updates.name = nombre.trim();
        }
        onGuardar(updates);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', padding: '10px 2px 14px', marginBottom: '6px', borderRadius: '10px', background: C.surfaceContainerLow, border: `1.5px solid ${C.primary}` }}>
            <div>
                <label style={campoLabel}>Nombre</label>
                <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)} style={{ ...campo(false), width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
                <label style={campoLabel}>Frecuencia</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {(['monthly', 'weekly'] as const).map(f => (
                        <button key={f} type="button" onClick={() => setFrequency(f)} style={{ flex: 1, padding: '6px', borderRadius: '8px', border: `1px solid ${frequency === f ? C.secondary : C.outlineVariant}`, background: frequency === f ? C.secondary : 'white', color: frequency === f ? 'white' : C.onSurfaceVariant, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                            {f === 'monthly' ? 'Mensual' : 'Semanal'}
                        </button>
                    ))}
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
                <div>
                    <label style={campoLabel}>Monto</label>
                    <input type="number" value={monto} onChange={e => setMonto(e.target.value)} style={{ ...campo(false), width: '100%', boxSizing: 'border-box' }} />
                </div>
                {frequency === 'weekly' ? (
                    <div>
                        <label style={campoLabel}>Día de la semana</label>
                        <select value={dueWeekday} onChange={e => setDueWeekday(Number(e.target.value))} style={{ ...campo(false), width: '100%', boxSizing: 'border-box', fontWeight: 700, cursor: 'pointer' }}>
                            {WEEKDAYS.map((w, i) => <option key={i} value={i}>{w}</option>)}
                        </select>
                    </div>
                ) : (
                    <div>
                        <label style={campoLabel}>Día de cobro</label>
                        <input type="number" min="1" max="31" placeholder="—" value={dueDay ?? ''} onChange={e => setDueDay(e.target.value ? Number(e.target.value) : undefined)} style={{ ...campo(false), width: '100%', boxSizing: 'border-box' }} />
                    </div>
                )}
            </div>
            {accounts?.length > 0 && (
                <div>
                    <label style={campoLabel}>Cuenta</label>
                    <select value={accountId ?? ''} onChange={e => setAccountId(e.target.value ? Number(e.target.value) : undefined)} style={{ ...campo(false), width: '100%', boxSizing: 'border-box', fontWeight: 700, cursor: 'pointer' }}>
                        <option value="">Sin cuenta asignada</option>
                        {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
            )}
            {esGasto && (
                <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: C.onSurfaceVariant, cursor: 'pointer' }}>
                        <input type="checkbox" checked={esPrestamo} onChange={e => setEsPrestamo(e.target.checked)} />
                        Es un préstamo/deuda a plazos
                    </label>
                    {esPrestamo && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', background: C.surfaceContainerHigh, padding: '9px', borderRadius: '9px' }}>
                            <div>
                                <label style={campoLabel}>¿A quién se le debe?</label>
                                <input placeholder="Ej. Pandero de Julia" value={contact} onChange={e => setContact(e.target.value)} style={{ ...campo(false), width: '100%', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={campoLabel}>Monto total de la deuda</label>
                                <input type="number" placeholder="Ej. 900" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} style={{ ...campo(false), width: '100%', boxSizing: 'border-box' }} />
                                {item.totalAmount != null && (
                                    <div style={{ fontSize: '0.66rem', color: C.outline, marginTop: '3px' }}>Pagado hasta ahora: {money(item.paidToDate ?? 0)}</div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '2px' }}>
                <button onClick={onCancel} style={{ background: 'none', border: `1px solid ${C.outlineVariant}`, color: C.onSurfaceVariant, borderRadius: '9px', padding: '7px 14px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={guardar} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: '9px', padding: '7px 14px', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}>Guardar</button>
            </div>
        </div>
    );
};

/* Formulario de alta rápida (nuevo gasto o ingreso fijo). */
interface NuevoFijoValues {
    nombre: string; monto: number; accountId?: number;
    frequency: 'monthly' | 'weekly'; dueDay?: number; dueWeekday: number;
    esPrestamo: boolean; contact: string; totalAmount?: number;
}

const NuevoFijoForm = ({ movil, accounts, placeholderNombre, conPrestamo, onSubmit }: {
    movil: boolean; accounts: Account[]; placeholderNombre: string; conPrestamo?: boolean;
    onSubmit: (v: NuevoFijoValues) => void;
}) => {
    const [nombre, setNombre] = useState('');
    const [monto, setMonto] = useState('');
    const [accountId, setAccountId] = useState('');
    const [frequency, setFrequency] = useState<'monthly' | 'weekly'>('monthly');
    const [dueDay, setDueDay] = useState('');
    const [dueWeekday, setDueWeekday] = useState(1);
    const [esPrestamo, setEsPrestamo] = useState(false);
    const [contact, setContact] = useState('');
    const [totalAmount, setTotalAmount] = useState('');

    const montoNum = parseFloat(monto);
    const puedeGuardar = nombre.trim() && montoNum > 0;

    const submit = () => {
        if (!puedeGuardar) return;
        onSubmit({
            nombre: nombre.trim(), monto: montoNum,
            accountId: accountId ? Number(accountId) : undefined,
            frequency, dueDay: dueDay ? Number(dueDay) : undefined, dueWeekday,
            esPrestamo, contact,
            totalAmount: totalAmount ? parseFloat(totalAmount) : undefined,
        });
    };

    return (
        <form onSubmit={e => { e.preventDefault(); submit(); }} style={{
            display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px',
            padding: '10px', background: C.surfaceContainerLow,
            border: `1.5px dashed ${C.outlineVariant}`, borderRadius: '12px',
        }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexDirection: movil ? 'column' : 'row' }}>
                <input
                    autoFocus
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder={placeholderNombre}
                    style={{ ...campo(movil), flex: movil ? undefined : '1 1 140px', width: movil ? '100%' : undefined, border: movil ? `1px solid ${C.outlineVariant}` : 'none', background: movil ? C.surfaceLowest : 'transparent' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        value={monto}
                        onChange={e => setMonto(e.target.value)}
                        placeholder="S/"
                        type="number" min="0" step="0.01"
                        inputMode="decimal"
                        style={{ ...campo(movil), width: movil ? '100%' : '80px', flex: movil ? 1 : undefined }}
                    />
                    {accounts.length > 0 && (
                        <select
                            value={accountId}
                            onChange={e => setAccountId(e.target.value)}
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
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {(['monthly', 'weekly'] as const).map(f => (
                        <button key={f} type="button" onClick={() => setFrequency(f)} style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid ${frequency === f ? C.secondary : C.outlineVariant}`, background: frequency === f ? C.secondary : 'white', color: frequency === f ? 'white' : C.onSurfaceVariant, fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
                            {f === 'monthly' ? 'Mensual' : 'Semanal'}
                        </button>
                    ))}
                </div>
                {frequency === 'weekly' ? (
                    <select value={dueWeekday} onChange={e => setDueWeekday(Number(e.target.value))} style={{ padding: '5px 8px', borderRadius: '7px', border: `1px solid ${C.outlineVariant}`, fontSize: '0.72rem', fontWeight: 700, background: 'white', cursor: 'pointer' }}>
                        {WEEKDAYS.map((w, i) => <option key={i} value={i}>{w}</option>)}
                    </select>
                ) : (
                    <input type="number" min="1" max="31" placeholder="Día de cobro" value={dueDay} onChange={e => setDueDay(e.target.value)} style={{ padding: '5px 8px', borderRadius: '7px', border: `1px solid ${C.outlineVariant}`, fontSize: '0.72rem', fontWeight: 700, width: '110px' }} />
                )}
            </div>

            {conPrestamo && (
                <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: C.onSurfaceVariant, cursor: 'pointer' }}>
                        <input type="checkbox" checked={esPrestamo} onChange={e => setEsPrestamo(e.target.checked)} />
                        Es un préstamo/deuda a plazos (pandero, préstamo, etc.)
                    </label>
                    {esPrestamo && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <input placeholder="¿A quién se le debe?" value={contact} onChange={e => setContact(e.target.value)} style={{ ...campo(movil), flex: '1 1 140px' }} />
                            <input type="number" placeholder="Monto total (ej. 900)" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} style={{ ...campo(movil), width: movil ? '100%' : '150px' }} />
                        </div>
                    )}
                </>
            )}

            <button type="submit" disabled={!puedeGuardar} style={{
                alignSelf: 'flex-end',
                background: puedeGuardar ? C.primary : C.surfaceContainerHigh,
                color: puedeGuardar ? '#fff' : C.onSurfaceVariant,
                border: 'none', borderRadius: '8px',
                padding: movil ? '12px 14px' : '5px 14px',
                minHeight: movil ? `${TOQUE_MINIMO}px` : undefined,
                fontSize: movil ? '0.9rem' : '0.8rem', fontWeight: 700, fontFamily: 'inherit',
                cursor: puedeGuardar ? 'pointer' : 'default',
            }}>Añadir</button>
        </form>
    );
};
