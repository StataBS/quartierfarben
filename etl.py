# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "geopandas==1.1.1",
#     "marimo",
#     "numpy==2.2.6",
#     "owslib==0.34.1",
#     "pandas==2.3.3",
#     "requests==2.32.5",
#     "shapely==2.1.2",
#     "urllib3==2.5.0",
# ]
# ///

import marimo

__generated_with = "0.18.4"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    import requests
    from owslib.wfs import WebFeatureService
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
    import geopandas as gpd
    import pandas as pd
    import numpy as np
    import logging
    from shapely.geometry import box
    import io, time, random, json, os
    return (
        HTTPAdapter,
        Retry,
        WebFeatureService,
        box,
        gpd,
        io,
        json,
        logging,
        mo,
        np,
        os,
        pd,
        random,
        requests,
        time,
    )


@app.cell
def _(logging):
    logging.basicConfig(level=logging.DEBUG)
    logging.info(f"Executing {__file__}...")

    CRS_CH = 2056
    return (CRS_CH,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Helper Functions
    """)
    return


@app.cell
def _(HTTPAdapter, Retry, requests):
    def retry_session(total=8, backoff=1.5, ua="landuse-etl/1.0 (+github-actions)"):
        r = Retry(
            total=total, connect=total, read=total,
            backoff_factor=backoff,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=frozenset(["GET", "POST"]),
            raise_on_status=False,
        )
        s = requests.Session()
        s.headers.update({"User-Agent": ua})
        a = HTTPAdapter(max_retries=r, pool_connections=10, pool_maxsize=10)
        s.mount("https://", a); s.mount("http://", a)
        return s
    return (retry_session,)


@app.cell
def _(gpd, io, json):
    def getfeature_geojson(session, url, typename, srs="EPSG:2056", timeout=120):
        # try common GeoJSON output formats in order
        for fmt in ("application/json; subtype=geojson", "application/json", "json", "geojson"):
            params = {
                "service": "WFS", "version": "2.0.0", "request": "GetFeature",
                "typenames": typename, "outputFormat": fmt, "srsName": srs
            }
            resp = session.get(url, params=params, timeout=timeout)
            if resp.ok and resp.content:
                # try JSON parse first
                try:
                    gj = resp.json()
                    # If it's FeatureCollection, load via from_features
                    if isinstance(gj, dict) and gj.get("type") == "FeatureCollection":
                        return gpd.GeoDataFrame.from_features(gj, crs=None)
                except json.JSONDecodeError:
                    pass
                # fallback: let fiona parse from bytes (works for GeoJSON too)
                try:
                    return gpd.read_file(io.BytesIO(resp.content))
                except Exception:
                    continue  # try next format
        raise RuntimeError("GeoJSON fetch failed for all formats")
    return (getfeature_geojson,)


@app.cell
def _(
    WebFeatureService,
    getfeature_geojson,
    gpd,
    io,
    logging,
    pd,
    random,
    retry_session,
    time,
):
    def load_data_from_wfs(url_wfs, shapes_to_load=None, prefix=None, *, sleep_min=0.3, sleep_max=0.8):
        """
        Robust WFS loader:
          - Uses OWSLib for capabilities (no session arg).
          - Uses requests+retries for GetFeature (GeoJSON first, then GML fallback).
        Returns: (GeoDataFrame, failed_layers)
        """
        logging.info(f"Connecting to WFS at {url_wfs}")

        # Capabilities with a few manual retries (OWSLib only)
        last_exc = None
        for i in range(3):
            try:
                wfs = WebFeatureService(url=url_wfs, version="2.0.0", timeout=120)
                contents = list(wfs.contents)
                logging.info(f"Capabilities loaded; {len(contents)} layers advertised.")
                break
            except Exception as e:
                last_exc = e
                wait = (i + 1) * 5
                logging.error(f"GetCapabilities failed (try {i+1}/3): {e} — retrying in {wait}s")
                time.sleep(wait)
        else:
            raise RuntimeError(f"Failed to load WFS capabilities: {last_exc}")

        # Auto-discover by prefix
        if prefix:
            shapes_to_load = [name for name in contents if name.startswith(prefix)]
            logging.info(f"Discovered {len(shapes_to_load)} layers with prefix '{prefix}'")

        if not shapes_to_load:
            raise ValueError("No shapes_to_load provided and no prefix matched any layers.")

        sess = retry_session()
        gdf_combined = gpd.GeoDataFrame()
        failed_layers = []

        for typename in shapes_to_load:
            logging.info(f"Fetching layer: {typename}")
            try:
                time.sleep(random.uniform(sleep_min, sleep_max))  # be polite

                # 1) Try GeoJSON via requests (fastest to parse, resilient)
                try:
                    gdf = getfeature_geojson(sess, url_wfs, typename)
                except Exception:
                    # 2) Fallback: OWSLib GetFeature (likely GML)
                    resp = wfs.getfeature(typename=typename)
                    gdf = gpd.read_file(io.BytesIO(resp.read()))

                gdf_combined = pd.concat([gdf_combined, gdf], ignore_index=True)

            except Exception as e:
                logging.error(f"ERROR: Failed to fetch {typename}: {e}")
                failed_layers.append(typename)

        if failed_layers:
            logging.info(f"Completed with {len(failed_layers)} failure(s): {failed_layers}")
        else:
            logging.info("Completed all layers successfully.")

        return gdf_combined
    return (load_data_from_wfs,)


@app.cell
def _(gpd, logging, retry_session):
    def load_ogc_features(url_ogc, collection_id, *, limit=10000, timeout=120, crs_metric=2056):
        """
        Load a collection from OGC API Features (WFS3) as GeoJSON.
        Follows rel=next pagination. Reprojects to crs_metric (LV95).
        """
        sess = retry_session()
        url = f"{url_ogc.rstrip('/')}/collections/{collection_id}/items.json"
        params = {"limit": limit}
        features = []
        pages = 0
        headers = {"Accept": "application/geo+json, application/json"}

        logging.info(f"Fetching OGC API Features collection: {collection_id}")
        while url:
            pages += 1
            resp = sess.get(url, params=params, timeout=timeout, headers=headers)
            resp.raise_for_status()
            gj = resp.json()
            if not isinstance(gj, dict) or gj.get("type") != "FeatureCollection":
                raise RuntimeError(f"Expected FeatureCollection from {url}")
            page_features = gj.get("features") or []
            features.extend(page_features)
            logging.info(
                f"  page {pages}: {len(page_features)} features (total {len(features)})"
            )

            next_url = None
            for link in gj.get("links") or []:
                if link.get("rel") == "next" and link.get("href"):
                    next_url = link["href"]
                    break
            url = next_url
            params = None  # next href already contains query params

        if not features:
            raise RuntimeError(f"No features returned for collection {collection_id}")

        gdf = gpd.GeoDataFrame.from_features(
            {"type": "FeatureCollection", "features": features},
            crs="EPSG:4326",
        )
        gdf = gdf.to_crs(crs_metric)
        logging.info(f"Loaded {len(gdf)} features from {collection_id} in EPSG:{crs_metric}")
        return gdf
    return (load_ogc_features,)


@app.cell
def _(gpd):
    def build_nearest_point_to_building_mapping(points_gdf, buildings_gdf, *, label_col, max_distance_m=0.0, crs_metric=2056):
        p = points_gdf.copy()
        b = buildings_gdf.copy()

        # Align to metric CRS for distances
        b = (b.set_crs(crs_metric) if b.crs is None else b.to_crs(crs_metric))
        p = (p.set_crs(crs_metric) if p.crs is None else p.to_crs(crs_metric))

        # Only points with the desired label
        p = p[p[label_col].notna()].copy()

        joined = gpd.sjoin_nearest(
            p[[label_col, "geometry"]],
            b[["laufnr", "geometry"]],
            how="left",
            distance_col="dist_m",
        )

        # Pick the closest point per building
        mapping = (
            joined.sort_values("dist_m")
            .dropna(subset=["laufnr"])
            .groupby("laufnr", as_index=False)
            .first()[["laufnr", label_col, "dist_m"]]
        )

        mapping_filtered = mapping[mapping["dist_m"] <= max_distance_m].copy()

        stats = {
            "points_considered": int(p.shape[0]),
            "buildings_matched": int(mapping["laufnr"].nunique()),
            "max_distance_m": float(max_distance_m) if max_distance_m is not None else None,
        }
        return mapping, mapping_filtered, stats
    return (build_nearest_point_to_building_mapping,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    # Load Data

    Each theme is loaded from **exactly one** endpoint (OGC API Features *or* classic WFS).
    Geoinfo migrates layers one-way; both never exist in parallel for the same dataset.

    See [Geodienste - Kanton Basel-Stadt](https://www.bs.ch/bvd/grundbuch-und-vermessungsamt/geo/geodaten/geodienste#wfsbs).
    """)
    return


