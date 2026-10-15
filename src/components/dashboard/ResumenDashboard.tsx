import { useMemo } from "react";
import { Briefcase, Wallet, HeartPulse, Moon, Info, CheckCircle2, Flame, ListTodo, ListChecks } from "lucide-react";
import type { SporadicProject, Transaction, DailyCheckin, DailyBlock, Mission } from "../../hooks/useAlDiaState";
import { calcularResumen } from "../../lib/resumenActividad";
import { C, RADIO, bento, useIsMobile, paddingPagina, etiqueta, money } from "../../theme";

/*
 * Resumen: la única pantalla de "¿cómo voy?". Antes eran dos (Datos y
 * Rendimiento) que respondían lo mismo a distinta escala; ahora la ejecución
 * del día a día es un frente más junto a Negocio, Finanzas, Salud y Sueño,
 * y debajo va su detalle (check-in, mapa de esfuerzo, hábitos).
 */

interface ResumenProps {
    dailyBlocks: DailyBlock[];
    missions: Mission[];
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
const fechaLarga = (f: string) =>
    new Date(f + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });

const colorPorScore = (score: number) => score < 40 ? C.rojo : score < 70 ? C.ambar : C.verde;

// Mapa de esfuerzo: 0 = nada hecho; 1-3 = tercios del mejor día del período.
const ESCALA = [C.surfaceContainer, '#B9E6D2', '#5FC8A0', C.primary];
const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Franja de 7 días (el más viejo a la izquierda, hoy a la derecha) -- misma
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

