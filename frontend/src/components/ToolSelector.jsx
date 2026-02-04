import { useState, useMemo, useCallback } from 'react';
import { Search, Check, CheckSquare, Square, Filter } from 'lucide-react';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

export const ToolSelector = ({ 
  tools = [], 
  selectedTools, 
  onSelectionChange 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTools = useMemo(() => {
    if (!searchTerm) return tools;
    const term = searchTerm.toLowerCase();
    return tools.filter(tool => 
      tool.name.toLowerCase().includes(term) ||
      tool.description?.toLowerCase().includes(term)
    );
  }, [tools, searchTerm]);

  const isAllSelected = selectedTools === null || 
    (selectedTools && selectedTools.length === tools.length);

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(null); // null means all selected
    }
  }, [isAllSelected, onSelectionChange]);

  const handleToggleTool = useCallback((toolName) => {
    let newSelection;
    
    if (selectedTools === null) {
      // Currently all selected, switch to all except this one
      newSelection = tools.map(t => t.name).filter(n => n !== toolName);
    } else if (selectedTools.includes(toolName)) {
      // Remove from selection
      newSelection = selectedTools.filter(n => n !== toolName);
    } else {
      // Add to selection
      newSelection = [...selectedTools, toolName];
    }
    
    // If all are selected, switch back to null
    if (newSelection.length === tools.length) {
      newSelection = null;
    }
    
    onSelectionChange(newSelection);
  }, [selectedTools, tools, onSelectionChange]);

  const isToolSelected = useCallback((toolName) => {
    return selectedTools === null || selectedTools.includes(toolName);
  }, [selectedTools]);

  const selectedCount = selectedTools === null ? tools.length : selectedTools.length;

  if (tools.length === 0) {
    return (
      <div className="config-panel" data-testid="tool-selector">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            Tool Selection
          </span>
        </div>
        <div className="p-4 text-center text-sm text-muted-foreground">
          No tools available. Upload JSON files to see tools.
        </div>
      </div>
    );
  }

  return (
    <div className="config-panel" data-testid="tool-selector">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            Tool Selection
          </span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {selectedCount} / {tools.length} selected
        </Badge>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search tools..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-8 text-sm"
          data-testid="tool-search-input"
        />
      </div>

      {/* Select All */}
      <div 
        className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-100 rounded cursor-pointer mb-2 border-b"
        onClick={handleSelectAll}
        data-testid="select-all-tools"
      >
        <Checkbox 
          checked={isAllSelected}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium">Select All</span>
        <span className="text-xs text-muted-foreground ml-auto">
          ({tools.length} tools)
        </span>
      </div>

      {/* Tool List */}
      <ScrollArea className="h-[250px]">
        <div className="space-y-1">
          {filteredTools.map((tool, idx) => (
            <div
              key={tool.name + idx}
              className={cn(
                "tool-item",
                isToolSelected(tool.name) && "selected"
              )}
              onClick={() => handleToggleTool(tool.name)}
              data-testid={`tool-item-${idx}`}
            >
              <Checkbox 
                checked={isToolSelected(tool.name)}
                className="h-4 w-4"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{tool.name}</div>
                {tool.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {tool.description}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {filteredTools.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No tools match "{searchTerm}"
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ToolSelector;
