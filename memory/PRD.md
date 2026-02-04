# JSON Compare Tool - Product Requirements Document

## Original Problem Statement
Build a web-based tool that compares two JSON files and generates an Excel report exactly equivalent to a provided Python script's output, while adding an interactive UI to control what is compared and from where inside the JSON structure.

## User Flow
1. Upload two JSON files (drag & drop or file picker)
2. Parse & discover structure
3. Configure comparison (what to compare: Tools/System/Entire/Custom Path)
4. Select specific tools if using Tools comparison
5. Click "Compare & Generate Excel"
6. **View Excel Preview in the UI** (4 tabs: Comparison, Differences, File1, File2)
7. Specify custom output filename
8. Download Excel report

## Architecture

### Backend (FastAPI)
- `/api/upload` - Upload and validate JSON files
- `/api/analyze/{file_id}` - Analyze JSON structure, detect tool paths
- `/api/tools/{file_id}` - Get list of tools from a JSON file
- `/api/compare` - Compare files, generate Excel, **return preview data**
- `/api/download/{filename}` - Download generated Excel file

### Frontend (React)
- Single page application
- Components: FileUploadZone, ProgressTerminal, SummaryStats, **ExcelPreview**, DownloadPanel, HistoryPanel
- Uses shadcn/UI components including Table component
- Light theme, minimalist design
- localStorage for comparison history

### Excel Output (openpyxl)
- Sheets: Comparison, Differences, File1_Tools, File2_Tools
- Color coding: Green (present/same), Red (missing), Yellow (modified)
- Word-level diff for description changes

## What's Been Implemented (Feb 2026)
- ✅ JSON file upload with validation (drag & drop + click to browse)
- ✅ Comparison type selection (Tools/System/Entire/Custom Path)
- ✅ Tool path auto-detection
- ✅ Tool selection with search/filter
- ✅ Excel report generation matching Python script output
- ✅ Progress terminal with logs
- ✅ Summary stats panel
- ✅ **Excel Preview UI** - View all 4 sheets in tabbed interface before download
- ✅ Custom output filename
- ✅ Comparison history using localStorage
- ✅ Blob-based file download with custom filename
- ✅ Reset functionality

## Excel Preview Features
- **Comparison Tab**: Shows all tools with checkmarks (✓/✗) for presence in each file, Same? column with color coding
- **Differences Tab**: Shows only modified/added/removed tools with side-by-side descriptions and change type badges
- **File 1 Tab**: Full list of tools from file 1
- **File 2 Tab**: Full list of tools from file 2
- Color-coded headers matching Excel (blue)
- Color-coded cells matching Excel (green/red/yellow backgrounds)

## Next Action Items
1. Add JSON tree view explorer for structure visualization
2. Add side-by-side word-level diff highlighting in Differences tab
3. Consider batch comparison for multiple file pairs
