# [BUG] AWS Amplify Build Specification Fails When `cd frontend` Loses Subshell State

**Labels**: `bug`, `ci/cd`, `devops`, `priority:low`  
**Severity**: Low | **Priority**: P3  
**Status**: Open  
**Affected Files**:
- [`amplify.yml`](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/amplify.yml#L5-L11)

---

## 1. Summary
In `amplify.yml`:
```yaml
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - cd frontend
        - npm run build
```
In standard AWS Amplify execution environments, separate list items in `commands` execute in distinct subshell processes. Executing `- cd frontend` followed by `- npm ci` runs `npm ci` in the repository root rather than `frontend/`, attempting to install root dependencies and triggering errors.

## 2. Impact
Amplify hosting builds can fail unexpectedly during deployment.

## 3. Suggested Fix
Use compound commands or the `appRoot` property in `amplify.yml`:
```yaml
version: 1
applications:
  - appRoot: frontend
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: out
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*
```
