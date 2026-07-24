import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C, campo, TOQUE_MINIMO, RADIO } from '../../theme';

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
const useAlturaVisible = () => {
    const [altura, setAltura] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 0));

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const actualizar = () => setAltura(vv.height);
        actualizar();
        vv.addEventListener('resize', actualizar);
        vv.addEventListener('scroll', actualizar);
        return () => {
            vv.removeEventListener('resize', actualizar);
            vv.removeEventListener('scroll', actualizar);
        };
    }, []);

    return altura;
};

interface RegistroMovimientoProps {
    open: boolean;
    onClose: () => void;
    addTransaction: (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projectId?: number, accountId?: number, isCashless?: boolean, category?: string, contact?: string) => void;
    accounts: Cuenta[];
    tipoInicial?: 'gasto' | 'ingreso';
}

export const RegistroMovimiento = ({ open, onClose, addTransaction, accounts, tipoInicial = 'gasto' }: RegistroMovimientoProps) => {
    const [tipo, setTipo] = useState<'gasto' | 'ingreso'>(tipoInicial);
    const [texto, setTexto] = useState('');
    const [monto, setMonto] = useState('');
    const [categoria, setCategoria] = useState('');
    const [cuentaId, setCuentaId] = useState('');
    const [sinEfectivo, setSinEfectivo] = useState(false);
    const alturaVisible = useAlturaVisible();

    // Cada vez que se abre, arranca limpio en el tipo que el usuario pidió
    // (el botón Gasto o Ingreso que tocó para llegar aquí).
    useEffect(() => {
        if (open) {
            setTipo(tipoInicial);
            setTexto('');
            setMonto('');
            setCategoria('');
            setCuentaId('');
            setSinEfectivo(false);
        }
    }, [open, tipoInicial]);

    const guardar = (e: React.FormEvent) => {
        e.preventDefault();
        const valor = parseFloat(monto);
        if (!valor || valor <= 0) return;
        addTransaction(
            texto.trim() || (tipo === 'gasto' ? 'Gasto' : 'Ingreso'),
            valor, tipo, false, undefined,
            cuentaId ? Number(cuentaId) : undefined,
            sinEfectivo, categoria.trim() || undefined, undefined
        );
        onClose();
    };

    const colorTipo = tipo === 'gasto' ? C.rojo : C.verde;

    return (
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
                        La altura es la de `alturaVisible` (visualViewport), no `inset:0`/vh:
                        así la hoja se reacomoda por encima del teclado en vez de quedar
                        anclada a un alto de pantalla que el teclado ya tapó. */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9998,
                            height: alturaVisible ? `${alturaVisible}px` : '100vh',
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
                                    onClick={() => setTipo('gasto')}
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
                                    onClick={() => setTipo('ingreso')}
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
                                <input
                                    autoFocus
                                    value={texto}
                                    onChange={e => setTexto(e.target.value)}
                                    placeholder={tipo === 'gasto' ? '¿En qué gastaste?' : '¿De qué fue el ingreso?'}
                                    style={{ ...campo(true), width: '100%' }}
                                />

                                <div style={{ position: 'relative' }}>
                                    <span style={{
                                        position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                                        fontWeight: 700, color: C.onSurfaceVariant, fontSize: '1rem', pointerEvents: 'none',
                                    }}>S/</span>
                                    <input
                                        value={monto}
                                        onChange={e => setMonto(e.target.value)}
                                        placeholder="0"
                                        type="number" min="0" step="0.01" inputMode="decimal"
                                        style={{ ...campo(true), width: '100%', paddingLeft: '34px', fontWeight: 700, fontSize: '1.1rem' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        value={categoria}
                                        onChange={e => setCategoria(e.target.value)}
                                        placeholder="Categoría (opcional)"
                                        style={{ ...campo(true), flex: 1, minWidth: 0 }}
                                    />
                                    {accounts.length > 0 && (
                                        <select
                                            value={cuentaId}
                                            onChange={e => setCuentaId(e.target.value)}
                                            style={{ ...campo(true), background: C.surfaceContainerLow, cursor: 'pointer', flex: 1, minWidth: 0 }}
                                        >
                                            <option value="">Cuenta…</option>
                                            {accounts.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                                        </select>
                                    )}
                                </div>

                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    fontSize: '0.85rem', color: C.onSurfaceVariant, cursor: 'pointer',
                                    padding: '4px 0',
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={sinEfectivo}
                                        onChange={e => setSinEfectivo(e.target.checked)}
                                        style={{ accentColor: C.primary, width: '18px', height: '18px' }}
                                    />
                                    Sin efectivo (no afecta el saldo disponible)
                                </label>

                                <button
                                    type="submit"
                                    disabled={!parseFloat(monto)}
                                    style={{
                                        background: parseFloat(monto) ? colorTipo : C.surfaceContainerHigh,
                                        color: parseFloat(monto) ? '#fff' : C.onSurfaceVariant,
                                        border: 'none', borderRadius: '14px', padding: '14px',
                                        minHeight: `${TOQUE_MINIMO}px`,
                                        fontSize: '1rem', fontWeight: 800, fontFamily: 'inherit',
                                        cursor: parseFloat(monto) ? 'pointer' : 'default',
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
        </AnimatePresence>
    );
};
