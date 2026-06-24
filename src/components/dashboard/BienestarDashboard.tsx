import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Plus, Trash2, Utensils, ShoppingCart, RotateCcw, Heart, ChefHat, Dumbbell, BookOpen } from 'lucide-react';

interface Item {
    id: number;
    nombre: string;
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

interface Categoria {
    id: 'cuerpo' | 'mente' | 'alimentacion';
    label: string;
    icon: any;
    color: string;
    subcategorias: string[];
    items: Item[];
}

const CATEGORIAS_INICIALES: Categoria[] = [
    {
        id: 'cuerpo',
        label: 'Cuerpo',
        icon: Dumbbell,
        color: '#EF4444',
        subcategorias: ['Ejercicios', 'Movimiento'],
        items: [
            { id: 1, nombre: 'Caminata', subcategoria: 'Movimiento', duracion: 30, frecuencia: 'diario', notas: 'Mañana o tarde' },
            { id: 2, nombre: 'Estiramientos', subcategoria: 'Movimiento', duracion: 15, frecuencia: 'diario', notas: 'Al despertar' },
            { id: 3, nombre: 'Flexiones', subcategoria: 'Ejercicios', duracion: 10, frecuencia: '3x semana', notas: '3 series de 10' },
            { id: 4, nombre: 'Sentadillas', subcategoria: 'Ejercicios', duracion: 10, frecuencia: '3x semana', notas: '3 series de 15' },
            { id: 5, nombre: 'Yoga', subcategoria: 'Movimiento', duracion: 45, frecuencia: '2x semana', notas: 'Fin de semana' },
        ]
    },
    {
        id: 'mente',
        label: 'Mente',
        icon: BookOpen,
        color: '#8B5CF6',
        subcategorias: ['Lectura', 'Meditación', 'Journaling'],
        items: [
            { id: 6, nombre: 'Leer "Hábitos Atómicos"', subcategoria: 'Lectura', duracion: 20, frecuencia: 'diario', notas: '10 páginas/día' },
            { id: 7, nombre: 'Meditación', subcategoria: 'Meditación', duracion: 10, frecuencia: 'diario', notas: 'Mañana al despertar' },
            { id: 8, nombre: 'Leer "El Poder del Ahora"', subcategoria: 'Lectura', duracion: 15, frecuencia: 'noche', notas: 'Antes de dormir' },
            { id: 9, nombre: 'Escribir journal', subcategoria: 'Journaling', duracion: 10, frecuencia: 'diario', notas: 'Reflexión del día' },
        ]
    },
    {
        id: 'alimentacion',
        label: 'Alimentación',
        icon: Utensils,
        color: '#10B981',
        subcategorias: ['Alimentos', 'Recetas'],
        items: [
            { id: 10, nombre: 'Huevos', subcategoria: 'Alimentos', precio: 15000, cantidad: 1, unidad: 'cartón' },
            { id: 11, nombre: 'Plátanos', subcategoria: 'Alimentos', precio: 3000, cantidad: 6, unidad: 'unidades' },
            { id: 12, nombre: 'Arroz', subcategoria: 'Alimentos', precio: 4500, cantidad: 2, unidad: 'bolsa 500g' },
            { id: 13, nombre: 'Pechuga de pollo', subcategoria: 'Alimentos', precio: 8000, cantidad: 1, unidad: 'kg' },
            { id: 14, nombre: 'Huevos revueltos con plátano', subcategoria: 'Recetas', rotar: true, notas: 'Desayuno - 15 min' },
            { id: 15, nombre: 'Arroz con pollo', subcategoria: 'Recetas', rotar: true, notas: 'Almuerzo - 30 min' },
            { id: 16, nombre: 'Avena con fruta', subcategoria: 'Recetas', rotar: false, notas: 'Desayuno - 5 min' },
        ]
    }
];

export const BienestarDashboard = () => {
    const [categorias, setCategorias] = useState<Categoria[]>(CATEGORIAS_INICIALES);
    const [categoriaActiva, setCategoriaActiva] = useState<'cuerpo' | 'mente' | 'alimentacion' | null>(null);
    const [subcategoriaActiva, setSubcategoriaActiva] = useState<string | null>(null);
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoPrecio, setNuevoPrecio] = useState('');
    const [nuevaSubcategoria, setNuevaSubcategoria] = useState('');
    const [mostrarFormulario, setMostrarFormulario] = useState(false);

