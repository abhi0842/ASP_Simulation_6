/**
 * High-contrast external tooltip for Monte Carlo multi-series charts.
 */

function getOrCreateTooltip(chart) {
  const parent = chart.canvas.parentNode;
  if (!parent) return null;

  let el = parent.querySelector(".mc-chart-tooltip");
  if (!el) {
    el = document.createElement("div");
    el.className = "mc-chart-tooltip";
    parent.appendChild(el);
  }
  return el;
}

function isTooltipDataset(dp) {
  const ds = dp.dataset;
  if (ds?.tooltip === false || ds?.skipTooltip) return false;
  const color = ds?.borderColor;
  if (color === "transparent" || color === "rgba(0,0,0,0)") return false;
  return true;
}

export function externalMonteCarloTooltip(context) {
  const { chart, tooltip } = context;
  const tooltipEl = getOrCreateTooltip(chart);
  if (!tooltipEl) return;

  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = "0";
    tooltipEl.style.pointerEvents = "none";
    return;
  }

  const visiblePoints = (tooltip.dataPoints ?? []).filter(isTooltipDataset);
  if (!visiblePoints.length) {
    tooltipEl.style.opacity = "0";
    return;
  }

  const time = visiblePoints[0]?.parsed?.x;
  const timeLabel =
    time != null && Number.isFinite(time) ? `Time: ${time.toFixed(3)} s` : "Time: —";

  const rows = visiblePoints.map((dp) => {
    const color = dp.dataset.borderColor || "#1d7480";
    const label = dp.dataset.label || "Value";
    const value =
      dp.parsed?.y != null && Number.isFinite(dp.parsed.y)
        ? `${dp.parsed.y.toFixed(4)} mV²`
        : "N/A";
    return `
      <div class="mc-chart-tooltip__row">
        <span class="mc-chart-tooltip__swatch" style="background:${color}"></span>
        <span class="mc-chart-tooltip__label">${label}</span>
        <span class="mc-chart-tooltip__value">${value}</span>
      </div>`;
  });

  tooltipEl.innerHTML = `
    <div class="mc-chart-tooltip__title">${timeLabel}</div>
    ${rows.join("")}
  `;

  const { offsetLeft: posX, offsetTop: posY } = chart.canvas;
  const parentWidth = chart.canvas.parentNode?.offsetWidth ?? chart.width;
  const parentHeight = chart.canvas.parentNode?.offsetHeight ?? chart.height;

  let left = posX + tooltip.caretX + 18;
  let top = posY + tooltip.caretY - 12;

  const tipWidth = tooltipEl.offsetWidth || 220;
  const tipHeight = tooltipEl.offsetHeight || 120;

  if (left + tipWidth > parentWidth) left = posX + tooltip.caretX - tipWidth - 12;
  if (top + tipHeight > parentHeight) top = posY + tooltip.caretY - tipHeight - 8;
  if (top < 0) top = posY + tooltip.caretY + 12;

  tooltipEl.style.opacity = "1";
  tooltipEl.style.pointerEvents = "none";
  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
}

export const monteCarloTooltipConfig = {
  enabled: false,
  external: externalMonteCarloTooltip,
  mode: "index",
  intersect: false,
  itemSort: (a, b) => {
    const aMain = a.dataset.label?.includes("Ensemble") || a.dataset.label?.includes("Running");
    const bMain = b.dataset.label?.includes("Ensemble") || b.dataset.label?.includes("Running");
    if (aMain && !bMain) return -1;
    if (!aMain && bMain) return 1;
    return 0;
  },
};

export function withMonteCarloTooltipOptions(baseOptions = {}) {
  return {
    ...baseOptions,
    interaction: { mode: "index", intersect: false, ...(baseOptions.interaction ?? {}) },
    plugins: {
      ...(baseOptions.plugins ?? {}),
      tooltip: {
        ...monteCarloTooltipConfig,
        ...(baseOptions.plugins?.tooltip ?? {}),
        enabled: false,
        external: externalMonteCarloTooltip,
      },
    },
  };
}
