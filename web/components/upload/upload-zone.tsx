'use client';

import React, { useCallback, useState, DragEvent, ChangeEvent } from 'react';

interface UploadZoneProps {
  onFilesSelected: (_files: File[]) => void;
  disabled?: boolean;
  className?: string;
}

export function UploadZone({ onFilesSelected, disabled = false, className = '' }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragActive(true);
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(false);
    }
  }, [disabled]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragActive(true);
    }
  }, [disabled]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    setIsDragActive(false);
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [disabled, onFilesSelected]);

  const handleFileInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }

    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [disabled, onFilesSelected]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      document.getElementById('file-upload')?.click();
    }
  }, [disabled]);

  const baseClasses =
    'relative border-2 border-dashed rounded-xl p-16 text-center transition-all ' +
    'duration-300 ease-in-out cursor-pointer shadow-sm hover:shadow-lg';
  const stateClasses = disabled
    ? 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 cursor-not-allowed'
    : isDragActive && isDragOver
      ? 'border-primary bg-primary-light scale-105 shadow-xl'
      : isDragActive
        ? 'border-primary/60 bg-primary-light/50 shadow-md'
        : 'border-neutral-300 dark:border-neutral-600 hover:border-primary/40 hover:bg-primary-light/30';

  return (
    <div
      className={`${baseClasses} ${stateClasses} ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload PDF files by dragging and dropping or clicking to select"
      aria-disabled={disabled}
    >
      <input
        id="file-upload"
        name="file-upload"
        type="file"
        className="sr-only"
        multiple
        accept=".pdf,application/pdf"
        onChange={handleFileInputChange}
        disabled={disabled}
        aria-hidden="true"
        data-testid="file-upload-input"
      />

      <div className="flex flex-col items-center justify-center space-y-6">
        <div
          className={
            `rounded-2xl p-6 transition-all duration-300 ${
              disabled
                ? 'bg-neutral-200 dark:bg-neutral-700'
                : isDragActive
                  ? 'bg-gradient-to-br from-primary to-primary-hover text-white shadow-lg scale-110'
                  : 'bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-700 dark:to-neutral-600 shadow-md hover:shadow-lg'}`
          }
        >
          <svg
            className={
              `h-12 w-12 transition-colors duration-300 ${
                disabled
                  ? 'text-neutral-400 dark:text-neutral-500'
                  : isDragActive
                    ? 'text-white'
                    : 'text-neutral-500 dark:text-neutral-400'}`
            }
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d={
                'M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02'
              }
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="space-y-3">
          <h3 className={`text-2xl font-bold ${disabled ? 'text-neutral-400 dark:text-neutral-500' : 'text-neutral-900 dark:text-neutral-100'}`}>
            {disabled ? 'Upload disabled' : 'Upload invoice files'}
          </h3>
          <p className={`text-base leading-relaxed ${disabled ? 'text-neutral-400 dark:text-neutral-500' : 'text-neutral-600 dark:text-neutral-400'}`}>
            {disabled
              ? 'File upload is currently disabled'
              : 'Drag and drop PDF files here, or click to select files'
            }
          </p>
        </div>

        {!disabled && (
          <div className="pt-4">
            <div className="inline-flex items-center px-6 py-3 rounded-xl bg-white dark:bg-gray-800 text-sm font-semibold text-primary shadow-md ring-2 ring-primary/20 hover:bg-primary hover:text-white hover:ring-primary transition-all duration-200 cursor-pointer">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Select Files
            </div>
          </div>
        )}

        <div className={`flex items-center space-x-4 text-sm ${disabled ? 'text-neutral-400 dark:text-neutral-500' : 'text-neutral-500 dark:text-neutral-400'}`}>
          <div className="flex items-center space-x-1">
            <span className="text-lg">📄</span>
            <span>PDF only</span>
          </div>
          <span className="text-neutral-300 dark:text-neutral-600">•</span>
          <div className="flex items-center space-x-1">
            <span className="text-lg">📏</span>
            <span>Up to 50MB</span>
          </div>
          <span className="text-neutral-300 dark:text-neutral-600">•</span>
          <div className="flex items-center space-x-1">
            <span className="text-lg">📚</span>
            <span>Max 50 files</span>
          </div>
        </div>
      </div>
    </div>
  );
}
