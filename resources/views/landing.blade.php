<!DOCTYPE html>
<html lang="uz"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>1mahalla — Mahallangizni bitta ilovada boshqaring</title>
<meta name="description" content="1mahalla — mulk boshqaruvi, arizalar, hisob-kitoblar va aholi bilan aloqani bitta ilovada birlashtiruvchi platforma. Excel, Telegram va daftarlarga endi ehtiyoj yo'q.">
<link rel="canonical" href="{{ url('/') }}">
<meta property="og:type" content="website">
<meta property="og:locale" content="uz_UZ">
<meta property="og:title" content="1mahalla — Mahallangizni bitta ilovada boshqaring">
<meta property="og:description" content="Mulk boshqaruvi, arizalar, hisob-kitoblar va aholi bilan aloqani bitta ilovada birlashtiruvchi platforma.">
<meta property="og:url" content="{{ url('/') }}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>/* cyrillic-ext */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/landing/ba9a7c6d-dc37-49bb-a5c5-bff30d15133f.woff2") format('woff2');
  unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}
/* vietnamese */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/landing/8f747c5d-1544-4c89-a280-1f3499e8b727.woff2") format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}
/* latin-ext */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/landing/33acface-d071-455c-b495-17469ef038f5.woff2") format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
/* latin */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/landing/107bb2fc-6be9-4259-934e-32d3282c42ae.woff2") format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
/* cyrillic-ext */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/fonts/landing/ba9a7c6d-dc37-49bb-a5c5-bff30d15133f.woff2") format('woff2');
  unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}
/* vietnamese */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/fonts/landing/8f747c5d-1544-4c89-a280-1f3499e8b727.woff2") format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}
/* latin-ext */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/fonts/landing/33acface-d071-455c-b495-17469ef038f5.woff2") format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
/* latin */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/fonts/landing/107bb2fc-6be9-4259-934e-32d3282c42ae.woff2") format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
/* cyrillic-ext */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("/fonts/landing/ba9a7c6d-dc37-49bb-a5c5-bff30d15133f.woff2") format('woff2');
  unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}
/* vietnamese */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("/fonts/landing/8f747c5d-1544-4c89-a280-1f3499e8b727.woff2") format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}
/* latin-ext */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("/fonts/landing/33acface-d071-455c-b495-17469ef038f5.woff2") format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
/* latin */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("/fonts/landing/107bb2fc-6be9-4259-934e-32d3282c42ae.woff2") format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
/* cyrillic-ext */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("/fonts/landing/ba9a7c6d-dc37-49bb-a5c5-bff30d15133f.woff2") format('woff2');
  unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}
/* vietnamese */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("/fonts/landing/8f747c5d-1544-4c89-a280-1f3499e8b727.woff2") format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}
/* latin-ext */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("/fonts/landing/33acface-d071-455c-b495-17469ef038f5.woff2") format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
/* latin */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("/fonts/landing/107bb2fc-6be9-4259-934e-32d3282c42ae.woff2") format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
/* cyrillic-ext */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 800;
  font-display: swap;
  src: url("/fonts/landing/ba9a7c6d-dc37-49bb-a5c5-bff30d15133f.woff2") format('woff2');
  unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}
/* vietnamese */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 800;
  font-display: swap;
  src: url("/fonts/landing/8f747c5d-1544-4c89-a280-1f3499e8b727.woff2") format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}
/* latin-ext */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 800;
  font-display: swap;
  src: url("/fonts/landing/33acface-d071-455c-b495-17469ef038f5.woff2") format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
/* latin */
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 800;
  font-display: swap;
  src: url("/fonts/landing/107bb2fc-6be9-4259-934e-32d3282c42ae.woff2") format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
/* cyrillic-ext */
@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/landing/a2271568-8160-427c-9e78-1fba02700ce6.woff2") format('woff2');
  unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}
/* cyrillic */
@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/landing/d3b79471-4853-4c4c-a673-0c1d5cb814f4.woff2") format('woff2');
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}
/* vietnamese */
@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/landing/af98e30f-4680-4efd-bea6-223e63f7c573.woff2") format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}
/* latin-ext */
@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/landing/b6505a28-3bc8-4782-8343-47f2e15fc6f5.woff2") format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
/* latin */
@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/landing/cd3f374a-18e5-49a0-9a14-29cffac4636c.woff2") format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
/* cyrillic-ext */
@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/fonts/landing/750d5570-9991-497f-8e1f-643ee86f0eef.woff2") format('woff2');
  unicode-range: U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F;
}
/* cyrillic */
@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/fonts/landing/dc1a3d89-320d-4aec-a5d5-94892e2d7117.woff2") format('woff2');
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}
/* vietnamese */
@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/fonts/landing/be1a8954-84df-4a69-accd-51d8dbb7b602.woff2") format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}
/* latin-ext */
@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/fonts/landing/812347da-6026-4e34-8bd1-13ce97a4a6e4.woff2") format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
/* latin */
@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/fonts/landing/7e3d4a94-102c-4a3c-9d02-7713e0feebf7.woff2") format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
</style>
<style>
:root{
  --ink:#19271D; --ink-soft:#586860; --ink-faint:#94A299;
  --clay:#1E9E57; --clay-deep:#15803F; --clay-tint:#E3F3E9;        /* primary = emerald (app match) */
  --green:#52805C; --green-deep:#3A5E42; --green-tint:#E5EFE6;     /* secondary muted sage */
  --amber:#D98A3A; --amber-deep:#B26A20; --amber-tint:#F7E8D2;     /* sparing accent for problem/alert */
  --cream:#F6F9F4; --sand:#E9F1E7; --sand-deep:#D6E3D4;
  --white:#FFFFFF;
  --line:rgba(25,39,29,0.11);
  --line-soft:rgba(25,39,29,0.06);
  --shadow-sm:0 1px 2px rgba(25,39,29,0.05), 0 2px 8px rgba(25,39,29,0.04);
  --shadow:0 4px 14px rgba(25,39,29,0.07), 0 18px 50px -22px rgba(25,39,29,0.20);
  --shadow-lg:0 12px 40px -8px rgba(25,39,29,0.16), 0 40px 90px -40px rgba(21,124,69,0.28);
  --r-sm:10px; --r:16px; --r-lg:22px; --r-xl:28px;
  --maxw:1180px;
}
*{box-sizing:border-box;}
html{scroll-behavior:smooth;}
body{
  margin:0; background:var(--cream); color:var(--ink);
  font-family:'Hanken Grotesk',system-ui,sans-serif; font-weight:500;
  font-size:17px; line-height:1.55; -webkit-font-smoothing:antialiased;
  letter-spacing:-0.005em;
}
h1,h2,h3,h4{font-weight:800; letter-spacing:-0.03em; line-height:1.05; margin:0;}
p{margin:0;}
a{color:inherit; text-decoration:none;}
img,svg{display:block;}
.mono{font-family:'IBM Plex Mono',monospace; font-weight:500;}

