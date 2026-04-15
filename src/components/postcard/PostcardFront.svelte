<!-- NOTES
https://bl.ocks.org/mbostock/4063582
https://medium.com/codex/getting-started-with-svelte-and-d3-js-ea915d2c2c2c
https://github.com/d3/d3-hierarchy
https://observablehq.com/@d3/treemap
 -->
<script>
  import {
    hierarchy,
    treemap as treemapLayout,
    treemapBinary,
  } from "d3-hierarchy";
  import { select } from "d3-selection";
  import { transition } from "d3-transition";
  import { geoMercator, geoPath, geoCircle } from "d3-geo";
  import {
    areaSizes,
    dimensions,
    svg,
    textVis,
    locationText,
    lang,
    isMobile,
    screenWidth,
    mapCenter,
    circleRadius,
    showCoordinates,
  } from "$lib/stores.js";
  import { categories, postcardMargin } from "$lib/settings.js";
  import { FONT_STACK_MONO } from "$lib/fontMono.js";
  import { buildTreemapData } from "$lib/postcardTreemap.js";

  import geojson from "$lib/borders.js";

  /** Front title should match legend / numeric mono style. */
  const FONT_SANS = FONT_STACK_MONO;
  const FONT_SANS_BOLD = 'Inter, "Inter Fallback", system-ui, sans-serif';

  /** Title line (viewBox y); higher = more room for coords + mini-map below */
  const TITLE_Y = 0.855;
  /** Front title base size (one step smaller than before). */
  const TITLE_FONT_SIZE = 27;
  const TITLE_FONT_MIN = 14;
  const TITLE_HORIZONTAL_PADDING = 36;

  /**
   * Shrinks title text until it fits in the available width.
   * @param {import("d3-selection").Selection<SVGTextElement, string, SVGSVGElement, unknown>} selection
   */
  function fitTitleTextSelection(selection) {
    selection.each(function (d) {
      const node = this;
      if (!node) return;
      node.setAttribute("font-size", String(TITLE_FONT_SIZE));
      if (!d || !String(d).trim()) return;
      let size = TITLE_FONT_SIZE;
      while (
        size > TITLE_FONT_MIN &&
        node.getComputedTextLength() > width - TITLE_HORIZONTAL_PADDING
      ) {
        size -= 0.5;
        node.setAttribute("font-size", String(size));
      }
    });
  }

  /** WGS84 degrees on postcard (5 digits after decimal point). */
  function formatCoordForLabel(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(5) : String(value ?? "");
  }

  function coordinatesLineText(center) {
    if (!center?.length) return "";
    return (
      "Lat " +
      formatCoordForLabel(center[1]) +
      " N, Lng " +
      formatCoordForLabel(center[0]) +
      " E"
    );
  }

  let projection;
  let borders = geojson();

  import en from "$locales/en.json";
  import de from "$locales/de.json";

  let appText = {};
  $: {
    if ($lang === "en") {
      appText = en;
    } else {
      appText = de;
    }
  }

  /** Horizontal inset for scale math — matches mx-[1.5rem] / sm:mx-[2rem] (DDS maps px-8 to 8px!) */
  $: mobileHorizontalInsetPx = $screenWidth >= 640 ? 64 : 48;

  let treemap;
  function sumByCount(d) {
    return d.size;
  }
  const width = 148 * 3, // $dimensions[0],
    height = 210 * 3; // $dimensions[1];

  let visWrapper;

  function dataUpdated(size) {
    if (!size) return;
    const data = buildTreemapData(size, categories, $lang);
    redraw(data);
  }

  $: dataUpdated($areaSizes);
  $: updateText($textVis, $locationText);
  $: if ($svg) {
    $svg.selectAll(".coordinates-text").remove();
    if ($showCoordinates && $mapCenter) {
      const coordText = coordinatesLineText($mapCenter);
      $svg
        .append("text")
        .attr("class", "coordinates-text")
        .attr(
          "transform",
          "translate(" +
            width / 2 +
            "," +
            (height * 0.93 - postcardMargin) +
            ")",
        )
        .attr("text-anchor", "middle")
        .attr("font-family", FONT_STACK_MONO)
        .attr("font-size", 13)
        .attr("fill", "#666666")
        .text(coordText);
    }
  }

  function resolveTitleText(customText, autoText) {
    if (customText && customText.trim()) return customText;
    if (autoText && autoText.trim()) return autoText;
    return "";
  }

  function updateText(customText, autoText) {
    if (!$svg) {
      return;
    }

    const titleSelection = $svg
      .selectAll(".title-text")
      .data([resolveTitleText(customText, autoText)])
      .text(function (d) {
        return d;
      });
    fitTitleTextSelection(titleSelection);

    // Update coordinates text
    $svg.selectAll(".coordinates-text").remove();
    if ($showCoordinates && $mapCenter) {
      const coordText = coordinatesLineText($mapCenter);
      $svg
        .append("text")
        .attr("class", "coordinates-text")
        .attr(
          "transform",
          "translate(" +
            width / 2 +
            "," +
            (height * 0.93 - postcardMargin) +
            ")",
        )
        .attr("text-anchor", "middle")
        .attr("font-family", FONT_STACK_MONO)
        .attr("font-size", 13)
        .attr("fill", "#666666")
        .text(coordText);
    }
  }

  function redraw(data) {
    if ($svg) {
      $svg.remove();
    }

    const t = transition().duration(1000);

    $svg = select(visWrapper)
      .append("svg")
      .attr("width", $dimensions[0] + "mm")
      .attr("height", $dimensions[1] + "mm")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("class", "postcard inline " + ($isMobile ? "border" : ""))
      .attr("style", "print-color-adjust: exact;"); // preserve background when printing

    const bg = $svg
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#fff");

    treemap = treemapLayout()
      .tile(treemapBinary)
      .size([width - 2 * postcardMargin, height - 120])
      .round(true)
      .paddingOuter(4);

    const root = hierarchy(data);
    treemap(root.sum(sumByCount));

    let cell = $svg
      .selectAll("g.cell")
      .data(root.leaves())
      .enter()
      .append("g")
      .attr("class", "cell")
      .attr("transform", function (d) {
        return (
          "translate(" +
          (d.x0 + postcardMargin) +
          "," +
          (d.y0 + postcardMargin) +
          ")"
        );
      });

    $svg
      .selectAll(".title-text")
      .data([resolveTitleText($textVis, $locationText)])
      .enter()
      .append("text")
      .attr("class", "title-text")
      .attr(
        "transform",
        "translate(" +
          width / 2 +
          "," +
          (height * TITLE_Y - postcardMargin) +
          ")",
      )
      .attr("text-anchor", "middle")
      .attr("font-family", FONT_SANS)
      .attr("font-weight", "400")
      .attr("font-size", TITLE_FONT_SIZE)
      .attr("fill", "#292929")
      .text(function (d) {
        return d;
      });
    fitTitleTextSelection($svg.selectAll(".title-text"));

    if ($showCoordinates && $mapCenter) {
      const coordText = coordinatesLineText($mapCenter);
      $svg
        .append("text")
        .attr("class", "coordinates-text")
        .attr(
          "transform",
          "translate(" +
            width / 2 +
            "," +
            (height * 0.93 - postcardMargin) +
            ")",
        )
        .attr("text-anchor", "middle")
        .attr("font-family", FONT_STACK_MONO)
        .attr("font-size", 13)
        .attr("fill", "#666666")
        .text(coordText);
    }

    let rect = cell
      .append("rect")
      .attr("id", function (d) {
        // return d.data.id;
      })
      .attr("width", function (d) {
        return d.x1 - d.x0;
      })
      .attr("height", function (d) {
        return d.y1 - d.y0;
      })
      .attr("fill", function (d) {
        return d.data.color; // color(d.parent.data.id);
      })
      .style("opacity", 0);

    rect.transition(t).style("opacity", 1);

    let titleFunc = (d) =>
      d.data.label +
      ": " +
      (d.data.size < 2 ? d.data.size.toFixed(1) : Math.round(d.data.size)) +
      "%";
    rect.append("title").text(titleFunc);

    let txt = cell
      .append("text")
      .attr("x", function (d) {
        return d.x1 - d.x0 - 5;
      })
      .attr("y", function (d) {
        return d.y1 - d.y0 - 10;
      })
      .attr("text-anchor", "end")
      .attr("font-family", FONT_STACK_MONO)
      .attr("font-size", 10)
      .text(function (d) {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        if (w < 26 || h < 26) return;
        return Math.round(d.data.size).toString() + "%";
      })
      .attr("fill", function (d) {
        return "#000000";
      })
      .style("cursor", "default")
      .style("opacity", 0);

    txt.transition(t).style("opacity", 1);

    txt.append("title").text(titleFunc);

    $svg
      .append("text")
      .attr(
        "transform",
        "translate(" +
          width / 2 +
          "," +
          (height * 0.95 - 0 * postcardMargin) +
          ")",
      )
      .attr("text-anchor", "middle")
      .attr("font-family", FONT_SANS_BOLD)
      .attr("font-size", 10)
      .attr("fill", "#2f2fa2")
      .text(appText.postcard.front.footer);

    const mapWidth = 60; // in viewBox units
    const mapHeight = 60;
    const map = $svg.append("g").attr("class", "mini-map");

    projection = geoMercator().fitSize([mapWidth, mapHeight], borders);
    const path = geoPath().projection(projection);

    map
      .selectAll("path")
      .data(borders.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("stroke", "#000000")
      .attr("fill", "none")
      .attr("stroke-width", 0.65)
      .attr("stroke-opacity", 1)
      .attr("vector-effect", "non-scaling-stroke");

    const radiusInDegrees = $circleRadius / 111320; // 1 degree ≈ 111,320 meters
    const centerNums = [Number($mapCenter[0]), Number($mapCenter[1])];
    const circle = geoCircle().center(centerNums).radius(radiusInDegrees);
    map
      .append("path")
      .datum(circle())
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "#000000")
      .attr("stroke-width", 1.15)
      .attr("stroke-opacity", 1)
      .attr("vector-effect", "non-scaling-stroke");

    // Park in bottom-right, inside postcard margin
    map.attr(
      "transform",
      `translate(${width - postcardMargin - mapWidth - 10},
                   ${height - postcardMargin - mapHeight - 10})`,
    );
  }

  function updateData(newData) {
    const root = hierarchy(newData);
    treemap(root.sum(sumByCount));

    const cells = $svg.selectAll("g").data(root.leaves());

    // Exit old elements not present in the new data
    cells.exit().transition().duration(1000).style("opacity", 0).remove();

    // Update existing elements
    cells
      .transition()
      .duration(1000)
      .attr("transform", function (d) {
        return "translate(" + d.x0 + "," + d.y0 + ")";
      });

    cells
      .select("rect")
      .transition()
      .duration(1000)
      .attr("width", function (d) {
        return d.x1 - d.x0;
      })
      .attr("height", function (d) {
        return d.y1 - d.y0;
      })
      .attr("fill", function (d) {
        return d.data.color;
      });

    // Enter new elements present in the new data
    const newCells = cells
      .enter()
      .append("g")
      .attr("transform", function (d) {
        return "translate(" + d.x0 + "," + d.y0 + ")";
      });

    newCells
      .append("rect")
      .attr("width", function (d) {
        return d.x1 - d.x0;
      })
      .attr("height", function (d) {
        return d.y1 - d.y0;
      })
      .attr("fill", function (d) {
        return d.data.color;
      })
      .style("opacity", 0)
      .transition()
      .duration(1000)
      .style("opacity", 1);
  }
</script>

<div
  class={$isMobile
    ? "relative mx-[1.5rem] pt-[2rem] text-center sm:mx-[2rem]"
    : "postcard-desktop border drop-shadow-xl"}
  style={$screenWidth <= 500
    ? $isMobile
      ? `transform-origin: top left; transform:scale(${($screenWidth - mobileHorizontalInsetPx) / 444}); height: ${(630 * ($screenWidth - 0)) / 444}px;`
      : `transform-origin: top center; top: calc(50% - 3rem); transform: translateY(-50%) scale(${($screenWidth - mobileHorizontalInsetPx) / 444}); height: ${(630 * ($screenWidth - 0)) / 444}px;`
    : ""}
>
  <main class="w-full text-center" bind:this={visWrapper} />
</div>

<style>
  :global(svg.postcard) {
    width: 444px;
    height: 630px;
  }

  /* Out of document flow: do not use `relative` here or the tall SVG steals flex space from the map */
  .postcard-desktop {
    position: absolute;
    right: 3rem;
    /* Slightly above center — frees space for map overlays / legend */
    top: calc(50% - 3rem);
    transform: translateY(-50%);
    pointer-events: auto;
    z-index: 25;
  }
</style>
