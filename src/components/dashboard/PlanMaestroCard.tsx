import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { Project } from '../../hooks/useAlDiaState';
import { C, MONO, campo } from '../../theme';

export interface PlanPaso {
    id: string;
    titulo: string;
    detalle?: string;
    proyectoNombre?: string;
    projectId?: number;
    montoEstimado?: number;
    completado: boolean;
}

export interface SupermetaNivel {
    id: string;
    nivelNum: number;
    titulo: string;
    horizonte: string;
    metaTexto: string;
    montoObjetivo?: number;
    montoActual?: number;
    unidad?: string;
    color: string;
    icono: string;
    planes: PlanPaso[];
}

const STORAGE_KEY = 'aldia_supermetas_niveles';

const NIVELES_INICIALES: SupermetaNivel[] = [
    {
        id: 'nivel-1',
        nivelNum: 1,
        titulo: 'OXÍGENO Y RESPIRO',
        horizonte: 'Próximos 15-30 días',
        metaTexto: 'Matar la culpa, salir de deudas y tener S/ 1,500 a S/ 2,500 soles en el bolsillo.',
        montoObjetivo: 2500,
        montoActual: 0,
        unidad: 'S/',
        color: '#EF4444',
        icono: 'emergency',
        planes: [
            {
                id: 'p-1-1',
                titulo: 'Paso 1.1: Terminar y entregar las fotos pendientes',
                detalle: 'Cerrar ese bucle mental para liberar energía.',
                proyectoNombre: 'JuanMa Producer',
                montoEstimado: 0,
                completado: false,
            },
            {
                id: 'p-1-2',
                titulo: 'Paso 1.2: Publicar el flyer del tucán en Yo Soy de la Selva y grupos',
                detalle: 'Cazar 1 o 2 auspiciadores locales (S/ 150 - S/ 300 c/u).',
                proyectoNombre: 'Yo Soy de la Selva',
                montoEstimado: 300,
                completado: false,
            },
            {
                id: 'p-1-3',
                titulo: 'Paso 1.3: Vender 1 campaña de Facebook Ads a WhatsApp por S/ 500',
                detalle: 'Pagas S/ 200 a tu amigo por video/diseño, te quedan S/ 300 limpios.',
                proyectoNombre: 'JuanMa Producer',
                montoEstimado: 500,
                completado: false,
            },
        ],
    },
    {
        id: 'nivel-2',
        nivelNum: 2,
        titulo: 'FLUJO ASEGURADO Y FORMALIDAD',
        horizonte: 'Meses 2 al 6',
        metaTexto: 'Ingresos recurrentes mes a mes sin corretear clientes todos los días.',
        montoObjetivo: 2000,
        montoActual: 0,
        unidad: 'S/ mes',
        color: '#F59E0B',
        icono: 'cached',
        planes: [
            {
                id: 'p-2-1',
                titulo: 'Paso 2.1: Sacar el RUC 10 MYPE Tributario desde la app SUNAT',
                detalle: 'Aprovechar beneficio del 0% IGV por Ley de Amazonía.',
                proyectoNombre: 'Boga',
                completado: false,
            },
            {
                id: 'p-2-2',
                titulo: 'Paso 2.2: Mandar a hacer tu polo granate corporativo de Boga',
                detalle: 'Presencia de marca y formalidad ante comercios.',
                proyectoNombre: 'Boga',
                completado: false,
            },
            {
                id: 'p-2-3',
                titulo: 'Paso 2.3: Escalar BogaHub (Salir 2 tardes x semana martes y jueves)',
                detalle: 'Cerrar tiendas locales a S/ 80 - S/ 100/mes. Meta: 15 a 20 clientes fijos (S/ 1,500 - S/ 2,000 mensuales asegurados).',
                proyectoNombre: 'BogaHub',
                montoEstimado: 2000,
                completado: false,
            },
            {
                id: 'p-2-4',
                titulo: 'Paso 2.4: Empezar a redactar tu Tesis de Comunicación',
                detalle: 'Usar datos reales de BogaHub; preparar terreno para titularte y postular a fondos Produce (S/ 50,000).',
                proyectoNombre: 'Personal / Tesis',
                completado: false,
            },
        ],
    },
    {
        id: 'nivel-3',
        nivelNum: 3,
        titulo: 'EXPANSIÓN Y ACTIVOS DIGITALES',
        horizonte: 'Meses 6 al 12',
        metaTexto: 'Ganar en dólares y multiplicar el alcance sin tu presencia física.',
        montoObjetivo: 1500,
        montoActual: 0,
        unidad: '$ / S/',
        color: '#10B981',
        icono: 'trending_up',
        planes: [
            {
                id: 'p-3-1',
                titulo: 'Paso 3.1: Alimentar con agente automático Ojo Aquí (personaje ojos amarillos)',
                detalle: 'Compartir en grupos de latinos en USA para inflar el CPM y cobrar en dólares.',
                proyectoNombre: 'Ojo Aquí',
                completado: false,
            },
            {
                id: 'p-3-2',
                titulo: 'Paso 3.2: Explotar formato del Capibara en Yo Soy de la Selva',
                detalle: 'Boquerón, Contamana, Tierra Blanca para mantener tráfico arriba de 2 millones.',
                proyectoNombre: 'Yo Soy de la Selva',
                completado: false,
            },
            {
                id: 'p-3-3',
                titulo: 'Paso 3.3: Probar el corretaje de terrenos en BogaHub',
                detalle: 'Subir lotes de terceros a comisión del 3%-5%. Con una venta ganas S/ 800 a S/ 1,500 de golpe.',
                proyectoNombre: 'BogaHub',
                montoEstimado: 1200,
                completado: false,
            },
        ],
    },
    {
        id: 'nivel-4',
        nivelNum: 4,
        titulo: 'EL SALTO GRANDE',
        horizonte: 'Año 2 en adelante',
        metaTexto: 'Geopolítica, viajes, alianzas y poder real.',
        color: '#3B82F6',
        icono: 'flight_takeoff',
        planes: [
            {
                id: 'p-4-1',
                titulo: 'Paso 4.1: Título universitario en mano + fondos no reembolsables del Estado',
                detalle: 'Produce / ProInnóvate ganados.',
                proyectoNombre: 'Personal / Tesis',
                completado: false,
            },
            {
                id: 'p-4-2',
                titulo: 'Paso 4.2: Expandir BogaHub y red de medios a Tarapoto, Yurimaguas e Iquitos',
                detalle: 'Consolidación regional.',
                proyectoNombre: 'BogaHub',
                completado: false,
            },
            {
                id: 'p-4-3',
                titulo: 'Paso 4.3: El viaje a Brasil',
                detalle: 'Conectar con ecosistema tech de Florianópolis o vibra del Nordeste.',
                proyectoNombre: 'Visión de Vida',
                completado: false,
            },
            {
                id: 'p-4-4',
                titulo: 'Paso 4.4: Crear la red de medios / opinión pública de frontera',
                detalle: 'Educar a la masa en economía y desarrollo fronterizo amazónico.',
                proyectoNombre: 'Yo Soy de la Selva / Medios',
                completado: false,
            },
        ],
    },
];

