export const DATASETS = {
  "globex": "GLOBEX@globex",
  "lus": "LUS@lus",
  "xetra": "XETR@xetra"
} as const;
export const DATASET_CAPABILITIES = {
  "globex": [
    "catalog",
    "search"
  ],
  "lus": [
    "catalog",
    "latest",
    "timeseries"
  ],
  "xetra": [
    "catalog"
  ]
} as const;
