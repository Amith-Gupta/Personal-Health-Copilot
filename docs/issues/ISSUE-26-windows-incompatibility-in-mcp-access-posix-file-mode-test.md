# [BUG] Windows Incompatibility in `test_mcp_access.py` POSIX File Mode Check Causes Test Suite Failure

**Labels**: `bug`, `testing`, `windows`, `priority:medium`  
**Severity**: Medium | **Priority**: P2  
**Status**: Open  
**Affected Files**:
- [`backend/tests/test_mcp_access.py`](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/backend/tests/test_mcp_access.py#L153)

---

## 1. Summary
In `backend/tests/test_mcp_access.py`, line 153 tests file permission privacy:
```python
def test_store_is_private_and_a_corrupt_file_is_never_overwritten(governance):
    import os, stat
    key = governance.generate_mcp_key("owner-1")["raw_key"]
    mode = stat.S_IMODE(os.stat(governance.GOVERNANCE_FILE).st_mode)
    assert mode == 0o600
```
On Windows NTFS/FAT filesystems, POSIX file permissions are not supported. `os.chmod()` on Windows only toggles the read-only attribute; query of `st_mode` returns `438` (octal `0o666`). The assertion `assert mode == 0o600` (`assert 438 == 384`) fails unconditionally on Windows.

## 2. Impact
Backend automated tests fail on Windows developer workstations, preventing clean test verification.

## 3. Suggested Fix
Skip or branch the permission check on non-POSIX operating systems:
```python
import sys
if sys.platform != "win32":
    assert mode == 0o600
```
