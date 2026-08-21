import { useState, useMemo } from 'react';
import { Plus, Trash2, RotateCcw, FlaskConical } from 'lucide-react';
import type { Transaction, FixedExpense } from '../../hooks/useAlDiaState';

interface Props {
    transactions: Transaction[];
    fixedExpenses: FixedExpense[];
    fixedIncomeItems: { id: number; name: string; amount: number; active: boolean; lastReceivedMonth?: string }[];
    currentMonthStr: string;
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

export const ProyeccionOriginalDashboard = ({ transactions, fixedExpenses, fixedIncomeItems, currentMonthStr }: Props) => {

    /* ── Plan del mes: una copia local de los fijos, para armar tu propio plan
       y jugar "¿y si...?" sin tocar nada real. Nada de lo que pase acá se
       guarda en Firestore ni llama a ninguna función de escritura — se
       siembra una vez desde los datos reales y de ahí en más vive solo en
       este componente, hasta que se reinicia a mano. ── */
    type SimFixedExpense = { id: number; text: string; amount: number; active: boolean; dueDay?: number; lastPaidMonth?: string };
    type SimFixedIncome = { id: number; name: string; amount: number; active: boolean; lastReceivedMonth?: string };
    type SimMov = { id: number; text: string; amount: number; type: 'ingreso' | 'gasto' };

    const seedFixedExpenses = (): SimFixedExpense[] => fixedExpenses.filter(f => f.active).map(f => ({ id: f.id, text: f.text, amount: f.amount, active: f.active, dueDay: f.dueDay, lastPaidMonth: f.lastPaidMonth }));
    const seedFixedIncomes = (): SimFixedIncome[] => fixedIncomeItems.filter(f => f.active).map(f => ({ id: f.id, name: f.name, amount: f.amount, active: f.active, lastReceivedMonth: f.lastReceivedMonth }));

    const [simFixedExpenses, setSimFixedExpenses] = useState<SimFixedExpense[]>(seedFixedExpenses);
    const [simFixedIncomes, setSimFixedIncomes] = useState<SimFixedIncome[]>(seedFixedIncomes);
    const [simMovs, setSimMovs] = useState<SimMov[]>([]);
    const [nuevoGasto, setNuevoGasto] = useState({ text: '', amount: '' });
    const [nuevoIngresoFijo, setNuevoIngresoFijo] = useState({ name: '', amount: '' });
    const [nuevoMov, setNuevoMov] = useState({ text: '', amount: '', type: 'gasto' as 'ingreso' | 'gasto' });

    const reiniciarSimulacion = () => {
        setSimFixedExpenses(seedFixedExpenses());
        setSimFixedIncomes(seedFixedIncomes());
        setSimMovs([]);
    };

    const gastoVariableRealMes = useMemo(() =>
        transactions
            .filter(t => t.type === 'gasto' && !t.text?.startsWith('Pago: ') && (t.fullDate || '').startsWith(currentMonthStr))
            .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0),
        [transactions, currentMonthStr]);

    const simFijosTotal = useMemo(() => simFixedExpenses.reduce((s, f) => s + (Number(f.amount) || 0), 0), [simFixedExpenses]);
    const simFijosPagados = useMemo(() => simFixedExpenses.filter(f => f.lastPaidMonth === currentMonthStr), [simFixedExpenses, currentMonthStr]);
    const simFijosPend = useMemo(() => simFixedExpenses.filter(f => f.lastPaidMonth !== currentMonthStr), [simFixedExpenses, currentMonthStr]);

    const simIngresoPrevisto = useMemo(() => simFixedIncomes.reduce((s, f) => s + (Number(f.amount) || 0), 0), [simFixedIncomes]);
    const simIngresosRecibidos = useMemo(() => simFixedIncomes.filter(f => f.lastReceivedMonth === currentMonthStr), [simFixedIncomes, currentMonthStr]);
    const simIngresosPend = useMemo(() => simFixedIncomes.filter(f => f.lastReceivedMonth !== currentMonthStr), [simFixedIncomes, currentMonthStr]);

    const simMovGastos = useMemo(() => simMovs.filter(m => m.type === 'gasto').reduce((s, m) => s + m.amount, 0), [simMovs]);
    const simMovIngresos = useMemo(() => simMovs.filter(m => m.type === 'ingreso').reduce((s, m) => s + m.amount, 0), [simMovs]);

    const simQueda = simIngresoPrevisto + simMovIngresos - simFijosTotal - gastoVariableRealMes - simMovGastos;

