import {
  hierarchy,
  treemap as treemapLayout,
  treemapBinary,
} from "d3-hierarchy";
import { select } from "d3-selection";

function sumByCount(d) {
  return d.size;
}

/**
 * Same land-use tree shape as PostcardFront `dataUpdated` (drops categories &lt; 1% when rounded).
 * @param {Record<string, { p?: number }> | undefined} areaSizes
 * @param {Record<string, { name: string; name_en: string; color: string }>} categories
 * @param {string} lang `'de'` | `'en'`
 */
export function buildTreemapData(areaSizes, categories, lang) {
  if (!areaSizes) {
    return { children: [] };
  }
  const treeChildren = [];
  Object.keys(categories).forEach((keyCategories) => {
    const child = {
      name: categories[keyCategories].name,
      children: [],
    };

    if (!areaSizes[keyCategories]) {
      return;
    }
    if (Math.round(areaSizes[keyCategories].p) < 1) {
      return;
    }

    child.children.push({
      category: keyCategories,
      label: categories[keyCategories][lang === "de" ? "name" : "name_en"],
      size: areaSizes[keyCategories]?.p || 0,
      color: categories[keyCategories].color,
    });

    treeChildren.push(child);
  });

  return { children: treeChildren };
}

/**
 * Renders treemap cells into an SVG &lt;g&gt; (replaces children). No animation.
 * @param {SVGGElement | HTMLElement} groupEl
 * @param {import('d3-hierarchy').HierarchyNode<{ children?: unknown[] }>} data
 * @param {{ width: number; height: number; paddingOuter?: number; fontFamily?: string; percentFontFamily?: string; percentFontSize?: number; showPercentLabels?: boolean }} opts
 */
export function renderTreemapIntoGroup(groupEl, data, opts) {
  const {
    width,
    height,
    paddingOuter = 2,
    fontFamily = "IBM Plex Sans Text",
    percentFontFamily = '"Fira Mono", ui-monospace, monospace',
    percentFontSize = 9,
    showPercentLabels = true,
  } = opts;

  const root = hierarchy(data);
  const layout = treemapLayout()
    .tile(treemapBinary)
    .size([width, height])
    .round(true)
    .paddingOuter(paddingOuter);

  layout(root.sum(sumByCount));

  const g = select(groupEl);
  g.selectAll("*").remove();

  const leaves = root.leaves();
  if (leaves.length === 0) {
    g.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("font-family", fontFamily)
      .attr("font-size", 10)
      .attr("fill", "#888")
      .text("—");
    return;
  }

  const cell = g
    .selectAll("g.cell")
    .data(leaves)
    .enter()
    .append("g")
    .attr("class", "cell")
    .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

  cell
    .append("rect")
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("fill", (d) => d.data.color);

  const titleFunc = (d) =>
    `${d.data.label}: ${
      d.data.size < 2 ? d.data.size.toFixed(1) : Math.round(d.data.size)
    }%`;

  cell.append("title").text(titleFunc);

  if (showPercentLabels) {
    cell
      .append("text")
      .attr("x", (d) => d.x1 - d.x0 - 4)
      .attr("y", (d) => d.y1 - d.y0 - 6)
      .attr("text-anchor", "end")
      .attr("font-family", percentFontFamily)
      .attr("font-size", percentFontSize)
      .attr("fill", "#000000")
      .text((d) => {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        if (w < 28 || h < 22) return "";
        return `${Math.round(d.data.size)}%`;
      })
      .append("title")
      .text(titleFunc);
  }
}
