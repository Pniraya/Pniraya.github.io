import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Note } from '../types';
import { Icon } from './Icon';

// --- Types ---

interface GraphViewProps {
  notes: Note[];
  onUpdateNotes: (notes: Note[]) => void;
  onSelectNote: (id: string) => void;
  onDeleteNotes: (ids: string[]) => void;
  onDuplicateNotes: (ids: string[]) => void;
}

type ToolMode = 'PAN' | 'SELECT' | 'CONNECT' | 'DEFAULT';

// --- Constants & Styles ---

const NODE_RADIUS = 30;
const SELECTION_COLOR = "#3b82f6";

// --- Helper Functions ---

const getLinkKey = (a: string, b: string) => a < b ? `${a}-${b}` : `${b}-${a}`;

// --- Memoized Sub-Components (Performance Optimization) ---

const StaticConnectionsLayer = React.memo(({ notes, activeDragIds }: { notes: Note[], activeDragIds: Set<string> }) => {
  const connections = useMemo(() => {
    const els: React.ReactNode[] = [];
    const processed = new Set<string>();

    notes.forEach(source => {
      source.links.forEach(targetId => {
        const key = getLinkKey(source.id, targetId);
        if (processed.has(key)) return;
        processed.add(key);

        const target = notes.find(n => n.id === targetId);
        if (!target) return;

        if (activeDragIds.has(source.id) || activeDragIds.has(target.id)) return;

        els.push(
          <g key={key}>
            <line
              x1={source.x} y1={source.y}
              x2={target.x} y2={target.y}
              stroke="#334155"
              strokeWidth="1.5"
              strokeOpacity="0.8"
            />
            <line
              x1={source.x} y1={source.y}
              x2={target.x} y2={target.y}
              stroke="url(#signalGradient)"
              strokeWidth="2"
              className="signal-flow"
              strokeLinecap="round"
              style={{ mixBlendMode: 'plus-lighter' }}
            />
          </g>
        );
      });
    });
    return els;
  }, [notes, activeDragIds]);

  return <g className="connections-static pointer-events-none">{connections}</g>;
});

const DynamicConnectionsLayer = React.memo(({ notes, dragOverrides, activeDragIds }: { 
  notes: Note[], 
  dragOverrides: Map<string, {x: number, y: number}>,
  activeDragIds: Set<string>
}) => {
  if (activeDragIds.size === 0) return null;

  const els: React.ReactNode[] = [];
  const processed = new Set<string>();
  
  const getPos = (id: string, n?: Note) => {
    const override = dragOverrides.get(id);
    if (override) return override;
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  };

  notes.forEach(source => {
    const sourceIsDragging = activeDragIds.has(source.id);
    
    source.links.forEach(targetId => {
      const target = notes.find(n => n.id === targetId);
      if (!target) return;
      
      const targetIsDragging = activeDragIds.has(targetId);
      
      if (!sourceIsDragging && !targetIsDragging) return;

      const key = getLinkKey(source.id, targetId);
      if (processed.has(key)) return;
      processed.add(key);

      const sPos = getPos(source.id, source);
      const tPos = getPos(targetId, target);

      els.push(
        <g key={key}>
          <line
            x1={sPos.x} y1={sPos.y}
            x2={tPos.x} y2={tPos.y}
            stroke="#334155"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />
          <line
            x1={sPos.x} y1={sPos.y}
            x2={tPos.x} y2={tPos.y}
            stroke="url(#signalGradient)"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.5"
          />
        </g>
      );
    });
  });

  return <g className="connections-dynamic pointer-events-none">{els}</g>;
});

