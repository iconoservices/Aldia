import { C, RADIO } from "../../theme";

/* Selector de vistas del grupo "Listas": junta Mis listas, Por temas y Bandeja
   en una sola entrada del menú. Cada vista sigue siendo su propia pestaña
   (activeTab), así las rutas y el botón de Mi Día → Bandeja siguen funcionando. */
export const VISTAS_LISTAS = [
    { tab: "Listas", label: "Mis listas" },
    { tab: "Quiero hacer", label: "Por temas" },
    { tab: "Bandeja", label: "Bandeja" },
    { tab: "Comidas", label: "Comidas" },
    { tab: "Bienestar", label: "Bienestar" },
] as const;

export const VISTAS_METAS = [
    { tab: "Metas", label: "Metas" },
    { tab: "Proyectos", label: "Proyectos" },
    { tab: "Compras", label: "Por comprar" },
] as const;

export const VISTAS_DINERO = [
    { tab: "Finanzas", label: "Finanzas" },
    { tab: "Plan", label: "Fijos" },
    { tab: "Deudas", label: "Deudas" },
    { tab: "Proyección", label: "Proyección" },
    { tab: "Movimientos", label: "Movimientos" },
] as const;

export const VISTAS_AGENDA = [
    { tab: "Resumen", label: "Resumen" },
    { tab: "Agenda", label: "Sesiones" },
    { tab: "Entregas", label: "Entregas" },
    { tab: "Calendario", label: "Calendario" },
    { tab: "Tareas", label: "Tareas", alias: ["Rutina", "Vida", "Bloques"] },   // Rutina = la misma lista de tareas en cuadrícula semanal
    { tab: "Horario", label: "Horario" },
    { tab: "Pendientes", label: "Por hacer" },
] as const;

type Vista = { readonly tab: string; readonly label: string; readonly alias?: readonly string[] };

export const VistasListas = ({ activeTab, setActiveTab, vistas = VISTAS_LISTAS, extra }: { activeTab: string; setActiveTab: (t: string) => void; vistas?: readonly Vista[]; extra?: React.ReactNode }) => (
    <div style={{ padding: "12px 12px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", overflowX: "auto", flexShrink: 0 }}>
        <div style={{ display: "inline-flex", gap: "4px", padding: "4px", background: C.surfaceContainer, borderRadius: RADIO.chip }}>
            {vistas.map(v => {
                const activa = activeTab === v.tab || !!v.alias?.includes(activeTab);
                return (
                    <button
                        key={v.tab}
                        onClick={() => setActiveTab(v.tab)}
                        style={{
                            border: "none", cursor: "pointer", borderRadius: RADIO.chip, padding: "7px 16px",
                            fontSize: "0.8rem", fontWeight: 700, fontFamily: "inherit",
                            background: activa ? C.primary : "transparent",
                            color: activa ? "#fff" : C.onSurfaceVariant,
                        }}
                    >
                        {v.label}
                    </button>
                );
            })}
        </div>
        {extra}
    </div>
);
