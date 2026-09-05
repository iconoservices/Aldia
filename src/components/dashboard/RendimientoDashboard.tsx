import { Briefcase, Wallet, HeartPulse, Moon, Info } from "lucide-react";
import type { SporadicProject, Transaction, DailyCheckin } from "../../hooks/useAlDiaState";
import { C, RADIO, bento, useIsMobile, paddingPagina, cabecera, tituloPagina, subtituloPagina, etiqueta } from "../../theme";

interface RendimientoProps {
    sporadicProjects: SporadicProject[];
    transactions: Transaction[];
    dailyCheckins: DailyCheckin[];
    toggleDailyCheckin: (date: string, field: 'ateWell' | 'exercised' | 'sleptWell') => void;
}

const todayStr = () => new Date().toLocaleDateString('en-CA');
const dateMinusDays = (dateStr: string, days: number) => {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() - days);
    return d.toLocaleDateString('en-CA');
};
const daysBetween = (a: string, b: string) => Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);

const colorPorScore = (score: number) => score < 40 ? C.rojo : score < 70 ? C.ambar : C.verde;

// Franja de 7 días (hoy a la izquierda, hace 6 días a la derecha) -- misma
// lógica visual para Salud y Sueño, solo cambia qué campo del check-in mira.
const Franja7Dias = ({ dias, activo, color }: { dias: string[]; activo: (d: string) => boolean; color: string }) => (
    <div style={{ display: "flex", gap: "4px" }}>
        {dias.map(d => (
            <div
                key={d}
                title={d}
                style={{
                    width: "16px", height: "16px", borderRadius: "5px",
                    background: activo(d) ? color : C.surfaceContainer,
                }}
            />
        ))}
    </div>
);

