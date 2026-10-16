import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

interface Props {
    value: string;
    onChange: (v: string) => void;
    opciones: string[];
    placeholder?: string;
    maxLength?: number;
    ariaLabel?: string;
    /** Filtra las opciones según lo escrito (útil con muchas, ej. contactos). */
    filtrar?: boolean;
    onElegir?: (v: string) => void;
    style?: CSSProperties;
    inputStyle?: CSSProperties;
}

// Campo de texto libre con lista desplegable propia (no el datalist del sistema).
export const CampoDesplegable = ({ value, onChange, opciones, placeholder, maxLength, ariaLabel, filtrar, onElegir, style, inputStyle }: Props) => {
    const [abierto, setAbierto] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!abierto) return;
        const fuera = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false); };
        document.addEventListener('mousedown', fuera);
        return () => document.removeEventListener('mousedown', fuera);
    }, [abierto]);

    const q = value.trim().toLowerCase();
    const lista = filtrar && q ? opciones.filter(o => o.toLowerCase().includes(q)) : opciones;

    const elegir = (o: string) => {
        onChange(o);
        onElegir?.(o);
        setAbierto(false);
    };

    return (
        <div ref={ref} style={{ position: 'relative', ...style }}>
            <input
                value={value} onChange={e => { onChange(e.target.value); setAbierto(true); }}
                onFocus={() => setAbierto(true)}
                onKeyDown={e => { if (e.key === 'Escape') setAbierto(false); }}
                placeholder={placeholder} aria-label={ariaLabel} maxLength={maxLength}
                style={{ ...inputStyle, width: '100%', paddingRight: '30px', boxSizing: 'border-box' }}
            />
            <button
                type="button" tabIndex={-1} aria-label="Ver opciones" onClick={() => setAbierto(a => !a)}
                style={{ position: 'absolute', right: 2, top: 0, bottom: 0, width: 28, border: 'none', background: 'none', cursor: 'pointer', color: '#6B7F78', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>expand_more</span>
            </button>
            {abierto && lista.length > 0 && (
                <div style={{
                    position: 'absolute', zIndex: 50, top: 'calc(100% + 4px)', left: 0, minWidth: '100%', maxHeight: 220, overflowY: 'auto',
                    background: '#fff', border: '1px solid #DCE7E1', borderRadius: 12, boxShadow: '0 8px 24px rgba(12,42,32,.14)', padding: 4,
                }}>
                    {lista.map(o => (
                        <button
                            key={o} type="button" onMouseDown={e => e.preventDefault()} onClick={() => elegir(o)}
                            style={{
                                display: 'block', width: '100%', textAlign: 'left', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                                background: o === value ? '#E6F6EF' : 'transparent', color: o === value ? '#0A7D5A' : '#0C2A20',
                                fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={e => { if (o !== value) e.currentTarget.style.background = '#F1F7F4'; }}
                            onMouseLeave={e => { if (o !== value) e.currentTarget.style.background = 'transparent'; }}
                        >
                            {o}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
