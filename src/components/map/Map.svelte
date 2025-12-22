<script>
  import "maplibre-gl/dist/maplibre-gl.css";
  import maplibregl from "maplibre-gl";
  import { onMount } from "svelte";
  import mapStyle from "./mapStyle.js";
  import MapKey from "./MapKey.svelte";

  import drawCanvasCircle from "$assets/scripts/drawCanvasCircle";
  import drawCanvasPolygon from "$assets/scripts/drawCanvasPolygon";
  import getMaxCircleRadius from "$assets/scripts/getMaxCircleRadius";
  import getLanduseSizes from "$assets/scripts/getLanduseSizes";
  import getCircleGeom from "$assets/scripts/getCircleGeom";
  import checkCirleFits from "$assets/scripts/checkCirleFits";
  import bbox from "@turf/bbox";
  import {
    landuses,
    mapBounds,
    initialMapCenter,
    mapMaxZoom,
    mapMinZoom,
    analysisRadiusInMeters
  } from "$lib/settings.js";

  import {
    areaSizes,
    circleRadius,
    dimensions,
    totalSize,
    mapCenter,
    showBasemap,
    locationText,
    useLocationAsText,
    textVis,
    newBounds,
    isMobile,
    lang,
    selectedWahlkreis,
    selectedWohnviertel,
    analysisMode
  } from "$lib/stores.js";

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


  let map;

  function setShowBasemap(show) {
    if (!map) return;

    map.setLayoutProperty("osm", "visibility", !show ? "none" : "visible");
  }

  function setBounds(b) {
    if (!b || !map) return;
    map.setCenter(b);
  }

  function setScrollZoom(mobile) {
    if (!map) return;
    if (mobile) {
      map.scrollZoom.disable();
    } else {
      map.scrollZoom.enable();
    }
  }

  $: setShowBasemap($showBasemap);

  $: drawAndCount(map, $useLocationAsText);

  $: setBounds($newBounds);

  $: setScrollZoom($isMobile);

  // React to area selection changes - fit map bounds
  let lastAreaId = null;
  let lastAreaType = null;
  
  $: if (($selectedWahlkreis && $analysisMode === "wahlkreis") || 
         ($selectedWohnviertel && $analysisMode === "wohnviertel")) {
    if (map && map.loaded()) {
      let currentId, currentType, selectedFeature;
      
      if ($analysisMode === "wahlkreis" && $selectedWahlkreis) {
        currentId = $selectedWahlkreis.properties.objid;
        currentType = "wahlkreis";
        selectedFeature = $selectedWahlkreis;
      } else if ($analysisMode === "wohnviertel" && $selectedWohnviertel) {
        currentId = $selectedWohnviertel.properties.wov_id;
        currentType = "wohnviertel";
        selectedFeature = $selectedWohnviertel;
      }
      
      if (currentId && (lastAreaId !== currentId || lastAreaType !== currentType)) {
        lastAreaId = currentId;
        lastAreaType = currentType;
        const bounds = bbox(selectedFeature);
        map.fitBounds(
          [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
          { padding: 50, duration: 1000 }
        );
        // Trigger redraw after fitBounds completes
        setTimeout(() => {
          if (map && map.getLayer("landuse")) {
            drawAndCount(map);
          }
        }, 1100);
      }
    }
  }
  
  // Reset when switching back to circle mode
  $: if ($analysisMode === "circle") {
    lastAreaId = null;
    lastAreaType = null;
  }

  // Remove hash (coordinates) from URL when in wahlkreis/wohnviertel modes
  $: if (map && ($analysisMode === "wahlkreis" || $analysisMode === "wohnviertel")) {
    if (window.location.hash) {
      const url = new URL(window.location.href);
      url.hash = "";
      window.history.replaceState({}, "", url.toString());
    }
  }

  $circleRadius = analysisRadiusInMeters;

  const drawAndCount = function (map) {
    if (!map || !map.getLayer("landuse")) return;
    
    const canvas = document.getElementById("myCanvas");
    let polygonGeom;
    let usePolygon = false;
    let selectedFeature = null;

    if ($analysisMode === "wahlkreis" && $selectedWahlkreis) {
      // Use the selected Wahlkreis polygon
      usePolygon = true;
      selectedFeature = $selectedWahlkreis;
      polygonGeom = $selectedWahlkreis.geometry;
      const center = bbox($selectedWahlkreis);
      const centerLon = (center[0] + center[2]) / 2;
      const centerLat = (center[1] + center[3]) / 2;
      $mapCenter = [centerLon.toFixed(3), centerLat.toFixed(3)];
      $locationText = $selectedWahlkreis.properties.wahlkreis;
      if ($useLocationAsText) {
        $textVis = $locationText;
      }
    } else if ($analysisMode === "wohnviertel" && $selectedWohnviertel) {
      // Use the selected Wohnviertel polygon
      usePolygon = true;
      selectedFeature = $selectedWohnviertel;
      polygonGeom = $selectedWohnviertel.geometry;
      const center = bbox($selectedWohnviertel);
      const centerLon = (center[0] + center[2]) / 2;
      const centerLat = (center[1] + center[3]) / 2;
      $mapCenter = [centerLon.toFixed(3), centerLat.toFixed(3)];
      $locationText = $selectedWohnviertel.properties.wov_name;
      if ($useLocationAsText) {
        $textVis = $locationText;
      }
    } else {
      // Use circle
      const mC = map.getCenter().toArray();
      $mapCenter = [mC[0].toFixed(3), mC[1].toFixed(3)];

      polygonGeom = getCircleGeom(map, {
        radius: $circleRadius,
        steps: 16,
      });

      let circleFits = checkCirleFits(map, polygonGeom);
      if (!circleFits) {
        const { width, height } = map.getContainer().getBoundingClientRect();
        const ctx = canvas.getContext("2d");
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      $locationText = "Lat " + $mapCenter[1] + " N, Lng " + $mapCenter[0] + " E";
      if ($useLocationAsText) {
        $textVis = $locationText;
      }
    }

    const { sizes, sumSizes } = getLanduseSizes(map, polygonGeom, landuses);
    $areaSizes = sizes;
    $totalSize = sumSizes;

    // Draw the appropriate shape
    if (usePolygon) {
      drawCanvasPolygon(map, canvas, polygonGeom);
    } else {
      drawCanvasCircle(map, canvas, $circleRadius);
    }
  };

  onMount(() => {
    // Disable hash if starting in wahlkreis/wohnviertel mode
    const enableHash = $analysisMode === "circle";
    
    map = new maplibregl.Map({
      container: "map", // container id
      style: mapStyle(window.location.origin + window.location.pathname),
      maxBounds: mapBounds,
      dragRotate: false,
      attributionControl: false,
      hash: enableHash, // Only enable hash in circle mode
      minZoom: mapMinZoom,
      maxZoom: mapMaxZoom,
      center: initialMapCenter,
      zoom: 13,
    });
    
    // Remove hash if in wahlkreis/wohnviertel mode on mount
    if ($analysisMode === "wahlkreis" || $analysisMode === "wohnviertel") {
      if (window.location.hash) {
        const url = new URL(window.location.href);
        url.hash = "";
        window.history.replaceState({}, "", url.toString());
      }
    }

    map.on("load", function () {
      drawAndCount(map);

      map.on("moveend", function (e) {
        const canvas = document.getElementById("myCanvas");
        if ($analysisMode === "wahlkreis" && $selectedWahlkreis) {
          drawCanvasPolygon(map, canvas, $selectedWahlkreis.geometry);
        } else if ($analysisMode === "wohnviertel" && $selectedWohnviertel) {
          drawCanvasPolygon(map, canvas, $selectedWohnviertel.geometry);
        } else {
          drawCanvasCircle(map, canvas, $circleRadius);
        }
        // Remove hash if in wahlkreis/wohnviertel mode
        if ($analysisMode === "wahlkreis" || $analysisMode === "wohnviertel") {
          if (window.location.hash) {
            const url = new URL(window.location.href);
            url.hash = "";
            window.history.replaceState({}, "", url.toString());
          }
        }
        setTimeout(() => {
          drawAndCount(map);
        }, 100);
      });

      map.on("zoomend", function (e) {
        const canvas = document.getElementById("myCanvas");
        if ($analysisMode === "wahlkreis" && $selectedWahlkreis) {
          drawCanvasPolygon(map, canvas, $selectedWahlkreis.geometry);
        } else if ($analysisMode === "wohnviertel" && $selectedWohnviertel) {
          drawCanvasPolygon(map, canvas, $selectedWohnviertel.geometry);
        } else {
          drawCanvasCircle(map, canvas, $circleRadius);
        }
        // Remove hash if in wahlkreis/wohnviertel mode
        if ($analysisMode === "wahlkreis" || $analysisMode === "wohnviertel") {
          if (window.location.hash) {
            const url = new URL(window.location.href);
            url.hash = "";
            window.history.replaceState({}, "", url.toString());
          }
        }
        setTimeout(() => {
          drawAndCount(map);
        }, 100);
      });
    });
  });
</script>

<div id="map" class="w-full h-1/2 lg:h-screen !absolute left-0 z-0">
  <canvas id="myCanvas" class="absolute" />
</div>

<div class="relative w-full h-full pointer-events-none">
  {#if !$isMobile}
    <MapKey />
  {/if}
  <button
    class="btn btn-primary drop-shadow-xl text-2xl btn-circle absolute left-4 top-4  leading-7 z-40 pointer-events-auto "
    on:click={() => map.zoomIn()}
    on:keypress={() => map.zoomIn()}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="26"
      height="26"
      fill="currentColor"
      class="bi bi-plus"
      viewBox="0 0 16 16"
    >
      <path
        d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"
      />
    </svg>
  </button>
  <button
    class="btn btn-primary drop-shadow-xl text-2xl btn-circle absolute left-4 top-10 mt-8   leading-7 z-40 pointer-events-auto"
    on:click={() => map.zoomOut()}
    on:keypress={() => map.zoomOut()}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="26"
      height="26"
      fill="currentColor"
      class="bi bi-dash"
      viewBox="0 0 16 16"
    >
      <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z" />
    </svg>
  </button>

  {#if $analysisMode === "circle"}
    <div class="absolute right-2 bottom-8 z-50 text-md">
      {appText.map.radius}: {$circleRadius}m
    </div>
  {:else if $selectedWahlkreis}
    <div class="absolute right-2 bottom-8 z-50 text-md">
      {$selectedWahlkreis.properties.wahlkreis}
    </div>
  {:else if $selectedWohnviertel}
    <div class="absolute right-2 bottom-8 z-50 text-md">
      {$selectedWohnviertel.properties.wov_name}
    </div>
  {/if}
  <div
    class="absolute right-0 bottom-12 z-50 form-control w-fit pointer-events-auto"
  >
    <label class="cursor-pointer label">
      <span class="mx-2 text-md">{appText.map.basemap}</span>
      <input
        type="checkbox"
        bind:checked={$showBasemap}
        class="toggle toggle-primary"
      />
    </label>
  </div>
</div>

<style>
  #myCanvas {
    z-index: 10;
    pointer-events: none;
  }
</style>
