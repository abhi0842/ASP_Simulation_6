import { DATASET_INFO } from "../../data/educationalContent.js";
import { ExpandablePanel, LearningOutcomes } from "./EducationalPrimitives.jsx";

export function DatasetInfoPanel({ signalType, uploadedSignalName }) {
  const info = DATASET_INFO[signalType] || DATASET_INFO.ecg100;
  const title =
    signalType === "upload" && uploadedSignalName
      ? `About: ${uploadedSignalName}`
      : `About: ${info.name}`;

  return (
    <ExpandablePanel title={title}>
      <p><strong>Description:</strong> {info.description}</p>
      <p><strong>Signal source:</strong> {info.source}</p>
      <p><strong>ECG characteristics:</strong> {info.characteristics}</p>
      <p><strong>Sampling:</strong> {info.sampling}</p>
      <p><strong>Why this dataset:</strong> {info.whyUsed}</p>
      <p><strong>What to observe:</strong> {info.observe}</p>
      <LearningOutcomes items={info.outcomes} />
    </ExpandablePanel>
  );
}
