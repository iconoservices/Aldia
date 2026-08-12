import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { C, campo, TOQUE_MINIMO, RADIO } from '../../theme';
import { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from '../../hooks/useAlDiaState';

/* ══════════════════════════════════════════════════════════════════
   RegistroMovimiento — modal único para anotar un gasto o un ingreso.

   Antes había tres formularios distintos para lo mismo (el panel de
   Finanzas, la línea del Checklist, y el modal del FAB), cada uno con
   sus propios campos y su propio aspecto. Este es el que se comparte
   entre Checklist y Finanzas: mismos campos, mismo estilo, misma
   lógica de guardado. En pantalla completa en vez de una fila inline,
   para que funcione bien también desde el celular (como cualquier
   app de pagos: toque grande, teclado numérico, un botón claro).

   El modal del FAB (QuickActionPanel) se queda aparte a propósito:
   ese además soporta registrar deudas (fiado / préstamo con contacto),
   una función que este modal simple no cubre. Unificarlo también
   perdería esa función salvo que se traslade aquí — se puede hacer
   como paso aparte si hace falta.
══════════════════════════════════════════════════════════════════ */

interface Cuenta {
    id: number;
    name: string;
    color: string;
}

// En iOS Safari, `position: fixed` no se reacomoda cuando aparece el teclado:
// se queda anclado al alto de pantalla COMPLETO (sin teclado), así que una hoja
// alineada con `align-items: flex-end` termina "abajo" de una altura que ya no
// es visible — literalmente detrás del teclado. `visualViewport` sí reporta el
// alto real visible, y se actualiza en vivo mientras el teclado se despliega.
//
// `offsetTop` hace falta además de `height`: al reenfocar un campo (por ej.
// tocar "Listo" y volver a tocar otro input), iOS hace scroll automático de
// la página para "acercar" el campo al teclado. Ese scroll mueve el visual
// viewport hacia abajo dentro del layout viewport (offsetTop > 0), pero un
// `position: fixed` con `top: 0` no lo sigue — se queda anclado arriba de
// donde ahora está lo visible, dejando un hueco abajo (se ve el fondo real
// de la página detrás de la hoja) antes de llegar al teclado.
const useVisualViewport = () => {
    const [vp, setVp] = useState(() => ({
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
        offsetTop: 0,
    }));

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const actualizar = () => setVp({ height: vv.height, offsetTop: vv.offsetTop });
        actualizar();
        vv.addEventListener('resize', actualizar);
        vv.addEventListener('scroll', actualizar);
        return () => {
            vv.removeEventListener('resize', actualizar);
            vv.removeEventListener('scroll', actualizar);
        };
    }, []);

    return vp;
};

interface RegistroMovimientoProps {
    open: boolean;
    onClose: () => void;
    addTransaction: (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projectId?: number, accountId?: number, isCashless?: boolean, category?: string, contact?: string) => void;
    accounts: Cuenta[];
    tipoInicial?: 'gasto' | 'ingreso';
    incomeCategories?: string[];
    expenseCategories?: string[];
    categoryAccountScope?: { ingreso: Record<string, number[]>; gasto: Record<string, number[]> };
    categoryGroups?: { ingreso: Record<string, string>; gasto: Record<string, string> };
    groupAccountScope?: { ingreso: Record<string, number[]>; gasto: Record<string, number[]> };
}

