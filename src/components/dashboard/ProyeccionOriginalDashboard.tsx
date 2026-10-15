import { useState, useMemo } from 'react';
import { Plus, Trash2, RotateCcw, FlaskConical, Calculator as CalculatorIcon, Delete } from 'lucide-react';
import type { FixedExpense, UserPreferences } from '../../hooks/useAlDiaState';

interface Props {
    fixedExpenses: FixedExpense[];
    fixedIncomeItems: { id: number; name: string; amount: number; active: boolean; lastReceivedMonth?: string }[];
    currentMonthStr: string;
    currentBalance: number;
    preferences: UserPreferences;
    updatePreference: (key: keyof UserPreferences, value: any) => void;
}

const CARD: React.CSSProperties = {
    background: "#FFFFFF",
    borderRadius: "16px",
    padding: "1.5rem",
    border: "1px solid #DCE7E1",
    boxShadow: "0px 4px 12px rgba(15,23,42,0.04)",
};
const LABEL: React.CSSProperties = {
    fontSize: "0.68rem",
    fontWeight: 800,
    color: "#6C8079",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
};

const CALC_KEYS: Array<{ label: string; kind: 'digit' | 'op' | 'dot' | 'clear' | 'back' | 'equals' }> = [
    { label: 'C', kind: 'clear' }, { label: '←', kind: 'back' }, { label: '%', kind: 'op' }, { label: '÷', kind: 'op' },
    { label: '7', kind: 'digit' }, { label: '8', kind: 'digit' }, { label: '9', kind: 'digit' }, { label: '×', kind: 'op' },
    { label: '4', kind: 'digit' }, { label: '5', kind: 'digit' }, { label: '6', kind: 'digit' }, { label: '−', kind: 'op' },
    { label: '1', kind: 'digit' }, { label: '2', kind: 'digit' }, { label: '3', kind: 'digit' }, { label: '+', kind: 'op' },
    { label: '0', kind: 'digit' }, { label: '.', kind: 'dot' }, { label: '=', kind: 'equals' },
];

