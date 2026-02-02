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
  import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
  import {
    getAreaModeConfig,
    locationLabelPolygonModeId,
    CIRCLE_MODE_ID
  } from "$lib/cityConfig.js";
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
    selectedAreaFeature,
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
  
  $: if ($selectedAreaFeature && $analysisMode !== CIRCLE_MODE_ID) {
    if (map && map.loaded()) {
      const modeConfig = getAreaModeConfig($analysisMode);
      const currentId = modeConfig && $selectedAreaFeature.properties[modeConfig.idProperty];
      if (currentId && (lastAreaId !== currentId || lastAreaType !== $analysisMode)) {
        lastAreaId = currentId;
        lastAreaType = $analysisMode;
        const bounds = bbox($selectedAreaFeature);
        map.fitBounds(
          [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
          { padding: 50, duration: 1000 }
        );
        setTimeout(() => {
          if (map && map.getLayer("landuse")) {
            drawAndCount(map);
          }
        }, 1100);
      }
    }
  }

  $: if ($analysisMode === CIRCLE_MODE_ID) {
    lastAreaId = null;
    lastAreaType = null;
  }

  $: if (map && $analysisMode !== CIRCLE_MODE_ID) {
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

    const modeConfig = getAreaModeConfig($analysisMode);
    if (modeConfig && modeConfig.data && $selectedAreaFeature) {
      usePolygon = true;
      selectedFeature = $selectedAreaFeature;
      polygonGeom = $selectedAreaFeature.geometry;
      const center = bbox($selectedAreaFeature);
      const centerLon = (center[0] + center[2]) / 2;
      const centerLat = (center[1] + center[3]) / 2;
      $mapCenter = [centerLon.toFixed(3), centerLat.toFixed(3)];
      $locationText = $selectedAreaFeature.properties[modeConfig.nameProperty];
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

      // Optionally resolve location name from a polygon layer (e.g. wohnviertel)
      const labelModeConfig = locationLabelPolygonModeId && getAreaModeConfig(locationLabelPolygonModeId);
      let foundFeature = null;
      if (labelModeConfig?.data?.features) {
        const centerPoint = {
          type: "Feature",
          geometry: { type: "Point", coordinates: mC }
        };
        for (const feature of labelModeConfig.data.features) {
          if (booleanPointInPolygon(centerPoint, feature)) {
            foundFeature = feature;
            break;
          }
        }
      }
      if (foundFeature) {
        $locationText = foundFeature.properties[labelModeConfig.nameProperty];
      } else {
        $locationText = "Lat " + $mapCenter[1] + " N, Lng " + $mapCenter[0] + " E";
      }
      
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
    const enableHash = $analysisMode === CIRCLE_MODE_ID;
    
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
    
    if ($analysisMode !== CIRCLE_MODE_ID) {
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
        if ($selectedAreaFeature) {
          drawCanvasPolygon(map, canvas, $selectedAreaFeature.geometry);
        } else {
          drawCanvasCircle(map, canvas, $circleRadius);
        }
        if ($analysisMode !== CIRCLE_MODE_ID && window.location.hash) {
          const url = new URL(window.location.href);
          url.hash = "";
          window.history.replaceState({}, "", url.toString());
        }
        setTimeout(() => drawAndCount(map), 100);
      });

      map.on("zoomend", function (e) {
        const canvas = document.getElementById("myCanvas");
        if ($selectedAreaFeature) {
          drawCanvasPolygon(map, canvas, $selectedAreaFeature.geometry);
        } else {
          drawCanvasCircle(map, canvas, $circleRadius);
        }
        if ($analysisMode !== CIRCLE_MODE_ID && window.location.hash) {
          const url = new URL(window.location.href);
          url.hash = "";
          window.history.replaceState({}, "", url.toString());
        }
        setTimeout(() => drawAndCount(map), 100);
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

  {#if $analysisMode === CIRCLE_MODE_ID}
    <div class="absolute right-2 bottom-8 z-50 text-md">
      {appText.map.radius}: {$circleRadius}m
    </div>
  {:else if $selectedAreaFeature}
    {@const modeConfig = getAreaModeConfig($analysisMode)}
    {#if modeConfig}
      <div class="absolute right-2 bottom-8 z-50 text-md">
        {$selectedAreaFeature.properties[modeConfig.nameProperty]}
      </div>
    {/if}
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
