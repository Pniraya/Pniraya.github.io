import React from 'react';
import { Note } from '../types';
import { Icon } from './Icon';

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentView: 'EDITOR' | 'GRAPH' | 'GRID';
  onChangeView: (view: 'EDITOR' | 'GRAPH' | 'GRID') => void;
  onBackToDashboard: () => void;
  projectName: string;
}

// Memoized Sidebar
export const Sidebar: React.FC<SidebarProps> = React.memo(({
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  searchQuery,
  setSearchQuery,
  currentView,
  onChangeView,
  onBackToDashboard,
  projectName
}) => {

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full md:w-72 h-full flex flex-col border-r border-slate-800 bg-slate-900/90 flex-shrink-0 backdrop-blur-xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col gap-3">
        {/* Top Navigation */}
        <div className="flex items-center gap-2">
            <button 
                onClick={onBackToDashboard}
                className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Back to Dashboard"
            >
                <Icon name="LayoutGrid" size={18} />
            </button>
            <div className="h-4 w-px bg-slate-700 mx-1"></div>
            <div className="flex items-center gap-2 text-slate-200 font-bold text-sm truncate flex-1">
                <Icon name="FolderOpen" size={14} className="text-blue-400"/>
                <span className="truncate">{projectName}</span>
            </div>
        </div>

        {/* View Toggles */}
        <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
            <button
              onClick={() => onChangeView('GRID')}
              className={`flex-1 py-1.5 px-2 rounded-md flex justify-center items-center gap-1.5 text-xs font-medium transition-all ${currentView === 'GRID' ? 'bg-slate-700 text-blue-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              title="Grid View"
            >
               <Icon name="LayoutTemplate" size={14} /> Grid
            </button>
            <button
              onClick={() => onChangeView('GRAPH')}
              className={`flex-1 py-1.5 px-2 rounded-md flex justify-center items-center gap-1.5 text-xs font-medium transition-all ${currentView === 'GRAPH' ? 'bg-slate-700 text-blue-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              title="Graph View"
            >
               <Icon name="BrainCircuit" size={14} /> Graph
            </button>
        </div>
        
        {/* Search */}
        <div className="relative group">
          <Icon name="Search" size={14} className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/50 text-slate-200 pl-8 pr-3 py-2 rounded-lg border border-slate-800 focus:border-blue-500/50 focus:outline-none text-xs transition-all"
          />
        </div>
      </div>

      {/* Note List */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotes.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs mt-4">
            {searchQuery ? "No matches found." : "No notes yet."}
          </div>
        ) : (
          filteredNotes.map(note => (
            <div
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              className={`
                group relative px-4 py-3 cursor-pointer border-b border-slate-800/50 transition-all
                ${activeNoteId === note.id && currentView === 'EDITOR'
                  ? 'bg-slate-800 border-l-2 border-l-blue-500' 
                  : 'hover:bg-slate-800/50 border-l-2 border-l-transparent'
                }
              `}
            >
              <div className="flex justify-between items-start mb-1">
                  <h3 className={`font-medium text-sm truncate pr-4 ${activeNoteId === note.id && currentView === 'EDITOR' ? 'text-blue-300' : 'text-slate-300 group-hover:text-slate-200'}`}>
                    {note.title || "Untitled Note"}
                  </h3>
                  <span className="text-[10px] text-slate-600 font-mono whitespace-nowrap">
                      {formatDate(note.updatedAt)}
                  </span>
              </div>
              
              <div className="flex items-center gap-2">
                 {note.tags.slice(0, 2).map(tag => (
                   <span key={tag} className="text-[10px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/50">
                     #{tag}
                   </span>
                 ))}
              </div>

              {/* Hover Actions */}
              <button
                onClick={(e) => onDeleteNote(note.id, e)}
                className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-all"
              >
                <Icon name="Trash2" size={12} />
              </button>
            </div>
          ))
        )}
      </div>
      
      {/* Footer Create Button */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <button 
            onClick={onCreateNote}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
        >
            <Icon name="Plus" size={16} /> New Note
        </button>
      </div>
    </div>
  );
});