    const totalGasto = categorias
        .find(c => c.id === 'alimentacion')
        ?.items.filter(i => i.subcategoria === 'Alimentos' && i.precio)
        .reduce((sum, i) => sum + (i.precio || 0) * (i.cantidad || 1), 0) || 0;

    const agregarItem = () => {
        if (!nuevoNombre.trim() || !categoriaActiva) return;
        
        const categoriaIndex = categorias.findIndex(c => c.id === categoriaActiva);
        if (categoriaIndex === -1) return;

        const nuevaCategoria = { ...categorias[categoriaIndex] };
        nuevaCategoria.items = [
            ...nuevaCategoria.items,
            {
                id: Date.now(),
                nombre: nuevoNombre.trim(),
                subcategoria: nuevaSubcategoria || nuevaCategoria.subcategorias[0],
                precio: nuevoPrecio ? Number(nuevoPrecio) : undefined,
                cantidad: 1,
                rotar: false,
            }
        ];

        const nuevasCategorias = [...categorias];
        nuevasCategorias[categoriaIndex] = nuevaCategoria;
        setCategorias(nuevasCategorias);
        
        setNuevoNombre('');
        setNuevoPrecio('');
        setNuevaSubcategoria('');
        setMostrarFormulario(false);
    };

    const eliminarItem = (itemId: number) => {
        if (!categoriaActiva) return;
        
        const categoriaIndex = categorias.findIndex(c => c.id === categoriaActiva);
        if (categoriaIndex === -1) return;

        const nuevasCategorias = [...categorias];
        nuevasCategorias[categoriaIndex] = {
            ...nuevasCategorias[categoriaIndex],
            items: nuevasCategorias[categoriaIndex].items.filter(i => i.id !== itemId)
        };
        setCategorias(nuevasCategorias);
    };

    const toggleRotar = (itemId: number) => {
        if (!categoriaActiva) return;
        
        const categoriaIndex = categorias.findIndex(c => c.id === categoriaActiva);
        if (categoriaIndex === -1) return;

        const nuevasCategorias = [...categorias];
        nuevasCategorias[categoriaIndex] = {
            ...nuevasCategorias[categoriaIndex],
            items: nuevasCategorias[categoriaIndex].items.map(i => 
                i.id === itemId ? { ...i, rotar: !i.rotar } : i
            )
        };
        setCategorias(nuevasCategorias);
    };

    const actualizarCantidad = (itemId: number, delta: number) => {
        if (!categoriaActiva) return;
        
        const categoriaIndex = categorias.findIndex(c => c.id === categoriaActiva);
        if (categoriaIndex === -1) return;

        const nuevasCategorias = [...categorias];
        nuevasCategorias[categoriaIndex] = {
            ...nuevasCategorias[categoriaIndex],
            items: nuevasCategorias[categoriaIndex].items.map(i => {
                if (i.id === itemId) {
                    const nuevaCantidad = Math.max(1, (i.cantidad || 1) + delta);
                    return { ...i, cantidad: nuevaCantidad };
                }
                return i;
            })
        };
        setCategorias(nuevasCategorias);
    };

    const itemsFiltrados = categoriaActiva && subcategoriaActiva
        ? categorias.find(c => c.id === categoriaActiva)?.items.filter(i => i.subcategoria === subcategoriaActiva) || []
        : categoriaActiva
        ? categorias.find(c => c.id === categoriaActiva)?.items || []
        : [];

    const categoriaActual = categoriaActiva ? categorias.find(c => c.id === categoriaActiva) : null;

