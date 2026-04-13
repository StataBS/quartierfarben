import { arc, pie } from "d3-shape";
import { select } from "d3-selection";

/** Outer radius of land-use donut (matches PostcardBack layout) */
export const PIE_OUTER_R = 50;
export const PIE_INNER_R = 14;

/**
 * Same inclusion rules as the treemap: categories with rounded share &lt; 1% are omitted.
 */
export function buildLandusePieSlices(areaSizes, categories) {
  if (!areaSizes) return [];
  const slices = [];
  Object.keys(categories).forEach((key) => {
    if (!areaSizes[key]) return;
    const p = areaSizes[key].p;
    if (Math.round(p) < 1) return;
    slices.push({
      category: key,
      value: p,
      color: categories[key].color,
    });
  });
  return slices;
}

/**
 * Colored donut = analysis circle land-use mix; white ring + center dot = “selected point”.
 * @param {SVGGElement | HTMLElement | null} groupEl — use transform translate(cx,cy) on parent
 */
export function renderLandusePieIntoGroup(groupEl, areaSizes, categories) {
  if (!groupEl) return;
  const g = select(groupEl);
  g.selectAll("*").remove();

  const slices = buildLandusePieSlices(areaSizes, categories);
  if (slices.length === 0) {
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", 10)
      .attr("fill", "#aaa")
      .text("—");
    return;
  }

  const pieGen = pie()
    .value((d) => d.value)
    .sort(null);
  const arcs = pieGen(slices);
  const arcGen = arc()
    .innerRadius(PIE_INNER_R)
    .outerRadius(PIE_OUTER_R);

  const pieG = g.append("g").attr("class", "postcard-back-landuse-pie-slices");
  arcs.forEach((d) => {
    pieG
      .append("path")
      .attr("d", arcGen(d))
      .attr("fill", d.data.color)
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.85);
  });

  g.append("circle")
    .attr("r", PIE_INNER_R - 2)
    .attr("fill", "#fff")
    .attr("stroke", "#e0e0e0")
    .attr("stroke-width", 0.4);

  g.append("circle")
    .attr("r", 3.8)
    .attr("fill", "#2f2fa2")
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.85);
}