const getNivelesGuardados = (): SupermetaNivel[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch {}
    return NIVELES_INICIALES;
};

const guardarNiveles = (list: SupermetaNivel[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
};

interface PlanMaestroCardProps {
    projects?: Project[];
    movil: boolean;
}

export const PlanMaestroCard = ({
    projects = [],
    movil,
}: PlanMaestroCardProps) => {
    const [niveles, setNiveles] = useState<SupermetaNivel[]>(() => getNivelesGuardados());
    const [nivelActivoId, setNivelActivoId] = useState<string>(() => {
        const list = getNivelesGuardados();
        return list[0]?.id || 'nivel-1';
    });

    const [colapsado, setColapsado] = useState<boolean>(() => {
        try {
            return localStorage.getItem('aldia_plan_maestro_colapsado') === 'true';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('aldia_plan_maestro_colapsado', String(colapsado));
        } catch {}
    }, [colapsado]);

    // Modales
    const [modalCrearNivel, setModalCrearNivel] = useState(false);
    const [modalAgregarPaso, setModalAgregarPaso] = useState(false);
    const [editandoNivel, setEditandoNivel] = useState<SupermetaNivel | null>(null);

    // Formulario Nivel
    const [formTitulo, setFormTitulo] = useState('');
    const [formHorizonte, setFormHorizonte] = useState('');
    const [formMetaTexto, setFormMetaTexto] = useState('');
    const [formMontoObj, setFormMontoObj] = useState<number | ''>('');
    const [formUnidad, setFormUnidad] = useState('S/');
    const [formColor, setFormColor] = useState('#EF4444');

    // Formulario Paso
    const [pasoTitulo, setPasoTitulo] = useState('');
    const [pasoDetalle, setPasoDetalle] = useState('');
    const [pasoProyecto, setPasoProyecto] = useState('');
    const [pasoMonto, setPasoMonto] = useState<number | ''>('');

    useEffect(() => {
        guardarNiveles(niveles);
    }, [niveles]);

    const nivelActivo = useMemo(() => {
        return niveles.find(n => n.id === nivelActivoId) || niveles[0] || null;
    }, [niveles, nivelActivoId]);

    // Estadísticas del nivel activo
    const stats = useMemo(() => {
        if (!nivelActivo) return { totalPasos: 0, hechosPasos: 0, pctPasos: 0, montoConseguido: 0, pctDinero: 0 };
        const totalPasos = nivelActivo.planes.length;
        const hechosPasos = nivelActivo.planes.filter(p => p.completado).length;
        const pctPasos = totalPasos > 0 ? Math.round((hechosPasos / totalPasos) * 100) : 0;

        const montoConseguido = nivelActivo.planes
            .filter(p => p.completado && p.montoEstimado)
            .reduce((sum, p) => sum + (p.montoEstimado || 0), 0);

        const pctDinero = nivelActivo.montoObjetivo
            ? Math.min(100, Math.round((montoConseguido / nivelActivo.montoObjetivo) * 100))
            : pctPasos;

        return { totalPasos, hechosPasos, pctPasos, montoConseguido, pctDinero };
    }, [nivelActivo]);

    // Agrupar planes del nivel activo por proyecto
    const gruposPorProyecto = useMemo(() => {
        if (!nivelActivo) return [];
        const map = new Map<string, PlanPaso[]>();
        nivelActivo.planes.forEach(p => {
            const nom = p.proyectoNombre?.trim() || 'General / Multinegocio';
            if (!map.has(nom)) map.set(nom, []);
            map.get(nom)!.push(p);
        });
        return Array.from(map.entries()).map(([proyectoNombre, planes]) => ({
            proyectoNombre,
            planes,
            total: planes.length,
            completados: planes.filter(x => x.completado).length,
            montoTotal: planes.reduce((acc, x) => acc + (x.montoEstimado || 0), 0),
        }));
    }, [nivelActivo]);

    const togglePaso = (pasoId: string) => {
        if (!nivelActivo) return;
        const updated = niveles.map(n => {
            if (n.id !== nivelActivo.id) return n;
            return {
                ...n,
                planes: n.planes.map(p => {
                    if (p.id !== pasoId) return p;
                    const next = !p.completado;
                    if (next) {
                        try {
                            confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
                        } catch {}
                    }
                    return { ...p, completado: next };
                }),
            };
        });
        setNiveles(updated);
    };

    const eliminarPaso = (pasoId: string) => {
        if (!nivelActivo) return;
        const updated = niveles.map(n => {
            if (n.id !== nivelActivo.id) return n;
            return {
                ...n,
                planes: n.planes.filter(p => p.id !== pasoId),
            };
        });
        setNiveles(updated);
    };

    const abrirModalNuevoPaso = () => {
        setPasoTitulo('');
        setPasoDetalle('');
        setPasoProyecto(projects[0]?.name || 'JuanMa Producer');
        setPasoMonto('');
        setModalAgregarPaso(true);
    };

    const guardarNuevoPaso = () => {
        if (!nivelActivo || !pasoTitulo.trim()) return;
        const nuevo: PlanPaso = {
            id: `p-${Date.now()}`,
            titulo: pasoTitulo.trim(),
            detalle: pasoDetalle.trim() || undefined,
            proyectoNombre: pasoProyecto.trim() || undefined,
            montoEstimado: pasoMonto !== '' ? Number(pasoMonto) : undefined,
            completado: false,
        };

        const updated = niveles.map(n => {
            if (n.id !== nivelActivo.id) return n;
            return {
                ...n,
                planes: [...n.planes, nuevo],
            };
        });

        setNiveles(updated);
        setModalAgregarPaso(false);
    };

    const abrirCrearNivel = () => {
        setFormTitulo('');
        setFormHorizonte('');
        setFormMetaTexto('');
        setFormMontoObj('');
        setFormUnidad('S/');
        setFormColor('#0FA97A');
        setEditandoNivel(null);
        setModalCrearNivel(true);
    };

    const guardarNivel = () => {
        if (!formTitulo.trim()) return;
        if (editandoNivel) {
            const updated = niveles.map(n => n.id === editandoNivel.id ? {
                ...n,
                titulo: formTitulo.trim().toUpperCase(),
                horizonte: formHorizonte.trim(),
                metaTexto: formMetaTexto.trim(),
                montoObjetivo: formMontoObj !== '' ? Number(formMontoObj) : undefined,
                unidad: formUnidad.trim() || 'S/',
                color: formColor,
            } : n);
            setNiveles(updated);
        } else {
            const nuevo: SupermetaNivel = {
                id: `nivel-${Date.now()}`,
                nivelNum: niveles.length + 1,
                titulo: formTitulo.trim().toUpperCase(),
                horizonte: formHorizonte.trim(),
                metaTexto: formMetaTexto.trim(),
                montoObjetivo: formMontoObj !== '' ? Number(formMontoObj) : undefined,
                unidad: formUnidad.trim() || 'S/',
                color: formColor,
                icono: 'flag',
                planes: [],
            };
            setNiveles([...niveles, nuevo]);
            setNivelActivoId(nuevo.id);
        }
        setModalCrearNivel(false);
    };

    if (!nivelActivo) return null;

    const themeColor = nivelActivo.color || '#EF4444';

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(247, 250, 248, 0.96) 100%)',
            border: `1.5px solid ${themeColor}35`,
            borderRadius: '18px',
            padding: movil ? '1rem' : '1.25rem 1.4rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
        }}>
            {/* Cabecera superior con selector de niveles */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', maxWidth: '100%', paddingBottom: '2px' }}>
                    {niveles.map(n => {
                        const isSelected = n.id === nivelActivo.id;
                        return (
                            <button
                                key={n.id}
                                onClick={() => setNivelActivoId(n.id)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    background: isSelected ? n.color : 'rgba(0,0,0,0.04)',
                                    color: isSelected ? '#FFFFFF' : C.onSurfaceVariant,
                                    border: isSelected ? 'none' : `1px solid ${C.outlineVariant}`,
                                    borderRadius: '999px', padding: '5px 12px',
                                    fontSize: '0.74rem', fontWeight: 800,
                                    cursor: 'pointer', fontFamily: 'inherit',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap',
                                    boxShadow: isSelected ? `0 2px 8px ${n.color}40` : 'none',
                                }}
                            >
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isSelected ? '#FFFFFF' : n.color }} />
                                <span>PASO {n.nivelNum}: {n.titulo}</span>
                            </button>
                        );
                    })}

                    <button
                        onClick={abrirCrearNivel}
                        title="Agregar otro nivel al Plan Maestro"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                            background: 'transparent', color: C.outline,
                            border: `1px dashed ${C.outlineVariant}`,
                            borderRadius: '999px', padding: '5px 10px',
                            fontSize: '0.7rem', fontWeight: 800,
                            cursor: 'pointer', fontFamily: 'inherit',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                        Paso
                    </button>
                </div>

                <button
                    onClick={() => setColapsado(v => !v)}
                    title={colapsado ? 'Expandir' : 'Colapsar'}
                    style={{
                        background: 'transparent', border: 'none', borderRadius: '8px',
                        padding: '4px', color: C.outline, cursor: 'pointer', display: 'flex',
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {colapsado ? 'expand_more' : 'expand_less'}
                    </span>
                </button>
            </div>

            {/* Contenido desplegable del Plan Maestro */}
            {!colapsado && (
                <>
                    {/* Tarjeta del Nivel Activo */}
                    <div style={{
                        background: C.surfaceLowest,
                        borderRadius: '14px',
                        padding: '12px 14px',
                        border: `1px solid ${C.outlineVariant}`,
                        borderLeft: `4px solid ${themeColor}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.66rem', fontWeight: 900, color: themeColor, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                        PASO {nivelActivo.nivelNum} · {nivelActivo.horizonte}
                                    </span>
                                    <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '1px 8px', borderRadius: '999px', background: `${themeColor}15`, color: themeColor }}>
                                        {stats.hechosPasos}/{stats.totalPasos} planes listos ({stats.pctPasos}%)
                                    </span>
                                </div>

                                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: C.onSurface, marginTop: '2px' }}>
                                    {nivelActivo.metaTexto}
                                </div>
                            </div>

                            {nivelActivo.montoObjetivo && (
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.64rem', fontWeight: 700, color: C.outline, textTransform: 'uppercase' }}>
                                        Meta de Dinero
                                    </div>
                                    <div style={{ fontSize: '1rem', fontWeight: 900, color: themeColor, fontFamily: MONO }}>
                                        {nivelActivo.unidad} {nivelActivo.montoObjetivo.toLocaleString()}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Barra de progreso de planes */}
                        <div style={{ width: '100%', height: '6px', background: C.surfaceContainer, borderRadius: '999px', overflow: 'hidden', marginTop: '2px' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.pctPasos}%` }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                                style={{ height: '100%', background: themeColor, borderRadius: '999px' }}
                            />
                        </div>
                    </div>

                    {/* Lista de Planes / Pasos para este nivel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: C.outline, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Vías de Acción y Planes Multinegocio ({nivelActivo.planes.length})
                        </span>

                        <button
                            onClick={abrirModalNuevoPaso}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '3px',
                                background: `${themeColor}12`, color: themeColor, border: 'none',
                                borderRadius: '999px', padding: '4px 10px',
                                fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                            + Agregar plan/paso
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {gruposPorProyecto.map(grupo => (
                            <div
                                key={grupo.proyectoNombre}
                                style={{
                                    display: 'flex', flexDirection: 'column', gap: '6px',
                                    background: 'rgba(0,0,0,0.015)',
                                    padding: '8px 10px',
                                    borderRadius: '14px',
                                    border: `1px solid ${C.outlineVariant}`,
                                }}
                            >
                                {/* Cabecera del Proyecto dentro del Nivel */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: themeColor }}>
                                            business_center
                                        </span>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: C.onSurface }}>
                                            {grupo.proyectoNombre}
                                        </span>
                                        <span style={{
                                            fontSize: '0.64rem', fontWeight: 700, padding: '1px 7px', borderRadius: '999px',
                                            background: `${themeColor}15`, color: themeColor,
                                        }}>
                                            {grupo.completados}/{grupo.total}
                                        </span>
                                    </div>

                                    {grupo.montoTotal > 0 && (
                                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0FA97A', fontFamily: MONO }}>
                                            +{nivelActivo.unidad || 'S/'} {grupo.montoTotal.toLocaleString()}
                                        </span>
                                    )}
                                </div>

                                {/* Lista de planes de este proyecto */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    {grupo.planes.map(p => (
                                        <div
                                            key={p.id}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                padding: '8px 12px', borderRadius: '10px',
                                                background: p.completado ? 'rgba(16, 185, 129, 0.05)' : C.surfaceLowest,
                                                border: `1px solid ${p.completado ? 'rgba(16, 185, 129, 0.25)' : C.outlineVariant}`,
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            {/* Checkbox interactivo */}
                                            <button
                                                onClick={() => togglePaso(p.id)}
                                                title={p.completado ? 'Marcar pendiente' : 'Marcar completado'}
                                                style={{
                                                    width: '22px', height: '22px', borderRadius: '7px',
                                                    border: `1.5px solid ${p.completado ? '#10B981' : C.outline}`,
                                                    background: p.completado ? '#10B981' : 'transparent',
                                                    color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', flexShrink: 0, padding: 0,
                                                    transition: 'all 0.15s ease',
                                                }}
                                            >
                                                {p.completado && (
                                                    <span className="material-symbols-outlined" style={{ fontSize: '15px', fontVariationSettings: "'FILL' 1" }}>
                                                        check
                                                    </span>
                                                )}
                                            </button>

                                            {/* Contenido del paso */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        fontSize: '0.84rem', fontWeight: 700,
                                                        color: p.completado ? C.outline : C.onSurface,
                                                        textDecoration: p.completado ? 'line-through' : 'none',
                                                        lineHeight: 1.3,
                                                    }}>
                                                        {p.titulo}
                                                    </span>

                                                    {p.montoEstimado ? (
                                                        <span style={{
                                                            fontSize: '0.66rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px',
                                                            background: 'rgba(15, 169, 122, 0.12)', color: '#0FA97A', fontFamily: MONO,
                                                        }}>
                                                            +S/ {p.montoEstimado}
                                                        </span>
                                                    ) : null}
                                                </div>

                                                {p.detalle && (
                                                    <div style={{ fontSize: '0.73rem', color: C.outline, marginTop: '2px' }}>
                                                        {p.detalle}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Botón eliminar paso */}
                                            <button
                                                onClick={() => eliminarPaso(p.id)}
                                                title="Eliminar este paso"
                                                style={{
                                                    background: 'transparent', border: 'none', padding: '4px',
                                                    cursor: 'pointer', color: C.outline, display: 'flex', flexShrink: 0,
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = C.outline; }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                </>
            )}

            {/* Modal Agregar Paso */}
            {modalAgregarPaso && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
                }}>
                    <div
                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
                        onClick={() => setModalAgregarPaso(false)}
                    />
                    <div style={{
                        position: 'relative', width: '100%', maxWidth: '420px',
                        background: '#FFFFFF', borderRadius: '20px', padding: '1.5rem',
                        boxShadow: '0 20px 45px rgba(0,0,0,0.2)', border: `1px solid ${C.outlineVariant}`,
                        zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '12px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: C.onSurface }}>
                                Agregar Plan / Paso a Nivel {nivelActivo.nivelNum}
                            </span>
                            <button onClick={() => setModalAgregarPaso(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                            </button>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: C.outline, display: 'block', marginBottom: '4px' }}>
                                TÍTULO DEL PASO O PLAN
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Vender 1 campaña de Ads a S/ 500"
                                value={pasoTitulo}
                                onChange={e => setPasoTitulo(e.target.value)}
                                style={{ ...campo(movil), width: '100%', boxSizing: 'border-box' }}
                                autoFocus
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: C.outline, display: 'block', marginBottom: '4px' }}>
                                PROYECTO O NEGOCIO RESPONSABLE
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: JuanMa Producer, Yo Soy de la Selva, BogaHub, etc."
                                value={pasoProyecto}
                                onChange={e => setPasoProyecto(e.target.value)}
                                style={{ ...campo(movil), width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: C.outline, display: 'block', marginBottom: '4px' }}>
                                    APORTE ESTIMADO (S/ o $)
                                </label>
                                <input
                                    type="number"
                                    placeholder="Ej: 300"
                                    value={pasoMonto}
                                    onChange={e => setPasoMonto(e.target.value === '' ? '' : Number(e.target.value))}
                                    style={{ ...campo(movil), width: '100%', boxSizing: 'border-box', fontFamily: MONO }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: C.outline, display: 'block', marginBottom: '4px' }}>
                                DETALLE O NOTA (OPCIONAL)
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Te quedan S/ 300 limpios tras pagar al editor"
                                value={pasoDetalle}
                                onChange={e => setPasoDetalle(e.target.value)}
                                style={{ ...campo(movil), width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                            <button
                                type="button"
                                onClick={() => setModalAgregarPaso(false)}
                                style={{ flex: 1, padding: '10px', borderRadius: '12px', background: C.surfaceContainer, border: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={guardarNuevoPaso}
                                style={{ flex: 1, padding: '10px', borderRadius: '12px', background: themeColor, color: '#FFFFFF', border: 'none', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                Agregar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crear Nuevo Nivel */}
            {modalCrearNivel && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
                }}>
                    <div
                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
                        onClick={() => setModalCrearNivel(false)}
                    />
                    <div style={{
                        position: 'relative', width: '100%', maxWidth: '420px',
                        background: '#FFFFFF', borderRadius: '20px', padding: '1.5rem',
                        boxShadow: '0 20px 45px rgba(0,0,0,0.2)', border: `1px solid ${C.outlineVariant}`,
                        zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '12px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: C.onSurface }}>
                                Crear Nuevo Nivel de Supermeta
                            </span>
                            <button onClick={() => setModalCrearNivel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                            </button>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: C.outline, display: 'block', marginBottom: '4px' }}>
                                NOMBRE DEL NIVEL
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: CONSOLIDACIÓN Y EQUIPO"
                                value={formTitulo}
                                onChange={e => setFormTitulo(e.target.value)}
                                style={{ ...campo(movil), width: '100%', boxSizing: 'border-box' }}
                                autoFocus
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: C.outline, display: 'block', marginBottom: '4px' }}>
                                HORIZONTE DE TIEMPO
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Meses 3 al 6, o Año 2"
                                value={formHorizonte}
                                onChange={e => setFormHorizonte(e.target.value)}
                                style={{ ...campo(movil), width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: C.outline, display: 'block', marginBottom: '4px' }}>
                                META O PROPÓSITO DEL NIVEL
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Generar S/ 5,000 mensuales estables sin depender de 1 solo cliente"
                                value={formMetaTexto}
                                onChange={e => setFormMetaTexto(e.target.value)}
                                style={{ ...campo(movil), width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: C.outline, display: 'block', marginBottom: '4px' }}>
                                    COLOR DISTINTIVO
                                </label>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
                                    {['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'].map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setFormColor(c)}
                                            style={{
                                                width: '24px', height: '24px', borderRadius: '50%', background: c,
                                                border: formColor === c ? '2.5px solid #000' : 'none', cursor: 'pointer',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                            <button
                                type="button"
                                onClick={() => setModalCrearNivel(false)}
                                style={{ flex: 1, padding: '10px', borderRadius: '12px', background: C.surfaceContainer, border: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={guardarNivel}
                                style={{ flex: 1, padding: '10px', borderRadius: '12px', background: formColor, color: '#FFFFFF', border: 'none', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                Guardar Nivel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
