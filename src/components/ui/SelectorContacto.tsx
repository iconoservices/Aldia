import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { iniciales, norm, parecidos } from '../dashboard/contactosUtil';

export interface ContactoOpcion { nombre: string; detalle?: string }

interface Props {
    value: string;
    onChange: (v: string) => void;
    contactos: ContactoOpcion[];
    placeholder?: string;
    onElegir?: (nombre: string) => void;
    /** Si se pasa, "Crear nuevo" abre la ficha de cliente en vez de usar el texto tal cual. */
    onCrear?: (nombre: string) => void;
    inputStyle?: CSSProperties;
}

const Avatar = ({ nombre, ambar }: { nombre: string; ambar?: boolean }) => (
    <span style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: ambar ? '#FFF1D6' : '#E6F6EF', color: ambar ? '#8A5A00' : '#0A7D5A', fontWeight: 800, fontSize: '0.72rem',
    }}>{iniciales(nombre)}</span>
);

// Selector de cliente/acreedor: lista con detalle, aviso de nombres parecidos y "crear nuevo" explícito.
export const SelectorContacto = ({ value, onChange, contactos, placeholder, onElegir, onCrear, inputStyle }: Props) => {
    const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
    const caja = useRef<HTMLDivElement>(null);
    const lista = useRef<HTMLDivElement>(null);

    const medir = () => {
        const r = caja.current!.getBoundingClientRect();
        const abajo = window.innerHeight - r.bottom;
        setPos({ left: r.left, top: r.bottom + 4, width: r.width });
        if (abajo < 200 && r.top > abajo) setPos({ left: r.left, top: Math.max(8, r.top - 4 - 280), width: r.width });
    };

    useEffect(() => {
        if (!pos) return;
        const cerrar = () => setPos(null);
        const fuera = (e: MouseEvent) => {
            const t = e.target as Node;
            if (!caja.current?.contains(t) && !lista.current?.contains(t)) cerrar();
        };
        document.addEventListener('mousedown', fuera);
        window.addEventListener('resize', cerrar);
        return () => { document.removeEventListener('mousedown', fuera); window.removeEventListener('resize', cerrar); };
    }, [pos]);

    const q = norm(value);
    const exacto = contactos.find(c => norm(c.nombre) === q);
    const coinciden = q ? contactos.filter(c => norm(c.nombre).includes(q)) : contactos;
    const similares = q && !exacto ? contactos.filter(c => parecidos(value, c.nombre) && !coinciden.includes(c)) : [];
    const parecidosYCoinciden = q && !exacto ? coinciden : [];

    const elegir = (nombre: string) => { onChange(nombre); onElegir?.(nombre); setPos(null); };

    const fila = (c: ContactoOpcion, ambar?: boolean) => (
        <button
            key={c.nombre} type="button" onClick={() => elegir(c.nombre)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 'none', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', background: norm(c.nombre) === q ? '#E6F6EF' : 'transparent', fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F7F4'; }}
            onMouseLeave={e => { e.currentTarget.style.background = norm(c.nombre) === q ? '#E6F6EF' : 'transparent'; }}
        >
            <Avatar nombre={c.nombre} ambar={ambar} />
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0C2A20' }}>{c.nombre}</span>
                {c.detalle && <span style={{ fontSize: '0.72rem', color: '#6C8079', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.detalle}</span>}
            </span>
        </button>
    );

    const etiqueta = (t: string, color = '#6C8079') => (
        <div style={{ padding: '6px 10px 2px', fontSize: '0.64rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color }}>{t}</div>
    );

    const hayAlgo = coinciden.length > 0 || similares.length > 0 || (!!q && !exacto);

    return (
        <div ref={caja} style={{ position: 'relative' }}>
            <input
                value={value}
                onChange={e => { onChange(e.target.value); if (!pos) medir(); }}
                onFocus={() => { if (!pos) medir(); }}
                onKeyDown={e => { if (e.key === 'Escape') setPos(null); if (e.key === 'Enter') setPos(null); }}
                placeholder={placeholder}
                style={{ ...inputStyle, width: '100%', paddingRight: 34, boxSizing: 'border-box' }}
            />
            <button
                type="button" tabIndex={-1} aria-label="Ver clientes" onClick={() => (pos ? setPos(null) : medir())}
                style={{ position: 'absolute', right: 2, top: 0, bottom: 0, width: 30, border: 'none', background: 'none', cursor: 'pointer', color: '#6B7F78', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: 20, transform: pos ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>expand_more</span>
            </button>
            {pos && hayAlgo && createPortal(
                <div
                    ref={lista} onMouseDown={e => e.preventDefault()}
                    style={{ position: 'fixed', zIndex: 10000, left: pos.left, top: pos.top, width: pos.width, maxHeight: 280, overflowY: 'auto', background: '#fff', border: '1px solid #DCE7E1', borderRadius: 14, boxShadow: '0 10px 28px rgba(12,42,32,.2)', padding: 4 }}
                >
                    {!q && etiqueta(`Tus clientes (${contactos.length})`)}
                    {parecidosYCoinciden.length > 0 && etiqueta('Ya existen')}
                    {coinciden.map(c => fila(c))}
                    {similares.length > 0 && etiqueta('¿Es alguno de estos?', '#8A5A00')}
                    {similares.map(c => fila(c, true))}
                    {q && !exacto && (
                        <button
                            type="button" onClick={() => { if (onCrear) onCrear(value.trim()); else onChange(value.trim()); setPos(null); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 'none', borderTop: coinciden.length + similares.length ? '1px solid #EDF2EF' : 'none', borderRadius: 10, padding: '10px', marginTop: 2, cursor: 'pointer', background: 'transparent', fontFamily: 'inherit', color: '#0A7D5A', fontWeight: 800, fontSize: '0.85rem' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>person_add</span>
                            {onCrear ? 'Nuevo cliente' : 'Crear nuevo'}: «{value.trim()}»
                        </button>
                    )}
                </div>,
                document.body,
            )}
        </div>
    );
};
