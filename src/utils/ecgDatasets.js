/** Resolve a file in `public/` using the Vite base URL (e.g. /ASP_Simulation_6/). */
export function publicAssetPath(fileName) {
  const base = import.meta.env.BASE_URL || "/";
  const normalized = base.endsWith("/") ? base : `${base}/`;
  return `${normalized}${fileName}`;
}

export const ECG_DATASET_OPTIONS = [
  { id: "ecg100", label: "ECG Dataset 1 (ecg100)", file: "ecg100.csv" },
  { id: "ecg200", label: "ECG Dataset 2 (ecg200)", file: "ecg200.csv" },
  { id: "ecg300", label: "ECG Dataset 3 (ecg300)", file: "ecg300.csv" },
];

export function pathForDatasetId(datasetId) {
  const match = ECG_DATASET_OPTIONS.find((o) => o.id === datasetId);
  return publicAssetPath(match?.file ?? "ecg100.csv");
}
