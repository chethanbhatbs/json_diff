import { useState, useCallback, useEffect } from "react";
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
  Table,
  Eye
} from "lucide-react";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Checkbox } from "./components/ui/checkbox";
import { Badge } from "./components/ui/badge";
import { ScrollArea } from "./components/ui/scroll-area";
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
import { cn } from "./lib/utils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// History management
const HISTORY_KEY = 'json_compare_history';
const MAX_HISTORY_ITEMS = 10;

function getHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHistory(item) {
  try {
    const history = getHistory();
    const newHistory = [item, ...history.filter(h => h.id !== item.id)].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    return newHistory;
  } catch {
    return [];
  }
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

// File Upload Component
function FileUploadZone({ label, fileNumber, onFileUploaded, uploadedFile, isLoading }) {
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
        {uploadedFile && (
          <span className={cn("status-badge", isSuccess ? "success" : "error")}>
            {isSuccess ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {isSuccess ? 'Valid JSON' : 'Invalid'}
          </span>
        )}
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
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Drop JSON file or click to browse</span>
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

// Progress Terminal Component
function ProgressTerminal({ logs, isProcessing }) {
  return (
    <div className="config-panel p-0 overflow-hidden" data-testid="progress-terminal">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-zinc-50">
        <Terminal className="h-4 w-4 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Progress Log</span>
        {isProcessing && <Loader2 className="h-3 w-3 text-blue-500 animate-spin ml-auto" />}
      </div>
      <div className="terminal max-h-[150px] overflow-y-auto rounded-none">
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

// Excel Preview Component
function ExcelPreview({ previewData }) {
  const [activeTab, setActiveTab] = useState("comparison");
  const [copiedTab, setCopiedTab] = useState(null);
  
  if (!previewData) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'same': return 'bg-green-100 text-green-800';
      case 'modified': return 'bg-yellow-100 text-yellow-800';
      case 'added': return 'bg-blue-100 text-blue-800';
      case 'removed': return 'bg-red-100 text-red-800';
      default: return '';
    }
  };

  const getChangeTypeColor = (type) => {
    if (type === 'Added in File2') return 'bg-green-100 text-green-700';
    if (type === 'Removed from File2') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  // Copy functions for each tab - creates tab-separated values for Google Sheets
  const copyComparison = () => {
    const headers = ['Tool Name', 'In File1', 'In File2', 'Same?', 'Notes'];
    const rows = previewData.comparison?.map(row => [
      row.name,
      row.in_file1 ? 'Yes' : 'No',
      row.in_file2 ? 'Yes' : 'No',
      row.desc_same === true ? 'Yes' : row.desc_same === false ? 'No' : 'N/A',
      row.notes
    ]) || [];
    const tsv = [headers, ...rows].map(row => row.join('\t')).join('\n');
    navigator.clipboard.writeText(tsv);
    setCopiedTab('comparison');
    toast.success('Comparison data copied! Paste into Google Sheets.');
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const copyDifferences = () => {
    const headers = ['Tool Name', 'File1 Description', 'File2 Description', 'Change Type'];
    const rows = previewData.differences?.map(row => [
      row.name,
      row.file1_desc || '',
      row.file2_desc || '',
      row.change_type
    ]) || [];
    const tsv = [headers, ...rows].map(row => row.join('\t')).join('\n');
    navigator.clipboard.writeText(tsv);
    setCopiedTab('differences');
    toast.success('Differences data copied! Paste into Google Sheets.');
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const copyFile1 = () => {
    const headers = ['#', 'Tool Name', 'Description'];
    const rows = previewData.file1_tools?.map(row => [
      row.index,
      row.name,
      row.description
    ]) || [];
    const tsv = [headers, ...rows].map(row => row.join('\t')).join('\n');
    navigator.clipboard.writeText(tsv);
    setCopiedTab('file1');
    toast.success('File 1 data copied! Paste into Google Sheets.');
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const copyFile2 = () => {
    const headers = ['#', 'Tool Name', 'Description'];
    const rows = previewData.file2_tools?.map(row => [
      row.index,
      row.name,
      row.description
    ]) || [];
    const tsv = [headers, ...rows].map(row => row.join('\t')).join('\n');
    navigator.clipboard.writeText(tsv);
    setCopiedTab('file2');
    toast.success('File 2 data copied! Paste into Google Sheets.');
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const copyAll = () => {
    let allData = '';
    
    // Comparison sheet
    allData += '=== COMPARISON ===\n';
    const compHeaders = ['Tool Name', 'In File1', 'In File2', 'Same?', 'Notes'];
    const compRows = previewData.comparison?.map(row => [
      row.name,
      row.in_file1 ? 'Yes' : 'No',
      row.in_file2 ? 'Yes' : 'No',
      row.desc_same === true ? 'Yes' : row.desc_same === false ? 'No' : 'N/A',
      row.notes
    ]) || [];
    allData += [compHeaders, ...compRows].map(row => row.join('\t')).join('\n');
    
    // Differences sheet
    allData += '\n\n=== DIFFERENCES ===\n';
    const diffHeaders = ['Tool Name', 'File1 Description', 'File2 Description', 'Change Type'];
    const diffRows = previewData.differences?.map(row => [
      row.name,
      row.file1_desc || '',
      row.file2_desc || '',
      row.change_type
    ]) || [];
    allData += [diffHeaders, ...diffRows].map(row => row.join('\t')).join('\n');
    
    // File1 sheet
    allData += '\n\n=== FILE 1 TOOLS ===\n';
    const f1Headers = ['#', 'Tool Name', 'Description'];
    const f1Rows = previewData.file1_tools?.map(row => [row.index, row.name, row.description]) || [];
    allData += [f1Headers, ...f1Rows].map(row => row.join('\t')).join('\n');
    
    // File2 sheet
    allData += '\n\n=== FILE 2 TOOLS ===\n';
    const f2Headers = ['#', 'Tool Name', 'Description'];
    const f2Rows = previewData.file2_tools?.map(row => [row.index, row.name, row.description]) || [];
    allData += [f2Headers, ...f2Rows].map(row => row.join('\t')).join('\n');
    
    navigator.clipboard.writeText(allData);
    setCopiedTab('all');
    toast.success('All data copied! Paste into Google Sheets.');
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const CopyButton = ({ onClick, tabName }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-7 px-2 text-xs gap-1"
      data-testid={`copy-${tabName}-btn`}
    >
      {copiedTab === tabName ? (
        <><Check className="h-3 w-3 text-green-600" />Copied!</>
      ) : (
        <><Copy className="h-3 w-3" />Copy</>
      )}
    </Button>
  );

  return (
    <div className="border rounded-lg bg-card overflow-hidden" data-testid="excel-preview">
      <div className="p-4 border-b bg-zinc-50">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Excel Preview</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Preview the comparison results before downloading</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4 pt-3 border-b">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="comparison" className="text-xs">
              Comparison ({previewData.comparison?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="differences" className="text-xs">
              Differences ({previewData.differences?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="file1" className="text-xs">
              File 1 ({previewData.file1_tools?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="file2" className="text-xs">
              File 2 ({previewData.file2_tools?.length || 0})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="comparison" className="m-0">
          <ScrollArea className="h-[300px]">
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
                {previewData.comparison?.map((row, idx) => (
                  <TableRow key={idx} className={getStatusColor(row.status)}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className={cn("text-center", row.in_file1 ? "bg-green-200" : "bg-red-200")}>
                      {row.in_file1 ? '✓' : '✗'}
                    </TableCell>
                    <TableCell className={cn("text-center", row.in_file2 ? "bg-green-200" : "bg-red-200")}>
                      {row.in_file2 ? '✓' : '✗'}
                    </TableCell>
                    <TableCell className={cn("text-center", 
                      row.desc_same === true ? "bg-green-200" : 
                      row.desc_same === false ? "bg-yellow-200" : ""
                    )}>
                      {row.desc_same === true ? '✓' : row.desc_same === false ? '✗' : 'N/A'}
                    </TableCell>
                    <TableCell>{row.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </UITable>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="differences" className="m-0">
          <ScrollArea className="h-[300px]">
            <UITable>
              <TableHeader>
                <TableRow className="bg-blue-600 hover:bg-blue-600">
                  <TableHead className="text-white font-bold w-[150px]">Tool Name</TableHead>
                  <TableHead className="text-white font-bold">File1 Description</TableHead>
                  <TableHead className="text-white font-bold">File2 Description</TableHead>
                  <TableHead className="text-white font-bold w-[120px]">Change Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.differences?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No differences found - all items are identical
                    </TableCell>
                  </TableRow>
                ) : (
                  previewData.differences?.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium align-top">{row.name}</TableCell>
                      <TableCell className={cn("text-xs align-top", row.change_type === 'Removed from File2' || row.change_type === 'Modified' ? "bg-red-50" : "")}>
                        <pre className="whitespace-pre-wrap font-mono">{row.file1_desc || '-'}</pre>
                      </TableCell>
                      <TableCell className={cn("text-xs align-top", row.change_type === 'Added in File2' || row.change_type === 'Modified' ? "bg-green-50" : "")}>
                        <pre className="whitespace-pre-wrap font-mono">{row.file2_desc || '-'}</pre>
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
          <ScrollArea className="h-[300px]">
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
                    <TableCell className="text-xs">
                      <pre className="whitespace-pre-wrap font-mono max-w-[500px]">{row.description}</pre>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </UITable>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="file2" className="m-0">
          <ScrollArea className="h-[300px]">
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
                    <TableCell className="text-xs">
                      <pre className="whitespace-pre-wrap font-mono max-w-[500px]">{row.description}</pre>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </UITable>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Summary Stats Component  
function SummaryStats({ summary }) {
  if (!summary) return null;

  const stats = [
    { label: 'File 1', value: summary.file1_tools, icon: FileSpreadsheet, color: 'text-zinc-700' },
    { label: 'File 2', value: summary.file2_tools, icon: FileSpreadsheet, color: 'text-zinc-700' },
    { label: 'Same', value: summary.same_count, icon: Equal, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Modified', value: summary.modified_count, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Added', value: summary.added_count, icon: Check, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Removed', value: summary.removed_count, icon: X, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="stats-grid mb-4">
      {stats.map((stat, idx) => (
        <div key={idx} className={cn("summary-stat", stat.bg)}>
          <stat.icon className={cn("h-4 w-4 mb-1", stat.color)} />
          <span className={cn("text-xl font-bold", stat.color)}>{stat.value}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

// Download Panel Component
function DownloadPanel({ onDownload, outputFilename, setOutputFilename, isDownloading }) {
  return (
    <div className="border rounded-lg bg-card p-4" data-testid="download-panel">
      <div className="flex items-center gap-2 mb-3">
        <Download className="h-4 w-4 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Download Excel</span>
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-xs font-medium mb-1 block">Output Filename</Label>
          <Input 
            value={outputFilename} 
            onChange={(e) => setOutputFilename(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
            placeholder="comparison_report"
            className="h-9"
            data-testid="output-filename-input"
          />
          <p className="text-[10px] text-muted-foreground mt-1">.xlsx will be added automatically</p>
        </div>
        <Button onClick={onDownload} className="w-full gap-2" disabled={isDownloading} data-testid="download-excel-btn">
          {isDownloading ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Downloading...</>
          ) : (
            <><Download className="h-4 w-4" />Download Excel File</>
          )}
        </Button>
      </div>
    </div>
  );
}

// History Panel Component
function HistoryPanel({ history, onLoadHistory, onClearHistory }) {
  if (history.length === 0) return null;

  return (
    <div className="config-panel" data-testid="history-panel">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Recent Comparisons</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClearHistory} className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3 w-3 mr-1" />Clear
        </Button>
      </div>
      <ScrollArea className="h-[120px]">
        <div className="space-y-2">
          {history.map((item, idx) => (
            <div 
              key={item.id} 
              className="p-2 rounded border hover:bg-zinc-50 cursor-pointer transition-colors"
              onClick={() => onLoadHistory(item)}
              data-testid={`history-item-${idx}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{item.file1Name} vs {item.file2Name}</span>
                <Badge variant="secondary" className="text-[10px]">{item.compareType}</Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{new Date(item.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
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
  const [outputFilename, setOutputFilename] = useState('comparison_report');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, { message, type, timestamp }]);
  }, []);

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
          addLog(`Detected ${analyzeRes.data.detected_paths.length} tool paths`);
        }
      } else {
        addLog(`Invalid JSON in ${file.name}: ${response.data.error}`, 'error');
        toast.error(`Invalid JSON: ${response.data.error}`);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message;
      addLog(`Upload failed: ${errorMsg}`, 'error');
      toast.error(`Upload failed: ${errorMsg}`);
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
        if (res.data.tools) {
          setTools(res.data.tools);
          addLog(`Found ${res.data.tools.length} tools`);
        }
      } catch (error) {
        console.error('Error fetching tools:', error);
      }
    };
    fetchTools();
  }, [file1?.file_id, selectedPath, customPath, compareType, addLog]);

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
      addLog(`Same: ${response.data.same_count} | Modified: ${response.data.modified_count} | Added: ${response.data.added_count} | Removed: ${response.data.removed_count}`);
      
      setSummary(response.data);
      setDownloadUrl(`${API}/download/${response.data.excel_filename}`);
      setPreviewData(response.data.preview_data);
      
      const historyItem = {
        id: Date.now().toString(),
        file1Name: file1.filename,
        file2Name: file2.filename,
        compareType,
        selectedPath: path,
        same: response.data.same_count,
        modified: response.data.modified_count,
        added: response.data.added_count,
        removed: response.data.removed_count,
        timestamp: new Date().toISOString()
      };
      setHistory(saveHistory(historyItem));
      
      toast.success('Comparison complete! See preview below.');
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message;
      addLog(`Comparison failed: ${errorMsg}`, 'error');
      toast.error(`Comparison failed: ${errorMsg}`);
    } finally {
      setIsComparing(false);
    }
  }, [file1, file2, compareType, customPath, selectedPath, selectedTools, addLog]);

  const handleDownload = useCallback(async () => {
    if (!downloadUrl) return;
    
    setIsDownloading(true);
    try {
      addLog('Preparing Excel file for download...', 'info');
      const response = await axios.get(downloadUrl, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${outputFilename || 'comparison_report'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      addLog(`Excel file "${outputFilename}.xlsx" downloaded successfully`, 'success');
      toast.success(`File saved as "${outputFilename}.xlsx"`);
    } catch (error) {
      addLog('Download failed', 'error');
      toast.error('Failed to download file');
    } finally {
      setIsDownloading(false);
    }
  }, [downloadUrl, outputFilename, addLog]);
  
  const handleReset = () => {
    setFile1(null); setFile2(null);
    setDetectedPaths([]); setTools([]); setSelectedTools(null);
    setCompareType('tools'); setSelectedPath(''); setCustomPath('');
    setLogs([]); setSummary(null); setDownloadUrl(null); setPreviewData(null);
    setOutputFilename('comparison_report');
    toast.info('Reset complete');
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
    toast.info('History cleared');
  };

  const handleLoadHistory = (item) => {
    setCompareType(item.compareType);
    if (item.selectedPath) setSelectedPath(item.selectedPath);
    toast.info(`Loaded settings from: ${item.file1Name} vs ${item.file2Name}`);
  };

  const filteredTools = tools.filter(t => t.name.toLowerCase().includes(toolSearch.toLowerCase()));
  const isAllSelected = selectedTools === null || (selectedTools && selectedTools.length === tools.length);
  
  const toggleAllTools = () => {
    if (isAllSelected) setSelectedTools([]);
    else setSelectedTools(null);
  };

  const toggleTool = (toolName) => {
    if (selectedTools === null) {
      setSelectedTools(tools.map(t => t.name).filter(n => n !== toolName));
    } else if (selectedTools.includes(toolName)) {
      setSelectedTools(selectedTools.filter(n => n !== toolName));
    } else {
      const newSelection = [...selectedTools, toolName];
      if (newSelection.length === tools.length) setSelectedTools(null);
      else setSelectedTools(newSelection);
    }
  };

  const isToolSelected = (name) => selectedTools === null || selectedTools.includes(name);
  const canCompare = file1?.valid && file2?.valid && !isComparing;

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      
      <header className="border-b bg-background sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-100 rounded-md">
              <GitCompare className="h-5 w-5 text-zinc-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" data-testid="app-title">JSON Compare</h1>
              <p className="text-xs text-muted-foreground">Compare JSON files and generate Excel reports</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2" data-testid="reset-btn">
            <RotateCcw className="h-4 w-4" />Reset
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileJson className="h-5 w-5" />Upload JSON Files
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUploadZone label="JSON File 1" fileNumber={1} onFileUploaded={(f) => handleFileUpload(f, 1)} uploadedFile={file1} isLoading={file1Loading} />
                <FileUploadZone label="JSON File 2" fileNumber={2} onFileUploaded={(f) => handleFileUpload(f, 2)} uploadedFile={file2} isLoading={file2Loading} />
              </div>
            </section>

            {/* Results Section */}
            {summary && (
              <section className="animate-fade-in space-y-4">
                <div className="flex items-center gap-2">
                  <Table className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Comparison Results</h2>
                </div>
                
                {/* Summary Stats */}
                <SummaryStats summary={summary} />
                
                {/* Excel Preview */}
                <ExcelPreview previewData={previewData} />
                
                {/* Download Panel */}
                <DownloadPanel 
                  onDownload={handleDownload}
                  outputFilename={outputFilename}
                  setOutputFilename={setOutputFilename}
                  isDownloading={isDownloading}
                />
              </section>
            )}

            {/* History Panel */}
            {history.length > 0 && !summary && (
              <section className="animate-fade-in">
                <HistoryPanel 
                  history={history} 
                  onLoadHistory={handleLoadHistory}
                  onClearHistory={handleClearHistory}
                />
              </section>
            )}
          </div>

          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings2 className="h-5 w-5" />Configuration
              </h2>
              <div className="config-panel" data-testid="comparison-config">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">What to Compare</Label>
                    <Select value={compareType} onValueChange={setCompareType}>
                      <SelectTrigger className="h-9" data-testid="compare-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tools">Tools</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="entire">Entire Object</SelectItem>
                        <SelectItem value="custom">Custom Path</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {compareType === 'tools' && detectedPaths.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Tool Path</Label>
                      <Select value={selectedPath} onValueChange={setSelectedPath}>
                        <SelectTrigger className="h-9" data-testid="path-select">
                          <SelectValue placeholder="Select path" />
                        </SelectTrigger>
                        <SelectContent>
                          {detectedPaths.map((p, i) => (
                            <SelectItem key={i} value={p.path_string}>
                              {p.path_string} ({p.tool_count} items)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {compareType === 'custom' && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Custom Path</Label>
                      <Input value={customPath} onChange={(e) => setCustomPath(e.target.value)} placeholder="e.g., data.items" className="h-9 font-mono text-sm" data-testid="custom-path-input" />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {compareType === 'tools' && tools.length > 0 && (
              <section className="animate-fade-in">
                <div className="config-panel" data-testid="tool-selector">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Tool Selection</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {selectedTools === null ? tools.length : selectedTools.length} / {tools.length}
                    </Badge>
                  </div>
                  
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={toolSearch} onChange={(e) => setToolSearch(e.target.value)} placeholder="Search tools..." className="pl-9 h-8 text-sm" data-testid="tool-search-input" />
                  </div>

                  <div className="tool-item mb-2 border-b pb-2" onClick={toggleAllTools} data-testid="select-all-tools">
                    <Checkbox checked={isAllSelected} className="h-4 w-4" />
                    <span className="text-sm font-medium">Select All</span>
                  </div>

                  <ScrollArea className="h-[150px]">
                    <div className="space-y-1">
                      {filteredTools.map((tool, idx) => (
                        <div key={idx} className={cn("tool-item", isToolSelected(tool.name) && "selected")} onClick={() => toggleTool(tool.name)} data-testid={`tool-item-${idx}`}>
                          <Checkbox checked={isToolSelected(tool.name)} className="h-4 w-4" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{tool.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </section>
            )}

            <section>
              <ProgressTerminal logs={logs} isProcessing={isComparing} />
            </section>

            <Button onClick={handleCompare} disabled={!canCompare} className="w-full h-12 text-base gap-2" data-testid="compare-btn">
              {isComparing ? (
                <><Loader2 className="h-5 w-5 animate-spin" />Comparing...</>
              ) : (
                <><GitCompare className="h-5 w-5" />Compare &amp; Generate Excel</>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