@app.cell
def _():
    url_wfs = "https://wfs.geo.bs.ch/"
    url_ogc_features = "https://api.geo.bs.ch/ogc/v1/wfs3"
    return url_ogc_features, url_wfs


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Load [Bodenbedeckungen](https://map.geo.bs.ch/?lang=de&baselayer_ref=Grundkarte%20grau&tree_groups=Bodenbedeckung&map_x=2611402&map_y=1267654&map_zoom=4&tree_group_layers_Bodenbedeckung=BS_Bodenbedeckungen_befestigt_Bahnareal%2CBS_Bodenbedeckungen_befestigt_Fabrikareal%2CBS_Bodenbedeckungen_befestigt_Gewaesservorland%2CBS_Bodenbedeckungen_befestigt_Hafenareal%2CBS_Bodenbedeckungen_befestigt_Sportanlage%2CBS_Bodenbedeckungen_befestigt_StrasseWeg%2CBS_Bodenbedeckungen_befestigt_Tramareal%2CBS_Bodenbedeckungen_befestigt_Trottoir%2CBS_Bodenbedeckungen_befestigt_Verkehrsinsel%2CBS_Bodenbedeckungen_befestigt_Wasserbecken%2CBS_Bodenbedeckungen_befestigt_uebrigeBefestigte%2CBS_Bodenbedeckungen_bestockt_geschlossenerWald%2CBS_Bodenbedeckungen_bestockt_uebrigeBestockte%2CBS_Bodenbedeckungen_Gebaeude_Gebaeude%2CBS_Bodenbedeckungen_Gebaeude_Tank%2CBS_Bodenbedeckungen_Gewaesser_fliessendes%2CBS_Bodenbedeckungen_Gewaesser_stehendes%2CBS_Bodenbedeckungen_humusiert_AckerWieseWeide%2CBS_Bodenbedeckungen_humusiert_Friedhof%2CBS_Bodenbedeckungen_humusiert_Gartenanlage%2CBS_Bodenbedeckungen_humusiert_ParkanlageSpielplatz%2CBS_Bodenbedeckungen_humusiert_Schrebergarten%2CBS_Bodenbedeckungen_humusiert_SportanlageHumusiert%2CBS_Bodenbedeckungen_humusiert_Tierpark%2CBS_Bodenbedeckungen_humusiert_Reben%2CBS_Bodenbedeckungen_humusiert_Intensivkultur%2CBS_Bodenbedeckungen_humusiert_Gewaesservorland%2CBS_Bodenbedeckungen_humusiert_uebrigeHumusierte)
    """)
    return


@app.cell
def _(load_ogc_features, url_ogc_features):
    gdf_bodenbedeckung = load_ogc_features(
        url_ogc_features,
        "ch.bs.av_bodenbedeckung_einzelobjekte_avbe.bodenbedeckung",
    )
    gdf_bodenbedeckung = gdf_bodenbedeckung.rename(columns={"Bodenbedeckungsart": "bs_art_txt"})
    gdf_bodenbedeckung = gdf_bodenbedeckung.reset_index(drop=True).assign(laufnr=lambda df: df.index + 1)
    gdf_bodenbedeckung
    return (gdf_bodenbedeckung,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Load [Gebäudekategorien](https://map.geo.bs.ch/?lang=de&baselayer_ref=Grundkarte%20grau&tree_groups=Geb%C3%A4udeinformationen&map_x=2611402&map_y=1267654&map_zoom=4&tree_group_layers_Geb%C3%A4udeinformationen=DM_Gebaeudeinformationen_DatenmarktGebaeudekategorie)
    """)
    return


