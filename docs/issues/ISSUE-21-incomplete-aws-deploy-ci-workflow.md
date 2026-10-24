# [BUG] Incomplete AWS Deployment GitHub Actions Workflow Fails on Pull Requests and Never Deploys

**Labels**: `bug`, `ci/cd`, `devops`, `priority:medium`  
**Severity**: Medium | **Priority**: P2  
**Status**: Open  
**Affected Files**:
- [`.github/workflows/deploy.yml`](file:///c:/Users/pachi/OneDrive/Documents/Downloads/codepilot-ai/Personal-Health-Copilot/.github/workflows/deploy.yml#L48-L51)

---

## 1. Summary
The CI/CD workflow `.github/workflows/deploy.yml` claims to deploy to AWS, but its final step is:
```yaml
      - name: Verify AWS Connection via AWS CLI
        run: |
          aws sts get-caller-identity
```
There is no subsequent step to push Docker images to ECR, deploy to ECS/App Runner, or upload artifacts to S3/CloudFront. Furthermore, the workflow triggers on `pull_request:` to `main`, where external contributors lack repository secrets (`AWS_ACCESS_KEY_ID`), causing PR checks to fail unconditionally.

## 2. Impact
1. Merges to `main` do not actually deploy the application to AWS.
2. Pull requests fail automated checks due to missing credentials.

## 3. Suggested Fix
1. Separate CI (testing/building) from CD (deployment).
2. Only run deployment steps on `push:` to `main`:
   ```yaml
   if: github.event_name == 'push' && github.ref == 'refs/heads/main'
   ```
3. Complete the deployment script (e.g., AWS S3 sync or ECS service update).
