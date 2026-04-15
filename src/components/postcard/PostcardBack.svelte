<script>
  import { base } from "$app/paths";
  import { browser } from "$app/environment";
  import { dimensions, areaSizes, lang, postcardBackMapDiskReady } from "$lib/stores.js";
  import { categories } from "$lib/settings";
  import {
    PIE_OUTER_R,
    renderLandusePieIntoGroup,
  } from "$lib/postcardBackPie.js";
  import { applyMapDiskToPostcardBackImage } from "$lib/postcardMapDisk.js";

  import plexSansCss from "$assets/postcard-back-plex-sans-only.css.txt?raw";
  import firaMonoCss from "$assets/postcard-back-font-fira-mono.txt?raw";

  import en from "$locales/en.json";
  import de from "$locales/de.json";

  const width = $dimensions[1];
  const height = $dimensions[0];

  /** viewBox 0..630 × 0..444 matches width×height mm: 148 × 105 */
  const MM_W = 148;
  const MM_H = 105;
  const VB_W = 630;
  const VB_H = 444;
  /** @param {number} mm */
  function xMm(mm) {
    return (mm / MM_W) * VB_W;
  }
  /** @param {number} mm */
  function yMm(mm) {
    return (mm / MM_H) * VB_H;
  }

  /** Map disk: top 5 mm, center shifted 8 mm right of vertical midline; diameter unchanged (2×PIE_OUTER_R) */
  const MID_X = VB_W / 2;
  const DISK_TOP = yMm(5);
  const DISK_CX = MID_X + xMm(8);
  const DISK_SIZE = PIE_OUTER_R * 2;
  const DISK_X = DISK_CX - PIE_OUTER_R;
  const DISK_CY = DISK_TOP + PIE_OUTER_R;

  /** Left: rule at 70 mm from top, from 4 mm, length 62 mm */
  const LEFT_RULE_Y = yMm(70);
  const LEFT_TEXT_X = xMm(4);
  const LEFT_TEXT_W = xMm(62);
  const LEFT_TEXT_Y = yMm(71);
  /** Tighter headline column + slightly smaller gap before legend (legend sits a bit higher). */
  const HEADLINE_BOX_H = yMm(13);
  const HEADLINE_LEGEND_GAP = yMm(2.5);
  const LEGEND_TOP = LEFT_TEXT_Y + HEADLINE_BOX_H + HEADLINE_LEGEND_GAP;
  /** Legend fills to bottom of card — row height derived from remaining space */
  const LEGEND_H = VB_H - LEGEND_TOP;
  /** Second legend column aligned at 36 mm from left; first column at 4 mm */
  const LEGEND_COL2_X = xMm(36) - xMm(4);

  /** Frankieren: 5 mm top & right, 21 × 28 mm */
  const STAMP_W = xMm(21);
  const STAMP_H = yMm(28);
  const STAMP_X = VB_W - xMm(5) - STAMP_W;
  const STAMP_Y = yMm(5);

  /** Address lines: 5 mm from right, y at 47 / 59 / 71 mm, length 63 mm */
  const ADDR_RIGHT = VB_W - xMm(5);
  const ADDR_LEFT = ADDR_RIGHT - xMm(63);
  const ADDR_Y1 = yMm(47);
  const ADDR_Y2 = yMm(59);
  const ADDR_Y3 = yMm(71);

  /** QR: 7 mm right of vertical center, 15×15 mm, 3 mm from bottom */
  const QR_SIZE = xMm(15);
  const QR_X = MID_X + xMm(7);
  const QR_Y = VB_H - yMm(3) - QR_SIZE;

  /** URL + blurb: to the right of QR, aligned with QR row; text slightly smaller */
  const PROMO_GAP = xMm(4);
  const PROMO_X = QR_X + QR_SIZE + PROMO_GAP;
  const PROMO_W = VB_W - xMm(5) - PROMO_X;

  let appText = {};
  $: {
    if ($lang === "en") {
      appText = en;
    } else {
      appText = de;
    }
  }

  $: categoryEntries = Object.values(categories);
  $: leftColumn = categoryEntries.slice(
    0,
    Math.ceil(categoryEntries.length / 2),
  );
  $: rightColumn = categoryEntries.slice(Math.ceil(categoryEntries.length / 2));

  const LEGEND_MONO = '"Fira Mono", ui-monospace, monospace';

  /** Rows packed into 20 mm legend band */
  $: legendRowCount = Math.max(leftColumn.length, rightColumn.length);
  $: legendRowH =
    legendRowCount > 0 ? LEGEND_H / legendRowCount : LEGEND_H;
  /** Slightly tighter row step so bigger labels can still fit. */
  const LEGEND_ROW_COMPACT = 0.86;
  $: legendRowStep = legendRowH * LEGEND_ROW_COMPACT;

  let pieGroup;
  let diskDebounce;

  $: if (browser && $areaSizes !== undefined) {
    clearTimeout(diskDebounce);
    diskDebounce = setTimeout(() => {
      applyMapDiskToPostcardBackImage();
    }, 260);
  }

  $: if (browser && pieGroup && !$postcardBackMapDiskReady) {
    renderLandusePieIntoGroup(pieGroup, $areaSizes, categories);
  }
</script>

<svg
  encoding="UTF-8"
  version="1.0"
  width="{width}mm"
  height="{height}mm"
  viewBox="0 0 630 444"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  id="postcardBack"
  style="print-color-adjust: exact;"
