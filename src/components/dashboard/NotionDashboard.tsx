import { useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import type { CalendarEvent, NotionEstado } from "../../hooks/useAlDiaState";
import { NOTION_ESTADOS } from "../../hooks/useAlDiaState";
import { C, bento, useIsMobile, paddingPagina, cabecera, tituloPagina, subtituloPagina, money } from "../../theme";

/* ══════════════════════════════════════════════════════════════════
   NotionDashboard — vista de solo lectura + un control de escritura
   (Estado) sobre la base "Agenda" de Notion. Todos los demás campos
   (Proyecto, Precio, Cobrado, Saldo, Entrega, Días Restantes) vienen
   calculados o cargados en Notion mismo; acá solo se muestran. El
   flujo real de 5 pasos vive en Notion — este panel es un atajo para
   no tener que abrir Notion nada más para mover un pedido de paso.
══════════════════════════════════════════════════════════════════ */

const ESTADO_COLOR: Record<NotionEstado, string> = {
    'Agendado': '#6366F1',
    'Realizado': '#8B5CF6',
    'En Edición': '#E6A817',
    'Terminado': '#10B981',
    'Entregado': '#059669',
};

interface NotionProps {
    calendarEvents: CalendarEvent[];
    updateCalendarEvent: (id: number, updates: Partial<CalendarEvent>) => void;
}

export const NotionDashboard = ({ calendarEvents, updateCalendarEvent }: NotionProps) => {
    const movil = useIsMobile();
    const [savingId, setSavingId] = useState<number | null>(null);
    const [errorId, setErrorId] = useState<number | null>(null);

    const items = useMemo(
        () => (calendarEvents || []).filter(e => e.notionId).sort((a, b) => a.date.localeCompare(b.date)),
        [calendarEvents]
    );

    const setEstado = async (item: CalendarEvent, estado: NotionEstado) => {
        if (estado === item.notionEstado) return;
        setSavingId(item.id);
        setErrorId(null);
        try {
            const res = await fetch('/api/update-notion-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notionId: item.notionId, estado })
            });
            if (!res.ok) throw new Error('respuesta no ok');
            updateCalendarEvent(item.id, { notionEstado: estado });
        } catch (err) {
            console.error('No se pudo actualizar Estado en Notion:', err);
            setErrorId(item.id);
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: movil ? "1rem" : "1.5rem", ...paddingPagina(movil), color: "var(--text-carbon)" }}>
            <div style={cabecera(movil)}>
                <div>
                    <h2 style={tituloPagina}>Notion — Agenda</h2>
                    <p style={subtituloPagina}>Tu base de Notion, con los mismos campos. Cambiar el Estado acá lo cambia también allá.</p>
                </div>
            </div>

            {items.length === 0 && (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: C.outline }}>
                    <p style={{ margin: 0, fontSize: "0.85rem" }}>Sin sesiones importadas de Notion todavía.</p>
                </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {items.map(item => (
                    <div key={item.id} style={{ ...bento, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: "0.92rem", color: C.onSurface }}>{item.title}</div>
                                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "3px", fontSize: "0.72rem", color: C.onSurfaceVariant, fontWeight: 700 }}>
                                    {item.notionProyecto && <span>{item.notionProyecto}</span>}
                                    <span>{item.date} {item.startTime}</span>
                                    {item.notionDiasRestantes && <span>{item.notionDiasRestantes}</span>}
                                </div>
                            </div>
                            {(item.notionPrecio !== undefined || item.notionCobrado !== undefined) && (
                                <div style={{ textAlign: "right", fontSize: "0.72rem", color: C.onSurfaceVariant, fontWeight: 700 }}>
                                    {item.notionPrecio !== undefined && <div>Precio: {money(item.notionPrecio)}</div>}
                                    {item.notionCobrado !== undefined && <div>Cobrado: {money(item.notionCobrado)}</div>}
                                    {item.notionSaldoPorCobrar !== undefined && item.notionSaldoPorCobrar > 0 && (
                                        <div style={{ color: C.rojo }}>Saldo: {money(item.notionSaldoPorCobrar)}</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                            {NOTION_ESTADOS.map(estado => {
                                const active = item.notionEstado === estado;
                                return (
                                    <button
                                        key={estado}
                                        onClick={() => setEstado(item, estado)}
                                        disabled={savingId === item.id}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "5px",
                                            background: active ? ESTADO_COLOR[estado] : C.surfaceContainerLow,
                                            color: active ? "white" : C.onSurfaceVariant,
                                            border: "none", borderRadius: "999px", padding: "6px 12px",
                                            fontSize: "0.7rem", fontWeight: 700, cursor: savingId === item.id ? "wait" : "pointer",
                                            opacity: savingId === item.id && !active ? 0.5 : 1,
                                        }}
                                    >
                                        {savingId === item.id && !active && <Loader2 size={11} className="spin" />}
                                        {estado}
                                    </button>
                                );
                            })}
                        </div>
                        {errorId === item.id && (
                            <div style={{ fontSize: "0.7rem", color: C.rojo, fontWeight: 700 }}>No se pudo guardar en Notion. Intenta de nuevo.</div>
                        )}
                    </div>
                ))}
            </div>

            <a href="https://notion.so" target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: C.outline, textDecoration: "none", justifyContent: "center" }}>
                <ExternalLink size={13} /> Abrir Notion
            </a>

            <style>{`
                @keyframes notion-spin { to { transform: rotate(360deg); } }
                .spin { animation: notion-spin 0.7s linear infinite; }
            `}</style>
        </div>
    );
};