export const RegistroMovimiento = ({
    open, onClose, addTransaction, accounts, tipoInicial = 'gasto',
    incomeCategories = DEFAULT_INCOME_CATEGORIES, expenseCategories = DEFAULT_EXPENSE_CATEGORIES,
    categoryAccountScope, categoryGroups, groupAccountScope,
}: RegistroMovimientoProps) => {
    const [tipo, setTipo] = useState<'gasto' | 'ingreso'>(tipoInicial);
    const [texto, setTexto] = useState('');
    const [monto, setMonto] = useState('');
    const [categoria, setCategoria] = useState('');
    const [cuentaId, setCuentaId] = useState('');
    const visualViewport = useVisualViewport();

    // Cada vez que se abre, arranca limpio en el tipo que el usuario pidió
    // (el botón Gasto o Ingreso que tocó para llegar aquí).
    useEffect(() => {
        if (open) {
            setTipo(tipoInicial);
            setTexto('');
            setMonto('');
            setCategoria('');
            setCuentaId('');
        }
    }, [open, tipoInicial]);

    // La cuenta es obligatoria si hay alguna creada (si no hay ninguna, no
    // se le puede pedir al usuario que elija una que no existe).
    const cuentaValida = accounts.length === 0 || !!cuentaId;

    const guardar = (e: React.FormEvent) => {
        e.preventDefault();
        const valor = parseFloat(monto);
        if (!valor || valor <= 0 || !cuentaValida || !categoria) return;
        addTransaction(
            texto.trim() || (tipo === 'gasto' ? 'Gasto' : 'Ingreso'),
            valor, tipo, false, undefined,
            cuentaId ? Number(cuentaId) : undefined,
            false, categoria.trim() || undefined, undefined
        );
        onClose();
    };

    const colorTipo = tipo === 'gasto' ? C.rojo : C.verde;
    // Si hay cuentas para elegir, las categorías no aparecen hasta elegir una —
    // mostrarlas antes era engañoso, porque algunas iban a desaparecer apenas se
    // eligiera la cuenta (scope por categoría o por grupo). Sin cuentas creadas
    // no hay nada que elegir, así que ahí sí se muestran todas de entrada.
    // Si la categoría no tiene scope propio pero pertenece a un grupo que sí lo
    // tiene, hereda el del grupo (así no hay que repetir "Cuentas..." en cada categoría).
    const categorias = useMemo(() => {
        const base = tipo === 'ingreso' ? incomeCategories : expenseCategories;
        if (accounts.length > 0 && !cuentaId) return [];
        const scope = categoryAccountScope?.[tipo];
        const groupMap = categoryGroups?.[tipo];
        const groupScope = groupAccountScope?.[tipo];
        if (!scope && !groupScope) return base;
        if (!cuentaId) return base;
        const cid = Number(cuentaId);
        return base.filter(cat => {
            const own = scope?.[cat];
            if (own && own.length > 0) return own.includes(cid);
            const group = groupMap?.[cat];
            const inherited = group ? groupScope?.[group] : undefined;
            if (inherited && inherited.length > 0) return inherited.includes(cid);
            return true;
        });
    }, [tipo, incomeCategories, expenseCategories, categoryAccountScope, categoryGroups, groupAccountScope, cuentaId, accounts.length]);

    // Si cambiar de cuenta deja la categoría elegida fuera de su alcance, se limpia
    // para no dejar seleccionado algo que ya no está entre las opciones visibles.
    useEffect(() => {
        if (categoria && !categorias.includes(categoria)) setCategoria('');
    }, [categorias, categoria]);

    const puedeGuardar = !!parseFloat(monto) && cuentaValida && !!categoria;

    // Portal a <body>: el modal usa position: fixed, y si se renderiza dentro de
    // un ancestro que crea un contexto de apilamiento (p. ej. la barra flotante
    // del Checklist con position: fixed + z-index), su z-index queda "atrapado"
    // dentro de ese contexto y otros elementos (nav inferior, FAB) aparecen encima.
    // Montándolo en el body escapa de cualquier contexto y su z-index alto manda.
    //
    // El createPortal va AFUERA de AnimatePresence, no adentro: AnimatePresence
    // seguía el ciclo de vida de sus hijos como elementos React normales, y un
    // Portal no es un elemento React normal — con el portal adentro no montaba
    // nada. Envolviendo al revés, AnimatePresence anima motion.div de verdad.
    return createPortal(
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9997,
                            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                        }}
                    />
                    {/* Solo opacidad, sin desplazamiento vertical: el autoFocus de abajo
                        dispara el teclado en cuanto se monta (en iOS eso solo pasa si el
                        foco es síncrono con el toque). Si además animamos un `y`/`scale`,
                        el cambio de viewport que trae el teclado compite con esa animación
                        y deja la hoja mal posicionada a mitad de camino.
                        top/height siguen a `visualViewport` en vez de `inset:0`/vh: así la
                        hoja se reacomoda por encima del teclado, y también seg el scroll
                        que iOS hace solo cuando se reenfoca un campo (ese scroll mueve el
                        visual viewport dentro del layout viewport — offsetTop > 0 —, y sin
                        seguirlo la hoja se queda "arriba" dejando un hueco con el fondo real
                        de la página antes de llegar al teclado). */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: `${visualViewport.offsetTop}px`, left: 0, right: 0, zIndex: 9998,
                            height: `${visualViewport.height}px`,
                            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                            padding: 0,
                        }}
                        onClick={onClose}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: C.surfaceLowest,
                                borderRadius: `${RADIO.modal} ${RADIO.modal} 0 0`,
                                padding: '24px', width: '100%', maxWidth: '420px',
                                boxSizing: 'border-box',
                                boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
                                maxHeight: '90%', overflowY: 'auto',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: C.onSurface }}>
                                    Registrar movimiento
                                </h3>
                                <button
                                    onClick={onClose}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: '4px' }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>close</span>
                                </button>
                            </div>

                            {/* Segmentado Gasto / Ingreso */}
                            <div style={{
                                display: 'flex', background: C.surfaceContainerLow, padding: '4px',
                                borderRadius: '999px', gap: '4px', marginBottom: '16px',
                            }}>
                                <button
                                    type="button"
                                    onClick={() => { setTipo('gasto'); setCategoria(''); }}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '999px', border: 'none',
                                        background: tipo === 'gasto' ? C.rojo : 'transparent',
                                        color: tipo === 'gasto' ? '#fff' : C.onSurfaceVariant,
                                        fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit',
                                        minHeight: `${TOQUE_MINIMO}px`,
                                    }}
                                >
                                    Gasto
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setTipo('ingreso'); setCategoria(''); }}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '999px', border: 'none',
                                        background: tipo === 'ingreso' ? C.verde : 'transparent',
                                        color: tipo === 'ingreso' ? '#fff' : C.onSurfaceVariant,
                                        fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit',
                                        minHeight: `${TOQUE_MINIMO}px`,
                                    }}
                                >
                                    Ingreso
                                </button>
                            </div>

                            <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ position: 'relative' }}>
                                    <span style={{
                                        position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                                        fontWeight: 700, color: C.onSurfaceVariant, fontSize: '1rem', pointerEvents: 'none',
                                    }}>S/</span>
                                    <input
                                        autoFocus
                                        value={monto}
                                        onChange={e => setMonto(e.target.value)}
                                        placeholder="0"
                                        type="number" min="0" step="0.01" inputMode="decimal"
                                        style={{ ...campo(true), width: '100%', paddingLeft: '34px', fontWeight: 700, fontSize: '1.1rem' }}
                                    />
                                </div>

                                {accounts.length > 0 && (
                                    <select
                                        value={cuentaId}
                                        onChange={e => setCuentaId(e.target.value)}
                                        style={{ ...campo(true), background: C.surfaceContainerLow, cursor: 'pointer', width: '100%' }}
                                    >
                                        <option value="">Cuenta *</option>
                                        {accounts.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                                    </select>
                                )}

                                <div>
                                    <p style={{
                                        margin: '0 0 8px 2px', fontSize: '0.72rem', fontWeight: 700,
                                        color: C.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.02em',
                                    }}>
                                        Categoría *
                                    </p>
                                    {accounts.length > 0 && !cuentaId ? (
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: C.outline, fontStyle: 'italic' }}>
                                            Elige una cuenta para ver las categorías.
                                        </p>
                                    ) : (() => {
                                        const catButton = (cat: string) => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setCategoria(prev => prev === cat ? '' : cat)}
                                                style={{
                                                    padding: '8px 14px', borderRadius: '999px',
                                                    border: `1px solid ${categoria === cat ? colorTipo : C.outlineVariant}`,
                                                    background: categoria === cat ? colorTipo : 'transparent',
                                                    color: categoria === cat ? '#fff' : C.onSurfaceVariant,
                                                    fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                                                    fontFamily: 'inherit', whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {cat}
                                            </button>
                                        );

                                        const groupMap = categoryGroups?.[tipo] || {};
                                        const groupOrder: string[] = [];
                                        const byGroup: Record<string, string[]> = {};
                                        const ungrouped: string[] = [];
                                        categorias.forEach(cat => {
                                            const g = groupMap[cat];
                                            if (g) {
                                                if (!byGroup[g]) { byGroup[g] = []; groupOrder.push(g); }
                                                byGroup[g].push(cat);
                                            } else {
                                                ungrouped.push(cat);
                                            }
                                        });

                                        if (groupOrder.length === 0) {
                                            return (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {categorias.map(catButton)}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {groupOrder.map(g => (
                                                    <div key={g}>
                                                        <div style={{ fontSize: '0.66rem', fontWeight: 800, color: C.outline, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                                                            {g}
                                                        </div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                            {byGroup[g].map(catButton)}
                                                        </div>
                                                    </div>
                                                ))}
                                                {ungrouped.length > 0 && (
                                                    <div>
                                                        <div style={{ fontSize: '0.66rem', fontWeight: 800, color: C.outline, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                                                            Sin grupo
                                                        </div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                            {ungrouped.map(catButton)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                <input
                                    value={texto}
                                    onChange={e => setTexto(e.target.value)}
                                    placeholder="Notas o comentarios (opcional)"
                                    style={{ ...campo(true), width: '100%' }}
                                />

                                <button
                                    type="submit"
                                    disabled={!puedeGuardar}
                                    style={{
                                        background: puedeGuardar ? colorTipo : C.surfaceContainerHigh,
                                        color: puedeGuardar ? '#fff' : C.onSurfaceVariant,
                                        border: 'none', borderRadius: '14px', padding: '14px',
                                        minHeight: `${TOQUE_MINIMO}px`,
                                        fontSize: '1rem', fontWeight: 800, fontFamily: 'inherit',
                                        cursor: puedeGuardar ? 'pointer' : 'default',
                                        marginTop: '4px',
                                    }}
                                >
                                    {tipo === 'gasto' ? 'Registrar gasto' : 'Registrar ingreso'}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};
