import { useState, useCallback, useEffect, useRef } from "react";
import { Routes, Route, useParams, useNavigate } from "react-router-dom";
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
  Terminal,
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
  ClipboardCopy,
  Printer,
  FileText,
  Edit3,
  Save,
  LogIn,
  LogOut,
  User,
  ExternalLink,
  Moon,
  Sun,
  HelpCircle,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  ArrowLeft
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
    <div className="border rounded-lg p-6 bg-card transition-all duration-200" data-testid={`file-upload-zone-${fileNumber}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          {uploadedFile?.valid && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onEdit} data-testid={`edit-file-${fileNumber}`}>
              <Edit3 className="h-3.5 w-3.5 mr-1" />Edit
            </Button>
          )}
          {uploadedFile && (
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
              isSuccess ? "bg-diff-added-bg text-diff-added-text border border-diff-added-border" : "bg-diff-removed-bg text-diff-removed-text border border-diff-removed-border"
            )}>
              {isSuccess ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {isSuccess ? 'Valid JSON' : 'Invalid'}
            </span>
          )}
        </div>
      </div>

      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 cursor-pointer",
          "hover:border-primary/50 hover:bg-accent/50",
          isDragging && "border-primary bg-accent scale-[1.02]",
          isSuccess && "border-diff-added-border bg-diff-added-bg/20",
          isError && "border-diff-removed-border bg-diff-removed-bg/20",
          !isDragging && !isSuccess && !isError && "border-border"
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
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <span className="text-sm font-medium text-muted-foreground">Processing...</span>
          </div>
        ) : uploadedFile?.valid ? (
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-diff-added-bg border border-diff-added-border">
              <FileJson className="h-8 w-8 text-diff-added-text" />
            </div>
            <span className="text-sm font-semibold text-foreground truncate max-w-full px-2">{uploadedFile.filename}</span>
            <span className="text-xs text-muted-foreground">{formatFileSize(uploadedFile.size)}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-muted/50 border border-border">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Drop JSON file or click to browse</p>
              <p className="text-xs text-muted-foreground">Maximum size: {MAX_FILE_SIZE_MB} MB</p>
            </div>
          </div>
        )}
      </div>

      {(uploadedFile?.error || error) && (
        <div className="mt-4 p-3 bg-diff-removed-bg border border-diff-removed-border rounded-md">
          <p className="text-xs text-diff-removed-text font-mono">{uploadedFile?.error || error}</p>
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

// Progress Terminal Component
function ProgressTerminal({ logs, isProcessing }) {
  return (
    <div className="config-panel p-0 overflow-hidden" data-testid="progress-terminal">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-zinc-50">
        <Terminal className="h-4 w-4 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Progress Log</span>
        {isProcessing && <Loader2 className="h-3 w-3 text-blue-500 animate-spin ml-auto" />}
      </div>
      <div className="terminal max-h-[120px] overflow-y-auto rounded-none">
        {logs.length === 0 ? (
          <div className="text-zinc-500 text-center py-4">Waiting for comparison...</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className={cn("terminal-line flex items-start gap-2", log.type)}>
              <span className="text-zinc-600 flex-shrink-0">[{log.timestamp}]</span>
              {log.type === 'success' && <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />}
              {log.type === 'error' && <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />}
              <span>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Copy Button Component (extracted for reusability)
function CopyButton({ onClick, tabName, copiedTab }) {
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={onClick} 
      className="h-7 px-2 text-xs gap-1 bg-background border-border text-foreground hover:bg-accent" 
      data-testid={`copy-${tabName}-btn`}
    >
      {copiedTab === tabName ? (
        <><Check className="h-3 w-3 text-green-600 dark:text-green-400" />Copied!</>
      ) : (
        <><Copy className="h-3 w-3" />Copy</>
      )}
    </Button>
  );
}

// Excel Preview Component with Word Diff
function ExcelPreview({ previewData, previewRef, comparisonFilter = 'all', setComparisonFilter }) {
  const [activeTab, setActiveTab] = useState("comparison");
  const [copiedTab, setCopiedTab] = useState(null);
  
  if (!previewData) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'same': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'modified': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'added': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'removed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return '';
    }
  };

  const getChangeTypeColor = (type) => {
    if (type === 'Added in File2') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    if (type === 'Removed from File2') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
  };

  // Get background color for HTML copy based on status
  const getStatusBgColor = (status) => {
    switch (status) {
      case 'same': return '#C6EFCE';
      case 'modified': return '#FFEB9C';
      case 'added': return '#D4F4DD';
      case 'removed': return '#FFC7CE';
      default: return 'transparent';
    }
  };

  const copyTableToClipboard = async (headers, rows, tabName, successMsg, rowStyles = null) => {
    // Build HTML with proper styling for paste into Google Sheets
    let html = '<table style="border-collapse: collapse; font-family: Arial, sans-serif;">';
    html += '<tr style="background-color: #4472C4; color: white; font-weight: bold;">' + 
            headers.map(h => `<td style="border: 1px solid #333; padding: 8px;">${h}</td>`).join('') + '</tr>';
    
    rows.forEach((row, idx) => {
      const bgColor = rowStyles && rowStyles[idx] ? rowStyles[idx] : 'transparent';
      html += `<tr style="background-color: ${bgColor};">` + 
              row.map(cell => {
                // Check if this cell has special formatting (word diff)
                if (typeof cell === 'object' && cell.html) {
                  return `<td style="border: 1px solid #ddd; padding: 6px;">${cell.html}</td>`;
                }
                return `<td style="border: 1px solid #ddd; padding: 6px;">${String(cell || '').replace(/\n/g, '<br>')}</td>`;
              }).join('') + '</tr>';
    });
    html += '</table>';
    
    const plainText = [headers, ...rows].map(row => 
      row.map(cell => {
        if (typeof cell === 'object' && cell.text) return cell.text;
        return String(cell || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
      }).join('\t')
    ).join('\n');
    
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' })
        })
      ]);
      setCopiedTab(tabName);
      toast.success(successMsg);
    } catch (err) {
      try {
        await navigator.clipboard.writeText(plainText);
        setCopiedTab(tabName);
        toast.success(successMsg);
      } catch (e) {
        const textarea = document.createElement('textarea');
        textarea.value = plainText;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedTab(tabName);
        toast.success(successMsg);
      }
    }
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const copyComparison = () => {
    const headers = ['Tool Name', 'In File1', 'In File2', 'Same?', 'Notes'];
    const rows = previewData.comparison?.map(row => [
      row.name, row.in_file1 ? 'Yes' : 'No', row.in_file2 ? 'Yes' : 'No',
      row.desc_same === true ? 'Yes' : row.desc_same === false ? 'No' : 'N/A', row.notes
    ]) || [];
    const rowStyles = previewData.comparison?.map(row => getStatusBgColor(row.status)) || [];
    copyTableToClipboard(headers, rows, 'comparison', 'Copied with formatting! Paste into Google Sheets.', rowStyles);
  };

  const copyDifferences = () => {
    const headers = ['Tool Name', 'File1 Description', 'File2 Description', 'Change Type'];
    const rows = previewData.differences?.map(row => {
      // Create HTML with word diff highlighting
      const file1Html = row.file1_diff?.map(d => 
        d.type === 'removed' ? `<span style="background-color: #FFC7CE; text-decoration: line-through;">${d.text}</span>` : d.text
      ).join(' ') || row.file1_desc || '-';
      const file2Html = row.file2_diff?.map(d => 
        d.type === 'added' ? `<span style="background-color: #C6EFCE;">${d.text}</span>` : d.text
      ).join(' ') || row.file2_desc || '-';
      
      return [
        row.name, 
        { html: file1Html, text: row.file1_desc || '' },
        { html: file2Html, text: row.file2_desc || '' },
        row.change_type
      ];
    }) || [];
    copyTableToClipboard(headers, rows, 'differences', 'Copied with word-level highlighting! Paste into Google Sheets.');
  };

  const copyFile1 = () => {
    const headers = ['#', 'Tool Name', 'Description'];
    const rows = previewData.file1_tools?.map(row => [row.index, row.name, row.description]) || [];
    copyTableToClipboard(headers, rows, 'file1', 'Copied! Paste into Google Sheets.');
  };

  const copyFile2 = () => {
    const headers = ['#', 'Tool Name', 'Description'];
    const rows = previewData.file2_tools?.map(row => [row.index, row.name, row.description]) || [];
    copyTableToClipboard(headers, rows, 'file2', 'Copied! Paste into Google Sheets.');
  };

  return (
    <div ref={previewRef} className="border rounded-lg bg-card overflow-hidden" data-testid="excel-preview">
      <div className="p-4 border-b bg-zinc-50">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Comparison Preview</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Click &quot;Copy&quot; button in each tab to paste into Google Sheets (includes formatting)</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4 pt-3 border-b">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="comparison" className="text-xs">Comparison ({previewData.comparison?.length || 0})</TabsTrigger>
            <TabsTrigger value="differences" className="text-xs">Differences ({previewData.differences?.length || 0})</TabsTrigger>
            <TabsTrigger value="file1" className="text-xs">File 1 ({previewData.file1_tools?.length || 0})</TabsTrigger>
            <TabsTrigger value="file2" className="text-xs">File 2 ({previewData.file2_tools?.length || 0})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="comparison" className="m-0">
          <div className="flex items-center justify-between p-2 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex gap-1">
                {['all', 'added', 'removed', 'modified', 'same'].map((filter) => (
                  <Button
                    key={filter}
                    variant={comparisonFilter === filter ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setComparisonFilter && setComparisonFilter(filter)}
                    className="h-7 px-2 text-xs capitalize"
                  >
                    {filter}
                  </Button>
                ))}
              </div>
            </div>
            <CopyButton onClick={copyComparison} tabName="comparison" copiedTab={copiedTab} />
          </div>
          <ScrollArea className="h-[280px]">
            {(() => {
              const filteredData = previewData.comparison?.filter(row => {
                if (comparisonFilter === 'all') return true;
                return row.status === comparisonFilter;
              }) || [];
              
              if (filteredData.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm font-medium">No data found</p>
                    <p className="text-xs">No items match the "{comparisonFilter}" filter</p>
                  </div>
                );
              }
              
              return (
                <UITable>
                  <TableHeader>
                    <TableRow className="bg-blue-600 hover:bg-blue-600">
                      <TableHead className="text-white font-bold">Tool Name</TableHead>
                      <TableHead className="text-white font-bold text-center">In File1</TableHead>
                      <TableHead className="text-white font-bold text-center">In File2</TableHead>
                      <TableHead className="text-white font-bold text-center">Same?</TableHead>
                      <TableHead className="text-white font-bold">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row, idx) => (
                      <TableRow key={idx} className={getStatusColor(row.status)}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className={cn("text-center", row.in_file1 ? "bg-green-200 dark:bg-green-900/50" : "bg-red-200 dark:bg-red-900/50")}>{row.in_file1 ? '✓' : '✗'}</TableCell>
                        <TableCell className={cn("text-center", row.in_file2 ? "bg-green-200 dark:bg-green-900/50" : "bg-red-200 dark:bg-red-900/50")}>{row.in_file2 ? '✓' : '✗'}</TableCell>
                        <TableCell className={cn("text-center", row.desc_same === true ? "bg-green-200 dark:bg-green-900/50" : row.desc_same === false ? "bg-yellow-200 dark:bg-yellow-900/50" : "")}>
                          {row.desc_same === true ? '✓' : row.desc_same === false ? '✗' : 'N/A'}
                        </TableCell>
                        <TableCell>{row.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </UITable>
              );
            })()}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="differences" className="m-0">
          <div className="flex justify-end p-2 border-b bg-muted/30">
            <CopyButton onClick={copyDifferences} tabName="differences" copiedTab={copiedTab} />
          </div>
          <ScrollArea className="h-[280px]">
            <UITable>
              <TableHeader>
                <TableRow className="bg-blue-600 hover:bg-blue-600">
                  <TableHead className="text-white font-bold w-[120px]">Tool Name</TableHead>
                  <TableHead className="text-white font-bold">File1 (Removed in red)</TableHead>
                  <TableHead className="text-white font-bold">File2 (Added in green)</TableHead>
                  <TableHead className="text-white font-bold w-[100px]">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.differences?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="flex flex-col items-center text-muted-foreground">
                        <CheckCircle className="h-8 w-8 mb-2 opacity-50 text-green-500" />
                        <p className="text-sm font-medium">No differences found</p>
                        <p className="text-xs">All items are identical between the two files</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  previewData.differences?.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium align-top">{row.name}</TableCell>
                      <TableCell className="text-xs align-top">
                        <WordDiff diff={row.file1_diff} />
                      </TableCell>
                      <TableCell className="text-xs align-top">
                        <WordDiff diff={row.file2_diff} />
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge className={getChangeTypeColor(row.change_type)}>{row.change_type}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </UITable>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="file1" className="m-0">
          <div className="flex justify-end p-2 border-b bg-muted/30">
            <CopyButton onClick={copyFile1} tabName="file1" copiedTab={copiedTab} />
          </div>
          <ScrollArea className="h-[280px]">
            {previewData.file1_tools?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <FileJson className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No tools found</p>
                <p className="text-xs">File 1 contains no tools at the selected path</p>
              </div>
            ) : (
              <UITable>
                <TableHeader>
                  <TableRow className="bg-blue-600 hover:bg-blue-600">
                    <TableHead className="text-white font-bold w-[50px]">#</TableHead>
                    <TableHead className="text-white font-bold w-[200px]">Tool Name</TableHead>
                    <TableHead className="text-white font-bold">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.file1_tools?.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.index}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-xs"><pre className="whitespace-pre-wrap font-mono max-w-[400px]">{row.description}</pre></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </UITable>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="file2" className="m-0">
          <div className="flex justify-end p-2 border-b bg-muted/30">
            <CopyButton onClick={copyFile2} tabName="file2" copiedTab={copiedTab} />
          </div>
          <ScrollArea className="h-[280px]">
            {previewData.file2_tools?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <FileJson className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No tools found</p>
                <p className="text-xs">File 2 contains no tools at the selected path</p>
              </div>
            ) : (
              <UITable>
                <TableHeader>
                  <TableRow className="bg-blue-600 hover:bg-blue-600">
                    <TableHead className="text-white font-bold w-[50px]">#</TableHead>
                    <TableHead className="text-white font-bold w-[200px]">Tool Name</TableHead>
                    <TableHead className="text-white font-bold">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.file2_tools?.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.index}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-xs"><pre className="whitespace-pre-wrap font-mono max-w-[400px]">{row.description}</pre></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </UITable>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Summary Stats Component - Enhanced  
function SummaryStats({ summary }) {
  if (!summary) return null;
  const stats = [
    { 
      label: 'File 1 Tools', 
      value: summary.file1_tools, 
      icon: FileJson, 
      color: 'text-foreground',
      bg: 'bg-muted/50',
      border: 'border-border'
    },
    { 
      label: 'File 2 Tools', 
      value: summary.file2_tools, 
      icon: FileJson, 
      color: 'text-foreground',
      bg: 'bg-muted/50',
      border: 'border-border'
    },
    { 
      label: 'Same', 
      value: summary.same_count, 
      icon: CheckCircle, 
      color: 'text-diff-added-text dark:text-diff-added-border',
      bg: 'bg-diff-added-bg/50',
      border: 'border-diff-added-border/30'
    },
    { 
      label: 'Modified', 
      value: summary.modified_count, 
      icon: AlertTriangle, 
      color: 'text-diff-modified-text dark:text-diff-modified-border',
      bg: 'bg-diff-modified-bg/50',
      border: 'border-diff-modified-border/30'
    },
    { 
      label: 'Added', 
      value: summary.added_count, 
      icon: Check, 
      color: 'text-diff-added-text dark:text-diff-added-border',
      bg: 'bg-diff-added-bg/50',
      border: 'border-diff-added-border/30'
    },
    { 
      label: 'Removed', 
      value: summary.removed_count, 
      icon: X, 
      color: 'text-diff-removed-text dark:text-diff-removed-border',
      bg: 'bg-diff-removed-bg/50',
      border: 'border-diff-removed-border/30'
    },
  ];
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {stats.map((stat, idx) => (
        <div 
          key={idx} 
          className={cn(
            "relative p-4 rounded-lg border transition-all duration-200",
            stat.bg,
            stat.border,
            "hover:shadow-sm"
          )}
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <div className={cn("p-2 rounded-full bg-background/80", stat.border, "border")}>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <div className={cn("text-2xl font-bold font-heading", stat.color)}>
              {stat.value}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Export Panel Component - Enhanced
function ExportPanel({ onDownload, onExportHtml, onExportPdf, onPrint, onLogin, onShare, isDownloading, user }) {
  return (
    <div className="border rounded-lg bg-card p-6" data-testid="export-panel">
      <div className="flex items-center gap-2 mb-4">
        <Download className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold uppercase tracking-wider">Export Options</span>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={onDownload} 
            variant="default" 
            size="default" 
            className="h-11 gap-2 font-medium" 
            disabled={isDownloading} 
            data-testid="download-excel-btn"
          >
            {isDownloading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Downloading...</>
            ) : (
              <><FileSpreadsheet className="h-4 w-4" />Excel</>
            )}
          </Button>
          <Button 
            onClick={onExportHtml} 
            variant="outline" 
            size="default" 
            className="h-11 gap-2" 
            data-testid="export-html-btn"
          >
            <FileText className="h-4 w-4" />HTML
          </Button>
          <Button 
            onClick={onExportPdf} 
            variant="outline" 
            size="default" 
            className="h-11 gap-2" 
            data-testid="export-pdf-btn"
          >
            <FileText className="h-4 w-4" />PDF
          </Button>
          <Button 
            onClick={onPrint} 
            variant="outline" 
            size="default" 
            className="h-11 gap-2" 
            data-testid="print-btn"
          >
            <Printer className="h-4 w-4" />Print
          </Button>
        </div>

        <div className="space-y-2 pt-3 border-t">
          <Button 
            onClick={onShare}
            variant="secondary"
            size="default"
            className="w-full h-11 gap-2 font-medium"
            data-testid="share-btn"
          >
            <ExternalLink className="h-4 w-4" />
            Share Comparison
          </Button>
          <Button 
            onClick={onLogin} 
            variant="outline" 
            size="default" 
            className="w-full h-11 gap-2 text-muted-foreground" 
            data-testid="export-gsheets-btn"
          >
            <Copy className="h-4 w-4" />
            Copy to Google Sheets (Use Copy buttons above)
          </Button>
        </div>
      </div>
    </div>
  );
}

// History Panel with full data
function HistoryPanel({ history, onLoadHistory, onClearHistory, onDeleteHistory }) {
  const [isOpen, setIsOpen] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null); // null or item.id
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  
  if (history.length === 0) return null;

  const handleClearAll = () => {
    if (confirmClearAll) {
      onClearHistory();
      setConfirmClearAll(false);
    } else {
      setConfirmClearAll(true);
      setTimeout(() => setConfirmClearAll(false), 3000); // Reset after 3 seconds
    }
  };

  const handleDelete = (e, itemId) => {
    e.stopPropagation();
    if (confirmDelete === itemId) {
      onDeleteHistory(itemId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(itemId);
      setTimeout(() => setConfirmDelete(null), 3000); // Reset after 3 seconds
    }
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden" data-testid="history-panel">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 border-b bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <span className="text-sm font-semibold uppercase tracking-wider">History</span>
          <Badge variant="secondary" className="text-xs">{history.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={confirmClearAll ? "destructive" : "ghost"}
            size="sm" 
            onClick={(e) => { e.stopPropagation(); handleClearAll(); }} 
            className="h-7 px-2 text-xs"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            {confirmClearAll ? 'Click to Confirm' : 'Clear All'}
          </Button>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>
      {isOpen && (
        <ScrollArea className="h-[220px] animate-fade-in">
          <div className="p-3 space-y-2">
          {history.map((item, idx) => (
            <div 
              key={item.id} 
              className="p-3 rounded border bg-card hover:bg-accent/50 transition-colors group"
              data-testid={`history-item-${idx}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate flex-1 text-foreground">{item.file1_name} vs {item.file2_name}</span>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-6 px-2 text-xs gap-1"
                    onClick={(e) => { e.stopPropagation(); onLoadHistory(item); }}
                  >
                    <FolderOpen className="h-3 w-3" />
                    Open
                  </Button>
                  <Button 
                    variant={confirmDelete === item.id ? "destructive" : "ghost"}
                    size="sm" 
                    className="h-6 px-2 text-xs gap-1"
                    onClick={(e) => handleDelete(e, item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                    {confirmDelete === item.id ? 'Confirm?' : 'Delete'}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(item.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-green-600 dark:text-green-400">{item.same_count} same</span>
                  <span className="text-yellow-600 dark:text-yellow-400">{item.modified_count} mod</span>
                  <span className="text-blue-600 dark:text-blue-400">{item.added_count} add</span>
                  <span className="text-red-600 dark:text-red-400">{item.removed_count} rem</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      )}
    </div>
  );
}

