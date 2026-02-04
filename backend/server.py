from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import json
import tempfile
import uuid
import difflib
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Temp storage for uploaded files and generated reports
TEMP_DIR = Path(tempfile.gettempdir()) / "json_compare"
TEMP_DIR.mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class JsonUploadResponse(BaseModel):
    file_id: str
    filename: str
    size: int
    valid: bool
    error: Optional[str] = None
    structure: Optional[Dict[str, Any]] = None

class ToolPath(BaseModel):
    path: List[str]
    path_string: str
    tool_count: int

class AnalyzeResponse(BaseModel):
    detected_paths: List[ToolPath]
    json_structure: Dict[str, Any]

class Tool(BaseModel):
    name: str
    description: str
    index: int

class CompareRequest(BaseModel):
    file1_id: str
    file2_id: str
    compare_type: str  # "tools", "system", "entire", "custom"
    custom_path: Optional[str] = None
    selected_tools: Optional[List[str]] = None  # None means all tools

class ComparisonSummary(BaseModel):
    file1_tools: int
    file2_tools: int
    same_count: int
    modified_count: int
    added_count: int
    removed_count: int
    excel_filename: str
    download_url: str
    preview_data: Optional[Dict[str, Any]] = None

# ============== UTILITY FUNCTIONS ==============

def get_json_structure(data: Any, max_depth: int = 10, current_depth: int = 0) -> Dict[str, Any]:
    """Generate a simplified structure representation of JSON data."""
    if current_depth >= max_depth:
        return {"type": "...", "truncated": True}
    
    if isinstance(data, dict):
        return {
            "type": "object",
            "keys": {k: get_json_structure(v, max_depth, current_depth + 1) for k, v in list(data.items())[:50]}
        }
    elif isinstance(data, list):
        if len(data) > 0:
            return {
                "type": "array",
                "length": len(data),
                "sample": get_json_structure(data[0], max_depth, current_depth + 1) if len(data) > 0 else None
            }
        return {"type": "array", "length": 0}
    elif isinstance(data, str):
        return {"type": "string", "preview": data[:100] if len(data) > 100 else data}
    elif isinstance(data, bool):
        return {"type": "boolean", "value": data}
    elif isinstance(data, (int, float)):
        return {"type": "number", "value": data}
    elif data is None:
        return {"type": "null"}
    else:
        return {"type": str(type(data).__name__)}

def find_array_paths(data: Any, current_path: List[str] = None, results: List[ToolPath] = None) -> List[ToolPath]:
    """Find all paths to arrays of objects in the JSON."""
    if current_path is None:
        current_path = []
    if results is None:
        results = []
    
    if isinstance(data, dict):
        for key, value in data.items():
            find_array_paths(value, current_path + [key], results)
    elif isinstance(data, list) and len(data) > 0:
        if isinstance(data[0], dict):
            results.append(ToolPath(
                path=current_path,
                path_string=" -> ".join(current_path) if current_path else "root",
                tool_count=len(data)
            ))
        # Also check nested arrays
        for item in data[:1]:  # Only check first item
            if isinstance(item, dict):
                for key, value in item.items():
                    find_array_paths(value, current_path + ["[0]", key], results)
    
    return results

TOOL_PATHS = [
    ["log", "body", "toolConfig", "tools"],
    ["log", "body", "tools"],
    ["body", "toolConfig", "tools"],
    ["body", "tools"],
    ["toolConfig", "tools"],
    ["tools"]
]

def extract_tools(data: Dict, custom_path: Optional[str] = None) -> Tuple[List[Dict], str]:
    """Extract tools from JSON using predefined or custom path."""
    paths_to_try = []
    
    if custom_path:
        # Parse custom path like "log.body.tools" or "log -> body -> tools"
        if " -> " in custom_path:
            paths_to_try = [custom_path.split(" -> ")]
        else:
            paths_to_try = [custom_path.split(".")]
    else:
        paths_to_try = TOOL_PATHS
    
    for path in paths_to_try:
        try:
            current = data
            for key in path:
                current = current[key]
            
            if isinstance(current, list) and len(current) > 0:
                return current, " -> ".join(path)
        except (KeyError, TypeError, IndexError):
            continue
    
    return [], ""

