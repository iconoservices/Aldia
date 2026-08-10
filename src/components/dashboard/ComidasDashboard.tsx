import { useMemo, useState } from 'react';
import {
    DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Coffee, UtensilsCrossed, Soup, Apple, Plus, X, Search, ChevronLeft, ChevronRight,
    ShoppingCart, Trash2, Pencil, Check,
} from 'lucide-react';
import type { Recipe, MealPlanEntry, MealType, NutritionGoals, ShoppingItem } from '../../hooks/useAlDiaState';
import {
    C, bento, useIsMobile, paddingPagina, cabecera, tituloPagina, subtituloPagina, campo, botonPrimario, RADIO,
} from '../../theme';
import { ConfirmDialog } from '../ui/ConfirmDialog';

/* ══════════════════════════════════════════════════════════════════
   ComidasDashboard — "Calendario de Comidas"

   Grilla semanal (día × comida) donde se arrastran recetas desde la
   Biblioteca. Cada receta lleva sus macros, así que el resumen
   nutricional semanal sale de sumar lo ya planeado — no hay que
   cargarlo aparte. "Generar lista de compras" vuelca los ingredientes
   de las recetas de la semana a Compras (ComprasDashboard), sin
   duplicar lo que ya esté pendiente ahí.
══════════════════════════════════════════════════════════════════ */

interface ComidasDashboardProps {
    recipes: Recipe[];
    addRecipe: (name: string, kcal: number, protein: number, carbs: number, prepMinutes?: number, ingredients?: string) => void;
    removeRecipe: (id: number) => void;
    mealPlanEntries: MealPlanEntry[];
    addMealPlanEntry: (date: string, mealType: MealType, recipeId: number) => void;
    moveMealPlanEntry: (id: number, date: string, mealType: MealType) => void;
    removeMealPlanEntry: (id: number) => void;
    nutritionGoals: NutritionGoals;
    updateNutritionGoals: (updates: Partial<NutritionGoals>) => void;
    shoppingList: ShoppingItem[];
    addShoppingItem: (
        text: string, amount: number, priority: 'necesito' | 'quiero',
        projectId?: number, note?: string, category?: string,
        status?: 'planning' | 'saving' | 'ready', storeName?: string, storeUrl?: string
    ) => void;
}

const MEAL_TYPES: { key: MealType; label: string; icon: typeof Coffee }[] = [
    { key: 'desayuno', label: 'Desayuno', icon: Coffee },
    { key: 'almuerzo', label: 'Almuerzo', icon: UtensilsCrossed },
    { key: 'cena', label: 'Cena', icon: Soup },
    { key: 'snacks', label: 'Snacks', icon: Apple },
];

const toISO = (d: Date) => d.toLocaleDateString('en-CA');

const getMonday = (d: Date) => {
    const date = new Date(d);
    const diff = (date.getDay() + 6) % 7; // Lunes=0 ... Domingo=6
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
};

const emptyRecipeForm = { name: '', kcal: '', protein: '', carbs: '', prepMinutes: '', ingredients: '' };

