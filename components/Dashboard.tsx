import React, { useState, useRef } from 'react';
import { Project } from '../types';
import { Icon } from './Icon';

interface DashboardProps {
  projects: Project[];
  onCreateProject: (name: string, desc: string) => void;
  onSelectProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onExportProject: (projectId: string) => void;
  onImportProject: (file: File) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  projects, 
  onCreateProject, 
  onSelectProject, 
  onDeleteProject,
  onExportProject,
  onImportProject
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreateProject(newName, newDesc);
    setIsCreating(false);
    setNewName("");
    setNewDesc("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportProject(e.target.files[0]);
    }
    // Reset Input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex-1 h-full bg-slate-950 overflow-y-auto p-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none"></div>
      
      {/* Hidden File Input for Import */}
      <input 
        type="file" 
        accept=".json" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-blue-500/10 rounded-full mb-6 ring-1 ring-blue-500/20">
            <Icon name="BrainCircuit" size={48} className="text-blue-500" />
          </div>
          <h1 className="text-4xl font-bold text-slate-100 mb-2 tracking-tight">MindVault AI</h1>
          <p className="text-slate-400 text-lg">Manage your knowledge bases efficiently.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create Project Card */}
          <div 
            onClick={() => setIsCreating(true)}
            className="group relative h-48 rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-900/30 hover:bg-slate-900/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
          >
            <div className="p-3 rounded-full bg-slate-800 group-hover:bg-blue-600 transition-colors">
              <Icon name="Plus" size={24} className="text-slate-400 group-hover:text-white" />
            </div>
            <span className="text-slate-400 font-medium group-hover:text-blue-300">Create New Project</span>
          </div>

          {/* Import Project Card */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative h-48 rounded-2xl border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-900/30 hover:bg-slate-900/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
          >
            <div className="p-3 rounded-full bg-slate-800 group-hover:bg-emerald-600 transition-colors">
              <Icon name="Upload" size={24} className="text-slate-400 group-hover:text-white" />
            </div>
            <span className="text-slate-400 font-medium group-hover:text-emerald-300">Import Project (JSON)</span>
          </div>

          {/* Project List */}
          {projects.map(project => (
            <div 
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="group relative h-48 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-900/10 transition-all cursor-pointer overflow-hidden p-6 flex flex-col justify-between"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div>
                <h3 className="text-xl font-bold text-slate-200 mb-2 truncate group-hover:text-blue-400 transition-colors">
                  {project.name}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-2">
                  {project.description || "No description provided."}
                </p>
              </div>

              <div className="flex items-end justify-between relative z-10">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Icon name="FileText" size={14} />
                  <span>{project.noteCount} Notes</span>
                  <span>•</span>
                  <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onExportProject(project.id); }}
                    className="p-2 text-slate-600 hover:text-emerald-400 hover:bg-emerald-900/20 rounded-lg transition-colors"
                    title="Export Project"
                  >
                    <Icon name="Download" size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                    className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete Project"
                  >
                    <Icon name="Trash2" size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal Overlay */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Create Project</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Project Name</label>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Personal Wiki"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 h-24 resize-none"
                  placeholder="Briefly describe this project..."
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};