import { C, RADIO } from "../../theme";

/* Selector de vistas del grupo "Listas": junta Mis listas, Por temas y Bandeja
   en una sola entrada del menú. Cada vista sigue siendo su propia pestaña
   (activeTab), así las rutas y el botón de Mi Día → Bandeja siguen funcionando. */
export const VISTAS_LISTAS = [
    { tab: "Listas", label: "Mis listas" },
    { tab: "Quiero hacer", label: "Por temas" },
    { tab: "Bandeja", label: "Bandeja" },
] as const;

export const VISTAS_PENDIENTES = [
    { tab: "Tareas", label: "Con hora" },
    { tab: "Pendientes", label: "Por hacer" },
] as const;

export const VISTAS_METAS = [
    { tab: "Metas", label: "Metas" },
    { tab: "Proyectos", label: "Proyectos" },
    { tab: "Compras", label: "Por comprar" },
] as const;

type Vista = { readonly tab: string; readonly label: string };

export const VistasListas = ({ activeTab, setActiveTab, vistas = VISTAS_LISTAS }: { activeTab: string; setActiveTab: (t: string) => void; vistas?: readonly Vista[] }) => (
    <div style={{ padding: "12px 12px 0", display: "flex" }}>
        <div style={{ display: "inline-flex", gap: "4px", padding: "4px", background: C.surfaceContainer, borderRadius: RADIO.chip }}>
            {vistas.map(v => {
                const activa = activeTab === v.tab;
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
    </div>
);