def normalize_tool(tool: Dict, index: int) -> Dict:
    """Normalize tool data to handle different field names."""
    name = (
        tool.get("name") or 
        tool.get("toolSpec", {}).get("name") or
        tool.get("tool_name") or
        tool.get("function", {}).get("name") or
        f"Tool_{index}"
    )
    
    description = (
        tool.get("description") or
        tool.get("toolSpec", {}).get("description") or
        tool.get("tool_description") or
        tool.get("function", {}).get("description") or
        json.dumps(tool, indent=2)
    )
    
    return {
        "name": name,
        "description": description,
        "raw": tool
    }

def get_text_diff_detailed(text1: str, text2: str) -> Tuple[List[Tuple[str, str]], List[Tuple[str, str]]]:
    """Compare two texts and return word-level chunks with their status."""
    words1 = text1.split()
    words2 = text2.split()
    
    matcher = difflib.SequenceMatcher(None, words1, words2)
    
    chunks1 = []
    chunks2 = []
    
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            text = ' '.join(words1[i1:i2])
            if text:
                chunks1.append((text + ' ', 'same'))
                chunks2.append((text + ' ', 'same'))
        elif tag == 'delete':
            text = ' '.join(words1[i1:i2])
            if text:
                chunks1.append((text + ' ', 'removed'))
        elif tag == 'insert':
            text = ' '.join(words2[j1:j2])
            if text:
                chunks2.append((text + ' ', 'added'))
        elif tag == 'replace':
            text1_part = ' '.join(words1[i1:i2])
            text2_part = ' '.join(words2[j1:j2])
            if text1_part:
                chunks1.append((text1_part + ' ', 'removed'))
            if text2_part:
                chunks2.append((text2_part + ' ', 'added'))
    
    return chunks1, chunks2

