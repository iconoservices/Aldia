import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, X, ChevronDown, ChevronUp,
  DollarSign, Edit3, Layers, BarChart2
} from 'lucide-react';

export interface RitaMilestone {
  id: number;
  icon: string;         // emoji o clave de icono
  title: string;        // Nombre del hito
  description: string;  // Descripción / plan
  cost: number;         // Precio estimado (MXN o la moneda del usuario)
  status: 'pendiente' | 'en-progreso' | 'completado';
  color: string;
  category: string;     // "negocio", "inversión", "personal", "software"
  subitems: { id: number; text: string; completed: boolean }[];
  targetDate?: string;  // YYYY-MM-DD
  order: number;
  generatesIncome?: boolean; // true si genera dinero, false si no
  line?: string;             // línea de enfoque/trabajo
}

interface RitaDashboardProps {
  entries: RitaMilestone[];
  addEntry: (title: string, description: string, photo: string | null, color: string) => void;
  removeEntry: (id: number) => void;
  updateEntry: (id: number, updates: Partial<RitaMilestone>) => void;
  addSubitem: (entryId: number, text: string) => void;
  toggleSubitem: (entryId: number, subitemId: number) => void;
  removeSubitem: (entryId: number, subitemId: number) => void;
  addHabit?: (name: string, schedule: number[]) => void;
  habits?: any[];
}

const MILESTONE_ICONS = ['📸', '🌴', '🛒', '🌿', '💻', '🏠', '👥', '💰', '🚀', '🎯', '⚡', '🌱', '🏗️', '🎨', '📊'];
const MILESTONE_COLORS = [
  '#FF6B6B', '#FF8E53', '#FFD93D', '#6BCB77', '#4D96FF',
  '#C77DFF', '#06D6A0', '#F72585', '#4CC9F0', '#F4A261'
];
const CATEGORIES = ['negocio', 'inversión', 'software', 'personal', 'propiedad'];
const SUGGESTED_LINES = ['Selva App', 'ICONO Agency', 'Boga Marketplace', 'Inversión Terreno', 'Medios Digitales', 'Productos', 'Personal', 'General'];

const CAT_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  negocio:    { color: '#FF6B6B', bg: '#FFF0F0', label: '💼 Negocio' },
  inversión:  { color: '#6BCB77', bg: '#F0FFF4', label: '📈 Inversión' },
  software:   { color: '#4D96FF', bg: '#EFF6FF', label: '💻 Software' },
  personal:   { color: '#C77DFF', bg: '#F9F0FF', label: '✨ Personal' },
  propiedad:  { color: '#F4A261', bg: '#FFF7EF', label: '🏠 Propiedad' },
};

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  pendiente:     { color: '#94A3B8', bg: '#F1F5F9', label: 'Pendiente' },
  'en-progreso': { color: '#FF8E53', bg: '#FFF3E8', label: 'En progreso' },
  completado:    { color: '#6BCB77', bg: '#F0FFF4', label: 'Completado ✓' },
  'en-espera':   { color: '#CBD5E1', bg: '#F8FAFC', label: '⏸ En espera' },
};

const formatMXN = (n: number) =>
  n > 0 ? `$${n.toLocaleString('es-MX')}` : '—';

