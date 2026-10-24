# [CODE-QUALITY] 631 Ruff Lint Violations and Formatting Errors Across Backend

**Labels**: `code-quality`, `python`, `tech-debt`, `priority:low`  
**Severity**: Low | **Priority**: P3  
**Status**: Open  
**Affected Files**:
- `backend/app/**/*.py`
- `backend/tests/**/*.py`
- `backend/eval/**/*.py`

---

## 1. Summary
Running `python -m ruff check backend` reveals **631 lint, typing, and syntax errors** across the backend codebase. Over 530 of these are auto-fixable standard formatting and modern Python typing updates.

## 2. Key Violation Categories
- `I001`: Unsorted and unformatted import blocks across all test files and routers.
- `PLE2515`: Unescaped zero-width spaces in strings instead of `\u200b` escape sequences (`backend/tests/test_copilot.py:11`).
- `UP006` / `UP045`: Outdated Python 3.8 typing constructs (`typing.List`, `typing.Dict`, `typing.Optional`) instead of modern Python 3.10+ syntax (`list`, `dict`, `| None`).
- `RUF059`: Unpacked unused return variables.
- `B110` / `B101`: Naked `try ... except: pass` and non-test assert statements.

## 3. Suggested Fix
Run Ruff automated formatting and autofix:
```bash
python -m ruff check backend --fix
python -m ruff format backend
```
