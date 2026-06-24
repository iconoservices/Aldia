import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Plus, Trash2, Utensils, ShoppingCart, Wallet, RotateCcw } from 'lucide-react';

interface Item {
    id: number;
    nombre: string;
    categoria: 'alimento' | 'plato' | 'cuerpo' | 'mente';
    subcategoria?: string;
    precio?: number;
    cantidad?: number;
    unidad?: string;
    duracion?: number;
    frecuencia?: string;
    rotar?: boolean;
    notas?: string;
    parentId?: number;
}

const CATEGORIAS = [
    { value: 'alimento', label: '🛒 Alimento', color: '#10B981' },
    { value: 'plato', label: '🍽️ Plato', color: '#F59E0B' },
    { value: 'cuerpo', label: '💪 Cuerpo', color: '#EF4444' },
    { value: 'mente', label: '📚 Mente', color: '#8B5CF6' },
] as const;

export const AlimentacionDashboard = () => {
    const [items, setItems] = useState<Item[]>([
        // ALIMENTOS (para comprar) - con precio, cantidad, unidad
        { id: 1, nombre: 'Huevos', categoria: 'alimento', precio: 15000, cantidad: 1, unidad: 'cartón' },
        { id: 2, nombre: 'Plátanos', categoria: 'alimento', precio: 3000, cantidad: 6, unidad: 'unidades' },
        { id: 3, nombre: 'Arroz', categoria: 'alimento', precio: 4500, cantidad: 2, unidad: 'bolsa 500g' },
        { id: 4, nombre: 'Pechuga de pollo', categoria: 'alimento', precio: 8000, cantidad: 1, unidad: 'kg' },
        { id: 5, nombre: 'Avena', categoria: 'alimento', precio: 5000, cantidad: 1, unidad: 'caja' },
        { id: 6, nombre: 'Leche', categoria: 'alimento', precio: 3500, cantidad: 1, unidad: 'litro' },
        { id: 7, nombre: 'Pan integral', categoria: 'alimento', precio: 4000, cantidad: 1, unidad: 'paquete' },
        
        // PLATOS (comidas ya pensadas) - con rotar, porciones, tiempo
        { id: 8, nombre: 'Huevos revueltos con plátano', categoria: 'plato', rotar: true, notas: 'Desayuno - 15 min' },
        { id: 9, nombre: 'Arroz con pollo', categoria: 'plato', rotar: true, notas: 'Almuerzo - 30 min' },
        { id: 10, nombre: 'Avena con fruta', categoria: 'plato', rotar: false, notas: 'Desayuno - 5 min' },
        { id: 11, nombre: 'Pollo a la plancha con ensalada', categoria: 'plato', rotar: true, notas: 'Cena - 25 min' },
        { id: 12, nombre: 'Sandwich de atún', categoria: 'plato', rotar: false, notas: 'Cena rápida - 10 min' },
        
        // CUERPO (movimiento/ejercicios) - con duración, frecuencia
        { id: 13, nombre: 'Caminata', categoria: 'cuerpo', duracion: 30, frecuencia: 'diario', notas: 'Mañana o tarde' },
        { id: 14, nombre: 'Estiramientos', categoria: 'cuerpo', duracion: 15, frecuencia: 'diario', notas: 'Al despertar' },
        { id: 15, nombre: 'Flexiones', categoria: 'cuerpo', duracion: 10, frecuencia: '3x semana', notas: '3 series de 10' },
        { id: 16, nombre: 'Sentadillas', categoria: 'cuerpo', duracion: 10, frecuencia: '3x semana', notas: '3 series de 15' },
        { id: 17, nombre: 'Yoga', categoria: 'cuerpo', duracion: 45, frecuencia: '2x semana', notas: 'Fin de semana' },
        
        // MENTE (lectura/libros) - con duración, páginas, progreso
        { id: 18, nombre: 'Leer "Hábitos Atómicos"', categoria: 'mente', duracion: 20, frecuencia: 'diario', notas: '10 páginas/día' },
        { id: 19, nombre: 'Meditación', categoria: 'mente', duracion: 10, frecuencia: 'diario', notas: 'Mañana al despertar' },
        { id: 20, nombre: 'Leer "El Poder del Ahora"', categoria: 'mente', duracion: 15, frecuencia: 'noche', notas: 'Antes de dormir' },
        { id: 21, nombre: 'Escribir journal', categoria: 'mente', duracion: 10, frecuencia: 'diario', notas: 'Reflexión del día' },
    ]);
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoPrecio, setNuevoPrecio] = useState('');
    const [nuevaCategoria, setNuevaCategoria] = useState<'alimento' | 'plato' | 'cuerpo' | 'mente'>('alimento');
    const [filtro, setFiltro] = useState<'todas' | 'alimento' | 'plato' | 'cuerpo' | 'mente'>('todas');

    const totalGasto = items
        .filter(i => i.categoria === 'alimento' && i.precio)
        .reduce((sum, i) => sum + (i.precio || 0) * (i.cantidad || 1), 0);

    const agregarItem = () => {
        if (!nuevoNombre.trim()) return;
        const nuevoItem: Item = {
            id: Date.now(),
            nombre: nuevoNombre.trim(),
            categoria: nuevaCategoria,
            precio: nuevoPrecio ? Number(nuevoPrecio) : undefined,
            cantidad: 1,
            rotar: false,
        };
        setItems([...items, nuevoItem]);
        setNuevoNombre('');
        setNuevoPrecio('');
    };

    const eliminarItem = (id: number) => {
        setItems(items.filter(i => i.id !== id));
    };

    const toggleRotar = (id: number) => {
        setItems(items.map(i => i.id === id ? { ...i, rotar: !i.rotar } : i));
    };

    const actualizarCantidad = (id: number, delta: number) => {
        setItems(items.map(i => {
            if (i.id === id) {
                const nuevaCantidad = Math.max(1, (i.cantidad || 1) + delta);
                return { ...i, cantidad: nuevaCantidad };
            }
            return i;
        }));
    };

    const itemsFiltrados = filtro === 'todas' ? items : items.filter(i => i.categoria === filtro);

    return (
        <div style={{ paddingBottom: '5rem' }}>
            {/* TARJETA DE RESUMEN */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <GlassCard 
                    variant="strong"
                    style={{
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        color: 'white',
                        padding: '1.2rem',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <ShoppingCart size={18} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase' }}>Total Alimentos</span>
                    </div>
                    <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900 }}>${totalGasto.toLocaleString()}</h2>
                </GlassCard>

                {CATEGORIAS.map(cat => {
                    const count = items.filter(i => i.categoria === cat.value).length;
                    return (
                        <GlassCard 
                            key={cat.value}
                            style={{
                                background: 'white',
                                padding: '1rem',
                                borderLeft: `4px solid ${cat.color}`,
                                cursor: 'pointer',
                                opacity: filtro === cat.value || filtro === 'todas' ? 1 : 0.6,
                                transition: 'all 0.2s'
                            }}
                            onClick={() => setFiltro(filtro === cat.value ? 'todas' : cat.value)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.9rem' }}>{cat.label}</span>
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{count}</h3>
                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#888' }}>
                                {filtro === cat.value ? '👁️ VIENDO' : 'TOCAR PARA FILTRAR'}
                            </span>
                        </GlassCard>
                    );
                })}
            </div>

            {/* FORMULARIO AGREGAR */}
            <GlassCard style={{ background: 'white', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Nombre (ej. Huevos, Arroz con Pollo...)"
                        value={nuevoNombre}
                        onChange={(e) => setNuevoNombre(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && agregarItem()}
                        autoFocus
                        style={{
                            flex: '1 1 200px',
                            padding: '10px',
                            borderRadius: '10px',
                            border: '1px solid #DDD',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                        }}
                    />
                    <input
                        type="number"
                        placeholder="Precio $"
                        value={nuevoPrecio}
                        onChange={(e) => setNuevoPrecio(e.target.value)}
                        style={{
                            width: '80px',
                            padding: '10px',
                            borderRadius: '10px',
                            border: '1px solid #DDD',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                        }}
                    />
                    <select
                        value={nuevaCategoria}
                        onChange={(e) => setNuevaCategoria(e.target.value as any)}
                        style={{
                            padding: '10px',
                            borderRadius: '10px',
                            border: '1px solid #DDD',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: 'white',
                        }}
                    >
                        {CATEGORIAS.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                    <button
                        onClick={agregarItem}
                        style={{
                            background: 'var(--domain-blue)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '10px 20px',
                            fontSize: '0.75rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <Plus size={16} /> AGREGAR
                    </button>
                </div>
            </GlassCard>

            {/* TABLA DE ITEMS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {itemsFiltrados.length === 0 ? (
                    <GlassCard style={{ padding: '3rem', textAlign: 'center', background: '#F8FAFC' }}>
                        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#888' }}>
                            {filtro === 'todas' 
                                ? 'No hay items aún. ¡Agrega tu primer alimento, plato o actividad!' 
                                : `No hay items en ${CATEGORIAS.find(c => c.value === filtro)?.label}`
                            }
                        </p>
                    </GlassCard>
                ) : (
                    itemsFiltrados.map(item => {
                        const catConfig = CATEGORIAS.find(c => c.value === item.categoria)!;
                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <GlassCard
                                    style={{
                                        background: 'white',
                                        padding: '0.8rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        borderLeft: `4px solid ${catConfig.color}`,
                                    }}
                                >
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        background: `${catConfig.color}15`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        {item.categoria === 'alimento' && <ShoppingCart size={16} color={catConfig.color} />}
                                        {item.categoria === 'plato' && <Utensils size={16} color={catConfig.color} />}
                                        {item.categoria === 'cuerpo' && <RotateCcw size={16} color={catConfig.color} />}
                                        {item.categoria === 'mente' && <Wallet size={16} color={catConfig.color} />}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            margin: 0,
                                            fontWeight: 800,
                                            fontSize: '0.9rem',
                                            color: 'var(--text-carbon)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}>
                                            {item.nombre}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                            <span style={{
                                                fontSize: '0.55rem',
                                                fontWeight: 900,
                                                background: `${catConfig.color}15`,
                                                color: catConfig.color,
                                                padding: '2px 6px',
                                                borderRadius: '6px',
                                            }}>
                                                {catConfig.label.toUpperCase()}
                                            </span>
                                            {item.precio && (
                                                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#888' }}>
                                                    ${item.precio} x {item.cantidad} = ${(item.precio * (item.cantidad || 1)).toLocaleString()}
                                                </span>
                                            )}
                                            {item.rotar && (
                                                <span style={{
                                                    fontSize: '0.55rem',
                                                    fontWeight: 900,
                                                    background: '#FEF3C7',
                                                    color: '#D97706',
                                                    padding: '2px 6px',
                                                    borderRadius: '6px',
                                                }}>
                                                    🔄 ROTAR
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {item.categoria === 'plato' && (
                                        <button
                                            onClick={() => toggleRotar(item.id)}
                                            style={{
                                                background: item.rotar ? '#FDE68A' : '#F3F4F6',
                                                border: 'none',
                                                borderRadius: '8px',
                                                padding: '6px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                            title="Marcar para rotar"
                                        >
                                            <RotateCcw size={14} color={item.rotar ? '#D97706' : '#9CA3AF'} />
                                        </button>
                                    )}

                                    {item.categoria === 'alimento' && item.precio && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <button
                                                onClick={() => actualizarCantidad(item.id, -1)}
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #DDD',
                                                    background: 'white',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1rem',
                                                    fontWeight: 900,
                                                    color: '#666',
                                                }}
                                            >
                                                −
                                            </button>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 900,
                                                minWidth: '24px',
                                                textAlign: 'center',
                                            }}>
                                                {item.cantidad}
                                            </span>
                                            <button
                                                onClick={() => actualizarCantidad(item.id, 1)}
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #DDD',
                                                    background: 'white',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1rem',
                                                    fontWeight: 900,
                                                    color: '#666',
                                                }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => eliminarItem(item.id)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Trash2 size={14} color="#f87171" opacity={0.5} />
                                    </button>
                                </GlassCard>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
};