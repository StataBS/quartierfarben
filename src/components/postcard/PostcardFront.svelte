<!-- NOTES
https://bl.ocks.org/mbostock/4063582
https://medium.com/codex/getting-started-with-svelte-and-d3-js-ea915d2c2c2c
https://github.com/d3/d3-hierarchy
https://observablehq.com/@d3/treemap
 -->
<script>
  import { hierarchy, treemap as treemapLayout, treemapBinary } from "d3-hierarchy";
  import { select } from "d3-selection";
  import { transition } from "d3-transition";
  import { geoMercator, geoPath, geoCircle } from "d3-geo";
  import chroma from "chroma-js";
  import {
    areaSizes,
    dimensions,
    svg,
    textVis,
    lang,
    isMobile,
    screenWidth,
    mapCenter,
    circleRadius,
    showCoordinates,
  } from "$lib/stores.js";
  import {
    categories,
    labelContrast,
    postcardMargin
  } from "$lib/settings.js";

  import { onMount, tick } from "svelte";

  import geojson from "$lib/borders.js";

  /** Match DDS body / postcard export readability */
  const FONT_SANS = 'Inter, "Inter Fallback", system-ui, sans-serif';
  const FONT_SANS_BOLD = 'Inter, "Inter Fallback", system-ui, sans-serif';

  /** Title line (viewBox y); higher = more room for coords + mini-map below */
  const TITLE_Y = 0.855;

  let projection;
  let borders = geojson();

  import en from "$locales/en.json";
  import de from "$locales/de.json";

  let appText = {};
  $: {
    if ($lang === 'en') {
      appText = en;
    } else {
      appText = de;
    }
  }

  let titleInput;   // bind to the <input/>
  let wrapper;      // bind to the container div

  /** Horizontal inset for scale math — matches mx-[1.5rem] / sm:mx-[2rem] (DDS maps px-8 to 8px!) */
  $: mobileHorizontalInsetPx = $screenWidth >= 640 ? 64 : 48;

  function placeInputAtTitle() {
    if (!$svg || !titleInput || !wrapper) return;

    /* Must match .title-text y */
    const topPct = ((height * TITLE_Y - postcardMargin) / height) * 100;
    
    // Get the actual wrapper dimensions to account for scaling
    const wrapperRect = wrapper.getBoundingClientRect();
    const wrapperWidth = wrapperRect.width;
    const postcardWidthPx = width - 2 * postcardMargin;
    
    // Calculate width as percentage of wrapper, but based on postcard dimensions
    // This ensures the input width matches the postcard width regardless of scaling
    const widthPct = (postcardWidthPx / wrapperWidth) * 100;

    Object.assign(titleInput.style, {
      position: "absolute",
      left: "50%",
      top: `${topPct}%`,
      width: `${widthPct}%`,
      transform: "translate(-50%, -50%)",
      transformOrigin: "top left",
      fontSize: "30px",         // let the wrapper's scale handle visual size
      textAlign: "center",
      zIndex: 10
    });
  }

  // run after draw, and on resize
  onMount(() => {
    const ro = new ResizeObserver(() => {
      tick().then(placeInputAtTitle);
    });
    ro.observe(wrapper);
    window.addEventListener("resize", placeInputAtTitle);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", placeInputAtTitle);
    };
  });

  $: if ($svg && titleInput && wrapper) {
    tick().then(placeInputAtTitle);
  }

  let treemap;
  function sumByCount(d) {
    return d.size;
  }
  const width = 148 * 3, // $dimensions[0],
    height = 210 * 3; // $dimensions[1];

  let visWrapper;

  function dataUpdated(size) {
    if (!size) return;
    const treeChildren = [];
    Object.keys(categories).forEach((keyCategories) => {
      const child = {};
      child.name = categories[keyCategories].name;
      child.children = [];

      if (!size[keyCategories]) {
        return;
      }
      // ignore small parts
      if (Math.round(size[keyCategories].p) < 1) {
        return;
      }

      child.children.push({
        category: keyCategories,
        label: categories[keyCategories][$lang == "de" ? "name" : "name_en"],
        size: size[keyCategories]?.p || 0,
        color: categories[keyCategories].color,
      });

      treeChildren.push(child);
    });

    const data = {
      children: treeChildren,
    };
    redraw(data);
  }

  $: dataUpdated($areaSizes);
  $: updateText($textVis);
  $: if ($svg) {
    $svg.selectAll(".coordinates-text").remove();
    if ($showCoordinates && $mapCenter) {
      const coordText = "Lat " + $mapCenter[1] + " N, Lng " + $mapCenter[0] + " E";
      $svg
        .append("text")
        .attr("class", "coordinates-text")
        .attr("transform", "translate(" + width / 2 + "," + (height * 0.93 - postcardMargin) + ")")
        .attr("text-anchor", "middle")
        .attr("font-family", FONT_SANS)
        .attr("font-size", 14)
        .attr("fill", "#666666")
        .text(coordText);
    }
  }

  function updateText(newText) {
    if (!$svg) {
      return;
    }

    $svg
      .selectAll(".title-text")
      .data([newText])
      .text(function (d) {
        return d;
      });
    
    // Update coordinates text
    $svg.selectAll(".coordinates-text").remove();
    if ($showCoordinates && $mapCenter) {
      const coordText = "Lat " + $mapCenter[1] + " N, Lng " + $mapCenter[0] + " E";
      $svg
        .append("text")
        .attr("class", "coordinates-text")
        .attr("transform", "translate(" + width / 2 + "," + (height * 0.93 - postcardMargin) + ")")
        .attr("text-anchor", "middle")
        .attr("font-family", FONT_SANS)
        .attr("font-size", 14)
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

    const bg = $svg.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#fff");

    treemap = treemapLayout()
      .tile(treemapBinary)
      .size([width - 2 * postcardMargin, height - 120])
      .round(true)
      .paddingOuter(4)
    ;

    const root = hierarchy(data);
    treemap(root.sum(sumByCount));

    let cell = $svg
      .selectAll("g.cell")
      .data(root.leaves())
      .enter()
      .append("g").attr("class","cell")
      .attr("transform", function (d) {
        return "translate(" + (d.x0 + postcardMargin) + "," + (d.y0 + postcardMargin) + ")";
      });

    $svg
      .selectAll(".title-text")
      .data([$textVis])
      .enter()
      .append("text")
      .attr("class", "title-text")
      .attr("transform", "translate(" + width / 2 + "," + (height * TITLE_Y - postcardMargin) + ")")
      .attr("text-anchor", "middle")
      .attr("font-family", FONT_SANS_BOLD)
      .attr("font-weight", "700")
      .attr("font-size", 30)
      .attr("fill", "#292929")
      .text(function (d) {
        return d;
      })
      /* HTML input shows the title; keep SVG text for export/print only */
      .attr("opacity", 0);

    if ($showCoordinates && $mapCenter) {
      const coordText = "Lat " + $mapCenter[1] + " N, Lng " + $mapCenter[0] + " E";
      $svg
        .append("text")
        .attr("class", "coordinates-text")
        .attr("transform", "translate(" + width / 2 + "," + (height * 0.93 - postcardMargin) + ")")
        .attr("text-anchor", "middle")
        .attr("font-family", FONT_SANS)
        .attr("font-size", 14)
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
      
    rect.transition(t)
      .style("opacity", 1);
    
    let titleFunc = d => d.data.label + ": " + (d.data.size < 2 ? d.data.size.toFixed(1) : Math.round(d.data.size)) + "%";
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
      .attr("font-family", FONT_SANS)
      .attr("font-size", 12)
      .text(function (d) {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        if (w < 30 || h < 30) return;
        return Math.round(d.data.size).toString() + "%";
      })
      .attr("fill", function (d) {
        if (d.data.color) {
          let c = chroma(d.data.color);
          if (c.luminance() < 0.2) {
            return c.brighten(labelContrast).hex();
          } else {
            return c.darken(labelContrast).hex();
          }
        }
      })
      .style("cursor", "default")
      .style("opacity", 0)

    txt  
      .transition(t)
      .style("opacity", 1);

    txt.append("title").text(titleFunc);

    $svg
      .append("text")
      .attr("transform", "translate(" + width / 2 + "," + (height * 0.95 - 0*postcardMargin) + ")")
      .attr("text-anchor", "middle")
      .attr("font-family", FONT_SANS_BOLD)
      .attr("font-size", 10)
      .attr("fill", "#2f2fa2")
      .text(appText.postcard.front.footer);

      const mapWidth  = 60;   // in viewBox units
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
        .attr("stroke", "#292929")
        .attr("fill", "none")
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.3).attr("vector-effect", "non-scaling-stroke");


      const radiusInDegrees = $circleRadius / 111320; // 1 degree ≈ 111,320 meters
      const circle = geoCircle().center($mapCenter).radius(radiusInDegrees);
      map
        .append("path")
        .datum(circle())
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "#2f2fa2")
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.8)
        .attr("vector-effect", "non-scaling-stroke");

      // Park in bottom-right, inside postcard margin
      map.attr(
        "transform",
        `translate(${width - postcardMargin - mapWidth - 10},
                   ${height - postcardMargin - mapHeight - 10})`
      );
      placeInputAtTitle();
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

