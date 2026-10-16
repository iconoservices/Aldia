import { Children, isValidElement, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
    value: string | number;
    onChange: (e: { target: { value: string } }) => void;
    style?: CSSProperties;
    title?: string;
    children: ReactNode;
}

// Reemplazo directo de <select> con lista desplegable propia (se usa igual: <option> adentro).
export const SelectPropio = ({ value, onChange, style, title, children }: Props) => {
    const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
    const btn = useRef<HTMLButtonElement>(null);
    const lista = useRef<HTMLDivElement>(null);

    const opciones = Children.toArray(children)
        .filter((c): c is ReactElement<{ value?: string | number; children?: ReactNode }> => isValidElement(c))
        .map(c => ({ value: String(c.props.value ?? c.props.children ?? ''), label: String(c.props.children ?? c.props.value ?? '') }));
    const actual = opciones.find(o => o.value === String(value));

    useEffect(() => {
        if (!pos) return;
        const cerrar = () => setPos(null);
        const fuera = (e: MouseEvent) => {
            const t = e.target as Node;
            if (!btn.current?.contains(t) && !lista.current?.contains(t)) cerrar();
        };
        document.addEventListener('mousedown', fuera);
        window.addEventListener('resize', cerrar);
        window.addEventListener('scroll', cerrar, true);
        return () => {
            document.removeEventListener('mousedown', fuera);
            window.removeEventListener('resize', cerrar);
            window.removeEventListener('scroll', cerrar, true);
        };
    }, [pos]);

    const abrir = () => {
        if (pos) return setPos(null);
        const r = btn.current!.getBoundingClientRect();
        const abajo = window.innerHeight - r.bottom;
        setPos({ left: r.left, top: abajo < 240 && r.top > abajo ? Math.max(8, r.top - 4 - Math.min(240, opciones.length * 36 + 8)) : r.bottom + 4, width: r.width });
    };

    return (
        <>
            <button
                ref={btn} type="button" title={title} onClick={abrir}
                style={{
                    appearance: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                    textAlign: 'left', cursor: 'pointer', background: '#fff', fontFamily: 'inherit', fontSize: '0.85rem', color: '#0C2A20',
                    ...style,
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{actual?.label ?? ''}</span>
                <span className="material-symbols-outlined" style={{ fontSize: 18, flexShrink: 0, color: '#6B7F78', transform: pos ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>expand_more</span>
            </button>
            {pos && createPortal(
                <div
                    ref={lista}
                    style={{
                        position: 'fixed', zIndex: 10000, left: pos.left, top: pos.top, minWidth: Math.max(pos.width, 140), maxHeight: 240, overflowY: 'auto',
                        background: '#fff', border: '1px solid #DCE7E1', borderRadius: 12, boxShadow: '0 8px 24px rgba(12,42,32,.18)', padding: 4,
                    }}
                >
                    {opciones.map(o => {
                        const sel = o.value === String(value);
                        return (
                            <button
                                key={o.value} type="button"
                                onClick={() => { onChange({ target: { value: o.value } }); setPos(null); }}
                                style={{
                                    display: 'block', width: '100%', textAlign: 'left', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                                    background: sel ? '#E6F6EF' : 'transparent', color: sel ? '#0A7D5A' : '#0C2A20',
                                    fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#F1F7F4'; }}
                                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
                            >
                                {o.label}
                            </button>
                        );
                    })}
                </div>,
                document.body,
            )}
        </>
    );
};
