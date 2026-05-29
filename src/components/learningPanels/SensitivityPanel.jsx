import { useState, useEffect, useContext } from "react";
import { Line } from "react-chartjs-2";
import { SimulationContext } from "../../context/SimulationContext";
import { runLMS_AR, runMVDR } from "../../utils/algorithms";
import styles from "./learningPanels.module.css";

const lineOpts = (title, xLabel, yLabel) => ({
  responsive:true, maintainAspectRatio:false, animation:false,
  plugins:{ title:{display:true,text:title,font:{size:13,weight:'bold'},color:'#1D7480'}, legend:{display:false} },
  scales:{ x:{title:{display:true,text:xLabel,font:{size:11}}}, y:{title:{display:true,text:yLabel,font:{size:11}}} },
});

export const SensitivityPanel = () => {
  const { rawSamples, generateECG } = useContext(SimulationContext);
  const [tab, setTab] = useState("lms");
  const [loading, setLoading] = useState(false);
  const [lmsData, setLmsData] = useState(null);
  const [mvdrData, setMvdrData] = useState(null);

  useEffect(() => {
    if (!generateECG || !rawSamples || rawSamples.length < 50) return;
    setLoading(true);
    setTimeout(() => {
      const ecg = rawSamples.map(p => p["ECG_I"] ?? 0);

      // LMS-AR sensitivity
      const muVals = [0.00001,0.00005,0.0001,0.0005,0.001,0.002,0.003,0.005];
      const muMse = muVals.map(mu => {
        try {
          const r = runLMS_AR(ecg, 4, mu, 20, 123);
          return r ? r.mse[r.mse.length-1] : null;
        } catch { return null; }
      });

      const pVals = [2,3,4,5,6,7,8,10,12,16];
      const pConv = pVals.map(P => {
        try {
          const r = runLMS_AR(ecg, P, 0.001, 20, 123);
          if (!r) return null;
          const thresh = r.mse[0] * 0.5;
          const idx = r.mse.findIndex(v => v < thresh);
          return idx === -1 ? r.mse.length : idx;
        } catch { return null; }
      });

      // MVDR sensitivity
      const mVals = [4,6,8,10,12,14,16];
      const mNull = mVals.map(M => {
        try {
          const r = runMVDR(ecg, M, 256, 30, -45, 20, 25, 20);
          if (!r) return null;
          const nullIdx = r.phi.findIndex(p => Math.abs(p - (-45)) <= 1);
          return nullIdx >= 0 ? r.G_dB_avg[nullIdx] : null;
        } catch { return null; }
      });

      const kVals = [100,200,300,400,500,600,700,800,1000];
      const kAcc = kVals.map(K => {
        try {
          const r = runMVDR(ecg, 8, K, 30, -45, 20, 25, 10);
          if (!r) return null;
          const peak = Math.max(...r.G_dB_avg);
          return Math.abs(peak); // deviation from 0 dB ideal
        } catch { return null; }
      });

      setLmsData({ muVals, muMse, pVals, pConv });
      setMvdrData({ mVals, mNull, kVals, kAcc });
      setLoading(false);
    }, 100);
  }, [rawSamples, generateECG]);

  const [open, setOpen] = useState(false);

  return (
    <div className={styles.panelWrapper}>
      <button className={styles.panelToggle} onClick={() => setOpen(o=>!o)}>
        📊 Sensitivity Analysis {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className={styles.panelContent}>
          <div className={styles.tabRow}>
            <button className={tab==="lms" ? styles.tabActive : styles.tabBtn} onClick={()=>setTab("lms")}>LMS-AR</button>
            <button className={tab==="mvdr" ? styles.tabActive : styles.tabBtn} onClick={()=>setTab("mvdr")}>MVDR</button>
          </div>

          {!generateECG && <p style={{color:'#888',fontSize:'13px',padding:'12px'}}>Generate an ECG signal first to compute sensitivity charts.</p>}
          {generateECG && loading && <div className={styles.spinner}><div className={styles.spinnerInner}/>Computing sensitivity data…</div>}

          {generateECG && !loading && tab === "lms" && lmsData && (
            <>
              <div style={{height:'200px',marginBottom:'16px'}}>
                <Line data={{ labels:lmsData.muVals.map(v=>v.toExponential(1)), datasets:[{ label:'Final MSE', data:lmsData.muMse, borderColor:'#e63946', borderWidth:2, pointRadius:4, backgroundColor:'#e63946', tension:0.3 }] }} options={lineOpts('Step Size μ vs Final MSE','μ value','Final MSE')} />
              </div>
              <div style={{height:'200px'}}>
                <Line data={{ labels:lmsData.pVals.map(String), datasets:[{ label:'Iters to converge', data:lmsData.pConv, borderColor:'#0078d4', borderWidth:2, pointRadius:4, backgroundColor:'#0078d4', tension:0.3 }] }} options={lineOpts('AR Order P vs Convergence Speed','AR Order P','Iterations to 50% MSE drop')} />
              </div>
            </>
          )}

          {generateECG && !loading && tab === "mvdr" && mvdrData && (
            <>
              <div style={{height:'200px',marginBottom:'16px'}}>
                <Line data={{ labels:mvdrData.mVals.map(String), datasets:[{ label:'Null Depth (dB)', data:mvdrData.mNull, borderColor:'#1D7480', borderWidth:2, pointRadius:4, backgroundColor:'#1D7480', tension:0.3 }] }} options={lineOpts('Array Elements M vs Null Depth','M (elements)','Null Depth (dB)')} />
              </div>
              <div style={{height:'200px'}}>
                <Line data={{ labels:mvdrData.kVals.map(String), datasets:[{ label:'Peak deviation (dB)', data:mvdrData.kAcc, borderColor:'#f4a261', borderWidth:2, pointRadius:4, backgroundColor:'#f4a261', tension:0.3 }] }} options={lineOpts('Snapshots K vs Pattern Accuracy','K (snapshots)','Peak deviation (dB)')} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
