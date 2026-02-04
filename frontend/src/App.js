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
  ChevronRight,
  Search,
  Terminal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Equal,
  FileSpreadsheet,
  Filter,
  AlertCircle
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
import { cn } from "./lib/utils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// File Upload Component
function FileUploadZone({ label, fileNumber, onFileUploaded, uploadedFile, isLoading }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
      onFileUploaded(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileUploaded(file);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const isSuccess = uploadedFile?.valid;
  const isError = uploadedFile?.valid === false;

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
        <input id={`file-input-${fileNumber}`} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />

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

      {uploadedFile?.error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs text-red-600 font-mono">{uploadedFile.error}</p>
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
      <div className="terminal max-h-[200px] overflow-y-auto rounded-none">
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

// Summary Panel Component
function SummaryPanel({ summary, onDownload }) {
  if (!summary) return null;

  const stats = [
    { label: 'File 1 Tools', value: summary.file1_tools, icon: FileSpreadsheet, color: 'text-zinc-700' },
    { label: 'File 2 Tools', value: summary.file2_tools, icon: FileSpreadsheet, color: 'text-zinc-700' },
    { label: 'Same', value: summary.same_count, icon: Equal, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Modified', value: summary.modified_count, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Added', value: summary.added_count, icon: Check, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Removed', value: summary.removed_count, icon: X, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="border rounded-lg bg-card overflow-hidden" data-testid="summary-panel">
      <div className="p-4 border-b bg-zinc-50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Comparison Complete</h3>
          <p className="text-sm text-muted-foreground">Excel report generated successfully</p>
        </div>
        <Button onClick={onDownload} className="gap-2" data-testid="download-excel-btn">
          <Download className="h-4 w-4" />Download Excel
        </Button>
      </div>
      <div className="p-4">
        <div className="stats-grid">
          {stats.map((stat, idx) => (
            <div key={idx} className={cn("summary-stat", stat.bg)} data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}>
              <stat.icon className={cn("h-5 w-5 mb-1", stat.color)} />
              <span className={cn("text-2xl font-bold", stat.color)}>{stat.value}</span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [file1Loading, setFile1Loading] = useState(false);
  const [file2Loading, setFile2Loading] = useState(false);
  const [file1Structure, setFile1Structure] = useState(null);
  const [file2Structure, setFile2Structure] = useState(null);
  const [detectedPaths, setDetectedPaths] = useState([]);
  const [tools, setTools] = useState([]);
  const [selectedTools, setSelectedTools] = useState(null);
  const [compareType, setCompareType] = useState('tools');
  const [selectedPath, setSelectedPath] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [logs, setLogs] = useState([]);
  const [isComparing, setIsComparing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [toolSearch, setToolSearch] = useState('');

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, { message, type, timestamp }]);
  }, []);

  const handleFileUpload = useCallback(async (file, fileNumber) => {
    const setLoading = fileNumber === 1 ? setFile1Loading : setFile2Loading;
    const setFileData = fileNumber === 1 ? setFile1 : setFile2;
    const setStructure = fileNumber === 1 ? setFile1Structure : setFile2Structure;
    
    setLoading(true);
    addLog(`Uploading ${file.name}...`);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/upload`, formData);
      setFileData(response.data);
      
      if (response.data.valid) {
        addLog(`File ${fileNumber} uploaded: ${file.name}`, 'success');
        const structureRes = await axios.get(`${API}/structure/${response.data.file_id}`);
        setStructure(structureRes.data.structure);
        
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
        addLog(`Invalid JSON in ${file.name}`, 'error');
        toast.error(`Invalid JSON: ${response.data.error}`);
      }
    } catch (error) {
      addLog(`Upload failed: ${error.message}`, 'error');
      toast.error(`Upload failed`);
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
      toast.success('Comparison complete!');
    } catch (error) {
      addLog(`Comparison failed: ${error.message}`, 'error');
      toast.error(`Comparison failed`);
    } finally {
      setIsComparing(false);
    }
  }, [file1, file2, compareType, customPath, selectedPath, selectedTools, addLog]);

  const handleDownload = () => { if (downloadUrl) window.open(downloadUrl, '_blank'); };
  
  const handleReset = () => {
    setFile1(null); setFile2(null); setFile1Structure(null); setFile2Structure(null);
    setDetectedPaths([]); setTools([]); setSelectedTools(null);
    setCompareType('tools'); setSelectedPath(''); setCustomPath('');
    setLogs([]); setSummary(null); setDownloadUrl(null);
    toast.info('Reset complete');
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

            {summary && (
              <section className="animate-fade-in">
                <SummaryPanel summary={summary} onDownload={handleDownload} />
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

                  <ScrollArea className="h-[200px]">
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

            {downloadUrl && !isComparing && (
              <Button onClick={handleDownload} variant="outline" className="w-full gap-2" data-testid="quick-download-btn">
                <Download className="h-4 w-4" />Download Report
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
