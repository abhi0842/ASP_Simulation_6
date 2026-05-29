import { useContext, useEffect, useRef } from "react";
import styles from "./home.module.css";
import { TopPanel } from "../../components/topPanel/TopPanel.jsx";
import { Instruction } from "../../components/instruction/Instruction.jsx";
import { SimulationContext } from "../../context/SimulationContext.jsx";
import { LeftPanel } from "../../components/leftPanel/LeftPanel.jsx";
import { RightPanel } from "../../components/rightPanel/RightPanel.jsx";
import { GuidedModal } from "../../components/guidedModal/GuidedModal.jsx";

export const Home = () => {
  const { showInstruction, setShowInstruction, buttonRef, instructionPanelRef } =
    useContext(SimulationContext);
  const instructionRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const panel = instructionPanelRef.current || instructionRef.current;
      if (panel && !panel.contains(event.target)) {
        if (buttonRef.current && !buttonRef.current.contains(event.target)) {
          setShowInstruction(false);
        }
      }
    };
    if (showInstruction) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showInstruction, setShowInstruction, buttonRef, instructionPanelRef]);

  return (
    <div className={styles.grandContainer}>
      <div className={styles.parentContainer}>
        <header className={styles.topContainer}>
          <TopPanel />
        </header>

        <div className={styles.dashboardLayout}>
          <aside className={styles.sidebar}>
            <RightPanel />
          </aside>

          <main className={styles.mainContent}>
            {showInstruction && (
              <div
                id="instructionPanel"
                ref={(el) => {
                  instructionRef.current = el;
                  if (instructionPanelRef) instructionPanelRef.current = el;
                }}
                className={styles.instructionContainer}
              >
                <Instruction />
              </div>
            )}
            <LeftPanel />
          </main>
        </div>

        <footer className={styles.footerContainer}>
          ©Copyright 2025 Virtual Labs, IIT Roorkee
        </footer>
        <GuidedModal />
      </div>
    </div>
  );
};
