import { useState, useEffect } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { StickyNote, Link as LinkIcon, CheckSquare, Minus, Table as TableIcon, MessageSquare, Image as ImageIcon, Target, LayoutGrid, Trash2, Library, MoreHorizontal, Copy, BarChartHorizontal, Sigma, TrendingUp, TrendingDown, X as XIcon, Divide } from 'lucide-react';

interface CanvasItem {
    id: string;
    type: string;
    x: number;
    y: number;
    content?: string;
    columns?: number;
    rows?: number;
    tableData?: string[][];
    color?: string; // Used for board backgrounds
    width?: number;  // Custom width for resizable items (table)
    height?: number; // Custom height for resizable items (table)
    columnWidths?: number[]; // Custom widths per column
    ganttModes?: ('dias' | 'semanas' | 'meses')[]; // Custom modes for Gantt
}

export const NegocioLienzo = () => {
    const defaultBoards = { 
        root: [
            {
                id: 'default-shelf',
                type: 'shelf',
                x: 220,
                y: 311,
                content: 'Operaciones',
                columns: 4, 
                rows: 2     
            }
        ] 
    };

    const [boards, setBoards] = useState<Record<string, CanvasItem[]>>(() => {
        const saved = localStorage.getItem('negocio_lienzo_boards');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Error parsing saved boards", e);
            }
        }
        return defaultBoards;
    });

    useEffect(() => {
        localStorage.setItem('negocio_lienzo_boards', JSON.stringify(boards));
    }, [boards]);
    const [currentBoardId, setCurrentBoardId] = useState<string>('root');
    const [boardPath, setBoardPath] = useState<{id: string, name: string}[]>([{id: 'root', name: 'Inicio'}]);
    const [, setHistory] = useState<Record<string, CanvasItem[]>[]>([]);
    
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [tableContextMenu, setTableContextMenu] = useState<{ id: string, r: number, c: number, x: number, y: number } | null>(null);
    const [cellSelection, setCellSelection] = useState<{ itemId: string; startR: number; startC: number; endR: number; endC: number } | null>(null);
    const [opsResult, setOpsResult] = useState<{ itemId: string; text: string; value: string } | null>(null);
    const [placingResult, setPlacingResult] = useState(false);
    
    const items = boards[currentBoardId] || [];

    const getSelectedValues = (itemId: string): number[] => {
        if (!cellSelection || cellSelection.itemId !== itemId) return [];
        const item = items.find(i => i.id === itemId);
        if (!item?.tableData) return [];
        const vals: number[] = [];
        const minR = Math.min(cellSelection.startR, cellSelection.endR);
        const maxR = Math.max(cellSelection.startR, cellSelection.endR);
        const minC = Math.min(cellSelection.startC, cellSelection.endC);
        const maxC = Math.max(cellSelection.startC, cellSelection.endC);
        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                const v = parseFloat(item.tableData[r]?.[c] || '');
                if (!isNaN(v)) vals.push(v);
            }
        }
        return vals;
    };

    const calcOp = (itemId: string, op: 'sum' | 'sub' | 'mul' | 'avg') => {
        const vals = getSelectedValues(itemId);
        if (vals.length === 0) { setOpsResult({ itemId, text: 'Sin datos', value: '-' }); return; }
        let result = 0;
        let text = '';
        switch (op) {
            case 'sum': result = vals.reduce((a, b) => a + b, 0); text = `SUMA = ${result.toFixed(2)}`; break;
            case 'sub': result = vals.reduce((a, b) => a - b); text = `RESTA = ${result.toFixed(2)}`; break;
            case 'mul': result = vals.reduce((a, b) => a * b, 1); text = `MULT = ${result.toFixed(2)}`; break;
            case 'avg': result = vals.reduce((a, b) => a + b, 0) / vals.length; text = `PROM = ${result.toFixed(2)}`; break;
        }
        setOpsResult({ itemId, text, value: result.toFixed(2) });
        setPlacingResult(true);
    };

    const placeResultInCell = (itemId: string, r: number, c: number) => {
        if (!opsResult || opsResult.itemId !== itemId) return;
        pushHistory();
        updateCurrentBoardItems(prev => prev.map(item => {
            if (item.id !== itemId || !item.tableData) return item;
            const newData = item.tableData.map(row => [...row]);
            while (newData.length <= r) newData.push(Array(item.columns || 4).fill(''));
            newData[r][c] = opsResult.value;
            const newRows = Math.max(item.rows || 3, r + 1);
            return { ...item, tableData: newData, rows: newRows };
        }));
        setOpsResult(null);
        setPlacingResult(false);
    };
    
    const canvasX = useMotionValue(0);
    const canvasY = useMotionValue(0);
    
    // Ctrl+Z Undo functionality
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                setHistory(prev => {
                    if (prev.length === 0) return prev;
                    const newHistory = [...prev];
                    const previousState = newHistory.pop();
                    if (previousState) setBoards(previousState);
                    return newHistory;
                });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Auto-center on initial load
    useEffect(() => {
        canvasX.set(window.innerWidth - 664);
        canvasY.set(window.innerHeight - 650);
    }, [canvasX, canvasY]);

    const pushHistory = () => setHistory(h => [...h, boards]);

    const updateCurrentBoardItems = (newItemsOrUpdater: CanvasItem[] | ((prev: CanvasItem[]) => CanvasItem[])) => {
        setBoards(prev => {
            const prevItems = prev[currentBoardId] || [];
            const nextItems = typeof newItemsOrUpdater === 'function' ? newItemsOrUpdater(prevItems) : newItemsOrUpdater;
            return { ...prev, [currentBoardId]: nextItems };
        });
    };

    const tools = [
        { id: 'note', icon: <StickyNote size={20} />, label: 'Nota' },
        { id: 'text', icon: <MessageSquare size={20} />, label: 'Texto' },
        { id: 'board', icon: <LayoutGrid size={20} />, label: 'Tablero' },
        { id: 'shelf', icon: <Library size={20} />, label: 'Estante' },
        { id: 'table', icon: <TableIcon size={20} />, label: 'Tabla' },
        { id: 'gantt', icon: <BarChartHorizontal size={20} />, label: 'Gantt' },
        { id: 'todo', icon: <CheckSquare size={20} />, label: 'To-do' },
        { id: 'link', icon: <LinkIcon size={20} />, label: 'Enlace' },
        { id: 'line', icon: <Minus size={20} />, label: 'Línea' },
        { id: 'image', icon: <ImageIcon size={20} />, label: 'Imagen' },
    ];

    const centerView = () => {
        animate(canvasX, window.innerWidth - 664, { type: 'spring', stiffness: 300, damping: 30 });
        animate(canvasY, window.innerHeight - 650, { type: 'spring', stiffness: 300, damping: 30 });
    };

    const handleAdd = (type: string) => {
        pushHistory();
        const colors = ['#fde19a', '#f4a3b4', '#a1d4c6', '#b0c4de', '#d3b8ea'];
        const newItem: CanvasItem = {
            id: Date.now().toString(),
            type,
            x: window.innerWidth / 2 - 100 - canvasX.get(),
            y: window.innerHeight / 2 - 100 - canvasY.get(),
            content: type === 'board' ? 'Nuevo Tablero' : (type === 'shelf' ? 'Nuevo Estante' : ''),
            columns: type === 'gantt' ? 13 : (type === 'table' ? 4 : (type === 'shelf' ? 4 : undefined)),
            rows: type === 'gantt' ? 4 : (type === 'table' ? 3 : (type === 'shelf' ? 2 : undefined)),
            tableData: type === 'table' ? Array(3).fill(0).map(() => Array(4).fill('')) : (type === 'gantt' ? Array(4).fill(0).map((_, r) => r === 0 ? ['Tarea', 'Mes 1', 'Sem 1', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom', 'Sem 2', 'Sem 3', 'Sem 4'] : Array(13).fill('')) : undefined),
            color: type === 'board' ? colors[Math.floor(Math.random() * colors.length)] : undefined,
            width: type === 'gantt' ? 800 : (type === 'table' ? 500 : undefined),
            height: (type === 'table' || type === 'gantt') ? 200 : undefined,
            ganttModes: type === 'gantt' ? ['meses'] : undefined,
        };
        updateCurrentBoardItems(prev => [...prev, newItem]);
    };

    const handleUpdateContent = (id: string, newContent: string) => {
        updateCurrentBoardItems(prev => prev.map(item => item.id === id ? { ...item, content: newContent } : item));
    };

    const handleUpdateTableDims = (id: string, dim: 'row' | 'col', delta: number) => {
        pushHistory();
        updateCurrentBoardItems(prev => prev.map(item => {
            if (item.id === id && (item.type === 'table' || item.type === 'shelf' || item.type === 'gantt')) {
                const currentRows = item.rows || 1;
                const currentCols = item.columns || 1;
                let newRows = currentRows;
                let newCols = currentCols;
                
                if (dim === 'row') {
                    newRows = Math.max(1, currentRows + delta);
                } else if (dim === 'col') {
                    newCols = Math.max(1, currentCols + delta);
                }

                if (item.type === 'table' || item.type === 'gantt') {
                    let newData = [...(item.tableData || [])].map(row => [...row]);
                    let newWidths = item.columnWidths ? [...item.columnWidths] : undefined;
                    let newTableWidth = item.width || 500;

                    if (dim === 'row') {
                        if (delta > 0) newData.push(Array(newCols).fill(''));
                        else if (delta < 0 && newData.length > 1) newData.pop();
                    } else if (dim === 'col') {
                        if (delta > 0) {
                            newData.forEach(row => row.push(''));
                            const addedWidth = newWidths ? 100 : (newTableWidth / currentCols);
                            if (newWidths) newWidths.push(100);
                            newTableWidth += addedWidth;
                        }
                        else if (delta < 0 && newCols >= 1) {
                            newData.forEach(row => row.pop());
                            const removedWidth = newWidths ? (newWidths.pop() || 100) : (newTableWidth / currentCols);
                            newTableWidth = Math.max(200, newTableWidth - removedWidth);
                        }
                    }
                    return { ...item, rows: newRows, columns: newCols, tableData: newData, columnWidths: newWidths, width: newTableWidth };
                }

                return { ...item, rows: newRows, columns: newCols };
            }
            return item;
        }));
    };

    const handleInsertTable = (id: string, dim: 'row' | 'col', index: number, position: 'before' | 'after') => {
        pushHistory();
        updateCurrentBoardItems(prev => prev.map(item => {
            if (item.id === id && (item.type === 'table' || item.type === 'gantt')) {
                let newData = [...(item.tableData || [])].map(row => [...row]);
                let newWidths = item.columnWidths ? [...item.columnWidths] : undefined;
                let newRows = item.rows || 1;
                let newCols = item.columns || 1;
                let newWidth = item.width || 500;

                if (dim === 'row') {
                    const insertAt = position === 'before' ? index : index + 1;
                    newData.splice(insertAt, 0, Array(newCols).fill(''));
                    newRows++;
                } else if (dim === 'col') {
                    const insertAt = position === 'before' ? index : index + 1;
                    newData.forEach(row => {
                        row.splice(insertAt, 0, '');
                    });
                    const addedWidth = newWidths ? 100 : (newWidth / newCols);
                    if (newWidths) {
                        newWidths.splice(insertAt, 0, 100);
                    }
                    newCols++;
                    newWidth += addedWidth;
                }
                return { ...item, rows: newRows, columns: newCols, tableData: newData, columnWidths: newWidths, width: newWidth };
            }
            return item;
        }));
        setTableContextMenu(null);
    };

    const handleDeleteTableDim = (id: string, dim: 'row' | 'col', index: number) => {
        pushHistory();
        updateCurrentBoardItems(prev => prev.map(item => {
            if (item.id === id && (item.type === 'table' || item.type === 'gantt')) {
                let newData = [...(item.tableData || [])].map(row => [...row]);
                let newWidths = item.columnWidths ? [...item.columnWidths] : undefined;
                let newRows = item.rows || 1;
                let newCols = item.columns || 1;
                let newWidth = item.width || 500;

                if (dim === 'row' && newRows > 1) {
                    newData.splice(index, 1);
                    newRows--;
                } else if (dim === 'col' && newCols > 1) {
                    newData.forEach(row => {
                        row.splice(index, 1);
                    });
                    const removedWidth = newWidths ? newWidths[index] : (newWidth / newCols);
                    if (newWidths) {
                        newWidths.splice(index, 1);
                    }
                    newCols--;
                    newWidth = Math.max(200, newWidth - removedWidth);
                }
                return { ...item, rows: newRows, columns: newCols, tableData: newData, columnWidths: newWidths, width: newWidth };
            }
            return item;
        }));
        setTableContextMenu(null);
    };

    const handleUpdateTableCell = (id: string, rIndex: number, cIndex: number, text: string) => {
        updateCurrentBoardItems(prev => prev.map(item => {
            if (item.id === id && item.tableData) {
                const newData = [...item.tableData];
                newData[rIndex] = [...newData[rIndex]];
                newData[rIndex][cIndex] = text;
                return { ...item, tableData: newData };
            }
            return item;
        }));
    };

    const handleToggleGanttMode = (id: string, mode: 'dias' | 'semanas' | 'meses') => {
        pushHistory();
        updateCurrentBoardItems(prev => prev.map(item => {
            if (item.id === id && item.type === 'gantt') {
                const currentModes = item.ganttModes || ['semanas'];
                const hasMode = currentModes.includes(mode);
                let newModes;

                if (hasMode) {
                    if (currentModes.length > 0) { 
                        newModes = currentModes.filter(m => m !== mode);
                    } else {
                        newModes = currentModes; 
                    }
                } else {
                    const order = { 'meses': 0, 'semanas': 1, 'dias': 2 };
                    newModes = [...currentModes, mode].sort((a, b) => order[a] - order[b]);
                }

                return { ...item, ganttModes: newModes };
            }
            return item;
        }));
    };

    const handleDeleteItem = (id: string) => {
        pushHistory();
        updateCurrentBoardItems(prev => prev.filter(item => item.id !== id));
    };

    const handleResizeItem = (id: string, dw: number, dh: number) => {
        updateCurrentBoardItems(prev => prev.map(item => {
            if (item.id === id) {
                return {
                    ...item,
                    width: Math.max(200, (item.width || 500) + dw),
                    height: Math.max(80, (item.height || 200) + dh)
                };
            }
            return item;
        }));
    };

    const handleResizeColumn = (id: string, colIndex: number, dx: number) => {
        updateCurrentBoardItems(prev => prev.map(item => {
            if (item.id === id && (item.type === 'table' || item.type === 'gantt')) {
                let currentWidths = item.columnWidths;
                if (!currentWidths) {
                    const defaultColW = (item.width || 500) / (item.columns || 4);
                    currentWidths = Array(item.columns || 4).fill(defaultColW);
                }
                const newWidths = [...currentWidths];
                const oldWidth = newWidths[colIndex];
                newWidths[colIndex] = Math.max(40, newWidths[colIndex] + dx);
                const diff = newWidths[colIndex] - oldWidth;
                return { 
                    ...item, 
                    columnWidths: newWidths, 
                    width: (item.width || 500) + diff 
                };
            }
            return item;
        }));
    };

    const handleEnterBoard = (boardId: string, boardName: string) => {
        setCurrentBoardId(boardId);
        setBoardPath(prev => [...prev, { id: boardId, name: boardName }]);
        canvasX.set(window.innerWidth - 664);
        canvasY.set(window.innerHeight - 650);
    };

    const handleNavigateToBreadcrumb = (idx: number) => {
        const crumb = boardPath[idx];
        setCurrentBoardId(crumb.id);
        setBoardPath(prev => prev.slice(0, idx + 1));
        canvasX.set(window.innerWidth - 664);
        canvasY.set(window.innerHeight - 650);
    };

    return (
        <div style={{
            position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#f4f5f5', display: 'flex'
        }}>
            {/* Sidebar */}
            <div style={{
                width: '64px', height: '100%', backgroundColor: '#ffffff', borderRight: '1px solid #e2e4e6',
                display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px', gap: '16px', zIndex: 10, boxShadow: '2px 0 8px rgba(0,0,0,0.05)'
            }}>
                {tools.map(tool => (
                    <button
                        key={tool.id} onClick={() => handleAdd(tool.id)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: '4px', color: '#5e6c84', fontSize: '0.65rem', padding: '8px', borderRadius: '8px', transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f2f4'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        {tool.icon}
                        <span>{tool.label}</span>
                    </button>
                ))}
            </div>

            <div style={{
                flex: 1, position: 'relative', overflow: 'hidden', backgroundImage: 'radial-gradient(#d5d7d8 1.5px, transparent 1.5px)', backgroundSize: '24px 24px'
            }}>
                {/* Breadcrumbs Navigation */}
                <div style={{
                    position: 'absolute', top: '16px', left: '16px', zIndex: 20, display: 'flex', gap: '8px', alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.95)', padding: '8px 16px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}>
                    {boardPath.map((crumb, idx) => (
                        <div key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {idx > 0 && <span style={{ color: '#a5adba', fontSize: '1.2rem', lineHeight: 1 }}>/</span>}
                            <button 
                                onClick={() => handleNavigateToBreadcrumb(idx)}
                                style={{ 
                                    background: 'none', border: 'none', cursor: 'pointer', 
                                    fontWeight: idx === boardPath.length - 1 ? 700 : 500, 
                                    color: idx === boardPath.length - 1 ? '#172b4d' : '#5e6c84', 
                                    fontSize: '0.95rem',
                                    transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#172b4d'}
                                onMouseLeave={(e) => e.currentTarget.style.color = idx === boardPath.length - 1 ? '#172b4d' : '#5e6c84'}
                            >
                                {crumb.name}
                            </button>
                        </div>
                    ))}
                </div>

                <motion.div 
                    drag
                    style={{
                        position: 'absolute', top: '-1500px', left: '-1500px', width: '4000px', height: '4000px', cursor: 'grab', x: canvasX, y: canvasY
                    }}
                    dragConstraints={{ left: -3000, right: 3000, top: -3000, bottom: 3000 }}
                    whileTap={{ cursor: 'grabbing' }}
                >
                    {/* Origin Marker */}
                    <div style={{
                        position: 'absolute',
                        left: '2000px',
                        top: '2000px',
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        opacity: 0.3,
                        gap: '8px'
                    }}>
                        <Target size={32} color="#5e6c84" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5e6c84', letterSpacing: '2px' }}>ORIGEN</span>
                    </div>

                    {/* Sort items so shelves are always rendered behind other items */}
                    {items.slice().sort((a, b) => (a.type === 'shelf' && b.type !== 'shelf' ? -1 : (a.type !== 'shelf' && b.type === 'shelf' ? 1 : 0))).map(item => (
                        <motion.div
                            key={item.id}
                            drag
                            dragMomentum={false}
                            animate={{ x: item.x + 1500, y: item.y + 1500 }}
                            onDragStart={() => pushHistory()}
                            onDragEnd={(_e, info) => {
                                let newX = item.x + info.offset.x;
                                let newY = item.y + info.offset.y;

                                if (item.type === 'board') {
                                    const itemCenterX = newX + 60;
                                    const itemCenterY = newY + 70;

                                    for (const shelf of items) {
                                        if (shelf.type === 'shelf') {
                                            const shelfWidth = 136 * (shelf.columns || 4) + 16;
                                            const shelfHeight = 156 * (shelf.rows || 2) + 66;

                                            if (itemCenterX >= shelf.x && itemCenterX <= shelf.x + shelfWidth &&
                                                itemCenterY >= shelf.y && itemCenterY <= shelf.y + shelfHeight) {
                                                
                                                const relX = itemCenterX - (shelf.x + 16);
                                                const relY = itemCenterY - (shelf.y + 66);
                                                
                                                let c = Math.floor(relX / 136);
                                                let r = Math.floor(relY / 156);
                                                
                                                c = Math.max(0, Math.min(c, (shelf.columns || 4) - 1));
                                                r = Math.max(0, Math.min(r, (shelf.rows || 2) - 1));
                                                
                                                newX = shelf.x + 16 + c * 136;
                                                newY = shelf.y + 66 + r * 156;
                                                break;
                                            }
                                        }
                                    }
                                }

                                updateCurrentBoardItems(prev => prev.map(i => i.id === item.id ? { ...i, x: newX, y: newY } : i));
                            }}
                            onDoubleClick={() => {
                                if (item.type === 'board') {
                                    handleEnterBoard(item.id, item.content || 'Nuevo Tablero');
                                }
                            }}
                            style={{
                                position: 'absolute',
                                backgroundColor: item.type === 'board' || item.type === 'table' || item.type === 'gantt' ? 'transparent' : (item.type === 'shelf' ? 'rgba(255, 255, 255, 0.5)' : (item.type === 'note' ? '#fff9b1' : 'white')),
                                backdropFilter: item.type === 'shelf' ? 'blur(4px)' : 'none',
                                padding: (item.type === 'board' || item.type === 'shelf' || item.type === 'table' || item.type === 'gantt') ? '0' : '16px', 
                                borderRadius: item.type === 'board' ? '0' : (item.type === 'shelf' ? '24px' : '12px'), 
                                boxShadow: item.type === 'board' || item.type === 'shelf' || item.type === 'table' || item.type === 'gantt' ? 'none' : '0 8px 24px rgba(0,0,0,0.08)',
                                minWidth: (item.type === 'table' || item.type === 'gantt') ? `${item.width || 500}px` : (item.type === 'board' ? '120px' : (item.type === 'shelf' ? undefined : '220px')), 
                                width: item.type === 'shelf' ? `${(item.columns || 4) * 136 + 16}px` : ((item.type === 'table' || item.type === 'gantt') ? `${item.width || 500}px` : undefined),
                                minHeight: (item.type === 'table' || item.type === 'gantt') ? `${item.height || 200}px` : (item.type === 'board' ? '140px' : undefined), 
                                height: item.type === 'shelf' ? `${(item.rows || 2) * 156 + 66}px` : undefined,
                                cursor: 'grab',
                                border: item.type === 'board' ? 'none' : (item.type === 'shelf' ? '2px dashed #cbd5e1' : '1px solid rgba(0,0,0,0.05)'), 
                                display: 'flex', 
                                flexDirection: 'column',
                                alignItems: item.type === 'board' ? 'center' : 'stretch'
                            }}
                        >
                            {item.type === 'board' ? (
                                // Milanote-style board folder icon
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                                    <div style={{ width: '80px', height: '80px', position: 'relative' }}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }} 
                                            onPointerDownCapture={(e) => e.stopPropagation()} 
                                            style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'white', border: '1px solid #ddd', borderRadius: '50%', padding: '4px', cursor: 'pointer', color: '#a5adba', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                                            onMouseEnter={(e) => e.currentTarget.style.color = '#172b4d'} 
                                            onMouseLeave={(e) => e.currentTarget.style.color = '#a5adba'}
                                        >
                                            <MoreHorizontal size={14} />
                                        </button>
                                        {activeMenuId === item.id && (
                                            <>
                                                <div 
                                                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} 
                                                    onPointerDownCapture={(e) => e.stopPropagation()}
                                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, background: 'transparent' }} 
                                                />
                                                <div 
                                                    onPointerDownCapture={(e) => e.stopPropagation()}
                                                    style={{ 
                                                        position: 'absolute', left: '60px', top: '24px', 
                                                        backgroundColor: 'white', border: '1px solid #e2e8f0', 
                                                        borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', 
                                                        padding: '4px', zIndex: 100, minWidth: '130px',
                                                        display: 'flex', flexDirection: 'column', gap: '2px'
                                                    }}
                                                >
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', fontSize: '0.8rem', color: '#334155', border: 'none', background: 'transparent', width: '100%', cursor: 'pointer', borderRadius: '4px', textAlign: 'left', fontWeight: 500 }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        <Copy size={13} /> Duplicar
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); setActiveMenuId(null); }}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', fontSize: '0.8rem', color: '#ef4444', border: 'none', background: 'transparent', width: '100%', cursor: 'pointer', borderRadius: '4px', textAlign: 'left', fontWeight: 500 }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        <Trash2 size={13} /> Eliminar
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                        <div style={{ 
                                            width: '80px', height: '80px', backgroundColor: item.color || '#fde19a', 
                                            borderRadius: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', 
                                            boxShadow: '0 6px 16px rgba(0,0,0,0.1)', transition: 'transform 0.2s' 
                                        }}>
                                            <LayoutGrid size={32} color="rgba(0,0,0,0.6)" />
                                        </div>
                                    </div>
                                    <input 
                                        value={item.content} 
                                        onChange={(e) => handleUpdateContent(item.id, e.target.value)}
                                        onFocus={() => pushHistory()}
                                        placeholder="Nuevo Tablero"
                                        style={{ 
                                            border: 'none', background: 'transparent', textAlign: 'center', 
                                            fontWeight: 600, color: '#172b4d', fontSize: '0.95rem', outline: 'none', width: '100%' 
                                        }}
                                        onPointerDownCapture={(e) => e.stopPropagation()}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: '#5e6c84', fontWeight: 500 }}>
                                        {(boards[item.id] || []).length} elementos
                                    </span>
                                </div>
                            ) : item.type === 'shelf' ? (
                                // Shelf container grouping visuals
                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px 0 24px', height: '50px' }}>
                                        <input 
                                            value={item.content} 
                                            onChange={(e) => handleUpdateContent(item.id, e.target.value)}
                                            onFocus={() => pushHistory()}
                                            placeholder="Nombre del estante"
                                            style={{ border: 'none', background: 'transparent', fontWeight: 800, fontSize: '1.25rem', color: '#64748b', outline: 'none', flex: 1 }}
                                            onPointerDownCapture={(e) => e.stopPropagation()}
                                        />
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                                                    <span>Ancho:</span>
                                                    <button onClick={() => handleUpdateTableDims(item.id, 'col', -1)} onPointerDownCapture={(e) => e.stopPropagation()} style={{ padding: '2px 8px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white' }}>-</button>
                                                    <button onClick={() => handleUpdateTableDims(item.id, 'col', 1)} onPointerDownCapture={(e) => e.stopPropagation()} style={{ padding: '2px 8px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white' }}>+</button>
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                                                    <span>Alto:</span>
                                                    <button onClick={() => handleUpdateTableDims(item.id, 'row', -1)} onPointerDownCapture={(e) => e.stopPropagation()} style={{ padding: '2px 8px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white' }}>-</button>
                                                    <button onClick={() => handleUpdateTableDims(item.id, 'row', 1)} onPointerDownCapture={(e) => e.stopPropagation()} style={{ padding: '2px 8px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white' }}>+</button>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }} 
                                                onPointerDownCapture={(e) => e.stopPropagation()} 
                                                style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', height: '24px' }} 
                                                onMouseEnter={(e) => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.backgroundColor = '#f8fafc'; }} 
                                                onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.backgroundColor = 'white'; }}
                                            >
                                                <MoreHorizontal size={16} />
                                            </button>
                                            {activeMenuId === item.id && (
                                                <>
                                                    <div 
                                                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} 
                                                        onPointerDownCapture={(e) => e.stopPropagation()}
                                                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, background: 'transparent' }} 
                                                    />
                                                    <div 
                                                        onPointerDownCapture={(e) => e.stopPropagation()}
                                                        style={{ 
                                                            position: 'absolute', right: '0px', top: '24px', 
                                                            backgroundColor: 'white', border: '1px solid #e2e8f0', 
                                                            borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', 
                                                            padding: '4px', zIndex: 100, minWidth: '130px',
                                                            display: 'flex', flexDirection: 'column', gap: '2px'
                                                        }}
                                                    >
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', fontSize: '0.8rem', color: '#334155', border: 'none', background: 'transparent', width: '100%', cursor: 'pointer', borderRadius: '4px', textAlign: 'left', fontWeight: 500 }}
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                        >
                                                            <Copy size={13} /> Duplicar
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); setActiveMenuId(null); }}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', fontSize: '0.8rem', color: '#ef4444', border: 'none', background: 'transparent', width: '100%', cursor: 'pointer', borderRadius: '4px', textAlign: 'left', fontWeight: 500 }}
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                        >
                                                            <Trash2 size={13} /> Eliminar
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: `repeat(${item.columns || 4}, 120px)`,
                                        gridTemplateRows: `repeat(${item.rows || 2}, 140px)`,
                                        gap: '16px',
                                        padding: '16px',
                                        pointerEvents: 'none'
                                    }}>
                                        {Array.from({ length: (item.columns || 4) * (item.rows || 2) }).map((_, i) => (
                                            <div key={i} style={{
                                                border: '2px dashed rgba(0,0,0,0.1)',
                                                borderRadius: '24px',
                                                width: '100%',
                                                height: '100%',
                                                backgroundColor: 'rgba(255,255,255,0.4)'
                                            }} />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Standard Drag Handle */}
                                    <div style={{ 
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                        marginBottom: (item.type === 'table' || item.type === 'gantt') ? '8px' : '12px', 
                                        borderBottom: (item.type === 'table' || item.type === 'gantt') ? 'none' : '1px solid rgba(0,0,0,0.05)',
                                        backgroundColor: (item.type === 'table' || item.type === 'gantt') ? 'white' : 'transparent',
                                        padding: (item.type === 'table' || item.type === 'gantt') ? '8px 12px' : '0 0 12px 0',
                                        borderRadius: (item.type === 'table' || item.type === 'gantt') ? '8px' : '0',
                                        boxShadow: (item.type === 'table' || item.type === 'gantt') ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                                    }}>
                                        <div style={{ fontWeight: 700, color: '#172b4d', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                            {item.type}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
                                            {(item.type === 'table' || item.type === 'gantt') && (
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    {item.type === 'gantt' && (
                                                        <div style={{ display: 'flex', backgroundColor: '#f8fafc', borderRadius: '6px', padding: '2px 8px', gap: '12px', border: '1px solid #e2e8f0' }}>
                                                            {[
                                                                { id: 'meses', label: 'Meses' },
                                                                { id: 'semanas', label: 'Semanas' },
                                                                { id: 'dias', label: 'Días' }
                                                            ].map(mode => {
                                                                const isActive = (item.ganttModes || ['semanas']).includes(mode.id as any);
                                                                return (
                                                                    <label
                                                                        key={mode.id}
                                                                        style={{
                                                                            display: 'flex', alignItems: 'center', gap: '4px',
                                                                            cursor: 'pointer', fontSize: '0.7rem', 
                                                                            color: isActive ? '#0f172a' : '#64748b', 
                                                                            fontWeight: isActive ? 600 : 500
                                                                        }}
                                                                        onPointerDownCapture={(e) => e.stopPropagation()}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isActive}
                                                                            onChange={() => handleToggleGanttMode(item.id, mode.id as any)}
                                                                            style={{ margin: 0, cursor: 'pointer' }}
                                                                        />
                                                                        {mode.label}
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.75rem', color: '#5e6c84' }}>
                                                        <span>Filas:</span>
                                                        <button onClick={() => handleUpdateTableDims(item.id, 'row', -1)} onPointerDownCapture={(e) => e.stopPropagation()} style={{ padding: '2px 8px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ddd', background: 'white' }}>-</button>
                                                        <button onClick={() => handleUpdateTableDims(item.id, 'row', 1)} onPointerDownCapture={(e) => e.stopPropagation()} style={{ padding: '2px 8px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ddd', background: 'white' }}>+</button>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.75rem', color: '#5e6c84' }}>
                                                        <span>Cols:</span>
                                                        <button onClick={() => handleUpdateTableDims(item.id, 'col', -1)} onPointerDownCapture={(e) => e.stopPropagation()} style={{ padding: '2px 8px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ddd', background: 'white' }}>-</button>
                                                        <button onClick={() => handleUpdateTableDims(item.id, 'col', 1)} onPointerDownCapture={(e) => e.stopPropagation()} style={{ padding: '2px 8px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ddd', background: 'white' }}>+</button>
                                                    </div>
                                                </div>
                                            )}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }} 
                                                onPointerDownCapture={(e) => e.stopPropagation()} 
                                                style={{ background: 'white', border: '1px solid #ddd', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', color: '#5e6c84', display: 'flex', alignItems: 'center', height: '24px' }} 
                                                onMouseEnter={(e) => { e.currentTarget.style.color = '#172b4d'; e.currentTarget.style.backgroundColor = '#f4f5f7'; }} 
                                                onMouseLeave={(e) => { e.currentTarget.style.color = '#5e6c84'; e.currentTarget.style.backgroundColor = 'white'; }}
                                            >
                                                <MoreHorizontal size={16} />
                                            </button>
                                            {activeMenuId === item.id && (
                                                <>
                                                    <div 
                                                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} 
                                                        onPointerDownCapture={(e) => e.stopPropagation()}
                                                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, background: 'transparent' }} 
                                                    />
                                                    <div 
                                                        onPointerDownCapture={(e) => e.stopPropagation()}
                                                        style={{ 
                                                            position: 'absolute', right: '0px', top: '24px', 
                                                            backgroundColor: 'white', border: '1px solid #e2e8f0', 
                                                            borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', 
                                                            padding: '4px', zIndex: 100, minWidth: '130px',
                                                            display: 'flex', flexDirection: 'column', gap: '2px'
                                                        }}
                                                    >
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', fontSize: '0.8rem', color: '#334155', border: 'none', background: 'transparent', width: '100%', cursor: 'pointer', borderRadius: '4px', textAlign: 'left', fontWeight: 500 }}
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                        >
                                                            <Copy size={13} /> Duplicar
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); setActiveMenuId(null); }}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', fontSize: '0.8rem', color: '#ef4444', border: 'none', background: 'transparent', width: '100%', cursor: 'pointer', borderRadius: '4px', textAlign: 'left', fontWeight: 500 }}
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                        >
                                                            <Trash2 size={13} /> Eliminar
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {item.type === 'table' || item.type === 'gantt' ? (
                                        <div style={{ flex: 1, overflowX: item.type === 'gantt' ? 'auto' : 'hidden', overflowY: 'hidden', position: 'relative', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                            {/* Operations Bar */}
                                            {item.type === 'table' && (cellSelection?.itemId === item.id || opsResult?.itemId === item.id) && (
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    padding: '6px 10px', background: '#fffbeb',
                                                    borderBottom: '1px solid #fde68a', flexShrink: 0
                                                }}>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#92400e', marginRight: '4px' }}>OPS:</span>
                                                    {[
                                                        { id: 'sum' as const, icon: <Sigma size={14} />, label: 'Suma' },
                                                        { id: 'sub' as const, icon: <TrendingDown size={14} />, label: 'Resta' },
                                                        { id: 'mul' as const, icon: <TrendingUp size={14} />, label: 'Mult' },
                                                        { id: 'avg' as const, icon: <Divide size={14} />, label: 'Prom' },
                                                    ].map(btn => (
                                                        <button
                                                            key={btn.id}
                                                            onClick={() => calcOp(item.id, btn.id)}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '3px',
                                                                padding: '3px 8px', borderRadius: '6px', border: '1px solid #fcd34d',
                                                                background: '#fff', cursor: 'pointer', fontSize: '0.7rem',
                                                                fontWeight: 700, color: '#92400e', fontFamily: 'inherit'
                                                            }}
                                                        >
                                                            {btn.icon} {btn.label}
                                                        </button>
                                                    ))}
                                                    {opsResult?.itemId === item.id && (
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#065f46', marginLeft: '4px', background: '#d1fae5', padding: '2px 8px', borderRadius: '6px' }}>
                                                            {opsResult.text}
                                                            {placingResult && <span style={{ fontWeight: 600, marginLeft: '6px', color: '#92400e' }}>Click en celda destino</span>}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => { setCellSelection(null); setOpsResult(null); }}
                                                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#b45309', display: 'flex' }}
                                                    >
                                                        <XIcon size={14} />
                                                    </button>
                                                </div>
                                            )}
                                            <table style={{ borderCollapse: 'collapse', width: item.type === 'gantt' ? 'max-content' : '100%', tableLayout: item.type === 'gantt' ? 'auto' : 'fixed' }}>
                                                <tbody>
                                                    {Array.from({ length: item.rows || 3 }).map((_, rIndex) => (
                                                        <tr key={rIndex}>
                                                            {Array.from({ length: item.columns || 4 }).map((_, cIndex) => {
                                                                if (item.type === 'gantt') {
                                                                    const headerText = item.tableData?.[0]?.[cIndex] || '';
                                                                    const isMes = headerText.toLowerCase().startsWith('mes');
                                                                    const isSem = headerText.toLowerCase().startsWith('sem');
                                                                    const isDia = ['lun', 'mar', 'mié', 'mie', 'jue', 'vie', 'sáb', 'sab', 'dom', 'día', 'dia'].some(d => headerText.toLowerCase().startsWith(d));
                                                                    const modes = item.ganttModes || ['semanas'];
                                                                    
                                                                    if (isMes && !modes.includes('meses')) return null;
                                                                    if (isSem && !modes.includes('semanas')) return null;
                                                                    if (isDia && !modes.includes('dias')) return null;
                                                                }

                                                                const isHeader = rIndex === 0;
                                                                const isSelected = item.type === 'table' && cellSelection?.itemId === item.id &&
                                                                    rIndex >= Math.min(cellSelection.startR, cellSelection.endR) &&
                                                                    rIndex <= Math.max(cellSelection.startR, cellSelection.endR) &&
                                                                    cIndex >= Math.min(cellSelection.startC, cellSelection.endC) &&
                                                                    cIndex <= Math.max(cellSelection.startC, cellSelection.endC);
                                                                return (
                                                                <td 
                                                                    key={cIndex} 
                                                                    onClick={(e) => {
                                                                        if (item.type !== 'table') return;
                                                                        if (placingResult && opsResult?.itemId === item.id) {
                                                                            placeResultInCell(item.id, rIndex, cIndex);
                                                                            return;
                                                                        }
                                                                        if (e.shiftKey && cellSelection?.itemId === item.id) {
                                                                            setCellSelection(prev => prev ? { ...prev, endR: rIndex, endC: cIndex } : null);
                                                                        } else {
                                                                            setCellSelection({ itemId: item.id, startR: rIndex, startC: cIndex, endR: rIndex, endC: cIndex });
                                                                        }
                                                                        setOpsResult(null);
                                                                        setPlacingResult(false);
                                                                    }}
                                                                    onContextMenu={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setTableContextMenu({ id: item.id, r: rIndex, c: cIndex, x: e.clientX, y: e.clientY });
                                                                    }}
                                                                    style={{ border: `1px solid ${isSelected ? '#f59e0b' : '#e2e8f0'}`, padding: 0, verticalAlign: 'top', width: item.columnWidths?.[cIndex] ? `${item.columnWidths[cIndex]}px` : (item.type === 'gantt' ? (cIndex === 0 ? '200px' : '100px') : 'auto'), position: 'relative', minWidth: item.type === 'gantt' ? (cIndex === 0 ? '200px' : '100px') : undefined, background: isSelected ? '#fef3c7' : 'inherit' }}
                                                                >
                                                                    <div style={{ display: 'grid', width: '100%', minHeight: isHeader ? '32px' : '28px' }}>
                                                                        <div style={{ 
                                                                            visibility: 'hidden', 
                                                                            whiteSpace: 'pre-wrap', 
                                                                            wordBreak: 'break-word', 
                                                                            gridArea: '1 / 1 / 2 / 2',
                                                                            padding: '4px 8px',
                                                                            fontSize: isHeader ? '0.75rem' : '0.85rem',
                                                                            fontFamily: 'inherit',
                                                                            fontWeight: isHeader ? 700 : (item.type === 'gantt' && cIndex === 0 ? 600 : 400),
                                                                            lineHeight: '1.4'
                                                                        }}>
                                                                            {item.tableData?.[rIndex]?.[cIndex] === '' && isHeader ? (item.type === 'gantt' && cIndex === 0 ? 'Tarea\n' : `Col ${cIndex + 1}\n`) : (item.tableData?.[rIndex]?.[cIndex] || '') + '\n'}
                                                                        </div>
                                                                        <textarea 
                                                                            value={item.tableData?.[rIndex]?.[cIndex] || ''}
                                                                            onChange={(e) => handleUpdateTableCell(item.id, rIndex, cIndex, e.target.value)}
                                                                            onFocus={() => pushHistory()}
                                                                            placeholder={isHeader ? (item.type === 'gantt' && cIndex === 0 ? 'Tarea' : `Col ${cIndex + 1}`) : ''}
                                                                            style={{ 
                                                                                gridArea: '1 / 1 / 2 / 2',
                                                                                width: '100%', height: '100%', 
                                                                                resize: 'none', border: 'none', padding: '4px 8px', 
                                                                                background: isHeader ? (item.type === 'gantt' ? '#dbeafe' : '#f1f5f9') : (item.type === 'gantt' && cIndex === 0 ? '#f8fafc' : 'transparent'), 
                                                                                outline: 'none', fontFamily: 'inherit', 
                                                                                fontSize: isHeader ? '0.75rem' : '0.85rem',
                                                                                fontWeight: isHeader ? 700 : (item.type === 'gantt' && cIndex === 0 ? 600 : 400),
                                                                                color: isHeader ? (item.type === 'gantt' ? '#1e40af' : '#475569') : '#333',
                                                                                lineHeight: '1.4',
                                                                                overflow: 'hidden'
                                                                            }}
                                                                            onPointerDownCapture={(e) => e.stopPropagation()}
                                                                        />
                                                                    </div>
                                                                    {rIndex === 0 && (
                                                                        <motion.div
                                                                            drag="x"
                                                                            dragMomentum={false}
                                                                            onDrag={(_e, info) => handleResizeColumn(item.id, cIndex, info.delta.x)}
                                                                            onPointerDownCapture={(e) => e.stopPropagation()}
                                                                            style={{
                                                                                position: 'absolute', right: -3, top: 0, bottom: 0, width: 6, cursor: 'col-resize', zIndex: 10
                                                                            }}
                                                                        />
                                                                    )}
                                                                </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {/* Resize handle bottom-right */}
                                            <motion.div
                                                drag
                                                dragMomentum={false}
                                                onDrag={(_e, info) => handleResizeItem(item.id, info.delta.x, info.delta.y)}
                                                onPointerDownCapture={(e) => e.stopPropagation()}
                                                style={{
                                                    position: 'absolute', bottom: 0, right: 0,
                                                    width: '20px', height: '20px',
                                                    cursor: 'se-resize', zIndex: 5,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                <div style={{
                                                    width: '8px', height: '8px',
                                                    borderRight: '2.5px solid #a5adba',
                                                    borderBottom: '2.5px solid #a5adba',
                                                    borderRadius: '1px'
                                                }} />
                                            </motion.div>
                                        </div>
                                    ) : (
                                        <textarea
                                            value={item.content}
                                            onChange={(e) => handleUpdateContent(item.id, e.target.value)}
                                            onFocus={() => pushHistory()}
                                            placeholder="Escribe aquí..."
                                            style={{ width: '100%', flex: 1, minHeight: '100px', resize: 'vertical', border: 'none', background: 'transparent', outline: 'none', fontFamily: 'inherit', fontSize: '0.95rem', color: '#333', lineHeight: '1.5' }}
                                            onPointerDownCapture={(e) => e.stopPropagation()}
                                        />
                                    )}
                                </>
                            )}
                        </motion.div>
                    ))}
                </motion.div>

                <button
                    onClick={centerView}
                    style={{
                        position: 'absolute', bottom: '24px', right: '24px', width: '50px', height: '50px', borderRadius: '25px',
                        backgroundColor: '#ffffff', border: '1px solid #e2e4e6', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5e6c84', zIndex: 20
                    }}
                    title="Centrar lienzo"
                >
                    <Target size={24} />
                </button>

                {tableContextMenu && (
                    <>
                        <div 
                            style={{ position: 'fixed', inset: 0, zIndex: 1000 }} 
                            onClick={() => setTableContextMenu(null)}
                            onContextMenu={(e) => { e.preventDefault(); setTableContextMenu(null); }}
                        />
                        <div 
                            style={{ 
                                position: 'fixed', left: tableContextMenu.x, top: tableContextMenu.y, zIndex: 1001,
                                background: 'white', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
                                padding: '4px', display: 'flex', flexDirection: 'column', gap: '2px',
                                border: '1px solid #e2e8f0', minWidth: '220px'
                            }}
                        >
                            <div style={{ padding: '4px 8px', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Fila {tableContextMenu.r + 1}</div>
                            <button 
                                onClick={() => handleInsertTable(tableContextMenu.id, 'row', tableContextMenu.r, 'before')}
                                style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', fontSize: '0.85rem', color: '#334155', border: 'none', background: 'transparent', width: '100%', cursor: 'pointer', borderRadius: '4px', textAlign: 'left' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >Insertar fila arriba</button>
                            <button 
                                onClick={() => handleInsertTable(tableContextMenu.id, 'row', tableContextMenu.r, 'after')}
                                style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', fontSize: '0.85rem', color: '#334155', border: 'none', background: 'transparent', width: '100%', cursor: 'pointer', borderRadius: '4px', textAlign: 'left' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >Insertar fila abajo</button>
                            <button 
                                onClick={() => handleDeleteTableDim(tableContextMenu.id, 'row', tableContextMenu.r)}
                                style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', fontSize: '0.85rem', color: '#ef4444', border: 'none', background: 'transparent', width: '100%', cursor: 'pointer', borderRadius: '4px', textAlign: 'left' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >Eliminar fila</button>
                            
                            <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
                            
                            <div style={{ padding: '4px 8px', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Columna {tableContextMenu.c + 1}</div>
                            <button 
                                onClick={() => handleInsertTable(tableContextMenu.id, 'col', tableContextMenu.c, 'before')}
                                style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', fontSize: '0.85rem', color: '#334155', border: 'none', background: 'transparent', width: '100%', cursor: 'pointer', borderRadius: '4px', textAlign: 'left' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >Insertar columna izquierda</button>
                            <button 
                                onClick={() => handleInsertTable(tableContextMenu.id, 'col', tableContextMenu.c, 'after')}
                                style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', fontSize: '0.85rem', color: '#334155', border: 'none', background: 'transparent', width: '100%', cursor: 'pointer', borderRadius: '4px', textAlign: 'left' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >Insertar columna derecha</button>
                            <button 
                                onClick={() => handleDeleteTableDim(tableContextMenu.id, 'col', tableContextMenu.c)}
                                style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', fontSize: '0.85rem', color: '#ef4444', border: 'none', background: 'transparent', width: '100%', cursor: 'pointer', borderRadius: '4px', textAlign: 'left' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >Eliminar columna</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
