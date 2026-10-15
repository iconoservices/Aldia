import { C, RADIO } from "../../theme";

/* Selector de vistas del grupo "Listas": junta Mis listas, Por temas y Bandeja
   en una sola entrada del menú. Cada vista sigue siendo su propia pestaña
   (activeTab), así las rutas y el botón de Mi Día → Bandeja siguen funcionando. */
const VISTAS = [
    { tab: "Listas", label: "Mis listas" },
    { tab: "Quiero hacer", label: "Por temas" },
    { tab: "Bandeja", label: "Bandeja" },
] as const;

export const VistasListas = ({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (t: string) => void }) => (
    <div style={{ padding: "12px 12px 0", display: "flex" }}>
        <div style={{ display: "inline-flex", gap: "4px", padding: "4px", background: C.surfaceContainer, borderRadius: RADIO.chip }}>
            {VISTAS.map(v => {
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
