# Sample documents

Synthetic documents made for this demo. The people, doctors and values are invented; no real patient data.

| File | Use |
|---|---|
| 2026-06-07_ravi_discharge_summary.pdf | Digital PDF discharge summary with medicines and two out-of-range lab values |
| 2026-07-18_venkata_rao_bilingual_prescription.jpg | Telugu and English prescription in a handwriting-style font |
| 2026-08-14_lakshmi_lab_report.jpg | Photographed lab report with three out-of-range values |
| 2026-09-02_lakshmi_prescription.jpg | Handwriting-style prescription that follows the lab report |
| 2026-10-14_lakshmi_followup_lab_report.jpg | The six-week re-check the prescription asks for: haemoglobin better but still low, TSH and vitamin D back in range. Drives the lab trends |
| live-demo_suresh_yadav_hindi_prescription.png | Hindi and English prescription naming a different patient, to show the name check |
| live-demo_not_a_medical_document.png | A grocery list, to show that non-medical uploads are refused |
| live-demo_phone_photo_lab_report.jpg | The lab report as a bad phone photo: tilted, blurred, noisy, uneven light, heavy compression. Reads 12/12 facts correctly |
| live-demo_phone_photo_prescription.jpg | The prescription as a bad phone photo. Reads 9/9 facts correctly |

The first five are preloaded as the sample family. Upload the two `live-demo_` files during a demo.

Scored against hand-written ground truth by `backend/eval/run_eval.py`; latest results in `backend/eval/results.md`.
