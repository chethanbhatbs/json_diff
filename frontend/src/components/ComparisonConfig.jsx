import { useState, useEffect, useMemo } from 'react';
import { Settings, ChevronDown, AlertCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { cn } from '../lib/utils';

export const ComparisonConfig = ({ 
  detectedPaths = [], 
  onConfigChange,
  config 
}) => {
  const [compareType, setCompareType] = useState(config?.compareType || 'tools');
  const [selectedPath, setSelectedPath] = useState(config?.selectedPath || '');
  const [customPath, setCustomPath] = useState(config?.customPath || '');

  useEffect(() => {
    onConfigChange({
      compareType,
      selectedPath: compareType === 'custom' ? customPath : selectedPath,
      customPath
    });
  }, [compareType, selectedPath, customPath, onConfigChange]);

  // Auto-select first detected path - use useMemo to derive initial state
  const initialPath = detectedPaths.length > 0 ? detectedPaths[0].path_string : '';
  
  // Set initial path when paths are first detected
  if (detectedPaths.length > 0 && !selectedPath && initialPath) {
    setSelectedPath(initialPath);
  }

  return (
    <div className="config-panel" data-testid="comparison-config">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
          Comparison Configuration
        </span>
      </div>

      <div className="space-y-4">
        {/* What to compare */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">What to Compare</Label>
          <Select value={compareType} onValueChange={setCompareType}>
            <SelectTrigger className="h-9" data-testid="compare-type-select">
              <SelectValue placeholder="Select comparison type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tools">Tools</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="entire">Entire Object</SelectItem>
              <SelectItem value="custom">Custom Path</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Path selection for tools */}
        {compareType === 'tools' && detectedPaths.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Tool Path</Label>
            <Select value={selectedPath} onValueChange={setSelectedPath}>
              <SelectTrigger className="h-9" data-testid="path-select">
                <SelectValue placeholder="Select path to tools" />
              </SelectTrigger>
              <SelectContent>
                {detectedPaths.map((pathInfo, idx) => (
                  <SelectItem key={idx} value={pathInfo.path_string}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono text-xs">{pathInfo.path_string}</span>
                      <span className="text-xs text-muted-foreground">
                        ({pathInfo.tool_count} items)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* No paths detected warning */}
        {compareType === 'tools' && detectedPaths.length === 0 && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-yellow-700">
              <p className="font-medium">No tool paths detected</p>
              <p className="mt-1">The standard tool paths were not found. Try using &quot;Custom Path&quot; to specify the location manually.</p>
            </div>
          </div>
        )}

        {/* Custom path input */}
        {compareType === 'custom' && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Custom Path</Label>
            <Input
              type="text"
              placeholder="e.g., data.items or log -> body -> tools"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              className="h-9 font-mono text-sm"
              data-testid="custom-path-input"
            />
            <p className="text-[10px] text-muted-foreground">
              Use dot notation (data.items) or arrow notation (data -&gt; items)
            </p>
          </div>
        )}

        {/* Info about comparison type */}
        <div className="p-3 bg-zinc-50 rounded-md">
          <p className="text-xs text-muted-foreground">
            {compareType === 'tools' && 'Compares tools/functions by name and description using word-level diff.'}
            {compareType === 'system' && 'Compares system configuration objects.'}
            {compareType === 'entire' && 'Compares the entire JSON structure as a single comparison unit.'}
            {compareType === 'custom' && 'Compares arrays of objects at the specified custom path.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComparisonConfig;
