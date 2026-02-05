"""
Backend API tests for JSON Compare Tool
Tests: File upload, compare, share, and shared link endpoints
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def upload_test_files(api_client):
    """Upload test files and return file IDs"""
    file1_content = json.dumps({
        "tools": [
            {"name": "tool1", "description": "Description 1"},
            {"name": "tool2", "description": "Description 2"}
        ]
    })
    file2_content = json.dumps({
        "tools": [
            {"name": "tool1", "description": "Description 1 modified"},
            {"name": "tool3", "description": "Description 3"}
        ]
    })
    
    # Upload file 1
    resp1 = requests.post(
        f"{BASE_URL}/api/upload",
        files={"file": ("test1.json", file1_content, "application/json")}
    )
    assert resp1.status_code == 200, f"File 1 upload failed: {resp1.text}"
    file1_data = resp1.json()
    
    # Upload file 2
    resp2 = requests.post(
        f"{BASE_URL}/api/upload",
        files={"file": ("test2.json", file2_content, "application/json")}
    )
    assert resp2.status_code == 200, f"File 2 upload failed: {resp2.text}"
    file2_data = resp2.json()
    
    return {
        "file1_id": file1_data["file_id"],
        "file2_id": file2_data["file_id"],
        "file1_name": file1_data["filename"],
        "file2_name": file2_data["filename"]
    }


class TestBasicEndpoints:
    """Test basic API endpoints"""
    
    def test_root_endpoint(self, api_client):
        """Test root API endpoint returns correct info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "max_file_size" in data
        print(f"Root endpoint OK: {data['message']}")
    
    def test_config_endpoint(self, api_client):
        """Test config endpoint returns max file size"""
        response = requests.get(f"{BASE_URL}/api/config")
        assert response.status_code == 200
        data = response.json()
        assert "max_file_size" in data
        assert "max_file_size_mb" in data
        assert data["max_file_size_mb"] == 30
        print(f"Config endpoint OK: max_file_size_mb={data['max_file_size_mb']}")


