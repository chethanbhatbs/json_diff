# JSON Compare Tool - Product Requirements Document

## Original Problem Statement
Build a web-based tool that compares two JSON files and generates an Excel report exactly equivalent to a provided Python script's output, while adding an interactive UI to control what is compared and from where inside the JSON structure.

## User Flow
1. Upload two JSON files (drag & drop or file picker)
2. Parse & discover structure
3. Configure comparison (what to compare: Tools/System/Entire/Custom Path)
4. Select specific tools if using Tools comparison
5. Click "Compare & Generate Excel"
6. Download Excel report with comparison results

## Architecture

### Backend (FastAPI)
- `/api/upload` - Upload and validate JSON files
- `/api/analyze/{file_id}` - Analyze JSON structure, detect tool paths
- `/api/tools/{file_id}` - Get list of tools from a JSON file
- `/api/compare` - Compare two JSON files and generate Excel
- `/api/download/{filename}` - Download generated Excel file
- `/api/structure/{file_id}` - Get full JSON structure for tree view

### Frontend (React)
- Single page application
- Components: FileUploadZone, ProgressTerminal, SummaryPanel
- Uses shadcn/UI components
- Light theme, minimalist design

### Excel Output (openpyxl)
- Sheets: Comparison, Differences, File1_Tools, File2_Tools
- Color coding: Green (present/same), Red (missing), Yellow (modified)
- Word-level diff for description changes

## What's Been Implemented (Jan 2026)
- ✅ JSON file upload with validation
- ✅ Comparison type selection (Tools/System/Entire/Custom Path)
- ✅ Tool path auto-detection
- ✅ Tool selection with search/filter
- ✅ Excel report generation matching Python script output
- ✅ Progress terminal with logs
- ✅ Summary panel with statistics
- ✅ Download functionality
- ✅ Reset functionality

## User Personas
1. **Developer** - Comparing API tool configurations between environments
2. **QA Engineer** - Validating tool changes between versions
3. **Technical Writer** - Documenting tool differences

## Core Requirements (Static)
- Must handle JSON files up to 10-20 MB
- Excel output must match Python script exactly
- Stateless tool (no authentication, no history)
- Clear validation errors for invalid JSON

## P0/P1/P2 Features

### P0 (Implemented)
- File upload with JSON validation
- Tools comparison with Excel generation
- System and Entire Object comparison
- Custom path comparison
- Download Excel report

### P1 (Backlog)
- JSON tree view explorer with search
- Side-by-side diff viewer in UI
- Batch comparison of multiple file pairs

### P2 (Future)
- Save comparison templates
- Export comparison as PDF
- API-only mode for CI/CD integration

## Next Action Items
1. Add JSON tree view explorer for structure visualization
2. Add side-by-side diff preview in UI before Excel generation
3. Consider adding comparison history with localStorage
