# Quartierfarben, aka Grätzlfarben, aka Kiezcolors

*Quartierfarben* is a map based tool that creates a postcard showing the landuse distribution in your neighborhood in Basel-Stadt. It is based on the [Kiezcolors](https://kiezcolors.odis-berlin.de) tool of the [Open Data Informationsstelle Berlin](https://odis-berlin.de/) and the [Grätzlfarben](https://cartolab.at/graetzlfarben/) of the [TU Wien](https://cartography.tuwien.ac.at/).
By zooming in and out you can pick a location and position it inside the circle. *Quartierfarben* then maps the individual areas onto a tree map diagram.
You can print the resulting motive as a postcard and share it!

## Tech stack

This website is a [Svelte](https://svelte.dev/) app. The map is rendered using [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) with vector tiles, and the analysis is done using [Turf.js](https://turfjs.org/). The app is built as a fully static app and does not require any active server technology.

## Developing

Install dependencies by running:

```bash
npm install
```

Start a development server by running:

```bash
npm run dev
```

or start the server and open the app in a new browser tab

```bash
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

To deploy your app, simply copy the `build` folder to your web server.

## Data & Processing

The data processing was done in Python and marimo. 

Check it out on molab: [![Open in molab](https://molab.marimo.io/molab-shield.png)](https://molab.marimo.io/notebooks/nb_SEKYjCXDo7Ujz1tCHYiiDg)

### Sources (WFS)
All datasets are retrieved from the Canton Basel-Stadt WFS using robust requests with retries and backoff.

| Theme | WFS layer(s) / prefix | Key fields used |
|---|---|---|
| **Bodenbedeckung (land cover)** | `ms:BS_Bodenbedeckungen*` | `bs_art_txt`, `gml_id`, `geometry` |
| **Gebäudekategorien** | `DM_Gebaeudeinformationen_DatenmarktGebaeudekategorie` | `gebaeudekategorieid`, `geometry` |
| **Öffentlicher Raum** | `OR_OeffentlicherRaum_Allmend`, `OR_OeffentlicherRaum_Noerg` | `geometry` |
| **Kultur (POI)** | `BI_KulturUnterhaltung` | `bi_subkategorie`, `geometry` |
| **Schulstandorte** (Basel) | `ms:SC*` | `sc_schultyp`, `geometry` |
| **Schulstandorte** (Riehen/Bettingen) | `ms:SO*` | `so_schultyp`, `geometry` |

### Retrieval
- Capabilities via OWSLib; features via `GetFeature` (preferring GeoJSON, falling back to GML).
- Jittered requests + retries to avoid rate-limits/outages.
- Working CRS for geometry ops: **LV95 (EPSG:2056)**.

### Pipeline (high-level)
1. **Bodenbedeckung base layer**  
   - Load all `ms:BS_Bodenbedeckungen*`.  
   - Add a sequential `laufnr` (1-based) to ensure row-unique IDs.

2. **Attach building categories (Gebäudekategorien → Gebäude)**  
   - Filter buildings: `bs_art_txt == "Gebaeude.Gebaeude"`.  
   - `sjoin(intersects)` to attach `gebaeudekategorieid`.  
   - If a building hits **multiple** categories, resolve by **largest % area overlap** (intersection area ÷ building area).  
   - Map `gebaeudekategorieid` to German labels and construct `nutzung = "Gebäude - <Label>"`.

3. **Classify public space for “übrige befestigte”**  
   - Dissolve `OR_OeffentlicherRaum_*` into a single geometry.  
   - For `bs_art_txt == "befestigt.uebrige_befestigte.uebrige_befestigte"`, compute coverage % inside public space.  
   - Threshold = **50 %** (configurable).  
   - Add `oeffentlicher_raum_pct` and label `öffentlicher Raum` vs `kein öffentlicher Raum`.  
   - For these features (only), if no building category applies, set  
     `nutzung = "befestigt - uebrige befestigte - <öffentlicher Raum|kein öffentlicher Raum>"`.  
   - Otherwise (general fallback), `nutzung` = cleaned `bs_art_txt` (dots → ` - `, underscores → space).

4. **Kultur overrides (nearest point → building)**  
   - From `BI_KulturUnterhaltung` points: nearest-building join in LV95.  
   - **Max distance = 50 m**.  
   - Where matched building exists, override  
     `nutzung = "Gebäude - <bi_subkategorie>"`.

5. **Schulstandorte overrides (points **inside** buildings only)**  
   - Prepare points:  
     - Basel (`ms:SC*`): convert non-point geometries to **centroids**.  
     - Riehen/Bettingen (`ms:SO*`): use as-is.  
     - Build unified `schultyp` (`sc_schultyp` or `so_schultyp`).  
     - Concatenate to `gdf_schulstandorte`.  
   - Nearest-building join with **MAX_DISTANCE = 0 m** (point must lie inside the building).  
   - Where matched, final override:  
     `nutzung = "Gebäude - <schultyp>"`.  
   - (School overrides take precedence over Kultur where both apply.)

6. **Export**  
   - Reproject to **WGS84 (EPSG:4326)**. Necessary for `tippecanoe`
   - Write `landuse.geojson`.

### Tiles (Vector MBTiles/PMTiles directory)
Tiles are generated with `tippecanoe`.
This command can vary on the size of your city/region.

```bash
tippecanoe \
  --output-to-directory ./static/tiles \
  --layer landuse-data \
  --force --no-tile-compression \
  --minimum-zoom=12 --maximum-zoom=17 \
  --full-detail=17 --low-detail=12 \
  --no-tiny-polygon-reduction \
  --detect-shared-borders \
  --extend-zooms-if-still-dropping \
  --no-feature-limit --no-tile-size-limit \
  ./{input-file}.geojson
```

* Rebuilt daily at **05:00 UTC** via GitHub Actions.
* Uses `uv` to execute the marimo script (PEP-723 header drives Python & deps), then runs `tippecanoe`, and commits `static/tiles/`.

### Notes & Limitations

* WFS services may rate-limit or briefly refuse connections. The loader retries with backoff and polite jitter between layer requests.
* Ambiguous building category joins are resolved by **largest percent area**, not absolute area; adjust to taste.
* Distance thresholds: Kultur **50 m**, Schulen **0 m (inside)**—both configurable.
* All spatial analysis in **EPSG:2056**; export in **EPSG:4326** for tippecanoe.

## Data Licence

The landuse data *Bodenbedeckung* and all other data used in this project can be downloaded [in the Dataportal](https://data.bs.ch/) or via WFS [from the Geopotal](https://www.bs.ch/bvd/grundbuch-und-vermessungsamt/geo/geodaten/geodienste#wfsbs) of the Canton of Basel-Stadt and is licenced under CC BY 4.0 + OpenStreetMap.

## Adapting to your city

The application is built to be easily implemented in other cities if suitable data is available. All variables to be adapted can be found in [`src/lib/settings.js`](src/lib/settings.js). The categories and colors can be changed in [`src/lib/colors.json`](src/lib/settings.json)
The texts can be changed in ['src/locales](src/locales/). Images and tiles have to be exchanged in ['src/static'](src/static).
The polygon for the right bottom of the card can be changed in [`src/lib/borders.js`](src/lib/borders.js).

## Kiosk mode

For use in public settings, Quartierfarben can be run in "kiosk mode", which offers a single print button instead of download buttons for the postcard images. Only printing the postcard front (the treemap visualizaton) is supported in kiosk mode -- it is assumed that postcards pre-printed with the back side are provided on site.

To activate kiosk mode in the app, append the `?kiosk` url parameter *before* the `#` sign in the url, for example:

```
opendatabs.github.io/quartierfarben?kiosk#13/48.20996/16.3704
```

You can start most browsers in kiosk mode, which causes the app to be displayed in full screen, disables any user interface elements, and supports printing without showing a dialog. E.g. for Firefox, the command to launch the app in kiosk mode would be:

```
"C:\Program Files\Mozilla Firefox\firefox.exe" -kiosk -private-window https://cartolab.at/graetzlfarben/?kiosk
```

## Contributing

Before you create a pull request, write an issue so we can discuss your changes.

## Contributors

ODIS Berlin / CityLAB Berlin has made the biggest contribution by developing and coding the initial [Kiezcolors](https://kiezcolors.odis-berlin.de) tool. On part of the research unit cartography at TU Wien, [Ester Scheck](https://github.com/ester-t-s) and [Florian Ledermann](https://github.com/floledermann) mostly worked on the code and the documentation while Sacha Schlumpf and Andrea Binn supported with feedback and brainstorming ideas.

## Contact

If you have any questions, please contact [opendata@bs.ch](mailto:opendata@bs.ch)


## Content Licensing

Texts and content available as [CC BY](https://creativecommons.org/licenses/by/3.0/de/).


## Related Projects

[Kiezcolors Berlin](https://kiezcolors.odis-berlin.de)