class TestFileUpload:
    """Test file upload functionality"""
    
    def test_upload_valid_json(self):
        """Test uploading valid JSON file"""
        file_content = json.dumps({"tools": [{"name": "test", "description": "test desc"}]})
        response = requests.post(
            f"{BASE_URL}/api/upload",
            files={"file": ("test.json", file_content, "application/json")}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        assert "file_id" in data
        assert data["filename"] == "test.json"
        print(f"Valid JSON upload OK: file_id={data['file_id']}")
    
    def test_upload_invalid_json(self):
        """Test uploading invalid JSON returns proper error"""
        invalid_content = "{ invalid json }"
        response = requests.post(
            f"{BASE_URL}/api/upload",
            files={"file": ("invalid.json", invalid_content, "application/json")}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == False
        assert "error" in data
        assert "Invalid JSON" in data["error"]
        print(f"Invalid JSON handled correctly: {data['error'][:50]}...")


class TestFileAnalysis:
    """Test file analysis endpoints"""
    
    def test_analyze_file(self, upload_test_files):
        """Test file analysis detects tool paths"""
        file_id = upload_test_files["file1_id"]
        response = requests.get(f"{BASE_URL}/api/analyze/{file_id}")
        assert response.status_code == 200
        data = response.json()
        assert "detected_paths" in data
        assert "json_structure" in data
        # Should detect 'tools' path
        paths = [p["path_string"] for p in data["detected_paths"]]
        assert "tools" in paths
        print(f"File analysis OK: detected {len(data['detected_paths'])} paths")
    
    def test_get_tools(self, upload_test_files):
        """Test extracting tools from uploaded file"""
        file_id = upload_test_files["file1_id"]
        response = requests.get(f"{BASE_URL}/api/tools/{file_id}")
        assert response.status_code == 200
        data = response.json()
        assert "tools" in data
        assert data["count"] == 2
        assert len(data["tools"]) == 2
        tool_names = [t["name"] for t in data["tools"]]
        assert "tool1" in tool_names
        assert "tool2" in tool_names
        print(f"Tools extraction OK: {data['count']} tools found")


class TestComparison:
    """Test file comparison functionality"""
    
    def test_compare_files(self, upload_test_files):
        """Test comparing two JSON files generates correct results"""
        response = requests.post(
            f"{BASE_URL}/api/compare",
            json={
                "file1_id": upload_test_files["file1_id"],
                "file2_id": upload_test_files["file2_id"],
                "compare_type": "tools",
                "custom_path": None,
                "selected_tools": None
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary counts
        assert data["file1_tools"] == 2
        assert data["file2_tools"] == 2
        assert data["same_count"] == 0  # tool1 modified
        assert data["modified_count"] == 1  # tool1
        assert data["added_count"] == 1  # tool3
        assert data["removed_count"] == 1  # tool2
        
        # Verify preview data
        assert "preview_data" in data
        preview = data["preview_data"]
        assert "comparison" in preview
        assert "differences" in preview
        assert "file1_tools" in preview
        assert "file2_tools" in preview
        
        # Verify Excel filename generated
        assert "excel_filename" in data
        assert data["excel_filename"].endswith(".xlsx")
        
        print(f"Comparison OK: same={data['same_count']}, modified={data['modified_count']}, added={data['added_count']}, removed={data['removed_count']}")
        return data
    
    def test_download_excel(self, upload_test_files):
        """Test downloading generated Excel file"""
        # First run comparison to generate Excel
        compare_resp = requests.post(
            f"{BASE_URL}/api/compare",
            json={
                "file1_id": upload_test_files["file1_id"],
                "file2_id": upload_test_files["file2_id"],
                "compare_type": "tools"
            }
        )
        assert compare_resp.status_code == 200
        excel_filename = compare_resp.json()["excel_filename"]
        
        # Download Excel
        download_resp = requests.get(f"{BASE_URL}/api/download/{excel_filename}")
        assert download_resp.status_code == 200
        assert "spreadsheetml" in download_resp.headers.get("content-type", "")
        assert len(download_resp.content) > 0
        print(f"Excel download OK: {len(download_resp.content)} bytes")


class TestShareFunctionality:
    """Test share comparison functionality"""
    
    def test_share_comparison(self, upload_test_files):
        """Test creating a shareable link for comparison"""
        # First run comparison
        compare_resp = requests.post(
            f"{BASE_URL}/api/compare",
            json={
                "file1_id": upload_test_files["file1_id"],
                "file2_id": upload_test_files["file2_id"],
                "compare_type": "tools"
            }
        )
        assert compare_resp.status_code == 200
        compare_data = compare_resp.json()
        
        # Create share
        share_resp = requests.post(
            f"{BASE_URL}/api/share",
            json={
                "file1_name": "test1.json",
                "file2_name": "test2.json",
                "compare_type": "tools",
                "output_filename": "test_comparison",
                "summary": {
                    "file1_tools": compare_data["file1_tools"],
                    "file2_tools": compare_data["file2_tools"],
                    "same_count": compare_data["same_count"],
                    "modified_count": compare_data["modified_count"],
                    "added_count": compare_data["added_count"],
                    "removed_count": compare_data["removed_count"]
                },
                "preview_data": compare_data["preview_data"],
                "download_url": compare_data.get("download_url")
            }
        )
        assert share_resp.status_code == 200
        share_data = share_resp.json()
        
        # Verify share response
        assert "share_id" in share_data
        assert "share_url" in share_data
        assert "expires_at" in share_data
        assert share_data["share_id"].startswith("share_")
        
        print(f"Share creation OK: share_id={share_data['share_id']}")
        return share_data
    
    def test_get_shared_comparison(self, upload_test_files):
        """Test retrieving shared comparison via share_id"""
        # First create a share
        compare_resp = requests.post(
            f"{BASE_URL}/api/compare",
            json={
                "file1_id": upload_test_files["file1_id"],
                "file2_id": upload_test_files["file2_id"],
                "compare_type": "tools"
            }
        )
        compare_data = compare_resp.json()
        
        share_resp = requests.post(
            f"{BASE_URL}/api/share",
            json={
                "file1_name": "test1.json",
                "file2_name": "test2.json",
                "compare_type": "tools",
                "output_filename": "test_comparison",
                "summary": {
                    "file1_tools": compare_data["file1_tools"],
                    "file2_tools": compare_data["file2_tools"],
                    "same_count": compare_data["same_count"],
                    "modified_count": compare_data["modified_count"],
                    "added_count": compare_data["added_count"],
                    "removed_count": compare_data["removed_count"]
                },
                "preview_data": compare_data["preview_data"]
            }
        )
        share_id = share_resp.json()["share_id"]
        
        # Now get the shared comparison
        get_resp = requests.get(f"{BASE_URL}/api/shared/{share_id}")
        assert get_resp.status_code == 200
        shared_data = get_resp.json()
        
        # Verify shared data contains all necessary fields
        assert "file1_name" in shared_data
        assert "file2_name" in shared_data
        assert "summary" in shared_data
        assert "preview_data" in shared_data
        assert shared_data["file1_name"] == "test1.json"
        assert shared_data["file2_name"] == "test2.json"
        
        # Verify preview_data has all required sections
        preview = shared_data["preview_data"]
        assert "comparison" in preview
        assert "differences" in preview
        assert "file1_tools" in preview
        assert "file2_tools" in preview
        
        print(f"Get shared comparison OK: file1={shared_data['file1_name']}, file2={shared_data['file2_name']}")
    
    def test_shared_comparison_not_found(self):
        """Test 404 for non-existent share_id"""
        response = requests.get(f"{BASE_URL}/api/shared/nonexistent_share_id")
        assert response.status_code == 404
        print("Non-existent share returns 404 as expected")


class TestHistoryEndpoints:
    """Test history management endpoints"""
    
    def test_get_history_unauthenticated(self):
        """Test history endpoint returns empty for unauthenticated users"""
        response = requests.get(f"{BASE_URL}/api/history")
        assert response.status_code == 200
        data = response.json()
        assert "history" in data
        assert data["source"] == "localStorage"
        print("Unauthenticated history returns empty localStorage source")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
