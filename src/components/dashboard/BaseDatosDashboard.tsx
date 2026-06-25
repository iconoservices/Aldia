import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Search, Filter, Download } from 'lucide-react';

interface Item {
    id: number;
    nombre: string;
    categoria: string;
    subcategoria: string;
    precio?: number;
    cantidad?: number;
    unidad?: string;
    duracion?: number;
    frecuencia?: string;
    rotar?: boolean;
    notas?: string;
}

const DATA_INICIAL: Item[] = [
    { id: 1, nombre: 'Caminata', categoria: 'Cuerpo', subcategoria: 'Movimiento', duracion: 30, frecuencia: 'diario', notas: 'Mañana o tarde' },
    { id: 2, nombre: 'Estiramientos', categoria: 'Cuerpo', subcategoria: 'Movimiento', duracion: 15, frecuencia: 'diario', notas: 'Al despertar' },
    { id: 3, nombre: 'Flexiones', categoria: 'Cuerpo', subcategoria: 'Ejercicios', duracion: 10, frecuencia: '3x semana', notas: '3 series de 10' },
    { id: 4, nombre: 'Sentadillas', categoria: 'Cuerpo', subcategoria: 'Ejercicios', duracion: 10, frecuencia: '3x semana', notas: '3 series de 15' },
    { id: 5, nombre: 'Yoga', categoria: 'Cuerpo', subcategoria: 'Movimiento', duracion: 45, frecuencia: '2x semana', notas: 'Fin de semana' },
    { id: 6, nombre: 'Leer "Hábitos Atómicos"', categoria: 'Mente', subcategoria: 'Lectura', duracion: 20, frecuencia: 'diario', notas: '10 páginas/día' },
    { id: 7, nombre: 'Meditación', categoria: 'Mente', subcategoria: 'Meditación', duracion: 10, frecuencia: 'diario', notas: 'Mañana al despertar' },
    { id: 8, nombre: 'Leer "El Poder del Ahora"', categoria: 'Mente', subcategoria: 'Lectura', duracion: 15, frecuencia: 'noche', notas: 'Antes de dormir' },
    { id: 9, nombre: 'Escribir journal', categoria: 'Mente', subcategoria: 'Journaling', duracion: 10, frecuencia: 'diario', notas: 'Reflexión del día' },
    { id: 10, nombre: 'Huevos', categoria: 'Alimentación', subcategoria: 'Alimentos', precio: 15000, cantidad: 1, unidad: 'cartón' },
    { id: 11, nombre: 'Plátanos', categoria: 'Alimentación', subcategoria: 'Alimentos', precio: 3000, cantidad: 6, unidad: 'unidades' },
    { id: 12, nombre: 'Arroz', categoria: 'Alimentación', subcategoria: 'Alimentos', precio: 4500, cantidad: 2, unidad: 'bolsa 500g' },
    { id: 13, nombre: 'Pechuga de pollo', categoria: 'Alimentación', subcategoria: 'Alimentos', precio: 8000, cantidad: 1, unidad: 'kg' },
    { id: 14, nombre: 'Huevos revueltos con plátano', categoria: 'Alimentación', subcategoria: 'Recetas', rotar: true, notas: 'Desayuno - 15 min' },
    { id: 15, nombre: 'Arroz con pollo', categoria: 'Alimentación', subcategoria: 'Recetas', rotar: true, notas: 'Almuerzo - 30 min' },
    { id: 16, nombre: 'Avena con fruta', categoria: 'Alimentación', subcategoria: 'Recetas', rotar: false, notas: 'Desayuno - 5 min' },
];

const CATEGORIAS = ['Todas', 'Cuerpo', 'Mente', 'Alimentación'];
const SUBCATEGORIAS = ['Todas', 'Movimiento', 'Ejercicios', 'Lectura', 'Meditación', 'Journaling', 'Alimentos', 'Recetas'];

