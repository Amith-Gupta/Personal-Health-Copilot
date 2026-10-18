# Extraction accuracy

Run 2026-10-18 19:12. Ground truth: `eval/ground_truth.json`.

| Document | Facts correct | Model | Seconds | Note |
|---|---|---|---|---|
| 2026-06-07_ravi_discharge_summary.pdf | 16/16 | gemini-3.5-flash | 379.7 |  |
| 2026-07-18_venkata_rao_bilingual_prescription.jpg | 12/12 | gemini-3.7-flash | 272.0 |  |
| 2026-08-14_lakshmi_lab_report.jpg | 15/15 | gemini-3.7-flash | 29.2 |  |
| 2026-09-02_lakshmi_prescription.jpg | 12/12 | gemini-3.7-flash | 20.4 |  |
| 2026-10-14_lakshmi_followup_lab_report.jpg | 15/15 | gemini-3.7-flash | 14.9 |  |
| live-demo_phone_photo_lab_report.jpg | 15/15 | gemini-3.7-flash | 18.2 |  |
| live-demo_phone_photo_prescription.jpg | 12/12 | gemini-3.7-flash | 14.3 |  |
| live-demo_suresh_yadav_hindi_prescription.png | 9/9 | gemini-3.7-flash | 15.1 |  |
| live-demo_not_a_medical_document.png | 1/1 | - | 9.0 | refused as not medical |

**Total: 107/107 facts (100.0%).**

