import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FilePreview, ValidationError } from '@/components/upload/types';
import {
  validateFileBatch,
  createFilePreview,
  getValidFiles,
} from '@/components/upload/file-validation';
import { apiClient } from '@/lib/api-client';

interface UploadState {
  // File state
  files: FilePreview[];
  isUploading: boolean;
  uploadProgress: number;
  currentJobId?: string;
  errors: ValidationError[];

  // Actions
  addFiles: (_files: File[]) => void;
  removeFile: (_fileId: string) => void;
  clearFiles: () => void;
  uploadFiles: () => Promise<void>;
  cancelUpload: () => void;
  retryFailed: () => void;
  clearErrors: () => void;
}

export const useUploadStore = create<UploadState>()(
  persist(
    (set, get) => ({
      files: [],
      isUploading: false,
      uploadProgress: 0,
      errors: [],

      addFiles: (fileList: File[]) => {
        const currentFiles = get().files;
        const validation = validateFileBatch(fileList, currentFiles);

        if (!validation.isValid) {
          set({ errors: validation.errors });
          return;
        }

        const newFilePreviews = fileList.map(createFilePreview);
        set({
          files: [...currentFiles, ...newFilePreviews],
          errors: [],
        });
      },

      removeFile: (fileId: string) => {
        set((state) => ({
          files: state.files.filter((file) => file.id !== fileId),
        }));
      },

      clearFiles: () => {
        set({
          files: [],
          isUploading: false,
          uploadProgress: 0,
          currentJobId: undefined,
          errors: [],
        });
      },

      uploadFiles: async () => {
        const { files } = get();
        const validFiles = getValidFiles(files);

        if (validFiles.length === 0) {
          set({
            errors: [{
              fileId: 'upload',
              type: 'format',
              message: 'No valid files to upload. Please check file formats and try again.',
            }],
          });
          return;
        }

        set({
          isUploading: true,
          uploadProgress: 0,
          errors: [],
        });

        try {
          // Update file status to uploading
          set((state) => ({
            files: state.files.map((file) =>
              validFiles.some(f => f.name === file.name)
                ? { ...file, validationStatus: 'pending' as const }
                : file,
            ),
          }));

          // Simulate progress updates
          const progressInterval = setInterval(() => {
            set((state) => ({
              uploadProgress: Math.min(state.uploadProgress + 10, 90),
            }));
          }, 200);

          // Upload files via API
          const response = await apiClient.uploadFiles(validFiles);

          clearInterval(progressInterval);

          if (response.success && response.data) {
            set({
              isUploading: false,
              uploadProgress: 100,
              currentJobId: response.data.jobId,
              files: get().files.map((file) =>
                validFiles.some(f => f.name === file.name)
                  ? { ...file, validationStatus: 'valid' as const }
                  : file,
              ),
            });
          } else {
            throw new Error(response.error || 'Upload failed');
          }
        } catch (error) {
          set((state) => ({
            isUploading: false,
            uploadProgress: 0,
            errors: [{
              fileId: 'upload',
              type: 'format',
              message: error instanceof Error ? error.message : 'Upload failed. Please try again.',
            }],
            files: state.files.map((file) =>
              validFiles.some(f => f.name === file.name)
                ? { ...file, validationStatus: 'invalid' as const }
                : file,
            ),
          }));
        }
      },

      cancelUpload: () => {
        set({
          isUploading: false,
          uploadProgress: 0,
          errors: [{
            fileId: 'upload',
            type: 'format',
            message: 'Upload cancelled by user.',
          }],
        });
      },

      retryFailed: () => {
        const { files } = get();
        const validFiles = getValidFiles(files);

        if (validFiles.length > 0) {
          get().uploadFiles();
        } else {
          set({
            errors: [{
              fileId: 'retry',
              type: 'format',
              message: 'No valid files to retry. Please check and fix file issues first.',
            }],
          });
        }
      },

      clearErrors: () => {
        set({ errors: [] });
      },
    }),
    {
      name: 'upload-store',
      partialize: (state) => ({
        files: state.files.map(file => ({
          ...file,
          file: undefined, // File objects can't be serialized
        })),
        currentJobId: state.currentJobId,
      }),
    },
  ),
);