@app.cell
def _(load_data_from_wfs, url_wfs):
    gdf_gebaeudekategorie = load_data_from_wfs(
        url_wfs,
        shapes_to_load=["ms:DM_Gebaeudeinformationen_DatenmarktGebaeudekategorie"],
    )
    gdf_gebaeudekategorie
    return (gdf_gebaeudekategorie,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Load [Öffentlicher Raum](https://map.geo.bs.ch/?lang=de&baselayer_ref=Grundkarte%20grau&tree_groups=%C3%96ffentlicher%20Raum&map_x=2611402&map_y=1267654&map_zoom=4&tree_group_layers_%C3%96ffentlicher%20Raum=OR_OeffentlicherRaum)
    """)
    return


@app.cell
def _(load_data_from_wfs, url_wfs):
    gdf_oeffentlicher_raum = load_data_from_wfs(
        url_wfs,
        shapes_to_load=["ms:OR_OeffentlicherRaum_Allmend", "ms:OR_OeffentlicherRaum_Noerg"],
    )
    gdf_oeffentlicher_raum
    return (gdf_oeffentlicher_raum,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Load [Points of Interest - Kultur](https://api.geo.bs.ch/ogc/v1/wfs3/collections/ch.bs.basel_info_points_of_interest_bipo.kultur_unterhaltung)
    """)
    return


@app.cell
def _(load_ogc_features, url_ogc_features):
    gdf_kultur = load_ogc_features(
        url_ogc_features,
        "ch.bs.basel_info_points_of_interest_bipo.kultur_unterhaltung",
    )
    gdf_kultur = gdf_kultur.rename(columns={"Subkategorie": "bi_subkategorie"})
    gdf_kultur
    return (gdf_kultur,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Load [Schulstandorte](https://map.geo.bs.ch/?lang=de&baselayer_ref=Grundkarte%20farbig&tree_groups=SchulenRiehenBettingen%2CSchulstandorte_Basel&tree_group_layers_SchulenRiehenBettingen=SO_BezeichnungStandort_Tagesstruktur%2CSO_BezeichnungStandort_Kindergarten%2CSO_BezeichnungStandort_Primarschule%2CSO_Tagesstruktur%2CSO_Kindergarten%2CSO_Primarschule&tree_group_layers_Schulstandorte_Basel=SC_Tagesstruktur%2CSC_Turnhalle%2CSC_Sportplatz%2CSC_Schwimmhalle%2CSC_Kindergarten%2CSC_Primarschule%2CSC_Sekundarschule%2CSC_Gymnasium%2CSC_ZentrumBrueckenangebote%2CSC_Spezialangebot%2CSC_Gewerbeschule)
    """)
    return


@app.cell
def _(CRS_CH, gpd, load_data_from_wfs, load_ogc_features, pd, url_ogc_features, url_wfs):
    gdf_schul_basel_punkt = load_ogc_features(
        url_ogc_features,
        "ch.bs.schulstandorte_gemeinde_basel_ssba.punkt",
    )
    gdf_schul_basel_flaeche = load_ogc_features(
        url_ogc_features,
        "ch.bs.schulstandorte_gemeinde_basel_ssba.flaeche",
    )
    gdf_b = gpd.GeoDataFrame(
        pd.concat([gdf_schul_basel_punkt, gdf_schul_basel_flaeche], ignore_index=True),
        crs=gdf_schul_basel_punkt.crs,
    ).rename(columns={"Schultyp": "sc_schultyp"})

    gdf_rb = load_data_from_wfs(url_wfs, prefix="ms:SO")

    gdf_b = gdf_b.set_crs(CRS_CH) if gdf_b.crs is None else gdf_b.to_crs(CRS_CH)
    gdf_rb = gdf_rb.set_crs(CRS_CH) if gdf_rb.crs is None else gdf_rb.to_crs(CRS_CH)

    # Basel fläche → centroid
    non_point = ~gdf_b.geometry.geom_type.isin(["Point", "MultiPoint"])
    if non_point.any():
        gdf_b.loc[non_point, "geometry"] = gdf_b.loc[non_point, "geometry"].centroid

    if "sc_schultyp" not in gdf_b.columns:
        raise KeyError("Expected column 'sc_schultyp' in Basel dataset.")
    if "so_schultyp" not in gdf_rb.columns:
        raise KeyError("Expected column 'so_schultyp' in Riehen/Bettingen dataset.")

    gdf_b["schultyp"] = gdf_b["sc_schultyp"]
    gdf_rb["schultyp"] = gdf_rb["so_schultyp"]

    gdf_schulstandorte = gpd.GeoDataFrame(
        pd.concat(
            [gdf_b[["schultyp", "geometry"]], gdf_rb[["schultyp", "geometry"]]],
            ignore_index=True,
        ),
        crs=CRS_CH,
    )
    gdf_schulstandorte = gdf_schulstandorte[
        gdf_schulstandorte.geometry.notna() & gdf_schulstandorte["schultyp"].notna()
    ].reset_index(drop=True)

    gdf_schulstandorte
    return (gdf_schulstandorte,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    # Transform and Merge Date
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Merge Gebäude from Bodenbedeckungen with Gebäudekategorie
    """)
    return


@app.cell
def _(gdf_bodenbedeckung, gdf_gebaeudekategorie):
    bb = gdf_bodenbedeckung.copy()
    gk = gdf_gebaeudekategorie.copy()

    # Filter
    buildings = bb[bb["bs_art_txt"] == "Gebaeude.Gebaeude"].copy()
    gk = gk[["gebaeudekategorieid", "geometry"]]

    buildings, gk
    return bb, buildings, gk


@app.cell
def _(buildings, gk, gpd):
    # predicate: 'intersects' is robust; if geometries should be strictly within, use 'within'
    joined = gpd.sjoin(buildings, gk, how="left", predicate="intersects")

    joined
    return (joined,)


@app.cell
def _(joined, logging):
    required = {"laufnr", "gebaeudekategorieid"}
    missing = required - set(joined.columns)
    if missing:
        logging.info(f"'joined' is missing required columns: {missing}")

    # Any building mapped to >1 distinct category?
    per_bldg_ncats = joined.groupby("laufnr")["gebaeudekategorieid"].nunique(dropna=True)
    ambiguous_ids = per_bldg_ncats[per_bldg_ncats > 1].index.tolist()

    logging.info("Found ambiguous ids (building mapped to >1 distinct category)")
    # Show concise report of the ambiguous ones, then stop (no merge)
    ambiguous_buildings = (
        joined.loc[joined["laufnr"].isin(ambiguous_ids), ["laufnr", "gebaeudekategorieid"]]
        .drop_duplicates()
        .sort_values(["laufnr", "gebaeudekategorieid"])
        .reset_index(drop=True)
    )
    ambiguous_buildings
    return (ambiguous_ids,)


@app.cell
def _(ambiguous_ids, buildings, gk, gpd, joined, np, pd):
    if not len(ambiguous_ids):
        amb_best = pd.DataFrame(columns=["laufnr", "gebaeudekategorieid", "pct_bldg"])
        amb_stats = {
            "ambiguous_buildings": 0,
            "with_overlay_match": 0,
            "no_overlay_match": 0,
            "pct_bldg_summary_pct": {"min": None, "median": None, "max": None},
        }
        amb_stats, amb_best

    # Limit to ambiguous buildings and the categories they touched in the join
    amb_bldgs = buildings.loc[buildings["laufnr"].isin(ambiguous_ids), ["laufnr", "geometry"]].copy()
    cats_needed = (
        joined.loc[joined["laufnr"].isin(ambiguous_ids), "gebaeudekategorieid"]
        .dropna().unique().tolist()
    )
    gk_sub = gk.loc[gk["gebaeudekategorieid"].isin(cats_needed), ["gebaeudekategorieid", "geometry"]].copy()

    inter = gpd.overlay(amb_bldgs, gk_sub, how="intersection")
    inter = inter[inter.geometry.geom_type.isin(["Polygon", "MultiPolygon"])]


    # Percent of each building covered by the intersected category
    bldg_area = amb_bldgs.assign(bldg_area=amb_bldgs.geometry.area)[["laufnr", "bldg_area"]]
    inter = inter.merge(bldg_area, on="laufnr", how="left")
    inter["int_area"] = inter.geometry.area
    inter["pct_bldg"] = np.where(inter["bldg_area"] > 0, inter["int_area"] / inter["bldg_area"] * 100.0, np.nan)

    # Choose, per building, the category with the largest percent overlap
    best_idx = inter.groupby("laufnr")["pct_bldg"].idxmax()
    amb_best = inter.loc[best_idx, ["laufnr", "gebaeudekategorieid", "pct_bldg"]].reset_index(drop=True)

    resolved_set = set(amb_best["laufnr"])
    unresolved = sorted(set(ambiguous_ids) - resolved_set)

    # Percentage stats (on resolved ambiguous)
    pct = amb_best["pct_bldg"]
    amb_stats = {
        "ambiguous_buildings": len(ambiguous_ids),
        "with_overlay_match": len(resolved_set),
        "no_overlay_match": len(unresolved),
        "pct_bldg_summary_pct": {
            "min": float(np.nanmin(pct)) if len(pct) else None,
            "median": float(np.nanmedian(pct)) if len(pct) else None,
            "max": float(np.nanmax(pct)) if len(pct) else None,
        },
    }

    amb_stats, amb_best
    return (amb_best,)


@app.cell
def _(amb_best, ambiguous_ids, gdf_bodenbedeckung, joined, pd):
    # Unambiguous mapping straight from the spatial join
    mapping_unamb = (
        joined.loc[~joined["laufnr"].isin(ambiguous_ids), ["laufnr", "gebaeudekategorieid"]]
        .dropna(subset=["gebaeudekategorieid"])
        .drop_duplicates(subset=["laufnr"])
    )
    # Ambiguous resolved by largest intersection
    mapping_amb = amb_best.loc[:, ["laufnr", "gebaeudekategorieid"]]

    mapping_final = (
        pd.concat([mapping_unamb, mapping_amb], ignore_index=True)
        .drop_duplicates(subset=["laufnr"], keep="last")
    )

    gdf_bodenbedeckung_cat = gdf_bodenbedeckung.merge(mapping_final, on="laufnr", how="left")

    stats_final = {
        "joined_buildings_total": int(joined["laufnr"].nunique()),
        "mapped_unambiguous": int(mapping_unamb["laufnr"].nunique()),
        "mapped_ambiguous": int(mapping_amb["laufnr"].nunique()),
        "mapped_total": int(mapping_final["laufnr"].nunique()),
    }

    stats_final, gdf_bodenbedeckung_cat
    return (gdf_bodenbedeckung_cat,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Compute öffentlicher Raum for the remaining "befestigte".
    """)
    return


@app.cell
def _(bb, gdf_oeffentlicher_raum, gpd, np, pd):
    # percent area threshold to call something "öffentlicher Raum"
    PCT_THRESHOLD = 50

    oraw = gdf_oeffentlicher_raum.copy()

    # target subset
    tgt = bb[bb["bs_art_txt"] == "befestigt.uebrige_befestigte.uebrige_befestigte"].copy()

    # light geometry healing
    try:
        from shapely.validation import make_valid
        tgt["geometry"]  = tgt.geometry.apply(make_valid)
        oraw["geometry"] = oraw.geometry.apply(make_valid)
    except Exception:
        tgt["geometry"]  = tgt.geometry.buffer(0)
        oraw["geometry"] = oraw.geometry.buffer(0)

    # areas
    tgt["area"] = tgt.geometry.area

    # dissolve all public-space shapes into one geometry
    public = oraw[["geometry"]].dissolve()  # single row
    public = gpd.GeoDataFrame(public, geometry="geometry", crs=oraw.crs).reset_index(drop=True)

    # polygonal intersections
    inter_oeffentlicher_raum = gpd.overlay(tgt[["laufnr", "geometry", "area"]], public, how="intersection")
    inter_oeffentlicher_raum = inter_oeffentlicher_raum[inter_oeffentlicher_raum.geometry.geom_type.isin(["Polygon", "MultiPolygon"])]

    if inter_oeffentlicher_raum.empty:
        coverage = pd.DataFrame({"launfr": tgt["laufnr"].unique(), "public_area": 0.0})
    else:
        inter_oeffentlicher_raum["int_area"] = inter_oeffentlicher_raum.geometry.area
        coverage = (
            inter_oeffentlicher_raum.groupby("laufnr", as_index=False)["int_area"]
            .sum()
            .rename(columns={"int_area": "public_area"})
        )

    coverage = coverage.merge(tgt[["laufnr", "area"]], on="laufnr", how="right")
    coverage["public_area"] = coverage["public_area"].fillna(0.0)
    coverage["oeffentlicher_raum_pct"] = np.where(
        coverage["area"] > 0,
        coverage["public_area"] / coverage["area"] * 100.0,
        0.0
    )

    # labels
    coverage["oeffentlicher Raum"] = np.where(
        coverage["oeffentlicher_raum_pct"] >= PCT_THRESHOLD,
        "öffentlicher Raum",
        "kein öffentlicher Raum"
    )

    # quick stats
    n_total  = int(tgt["laufnr"].nunique())
    n_public = int((coverage["oeffentlicher Raum"] == "öffentlicher Raum").sum())
    stats = {
        "threshold_pct": PCT_THRESHOLD,
        "total_befestigt_uebrige": n_total,
        "öffentlicher_Raum": {"count": n_public, "pct": round(100.0 * n_public / max(n_total, 1), 2)},
        "kein_öffentlicher_Raum": {
            "count": n_total - n_public,
            "pct": round(100.0 * (n_total - n_public) / max(n_total, 1), 2),
        },
    }

    coverage, stats
    return (coverage,)


@app.cell
def _(coverage, gdf_bodenbedeckung_cat):
    cols = ["laufnr", "oeffentlicher Raum", "oeffentlicher_raum_pct"]
    gdf_all = gdf_bodenbedeckung_cat.merge(coverage[cols], on="laufnr", how="left")

    gdf_all
    return (gdf_all,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Build nearest points to_buildings (Kultur & Schulen)
    """)
    return


@app.cell
def _(build_nearest_point_to_building_mapping, buildings, gdf_kultur):
    mapping_kultur_all, mapping_kultur, stats_kultur = build_nearest_point_to_building_mapping(
        gdf_kultur, buildings, label_col="bi_subkategorie", max_distance_m=30.0, crs_metric=2056
    )
    mapping_kultur_all, mapping_kultur, stats_kultur
    return (mapping_kultur,)


@app.cell
def _(build_nearest_point_to_building_mapping, buildings, gdf_schulstandorte):
    mapping_schulen_all, mapping_schulen, stats_schulen = build_nearest_point_to_building_mapping(
        gdf_schulstandorte, buildings, label_col="schultyp", max_distance_m=0.0, crs_metric=2056
    )
    mapping_schulen_all, mapping_schulen, stats_schulen
    return (mapping_schulen,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Get everything together
    """)
    return


@app.cell
def _(json, logging, os, pd, requests):
    # Load color configuration: try local file first, then GitHub (for molab etc.)
    config_path = os.path.join(os.path.dirname(__file__), "src", "lib", "colors.json")

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            color_config = json.load(f)
        logging.info(f"Loaded color configuration from {config_path}")
    except FileNotFoundError:
        colors_json_url = "https://raw.githubusercontent.com/StataBS/quartierfarben/main/src/lib/colors.json"
        logging.info(f"Local colors.json not found, fetching from GitHub: {colors_json_url}")
        resp = requests.get(colors_json_url, timeout=10)
        resp.raise_for_status()
        color_config = resp.json()
        logging.info("Loaded color configuration from GitHub")
    except json.JSONDecodeError as e:
        logging.error(f"Error parsing color configuration JSON: {e}")
        raise
    
    # Extract configuration
    PALETTES = color_config["palettes"]
    LANDUSE_TO_CATEGORY = color_config["landuseMapping"]
    
    # Default to "always" palette (can be changed to "spring", "summer", "autumn", "winter")
    PALETTE_ALWAYS = PALETTES["always"]
    
    def get_color_for_nutzung(nutzung, season="always"):
        """Get color for a given nutzung value.
        
        Parameters:
        -----------
        nutzung : str
            The nutzung value to get color for
        season : str
            Season palette to use: "spring", "summer", "autumn", "winter", or "always" (default)
        """
        if pd.isna(nutzung):
            palette = PALETTES.get(season, PALETTE_ALWAYS)
            return palette.get("other", "#ffffff")
        nutzung_str = str(nutzung).strip()
        category = LANDUSE_TO_CATEGORY.get(nutzung_str, "other")
        palette = PALETTES.get(season, PALETTE_ALWAYS)
        return palette.get(category, "#ffffff")

    return (get_color_for_nutzung,)


@app.cell
def _(pd):
    CODE2DE = {
        "1010": "Provisorische Unterkunft",
        "1020": "Gebäude ausschliesslich für Wohnnutzung",
        "1021": "Einfamilienhaus, ohne Nebennutzung",
        "1025": "Mehrfamilienhaus, ohne Nebennutzung",
        "1030": "Wohngebäude mit Nebennutzung",
        "1040": "Gebäude mit teilweiser Wohnnutzung",
        "1060": "Gebäude ohne Wohnnutzung",
        "1080": "Sonderbau",
    }

    TARGET_BB = "befestigt.uebrige_befestigte.uebrige_befestigte"
    COL_OR = "oeffentlicher Raum"
    COL_CODE = "gebaeudekategorieid"

    NUTZUNG_STAGES = (
        "bodenbedeckung",
        "gebaeudekategorie",
        "oeffentlicher_raum",
        "kultur",
        "schulen",
    )

    def clean_bs_art(s):
        if pd.isna(s):
            return None
        s = str(s)
        return s.replace(".", " - ").replace("_", " ")

    def norm_code(x):
        if pd.isna(x):
            return None
        if isinstance(x, int):
            return str(x)
        if isinstance(x, float):
            return str(int(x))
        return str(x).strip()

    def apply_nutzung_stages(gdf_base, mapping_kultur=None, mapping_schulen=None, *, stage):
        if stage not in NUTZUNG_STAGES:
            raise ValueError(f"Unknown stage {stage!r}; expected one of {NUTZUNG_STAGES}")

        gdf = gdf_base.copy()
        gdf["nutzung"] = gdf["bs_art_txt"].map(clean_bs_art)

        if stage in ("gebaeudekategorie", "oeffentlicher_raum", "kultur", "schulen"):
            gdf["_code"] = (
                gdf[COL_CODE].apply(norm_code)
                if COL_CODE in gdf.columns
                else None
            )
            has_code = (
                gdf["_code"].notna()
                if COL_CODE in gdf.columns
                else pd.Series(False, index=gdf.index)
            )
            gdf.loc[has_code, "nutzung"] = (
                "Gebäude - "
                + gdf.loc[has_code, "_code"].map(lambda c: CODE2DE.get(c, c))
            )
            gdf = gdf.drop(columns=[c for c in ["_code"] if c in gdf.columns])

        if stage in ("oeffentlicher_raum", "kultur", "schulen") and COL_OR in gdf.columns:
            if COL_CODE in gdf.columns:
                has_code = gdf[COL_CODE].apply(norm_code).notna()
            else:
                has_code = pd.Series(False, index=gdf.index)
            mask_ps = (
                (gdf["bs_art_txt"] == TARGET_BB)
                & gdf[COL_OR].notna()
                & ~has_code
            )
            gdf.loc[mask_ps, "nutzung"] = (
                "befestigt - uebrige befestigte - "
                + gdf.loc[mask_ps, COL_OR].astype(str)
            )

        bldg_mask = gdf["bs_art_txt"].eq("Gebaeude.Gebaeude") & gdf.geometry.notna()

        if stage in ("kultur", "schulen") and mapping_kultur is not None:
            gdf = gdf.merge(
                mapping_kultur.rename(columns={
                    "bi_subkategorie": "_kultur_subkat",
                    "dist_m": "kultur_dist_m",
                }),
                on="laufnr",
                how="left",
            )
            mask_override = bldg_mask & gdf["_kultur_subkat"].notna()
            gdf.loc[mask_override, "nutzung"] = (
                "Gebäude - " + gdf.loc[mask_override, "_kultur_subkat"].astype(str)
            )
            gdf = gdf.drop(columns=[c for c in ["_kultur_subkat"] if c in gdf.columns])

        if stage == "schulen" and mapping_schulen is not None:
            gdf = gdf.merge(
                mapping_schulen.rename(columns={
                    "schultyp": "_schule_schultyp",
                    "dist_m": "schule_dist_m",
                }),
                on="laufnr",
                how="left",
            )
            has_school = gdf["_schule_schultyp"].notna()
            gdf.loc[bldg_mask & has_school, "nutzung"] = (
                "Gebäude - " + gdf.loc[bldg_mask & has_school, "_schule_schultyp"].astype(str)
            )
            gdf = gdf.drop(columns=[c for c in ["_schule_schultyp"] if c in gdf.columns])

        return gdf

    return (apply_nutzung_stages,)


@app.cell
def _(
    CRS_CH,
    apply_nutzung_stages,
    gdf_all,
    get_color_for_nutzung,
    mapping_kultur,
    mapping_schulen,
):
    gdf_nutzung = apply_nutzung_stages(
        gdf_all,
        mapping_kultur,
        mapping_schulen,
        stage="schulen",
    )
    gdf_nutzung["color"] = gdf_nutzung["nutzung"].apply(get_color_for_nutzung)

    if gdf_nutzung.crs is None:
        gdf_nutzung = gdf_nutzung.set_crs(CRS_CH)
    gdf_nutzung = gdf_nutzung.to_crs(4326)
    gdf_nutzung.to_file("landuse.geojson", driver="GeoJSON", layer='landuse-data')
    gdf_nutzung
    return (gdf_nutzung,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Export to SVG / pipeline snapshots (edit mode only)

    Skipped when the notebook runs as a **script** (e.g. `uv run etl.py` / tile CI).
    Open with `marimo edit etl.py` to generate SVGs and stage snapshots locally.
    """)
    return


@app.cell
def _(CRS_CH, box, gpd, logging, mo):
    # Production tile builds only need landuse.geojson above; skip SVG helpers in script mode.
    mo.stop(mo.app_meta().mode != "edit")

    def export_to_svg(gdf, output_path="landuse.svg", bounds=None, width=2000, height=None, stroke_width=0.5, stroke_color="#000000", target_crs=None):
        """
        Export GeoDataFrame to SVG with colors.

        Parameters:
        -----------
        gdf : GeoDataFrame
            GeoDataFrame with 'color' column and geometries
        output_path : str
            Output SVG file path
        bounds : tuple or None
            (minx, miny, maxx, maxy) in CRS coordinates. If None, uses gdf.total_bounds
        width : int
            SVG width in pixels
        height : int or None
            SVG height in pixels. If None, calculated from aspect ratio
        stroke_width : float
            Stroke width for polygon outlines
        stroke_color : str
            Stroke color for polygon outlines
        target_crs : int or None
            Target CRS for projection (default: CRS_CH = 2056 for Swiss coordinates).
            Use a projected CRS for correct aspect ratios.
        """
        if "color" not in gdf.columns:
            raise ValueError("GeoDataFrame must have a 'color' column")

        if gdf.empty:
            logging.warning("GeoDataFrame is empty, creating empty SVG")
            with open(output_path, "w") as f:
                f.write('<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="{}" height="{}"/>\n'.format(width, height or width))
            return

        # Convert to target CRS for proper projection (use Swiss coordinates by default)
        if target_crs is None:
            target_crs = CRS_CH
        
        gdf_projected = gdf.copy()
        if gdf_projected.crs is None:
            logging.warning("GeoDataFrame has no CRS, assuming EPSG:4326")
            gdf_projected = gdf_projected.set_crs(4326)
        
        # Convert to target CRS if different
        if gdf_projected.crs.to_epsg() != target_crs:
            gdf_projected = gdf_projected.to_crs(target_crs)
            logging.info(f"Converted to CRS {target_crs} for SVG export")
        
        # Ensure color column is preserved in projected dataframe
        if "color" not in gdf_projected.columns and "color" in gdf.columns:
            gdf_projected["color"] = gdf["color"].values

        # Get bounds in projected CRS
        if bounds is None:
            bounds = gdf_projected.total_bounds  # minx, miny, maxx, maxy
        else:
            # If bounds provided, they should be in the original CRS, so convert them
            if gdf.crs is not None and gdf.crs.to_epsg() != target_crs:
                bounds_geom = box(bounds[0], bounds[1], bounds[2], bounds[3])
                bounds_gdf = gpd.GeoDataFrame([1], geometry=[bounds_geom], crs=gdf.crs)
                bounds_gdf = bounds_gdf.to_crs(target_crs)
                bounds = bounds_gdf.total_bounds
        
        minx, miny, maxx, maxy = bounds

        clip_geom = box(minx, miny, maxx, maxy)
        gdf_projected = gdf_projected[gdf_projected.geometry.intersects(clip_geom)]

        # Calculate aspect ratio and height if not provided
        aspect_ratio = (maxy - miny) / (maxx - minx) if (maxx - minx) > 0 else 1.0
        if height is None:
            height = int(width * aspect_ratio)

        # Scale factors
        scale_x = width / (maxx - minx) if (maxx - minx) > 0 else 1.0
        scale_y = height / (maxy - miny) if (maxy - miny) > 0 else 1.0

        def coord_to_svg(x, y):
            """Convert geographic coordinates to SVG coordinates."""
            svg_x = (x - minx) * scale_x
            svg_y = height - (y - miny) * scale_y  # Flip Y axis
            return svg_x, svg_y

        def geom_to_svg_path(geom):
            """Convert Shapely geometry to SVG path string."""
            if geom is None or geom.is_empty:
                return ""

            if geom.geom_type == "Polygon":
                return polygon_to_path(geom)
            elif geom.geom_type == "MultiPolygon":
                return " ".join(polygon_to_path(p) for p in geom.geoms)
            elif geom.geom_type == "Point":
                x, y = coord_to_svg(geom.x, geom.y)
                return f"M {x} {y} L {x} {y}"
            elif geom.geom_type == "MultiPoint":
                return " ".join(f"M {coord_to_svg(p.x, p.y)[0]} {coord_to_svg(p.x, p.y)[1]} L {coord_to_svg(p.x, p.y)[0]} {coord_to_svg(p.x, p.y)[1]}" for p in geom.geoms)
            else:
                logging.warning(f"Unsupported geometry type: {geom.geom_type}")
                return ""

        def polygon_to_path(poly):
            """Convert Polygon to SVG path."""
            if poly.is_empty:
                return ""

            # Exterior ring
            coords = list(poly.exterior.coords)
            if len(coords) < 3:
                return ""

            path_parts = []
            for i, (x, y) in enumerate(coords):
                svg_x, svg_y = coord_to_svg(x, y)
                if i == 0:
                    path_parts.append(f"M {svg_x} {svg_y}")
                else:
                    path_parts.append(f"L {svg_x} {svg_y}")
            path_parts.append("Z")

            # Interior rings (holes)
            for interior in poly.interiors:
                coords = list(interior.coords)
                if len(coords) < 3:
                    continue
                for i, (x, y) in enumerate(coords):
                    svg_x, svg_y = coord_to_svg(x, y)
                    if i == 0:
                        path_parts.append(f"M {svg_x} {svg_y}")
                    else:
                        path_parts.append(f"L {svg_x} {svg_y}")
                path_parts.append("Z")

            return " ".join(path_parts)

        # Build SVG
        svg_parts = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
            '  <g id="landuse">'
        ]

        # Add polygons (use projected geometries)
        for idx, row in gdf_projected.iterrows():
            color = row.get("color", "#ffffff")
            geom = row.geometry

            if geom is None or geom.is_empty:
                continue

            path_d = geom_to_svg_path(geom)
            if path_d:
                svg_parts.append(
                    f'    <path d="{path_d}" fill="{color}" stroke="{stroke_color}" stroke-width="{stroke_width}" />'
                )

        svg_parts.extend([
            '  </g>',
            '</svg>'
        ])

        # Write to file
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(svg_parts))

        logging.info(f"SVG exported to {output_path} ({width}x{height}px)")
        return output_path

    return (export_to_svg,)