<style>
  /* Overlay: calm Inter bold until focus; DDS-like field on focus (see form-elements/input) */
  .postcard-title-input {
    box-sizing: border-box;
    width: 100%;
    padding: 0.375rem 0.625rem;
    text-align: center;
    font-family: Inter, "Inter Fallback", system-ui, sans-serif;
    font-weight: 700;
    font-synthesis: none;
    color: #292929;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 0.25rem;
    -webkit-font-smoothing: antialiased;
    transition:
      border-color 0.25s ease-in-out,
      box-shadow 0.25s ease-in-out,
      background-color 0.25s ease-in-out;
  }

  .postcard-title-input::placeholder {
    @apply text-gray-500;
  }

  .postcard-title-input:focus {
    outline: none;
    @apply border border-purple-600 bg-white;
    box-shadow: 0 0 0 1px theme("colors.purple.600");
  }

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

<div
  bind:this={wrapper}
  class={$isMobile ? "relative mx-[1.5rem] pt-[2rem] text-center sm:mx-[2rem]"
                   : "postcard-desktop border drop-shadow-xl"}
  style={$screenWidth <= 500
    ? $isMobile
      ? `transform-origin: top left; transform:scale(${($screenWidth - mobileHorizontalInsetPx) / 444}); height: ${(630 * ($screenWidth - 0)) / 444}px;`
      : `transform-origin: top center; top: calc(50% - 3rem); transform: translateY(-50%) scale(${($screenWidth - mobileHorizontalInsetPx) / 444}); height: ${(630 * ($screenWidth - 0)) / 444}px;`
    : ""}
>
  <main class="w-full text-center" bind:this={visWrapper} />
  <input
    bind:this={titleInput}
    type="text"
    bind:value={$textVis}
    placeholder={appText.postcard.front.title}
    class="postcard-title-input"
  />
</div>