// Hitos iniciales del roadmap personal
const DEFAULT_MILESTONES: RitaMilestone[] = [
  {
    id: 1, icon: '📸', order: 0,
    title: 'ICONO + Boga — Selva App',
    description: 'Lanzar las sesiones de fotos (ICONO Agency) y el marketplace de eventos/productos (Boga). Ambos forman parte de Selva App. ICONO se enfoca en sesiones fotográficas profesionales; Boga en eventos, productos y servicios locales.',
    cost: 0, status: 'en-progreso',
    color: '#FF6B6B', category: 'negocio',
    subitems: [
      { id: 11, text: 'Lanzar sesiones de fotos ICONO', completed: false },
      { id: 12, text: 'Activar catálogo de productos en Boga', completed: false },
      { id: 13, text: 'Eventos en Boga (servicios, etc.)', completed: false },
    ],
    targetDate: '',
    generatesIncome: true,
    line: 'Selva App'
  },
  {
    id: 2, icon: '🌿', order: 1,
    title: 'Sembrar Aguaje en mi terreno',
    description: 'Usar el excedente generado por ICONO/Boga para sembrar aguaje en el terreno propio. Inversión a largo plazo que genera un ingreso pasivo natural.',
    cost: 0, status: 'pendiente',
    color: '#6BCB77', category: 'inversión',
    subitems: [
      { id: 21, text: 'Calcular cantidad de palmas por área', completed: false },
      { id: 22, text: 'Conseguir semillas/plántulas de aguaje', completed: false },
      { id: 23, text: 'Plan de riego y mantenimiento', completed: false },
    ],
    targetDate: '',
    generatesIncome: true,
    line: 'Inversión Terreno'
  },
  {
    id: 3, icon: '💻', order: 2,
    title: 'Invertir y crecer el software',
    description: 'Reinvertir en el desarrollo de Selva App: contratar programadores, delegar tareas y hacer crecer la plataforma. Escalar lo que ya funciona.',
    cost: 0, status: 'pendiente',
    color: '#4D96FF', category: 'software',
    subitems: [
      { id: 31, text: 'Contratar primer programador', completed: false },
      { id: 32, text: 'Delegar mantenimiento del backend', completed: false },
      { id: 33, text: 'Roadmap v2 del software', completed: false },
    ],
    targetDate: '',
    generatesIncome: true,
    line: 'Selva App'
  },
  {
    id: 4, icon: '🛒', order: 3,
    title: 'Boga — Paso 2: Escalar',
    description: 'Al igual que el aguaje, escalar Boga como plataforma de marketplace local. Más categorías, más vendedores, mejor UX.',
    cost: 0, status: 'pendiente',
    color: '#C77DFF', category: 'software',
    subitems: [
      { id: 41, text: 'Nuevas categorías de productos', completed: false },
      { id: 42, text: 'Incorporar más vendedores locales', completed: false },
    ],
    targetDate: '',
    generatesIncome: true,
    line: 'Boga Marketplace'
  },
  {
    id: 5, icon: '🏠', order: 4,
    title: 'Construir mi local en casa',
    description: 'Construir un pequeño local o espacio profesional en casa para no depender de rentar. Espacio propio para sesiones, reuniones o taller.',
    cost: 0, status: 'pendiente',
    color: '#F4A261', category: 'propiedad',
    subitems: [
      { id: 51, text: 'Definir espacio y planos básicos', completed: false },
      { id: 52, text: 'Cotizar materiales de construcción', completed: false },
      { id: 53, text: 'Iniciar construcción', completed: false },
    ],
    targetDate: '',
    generatesIncome: false,
    line: 'Personal'
  },
  {
    id: 6, icon: '🌴', order: 5,
    title: 'Yo soy de la Selva — Crecer hasta monetizar',
    description: 'Subir 2 noticias diarias enfocadas en el público selvático (actualidad local, cultura, naturaleza). Fase 1: solo publicar y crecer audiencia. Fase 2: cuando haya concurrencia suficiente, contratar redactores. Fase 3: monetizar con publicidad o patrocinios locales.',
    cost: 0, status: 'en-progreso',
    color: '#06D6A0', category: 'negocio',
    subitems: [
      { id: 61, text: 'Publicar 2 noticias diarias (boletas/notas)', completed: false },
      { id: 62, text: 'Conseguir 1000 seguidores en la plataforma principal', completed: false },
      { id: 63, text: 'Contratar primer redactor cuando sea viable', completed: false },
      { id: 64, text: 'Activar monetización / patrocinios locales', completed: false },
    ],
    targetDate: '',
    generatesIncome: true,
    line: 'Medios Digitales'
  },
  {
    id: 7, icon: '🎬', order: 6,
    title: 'RCC — Canal Viral (YouTube/TikTok)',
    description: 'Subir 2 videos diarios de contenido viral sin derechos de autor (internet open source / licencia libre). Fase 1: publicar consistentemente. Fase 2: alcanzar umbral de monetización (~$30 USD/mes estimados). Fase 3: escalar con más canales o contratar editor.',
    cost: 0, status: 'en-progreso',
    color: '#F72585', category: 'negocio',
    subitems: [
      { id: 71, text: 'Subir 2 videos diarios (sin copyright)', completed: false },
      { id: 72, text: 'Alcanzar 1000 subs + 4000 horas de reproducción', completed: false },
      { id: 73, text: 'Activar monetización de YouTube', completed: false },
      { id: 74, text: 'Escalar a más canales / contratar editor', completed: false },
    ],
    targetDate: '',
    generatesIncome: true,
    line: 'Medios Digitales'
  },
  {
    id: 8, icon: '🛍️', order: 7,
    title: 'Productos — Catálogo Selva',
    description: 'Línea de productos físicos y digitales bajo la marca Selva. Incluye productos propios, productos de terceros vendidos en Boga, y paquetes/combos de servicios (ej. sesión foto + álbum, pack eventos). También lives de TikTok para impulsar ventas directas.',
    cost: 0, status: 'en-progreso',
    color: '#FFD93D', category: 'negocio',
    subitems: [
      { id: 81, text: 'Definir catálogo inicial de productos Selva', completed: false },
      { id: 82, text: 'Subir productos a Boga Marketplace', completed: false },
      { id: 83, text: 'Realizar lives de TikTok para ventas (1–2 por semana)', completed: false },
      { id: 84, text: 'Crear paquetes combo (foto + álbum, eventos, etc.)', completed: false },
      { id: 85, text: 'Escalar: contratar community manager', completed: false },
    ],
    targetDate: '',
    generatesIncome: true,
    line: 'Productos'
  },
  {
    id: 9, icon: '🎞️', order: 8,
    title: 'Geekoedia — Canal de Películas',
    description: 'Canal de contenido cinematográfico / reviews / listas de películas. Actualmente en espera / desactivado. Puede reactivarse cuando haya más capacidad o se encuentre un modelo de contenido sin problemas de derechos. Potencial: monetización + comunidad geek.',
    cost: 0, status: 'en-espera' as any,
    color: '#94A3B8', category: 'personal',
    subitems: [
      { id: 91, text: 'Definir nicho exacto (reviews, listas, análisis)', completed: false },
      { id: 92, text: 'Resolver tema de derechos de autor', completed: false },
      { id: 93, text: 'Crear identidad visual del canal', completed: false },
      { id: 94, text: 'Publicar primeros 10 videos', completed: false },
    ],
    targetDate: '',
    generatesIncome: false,
    line: 'Medios Digitales'
  },
];

// Clave de localStorage para hábitos diarios (por día)
const getTodayKey = () => `ruta-habitos-${new Date().toISOString().slice(0, 10)}`;

const DAILY_HABITS = [
  { id: 'ysds-1', label: 'Noticia #1 — Yo soy de la Selva', channel: 'YSDS',     color: '#06D6A0', icon: '🌴' },
  { id: 'ysds-2', label: 'Noticia #2 — Yo soy de la Selva', channel: 'YSDS',     color: '#06D6A0', icon: '🌴' },
  { id: 'rcc-1',  label: 'Video #1 — RCC',                  channel: 'RCC',      color: '#F72585', icon: '🎬' },
  { id: 'rcc-2',  label: 'Video #2 — RCC',                  channel: 'RCC',      color: '#F72585', icon: '🎬' },
  { id: 'tt-1',   label: 'Live TikTok — Ventas / Productos', channel: 'TikTok',  color: '#FFD93D', icon: '📱' },
];