    const money = (n: number) => `S/ ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

    return (
        <div style={{ paddingBottom: '5rem' }}>

            {/* ── Plan del mes: tu propio plan, con tus datos — no toca nada real ── */}
            <div style={{ ...CARD, borderLeft: "4px solid #F59E0B" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FlaskConical size={15} color="#F59E0B" />
                        <span style={LABEL}>Plan del Mes</span>
                    </div>
                    <button onClick={reiniciarSimulacion} title="Reiniciar plan" style={{ display: "flex", alignItems: "center", gap: "4px", background: "transparent", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "4px 9px", fontSize: "0.68rem", fontWeight: 700, color: "#64748B", cursor: "pointer" }}>
                        <RotateCcw size={12} /> Reiniciar
                    </button>
                </div>
                <p style={{ margin: "0 0 1rem", fontSize: "0.72rem", color: "#94A3B8" }}>
                    Es una copia de juego: nada de lo que hagas acá se guarda de verdad, solo sirve para proyectar "¿y si...?".
                </p>

                <div style={{ background: simQueda < 0 ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)", borderRadius: "12px", padding: "1rem 1.1rem", marginBottom: "1.1rem" }}>
                    <span style={{ ...LABEL, color: simQueda < 0 ? "#EF4444" : "#10B981" }}>Te quedaría</span>
                    <div style={{ fontSize: "2rem", fontWeight: 900, color: simQueda < 0 ? "#EF4444" : "#0F172A", lineHeight: 1, margin: "4px 0 8px" }}>
                        {simQueda < 0 ? "−" : ""}{money(Math.abs(simQueda))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: "0.72rem", color: "#64748B" }}>
                        <span>Ingresos fijos: <b style={{ color: "#0F172A" }}>{money(simIngresoPrevisto)}</b></span>
                        <span>Gastos fijos: <b style={{ color: "#0F172A" }}>−{money(simFijosTotal)}</b></span>
                        <span>Gastos variables (real, este mes): <b style={{ color: "#0F172A" }}>−{money(gastoVariableRealMes)}</b></span>
                        {simMovs.length > 0 && (
                            <span>Movimientos simulados: <b style={{ color: "#0F172A" }}>{simMovIngresos - simMovGastos >= 0 ? "+" : "−"}{money(Math.abs(simMovIngresos - simMovGastos))}</b></span>
                        )}
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>

                    {/* Gastos fijos simulados */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0F172A" }}>Gastos fijos</span>
                            <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94A3B8" }}>{simFijosPagados.length}/{simFixedExpenses.length} pagados</span>
                        </div>
                        {simFixedExpenses.length === 0 && <p style={{ fontSize: "0.72rem", color: "#94A3B8", margin: 0 }}>Sin gastos fijos activos.</p>}
                        {[...simFijosPend, ...simFijosPagados].map(f => {
                            const pagado = f.lastPaidMonth === currentMonthStr;
                            return (
                                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 9px", marginBottom: "4px", borderRadius: "8px", background: "#F8FAFC", opacity: pagado ? 0.55 : 1 }}>
                                    <span style={{ flex: 1, fontSize: "0.8rem", fontWeight: 600, color: "#0F172A", textDecoration: pagado ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.text}</span>
                                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0F172A" }}>{money(f.amount)}</span>
                                    <button onClick={() => setSimFixedExpenses(list => list.map(x => x.id === f.id ? { ...x, lastPaidMonth: pagado ? undefined : currentMonthStr } : x))}
                                        style={{ background: pagado ? "transparent" : "#10B981", color: pagado ? "#94A3B8" : "#fff", border: pagado ? "1px solid #E2E8F0" : "none", borderRadius: "6px", padding: "3px 8px", fontSize: "0.65rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                                        {pagado ? "Deshacer" : "Pagué"}
                                    </button>
                                    <button onClick={() => setSimFixedExpenses(list => list.filter(x => x.id !== f.id))} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", display: "flex", flexShrink: 0 }}><Trash2 size={13} /></button>
                                </div>
                            );
                        })}
                        <form onSubmit={e => {
                            e.preventDefault();
                            const monto = parseFloat(nuevoGasto.amount);
                            if (!nuevoGasto.text.trim() || !monto) return;
                            setSimFixedExpenses(list => [...list, { id: Date.now(), text: nuevoGasto.text.trim(), amount: monto, active: true }]);
                            setNuevoGasto({ text: "", amount: "" });
                        }} style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                            <input value={nuevoGasto.text} onChange={e => setNuevoGasto(v => ({ ...v, text: e.target.value }))} placeholder="Nuevo gasto fijo…" style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.78rem", outline: "none" }} />
                            <input value={nuevoGasto.amount} onChange={e => setNuevoGasto(v => ({ ...v, amount: e.target.value }))} type="number" placeholder="S/" style={{ width: "70px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.78rem", outline: "none" }} />
                            <button type="submit" style={{ background: "#F59E0B", color: "#fff", border: "none", borderRadius: "7px", padding: "0 10px", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}><Plus size={14} /></button>
                        </form>
                    </div>

                    {/* Ingresos fijos simulados */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0F172A" }}>Ingresos fijos</span>
                            <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94A3B8" }}>{simIngresosRecibidos.length}/{simFixedIncomes.length} recibidos</span>
                        </div>
                        {simFixedIncomes.length === 0 && <p style={{ fontSize: "0.72rem", color: "#94A3B8", margin: 0 }}>Sin ingresos fijos activos.</p>}
                        {[...simIngresosPend, ...simIngresosRecibidos].map(f => {
                            const recibido = f.lastReceivedMonth === currentMonthStr;
                            return (
                                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 9px", marginBottom: "4px", borderRadius: "8px", background: "#F8FAFC", opacity: recibido ? 0.55 : 1 }}>
                                    <span style={{ flex: 1, fontSize: "0.8rem", fontWeight: 600, color: "#0F172A", textDecoration: recibido ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0F172A" }}>{money(f.amount)}</span>
                                    <button onClick={() => setSimFixedIncomes(list => list.map(x => x.id === f.id ? { ...x, lastReceivedMonth: recibido ? undefined : currentMonthStr } : x))}
                                        style={{ background: recibido ? "transparent" : "#10B981", color: recibido ? "#94A3B8" : "#fff", border: recibido ? "1px solid #E2E8F0" : "none", borderRadius: "6px", padding: "3px 8px", fontSize: "0.65rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                                        {recibido ? "Deshacer" : "Recibí"}
                                    </button>
                                    <button onClick={() => setSimFixedIncomes(list => list.filter(x => x.id !== f.id))} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", display: "flex", flexShrink: 0 }}><Trash2 size={13} /></button>
                                </div>
                            );
                        })}
                        <form onSubmit={e => {
                            e.preventDefault();
                            const monto = parseFloat(nuevoIngresoFijo.amount);
                            if (!nuevoIngresoFijo.name.trim() || !monto) return;
                            setSimFixedIncomes(list => [...list, { id: Date.now(), name: nuevoIngresoFijo.name.trim(), amount: monto, active: true }]);
                            setNuevoIngresoFijo({ name: "", amount: "" });
                        }} style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                            <input value={nuevoIngresoFijo.name} onChange={e => setNuevoIngresoFijo(v => ({ ...v, name: e.target.value }))} placeholder="Nuevo ingreso fijo…" style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.78rem", outline: "none" }} />
                            <input value={nuevoIngresoFijo.amount} onChange={e => setNuevoIngresoFijo(v => ({ ...v, amount: e.target.value }))} type="number" placeholder="S/" style={{ width: "70px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.78rem", outline: "none" }} />
                            <button type="submit" style={{ background: "#F59E0B", color: "#fff", border: "none", borderRadius: "7px", padding: "0 10px", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}><Plus size={14} /></button>
                        </form>
                    </div>
                </div>

                {/* Movimientos sueltos simulados */}
                <div style={{ marginTop: "1rem", borderTop: "1px solid #E2E8F0", paddingTop: "0.9rem" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0F172A" }}>Simular otro movimiento</span>
                    <p style={{ margin: "2px 0 8px", fontSize: "0.7rem", color: "#94A3B8" }}>Para probar "¿y si me entra/sale esto también?" sin registrarlo de verdad.</p>
                    {simMovs.map(m => (
                        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 9px", marginBottom: "4px", borderRadius: "8px", background: "#F8FAFC" }}>
                            <span style={{ flex: 1, fontSize: "0.78rem", fontWeight: 600, color: "#0F172A" }}>{m.text}</span>
                            <span style={{ fontSize: "0.76rem", fontWeight: 700, color: m.type === "ingreso" ? "#10B981" : "#EF4444" }}>{m.type === "ingreso" ? "+" : "−"}{money(m.amount)}</span>
                            <button onClick={() => setSimMovs(list => list.filter(x => x.id !== m.id))} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", display: "flex", flexShrink: 0 }}><Trash2 size={13} /></button>
                        </div>
                    ))}
                    <form onSubmit={e => {
                        e.preventDefault();
                        const monto = parseFloat(nuevoMov.amount);
                        if (!nuevoMov.text.trim() || !monto) return;
                        setSimMovs(list => [...list, { id: Date.now(), text: nuevoMov.text.trim(), amount: monto, type: nuevoMov.type }]);
                        setNuevoMov(v => ({ text: "", amount: "", type: v.type }));
                    }} style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <select value={nuevoMov.type} onChange={e => setNuevoMov(v => ({ ...v, type: e.target.value as 'ingreso' | 'gasto' }))} style={{ padding: "6px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                            <option value="gasto">Gasto</option>
                            <option value="ingreso">Ingreso</option>
                        </select>
                        <input value={nuevoMov.text} onChange={e => setNuevoMov(v => ({ ...v, text: e.target.value }))} placeholder="Concepto…" style={{ flex: 1, minWidth: "140px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.78rem", outline: "none" }} />
                        <input value={nuevoMov.amount} onChange={e => setNuevoMov(v => ({ ...v, amount: e.target.value }))} type="number" placeholder="S/" style={{ width: "80px", padding: "6px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.78rem", outline: "none" }} />
                        <button type="submit" style={{ background: "#F59E0B", color: "#fff", border: "none", borderRadius: "7px", padding: "0 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: 700 }}><Plus size={14} />Agregar</button>
                    </form>
                </div>
            </div>

        </div>
    );
};