export const ResumenDashboard = ({ dailyBlocks, missions, sporadicProjects, transactions, dailyCheckins, toggleDailyCheckin }: ResumenProps) => {
    const movil = useIsMobile();
    const angosto = useIsMobile(1200); // escritorio chico: frentes en 3 columnas
    const hoy = todayStr();
    const r = useMemo(() => calcularResumen(dailyBlocks, missions, hoy), [dailyBlocks, missions, hoy]);

    // Ejecución: tareas de Mi Día hechas vs. las que tocaban en los últimos 7 días.
    const hayTareas = r.programadas7 > 0;

    // Negocio: de las entregas activas (no completadas), qué % NO está atrasado
    // ahora mismo -- mide si estás cumpliendo con lo que le debes a tus clientes.
    // Una entrega sin fecha no puede estar atrasada.
    const entregasActivas = sporadicProjects.filter(p => p.status !== 'completado');
    const negocioScore = entregasActivas.length === 0 ? 100
        : Math.round(entregasActivas.filter(p => !p.dueDate || daysBetween(hoy, p.dueDate) >= 0).length / entregasActivas.length * 100);

    // Finanzas: qué parte de los gastos del mes cubren los ingresos del mes
    // (100% = ingresas al menos lo que gastas). Mismo criterio que los totales
    // reales de Finanzas: sin ajustes ni deudas, y montos siempre en positivo
    // (antes se sumaban con signo y el score podía salir negativo).
    const mesActual = hoy.slice(0, 7);
    const monto = (t: Transaction) => Math.abs(Number(t.amount) || 0);
    const txMes = transactions.filter(t => t?.fullDate?.startsWith(mesActual) && t.category !== 'Ajuste' && !t.isDebt);
    const ingresosMes = txMes.filter(t => t.type === 'ingreso').reduce((s, t) => s + monto(t), 0);
    const gastosMes = txMes.filter(t => t.type === 'gasto').reduce((s, t) => s + monto(t), 0);
    const finanzasScore = gastosMes === 0 ? 100 : Math.min(100, Math.round(ingresosMes / gastosMes * 100));

    // Salud y Sueño: % de los últimos 7 días marcados en el check-in.
    // Un día sin check-in cuenta como no cumplido -- no se asume nada.
    const ultimos7 = Array.from({ length: 7 }, (_, i) => dateMinusDays(hoy, i));
    const checkinPorDia = new Map(dailyCheckins.map(c => [c.date, c]));
    const saludDias = ultimos7.filter(d => { const c = checkinPorDia.get(d); return c?.ateWell && c?.exercised; });
    const saludScore = Math.round(saludDias.length / 7 * 100);
    const suenoDias = ultimos7.filter(d => checkinPorDia.get(d)?.sleptWell);
    const suenoScore = Math.round(suenoDias.length / 7 * 100);

    const checkHoy = checkinPorDia.get(hoy);

    const AREAS = [
        { label: "Ejecución", icon: ListChecks, score: r.cumplimiento7, cuenta: hayTareas, detalle: hayTareas ? `${r.hechas7} de ${r.programadas7} tareas · 7 días` : "sin tareas programadas", tip: "Tareas de Mi Día (incluye hábitos) hechas vs. las que tocaban en los últimos 7 días." },
        { label: "Negocio", icon: Briefcase, score: negocioScore, cuenta: true, detalle: entregasActivas.length === 0 ? "sin entregas activas" : `${entregasActivas.length} entrega${entregasActivas.length === 1 ? '' : 's'} activa${entregasActivas.length === 1 ? '' : 's'}`, tip: "% de tus entregas activas que no están atrasadas ahora mismo." },
        { label: "Finanzas", icon: Wallet, score: finanzasScore, cuenta: true, detalle: (ingresosMes + gastosMes) === 0 ? "sin movimientos este mes" : `entra ${money(ingresosMes)} · sale ${money(gastosMes)}`, tip: "Cuánto de lo gastado este mes cubren los ingresos del mes (sin deudas ni ajustes). 100% = no gastas más de lo que entra." },
        { label: "Salud", icon: HeartPulse, score: saludScore, cuenta: true, detalle: `${saludDias.length}/7 días con comida + ejercicio`, tip: "% de los últimos 7 días marcados como 'comí bien' Y 'hice ejercicio'." },
        { label: "Sueño", icon: Moon, score: suenoScore, cuenta: true, detalle: `${suenoDias.length}/7 noches`, tip: "% de las últimas 7 noches marcadas como 'dormí bien'." },
    ];
    // Ejecución sin tareas no tiene nada que medir: no baja el promedio.
    const queCuentan = AREAS.filter(a => a.cuenta);
    const promedio = Math.round(queCuentan.reduce((s, a) => s + a.score, 0) / queCuentan.length);
    const enVerde = queCuentan.filter(a => a.score >= 70).length;

    // Mapa por semanas (lunes a domingo): se rellena al inicio para que cada
    // columna sea un día de la semana fijo.
    const maxHechas = Math.max(1, ...r.dias.map(d => d.hechas));
    const intensidad = (hechas: number) => hechas === 0 ? 0 : Math.min(3, Math.ceil(hechas / maxHechas * 3));
    const desfase = (new Date(r.dias[0].fecha + 'T00:00:00').getDay() + 6) % 7;
    const celdas: (typeof r.dias[number] | null)[] = [...Array(desfase).fill(null), ...r.dias];

    const TARJETAS = [
        { label: 'Hechas en 30 días', icon: CheckCircle2, valor: `${r.hechas30}`, detalle: 'tareas de Mi Día marcadas' },
        { label: 'Racha', icon: Flame, valor: `${r.rachaDias} ${r.rachaDias === 1 ? 'día' : 'días'}`, detalle: 'seguidos con algo hecho' },
        { label: 'Pendientes', icon: ListTodo, valor: `${r.pendientesAbiertos}`, detalle: r.pendientesVencidos ? `${r.pendientesVencidos} vencido${r.pendientesVencidos === 1 ? '' : 's'}` : 'ninguno vencido', alerta: r.pendientesVencidos > 0 },
    ];

    const bloqueCheckin = (
        <>
            {/* Check-in de hoy: la única forma de alimentar Salud y Sueño */}
            <span style={etiqueta}>Check-in de hoy</span>
            <div style={{ ...bento, padding: "1rem", marginTop: "8px", marginBottom: "1.5rem" }}>
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

        </>
    );

    const bloqueMapa = (
        <>
            {/* Detalle de Ejecución: mapa de esfuerzo (5 semanas) */}
            <span style={etiqueta}>Tareas hechas por día · 5 semanas</span>
            <div style={{ ...bento, padding: "1rem", marginTop: "8px", marginBottom: "1.25rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "5px" }}>
                    {DIAS_CORTOS.map(d => (
                        <div key={d} style={{ fontSize: "0.62rem", fontWeight: 700, color: C.outline, textAlign: "center" }}>{d}</div>
                    ))}
                    {celdas.map((d, i) => d === null ? <div key={`v${i}`} /> : (
                        <div
                            key={d.fecha}
                            title={`${fechaLarga(d.fecha)}: ${d.hechas} de ${d.programadas} hechas`}
                            style={{
                                aspectRatio: "1 / 1", borderRadius: "5px",
                                background: ESCALA[intensidad(d.hechas)],
                                outline: d.fecha === hoy ? `2px solid ${C.onSurface}` : "none",
                                outlineOffset: "-2px",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "0.6rem", fontWeight: 700,
                                color: intensidad(d.hechas) >= 2 ? "#fff" : C.outline,
                            }}
                        >
                            {d.hechas || ""}
                        </div>
                    ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "0.66rem", color: C.outline, fontWeight: 600 }}>
                    <span>Menos</span>
                    {ESCALA.map(c => <div key={c} style={{ width: "10px", height: "10px", borderRadius: "2px", background: c }} />)}
                    <span>Más</span>
                </div>
            </div>

        </>
    );

    const bloqueCifras = (
        <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: movil ? "0.6rem" : "0.9rem", marginBottom: "1.5rem" }}>
                {TARJETAS.map(t => (
                    <div key={t.label} style={{ ...bento, padding: movil ? "0.8rem" : "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: C.onSurfaceVariant, marginBottom: "6px" }}>
                            <t.icon size={14} style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: "0.7rem", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</span>
                        </div>
                        <div style={{ fontSize: movil || angosto ? "1.2rem" : "1.5rem", fontWeight: 800, color: C.onSurface, whiteSpace: "nowrap" }}>{t.valor}</div>
                        <div style={{ fontSize: "0.64rem", color: t.alerta ? C.rojo : C.outline, marginTop: "4px", fontWeight: 600 }}>{t.detalle}</div>
                    </div>
                ))}
            </div>

        </>
    );

    const bloqueHabitos = (
        <>
            {/* Hábitos uno por uno */}
            <span style={etiqueta}>Hábitos · constancia en 30 días</span>
            <div style={{ ...bento, padding: "0.5rem 1rem", marginTop: "8px" }}>
                {r.habitos.length === 0 ? (
                    <div style={{ padding: "8px 0", fontSize: "0.78rem", color: C.outline }}>Todavía no tienes hábitos. Marca una tarea repetitiva como hábito para seguir su constancia.</div>
                ) : r.habitos.map((h, i) => (
                    <div key={h.nombre} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderTop: i ? `1px solid ${C.outlineVariant}` : "none" }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: "0.82rem", fontWeight: 600, color: C.onSurface, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.nombre}</span>
                        <div style={{ width: movil ? "70px" : "140px", height: "6px", borderRadius: "3px", background: C.surfaceContainer, overflow: "hidden", flexShrink: 0 }}>
                            <div style={{ height: "100%", width: `${h.pct}%`, background: colorPorScore(h.pct) }} />
                        </div>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: C.onSurfaceVariant, width: "52px", textAlign: "right", flexShrink: 0 }}>{h.hechos}/{h.programados}</span>
                    </div>
                ))}
            </div>
        </>
    );

    return (
        <div style={paddingPagina(movil)}>
            {/* Sin título: el menú ya dice "Resumen". */}
            {/* Promedio + los 5 frentes en una sola fila (en móvil, 2 columnas) */}
            <div style={{ display: "grid", gridTemplateColumns: movil ? "1fr 1fr" : angosto ? "repeat(3, minmax(0, 1fr))" : "1.25fr repeat(5, minmax(0, 1fr))", gap: "0.9rem", marginBottom: "1.5rem" }}>
                <div style={{ ...bento, background: C.primaryContainer, borderColor: "transparent", padding: "1rem", gridColumn: movil ? "1 / -1" : undefined, display: "flex", flexDirection: movil ? "row" : "column", alignItems: movil ? "center" : "flex-start", justifyContent: "space-between", gap: "8px" }}>
                    <div>
                        <span style={{ ...etiqueta, color: C.onPrimaryContainer }}>Promedio general</span>
                        <div style={{ fontSize: "2.2rem", fontWeight: 800, color: colorPorScore(promedio), lineHeight: 1.1 }}>
                            {promedio}<span style={{ fontSize: "1.1rem", color: C.outline, fontWeight: 700 }}>/100</span>
                        </div>
                    </div>
                    <div style={{ fontSize: "0.7rem", color: C.onPrimaryContainer, fontWeight: 700 }}>
                        {enVerde} de {queCuentan.length} frentes en verde
                    </div>
                </div>
                {AREAS.map((a, i) => (
                    <div key={a.label} style={{ ...bento, padding: "1rem", gridColumn: movil && i === 0 ? "1 / -1" : undefined }} title={a.tip}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: C.onSurfaceVariant }}>
                                <a.icon size={15} />
                                <span style={{ fontSize: "0.75rem", fontWeight: 800 }}>{a.label}</span>
                            </div>
                            <Info size={12} color={C.outlineVariant} />
                        </div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: a.cuenta ? colorPorScore(a.score) : C.outline }}>{a.cuenta ? `${a.score}%` : '—'}</div>
                        <div style={{ height: "6px", borderRadius: "3px", background: C.surfaceContainer, marginTop: "6px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${a.cuenta ? a.score : 0}%`, background: colorPorScore(a.score), borderRadius: "3px" }} />
                        </div>
                        <div style={{ fontSize: "0.66rem", color: C.outline, marginTop: "6px", fontWeight: 600 }}>{a.detalle}</div>
                    </div>
                ))}
            </div>

            {movil ? (
                <>{bloqueCheckin}{bloqueMapa}{bloqueCifras}{bloqueHabitos}</>
            ) : (
                // Escritorio: mapa compacto a la izquierda, el resto a la derecha,
                // para no dejar media pantalla vacía junto al mapa.
                <div style={{ display: "grid", gridTemplateColumns: angosto ? "260px minmax(0, 1fr)" : "300px minmax(0, 1fr)", gap: "1.25rem", alignItems: "start" }}>
                    <div>{bloqueMapa}</div>
                    <div>{bloqueCheckin}{bloqueCifras}{bloqueHabitos}</div>
                </div>
            )}
        </div>
    );
};
