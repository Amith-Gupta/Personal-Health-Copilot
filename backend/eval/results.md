# Extraction accuracy

Run 2026-10-24 13:11. Ground truth: `eval/ground_truth.json`.

| Document | Facts correct | Model | Seconds | Note |
|---|---|---|---|---|
| 2026-06-07_ravi_discharge_summary.pdf | 16/16 | gemini-3.5-flash | 17.0 |  |
| 2026-07-18_venkata_rao_bilingual_prescription.jpg | 12/12 | gemini-3.5-flash | 15.4 |  |
| 2026-08-14_lakshmi_lab_report.jpg | 15/15 | gemini-flash-lite-latest | 59.4 |  |
| 2026-09-02_lakshmi_prescription.jpg | 12/12 | gemini-flash-lite-latest | 53.6 |  |
| 2026-10-14_lakshmi_followup_lab_report.jpg | 15/15 | gemini-flash-lite-latest | 50.1 |  |
| live-demo_phone_photo_lab_report.jpg | 15/15 | gemini-flash-lite-latest | 50.1 |  |
| live-demo_phone_photo_prescription.jpg | 12/12 | gemini-flash-lite-latest | 51.3 |  |
| live-demo_suresh_yadav_hindi_prescription.png | 9/9 | gemini-flash-lite-latest | 48.0 |  |
| live-demo_not_a_medical_document.png | 1/1 | - | 50.7 | refused as not medical |

**Total: 107/107 facts (100.0%).**