const StaticNodesLayer = React.memo(({ notes, activeDragIds, selectedIds, activeId, linkSourceId, mode, onPointerDown, onDoubleClick }: any) => {
  return (
    <g className="nodes-static">
      {notes.map((note: Note) => {
        if (activeDragIds.has(note.id)) return null; 
        
        const isSelected = selectedIds.has(note.id);
        const isActive = activeId === note.id;
        const isSource = linkSourceId === note.id;
        const opacity = (mode === 'CONNECT' && linkSourceId && !isSource) ? 0.4 : 1;

        return (
          <g
            key={note.id}
            transform={`translate(${note.x},${note.y})`}
            onPointerDown={(e) => onPointerDown(e, note)}
            onDoubleClick={(e: React.MouseEvent) => onDoubleClick(e, note)}
            className={`${mode === 'PAN' ? '' : 'cursor-grab'}`}
            style={{ opacity, transition: 'opacity 0.2s' }}
          >
             {(isSelected || isSource) && (
              <circle r="38" fill="none" stroke={isSource ? "#4ade80" : "#ffffff"} strokeWidth="1.5" strokeDasharray={isSource ? "4 4" : "0"} opacity="0.3" className="animate-pulse pointer-events-none"/>
            )}
            <circle r={NODE_RADIUS} fill="url(#nodeGradient)" stroke={isActive ? SELECTION_COLOR : (isSelected ? "#e2e8f0" : "#334155")} strokeWidth={isActive || isSelected ? "2" : "1.5"} className="transition-colors duration-200" />
            <foreignObject x="-15" y="-15" width="30" height="30" className="pointer-events-none">
              <div className="w-full h-full flex items-center justify-center">
                <Icon name={note.isFavorite ? "Star" : "Hexagon"} size={18} className={`${note.isFavorite ? "fill-yellow-500 text-yellow-500" : "text-slate-400"}`} />
              </div>
            </foreignObject>
            <foreignObject x="-70" y="34" width="140" height="30" className="pointer-events-none overflow-visible">
              <div className="flex justify-center">
                  <span className={`text-[10px] bg-slate-900/90 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800/50 truncate max-w-full text-center shadow-sm select-none transition-all ${isSelected ? 'text-blue-200 border-blue-500/30' : ''}`}>
                      {note.title || "Untitled"}
                  </span>
              </div>
            </foreignObject>
          </g>
        );
      })}
    </g>
  );
});

const DynamicNodesLayer = React.memo(({ notes, dragOverrides, onPointerDown, onDoubleClick }: any) => {
  if (dragOverrides.size === 0) return null;

  return (
    <g className="nodes-dynamic">
      {notes.map((note: Note) => {
        const pos = dragOverrides.get(note.id);
        if (!pos) return null; 

        return (
          <g
            key={note.id}
            transform={`translate(${pos.x},${pos.y})`}
            onPointerDown={(e) => onPointerDown(e, note)}
            onDoubleClick={(e: React.MouseEvent) => onDoubleClick(e, note)}
            className="cursor-grabbing"
            style={{ willChange: 'transform' }} 
          >
            <circle r={NODE_RADIUS} fill="url(#nodeGradient)" stroke={SELECTION_COLOR} strokeWidth="2" />
            <foreignObject x="-15" y="-15" width="30" height="30" className="pointer-events-none">
              <div className="w-full h-full flex items-center justify-center">
                <Icon name={note.isFavorite ? "Star" : "Hexagon"} size={18} className={`${note.isFavorite ? "fill-yellow-500 text-yellow-500" : "text-slate-400"}`} />
              </div>
            </foreignObject>
            <foreignObject x="-70" y="34" width="140" height="30" className="pointer-events-none overflow-visible">
              <div className="flex justify-center">
                  <span className="text-[10px] bg-slate-900/90 text-blue-200 px-2 py-0.5 rounded-md border border-blue-500/30 truncate max-w-full text-center shadow-sm select-none">
                      {note.title || "Untitled"}
                  </span>
              </div>
            </foreignObject>
          </g>
        );
      })}
    </g>
  );
});

// --- Main Component ---