    return (
        <div style={{ paddingBottom: '5rem' }}>
            {/* MAPA MENTAL - ÁRBOL */}
            <GlassCard style={{ background: 'white', padding: '2rem', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>
                    🌳 Mapa de Bienestar
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* RAÍZ */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                padding: '1rem 2rem',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                            }}
                            onClick={() => { setCategoriaActiva(null); setSubcategoriaActiva(null); }}
                        >
                            <Heart size={24} />
                            <span style={{ fontSize: '1.1rem', fontWeight: 900 }}>BIENESTAR</span>
                        </motion.div>
                    </div>

                    {/* RAMAS PRINCIPALES */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', position: 'relative' }}>
                        {/* Líneas conectoras */}
                        <svg style={{ position: 'absolute', top: '-20px', left: 0, right: 0, height: '40px', width: '100%' }} viewBox="0 0 400 40" preserveAspectRatio="none">
                            <path d="M 200 0 L 200 20 L 100 20 L 100 40" stroke="#ddd" strokeWidth="2" fill="none" />
                            <path d="M 200 20 L 300 20 L 300 40" stroke="#ddd" strokeWidth="2" fill="none" />
                            <path d="M 200 0 L 200 40" stroke="#ddd" strokeWidth="2" fill="none" />
                        </svg>

                        {categorias.map(cat => {
                            const Icono = cat.icon;
                            const isActive = categoriaActiva === cat.id;
                            return (
                                <motion.div
                                    key={cat.id}
                                    whileHover={{ scale: 1.05 }}
                                    style={{
                                        background: isActive ? cat.color : '#f8fafc',
                                        color: isActive ? 'white' : cat.color,
                                        padding: '0.8rem 1.5rem',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        border: `2px solid ${cat.color}`,
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        whiteSpace: 'nowrap'
                                    }}
                                    onClick={() => { setCategoriaActiva(cat.id); setSubcategoriaActiva(null); }}
                                >
                                    <Icono size={18} />
                                    <span>{cat.label}</span>
                                    <span style={{ 
                                        background: 'rgba(255,255,255,0.3)', 
                                        padding: '2px 8px', 
                                        borderRadius: '10px',
                                        fontSize: '0.7rem'
                                    }}>
                                        {cat.items.length}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* SUBCATEGORÍAS */}
                    {categoriaActual && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                marginTop: '0.5rem',
                                flexWrap: 'wrap'
                            }}
                        >
                            {categoriaActual.subcategorias.map(sub => {
                                const count = categoriaActual.items.filter(i => i.subcategoria === sub).length;
                                const isActive = subcategoriaActiva === sub;
                                return (
                                    <motion.button
                                        key={sub}
                                        whileHover={{ scale: 1.05 }}
                                        style={{
                                            background: isActive ? categoriaActual.color : 'white',
                                            color: isActive ? 'white' : '#666',
                                            border: `2px solid ${categoriaActual.color}`,
                                            padding: '0.5rem 1rem',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                        onClick={() => setSubcategoriaActiva(isActive ? null : sub)}
                                    >
                                        <span>{sub}</span>
                                        <span style={{ 
                                            background: isActive ? 'rgba(255,255,255,0.3)' : `${categoriaActual.color}15`,
                                            color: isActive ? 'white' : categoriaActual.color,
                                            padding: '2px 6px', 
                                            borderRadius: '10px',
                                            fontSize: '0.65rem'
                                        }}>
                                            {count}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </motion.div>
                    )}
                </div>
            </GlassCard>

            {/* RESUMEN FINANCIERO */}
            {categoriaActiva === 'alimentacion' && (
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
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase' }}>Presupuesto Alimentos</span>
                        </div>
                        <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900 }}>${totalGasto.toLocaleString()}</h2>
                    </GlassCard>
                </div>
            )}

            {/* FORMULARIO AGREGAR */}
            {categoriaActiva && (
                <GlassCard style={{ background: 'white', padding: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                            onClick={() => setMostrarFormulario(!mostrarFormulario)}
                            style={{
                                background: categoriaActual?.color || '#667eea',
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
                            <Plus size={16} /> {mostrarFormulario ? 'CANCELAR' : 'AGREGAR'}
                        </button>

                        {mostrarFormulario && (
                            <>
                                <input
                                    type="text"
                                    placeholder="Nombre..."
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
                                
                                {categoriaActiva === 'alimentacion' && (
                                    <input
                                        type="number"
                                        placeholder="Precio $"
                                        value={nuevoPrecio}
                                        onChange={(e) => setNuevoPrecio(e.target.value)}
                                        style={{
                                            width: '100px',
                                            padding: '10px',
                                            borderRadius: '10px',
                                            border: '1px solid #DDD',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                        }}
                                    />
                                )}

                                <select
                                    value={nuevaSubcategoria}
                                    onChange={(e) => setNuevaSubcategoria(e.target.value)}
                                    style={{
                                        padding: '10px',
                                        borderRadius: '10px',
                                        border: '1px solid #DDD',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        background: 'white',
                                    }}
                                >
                                    <option value="">Subcategoría...</option>
                                    {categoriaActual?.subcategorias.map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>

                                <button
                                    onClick={agregarItem}
                                    style={{
                                        background: categoriaActual?.color || '#667eea',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px 20px',
                                        fontSize: '0.75rem',
                                        fontWeight: 900,
                                        cursor: 'pointer',
                                    }}
                                >
                                    GUARDAR
                                </button>
                            </>
                        )}
                    </div>
                </GlassCard>
            )}

            {/* ITEMS */}
            {categoriaActiva ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {itemsFiltrados.length === 0 ? (
                        <GlassCard style={{ padding: '3rem', textAlign: 'center', background: '#F8FAFC' }}>
                            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#888' }}>
                                No hay items en esta categoría
                            </p>
                        </GlassCard>
                    ) : (
                        itemsFiltrados.map(item => {
                            const esAlimento = categoriaActiva === 'alimentacion' && item.subcategoria === 'Alimentos';
                            const esReceta = categoriaActiva === 'alimentacion' && item.subcategoria === 'Recetas';
                            
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
                                            borderLeft: `4px solid ${categoriaActual?.color || '#667eea'}`,
                                        }}
                                    >
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: `${categoriaActual?.color}15`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            {categoriaActiva === 'cuerpo' && <Dumbbell size={16} color={categoriaActual?.color} />}
                                            {categoriaActiva === 'mente' && <BookOpen size={16} color={categoriaActual?.color} />}
                                            {categoriaActiva === 'alimentacion' && esAlimento && <ShoppingCart size={16} color={categoriaActual?.color} />}
                                            {categoriaActiva === 'alimentacion' && esReceta && <ChefHat size={16} color={categoriaActual?.color} />}
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    fontSize: '0.55rem',
                                                    fontWeight: 900,
                                                    background: `${categoriaActual?.color}15`,
                                                    color: categoriaActual?.color,
                                                    padding: '2px 6px',
                                                    borderRadius: '6px',
                                                }}>
                                                    {item.subcategoria}
                                                </span>
                                                {item.precio && (
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#888' }}>
                                                        ${item.precio} x {item.cantidad} = ${(item.precio * (item.cantidad || 1)).toLocaleString()}
                                                    </span>
                                                )}
                                                {item.duracion && (
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#666' }}>
                                                        ⏱️ {item.duracion} min
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

                                        {esReceta && item.rotar && (
                                            <button
                                                onClick={() => toggleRotar(item.id)}
                                                style={{
                                                    background: '#FDE68A',
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
                                                <RotateCcw size={14} color='#D97706' />
                                            </button>
                                        )}

                                        {esAlimento && item.precio && (
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
            ) : (
                <GlassCard style={{ padding: '2rem', textAlign: 'center', background: '#F8FAFC' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#888' }}>
                        👆 Selecciona una categoría del mapa para ver sus items
                    </p>
                </GlassCard>
            )}
        </div>
    );
};