.wrap{max-width:var(--maxw); margin:0 auto; padding:0 32px;}
.section{padding:104px 0;}
.kicker{font-family:'IBM Plex Mono',monospace; font-weight:500; font-size:12.5px; letter-spacing:0.16em; text-transform:uppercase; color:var(--clay-deep); display:inline-flex; align-items:center; gap:10px;}
.kicker::before{content:""; width:22px; height:2px; background:var(--clay); border-radius:2px;}
.kicker.center{justify-content:center;}
.eyebrow-wrap{display:flex; flex-direction:column; gap:18px; max-width:620px;}
.eyebrow-wrap.center{margin:0 auto; text-align:center; align-items:center;}
.lead{color:var(--ink-soft); font-size:18.5px; line-height:1.55;}

/* icons */
.ic{width:22px; height:22px; stroke:currentColor; stroke-width:1.75; fill:none; stroke-linecap:round; stroke-linejoin:round; flex:none;}

/* buttons */
.btn{display:inline-flex; align-items:center; gap:9px; font-weight:700; font-size:16px; letter-spacing:-0.01em; padding:14px 22px; border-radius:var(--r-sm); border:1.5px solid transparent; cursor:pointer; transition:transform .18s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease; white-space:nowrap;}
.btn .ic{width:18px; height:18px;}
.btn-primary{background:var(--clay); color:var(--white); box-shadow:0 6px 18px -6px rgba(21,124,69,0.45);}
.btn-primary:hover{background:var(--clay-deep); transform:translateY(-2px); box-shadow:0 12px 26px -8px rgba(21,124,69,0.5);}
.btn-ghost{background:transparent; color:var(--ink); border-color:var(--line);}
.btn-ghost:hover{border-color:var(--ink); transform:translateY(-2px);}
.btn-light{background:var(--cream); color:var(--ink);}
.btn-light:hover{transform:translateY(-2px); box-shadow:0 12px 26px -8px rgba(0,0,0,0.4);}
.btn-lg{padding:17px 28px; font-size:17px;}

/* ============ NAV ============ */
.nav{position:sticky; top:0; z-index:50; background:rgba(251,247,239,0.82); backdrop-filter:saturate(160%) blur(14px); border-bottom:1px solid transparent; transition:border-color .3s, box-shadow .3s;}
.nav.scrolled{border-color:var(--line); box-shadow:0 1px 0 var(--line-soft);}
.nav-in{display:flex; align-items:center; gap:34px; height:74px;}
.brand{display:flex; align-items:center; gap:12px;}
.brand-tile{width:40px; height:40px; border-radius:11px; background:var(--clay); display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px -3px rgba(21,124,69,0.42);}
.brand-wm{font-weight:800; letter-spacing:-0.035em; font-size:23px; color:var(--ink);}
.brand-wm b{color:var(--clay); font-weight:800;}
.nav-links{display:flex; gap:30px; margin-left:8px;}
.nav-links a{font-size:15.5px; font-weight:600; color:var(--ink-soft); transition:color .15s;}
.nav-links a:hover{color:var(--ink);}
.nav-cta{margin-left:auto; display:flex; align-items:center; gap:14px;}
.nav-login{font-size:15.5px; font-weight:700; color:var(--ink);}
.nav-burger{display:none; margin-left:auto; background:none; border:1.5px solid var(--line); border-radius:10px; padding:9px; cursor:pointer; color:var(--ink);}

/* ============ HERO ============ */
.hero{position:relative; overflow:hidden; padding:72px 0 96px;}
.hero::before{content:""; position:absolute; inset:0; z-index:0;
  background:
    radial-gradient(900px 500px at 78% 8%, rgba(30,158,87,0.12), transparent 60%),
    radial-gradient(700px 460px at 10% 90%, rgba(82,128,92,0.10), transparent 60%);
  pointer-events:none;}
.hero-grid{position:relative; z-index:1; display:grid; grid-template-columns:1.02fr 1fr; gap:56px; align-items:center;}
.hero h1{font-size:clamp(40px,5.2vw,62px); letter-spacing:-0.04em;}
.hero h1 .hl{color:var(--clay); position:relative; white-space:nowrap;}
.hero .lead{margin-top:22px; max-width:520px;}
.hero-cta{display:flex; gap:14px; margin-top:34px; flex-wrap:wrap;}
.hero-trust{display:flex; align-items:center; gap:18px; margin-top:34px; flex-wrap:wrap;}
.trust-ava{display:flex;}
.trust-ava span{width:34px; height:34px; border-radius:50%; border:2px solid var(--cream); margin-left:-9px; background:var(--sand-deep); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:var(--ink-soft);}
.trust-ava span:first-child{margin-left:0;}
.trust-txt{font-size:14.5px; color:var(--ink-soft); line-height:1.35;}
.trust-txt b{color:var(--ink);}
.hero-pill{display:inline-flex; align-items:center; gap:9px; background:var(--white); border:1px solid var(--line); border-radius:100px; padding:7px 7px 7px 14px; font-size:14px; font-weight:600; color:var(--ink-soft); box-shadow:var(--shadow-sm); margin-bottom:24px;}
.hero-pill .tag{background:var(--green-tint); color:var(--green-deep); border-radius:100px; padding:3px 10px; font-size:12px; font-weight:700;}