export const GraphView: React.FC<GraphViewProps> = React.memo(({ 
  notes, 
  onUpdateNotes, 
  onSelectNote,
  onDeleteNotes,
  onDuplicateNotes 
}) => {
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1200, h: 800 });
  const [mode, setMode] = useState<ToolMode>('DEFAULT');
  const [isLayoutLocked, setIsLayoutLocked] = useState(false);
  
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  
  const [activeDragIds, setActiveDragIds] = useState<Set<string>>(new Set());
  const [dragOverrides, setDragOverrides] = useState<Map<string, {x: number, y: number}>>(new Map());
  
  const [selectionBox, setSelectionBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [selectionMenuPos, setSelectionMenuPos] = useState<{ x: number, y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointerStartPos = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });
  const dragStartOffsets = useRef<Map<string, {dx: number, dy: number}>>(new Map());
  const dragCommitRef = useRef(false);
  const wasNodeSelectedRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedNodeIds.size > 0 && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        
        onDeleteNotes(Array.from(selectedNodeIds));
        setSelectedNodeIds(new Set());
        setSelectionMenuPos(null);
        setActiveNodeId(null);
      }
      if (e.key === 'Escape') {
        setSelectedNodeIds(new Set());
        setActiveNodeId(null);
        setSelectionMenuPos(null);
        setLinkSourceId(null);
        setMode('DEFAULT');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, onDeleteNotes]);

  useEffect(() => {
    if (dragCommitRef.current) {
        setDragOverrides(new Map());
        setActiveDragIds(new Set());
        dragCommitRef.current = false;
    }
  }, [notes]);

  const getPointerPosition = useCallback((evt: React.PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
      x: (evt.clientX - CTM.e) / CTM.a,
      y: (evt.clientY - CTM.f) / CTM.d
    };
  }, []);

  const toScreenCoords = useCallback((svgX: number, svgY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = rect.width / viewBox.w;
    const scaleY = rect.height / viewBox.h;
    return {
      x: (svgX - viewBox.x) * scaleX,
      y: (svgY - viewBox.y) * scaleY
    };
  }, [viewBox]);

  // --- Event Handlers ---

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    
    setActiveNodeId(null);
    setSelectionMenuPos(null);
    if (mode !== 'CONNECT') setLinkSourceId(null);

    const coords = getPointerPosition(e);
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    lastPanPoint.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;

    if (mode === 'SELECT') {
      setSelectionBox({ x: coords.x, y: coords.y, w: 0, h: 0 });
      if (!e.shiftKey) setSelectedNodeIds(new Set());
      isDraggingRef.current = true;
    } 
    else if (mode === 'PAN' || mode === 'DEFAULT') {
      isDraggingRef.current = true;
      if (mode === 'DEFAULT' && !e.shiftKey) {
        setSelectedNodeIds(new Set());
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const coords = getPointerPosition(e);

    if (mode === 'SELECT' && selectionBox) {
      setSelectionBox(prev => prev ? ({ ...prev, w: coords.x - prev.x, h: coords.y - prev.y }) : null);
    }
    else if ((mode === 'PAN' || (mode === 'DEFAULT' && activeDragIds.size === 0))) {
      const dx = e.clientX - lastPanPoint.current.x;
      const dy = e.clientY - lastPanPoint.current.y;
      const clientW = containerRef.current?.clientWidth || 1;
      const scaleX = viewBox.w / clientW;
      
      setViewBox(prev => ({
        ...prev,
        x: prev.x - dx * scaleX,
        y: prev.y - dy * scaleX
      }));
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
    }
    else if (activeDragIds.size > 0 && !isLayoutLocked) {
      const newOverrides = new Map(dragOverrides);
      let changed = false;

      activeDragIds.forEach(id => {
        const offset = dragStartOffsets.current.get(id);
        if (offset) {
          const newX = coords.x - offset.dx;
          const newY = coords.y - offset.dy;
          newOverrides.set(id, { x: newX, y: newY });
          changed = true;
        }
      });
      
      if (changed) setDragOverrides(newOverrides);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    isDraggingRef.current = false;

    if (activeDragIds.size > 0) {
      const updates: Note[] = [];
      dragOverrides.forEach((pos, id) => {
        const note = notes.find(n => n.id === id);
        if (note) {
          updates.push({ ...note, x: pos.x, y: pos.y });
        }
      });
      
      if (updates.length > 0) {
        dragCommitRef.current = true; 
        onUpdateNotes(updates);
      } else {
        setActiveDragIds(new Set());
        setDragOverrides(new Map());
      }
      
      dragStartOffsets.current.clear();
    }

    if (mode === 'SELECT' && selectionBox) {
      const x = Math.min(selectionBox.x, selectionBox.x + selectionBox.w);
      const y = Math.min(selectionBox.y, selectionBox.y + selectionBox.h);
      const w = Math.abs(selectionBox.w);
      const h = Math.abs(selectionBox.h);

      const newSelection = new Set(e.shiftKey ? selectedNodeIds : []);

      notes.forEach(note => {
        const closestX = Math.max(x, Math.min(note.x, x + w));
        const closestY = Math.max(y, Math.min(note.y, y + h));
        const dx = note.x - closestX;
        const dy = note.y - closestY;
        
        if ((dx * dx + dy * dy) < (NODE_RADIUS * NODE_RADIUS)) {
          newSelection.add(note.id);
        }
      });

      setSelectedNodeIds(newSelection);
      setSelectionBox(null);

      if (newSelection.size > 0) {
        const selectedNotes = notes.filter(n => newSelection.has(n.id));
        if (selectedNotes.length > 0) {
          const avgX = selectedNotes.reduce((sum, n) => sum + n.x, 0) / selectedNotes.length;
          const avgY = selectedNotes.reduce((sum, n) => sum + n.y, 0) / selectedNotes.length;
          setSelectionMenuPos(toScreenCoords(avgX, avgY));
        }
      }
    }
  };

  const handleNodePointerDown = useCallback((e: React.PointerEvent, note: Note) => {
    e.stopPropagation(); 
    (e.target as Element).setPointerCapture(e.pointerId);
    
    // Capture state for click logic
    wasNodeSelectedRef.current = selectedNodeIds.has(note.id);

    if (mode === 'CONNECT') {
      if (linkSourceId && linkSourceId !== note.id) {
        const source = notes.find(n => n.id === linkSourceId);
        if (source) {
          const newLinks = source.links.includes(note.id)
            ? source.links.filter(l => l !== note.id)
            : [...source.links, note.id];
          onUpdateNotes([{ ...source, links: newLinks }]);
        }
        setLinkSourceId(null);
      } else {
        setLinkSourceId(note.id);
      }
      return;
    }

    let newSelection = new Set(selectedNodeIds);
    if (!newSelection.has(note.id)) {
        if (!e.shiftKey) newSelection = new Set([note.id]);
        else newSelection.add(note.id);
    } 
    
    setSelectedNodeIds(newSelection);
    setSelectionMenuPos(null);
    setActiveNodeId(null);

    if (!isLayoutLocked && mode !== 'PAN' && mode !== 'SELECT') {
      const coords = getPointerPosition(e);
      pointerStartPos.current = { x: e.clientX, y: e.clientY };

      const offsets = new Map();
      const overrides = new Map();
      const nodesToDrag = newSelection.has(note.id) ? Array.from(newSelection) : [note.id];
      const newActiveDragIds = new Set<string>();

      nodesToDrag.forEach(id => {
        const n = notes.find(node => node.id === id);
        if (n) {
          offsets.set(id, { dx: coords.x - n.x, dy: coords.y - n.y });
          overrides.set(id, { x: n.x, y: n.y });
          newActiveDragIds.add(id);
        }
      });
      
      dragStartOffsets.current = offsets;
      setActiveDragIds(newActiveDragIds); 
      setDragOverrides(overrides); 
      isDraggingRef.current = true;
    }
  }, [mode, linkSourceId, notes, selectedNodeIds, isLayoutLocked, getPointerPosition, onUpdateNotes]);

  const handleNodeDoubleClick = useCallback((e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    setActiveNodeId(note.id);
  }, []);

  const handleNodePointerUp = useCallback((e: React.PointerEvent, noteId: string) => {
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);
    
    const dist = Math.hypot(e.clientX - pointerStartPos.current.x, e.clientY - pointerStartPos.current.y);
    
    if (dist < 5 && mode !== 'CONNECT') {
      // Logic for deselecting with Shift key if clicked again
      if (wasNodeSelectedRef.current && selectedNodeIds.has(noteId)) {
         if (e.shiftKey) {
            const newSet = new Set(selectedNodeIds);
            newSet.delete(noteId);
            setSelectedNodeIds(newSet);
        }
      }

      if (selectedNodeIds.size > 1 && selectedNodeIds.has(noteId)) {
         // Open bulk menu
         const note = notes.find(n => n.id === noteId);
         if (note) setSelectionMenuPos(toScreenCoords(note.x, note.y));
      }
    }
  }, [mode, selectedNodeIds, notes, toScreenCoords]);

  const activeNode = activeNodeId ? notes.find(n => n.id === activeNodeId) : null;
  const activeNodeScreenPos = activeNode ? toScreenCoords(activeNode.x, activeNode.y) : null;

  return (
    <div 
      ref={containerRef} 
      className="flex-1 flex flex-col h-full bg-slate-950 relative overflow-hidden select-none"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/30 via-slate-950 to-black pointer-events-none"></div>
      
      <style>{`
        @keyframes flow-gradient {
          0% { stroke-dashoffset: 100%; }
          100% { stroke-dashoffset: -100%; }
        }
        .signal-flow {
          stroke-dasharray: 40% 160%; 
          animation: flow-gradient 4s linear infinite;
          will-change: stroke-dashoffset;
          opacity: 0.5;
        }
      `}</style>

      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center bg-slate-900/80 backdrop-blur-md rounded-2xl px-2 py-1.5 gap-1 border border-slate-700/50 shadow-2xl transition-all"
           onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => setIsLayoutLocked(!isLayoutLocked)} className={`p-2 rounded-xl transition-colors ${isLayoutLocked ? 'text-red-400 bg-red-900/20' : 'text-slate-400 hover:text-slate-200'}`} title="Lock Layout">
            <Icon name={isLayoutLocked ? "Lock" : "Unlock"} size={18} />
        </button>
        <div className="w-px h-6 bg-slate-700 mx-1"></div>
        <button onClick={() => setMode('PAN')} className={`p-2 rounded-xl transition-colors ${mode === 'PAN' ? 'bg-blue-600/30 text-blue-300' : 'text-slate-400 hover:bg-slate-800'}`} title="Pan Tool">
            <Icon name="Hand" size={18} />
        </button>
        <button onClick={() => setMode('DEFAULT')} className={`p-2 rounded-xl transition-colors relative ${mode === 'DEFAULT' ? 'bg-blue-600/30 text-blue-300' : 'text-slate-400 hover:bg-slate-800'}`} title="Selection Tool">
            <Icon name="MousePointer2" size={18} />
        </button>
        <button onClick={() => setMode('SELECT')} className={`p-2 rounded-xl transition-colors relative ${mode === 'SELECT' ? 'bg-blue-600/30 text-blue-300' : 'text-slate-400 hover:bg-slate-800'}`} title="Box Select">
            <Icon name="BoxSelect" size={18} />
        </button>
        <div className="w-px h-6 bg-slate-700 mx-1"></div>
        <button onClick={() => { setMode(mode === 'CONNECT' ? 'DEFAULT' : 'CONNECT'); setLinkSourceId(null); }} className={`p-2 rounded-xl transition-colors ${mode === 'CONNECT' ? 'bg-green-600/30 text-green-300' : 'text-slate-400 hover:bg-slate-800'}`} title="Connect Tool">
            <Icon name="Link" size={18} />
        </button>
      </div>

      <svg
        ref={svgRef}
        className={`w-full h-full relative z-0 outline-none touch-none
            ${mode === 'PAN' ? 'cursor-grabbing' : ''}
            ${mode === 'DEFAULT' ? 'cursor-default' : ''}
            ${mode === 'SELECT' ? 'cursor-crosshair' : ''}
            ${mode === 'CONNECT' ? 'cursor-copy' : ''}
        `}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={(e) => {
             const scale = e.deltaY > 0 ? 1.05 : 0.95;
             setViewBox(prev => ({ ...prev, w: prev.w * scale, h: prev.h * scale }));
        }}
      >
        <defs>
          <radialGradient id="nodeGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
          <linearGradient id="signalGradient" gradientUnits="userSpaceOnUse">
             <stop offset="0%" stopColor="#94a3b8" stopOpacity="0" />
             <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.4" />
             <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
          </linearGradient>
        </defs>

        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#475569" fillOpacity="0.3" />
        </pattern>
        <rect x={viewBox.x - 5000} y={viewBox.y - 5000} width="10000" height="10000" fill="url(#grid)" />

        <StaticConnectionsLayer notes={notes} activeDragIds={activeDragIds} />
        <DynamicConnectionsLayer notes={notes} dragOverrides={dragOverrides} activeDragIds={activeDragIds} />
        <StaticNodesLayer 
          notes={notes} 
          activeDragIds={activeDragIds}
          selectedIds={selectedNodeIds}
          activeId={activeNodeId}
          linkSourceId={linkSourceId}
          mode={mode}
          onPointerDown={handleNodePointerDown}
          onDoubleClick={handleNodeDoubleClick}
        />
        <DynamicNodesLayer 
          notes={notes}
          dragOverrides={dragOverrides}
          onPointerDown={handleNodePointerDown}
          onDoubleClick={handleNodeDoubleClick}
        />

        {selectionBox && mode === 'SELECT' && (
          <rect
            x={selectionBox.w < 0 ? selectionBox.x + selectionBox.w : selectionBox.x}
            y={selectionBox.h < 0 ? selectionBox.y + selectionBox.h : selectionBox.y}
            width={Math.abs(selectionBox.w)}
            height={Math.abs(selectionBox.h)}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3b82f6"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            className="pointer-events-none"
          />
        )}
      </svg>

      {activeNode && activeNodeScreenPos && !selectionMenuPos && (
        <div 
          className="absolute z-30 w-72 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl shadow-2xl p-4 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200"
          style={{
            left: activeNodeScreenPos.x,
            top: activeNodeScreenPos.y,
            transform: 'translate(40px, -50%)'
          }}
          onPointerDown={(e) => e.stopPropagation()} 
        >
          <div className="absolute top-1/2 -left-2 w-2 h-px bg-slate-700"></div>
          <div className="flex justify-between items-start">
             <h3 className="font-bold text-slate-100 truncate pr-2 text-sm">{activeNode.title || "Untitled"}</h3>
             <button onClick={() => setActiveNodeId(null)} className="text-slate-500 hover:text-white">
               <Icon name="X" size={14} />
             </button>
          </div>
          {/* Content Preview */}
          <div className="text-xs text-slate-300 max-h-32 overflow-y-auto pr-1 leading-relaxed bg-slate-950/50 p-2 rounded border border-slate-800">
             {activeNode.content ? activeNode.content.substring(0, 300) + (activeNode.content.length > 300 ? "..." : "") : <span className="text-slate-500 italic">No content...</span>}
          </div>
          
          <div className="flex gap-2 mt-2">
            <button onClick={() => onSelectNote(activeNode.id)} className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs py-1.5 rounded-lg border border-blue-500/20 font-medium">Edit Full Note</button>
             <button onClick={() => { onDeleteNotes([activeNode.id]); setActiveNodeId(null); }} className="px-3 bg-red-900/20 hover:bg-red-900/30 text-red-300 text-xs rounded-lg border border-red-500/20">
                <Icon name="Trash2" size={14} />
            </button>
          </div>
        </div>
      )}

      {selectionMenuPos && (
        <div 
            className="absolute z-40 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-1 flex gap-1 animate-in fade-in zoom-in-95"
            style={{ left: selectionMenuPos.x, top: selectionMenuPos.y + 45, transform: 'translateX(-50%)' }}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <button onClick={() => { onDuplicateNotes(Array.from(selectedNodeIds)); setSelectionMenuPos(null); }} className="flex items-center gap-1 px-3 py-1.5 hover:bg-slate-700 rounded text-xs text-slate-200">
                <Icon name="Copy" size={14} /> Copy
            </button>
            <div className="w-px bg-slate-700 my-1"></div>
            <button onClick={() => { onDeleteNotes(Array.from(selectedNodeIds)); setSelectionMenuPos(null); setSelectedNodeIds(new Set()); }} className="flex items-center gap-1 px-3 py-1.5 hover:bg-red-900/30 text-red-300 rounded text-xs">
                <Icon name="Trash2" size={14} /> Delete
            </button>
        </div>
      )}
    </div>
  );
});