>
  <rect x="0" y="0" width="630" height="444" fill="#fff" />

  <defs>
    <style type="text/css">
      {@html firaMonoCss}
      {@html plexSansCss}
    </style>
  </defs>

  <!-- Vertical center -->
  <line
    x1={MID_X}
    y1={yMm(5)}
    x2={MID_X}
    y2={VB_H - yMm(3)}
    stroke="#292929"
    stroke-width="0.55"
  />

  <!-- Left column: first horizontal rule -->
  <line
    x1={LEFT_TEXT_X}
    y1={LEFT_RULE_Y}
    x2={LEFT_TEXT_X + xMm(62)}
    y2={LEFT_RULE_Y}
    stroke="#292929"
    stroke-width="0.75"
  />

  <!-- Logo: top-left, slightly larger and shifted up -->
  <image
    href="{base}/Stat_Amt_Logo.svg"
    x="0"
    y="-9"
    width="150"
    height="75"
    preserveAspectRatio="xMidYMid meet"
  />

  <!-- Live map disk / pie fallback -->
  <image
    id="postcard-back-map-disk"
    x={DISK_X}
    y={DISK_TOP}
    width={DISK_SIZE}
    height={DISK_SIZE}
    preserveAspectRatio="xMidYMid slice"
    opacity={$postcardBackMapDiskReady ? 1 : 0}
  />

  <g visibility={$postcardBackMapDiskReady ? "hidden" : "visible"}>
    <g
      id="postcard-back-landuse-pie"
      bind:this={pieGroup}
      transform="translate({DISK_CX}, {DISK_CY})"
    />
  </g>

  <!-- Headline: fixed-height box (squished lines); gap mm before legend -->
  <foreignObject
    x={LEFT_TEXT_X}
    y={LEFT_TEXT_Y}
    width={LEFT_TEXT_W}
    height={HEADLINE_BOX_H}
  >
    <div
      xmlns="http://www.w3.org/1999/xhtml"
      style="margin:0;padding:0;font-size:15px;line-height:1.18;color:#292929;font-family:'IBM Plex Sans Text',sans-serif;"
    >
      {appText.postcard.back.headline}
    </div>
  </foreignObject>

  <!-- Legend: larger swatches + labels, positioned slightly higher -->
  <g transform="translate({LEFT_TEXT_X}, {LEGEND_TOP})">
    {#each leftColumn as { color, name, name_en }, i}
      {@const cy = i * legendRowStep + legendRowStep / 2}
      {@const sh = Math.min(12, legendRowStep * 0.58)}
      <rect
        x="0"
        y={cy - sh / 2}
        width="20"
        height={sh}
        rx="1"
        fill={color}
      />
      <text
        x="25"
        y={cy}
        text-anchor="start"
        dominant-baseline="middle"
        font-family={LEGEND_MONO}
        font-size="8.4"
        fill="#292929">{$lang == "en" ? name_en : name}</text
      >
    {/each}

    {#each rightColumn as { color, name, name_en }, i}
      {@const cy = i * legendRowStep + legendRowStep / 2}
      {@const sh = Math.min(12, legendRowStep * 0.58)}
      <rect
        x={LEGEND_COL2_X}
        y={cy - sh / 2}
        width="20"
        height={sh}
        rx="1"
        fill={color}
      />
      <text
        x={LEGEND_COL2_X + 25}
        y={cy}
        text-anchor="start"
        dominant-baseline="middle"
        font-family={LEGEND_MONO}
        font-size="8.4"
        fill="#292929">{$lang == "en" ? name_en : name}</text
      >
    {/each}
  </g>

  <!-- Frankieren -->
  <rect
    x={STAMP_X}
    y={STAMP_Y}
    width={STAMP_W}
    height={STAMP_H}
    fill="transparent"
    stroke="rgb(0, 0, 0)"
    stroke-width="0.75"
    stroke-dasharray="3 3"
  />

  <!-- Address lines: horizontal, 63 mm, 5 mm from right -->
  <line
    x1={ADDR_LEFT}
    y1={ADDR_Y1}
    x2={ADDR_RIGHT}
    y2={ADDR_Y1}
    stroke="rgb(0,0,0)"
    stroke-width="0.5"
  />
  <line
    x1={ADDR_LEFT}
    y1={ADDR_Y2}
    x2={ADDR_RIGHT}
    y2={ADDR_Y2}
    stroke="rgb(0,0,0)"
    stroke-width="0.5"
  />
  <line
    x1={ADDR_LEFT}
    y1={ADDR_Y3}
    x2={ADDR_RIGHT}
    y2={ADDR_Y3}
    stroke="rgb(0,0,0)"
    stroke-width="0.5"
  />

  <!-- QR: 7 mm right of center vertical, 15×15 mm, 3 mm from bottom -->
  <image
    href="{base}/qr.png"
    x={QR_X}
    y={QR_Y}
    width={QR_SIZE}
    height={QR_SIZE}
    preserveAspectRatio="xMidYMid meet"
  />

  <!-- URL + blurb: same vertical band as QR (bottom 3 mm), smaller type -->
  <foreignObject x={PROMO_X} y={QR_Y} width={PROMO_W} height={QR_SIZE}>
    <div
      xmlns="http://www.w3.org/1999/xhtml"
      style="height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;gap:4px;margin:0;padding:0;font-family:'IBM Plex Sans Text',sans-serif;color:#292929;box-sizing:border-box;"
    >
      <div style="font-size:8.5px;font-weight:600;line-height:1.2;">
        {appText.postcard.back.urlLine}
      </div>
      <div style="font-size:7.3px;line-height:1.35;max-width:100%;">
        {appText.postcard.back.promoBlurb}
      </div>
    </div>
  </foreignObject>
</svg>