export const RitaDashboard = ({
  entries: rawEntries,
  addEntry: _addEntry,
  removeEntry,
  updateEntry,
  addSubitem,
  toggleSubitem,
  removeSubitem,
  addHabit: _addHabit,
  habits: _habits,
}: RitaDashboardProps) => {
  // Si no hay entradas guardadas, usamos los defaults
  const entries: RitaMilestone[] = (rawEntries as any[]).length > 0
    ? (rawEntries as RitaMilestone[])
    : DEFAULT_MILESTONES;

  const [expandedId, setExpandedId] = useState<number | null>(1);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newSubText, setNewSubText] = useState<Record<number, string>>({});

  // ── Hábitos Diarios ────────────────────────────────────────────────────────
  const [dailyChecked, setDailyChecked] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(getTodayKey());
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Persistir cuando cambia
  useEffect(() => {
    localStorage.setItem(getTodayKey(), JSON.stringify(dailyChecked));
  }, [dailyChecked]);

  const toggleHabit = (id: string) =>
    setDailyChecked(prev => ({ ...prev, [id]: !prev[id] }));

  const dailyDoneCount = DAILY_HABITS.filter(h => dailyChecked[h.id]).length;
  // ──────────────────────────────────────────────────────────────────────────

  // Estados de Agrupación y Orden
  const [groupBy, setGroupBy] = useState<'none' | 'line' | 'income' | 'category'>('none');
  const [sortBy, setSortBy] = useState<'order' | 'date' | 'cost' | 'name'>('order');

  // Formulario nuevo hito
  const [form, setForm] = useState({
    icon: '🎯', title: '', description: '',
    cost: '', color: MILESTONE_COLORS[0],
    category: 'negocio', status: 'pendiente' as const,
    targetDate: '',
    generatesIncome: true,
    line: ''
  });

  // Edit inline
  const [editForm, setEditForm] = useState<Partial<RitaMilestone> & { costStr?: string }>({});

  const totalCost = entries.reduce((acc, e) => acc + (e.cost || 0), 0);
  const completedCount = entries.filter(e => e.status === 'completado').length;

  // Estadísticas calculadas para la barra lateral
  const progressPercent = entries.length > 0 ? Math.round((completedCount / entries.length) * 100) : 0;
  
  const completedCost = useMemo(() => {
    return entries.filter(e => e.status === 'completado').reduce((acc, e) => acc + (e.cost || 0), 0);
  }, [entries]);

  const pendingCost = totalCost - completedCost;

  // Hito más cercano que sigue pendiente
  const nextUpcomingMilestone = useMemo(() => {
    const pendingWithDate = entries.filter(e => e.status !== 'completado' && e.targetDate);
    if (pendingWithDate.length === 0) return null;
    return pendingWithDate.sort((a, b) => a.targetDate!.localeCompare(b.targetDate!))[0];
  }, [entries]);

  // Estadísticas por línea
  const lineProgressStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number; color: string }> = {};
    entries.forEach(e => {
      const key = e.line?.trim() || 'General';
      if (!stats[key]) {
        stats[key] = { total: 0, completed: 0, color: e.color || '#4D96FF' };
      }
      stats[key].total += 1;
      if (e.status === 'completado') stats[key].completed += 1;
    });
    return Object.entries(stats).map(([name, s]) => ({
      name,
      total: s.total,
      completed: s.completed,
      color: s.color,
      percent: Math.round((s.completed / s.total) * 100)
    })).sort((a, b) => b.percent - a.percent);
  }, [entries]);

  // Obtener líneas únicas para autocompletado
  const uniqueLines = useMemo(() => {
    const lines = new Set<string>();
    entries.forEach(e => {
      if (e.line) lines.add(e.line.trim());
    });
    SUGGESTED_LINES.forEach(l => lines.add(l));
    return Array.from(lines);
  }, [entries]);

  // Lista ordenada de hitos
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      if (sortBy === 'date') {
        if (!a.targetDate) return 1;
        if (!b.targetDate) return -1;
        return a.targetDate.localeCompare(b.targetDate);
      }
      if (sortBy === 'cost') return b.cost - a.cost;
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      return a.order - b.order;
    });
  }, [entries, sortBy]);

  // Agrupación de hitos
  const groupedEntries = useMemo(() => {
    if (groupBy === 'none') {
      return { all: sortedEntries };
    }

    const groups: Record<string, RitaMilestone[]> = {};

    if (groupBy === 'line') {
      sortedEntries.forEach(m => {
        const key = m.line?.trim() || 'General';
        if (!groups[key]) groups[key] = [];
        groups[key].push(m);
      });
    } else if (groupBy === 'income') {
      sortedEntries.forEach(m => {
        const key = m.generatesIncome ? '💰 Genera Dinero' : '💸 Sin Retorno Directo';
        if (!groups[key]) groups[key] = [];
        groups[key].push(m);
      });
    } else if (groupBy === 'category') {
      sortedEntries.forEach(m => {
        const key = CAT_STYLES[m.category]?.label || m.category;
        if (!groups[key]) groups[key] = [];
        groups[key].push(m);
      });
    }

    return groups;
  }, [sortedEntries, groupBy]);

  // Hitos ordenados cronológicamente para la línea de tiempo
  const timelineMilestones = useMemo(() => {
    return [...entries].sort((a, b) => {
      if (!a.targetDate && !b.targetDate) return a.order - b.order;
      if (!a.targetDate) return 1;
      if (!b.targetDate) return -1;
      return a.targetDate.localeCompare(b.targetDate);
    });
  }, [entries]);

  const handleAddMilestone = () => {
    if (!form.title.trim()) return;
    const newMilestone: RitaMilestone = {
      id: Date.now(),
      icon: form.icon,
      title: form.title.trim(),
      description: form.description.trim(),
      cost: parseFloat(form.cost) || 0,
      status: 'pendiente',
      color: form.color,
      category: form.category,
      subitems: [],
      targetDate: form.targetDate,
      order: entries.length,
      generatesIncome: form.generatesIncome,
      line: form.line.trim() || 'General'
    };
    
    updateEntry(-1, newMilestone as any);
    _addEntry(form.title, form.description, null, form.color);
    setIsAdding(false);
    setForm({
      icon: '🎯', title: '', description: '', cost: '',
      color: MILESTONE_COLORS[0], category: 'negocio', status: 'pendiente',
      targetDate: '', generatesIncome: true, line: ''
    });
  };

  const startEdit = (m: RitaMilestone) => {
    setEditForm({
      ...m,
      costStr: m.cost > 0 ? String(m.cost) : '',
      generatesIncome: m.generatesIncome !== undefined ? m.generatesIncome : true,
      line: m.line || ''
    });
    setEditingId(m.id);
  };

  const saveEdit = (id: number) => {
    const cost = parseFloat(editForm.costStr || '0') || 0;
    updateEntry(id, { ...editForm, cost } as any);
    setEditingId(null);
  };

  const handleAddSubitem = (entryId: number) => {
    const text = newSubText[entryId]?.trim();
    if (!text) return;
    addSubitem(entryId, text);
    setNewSubText(prev => ({ ...prev, [entryId]: '' }));
  };

  const renderMilestoneCard = (milestone: RitaMilestone, idx: number, showConnector = true) => {
    const isExpanded = expandedId === milestone.id;
    const isEditing = editingId === milestone.id;
    const isOnHold = (milestone.status as string) === 'en-espera';
    const statusStyle = STATUS_STYLES[milestone.status] || STATUS_STYLES['en-espera'] || STATUS_STYLES.pendiente;
    const catStyle = CAT_STYLES[milestone.category] || CAT_STYLES.negocio;
    const subDone = (milestone.subitems || []).filter(s => s.completed).length;
    const subTotal = (milestone.subitems || []).length;

    return (
      <motion.div
        key={milestone.id}
        id={`milestone-${milestone.id}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.03 }}
        style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', opacity: isOnHold ? 0.55 : 1, filter: isOnHold ? 'grayscale(0.7)' : 'none', transition: 'opacity 0.3s, filter 0.3s' }}
      >
        {/* Nodo de la línea vertical */}
        {showConnector && (
          <div style={{ flexShrink: 0, width: '58px', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '12px' }}>
            <motion.div
              whileHover={{ scale: 1.15 }}
              style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: milestone.status === 'completado'
                  ? `linear-gradient(135deg, #6BCB77, #4ade80)`
                  : milestone.status === 'en-progreso'
                  ? `linear-gradient(135deg, ${milestone.color}, ${milestone.color}cc)`
                  : isOnHold
                  ? '#F1F5F9'
                  : 'white',
                border: `3px solid ${milestone.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', cursor: 'pointer',
                boxShadow: `0 4px 16px ${milestone.color}33`,
                transition: 'all 0.3s',
                position: 'relative', zIndex: 1
              }}
              onClick={() => setExpandedId(isExpanded ? null : milestone.id)}
            >
              {milestone.status === 'completado' ? '✓' : isOnHold ? '⏸' : milestone.icon}
            </motion.div>
            <div style={{
              fontSize: '0.6rem', fontWeight: 900, color: '#ccc',
              marginTop: '4px', letterSpacing: '0.5px', textAlign: 'center'
            }}>
              #{idx + 1}
            </div>
          </div>
        )}

        {/* Tarjeta */}
        <motion.div
          layout
          style={{
            flex: 1, background: 'white', borderRadius: '20px',
            boxShadow: isExpanded ? `0 8px 30px ${milestone.color}22` : '0 2px 12px rgba(0,0,0,0.06)',
            border: isExpanded ? `2px solid ${milestone.color}44` : '1px solid rgba(0,0,0,0.06)',
            overflow: 'hidden', transition: 'box-shadow 0.3s, border-color 0.3s'
          }}
        >
          {/* Barra de color */}
          <div style={{
            height: '3px',
            background: milestone.status === 'completado'
              ? 'linear-gradient(90deg, #6BCB77, #4ade80)'
              : `linear-gradient(90deg, ${milestone.color}, ${milestone.color}88)`
          }} />

          {/* Fila principal */}
          <div
            style={{ padding: '1rem 1.2rem', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => !isEditing && setExpandedId(isExpanded ? null : milestone.id)}
          >
            {isEditing ? (
              // MODO EDICIÓN
              <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Icono */}
                  <select
                    value={editForm.icon}
                    onChange={e => setEditForm(p => ({ ...p, icon: e.target.value }))}
                    style={{ padding: '6px', borderRadius: '8px', border: '1px solid #eee', fontSize: '1.2rem', fontFamily: 'inherit' }}
                  >
                    {MILESTONE_ICONS.map(ico => <option key={ico} value={ico}>{ico}</option>)}
                  </select>
                  {/* Título */}
                  <input
                    value={editForm.title || ''}
                    onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                    style={{ flex: 1, minWidth: '180px', padding: '8px 12px', borderRadius: '10px', border: '2px solid #eee', fontWeight: 800, fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>
                <textarea
                  value={editForm.description || ''}
                  onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="Descripción..."
                  style={{ padding: '8px 12px', borderRadius: '10px', border: '2px solid #eee', fontSize: '0.83rem', fontFamily: 'inherit', resize: 'none', outline: 'none', color: '#555' }}
                />
                
                {/* Atributos Básicos de Hito */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Costo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8f8f8', borderRadius: '10px', padding: '6px 12px' }}>
                    <DollarSign size={14} color="#6BCB77" />
                    <input
                      type="number"
                      value={editForm.costStr || ''}
                      onChange={e => setEditForm(p => ({ ...p, costStr: e.target.value }))}
                      placeholder="Costo estimado"
                      style={{ border: 'none', background: 'transparent', width: '100px', fontWeight: 700, fontSize: '0.83rem', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </div>
                  {/* Estado */}
                  <select
                    value={editForm.status || 'pendiente'}
                    onChange={e => setEditForm(p => ({ ...p, status: e.target.value as any }))}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #eee', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.8rem' }}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en-progreso">En progreso</option>
                    <option value="completado">Completado</option>
                  </select>
                  {/* Categoría */}
                  <select
                    value={editForm.category || 'negocio'}
                    onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #eee', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.8rem' }}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{CAT_STYLES[c]?.label || c}</option>)}
                  </select>
                  {/* Fecha */}
                  <input
                    type="date"
                    value={editForm.targetDate || ''}
                    onChange={e => setEditForm(p => ({ ...p, targetDate: e.target.value }))}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #eee', fontFamily: 'inherit', fontSize: '0.8rem' }}
                  />
                </div>

                {/* Nuevos Atributos (Generación de Dinero y Línea de Enfoque) */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', background: '#FAFAFA', padding: '10px 14px', borderRadius: '12px', border: '1px solid #F0F0F0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: '#333' }}>
                    <input
                      type="checkbox"
                      checked={editForm.generatesIncome !== undefined ? editForm.generatesIncome : true}
                      onChange={e => setEditForm(p => ({ ...p, generatesIncome: e.target.checked }))}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    💰 ¿Genera ingresos o dinero?
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '180px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#888' }}>Línea:</span>
                    <input
                      value={editForm.line || ''}
                      onChange={e => setEditForm(p => ({ ...p, line: e.target.value }))}
                      placeholder="Ej: Selva App, Personal..."
                      list="lines-list-edit"
                      style={{ flex: 1, padding: '5px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit', outline: 'none' }}
                    />
                    <datalist id="lines-list-edit">
                      {uniqueLines.map(ln => <option key={ln} value={ln} />)}
                    </datalist>
                  </div>
                </div>

                {/* Colores */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {MILESTONE_COLORS.map(c => (
                    <div key={c} onClick={() => setEditForm(p => ({ ...p, color: c }))}
                      style={{ width: '22px', height: '22px', borderRadius: '50%', background: c, cursor: 'pointer',
                        border: editForm.color === c ? '3px solid #333' : '3px solid transparent', transition: 'transform 0.15s',
                        transform: editForm.color === c ? 'scale(1.25)' : 'scale(1)' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => saveEdit(milestone.id)}
                    style={{ background: '#6BCB77', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 18px', fontWeight: 900, cursor: 'pointer', fontSize: '0.83rem' }}>
                    Guardar
                  </motion.button>
                  <button onClick={() => setEditingId(null)}
                    style={{ background: '#f0f0f0', color: '#888', border: 'none', borderRadius: '10px', padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '0.83rem' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              // MODO VISTA
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 900, fontSize: '0.97rem', color: '#1a1a2e' }}>{milestone.title}</span>
                    <span style={{ fontSize: '0.67rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: catStyle.bg, color: catStyle.color }}>{catStyle.label}</span>
                    <span style={{ fontSize: '0.67rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</span>
                    
                    {/* Badge de Dinero */}
                    <span style={{
                      fontSize: '0.67rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                      background: milestone.generatesIncome ? '#E6F9F0' : '#F5F5F5',
                      color: milestone.generatesIncome ? '#10B981' : '#6B7280'
                    }}>
                      {milestone.generatesIncome ? '💰 Genera Ingresos' : '💸 Sin Retorno Directo'}
                    </span>

                    {/* Badge de Línea */}
                    <span style={{
                      fontSize: '0.67rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                      background: '#EFF6FF', color: '#1E40AF'
                    }}>
                      💼 {milestone.line || 'General'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {milestone.cost > 0 && (
                      <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#6BCB77', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <DollarSign size={12} />{formatMXN(milestone.cost)}
                      </span>
                    )}
                    {subTotal > 0 && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: milestone.color }}>
                        ☑ {subDone}/{subTotal}
                      </span>
                    )}
                    {milestone.targetDate && (
                      <span style={{ fontSize: '0.7rem', color: '#bbb', fontWeight: 700 }}>
                        📅 {new Date(milestone.targetDate + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={e => { e.stopPropagation(); startEdit(milestone); }}
                    style={{ background: '#f5f5f5', border: 'none', borderRadius: '9px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#aaa' }}>
                    <Edit3 size={14} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); setExpandedId(isExpanded ? null : milestone.id); }}
                    style={{ background: isExpanded ? `${milestone.color}20` : '#f5f5f5', border: 'none', borderRadius: '9px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isExpanded ? milestone.color : '#bbb' }}>
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); removeEntry(milestone.id); }}
                    style={{ background: '#fff0f0', border: 'none', borderRadius: '9px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ffaaaa' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Panel expandido */}
          <AnimatePresence>
            {isExpanded && !isEditing && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ padding: '0 1.2rem 1.2rem', borderTop: '1px solid #f5f5f5', paddingTop: '1rem' }}>
                  {/* Descripción */}
                  {milestone.description && (
                    <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#555', lineHeight: 1.6, fontWeight: 500 }}>
                      {milestone.description}
                    </p>
                  )}

                  {/* Pasos / Subitems */}
                  <div style={{ fontWeight: 800, fontSize: '0.68rem', color: '#bbb', letterSpacing: '0.05em', marginBottom: '8px' }}>PASOS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
                    <AnimatePresence>
                      {(milestone.subitems || []).map(sub => (
                        <motion.div key={sub.id}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '7px 11px', borderRadius: '10px',
                            background: sub.completed ? `${milestone.color}12` : '#fafafa',
                            border: `1px solid ${sub.completed ? milestone.color + '33' : '#f0f0f0'}`
                          }}
                        >
                          <div onClick={() => toggleSubitem(milestone.id, sub.id)}
                            style={{
                              width: '17px', height: '17px', borderRadius: '5px', flexShrink: 0,
                              background: sub.completed ? milestone.color : 'white',
                              border: `2px solid ${sub.completed ? milestone.color : '#ddd'}`,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
                            }}>
                            {sub.completed && <span style={{ color: 'white', fontSize: '9px', fontWeight: 900 }}>✓</span>}
                          </div>
                          <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: sub.completed ? '#bbb' : '#333', textDecoration: sub.completed ? 'line-through' : 'none' }}>
                            {sub.text}
                          </span>
                          <button onClick={() => removeSubitem(milestone.id, sub.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', padding: '2px' }}>
                            <X size={12} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <div style={{ display: 'flex', gap: '7px' }}>
                    <input
                      value={newSubText[milestone.id] || ''}
                      onChange={e => setNewSubText(p => ({ ...p, [milestone.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleAddSubitem(milestone.id)}
                      placeholder="Agregar paso..."
                      style={{ flex: 1, padding: '8px 12px', borderRadius: '9px', border: '2px solid #eee', fontSize: '0.82rem', fontWeight: 600, outline: 'none', fontFamily: 'inherit', color: '#444' }}
                      onFocus={e => e.target.style.borderColor = milestone.color}
                      onBlur={e => e.target.style.borderColor = '#eee'}
                    />
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleAddSubitem(milestone.id)}
                      style={{ background: milestone.color, color: 'white', border: 'none', borderRadius: '9px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Plus size={16} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="ruta-container">
      {/* Inyección de CSS responsivo para el diseño de rejilla de escritorio */}
      <style>{`
        .ruta-container {
          width: 100%;
          max-width: 1240px;
          margin: 0 auto;
          padding-bottom: 4rem;
          padding-left: 1rem;
          padding-right: 1rem;
        }
        .ruta-main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          align-items: start;
        }
        .ruta-sidebar {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        @media (min-width: 992px) {
          .ruta-main-grid {
            grid-template-columns: 1.6fr 1fr;
          }
          .ruta-sidebar {
            position: sticky;
            top: 20px;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-carbon, #1a1a2e)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🗺️ Hoja de Ruta
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#aaa', fontWeight: 600 }}>
            Plan personal estratégico · {completedCount}/{entries.length} hitos · Inversión total: <strong style={{ color: '#6BCB77' }}>{formatMXN(totalCost)}</strong>
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setIsAdding(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'linear-gradient(135deg, #6BCB77, #4D96FF)',
            color: 'white', border: 'none', borderRadius: '14px',
            padding: '10px 20px', fontSize: '0.85rem', fontWeight: 900,
            cursor: 'pointer', boxShadow: '0 6px 20px rgba(107, 203, 119, 0.3)'
          }}
        >
          <Plus size={16} /> Nuevo Hito
        </motion.button>
      </div>

      {/* Visual Timeline en la parte superior */}
      <div style={{
        marginTop: '0.5rem', marginBottom: '2.5rem', background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(10px)', border: '1px solid rgba(0, 0, 0, 0.05)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.04)', borderRadius: '24px', padding: '1.5rem 1.8rem'
      }}>
        <h3 style={{ margin: '0 0 1.2rem', fontSize: '1.05rem', fontWeight: 900, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🗺️ Línea de Tiempo Cronológica
        </h3>
        
        {timelineMilestones.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#999', textAlign: 'center', padding: '2rem' }}>
            No hay hitos en tu hoja de ruta aún.
          </p>
        ) : (
          <div style={{
            position: 'relative', display: 'flex', gap: '2.5rem', overflowX: 'auto',
            padding: '1.5rem 1rem 1rem', scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch'
          }}>
            {/* Línea horizontal central */}
            <div style={{
              position: 'absolute', left: '2.5rem', right: '2.5rem', top: 'calc(1.5rem + 22px)',
              height: '4px', background: 'linear-gradient(90deg, #FF6B6B, #C77DFF, #4D96FF, #6BCB77, #F4A261)',
              opacity: 0.3, zIndex: 0
            }} />

            {timelineMilestones.map((milestone) => {
              const dateObj = milestone.targetDate ? new Date(milestone.targetDate + 'T00:00:00') : null;
              const dateLabel = dateObj 
                ? dateObj.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })
                : 'Sin fecha';
              
              const isCompleted = milestone.status === 'completado';
              const isInProgress = milestone.status === 'en-progreso';

              return (
                <motion.div
                  key={milestone.id}
                  whileHover={{ y: -5 }}
                  onClick={() => {
                    setExpandedId(milestone.id);
                    const el = document.getElementById(`milestone-${milestone.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    minWidth: '140px', maxWidth: '180px', cursor: 'pointer', zIndex: 1, position: 'relative'
                  }}
                >
                  {/* Nodo circular */}
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: isCompleted ? '#6BCB77' : isInProgress ? milestone.color : 'white',
                    border: `3px solid ${milestone.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', color: isCompleted || isInProgress ? 'white' : '#666',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s', position: 'relative'
                  }}>
                    {isCompleted ? '✓' : milestone.icon}
                    
                    {/* Indicador de retorno monetario en el nodo */}
                    {milestone.generatesIncome && (
                      <span style={{
                        position: 'absolute', right: '-4px', top: '-4px',
                        background: '#10B981', color: 'white', borderRadius: '50%',
                        width: '16px', height: '16px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '9px', fontWeight: 900,
                        border: '2px solid white'
                      }}>
                        $
                      </span>
                    )}
                  </div>

                  {/* Texto de fecha */}
                  <span style={{
                    marginTop: '8px', fontSize: '0.7rem', fontWeight: 900,
                    color: milestone.targetDate ? milestone.color : '#aaa', textTransform: 'uppercase'
                  }}>
                    {dateLabel}
                  </span>

                  {/* Título de hito */}
                  <span style={{
                    marginTop: '4px', fontSize: '0.78rem', fontWeight: 800,
                    color: '#2d3748', textAlign: 'center', whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis', width: '100%'
                  }}>
                    {milestone.title}
                  </span>

                  {/* Subtítulo de Línea de enfoque */}
                  <span style={{
                    marginTop: '2px', fontSize: '0.62rem', fontWeight: 700,
                    color: '#a0aec0', textTransform: 'uppercase'
                  }}>
                    {milestone.line || 'General'}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rejilla Principal (Main Content + Sidebar) */}
      <div className="ruta-main-grid">
        
        {/* Columna Izquierda: Controles y Lista de Hitos */}
        <div>
          {/* Controles de Agrupación y Orden */}
          <div style={{
            background: '#FAF8F6', borderRadius: '20px', padding: '1rem',
            marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.2rem',
            alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(0,0,0,0.04)'
          }}>
            {/* Agrupar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#999', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
                <Layers size={13} /> Agrupar:
              </span>
              {[
                { id: 'none', label: 'Cronología 📍' },
                { id: 'line', label: 'Línea de Enfoque 💼' },
                { id: 'income', label: 'Retorno Financiero 💰' },
                { id: 'category', label: 'Categoría 🏷️' }
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => setGroupBy(g.id as any)}
                  style={{
                    border: 'none', borderRadius: '10px', padding: '6px 12px',
                    fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                    background: groupBy === g.id ? '#1a1a2e' : 'white',
                    color: groupBy === g.id ? 'white' : '#666',
                    boxShadow: groupBy === g.id ? '0 4px 12px rgba(26, 26, 46, 0.2)' : '0 2px 6px rgba(0,0,0,0.03)',
                    transition: 'all 0.2s'
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Ordenar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#999', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
                <BarChart2 size={13} /> Orden:
              </span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                style={{
                  padding: '6px 12px', borderRadius: '10px', border: '1px solid #ddd',
                  fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', outline: 'none',
                  fontFamily: 'inherit', color: '#333', background: 'white'
                }}
              >
                <option value="order">Posición Original</option>
                <option value="date">Fecha Límite</option>
                <option value="cost">Mayor Costo</option>
                <option value="name">Nombre (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Visualización de Hitos */}
          {groupBy === 'none' ? (
            /* VISTA VERTICAL TRADICIONAL */
            <div style={{ position: 'relative' }}>
              {/* Línea vertical central */}
              <div style={{
                position: 'absolute', left: '28px', top: '32px',
                width: '2px', bottom: '32px',
                background: 'linear-gradient(to bottom, #FF6B6B, #C77DFF, #4D96FF, #6BCB77, #F4A261)',
                borderRadius: '2px', opacity: 0.25
              }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sortedEntries.map((milestone, idx) => renderMilestoneCard(milestone, idx, true))}
              </div>
            </div>
          ) : (
            /* VISTA AGRUPADA EN SECCIONES */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {Object.entries(groupedEntries).map(([groupKey, groupItems]) => {
                const groupCost = groupItems.reduce((sum, item) => sum + (item.cost || 0), 0);
                return (
                  <div key={groupKey} style={{ background: '#FAF9F8', borderRadius: '24px', padding: '1.2rem', border: '1px solid rgba(0,0,0,0.03)' }}>
                    {/* Cabecera del Grupo */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '2px dashed #eee', paddingBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {groupKey} <span style={{ color: '#aaa', fontSize: '0.8rem', fontWeight: 700 }}>({groupItems.length})</span>
                      </h3>
                      {groupCost > 0 && (
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#6BCB77' }}>
                          Inversión: {formatMXN(groupCost)}
                        </span>
                      )}
                    </div>

                    {/* Hitos del Grupo */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {groupItems.map((milestone, idx) => renderMilestoneCard(milestone, idx, false))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Columna Derecha: Sidebar Sticky de Estadísticas y Resumen */}
        <div className="ruta-sidebar">
          
          {/* Card 1: Progreso de Hitos */}
          <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.06)', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 900, color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📊 Progreso de Ruta
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-carbon, #1a1a2e)' }}>{progressPercent}%</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#aaa' }}>{completedCount} de {entries.length} hitos</span>
            </div>
            {/* Barra de progreso */}
            <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(90deg, #6BCB77, #4D96FF)', borderRadius: '4px' }} />
            </div>
          </div>

          {/* Card 2: Resumen Financiero */}
          <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.06)', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <h4 style={{ margin: '0 0 1.2rem', fontSize: '0.9rem', fontWeight: 900, color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              💰 Inversión Total
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <span style={{ fontSize: '0.67rem', fontWeight: 800, color: '#aaa', textTransform: 'uppercase' }}>Presupuesto Total</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2d3748', marginTop: '2px' }}>{formatMXN(totalCost)}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', borderTop: '1px solid #f3f4f6', paddingTop: '0.8rem' }}>
                <div>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#6BCB77', textTransform: 'uppercase' }}>Completado</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#6BCB77', marginTop: '1px' }}>{formatMXN(completedCost)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>Pendiente</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#f59e0b', marginTop: '1px' }}>{formatMXN(pendingCost)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Próximo Hito Pendiente */}
          {nextUpcomingMilestone && (
            <div style={{
              background: `linear-gradient(135deg, ${nextUpcomingMilestone.color}10, ${nextUpcomingMilestone.color}05)`,
              borderRadius: '24px', border: `2px dashed ${nextUpcomingMilestone.color}33`,
              padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
            }}>
              <span style={{ fontSize: '0.67rem', fontWeight: 800, color: nextUpcomingMilestone.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ⏳ Próxima Meta Activa
              </span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '0.7rem' }}>
                <div style={{ fontSize: '1.8rem' }}>{nextUpcomingMilestone.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {nextUpcomingMilestone.title}
                  </div>
                  <div style={{ fontSize: '0.73rem', fontWeight: 700, color: '#888', marginTop: '2px' }}>
                    📅 {new Date(nextUpcomingMilestone.targetDate + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setExpandedId(nextUpcomingMilestone.id);
                  const el = document.getElementById(`milestone-${nextUpcomingMilestone.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                style={{
                  width: '100%', border: 'none', background: 'white', color: '#1a1a2e',
                  fontSize: '0.78rem', fontWeight: 900, padding: '8px', borderRadius: '10px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer', marginTop: '1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                }}
              >
                Ver Hito Detallado
              </button>
            </div>
          )}

          {/* Card 4: Líneas de Trabajo */}
          <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.06)', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 900, color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              💼 Líneas de Enfoque
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {lineProgressStats.map((line) => (
                <div key={line.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', fontWeight: 700, color: '#4a5568', marginBottom: '3px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: line.color }} />
                      {line.name}
                    </span>
                    <span>{line.completed}/{line.total} ({line.percent}%)</span>
                  </div>
                  {/* Mini barra de progreso */}
                  <div style={{ height: '5px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${line.percent}%`, background: line.color, borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 5: Hábitos Diarios */}
          <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.06)', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📅 Hábitos Diarios
              </h4>
              <span style={{
                fontSize: '0.72rem', fontWeight: 900, padding: '3px 10px', borderRadius: '20px',
                background: dailyDoneCount === DAILY_HABITS.length ? '#D1FAE5' : '#FFF3E8',
                color: dailyDoneCount === DAILY_HABITS.length ? '#059669' : '#F59E0B'
              }}>
                {dailyDoneCount}/{DAILY_HABITS.length} hoy
              </span>
            </div>

            {/* Barra de progreso del día */}
            <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.2rem' }}>
              <div style={{
                height: '100%',
                width: `${(dailyDoneCount / DAILY_HABITS.length) * 100}%`,
                background: dailyDoneCount === DAILY_HABITS.length
                  ? 'linear-gradient(90deg, #06D6A0, #4D96FF)'
                  : 'linear-gradient(90deg, #FF8E53, #F72585)',
                borderRadius: '4px', transition: 'width 0.4s ease'
              }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {DAILY_HABITS.map(habit => (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: dailyChecked[habit.id] ? `${habit.color}12` : '#FAFAFA',
                    border: `2px solid ${dailyChecked[habit.id] ? habit.color : '#eee'}`,
                    borderRadius: '14px', padding: '10px 14px', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.2s', width: '100%'
                  }}
                >
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                    background: dailyChecked[habit.id] ? habit.color : 'white',
                    border: `2.5px solid ${dailyChecked[habit.id] ? habit.color : '#ddd'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', color: 'white', fontWeight: 900,
                    transition: 'all 0.2s'
                  }}>
                    {dailyChecked[habit.id] ? '✓' : ''}
                  </div>
                  <span style={{ fontSize: '0.75rem' }}>{habit.icon}</span>
                  <span style={{
                    fontSize: '0.78rem', fontWeight: 700,
                    color: dailyChecked[habit.id] ? habit.color : '#4a5568',
                    textDecoration: dailyChecked[habit.id] ? 'line-through' : 'none',
                    flex: 1
                  }}>
                    {habit.label}
                  </span>
                </button>
              ))}
            </div>

            {dailyDoneCount === DAILY_HABITS.length && (
              <div style={{
                marginTop: '1rem', background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)',
                borderRadius: '14px', padding: '12px', textAlign: 'center',
                fontSize: '0.82rem', fontWeight: 900, color: '#059669'
              }}>
                🎉 ¡Todo listo por hoy! Sigue así.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Modal agregar nuevo hito */}
      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={() => setIsAdding(false)}
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'white', borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '500px', boxShadow: '0 30px 80px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '1.2rem', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem' }}>🎯 Nuevo Hito</h3>
                <button onClick={() => setIsAdding(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}><X size={20} /></button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <select value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))}
                  style={{ padding: '8px', borderRadius: '10px', border: '2px solid #eee', fontSize: '1.3rem', fontFamily: 'inherit' }}>
                  {MILESTONE_ICONS.map(ico => <option key={ico} value={ico}>{ico}</option>)}
                </select>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Título del hito..."
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '2px solid #eee', fontSize: '0.95rem', fontWeight: 800, outline: 'none', fontFamily: 'inherit' }}
                  onFocus={e => e.target.style.borderColor = form.color}
                  onBlur={e => e.target.style.borderColor = '#eee'}
                />
              </div>

              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Descripción del plan..." rows={3}
                style={{ padding: '10px 14px', borderRadius: '12px', border: '2px solid #eee', fontSize: '0.87rem', resize: 'none', fontFamily: 'inherit', outline: 'none', color: '#444' }} />

              {/* Costo y Categoría */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '140px', background: '#f8f8f8', borderRadius: '10px', padding: '8px 12px' }}>
                  <DollarSign size={14} color="#6BCB77" />
                  <input type="number" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))}
                    placeholder="Costo estimado"
                    style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.87rem', outline: 'none', fontFamily: 'inherit', width: '100%' }} />
                </div>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '10px', border: '2px solid #eee', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.83rem' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_STYLES[c]?.label || c}</option>)}
                </select>
              </div>

              {/* Fecha Límite y Línea de Enfoque */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#aaa' }}>FECHA LÍMITE</span>
                  <input type="date" value={form.targetDate} onChange={e => setForm(p => ({ ...p, targetDate: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '10px', border: '2px solid #eee', fontFamily: 'inherit', fontSize: '0.85rem', width: '100%' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '160px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#aaa' }}>LÍNEA DE ENFOQUE</span>
                  <input value={form.line} onChange={e => setForm(p => ({ ...p, line: e.target.value }))}
                    placeholder="Ej: Selva App, Personal..."
                    list="lines-list-add"
                    style={{ padding: '8px 12px', borderRadius: '10px', border: '2px solid #eee', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 700, width: '100%', outline: 'none' }}
                  />
                  <datalist id="lines-list-add">
                    {uniqueLines.map(ln => <option key={ln} value={ln} />)}
                  </datalist>
                </div>
              </div>

              {/* Checkbox Generación de Dinero */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.87rem', fontWeight: 800, color: '#333', background: '#F0FFF4', padding: '10px 14px', borderRadius: '12px', border: '1px solid #D1FAE5' }}>
                <input type="checkbox" checked={form.generatesIncome} onChange={e => setForm(p => ({ ...p, generatesIncome: e.target.checked }))}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                💰 ¿Genera ingresos o dinero?
              </label>

              {/* Selector de Color */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {MILESTONE_COLORS.map(c => (
                  <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                    style={{ width: '26px', height: '26px', borderRadius: '50%', background: c, cursor: 'pointer',
                      border: form.color === c ? '3px solid #333' : '3px solid transparent',
                      transform: form.color === c ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.15s' }} />
                ))}
              </div>

              {/* Botón Guardar */}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleAddMilestone}
                disabled={!form.title.trim()}
                style={{ background: form.title.trim() ? `linear-gradient(135deg, ${form.color}, ${form.color}cc)` : '#eee',
                  color: form.title.trim() ? 'white' : '#aaa', border: 'none', borderRadius: '14px', padding: '14px',
                  fontSize: '0.9rem', fontWeight: 900, cursor: form.title.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: form.title.trim() ? `0 8px 24px ${form.color}44` : 'none' }}>
                Agregar Hito
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
