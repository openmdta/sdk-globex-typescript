export const DATASETS = {
  "firds": "globex/firds",
  "globex": "globex/globex",
  "lus": "globex/lus",
  "sim": "globex/sim",
  "xetra": "globex/xetra"
} as const;
export const DATASET_CAPABILITIES = {
  "firds": [
    "catalog"
  ],
  "globex": [
    "catalog",
    "search"
  ],
  "lus": [
    "catalog",
    "latest",
    "timeseries"
  ],
  "sim": [
    "catalog",
    "latest",
    "timeseries"
  ],
  "xetra": [
    "catalog"
  ]
} as const;