export const ComidasDashboard = ({
    recipes, addRecipe, removeRecipe,
    mealPlanEntries, addMealPlanEntry, moveMealPlanEntry, removeMealPlanEntry,
    nutritionGoals, updateNutritionGoals,
    shoppingList, addShoppingItem,
}: ComidasDashboardProps) => {
    const movil = useIsMobile();

    const [weekOffset, setWeekOffset] = useState(0);
    const [busqueda, setBusqueda] = useState('');
    const [mostrarFormReceta, setMostrarFormReceta] = useState(false);
    const [formReceta, setFormReceta] = useState(emptyRecipeForm);
    const [confirmDeleteRecipe, setConfirmDeleteRecipe] = useState<Recipe | null>(null);
    const [editingGoals, setEditingGoals] = useState(false);
    const [goalsDraft, setGoalsDraft] = useState(nutritionGoals);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [activeDrag, setActiveDrag] = useState<{ recipeId: number } | null>(null);

    const weekStart = useMemo(() => {
        const d = getMonday(new Date());
        d.setDate(d.getDate() + weekOffset * 7);
        return d;
    }, [weekOffset]);

    const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
    }), [weekStart]);

    const dayISOs = useMemo(() => days.map(toISO), [days]);
    const hoyISO = toISO(new Date());

    const rangoLabel = useMemo(() => {
        const ini = weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        const fin = days[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        return `${ini} – ${fin}`;
    }, [weekStart, days]);

    const recipeById = useMemo(() => new Map(recipes.map(r => [r.id, r])), [recipes]);
    const entriesInWeek = useMemo(() => mealPlanEntries.filter(e => dayISOs.includes(e.date)), [mealPlanEntries, dayISOs]);

    const totales = useMemo(() => entriesInWeek.reduce((acc, e) => {
        const r = recipeById.get(e.recipeId);
        if (r) { acc.calories += r.kcal; acc.protein += r.protein; acc.carbs += r.carbs; }
        return acc;
    }, { calories: 0, protein: 0, carbs: 0 }), [entriesInWeek, recipeById]);

    const recetasFiltradas = useMemo(() =>
        recipes.filter(r => r.name.toLowerCase().includes(busqueda.trim().toLowerCase())),
        [recipes, busqueda]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor),
    );

    const handleDragStart = (e: DragStartEvent) => {
        const [kind, rawId] = (e.active.id as string).split(':');
        if (kind === 'lib') setActiveDrag({ recipeId: Number(rawId) });
        else if (kind === 'entry') {
            const entry = mealPlanEntries.find(en => en.id === Number(rawId));
            if (entry) setActiveDrag({ recipeId: entry.recipeId });
        }
    };

    const handleDragEnd = (e: DragEndEvent) => {
        setActiveDrag(null);
        const { active, over } = e;
        if (!over) return;
        const overId = over.id as string;
        if (!overId.startsWith('cell:')) return;
        const [, date, mealType] = overId.split(':');
        const [kind, rawId] = (active.id as string).split(':');
        if (kind === 'lib') addMealPlanEntry(date, mealType as MealType, Number(rawId));
        else if (kind === 'entry') moveMealPlanEntry(Number(rawId), date, mealType as MealType);
    };

    const submitReceta = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formReceta.name.trim()) return;
        addRecipe(
            formReceta.name.trim(),
            parseFloat(formReceta.kcal) || 0,
            parseFloat(formReceta.protein) || 0,
            parseFloat(formReceta.carbs) || 0,
            formReceta.prepMinutes ? parseInt(formReceta.prepMinutes, 10) : undefined,
            formReceta.ingredients.trim() || undefined,
        );
        setFormReceta(emptyRecipeForm);
        setMostrarFormReceta(false);
    };

    const submitGoals = (e: React.FormEvent) => {
        e.preventDefault();
        updateNutritionGoals(goalsDraft);
        setEditingGoals(false);
    };

    const generarListaCompras = () => {
        const recetasSemana = new Set(entriesInWeek.map(e => e.recipeId));
        const yaEnLista = new Set(shoppingList.filter(i => !i.purchasedAt).map(i => i.text.trim().toLowerCase()));
        let agregados = 0;
        recetasSemana.forEach(id => {
            const receta = recipeById.get(id);
            if (!receta?.ingredients) return;
            receta.ingredients.split('\n').map(l => l.trim()).filter(Boolean).forEach(linea => {
                const key = linea.toLowerCase();
                if (!yaEnLista.has(key)) {
                    addShoppingItem(linea, 0, 'quiero', undefined, undefined, 'Alimentos', 'planning');
                    yaEnLista.add(key);
                    agregados++;
                }
            });
        });
        setFeedback(agregados > 0 ? `${agregados} ítem(s) agregados a Compras` : 'Ya estaba todo en tu lista de compras');
        setTimeout(() => setFeedback(null), 3500);
    };

    return (
        <div style={paddingPagina(movil)}>
            <div style={cabecera(movil)}>
                <div>
                    <h2 style={tituloPagina}>Calendario de Comidas</h2>
                    <p style={subtituloPagina}>Arrastrá recetas a la semana y generá la lista de compras.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button onClick={() => setWeekOffset(o => o - 1)} style={navBtnStyle}><ChevronLeft size={16} /></button>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.onSurface, minWidth: '150px', textAlign: 'center' }}>{rangoLabel}</span>
                    <button onClick={() => setWeekOffset(o => o + 1)} style={navBtnStyle}><ChevronRight size={16} /></button>
                    {weekOffset !== 0 && (
                        <button onClick={() => setWeekOffset(0)} style={{ ...navBtnStyle, width: 'auto', padding: '0 12px', fontSize: '0.72rem', fontWeight: 800, color: C.primary }}>Hoy</button>
                    )}
                </div>
            </div>

            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div style={{ display: 'grid', gridTemplateColumns: movil ? '1fr' : '3fr 1fr', gap: '1.25rem', alignItems: 'flex-start' }}>
                    {/* ── Grilla semanal ── */}
                    <div style={{ ...bento, padding: '0.85rem', overflowX: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: `90px repeat(7, minmax(110px, 1fr))`, gap: '6px', minWidth: '760px' }}>
                            <div />
                            {days.map((d, i) => (
                                <div key={i} style={{ textAlign: 'center', padding: '4px 0' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: C.outline, textTransform: 'uppercase' }}>
                                        {d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')}
                                    </div>
                                    <div style={{
                                        fontSize: '0.85rem', fontWeight: 800, color: dayISOs[i] === hoyISO ? 'white' : C.onSurface,
                                        background: dayISOs[i] === hoyISO ? C.primary : 'transparent',
                                        width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px auto 0',
                                    }}>
                                        {d.getDate()}
                                    </div>
                                </div>
                            ))}

                            {MEAL_TYPES.map(mt => (
                                <MealRow key={mt.key} mealType={mt} dayISOs={dayISOs} entriesInWeek={entriesInWeek} recipeById={recipeById} removeMealPlanEntry={removeMealPlanEntry} />
                            ))}
                        </div>
                    </div>

                    {/* ── Columna lateral ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Resumen nutricional */}
                        <div style={{ ...bento, padding: '1.1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: C.onSurface }}>Resumen Nutricional</h3>
                                <button onClick={() => { setGoalsDraft(nutritionGoals); setEditingGoals(v => !v); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outlineVariant, display: 'flex' }}>
                                    {editingGoals ? <X size={14} /> : <Pencil size={13} />}
                                </button>
                            </div>

                            {editingGoals ? (
                                <form onSubmit={submitGoals} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <NumField label="Calorías (kcal)" value={goalsDraft.calories} onChange={v => setGoalsDraft(g => ({ ...g, calories: v }))} />
                                    <NumField label="Proteína (g)" value={goalsDraft.protein} onChange={v => setGoalsDraft(g => ({ ...g, protein: v }))} />
                                    <NumField label="Carbohidratos (g)" value={goalsDraft.carbs} onChange={v => setGoalsDraft(g => ({ ...g, carbs: v }))} />
                                    <button type="submit" style={{ ...botonPrimario(movil), padding: '7px', fontSize: '0.75rem', justifyContent: 'center' }}><Check size={14} /> Guardar metas</button>
                                </form>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <NutrientBar label="Calorías" value={totales.calories} goal={nutritionGoals.calories} unit="kcal" color={C.primary} />
                                    <NutrientBar label="Proteína" value={totales.protein} goal={nutritionGoals.protein} unit="g" color={C.secondary} />
                                    <NutrientBar label="Carbohidratos" value={totales.carbs} goal={nutritionGoals.carbs} unit="g" color={C.verde} />
                                </div>
                            )}
                        </div>

                        {/* Biblioteca de recetas */}
                        <div style={{ ...bento, padding: '1.1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: C.onSurface }}>Biblioteca de Recetas</h3>
                                <button onClick={() => setMostrarFormReceta(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.primary, display: 'flex' }}>
                                    {mostrarFormReceta ? <X size={16} /> : <Plus size={16} />}
                                </button>
                            </div>

                            <AnimatePresence initial={false}>
                                {mostrarFormReceta && (
                                    <motion.form
                                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                        onSubmit={submitReceta}
                                        style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden', marginBottom: '0.75rem' }}
                                    >
                                        <input placeholder="Nombre de la receta" value={formReceta.name} onChange={e => setFormReceta(f => ({ ...f, name: e.target.value }))} style={{ ...campo(movil), fontSize: '0.8rem', padding: '7px 9px' }} autoFocus />
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                            <input placeholder="kcal" type="number" value={formReceta.kcal} onChange={e => setFormReceta(f => ({ ...f, kcal: e.target.value }))} style={{ ...campo(movil), fontSize: '0.78rem', padding: '7px 8px' }} />
                                            <input placeholder="Prot. (g)" type="number" value={formReceta.protein} onChange={e => setFormReceta(f => ({ ...f, protein: e.target.value }))} style={{ ...campo(movil), fontSize: '0.78rem', padding: '7px 8px' }} />
                                            <input placeholder="Carb. (g)" type="number" value={formReceta.carbs} onChange={e => setFormReceta(f => ({ ...f, carbs: e.target.value }))} style={{ ...campo(movil), fontSize: '0.78rem', padding: '7px 8px' }} />
                                        </div>
                                        <input placeholder="Minutos de preparación (opcional)" type="number" value={formReceta.prepMinutes} onChange={e => setFormReceta(f => ({ ...f, prepMinutes: e.target.value }))} style={{ ...campo(movil), fontSize: '0.78rem', padding: '7px 9px' }} />
                                        <textarea placeholder="Ingredientes, uno por línea (para generar la lista de compras)" value={formReceta.ingredients} onChange={e => setFormReceta(f => ({ ...f, ingredients: e.target.value }))} rows={3} style={{ ...campo(movil), fontSize: '0.78rem', padding: '7px 9px', fontFamily: 'inherit', resize: 'vertical' }} />
                                        <button type="submit" disabled={!formReceta.name.trim()} style={{ ...botonPrimario(movil), padding: '7px', fontSize: '0.75rem', justifyContent: 'center', opacity: formReceta.name.trim() ? 1 : 0.5 }}>Guardar receta</button>
                                    </motion.form>
                                )}
                            </AnimatePresence>

                            <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
                                <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: C.outline }} />
                                <input placeholder="Buscar receta..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...campo(movil), fontSize: '0.78rem', padding: '7px 9px 7px 28px' }} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '340px', overflowY: 'auto' }}>
                                {recetasFiltradas.length === 0 && (
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: C.outline, fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
                                        {recipes.length === 0 ? 'Sin recetas todavía. Agrega la primera arriba.' : 'Sin resultados.'}
                                    </p>
                                )}
                                {recetasFiltradas.map(r => (
                                    <RecipeLibraryCard key={r.id} recipe={r} onDelete={() => setConfirmDeleteRecipe(r)} />
                                ))}
                            </div>
                        </div>

                        <button onClick={generarListaCompras} disabled={entriesInWeek.length === 0} style={{ ...botonPrimario(movil), justifyContent: 'center', opacity: entriesInWeek.length === 0 ? 0.5 : 1 }}>
                            <ShoppingCart size={16} /> Generar Lista de Compras
                        </button>
                        {feedback && (
                            <div style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: C.secondary }}>{feedback}</div>
                        )}
                    </div>
                </div>

                <DragOverlay>
                    {activeDrag && (() => {
                        const r = recipeById.get(activeDrag.recipeId);
                        if (!r) return null;
                        return (
                            <div style={{ background: C.primary, color: 'white', borderRadius: '8px', padding: '6px 10px', fontSize: '0.78rem', fontWeight: 700, boxShadow: '0 6px 16px rgba(0,0,0,0.2)' }}>
                                {r.name}
                            </div>
                        );
                    })()}
                </DragOverlay>
            </DndContext>

            <ConfirmDialog
                open={!!confirmDeleteRecipe}
                title="Eliminar receta"
                message={`¿Eliminar "${confirmDeleteRecipe?.name}"? También se saca del calendario donde esté asignada.`}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => { if (confirmDeleteRecipe) removeRecipe(confirmDeleteRecipe.id); setConfirmDeleteRecipe(null); }}
                onCancel={() => setConfirmDeleteRecipe(null)}
            />
        </div>
    );
};

