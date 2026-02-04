import { Download, FileSpreadsheet, Check, X, AlertTriangle, Equal } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export const SummaryPanel = ({ summary, downloadUrl, onDownload }) => {
  if (!summary) return null;

  const stats = [
    { 
      label: 'File 1 Tools', 
      value: summary.file1_tools, 
      icon: FileSpreadsheet,
      color: 'text-zinc-700'
    },
    { 
      label: 'File 2 Tools', 
      value: summary.file2_tools, 
      icon: FileSpreadsheet,
      color: 'text-zinc-700'
    },
    { 
      label: 'Same', 
      value: summary.same_count, 
      icon: Equal,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      label: 'Modified', 
      value: summary.modified_count, 
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    { 
      label: 'Added', 
      value: summary.added_count, 
      icon: Check,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      label: 'Removed', 
      value: summary.removed_count, 
      icon: X,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
  ];

  return (
    <div className="results-panel" data-testid="summary-panel">
      <div className="p-4 border-b bg-zinc-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold font-heading">Comparison Complete</h3>
            <p className="text-sm text-muted-foreground">
              Excel report generated successfully
            </p>
          </div>
          <Button 
            onClick={onDownload}
            className="gap-2"
            data-testid="download-excel-btn"
          >
            <Download className="h-4 w-4" />
            Download Excel
          </Button>
        </div>
      </div>

      <div className="p-4">
        <div className="stats-grid">
          {stats.map((stat, idx) => (
            <div 
              key={idx}
              className={cn(
                "summary-stat",
                stat.bgColor
              )}
              data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}
            >
              <stat.icon className={cn("h-5 w-5 mb-1", stat.color)} />
              <span className={cn("summary-stat-value", stat.color)}>
                {stat.value}
              </span>
              <span className="summary-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="p-3 bg-zinc-950 rounded-md">
          <p className="text-xs font-mono text-zinc-400">
            <span className="text-green-400">Excel sheets:</span> Comparison, Differences, File1_Tools, File2_Tools
          </p>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Color coding: <span className="text-green-400">Green = present/same</span> | <span className="text-red-400">Red = missing</span> | <span className="text-yellow-400">Yellow = modified</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SummaryPanel;
