import { C, bento, useIsMobile, paddingPagina, RADIO, etiqueta, MONO } from "../../theme";
import type { CalendarEvent, SporadicProject } from "../../hooks/useAlDiaState";

/* ══════════════════════════════════════════════════════════════════
   ResumenAgendaDashboard — la "casa" de Agenda.

   De un vistazo: sesiones que vienen, lo atrasado, las que faltan
   por agendar y las entregas pendientes. Tocar cualquier bloque abre
   el detalle (Agenda / Entregas). Solo lee, no edita nada.
══════════════════════════════════════════════════════════════════ */

interface Props {
    calendarEvents: CalendarEvent[];
    sporadicProjects: SporadicProject[];
    setActiveTab: (t: string) => void;
}

const hoyISO = () => new Date().toLocaleDateString("en-CA");
const diasEntre = (a: string, b: string) =>
    Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);

const cuando = (dias: number) =>
    dias === 0 ? "hoy" : dias === 1 ? "mañana" : dias < 0 ? `hace ${-dias} d` : `en ${dias} d`;

const fechaCorta = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" });

const hechas = (e: CalendarEvent) => e.notionEstado === "Entregado" || e.notionEstado === "Terminado";

export const ResumenAgendaDashboard = ({ calendarEvents, sporadicProjects, setActiveTab }: Props) => {
    const movil = useIsMobile();
    const hoy = hoyISO();

    const conFecha = calendarEvents.filter(e => e.date);
    const proximas = conFecha
        .filter(e => e.date >= hoy && !hechas(e))
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    const atrasadas = conFecha.filter(e => e.date < hoy && e.notionEstado === "Agendado");
    const porAgendar = calendarEvents.filter(e => !e.date).length;

    const porEntregar = sporadicProjects
        .filter(p => p.status !== "completado")
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const vencidas = porEntregar.filter(p => p.dueDate && p.dueDate < hoy).length;

    const semana = proximas.filter(e => diasEntre(hoy, e.date) <= 7).length;

    const stat = (valor: number, texto: string, alerta = false, ir?: string) => (
        <button
            onClick={() => ir && setActiveTab(ir)}
            style={{
                ...bento, flex: 1, minWidth: movil ? "46%" : "140px", padding: "12px 14px", textAlign: "left",
                cursor: ir ? "pointer" : "default", fontFamily: "inherit",
                borderColor: alerta && valor > 0 ? C.rojo : C.outlineVariant,
            }}
        >
            <div style={{ fontSize: "1.6rem", fontWeight: 800, lineHeight: 1.1, color: alerta && valor > 0 ? C.rojo : C.onSurface, fontFamily: MONO }}>{valor}</div>
            <div style={{ ...etiqueta, marginTop: "4px" }}>{texto}</div>
        </button>
    );

    const bloque = (titulo: string, ir: string, cuerpo: React.ReactNode, vacio: string, hay: boolean) => (
        <div style={{ ...bento, padding: 0, overflow: "hidden" }}>
            <button
                onClick={() => setActiveTab(ir)}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "none", border: "none", borderBottom: `1px solid ${C.surfaceContainerHigh}`, cursor: "pointer", fontFamily: "inherit" }}
            >
                <span style={{ ...etiqueta, color: C.onSurface }}>{titulo}</span>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: C.primary }}>Ver todo →</span>
            </button>
            <div style={{ padding: "6px 14px 10px" }}>
                {hay ? cuerpo : <p style={{ margin: "10px 0", fontSize: "0.85rem", color: C.onSurfaceVariant }}>{vacio}</p>}
            </div>
        </div>
    );

    const fila = (key: string | number, principal: string, secundario: string, derecha: string, alerta: boolean, ir: string) => (
        <button
            key={key} onClick={() => setActiveTab(ir)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", background: "none", border: "none", borderTop: `1px solid ${C.surfaceContainerHigh}`, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: C.onSurface }}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{principal}</div>
                <div style={{ fontSize: "0.75rem", color: C.onSurfaceVariant }}>{secundario}</div>
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, flexShrink: 0, color: alerta ? C.rojo : C.onSurfaceVariant, background: alerta ? `${C.rojo}14` : C.surfaceContainer, borderRadius: RADIO.chip, padding: "4px 10px" }}>{derecha}</span>
        </button>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: movil ? "14px" : "20px", ...paddingPagina(movil), color: C.onSurface }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {stat(semana, "Sesiones en 7 días", false, "Agenda")}
                {stat(atrasadas.length, "Atrasadas", true, "Agenda")}
                {stat(porAgendar, "Por agendar", false, "Agenda")}
                {stat(porEntregar.length, `Por entregar${vencidas ? ` · ${vencidas} vencidas` : ""}`, vencidas > 0, "Entregas")}
            </div>

            <div style={{ display: "grid", gap: movil ? "14px" : "16px", gridTemplateColumns: movil ? "1fr" : "repeat(auto-fit, minmax(340px, 1fr))", alignItems: "start" }}>
                {bloque(
                    `Próximas sesiones (${proximas.length})`, "Agenda",
                    <>
                        {atrasadas.slice(0, 3).map(e => fila(e.id, e.title, `${fechaCorta(e.date)} · sin marcar como realizada`, cuando(diasEntre(hoy, e.date)), true, "Agenda"))}
                        {proximas.slice(0, 5).map(e => fila(e.id, e.title, `${fechaCorta(e.date)} · ${e.startTime}`, cuando(diasEntre(hoy, e.date)), false, "Agenda"))}
                    </>,
                    "No tienes sesiones próximas.", proximas.length + atrasadas.length > 0,
                )}
                {bloque(
                    `Por entregar (${porEntregar.length})`, "Entregas",
                    porEntregar.slice(0, 6).map(p => {
                        const d = p.dueDate ? diasEntre(hoy, p.dueDate) : 0;
                        const progreso = p.complexityHours > 0 ? Math.min(100, Math.round((p.workedHours / p.complexityHours) * 100)) : 0;
                        return fila(
                            p.id, p.title,
                            `${p.dueDate ? fechaCorta(p.dueDate) : "sin fecha"} · ${progreso}% trabajado${p.requiresUsb && !p.usbDelivered ? " · falta USB" : ""}`,
                            p.dueDate ? (d < 0 ? `vencida ${cuando(d)}` : cuando(d)) : "—", !!p.dueDate && d < 0, "Entregas",
                        );
                    }),
                    "No hay entregas pendientes.", porEntregar.length > 0,
                )}
            </div>
        </div>
    );
};