@app.cell
def _(CRS_CH, apply_nutzung_stages, export_to_svg, os):
    # LV95 bbox around Basel city center (~6 km); set to None for full canton extent
    SNAPSHOT_BOUNDS = (2608402, 1264654, 2614402, 1270654)

    PIPELINE_SNAPSHOT_STAGES = [
        ("00_after_bodenbedeckung", "bodenbedeckung"),
        ("01_after_gebaeudekategorie", "gebaeudekategorie"),
        ("02_after_oeffentlicher_raum", "oeffentlicher_raum"),
        ("03_after_kultur", "kultur"),
        ("04_after_schulen", "schulen"),
    ]

    def export_stage_snapshot(
        gdf_base,
        stage,
        label,
        *,
        get_color_for_nutzung,
        mapping_kultur=None,
        mapping_schulen=None,
        output_dir="snapshots",
        bounds=SNAPSHOT_BOUNDS,
        width=2000,
    ):
        os.makedirs(output_dir, exist_ok=True)
        gdf = apply_nutzung_stages(
            gdf_base,
            mapping_kultur,
            mapping_schulen,
            stage=stage,
        )
        if gdf.crs is None:
            gdf = gdf.set_crs(CRS_CH)
        gdf["color"] = gdf["nutzung"].apply(get_color_for_nutzung)
        path = os.path.join(output_dir, f"{label}.svg")
        export_to_svg(
            gdf,
            output_path=path,
            bounds=bounds,
            width=width,
            stroke_width=0,
            stroke_color="#000000",
        )
        return path, gdf

    def export_pipeline_snapshots(
        *,
        gdf_by_stage,
        get_color_for_nutzung,
        mapping_kultur,
        mapping_schulen,
        output_dir,
        bounds,
        logging,
    ):
        gdf_for_stage = {
            "bodenbedeckung": gdf_by_stage["bodenbedeckung"],
            "gebaeudekategorie": gdf_by_stage["gebaeudekategorie"],
            "oeffentlicher_raum": gdf_by_stage["oeffentlicher_raum"],
            "kultur": gdf_by_stage["kultur"],
            "schulen": gdf_by_stage["schulen"],
        }
        paths = []
        for label, stage in PIPELINE_SNAPSHOT_STAGES:
            path, _ = export_stage_snapshot(
                gdf_for_stage[stage],
                stage,
                label,
                get_color_for_nutzung=get_color_for_nutzung,
                mapping_kultur=mapping_kultur,
                mapping_schulen=mapping_schulen,
                output_dir=output_dir,
                bounds=bounds,
            )
            paths.append(path)
            logging.info(f"Pipeline snapshot: {path}")
        return paths

    return PIPELINE_SNAPSHOT_STAGES, SNAPSHOT_BOUNDS, export_pipeline_snapshots, export_stage_snapshot


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Pipeline snapshots

    SVG exports after each enrichment step for the Basel city center overview.
    """)
    return


@app.cell
def _(
    SNAPSHOT_BOUNDS,
    export_pipeline_snapshots,
    gdf_all,
    gdf_bodenbedeckung,
    gdf_bodenbedeckung_cat,
    get_color_for_nutzung,
    logging,
    mapping_kultur,
    mapping_schulen,
):
    gdf_by_stage = {
        "bodenbedeckung": gdf_bodenbedeckung,
        "gebaeudekategorie": gdf_bodenbedeckung_cat,
        "oeffentlicher_raum": gdf_all,
        "kultur": gdf_all,
        "schulen": gdf_all,
    }

    snapshot_paths = export_pipeline_snapshots(
        gdf_by_stage=gdf_by_stage,
        get_color_for_nutzung=get_color_for_nutzung,
        mapping_kultur=mapping_kultur,
        mapping_schulen=mapping_schulen,
        output_dir="snapshots",
        bounds=SNAPSHOT_BOUNDS,
        logging=logging,
    )
    snapshot_paths
    return (snapshot_paths,)


@app.cell
def _(mo, snapshot_paths):
    def _snapshot_pair(title, before_path, after_path):
        return mo.vstack([
            mo.md(f"**{title}**"),
            mo.hstack(
                [
                    mo.vstack([mo.md("_before_"), mo.image(before_path)]),
                    mo.vstack([mo.md("_after_"), mo.image(after_path)]),
                ],
                justify="start",
                gap=2,
            ),
        ], gap=0.5)

    mo.vstack([
        mo.md("### Overview (Basel city center)"),
        mo.md("**Bodenbedeckung (base layer)**"),
        mo.image(snapshot_paths[0]),
        _snapshot_pair("Gebäudekategorie", snapshot_paths[0], snapshot_paths[1]),
        _snapshot_pair("Öffentlicher Raum", snapshot_paths[1], snapshot_paths[2]),
        _snapshot_pair("Kultur", snapshot_paths[2], snapshot_paths[3]),
        _snapshot_pair("Schulen", snapshot_paths[3], snapshot_paths[4]),
    ], gap=1.5)
    return


@app.cell
def _(export_to_svg, gdf_nutzung, logging):
    # Export to SVG
    # You can adjust these parameters:
    # - width: SVG width in pixels (default 2000)
    # - height: SVG height in pixels (None = auto-calculate from aspect ratio)
    # - bounds: (minx, miny, maxx, maxy) to crop to specific area, or None for full extent
    # - stroke_width: outline width (default 0.5, set to 0 for no outlines)

    svg_path = export_to_svg(
        gdf_nutzung,
        output_path="landuse.svg",
        bounds=None,  # Use None for full extent, or specify: (minx, miny, maxx, maxy)
        width=2000,
        height=None,  # Auto-calculate from aspect ratio
        stroke_width=0,  # Set to 0 for no outlines
        stroke_color="#000000"
    )

    logging.info(f"SVG file created: {svg_path}")
    svg_path
    return


if __name__ == "__main__":
    app.run()