// Main App Component
function App() {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [file1Loading, setFile1Loading] = useState(false);
  const [file2Loading, setFile2Loading] = useState(false);
  const [detectedPaths, setDetectedPaths] = useState([]);
  const [tools, setTools] = useState([]);
  const [selectedTools, setSelectedTools] = useState(null);
  const [compareType, setCompareType] = useState('tools');
  const [selectedPath, setSelectedPath] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [logs, setLogs] = useState([]);
  const [isComparing, setIsComparing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [toolSearch, setToolSearch] = useState('');
  const [outputFilename, setOutputFilename] = useState('');
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [editDialog, setEditDialog] = useState({ open: false, fileId: null, filename: '', fileNumber: null });
  const [comparisonFilter, setComparisonFilter] = useState('all'); // all, added, removed, modified, same
  const [shareDialog, setShareDialog] = useState({ open: false, shareUrl: '', loading: false });
  const [helpDialog, setHelpDialog] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light';
    }
    return 'light';
  });
  const previewRef = useRef(null);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Check for session_id in URL (OAuth callback)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('session_id=')) {
      const sessionId = hash.split('session_id=')[1]?.split('&')[0];
      if (sessionId) {
        axios.post(`${API}/auth/session`, { session_id: sessionId }, { withCredentials: true })
          .then(res => {
            setUser(res.data);
            toast.success(`Welcome, ${res.data.name}!`);
            window.history.replaceState(null, '', window.location.pathname);
          })
          .catch(err => {
            toast.error('Login failed');
            window.history.replaceState(null, '', window.location.pathname);
          });
      }
    }
  }, []);

  // Check existing auth
  useEffect(() => {
    axios.get(`${API}/auth/me`, { withCredentials: true })
      .then(res => setUser(res.data))
      .catch(() => {});
  }, []);

  // Load history
  useEffect(() => {
    if (user) {
      axios.get(`${API}/history`, { withCredentials: true })
        .then(res => setHistory(res.data.history || []))
        .catch(() => setHistory(getLocalHistory()));
    } else {
      setHistory(getLocalHistory());
    }
  }, [user]);

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, { message, type, timestamp }]);
  }, []);

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + window.location.pathname;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleLogout = async () => {
    await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    setUser(null);
    toast.info('Logged out');
  };

  const handleFileUpload = useCallback(async (file, fileNumber) => {
    const setLoading = fileNumber === 1 ? setFile1Loading : setFile2Loading;
    const setFileData = fileNumber === 1 ? setFile1 : setFile2;
    
    setLoading(true);
    addLog(`Uploading ${file.name}...`);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setFileData(response.data);
      
      if (response.data.valid) {
        addLog(`File ${fileNumber} uploaded: ${file.name}`, 'success');
        
        const analyzeRes = await axios.get(`${API}/analyze/${response.data.file_id}`);
        if (analyzeRes.data.detected_paths.length > 0) {
          setDetectedPaths(prev => {
            const combined = [...prev, ...analyzeRes.data.detected_paths];
            return combined.filter((v, i, a) => a.findIndex(t => t.path_string === v.path_string) === i);
          });
          if (!selectedPath && analyzeRes.data.detected_paths.length > 0) {
            setSelectedPath(analyzeRes.data.detected_paths[0].path_string);
          }
        }
      } else {
        addLog(`Invalid JSON: ${response.data.error}`, 'error');
        toast.error(`Invalid JSON`);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message;
      addLog(`Upload failed: ${errorMsg}`, 'error');
      toast.error(`Upload failed`);
      setFileData({ valid: false, error: errorMsg, filename: file.name, size: file.size });
    } finally {
      setLoading(false);
    }
  }, [addLog, selectedPath]);

  useEffect(() => {
    const fetchTools = async () => {
      if (!file1?.file_id || compareType !== 'tools') return;
      try {
        const path = compareType === 'custom' ? customPath : selectedPath;
        const res = await axios.get(`${API}/tools/${file1.file_id}`, { params: { path: path || undefined } });
        if (res.data.tools) setTools(res.data.tools);
      } catch (error) {
        // Silently handle tool fetch errors
      }
    };
    fetchTools();
  }, [file1?.file_id, selectedPath, customPath, compareType]);

  const handleCompare = useCallback(async () => {
    if (!file1?.file_id || !file2?.file_id) {
      toast.error('Please upload both JSON files first');
      return;
    }
    
    setIsComparing(true);
    setSummary(null);
    setPreviewData(null);
    addLog('Starting comparison...', 'info');
    
    try {
      const path = compareType === 'custom' ? customPath : selectedPath;
      const response = await axios.post(`${API}/compare`, {
        file1_id: file1.file_id,
        file2_id: file2.file_id,
        compare_type: compareType,
        custom_path: path || null,
        selected_tools: selectedTools
      });
      
      addLog(`Comparison complete!`, 'success');
      setSummary(response.data);
      setDownloadUrl(`${API}/download/${response.data.excel_filename}`);
      setPreviewData(response.data.preview_data);
      
      // Save to history
      const historyItem = {
        id: Date.now().toString(),
        file1_name: file1.filename,
        file2_name: file2.filename,
        compare_type: compareType,
        timestamp: new Date().toISOString(),
        file1_tools: response.data.file1_tools,
        file2_tools: response.data.file2_tools,
        same_count: response.data.same_count,
        modified_count: response.data.modified_count,
        added_count: response.data.added_count,
        removed_count: response.data.removed_count,
        preview_data: response.data.preview_data
      };
      
      if (user) {
        await axios.post(`${API}/history`, historyItem, { withCredentials: true });
        const histRes = await axios.get(`${API}/history`, { withCredentials: true });
        setHistory(histRes.data.history || []);
      } else {
        setHistory(saveLocalHistory(historyItem));
      }
      
      toast.success('Comparison complete!');
    } catch (error) {
      addLog(`Comparison failed: ${error.message}`, 'error');
      toast.error(`Comparison failed`);
    } finally {
      setIsComparing(false);
    }
  }, [file1, file2, compareType, customPath, selectedPath, selectedTools, addLog, user]);

  const handleDownload = useCallback(async () => {
    if (!downloadUrl) return;
    setIsDownloading(true);
    
    try {
      // Method 1: Try direct link download first (most reliable)
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${outputFilename || 'comparison_report'}.xlsx`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Downloading ${outputFilename || 'comparison_report'}.xlsx`, {
        description: 'Check your browser Downloads folder',
        duration: 5000
      });
    } catch (error) {
      console.error('Download error:', error);
      // Method 2: Fallback to blob download
      try {
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error('Download failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${outputFilename || 'comparison_report'}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success('Download complete - check your Downloads folder');
      } catch (blobError) {
        console.error('Blob download error:', blobError);
        toast.error('Download failed. Try HTML export or copy the URL: ' + downloadUrl, {
          duration: 10000
        });
      }
    } finally {
      setIsDownloading(false);
    }
  }, [downloadUrl, outputFilename]);

  const handleExportHtml = useCallback(() => {
    if (!previewData || !summary) return;
    const filename = outputFilename || 'comparison_report';
    
    // Generate comprehensive HTML
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename} - JSON Comparison Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto; }
    h1 { color: #333; border-bottom: 2px solid #4472C4; padding-bottom: 10px; }
    h2 { color: #4472C4; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
    th { background-color: #4472C4; color: white; padding: 12px 8px; text-align: left; }
    td { padding: 10px 8px; border: 1px solid #ddd; vertical-align: top; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .same { background-color: #C6EFCE; }
    .modified { background-color: #FFEB9C; }
    .added { background-color: #D4F4DD; }
    .removed { background-color: #FFC7CE; }
    .yes { background-color: #C6EFCE; text-align: center; }
    .no { background-color: #FFC7CE; text-align: center; }
    .summary-grid { display: flex; gap: 15px; flex-wrap: wrap; margin: 20px 0; }
    .stat-box { padding: 15px 25px; border-radius: 8px; text-align: center; min-width: 100px; }
    .stat-value { font-size: 28px; font-weight: bold; }
    .stat-label { font-size: 11px; color: #666; text-transform: uppercase; }
    .word-added { background-color: #C6EFCE; padding: 2px 4px; border-radius: 3px; }
    .word-removed { background-color: #FFC7CE; padding: 2px 4px; border-radius: 3px; text-decoration: line-through; }
    pre { white-space: pre-wrap; word-wrap: break-word; margin: 0; font-size: 12px; font-family: monospace; }
    .instructions { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4472C4; }
  </style>
</head>
<body>
  <h1>JSON Comparison Report</h1>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  
  <div class="instructions">
    <strong>💡 Tip:</strong> Press <kbd>Ctrl+S</kbd> (or <kbd>Cmd+S</kbd> on Mac) to save this file. 
    You can open the saved .html file with Microsoft Excel or copy tables into Google Sheets.
  </div>
  
  <div class="summary-grid">
    <div class="stat-box" style="background:#f0f0f0"><div class="stat-value">${summary.file1_tools}</div><div class="stat-label">File 1 Tools</div></div>
    <div class="stat-box" style="background:#f0f0f0"><div class="stat-value">${summary.file2_tools}</div><div class="stat-label">File 2 Tools</div></div>
    <div class="stat-box" style="background:#C6EFCE"><div class="stat-value">${summary.same_count}</div><div class="stat-label">Same</div></div>
    <div class="stat-box" style="background:#FFEB9C"><div class="stat-value">${summary.modified_count}</div><div class="stat-label">Modified</div></div>
    <div class="stat-box" style="background:#D4F4DD"><div class="stat-value">${summary.added_count}</div><div class="stat-label">Added</div></div>
    <div class="stat-box" style="background:#FFC7CE"><div class="stat-value">${summary.removed_count}</div><div class="stat-label">Removed</div></div>
  </div>

  <h2>Comparison Summary</h2>
  <table>
    <tr><th>Tool Name</th><th>In File1</th><th>In File2</th><th>Same?</th><th>Notes</th></tr>
    ${previewData.comparison?.map(r => `
      <tr class="${r.status}">
        <td><strong>${r.name}</strong></td>
        <td class="${r.in_file1 ? 'yes' : 'no'}">${r.in_file1 ? '✓ Yes' : '✗ No'}</td>
        <td class="${r.in_file2 ? 'yes' : 'no'}">${r.in_file2 ? '✓ Yes' : '✗ No'}</td>
        <td class="${r.desc_same === true ? 'yes' : r.desc_same === false ? 'modified' : ''}">${r.desc_same === true ? '✓ Yes' : r.desc_same === false ? '✗ No' : 'N/A'}</td>
        <td>${r.notes}</td>
      </tr>
    `).join('') || ''}
  </table>

  <h2>Differences (Word-Level)</h2>
  <table>
    <tr><th style="width:150px">Tool Name</th><th>File1 Description</th><th>File2 Description</th><th style="width:100px">Change Type</th></tr>
    ${previewData.differences?.length === 0 ? '<tr><td colspan="4" style="text-align:center;padding:20px">No differences found - all items are identical</td></tr>' : 
      previewData.differences?.map(r => `
        <tr>
          <td><strong>${r.name}</strong></td>
          <td>${r.file1_diff?.map(d => d.type === 'removed' ? `<span class="word-removed">${d.text}</span>` : d.text).join(' ') || r.file1_desc || '-'}</td>
          <td>${r.file2_diff?.map(d => d.type === 'added' ? `<span class="word-added">${d.text}</span>` : d.text).join(' ') || r.file2_desc || '-'}</td>
          <td class="${r.change_type === 'Added in File2' ? 'added' : r.change_type === 'Removed from File2' ? 'removed' : 'modified'}">${r.change_type}</td>
        </tr>
      `).join('') || ''}
  </table>

  <h2>File 1 Tools (${previewData.file1_tools?.length || 0})</h2>
  <table>
    <tr><th style="width:40px">#</th><th style="width:200px">Tool Name</th><th>Description</th></tr>
    ${previewData.file1_tools?.map(r => `
      <tr>
        <td>${r.index}</td>
        <td><strong>${r.name}</strong></td>
        <td><pre>${r.description}</pre></td>
      </tr>
    `).join('') || ''}
  </table>

  <h2>File 2 Tools (${previewData.file2_tools?.length || 0})</h2>
  <table>
    <tr><th style="width:40px">#</th><th style="width:200px">Tool Name</th><th>Description</th></tr>
    ${previewData.file2_tools?.map(r => `
      <tr>
        <td>${r.index}</td>
        <td><strong>${r.name}</strong></td>
        <td><pre>${r.description}</pre></td>
      </tr>
    `).join('') || ''}
  </table>

  <footer style="margin-top:40px;padding-top:20px;border-top:1px solid #ddd;color:#666;font-size:12px;">
    Generated by JSON Compare Tool
  </footer>
</body>
</html>`;

    // Open in new tab instead of downloading
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
      addLog('HTML table opened in new tab', 'success');
      toast.success('HTML table opened in new tab');
    } else {
      toast.error('Pop-up blocked - please allow pop-ups');
    }
  }, [previewData, summary, outputFilename, addLog]);

  const handleExportPdf = useCallback(async () => {
    if (!previewData || !summary) {
      toast.error('No data to export');
      return;
    }
    
    const loadingToast = toast.loading('Generating comprehensive PDF...');
    
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Helper function to add new page if needed
      const checkNewPage = (neededHeight = 20) => {
        if (yPos + neededHeight > pageHeight - margin) {
          pdf.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('JSON Comparison Report', margin, yPos);
      yPos += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
      pdf.text(`Output: ${outputFilename || 'comparison_report'}`, margin + 100, yPos);
      yPos += 15;

      // Summary Stats
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary Statistics', margin, yPos);
      yPos += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const stats = [
        `File 1 Tools: ${summary.file1_tools}`,
        `File 2 Tools: ${summary.file2_tools}`,
        `Same: ${summary.same_count}`,
        `Modified: ${summary.modified_count}`,
        `Added: ${summary.added_count}`,
        `Removed: ${summary.removed_count}`
      ];
      pdf.text(stats.join('   |   '), margin, yPos);
      yPos += 15;

      // Comparison Table
      checkNewPage(30);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Comparison Summary', margin, yPos);
      yPos += 8;

      // Table headers
      const compHeaders = ['Tool Name', 'In File1', 'In File2', 'Same?', 'Notes'];
      const compColWidths = [60, 25, 25, 25, pageWidth - margin * 2 - 135];
      
      pdf.setFillColor(68, 114, 196);
      pdf.rect(margin, yPos - 4, pageWidth - margin * 2, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      let xPos = margin;
      compHeaders.forEach((h, i) => {
        pdf.text(h, xPos + 2, yPos);
        xPos += compColWidths[i];
      });
      yPos += 6;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');

      // Table rows
      previewData.comparison?.forEach(row => {
        checkNewPage(8);
        xPos = margin;
        pdf.setFontSize(8);
        pdf.text(String(row.name || '').substring(0, 30), xPos + 2, yPos);
        xPos += compColWidths[0];
        pdf.text(row.in_file1 ? 'Yes' : 'No', xPos + 2, yPos);
        xPos += compColWidths[1];
        pdf.text(row.in_file2 ? 'Yes' : 'No', xPos + 2, yPos);
        xPos += compColWidths[2];
        pdf.text(row.desc_same === true ? 'Yes' : row.desc_same === false ? 'No' : 'N/A', xPos + 2, yPos);
        xPos += compColWidths[3];
        pdf.text(String(row.notes || '').substring(0, 50), xPos + 2, yPos);
        yPos += 5;
      });
      yPos += 10;

      // Differences Section
      checkNewPage(30);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Differences', margin, yPos);
      yPos += 8;

      if (previewData.differences?.length === 0) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.text('No differences found - all items are identical', margin, yPos);
        yPos += 10;
      } else {
        previewData.differences?.forEach(row => {
          checkNewPage(20);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${row.name} (${row.change_type})`, margin, yPos);
          yPos += 5;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          
          const desc1 = row.file1_desc || '-';
          const desc2 = row.file2_desc || '-';
          const splitDesc1 = pdf.splitTextToSize(`File1: ${desc1}`, pageWidth - margin * 2);
          const splitDesc2 = pdf.splitTextToSize(`File2: ${desc2}`, pageWidth - margin * 2);
          
          splitDesc1.forEach(line => {
            checkNewPage(5);
            pdf.text(line, margin, yPos);
            yPos += 4;
          });
          splitDesc2.forEach(line => {
            checkNewPage(5);
            pdf.text(line, margin, yPos);
            yPos += 4;
          });
          yPos += 3;
        });
      }

      // File 1 Tools
      pdf.addPage();
      yPos = margin;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`File 1 Tools (${previewData.file1_tools?.length || 0})`, margin, yPos);
      yPos += 8;

      previewData.file1_tools?.forEach(row => {
        checkNewPage(15);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${row.index}. ${row.name}`, margin, yPos);
        yPos += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        const splitDesc = pdf.splitTextToSize(row.description || '-', pageWidth - margin * 2);
        splitDesc.slice(0, 5).forEach(line => { // Limit to 5 lines per tool
          checkNewPage(5);
          pdf.text(line, margin, yPos);
          yPos += 4;
        });
        if (splitDesc.length > 5) {
          pdf.text('...', margin, yPos);
          yPos += 4;
        }
        yPos += 2;
      });

      // File 2 Tools
      pdf.addPage();
      yPos = margin;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`File 2 Tools (${previewData.file2_tools?.length || 0})`, margin, yPos);
      yPos += 8;

      previewData.file2_tools?.forEach(row => {
        checkNewPage(15);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${row.index}. ${row.name}`, margin, yPos);
        yPos += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        const splitDesc = pdf.splitTextToSize(row.description || '-', pageWidth - margin * 2);
        splitDesc.slice(0, 5).forEach(line => {
          checkNewPage(5);
          pdf.text(line, margin, yPos);
          yPos += 4;
        });
        if (splitDesc.length > 5) {
          pdf.text('...', margin, yPos);
          yPos += 4;
        }
        yPos += 2;
      });

      const filename = `${outputFilename || 'comparison_report'}.pdf`;
      pdf.save(filename);
      
      toast.success(`Downloaded ${filename} (${pdf.internal.getNumberOfPages()} pages)`, { id: loadingToast });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('PDF generation failed - try HTML export instead', { id: loadingToast });
    }
  }, [outputFilename, previewData, summary]);

  const handlePrint = useCallback(() => {
    if (!previewData || !summary) {
      toast.error('No data to print');
      return;
    }
    
    // Create a print-friendly window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked - please allow pop-ups');
      return;
    }
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>JSON Comparison Report - Print</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
    h1 { font-size: 18px; margin-bottom: 5px; }
    h2 { font-size: 14px; margin-top: 20px; border-bottom: 1px solid #333; padding-bottom: 5px; page-break-before: auto; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; page-break-inside: auto; }
    th, td { border: 1px solid #333; padding: 6px; text-align: left; font-size: 10px; vertical-align: top; }
    th { background-color: #4472C4; color: white; font-weight: bold; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    .summary { display: flex; gap: 15px; margin: 15px 0; flex-wrap: wrap; }
    .stat { text-align: center; padding: 10px 15px; border: 1px solid #ccc; min-width: 80px; border-radius: 4px; }
    .stat-value { font-size: 20px; font-weight: bold; }
    .stat-label { font-size: 9px; color: #666; }
    .file-header { font-size: 12px; color: #666; margin-top: 10px; margin-bottom: 5px; }
    .word-added { background-color: #C6EFCE; padding: 1px 3px; border-radius: 2px; }
    .word-removed { background-color: #FFC7CE; padding: 1px 3px; border-radius: 2px; text-decoration: line-through; }
    .same-row { background-color: #E8F5E9; }
    .modified-row { background-color: #FFF8E1; }
    .added-row { background-color: #E3F2FD; }
    .removed-row { background-color: #FFEBEE; }
    pre { white-space: pre-wrap; word-wrap: break-word; margin: 0; font-family: 'Courier New', monospace; font-size: 9px; }
    @media print { 
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <h1>JSON Comparison Report</h1>
  <p>Generated: ${new Date().toLocaleString()} | Output: ${outputFilename || 'comparison_report'}</p>
  
  <div class="summary">
    <div class="stat"><div class="stat-value">${summary.file1_tools}</div><div class="stat-label">File 1 Tools</div></div>
    <div class="stat"><div class="stat-value">${summary.file2_tools}</div><div class="stat-label">File 2 Tools</div></div>
    <div class="stat" style="background:#E8F5E9"><div class="stat-value">${summary.same_count}</div><div class="stat-label">Same</div></div>
    <div class="stat" style="background:#FFF8E1"><div class="stat-value">${summary.modified_count}</div><div class="stat-label">Modified</div></div>
    <div class="stat" style="background:#E3F2FD"><div class="stat-value">${summary.added_count}</div><div class="stat-label">Added</div></div>
    <div class="stat" style="background:#FFEBEE"><div class="stat-value">${summary.removed_count}</div><div class="stat-label">Removed</div></div>
  </div>

  <h2>Comparison Summary</h2>
  <table>
    <tr><th>Tool Name</th><th style="width:60px">In File1</th><th style="width:60px">In File2</th><th style="width:60px">Same?</th><th>Notes</th></tr>
    ${previewData.comparison?.map(r => `<tr class="${r.status}-row"><td><strong>${r.name}</strong></td><td style="text-align:center">${r.in_file1 ? '✓' : '✗'}</td><td style="text-align:center">${r.in_file2 ? '✓' : '✗'}</td><td style="text-align:center">${r.desc_same === true ? '✓' : r.desc_same === false ? '✗' : 'N/A'}</td><td>${r.notes}</td></tr>`).join('')}
  </table>

  <h2>Differences (with Word-Level Highlighting)</h2>
  <table>
    <tr><th style="width:150px">Tool Name</th><th>File1 Description</th><th>File2 Description</th><th style="width:100px">Change Type</th></tr>
    ${previewData.differences?.length === 0 ? '<tr><td colspan="4" style="text-align:center;padding:20px">No differences found - all items are identical</td></tr>' : 
      previewData.differences?.map(r => `<tr>
        <td><strong>${r.name}</strong></td>
        <td>${r.file1_diff?.map(d => d.type === 'removed' ? `<span class="word-removed">${d.text}</span>` : d.text).join(' ') || r.file1_desc || '-'}</td>
        <td>${r.file2_diff?.map(d => d.type === 'added' ? `<span class="word-added">${d.text}</span>` : d.text).join(' ') || r.file2_desc || '-'}</td>
        <td>${r.change_type}</td>
      </tr>`).join('')}
  </table>

  <div class="page-break"></div>
  
  <h2>File 1 Tools (${previewData.file1_tools?.length || 0})</h2>
  <div class="file-header">File: ${file1?.filename || 'file1.json'}</div>
  <table>
    <tr><th style="width:30px">#</th><th style="width:150px">Tool Name</th><th>Description</th></tr>
    ${previewData.file1_tools?.map(r => `<tr><td>${r.index}</td><td><strong>${r.name}</strong></td><td><pre>${r.description || '-'}</pre></td></tr>`).join('')}
  </table>

  <div class="page-break"></div>

  <h2>File 2 Tools (${previewData.file2_tools?.length || 0})</h2>
  <div class="file-header">File: ${file2?.filename || 'file2.json'}</div>
  <table>
    <tr><th style="width:30px">#</th><th style="width:150px">Tool Name</th><th>Description</th></tr>
    ${previewData.file2_tools?.map(r => `<tr><td>${r.index}</td><td><strong>${r.name}</strong></td><td><pre>${r.description || '-'}</pre></td></tr>`).join('')}
  </table>
  
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
    
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success('Print preview opened');
  }, [previewData, summary, file1, file2, outputFilename]);

  const handleGoogleSheetsLogin = useCallback(() => {
    // Show informative message about Google Sheets export
    toast.info(
      <div>
        <strong>Google Sheets Export</strong>
        <p className="text-xs mt-1">Use the Copy button in each tab to copy data with formatting, then paste directly into Google Sheets.</p>
      </div>,
      { duration: 5000 }
    );
  }, []);

  // Swap files function
  const handleSwapFiles = useCallback(() => {
    if (file1 && file2) {
      const temp = file1;
      setFile1(file2);
      setFile2(temp);
      toast.success('Files swapped');
    }
  }, [file1, file2]);

  // Clear all function
  const handleClearAll = useCallback(() => {
    setFile1(null);
    setFile2(null);
    setSummary(null);
    setPreviewData(null);
    setDownloadUrl(null);
    setCompareType('tools');
    setCustomPath('');
    setDetectedPaths([]);
    setTools([]);
    setSelectedTools(null);
    setOutputFilename('');
    toast.success('All data cleared');
  }, []);

  // Share comparison function
  const handleShareComparison = useCallback(async () => {
    if (!summary || !previewData) {
      toast.error('No comparison to share');
      return;
    }
    
    setShareDialog({ open: true, shareUrl: '', loading: true });
    
    try {
      const response = await axios.post(`${API}/share`, {
        file1_name: file1?.filename || 'file1.json',
        file2_name: file2?.filename || 'file2.json',
        compare_type: compareType,
        output_filename: outputFilename,
        summary: summary,
        preview_data: previewData,
        download_url: downloadUrl
      });
      
      const shareUrl = response.data.share_url;
      setShareDialog({ open: true, shareUrl, loading: false });
      toast.success('Shareable link generated!');
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to generate share link');
      setShareDialog({ open: false, shareUrl: '', loading: false });
    }
  }, [summary, previewData, file1, file2, compareType, outputFilename, downloadUrl]);

  const handleReset = () => {
    if (resetConfirm) {
      setFile1(null); setFile2(null);
      setDetectedPaths([]); setTools([]); setSelectedTools(null);
      setCompareType('tools'); setSelectedPath(''); setCustomPath('');
      setLogs([]); setSummary(null); setDownloadUrl(null); setPreviewData(null);
      setOutputFilename('');
      setResetConfirm(false);
      toast.info('Reset complete - all uploaded data has been cleared');
    } else {
      setResetConfirm(true);
      toast.info('Click Reset again to confirm. This will clear all uploaded files and comparison results.', { duration: 4000 });
      setTimeout(() => setResetConfirm(false), 4000); // Reset after 4 seconds
    }
  };

  const handleClearHistory = async () => {
    if (user) {
      await axios.delete(`${API}/history`, { withCredentials: true });
    } else {
      clearLocalHistory();
    }
    setHistory([]);
    toast.info('History cleared');
  };

  const handleDeleteHistory = async (id) => {
    if (user) {
      await axios.delete(`${API}/history/${id}`, { withCredentials: true });
      const res = await axios.get(`${API}/history`, { withCredentials: true });
      setHistory(res.data.history || []);
    } else {
      const newHistory = getLocalHistory().filter(h => h.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      setHistory(newHistory);
    }
  };

  const handleLoadHistory = (item) => {
    if (item.preview_data) {
      setPreviewData(item.preview_data);
      setSummary({
        file1_tools: item.file1_tools,
        file2_tools: item.file2_tools,
        same_count: item.same_count,
        modified_count: item.modified_count,
        added_count: item.added_count,
        removed_count: item.removed_count
      });
      setCompareType(item.compare_type);
      toast.success(`Loaded: ${item.file1_name} vs ${item.file2_name}`);
    } else {
      toast.info('No preview data available');
    }
  };

  const handleEditSave = (fileData, fileNumber) => {
    if (fileNumber === 1) setFile1(fileData);
    else setFile2(fileData);
  };

  const filteredTools = tools.filter(t => t.name.toLowerCase().includes(toolSearch.toLowerCase()));
  const isAllSelected = selectedTools === null || (selectedTools && selectedTools.length === tools.length);
  const toggleAllTools = () => { if (isAllSelected) setSelectedTools([]); else setSelectedTools(null); };
  const toggleTool = (toolName) => {
    if (selectedTools === null) setSelectedTools(tools.map(t => t.name).filter(n => n !== toolName));
    else if (selectedTools.includes(toolName)) setSelectedTools(selectedTools.filter(n => n !== toolName));
    else { const ns = [...selectedTools, toolName]; if (ns.length === tools.length) setSelectedTools(null); else setSelectedTools(ns); }
  };
  const isToolSelected = (name) => selectedTools === null || selectedTools.includes(name);
  const canCompare = file1?.valid && file2?.valid && !isComparing && outputFilename.trim().length > 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Esc to close edit dialog
      if (e.key === 'Escape' && editDialog.open) {
        setEditDialog({ open: false, fileId: null, filename: '', fileNumber: null });
      }
      
      // Ctrl+K or Cmd+K to focus search in tool selection
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('[data-testid="tool-search-input"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
      
      // Ctrl+S or Cmd+S to compare (when ready)
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && canCompare) {
        e.preventDefault();
        handleCompare();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editDialog.open, canCompare, handleCompare]);

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <Toaster position="bottom-right" />
      
      {/* Edit Dialog */}
      <EditFileDialog
        isOpen={editDialog.open}
        onClose={() => setEditDialog({ open: false, fileId: null, filename: '', fileNumber: null })}
        fileId={editDialog.fileId}
        filename={editDialog.filename}
        onSave={(data) => handleEditSave(data, editDialog.fileNumber)}
      />

      {/* Share Dialog */}
      <Dialog open={shareDialog.open} onOpenChange={(open) => !shareDialog.loading && setShareDialog({ ...shareDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Share Comparison
            </DialogTitle>
          </DialogHeader>
          {shareDialog.loading ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating shareable link...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-2">Shareable Link (expires in 30 days)</p>
                <div className="flex items-center gap-2">
                  <Input 
                    value={shareDialog.shareUrl} 
                    readOnly 
                    className="text-xs font-mono bg-background"
                    onClick={(e) => e.target.select()}
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-background border-border"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareDialog.shareUrl);
                        toast.success('Link copied to clipboard!');
                      } catch (err) {
                        // Fallback for older browsers
                        const textarea = document.createElement('textarea');
                        textarea.value = shareDialog.shareUrl;
                        textarea.style.position = 'fixed';
                        textarea.style.left = '-9999px';
                        document.body.appendChild(textarea);
                        textarea.focus();
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        toast.success('Link copied to clipboard!');
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view the comparison results. The link will expire in 30 days.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialog({ open: false, shareUrl: '', loading: false })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={helpDialog} onOpenChange={setHelpDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              How to Use JSON Compare Tool
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-base mb-2">About This Tool</h3>
              <p className="text-muted-foreground">
                JSON Compare is a powerful tool for comparing two JSON files side by side. It identifies differences, 
                additions, and removals between files, making it perfect for comparing API responses, configuration files, 
                or any JSON data.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-base mb-2">How to Use</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li><strong>Upload Files:</strong> Drag and drop or click to upload two JSON files (max 30 MB each)</li>
                <li><strong>Configure:</strong> Select comparison type (Tools, System, Entire Object, or Custom Path)</li>
                <li><strong>Enter Filename:</strong> Provide a name for your output report</li>
                <li><strong>Compare:</strong> Click "Compare & Generate" to see results</li>
                <li><strong>Export:</strong> Download as Excel, PDF, HTML, or print directly</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">Features</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Word-level diff highlighting for detailed comparison</li>
                <li>Filter results by Added, Removed, Modified, or Same</li>
                <li>Copy tables directly to Google Sheets with formatting</li>
                <li>Share comparison results via unique links</li>
                <li>Comparison history for quick access to previous results</li>
                <li>Dark/Light theme support</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">Keyboard Shortcuts</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li><kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl/Cmd + S</kbd> - Run comparison (when ready)</li>
                <li><kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl/Cmd + K</kbd> - Focus tool search</li>
                <li><kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd> - Close dialogs</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setHelpDialog(false)}>Got it!</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <header className="border-b bg-background sticky top-0 z-20 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md">
              <GitCompare className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <h1 className="text-xl font-bold tracking-tight" data-testid="app-title">JSON Compare</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setHelpDialog(true)} 
              className="gap-2"
              aria-label="Help"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleTheme} 
              className="gap-2"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{user.name}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={handleLogin} className="gap-2" data-testid="login-btn">
                <LogIn className="h-4 w-4" />Login
              </Button>
            )}
            <Button 
              variant={resetConfirm ? "destructive" : "ghost"} 
              size="sm" 
              onClick={handleReset} 
              className="gap-2" 
              data-testid="reset-btn"
            >
              <RotateCcw className="h-4 w-4" />
              {resetConfirm ? 'Confirm Reset?' : 'Reset'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-4">
        <div className="space-y-6">
          {/* Upload Section - Full Width */}
          <section className="print:hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileJson className="h-5 w-5" />Upload JSON Files
              </h2>
              {(file1 || file2) && (
                <div className="flex items-center gap-2">
                  {file1 && file2 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSwapFiles}
                      className="gap-2 h-8"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Swap Files
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearAll}
                    className="gap-2 h-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear All
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUploadZone 
                label="JSON File 1" 
                fileNumber={1} 
                onFileUploaded={(f) => handleFileUpload(f, 1)} 
                uploadedFile={file1} 
                isLoading={file1Loading}
                onEdit={() => setEditDialog({ open: true, fileId: file1?.file_id, filename: file1?.filename, fileNumber: 1 })}
              />
              <FileUploadZone 
                label="JSON File 2" 
                fileNumber={2} 
                onFileUploaded={(f) => handleFileUpload(f, 2)} 
                uploadedFile={file2} 
                isLoading={file2Loading}
                onEdit={() => setEditDialog({ open: true, fileId: file2?.file_id, filename: file2?.filename, fileNumber: 2 })}
              />
            </div>
          </section>

          {/* Configuration & Compare Section - Shows when both files are uploaded */}
          {file1?.valid && file2?.valid && (
            <section className="print:hidden border rounded-lg bg-card p-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Configuration */}
                <div className="lg:col-span-1">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                    <Settings2 className="h-4 w-4" />Configuration
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">What to Compare</Label>
                      <Select value={compareType} onValueChange={setCompareType}>
                        <SelectTrigger className="h-9" data-testid="compare-type-select"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tools">Tools</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="entire">Entire Object</SelectItem>
                          <SelectItem value="custom">Custom Path</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {compareType === 'tools' && detectedPaths.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Tool Path</Label>
                        <Select value={selectedPath} onValueChange={setSelectedPath}>
                          <SelectTrigger className="h-9" data-testid="path-select"><SelectValue placeholder="Select path" /></SelectTrigger>
                          <SelectContent>
                            {detectedPaths.map((p, i) => (
                              <SelectItem key={i} value={p.path_string}>{p.path_string} ({p.tool_count} items)</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {compareType === 'custom' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Custom Path</Label>
                        <Input value={customPath} onChange={(e) => setCustomPath(e.target.value)} placeholder="e.g., data.items" className="h-9 font-mono text-sm" data-testid="custom-path-input" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Tool Selection - Only shows for 'tools' compare type */}
                {compareType === 'tools' && tools.length > 0 && (
                  <div className="lg:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                        <Filter className="h-4 w-4" />Tools
                      </h3>
                      <Badge variant="secondary" className="text-xs">{selectedTools === null ? tools.length : selectedTools.length}/{tools.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input value={toolSearch} onChange={(e) => setToolSearch(e.target.value)} placeholder="Search..." className="pl-8 h-8 text-sm" data-testid="tool-search-input" />
                      </div>
                      <div className="border rounded-md">
                        <div className="tool-item border-b px-3 py-2" onClick={toggleAllTools} data-testid="select-all-tools">
                          <Checkbox checked={isAllSelected} className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">Select All</span>
                        </div>
                        <ScrollArea className="h-[100px]">
                          <div className="p-1">
                            {filteredTools.map((tool, idx) => (
                              <div key={idx} className={cn("tool-item px-2 py-1.5 rounded", isToolSelected(tool.name) && "bg-accent/50")} onClick={() => toggleTool(tool.name)} data-testid={`tool-item-${idx}`}>
                                <Checkbox checked={isToolSelected(tool.name)} className="h-3.5 w-3.5" />
                                <span className="text-xs truncate">{tool.name}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                )}

                {/* Output Filename */}
                <div className={cn("lg:col-span-1", compareType !== 'tools' || tools.length === 0 ? "lg:col-start-2" : "")}>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                    <FileText className="h-4 w-4" />Output
                  </h3>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Filename <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      value={outputFilename} 
                      onChange={(e) => setOutputFilename(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                      placeholder="Enter filename"
                      className={cn("h-9", !outputFilename.trim() && "border-red-300 focus:border-red-400")}
                      data-testid="output-filename-input"
                      required
                    />
                    {!outputFilename.trim() && (
                      <p className="text-[10px] text-red-500">Required to proceed</p>
                    )}
                  </div>
                </div>

                {/* Compare Button */}
                <div className={cn("lg:col-span-1 flex items-end", compareType !== 'tools' || tools.length === 0 ? "lg:col-start-4" : "")}>
                  <Button 
                    onClick={handleCompare} 
                    disabled={!canCompare} 
                    className="w-full h-11 text-sm gap-2" 
                    data-testid="compare-btn"
                  >
                    {isComparing ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Comparing...</>
                    ) : (
                      <><GitCompare className="h-4 w-4" />Compare &amp; Generate</>
                    )}
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* Placeholder when files not uploaded */}
          {(!file1?.valid || !file2?.valid) && (
            <section className="print:hidden">
              <div className="border rounded-lg bg-muted/30 p-8 text-center">
                <Settings2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">Upload both JSON files to see configuration options</p>
              </div>
            </section>
          )}

          {/* Results Section */}
          {summary && (
            <section className="animate-fade-in space-y-6">
              <SummaryStats summary={summary} />
              <ExcelPreview 
                previewData={previewData} 
                previewRef={previewRef}
                comparisonFilter={comparisonFilter}
                setComparisonFilter={setComparisonFilter}
              />
              <div className="print:hidden">
                <ExportPanel 
                  onDownload={handleDownload}
                  onExportHtml={handleExportHtml}
                  onExportPdf={handleExportPdf}
                  onPrint={handlePrint}
                  onLogin={handleGoogleSheetsLogin}
                  onShare={handleShareComparison}
                  isDownloading={isDownloading}
                  user={user}
                />
              </div>
            </section>
          )}

          {/* History Section */}
          {history.length > 0 && (
            <section className="print:hidden">
              <HistoryPanel 
                history={history} 
                onLoadHistory={handleLoadHistory}
                onClearHistory={handleClearHistory}
                onDeleteHistory={handleDeleteHistory}
              />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
