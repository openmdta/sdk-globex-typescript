export const DATASETS = {
  "globex": "globex/globex",
  "lus": "globex/lus",
  "xetra": "globex/xetra"
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