export const BaseDatosDashboard = () => {
    const [items] = useState<Item[]>(DATA_INICIAL);
    const [filtroCategoria, setFiltroCategoria] = useState('Todas');
    const [filtroSubcategoria, setFiltroSubcategoria] = useState('Todas');
    const [search, setSearch] = useState('');

    const itemsFiltrados = items.filter(item => {
        if (filtroCategoria !== 'Todas' && item.categoria !== filtroCategoria) return false;
        if (filtroSubcategoria !== 'Todas' && item.subcategoria !== filtroSubcategoria) return false;
        if (search && !item.nombre.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const totalAlimentos = items
        .filter(i => i.subcategoria === 'Alimentos' && i.precio)
        .reduce((sum, i) => sum + (i.precio || 0) * (i.cantidad || 1), 0);

    const exportCSV = () => {
        const headers = ['Nombre', 'Categoría', 'Subcategoría', 'Precio', 'Cantidad', 'Unidad', 'Duración(min)', 'Frecuencia', 'Notas'];
        const rows = itemsFiltrados.map(i => [
            i.nombre,
            i.categoria,
            i.subcategoria,
            i.precio || '',
            i.cantidad || '',
            i.unidad || '',
            i.duracion || '',
            i.frecuencia || '',
            i.notas || '',
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'base_datos_bienestar.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const cellStyle: React.CSSProperties = {
        padding: '8px 12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        borderBottom: '1px solid #edeeef',
        whiteSpace: 'nowrap',
    };

    const headerCellStyle: React.CSSProperties = {
        ...cellStyle,
        background: '#f8f9fa',
        fontWeight: 900,
        fontSize: '0.65rem',
        color: '#877369',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        borderBottom: '2px solid #e7e8e9',
    };

    return (
        <div style={{ paddingBottom: '5rem' }}>
            {/* BARRA DE HERRAMIENTAS */}
            <GlassCard style={{ background: 'white', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 200px', background: '#f5f5f5', borderRadius: '10px', padding: '8px 12px' }}>
                        <Search size={16} color="#999" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ border: 'none', background: 'transparent', flex: 1, fontSize: '0.8rem', fontWeight: 600, outline: 'none' }}
                        />
                    </div>
                    <select
                        value={filtroCategoria}
                        onChange={(e) => setFiltroCategoria(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.75rem', fontWeight: 700, background: 'white' }}
                    >
                        {CATEGORIAS.map(c => <option key={c} value={c}>{c === 'Todas' ? 'Todas las categorías' : c}</option>)}
                    </select>
                    <select
                        value={filtroSubcategoria}
                        onChange={(e) => setFiltroSubcategoria(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.75rem', fontWeight: 700, background: 'white' }}
                    >
                        {SUBCATEGORIAS.map(s => <option key={s} value={s}>{s === 'Todas' ? 'Todas las subcategorías' : s}</option>)}
                    </select>
                    <button
                        onClick={exportCSV}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: '#10B981', color: 'white', border: 'none',
                            borderRadius: '10px', padding: '8px 16px',
                            fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer',
                        }}
                    >
                        <Download size={14} /> EXPORTAR CSV
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#666' }}>
                        Total registros: <strong>{items.length}</strong>
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#666' }}>
                        Filtrados: <strong>{itemsFiltrados.length}</strong>
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10B981' }}>
                        Presupuesto alimentos: <strong>${totalAlimentos.toLocaleString()}</strong>
                    </span>
                </div>
            </GlassCard>

            {/* TABLA ESTILO EXCEL */}
            <div style={{
                overflowX: 'auto',
                borderRadius: '12px',
                border: '1px solid #e7e8e9',
                background: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                    <thead>
                        <tr>
                            <th style={headerCellStyle}>#</th>
                            <th style={headerCellStyle}>Nombre</th>
                            <th style={headerCellStyle}>Categoría</th>
                            <th style={headerCellStyle}>Subcategoría</th>
                            <th style={{ ...headerCellStyle, textAlign: 'right' }}>Precio</th>
                            <th style={{ ...headerCellStyle, textAlign: 'center' }}>Cant</th>
                            <th style={headerCellStyle}>Unidad</th>
                            <th style={{ ...headerCellStyle, textAlign: 'center' }}>Duración</th>
                            <th style={headerCellStyle}>Frecuencia</th>
                            <th style={headerCellStyle}>Notas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itemsFiltrados.map((item, idx) => {
                            const colorCategoria =
                                item.categoria === 'Cuerpo' ? '#EF4444' :
                                item.categoria === 'Mente' ? '#8B5CF6' : '#10B981';
                            return (
                                <motion.tr
                                    key={item.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: idx * 0.02 }}
                                    style={{
                                        background: idx % 2 === 0 ? 'white' : '#fafbfc',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#f0f1f3')}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#fafbfc';
                                    }}
                                >
                                    <td style={cellStyle}>{idx + 1}</td>
                                    <td style={{ ...cellStyle, fontWeight: 800, color: 'var(--text-carbon)' }}>
                                        {item.nombre}
                                    </td>
                                    <td style={cellStyle}>
                                        <span style={{
                                            background: `${colorCategoria}15`,
                                            color: colorCategoria,
                                            padding: '3px 10px',
                                            borderRadius: '8px',
                                            fontWeight: 800,
                                            fontSize: '0.65rem',
                                        }}>
                                            {item.categoria}
                                        </span>
                                    </td>
                                    <td style={cellStyle}>{item.subcategoria}</td>
                                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700 }}>
                                        {item.precio ? `$${item.precio.toLocaleString()}` : '-'}
                                    </td>
                                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                                        {item.cantidad || '-'}
                                    </td>
                                    <td style={cellStyle}>{item.unidad || '-'}</td>
                                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                                        {item.duracion ? `${item.duracion} min` : '-'}
                                    </td>
                                    <td style={cellStyle}>{item.frecuencia || '-'}</td>
                                    <td style={{ ...cellStyle, color: '#666', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.notas || '-'}
                                    </td>
                                </motion.tr>
                            );
                        })}
                        {itemsFiltrados.length === 0 && (
                            <tr>
                                <td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: '#888', fontWeight: 700 }}>
                                    No hay registros que coincidan con los filtros
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
