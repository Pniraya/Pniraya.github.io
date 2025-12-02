import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { GraphView } from './components/GraphView';
import { GridView } from './components/GridView';
import { Dashboard } from './components/Dashboard';
import { Note, Project } from './types';
import { getProjects, saveProjects, createProject, deleteProjectData, getProjectNotes, saveProjectNotes, createNote, exportProjectData, importProjectData } from './services/storage';
import { Icon } from './components/Icon';

const App: React.FC = () => {
  // Project State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Note State (scoped to active project)
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // View State: 'EDITOR' | 'GRAPH' | 'GRID'
  const [currentView, setCurrentView] = useState<'EDITOR' | 'GRAPH' | 'GRID'>('GRID');

  // 1. Load Projects on Mount
  useEffect(() => {
    const loadedProjects = getProjects();
    setProjects(loadedProjects);
  }, []);

  // 2. Load Notes when Project Changes
  useEffect(() => {
    if (activeProjectId) {
      const projectNotes = getProjectNotes(activeProjectId);
      setNotes(projectNotes);
      // Default to Grid View when opening a project
      setActiveNoteId(null);
      setCurrentView('GRID');
      setSearchQuery("");
      setIsSidebarOpen(true);
    } else {
      setNotes([]);
      setActiveNoteId(null);
    }
  }, [activeProjectId]);

  // 3. Save Notes Effect
  useEffect(() => {
    if (activeProjectId) {
      saveProjectNotes(activeProjectId, notes);
      
      // Update local project state count without reloading from storage to keep UI snappy
      setProjects(prev => prev.map(p => 
        p.id === activeProjectId 
          ? { ...p, noteCount: notes.length, updatedAt: Date.now() } 
          : p
      ));
    }
  }, [notes, activeProjectId]);

  // --- Project Actions ---

  const handleCreateProject = useCallback((name: string, desc: string) => {
    const newProject = createProject(name, desc);
    setProjects(prev => [newProject, ...prev]);
    saveProjects([newProject, ...projects]); 
    setActiveProjectId(newProject.id); 
  }, [projects]);

  const handleDeleteProject = useCallback((projectId: string) => {
    if (window.confirm("Are you sure? This will delete all notes within the project.")) {
      setProjects(prev => {
        const updated = prev.filter(p => p.id !== projectId);
        saveProjects(updated);
        return updated;
      });
      deleteProjectData(projectId);
      setActiveProjectId(prevId => prevId === projectId ? null : prevId);
    }
  }, []);

  const handleExportProject = useCallback((projectId: string) => {
    const jsonStr = exportProjectData(projectId);
    if (!jsonStr) {
      alert("Failed to export project.");
      return;
    }
    
    const project = projects.find(p => p.id === projectId);
    const fileName = `${project ? project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'project'}_backup.json`;
    
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [projects]);

  const handleImportProject = useCallback(async (file: File) => {
    const text = await file.text();
    const importedProject = importProjectData(text);
    
    if (importedProject) {
      setProjects(getProjects());
      alert("Project imported successfully!");
    } else {
      alert("Failed to import project. Please check the file format.");
    }
  }, []);

  // --- Note Actions ---

  const handleCreateNote = useCallback(() => {
    if (!activeProjectId) return;
    const newNote = createNote();
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setCurrentView('EDITOR'); 
    setSearchQuery("");
  }, [activeProjectId]);

  const handleUpdateNote = useCallback((updatedNote: Note) => {
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
  }, []);

  const handleBatchUpdateNotes = useCallback((updates: Note[]) => {
    setNotes(prev => {
      const updateMap = new Map(updates.map(n => [n.id, n]));
      return prev.map(n => updateMap.get(n.id) || n);
    });
  }, []);

  const handleDeleteNote = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotes(prev => prev.filter(n => n.id !== id));
    
    setActiveNoteId(prevId => {
        if (prevId === id) return null;
        return prevId;
    });
    // Removed setCurrentView('GRID') to allow GraphView to persist
  }, []);

  const handleBatchDelete = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    if (ids.length > 3 && !window.confirm(`Delete ${ids.length} notes?`)) return;

    setNotes(prev => prev.filter(n => !ids.includes(n.id)));
    
    setActiveNoteId(prevId => {
        if (prevId && ids.includes(prevId)) return null;
        return prevId;
    });
    // Removed setCurrentView('GRID') to allow GraphView to persist
  }, []);

  const handleBatchDuplicate = useCallback((ids: string[]) => {
    setNotes(prev => {
        const newNotes = ids.map(id => {
            const original = prev.find(n => n.id === id);
            if (!original) return null;
            return {
              ...original,
              id: crypto.randomUUID(),
              title: `${original.title} (Copy)`,
              x: original.x + 40,
              y: original.y + 40,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
        }).filter(Boolean) as Note[];
        return [...prev, ...newNotes];
    });
  }, []);

  // --- Navigation Handlers ---

  const handleSelectNote = useCallback((id: string) => {
    setActiveNoteId(id);
    setCurrentView('EDITOR');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, []);

  const handleChangeView = useCallback((view: 'EDITOR' | 'GRAPH' | 'GRID') => {
    setCurrentView(view);
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setActiveProjectId(null);
  }, []);

  // --- Render Helpers ---

  const activeNote = notes.find(n => n.id === activeNoteId);
  const currentProject = projects.find(p => p.id === activeProjectId);

  // 1. Dashboard View
  if (!activeProjectId) {
    return (
      <Dashboard 
        projects={projects}
        onCreateProject={handleCreateProject}
        onSelectProject={setActiveProjectId}
        onDeleteProject={handleDeleteProject}
        onExportProject={handleExportProject}
        onImportProject={handleImportProject}
      />
    );
  }

  // 2. Project Workspace
  let mainContent;
  if (currentView === 'GRAPH') {
    mainContent = (
      <GraphView 
        notes={notes} 
        onUpdateNotes={handleBatchUpdateNotes}
        onSelectNote={handleSelectNote}
        onDeleteNotes={handleBatchDelete}
        onDuplicateNotes={handleBatchDuplicate}
      />
    );
  } else if (currentView === 'EDITOR' && activeNote) {
    mainContent = (
      <Editor 
        note={activeNote} 
        onUpdate={handleUpdateNote} 
      />
    );
  } else {
    // Fallback to GridView if no active note in Editor mode
    mainContent = (
      <GridView 
        notes={notes}
        onSelectNote={handleSelectNote}
        onDeleteNote={handleDeleteNote}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden selection:bg-blue-500/30">
      
      {/* Mobile Menu */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-slate-800 rounded-md shadow-lg border border-slate-700"
        >
          <Icon name={isSidebarOpen ? "X" : "Menu"} size={20} />
        </button>
      </div>

      {/* Sidebar - Memoized */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-40 h-full transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none flex-shrink-0`}>
        <Sidebar 
          notes={notes}
          activeNoteId={activeNoteId}
          onSelectNote={handleSelectNote}
          onCreateNote={handleCreateNote}
          onDeleteNote={handleDeleteNote}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          currentView={currentView}
          onChangeView={handleChangeView}
          onBackToDashboard={handleBackToDashboard}
          projectName={currentProject?.name || "Project"}
        />
      </div>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Area */}
      <div className="flex-1 h-full flex flex-col relative overflow-hidden">
        {mainContent}
      </div>
    </div>
  );
};

export default App;