import { useState, useMemo, useRef } from 'react';
import { Plus, Minus, ChevronDown, Trash2, RotateCcw, FlaskConical, Calculator as CalculatorIcon, Delete, Save, Check, X, Bookmark, Columns2, LayoutGrid, FolderPlus, MoreVertical } from 'lucide-react';
import type { FixedExpense, UserPreferences } from '../../hooks/useAlDiaState';
import { MONO, useIsMobile, paddingPagina } from '../../theme';

interface Props {
    fixedExpenses: FixedExpense[];
    fixedIncomeItems: { id: number; name: string; amount: number; active: boolean; lastReceivedMonth?: string }[];
    currentMonthStr: string;
    currentBalance: number;
    expenseCategories: string[];
    incomeCategories: string[];
    preferences: UserPreferences;
    updatePreference: (key: keyof UserPreferences, value: any) => void;
}

const LABEL: React.CSSProperties = {
    fontSize: "0.68rem",
    fontWeight: 800,
    color: "#6C8079",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
};

// Monto que se edita tocándolo: se selecciona al entrar y se guarda al salir o con Enter.
const MontoEditable = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => {
    const [txt, setTxt] = useState<string | null>(null);
    const [hover, setHover] = useState(false);
    return (
        <label title="Toca para editar" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontFamily: MONO, fontSize: '0.85rem', fontWeight: 700, color: '#0C2A20', background: txt !== null ? '#FFFFFF' : hover ? '#F7FAF8' : 'transparent', border: `1px solid ${txt !== null ? '#0FA97A' : 'transparent'}`, borderRadius: '8px', padding: '3px 6px', cursor: 'text' }}>
            <span style={{ color: '#6C8079', fontWeight: 500 }}>S/</span>
            <input
                inputMode="decimal"
                value={txt ?? String(value)}
                onFocus={e => { setTxt(String(value)); e.target.select(); }}
                onChange={e => setTxt(e.target.value)}
                onBlur={() => { const n = parseFloat((txt ?? '').replace(',', '.')); if (!isNaN(n) && n >= 0) onChange(n); setTxt(null); }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                style={{ width: '70px', textAlign: 'right', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit', padding: 0 }}
            />
        </label>
    );
};

// Los grupos son las CATEGORÍAS del sistema (las mismas de Movimientos). Como los gastos fijos
// no traen categoría, se deduce del nombre; si no coincide con ninguna, va a "Otros".
const PISTAS_GASTO: Record<string, string[]> = {
    'Servicios': ['luz', 'agua', 'internet', 'celular', 'línea', 'linea', 'movistar', 'claro', 'entel', 'bitel', 'gas', 'cable', 'wifi', 'teléfono', 'telefono', 'alquiler', 'cuarto', 'renta', 'depa', 'casa', 'mantenimiento'],
    'Suscripciones': ['claude', 'chat gpt', 'chatgpt', 'gemini', 'adobe', 'netflix', 'spotify', 'youtube', 'canva', 'disney', 'hbo', 'prime', 'icloud', 'google one', 'notion', 'dropbox', 'suscrip'],
    'Comida': ['almuerzo', 'comida', 'mercado', 'super', 'menú', 'menu', 'desayuno', 'cena'],
    'Transporte': ['pasaje', 'taxi', 'bus', 'gasolina', 'combustible', 'movilidad', 'metro', 'uber'],
    'Salud': ['seguro', 'médico', 'medico', 'farmacia', 'salud', 'gym', 'gimnasio', 'dentista'],
    'Ocio': ['cine', 'salida', 'juego', 'ocio', 'viaje'],
};
const PISTAS_INGRESO: Record<string, string[]> = {
    'Sueldo': ['sueldo', 'salario', 'honorario', 'pago', 'freelance', 'comisión', 'comision'],
    'Venta': ['venta', 'cliente', 'sesión', 'sesion', 'foto'],
    'Inversión': ['inversión', 'inversion', 'interés', 'interes', 'dividendo'],
};
const inferirGrupo = (texto: string, tipo: 'gasto' | 'ingreso', categorias: string[]) => {
    const t = texto.toLowerCase();
    const otros = categorias.find(c => c.toLowerCase() === 'otros') ?? 'Otros';
    // 1) el nombre menciona una categoría tal cual
    const directa = categorias.find(c => c.toLowerCase() !== 'otros' && t.includes(c.toLowerCase()));
    if (directa) return directa;
    // 2) pistas por palabras clave, solo si esa categoría existe en tu lista
    const pistas = tipo === 'gasto' ? PISTAS_GASTO : PISTAS_INGRESO;
    for (const [g, claves] of Object.entries(pistas)) {
        const cat = categorias.find(c => c.toLowerCase() === g.toLowerCase());
        if (cat && claves.some(c => t.includes(c))) return cat;
    }
    return otros;
};

const CALC_KEYS: Array<{ label: string; kind: 'digit' | 'op' | 'dot' | 'clear' | 'back' | 'equals' }> = [
    { label: 'C', kind: 'clear' }, { label: '←', kind: 'back' }, { label: '%', kind: 'op' }, { label: '÷', kind: 'op' },
    { label: '7', kind: 'digit' }, { label: '8', kind: 'digit' }, { label: '9', kind: 'digit' }, { label: '×', kind: 'op' },
    { label: '4', kind: 'digit' }, { label: '5', kind: 'digit' }, { label: '6', kind: 'digit' }, { label: '−', kind: 'op' },
    { label: '1', kind: 'digit' }, { label: '2', kind: 'digit' }, { label: '3', kind: 'digit' }, { label: '+', kind: 'op' },
    { label: '0', kind: 'digit' }, { label: '.', kind: 'dot' }, { label: '=', kind: 'equals' },
];

// Calculadora suelta, sin relación con el plan — solo para sacar cuentas al vuelo.
const MiniCalculator = ({ onUsar, onMinimizar, flotante }: { onUsar: (tipo: 'gasto' | 'ingreso', monto: number) => void; onMinimizar: () => void; flotante: boolean }) => {
    const movil = useIsMobile();
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement>(null);
    const arrastre = useRef<{ x: number; y: number; px: number; py: number; r: DOMRect } | null>(null);
    const [expr, setExpr] = useState('');
    const resultado = /^\d+(\.\d+)?$/.test(expr) && Number(expr) > 0 ? Number(expr) : null;

    const press = (key: typeof CALC_KEYS[number]) => {
        if (key.kind === 'clear') { setExpr(''); return; }
        if (key.kind === 'back') { setExpr(e => e.slice(0, -1)); return; }
        if (key.kind === 'equals') {
            if (!expr.trim()) return;
            const safe = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
            if (!/^[0-9+\-*/.%() ]*$/.test(safe)) { setExpr(''); return; }
            try {
                // eslint-disable-next-line no-new-func
                const result = Function(`"use strict"; return (${safe})`)();
                setExpr(Number.isFinite(result) ? String(Math.round(result * 100) / 100) : '');
            } catch { setExpr(''); }
            return;
        }
        setExpr(e => e + key.label);
    };

    return (
        <div
        ref={panelRef}
        title={flotante ? 'Arrástrala para moverla' : undefined}
        onPointerDown={e => {
            if (!flotante || (e.target as HTMLElement).closest('button')) return;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            arrastre.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y, r: e.currentTarget.getBoundingClientRect() };
        }}
        onPointerMove={e => {
            const a = arrastre.current; if (!a) return;
            // sin salirse de la pantalla
            const dx = Math.min(Math.max(e.clientX - a.x, -a.r.left), window.innerWidth - a.r.right);
            const dy = Math.min(Math.max(e.clientY - a.y, -a.r.top), window.innerHeight - a.r.bottom);
            setPos({ x: a.px + dx, y: a.py + dy });
        }}
        onPointerUp={() => { arrastre.current = null; }}
        style={flotante
            ? { cursor: 'grab', touchAction: 'none', userSelect: 'none', position: 'fixed', right: movil ? '12px' : '24px', bottom: movil ? '152px' : '92px', zIndex: 920, width: movil ? 'calc(100vw - 24px)' : '232px', background: '#FFFFFF', border: '1px solid #DCE7E1', borderRadius: '14px', padding: movil ? '8px' : '10px', boxShadow: '0 12px 40px rgba(15,23,42,0.22)', transform: `translate(${pos.x}px, ${pos.y}px)` }
            : { width: '260px', flexShrink: 0, alignSelf: 'flex-start', background: '#FFFFFF', border: '1px solid #DCE7E1', borderRadius: '16px', padding: '16px', boxShadow: '0px 4px 12px rgba(15,23,42,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <CalculatorIcon size={15} color="#F59E0B" />
                <span style={{ ...LABEL, flex: 1 }}>Calculadora</span>
                <button onClick={onMinimizar} title="Minimizar" style={{ background: '#F7FAF8', border: 'none', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6C8079' }}>
                    <Minus size={16} />
                </button>
            </div>
            <div style={{ background: '#F7FAF8', borderRadius: '10px', padding: movil ? '4px 10px' : '6px 10px', marginBottom: movil ? '6px' : '8px', minHeight: movil ? '1.5rem' : '1.9rem', fontSize: movil ? '1rem' : '1.1rem', fontWeight: 700, color: '#0C2A20', textAlign: 'right', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                {expr || '0'}
            </div>
            {resultado !== null && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                    <button onClick={() => onUsar('gasto', resultado)} style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: '1px solid #DCE7E1', background: '#FFFFFF', color: '#C63C3C', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>Usar como gasto</button>
                    <button onClick={() => onUsar('ingreso', resultado)} style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: '1px solid #DCE7E1', background: '#FFFFFF', color: '#0E9F6E', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>Usar como ingreso</button>
                </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px' }}>
                {CALC_KEYS.map((k, i) => (
                    <button key={i} onClick={() => press(k)} style={{
                        gridColumn: k.label === '=' ? 'span 2' : undefined,
                        padding: movil ? '5px 0' : '7px 0',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: movil ? '0.82rem' : '0.9rem',
                        fontWeight: 700,
                        background: k.kind === 'equals' ? '#F59E0B' : k.kind === 'op' ? '#FEF3C7' : k.kind === 'clear' ? '#FEE2E2' : '#F7FAF8',
                        color: k.kind === 'equals' ? '#fff' : k.kind === 'clear' ? '#C63C3C' : '#0C2A20',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {k.kind === 'back' ? <Delete size={15} /> : k.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

// Selector de grupo con opción de crear uno nuevo exclusivo para la proyección
const SelectGrupo = ({
    value,
    categorias,
    placeholder = 'Grupo',
    style,
    title = 'Cambiar de grupo',
    onSelect,
    onPedirCrear,
}: {
    value: string;
    categorias: string[];
    placeholder?: string;
    style?: React.CSSProperties;
    title?: string;
    onSelect: (val: string) => void;
    onPedirCrear: () => void;
}) => {
    return (
        <select
            value={value}
            onChange={e => {
                if (e.target.value === '__crear_nuevo__') {
                    onPedirCrear();
                } else {
                    onSelect(e.target.value);
                }
            }}
            title={title}
            style={style}
        >
            <option value="">{placeholder}</option>
            <option value="__crear_nuevo__" style={{ fontWeight: 800, color: '#0FA97A' }}>+ Crear nuevo grupo…</option>
            <option disabled style={{ fontSize: '0.6rem', color: '#9CA3AF' }}>──────────</option>
            {categorias.map(g => (
                <option key={g} value={g}>{g}</option>
            ))}
        </select>
    );
};

export const ProyeccionOriginalDashboard = ({ fixedExpenses, fixedIncomeItems, currentBalance, expenseCategories, incomeCategories, preferences, updatePreference }: Props) => {
    const movil = useIsMobile();
    const [calcAbierta, setCalcAbiertaRaw] = useState<boolean>(() => {
        try { const v = localStorage.getItem('aldia_calc_abierta'); if (v !== null) return v === '1'; } catch { /* sin almacenamiento */ }
        return false;
    });
    const setCalcAbierta = (v: boolean) => {
        setCalcAbiertaRaw(v);
        try { localStorage.setItem('aldia_calc_abierta', v ? '1' : '0'); } catch { /* sin almacenamiento */ }
    };

    /* ── Plan del mes: tu propio plan editable, para jugar "¿y si...?".
       Se siembra una vez desde los gastos/ingresos fijos reales, pero de ahí en
       más vive guardado en preferences (Firestore) — lo que agregues, borres o
       marques se conserva entre sesiones. "Reiniciar" vuelve a sembrar desde
       los datos reales de hoy. Nada de esto toca transacciones ni gastos/
       ingresos fijos reales: es una copia aparte. ── */
    type SimFixedExpense = { id: number; text: string; amount: number; active: boolean; dueDay?: number; lastPaidMonth?: string; custom?: boolean; excluido?: boolean; grupo?: string };
    type SimFixedIncome = { id: number; name: string; amount: number; active: boolean; lastReceivedMonth?: string; custom?: boolean; excluido?: boolean; grupo?: string };
    type SimMovSuelto = { id: number; text: string; amount: number; type: 'gasto' | 'ingreso'; excluido?: boolean; grupo?: string };
    type Plan = {
        fixedExpenses: SimFixedExpense[];
        fixedIncomes: SimFixedIncome[];
        movs?: SimMovSuelto[];
        usarSaldo?: boolean;
        mostrarGastosFijos?: boolean;
        mostrarIngresosFijos?: boolean;
        mostrarSueltos?: boolean;
        gruposGasto?: string[];   // nuevos grupos creados solo para la simulación
        gruposIngreso?: string[]; // nuevos grupos creados solo para la simulación
    };

    const seedPlan = (): Plan => ({
        fixedExpenses: fixedExpenses.filter(f => f.active).map(f => ({ id: f.id, text: f.text, amount: f.amount, active: f.active, dueDay: f.dueDay, lastPaidMonth: f.lastPaidMonth })),
        fixedIncomes: fixedIncomeItems.filter(f => f.active).map(f => ({ id: f.id, name: f.name, amount: f.amount, active: f.active, lastReceivedMonth: f.lastReceivedMonth })),
        movs: [],
        mostrarGastosFijos: true,
        mostrarIngresosFijos: true,
        mostrarSueltos: true,
        gruposGasto: [],
        gruposIngreso: [],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalizarPlan = (parsed: any): Plan | null => {
        if (!parsed || typeof parsed !== 'object') return null;
        if (!Array.isArray(parsed.fixedExpenses) && !Array.isArray(parsed.fixedIncomes) && !Array.isArray(parsed.movs)) {
            return null;
        }
        const fe: SimFixedExpense[] = [];
        const fi: SimFixedIncome[] = [];
        const movs: SimMovSuelto[] = Array.isArray(parsed.movs) ? [...parsed.movs] : [];
        let migroSueltosVisibles = false;

        // Separar movimientos sueltos que hayan sido agregados como custom: true
        // para que no contaminen los gastos/ingresos fijos.
        for (const f of (Array.isArray(parsed.fixedExpenses) ? parsed.fixedExpenses : [])) {
            if (f.custom) {
                if (!movs.some(m => m.id === f.id)) {
                    movs.push({
                        id: f.id,
                        text: f.text,
                        amount: f.amount,
                        type: 'gasto',
                        excluido: f.excluido,
                        grupo: f.grupo,
                    });
                    if (parsed.mostrarGastosFijos !== false && !f.excluido) {
                        migroSueltosVisibles = true;
                    }
                }
            } else {
                fe.push(f);
            }
        }

        for (const f of (Array.isArray(parsed.fixedIncomes) ? parsed.fixedIncomes : [])) {
            if (f.custom) {
                if (!movs.some(m => m.id === f.id)) {
                    movs.push({
                        id: f.id,
                        text: f.name || f.text,
                        amount: f.amount,
                        type: 'ingreso',
                        excluido: f.excluido,
                        grupo: f.grupo,
                    });
                    if (parsed.mostrarIngresosFijos !== false && !f.excluido) {
                        migroSueltosVisibles = true;
                    }
                }
            } else {
                fi.push(f);
            }
        }

        // Deducir visibilidad: si el usuario los tenía todos excluidos en su sesión anterior
        // (desactivados desde arriba), mantenerlos ocultos como esperaba.
        const mostrarGastosFijos = parsed.mostrarGastosFijos !== undefined
            ? !!parsed.mostrarGastosFijos
            : !(fe.length > 0 && fe.every(f => f.excluido));

        const mostrarIngresosFijos = parsed.mostrarIngresosFijos !== undefined
            ? !!parsed.mostrarIngresosFijos
            : !(fi.length > 0 && fi.every(f => f.excluido));

        const mostrarSueltos = parsed.mostrarSueltos !== undefined
            ? (!!parsed.mostrarSueltos || migroSueltosVisibles)
            : true;

        const gruposGasto: string[] = Array.isArray(parsed.gruposGasto) ? parsed.gruposGasto : [];
        const gruposIngreso: string[] = Array.isArray(parsed.gruposIngreso) ? parsed.gruposIngreso : [];

        return {
            fixedExpenses: fe,
            fixedIncomes: fi,
            movs,
            usarSaldo: !!parsed.usarSaldo,
            mostrarGastosFijos,
            mostrarIngresosFijos,
            mostrarSueltos,
            gruposGasto,
            gruposIngreso,
        };
    };

    const plan: Plan = useMemo(() => {
        try {
            const parsed = preferences.planDelMes ? JSON.parse(preferences.planDelMes) : null;
            const norm = normalizarPlan(parsed);
            if (norm) return norm;
        } catch { /* si el JSON guardado quedó corrupto, se re-siembra abajo */ }
        return seedPlan();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preferences.planDelMes]);

    const savePlan = (next: Plan) => updatePreference('planDelMes', JSON.stringify(next));

    // Categorías combinadas para la simulación: base global + grupos creados en esta proyección
    const catsGasto = useMemo(() => {
        const base = expenseCategories.length ? expenseCategories : ['Otros'];
        const extras = plan.gruposGasto || [];
        const deItems = [
            ...plan.fixedExpenses.map(f => f.grupo),
            ...(plan.movs || []).filter(m => m.type === 'gasto').map(m => m.grupo)
        ].filter(Boolean) as string[];
        return Array.from(new Set([...base, ...extras, ...deItems]));
    }, [expenseCategories, plan.gruposGasto, plan.fixedExpenses, plan.movs]);

    const catsIngreso = useMemo(() => {
        const base = incomeCategories.length ? incomeCategories : ['Otros'];
        const extras = plan.gruposIngreso || [];
        const deItems = [
            ...plan.fixedIncomes.map(f => f.grupo),
            ...(plan.movs || []).filter(m => m.type === 'ingreso').map(m => m.grupo)
        ].filter(Boolean) as string[];
        return Array.from(new Set([...base, ...extras, ...deItems]));
    }, [incomeCategories, plan.gruposIngreso, plan.fixedIncomes, plan.movs]);

    const GRUPO_SUELTO_GASTO = 'Gastos sueltos / extras';
    const GRUPO_SUELTO_INGRESO = 'Ingresos sueltos / extras';

    const grupoDeSuelto = (m: SimMovSuelto): string => {
        const def = m.type === 'gasto' ? GRUPO_SUELTO_GASTO : GRUPO_SUELTO_INGRESO;
        const g = (m.grupo || '').trim();
        return (!g || g === def) ? def : g;
    };

    const agruparSueltos = (lista: SimMovSuelto[], tipo: 'gasto' | 'ingreso'): Array<[string, SimMovSuelto[]]> => {
        const def = tipo === 'gasto' ? GRUPO_SUELTO_GASTO : GRUPO_SUELTO_INGRESO;
        const orden = tipo === 'gasto' ? catsGasto : catsIngreso;
        const mapa = new Map<string, SimMovSuelto[]>();
        for (const m of lista) {
            const g = grupoDeSuelto(m);
            mapa.set(g, [...(mapa.get(g) ?? []), m]);
        }
        return [...mapa.entries()].sort((a, b) => {
            if (a[0] === def && b[0] !== def) return 1;
            if (b[0] === def && a[0] !== def) return -1;
            const ia = orden.indexOf(a[0]);
            const ib = orden.indexOf(b[0]);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });
    };

    // Modal para crear nuevo grupo solo para la simulación de proyección
    const [modalCrearGrupo, setModalCrearGrupo] = useState<{
        tipo: 'gasto' | 'ingreso';
        onCrear: (nuevoGrupo: string, planBase: Plan) => Plan | void;
    } | null>(null);
    const [nombreNuevoGrupo, setNombreNuevoGrupo] = useState('');

    const confirmarCrearGrupo = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const clean = nombreNuevoGrupo.trim();
        if (!clean || !modalCrearGrupo) return;
        const tipo = modalCrearGrupo.tipo;
        const key = tipo === 'gasto' ? 'gruposGasto' : 'gruposIngreso';
        const actual = tipo === 'gasto' ? (plan.gruposGasto || []) : (plan.gruposIngreso || []);
        const next = Array.from(new Set([...actual, clean]));
        const nextPlan: Plan = {
            ...plan,
            [key]: next,
        };
        const updated = modalCrearGrupo.onCrear(clean, nextPlan);
        savePlan(updated ?? nextPlan);
        setModalCrearGrupo(null);
        setNombreNuevoGrupo('');
    };

    type MenuFilaConfig = {
        idKey: string;
        rect: DOMRect;
        tipo: 'gasto' | 'ingreso';
        grupoActual: string;
        gruposDisponibles: string[];
        defaultGrupoLabel?: string;
        onCambiarGrupo: (grupo: string) => void;
        onCrearGrupo: () => void;
        onEliminar: () => void;
    };
    const [menuFila, setMenuFila] = useState<MenuFilaConfig | null>(null);

    /* ── Proyecciones guardadas: copias con nombre del plan (sirven como presupuestos).
       Guardar = foto del plan actual; Cargar = reemplaza el plan actual por esa foto. ── */
    type Guardada = { id: number; nombre: string; fecha: string; plan: Plan };
    const guardadas: Guardada[] = useMemo(() => {
        try { const g = preferences.proyeccionesGuardadas ? JSON.parse(preferences.proyeccionesGuardadas) : []; return Array.isArray(g) ? g : []; } catch { return []; }
    }, [preferences.proyeccionesGuardadas]);
    const saveGuardadas = (next: Guardada[]) => updatePreference('proyeccionesGuardadas', JSON.stringify(next));
    const [nombreGuardar, setNombreGuardar] = useState<string | null>(null);
    const [cargadaId, setCargadaId] = useState<number | null>(null);
    const [deshacer, setDeshacer] = useState<Plan | null>(null); // plan que había antes de cargar una guardada
    const cargada = guardadas.find(g => g.id === cargadaId);
    const cargadaNormalizada = useMemo(() => (cargada ? normalizarPlan(cargada.plan) : null), [cargada]);
    const cargadaModificada = !!cargadaNormalizada && JSON.stringify(plan) !== JSON.stringify(cargadaNormalizada);
    const cargarGuardada = (g: Guardada) => {
        const normalizado = normalizarPlan(g.plan) ?? seedPlan();
        const yaIdentica = g.id === cargadaId && JSON.stringify(plan) === JSON.stringify(normalizado);
        if (!yaIdentica) {
            setDeshacer(plan);
        }
        savePlan(normalizado);
        setCargadaId(g.id);
    };
    const [borrarId, setBorrarId] = useState<number | null>(null); // borrar pide un segundo toque
    const guardarProyeccion = () => {
        const nombre = (nombreGuardar ?? '').trim();
        if (!nombre) return;
        const existente = guardadas.find(g => g.nombre.toLowerCase() === nombre.toLowerCase());
        const foto: Guardada = { id: existente?.id ?? Date.now(), nombre, fecha: new Date().toISOString(), plan };
        saveGuardadas(existente ? guardadas.map(g => g.id === existente.id ? foto : g) : [foto, ...guardadas]);
        setCargadaId(foto.id);
        setNombreGuardar(null);
    };
    const resultadoDe = (rawPlan: Plan) => {
        const p = normalizarPlan(rawPlan) ?? rawPlan;
        const saldo = p.usarSaldo ? currentBalance : 0;
        const gf = p.mostrarGastosFijos !== false
            ? (p.fixedExpenses || []).filter(f => !f.excluido).reduce((s, f) => s + (Number(f.amount) || 0), 0)
            : 0;
        const fi = p.mostrarIngresosFijos !== false
            ? (p.fixedIncomes || []).filter(f => !f.excluido).reduce((s, f) => s + (Number(f.amount) || 0), 0)
            : 0;
        const msG = p.mostrarSueltos !== false
            ? (p.movs || []).filter(m => m.type === 'gasto' && !m.excluido).reduce((s, m) => s + (Number(m.amount) || 0), 0)
            : 0;
        const msI = p.mostrarSueltos !== false
            ? (p.movs || []).filter(m => m.type === 'ingreso' && !m.excluido).reduce((s, m) => s + (Number(m.amount) || 0), 0)
            : 0;
        return saldo + fi + msI - gf - msG;
    };

    const [nuevoGasto, setNuevoGasto] = useState({ text: '', amount: '', cantidad: '' });
    const [usarCantidadGasto, setUsarCantidadGasto] = useState(false);
    const [nuevoGrupoGasto, setNuevoGrupoGasto] = useState('');
    const [nuevoGrupoIngreso, setNuevoGrupoIngreso] = useState('');
    const nuevoGastoTotal = usarCantidadGasto ? (parseFloat(nuevoGasto.cantidad) || 0) * (parseFloat(nuevoGasto.amount) || 0) : (parseFloat(nuevoGasto.amount) || 0);

    const [nuevoIngresoFijo, setNuevoIngresoFijo] = useState({ name: '', amount: '', cantidad: '' });
    const [usarCantidadIngreso, setUsarCantidadIngreso] = useState(false);
    const nuevoIngresoTotal = usarCantidadIngreso ? (parseFloat(nuevoIngresoFijo.cantidad) || 0) * (parseFloat(nuevoIngresoFijo.amount) || 0) : (parseFloat(nuevoIngresoFijo.amount) || 0);

    const [nuevoSuelto, setNuevoSuelto] = useState({ text: '', amount: '', cantidad: '', tipo: 'gasto' as 'gasto' | 'ingreso' });
    const [usarCantidadSuelto, setUsarCantidadSuelto] = useState(false);
    const [nuevoGrupoSuelto, setNuevoGrupoSuelto] = useState('');
    const nuevoSueltoTotal = usarCantidadSuelto ? (parseFloat(nuevoSuelto.cantidad) || 0) * (parseFloat(nuevoSuelto.amount) || 0) : (parseFloat(nuevoSuelto.amount) || 0);

    // Grupos: cerrados salvo que los abras. Listas: abiertas salvo que las contraigas.
    const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
    const [listaCerrada, setListaCerrada] = useState<{ gastos: boolean; ingresos: boolean; sueltos: boolean }>({ gastos: false, ingresos: false, sueltos: false });

    // Vista: 2 Columnas (Gastos / Ingresos) por defecto, o Tarjetas independientes
    const [vista, setVista] = useState<'columnas' | 'tarjetas'>(() => {
        try {
            const v = localStorage.getItem('aldia_proyeccion_vista');
            if (v === 'tarjetas' || v === 'columnas') return v;
        } catch {}
        return 'columnas';
    });
    const cambiarVista = (v: 'columnas' | 'tarjetas') => {
        setVista(v);
        try { localStorage.setItem('aldia_proyeccion_vista', v); } catch {}
    };

    // Subsecciones contraíbles dentro de las 2 columnas y tarjetas de grupos sueltos
    const [colCerrada, setColCerrada] = useState<{ gastosFijos: boolean; gastosSueltos: boolean; ingresosFijos: boolean; ingresosSueltos: boolean }>({
        gastosFijos: false,
        gastosSueltos: false,
        ingresosFijos: false,
        ingresosSueltos: false,
    });
    const [sueltosCerrados, setSueltosCerrados] = useState<Record<string, boolean>>({});

    // Formulario de agregar en la columna de Gastos
    const [modoColGasto, setModoColGasto] = useState<'suelto' | 'fijo'>('suelto');
    const [formColGasto, setFormColGasto] = useState({ text: '', amount: '', cantidad: '', grupo: '' });
    const [usarCantColGasto, setUsarCantColGasto] = useState(false);
    const formColGastoTotal = usarCantColGasto
        ? (parseFloat(formColGasto.cantidad) || 0) * (parseFloat(formColGasto.amount) || 0)
        : (parseFloat(formColGasto.amount) || 0);

    // Formulario de agregar en la columna de Ingresos
    const [modoColIngreso, setModoColIngreso] = useState<'suelto' | 'fijo'>('suelto');
    const [formColIngreso, setFormColIngreso] = useState({ name: '', amount: '', cantidad: '', grupo: '' });
    const [usarCantColIngreso, setUsarCantColIngreso] = useState(false);
    const formColIngresoTotal = usarCantColIngreso
        ? (parseFloat(formColIngreso.cantidad) || 0) * (parseFloat(formColIngreso.amount) || 0)
        : (parseFloat(formColIngreso.amount) || 0);

    const reiniciarSimulacion = () => {
        savePlan({ ...seedPlan(), usarSaldo: plan.usarSaldo });
        setCargadaId(null);
        setDeshacer(null);
    };

    const mostrarGastos = plan.mostrarGastosFijos !== false;
    const mostrarIngresos = plan.mostrarIngresosFijos !== false;
    const mostrarSueltos = plan.mostrarSueltos !== false;

    const simFijosTotal = useMemo(() => {
        if (!mostrarGastos) return 0;
        return plan.fixedExpenses.filter(f => !f.excluido).reduce((s, f) => s + (Number(f.amount) || 0), 0);
    }, [plan.fixedExpenses, mostrarGastos]);

    const simIngresoPrevisto = useMemo(() => {
        if (!mostrarIngresos) return 0;
        return plan.fixedIncomes.filter(f => !f.excluido).reduce((s, f) => s + (Number(f.amount) || 0), 0);
    }, [plan.fixedIncomes, mostrarIngresos]);

    const simSueltosGastos = useMemo(() => {
        if (!mostrarSueltos) return 0;
        return (plan.movs || []).filter(m => m.type === 'gasto' && !m.excluido).reduce((s, m) => s + (Number(m.amount) || 0), 0);
    }, [plan.movs, mostrarSueltos]);

    const simSueltosIngresos = useMemo(() => {
        if (!mostrarSueltos) return 0;
        return (plan.movs || []).filter(m => m.type === 'ingreso' && !m.excluido).reduce((s, m) => s + (Number(m.amount) || 0), 0);
    }, [plan.movs, mostrarSueltos]);

    const totalIngresos = simIngresoPrevisto + simSueltosIngresos;
    const totalGastos = simFijosTotal + simSueltosGastos;
    const saldoBase = plan.usarSaldo ? currentBalance : 0;
    const simQueda = saldoBase + totalIngresos - totalGastos;

    const toggleTopGastos = (mostrar: boolean) => {
        savePlan({
            ...plan,
            mostrarGastosFijos: mostrar,
            fixedExpenses: mostrar && plan.fixedExpenses.every(f => f.excluido)
                ? plan.fixedExpenses.map(f => ({ ...f, excluido: false }))
                : plan.fixedExpenses,
        });
    };

    const toggleTopIngresos = (mostrar: boolean) => {
        savePlan({
            ...plan,
            mostrarIngresosFijos: mostrar,
            fixedIncomes: mostrar && plan.fixedIncomes.every(f => f.excluido)
                ? plan.fixedIncomes.map(f => ({ ...f, excluido: false }))
                : plan.fixedIncomes,
        });
    };

    const toggleTopSueltos = (mostrar: boolean) => {
        savePlan({
            ...plan,
            mostrarSueltos: mostrar,
            movs: mostrar && (plan.movs || []).every(m => m.excluido)
                ? (plan.movs || []).map(m => ({ ...m, excluido: false }))
                : plan.movs,
        });
    };

    const money = (n: number) => `S/ ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;


    const botonMenuFila = (config: Omit<MenuFilaConfig, 'rect'>) => {
        const abierto = menuFila?.idKey === config.idKey;
        return (
            <button
                type="button"
                onClick={e => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setMenuFila(prev => prev?.idKey === config.idKey ? null : { ...config, rect });
                }}
                title="Cambiar de grupo o eliminar"
                style={{
                    background: abierto ? 'rgba(15,169,122,0.12)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: abierto ? '#0FA97A' : '#6C8079',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background .15s, color .15s',
                }}
            >
                <MoreVertical size={15} />
            </button>
        );
    };

    const filaGasto = (f: SimFixedExpense) => (
        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 2px", borderBottom: "1px solid #EDF3F0", opacity: f.excluido ? 0.4 : 1 }}>
            <input type="checkbox" checked={!f.excluido} title="Contar en la proyección" onChange={e => savePlan({ ...plan, fixedExpenses: plan.fixedExpenses.map(x => x.id === f.id ? { ...x, excluido: !e.target.checked } : x) })} style={{ accentColor: "#0FA97A", flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: "0.8rem", fontWeight: 600, color: "#0C2A20", textDecoration: f.excluido ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.text}{f.custom && <span style={{ marginLeft: 6, fontSize: "0.62rem", fontWeight: 700, color: "#B45309" }}>tuyo</span>}</span>
            <MontoEditable value={f.amount} onChange={n => savePlan({ ...plan, fixedExpenses: plan.fixedExpenses.map(x => x.id === f.id ? { ...x, amount: n } : x) })} />
            {botonMenuFila({
                idKey: `fijo:gasto:${f.id}`,
                tipo: 'gasto',
                grupoActual: f.grupo || inferirGrupo(f.text, 'gasto', catsGasto),
                gruposDisponibles: catsGasto,
                onCambiarGrupo: g => savePlan({ ...plan, fixedExpenses: plan.fixedExpenses.map(x => x.id === f.id ? { ...x, grupo: g } : x) }),
                onCrearGrupo: () => setModalCrearGrupo({
                    tipo: 'gasto',
                    onCrear: (g, p) => ({ ...p, fixedExpenses: p.fixedExpenses.map(x => x.id === f.id ? { ...x, grupo: g } : x) }),
                }),
                onEliminar: () => savePlan({ ...plan, fixedExpenses: plan.fixedExpenses.filter(x => x.id !== f.id) }),
            })}
        </div>
    );
    const filaIngreso = (f: SimFixedIncome) => (
        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 2px", borderBottom: "1px solid #EDF3F0", opacity: f.excluido ? 0.4 : 1 }}>
            <input type="checkbox" checked={!f.excluido} title="Contar en la proyección" onChange={e => savePlan({ ...plan, fixedIncomes: plan.fixedIncomes.map(x => x.id === f.id ? { ...x, excluido: !e.target.checked } : x) })} style={{ accentColor: "#0FA97A", flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: "0.8rem", fontWeight: 600, color: "#0C2A20", textDecoration: f.excluido ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}{f.custom && <span style={{ marginLeft: 6, fontSize: "0.62rem", fontWeight: 700, color: "#B45309" }}>tuyo</span>}</span>
            <MontoEditable value={f.amount} onChange={n => savePlan({ ...plan, fixedIncomes: plan.fixedIncomes.map(x => x.id === f.id ? { ...x, amount: n } : x) })} />
            {botonMenuFila({
                idKey: `fijo:ingreso:${f.id}`,
                tipo: 'ingreso',
                grupoActual: f.grupo || inferirGrupo(f.name, 'ingreso', catsIngreso),
                gruposDisponibles: catsIngreso,
                onCambiarGrupo: g => savePlan({ ...plan, fixedIncomes: plan.fixedIncomes.map(x => x.id === f.id ? { ...x, grupo: g } : x) }),
                onCrearGrupo: () => setModalCrearGrupo({
                    tipo: 'ingreso',
                    onCrear: (g, p) => ({ ...p, fixedIncomes: p.fixedIncomes.map(x => x.id === f.id ? { ...x, grupo: g } : x) }),
                }),
                onEliminar: () => savePlan({ ...plan, fixedIncomes: plan.fixedIncomes.filter(x => x.id !== f.id) }),
            })}
        </div>
    );

    const filaMovSuelto = (m: SimMovSuelto, mostrarTipoBadge = false) => {
        const esGasto = m.type === 'gasto';
        const defGrupo = esGasto ? GRUPO_SUELTO_GASTO : GRUPO_SUELTO_INGRESO;
        const valorGrupo = (m.grupo && m.grupo !== defGrupo) ? m.grupo : '';
        const catsSinDef = (esGasto ? catsGasto : catsIngreso).filter(c => c !== defGrupo);
        return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 2px', borderBottom: '1px solid #EDF3F0', opacity: m.excluido ? 0.4 : 1 }}>
                <input
                    type="checkbox"
                    checked={!m.excluido}
                    title="Contar en la proyección"
                    onChange={e => savePlan({ ...plan, movs: (plan.movs || []).map(x => x.id === m.id ? { ...x, excluido: !e.target.checked } : x) })}
                    style={{ accentColor: '#0FA97A', flexShrink: 0 }}
                />
                {mostrarTipoBadge && (
                    <button
                        type="button"
                        onClick={() => savePlan({
                            ...plan,
                            movs: (plan.movs || []).map(x => x.id === m.id ? { ...x, type: x.type === 'gasto' ? 'ingreso' : 'gasto' } : x),
                        })}
                        title="Toca para cambiar entre Gasto e Ingreso"
                        style={{
                            border: 'none',
                            borderRadius: '6px',
                            padding: '2px 6px',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: esGasto ? '#FEE2E2' : 'rgba(15,169,122,0.12)',
                            color: esGasto ? '#C63C3C' : '#0E9F6E',
                            flexShrink: 0,
                        }}
                    >
                        {esGasto ? 'Gasto' : 'Ingreso'}
                    </button>
                )}
                <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, color: '#0C2A20', textDecoration: m.excluido ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.text}
                    {!mostrarTipoBadge && (
                        <span style={{
                            marginLeft: 6,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            color: esGasto ? '#B45309' : '#0E9F6E',
                            background: esGasto ? 'rgba(180,83,9,0.08)' : 'rgba(14,159,110,0.08)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                        }}>suelto</span>
                    )}
                </span>
                <MontoEditable value={m.amount} onChange={n => savePlan({ ...plan, movs: (plan.movs || []).map(x => x.id === m.id ? { ...x, amount: n } : x) })} />
                {botonMenuFila({
                    idKey: `suelto:${m.id}`,
                    tipo: m.type,
                    grupoActual: valorGrupo,
                    defaultGrupoLabel: defGrupo,
                    gruposDisponibles: catsSinDef,
                    onCambiarGrupo: g => savePlan({ ...plan, movs: (plan.movs || []).map(x => x.id === m.id ? { ...x, grupo: g || undefined } : x) }),
                    onCrearGrupo: () => setModalCrearGrupo({
                        tipo: m.type,
                        onCrear: (g, p) => ({
                            ...p,
                            movs: (p.movs || []).map(x => x.id === m.id ? { ...x, grupo: g } : x),
                        }),
                    }),
                    onEliminar: () => savePlan({ ...plan, movs: (plan.movs || []).filter(x => x.id !== m.id) }),
                })}
            </div>
        );
    };

    // Lista agrupada: cada grupo muestra su subtotal y se abre/cierra al tocarlo.
    const renderGrupos = (tipo: 'gasto' | 'ingreso') => {
        const items: (SimFixedExpense | SimFixedIncome)[] = tipo === 'gasto' ? plan.fixedExpenses : plan.fixedIncomes;
        const nombreDe = (f: SimFixedExpense | SimFixedIncome) => 'text' in f ? f.text : f.name;
        const orden = tipo === 'gasto' ? catsGasto : catsIngreso;
        const mapa = new Map<string, (SimFixedExpense | SimFixedIncome)[]>();
        for (const f of items) {
            const g = f.grupo || inferirGrupo(nombreDe(f), tipo, orden);
            mapa.set(g, [...(mapa.get(g) ?? []), f]);
        }
        const grupos = [...mapa.entries()].sort((a, b) => (orden.indexOf(a[0]) === -1 ? 99 : orden.indexOf(a[0])) - (orden.indexOf(b[0]) === -1 ? 99 : orden.indexOf(b[0])));
        return grupos.map(([nombre, lista]) => {
            const clave = tipo + ':' + nombre;
            const abierto = !!abiertos[clave];
            const incluidos = lista.filter(f => !f.excluido);
            const subtotal = incluidos.reduce((t, f) => t + (Number(f.amount) || 0), 0);
            const ids = new Set(lista.map(f => f.id));
            const todosOn = incluidos.length === lista.length;
            const marcarGrupo = (on: boolean) => savePlan(tipo === 'gasto'
                ? { ...plan, fixedExpenses: plan.fixedExpenses.map(f => ids.has(f.id) ? { ...f, excluido: !on } : f) }
                : { ...plan, fixedIncomes: plan.fixedIncomes.map(f => ids.has(f.id) ? { ...f, excluido: !on } : f) });
            return (
                <div key={clave}>
                    <div
                        onClick={() => setAbiertos(a => ({ ...a, [clave]: !a[clave] }))}
                        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 2px", borderBottom: "1px solid #EDF3F0", cursor: "pointer", opacity: incluidos.length === 0 ? 0.45 : 1 }}
                    >
                        <input type="checkbox" checked={todosOn} ref={el => { if (el) el.indeterminate = incluidos.length > 0 && !todosOn; }} title="Contar todo el grupo" onClick={e => e.stopPropagation()} onChange={e => marcarGrupo(e.target.checked)} style={{ accentColor: "#0FA97A", flexShrink: 0 }} />
                        <ChevronDown size={15} color="#6C8079" style={{ transform: abierto ? "none" : "rotate(-90deg)", transition: "transform .15s", flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: "0.82rem", fontWeight: 800, color: "#0C2A20" }}>{nombre} <span style={{ fontWeight: 600, color: "#6C8079", fontSize: "0.7rem" }}>· {lista.length}</span></span>
                        <span style={{ fontFamily: MONO, fontSize: "0.85rem", fontWeight: 800, color: "#0C2A20" }}>{money(subtotal)}</span>
                    </div>
                    {abierto && (
                        <div style={{ paddingLeft: "22px" }}>
                            {lista.map(f => 'text' in f ? filaGasto(f) : filaIngreso(f))}
                        </div>
                    )}
                </div>
            );
        });
    };

    // Tarjeta de gastos o ingresos: cabecera con el total siempre a la vista, lista que se
    // contrae, y la barra de "agregar" que queda visible aunque la lista esté contraída.
    const tarjeta = (tipo: 'gasto' | 'ingreso') => {
        const esGasto = tipo === 'gasto';
        const items: (SimFixedExpense | SimFixedIncome)[] = esGasto ? plan.fixedExpenses : plan.fixedIncomes;
        const total = items.filter(f => !f.excluido).reduce((s, f) => s + (Number(f.amount) || 0), 0);
        const cerrada = esGasto ? listaCerrada.gastos : listaCerrada.ingresos;
        const nuevo = esGasto ? { nombre: nuevoGasto.text, amount: nuevoGasto.amount, cantidad: nuevoGasto.cantidad } : { nombre: nuevoIngresoFijo.name, amount: nuevoIngresoFijo.amount, cantidad: nuevoIngresoFijo.cantidad };
        const setNuevo = (campo: 'nombre' | 'amount' | 'cantidad', v: string) => esGasto
            ? setNuevoGasto(x => ({ ...x, [campo === 'nombre' ? 'text' : campo]: v }))
            : setNuevoIngresoFijo(x => ({ ...x, [campo === 'nombre' ? 'name' : campo]: v }));
        const porCantidad = esGasto ? usarCantidadGasto : usarCantidadIngreso;
        const togglePorCantidad = () => (esGasto ? setUsarCantidadGasto : setUsarCantidadIngreso)(v => !v);
        const nuevoTotal = esGasto ? nuevoGastoTotal : nuevoIngresoTotal;
        const grupoNuevo = esGasto ? nuevoGrupoGasto : nuevoGrupoIngreso;
        const color = esGasto ? '#C63C3C' : '#0E9F6E';
        const todosOn = items.length > 0 && items.every(f => !f.excluido);
        const marcarTodo = (on: boolean) => savePlan(esGasto
            ? { ...plan, fixedExpenses: plan.fixedExpenses.map(f => ({ ...f, excluido: !on })) }
            : { ...plan, fixedIncomes: plan.fixedIncomes.map(f => ({ ...f, excluido: !on })) });
        const agregar = (e: React.FormEvent) => {
            e.preventDefault();
            const nombre = nuevo.nombre.trim();
            if (!nombre || !nuevoTotal) return;
            if (esGasto) {
                savePlan({ ...plan, fixedExpenses: [...plan.fixedExpenses, { id: Date.now(), text: nombre, amount: nuevoTotal, active: true, grupo: nuevoGrupoGasto || undefined }] });
                setNuevoGasto({ text: '', amount: '', cantidad: '' });
            } else {
                savePlan({ ...plan, fixedIncomes: [...plan.fixedIncomes, { id: Date.now(), name: nombre, amount: nuevoTotal, active: true, grupo: nuevoGrupoIngreso || undefined }] });
                setNuevoIngresoFijo({ name: '', amount: '', cantidad: '' });
            }
        };
        const campo: React.CSSProperties = { minWidth: 0, height: '40px', padding: '0 10px', border: 'none', fontSize: movil ? '16px' : '0.8rem', background: 'transparent', color: '#0C2A20', outline: 'none', fontFamily: 'inherit' };
        const sep: React.CSSProperties = { borderLeft: '1px solid #EDF3F0' };
        const listo = !!nuevo.nombre.trim() && nuevoTotal > 0;
        return (
            <div style={{ background: '#FFFFFF', border: '1px solid #DCE7E1', borderRadius: '14px', overflow: 'hidden', alignSelf: 'start' }}>
                {/* Cabecera: tocarla contrae / expande */}
                <div onClick={() => setListaCerrada(v => ({ ...v, [esGasto ? 'gastos' : 'ingresos']: !cerrada }))} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', cursor: 'pointer', borderBottom: cerrada ? 'none' : '1px solid #EDF3F0' }}>
                    <input type="checkbox" checked={todosOn} ref={el => { if (el) el.indeterminate = items.some(f => !f.excluido) && items.some(f => f.excluido); }} disabled={items.length === 0} title="Contar toda la lista en la proyección" onClick={e => e.stopPropagation()} onChange={e => marcarTodo(e.target.checked)} style={{ accentColor: '#0FA97A', flexShrink: 0 }} />
                    <ChevronDown size={15} color="#6C8079" style={{ transform: cerrada ? 'rotate(-90deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0C2A20' }}>{esGasto ? 'Gastos fijos' : 'Ingresos fijos'}</div>
                        <div style={{ fontSize: '0.64rem', fontWeight: 600, color: '#6C8079' }}>{items.filter(f => !f.excluido).length} de {items.length} en cuenta</div>
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: '1rem', fontWeight: 800, color }}>{esGasto ? '−' : '+'}{money(total)}</span>
                </div>

                {!cerrada && (
                    <div style={{ padding: '2px 14px 6px' }}>
                        {items.length === 0 ? <p style={{ fontSize: '0.72rem', color: '#6C8079', margin: '8px 0' }}>{esGasto ? 'Sin gastos todavía.' : 'Sin ingresos todavía.'}</p> : renderGrupos(tipo)}
                    </div>
                )}

                {/* Agregar: siempre visible, una sola barra */}
                <form onSubmit={agregar} style={{ padding: '10px', background: '#F7FAF8', borderTop: '1px solid #EDF3F0' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', background: '#FFFFFF', border: '1px solid #DCE7E1', borderRadius: '10px', overflow: 'hidden' }}>
                        <input value={nuevo.nombre} onChange={e => setNuevo('nombre', e.target.value)} placeholder={esGasto ? 'Agregar gasto fijo adicional…' : 'Agregar ingreso fijo adicional…'} style={{ ...campo, flex: movil ? '1 1 100%' : '1 1 100px', borderBottom: movil ? '1px solid #EDF3F0' : 'none' }} />
                        {porCantidad ? (
                            <>
                                <input value={nuevo.cantidad} onChange={e => setNuevo('cantidad', e.target.value)} type="number" inputMode="decimal" placeholder="Cant." style={{ ...campo, ...sep, width: '58px', fontFamily: MONO }} />
                                <span style={{ fontSize: '0.72rem', color: '#6C8079' }}>×</span>
                                <input value={nuevo.amount} onChange={e => setNuevo('amount', e.target.value)} type="number" inputMode="decimal" placeholder="S/ c/u" style={{ ...campo, width: '72px', fontFamily: MONO }} />
                            </>
                        ) : (
                            <input value={nuevo.amount} onChange={e => setNuevo('amount', e.target.value)} type="number" inputMode="decimal" placeholder="S/ 0.00" style={{ ...campo, ...sep, width: movil ? undefined : '84px', flex: movil ? '1 1 0' : undefined, fontFamily: MONO }} />
                        )}
                        <button type="button" onClick={togglePorCantidad} title="Cantidad × precio unitario (ej: 5 × S/10)" style={{ ...campo, ...sep, width: '40px', padding: 0, cursor: 'pointer', fontWeight: 800, fontSize: '0.74rem', background: porCantidad ? '#FEF3C7' : 'transparent', color: porCantidad ? '#B45309' : '#6C8079' }}>×n</button>
                        <SelectGrupo
                            value={grupoNuevo}
                            categorias={esGasto ? catsGasto : catsIngreso}
                            placeholder="Grupo"
                            title="Grupo (si no eliges, se deduce del nombre)"
                            style={{ ...campo, ...sep, width: movil ? undefined : '92px', flex: movil ? '1 1 0' : undefined, padding: '0 4px 0 8px', cursor: 'pointer', fontSize: '0.74rem', color: grupoNuevo ? '#0C2A20' : '#6C8079' }}
                            onSelect={g => (esGasto ? setNuevoGrupoGasto : setNuevoGrupoIngreso)(g)}
                            onPedirCrear={() => setModalCrearGrupo({
                                tipo: esGasto ? 'gasto' : 'ingreso',
                                onCrear: (g) => (esGasto ? setNuevoGrupoGasto : setNuevoGrupoIngreso)(g)
                            })}
                        />
                        <button type="submit" disabled={!listo} title={porCantidad && nuevoTotal ? `Agregar ${money(nuevoTotal)}` : 'Agregar'} style={{ height: '32px', minWidth: '32px', margin: '0 4px', padding: porCantidad && nuevoTotal ? '0 10px' : 0, border: 'none', borderRadius: '8px', background: listo ? '#F59E0B' : '#EDF3F0', color: listo ? '#fff' : '#A3B3AD', cursor: listo ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontFamily: MONO, fontSize: '0.74rem', fontWeight: 800, flexShrink: 0, transition: 'background .15s' }}>
                            <Plus size={17} />{porCantidad && nuevoTotal > 0 && money(nuevoTotal)}
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    // Tarjeta para movimientos sueltos (extras, salidas, pandero, imprevistos, simulaciones sueltas)
    const tarjetaSueltos = () => {
        const movs = plan.movs || [];
        const cerrada = listaCerrada.sueltos;
        const totalGastosSueltos = movs.filter(m => m.type === 'gasto' && !m.excluido).reduce((s, m) => s + (Number(m.amount) || 0), 0);
        const totalIngresosSueltos = movs.filter(m => m.type === 'ingreso' && !m.excluido).reduce((s, m) => s + (Number(m.amount) || 0), 0);
        const netoSueltos = totalIngresosSueltos - totalGastosSueltos;
        const color = netoSueltos === 0 ? '#6C8079' : netoSueltos > 0 ? '#0E9F6E' : '#C63C3C';
        const todosOn = movs.length > 0 && movs.every(m => !m.excluido);

        const marcarTodo = (on: boolean) => savePlan({
            ...plan,
            movs: movs.map(m => ({ ...m, excluido: !on })),
        });

        const agregar = (e: React.FormEvent) => {
            e.preventDefault();
            const text = nuevoSuelto.text.trim();
            if (!text || !nuevoSueltoTotal) return;
            const nuevo: SimMovSuelto = {
                id: Date.now(),
                text,
                amount: nuevoSueltoTotal,
                type: nuevoSuelto.tipo,
                grupo: nuevoGrupoSuelto || undefined,
            };
            savePlan({
                ...plan,
                movs: [...movs, nuevo],
            });
            setNuevoSuelto(s => ({ ...s, text: '', amount: '', cantidad: '' }));
        };

        const campo: React.CSSProperties = {
            minWidth: 0,
            height: '40px',
            padding: '0 10px',
            border: 'none',
            fontSize: movil ? '16px' : '0.8rem',
            background: 'transparent',
            color: '#0C2A20',
            outline: 'none',
            fontFamily: 'inherit',
        };
        const sep: React.CSSProperties = { borderLeft: '1px solid #EDF3F0' };
        const listo = !!nuevoSuelto.text.trim() && nuevoSueltoTotal > 0;
        const catsDisponibles = (nuevoSuelto.tipo === 'gasto' ? catsGasto : catsIngreso).filter(
            c => c !== (nuevoSuelto.tipo === 'gasto' ? GRUPO_SUELTO_GASTO : GRUPO_SUELTO_INGRESO)
        );

        const renderGruposEnTarjeta = () => {
            const movsG = movs.filter(m => m.type === 'gasto');
            const movsI = movs.filter(m => m.type === 'ingreso');
            const grupos = [
                ...agruparSueltos(movsG, 'gasto').map(([n, l]) => ({ tipo: 'gasto' as const, nombre: n, lista: l })),
                ...agruparSueltos(movsI, 'ingreso').map(([n, l]) => ({ tipo: 'ingreso' as const, nombre: n, lista: l })),
            ];
            return grupos.map(({ tipo, nombre, lista }) => {
                const clave = 'suelto:' + tipo + ':' + nombre;
                const cerradaG = !!sueltosCerrados[clave];
                const incluidos = lista.filter(m => !m.excluido);
                const subtotal = incluidos.reduce((t, m) => t + (Number(m.amount) || 0), 0);
                const ids = new Set(lista.map(m => m.id));
                const todosOnG = incluidos.length === lista.length;
                const marcarGrupo = (on: boolean) => savePlan({
                    ...plan,
                    movs: movs.map(m => ids.has(m.id) ? { ...m, excluido: !on } : m),
                });
                return (
                    <div key={clave}>
                        <div
                            onClick={() => setSueltosCerrados(c => ({ ...c, [clave]: !c[clave] }))}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 2px', borderBottom: '1px solid #EDF3F0', cursor: 'pointer', opacity: incluidos.length === 0 ? 0.45 : 1 }}
                        >
                            <input
                                type="checkbox"
                                checked={todosOnG}
                                ref={el => { if (el) el.indeterminate = incluidos.length > 0 && !todosOnG; }}
                                title="Contar todo el grupo"
                                onClick={e => e.stopPropagation()}
                                onChange={e => marcarGrupo(e.target.checked)}
                                style={{ accentColor: '#0FA97A', flexShrink: 0 }}
                            />
                            <ChevronDown size={15} color="#6C8079" style={{ transform: cerradaG ? 'rotate(-90deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 800, color: '#0C2A20' }}>
                                {nombre} <span style={{ fontWeight: 600, color: '#6C8079', fontSize: '0.7rem' }}>· {lista.length}</span>
                            </span>
                            <span style={{ fontFamily: MONO, fontSize: '0.85rem', fontWeight: 800, color: tipo === 'gasto' ? '#C63C3C' : '#0E9F6E' }}>
                                {tipo === 'gasto' ? '−' : '+'}{money(subtotal)}
                            </span>
                        </div>
                        {!cerradaG && (
                            <div style={{ paddingLeft: '22px' }}>
                                {lista.map(m => filaMovSuelto(m, true))}
                            </div>
                        )}
                    </div>
                );
            });
        };

        return (
            <div style={{ background: '#FFFFFF', border: '1px solid #DCE7E1', borderRadius: '14px', overflow: 'hidden', alignSelf: 'start' }}>
                {/* Cabecera */}
                <div
                    onClick={() => setListaCerrada(v => ({ ...v, sueltos: !cerrada }))}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', cursor: 'pointer', borderBottom: cerrada ? 'none' : '1px solid #EDF3F0' }}
                >
                    <input
                        type="checkbox"
                        checked={todosOn}
                        ref={el => { if (el) el.indeterminate = movs.some(m => !m.excluido) && movs.some(m => m.excluido); }}
                        disabled={movs.length === 0}
                        title="Contar movimientos sueltos en la proyección"
                        onClick={e => e.stopPropagation()}
                        onChange={e => marcarTodo(e.target.checked)}
                        style={{ accentColor: '#0FA97A', flexShrink: 0 }}
                    />
                    <ChevronDown size={15} color="#6C8079" style={{ transform: cerrada ? 'rotate(-90deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0C2A20' }}>Movimientos sueltos / extras</div>
                        <div style={{ fontSize: '0.64rem', fontWeight: 600, color: '#6C8079' }}>{movs.filter(m => !m.excluido).length} de {movs.length} en cuenta</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: MONO, fontSize: '1rem', fontWeight: 800, color }}>
                            {netoSueltos < 0 ? '−' : netoSueltos > 0 ? '+' : ''}{money(Math.abs(netoSueltos))}
                        </div>
                        {(totalGastosSueltos > 0 && totalIngresosSueltos > 0) && (
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6C8079' }}>
                                +{money(totalIngresosSueltos)} / −{money(totalGastosSueltos)}
                            </div>
                        )}
                    </div>
                </div>

                {!cerrada && (
                    <div style={{ padding: '2px 14px 6px' }}>
                        {movs.length === 0 ? (
                            <p style={{ fontSize: '0.72rem', color: '#6C8079', margin: '10px 0' }}>
                                Sin movimientos sueltos. Agrega gastos o ingresos extras abajo para simularlos sin mezclarlos con tus fijos.
                            </p>
                        ) : (
                            renderGruposEnTarjeta()
                        )}
                    </div>
                )}

                {/* Formulario para agregar movimiento suelto */}
                <form onSubmit={agregar} style={{ padding: '10px', background: '#F7FAF8', borderTop: '1px solid #EDF3F0' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', background: '#FFFFFF', border: '1px solid #DCE7E1', borderRadius: '10px', overflow: 'hidden' }}>
                        {/* Selector Gasto / Ingreso */}
                        <div style={{ display: 'flex', borderRight: '1px solid #EDF3F0', padding: '3px' }}>
                            <button
                                type="button"
                                onClick={() => { setNuevoSuelto(s => ({ ...s, tipo: 'gasto' })); setNuevoGrupoSuelto(''); }}
                                style={{
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    background: nuevoSuelto.tipo === 'gasto' ? '#C63C3C' : 'transparent',
                                    color: nuevoSuelto.tipo === 'gasto' ? '#FFFFFF' : '#6C8079',
                                    transition: 'all .12s',
                                }}
                            >
                                Gasto
                            </button>
                            <button
                                type="button"
                                onClick={() => { setNuevoSuelto(s => ({ ...s, tipo: 'ingreso' })); setNuevoGrupoSuelto(''); }}
                                style={{
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    background: nuevoSuelto.tipo === 'ingreso' ? '#0E9F6E' : 'transparent',
                                    color: nuevoSuelto.tipo === 'ingreso' ? '#FFFFFF' : '#6C8079',
                                    transition: 'all .12s',
                                }}
                            >
                                Ingreso
                            </button>
                        </div>

                        <input
                            value={nuevoSuelto.text}
                            onChange={e => setNuevoSuelto(s => ({ ...s, text: e.target.value }))}
                            placeholder={nuevoSuelto.tipo === 'gasto' ? 'Gasto suelto (ej: Pandero, salida)…' : 'Ingreso suelto (ej: Venta extra)…'}
                            style={{ ...campo, flex: movil ? '1 1 100%' : '1 1 100px', borderBottom: movil ? '1px solid #EDF3F0' : 'none' }}
                        />

                        {usarCantidadSuelto ? (
                            <>
                                <input value={nuevoSuelto.cantidad} onChange={e => setNuevoSuelto(s => ({ ...s, cantidad: e.target.value }))} type="number" inputMode="decimal" placeholder="Cant" style={{ ...campo, ...sep, width: '54px', fontFamily: MONO }} />
                                <span style={{ fontSize: '0.72rem', color: '#6C8079' }}>×</span>
                                <input value={nuevoSuelto.amount} onChange={e => setNuevoSuelto(s => ({ ...s, amount: e.target.value }))} type="number" inputMode="decimal" placeholder="S/ c/u" style={{ ...campo, width: '68px', fontFamily: MONO }} />
                            </>
                        ) : (
                            <input value={nuevoSuelto.amount} onChange={e => setNuevoSuelto(s => ({ ...s, amount: e.target.value }))} type="number" inputMode="decimal" placeholder="S/ 0.00" style={{ ...campo, ...sep, width: movil ? undefined : '84px', flex: movil ? '1 1 0' : undefined, fontFamily: MONO }} />
                        )}

                        <button
                            type="button"
                            onClick={() => setUsarCantidadSuelto(v => !v)}
                            title="Cantidad × precio unitario (ej: 5 × S/10)"
                            style={{ ...campo, ...sep, width: '40px', padding: 0, cursor: 'pointer', fontWeight: 800, fontSize: '0.74rem', background: usarCantidadSuelto ? '#FEF3C7' : 'transparent', color: usarCantidadSuelto ? '#B45309' : '#6C8079' }}
                        >
                            ×n
                        </button>

                        <SelectGrupo
                            value={nuevoGrupoSuelto}
                            categorias={catsDisponibles}
                            placeholder="Grupo"
                            title={`Grupo (por defecto: ${nuevoSuelto.tipo === 'gasto' ? GRUPO_SUELTO_GASTO : GRUPO_SUELTO_INGRESO})`}
                            style={{ ...campo, ...sep, width: movil ? undefined : '96px', flex: movil ? '1 1 0' : undefined, padding: '0 4px 0 8px', cursor: 'pointer', fontSize: '0.74rem', color: nuevoGrupoSuelto ? '#0C2A20' : '#6C8079' }}
                            onSelect={setNuevoGrupoSuelto}
                            onPedirCrear={() => setModalCrearGrupo({
                                tipo: nuevoSuelto.tipo,
                                onCrear: setNuevoGrupoSuelto,
                            })}
                        />

                        <button
                            type="submit"
                            disabled={!listo}
                            title={usarCantidadSuelto && nuevoSueltoTotal ? `Agregar ${money(nuevoSueltoTotal)}` : 'Agregar'}
                            style={{
                                height: '32px',
                                minWidth: '32px',
                                margin: '0 4px',
                                padding: usarCantidadSuelto && nuevoSueltoTotal ? '0 10px' : 0,
                                border: 'none',
                                borderRadius: '8px',
                                background: listo ? (nuevoSuelto.tipo === 'gasto' ? '#C63C3C' : '#0FA97A') : '#EDF3F0',
                                color: listo ? '#fff' : '#A3B3AD',
                                cursor: listo ? 'pointer' : 'default',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                fontFamily: MONO,
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                flexShrink: 0,
                                transition: 'background .15s',
                            }}
                        >
                            <Plus size={17} />{usarCantidadSuelto && nuevoSueltoTotal > 0 && money(nuevoSueltoTotal)}
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    // ── Columna de Gastos o Ingresos (Vista 2 Columnas) ──
    const columnaMovimientos = (tipo: 'gasto' | 'ingreso') => {
        const esGasto = tipo === 'gasto';
        const hayFijos = esGasto ? mostrarGastos : mostrarIngresos;
        const haySueltos = mostrarSueltos;
        if (!hayFijos && !haySueltos) return null;

        const ambos = hayFijos && haySueltos;
        const color = esGasto ? '#C63C3C' : '#0E9F6E';
        const signo = esGasto ? '−' : '+';
        const defGrupo = esGasto ? GRUPO_SUELTO_GASTO : GRUPO_SUELTO_INGRESO;

        const fijos = esGasto ? plan.fixedExpenses : plan.fixedIncomes;
        const fijosCount = fijos.filter(f => !f.excluido).length;
        const simFijos = esGasto ? simFijosTotal : simIngresoPrevisto;
        const fijosCerrada = esGasto ? colCerrada.gastosFijos : colCerrada.ingresosFijos;
        const toggleFijosCerrada = () => setColCerrada(v => ({
            ...v,
            [esGasto ? 'gastosFijos' : 'ingresosFijos']: !fijosCerrada,
        }));
        const todosFijosOn = fijos.length > 0 && fijos.every(f => !f.excluido);
        const marcarTodosFijos = (on: boolean) => savePlan(
            esGasto
                ? { ...plan, fixedExpenses: plan.fixedExpenses.map(f => ({ ...f, excluido: !on })) }
                : { ...plan, fixedIncomes: plan.fixedIncomes.map(f => ({ ...f, excluido: !on })) }
        );

        const sueltos = (plan.movs || []).filter(m => m.type === tipo);
        const gruposSueltos = agruparSueltos(sueltos, tipo);

        const modo = esGasto ? modoColGasto : modoColIngreso;
        const setModo = esGasto ? setModoColGasto : setModoColIngreso;
        const tipoEfectivo = (!haySueltos && hayFijos) ? 'fijo' : (!hayFijos && haySueltos) ? 'suelto' : modo;

        const textoForm = esGasto ? formColGasto.text : formColIngreso.name;
        const amountForm = esGasto ? formColGasto.amount : formColIngreso.amount;
        const cantForm = esGasto ? formColGasto.cantidad : formColIngreso.cantidad;
        const grupoForm = esGasto ? formColGasto.grupo : formColIngreso.grupo;
        const usarCant = esGasto ? usarCantColGasto : usarCantColIngreso;
        const totalForm = esGasto ? formColGastoTotal : formColIngresoTotal;

        const setTextoForm = (val: string) => esGasto
            ? setFormColGasto(v => ({ ...v, text: val }))
            : setFormColIngreso(v => ({ ...v, name: val }));
        const setAmountForm = (val: string) => esGasto
            ? setFormColGasto(v => ({ ...v, amount: val }))
            : setFormColIngreso(v => ({ ...v, amount: val }));
        const setCantForm = (val: string) => esGasto
            ? setFormColGasto(v => ({ ...v, cantidad: val }))
            : setFormColIngreso(v => ({ ...v, cantidad: val }));
        const setGrupoForm = (val: string) => esGasto
            ? setFormColGasto(v => ({ ...v, grupo: val }))
            : setFormColIngreso(v => ({ ...v, grupo: val }));
        const toggleUsarCant = () => (esGasto ? setUsarCantColGasto : setUsarCantColIngreso)(v => !v);

        const agregar = (e: React.FormEvent) => {
            e.preventDefault();
            const nombre = textoForm.trim();
            if (!nombre || !totalForm) return;
            if (tipoEfectivo === 'suelto') {
                savePlan({
                    ...plan,
                    movs: [...(plan.movs || []), {
                        id: Date.now(),
                        text: nombre,
                        amount: totalForm,
                        type: tipo,
                        grupo: grupoForm || undefined,
                    }],
                });
            } else if (esGasto) {
                savePlan({
                    ...plan,
                    fixedExpenses: [...plan.fixedExpenses, {
                        id: Date.now(),
                        text: nombre,
                        amount: totalForm,
                        active: true,
                        grupo: grupoForm || undefined,
                    }],
                });
            } else {
                savePlan({
                    ...plan,
                    fixedIncomes: [...plan.fixedIncomes, {
                        id: Date.now(),
                        name: nombre,
                        amount: totalForm,
                        active: true,
                        grupo: grupoForm || undefined,
                    }],
                });
            }
            if (esGasto) {
                setFormColGasto(v => ({ ...v, text: '', amount: '', cantidad: '' }));
            } else {
                setFormColIngreso(v => ({ ...v, name: '', amount: '', cantidad: '' }));
            }
        };

        const campo: React.CSSProperties = { minWidth: 0, height: '40px', padding: '0 10px', border: 'none', fontSize: movil ? '16px' : '0.8rem', background: 'transparent', color: '#0C2A20', outline: 'none', fontFamily: 'inherit' };
        const sep: React.CSSProperties = { borderLeft: '1px solid #EDF3F0' };
        const listo = !!textoForm.trim() && totalForm > 0;
        const catsDisponibles = (esGasto ? catsGasto : catsIngreso).filter(c => tipoEfectivo === 'suelto' ? c !== defGrupo : true);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* 1. Tarjeta de Fijos (si está activa en CONTAR) */}
                {hayFijos && (
                    <div style={{ background: '#FFFFFF', border: '1px solid #DCE7E1', borderTop: `3px solid ${color}`, borderRadius: '14px', overflow: 'hidden' }}>
                        <div
                            onClick={toggleFijosCerrada}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderBottom: fijosCerrada ? 'none' : '1px solid #EDF3F0', cursor: 'pointer', background: '#FFFFFF' }}
                        >
                            <input
                                type="checkbox"
                                checked={todosFijosOn}
                                ref={el => { if (el) el.indeterminate = fijosCount > 0 && !todosFijosOn; }}
                                disabled={fijos.length === 0}
                                title={esGasto ? 'Contar todos los gastos fijos' : 'Contar todos los ingresos fijos'}
                                onClick={e => e.stopPropagation()}
                                onChange={e => marcarTodosFijos(e.target.checked)}
                                style={{ accentColor: '#0FA97A', flexShrink: 0 }}
                            />
                            <ChevronDown size={15} color="#6C8079" style={{ transform: fijosCerrada ? 'rotate(-90deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0C2A20' }}>
                                    {esGasto ? 'Mis gastos fijos' : 'Mis ingresos fijos'}
                                </div>
                                <div style={{ fontSize: '0.64rem', fontWeight: 600, color: '#6C8079' }}>
                                    {fijosCount} de {fijos.length} en cuenta
                                </div>
                            </div>
                            <span style={{ fontFamily: MONO, fontSize: '1.05rem', fontWeight: 800, color }}>
                                {signo}{money(simFijos)}
                            </span>
                        </div>
                        {!fijosCerrada && (
                            <div style={{ padding: '2px 14px 6px' }}>
                                {fijos.length === 0
                                    ? <p style={{ fontSize: '0.72rem', color: '#6C8079', margin: '8px 0' }}>{esGasto ? 'Sin gastos fijos todavía.' : 'Sin ingresos fijos todavía.'}</p>
                                    : renderGrupos(tipo)
                                }
                            </div>
                        )}
                    </div>
                )}

                {/* 2. Tarjetas por grupo de Movimientos Sueltos (al mismo nivel que Gastos / Ingresos sueltos / extras) */}
                {haySueltos && (
                    sueltos.length === 0 ? (
                        <div style={{ background: '#FFFFFF', border: '1px solid #DCE7E1', borderTop: `3px solid ${color}`, borderRadius: '14px', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderBottom: '1px solid #EDF3F0', background: '#FFFFFF' }}>
                                <input type="checkbox" disabled checked={false} style={{ accentColor: '#0FA97A', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0C2A20' }}>{defGrupo}</div>
                                    <div style={{ fontSize: '0.64rem', fontWeight: 600, color: '#6C8079' }}>0 de 0 en cuenta</div>
                                </div>
                                <span style={{ fontFamily: MONO, fontSize: '1.05rem', fontWeight: 800, color }}>{signo}{money(0)}</span>
                            </div>
                            <div style={{ padding: '10px 14px' }}>
                                <p style={{ fontSize: '0.72rem', color: '#6C8079', margin: 0 }}>
                                    {esGasto ? 'Sin gastos sueltos aún.' : 'Sin ingresos sueltos aún.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        gruposSueltos.map(([nombreGrupo, listaGrupo]) => {
                            const cardKey = `col_${tipo}_${nombreGrupo}`;
                            const cerrada = !!sueltosCerrados[cardKey];
                            const incluidos = listaGrupo.filter(m => !m.excluido);
                            const todosOnG = incluidos.length === listaGrupo.length;
                            const algunoOnG = incluidos.length > 0;
                            const subtotalGrupo = incluidos.reduce((s, m) => s + (Number(m.amount) || 0), 0);
                            const idsGrupo = new Set(listaGrupo.map(m => m.id));
                            const marcarGrupo = (on: boolean) => savePlan({
                                ...plan,
                                movs: (plan.movs || []).map(m => idsGrupo.has(m.id) ? { ...m, excluido: !on } : m),
                            });
                            return (
                                <div key={cardKey} style={{ background: '#FFFFFF', border: '1px solid #DCE7E1', borderTop: `3px solid ${color}`, borderRadius: '14px', overflow: 'hidden' }}>
                                    <div
                                        onClick={() => setSueltosCerrados(c => ({ ...c, [cardKey]: !c[cardKey] }))}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderBottom: cerrada ? 'none' : '1px solid #EDF3F0', cursor: 'pointer', background: '#FFFFFF', opacity: incluidos.length === 0 ? 0.65 : 1 }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={todosOnG}
                                            ref={el => { if (el) el.indeterminate = algunoOnG && !todosOnG; }}
                                            title={`Contar todo ${nombreGrupo}`}
                                            onClick={e => e.stopPropagation()}
                                            onChange={e => marcarGrupo(e.target.checked)}
                                            style={{ accentColor: '#0FA97A', flexShrink: 0 }}
                                        />
                                        <ChevronDown size={15} color="#6C8079" style={{ transform: cerrada ? 'rotate(-90deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0C2A20' }}>{nombreGrupo}</span>
                                                {hayFijos && nombreGrupo !== defGrupo && (
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: esGasto ? '#B45309' : '#0E9F6E', background: esGasto ? 'rgba(180,83,9,0.08)' : 'rgba(14,159,110,0.08)', padding: '1px 5px', borderRadius: '4px' }}>
                                                        sueltos
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.64rem', fontWeight: 600, color: '#6C8079' }}>
                                                {incluidos.length} de {listaGrupo.length} en cuenta
                                            </div>
                                        </div>
                                        <span style={{ fontFamily: MONO, fontSize: '1.05rem', fontWeight: 800, color }}>
                                            {signo}{money(subtotalGrupo)}
                                        </span>
                                    </div>
                                    {!cerrada && (
                                        <div style={{ padding: '2px 14px 8px' }}>
                                            {listaGrupo.map(m => filaMovSuelto(m))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )
                )}

                {/* 3. Barra para agregar al pie de la columna */}
                <form onSubmit={agregar} style={{ background: '#F7FAF8', border: '1px solid #DCE7E1', borderRadius: '14px', padding: '10px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', background: '#FFFFFF', border: '1px solid #DCE7E1', borderRadius: '10px', overflow: 'hidden' }}>
                        {ambos && (
                            <div style={{ display: 'flex', borderRight: '1px solid #EDF3F0', padding: '3px' }}>
                                <button
                                    type="button"
                                    onClick={() => setModo('suelto')}
                                    style={{
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '4px 7px',
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        background: modo === 'suelto' ? (esGasto ? '#FEF3C7' : 'rgba(15,169,122,0.12)') : 'transparent',
                                        color: modo === 'suelto' ? (esGasto ? '#B45309' : '#0E9F6E') : '#6C8079',
                                    }}
                                >
                                    Suelto
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModo('fijo')}
                                    style={{
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '4px 7px',
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        background: modo === 'fijo' ? (esGasto ? '#FEE2E2' : '#FEF3C7') : 'transparent',
                                        color: modo === 'fijo' ? (esGasto ? '#C63C3C' : '#B45309') : '#6C8079',
                                    }}
                                >
                                    Fijo
                                </button>
                            </div>
                        )}
                        <input
                            value={textoForm}
                            onChange={e => setTextoForm(e.target.value)}
                            placeholder={tipoEfectivo === 'suelto'
                                ? (esGasto ? 'Agregar gasto suelto…' : 'Agregar ingreso suelto…')
                                : (esGasto ? 'Agregar gasto fijo…' : 'Agregar ingreso fijo…')}
                            style={{ ...campo, flex: movil ? '1 1 100%' : '1 1 100px', borderBottom: movil ? '1px solid #EDF3F0' : 'none' }}
                        />
                        {usarCant ? (
                            <>
                                <input value={cantForm} onChange={e => setCantForm(e.target.value)} type="number" inputMode="decimal" placeholder="Cant" style={{ ...campo, ...sep, width: '54px', fontFamily: MONO }} />
                                <span style={{ fontSize: '0.72rem', color: '#6C8079' }}>×</span>
                                <input value={amountForm} onChange={e => setAmountForm(e.target.value)} type="number" inputMode="decimal" placeholder="S/ c/u" style={{ ...campo, width: '68px', fontFamily: MONO }} />
                            </>
                        ) : (
                            <input value={amountForm} onChange={e => setAmountForm(e.target.value)} type="number" inputMode="decimal" placeholder="S/ 0.00" style={{ ...campo, ...sep, width: movil ? undefined : '84px', flex: movil ? '1 1 0' : undefined, fontFamily: MONO }} />
                        )}
                        <button
                            type="button"
                            onClick={toggleUsarCant}
                            title="Cantidad × precio unitario (ej: 5 × S/10)"
                            style={{ ...campo, ...sep, width: '40px', padding: 0, cursor: 'pointer', fontWeight: 800, fontSize: '0.74rem', background: usarCant ? '#FEF3C7' : 'transparent', color: usarCant ? '#B45309' : '#6C8079' }}
                        >
                            ×n
                        </button>
                        <SelectGrupo
                            value={grupoForm}
                            categorias={catsDisponibles}
                            placeholder="Grupo"
                            title={tipoEfectivo === 'suelto' ? `Grupo (por defecto: ${defGrupo})` : 'Grupo (si no eliges, se deduce del nombre)'}
                            style={{ ...campo, ...sep, width: movil ? undefined : '96px', flex: movil ? '1 1 0' : undefined, padding: '0 4px 0 8px', cursor: 'pointer', fontSize: '0.74rem', color: grupoForm ? '#0C2A20' : '#6C8079' }}
                            onSelect={setGrupoForm}
                            onPedirCrear={() => setModalCrearGrupo({
                                tipo,
                                onCrear: g => setGrupoForm(g),
                            })}
                        />
                        <button
                            type="submit"
                            disabled={!listo}
                            title={usarCant && totalForm ? `Agregar ${money(totalForm)}` : (esGasto ? 'Agregar gasto' : 'Agregar ingreso')}
                            style={{
                                height: '32px',
                                minWidth: '32px',
                                margin: '0 4px',
                                padding: usarCant && totalForm ? '0 10px' : 0,
                                border: 'none',
                                borderRadius: '8px',
                                background: listo ? (esGasto ? '#C63C3C' : '#0FA97A') : '#EDF3F0',
                                color: listo ? '#fff' : '#A3B3AD',
                                cursor: listo ? 'pointer' : 'default',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                fontFamily: MONO,
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                flexShrink: 0,
                                transition: 'background .15s',
                            }}
                        >
                            <Plus size={17} />{usarCant && totalForm > 0 && money(totalForm)}
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    return (
        <div style={{ ...paddingPagina(movil), display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* ── Plan del mes: tu propio plan, con tus datos — no toca nada real ── */}
            <div style={{ flex: '1 1 480px', minWidth: 0 }}>
                {/* Resultado + acciones + qué se cuenta, en una sola tarjeta */}
                <div style={{ background: "#FFFFFF", border: "1px solid #DCE7E1", borderRadius: "16px", marginBottom: "0.75rem", overflow: "hidden", boxShadow: "0 1px 2px rgba(15,23,42,0.03)" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 32px", padding: movil ? "14px 14px 12px" : "16px 20px", borderLeft: `4px solid ${simQueda < 0 ? "#C63C3C" : "#0FA97A"}` }}>
                        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                            <span style={{ ...LABEL, display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <FlaskConical size={13} /> Te quedaría a fin de mes
                                {cargada && (
                                    <span style={{
                                        textTransform: "none",
                                        letterSpacing: 0,
                                        background: cargadaModificada ? "#FEF3C7" : "rgba(15,169,122,0.10)",
                                        color: cargadaModificada ? "#B45309" : "#0E9F6E",
                                        borderRadius: "999px",
                                        padding: "1px 8px",
                                        fontSize: "0.66rem",
                                    }}>
                                        {cargada.nombre}{cargadaModificada ? " · editado" : ""}
                                    </span>
                                )}
                            </span>
                            <div style={{ fontFamily: MONO, fontSize: movil ? "1.8rem" : "2.1rem", fontWeight: 800, letterSpacing: "-0.03em", color: simQueda < 0 ? "#C63C3C" : "#0C2A20", lineHeight: 1.1, marginTop: "4px" }}>
                                {simQueda < 0 ? "−" : ""}{money(Math.abs(simQueda))}
                            </div>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 28px" }}>
                            {([
                                plan.usarSaldo ? { t: 'Saldo', v: money(currentBalance), c: '#0C2A20' } : null,
                                { t: 'Ingresos', v: `+${money(totalIngresos)}`, c: '#0E9F6E' },
                                { t: 'Gastos', v: `−${money(totalGastos)}`, c: '#C63C3C' },
                            ].filter(Boolean) as { t: string; v: string; c: string }[]).map(x => (
                                <div key={x.t}>
                                    <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#6C8079", textTransform: "uppercase", letterSpacing: "0.06em" }}>{x.t}</div>
                                    <div style={{ fontFamily: MONO, fontSize: "1.05rem", fontWeight: 800, letterSpacing: "-0.02em", color: x.c }}>{x.v}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexBasis: movil ? "100%" : undefined }}>
                            {nombreGuardar === null ? (
                                <>
                                    <button onClick={reiniciarSimulacion} title="Reiniciar (vuelve a partir de tus gastos/ingresos fijos reales)" style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFFFF", border: "1px solid #DCE7E1", borderRadius: "10px", color: "#6C8079", cursor: "pointer", flexShrink: 0 }}>
                                        <RotateCcw size={15} />
                                    </button>
                                    <button onClick={() => setNombreGuardar(cargada?.nombre ?? '')} title="Guardar esta proyección con un nombre (ej: Presupuesto noviembre)" style={{ flex: movil ? 1 : undefined, height: "36px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "#0FA97A", border: "none", borderRadius: "10px", padding: "0 14px", fontSize: "0.78rem", fontWeight: 800, color: "#fff", cursor: "pointer" }}>
                                        <Save size={15} /> Guardar
                                    </button>
                                </>
                            ) : (
                                <form onSubmit={e => { e.preventDefault(); guardarProyeccion(); }} style={{ flex: movil ? 1 : undefined, display: "flex", alignItems: "center", gap: "6px" }}>
                                    <input autoFocus value={nombreGuardar} onChange={e => setNombreGuardar(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setNombreGuardar(null); }} placeholder="Nombre (ej: Presupuesto nov.)" style={{ flex: movil ? 1 : undefined, width: movil ? undefined : "200px", minWidth: 0, height: "36px", padding: "0 10px", borderRadius: "10px", border: "1px solid #0FA97A", fontSize: movil ? "16px" : "0.8rem", outline: "none", fontFamily: "inherit" }} />
                                    <button type="submit" disabled={!nombreGuardar.trim()} title="Guardar (si el nombre ya existe, se actualiza)" style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", background: "#0FA97A", border: "none", borderRadius: "10px", color: "#fff", cursor: "pointer", opacity: nombreGuardar.trim() ? 1 : 0.5, flexShrink: 0 }}><Check size={16} /></button>
                                    <button type="button" onClick={() => setNombreGuardar(null)} title="Cancelar" style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7FAF8", border: "1px solid #DCE7E1", borderRadius: "10px", color: "#6C8079", cursor: "pointer", flexShrink: 0 }}><X size={16} /></button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Qué se cuenta en la proyección y selector de vista */}
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: movil ? "8px 14px" : "8px 20px", background: "#F7FAF8", borderTop: "1px solid #EDF3F0" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
                            <span style={{ ...LABEL, marginRight: "4px" }}>Contar</span>
                            {([
                                { key: 'saldo', texto: `Saldo actual (${money(currentBalance)})`, on: !!plan.usarSaldo, disabled: false, set: (v: boolean) => savePlan({ ...plan, usarSaldo: v }) },
                                { key: 'gastos', texto: 'Mis gastos fijos', on: mostrarGastos, disabled: false, set: (v: boolean) => toggleTopGastos(v) },
                                { key: 'ingresos', texto: 'Mis ingresos fijos', on: mostrarIngresos, disabled: false, set: (v: boolean) => toggleTopIngresos(v) },
                                { key: 'sueltos', texto: 'Movimientos sueltos', on: mostrarSueltos, disabled: false, set: (v: boolean) => toggleTopSueltos(v) },
                            ]).filter(o => !o.disabled).map(o => (
                                <label key={o.key} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "999px", cursor: "pointer", background: o.on ? "rgba(15,169,122,0.10)" : "#FFFFFF", border: `1px solid ${o.on ? "#0FA97A" : "#DCE7E1"}`, fontSize: "0.72rem", fontWeight: 700, color: o.on ? "#0C2A20" : "#6C8079" }}>
                                    <input type="checkbox" checked={o.on} onChange={e => o.set(e.target.checked)} style={{ accentColor: "#0FA97A", margin: 0 }} />
                                    {o.texto}
                                </label>
                            ))}
                        </div>

                        {/* Selector de Vista: 2 Columnas (Por defecto) vs Tarjetas */}
                        <div style={{ display: "inline-flex", background: "#EDF3F0", padding: "3px", borderRadius: "10px", gap: "2px", flexShrink: 0 }}>
                            <button
                                type="button"
                                onClick={() => cambiarVista('columnas')}
                                title="Ver en 2 columnas: Columna de Gastos y Columna de Ingresos"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    border: "none",
                                    borderRadius: "7px",
                                    padding: "4px 10px",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    background: vista === 'columnas' ? "#FFFFFF" : "transparent",
                                    color: vista === 'columnas' ? "#0C2A20" : "#6C8079",
                                    boxShadow: vista === 'columnas' ? "0 1px 3px rgba(15,23,42,0.08)" : "none",
                                    transition: "all .15s",
                                }}
                            >
                                <Columns2 size={13} /> 2 Columnas
                            </button>
                            <button
                                type="button"
                                onClick={() => cambiarVista('tarjetas')}
                                title="Ver en tarjetas independientes"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    border: "none",
                                    borderRadius: "7px",
                                    padding: "4px 10px",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    background: vista === 'tarjetas' ? "#FFFFFF" : "transparent",
                                    color: vista === 'tarjetas' ? "#0C2A20" : "#6C8079",
                                    boxShadow: vista === 'tarjetas' ? "0 1px 3px rgba(15,23,42,0.08)" : "none",
                                    transition: "all .15s",
                                }}
                            >
                                <LayoutGrid size={13} /> Tarjetas
                            </button>
                        </div>
                    </div>
                </div>

                {/* Renderizado de vistas */}
                {vista === 'columnas' ? (
                    <div style={{
                        display: (mostrarGastos || mostrarSueltos || mostrarIngresos) ? "grid" : "none",
                        gridTemplateColumns: movil ? "1fr" : ((mostrarGastos || mostrarSueltos) && (mostrarIngresos || mostrarSueltos)) ? "1fr 1fr" : "1fr",
                        gap: "0.9rem",
                        alignItems: "start"
                    }}>
                        {columnaMovimientos('gasto')}
                        {columnaMovimientos('ingreso')}
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem" }}>
                        {mostrarGastos && tarjeta('gasto')}
                        {mostrarIngresos && tarjeta('ingreso')}
                        {mostrarSueltos && tarjetaSueltos()}
                    </div>
                )}

                {!mostrarGastos && !mostrarIngresos && !mostrarSueltos && (
                    <div style={{ padding: '36px 20px', textAlign: 'center', background: '#FFFFFF', border: '2px dashed #DCE7E1', borderRadius: '16px', color: '#6C8079', marginTop: '0.75rem' }}>
                        <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.9rem', color: '#0C2A20' }}>
                            Todas las secciones están ocultas
                        </p>
                        <p style={{ margin: 0, fontSize: '0.78rem' }}>
                            Activa <b>Mis gastos fijos</b>, <b>Mis ingresos fijos</b> o <b>Movimientos sueltos</b> en la barra <b>CONTAR</b> de arriba para mostrarlas.
                        </p>
                    </div>
                )}
            </div>

            {/* ── Guardadas: columna chica a la derecha (abajo en el celular) ── */}
            {(guardadas.length > 0 || !movil) && (
                <aside style={{ flex: movil ? '1 1 100%' : '0 0 210px', alignSelf: 'flex-start', background: '#FFFFFF', border: '1px solid #DCE7E1', borderRadius: '14px', padding: '10px 12px' }}>
                    <span style={{ ...LABEL, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}><Bookmark size={12} /> Guardadas</span>
                    {guardadas.length === 0 && <p style={{ fontSize: '0.7rem', color: '#6C8079', margin: 0, lineHeight: 1.4 }}>Arma un plan y toca <b>Guardar</b> para tenerlo aquí como presupuesto.</p>}
                    {deshacer && guardadas.length > 0 && (
                        <button onClick={() => { savePlan(deshacer); setDeshacer(null); setCargadaId(null); }} style={{ width: '100%', marginBottom: '6px', background: '#FEF3C7', border: 'none', borderRadius: '8px', padding: '5px 8px', fontSize: '0.66rem', fontWeight: 700, color: '#B45309', cursor: 'pointer', textAlign: 'left' }}>
                            ↶ Volver al plan anterior
                        </button>
                    )}
                    {guardadas.map(g => {
                        const r = resultadoDe(g.plan);
                        const activa = g.id === cargadaId;
                        const modificada = activa && cargadaModificada;
                        return (
                            <div
                                key={g.id}
                                onClick={() => cargarGuardada(g)}
                                title={activa && !modificada ? 'Es la que estás viendo' : 'Cargar esta proyección'}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 6px',
                                    marginBottom: '3px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    background: modificada ? '#FEF3C7' : activa ? 'rgba(15,169,122,0.10)' : 'transparent',
                                    border: `1px solid ${modificada ? '#F59E0B' : activa ? '#0FA97A' : 'transparent'}`,
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0C2A20', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.nombre}</div>
                                    <div style={{ fontSize: '0.62rem', color: '#6C8079' }}>
                                        <span style={{ fontFamily: MONO, fontWeight: 700, color: r < 0 ? '#C63C3C' : '#0E9F6E' }}>{r < 0 ? '−' : '+'}{money(Math.abs(r))}</span>
                                        {' · '}{modificada ? 'toca para restaurar' : new Date(g.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                                    </div>
                                </div>
                                <button onClick={e => { e.stopPropagation(); if (borrarId === g.id) { saveGuardadas(guardadas.filter(x => x.id !== g.id)); if (activa) { setCargadaId(null); setDeshacer(null); } setBorrarId(null); } else setBorrarId(g.id); }} onBlur={() => setBorrarId(null)} title={borrarId === g.id ? 'Toca de nuevo para borrar' : 'Borrar'}
                                    style={{ background: borrarId === g.id ? '#FEE2E2' : 'none', border: 'none', borderRadius: '6px', padding: '3px 5px', color: borrarId === g.id ? '#C63C3C' : '#6C8079', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6rem', fontWeight: 800, flexShrink: 0 }}>
                                    <Trash2 size={12} />{borrarId === g.id && '¿Borrar?'}
                                </button>
                            </div>
                        );
                    })}
                </aside>
            )}

            {calcAbierta ? (
            <MiniCalculator flotante onMinimizar={() => setCalcAbierta(false)} onUsar={(tipo, n) => {
                if (vista === 'columnas') {
                    if (tipo === 'gasto') {
                        setUsarCantColGasto(false);
                        setFormColGasto(v => ({ ...v, amount: String(n) }));
                    } else {
                        setUsarCantColIngreso(false);
                        setFormColIngreso(v => ({ ...v, amount: String(n) }));
                    }
                } else {
                    if (mostrarSueltos) {
                        setUsarCantidadSuelto(false);
                        setNuevoSuelto(s => ({ ...s, tipo, amount: String(n) }));
                    } else if (tipo === 'gasto' && mostrarGastos) {
                        setUsarCantidadGasto(false);
                        setNuevoGasto(v => ({ ...v, amount: String(n) }));
                    } else if (tipo === 'ingreso' && mostrarIngresos) {
                        setUsarCantidadIngreso(false);
                        setNuevoIngresoFijo(v => ({ ...v, amount: String(n) }));
                    }
                }
            }} />
            ) : (
                <button
                    onClick={() => setCalcAbierta(true)} title="Abrir calculadora"
                    style={{ position: 'fixed', right: '20px', bottom: movil ? '152px' : '92px', zIndex: 900, width: '54px', height: '54px', borderRadius: '50%', border: 'none', background: '#F59E0B', color: '#fff', cursor: 'pointer', boxShadow: '0 8px 24px rgba(245,158,11,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <CalculatorIcon size={24} />
                </button>
            )}

            {/* Menú flotante de 3 puntos para cambiar de grupo o eliminar */}
            {menuFila && (() => {
                const abrirArriba = window.innerHeight - menuFila.rect.bottom < 290 && menuFila.rect.top > 290;
                const opciones: Array<{ label: string; value: string }> = [
                    ...(menuFila.defaultGrupoLabel ? [{ label: menuFila.defaultGrupoLabel, value: '' }] : []),
                    ...menuFila.gruposDisponibles.map(g => ({ label: g, value: g })),
                ];
                return (
                    <>
                        <div
                            onClick={() => setMenuFila(null)}
                            style={{ position: 'fixed', inset: 0, zIndex: 9990 }}
                        />
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                position: 'fixed',
                                right: Math.max(8, window.innerWidth - menuFila.rect.right),
                                ...(abrirArriba
                                    ? { bottom: window.innerHeight - menuFila.rect.top + 6 }
                                    : { top: menuFila.rect.bottom + 6 }),
                                width: '225px',
                                zIndex: 9991,
                                background: '#FFFFFF',
                                border: '1px solid #DCE7E1',
                                borderRadius: '14px',
                                boxShadow: '0 14px 36px rgba(15,23,42,0.18)',
                                padding: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                            }}
                        >
                            <div style={{ padding: '4px 8px 2px', fontSize: '0.62rem', fontWeight: 800, color: '#6C8079', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Mover a grupo
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const fn = menuFila.onCrearGrupo;
                                    setMenuFila(null);
                                    fn();
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '7px',
                                    padding: '7px 8px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'rgba(15,169,122,0.08)',
                                    color: '#0FA97A',
                                    fontSize: '0.76rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <FolderPlus size={14} /> + Crear nuevo grupo…
                            </button>
                            <div style={{ maxHeight: '190px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '2px' }}>
                                {opciones.map(op => {
                                    const activo = menuFila.grupoActual === op.value;
                                    return (
                                        <button
                                            key={op.value || '__default__'}
                                            type="button"
                                            onClick={() => {
                                                menuFila.onCambiarGrupo(op.value);
                                                setMenuFila(null);
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px',
                                                padding: '6px 8px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: activo ? 'rgba(15,169,122,0.08)' : 'transparent',
                                                color: activo ? '#0C2A20' : '#3E524B',
                                                fontSize: '0.76rem',
                                                fontWeight: activo ? 800 : 600,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                            }}
                                        >
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.label}</span>
                                            {activo && <Check size={14} color="#0FA97A" style={{ flexShrink: 0 }} />}
                                        </button>
                                    );
                                })}
                            </div>
                            <div style={{ height: '1px', background: '#EDF3F0', margin: '4px 2px' }} />
                            <button
                                type="button"
                                onClick={() => {
                                    menuFila.onEliminar();
                                    setMenuFila(null);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '7px',
                                    padding: '7px 8px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#C63C3C',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <Trash2 size={14} /> Eliminar
                            </button>
                        </div>
                    </>
                );
            })()}

            {/* Modal para crear nuevo grupo exclusivo para la proyección */}
            {modalCrearGrupo && (
                <div
                    onClick={() => { setModalCrearGrupo(null); setNombreNuevoGrupo(''); }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#FFFFFF',
                            borderRadius: '16px',
                            padding: '22px',
                            maxWidth: '380px',
                            width: '100%',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: modalCrearGrupo.tipo === 'gasto' ? 'rgba(198,60,60,0.1)' : 'rgba(15,169,122,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: modalCrearGrupo.tipo === 'gasto' ? '#C63C3C' : '#0FA97A',
                            }}>
                                <FolderPlus size={20} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0C2A20' }}>
                                    Nuevo grupo de {modalCrearGrupo.tipo === 'gasto' ? 'gasto' : 'ingreso'}
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.72rem', color: '#6C8079' }}>
                                    Solo para esta simulación de proyección
                                </p>
                            </div>
                        </div>

                        <form onSubmit={confirmarCrearGrupo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <input
                                autoFocus
                                value={nombreNuevoGrupo}
                                onChange={e => setNombreNuevoGrupo(e.target.value)}
                                placeholder="Ej: Publicidad, Regalos, Viajes..."
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    border: '1.5px solid #0FA97A',
                                    outline: 'none',
                                    fontSize: '0.9rem',
                                    color: '#0C2A20',
                                    background: '#F7FAF8',
                                    boxSizing: 'border-box',
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => { setModalCrearGrupo(null); setNombreNuevoGrupo(''); }}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid #DCE7E1',
                                        background: '#fff',
                                        color: '#6C8079',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!nombreNuevoGrupo.trim()}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: nombreNuevoGrupo.trim() ? '#0FA97A' : '#DCE7E1',
                                        color: '#fff',
                                        fontSize: '0.8rem',
                                        fontWeight: 800,
                                        cursor: nombreNuevoGrupo.trim() ? 'pointer' : 'default',
                                    }}
                                >
                                    Crear grupo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