// Calculadora suelta, sin relación con el plan — solo para sacar cuentas al vuelo.
const MiniCalculator = () => {
    const [expr, setExpr] = useState('');

    const press = (key: typeof CALC_KEYS[number]) => {
        if (key.kind === 'clear') { setExpr(''); return; }
        if (key.kind === 'back') { setExpr(e => e.slice(0, -1)); return; }
        if (key.kind === 'equals') {
            if (!expr.trim()) return;
            const safe = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
            if (!/^[0-9+\-*/.%() ]*$/.test(safe)) { setExpr(''); return; }
            try {
                // eslint-disable-next-line no-new-func
                const result = Function(`"use strict"; return (${safe})`)();
                setExpr(Number.isFinite(result) ? String(Math.round(result * 100) / 100) : '');
            } catch { setExpr(''); }
            return;
        }
        setExpr(e => e + key.label);
    };

    return (
        <div style={{ ...CARD, width: '260px', flexShrink: 0, alignSelf: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <CalculatorIcon size={15} color="#F59E0B" />
                <span style={LABEL}>Calculadora</span>
            </div>
            <div style={{ background: '#F7FAF8', borderRadius: '10px', padding: '10px 12px', marginBottom: '10px', minHeight: '2.4rem', fontSize: '1.3rem', fontWeight: 700, color: '#0C2A20', textAlign: 'right', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                {expr || '0'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {CALC_KEYS.map((k, i) => (
                    <button key={i} onClick={() => press(k)} style={{
                        gridColumn: k.label === '=' ? 'span 2' : undefined,
                        padding: '10px 0',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        background: k.kind === 'equals' ? '#F59E0B' : k.kind === 'op' ? '#FEF3C7' : k.kind === 'clear' ? '#FEE2E2' : '#F7FAF8',
                        color: k.kind === 'equals' ? '#fff' : k.kind === 'clear' ? '#C63C3C' : '#0C2A20',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {k.kind === 'back' ? <Delete size={15} /> : k.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const ProyeccionOriginalDashboard = ({ fixedExpenses, fixedIncomeItems, currentBalance, preferences, updatePreference }: Props) => {

    /* ── Plan del mes: tu propio plan editable, para jugar "¿y si...?".
       Se siembra una vez desde los gastos/ingresos fijos reales, pero de ahí en
       más vive guardado en preferences (Firestore) — lo que agregues, borres o
       marques se conserva entre sesiones. "Reiniciar" vuelve a sembrar desde
       los datos reales de hoy. Nada de esto toca transacciones ni gastos/
       ingresos fijos reales: es una copia aparte. ── */
    type SimFixedExpense = { id: number; text: string; amount: number; active: boolean; dueDay?: number; lastPaidMonth?: string; custom?: boolean; excluido?: boolean };
    type SimFixedIncome = { id: number; name: string; amount: number; active: boolean; lastReceivedMonth?: string; custom?: boolean; excluido?: boolean };
    type Plan = { fixedExpenses: SimFixedExpense[]; fixedIncomes: SimFixedIncome[]; usarSaldo?: boolean };

    const seedPlan = (): Plan => ({
        fixedExpenses: fixedExpenses.filter(f => f.active).map(f => ({ id: f.id, text: f.text, amount: f.amount, active: f.active, dueDay: f.dueDay, lastPaidMonth: f.lastPaidMonth })),
        fixedIncomes: fixedIncomeItems.filter(f => f.active).map(f => ({ id: f.id, name: f.name, amount: f.amount, active: f.active, lastReceivedMonth: f.lastReceivedMonth })),
    });

    const plan: Plan = useMemo(() => {
        try {
            const parsed = preferences.planDelMes ? JSON.parse(preferences.planDelMes) : null;
            if (parsed && Array.isArray(parsed.fixedExpenses) && Array.isArray(parsed.fixedIncomes)) {
                let fe: SimFixedExpense[] = parsed.fixedExpenses;
                let fi: SimFixedIncome[] = parsed.fixedIncomes;
                // Migración: la sección "Simular otro movimiento" (separada) se eliminó;
                // lo que hubiera quedado ahí guardado se suma directo a las listas de arriba.
                if (Array.isArray(parsed.movs) && parsed.movs.length > 0) {
                    for (const m of parsed.movs) {
                        if (m.type === 'gasto') fe = [...fe, { id: m.id, text: m.text, amount: m.amount, active: true, custom: true }];
                        else fi = [...fi, { id: m.id, name: m.text, amount: m.amount, active: true, custom: true }];
                    }
                }
                return { fixedExpenses: fe, fixedIncomes: fi, usarSaldo: !!parsed.usarSaldo };
            }
        } catch { /* si el JSON guardado quedó corrupto, se re-siembra abajo */ }
        return seedPlan();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preferences.planDelMes]);

    const savePlan = (next: Plan) => updatePreference('planDelMes', JSON.stringify(next));

    const [nuevoGasto, setNuevoGasto] = useState({ text: '', amount: '', cantidad: '' });
    const [usarCantidadGasto, setUsarCantidadGasto] = useState(false);
    const nuevoGastoTotal = usarCantidadGasto ? (parseFloat(nuevoGasto.cantidad) || 0) * (parseFloat(nuevoGasto.amount) || 0) : (parseFloat(nuevoGasto.amount) || 0);

    const [nuevoIngresoFijo, setNuevoIngresoFijo] = useState({ name: '', amount: '', cantidad: '' });
    const [usarCantidadIngreso, setUsarCantidadIngreso] = useState(false);
    const nuevoIngresoTotal = usarCantidadIngreso ? (parseFloat(nuevoIngresoFijo.cantidad) || 0) * (parseFloat(nuevoIngresoFijo.amount) || 0) : (parseFloat(nuevoIngresoFijo.amount) || 0);

    const reiniciarSimulacion = () => savePlan({ ...seedPlan(), usarSaldo: plan.usarSaldo });

    const simFijosTotal = useMemo(() => plan.fixedExpenses.filter(f => !f.excluido).reduce((s, f) => s + (Number(f.amount) || 0), 0), [plan.fixedExpenses]);

    const simIngresoPrevisto = useMemo(() => plan.fixedIncomes.filter(f => !f.excluido).reduce((s, f) => s + (Number(f.amount) || 0), 0), [plan.fixedIncomes]);

    const saldoBase = plan.usarSaldo ? currentBalance : 0;
    const simQueda = saldoBase + simIngresoPrevisto - simFijosTotal;

    // Interruptores en bloque: lo que viene de tus fijos reales vs. lo que agregaste vos.
    const gastosReales = plan.fixedExpenses.filter(f => !f.custom);
    const ingresosReales = plan.fixedIncomes.filter(f => !f.custom);
    const propios = [...plan.fixedExpenses, ...plan.fixedIncomes].filter(f => f.custom);
    const gastosRealesOn = gastosReales.length > 0 && gastosReales.every(f => !f.excluido);
    const ingresosRealesOn = ingresosReales.length > 0 && ingresosReales.every(f => !f.excluido);
    const propiosOn = propios.length > 0 && propios.every(f => !f.excluido);
    const toggleReales = (tipo: 'gastos' | 'ingresos', incluir: boolean) => savePlan({
        ...plan,
        fixedExpenses: tipo === 'gastos' ? plan.fixedExpenses.map(f => f.custom ? f : { ...f, excluido: !incluir }) : plan.fixedExpenses,
        fixedIncomes: tipo === 'ingresos' ? plan.fixedIncomes.map(f => f.custom ? f : { ...f, excluido: !incluir }) : plan.fixedIncomes,
    });
    const toggleGrupo = (custom: boolean, incluir: boolean) => savePlan({
        ...plan,
        fixedExpenses: plan.fixedExpenses.map(f => !!f.custom === custom ? { ...f, excluido: !incluir } : f),
        fixedIncomes: plan.fixedIncomes.map(f => !!f.custom === custom ? { ...f, excluido: !incluir } : f),
    });

    // Resultado de solo lo que agregaste vos a mano (no lo sembrado desde tus gastos/ingresos fijos reales).
    const customGastos = useMemo(() => plan.fixedExpenses.filter(f => f.custom && !f.excluido).reduce((s, f) => s + (Number(f.amount) || 0), 0), [plan.fixedExpenses]);
    const customIngresos = useMemo(() => plan.fixedIncomes.filter(f => f.custom && !f.excluido).reduce((s, f) => s + (Number(f.amount) || 0), 0), [plan.fixedIncomes]);
    const hayCustom = customGastos > 0 || customIngresos > 0;
    const customNeto = customIngresos - customGastos;

    const money = (n: number) => `S/ ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

    return (
        <div style={{ paddingBottom: '5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* ── Plan del mes: tu propio plan, con tus datos — no toca nada real ── */}
            <div style={{ ...CARD, borderLeft: "4px solid #F59E0B", flex: '1 1 480px', minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FlaskConical size={15} color="#F59E0B" />
                        <span style={LABEL}>Plan del Mes</span>
                    </div>
                    <button onClick={reiniciarSimulacion} title="Reiniciar plan (vuelve a partir de tus gastos/ingresos fijos reales)" style={{ display: "flex", alignItems: "center", gap: "4px", background: "transparent", border: "1px solid #DCE7E1", borderRadius: "8px", padding: "4px 9px", fontSize: "0.68rem", fontWeight: 700, color: "#6C8079", cursor: "pointer" }}>
                        <RotateCcw size={12} /> Reiniciar
                    </button>
                </div>
                <p style={{ margin: "0 0 1rem", fontSize: "0.72rem", color: "#6C8079" }}>
                    Se guarda solo, no toca tus gastos/ingresos fijos reales. Sumá, borrá o destildá cosas acá para probar "¿y si...?".
                </p>

                <div style={{ background: simQueda < 0 ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)", borderRadius: "12px", padding: "1rem 1.1rem", marginBottom: "1.1rem" }}>
                    <span style={{ ...LABEL, color: simQueda < 0 ? "#C63C3C" : "#0E9F6E" }}>Te quedaría</span>
                    <div style={{ fontSize: "2rem", fontWeight: 900, color: simQueda < 0 ? "#C63C3C" : "#0C2A20", lineHeight: 1, margin: "4px 0 8px" }}>
                        {simQueda < 0 ? "−" : ""}{money(Math.abs(simQueda))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: "0.72rem", color: "#6C8079" }}>
                        {plan.usarSaldo && <span>Saldo: <b style={{ color: "#0C2A20" }}>{money(currentBalance)}</b></span>}
                        <span>Ingresos: <b style={{ color: "#0C2A20" }}>+{money(simIngresoPrevisto)}</b></span>
                        <span>Gastos: <b style={{ color: "#0C2A20" }}>−{money(simFijosTotal)}</b></span>
                    </div>
                </div>

                {/* Qué se aplica a la proyección */}
                <div style={{ marginBottom: "1.1rem" }}>
                    <span style={{ ...LABEL, display: "block", marginBottom: "6px" }}>Qué aplicar a la proyección</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {([
                            { key: 'saldo', texto: `Mi saldo actual (${money(currentBalance)})`, on: !!plan.usarSaldo, disabled: false, set: (v: boolean) => savePlan({ ...plan, usarSaldo: v }) },
                            { key: 'gastos', texto: 'Mis gastos fijos', on: gastosRealesOn, disabled: gastosReales.length === 0, set: (v: boolean) => toggleReales('gastos', v) },
                            { key: 'ingresos', texto: 'Mis ingresos fijos', on: ingresosRealesOn, disabled: ingresosReales.length === 0, set: (v: boolean) => toggleReales('ingresos', v) },
                            { key: 'propios', texto: 'Lo que agregué yo', on: propiosOn, disabled: propios.length === 0, set: (v: boolean) => toggleGrupo(true, v) },
                        ]).map(o => (
                            <label key={o.key} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", borderRadius: "999px", cursor: o.disabled ? "default" : "pointer", opacity: o.disabled ? 0.45 : 1, background: o.on ? "rgba(15,169,122,0.10)" : "#F7FAF8", border: `1px solid ${o.on ? "#0FA97A" : "#DCE7E1"}`, fontSize: "0.74rem", fontWeight: 700, color: "#0C2A20" }}>
                                <input type="checkbox" checked={o.on} disabled={o.disabled} onChange={e => o.set(e.target.checked)} style={{ accentColor: "#0FA97A" }} />
                                {o.texto}
                            </label>
                        ))}
                    </div>
                </div>

                {hayCustom && (
                    <div style={{ background: "rgba(245,158,11,0.08)", borderRadius: "12px", padding: "0.8rem 1.1rem", marginBottom: "1.1rem" }}>
                        <span style={{ ...LABEL, color: "#B45309" }}>Resultado de solo lo que agregaste vos</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: "0.78rem", color: "#6C8079", marginTop: "4px" }}>
                            <span>Ingresos: <b style={{ color: "#0E9F6E" }}>+{money(customIngresos)}</b></span>
                            <span>Gastos: <b style={{ color: "#C63C3C" }}>−{money(customGastos)}</b></span>
                            <span>Neto: <b style={{ color: customNeto < 0 ? "#C63C3C" : "#0E9F6E" }}>{customNeto < 0 ? "−" : "+"}{money(Math.abs(customNeto))}</b></span>
                        </div>
                    </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>

                    {/* Gastos fijos simulados */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "4px" }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0C2A20" }}>Gastos fijos</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#6C8079" }}>{plan.fixedExpenses.filter(f => !f.excluido).length}/{plan.fixedExpenses.length} en cuenta</span>
                                <button type="button" onClick={() => setUsarCantidadGasto(v => !v)} title="Cargar por cantidad × precio unitario (ej: 5 × S/10)" style={{ display: "flex", alignItems: "center", gap: "3px", background: usarCantidadGasto ? "#F59E0B" : "transparent", color: usarCantidadGasto ? "#fff" : "#6C8079", border: usarCantidadGasto ? "none" : "1px solid #DCE7E1", borderRadius: "6px", padding: "2px 6px", fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}>
                                    Cant. × precio
                                </button>
                            </div>
                        </div>
                        {plan.fixedExpenses.length === 0 && <p style={{ fontSize: "0.72rem", color: "#6C8079", margin: 0 }}>Sin gastos fijos activos.</p>}
                        {plan.fixedExpenses.map(f => {
                            return (
                                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 9px", marginBottom: "4px", borderRadius: "8px", background: "#F7FAF8", opacity: f.excluido ? 0.4 : 1 }}>
                                    <input type="checkbox" checked={!f.excluido} title="Contar en la proyección" onChange={e => savePlan({ ...plan, fixedExpenses: plan.fixedExpenses.map(x => x.id === f.id ? { ...x, excluido: !e.target.checked } : x) })} style={{ accentColor: "#0FA97A", flexShrink: 0 }} />
                                    <span style={{ flex: 1, fontSize: "0.8rem", fontWeight: 600, color: "#0C2A20", textDecoration: f.excluido ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.text}{f.custom && <span style={{ marginLeft: 6, fontSize: "0.62rem", fontWeight: 700, color: "#B45309" }}>tuyo</span>}</span>
                                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0C2A20" }}>{money(f.amount)}</span>
                                    <button onClick={() => savePlan({ ...plan, fixedExpenses: plan.fixedExpenses.filter(x => x.id !== f.id) })} style={{ background: "none", border: "none", color: "#6C8079", cursor: "pointer", display: "flex", flexShrink: 0 }}><Trash2 size={13} /></button>
                                </div>
                            );
                        })}
                        <form onSubmit={e => {
                            e.preventDefault();
                            const monto = nuevoGastoTotal;
                            if (!nuevoGasto.text.trim() || !monto) return;
                            savePlan({ ...plan, fixedExpenses: [...plan.fixedExpenses, { id: Date.now(), text: nuevoGasto.text.trim(), amount: monto, active: true, custom: true }] });
                            setNuevoGasto({ text: "", amount: "", cantidad: "" });
                        }} style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap", alignItems: "center" }}>
                            <input value={nuevoGasto.text} onChange={e => setNuevoGasto(v => ({ ...v, text: e.target.value }))} placeholder="Nuevo gasto fijo…" style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: "7px", border: "1px solid #DCE7E1", fontSize: "0.78rem", outline: "none" }} />
                            {usarCantidadGasto ? (
                                <>
                                    <input value={nuevoGasto.cantidad} onChange={e => setNuevoGasto(v => ({ ...v, cantidad: e.target.value }))} type="number" placeholder="Cant." style={{ width: "55px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #DCE7E1", fontSize: "0.78rem", outline: "none" }} />
                                    <span style={{ fontSize: "0.72rem", color: "#6C8079" }}>×</span>
                                    <input value={nuevoGasto.amount} onChange={e => setNuevoGasto(v => ({ ...v, amount: e.target.value }))} type="number" placeholder="S/ c/u" style={{ width: "65px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #DCE7E1", fontSize: "0.78rem", outline: "none" }} />
                                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0C2A20" }}>= {money(nuevoGastoTotal)}</span>
                                </>
                            ) : (
                                <input value={nuevoGasto.amount} onChange={e => setNuevoGasto(v => ({ ...v, amount: e.target.value }))} type="number" placeholder="S/" style={{ width: "70px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #DCE7E1", fontSize: "0.78rem", outline: "none" }} />
                            )}
                            <button type="submit" style={{ background: "#F59E0B", color: "#fff", border: "none", borderRadius: "7px", padding: "0 10px", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}><Plus size={14} /></button>
                        </form>
                    </div>

                    {/* Ingresos fijos simulados */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "4px" }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0C2A20" }}>Ingresos fijos</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#6C8079" }}>{plan.fixedIncomes.filter(f => !f.excluido).length}/{plan.fixedIncomes.length} en cuenta</span>
                                <button type="button" onClick={() => setUsarCantidadIngreso(v => !v)} title="Cargar por cantidad × precio unitario (ej: 5 × S/10)" style={{ display: "flex", alignItems: "center", gap: "3px", background: usarCantidadIngreso ? "#F59E0B" : "transparent", color: usarCantidadIngreso ? "#fff" : "#6C8079", border: usarCantidadIngreso ? "none" : "1px solid #DCE7E1", borderRadius: "6px", padding: "2px 6px", fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}>
                                    Cant. × precio
                                </button>
                            </div>
                        </div>
                        {plan.fixedIncomes.length === 0 && <p style={{ fontSize: "0.72rem", color: "#6C8079", margin: 0 }}>Sin ingresos fijos activos.</p>}
                        {plan.fixedIncomes.map(f => {
                            return (
                                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 9px", marginBottom: "4px", borderRadius: "8px", background: "#F7FAF8", opacity: f.excluido ? 0.4 : 1 }}>
                                    <input type="checkbox" checked={!f.excluido} title="Contar en la proyección" onChange={e => savePlan({ ...plan, fixedIncomes: plan.fixedIncomes.map(x => x.id === f.id ? { ...x, excluido: !e.target.checked } : x) })} style={{ accentColor: "#0FA97A", flexShrink: 0 }} />
                                    <span style={{ flex: 1, fontSize: "0.8rem", fontWeight: 600, color: "#0C2A20", textDecoration: f.excluido ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}{f.custom && <span style={{ marginLeft: 6, fontSize: "0.62rem", fontWeight: 700, color: "#B45309" }}>tuyo</span>}</span>
                                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0C2A20" }}>{money(f.amount)}</span>
                                    <button onClick={() => savePlan({ ...plan, fixedIncomes: plan.fixedIncomes.filter(x => x.id !== f.id) })} style={{ background: "none", border: "none", color: "#6C8079", cursor: "pointer", display: "flex", flexShrink: 0 }}><Trash2 size={13} /></button>
                                </div>
                            );
                        })}
                        <form onSubmit={e => {
                            e.preventDefault();
                            const monto = nuevoIngresoTotal;
                            if (!nuevoIngresoFijo.name.trim() || !monto) return;
                            savePlan({ ...plan, fixedIncomes: [...plan.fixedIncomes, { id: Date.now(), name: nuevoIngresoFijo.name.trim(), amount: monto, active: true, custom: true }] });
                            setNuevoIngresoFijo({ name: "", amount: "", cantidad: "" });
                        }} style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap", alignItems: "center" }}>
                            <input value={nuevoIngresoFijo.name} onChange={e => setNuevoIngresoFijo(v => ({ ...v, name: e.target.value }))} placeholder="Nuevo ingreso fijo…" style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: "7px", border: "1px solid #DCE7E1", fontSize: "0.78rem", outline: "none" }} />
                            {usarCantidadIngreso ? (
                                <>
                                    <input value={nuevoIngresoFijo.cantidad} onChange={e => setNuevoIngresoFijo(v => ({ ...v, cantidad: e.target.value }))} type="number" placeholder="Cant." style={{ width: "55px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #DCE7E1", fontSize: "0.78rem", outline: "none" }} />
                                    <span style={{ fontSize: "0.72rem", color: "#6C8079" }}>×</span>
                                    <input value={nuevoIngresoFijo.amount} onChange={e => setNuevoIngresoFijo(v => ({ ...v, amount: e.target.value }))} type="number" placeholder="S/ c/u" style={{ width: "65px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #DCE7E1", fontSize: "0.78rem", outline: "none" }} />
                                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0C2A20" }}>= {money(nuevoIngresoTotal)}</span>
                                </>
                            ) : (
                                <input value={nuevoIngresoFijo.amount} onChange={e => setNuevoIngresoFijo(v => ({ ...v, amount: e.target.value }))} type="number" placeholder="S/" style={{ width: "70px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #DCE7E1", fontSize: "0.78rem", outline: "none" }} />
                            )}
                            <button type="submit" style={{ background: "#F59E0B", color: "#fff", border: "none", borderRadius: "7px", padding: "0 10px", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}><Plus size={14} /></button>
                        </form>
                    </div>
                </div>
            </div>

            <MiniCalculator />

        </div>
    );
};
