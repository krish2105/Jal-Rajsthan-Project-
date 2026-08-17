WRIS request format (from wris_extractor v2.0, plugins.qgis.org):
POST https://indiawris.gov.in/masterState/StateList  json={}
POST https://indiawris.gov.in/masterDistrict/getDistrictbyState
POST https://indiawris.gov.in/Dataset/{urlencoded dataset name}  json={'datasetcode': ...}
All timed out at connection level on 2026-08-17/18 — retry when portal revives.
