import requests
import sys
import os
import json
from pathlib import Path
from datetime import datetime

class JsonCompareAPITester:
    def __init__(self, base_url="https://compare-json.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.uploaded_file_ids = []
        self.generated_excel_files = []

    def log_test(self, name, success=True, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        if details and success:
            print(f"   Details: {details}")

    def test_root_endpoint(self):
        """Test root API endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200 and "JSON Comparison Tool API" in response.json().get("message", "")
            self.log_test("Root API endpoint", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Root API endpoint", False, str(e))
            return False

    def test_upload_valid_json(self):
        """Test uploading valid JSON file"""
        try:
            file_path = "/app/test_data_file1.json"
            if not os.path.exists(file_path):
                self.log_test("Upload valid JSON", False, "Test file not found")
                return False

            with open(file_path, 'rb') as f:
                files = {'file': ('test_file1.json', f, 'application/json')}
                response = requests.post(f"{self.api_url}/upload", files=files, timeout=15)
            
            success = response.status_code == 200
            if success:
                data = response.json()
                success = data.get('valid', False) and 'file_id' in data
                if success:
                    self.uploaded_file_ids.append(data['file_id'])
                    self.log_test("Upload valid JSON", True, f"File ID: {data['file_id'][:8]}...")
                else:
                    self.log_test("Upload valid JSON", False, f"Response: {data}")
            else:
                self.log_test("Upload valid JSON", False, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Upload valid JSON", False, str(e))
            return False

    def test_upload_invalid_json(self):
        """Test uploading invalid JSON file"""
        try:
            file_path = "/app/invalid_test_file.json"
            if not os.path.exists(file_path):
                self.log_test("Upload invalid JSON", False, "Test file not found")
                return False

            with open(file_path, 'rb') as f:
                files = {'file': ('invalid_test.json', f, 'application/json')}
                response = requests.post(f"{self.api_url}/upload", files=files, timeout=15)
            
            success = response.status_code == 200
            if success:
                data = response.json()
                success = data.get('valid', True) == False and 'error' in data
                self.log_test("Upload invalid JSON", success, f"Error detected: {data.get('error', 'Unknown')[:50]}...")
            else:
                self.log_test("Upload invalid JSON", False, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Upload invalid JSON", False, str(e))
            return False

    def test_upload_second_file(self):
        """Test uploading second JSON file"""
        try:
            file_path = "/app/test_data_file2.json"
            if not os.path.exists(file_path):
                self.log_test("Upload second JSON", False, "Test file not found")
                return False

            with open(file_path, 'rb') as f:
                files = {'file': ('test_file2.json', f, 'application/json')}
                response = requests.post(f"{self.api_url}/upload", files=files, timeout=15)
            
            success = response.status_code == 200
            if success:
                data = response.json()
                success = data.get('valid', False) and 'file_id' in data
                if success:
                    self.uploaded_file_ids.append(data['file_id'])
                    self.log_test("Upload second JSON", True, f"File ID: {data['file_id'][:8]}...")
                else:
                    self.log_test("Upload second JSON", False, f"Response: {data}")
            else:
                self.log_test("Upload second JSON", False, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Upload second JSON", False, str(e))
            return False

    def test_analyze_endpoint(self):
        """Test analyze endpoint"""
        if not self.uploaded_file_ids:
            self.log_test("Analyze endpoint", False, "No uploaded files available")
            return False
        
        try:
            file_id = self.uploaded_file_ids[0]
            response = requests.get(f"{self.api_url}/analyze/{file_id}", timeout=10)
            
            success = response.status_code == 200
            if success:
                data = response.json()
                success = 'detected_paths' in data and 'json_structure' in data
                self.log_test("Analyze endpoint", success, f"Found {len(data.get('detected_paths', []))} paths")
            else:
                self.log_test("Analyze endpoint", False, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Analyze endpoint", False, str(e))
            return False

    def test_tools_endpoint(self):
        """Test tools endpoint"""
        if not self.uploaded_file_ids:
            self.log_test("Tools endpoint", False, "No uploaded files available")
            return False
        
        try:
            file_id = self.uploaded_file_ids[0]
            response = requests.get(f"{self.api_url}/tools/{file_id}", timeout=10)
            
            success = response.status_code == 200
            if success:
                data = response.json()
                success = 'tools' in data and 'count' in data
                self.log_test("Tools endpoint", success, f"Found {data.get('count', 0)} tools")
            else:
                self.log_test("Tools endpoint", False, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Tools endpoint", False, str(e))
            return False

    def test_compare_endpoint(self):
        """Test compare endpoint"""
        if len(self.uploaded_file_ids) < 2:
            self.log_test("Compare endpoint", False, "Need at least 2 uploaded files")
            return False
        
        try:
            compare_data = {
                "file1_id": self.uploaded_file_ids[0],
                "file2_id": self.uploaded_file_ids[1],
                "compare_type": "tools",
                "custom_path": None,
                "selected_tools": None
            }
            
            response = requests.post(f"{self.api_url}/compare", json=compare_data, timeout=20)
            
            success = response.status_code == 200
            if success:
                data = response.json()
                required_fields = ['file1_tools', 'file2_tools', 'same_count', 'modified_count', 'added_count', 'removed_count', 'excel_filename', 'download_url']
                success = all(field in data for field in required_fields)
                if success:
                    self.generated_excel_files.append(data['excel_filename'])
                    self.log_test("Compare endpoint", True, f"Generated: {data['excel_filename']}")
                else:
                    self.log_test("Compare endpoint", False, f"Missing fields in response")
            else:
                self.log_test("Compare endpoint", False, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Compare endpoint", False, str(e))
            return False

    def test_download_endpoint(self):
        """Test download endpoint"""
        if not self.generated_excel_files:
            self.log_test("Download endpoint", False, "No Excel files generated")
            return False
        
        try:
            filename = self.generated_excel_files[0]
            response = requests.get(f"{self.api_url}/download/{filename}", timeout=15)
            
            success = response.status_code == 200
            if success:
                content_type = response.headers.get('content-type', '')
                success = 'spreadsheet' in content_type or 'excel' in content_type or len(response.content) > 1000
                file_size = len(response.content)
                self.log_test("Download endpoint", success, f"File size: {file_size} bytes")
            else:
                self.log_test("Download endpoint", False, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Download endpoint", False, str(e))
            return False

    def test_structure_endpoint(self):
        """Test structure endpoint"""
        if not self.uploaded_file_ids:
            self.log_test("Structure endpoint", False, "No uploaded files available")
            return False
        
        try:
            file_id = self.uploaded_file_ids[0]
            response = requests.get(f"{self.api_url}/structure/{file_id}", timeout=10)
            
            success = response.status_code == 200
            if success:
                data = response.json()
                success = 'structure' in data
                self.log_test("Structure endpoint", success, "Structure data returned")
            else:
                self.log_test("Structure endpoint", False, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Structure endpoint", False, str(e))
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting JSON Compare API Tests")
        print(f"🔗 Testing against: {self.api_url}")
        print("-" * 60)
        
        # Test all endpoints
        tests = [
            self.test_root_endpoint,
            self.test_upload_valid_json,
            self.test_upload_invalid_json,
            self.test_upload_second_file,
            self.test_analyze_endpoint,
            self.test_tools_endpoint,
            self.test_structure_endpoint,
            self.test_compare_endpoint,
            self.test_download_endpoint
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                self.log_test(test.__name__, False, f"Exception: {str(e)}")
        
        print("-" * 60)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        print(f"📋 Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed, self.tests_run, self.tests_passed == self.tests_run

def main():
    tester = JsonCompareAPITester()
    passed, total, all_passed = tester.run_all_tests()
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())