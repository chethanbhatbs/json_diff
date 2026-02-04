import { useState, useCallback, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { FileUploadZone } from "./components/FileUploadZone";
import { JsonTreeView } from "./components/JsonTreeView";
import { ComparisonConfig } from "./components/ComparisonConfig";
import { ToolSelector } from "./components/ToolSelector";
import { ProgressTerminal } from "./components/ProgressTerminal";
import { SummaryPanel } from "./components/SummaryPanel";
import { Button } from "./components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { 
  FileJson, 
  GitCompare, 
  RotateCcw, 
  Loader2,
  FileSearch,
  Settings2,
  Download
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  // File states
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [file1Loading, setFile1Loading] = useState(false);
  const [file2Loading, setFile2Loading] = useState(false);
  
  // Structure states
  const [file1Structure, setFile1Structure] = useState(null);
  const [file2Structure, setFile2Structure] = useState(null);
  
  // Analysis states
  const [detectedPaths, setDetectedPaths] = useState([]);
  const [tools, setTools] = useState([]);
  const [selectedTools, setSelectedTools] = useState(null);
  
  // Config state
  const [config, setConfig] = useState({
    compareType: 'tools',
    selectedPath: '',
    customPath: ''
  });
  
  // Progress states
  const [logs, setLogs] = useState([]);
  const [isComparing, setIsComparing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, { message, type, timestamp }]);
  }, []);

  // Upload file handler
  const handleFileUpload = useCallback(async (file, fileNumber) => {
    const setLoading = fileNumber === 1 ? setFile1Loading : setFile2Loading;
    const setFileData = fileNumber === 1 ? setFile1 : setFile2;
    const setStructure = fileNumber === 1 ? setFile1Structure : setFile2Structure;
    
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
        
        // Fetch full structure for tree view
        const structureRes = await axios.get(`${API}/structure/${response.data.file_id}`);
        setStructure(structureRes.data.structure);
        
        // Analyze for paths
        const analyzeRes = await axios.get(`${API}/analyze/${response.data.file_id}`);
        if (analyzeRes.data.detected_paths.length > 0) {
          setDetectedPaths(prev => {
            const combined = [...prev, ...analyzeRes.data.detected_paths];
            const unique = combined.filter((v, i, a) => 
              a.findIndex(t => t.path_string === v.path_string) === i
            );
            return unique;
          });
          addLog(`Detected ${analyzeRes.data.detected_paths.length} potential tool paths`);
        }
      } else {
        addLog(`Invalid JSON in ${file.name}: ${response.data.error}`, 'error');
        toast.error(`Invalid JSON: ${response.data.error}`);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message;
      addLog(`Upload failed: ${errorMsg}`, 'error');
      toast.error(`Upload failed: ${errorMsg}`);
      setFileData({ valid: false, error: errorMsg, filename: file.name });
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  // Fetch tools when files are uploaded and path is selected
  useEffect(() => {
    const fetchTools = async () => {
      if (!file1?.file_id || config.compareType !== 'tools') return;
      
      try {
        const path = config.compareType === 'custom' ? config.customPath : config.selectedPath;
        const res = await axios.get(`${API}/tools/${file1.file_id}`, {
          params: { path: path || undefined }
        });
        
        if (res.data.tools) {
          setTools(res.data.tools);
          addLog(`Found ${res.data.tools.length} tools at path: ${res.data.path || 'auto-detected'}`);
        }
      } catch (error) {
        console.error('Error fetching tools:', error);
      }
    };
    
    fetchTools();
  }, [file1?.file_id, config.selectedPath, config.customPath, config.compareType, addLog]);

  // Compare handler
  const handleCompare = useCallback(async () => {
    if (!file1?.file_id || !file2?.file_id) {
      toast.error('Please upload both JSON files first');
      return;
    }
    
    setIsComparing(true);
    setSummary(null);
    setDownloadUrl(null);
    addLog('Starting comparison...', 'info');
    
    try {
      addLog('Extracting tools from both files...');
      
      const path = config.compareType === 'custom' ? config.customPath : config.selectedPath;
      
      const response = await axios.post(`${API}/compare`, {
        file1_id: file1.file_id,
        file2_id: file2.file_id,
        compare_type: config.compareType,
        custom_path: path || null,
        selected_tools: selectedTools
      });
      
      addLog(`Comparison complete!`, 'success');
      addLog(`File 1: ${response.data.file1_tools} tools`);
      addLog(`File 2: ${response.data.file2_tools} tools`);
      addLog(`Same: ${response.data.same_count} | Modified: ${response.data.modified_count} | Added: ${response.data.added_count} | Removed: ${response.data.removed_count}`);
      addLog('Excel report generated successfully', 'success');
      
      setSummary(response.data);
      setDownloadUrl(`${API}/download/${response.data.excel_filename}`);
      
      toast.success('Comparison complete! Excel report ready for download.');
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message;
      addLog(`Comparison failed: ${errorMsg}`, 'error');
      toast.error(`Comparison failed: ${errorMsg}`);
    } finally {
      setIsComparing(false);
    }
  }, [file1, file2, config, selectedTools, addLog]);

  // Download handler
  const handleDownload = useCallback(() => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
      addLog('Excel file download initiated', 'success');
    }
  }, [downloadUrl, addLog]);

  // Reset handler
  const handleReset = useCallback(() => {
    setFile1(null);
    setFile2(null);
    setFile1Structure(null);
    setFile2Structure(null);
    setDetectedPaths([]);
    setTools([]);
    setSelectedTools(null);
    setConfig({ compareType: 'tools', selectedPath: '', customPath: '' });
    setLogs([]);
    setSummary(null);
    setDownloadUrl(null);
    toast.info('Reset complete');
  }, []);

  const canCompare = file1?.valid && file2?.valid && !isComparing;

  return (
    <div className="app-container">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-100 rounded-md">
                <GitCompare className="h-5 w-5 text-zinc-700" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight" data-testid="app-title">
                  JSON Compare
                </h1>
                <p className="text-xs text-muted-foreground">
                  Compare JSON files and generate Excel reports
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="gap-2"
              data-testid="reset-btn"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Upload & Tree */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Upload Section */}
            <section>
              <h2 className="section-header text-lg mb-4 flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Upload JSON Files
              </h2>
              <div className="upload-grid">
                <FileUploadZone
                  label="JSON File 1"
                  fileNumber={1}
                  onFileUploaded={(file) => handleFileUpload(file, 1)}
                  uploadedFile={file1}
                  isLoading={file1Loading}
                />
                <FileUploadZone
                  label="JSON File 2"
                  fileNumber={2}
                  onFileUploaded={(file) => handleFileUpload(file, 2)}
                  uploadedFile={file2}
                  isLoading={file2Loading}
                />
              </div>
            </section>

            {/* Tree View Section */}
            {(file1Structure || file2Structure) && (
              <section className="animate-fade-in">
                <h2 className="section-header text-lg mb-4 flex items-center gap-2">
                  <FileSearch className="h-5 w-5" />
                  JSON Structure Explorer
                </h2>
                <Tabs defaultValue="file1" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="file1" disabled={!file1Structure}>
                      File 1 {file1?.filename && `(${file1.filename})`}
                    </TabsTrigger>
                    <TabsTrigger value="file2" disabled={!file2Structure}>
                      File 2 {file2?.filename && `(${file2.filename})`}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="file1">
                    {file1Structure && (
                      <JsonTreeView data={file1Structure} title="File 1 Structure" />
                    )}
                  </TabsContent>
                  <TabsContent value="file2">
                    {file2Structure && (
                      <JsonTreeView data={file2Structure} title="File 2 Structure" />
                    )}
                  </TabsContent>
                </Tabs>
              </section>
            )}

            {/* Results Section */}
            {summary && (
              <section className="animate-fade-in">
                <SummaryPanel 
                  summary={summary}
                  downloadUrl={downloadUrl}
                  onDownload={handleDownload}
                />
              </section>
            )}
          </div>

          {/* Right Column - Config & Tools */}
          <div className="space-y-6">
            
            {/* Configuration */}
            <section>
              <h2 className="section-header text-lg mb-4 flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Configuration
              </h2>
              <ComparisonConfig
                detectedPaths={detectedPaths}
                onConfigChange={setConfig}
                config={config}
              />
            </section>

            {/* Tool Selector */}
            {config.compareType === 'tools' && (
              <section className="animate-fade-in">
                <ToolSelector
                  tools={tools}
                  selectedTools={selectedTools}
                  onSelectionChange={setSelectedTools}
                />
              </section>
            )}

            {/* Progress Terminal */}
            <section>
              <ProgressTerminal logs={logs} isProcessing={isComparing} />
            </section>

            {/* Compare Button */}
            <Button
              onClick={handleCompare}
              disabled={!canCompare}
              className="w-full h-12 text-base gap-2 compare-button"
              data-testid="compare-btn"
            >
              {isComparing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <GitCompare className="h-5 w-5" />
                  Compare & Generate Excel
                </>
              )}
            </Button>

            {/* Quick Download if available */}
            {downloadUrl && !isComparing && (
              <Button
                onClick={handleDownload}
                variant="outline"
                className="w-full gap-2"
                data-testid="quick-download-btn"
              >
                <Download className="h-4 w-4" />
                Download Report
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