/* ===== dashboard mockup ===== */
.mock{position:relative;}
.mock-win{background:var(--white); border:1px solid var(--line); border-radius:18px; box-shadow:var(--shadow-lg); overflow:hidden;}
.mock-bar{display:flex; align-items:center; gap:8px; padding:13px 16px; border-bottom:1px solid var(--line-soft); background:var(--cream);}
.mock-dot{width:10px; height:10px; border-radius:50%;}
.mock-bar .addr{margin-left:12px; font-size:11.5px; color:var(--ink-faint); background:var(--white); border:1px solid var(--line-soft); border-radius:7px; padding:4px 12px; flex:1;}
.mock-body{display:grid; grid-template-columns:64px 1fr; min-height:380px;}
.mock-side{background:var(--ink); padding:16px 12px; display:flex; flex-direction:column; align-items:center; gap:14px;}
.mock-side .si{width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center; color:rgba(251,247,239,0.55);}
.mock-side .si.on{background:var(--clay); color:var(--cream);}
.mock-side .si .ic{width:19px; height:19px;}
.mock-main{padding:18px 20px; display:flex; flex-direction:column; gap:14px; background:var(--cream);}
.mm-head{display:flex; align-items:center; justify-content:space-between;}
.mm-title{font-size:16px; font-weight:800; letter-spacing:-0.02em;}
.mm-sub{font-size:11.5px; color:var(--ink-faint);}
.mm-badge{font-family:'IBM Plex Mono',monospace; font-size:10px; background:var(--green-tint); color:var(--green-deep); padding:4px 9px; border-radius:7px; font-weight:600;}
.mm-row{display:grid; grid-template-columns:1fr 1fr; gap:12px;}
.mm-card{background:var(--white); border:1px solid var(--line-soft); border-radius:13px; padding:13px;}
.mm-k{font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:0.08em; text-transform:uppercase; color:var(--ink-faint);}
.mm-v{font-size:21px; font-weight:800; letter-spacing:-0.03em; margin-top:5px;}
.mm-v small{font-size:12px; color:var(--green-deep); font-weight:700; margin-left:5px;}
.mm-bars{display:flex; align-items:flex-end; gap:6px; height:42px; margin-top:10px;}
.mm-bars i{flex:1; background:var(--sand-deep); border-radius:4px 4px 0 0;}
.mm-bars i.hot{background:var(--clay);}
.mm-floor{background:var(--white); border:1px solid var(--line-soft); border-radius:13px; padding:13px;}
.floor-grid{display:grid; grid-template-columns:repeat(8,1fr); gap:5px; margin-top:10px;}
.floor-grid i{aspect-ratio:1; border-radius:4px; background:var(--green-tint);}
.floor-grid i.sold{background:var(--green);}
.floor-grid i.hold{background:var(--clay); opacity:.85;}
.floor-grid i.free{background:var(--sand);}
.mock-float{position:absolute; background:var(--white); border:1px solid var(--line); border-radius:14px; box-shadow:var(--shadow); padding:13px 15px; display:flex; gap:11px; align-items:center;}
.mock-float .fi{width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex:none;}
.mock-float .fi .ic{width:20px; height:20px;}
.float-ai{right:-26px; top:54px; max-width:230px; animation:floatY 5.5s ease-in-out infinite;}
.float-pay{left:-30px; bottom:48px; animation:floatY 5.5s ease-in-out infinite; animation-delay:-2.75s;}
.float-ai .fi{background:var(--ink); color:var(--clay);}
.float-pay .fi{background:var(--green); color:var(--cream);}
.mf-t{font-size:13.5px; font-weight:700; letter-spacing:-0.01em;}
.mf-s{font-size:11.5px; color:var(--ink-soft); line-height:1.3;}
@keyframes floatY{0%,100%{transform:translateY(0);} 50%{transform:translateY(-9px);}}
@media (prefers-reduced-motion: reduce){.float-ai,.float-pay{animation:none;}}

