import { useState, useCallback } from 'react';
import { Upload, FileJson, Check, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export const FileUploadZone = ({ 
  label, 
  fileNumber,
  onFileUploaded, 
  uploadedFile,
  isLoading 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        onFileUploaded(file);
      } else {
        setError('Please upload a JSON file');
      }
    }
  }, [onFileUploaded]);

  const handleFileSelect = useCallback((e) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        onFileUploaded(file);
      } else {
        setError('Please upload a JSON file');
      }
    }
  }, [onFileUploaded]);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const isSuccess = uploadedFile?.valid;
  const isError = uploadedFile?.valid === false || error;

  return (
    <div className="file-card p-4" data-testid={`file-upload-zone-${fileNumber}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
          {label}
        </span>
        {uploadedFile && (
          <span className={cn(
            "status-badge",
            isSuccess ? "success" : "error"
          )}>
            {isSuccess ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {isSuccess ? 'Valid JSON' : 'Invalid'}
          </span>
        )}
      </div>

      <div
        className={cn(
          "upload-zone",
          isDragging && "active",
          isSuccess && "success",
          isError && "error"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById(`file-input-${fileNumber}`)?.click()}
        data-testid={`dropzone-${fileNumber}`}
      >
        <input
          id={`file-input-${fileNumber}`}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileSelect}
          data-testid={`file-input-${fileNumber}`}
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            <span className="text-sm text-muted-foreground">Processing...</span>
          </div>
        ) : uploadedFile?.valid ? (
          <div className="flex flex-col items-center gap-2">
            <FileJson className="h-8 w-8 text-green-600" />
            <span className="text-sm font-medium truncate max-w-full px-2">
              {uploadedFile.filename}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(uploadedFile.size)}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Drop JSON file or click to browse
            </span>
          </div>
        )}
      </div>

      {(uploadedFile?.error || error) && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md" data-testid={`error-${fileNumber}`}>
          <p className="text-xs text-red-600 font-mono">
            {uploadedFile?.error || error}
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;
