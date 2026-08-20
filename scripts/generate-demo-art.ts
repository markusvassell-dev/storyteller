/**
 * Generates the original placeholder artwork for the built-in demonstration
 * stories. All artwork is project-created flat illustration assembled from
 * simple shapes — no external images, no copied art.
 *
 * Run: npx tsx scripts/generate-demo-art.ts
 * Output: public/stories/<slug>/cover.svg + pages/NN.svg
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const W = 1200
const H = 1600

// ---------- tiny SVG helpers ----------

const g = (transform: string, ...children: string[]) =>
  `<g transform="${transform}">${children.join('')}</g>`
const rect = (x: number, y: number, w: number, h: number, fill: string, rx = 0) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`
const circle = (cx: number, cy: number, r: number, fill: string) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`
const ellipse = (cx: number, cy: number, rx: number, ry: number, fill: string) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>`
const path = (d: string, fill: string, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`
const poly = (points: [number, number][], fill: string) =>
  `<polygon points="${points.map((p) => p.join(',')).join(' ')}" fill="${fill}"/>`

function svg(children: string[], bg: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img">
${rect(0, 0, W, H, bg)}
${children.join('\n')}
</svg>
`
}

// ---------- shared scenery ----------

function daySky(top = '#aee3f2', bottom = '#e8f7fb'): string {
  return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>
  </linearGradient></defs>${rect(0, 0, W, H, 'url(#sky)')}`
}

function nightSky(top = '#251f3f', bottom = '#4a3f78'): string {
  const stars = [
    [140, 180], [340, 90], [520, 220], [760, 130], [980, 200], [1080, 340],
    [220, 380], [640, 320], [880, 420], [420, 460], [120, 560], [1020, 90],
  ]
    .map(([x, y]) => circle(x!, y!, 6, '#f4edff'))
    .join('')
  return `<defs><linearGradient id="nsky" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>
  </linearGradient></defs>${rect(0, 0, W, H, 'url(#nsky)')}${stars}`
}

const moon = (x = 950, y = 240, r = 110) =>
  circle(x, y, r, '#f2b866') + circle(x + r * 0.45, y - r * 0.3, r * 0.82, '#0000') +
  `<circle cx="${x + r * 0.45}" cy="${y - r * 0.28}" r="${r * 0.8}" fill="rgba(37,31,63,0)"/>` +
  circle(x - r * 0.25, y + r * 0.2, r * 0.14, '#e09b44') +
  circle(x + r * 0.2, y - r * 0.25, r * 0.1, '#e09b44')

const sun = (x = 980, y = 220, r = 100) =>
  circle(x, y, r + 26, 'rgba(255,214,120,0.35)') + circle(x, y, r, '#ffd678')

const cloud = (x: number, y: number, s = 1) =>
  g(`translate(${x} ${y}) scale(${s})`,
    ellipse(0, 0, 110, 46, '#ffffff'),
    ellipse(-70, 14, 70, 34, '#ffffff'),
    ellipse(80, 12, 80, 36, '#ffffff'))

function hills(colorFar: string, colorNear: string, horizon = 950): string {
  return (
    path(`M0 ${horizon} Q ${W * 0.3} ${horizon - 160} ${W * 0.62} ${horizon} T ${W} ${horizon - 60} V${H} H0 Z`, colorFar) +
    path(`M0 ${horizon + 130} Q ${W * 0.42} ${horizon - 40} ${W} ${horizon + 110} V${H} H0 Z`, colorNear)
  )
}

const grassTuft = (x: number, y: number, c: string) =>
  path(`M${x} ${y} q6 -34 14 0 q8 -26 16 0 q8 -34 16 0 z`, c)

function tree(x: number, y: number, s = 1, leaf = '#5d8f57', trunk = '#7a5236'): string {
  return g(`translate(${x} ${y}) scale(${s})`,
    rect(-16, -10, 32, 90, trunk, 10),
    circle(0, -80, 85, leaf),
    circle(-60, -40, 60, leaf),
    circle(60, -40, 60, leaf))
}

const pine = (x: number, y: number, s = 1, c = '#3c6b4f') =>
  g(`translate(${x} ${y}) scale(${s})`,
    rect(-12, -6, 24, 60, '#6d4a30', 8),
    poly([[0, -220], [85, -60], [-85, -60]], c),
    poly([[0, -160], [70, -10], [-70, -10]], c))

const flower = (x: number, y: number, c: string) =>
  g(`translate(${x} ${y})`,
    rect(-3, 0, 6, 40, '#5d8f57', 3),
    circle(0, -6, 14, c), circle(0, -6, 6, '#ffd678'))

function signpost(x: number, y: number, s = 1): string {
  return g(`translate(${x} ${y}) scale(${s})`,
    rect(-8, -160, 16, 160, '#8a6a48', 6),
    rect(-70, -190, 140, 44, '#b08a5e', 10))
}

// ---------- characters ----------

function pig(x: number, y: number, s = 1, flip = false, outfit = '#7fb3d5'): string {
  const dir = flip ? -1 : 1
  return g(`translate(${x} ${y}) scale(${dir * s} ${s})`,
    // body/outfit
    ellipse(0, 40, 78, 84, outfit),
    // head
    circle(0, -46, 62, '#f4a9b8'),
    // ears
    poly([[-52, -84], [-26, -108], [-22, -70]], '#f4a9b8'),
    poly([[52, -84], [26, -108], [22, -70]], '#f4a9b8'),
    poly([[-46, -84], [-30, -98], [-28, -76]], '#e58ba2'),
    poly([[46, -84], [30, -98], [28, -76]], '#e58ba2'),
    // snout + eyes + smile
    ellipse(0, -34, 26, 18, '#e58ba2'),
    circle(-9, -36, 4, '#5c3a44'), circle(9, -36, 4, '#5c3a44'),
    circle(-24, -56, 7, '#3b2f45'), circle(24, -56, 7, '#3b2f45'),
    path('M-16 -14 Q0 -2 16 -14', 'none', 'stroke="#5c3a44" stroke-width="5" stroke-linecap="round"'),
    // arms + trotters
    ellipse(-72, 26, 18, 40, '#f4a9b8'), ellipse(72, 26, 18, 40, '#f4a9b8'),
    ellipse(-34, 122, 20, 16, '#e58ba2'), ellipse(34, 122, 20, 16, '#e58ba2'))
}

function wolf(x: number, y: number, s = 1, flip = false): string {
  const dir = flip ? -1 : 1
  return g(`translate(${x} ${y}) scale(${dir * s} ${s})`,
    ellipse(0, 60, 74, 92, '#8b93ad'),
    ellipse(0, 130, 60, 24, '#6f7791'),
    circle(0, -50, 60, '#9aa2bc'),
    poly([[-54, -86], [-34, -136], [-16, -80]], '#8b93ad'),
    poly([[54, -86], [34, -136], [16, -80]], '#8b93ad'),
    // muzzle
    ellipse(30, -30, 40, 26, '#c7ccdd'),
    circle(64, -34, 10, '#3b3f52'),
    circle(-16, -62, 8, '#2f3242'), circle(20, -62, 8, '#2f3242'),
    circle(-13, -64, 3, '#fff'), circle(23, -64, 3, '#fff'),
    path('M6 -12 Q26 0 52 -14', 'none', 'stroke="#3b3f52" stroke-width="5" stroke-linecap="round"'),
    // tail
    path('M-70 90 q-70 10 -60 70 q50 6 74 -34 z', '#8b93ad'))
}

function bear(x: number, y: number, s = 1, fur = '#a9713f', shirt?: string): string {
  return g(`translate(${x} ${y}) scale(${s})`,
    ellipse(0, 60, 84, 96, shirt ?? fur),
    circle(0, -52, 66, fur),
    circle(-48, -96, 24, fur), circle(48, -96, 24, fur),
    circle(-48, -96, 12, '#d9a86f'), circle(48, -96, 12, '#d9a86f'),
    ellipse(0, -32, 30, 22, '#d9a86f'),
    circle(0, -42, 9, '#4a3221'),
    circle(-22, -62, 7, '#3a281c'), circle(22, -62, 7, '#3a281c'),
    path('M-12 -22 Q0 -12 12 -22', 'none', 'stroke="#4a3221" stroke-width="5" stroke-linecap="round"'),
    ellipse(-80, 40, 20, 46, fur), ellipse(80, 40, 20, 46, fur),
    ellipse(-38, 148, 26, 18, fur), ellipse(38, 148, 26, 18, fur))
}

function girl(x: number, y: number, s = 1, hair = '#f2c14e', dress = '#c96f4a', flip = false): string {
  const dir = flip ? -1 : 1
  return g(`translate(${x} ${y}) scale(${dir * s} ${s})`,
    // dress
    poly([[-58, 120], [58, 120], [30, 6], [-30, 6]], dress),
    // head
    circle(0, -40, 46, '#f6d7b8'),
    // hair
    path('M-46 -52 Q-52 -100 0 -100 Q52 -100 46 -52 Q46 -28 34 -50 Q10 -74 -20 -58 Q-40 -44 -46 -52 Z', hair),
    circle(-34, -20, 16, hair), circle(34, -20, 16, hair),
    circle(-14, -42, 5, '#4a3221'), circle(14, -42, 5, '#4a3221'),
    path('M-10 -22 Q0 -14 10 -22', 'none', 'stroke="#a65b3a" stroke-width="4" stroke-linecap="round"'),
    // arms & shoes
    ellipse(-52, 40, 12, 40, '#f6d7b8'), ellipse(52, 40, 12, 40, '#f6d7b8'),
    ellipse(-26, 128, 18, 10, '#7a5236'), ellipse(26, 128, 18, 10, '#7a5236'))
}

function gingerbreadMan(x: number, y: number, s = 1, tilt = 0): string {
  return g(`translate(${x} ${y}) rotate(${tilt}) scale(${s})`,
    // legs, arms, body, head — classic cookie silhouette
    ellipse(-34, 96, 22, 44, '#b5773d'), ellipse(34, 96, 22, 44, '#b5773d'),
    ellipse(-62, 6, 40, 20, '#b5773d'), ellipse(62, 6, 40, 20, '#b5773d'),
    ellipse(0, 30, 52, 70, '#b5773d'),
    circle(0, -60, 52, '#b5773d'),
    // icing
    path('M-30 -78 Q0 -96 30 -78', 'none', 'stroke="#fff6ec" stroke-width="8" stroke-linecap="round"'),
    circle(-18, -62, 7, '#4a3221'), circle(18, -62, 7, '#4a3221'),
    path('M-16 -40 Q0 -26 16 -40', 'none', 'stroke="#4a3221" stroke-width="6" stroke-linecap="round"'),
    circle(0, 4, 8, '#e2555f'), circle(0, 38, 8, '#e2555f'),
    path('M-96 6 h24 M72 6 h24', 'none', 'stroke="#fff6ec" stroke-width="8" stroke-linecap="round"'))
}

function fox(x: number, y: number, s = 1, flip = false): string {
  const dir = flip ? -1 : 1
  return g(`translate(${x} ${y}) scale(${dir * s} ${s})`,
    ellipse(0, 54, 70, 80, '#d97a3f'),
    ellipse(0, 96, 44, 40, '#f6e3cf'),
    circle(0, -44, 56, '#e2884a'),
    poly([[-50, -76], [-34, -128], [-10, -74]], '#d97a3f'),
    poly([[50, -76], [34, -128], [10, -74]], '#d97a3f'),
    poly([[-44, -80], [-34, -112], [-18, -76]], '#5c3a2e'),
    poly([[44, -80], [34, -112], [18, -76]], '#5c3a2e'),
    ellipse(0, -22, 26, 20, '#f6e3cf'),
    circle(0, -28, 8, '#4a2c1f'),
    circle(-20, -52, 7, '#3a281c'), circle(20, -52, 7, '#3a281c'),
    path('M-84 70 q-60 -6 -58 56 q44 18 78 -18 z', '#e2884a'),
    path('M-118 116 q26 12 38 6', 'none', 'stroke="#f6e3cf" stroke-width="16" stroke-linecap="round"'))
}

function goat(x: number, y: number, s = 1, coat = '#e8e2d6', flip = false): string {
  const dir = flip ? -1 : 1
  return g(`translate(${x} ${y}) scale(${dir * s} ${s})`,
    ellipse(0, 40, 82, 62, coat),
    rect(-64, 74, 18, 60, coat, 8), rect(46, 74, 18, 60, coat, 8),
    circle(64, -30, 44, coat),
    path('M52 -66 q-4 -42 26 -50 q6 26 -10 52 z', '#cbb9a2'),
    path('M84 -62 q18 -38 44 -34 q0 28 -30 44 z', '#cbb9a2'),
    poly([[36, -44], [18, -66], [40, -60]], coat),
    circle(56, -36, 6, '#3a3630'), circle(84, -36, 6, '#3a3630'),
    ellipse(78, -6, 20, 14, '#d9cbb8'),
    path('M70 8 q10 20 2 30', 'none', 'stroke="#cbb9a2" stroke-width="10" stroke-linecap="round"'),
    path('M-78 20 q-24 6 -20 30', 'none', 'stroke="' + coat + '" stroke-width="14" stroke-linecap="round"'))
}

function troll(x: number, y: number, s = 1): string {
  return g(`translate(${x} ${y}) scale(${s})`,
    ellipse(0, 70, 100, 96, '#6e7f5c'),
    circle(0, -50, 72, '#7d8f6a'),
    circle(-30, -60, 10, '#f2e14e'), circle(30, -60, 10, '#f2e14e'),
    circle(-30, -60, 5, '#31391f'), circle(30, -60, 5, '#31391f'),
    ellipse(0, -22, 26, 20, '#5c6b4a'),
    path('M-30 4 Q0 20 30 4', 'none', 'stroke="#42502f" stroke-width="7" stroke-linecap="round"'),
    poly([[-66, -96], [-42, -136], [-28, -92]], '#5c6b4a'),
    poly([[66, -96], [42, -136], [28, -92]], '#5c6b4a'),
    path('M-64 -110 q10 -40 30 -44 M64 -110 q-10 -40 -30 -44', 'none', 'stroke="#8ca06f" stroke-width="12" stroke-linecap="round"'),
    ellipse(-96, 60, 26, 54, '#7d8f6a'), ellipse(96, 60, 26, 54, '#7d8f6a'))
}

function tortoise(x: number, y: number, s = 1, flip = false): string {
  const dir = flip ? -1 : 1
  return g(`translate(${x} ${y}) scale(${dir * s} ${s})`,
    path('M-90 30 a90 64 0 0 1 180 0 z', '#5d8f57'),
    path('M-64 30 a64 44 0 0 1 128 0 z', '#7fae6f'),
    path('M-30 30 a30 22 0 0 1 60 0 z', '#5d8f57'),
    ellipse(-58, 46, 22, 14, '#8fb97f'), ellipse(58, 46, 22, 14, '#8fb97f'),
    circle(104, 8, 26, '#8fb97f'),
    circle(112, 2, 5, '#31441f'),
    path('M96 20 q10 8 20 4', 'none', 'stroke="#31441f" stroke-width="4" stroke-linecap="round"'),
    rect(-96, 26, 16, 12, '#8fb97f', 6))
}

function hare(x: number, y: number, s = 1, flip = false, lying = false): string {
  const dir = flip ? -1 : 1
  const body = lying
    ? ellipse(0, 60, 96, 50, '#cbb9d9')
    : ellipse(0, 40, 62, 84, '#cbb9d9')
  return g(`translate(${x} ${y}) scale(${dir * s} ${s})`,
    body,
    circle(lying ? -70 : 0, lying ? 30 : -60, 46, '#d9cbe6'),
    // ears
    ellipse(lying ? -92 : -22, lying ? -40 : -128, 14, 52, '#d9cbe6'),
    ellipse(lying ? -58 : 22, lying ? -44 : -128, 14, 52, '#d9cbe6'),
    ellipse(lying ? -92 : -22, lying ? -40 : -126, 7, 38, '#eaa9b8'),
    ellipse(lying ? -58 : -44 + 66, lying ? -44 : -126, 7, 38, '#eaa9b8'),
    circle(lying ? -84 : -14, lying ? 24 : -66, 6, '#463a54'),
    circle(lying ? -56 : 14, lying ? 24 : -66, 6, '#463a54'),
    circle(lying ? -70 : 0, lying ? 40 : -46, 7, '#eaa9b8'),
    ellipse(lying ? 80 : 40, lying ? 66 : 116, 26, 18, '#d9cbe6'))
}

// small props
const bowl = (x: number, y: number, s = 1, c = '#c96f4a') =>
  g(`translate(${x} ${y}) scale(${s})`,
    path('M-60 0 a60 40 0 0 0 120 0 z', c),
    ellipse(0, 0, 60, 14, '#8a4510'),
    ellipse(0, -2, 48, 10, '#f2d3a0'))

const chair = (x: number, y: number, s = 1, c = '#a9713f') =>
  g(`translate(${x} ${y}) scale(${s})`,
    // back rest
    rect(-52, -170, 104, 22, c, 10),
    rect(-52, -150, 14, 110, c, 6), rect(38, -150, 14, 110, c, 6),
    // seat
    rect(-60, -46, 120, 20, c, 8),
    // legs
    rect(-52, -26, 14, 70, c, 6), rect(38, -26, 14, 70, c, 6),
    // cushion
    rect(-48, -58, 96, 16, '#e2b07a', 8))

const bed = (x: number, y: number, s = 1, blanket = '#7fb3d5') =>
  g(`translate(${x} ${y}) scale(${s})`,
    rect(-130, -30, 260, 70, '#a9713f', 14),
    rect(-130, -44, 40, 84, '#8a5a36', 10),
    rect(-96, -34, 220, 44, blanket, 12),
    ellipse(-96, -44, 34, 18, '#fffaf1'))

const cookingPot = (x: number, y: number, s = 1) =>
  g(`translate(${x} ${y}) scale(${s})`,
    path('M-70 0 a70 52 0 0 0 140 0 z', '#4c4a58'),
    ellipse(0, 0, 70, 16, '#37353f'),
    path('M-40 -34 q6 -18 0 -30 M0 -38 q6 -18 0 -30 M40 -34 q6 -18 0 -30', 'none',
      'stroke="#c7ccdd" stroke-width="8" stroke-linecap="round"'))

const coin = (x: number, y: number, r = 16) =>
  circle(x, y, r, '#ffd678') + circle(x, y, r - 6, '#f2b866')

const fallingStar = (x: number, y: number, s = 1) =>
  g(`translate(${x} ${y}) scale(${s})`,
    poly([[0, -22], [6, -6], [22, -6], [9, 4], [14, 20], [0, 10], [-14, 20], [-9, 4], [-22, -6], [-6, -6]], '#ffd678'))

function river(y = 1180): string {
  return path(`M0 ${y} Q ${W * 0.25} ${y - 40} ${W * 0.5} ${y} T ${W} ${y} V${H} H0 Z`, '#7fb3d5') +
    path(`M120 ${y + 120} q60 -18 120 0 M520 ${y + 200} q60 -18 120 0 M860 ${y + 110} q60 -18 120 0`,
      'none', 'stroke="#a9d2e8" stroke-width="10" stroke-linecap="round"')
}

function bridge(): string {
  return g('translate(0 0)',
    path(`M140 1140 Q ${W / 2} 900 1060 1140 L1060 1240 Q ${W / 2} 1010 140 1240 Z`, '#8a6a48'),
    path(`M180 1120 Q ${W / 2} 900 1020 1120`, 'none', 'stroke="#6d4a30" stroke-width="18" stroke-linecap="round"'),
    rect(150, 1030, 20, 130, '#6d4a30', 8), rect(1030, 1030, 20, 130, '#6d4a30', 8))
}

function house(x: number, y: number, s: number, kind: 'straw' | 'sticks' | 'bricks'): string {
  const wall = kind === 'straw' ? '#e8d089' : kind === 'sticks' ? '#b08a5e' : '#c96f4a'
  const roof = kind === 'straw' ? '#d4b34e' : kind === 'sticks' ? '#8a6a48' : '#8a4510'
  const texture =
    kind === 'straw'
      ? path('M-150 40 h300 M-150 90 h300 M-150 140 h300', 'none', 'stroke="#d4b34e" stroke-width="6"')
      : kind === 'sticks'
        ? path('M-150 30 h300 M-150 80 h300 M-150 130 h300 M-100 0 v170 M0 0 v170 M100 0 v170', 'none', 'stroke="#8a6a48" stroke-width="7"')
        : path('M-150 45 h300 M-150 105 h300 M-75 0 v45 M75 0 v45 M-115 45 v60 M35 45 v60 M-35 105 v60 M115 105 v60', 'none', 'stroke="#a4562e" stroke-width="6"')
  return g(`translate(${x} ${y}) scale(${s})`,
    rect(-150, 0, 300, 170, wall, 8),
    texture,
    poly([[-180, 0], [0, -140], [180, 0]], roof),
    rect(-40, 60, 80, 110, '#5c3a2e', 10),
    circle(20, 118, 7, '#ffd678'))
}

function cottage(x: number, y: number, s = 1): string {
  return g(`translate(${x} ${y}) scale(${s})`,
    rect(-170, 0, 340, 200, '#e8c9a0', 12),
    poly([[-200, 0], [0, -160], [200, 0]], '#9c3d54'),
    rect(-50, 80, 100, 120, '#6d4a30', 12),
    rect(-140, 50, 70, 70, '#aee3f2', 10),
    rect(70, 50, 70, 70, '#aee3f2', 10),
    path('M-140 85 h70 M-105 50 v70 M70 85 h70 M105 50 v70', 'none', 'stroke="#6d4a30" stroke-width="6"'),
    rect(90, -150, 34, 80, '#7a5236', 6))
}

function windowInterior(bg: string): string {
  return rect(0, 0, W, H, bg) +
    rect(120, 160, 300, 340, '#251f3f', 20) +
    circle(270, 280, 44, '#f2b866') +
    circle(180, 240, 4, '#f4edff') + circle(350, 220, 4, '#f4edff') + circle(320, 420, 4, '#f4edff') +
    path('M120 330 h300 M270 160 v340', 'none', 'stroke="#8a6a48" stroke-width="14"') +
    rect(100, 140, 340, 20, '#8a6a48', 8) + rect(100, 500, 340, 20, '#8a6a48', 8)
}

// ---------- book scene definitions ----------

interface BookArt {
  slug: string
  title: string
  coverBg: string
  cover: () => string[]
  pages: (() => string[])[]
}

const ground = '#8fb97f'
const groundDeep = '#5d8f57'

const threeLittlePigs: BookArt = {
  slug: 'three-little-pigs',
  title: 'The Three Little Pigs',
  coverBg: '#aee3f2',
  cover: () => [
    daySky(), sun(), cloud(240, 260, 1.1),
    hills(ground, groundDeep),
    house(600, 1030, 0.7, 'bricks'),
    pig(320, 1330, 1.05), pig(600, 1360, 0.95, true), pig(880, 1330, 1.0),
    grassTuft(180, 1500, groundDeep), grassTuft(1000, 1480, groundDeep),
  ],
  pages: [
    () => [
      daySky(), sun(), cloud(300, 300, 1.2), cloud(820, 180, 0.9),
      hills(ground, groundDeep),
      cottage(600, 860, 0.9),
      pig(300, 1330, 1.0), pig(600, 1350, 0.9, true), pig(900, 1330, 0.95),
      flower(160, 1480, '#e2555f'), flower(1050, 1460, '#c9a8e0'),
    ],
    () => [
      daySky(), sun(880, 240, 90), cloud(300, 220, 1),
      hills(ground, groundDeep),
      house(430, 1040, 0.9, 'straw'),
      pig(880, 1330, 1.15),
      grassTuft(950, 1500, groundDeep), flower(1080, 1480, '#e2555f'),
    ],
    () => [
      daySky(), cloud(920, 260, 1.1),
      hills(ground, groundDeep),
      house(430, 1040, 0.9, 'sticks'),
      pig(830, 1320, 1.05), pig(1020, 1360, 0.9, true),
      tree(150, 1100, 1.1),
    ],
    () => [
      daySky(), sun(), cloud(260, 220, 0.9),
      hills(ground, groundDeep),
      house(600, 1000, 1.0, 'bricks'),
      pig(260, 1340, 1.0, false, '#f2c14e'),
      grassTuft(1020, 1480, groundDeep),
    ],
    () => [
      daySky('#9fc7d8', '#d8ecf2'), cloud(300, 260, 1.2),
      hills(ground, groundDeep),
      house(400, 1050, 0.85, 'straw'),
      wolf(880, 1300, 1.2, true),
      path('M690 1210 q-60 -40 -130 -30 M690 1260 q-70 -20 -140 0', 'none',
        'stroke="#c7ccdd" stroke-width="12" stroke-linecap="round"'),
    ],
    () => [
      daySky('#9fc7d8', '#d8ecf2'), cloud(880, 220, 1),
      hills(ground, groundDeep),
      house(400, 1050, 0.85, 'sticks'),
      wolf(880, 1290, 1.25, true),
      pig(240, 1380, 0.8), pig(400, 1420, 0.75, true),
      path('M700 1200 q-70 -50 -150 -40', 'none', 'stroke="#c7ccdd" stroke-width="14" stroke-linecap="round"'),
    ],
    () => [
      nightSky(), moon(),
      hills('#57506e', '#3f3a58'),
      house(600, 1000, 1.0, 'bricks'),
      wolf(220, 1300, 1.15),
      path('M420 1200 q60 -40 130 -30 M420 1260 q70 -20 150 -6', 'none',
        'stroke="#8b93ad" stroke-width="12" stroke-linecap="round"'),
    ],
    () => [
      windowInterior('#f6e3cf'),
      cookingPot(880, 1280, 1.3),
      pig(280, 1300, 0.95), pig(520, 1340, 0.9), pig(740, 1300, 0.85, true),
      rect(80, 1450, 1040, 40, '#a9713f', 16),
    ],
  ],
}

const goldilocks: BookArt = {
  slug: 'goldilocks',
  title: 'Goldilocks and the Three Bears',
  coverBg: '#f6e3cf',
  cover: () => [
    daySky('#f9d9a6', '#fbeed3'), sun(220, 260, 90),
    hills('#c9a45c', '#a9713f'),
    cottage(620, 880, 1.0),
    girl(280, 1340, 1.15),
    bear(920, 1330, 0.85, '#a9713f'),
    bear(1060, 1400, 0.6, '#c98d54'),
  ],
  pages: [
    () => [
      daySky(), sun(), cloud(860, 240, 1),
      hills(ground, groundDeep),
      pine(180, 1150, 1.1), pine(1040, 1130, 1.2), tree(880, 1080, 0.9),
      cottage(560, 900, 0.85),
      girl(300, 1350, 1.1),
      flower(180, 1480, '#e2555f'), flower(430, 1500, '#c9a8e0'),
    ],
    () => [
      windowInterior('#fbeed3'),
      rect(200, 1180, 800, 40, '#a9713f', 16),
      rect(260, 1220, 40, 220, '#8a5a36', 10), rect(900, 1220, 40, 220, '#8a5a36', 10),
      bowl(380, 1140, 1.3, '#c96f4a'), bowl(620, 1140, 1.05, '#7fb3d5'), bowl(830, 1140, 0.8, '#8fb97f'),
      girl(180, 1300, 0.9, '#f2c14e', '#c96f4a', true),
    ],
    () => [
      rect(0, 0, W, H, '#fbeed3'),
      rect(0, 850, W, 750, '#f2d9b8'),
      rect(60, 1400, 1080, 60, '#a9713f', 20),
      chair(280, 1400, 2.6, '#8a5a36'), chair(640, 1400, 2.1, '#a9713f'), chair(950, 1400, 1.6, '#c98d54'),
      girl(950, 1290, 1.05),
      path('M870 1400 l60 60 M1030 1400 l-60 60', 'none', 'stroke="#8a5a36" stroke-width="12" stroke-linecap="round"'),
    ],
    () => [
      rect(0, 0, W, H, '#efe2f4'),
      rect(60, 1430, 1080, 50, '#8a5a36', 18),
      bed(300, 1160, 1.35, '#9c3d54'), bed(300, 1420, 1.35, '#7fb3d5'),
      bed(880, 1420, 1.1, '#8fb97f'),
      girl(880, 1330, 0.8, '#f2c14e', '#c96f4a'),
    ],
    () => [
      rect(0, 0, W, H, '#efe2f4'),
      rect(60, 1460, 1080, 40, '#8a5a36', 16),
      bed(600, 1360, 1.7, '#8fb97f'),
      g('translate(560 1240) scale(0.9)', girl(0, 0, 1, '#f2c14e', '#c96f4a')),
      `<text x="940" y="1100" font-size="120" fill="#57506e" font-family="sans-serif">z z</text>`,
    ],
    () => [
      daySky(), cloud(300, 240, 1),
      hills(ground, groundDeep),
      cottage(600, 880, 0.9),
      bear(300, 1330, 1.0, '#a9713f'), bear(560, 1360, 0.85, '#c98d54'), bear(800, 1390, 0.65, '#b5773d'),
      pine(1060, 1150, 1.1),
    ],
    () => [
      rect(0, 0, W, H, '#efe2f4'),
      rect(60, 1460, 1080, 40, '#8a5a36', 16),
      bed(600, 1360, 1.7, '#8fb97f'),
      g('translate(560 1240) scale(0.9)', girl(0, 0, 1, '#f2c14e', '#c96f4a')),
      bear(220, 1340, 0.9, '#a9713f'), bear(1000, 1360, 0.7, '#c98d54'),
      bear(880, 1180, 0.55, '#b5773d'),
    ],
    () => [
      daySky('#f9d9a6', '#fbeed3'), sun(980, 220, 90),
      hills(ground, groundDeep),
      cottage(320, 900, 0.75),
      girl(880, 1330, 1.1, '#f2c14e', '#c96f4a', true),
      path('M700 1420 q120 30 240 0', 'none', 'stroke="#b8a889" stroke-width="18" stroke-linecap="round" stroke-dasharray="8 30"'),
      bear(180, 1350, 0.7, '#a9713f'), bear(320, 1390, 0.55, '#c98d54'), bear(430, 1420, 0.42, '#b5773d'),
    ],
  ],
}

const gingerbreadManBook: BookArt = {
  slug: 'gingerbread-man',
  title: 'The Gingerbread Man',
  coverBg: '#f9d9a6',
  cover: () => [
    daySky('#f9d9a6', '#fbeed3'), sun(220, 240, 90),
    hills(ground, groundDeep),
    gingerbreadMan(600, 1150, 1.6, -8),
    grassTuft(240, 1480, groundDeep), grassTuft(940, 1500, groundDeep),
    flower(140, 1500, '#e2555f'), flower(1060, 1470, '#c9a8e0'),
  ],
  pages: [
    () => [
      windowInterior('#fbeed3'),
      rect(120, 1220, 960, 46, '#a9713f', 18),
      rect(680, 900, 340, 320, '#4c4a58', 20),
      rect(720, 940, 260, 160, '#37353f', 14),
      circle(850, 1020, 50, '#f2b866'),
      girl(300, 1080, 1.0, '#cbc5e6', '#57506e'),
      gingerbreadMan(850, 1160, 0.7),
    ],
    () => [
      daySky(), sun(), cloud(860, 200, 1),
      hills(ground, groundDeep),
      cottage(300, 900, 0.7),
      gingerbreadMan(760, 1240, 1.15, -10),
      girl(360, 1330, 0.95, '#cbc5e6', '#57506e', true),
      path('M560 1440 q120 24 320 -10', 'none', 'stroke="#b8a889" stroke-width="16" stroke-linecap="round" stroke-dasharray="10 26"'),
    ],
    () => [
      daySky(), cloud(280, 240, 1.1),
      hills(ground, groundDeep),
      gingerbreadMan(820, 1200, 1.1, -12),
      bear(300, 1340, 0.95, '#a9713f'),
      grassTuft(600, 1480, groundDeep),
    ],
    () => [
      daySky(), sun(940, 220, 80),
      hills(ground, groundDeep),
      gingerbreadMan(780, 1180, 1.1, -12),
      goat(280, 1340, 1.1, '#e8e2d6'),
      flower(1080, 1470, '#e2555f'),
    ],
    () => [
      daySky('#9fc7d8', '#d8ecf2'),
      hills(ground, groundDeep), river(),
      gingerbreadMan(380, 1080, 1.0, -6),
      fox(820, 1280, 1.15, true),
    ],
    () => [
      daySky('#9fc7d8', '#d8ecf2'), cloud(300, 200, 1),
      river(1050),
      fox(600, 1240, 1.35, true),
      gingerbreadMan(600, 1000, 0.75, 8),
    ],
    () => [
      nightSky(), moon(240, 240, 90),
      hills('#57506e', '#3f3a58'),
      cottage(600, 950, 0.9),
      girl(300, 1360, 0.95, '#cbc5e6', '#57506e'),
      rect(760, 1300, 300, 130, '#a9713f', 18),
      gingerbreadMan(910, 1250, 0.6),
      `<text x="840" y="1470" font-size="54" fill="#fbeed3" font-family="sans-serif">🍪</text>`,
    ],
  ],
}

const billyGoats: BookArt = {
  slug: 'billy-goats-gruff',
  title: 'The Three Billy Goats Gruff',
  coverBg: '#aee3f2',
  cover: () => [
    daySky(), cloud(260, 220, 1), cloud(900, 300, 0.8),
    hills(ground, groundDeep), river(), bridge(),
    goat(340, 900, 0.8, '#e8e2d6', true), goat(620, 880, 0.65, '#d9cbb8', true), goat(860, 900, 0.5, '#cbb9a2', true),
  ],
  pages: [
    () => [
      daySky(), sun(), cloud(880, 240, 1),
      hills('#c9c25c', '#a9a13f'),
      goat(300, 1300, 1.1, '#e8e2d6'), goat(620, 1330, 0.9, '#d9cbb8'), goat(900, 1360, 0.7, '#cbb9a2'),
      grassTuft(180, 1480, '#8a8430'), grassTuft(1040, 1500, '#8a8430'),
    ],
    () => [
      daySky(), cloud(300, 220, 1.1),
      hills(ground, groundDeep), river(), bridge(),
      pine(140, 1050, 1), pine(1080, 1030, 1.1),
    ],
    () => [
      daySky('#9fc7d8', '#d8ecf2'),
      hills(ground, groundDeep), river(), bridge(),
      goat(430, 910, 0.55, '#cbb9a2', true),
      troll(760, 1380, 1.1),
    ],
    () => [
      daySky('#9fc7d8', '#d8ecf2'), cloud(880, 200, 0.9),
      hills(ground, groundDeep), river(), bridge(),
      goat(480, 900, 0.7, '#d9cbb8', true),
      troll(700, 1380, 1.1),
    ],
    () => [
      daySky('#9fc7d8', '#d8ecf2'),
      hills(ground, groundDeep), river(), bridge(),
      goat(430, 880, 0.95, '#e8e2d6', true),
      troll(780, 1380, 1.15),
    ],
    () => [
      daySky(), sun(240, 220, 80),
      hills(ground, groundDeep), river(),
      troll(600, 1180, 0.9),
      path('M480 1240 q120 90 240 0', 'none', 'stroke="#a9d2e8" stroke-width="14" stroke-linecap="round"'),
    ],
    () => [
      daySky('#f9d9a6', '#fbeed3'), sun(980, 220, 90),
      hills('#c9c25c', '#a9a13f'),
      goat(300, 1300, 1.1, '#e8e2d6', true), goat(620, 1330, 0.9, '#d9cbb8', true), goat(900, 1360, 0.7, '#cbb9a2', true),
      flower(160, 1480, '#e2555f'), flower(1050, 1500, '#c9a8e0'), grassTuft(560, 1500, '#8a8430'),
    ],
  ],
}

const tortoiseHare: BookArt = {
  slug: 'tortoise-and-hare',
  title: 'The Tortoise and the Hare',
  coverBg: '#e8f7fb',
  cover: () => [
    daySky(), sun(), cloud(280, 260, 1),
    hills(ground, groundDeep),
    path(`M80 1520 Q 400 1400 640 1470 T 1140 1420`, 'none', 'stroke="#d9cbb2" stroke-width="70" stroke-linecap="round"'),
    tortoise(380, 1400, 1.2), hare(860, 1280, 1.1, true),
  ],
  pages: [
    () => [
      daySky(), sun(), cloud(860, 220, 1),
      hills(ground, groundDeep),
      hare(820, 1280, 1.15, true),
      tortoise(340, 1400, 1.15),
      flower(140, 1500, '#e2555f'), grassTuft(1060, 1480, groundDeep),
    ],
    () => [
      daySky(), cloud(300, 240, 1),
      hills(ground, groundDeep),
      signpost(600, 1310, 1.2),
      fox(180, 1380, 0.9),
      tortoise(460, 1420, 1.0), hare(880, 1300, 1.0, true),
    ],
    () => [
      daySky(), sun(980, 220, 80),
      hills(ground, groundDeep),
      path(`M60 1500 Q 400 1380 700 1460 T 1160 1400`, 'none', 'stroke="#d9cbb2" stroke-width="60" stroke-linecap="round"'),
      hare(920, 1240, 1.05, true),
      path('M760 1200 q-40 -14 -80 4 M760 1240 q-50 -6 -90 10', 'none', 'stroke="#cbb9d9" stroke-width="10" stroke-linecap="round"'),
      tortoise(240, 1440, 0.95),
    ],
    () => [
      daySky('#f9d9a6', '#fbeed3'), sun(220, 240, 90),
      hills(ground, groundDeep),
      tree(880, 1120, 1.3),
      hare(880, 1310, 1.1, false, true),
      `<text x="1010" y="1170" font-size="90" fill="#57506e" font-family="sans-serif">z z</text>`,
      tortoise(330, 1430, 1.0),
    ],
    () => [
      daySky('#f9d9a6', '#fbeed3'),
      hills(ground, groundDeep),
      signpost(880, 1260, 1.2),
      poly([[880, 1080], [880, 1010], [1010, 1045]], '#e2555f'),
      tortoise(700, 1400, 1.15),
      hare(240, 1300, 1.0, true),
      path('M360 1260 q60 -30 110 -10', 'none', 'stroke="#cbb9d9" stroke-width="10" stroke-linecap="round"'),
    ],
    () => [
      daySky(), sun(), cloud(300, 220, 1),
      hills(ground, groundDeep),
      tortoise(600, 1360, 1.3),
      fallingStar(430, 1150, 1.4), fallingStar(790, 1130, 1.2), fallingStar(600, 1050, 1),
      hare(1000, 1360, 0.9, true),
      flower(160, 1490, '#c9a8e0'),
    ],
  ],
}

const starCoins: BookArt = {
  slug: 'star-coins',
  title: 'The Star Coins',
  coverBg: '#251f3f',
  cover: () => [
    nightSky(), moon(950, 220, 100),
    hills('#57506e', '#3f3a58'),
    girl(600, 1200, 1.7, '#b58a5e', '#7f6ba0'),
    fallingStar(300, 700, 2.6), fallingStar(520, 520, 2), fallingStar(840, 640, 2.4),
    coin(340, 1500, 28), coin(700, 1530, 24), coin(900, 1480, 28),
  ],
  pages: [
    () => [
      daySky('#cfd8e8', '#eef2f7'),
      hills('#8b93ad', '#6f7791'),
      cottage(880, 940, 0.6),
      girl(400, 1280, 1.6, '#b58a5e', '#7f6ba0'),
      rect(320, 1420, 180, 80, '#d9cbb2', 16),
    ],
    () => [
      daySky('#cfd8e8', '#eef2f7'), cloud(300, 240, 1),
      hills('#8b93ad', '#6f7791'),
      girl(380, 1270, 1.5, '#b58a5e', '#7f6ba0'),
      girl(850, 1300, 1.3, '#8a6a48', '#8b93ad', true),
      rect(560, 1400, 150, 70, '#d9cbb2', 14),
    ],
    () => [
      nightSky('#2c2547', '#57506e'),
      hills('#57506e', '#3f3a58'),
      pine(200, 1180, 1.1, '#3f3a58'), pine(1020, 1160, 1.2, '#3f3a58'),
      girl(470, 1270, 1.5, '#b58a5e', '#8b93ad'),
      girl(850, 1320, 1.15, '#6d4a30', '#57506e', true),
    ],
    () => [
      nightSky(), moon(220, 220, 80),
      hills('#57506e', '#3f3a58'),
      girl(600, 1230, 1.7, '#b58a5e', '#f6d7b8'),
      pine(160, 1180, 1.2, '#3f3a58'),
    ],
    () => [
      nightSky(),
      hills('#57506e', '#3f3a58'),
      girl(600, 1220, 1.8, '#b58a5e', '#f6d7b8'),
      fallingStar(240, 620, 3.2), fallingStar(470, 400, 2.4), fallingStar(720, 560, 3.6),
      fallingStar(930, 340, 2.4), fallingStar(1050, 680, 2.8), fallingStar(360, 880, 2.2),
      coin(340, 1500, 30), coin(520, 1540, 26), coin(780, 1500, 32), coin(960, 1540, 24),
      coin(680, 1560, 22), coin(200, 1550, 24),
    ],
    () => [
      nightSky('#2c2547', '#4a3f78'), moon(980, 200, 90),
      hills('#57506e', '#3f3a58'),
      cottage(320, 980, 0.7),
      girl(780, 1270, 1.5, '#b58a5e', '#c9a8e0'),
      coin(580, 1500, 26), coin(700, 1530, 22),
      fallingStar(900, 740, 2),
    ],
  ],
}

// ---------- cover titling ----------

function coverArt(book: BookArt): string {
  const bannerY = 120
  const children = [
    ...book.cover(),
    rect(80, bannerY, W - 160, 240, 'rgba(255,250,241,0.94)', 32),
    `<text x="${W / 2}" y="${bannerY + 105}" text-anchor="middle" font-family="'Baloo 2', 'Trebuchet MS', sans-serif" font-weight="800" font-size="86" fill="#2c2547">${escapeXml(
      book.title.length > 22 ? book.title.slice(0, book.title.lastIndexOf(' ', 22)) : book.title,
    )}</text>`,
    book.title.length > 22
      ? `<text x="${W / 2}" y="${bannerY + 195}" text-anchor="middle" font-family="'Baloo 2', 'Trebuchet MS', sans-serif" font-weight="800" font-size="86" fill="#2c2547">${escapeXml(book.title.slice(book.title.lastIndexOf(' ', 22) + 1))}</text>`
      : `<text x="${W / 2}" y="${bannerY + 190}" text-anchor="middle" font-family="'Nunito', sans-serif" font-size="44" fill="#57506e">A Storytime Library retelling</text>`,
  ]
  return svg(children, book.coverBg)
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ---------- write everything ----------

const books = [threeLittlePigs, goldilocks, gingerbreadManBook, billyGoats, tortoiseHare, starCoins]
const outRoot = join(process.cwd(), 'public', 'stories')

for (const book of books) {
  const dir = join(outRoot, book.slug)
  mkdirSync(join(dir, 'pages'), { recursive: true })
  writeFileSync(join(dir, 'cover.svg'), coverArt(book))
  book.pages.forEach((page, i) => {
    const file = join(dir, 'pages', `${String(i + 1).padStart(2, '0')}.svg`)
    writeFileSync(file, svg(page(), '#faf3e7'))
  })
  console.log(`✓ ${book.slug}: cover + ${book.pages.length} pages`)
}
console.log('Demo artwork generated.')