const navBtnStyle: React.CSSProperties = {
    width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${C.outlineVariant}`,
    background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.onSurfaceVariant,
};

const MealRow = ({ mealType, dayISOs, entriesInWeek, recipeById, removeMealPlanEntry }: {
    mealType: { key: MealType; label: string; icon: typeof Coffee };
    dayISOs: string[];
    entriesInWeek: MealPlanEntry[];
    recipeById: Map<number, Recipe>;
    removeMealPlanEntry: (id: number) => void;
}) => {
    const Icon = mealType.icon;
    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: C.onSurfaceVariant, padding: '6px 0' }}>
                <Icon size={16} />
                <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{mealType.label}</span>
            </div>
            {dayISOs.map(date => (
                <MealCell
                    key={date}
                    date={date}
                    mealType={mealType.key}
                    entries={entriesInWeek.filter(e => e.date === date && e.mealType === mealType.key)}
                    recipeById={recipeById}
                    removeMealPlanEntry={removeMealPlanEntry}
                />
            ))}
        </>
    );
};

const MealCell = ({ date, mealType, entries, recipeById, removeMealPlanEntry }: {
    date: string; mealType: MealType; entries: MealPlanEntry[];
    recipeById: Map<number, Recipe>; removeMealPlanEntry: (id: number) => void;
}) => {
    const { isOver, setNodeRef } = useDroppable({ id: `cell:${date}:${mealType}` });
    return (
        <div ref={setNodeRef} style={{
            minHeight: '64px', borderRadius: '8px', padding: '4px',
            border: `1.5px dashed ${isOver ? C.primary : C.outlineVariant}`,
            background: isOver ? C.surfaceContainerLow : 'transparent',
            display: 'flex', flexDirection: 'column', gap: '4px', transition: 'background 0.1s, border-color 0.1s',
        }}>
            {entries.map(entry => {
                const recipe = recipeById.get(entry.recipeId);
                if (!recipe) return null;
                return <PlacedRecipeChip key={entry.id} entry={entry} recipe={recipe} onRemove={() => removeMealPlanEntry(entry.id)} />;
            })}
        </div>
    );
};

const PlacedRecipeChip = ({ entry, recipe, onRemove }: { entry: MealPlanEntry; recipe: Recipe; onRemove: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `entry:${entry.id}` });
    return (
        <div
            ref={setNodeRef} {...listeners} {...attributes}
            style={{
                transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
                opacity: isDragging ? 0.3 : 1, touchAction: 'none',
                background: C.primaryContainer, borderRadius: '6px', padding: '4px 6px',
                fontSize: '0.68rem', fontWeight: 700, color: C.onPrimaryContainer,
                display: 'flex', alignItems: 'center', gap: '4px', cursor: 'grab',
            }}
        >
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipe.name}</span>
            <button onClick={e => { e.stopPropagation(); onRemove(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', flexShrink: 0, opacity: 0.7 }}>
                <X size={10} />
            </button>
        </div>
    );
};

const RecipeLibraryCard = ({ recipe, onDelete }: { recipe: Recipe; onDelete: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `lib:${recipe.id}` });
    return (
        <div
            ref={setNodeRef} {...listeners} {...attributes}
            style={{
                transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
                opacity: isDragging ? 0.3 : 1, touchAction: 'none',
                ...bento, padding: '0.55rem 0.65rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'grab',
            }}
        >
            <div style={{ width: '30px', height: '30px', minWidth: '30px', borderRadius: '8px', background: C.surfaceContainerLow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UtensilsCrossed size={13} color={C.onSurfaceVariant} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: C.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipe.name}</div>
                <div style={{ fontSize: '0.65rem', color: C.onSurfaceVariant }}>{recipe.kcal} kcal{recipe.prepMinutes ? ` · ${recipe.prepMinutes}m` : ''}</div>
            </div>
            <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outlineVariant, display: 'flex', flexShrink: 0 }}>
                <Trash2 size={13} />
            </button>
        </div>
    );
};

const NutrientBar = ({ label, value, goal, unit, color }: { label: string; value: number; goal: number; unit: string; color: string }) => {
    const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '3px' }}>
                <span style={{ color: C.onSurface, fontWeight: 600 }}>{label}</span>
                <span style={{ color: C.onSurfaceVariant }}>{Math.round(value)} / {goal} {unit}</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: C.surfaceContainerHighest, borderRadius: RADIO.chip, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: RADIO.chip }} />
            </div>
        </div>
    );
};

const NumField = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', fontWeight: 700, color: C.onSurfaceVariant }}>
        {label}
        <input type="number" value={value} onChange={e => onChange(Number(e.target.value) || 0)} style={{ padding: '6px 8px', borderRadius: '8px', border: `1px solid ${C.outlineVariant}`, fontSize: '0.8rem', outline: 'none' }} />
    </label>
);
