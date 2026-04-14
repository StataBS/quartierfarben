<script>
  import "maplibre-gl/dist/maplibre-gl.css";
  import maplibregl from "maplibre-gl";
  import { onMount, tick } from "svelte";
  import { get } from "svelte/store";
  import mapStyle from "./mapStyle.js";
  import MapKey from "./MapKey.svelte";
  import BasemapDropdown from "./BasemapDropdown.svelte";
  import { BASEMAP_LAYER_IDS, basemapAttribution } from "$lib/basemapTiles.js";

  import drawCanvasCircle from "$assets/scripts/drawCanvasCircle";
  import getLanduseSizes from "$assets/scripts/getLanduseSizes";
  import getCircleGeom from "$assets/scripts/getCircleGeom";
  import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
  import baselBorders from "$lib/borders.js";
  import { circleLocationNeighbourhood } from "$lib/cityConfig.js";
  import {
    landuses,
    mapBounds,
    sidebarWidthLgPx,
    initialMapCenter,
    initialMapZoom,
    mapMaxZoom,
    mapMinZoom,
    analysisRadiusInMeters
  } from "$lib/settings.js";
  import {
    getViewportCenterLngLat
  } from "$lib/geo/viewportAnalysisCenter.js";
  import {
    parseAnalysisHash,
    formatAnalysisHash
  } from "$lib/geo/analysisUrlHash.js";

  import {
    areaSizes,
    circleRadius,
    dimensions,
    totalSize,
    mapCenter,
    basemapId,
    locationText,
    newBounds,
    isMobile,
    lang,
    analysisMap,
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
  let mapShell;
  const baselBoundary = baselBorders();
  /** Hide map until camera/hash sync is ready (avoids flash before layout is stable). */
  let showMapCanvas = false;

  const basemapLayerIdsList = Object.values(BASEMAP_LAYER_IDS);

  function isPointInFeatureCollection(pointFeature, featureCollection) {
    if (!featureCollection?.features?.length) return false;
    return featureCollection.features.some((feature) =>
      booleanPointInPolygon(pointFeature, feature)
    );
  }

  function getFeatureCoordinates(feature) {
    const geometry = feature?.geometry;
    if (!geometry) return [];

    const rings =
      geometry.type === "Polygon"
        ? geometry.coordinates
        : geometry.type === "MultiPolygon"
          ? geometry.coordinates.flat()
          : [];
    return rings.flat();
  }

  function getNearestFeatureByDistance(pointCoords, features) {
    let nearest = null;
    let minDistanceSq = Number.POSITIVE_INFINITY;

    for (const feature of features) {
      const featureCoords = getFeatureCoordinates(feature);
      for (const [lng, lat] of featureCoords) {
        const dx = pointCoords[0] - lng;
        const dy = pointCoords[1] - lat;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < minDistanceSq) {
          minDistanceSq = distanceSq;
          nearest = feature;
        }
      }
    }
    return nearest;
  }

  function getNearestCoordinateByDistance(pointCoords, coordinates) {
    let nearest = null;
    let minDistanceSq = Number.POSITIVE_INFINITY;

    for (const [lng, lat] of coordinates) {
      const dx = pointCoords[0] - lng;
      const dy = pointCoords[1] - lat;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        nearest = [lng, lat];
      }
    }
    return nearest;
  }

  function clampAnalysisPointToBasel(pointCoords) {
    const centerPoint = {
      type: "Feature",
      geometry: { type: "Point", coordinates: pointCoords }
    };
    if (isPointInFeatureCollection(centerPoint, baselBoundary)) {
      return pointCoords;
    }

    const nearestFeature = getNearestFeatureByDistance(pointCoords, baselBoundary.features);
    const nearestCoord = nearestFeature
      ? getNearestCoordinateByDistance(pointCoords, getFeatureCoordinates(nearestFeature))
      : null;
    return nearestCoord ?? initialMapCenter;
  }

  function isSamePoint(a, b, epsilon = 1e-9) {
    return Math.abs(a[0] - b[0]) < epsilon && Math.abs(a[1] - b[1]) < epsilon;
  }

  /** @param {string} id */
  function basemapStoreIdToLayerId(id) {
    if (id === "none") return null;
    return BASEMAP_LAYER_IDS[id] ?? null;
  }

  /** @param {string} id */
  function applyBasemapVisibility(id) {
    if (!map?.getStyle()) return;
    const active = basemapStoreIdToLayerId(id);
    for (const lid of basemapLayerIdsList) {
      map.setLayoutProperty(lid, "visibility", active === lid ? "visible" : "none");
    }
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

  function getClampedZoom(zoom) {
    return Math.min(mapMaxZoom, Math.max(mapMinZoom, zoom));
  }

  function jumpToClampedAnalysisView(nextView = {}) {
    if (!map) return;
    const center = nextView.center ?? getViewportCenterLngLat(map);
    const zoom = nextView.zoom ?? map.getZoom();
    map.jumpTo({
      center: clampAnalysisPointToBasel(center),
      zoom: getClampedZoom(zoom),
      duration: 0,
    });
  }

  function keepAnalysisPointInsideBasel() {
    if (!map) return false;
    const currentAnalysisPoint = getViewportCenterLngLat(map);
    const clampedAnalysisPoint = clampAnalysisPointToBasel(currentAnalysisPoint);
    if (isSamePoint(currentAnalysisPoint, clampedAnalysisPoint)) return false;
    map.jumpTo({ center: clampedAnalysisPoint, zoom: getClampedZoom(map.getZoom()), duration: 0 });
    return true;
  }

  function zoomInWithinBasel() {
    if (!map) return;
    const currentAnalysisPoint = getViewportCenterLngLat(map);
    const clampedAnalysisPoint = clampAnalysisPointToBasel(currentAnalysisPoint);
    if (!isSamePoint(currentAnalysisPoint, clampedAnalysisPoint)) {
      map.jumpTo({ center: clampedAnalysisPoint, zoom: getClampedZoom(map.getZoom()), duration: 0 });
    }
    map.zoomIn({ around: clampedAnalysisPoint, duration: 200 });
  }

  function zoomOutWithinBasel() {
    if (!map) return;
    const currentAnalysisPoint = getViewportCenterLngLat(map);
    const clampedAnalysisPoint = clampAnalysisPointToBasel(currentAnalysisPoint);
    if (!isSamePoint(currentAnalysisPoint, clampedAnalysisPoint)) {
      map.jumpTo({ center: clampedAnalysisPoint, zoom: getClampedZoom(map.getZoom()), duration: 0 });
    }
    map.zoomOut({ around: clampedAnalysisPoint, duration: 200 });
  }

  $: applyBasemapVisibility($basemapId);

  $: drawAndCount(map);

  $: setBounds($newBounds);

  $: setScrollZoom($isMobile);

  $circleRadius = analysisRadiusInMeters;

  const drawAndCount = function (map) {
    if (!map || !map.getLayer("landuse")) return;

    const canvas = document.getElementById("myCanvas");

    const mC = getViewportCenterLngLat(map);
    $mapCenter = [mC[0].toFixed(5), mC[1].toFixed(5)];

    const polygonGeom = getCircleGeom(map, {
      radius: $circleRadius,
      steps: 16,
      center: mC,
    });

    const labelCfg = circleLocationNeighbourhood?.data?.features?.length
      ? circleLocationNeighbourhood
      : null;
    let foundFeature = null;
    if (labelCfg) {
      const centerPoint = {
        type: "Feature",
        geometry: { type: "Point", coordinates: mC }
      };
      for (const feature of labelCfg.data.features) {
        if (booleanPointInPolygon(centerPoint, feature)) {
          foundFeature = feature;
          break;
        }
      }

      if (!foundFeature && isPointInFeatureCollection(centerPoint, baselBoundary)) {
        foundFeature = getNearestFeatureByDistance(mC, labelCfg.data.features);
      }
    }
    if (foundFeature) {
      $locationText = foundFeature.properties[labelCfg.nameProperty];
    } else {
      $locationText = "";
    }

    const { sizes, sumSizes } = getLanduseSizes(map, polygonGeom, landuses);
    $areaSizes = sizes;
    $totalSize = sumSizes;

    drawCanvasCircle(map, canvas, $circleRadius);
  };

  onMount(() => {
    map = new maplibregl.Map({
      container: "map", // container id
      style: mapStyle(window.location.origin + window.location.pathname),
      maxBounds: mapBounds,
      dragRotate: false,
      attributionControl: false,
      /* Built-in hash tracks map.getCenter(); we sync #zoom/lat/lng to the analysis focal (not always getCenter()). */
      hash: false,
      minZoom: mapMinZoom,
      maxZoom: mapMaxZoom,
      center: initialMapCenter,
      zoom: initialMapZoom,
      /** Allow reading pixels from the WebGL canvas for postcard “map disk” snapshots */
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    analysisMap.set(map);

    function resizeMap() {
      if (map) map.resize();
    }

    /** Until false, do not write #hash (camera/layout not ready yet). */
    let blockAnalysisHashSync = true;

    /** Debounce heavy land-use aggregation + hash sync after pan/zoom/resize. */
    let landuseRecomputeTimer;
    function scheduleLanduseRecompute(delay) {
      clearTimeout(landuseRecomputeTimer);
      landuseRecomputeTimer = setTimeout(() => {
        if (map?.loaded()) {
          drawAndCount(map);
          syncAnalysisUrlFromMap();
        }
      }, delay);
    }

    function syncAnalysisUrlFromMap() {
      if (blockAnalysisHashSync) return;
      if (!map?.loaded()) return;
      const next = formatAnalysisHash(map);
      if (window.location.hash !== next) {
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search + next
        );
      }
    }

    resizeMap();
    requestAnimationFrame(resizeMap);

    function onWindowResize() {
      resizeMap();
      scheduleLanduseRecompute(200);
    }
    window.addEventListener("resize", onWindowResize);

    function onHashChange() {
      if (!map?.loaded()) return;
      const parsed = parseAnalysisHash(window.location.hash);
      if (!parsed) return;
      blockAnalysisHashSync = false;
      jumpToClampedAnalysisView({ zoom: parsed.zoom, center: [parsed.lng, parsed.lat] });
      requestAnimationFrame(() => {
        resizeMap();
        drawAndCount(map);
        syncAnalysisUrlFromMap();
      });
    }
    window.addEventListener("hashchange", onHashChange);

    let resizeObserver;
    tick().then(() => {
      if (typeof ResizeObserver !== "undefined" && mapShell) {
        resizeObserver = new ResizeObserver(() => resizeMap());
        resizeObserver.observe(mapShell);
      }
    });

    map.on("load", function () {
      resizeMap();
      applyBasemapVisibility(get(basemapId));

      /** After tiles settle — registered after first circle draw to avoid a premature wrong hash. */
      function scheduleIdleLanduseRedraw() {
        map.once("idle", () => {
          requestAnimationFrame(() => {
            resizeMap();
            drawAndCount(map);
            syncAnalysisUrlFromMap();
          });
        });
      }

      function finishCircleViewportAlign() {
        const parsed = parseAnalysisHash(window.location.hash);
        if (parsed) {
          jumpToClampedAnalysisView({ zoom: parsed.zoom, center: [parsed.lng, parsed.lat] });
        } else {
          jumpToClampedAnalysisView();
        }
        resizeMap();
        requestAnimationFrame(() => {
          try {
            blockAnalysisHashSync = false;
            drawAndCount(map);
            syncAnalysisUrlFromMap();
          } finally {
            showMapCanvas = true;
          }
          scheduleIdleLanduseRedraw();
        });
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resizeMap();
          finishCircleViewportAlign();
        });
      });

      map.on("moveend", function () {
        keepAnalysisPointInsideBasel();
        const canvas = document.getElementById("myCanvas");
        drawCanvasCircle(map, canvas, $circleRadius);
        scheduleLanduseRecompute(100);
      });

      map.on("zoomend", function () {
        keepAnalysisPointInsideBasel();
        const canvas = document.getElementById("myCanvas");
        drawCanvasCircle(map, canvas, $circleRadius);
        scheduleLanduseRecompute(100);
      });
    });

    return () => {
      clearTimeout(landuseRecomputeTimer);
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("hashchange", onHashChange);
      resizeObserver?.disconnect();
      analysisMap.set(null);
      map?.remove();
    };
  });
