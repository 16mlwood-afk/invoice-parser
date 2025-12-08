'use client';

import React from 'react';

// File type is available in web environment
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container, Button } from '@/components/ui';
import { UploadZone } from '@/components/upload/upload-zone';
import { FilePreview } from '@/components/upload/file-preview';
import { UploadProgress } from '@/components/upload/upload-progress';
import { useUploadStore } from '@/stores/upload-store';
import { apiClient } from '@/lib/api-client';

export default function UploadPage() {
  const router = useRouter();
  const {
    files,
    isUploading,
    uploadProgress,
    currentJobId,
    errors,
    addFiles,
    removeFile,
    clearFiles,
    uploadFiles,
    cancelUpload,
    retryFailed,
    clearErrors,
  } = useUploadStore();

  const handleFilesSelected = (selectedFiles: File[]) => {
    clearErrors();
    addFiles(selectedFiles);
  };

  const handleUpload = async () => {
    await uploadFiles();
  };

  const handleProcess = async () => {
    if (currentJobId) {
      try {
        // Start processing first
        const response = await apiClient.startProcessing(currentJobId);

        if (response.success) {
          // Then navigate to dashboard
          router.push(`/dashboard?jobId=${currentJobId}`);
        } else {
          console.error('Failed to start processing:', response.error);
          // Could add toast notification here for user feedback
          // For now, still navigate but log the error
          router.push(`/dashboard?jobId=${currentJobId}`);
        }
      } catch (error) {
        console.error('Process initiation error:', error);
        // Graceful fallback - still navigate to dashboard
        router.push(`/dashboard?jobId=${currentJobId}`);
      }
    }
  };

  const validFilesCount = files.filter(f => f.validationStatus === 'valid').length;
  const hasValidFiles = validFilesCount > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
      <main className="py-8">
        <Container>
          {/* Breadcrumb Navigation */}
          <nav className="mb-8" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm text-neutral-500 dark:text-neutral-400">
              <li>
                <Link href="/" className="hover:text-primary transition-colors font-medium">
                  Home
                </Link>
              </li>
              <li>
                <svg className="w-4 h-4 text-neutral-400 dark:text-neutral-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d={
                      'M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z'
                    }
                    clipRule="evenodd"
                  />
                </svg>
              </li>
              <li className="text-neutral-900 dark:text-neutral-100 font-semibold" aria-current="page">
                Upload Files
              </li>
            </ol>
          </nav>

          {/* Main Upload Area */}
          <div className="max-w-4xl mx-auto">
            {/* Upload Zone */}
            <UploadZone
              onFilesSelected={handleFilesSelected}
              disabled={isUploading}
              className="mb-8"
            />

            {/* Upload Progress */}
            <UploadProgress
              isUploading={isUploading}
              progress={uploadProgress}
              errors={errors}
              onRetry={retryFailed}
              onCancel={cancelUpload}
            />

            {/* File Preview Area */}
            {files.length > 0 && (
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100">
                    Selected Files ({files.length})
                  </h3>
                  {files.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFiles}
                      disabled={isUploading}
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {files.map((file) => (
                    <FilePreview
                      key={file.id}
                      file={file}
                      onRemove={removeFile}
                      showRemove={!isUploading}
                    />
                  ))}
                </div>

                {hasValidFiles && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-neutral-700">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600 dark:text-neutral-400">
                        {validFilesCount} of {files.length} files ready for processing
                      </div>
                      <div className="flex space-x-3">
                        {!currentJobId && (
                          <Button
                            onClick={handleUpload}
                            disabled={isUploading || !hasValidFiles}
                            loading={isUploading}
                          >
                            {isUploading ? 'Uploading...' : 'Upload Files'}
                          </Button>
                        )}
                        {currentJobId && (
                          <Button
                            onClick={handleProcess}
                            variant="primary"
                          >
                            Start Processing
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Container>
      </main>
    </div>
  );
}
