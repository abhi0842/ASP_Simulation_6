/**
 * Dark multi-series hover tooltip (matches asp-6-demo-completed SignalChart).
 */

function getOrCreateTooltip(chart) {
  const parent = chart.canvas.parentNode;
  if (!parent) return null;

  let el = parent.querySelector(".signal-chart-tooltip");
  if (!el) {
    el = document.createElement("div");
    el.className = "signal-chart-tooltip";
    parent.appendChild(el);
  }
  return el;
}

export function externalSignalTooltip(context) {
  const { chart, tooltip } = context;
  const tooltipEl = getOrCreateTooltip(chart);
  if (!tooltipEl) return;

  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = "0";
    tooltipEl.style.pointerEvents = "none";
    return;
  }

  const time = tooltip.dataPoints?.[0]?.parsed?.x;
  const timeLabel =
    time != null && Number.isFinite(time) ? `Time: ${time.toFixed(3)}s` : "Time: —";

  const rows = (tooltip.dataPoints ?? []).map((dp) => {
    const color = dp.dataset.borderColor || "#fff";
    const label = dp.dataset.label || "Value";
    const value =
      dp.parsed?.y != null && Number.isFinite(dp.parsed.y)
        ? dp.parsed.y.toFixed(3)
        : "N/A";
    return `
      <div class="signal-chart-tooltip__row">
        <span class="signal-chart-tooltip__label" style="color:${color}">${label}:</span>
        <span class="signal-chart-tooltip__value">${value}</span>
      </div>`;
  });

  tooltipEl.innerHTML = `
    <div class="signal-chart-tooltip__title">${timeLabel}</div>
    ${rows.join("")}
  `;

  const { offsetLeft: posX, offsetTop: posY } = chart.canvas;
  const parentWidth = chart.canvas.parentNode?.offsetWidth ?? chart.width;
  const parentHeight = chart.canvas.parentNode?.offsetHeight ?? chart.height;

  let left = posX + tooltip.caretX + 15;
  let top = posY + tooltip.caretY + 15;

  const tipWidth = tooltipEl.offsetWidth || 160;
  const tipHeight = tooltipEl.offsetHeight || 90;

  if (left + tipWidth > parentWidth) left = posX + tooltip.caretX - tipWidth - 10;
  if (top + tipHeight > parentHeight) top = posY + tooltip.caretY - tipHeight - 10;

  tooltipEl.style.opacity = "1";
  tooltipEl.style.pointerEvents = "none";
  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
}

export const signalChartTooltipConfig = {
  enabled: false,
  external: externalSignalTooltip,
  mode: "index",
  intersect: false,
};

export function withSignalTooltipOptions(baseOptions = {}) {
  return {
    ...baseOptions,
    interaction: { mode: "index", intersect: false, ...(baseOptions.interaction ?? {}) },
    plugins: {
      ...(baseOptions.plugins ?? {}),
      tooltip: {
        ...signalChartTooltipConfig,
        ...(baseOptions.plugins?.tooltip ?? {}),
        enabled: false,
        external: externalSignalTooltip,
      },
    },
  };
}
