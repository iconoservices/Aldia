import { useState } from "react";
import { Plus, X, RotateCcw, Trash2, Edit2, Check, ListChecks, MoreVertical } from "lucide-react";
import type { Note } from "../../hooks/useAlDiaState";
import { C, bento, etiqueta, useIsMobile, paddingPagina, cabecera, tituloPagina, subtituloPagina } from "../../theme";
import { ConfirmDialog } from "../ui/ConfirmDialog";

/* ══════════════════════════════════════════════════════════════════
   ListasDashboard — kits reutilizables con checkbox (ej. "Sesión de
   fotos": cámara, lente, trípode...). Reusa el tipo Note existente
   (type: 'checklist') y sus funciones de Cerebro en vez de crear un
   modelo de datos paralelo — la única pieza que faltaba era una
   pantalla dedicada, separada de Cerebro, con un botón para reiniciar
   (destildar todo) y reusar la lista la próxima vez.
══════════════════════════════════════════════════════════════════ */

interface ListasProps {
    notes: Note[];
    addNote: (title: string, content: string, type: 'text' | 'checklist', items: any[], q: string, color: string) => void;
    removeNote: (id: number) => void;
    toggleNoteItem: (noteId: number, itemId: number) => void;
    updateNote: (id: number, updates: Partial<Note>) => void;
}

const inputStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: "8px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.85rem", outline: "none", background: "white", boxSizing: "border-box", width: "100%" };

export const ListasDashboard = ({ notes, addNote, removeNote, toggleNoteItem, updateNote }: ListasProps) => {
    const movil = useIsMobile();
    // Los grupos de "Pendientes" (q: 'pendiente' o la lista histórica "Pendientes")
    // viven en su propia pestaña — acá solo van los kits reutilizables.
    const listas = notes.filter(n => n.type === "checklist" && n.q !== "pendiente" && n.title.trim().toLowerCase() !== "pendientes");

    const [newListName, setNewListName] = useState("");
    const [addingList, setAddingList] = useState(false);

    const submitNewList = () => {
        if (!newListName.trim()) return;
        addNote(newListName.trim(), "", "checklist", [], "", "#FFFFFF");
        setNewListName("");
        setAddingList(false);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: movil ? "1rem" : "1.5rem", ...paddingPagina(movil), color: "var(--text-carbon)" }}>
            <div style={cabecera(movil)}>
                <div>
                    <h2 style={tituloPagina}>Listas</h2>
                    <p style={subtituloPagina}>Kits reutilizables: arma la lista una vez y reinícala cada vez que la vuelvas a usar.</p>
                </div>
            </div>

            {addingList ? (
                <div style={{ ...bento, padding: "1rem", display: "flex", gap: "8px", alignItems: "center" }}>
                    <input autoFocus placeholder="Ej. Sesión de fotos" value={newListName} onChange={e => setNewListName(e.target.value)} onKeyDown={e => e.key === "Enter" && submitNewList()} style={inputStyle} />
                    <button onClick={submitNewList} style={{ background: C.secondary, color: "white", border: "none", borderRadius: "8px", padding: "8px 14px", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap" }}>Crear</button>
                    <button onClick={() => { setAddingList(false); setNewListName(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.outline, padding: "6px" }}><X size={16} /></button>
                </div>
            ) : (
                <button onClick={() => setAddingList(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "none", border: `2px dashed ${C.outlineVariant}`, borderRadius: "12px", padding: "12px", cursor: "pointer", color: C.outline, fontWeight: 700, fontSize: "0.85rem" }}>
                    <Plus size={16} /> Nueva lista
                </button>
            )}

            {listas.length === 0 && !addingList && (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: C.outline }}>
                    <ListChecks size={32} style={{ opacity: 0.4, marginBottom: "0.5rem" }} />
                    <p style={{ margin: 0, fontSize: "0.85rem" }}>Sin listas todavía. Crea la primera arriba.</p>
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: movil ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: movil ? "0.85rem" : "1.25rem" }}>
                {listas.map(lista => (
                    <ListaCard key={lista.id} lista={lista} removeNote={removeNote} toggleNoteItem={toggleNoteItem} updateNote={updateNote} />
                ))}
            </div>
        </div>
    );
};

