# [Reliability/Medium] Unofficial Google Translate TTS Endpoint Scraping with Hardcoded 200-Character Truncation

- **Issue ID**: ISSUE-07
- **Severity**: Medium (CVSS 5.8)
- **Priority**: P2
- **Component**: `Backend / Voice Engine`
- **Labels**: `bug, reliability, voice, tts, ux, p2`

---

## 1. Summary
synthesize_speech scrapes an unofficial internal Google Translate endpoint (translate.google.com/translate_tts?client=tw-ob) with a spoofed browser User-Agent. It hardcodes snippet = clean[:200], arbitrarily cutting off medical advice after ~30 words.

---

## 2. Affected Code Locations
- `backend/app/services/voice_engine.py:L55-L81`

---

## 3. Impact & Risk
Clinical advice truncation: patients listening to Telugu/Hindi readouts miss vital precautions and medication timing. Cloud IPs are frequently blocked by Google with HTTP 429/CAPTCHA.

---

## 4. Steps to Reproduce
1. Synthesize text longer than 200 characters.
2. Listen to output.mp3; observe speech terminates abruptly mid-sentence.

---

## 5. Expected Behavior
TTS should synthesize the full explanation using an official TTS provider (Google Cloud TTS, Azure Speech, or Bhashini) or use client-side Web Speech Synthesis API (window.speechSynthesis).

---

## 6. Suggested Fix / Code Snippet
Use client-side Web Speech API in frontend/components/use-speech.ts and replace backend scraping with official Google Cloud Text-to-Speech SDK.