export const RendimientoDashboard = ({ sporadicProjects, transactions, dailyCheckins, toggleDailyCheckin }: RendimientoProps) => {
    const movil = useIsMobile();
    const hoy = todayStr();

    // Negocio: de las entregas activas (no completadas), qué % NO está atrasado
    // ahora mismo -- mide si estás cumpliendo con lo que le debes a tus clientes.
    const entregasActivas = sporadicProjects.filter(p => p.status !== 'completado');
    const negocioScore = entregasActivas.length === 0 ? 100
        : Math.round(entregasActivas.filter(p => daysBetween(hoy, p.dueDate) >= 0).length / entregasActivas.length * 100);

    // Finanzas: de lo que movió el mes en curso, qué proporción fue ingreso
    // (vs. gasto). Sin movimientos este mes todavía = neutral (100).
    const mesActual = hoy.slice(0, 7);
    const txMes = transactions.filter(t => t.fullDate.startsWith(mesActual));
    const ingresosMes = txMes.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
    const gastosMes = txMes.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0);
    const finanzasScore = (ingresosMes + gastosMes) === 0 ? 100
        : Math.round(ingresosMes / (ingresosMes + gastosMes) * 100);

    // Salud y Sueño: % de los últimos 7 días marcados en el check-in de abajo.
    // Un día sin check-in cuenta como no cumplido -- no se asume nada.
    const ultimos7 = Array.from({ length: 7 }, (_, i) => dateMinusDays(hoy, i));
    const checkinPorDia = new Map(dailyCheckins.map(c => [c.date, c]));
    const saludDias = ultimos7.filter(d => { const c = checkinPorDia.get(d); return c?.ateWell && c?.exercised; });
    const saludScore = Math.round(saludDias.length / 7 * 100);
    const suenoDias = ultimos7.filter(d => checkinPorDia.get(d)?.sleptWell);
    const suenoScore = Math.round(suenoDias.length / 7 * 100);

    const promedio = Math.round((negocioScore + finanzasScore + saludScore + suenoScore) / 4);

    const checkHoy = checkinPorDia.get(hoy);

    const AREAS = [
        { label: "Negocio", icon: Briefcase, score: negocioScore, detalle: entregasActivas.length === 0 ? "sin entregas activas" : `${entregasActivas.length} entrega${entregasActivas.length === 1 ? '' : 's'} activa${entregasActivas.length === 1 ? '' : 's'}`, tip: "% de tus entregas activas que no están atrasadas ahora mismo." },
        { label: "Finanzas", icon: Wallet, score: finanzasScore, detalle: (ingresosMes + gastosMes) === 0 ? "sin movimientos este mes" : `ingresos vs. gastos del mes`, tip: "Ingresos del mes ÷ (ingresos + gastos) del mes." },
        { label: "Salud", icon: HeartPulse, score: saludScore, detalle: `${saludDias.length}/7 días con comida + ejercicio`, tip: "% de los últimos 7 días marcados como 'comí bien' Y 'hice ejercicio'." },
        { label: "Sueño", icon: Moon, score: suenoScore, detalle: `${suenoDias.length}/7 noches`, tip: "% de las últimas 7 noches marcadas como 'dormí bien'." },
    ];

    return (
        <div style={paddingPagina(movil)}>
            <div style={cabecera(movil)}>
                <div>
                    <h1 style={tituloPagina}>Rendimiento</h1>
                    <p style={subtituloPagina}>Cómo vas repartido en tus 4 frentes</p>
                </div>
            </div>

            {/* Promedio general */}
            <div style={{ ...bento, padding: "1.25rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                    <span style={etiqueta}>Promedio general</span>
                    <div style={{ fontSize: "2.2rem", fontWeight: 800, color: colorPorScore(promedio), lineHeight: 1.1 }}>
                        {promedio}<span style={{ fontSize: "1.1rem", color: C.outline, fontWeight: 700 }}>/100</span>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                    {AREAS.map(a => (
                        <div key={a.label} title={`${a.label}: ${a.score}%`} style={{ width: "8px", height: "40px", borderRadius: "4px", background: C.surfaceContainer, position: "relative", overflow: "hidden" }}>
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${a.score}%`, background: colorPorScore(a.score) }} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Las 4 áreas */}
            <div style={{ display: "grid", gridTemplateColumns: movil ? "1fr 1fr" : "repeat(4, 1fr)", gap: "0.9rem", marginBottom: "1.5rem" }}>
                {AREAS.map(a => (
                    <div key={a.label} style={{ ...bento, padding: "1rem" }} title={a.tip}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: C.onSurfaceVariant }}>
                                <a.icon size={15} />
                                <span style={{ fontSize: "0.75rem", fontWeight: 800 }}>{a.label}</span>
                            </div>
                            <Info size={12} color={C.outlineVariant} />
                        </div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: colorPorScore(a.score) }}>{a.score}%</div>
                        <div style={{ height: "6px", borderRadius: "3px", background: C.surfaceContainer, marginTop: "6px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${a.score}%`, background: colorPorScore(a.score), borderRadius: "3px" }} />
                        </div>
                        <div style={{ fontSize: "0.66rem", color: C.outline, marginTop: "6px", fontWeight: 600 }}>{a.detalle}</div>
                    </div>
                ))}
            </div>

            {/* Check-in de hoy: la única forma de alimentar Salud y Sueño */}
            <span style={etiqueta}>Check-in de hoy</span>
            <div style={{ ...bento, padding: "1rem", marginTop: "8px", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                    {([
                        { field: 'ateWell' as const, label: "Comí bien hoy" },
                        { field: 'exercised' as const, label: "Hice ejercicio hoy" },
                        { field: 'sleptWell' as const, label: "Dormí bien anoche" },
                    ]).map(({ field, label }) => {
                        const activo = !!checkHoy?.[field];
                        return (
                            <button
                                key={field}
                                onClick={() => toggleDailyCheckin(hoy, field)}
                                style={{
                                    display: "flex", alignItems: "center", gap: "6px",
                                    background: activo ? "rgba(16,185,129,0.12)" : C.surfaceContainerLow,
                                    color: activo ? C.verde : C.onSurfaceVariant,
                                    border: "none", borderRadius: RADIO.chip, padding: "8px 14px",
                                    fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "0.66rem", color: C.outline, fontWeight: 700, width: "70px" }}>Salud</span>
                        <Franja7Dias dias={[...ultimos7].reverse()} activo={d => { const c = checkinPorDia.get(d); return !!(c?.ateWell && c?.exercised); }} color={C.verde} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "0.66rem", color: C.outline, fontWeight: 700, width: "70px" }}>Sueño</span>
                        <Franja7Dias dias={[...ultimos7].reverse()} activo={d => !!checkinPorDia.get(d)?.sleptWell} color={C.secondary} />
                    </div>
                </div>
            </div>
        </div>
    );
};
