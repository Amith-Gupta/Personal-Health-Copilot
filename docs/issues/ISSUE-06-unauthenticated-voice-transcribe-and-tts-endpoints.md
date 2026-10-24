# [Security/Medium] Unauthenticated Voice Transcription and TTS Endpoints Allow DoS & API Resource Abuse

- **Issue ID**: ISSUE-06
- **Severity**: Medium (CVSS 6.5)
- **Priority**: P2
- **Component**: `Backend / Voice Router`
- **Labels**: `security, voice, api-abuse, backend, p2`

---

## 1. Summary
The /api/v1/voice/transcribe endpoint accepts an authorization: Optional[str] = Header(None) parameter but never validates it. The /api/v1/voice/tts endpoint has no authentication check whatsoever. Anyone on the internet can send audio files or generate speech.

---

## 2. Affected Code Locations
- `backend/app/routers/voice.py:L9-L36`

---

## 3. Impact & Risk
Attackers can spam Groq Whisper API, exhausting the host Groq rate limit (TPM/RPM) and crashing speech services for legitimate users.

---

## 4. Steps to Reproduce
1. Send an unauthenticated POST request to /api/v1/voice/transcribe with an audio snippet.
2. Observe that transcription succeeds without sign-in.

---

## 5. Expected Behavior
Both /voice/transcribe and /voice/tts must require valid Supabase JWT authentication (Depends(current_user_id)) and rate limiting.

---

## 6. Suggested Fix / Code Snippet
Add user_id: str = Depends(current_user_id) to both endpoint function signatures in backend/app/routers/voice.py.