/* ===== tickets dashboard panel (hero) ===== */
.tk-panel{padding:20px 22px 22px; background:var(--cream);}
.tk-head{display:flex; align-items:flex-start; gap:14px; margin-bottom:18px;}
.tk-title{font-size:19px; font-weight:800; letter-spacing:-0.03em; color:var(--ink);}
.tk-sub{font-size:12.5px; color:var(--ink-faint); margin-top:3px;}
.tk-pills{margin-left:auto; display:flex; gap:6px;}
.tk-pill{font-size:11px; font-weight:700; padding:5px 10px; border-radius:100px; white-space:nowrap; display:flex; align-items:center; gap:5px;}
.tk-pill::before{content:""; width:6px; height:6px; border-radius:50%; background:currentColor;}
.tk-pill.open{background:#FBE7E6; color:#C23A33;}
.tk-pill.prog{background:var(--amber-tint); color:var(--amber-deep);}
.tk-pill.done{background:var(--green-tint); color:var(--green-deep);}
.tk-list{display:flex; flex-direction:column; gap:9px;}
.tk-row{display:flex; align-items:center; gap:13px; background:var(--white); border:1px solid var(--line-soft); border-radius:13px; padding:12px 14px; transition:transform .16s ease, box-shadow .16s ease;}
.tk-row:hover{transform:translateX(3px); box-shadow:var(--shadow-sm);}
.tk-no{font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:600; color:var(--clay-deep); flex:none; width:46px;}
.tk-main{flex:1; min-width:0;}
.tk-name{font-size:14px; font-weight:700; letter-spacing:-0.01em; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.tk-meta{font-size:11.5px; color:var(--ink-faint); margin-top:2px;}
.tk-badge{font-size:10.5px; font-weight:700; padding:3px 8px; border-radius:7px; flex:none;}
.tk-badge.emer{background:#FBE7E6; color:#C23A33;}
.tk-badge.high{background:var(--amber-tint); color:var(--amber-deep);}
.tk-status{font-size:11.5px; font-weight:700; flex:none; display:flex; align-items:center; gap:6px; width:88px;}
.tk-status::before{content:""; width:7px; height:7px; border-radius:50%; background:currentColor;}
.tk-status.s-open{color:#C23A33;}
.tk-status.s-prog{color:var(--amber-deep);}
.tk-status.s-done{color:var(--green-deep);}

.logos{margin-top:64px; display:flex; flex-direction:column; gap:18px; align-items:center;}
.logos-label{font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:0.12em; text-transform:uppercase; color:var(--ink-faint);}
.logos-row{display:flex; gap:40px; align-items:center; justify-content:center; flex-wrap:wrap; opacity:.62;}
.logos-row span{font-weight:800; font-size:19px; letter-spacing:-0.02em; color:var(--ink-soft);}

/* ============ generic section header ============ */
.sec-head{margin-bottom:54px;}
.sec-head h2{font-size:clamp(30px,3.6vw,44px); margin-top:16px;}
.sec-head .lead{margin-top:16px;}

/* ============ PROBLEM -> SOLUTION ============ */
.ps-grid{display:grid; grid-template-columns:1fr 1fr; gap:28px; align-items:stretch;}
.ps-card{border-radius:var(--r-lg); padding:36px; position:relative;}
.ps-problem{background:var(--white); border:1px solid var(--line);}
.ps-solution{background:var(--ink); color:var(--cream);}
.ps-tag{font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:0.14em; text-transform:uppercase; font-weight:600;}
.ps-problem .ps-tag{color:var(--amber-deep);}
.ps-solution .ps-tag{color:var(--clay);}
.ps-card h3{font-size:25px; margin:14px 0 22px;}
.ps-list{display:flex; flex-direction:column; gap:16px;}
.ps-item{display:flex; gap:14px; align-items:flex-start; font-size:16px; line-height:1.45;}
.ps-item .ic{margin-top:2px;}
.ps-problem .ps-item{color:var(--ink-soft);}
.ps-problem .ps-item .ic{color:var(--amber);}
.ps-solution .ps-item{color:rgba(251,247,239,0.82);}
.ps-solution .ps-item .ic{color:var(--green);}
.ps-solution .ps-item b{color:var(--cream); font-weight:700;}

/* ============ MODULE CARDS ============ */
.mods{display:grid; grid-template-columns:1fr 1fr; gap:28px;}
.mod{background:var(--white); border:1px solid var(--line); border-radius:var(--r-xl); padding:38px; transition:transform .25s, box-shadow .25s, border-color .25s; display:flex; flex-direction:column;}
.mod:hover{transform:translateY(-5px); box-shadow:var(--shadow); border-color:transparent;}
.mod-ic{width:54px; height:54px; border-radius:15px; display:flex; align-items:center; justify-content:center; margin-bottom:22px;}
.mod-ic .ic{width:27px; height:27px; stroke-width:1.9;}
.mod-clay .mod-ic{background:var(--clay-tint); color:var(--clay-deep);}
.mod-green .mod-ic{background:var(--green-tint); color:var(--green-deep);}
.mod h3{font-size:26px;}
.mod .tagline{color:var(--ink-soft); margin-top:12px; font-size:16px; line-height:1.5;}
.mod-feats{list-style:none; padding:0; margin:24px 0 0; display:flex; flex-direction:column; gap:13px;}
.mod-feats li{display:flex; gap:12px; align-items:flex-start; font-size:15.5px; color:var(--ink);}
.mod-feats .ic{width:19px; height:19px; margin-top:2px;}
.mod-clay .mod-feats .ic{color:var(--clay);}
.mod-green .mod-feats .ic{color:var(--green);}
.mod-feats b{font-weight:700;}
.mod-feats span{color:var(--ink-soft); font-weight:500;}
.mod-link{margin-top:26px; padding-top:22px; border-top:1px solid var(--line-soft); display:inline-flex; align-items:center; gap:8px; font-weight:700; font-size:15.5px;}
.mod-clay .mod-link{color:var(--clay-deep);}
.mod-green .mod-link{color:var(--green-deep);}
.mod-link .ic{width:17px; height:17px; transition:transform .2s;}
.mod:hover .mod-link .ic{transform:translateX(4px);}

/* ============ AI (dark) ============ */
.ai{background:var(--ink); color:var(--cream); position:relative; overflow:hidden;}
.ai::before{content:""; position:absolute; inset:0; background:radial-gradient(700px 400px at 85% 0%, rgba(30,158,87,0.20), transparent 62%), radial-gradient(620px 420px at 5% 100%, rgba(82,128,92,0.16), transparent 60%);}
.ai .wrap{position:relative; z-index:1;}
.ai .kicker{color:var(--clay);}
.ai .sec-head h2{color:var(--cream);}
.ai .sec-head .lead{color:rgba(251,247,239,0.66);}
.ai-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:22px;}
.ai-card{background:rgba(251,247,239,0.045); border:1px solid rgba(251,247,239,0.12); border-radius:var(--r-lg); padding:30px; transition:transform .25s, background .25s;}
.ai-card:hover{transform:translateY(-5px); background:rgba(251,247,239,0.07);}
.ai-ic{width:50px; height:50px; border-radius:14px; background:rgba(30,158,87,0.18); color:var(--clay); display:flex; align-items:center; justify-content:center; margin-bottom:20px;}
.ai-ic .ic{width:25px; height:25px;}
.ai-card h3{font-size:20px; color:var(--cream);}
.ai-card p{color:rgba(251,247,239,0.66); font-size:15px; margin-top:11px; line-height:1.5;}
.ai-chip{margin-top:18px; display:inline-flex; align-items:center; gap:7px; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:0.05em; color:var(--green); background:rgba(91,123,79,0.18); padding:5px 11px; border-radius:8px;}
.ai-chip .dot{width:6px; height:6px; border-radius:50%; background:var(--green);}

/* ============ ROLES ============ */
.roles{display:grid; grid-template-columns:repeat(4,1fr); gap:20px;}
.role{background:var(--white); border:1px solid var(--line); border-radius:var(--r-lg); padding:28px; transition:transform .22s, box-shadow .22s;}
.role:hover{transform:translateY(-4px); box-shadow:var(--shadow);}
.role-ic{width:46px; height:46px; border-radius:13px; background:var(--sand); color:var(--ink); display:flex; align-items:center; justify-content:center; margin-bottom:18px;}
.role-ic .ic{width:23px; height:23px;}
.role h3{font-size:18px;}
.role p{font-size:14.5px; color:var(--ink-soft); margin-top:9px; line-height:1.45;}

/* ============ STATS ============ */
.stats{background:var(--sand); border-top:1px solid var(--line-soft); border-bottom:1px solid var(--line-soft);}
.stats-grid{display:grid; grid-template-columns:repeat(4,1fr); gap:24px; text-align:center;}
.stat .num{font-size:clamp(38px,4.4vw,54px); font-weight:800; letter-spacing:-0.04em; color:var(--clay-deep);}
.stat .lbl{font-size:15px; color:var(--ink-soft); margin-top:6px;}
.stats-note{text-align:center; margin-top:30px; font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--ink-faint);}

/* ============ HOW IT WORKS ============ */
.steps{display:grid; grid-template-columns:repeat(4,1fr); gap:0;}
.step{padding:0 26px; position:relative;}
.step:not(:last-child)::after{content:""; position:absolute; top:24px; right:-1px; width:1px; height:calc(100% - 24px); background:var(--line);}
.step-n{width:50px; height:50px; border-radius:14px; background:var(--clay); color:var(--white); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:20px; margin-bottom:22px; box-shadow:0 6px 16px -6px rgba(21,124,69,0.42);}
.step h3{font-size:19px;}
.step p{font-size:15px; color:var(--ink-soft); margin-top:11px; line-height:1.5;}

/* ============ PRICING ============ */
.price-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:24px; align-items:stretch;}
.plan{background:var(--white); border:1px solid var(--line); border-radius:var(--r-xl); padding:36px 32px; display:flex; flex-direction:column; transition:transform .25s, box-shadow .25s;}
.plan:hover{transform:translateY(-5px); box-shadow:var(--shadow);}
.plan.featured{background:var(--ink); color:var(--cream); border-color:var(--ink); box-shadow:var(--shadow-lg); transform:scale(1.03);}
.plan.featured:hover{transform:scale(1.03) translateY(-5px);}
.plan-name{display:flex; align-items:center; gap:10px; font-family:'IBM Plex Mono',monospace; font-size:13px; letter-spacing:0.1em; text-transform:uppercase; font-weight:600; color:var(--clay-deep);}
.plan.featured .plan-name{color:var(--clay);}
.plan-pop{margin-left:auto; font-family:'Hanken Grotesk',sans-serif; font-size:11px; letter-spacing:0; text-transform:none; background:var(--clay); color:var(--cream); padding:4px 11px; border-radius:100px; font-weight:700;}
.plan-price{margin:22px 0 4px; font-size:40px; font-weight:800; letter-spacing:-0.04em;}
.plan-price span{font-size:16px; font-weight:600; color:var(--ink-soft);}
.plan.featured .plan-price span{color:rgba(251,247,239,0.6);}
.plan-desc{font-size:14.5px; color:var(--ink-soft); min-height:42px;}
.plan.featured .plan-desc{color:rgba(251,247,239,0.66);}
.plan-feats{list-style:none; padding:0; margin:24px 0; display:flex; flex-direction:column; gap:13px; flex:1;}
.plan-feats li{display:flex; gap:11px; align-items:flex-start; font-size:15px;}
.plan-feats .ic{width:18px; height:18px; margin-top:2px; color:var(--green); flex:none;}
.plan.featured .plan-feats .ic{color:var(--clay);}
.plan .btn{width:100%; justify-content:center;}
.plan-feats li.off{opacity:.4;}

/* ============ CTA ============ */
.cta{position:relative;}
.cta-box{background:linear-gradient(135deg, var(--clay) 0%, var(--clay-deep) 100%); border-radius:var(--r-xl); padding:64px 56px; text-align:center; color:var(--cream); position:relative; overflow:hidden; box-shadow:var(--shadow-lg);}
.cta-box::before{content:""; position:absolute; inset:0; background:radial-gradient(500px 300px at 90% -10%, rgba(255,255,255,0.16), transparent 60%);}
.cta-box>*{position:relative; z-index:1;}
.cta-box h2{font-size:clamp(30px,3.8vw,46px); color:var(--cream);}
.cta-box p{margin:18px auto 0; max-width:520px; color:rgba(251,247,239,0.88); font-size:18px;}
.cta-actions{display:flex; gap:14px; justify-content:center; margin-top:34px; flex-wrap:wrap;}

/* ============ FOOTER ============ */
.footer{background:var(--ink); color:rgba(251,247,239,0.7); padding:72px 0 36px;}
.foot-grid{display:grid; grid-template-columns:1.6fr 1fr 1fr 1fr; gap:40px;}
.foot-brand .brand-wm{color:var(--cream);}
.foot-about{font-size:15px; line-height:1.55; margin-top:18px; max-width:300px; color:rgba(251,247,239,0.6);}
.foot-social{display:flex; gap:11px; margin-top:22px;}
.foot-social a{width:40px; height:40px; border-radius:11px; border:1px solid rgba(251,247,239,0.16); display:flex; align-items:center; justify-content:center; color:rgba(251,247,239,0.8); transition:background .2s, color .2s, border-color .2s;}
.foot-social a:hover{background:var(--clay); color:var(--cream); border-color:var(--clay);}
.foot-col h4{font-size:13px; font-family:'IBM Plex Mono',monospace; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:rgba(251,247,239,0.5); margin-bottom:18px;}
.foot-col a{display:block; font-size:15px; color:rgba(251,247,239,0.72); margin-bottom:12px; transition:color .15s;}
.foot-col a:hover{color:var(--cream);}
.foot-bot{margin-top:54px; padding-top:26px; border-top:1px solid rgba(251,247,239,0.12); display:flex; justify-content:space-between; align-items:center; font-size:13.5px; color:rgba(251,247,239,0.5); flex-wrap:wrap; gap:14px;}

/* ============ reveal ============ */
.reveal{opacity:1; transform:none;} /* safe base: always visible (no-JS / failsafe) */
.js .reveal{opacity:0; transform:translateY(26px); transition:opacity .7s cubic-bezier(.2,.7,.3,1), transform .7s cubic-bezier(.2,.7,.3,1);}
.js .reveal.in{opacity:1; transform:none;}
@media (prefers-reduced-motion: reduce){.js .reveal{opacity:1; transform:none; transition:none;}}

/* ============ RESPONSIVE ============ */
@media(max-width:1000px){
  .nav-links{display:none;}
  .nav-cta .nav-login{display:none;}
  .nav-burger{display:inline-flex;}
  .hero-grid{grid-template-columns:1fr; gap:64px;}
  .hero .lead{max-width:none;}
  .mods,.ps-grid,.ai-grid,.roles,.price-grid,.stats-grid,.steps{grid-template-columns:1fr;}
  .roles{grid-template-columns:1fr 1fr;}
  .ai-grid{grid-template-columns:1fr;}
  .stats-grid{grid-template-columns:1fr 1fr; gap:36px 24px;}
  .steps{gap:40px;}
  .step{padding:0;}
  .step:not(:last-child)::after{display:none;}
  .plan.featured{transform:none;}
  .plan.featured:hover{transform:translateY(-5px);}
  .foot-grid{grid-template-columns:1fr 1fr;}
  .foot-brand{grid-column:1/-1;}
  .float-ai{right:8px;}
  .float-pay{left:8px;}
}
@media(max-width:620px){
  body{font-size:16px;}
  .wrap{padding:0 20px;}
  .section{padding:72px 0;}
  .ps-grid,.mods,.price-grid{gap:18px;}
  .roles,.stats-grid{grid-template-columns:1fr;}
  .ps-card,.mod,.plan{padding:28px 24px;}
  .cta-box{padding:44px 26px;}
  .hero-cta .btn, .cta-actions .btn{flex:1;}
  .mock-float{display:none;}
  .ai-card{padding:24px;}
}
</style>
</head>
<body>

<!-- ============ NAV ============ -->
<header class="nav" id="nav">
  <div class="wrap nav-in">
    <a class="brand" href="#top">
      <span class="brand-tile" data-logo=""></span>
      <span class="brand-wm"><b>1</b>mahalla</span>
    </a>
    <nav class="nav-links">
      <a href="#modullar">Imkoniyatlar</a>
      <a href="#ai">Sun'iy intellekt</a>
      <a href="#rollar">Rollar</a>
      <a href="#qadamlar">Qanday ishlaydi</a>
    </nav>
    <div class="nav-cta">
      <a class="nav-login" href="{{ $loginUrl }}">Kirish</a>
      <a class="btn btn-primary" href="{{ $loginUrl }}">Bepul boshlash</a>
    </div>
    <button class="nav-burger" aria-label="Menyu"><svg class="ic" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"></path></svg></button>
  </div>
</header>

<main id="top">

<!-- ============ HERO ============ -->
<section class="hero">
  <div class="wrap hero-grid">
    <div class="reveal">
      <h1>Mahallangizni <span class="hl">bitta ilovada</span> boshqaring</h1>
      <p class="lead">Kvartirani sotishdan butun binoni keyinchalik boshqarishgacha — turar-joy majmualari va mahallalar uchun to'liq raqamli platforma. Savdo, hisob-kitob, nosozlik arizalari va aholi — hammasi bir joyda.</p>
      <div class="hero-cta">
        <a class="btn btn-primary btn-lg" href="{{ $loginUrl }}">Bepul boshlash<svg class="ic" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></a>
        <a class="btn btn-ghost btn-lg" href="#demo"><svg class="ic" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>Demo ko'rish</a>
      </div>
      <div class="hero-trust">
        <div class="trust-ava">
          <span>QK</span><span>UK</span><span>TSJ</span><span>+9</span>
        </div>
        <div class="trust-txt">Quruvchilar, uy-joy boshqaruvchilari va<br><b>mahalla raislari</b> ishonadi</div>
      </div>
    </div>

    <!-- dashboard mockup -->
    <div class="mock reveal">
      <div class="mock-win">
        <div class="mock-bar">
          <span class="mock-dot" style="background:#DAD3C6"></span>
          <span class="mock-dot" style="background:#DAD3C6"></span>
          <span class="mock-dot" style="background:#DAD3C6"></span>
          <span class="addr mono">app.1mahalla.uz/arizalar</span>
        </div>
        <div class="tk-panel">
          <div class="tk-head">
            <div>
              <div class="tk-title">Arizalar</div>
              <div class="tk-sub">Navoiy bog'i — A korpus · 20 ta</div>
            </div>
            <div class="tk-pills">
              <span class="tk-pill open">9 ochiq</span>
              <span class="tk-pill prog">8 jarayonda</span>
              <span class="tk-pill done">3 yopilgan</span>
            </div>
          </div>
          <div class="tk-list">
            <div class="tk-row">
              <span class="tk-no">№257</span>
              <div class="tk-main"><div class="tk-name">Liftda nosozlik</div><div class="tk-meta">A korpus · kv. 904 · 14:12</div></div>
              <span class="tk-badge emer">Avariya</span>
              <span class="tk-status s-open">Ochiq</span>
            </div>
            <div class="tk-row">
              <span class="tk-no">№254</span>
              <div class="tk-main"><div class="tk-name">Suv tushib ketishi</div><div class="tk-meta">A korpus · kv. 601 · 12:40</div></div>
              <span class="tk-badge high">Yuqori</span>
              <span class="tk-status s-prog">Jarayonda</span>
            </div>
            <div class="tk-row">
              <span class="tk-no">№248</span>
              <div class="tk-main"><div class="tk-name">Elektr ustasi kerak</div><div class="tk-meta">A korpus · kv. 803 · 11:05</div></div>
              <span class="tk-status s-prog">Jarayonda</span>
            </div>
            <div class="tk-row">
              <span class="tk-no">№241</span>
              <div class="tk-main"><div class="tk-name">Konditsioner buzilgan</div><div class="tk-meta">A korpus · kv. 702 · kecha</div></div>
              <span class="tk-status s-done">Yopilgan</span>
            </div>
            <div class="tk-row">
              <span class="tk-no">№239</span>
              <div class="tk-main"><div class="tk-name">Eshik qulfi sinishi</div><div class="tk-meta">A korpus · kv. 401 · kecha</div></div>
              <span class="tk-status s-done">Yopilgan</span>
            </div>
          </div>
        </div>
      </div>
      <div class="mock-float float-ai">
        <span class="fi" data-ic="sparkles"></span>
        <div><div class="mf-t">AI toifaladi</div><div class="mf-s">Santexnika · 2-daraja · 30 soniyada</div></div>
      </div>
      <div class="mock-float float-pay">
        <span class="fi" data-ic="gauge"></span>
        <div><div class="mf-t">Hisoblagich o'qildi</div><div class="mf-s">Suv · 0392 m³ · fotodan (OCR)</div></div>
      </div>
    </div>
  </div>

  <div class="wrap">
    <div class="logos reveal">
      <div class="logos-label">Ishonch bilan ishlatadi</div>
      <div class="logos-row">
        <span>Mahalla Invest</span><span>Toshkent Uy-Joy</span><span>Build City</span><span>TSJ Birlik</span><span>Navoiy Devlopment</span>
      </div>
    </div>
  </div>
</section>

<!-- ============ PROBLEM -> SOLUTION ============ -->
<section class="section">
  <div class="wrap">
    <div class="sec-head eyebrow-wrap center reveal">
      <span class="kicker center">Nega 1mahalla</span>
      <h2>Excel, Telegram va daftarlar bilan
"boshqarishni" to'xtating</h2>
    </div>
    <div class="ps-grid">
      <div class="ps-card ps-problem reveal">
        <div class="ps-tag">Bugungi holat</div>
        <h3>"Sistema" tarqoq va qo'lda</h3>
        <div class="ps-list">
          <div class="ps-item"><svg class="ic" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"></path></svg>Savdo ma'lumotlari Excel'da, to'lovlar daftarda yo'qoladi</div>
          <div class="ps-item"><svg class="ic" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"></path></svg>Nosozlik haqidagi arizalar turli Telegram guruhlarda chalkashadi</div>
          <div class="ps-item"><svg class="ic" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"></path></svg>Hisoblagichlar qo'lda yoziladi, xatolar va nizolar ko'p</div>
          <div class="ps-item"><svg class="ic" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"></path></svg>Aholi nima bo'layotganini bilmaydi, ishonch yo'q</div>
        </div>
      </div>
      <div class="ps-card ps-solution reveal">
        <div class="ps-tag">1mahalla bilan</div>
        <h3>Bitta tizim bilan hammasiga yechim&nbsp;</h3>
        <div class="ps-list">
          <div class="ps-item"><svg class="ic" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg><span><b>Savdodan boshqaruvgacha</b> — bitta uzluksiz ma'lumot oqimi</span></div>
          <div class="ps-item"><svg class="ic" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg><span>Arizalar <b>AI yordamida</b> avtomatik tartiblanadi</span></div>
          <div class="ps-item"><svg class="ic" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg><span>Hisoblagichlar <b>fotodan o'qiladi</b>, hisob-faktura o'zi tuziladi</span></div>
          <div class="ps-item"><svg class="ic" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg><span>Aholi o'z ilovasida <b>hammasini real vaqtda</b> ko'radi</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============ MODULES ============ -->
<section class="section" id="modullar" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head eyebrow-wrap center reveal">
      <span class="kicker center">Ikkita asosiy modul</span>
      <h2>Sotishdan boshqaruvgacha — to'liq tsikl</h2>
      <p class="lead">Bir bino hayotining ikkala bosqichi ham bitta platformada birlashadi.</p>
    </div>
    <div class="mods">
      <div class="mod mod-clay reveal">
        <div class="mod-ic"><svg class="ic" viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3M9 9h.01M9 13h.01M9 17h.01"></path></svg></div>
        <h3>Savdo CRM</h3>
        <p class="tagline">Loyihadan tortib kalit topshirishgacha — har bir kvartira savdosini boshqaring.</p>
        <ul class="mod-feats">
          <li><svg class="ic" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg><span><b>Loyiha · bino · kvartira</b> ierarxiyasi va interaktiv qavat rejasi</span></li>
          <li><svg class="ic" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg><span><b>Mijozlar voronkasi</b> — qiziqishdan shartnomaga</span></li>
          <li><svg class="ic" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg><span><b>Muddatli to'lov grafigi</b> va avtomatik eslatmalar</span></li>
          <li><svg class="ic" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg><span><b>AI savdo tavsiyalari</b> — qaysi mijoz bilan ishlash kerak</span></li>
        </ul>
        <a class="mod-link" href="#">Savdo CRM haqida<svg class="ic" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></a>
      </div>
      <div class="mod mod-green reveal">
        <div class="mod-ic"><svg class="ic" viewBox="0 0 24 24"><path d="M3 9.5 12 3l9 6.5V21H3z M9 21v-6h6v6"></path></svg></div>
        <h3>Mulk boshqaruvi</h3>
        <p class="tagline">Bino topshirilgach — kundalik xizmat, hisob-kitob va aholi bilan ishlash.</p>
        <ul class="mod-feats">
          <li><svg class="ic" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg><span><b>Nosozlik arizalari</b> — AI kategoriyalashtiradi va yo'naltiradi</span></li>
          <li><svg class="ic" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg><span><b>Hisoblagichlarni fotodan o'qish</b> (OCR) — qo'lda kiritishsiz</span></li>
          <li><svg class="ic" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg><span><b>Hisob-fakturalar</b> va onlayn to'lovlar bir joyda</span></li>
          <li><svg class="ic" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg><span><b>Umumiy mulk</b> va shaffof <b>ovoz berish</b> (umumiy yig'ilish)</span></li>
        </ul>
        <a class="mod-link" href="#">Mulk boshqaruvi haqida<svg class="ic" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></a>
      </div>
    </div>
  </div>
</section>

<!-- ============ AI ============ -->
<section class="section ai" id="ai">
  <div class="wrap">
    <div class="sec-head eyebrow-wrap center reveal">
      <span class="kicker center">Sun'iy intellekt yordamchisi</span>
      <h2>AI hisobot tuzmaydi — u ish qiladi</h2>
      <p class="lead">Sun'iy intellekt asosidagi yordamchi kundalik mayda-chuyda ishlarni o'z zimmasiga oladi, jamoangiz esa muhim qarorlarga e'tibor beradi.</p>
    </div>
    <div class="ai-grid">
      <div class="ai-card reveal">
        <div class="ai-ic"><svg class="ic" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"></path><circle cx="19" cy="18" r="2.4"></circle></svg></div>
        <h3>Arizalarni avtomatik tahlil</h3>
        <p>Yashovchi yozgan matnni o'qib, AI uni toifaga ajratadi, muhimligini belgilaydi va kerakli pudratchiga yo'naltiradi.</p>
        <span class="ai-chip"><span class="dot"></span>santexnika · 2-daraja · 30 soniya</span>
      </div>
      <div class="ai-card reveal">
        <div class="ai-ic"><svg class="ic" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"></path></svg></div>
        <h3>Hisoblagich fotosini o'qish</h3>
        <p>Aholi hisoblagich rasmini yuboradi — OCR raqamni aniqlaydi, iste'molni hisoblaydi va hisob-fakturani o'zi tayyorlaydi.</p>
        <span class="ai-chip"><span class="dot"></span>OCR · suv · 03928 m³</span>
      </div>
      <div class="ai-card reveal">
        <div class="ai-ic"><svg class="ic" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 7-7M14 5h7v7"></path></svg></div>
        <h3>Savdo tavsiyalari</h3>
        <p>Voronka va to'lov tarixini tahlil qilib, AI qaysi mijoz shartnomaga yaqinligini va kimga bugun qo'ng'iroq qilishni aytadi.</p>
        <span class="ai-chip"><span class="dot"></span>bugun · 5 ustuvor lid</span>
      </div>
    </div>
  </div>
</section>

<!-- ============ ROLES ============ -->
<section class="section" id="rollar">
  <div class="wrap">
    <div class="sec-head eyebrow-wrap center reveal">
      <span class="kicker center">Har kim uchun o'z portali</span>
      <h2>Bitta platforma, to'rt xil ko'rinish</h2>
      <p class="lead">Har bir rol faqat o'ziga kerakli ma'lumot va vositalarni ko'radi.</p>
    </div>
    <div class="roles">
      <div class="role reveal">
        <div class="role-ic"><svg class="ic" viewBox="0 0 24 24"><path d="M3 21h18M5 21V8l7-4 7 4v13M9 12h.01M15 12h.01M9 16h.01M15 16h.01"></path></svg></div>
        <h3>Boshqaruvchi</h3>
        <p>UK/TSJ rahbari — moliyaviy holat, hisobotlar va butun majmua nazorati.</p>
      </div>
      <div class="role reveal">
        <div class="role-ic"><svg class="ic" viewBox="0 0 24 24"><path d="M4 11a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-1v-7h3M7 11H4v7h1a2 2 0 0 0 2-2z"></path></svg></div>
        <h3>Dispetcher</h3>
        <p>Arizalarni qabul qiladi, taqsimlaydi va bajarilishini kuzatadi.</p>
      </div>
      <div class="role reveal">
        <div class="role-ic"><svg class="ic" viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 1-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5z"></path></svg></div>
        <h3>Pudratchi</h3>
        <p>Yo'naltirilgan ishlarni ko'radi, holatni yangilaydi va yopadi.</p>
      </div>
      <div class="role reveal">
        <div class="role-ic"><svg class="ic" viewBox="0 0 24 24"><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 21v-2a4 4 0 0 0-3-3.85"></path></svg></div>
        <h3>Yashovchi</h3>
        <p>To'lovlar, hisoblagichlar, arizalar va ovoz berish — telefonda.</p>
      </div>
    </div>
  </div>
</section>

<!-- ============ STATS ============ -->
<section class="section stats">
  <div class="wrap">
    <div class="stats-grid reveal">
      <div class="stat"><div class="num">120+</div><div class="lbl">Boshqarilayotgan bino</div></div>
      <div class="stat"><div class="num">8 400</div><div class="lbl">Faol kvartira</div></div>
      <div class="stat"><div class="num">94%</div><div class="lbl">O'z vaqtidagi to'lovlar</div></div>
      <div class="stat"><div class="num">30 soniya</div><div class="lbl">Arizaning o'rtacha tartiblanishi</div></div>
    </div>
    <div class="stats-note">* Ko'rsatkichlar namuna sifatida — platforma ishga tushganda real raqamlar bilan yangilanadi</div>
  </div>
</section>

<!-- ============ HOW IT WORKS ============ -->
<section class="section" id="qadamlar">
  <div class="wrap">
    <div class="sec-head eyebrow-wrap center reveal">
      <span class="kicker center">Qanday ishlaydi</span>
      <h2>To'rt qadamda ishga tushasiz</h2>
    </div>
    <div class="steps">
      <div class="step reveal">
        <div class="step-n">1</div>
        <h3>Majmuani qo'shing</h3>
        <p>Loyiha, bino va kvartiralarni bir marta kiriting yoki mavjud ma'lumotni import qiling.</p>
      </div>
      <div class="step reveal">
        <div class="step-n">2</div>
        <h3>Jamoani taklif qiling</h3>
        <p>Boshqaruvchi, dispetcher va pudratchilarga rol bering — har kim o'z portalini oladi.</p>
      </div>
      <div class="step reveal">
        <div class="step-n">3</div>
        <h3>Aholini ulang</h3>
        <p>Yashovchilar ilova orqali to'lov qiladi, hisoblagich yuboradi va ariza ochadi.</p>
      </div>
      <div class="step reveal">
        <div class="step-n">4</div>
        <h3>AI ishni oladi</h3>
        <p>Arizalar tartiblanadi, hisob-fakturalar tuziladi, savdo tavsiyalari keladi.</p>
      </div>
    </div>
  </div>
</section>

<!-- ============ CTA ============ -->
<section class="section cta" id="demo">
  <div class="wrap">
    <div class="cta-box reveal">
      <h2>Mahallangizni bugun raqamlashtiring</h2>
      <p>Bir bino bilan boshlang, butun majmuangizgacha kengaytiring. O'rnatish bepul, demo 15 daqiqada.</p>
      <div class="cta-actions">
        <a class="btn btn-light btn-lg" href="{{ $loginUrl }}">Bepul boshlash<svg class="ic" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></a>
        <a class="btn btn-lg" href="#" style="background:rgba(251,247,239,0.14); color:var(--cream); border-color:rgba(251,247,239,0.3)"><svg class="ic" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>Demo ko'rish</a>
      </div>
    </div>
  </div>
</section>

</main>

<!-- ============ FOOTER ============ -->
<footer class="footer">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <a class="brand" href="#top">
          <span class="brand-tile" data-logo=""></span>
          <span class="brand-wm"><b>1</b>mahalla</span>
        </a>
        <p class="foot-about">O'zbekiston uchun turar-joy majmualari va mahallalarni boshqarishning to'liq raqamli platformasi. Savdodan boshqaruvgacha — bitta tizimda.</p>
        <div class="foot-social">
          <a href="#" aria-label="Telegram"><svg class="ic" viewBox="0 0 24 24"><path d="M21 4 3 11l6 2 2 6 3-4 5 4z"></path></svg></a>
          <a href="#" aria-label="Instagram"><svg class="ic" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"></circle></svg></a>
          <a href="#" aria-label="YouTube"><svg class="ic" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="4"></rect><path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none"></path></svg></a>
        </div>
      </div>
      <div class="foot-col">
        <h4>Mahsulot</h4>
        <a href="#modullar">Savdo CRM</a>
        <a href="#modullar">Mulk boshqaruvi</a>
        <a href="#ai">Sun'iy intellekt</a>
      </div>
      <div class="foot-col">
        <h4>Kimlar uchun</h4>
        <a href="#rollar">Quruvchilar</a>
        <a href="#rollar">UK / TSJ</a>
        <a href="#rollar">Mahalla raislari</a>
        <a href="#rollar">Yashovchilar</a>
      </div>
      <div class="foot-col">
        <h4>Bog'lanish</h4>
        <a href="#">Telegram</a>
        <a href="#">Demo so'rash</a>
        <a href="#">Yordam markazi</a>
        <a href="#">Hamkorlik</a>
      </div>
    </div>
    <div class="foot-bot">
      <div>© 2026 1mahalla — barcha huquqlar himoyalangan</div>
      <div style="display:flex; gap:24px;"><a href="#" style="color:inherit">Maxfiylik</a><a href="#" style="color:inherit">Shartlar</a></div>
    </div>
  </div>
</footer>

<script>
// ---- icon set (lucide-style) injected by data-ic ----
const ICONS = {
  layout:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  building:'<path d="M3 21h18M6 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16M14 21V9h4a1 1 0 0 1 1 1v11M9 8h.01M9 12h.01M9 16h.01"/>',
  wallet:'<path d="M3 7a2 2 0 0 1 2-2h12v4M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3M3 7h16M17 13h.01"/><path d="M21 9v4h-4a2 2 0 0 1 0-4z"/>',
  wrench:'<path d="M14.7 6.3a4 4 0 0 1-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5z"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.85"/>',
  sparkles:'<path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>',
  gauge:'<path d="M12 14 9 9M3.3 14a9 9 0 1 1 17.4 0"/><circle cx="12" cy="14" r="1.5"/>',
  check:'<path d="M20 6 9 17l-5-5"/>'
};
document.querySelectorAll('[data-ic]').forEach(el=>{
  el.innerHTML = '<svg class="ic" viewBox="0 0 24 24">'+ICONS[el.dataset.ic]+'</svg>';
});

// ---- gate-monogram logo (direction 05) ----
const LOGO = '<svg viewBox="0 0 96 96" width="26" height="26" aria-hidden="true">'+
  '<path d="M17 72 H33 M25 72 V32 L18 38" fill="none" stroke="#F4FAF6" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'+
  '<path d="M40 72 V43 M60 72 V43 M80 72 V43 M40 43 Q49 30 50 25 Q51 30 60 43 M60 43 Q69 30 70 25 Q71 30 80 43" fill="none" stroke="#BFE6CC" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'+
  '</svg>';
document.querySelectorAll('[data-logo]').forEach(el=>{ el.innerHTML = LOGO; });

// ---- nav shadow on scroll ----
const nav = document.getElementById('nav');
const onScroll = ()=>{ nav.classList.toggle('scrolled', window.scrollY > 8); };
onScroll(); window.addEventListener('scroll', onScroll, {passive:true});

// ---- reveal on scroll ----
document.documentElement.classList.add('js');
const io = new IntersectionObserver((entries)=>{
  entries.forEach((e)=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
},{threshold:0.10, rootMargin:'0px 0px -6% 0px'});
const reveals = document.querySelectorAll('.reveal');
reveals.forEach(el=>io.observe(el));
// failsafe: never leave anything hidden if the observer can't fire
setTimeout(()=>{ document.querySelectorAll('.reveal:not(.in)').forEach(el=>el.classList.add('in')); }, 2200);

// ---- stats count-up on scroll ----
function animateCount(el){
  const raw = el.textContent.trim();
  const match = raw.match(/^([\d\s]+)(.*)$/);
  if(!match) return;
  const target = parseInt(match[1].replace(/\s/g,''), 10);
  if(isNaN(target)) return;
  const grouped = match[1].includes(' ');
  const suffix = match[2];
  const duration = 1200, start = performance.now();
  function tick(now){
    const p = Math.min((now - start) / duration, 1);
    const val = Math.round(target * (1 - Math.pow(1 - p, 3)));
    el.textContent = (grouped ? val.toLocaleString('ru-RU') : val) + suffix;
    if(p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
const statsGrid = document.querySelector('.stats-grid');
if(statsGrid){
  const statsIo = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){ statsGrid.querySelectorAll('.num').forEach(animateCount); statsIo.disconnect(); }
    });
  },{threshold:0.3});
  statsIo.observe(statsGrid);
}
</script>


</body></html>