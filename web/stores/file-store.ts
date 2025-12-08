import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FileUpload } from '@/types';

interface FileState {
  files: FileUpload[];
  addFiles: (files: File[]) => void;
  removeFile: (fileId: string) => void;
  updateFileStatus: (fileId: string, status: FileUpload['status'], progress?: number, error?: string) => void;
  clearFiles: () => void;
}

export const useFileStore = create<FileState>()(
  persist(
    (set, get) => ({
      files: [],

      addFiles: (fileList: File[]) => {
        const newFiles: FileUpload[] = fileList.map((file, index) => ({
          id: `${Date.now()}-${index}`,
          file,
          status: 'pending',
          progress: 0,
          uploadedAt: new Date(),
        }));

        set((state) => ({
          files: [...state.files, ...newFiles],
        }));
      },

      removeFile: (fileId: string) => {
        set((state) => ({
          files: state.files.filter((file) => file.id !== fileId),
        }));
      },

      updateFileStatus: (fileId: string, status: FileUpload['status'], progress = 0, error?: string) => {
        set((state) => ({
          files: state.files.map((file) =>
            file.id === fileId
              ? { ...file, status, progress, error }
              : file,
          ),
        }));
      },

      clearFiles: () => {
        set({ files: [] });
      },
    }),
    {
      name: 'file-store',
      // Only persist file metadata, not actual File objects
      partialize: (state) => ({
        files: state.files.map(file => ({
          ...file,
          file: undefined, // File objects can't be serialized
        })),
      }),
    },
  ),
);
