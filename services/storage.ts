import { Note, Project, ProjectExportData } from '../types';

const PROJECTS_KEY = 'mindvault_projects';
const NOTES_PREFIX = 'mindvault_notes_';
const LEGACY_NOTES_KEY = 'mindvault_notes';

// --- Project Management ---

export const getProjects = (): Project[] => {
  try {
    const stored = localStorage.getItem(PROJECTS_KEY);
    let projects: Project[] = stored ? JSON.parse(stored) : [];

    // Migration Check: If we have legacy notes but no projects
    const legacyNotesStr = localStorage.getItem(LEGACY_NOTES_KEY);
    if (projects.length === 0 && legacyNotesStr) {
      const legacyNotes = JSON.parse(legacyNotesStr);
      if (legacyNotes.length > 0) {
        // Create a default project
        const defaultProject: Project = {
          id: crypto.randomUUID(),
          name: 'Main Knowledge Base',
          description: 'Migrated from previous version',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          noteCount: legacyNotes.length
        };
        
        // Save legacy notes to new format
        localStorage.setItem(NOTES_PREFIX + defaultProject.id, JSON.stringify(legacyNotes.map(migrateNoteStructure)));
        
        // Save project
        projects = [defaultProject];
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
        
        // Clean up legacy
        localStorage.removeItem(LEGACY_NOTES_KEY);
      }
    }

    return projects.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error("Failed to load projects", error);
    return [];
  }
};

export const saveProjects = (projects: Project[]): void => {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error("Failed to save projects", error);
  }
};

export const createProject = (name: string, description: string): Project => {
  return {
    id: crypto.randomUUID(),
    name: name || 'Untitled Project',
    description: description || '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    noteCount: 0
  };
};

// --- Note Management (Scoped to Project) ---

const migrateNoteStructure = (n: any): Note => ({
  ...n,
  x: typeof n.x === 'number' ? n.x : Math.random() * 800 + 100,
  y: typeof n.y === 'number' ? n.y : Math.random() * 600 + 100,
  links: Array.isArray(n.links) ? n.links : []
});

export const getProjectNotes = (projectId: string): Note[] => {
  try {
    const stored = localStorage.getItem(NOTES_PREFIX + projectId);
    const notes = stored ? JSON.parse(stored) : [];
    return notes.map(migrateNoteStructure);
  } catch (error) {
    console.error(`Failed to load notes for project ${projectId}`, error);
    return [];
  }
};

export const saveProjectNotes = (projectId: string, notes: Note[]): void => {
  try {
    localStorage.setItem(NOTES_PREFIX + projectId, JSON.stringify(notes));
    
    // Also update the project's note count and timestamp
    const projects = getProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex !== -1) {
      projects[projectIndex].noteCount = notes.length;
      projects[projectIndex].updatedAt = Date.now();
      saveProjects(projects);
    }
  } catch (error) {
    console.error(`Failed to save notes for project ${projectId}`, error);
  }
};

export const deleteProjectData = (projectId: string): void => {
  try {
    localStorage.removeItem(NOTES_PREFIX + projectId);
  } catch (error) {
    console.error("Failed to delete project data", error);
  }
};

export const createNote = (): Note => {
  return {
    id: crypto.randomUUID(),
    title: '',
    content: '',
    tags: [],
    isFavorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    x: Math.random() * 600 + 100, 
    y: Math.random() * 400 + 100,
    links: []
  };
};

// --- Import / Export ---

export const exportProjectData = (projectId: string): string | null => {
  try {
    const projects = getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) return null;

    const notes = getProjectNotes(projectId);
    
    const data: ProjectExportData = {
      version: 1,
      timestamp: Date.now(),
      project,
      notes
    };
    
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error("Export failed", error);
    return null;
  }
};

export const importProjectData = (jsonStr: string): Project | null => {
  try {
    const data: ProjectExportData = JSON.parse(jsonStr);
    
    // Basic validation
    if (!data.project || !data.project.name || !Array.isArray(data.notes)) {
      throw new Error("Invalid project file format");
    }

    // Generate new Project ID to avoid collisions
    // (We treat import as a "Copy" or "Restore to new location")
    const newProjectId = crypto.randomUUID();
    
    const newProject: Project = {
      ...data.project,
      id: newProjectId,
      name: `${data.project.name} (Imported)`,
      updatedAt: Date.now()
    };

    // Save Notes (We keep Note IDs intact to preserve internal links, as they are scoped by ProjectID)
    saveProjectNotes(newProjectId, data.notes);
    
    // Add to project list
    const projects = getProjects();
    // Add to top
    const updatedProjects = [newProject, ...projects];
    saveProjects(updatedProjects);

    return newProject;
  } catch (error) {
    console.error("Import failed", error);
    return null;
  }
};