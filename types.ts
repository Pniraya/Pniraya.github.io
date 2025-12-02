export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  x: number;
  y: number;
  links: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  noteCount: number; // Cached count for display
}

export interface ProjectExportData {
  version: number;
  timestamp: number;
  project: Project;
  notes: Note[];
}

export enum ViewMode {
  EDIT = 'EDIT',
  PREVIEW = 'PREVIEW',
  SPLIT = 'SPLIT',
  GRAPH = 'GRAPH'
}

// Helper for Lucide icons since we are loading via script tag but using TS
// In a real build environment we would import from 'lucide-react'
declare global {
  interface Window {
    lucide: {
      createIcons: () => void;
      icons: any;
    };
    marked: {
      parse: (text: string) => string;
    };
  }
}