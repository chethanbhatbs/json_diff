import { useEffect, useRef } from 'react';
import { Terminal, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export const ProgressTerminal = ({ logs = [], isProcessing }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <div className="config-panel p-0 overflow-hidden" data-testid="progress-terminal">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-zinc-50">
        <Terminal className="h-4 w-4 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
          Progress Log
        </span>
        {isProcessing && (
          <Loader2 className="h-3 w-3 text-blue-500 animate-spin ml-auto" />
        )}
      </div>

      <div 
        ref={scrollRef}
        className="terminal max-h-[200px] overflow-y-auto rounded-none"
      >
        {logs.length === 0 ? (
          <div className="text-zinc-500 text-center py-4">
            Waiting for comparison...
          </div>
        ) : (
          logs.map((log, idx) => (
            <div 
              key={idx}
              className={cn(
                "terminal-line flex items-start gap-2",
                log.type
              )}
            >
              <span className="text-zinc-600 flex-shrink-0">[{log.timestamp || getTimestamp()}]</span>
              {log.type === 'success' && <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />}
              {log.type === 'error' && <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />}
              <span>{log.message}</span>
            </div>
          ))
        )}
        
        {isProcessing && (
          <div className="terminal-line info flex items-center gap-2">
            <span className="text-zinc-600">[{getTimestamp()}]</span>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressTerminal;
