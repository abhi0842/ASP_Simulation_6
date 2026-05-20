import { useContext } from "react";
import styles from "./leftPanel.module.css";
import { EcgUnfilter } from "../graph/EcgUnfilter.jsx";
import { Exp3aGraph } from "../graph/Exp3aGraph.jsx";
import { SimulationContext } from "../../context/SimulationContext.jsx";

export const LeftPanel = () => {
  const { generateECG } = useContext(SimulationContext);
  return (
    <div className={styles.leftPanelContainer}>
      <div className={styles.container}>
        <div>{generateECG && <EcgUnfilter />}</div>
        <div><Exp3aGraph /></div>
      </div>
    </div>
  );
};
