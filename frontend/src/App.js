import { useState, useCallback, useEffect, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { 
  FileJson, 
  GitCompare, 
  RotateCcw, 
  Loader2,
  Settings2,
  Download,
  Upload,
  Check,
  X,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Equal,
  FileSpreadsheet,
  Filter,
  History,
  Trash2,
  Clock,
  Eye,
  Copy,
  Printer,
  FileText,
  Edit3,
  Save,
  LogIn,
  LogOut,
  ExternalLink
} from "lucide-react";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Checkbox } from "./components/ui/checkbox";
import { Badge } from "./components/ui/badge";
import { ScrollArea } from "./components/ui/scroll-area";
import { Textarea } from "./components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./components/ui/dialog";
import { cn } from "./lib/utils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Max file size: 30 MB
const MAX_FILE_SIZE = 30 * 1024 * 1024;
const MAX_FILE_SIZE_MB = 30;
const MAX_HISTORY_ITEMS = 10;

// History management with localStorage
const HISTORY_KEY = 'json_compare_history';

function getLocalHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalHistory(item) {
  try {
    const history = getLocalHistory();
    const newHistory = [item, ...history.filter(h => h.id !== item.id)].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    return newHistory;
  } catch {
    return [];
  }
}

function clearLocalHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

// Word Diff Component - Highlights individual words
function WordDiff({ diff }) {
  if (!diff || diff.length === 0) return <span className="text-muted-foreground">-</span>;
  
  return (
    <span className="whitespace-pre-wrap">
      {diff.map((item, idx) => (
        <span
          key={idx}
          className={cn(
            item.type === 'added' && 'bg-green-200 text-green-900 px-0.5 rounded',
            item.type === 'removed' && 'bg-red-200 text-red-900 px-0.5 rounded line-through',
            item.type === 'same' && ''
          )}
        >
          {item.text}{' '}
        </span>
      ))}
    </span>
  );
}

// File Upload Component with Edit option
function FileUploadZone({ label, fileNumber, onFileUploaded, uploadedFile, isLoading, onEdit }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB`);
        return;
      }
      if (file.name.endsWith('.json') || file.type === 'application/json') {
        onFileUploaded(file);
      } else {
        setError('Please upload a JSON file');
      }
    }
  };

  const handleFileSelect = (e) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB`);
        return;
      }
      onFileUploaded(file);
    }
    e.target.value = '';
  };

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
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          {uploadedFile?.valid && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onEdit} data-testid={`edit-file-${fileNumber}`}>
              <Edit3 className="h-3 w-3 mr-1" />Edit
            </Button>
          )}
          {uploadedFile && (
            <span className={cn("status-badge", isSuccess ? "success" : "error")}>
              {isSuccess ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {isSuccess ? 'Valid JSON' : 'Invalid'}
            </span>
          )}
        </div>
      </div>

      <div
        className={cn("upload-zone", isDragging && "active", isSuccess && "success", isError && "error")}
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
            <span className="text-sm font-medium truncate max-w-full px-2">{uploadedFile.filename}</span>
            <span className="text-xs text-muted-foreground">{formatFileSize(uploadedFile.size)}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Drop JSON file or click to browse</span>
            <span className="text-[10px] text-muted-foreground">Max size: {MAX_FILE_SIZE_MB} MB</span>
          </div>
        )}
      </div>

      {(uploadedFile?.error || error) && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs text-red-600 font-mono">{uploadedFile?.error || error}</p>
        </div>
      )}
    </div>
  );
}

// Edit File Dialog
function EditFileDialog({ isOpen, onClose, fileId, filename, onSave }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && fileId) {
      setLoading(true);
      axios.get(`${API}/file-content/${fileId}`)
        .then(res => {
          try {
            const formatted = JSON.stringify(JSON.parse(res.data.content), null, 2);
            setContent(formatted);
          } catch {
            setContent(res.data.content);
          }
          setError(null);
        })
        .catch(err => setError('Failed to load file'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, fileId]);

  const handleSave = async () => {
    try {
      JSON.parse(content); // Validate
      setLoading(true);
      const res = await axios.post(`${API}/upload-content`, { content, filename });
      if (res.data.valid) {
        onSave(res.data);
        onClose();
        toast.success('File updated');
      } else {
        setError(res.data.error);
      }
    } catch (e) {
      setError('Invalid JSON: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Edit {filename}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="font-mono text-xs h-[400px]"
              placeholder="JSON content..."
            />
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}