def create_excel_comparison(tools1: List[Dict], tools2: List[Dict], 
                           selected_tools: Optional[List[str]], output_path: str) -> Dict:
    """Create Excel file with comparison of tools."""
    wb = Workbook()
    wb.remove(wb.active)
    
    # Normalize tools
    normalized_tools1 = [normalize_tool(t, i) for i, t in enumerate(tools1, 1)]
    normalized_tools2 = [normalize_tool(t, i) for i, t in enumerate(tools2, 1)]
    
    # Filter by selected tools if specified
    if selected_tools:
        normalized_tools1 = [t for t in normalized_tools1 if t["name"] in selected_tools]
        normalized_tools2 = [t for t in normalized_tools2 if t["name"] in selected_tools]
    
    # Create sheets
    ws_comparison = wb.create_sheet("Comparison")
    ws_differences = wb.create_sheet("Differences")
    ws_file1 = wb.create_sheet("File1_Tools")
    ws_file2 = wb.create_sheet("File2_Tools")
    
    # Style definitions
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    
    green_fill = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
    red_fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")
    yellow_fill = PatternFill(start_color="FFEB9C", end_color="FFEB9C", fill_type="solid")
    
    removal_fill = PatternFill(start_color="FFD7D5", end_color="FFD7D5", fill_type="solid")
    addition_fill = PatternFill(start_color="D4F4DD", end_color="D4F4DD", fill_type="solid")
    
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Build tool dictionaries
    tools1_dict = {t["name"]: t["description"] for t in normalized_tools1}
    tools2_dict = {t["name"]: t["description"] for t in normalized_tools2}
    
    all_names = sorted(set(tools1_dict.keys()) | set(tools2_dict.keys()))
    
    # Stats
    same_count = 0
    modified_count = 0
    added_count = 0
    removed_count = 0
    
    # === COMPARISON SHEET ===
    headers = ["Tool Name", "In File1", "In File2", "Description Same?", "Notes"]
    ws_comparison.append(headers)
    
    for col_num, header in enumerate(headers, 1):
        cell = ws_comparison.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border
    
    row_num = 2
    for name in all_names:
        in_file1 = "✓" if name in tools1_dict else "✗"
        in_file2 = "✓" if name in tools2_dict else "✗"
        
        if name in tools1_dict and name in tools2_dict:
            desc1 = tools1_dict[name].strip()
            desc2 = tools2_dict[name].strip()
            desc_same = "✓" if desc1 == desc2 else "✗"
            
            if desc1 == desc2:
                notes = "Same in both"
                same_count += 1
            else:
                notes = "Description differs"
                modified_count += 1
        else:
            desc_same = "N/A"
            if name not in tools1_dict:
                notes = "Only in File2"
                added_count += 1
            else:
                notes = "Only in File1"
                removed_count += 1
        
        ws_comparison.append([name, in_file1, in_file2, desc_same, notes])
        
        for col_num in range(1, 6):
            cell = ws_comparison.cell(row=row_num, column=col_num)
            cell.border = border
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            
            if col_num == 2:
                cell.fill = green_fill if in_file1 == "✓" else red_fill
            elif col_num == 3:
                cell.fill = green_fill if in_file2 == "✓" else red_fill
            elif col_num == 4:
                if desc_same == "✓":
                    cell.fill = green_fill
                elif desc_same == "✗":
                    cell.fill = yellow_fill
        
        row_num += 1
    
    ws_comparison.column_dimensions['A'].width = 35
    ws_comparison.column_dimensions['B'].width = 20
    ws_comparison.column_dimensions['C'].width = 20
    ws_comparison.column_dimensions['D'].width = 20
    ws_comparison.column_dimensions['E'].width = 30
    
    # === DIFFERENCES SHEET ===
    diff_headers = ["Tool Name", "File1 Description (Removals)", "File2 Description (Additions)", "Change Type"]
    ws_differences.append(diff_headers)
    
    for col_num, header in enumerate(diff_headers, 1):
        cell = ws_differences.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = border
    
    diff_row_num = 2
    
    for name in all_names:
        desc1 = tools1_dict.get(name, "")
        desc2 = tools2_dict.get(name, "")
        
        if desc1.strip() != desc2.strip():
            if not desc1:
                change_type = "Added in File2"
            elif not desc2:
                change_type = "Removed from File2"
            else:
                change_type = "Modified"
            
            if desc1 and desc2:
                chunks1, chunks2 = get_text_diff_detailed(desc1, desc2)
            else:
                chunks1 = [(desc1, 'removed')] if desc1 else []
                chunks2 = [(desc2, 'added')] if desc2 else []
            
            ws_differences.append([name, "", "", change_type])
            
            name_cell = ws_differences.cell(row=diff_row_num, column=1)
            name_cell.value = name
            name_cell.border = border
            name_cell.alignment = Alignment(vertical="top", wrap_text=True)
            
            cell_file1 = ws_differences.cell(row=diff_row_num, column=2)
            if chunks1:
                has_removals = any(status == 'removed' for _, status in chunks1)
                cell_file1.value = ''.join(text for text, _ in chunks1).strip()
                if has_removals:
                    cell_file1.fill = removal_fill
            cell_file1.border = border
            cell_file1.alignment = Alignment(vertical="top", wrap_text=True)
            
            cell_file2 = ws_differences.cell(row=diff_row_num, column=3)
            if chunks2:
                has_additions = any(status == 'added' for _, status in chunks2)
                cell_file2.value = ''.join(text for text, _ in chunks2).strip()
                if has_additions:
                    cell_file2.fill = addition_fill
            cell_file2.border = border
            cell_file2.alignment = Alignment(vertical="top", wrap_text=True)
            
            change_cell = ws_differences.cell(row=diff_row_num, column=4)
            change_cell.value = change_type
            change_cell.border = border
            change_cell.alignment = Alignment(horizontal="center", vertical="center")
            if change_type == "Added in File2":
                change_cell.fill = addition_fill
            elif change_type == "Removed from File2":
                change_cell.fill = removal_fill
            else:
                change_cell.fill = yellow_fill
            
            diff_row_num += 1
    
    ws_differences.column_dimensions['A'].width = 35
    ws_differences.column_dimensions['B'].width = 70
    ws_differences.column_dimensions['C'].width = 70
    ws_differences.column_dimensions['D'].width = 20
    
    for row in range(2, diff_row_num):
        ws_differences.row_dimensions[row].height = 100
    
    # === FILE 1 DETAILS SHEET ===
    ws_file1.append(["#", "Tool Name", "Description"])
    for i in range(1, 4):
        cell = ws_file1.cell(row=1, column=i)
        cell.fill = header_fill
        cell.font = header_font
        cell.border = border
        cell.alignment = Alignment(horizontal="center", vertical="center")
    
    for idx, tool in enumerate(normalized_tools1, 1):
        ws_file1.append([idx, tool["name"], tool["description"]])
    
    for row in ws_file1.iter_rows(min_row=1, max_row=ws_file1.max_row):
        for cell in row:
            cell.border = border
            cell.alignment = Alignment(vertical="top", wrap_text=True)
    
    ws_file1.column_dimensions['A'].width = 5
    ws_file1.column_dimensions['B'].width = 35
    ws_file1.column_dimensions['C'].width = 100
    
    # === FILE 2 DETAILS SHEET ===
    ws_file2.append(["#", "Tool Name", "Description"])
    for i in range(1, 4):
        cell = ws_file2.cell(row=1, column=i)
        cell.fill = header_fill
        cell.font = header_font
        cell.border = border
        cell.alignment = Alignment(horizontal="center", vertical="center")
    
    for idx, tool in enumerate(normalized_tools2, 1):
        ws_file2.append([idx, tool["name"], tool["description"]])
    
    for row in ws_file2.iter_rows(min_row=1, max_row=ws_file2.max_row):
        for cell in row:
            cell.border = border
            cell.alignment = Alignment(vertical="top", wrap_text=True)
    
    ws_file2.column_dimensions['A'].width = 5
    ws_file2.column_dimensions['B'].width = 35
    ws_file2.column_dimensions['C'].width = 100
    
    wb.save(output_path)
    
    return {
        "file1_tools": len(tools1_dict),
        "file2_tools": len(tools2_dict),
        "same_count": same_count,
        "modified_count": modified_count,
        "added_count": added_count,
        "removed_count": removed_count
    }

