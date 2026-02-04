import { useState, useMemo } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

const TreeNode = ({ nodeKey, value, depth = 0, searchTerm, expandedPaths, togglePath, path }) => {
  const currentPath = path ? `${path}.${nodeKey}` : nodeKey;
  const isExpanded = expandedPaths.has(currentPath);
  
  const matchesSearch = searchTerm && 
    (nodeKey?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase())));

  const renderValue = () => {
    if (value === null) {
      return <span className="tree-type-null">null</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className="tree-type-boolean">{value.toString()}</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="tree-type-number">{value}</span>;
    }
    
    if (typeof value === 'string') {
      const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
      return <span className="tree-type-string">"{displayValue}"</span>;
    }
    
    if (Array.isArray(value)) {
      return <span className="text-zinc-400">[{value.length}]</span>;
    }
    
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      return <span className="text-zinc-400">{'{' + keys.length + '}'}</span>;
    }
    
    return null;
  };

  const isExpandable = typeof value === 'object' && value !== null;

  return (
    <div style={{ marginLeft: depth > 0 ? '16px' : 0 }}>
      <div
        className={cn(
          "tree-item",
          matchesSearch && "bg-yellow-100"
        )}
        onClick={() => isExpandable && togglePath(currentPath)}
        data-testid={`tree-node-${currentPath}`}
      >
        {isExpandable && (
          <ChevronRight 
            className={cn(
              "h-3 w-3 text-zinc-400 transition-transform duration-150",
              isExpanded && "rotate-90"
            )} 
          />
        )}
        {!isExpandable && <span className="w-3" />}
        
        <span className="tree-key">{nodeKey}</span>
        <span className="text-zinc-400">:</span>
        {renderValue()}
      </div>
      
      {isExpandable && isExpanded && (
        <div className="tree-children">
          {Array.isArray(value) ? (
            value.slice(0, 20).map((item, idx) => (
              <TreeNode
                key={idx}
                nodeKey={`[${idx}]`}
                value={item}
                depth={depth + 1}
                searchTerm={searchTerm}
                expandedPaths={expandedPaths}
                togglePath={togglePath}
                path={currentPath}
              />
            ))
          ) : (
            Object.entries(value).slice(0, 50).map(([k, v]) => (
              <TreeNode
                key={k}
                nodeKey={k}
                value={v}
                depth={depth + 1}
                searchTerm={searchTerm}
                expandedPaths={expandedPaths}
                togglePath={togglePath}
                path={currentPath}
              />
            ))
          )}
          {(Array.isArray(value) && value.length > 20) && (
            <div className="text-xs text-zinc-400 pl-5 py-1">
              ... and {value.length - 20} more items
            </div>
          )}
          {(!Array.isArray(value) && Object.keys(value).length > 50) && (
            <div className="text-xs text-zinc-400 pl-5 py-1">
              ... and {Object.keys(value).length - 50} more keys
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const JsonTreeView = ({ data, title }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPaths, setExpandedPaths] = useState(new Set(['root']));

  const togglePath = (path) => {
    setExpandedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const paths = new Set(['root']);
    const traverse = (obj, path) => {
      if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
          obj.slice(0, 10).forEach((item, idx) => {
            const itemPath = `${path}.[${idx}]`;
            paths.add(itemPath);
            traverse(item, itemPath);
          });
        } else {
          Object.entries(obj).slice(0, 20).forEach(([k, v]) => {
            const keyPath = `${path}.${k}`;
            paths.add(keyPath);
            traverse(v, keyPath);
          });
        }
      }
    };
    traverse(data, 'root');
    setExpandedPaths(paths);
  };

  const collapseAll = () => {
    setExpandedPaths(new Set(['root']));
  };

  if (!data) return null;

  return (
    <div className="border rounded-lg bg-white" data-testid="json-tree-view">
      <div className="p-3 border-b flex items-center justify-between gap-4">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid="expand-all-btn"
          >
            Expand
          </button>
          <span className="text-zinc-300">|</span>
          <button
            onClick={collapseAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid="collapse-all-btn"
          >
            Collapse
          </button>
        </div>
      </div>
      
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search keys or values..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8 text-sm"
            data-testid="tree-search-input"
          />
        </div>
      </div>
      
      <ScrollArea className="h-[400px]">
        <div className="tree-container border-0">
          <TreeNode
            nodeKey="root"
            value={data}
            depth={0}
            searchTerm={searchTerm}
            expandedPaths={expandedPaths}
            togglePath={togglePath}
            path=""
          />
        </div>
      </ScrollArea>
    </div>
  );
};

export default JsonTreeView;