</script>

<!-- #map must stay empty: MapLibre owns it. Overlay canvas is a sibling. -->
<div
  bind:this={mapShell}
  class="relative flex h-full min-h-full min-w-0 w-full flex-1 lg:min-h-0 lg:h-full"
  class:pointer-events-none={!showMapCanvas}
  class:opacity-0={!showMapCanvas}
  style="--sidebar-overlay-w: {$isMobile ? 0 : sidebarWidthLgPx}px;"
>
  <div id="map" class="absolute inset-0 z-0 min-h-[120px] w-full"></div>
  <canvas id="myCanvas" class="pointer-events-none absolute inset-0 z-[1] h-full w-full"></canvas>

  <div class="pointer-events-none absolute inset-0 z-10 min-h-0">
  {#if !$isMobile}
    <MapKey />
  {/if}
  <div
    class="absolute left-[1rem] top-[1rem] z-40 flex flex-col gap-[0.5rem] pointer-events-auto lg:left-[calc(var(--sidebar-overlay-w)+1rem)]"
  >
    <button
      type="button"
      class="button is-strong is-icon-only drop-shadow-xl"
      on:click={zoomInWithinBasel}
      on:keypress={zoomInWithinBasel}
      aria-label="Zoom in"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="currentColor"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path
          d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"
        />
      </svg>
    </button>
    <button
      type="button"
      class="button is-strong is-icon-only drop-shadow-xl"
      on:click={zoomOutWithinBasel}
      on:keypress={zoomOutWithinBasel}
      aria-label="Zoom out"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="currentColor"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z" />
      </svg>
    </button>
  </div>

  <div
    class="pointer-events-auto absolute bottom-[1rem] right-[1rem] z-50 flex max-w-[min(100%-2rem,20rem)] flex-col items-end gap-y-2"
  >
    <span
      class="shrink-0 text-right text-base font-medium leading-snug text-gray-900 lg:text-[18px]"
      style="text-shadow: 1px 0 #fff, -1px 0 #fff, 0 1px #fff, 0 -1px #fff;"
    >
      {appText.map.radius}: {$circleRadius}m
    </span>
    <div class="flex max-w-[min(100%,20rem)] flex-col items-end gap-y-1">
      <BasemapDropdown
        ariaLabel={appText.map.basemapAria}
        optionLabels={appText.map.basemapOptions}
      />
      {#if basemapAttribution[$basemapId]}
        <div
          class="text-right text-xs leading-snug text-gray-800 [&_a]:underline"
          style="text-shadow: 1px 0 #fff, -1px 0 #fff, 0 1px #fff, 0 -1px #fff;"
        >
          {@html basemapAttribution[$basemapId]}
        </div>
      {/if}
    </div>
  </div>
  </div>
</div>

<style>
  /* z-index set on element; keep below UI overlay (z-10) */
  #myCanvas {
    pointer-events: none;
  }
</style>
