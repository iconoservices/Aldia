import { useState } from 'react';
import { Database, ChevronDown } from 'lucide-react';
import { LIMITE_DOC_BYTES, UMBRAL_AVISO, formatoKB, type MedidaDatos } from '../../lib/tamanoDatos';

// Muestra cuánto ocupan los datos sincronizados frente al límite de 1 MB por
// documento de Firestore, con el desglose por colección.
export const MedidorAlmacenamiento = ({ medir }: { medir: () => MedidaDatos }) => {
    // Se mide una vez al montar (al abrir el perfil): stringify de todo el estado.
    const [medida] = useState(medir);
    const [abierto, setAbierto] = useState(false);
    const pct = Math.min(100, medida.fraccion * 100);
    const aviso = medida.fraccion >= UMBRAL_AVISO;
    const color = aviso ? '#C63C3C' : 'var(--domain-green)';

    return (
        <div style={{ padding: '1rem', background: '#F7FAF8', borderRadius: '16px', border: `1px solid ${aviso ? '#F5C2C2' : '#DCE7E1'}` }}>
            <button onClick={() => setAbierto(a => !a)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: aviso ? '#FEF2F2' : '#F0FDF4', color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Database size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-carbon)' }}>Espacio en la nube</p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', fontWeight: 700, color: '#666', fontFamily: 'var(--font-mono, monospace)' }}>
                        {formatoKB(medida.total)} de {formatoKB(LIMITE_DOC_BYTES)} · {pct.toFixed(0)}%
                    </p>
                </div>
                <ChevronDown size={18} color="#999" style={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            <div style={{ height: '6px', background: '#E5ECE8', borderRadius: '3px', marginTop: '0.75rem', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px' }} />
            </div>

            {aviso && (
                <p style={{ margin: '0.6rem 0 0', fontSize: '0.75rem', fontWeight: 700, color: '#C63C3C', lineHeight: 1.4 }}>
                    Pasaste el {Math.round(UMBRAL_AVISO * 100)}% del límite. Si llega al 100% la app deja de poder guardar en la nube.
                </p>
            )}

            {abierto && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {medida.colecciones.filter(c => c.bytes > 2).map(c => (
                        <div key={c.clave} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 650, color: '#555' }}>
                            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.nombre}{c.items !== null && <span style={{ color: '#AAA' }}> · {c.items}</span>}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-carbon)' }}>{formatoKB(c.bytes)}</span>
                            <span style={{ width: '3.2em', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', color: '#999' }}>
                                {medida.total ? Math.round((c.bytes / medida.total) * 100) : 0}%
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
