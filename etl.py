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

__generated_with = "0.16.4"
app = marimo.App(width="medium", auto_download=["html"])


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
    import io, time, random, json
    return (
        HTTPAdapter,
        Retry,
        WebFeatureService,
        gpd,
        io,
        json,
        logging,
        mo,
        np,
        pd,
        random,
        requests,
        time,
    )


@app.cell
def _(logging):
    logging.basicConfig(level=logging.DEBUG)
    logging.info(f"Executing {__file__}...")
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


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    # Load Data

    For more information on how to load data from WFS, see this page [Geodienste - Kanton Basel-Stadt](https://www.bs.ch/bvd/grundbuch-und-vermessungsamt/geo/geodaten/geodienste#wfsbs)
    """
    )
    return


@app.cell
def _():
    url_wfs = "https://wfs.geo.bs.ch/"
    return (url_wfs,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""## Load [Bodenbedeckungen](https://map.geo.bs.ch/?lang=de&baselayer_ref=Grundkarte%20grau&tree_groups=Bodenbedeckung&map_x=2611402&map_y=1267654&map_zoom=4&tree_group_layers_Bodenbedeckung=BS_Bodenbedeckungen_befestigt_Bahnareal%2CBS_Bodenbedeckungen_befestigt_Fabrikareal%2CBS_Bodenbedeckungen_befestigt_Gewaesservorland%2CBS_Bodenbedeckungen_befestigt_Hafenareal%2CBS_Bodenbedeckungen_befestigt_Sportanlage%2CBS_Bodenbedeckungen_befestigt_StrasseWeg%2CBS_Bodenbedeckungen_befestigt_Tramareal%2CBS_Bodenbedeckungen_befestigt_Trottoir%2CBS_Bodenbedeckungen_befestigt_Verkehrsinsel%2CBS_Bodenbedeckungen_befestigt_Wasserbecken%2CBS_Bodenbedeckungen_befestigt_uebrigeBefestigte%2CBS_Bodenbedeckungen_bestockt_geschlossenerWald%2CBS_Bodenbedeckungen_bestockt_uebrigeBestockte%2CBS_Bodenbedeckungen_Gebaeude_Gebaeude%2CBS_Bodenbedeckungen_Gebaeude_Tank%2CBS_Bodenbedeckungen_Gewaesser_fliessendes%2CBS_Bodenbedeckungen_Gewaesser_stehendes%2CBS_Bodenbedeckungen_humusiert_AckerWieseWeide%2CBS_Bodenbedeckungen_humusiert_Friedhof%2CBS_Bodenbedeckungen_humusiert_Gartenanlage%2CBS_Bodenbedeckungen_humusiert_ParkanlageSpielplatz%2CBS_Bodenbedeckungen_humusiert_Schrebergarten%2CBS_Bodenbedeckungen_humusiert_SportanlageHumusiert%2CBS_Bodenbedeckungen_humusiert_Tierpark%2CBS_Bodenbedeckungen_humusiert_Reben%2CBS_Bodenbedeckungen_humusiert_Intensivkultur%2CBS_Bodenbedeckungen_humusiert_Gewaesservorland%2CBS_Bodenbedeckungen_humusiert_uebrigeHumusierte)""")
    return


@app.cell
def _(load_data_from_wfs, url_wfs):
    gdf_bodenbedeckung = load_data_from_wfs(url_wfs, prefix="ms:BS_Bodenbedeckungen")
    gdf_bodenbedeckung = gdf_bodenbedeckung.reset_index(drop=True).assign(laufnr=lambda df: df.index + 1)
    gdf_bodenbedeckung
    return (gdf_bodenbedeckung,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""## Load [Gebäudekategorien](https://map.geo.bs.ch/?lang=de&baselayer_ref=Grundkarte%20grau&tree_groups=Geb%C3%A4udeinformationen&map_x=2611402&map_y=1267654&map_zoom=4&tree_group_layers_Geb%C3%A4udeinformationen=DM_Gebaeudeinformationen_DatenmarktGebaeudekategorie)""")
    return


@app.cell
def _(load_data_from_wfs, url_wfs):
    gdf_gebaeudekategorie = load_data_from_wfs(url_wfs, shapes_to_load=['DM_Gebaeudeinformationen_DatenmarktGebaeudekategorie'])
    gdf_gebaeudekategorie
    return (gdf_gebaeudekategorie,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""## Load [Öffentlicher Raum](https://map.geo.bs.ch/?lang=de&baselayer_ref=Grundkarte%20grau&tree_groups=%C3%96ffentlicher%20Raum&map_x=2611402&map_y=1267654&map_zoom=4&tree_group_layers_%C3%96ffentlicher%20Raum=OR_OeffentlicherRaum)""")
    return


@app.cell
def _(load_data_from_wfs, url_wfs):
    gdf_oeffentlicher_raum = load_data_from_wfs(url_wfs, shapes_to_load=['OR_OeffentlicherRaum_Allmend', 'OR_OeffentlicherRaum_Noerg'])
    gdf_oeffentlicher_raum
    return (gdf_oeffentlicher_raum,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""# Transform and Merge Date""")
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""## Merge Gebäude from Bodenbedeckungen with Gebäudekategorie""")
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


@app.cell
def _(mo):
    mo.md(r"""## Compute öffentlicher Raum for the remaining "befestigte".""")
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


@app.cell
def _(gdf_all, pd):
    gdf = gdf_all.copy()

    code2de = {
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

    # Fallback from bs_art_txt: "." -> " - ", "_" -> " "
    def clean_bs_art(s):
        if pd.isna(s): return None
        s = str(s)
        return s.replace(".", " - ").replace("_", " ")

    # normalize codes to strings without decimals
    def norm_code(x):
        if pd.isna(x): return None
        if isinstance(x, (int,)): return str(x)
        if isinstance(x, float):  return str(int(x))
        return str(x).strip()

    # start with fallback from bs_art_txt
    gdf["nutzung"] = gdf["bs_art_txt"].map(clean_bs_art)

    # Gebäude mapping (overrides)
    gdf["_code"] = gdf[COL_CODE].apply(norm_code) if COL_CODE in gdf.columns else None
    has_code = gdf["_code"].notna() if COL_CODE in gdf.columns else pd.Series(False, index=gdf.index)
    gdf.loc[has_code, "nutzung"] = "Gebäude - " + gdf.loc[has_code, "_code"].map(lambda c: code2de.get(c, c))

    # Öffentlicher Raum for TARGET_BB (overrides fallback, but not Gebäude)
    if COL_OR in gdf.columns:
        mask_ps = (gdf["bs_art_txt"] == TARGET_BB) & gdf[COL_OR].notna() & ~has_code
        gdf.loc[mask_ps, "nutzung"] = "befestigt - uebrige befestigte - " + gdf.loc[mask_ps, COL_OR].astype(str)

    gdf = gdf.drop(columns=[c for c in ["_code"] if c in gdf.columns])
    gdf = gdf.to_crs(4326)
    gdf.to_file("landuse.geojson", driver="GeoJSON", layer='landuse-data')
    gdf
    return


if __name__ == "__main__":
    app.run()
