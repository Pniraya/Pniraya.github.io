import React, { useMemo, useState } from 'react';
import { Note } from '../types';
import { Icon } from './Icon';

interface GridViewProps {
  notes: Note[];
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
}

type SortBy = 'date' | 'size';
type SortOrder = 'asc' | 'desc';

// Memoized GridView
export const GridView: React.FC<GridViewProps> = React.memo(({ notes, onSelectNote, onDeleteNote }) => {
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  const processedNotes = useMemo(() => {
    // Clone to sort safely
    return [...notes].sort((a, b) => {
      let valA: number, valB: number;
      
      if (sortBy === 'size') {
        valA = a.content.length;
        valB = b.content.length;
      } else {
        valA = a.updatedAt;
        valB = b.updatedAt;
      }

      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [notes, sortBy, sortOrder]);

  return (
    <div className="flex-1 h-full bg-slate-950 flex flex-col overflow-hidden">
      
      {/* Toolbar */}
      <div className="px-8 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <Icon name="LayoutTemplate" size={20} className="text-blue-400" />
            Note Library
            <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full ml-2">
                {notes.length}
            </span>
        </h2>

        {/* Sorting Controls */}
        <div className="flex items-center gap-4 text-sm">
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button 
                    onClick={() => setSortBy('date')}
                    className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 text-xs font-medium ${sortBy === 'date' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Icon name="Clock" size={14} /> 修改时间
                </button>
                <button 
                    onClick={() => setSortBy('size')}
                    className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 text-xs font-medium ${sortBy === 'size' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Icon name="FileText" size={14} /> 文件大小
                </button>
            </div>
            
            <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors text-xs font-medium w-32 justify-center"
            >
                {sortOrder === 'asc' ? (
                    <>
                       正序 (Asc) <Icon name="ArrowUp" size={14} />
                    </>
                ) : (
                    <>
                       倒序 (Desc) <Icon name="ArrowDown" size={14} />
                    </>
                )}
            </button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        {processedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
             <div className="p-4 bg-slate-900 rounded-full border border-slate-800">
                <Icon name="Ghost" size={40} className="opacity-50" />
             </div>
             <p>No notes found.</p>
          </div>
        ) : (
          <div 
            className="grid gap-6"
            style={{ 
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' 
            }}
          >
            {processedNotes.map(note => (
              <div
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className="group relative h-48 bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-900/10 rounded-xl cursor-pointer transition-all flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                {/* Favorite Star */}
                {note.isFavorite && (
                    <div className="absolute top-3 right-3 text-yellow-500 z-10">
                        <Icon name="Star" size={14} className="fill-current" />
                    </div>
                )}

                {/* Box Content: Vertically and Horizontally Centered Title */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <h3 className="text-slate-200 font-bold text-lg group-hover:text-blue-400 transition-colors line-clamp-3 leading-snug">
                        {note.title || "Untitled"}
                    </h3>
                </div>

                {/* Box Footer: Date */}
                <div className="py-2 px-4 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                        修改时间：{formatDate(note.updatedAt)}
                    </span>
                    <span className="opacity-50">
                        {(note.content.length / 1024).toFixed(1)} KB
                    </span>
                </div>

                {/* Delete Action Overlay */}
                <button
                    onClick={(e) => onDeleteNote(note.id, e)}
                    className="absolute top-3 left-3 p-2 bg-slate-800/90 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-100 border border-slate-700"
                    title="Delete"
                >
                    <Icon name="Trash2" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});