const ListaCard = ({ lista, removeNote, toggleNoteItem, updateNote }: { lista: Note; removeNote: (id: number) => void; toggleNoteItem: (noteId: number, itemId: number) => void; updateNote: (id: number, updates: Partial<Note>) => void }) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState(lista.title);
    const [newItemText, setNewItemText] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [cardMenuOpen, setCardMenuOpen] = useState(false);
    const [itemMenuOpenId, setItemMenuOpenId] = useState<number | null>(null);
    const [editingItemId, setEditingItemId] = useState<number | null>(null);
    const [editItemText, setEditItemText] = useState("");

    const total = lista.items.length;
    const done = lista.items.filter(it => it.completed).length;

    const addItem = () => {
        if (!newItemText.trim()) return;
        updateNote(lista.id, { items: [...lista.items, { id: Date.now() + Math.random(), text: newItemText.trim(), completed: false }] });
        setNewItemText("");
    };

    const removeItem = (itemId: number) => {
        updateNote(lista.id, { items: lista.items.filter(it => it.id !== itemId) });
        setItemMenuOpenId(null);
    };

    const startEditItem = (itemId: number, text: string) => {
        setEditingItemId(itemId);
        setEditItemText(text);
        setItemMenuOpenId(null);
    };

    const saveEditItem = () => {
        if (editingItemId == null) return;
        const text = editItemText.trim();
        if (text) updateNote(lista.id, { items: lista.items.map(it => it.id === editingItemId ? { ...it, text } : it) });
        setEditingItemId(null);
    };

    const reiniciar = () => {
        updateNote(lista.id, { items: lista.items.map(it => ({ ...it, completed: false })) });
    };

    const saveTitle = () => {
        updateNote(lista.id, { title: titleDraft.trim() || lista.title });
        setIsEditingTitle(false);
    };

    return (
        <div style={{ ...bento, padding: "1.1rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {isEditingTitle ? (
                    <input autoFocus value={titleDraft} onChange={e => setTitleDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && saveTitle()} onBlur={saveTitle} style={{ ...inputStyle, fontWeight: 800, flex: 1 }} />
                ) : (
                    <span style={{ ...etiqueta, flex: 1, fontSize: "0.9rem" }}>{lista.title}</span>
                )}
                <div style={{ position: "relative" }}>
                    <button onClick={() => setCardMenuOpen(v => !v)} title="Opciones" style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "3px", display: "flex" }}><MoreVertical size={15} /></button>
                    {cardMenuOpen && (
                        <div style={{ position: "absolute", top: "100%", right: 0, zIndex: 5, background: "white", border: `1px solid ${C.outlineVariant}`, borderRadius: "9px", boxShadow: "0 4px 14px rgba(0,0,0,0.1)", overflow: "hidden", minWidth: "130px" }}>
                            <button onClick={() => { setTitleDraft(lista.title); setIsEditingTitle(true); setCardMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", background: "none", border: "none", padding: "9px 12px", cursor: "pointer", color: C.onSurface, fontSize: "0.78rem", fontWeight: 600, textAlign: "left" }}><Edit2 size={13} /> Renombrar</button>
                            <button onClick={() => { setConfirmDelete(true); setCardMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", background: "none", border: "none", padding: "9px 12px", cursor: "pointer", color: C.rojo, fontSize: "0.78rem", fontWeight: 600, textAlign: "left", borderTop: `1px solid ${C.surfaceContainerLow}` }}><Trash2 size={13} /> Eliminar lista</button>
                        </div>
                    )}
                </div>
            </div>

            {total > 0 && (
                <div style={{ fontSize: "0.68rem", color: C.onSurfaceVariant, fontWeight: 700 }}>{done}/{total} listos</div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {lista.items.length === 0 && (
                    <p style={{ fontSize: "0.75rem", color: C.outline, margin: 0, fontStyle: "italic" }}>Sin ítems. Agrega uno abajo.</p>
                )}
                {lista.items.map(item => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
                        {editingItemId === item.id ? (
                            <input autoFocus value={editItemText} onChange={e => setEditItemText(e.target.value)} onKeyDown={e => e.key === "Enter" && saveEditItem()} onBlur={saveEditItem} style={{ ...inputStyle, fontSize: "0.8rem", padding: "5px 8px", flex: 1 }} />
                        ) : (
                            <>
                                <div
                                    onClick={() => toggleNoteItem(lista.id, item.id)}
                                    style={{
                                        width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0, cursor: "pointer",
                                        border: `2px solid ${item.completed ? C.secondary : C.outlineVariant}`,
                                        background: item.completed ? C.secondary : "transparent",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}
                                >
                                    {item.completed && <Check size={12} color="white" strokeWidth={3} />}
                                </div>
                                <span style={{ flex: 1, fontSize: "0.83rem", color: item.completed ? C.outline : C.onSurface, textDecoration: item.completed ? "line-through" : "none" }}>
                                    {item.text}
                                </span>
                                <div style={{ position: "relative" }}>
                                    <button onClick={() => setItemMenuOpenId(v => v === item.id ? null : item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "2px", display: "flex" }}><MoreVertical size={14} /></button>
                                    {itemMenuOpenId === item.id && (
                                        <div style={{ position: "absolute", top: "100%", right: 0, zIndex: 5, background: "white", border: `1px solid ${C.outlineVariant}`, borderRadius: "9px", boxShadow: "0 4px 14px rgba(0,0,0,0.1)", overflow: "hidden", minWidth: "110px" }}>
                                            <button onClick={() => startEditItem(item.id, item.text)} style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%", background: "none", border: "none", padding: "8px 10px", cursor: "pointer", color: C.onSurface, fontSize: "0.72rem", fontWeight: 600, textAlign: "left" }}><Edit2 size={12} /> Editar</button>
                                            <button onClick={() => removeItem(item.id)} style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%", background: "none", border: "none", padding: "8px 10px", cursor: "pointer", color: C.rojo, fontSize: "0.72rem", fontWeight: 600, textAlign: "left", borderTop: `1px solid ${C.surfaceContainerLow}` }}><Trash2 size={12} /> Eliminar</button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <input placeholder="+ agregar ítem..." value={newItemText} onChange={e => setNewItemText(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem()} style={{ ...inputStyle, fontSize: "0.8rem", padding: "6px 9px" }} />
                <button onClick={addItem} style={{ background: C.surfaceContainerLow, border: "none", borderRadius: "7px", padding: "6px 9px", cursor: "pointer", color: C.onSurfaceVariant, display: "flex" }}><Plus size={14} /></button>
            </div>

            {done > 0 && (
                <button onClick={reiniciar} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "none", border: `1px solid ${C.outlineVariant}`, borderRadius: "8px", padding: "7px", cursor: "pointer", color: C.onSurfaceVariant, fontSize: "0.75rem", fontWeight: 700 }}>
                    <RotateCcw size={13} /> Reiniciar
                </button>
            )}

            <ConfirmDialog
                open={confirmDelete}
                title="Eliminar lista"
                message={`¿Eliminar "${lista.title}"? Se pierden todos sus ítems.`}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => { removeNote(lista.id); setConfirmDelete(false); }}
                onCancel={() => setConfirmDelete(false)}
            />
        </div>
    );
};
