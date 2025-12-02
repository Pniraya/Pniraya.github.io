import React, { useState, useEffect, useRef } from 'react';
import { Note } from '../types';
import { Icon } from './Icon';

interface EditorProps {
  note: Note;
  onUpdate: (updatedNote: Note) => void;
}

export const Editor: React.FC<EditorProps> = ({ note, onUpdate }) => {
  // Local state for immediate UI feedback and debouncing
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  
  const [viewMode, setViewMode] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  
  // Ref to track if the update coming from parent is strictly different from local
  // to avoid circular loop triggers when we save.
  const lastSavedNoteId = useRef(note.id);

  // Sync local state when switching notes
  useEffect(() => {
    if (note.id !== lastSavedNoteId.current) {
      setTitle(note.title);
      setContent(note.content);
      lastSavedNoteId.current = note.id;
    }
  }, [note.id, note.title, note.content]);

  // Debounced Save Logic
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only save if dirty
      if (title !== note.title || content !== note.content) {
        onUpdate({
          ...note,
          title,
          content,
          updatedAt: Date.now()
        });
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [title, content, note, onUpdate]);

  // Handlers for local state
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  // Immediate tag update (no debounce needed for tags usually)
  const handleTagsUpdate = (newTags: string[]) => {
    onUpdate({ ...note, tags: newTags, updatedAt: Date.now() });
  };

  const renderMarkdown = (text: string) => {
    if (!window.marked) return { __html: text };
    return { __html: window.marked.parse(text) };
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 relative">
      
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-10 backdrop-blur">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled Note"
            className="bg-transparent text-2xl font-bold text-slate-100 placeholder-slate-600 focus:outline-none w-full md:w-96 truncate"
          />
          <div className="flex gap-2">
             {note.tags.map(tag => (
               <span key={tag} className="text-xs bg-slate-800 text-blue-400 px-2 py-1 rounded-full border border-slate-700 flex items-center gap-1">
                 #{tag}
                 <button 
                  onClick={() => handleTagsUpdate(note.tags.filter(t => t !== tag))}
                  className="hover:text-red-400"
                 >
                   &times;
                 </button>
               </span>
             ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setViewMode(viewMode === 'EDIT' ? 'PREVIEW' : 'EDIT')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title={viewMode === 'EDIT' ? 'Switch to Preview' : 'Switch to Edit'}
          >
            <Icon name={viewMode === 'EDIT' ? 'Eye' : 'PenLine'} size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full flex-1 overflow-y-auto transition-all duration-300">
          {viewMode === 'EDIT' ? (
            <textarea
              value={content}
              onChange={handleContentChange}
              placeholder="Start typing... (Markdown supported)"
              className="w-full h-full p-8 bg-transparent text-slate-300 resize-none focus:outline-none leading-relaxed font-mono text-base"
              spellCheck={false}
            />
          ) : (
            <div 
              className="w-full h-full p-8 markdown-preview text-slate-300 overflow-y-auto"
              dangerouslySetInnerHTML={renderMarkdown(content || "*No content*")}
            />
          )}
        </div>
      </div>
    </div>
  );
};