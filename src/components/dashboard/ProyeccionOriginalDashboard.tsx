import { useState, useMemo } from 'react';
import { Plus, Trash2, RotateCcw, FlaskConical, Calculator as CalculatorIcon, Delete } from 'lucide-react';
import type { FixedExpense, UserPreferences } from '../../hooks/useAlDiaState';

interface Props {
    fixedExpenses: FixedExpense[];
    fixedIncomeItems: { id: number; name: string; amount: number; active: boolean; lastReceivedMonth?: string }[];
    currentMonthStr: string;
    preferences: UserPreferences;
    updatePreference: (key: keyof UserPreferences, value: any) => void;
}

const CARD: React.CSSProperties = {
    background: "#FFFFFF",
    borderRadius: "16px",
    padding: "1.5rem",
    border: "1px solid #E2E8F0",
    boxShadow: "0px 4px 12px rgba(15,23,42,0.04)",
};
const LABEL: React.CSSProperties = {
    fontSize: "0.68rem",
    fontWeight: 800,
    color: "#64748B",
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
            <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '10px 12px', marginBottom: '10px', minHeight: '2.4rem', fontSize: '1.3rem', fontWeight: 700, color: '#0F172A', textAlign: 'right', overflowX: 'auto', whiteSpace: 'nowrap' }}>
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
                        background: k.kind === 'equals' ? '#F59E0B' : k.kind === 'op' ? '#FEF3C7' : k.kind === 'clear' ? '#FEE2E2' : '#F1F5F9',
                        color: k.kind === 'equals' ? '#fff' : k.kind === 'clear' ? '#DC2626' : '#0F172A',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {k.kind === 'back' ? <Delete size={15} /> : k.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const ProyeccionOriginalDashboard = ({ fixedExpenses, fixedIncomeItems, currentMonthStr, preferences, updatePreference }: Props) => {

    /* ── Plan del mes: tu propio plan editable, para jugar "¿y si...?".
       Se siembra una vez desde los gastos/ingresos fijos reales, pero de ahí en
       más vive guardado en preferences (Firestore) — lo que agregues, borres o
       marques se conserva entre sesiones. "Reiniciar" vuelve a sembrar desde
       los datos reales de hoy. Nada de esto toca transacciones ni gastos/
       ingresos fijos reales: es una copia aparte. ── */
    type SimFixedExpense = { id: number; text: string; amount: number; active: boolean; dueDay?: number; lastPaidMonth?: string; custom?: boolean };
    type SimFixedIncome = { id: number; name: string; amount: number; active: boolean; lastReceivedMonth?: string; custom?: boolean };
    type Plan = { fixedExpenses: SimFixedExpense[]; fixedIncomes: SimFixedIncome[] };

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
                return { fixedExpenses: fe, fixedIncomes: fi };
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

    const reiniciarSimulacion = () => savePlan(seedPlan());

    const simFijosTotal = useMemo(() => plan.fixedExpenses.reduce((s, f) => s + (Number(f.amount) || 0), 0), [plan.fixedExpenses]);
    const simFijosPagados = useMemo(() => plan.fixedExpenses.filter(f => f.lastPaidMonth === currentMonthStr), [plan.fixedExpenses, currentMonthStr]);
    const simFijosPend = useMemo(() => plan.fixedExpenses.filter(f => f.lastPaidMonth !== currentMonthStr), [plan.fixedExpenses, currentMonthStr]);

    const simIngresoPrevisto = useMemo(() => plan.fixedIncomes.reduce((s, f) => s + (Number(f.amount) || 0), 0), [plan.fixedIncomes]);
    const simIngresosRecibidos = useMemo(() => plan.fixedIncomes.filter(f => f.lastReceivedMonth === currentMonthStr), [plan.fixedIncomes, currentMonthStr]);
    const simIngresosPend = useMemo(() => plan.fixedIncomes.filter(f => f.lastReceivedMonth !== currentMonthStr), [plan.fixedIncomes, currentMonthStr]);

    const simQueda = simIngresoPrevisto - simFijosTotal;

    // Resultado de solo lo que agregaste vos a mano (no lo sembrado desde tus gastos/ingresos fijos reales).
    const customGastos = useMemo(() => plan.fixedExpenses.filter(f => f.custom).reduce((s, f) => s + (Number(f.amount) || 0), 0), [plan.fixedExpenses]);
    const customIngresos = useMemo(() => plan.fixedIncomes.filter(f => f.custom).reduce((s, f) => s + (Number(f.amount) || 0), 0), [plan.fixedIncomes]);
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
                    <button onClick={reiniciarSimulacion} title="Reiniciar plan (vuelve a partir de tus gastos/ingresos fijos reales)" style={{ display: "flex", alignItems: "center", gap: "4px", background: "transparent", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "4px 9px", fontSize: "0.68rem", fontWeight: 700, color: "#64748B", cursor: "pointer" }}>
                        <RotateCcw size={12} /> Reiniciar
                    </button>
                </div>
                <p style={{ margin: "0 0 1rem", fontSize: "0.72rem", color: "#94A3B8" }}>
                    Se guarda solo, no toca tus gastos/ingresos fijos reales. Sumá, borrá o marcá cosas acá para probar "¿y si...?".
                </p>

                <div style={{ background: simQueda < 0 ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)", borderRadius: "12px", padding: "1rem 1.1rem", marginBottom: "1.1rem" }}>
                    <span style={{ ...LABEL, color: simQueda < 0 ? "#EF4444" : "#10B981" }}>Te quedaría</span>
                    <div style={{ fontSize: "2rem", fontWeight: 900, color: simQueda < 0 ? "#EF4444" : "#0F172A", lineHeight: 1, margin: "4px 0 8px" }}>
                        {simQueda < 0 ? "−" : ""}{money(Math.abs(simQueda))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: "0.72rem", color: "#64748B" }}>
                        <span>Ingresos: <b style={{ color: "#0F172A" }}>{money(simIngresoPrevisto)}</b></span>
                        <span>Gastos: <b style={{ color: "#0F172A" }}>−{money(simFijosTotal)}</b></span>
                    </div>
                </div>

                {hayCustom && (
                    <div style={{ background: "rgba(245,158,11,0.08)", borderRadius: "12px", padding: "0.8rem 1.1rem", marginBottom: "1.1rem" }}>
                        <span style={{ ...LABEL, color: "#B45309" }}>Resultado de solo lo que agregaste vos</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: "0.78rem", color: "#64748B", marginTop: "4px" }}>
                            <span>Ingresos: <b style={{ color: "#10B981" }}>+{money(customIngresos)}</b></span>
                            <span>Gastos: <b style={{ color: "#EF4444" }}>−{money(customGastos)}</b></span>
                            <span>Neto: <b style={{ color: customNeto < 0 ? "#EF4444" : "#10B981" }}>{customNeto < 0 ? "−" : "+"}{money(Math.abs(customNeto))}</b></span>
                        </div>
                    </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>

                    {/* Gastos fijos simulados */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "4px" }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0F172A" }}>Gastos fijos</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94A3B8" }}>{simFijosPagados.length}/{plan.fixedExpenses.length} pagados</span>
                                <button type="button" onClick={() => setUsarCantidadGasto(v => !v)} title="Cargar por cantidad × precio unitario (ej: 5 × S/10)" style={{ display: "flex", alignItems: "center", gap: "3px", background: usarCantidadGasto ? "#F59E0B" : "transparent", color: usarCantidadGasto ? "#fff" : "#94A3B8", border: usarCantidadGasto ? "none" : "1px solid #E2E8F0", borderRadius: "6px", padding: "2px 6px", fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}>
                                    Cant. × precio
                                </button>
                            </div>
                        </div>
                        {plan.fixedExpenses.length === 0 && <p style={{ fontSize: "0.72rem", color: "#94A3B8", margin: 0 }}>Sin gastos fijos activos.</p>}
                        {[...simFijosPend, ...simFijosPagados].map(f => {
                            const pagado = f.lastPaidMonth === currentMonthStr;
                            return (
                                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 9px", marginBottom: "4px", borderRadius: "8px", background: "#F8FAFC", opacity: pagado ? 0.55 : 1 }}>
                                    <span style={{ flex: 1, fontSize: "0.8rem", fontWeight: 600, color: "#0F172A", textDecoration: pagado ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.text}{f.custom && <span style={{ marginLeft: 6, fontSize: "0.62rem", fontWeight: 700, color: "#B45309" }}>tuyo</span>}</span>
                                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0F172A" }}>{money(f.amount)}</span>
                                    <button onClick={() => savePlan({ ...plan, fixedExpenses: plan.fixedExpenses.map(x => x.id === f.id ? { ...x, lastPaidMonth: pagado ? undefined : currentMonthStr } : x) })}
                                        style={{ background: pagado ? "transparent" : "#10B981", color: pagado ? "#94A3B8" : "#fff", border: pagado ? "1px solid #E2E8F0" : "none", borderRadius: "6px", padding: "3px 8px", fontSize: "0.65rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                                        {pagado ? "Deshacer" : "Pagué"}
                                    </button>
                                    <button onClick={() => savePlan({ ...plan, fixedExpenses: plan.fixedExpenses.filter(x => x.id !== f.id) })} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", display: "flex", flexShrink: 0 }}><Trash2 size={13} /></button>
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
                            <input value={nuevoGasto.text} onChange={e => setNuevoGasto(v => ({ ...v, text: e.target.value }))} placeholder="Nuevo gasto fijo…" style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.78rem", outline: "none" }} />
                            {usarCantidadGasto ? (
                                <>
                                    <input value={nuevoGasto.cantidad} onChange={e => setNuevoGasto(v => ({ ...v, cantidad: e.target.value }))} type="number" placeholder="Cant." style={{ width: "55px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.78rem", outline: "none" }} />
                                    <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>×</span>
                                    <input value={nuevoGasto.amount} onChange={e => setNuevoGasto(v => ({ ...v, amount: e.target.value }))} type="number" placeholder="S/ c/u" style={{ width: "65px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.78rem", outline: "none" }} />
                                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0F172A" }}>= {money(nuevoGastoTotal)}</span>
                                </>
                            ) : (
                                <input value={nuevoGasto.amount} onChange={e => setNuevoGasto(v => ({ ...v, amount: e.target.value }))} type="number" placeholder="S/" style={{ width: "70px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.78rem", outline: "none" }} />
                            )}
                            <button type="submit" style={{ background: "#F59E0B", color: "#fff", border: "none", borderRadius: "7px", padding: "0 10px", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}><Plus size={14} /></button>
                        </form>
                    </div>

                    {/* Ingresos fijos simulados */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "4px" }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0F172A" }}>Ingresos fijos</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94A3B8" }}>{simIngresosRecibidos.length}/{plan.fixedIncomes.length} recibidos</span>
                                <button type="button" onClick={() => setUsarCantidadIngreso(v => !v)} title="Cargar por cantidad × precio unitario (ej: 5 × S/10)" style={{ display: "flex", alignItems: "center", gap: "3px", background: usarCantidadIngreso ? "#F59E0B" : "transparent", color: usarCantidadIngreso ? "#fff" : "#94A3B8", border: usarCantidadIngreso ? "none" : "1px solid #E2E8F0", borderRadius: "6px", padding: "2px 6px", fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}>
                                    Cant. × precio
                                </button>
                            </div>
                        </div>
                        {plan.fixedIncomes.length === 0 && <p style={{ fontSize: "0.72rem", color: "#94A3B8", margin: 0 }}>Sin ingresos fijos activos.</p>}
                        {[...simIngresosPend, ...simIngresosRecibidos].map(f => {
                            const recibido = f.lastReceivedMonth === currentMonthStr;
                            return (
                                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 9px", marginBottom: "4px", borderRadius: "8px", background: "#F8FAFC", opacity: recibido ? 0.55 : 1 }}>
                                    <span style={{ flex: 1, fontSize: "0.8rem", fontWeight: 600, color: "#0F172A", textDecoration: recibido ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}{f.custom && <span style={{ marginLeft: 6, fontSize: "0.62rem", fontWeight: 700, color: "#B45309" }}>tuyo</span>}</span>
                                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0F172A" }}>{money(f.amount)}</span>
                                    <button onClick={() => savePlan({ ...plan, fixedIncomes: plan.fixedIncomes.map(x => x.id === f.id ? { ...x, lastReceivedMonth: recibido ? undefined : currentMonthStr } : x) })}
                                        style={{ background: recibido ? "transparent" : "#10B981", color: recibido ? "#94A3B8" : "#fff", border: recibido ? "1px solid #E2E8F0" : "none", borderRadius: "6px", padding: "3px 8px", fontSize: "0.65rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                                        {recibido ? "Deshacer" : "Recibí"}
                                    </button>
                                    <button onClick={() => savePlan({ ...plan, fixedIncomes: plan.fixedIncomes.filter(x => x.id !== f.id) })} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", display: "flex", flexShrink: 0 }}><Trash2 size={13} /></button>
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
                            <input value={nuevoIngresoFijo.name} onChange={e => setNuevoIngresoFijo(v => ({ ...v, name: e.target.value }))} placeholder="Nuevo ingreso fijo…" style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.78rem", outline: "none" }} />
                            {usarCantidadIngreso ? (
                                <>
                                    <input value={nuevoIngresoFijo.cantidad} onChange={e => setNuevoIngresoFijo(v => ({ ...v, cantidad: e.target.value }))} type="number" placeholder="Cant." style={{ width: "55px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.78rem", outline: "none" }} />
                                    <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>×</span>
                                    <input value={nuevoIngresoFijo.amount} onChange={e => setNuevoIngresoFijo(v => ({ ...v, amount: e.target.value }))} type="number" placeholder="S/ c/u" style={{ width: "65px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.78rem", outline: "none" }} />
                                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0F172A" }}>= {money(nuevoIngresoTotal)}</span>
                                </>
                            ) : (
                                <input value={nuevoIngresoFijo.amount} onChange={e => setNuevoIngresoFijo(v => ({ ...v, amount: e.target.value }))} type="number" placeholder="S/" style={{ width: "70px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.78rem", outline: "none" }} />
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
