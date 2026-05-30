import { useContext, useEffect, useState, useRef, useCallback } from "react";
import { SimulationContext } from "../../context/SimulationContext.jsx";
import styles from "./guidedModal.module.css";

const MODAL_WIDTH = 320;
const TOP_PANEL_HEIGHT = 60;
const POSITION_RETRY_MS = [0, 100, 350];

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

export const GuidedModal = () => {
  const {
    guideActive,
    endGuide,
    step,
    setStep,
    steps,
    currentStep,
    canProceed,
    setShowInstruction,
    showInstruction,
    instructionPanelRef,
  } = useContext(SimulationContext);

  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowStyle, setArrowStyle] = useState({});
  const [arrowClass, setArrowClass] = useState("");
  const modalRef = useRef(null);
  const stepRef = useRef(step);
  const guideActiveRef = useRef(guideActive);

  stepRef.current = step;
  guideActiveRef.current = guideActive;

  const setCenteredPosition = useCallback((modalHeight, contRect, container) => {
    const top = clamp(
      window.innerHeight / 2 - modalHeight / 2 - contRect.top,
      8,
      container.scrollHeight - modalHeight - 8
    );
    const left = clamp(
      window.innerWidth / 2 - MODAL_WIDTH / 2 - contRect.left,
      8,
      contRect.width - MODAL_WIDTH - 8
    );
    setPosition({ top, left });
    setArrowClass("");
    setArrowStyle({});
  }, []);

  const resolveTarget = useCallback(
    (stepConfig) => {
      if (!stepConfig || stepConfig.type === "choice") return null;

      if (stepConfig.highlight === "instructionPanel") {
        return showInstruction ? instructionPanelRef.current : null;
      }

      const targetId = stepConfig.highlight || stepConfig.targetId;
      if (!targetId) return null;
      return document.getElementById(targetId);
    },
    [instructionPanelRef, showInstruction]
  );

  const updatePosition = useCallback(() => {
    if (!guideActiveRef.current) return;

    const stepIndex = stepRef.current;
    const stepConfig = steps[stepIndex];
    if (!stepConfig) return;

    const modalHeight = modalRef.current?.offsetHeight || 150;
    const container = modalRef.current?.parentElement;
    if (!container) return;

    const contRect = container.getBoundingClientRect();

    if (stepConfig.type === "choice" || stepConfig.preferredPlacement === "center") {
      setCenteredPosition(modalHeight, contRect, container);
      return;
    }

    const target = resolveTarget(stepConfig);
    const rect = target?.getBoundingClientRect();
    const hasVisibleTarget =
      target && rect && rect.width > 0 && rect.height > 0;

    if (!hasVisibleTarget) {
      setCenteredPosition(modalHeight, contRect, container);
      return;
    }

    const OFFSET = stepConfig.isDropdown ? 24 : 16;
    const isMobile = window.innerWidth < 768;

    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let chosenSide = isMobile ? "bottom" : stepConfig.preferredPlacement || "right";

    if (stepConfig.isDropdown && !isMobile) {
      chosenSide = spaceRight > spaceLeft ? "right" : "left";
    }

    const sides = { right: spaceRight, left: spaceLeft, bottom: spaceBelow, top: spaceAbove };

    if (chosenSide !== "center") {
      const requiredSpace =
        chosenSide === "left" || chosenSide === "right"
          ? MODAL_WIDTH + OFFSET
          : modalHeight + OFFSET;
      if (sides[chosenSide] < requiredSpace) {
        chosenSide = Object.entries(sides).sort((a, b) => b[1] - a[1])[0][0];
      }
    }

    let top = 0;
    let left = 0;
    let arrowDir = "";

    if (chosenSide === "right") {
      left = rect.right + OFFSET;
      top = rect.top + rect.height / 2 - modalHeight / 2;
      arrowDir = styles.arrowLeft;
    } else if (chosenSide === "left") {
      left = rect.left - MODAL_WIDTH - OFFSET;
      top = rect.top + rect.height / 2 - modalHeight / 2;
      arrowDir = styles.arrowRight;
    } else if (chosenSide === "top") {
      top = rect.top - modalHeight - OFFSET;
      left = rect.left + rect.width / 2 - MODAL_WIDTH / 2;
      arrowDir = styles.arrowBottom;
    } else if (chosenSide === "bottom") {
      top = rect.bottom + OFFSET;
      left = rect.left + rect.width / 2 - MODAL_WIDTH / 2;
      arrowDir = styles.arrowTop;
    } else {
      setCenteredPosition(modalHeight, contRect, container);
      return;
    }

    if (top < TOP_PANEL_HEIGHT + 8) top = TOP_PANEL_HEIGHT + 8;

    top = top - contRect.top;
    left = left - contRect.left;

    const maxL = contRect.width - MODAL_WIDTH - 8;
    left = clamp(left, 8, maxL);

    const maxT = container.scrollHeight - modalHeight - 8;
    top = clamp(top, 8, maxT);

    const targetRelCenterX = rect.left - contRect.left + rect.width / 2;
    const targetRelCenterY = rect.top - contRect.top + rect.height / 2;

    let aStyle = {};
    if (arrowDir === styles.arrowLeft || arrowDir === styles.arrowRight) {
      aStyle = { top: clamp(targetRelCenterY - top, 15, modalHeight - 15) };
    } else if (arrowDir === styles.arrowTop || arrowDir === styles.arrowBottom) {
      aStyle = { left: clamp(targetRelCenterX - left, 15, MODAL_WIDTH - 15) };
    }

    setPosition({ top, left });
    setArrowClass(arrowDir);
    setArrowStyle(aStyle);
  }, [resolveTarget, setCenteredPosition, steps]);

  useEffect(() => {
    if (!guideActive) return undefined;

    const timeouts = POSITION_RETRY_MS.map((delay) =>
      window.setTimeout(updatePosition, delay)
    );

    const onLayoutChange = () => {
      window.requestAnimationFrame(updatePosition);
    };

    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [guideActive, step, showInstruction, updatePosition]);

  const handleNext = useCallback(() => {
    if (!canProceed) return;
    setStep((prev) => Math.min(steps.length - 1, prev + 1));
  }, [canProceed, setStep, steps.length]);

  const handleBack = useCallback(() => {
    setStep((prev) => Math.max(0, prev - 1));
  }, [setStep]);

  const handleYes = useCallback(() => {
    setShowInstruction(true);
    setStep((prev) => (prev === 0 ? 1 : prev));
  }, [setShowInstruction, setStep]);

  const handleSkip = useCallback(() => {
    endGuide();
  }, [endGuide]);

  if (!guideActive || !currentStep) return null;

  const isChoice = currentStep.type === "choice";
  const totalTourSteps = steps.length - 1;
  const displayStep = Math.max(1, Math.min(step, totalTourSteps));

  return (
    <div
      className={styles.modalOverlay}
      style={{
        top: position.top,
        left: position.left,
        opacity: guideActive ? 1 : 0,
        pointerEvents: guideActive ? "auto" : "none",
      }}
      ref={modalRef}
    >
      <div className={styles.modal}>
        {arrowClass && <div className={`${styles.arrow} ${arrowClass}`} style={arrowStyle} />}
        <button type="button" className={styles.closeIcon} onClick={handleSkip} aria-label="Close">
          ×
        </button>
        <h2>{currentStep.title}</h2>
        <p>{currentStep.content}</p>
        <div className={styles.footer}>
          {isChoice ? (
            <div className={styles.buttonGroup}>
              <button type="button" className={styles.nextButton} onClick={handleYes}>
                Yes, show me
              </button>
              <button type="button" className={styles.cancelButton} onClick={handleSkip}>
                Skip
              </button>
            </div>
          ) : (
            <div className={styles.buttonGroup}>
              <div className={styles.stepCounter}>
                Step {displayStep} of {totalTourSteps}
              </div>
              <div className={styles.navButtons}>
                {step > 1 && (
                  <button type="button" className={styles.cancelButton} onClick={handleBack}>
                    Back
                  </button>
                )}
                {step < steps.length - 1 ? (
                  <button
                    type="button"
                    className={styles.nextButton}
                    onClick={handleNext}
                    disabled={!canProceed}
                  >
                    {currentStep.requiredAction && !canProceed ? "Complete..." : "Next"}
                  </button>
                ) : (
                  <button type="button" className={styles.nextButton} onClick={handleSkip}>
                    Finish
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