# ============== API ENDPOINTS ==============

@api_router.get("/")
async def root():
    return {"message": "JSON Comparison Tool API"}

@api_router.post("/upload", response_model=JsonUploadResponse)
async def upload_json(file: UploadFile = File(...)):
    """Upload and validate a JSON file."""
    file_id = str(uuid.uuid4())
    
    try:
        content = await file.read()
        size = len(content)
        
        # Validate JSON
        try:
            data = json.loads(content.decode('utf-8'))
        except json.JSONDecodeError as e:
            return JsonUploadResponse(
                file_id=file_id,
                filename=file.filename,
                size=size,
                valid=False,
                error=f"Invalid JSON: {str(e)} at line {e.lineno}, column {e.colno}"
            )
        
        # Save to temp storage
        file_path = TEMP_DIR / f"{file_id}.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f)
        
        # Get structure
        structure = get_json_structure(data)
        
        return JsonUploadResponse(
            file_id=file_id,
            filename=file.filename,
            size=size,
            valid=True,
            structure=structure
        )
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/analyze/{file_id}", response_model=AnalyzeResponse)
async def analyze_json(file_id: str):
    """Analyze JSON structure and detect possible tool paths."""
    file_path = TEMP_DIR / f"{file_id}.json"
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Find all array paths
        array_paths = find_array_paths(data)
        
        # Also check predefined tool paths
        detected_paths = []
        for path in TOOL_PATHS:
            try:
                current = data
                for key in path:
                    current = current[key]
                if isinstance(current, list) and len(current) > 0:
                    detected_paths.append(ToolPath(
                        path=path,
                        path_string=" -> ".join(path),
                        tool_count=len(current)
                    ))
            except (KeyError, TypeError):
                continue
        
        # Combine and deduplicate
        all_paths = {p.path_string: p for p in detected_paths + array_paths}
        
        structure = get_json_structure(data)
        
        return AnalyzeResponse(
            detected_paths=list(all_paths.values()),
            json_structure=structure
        )
    except Exception as e:
        logger.error(f"Error analyzing file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/tools/{file_id}")
async def get_tools(file_id: str, path: Optional[str] = None):
    """Get list of tools from a JSON file."""
    file_path = TEMP_DIR / f"{file_id}.json"
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        tools, found_path = extract_tools(data, path)
        normalized = [normalize_tool(t, i) for i, t in enumerate(tools, 1)]
        
        return {
            "path": found_path,
            "count": len(normalized),
            "tools": [{"name": t["name"], "description": t["description"][:200] + "..." if len(t["description"]) > 200 else t["description"]} for t in normalized]
        }
    except Exception as e:
        logger.error(f"Error getting tools: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/compare", response_model=ComparisonSummary)
async def compare_files(request: CompareRequest):
    """Compare two JSON files and generate Excel report."""
    file1_path = TEMP_DIR / f"{request.file1_id}.json"
    file2_path = TEMP_DIR / f"{request.file2_id}.json"
    
    if not file1_path.exists() or not file2_path.exists():
        raise HTTPException(status_code=404, detail="One or both files not found")
    
    try:
        with open(file1_path, 'r', encoding='utf-8') as f:
            data1 = json.load(f)
        with open(file2_path, 'r', encoding='utf-8') as f:
            data2 = json.load(f)
        
        # Extract tools based on compare type
        if request.compare_type == "entire":
            # Compare entire JSON as single "tool"
            tools1 = [{"name": "Entire JSON", "description": json.dumps(data1, indent=2)}]
            tools2 = [{"name": "Entire JSON", "description": json.dumps(data2, indent=2)}]
        elif request.compare_type == "system":
            # Compare system configuration - look for system-related keys
            system_keys = ["system", "systemPrompt", "system_prompt", "config", "configuration"]
            tools1 = []
            tools2 = []
            for key in system_keys:
                if key in data1:
                    val = data1[key]
                    tools1.append({"name": key, "description": json.dumps(val, indent=2) if isinstance(val, (dict, list)) else str(val)})
                if key in data2:
                    val = data2[key]
                    tools2.append({"name": key, "description": json.dumps(val, indent=2) if isinstance(val, (dict, list)) else str(val)})
            # If no system keys found, compare top-level keys
            if not tools1 and not tools2:
                for key, val in data1.items():
                    tools1.append({"name": key, "description": json.dumps(val, indent=2) if isinstance(val, (dict, list)) else str(val)})
                for key, val in data2.items():
                    tools2.append({"name": key, "description": json.dumps(val, indent=2) if isinstance(val, (dict, list)) else str(val)})
        elif request.compare_type == "custom" and request.custom_path:
            tools1, _ = extract_tools(data1, request.custom_path)
            tools2, _ = extract_tools(data2, request.custom_path)
        else:
            # Default: tools
            tools1, _ = extract_tools(data1)
            tools2, _ = extract_tools(data2)
        
        # Generate Excel
        excel_filename = f"comparison_{uuid.uuid4().hex[:8]}.xlsx"
        excel_path = TEMP_DIR / excel_filename
        
        stats = create_excel_comparison(tools1, tools2, request.selected_tools, str(excel_path))
        
        return ComparisonSummary(
            file1_tools=stats["file1_tools"],
            file2_tools=stats["file2_tools"],
            same_count=stats["same_count"],
            modified_count=stats["modified_count"],
            added_count=stats["added_count"],
            removed_count=stats["removed_count"],
            excel_filename=excel_filename,
            download_url=f"/api/download/{excel_filename}"
        )
    except Exception as e:
        logger.error(f"Error comparing files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/download/{filename}")
async def download_excel(filename: str):
    """Download generated Excel file."""
    file_path = TEMP_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@api_router.get("/structure/{file_id}")
async def get_full_structure(file_id: str):
    """Get full JSON structure for tree view."""
    file_path = TEMP_DIR / f"{file_id}.json"
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return {"structure": data}
    except Exception as e:
        logger.error(f"Error getting structure: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_cleanup():
    # Clean up temp files on shutdown (optional)
    pass
