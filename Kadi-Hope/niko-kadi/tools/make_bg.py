#!/usr/bin/env python3
"""Paints the Niko Kadi table backdrop: ivory paper, watercolour washes, a gold rule,
and botanical sprays (with a few suit-shaped petals and clover leaves) round the edges.
The centre is left quiet so cards and buttons stay legible.

usage: python3 tools/make_bg.py            -> www/img/bg-portrait.webp, bg-landscape.webp (+ PNG masters in tools/out)
"""
import asyncio, math, os, random, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_IMG = ROOT / 'www' / 'img'
OUT_PNG = ROOT / 'tools' / 'out'

# ------------------------------------------------------------------ palette
LEAF = {  # name: (base, tip, outline)
    'sage':   ('#6f8c6e', '#bccbaa', '#56724f'),
    'sage2':  ('#86a07e', '#cdd9bb', '#628060'),
    'olive':  ('#8c9a62', '#d5d6a6', '#6c7a44'),
    'blue':   ('#7b9490', '#c3d3cd', '#587470'),
    'rosy':   ('#b08470', '#e6c8b2', '#8f6450'),
    'mint':   ('#9db592', '#dfe7cd', '#74906c'),
}
PET = {  # name: (base, tip, outline)
    'rose':  ('#c98a88', '#f4d6cf', '#a86b6b'),
    'coral': ('#e59679', '#fad4c2', '#c2755c'),
    'cream': ('#e8cf9f', '#fcf5e6', '#bfa068'),
    'gold':  ('#d9b35f', '#f6e5b1', '#b08a3a'),
    'blue':  ('#9db2bb', '#e5edee', '#6f8893'),
    'blush': ('#dfa9a2', '#fbe9e3', '#b97b7a'),
}
BROWN = '#7d5f45'
GOLD = '#c9a65c'


def f(x):
    return f'{x:.1f}'


def _lin(a, b, c):
    return (f'<linearGradient id="vbase" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{a}"/>'
            f'<stop offset=".5" stop-color="{b}"/><stop offset="1" stop-color="{c}"/></linearGradient>')


def _centre(col, a0, a1):
    return (f'<radialGradient id="centre" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="{col}" stop-opacity="{a0}"/>'
            f'<stop offset=".55" stop-color="{col}" stop-opacity="{a1}"/><stop offset="1" stop-color="{col}" stop-opacity="0"/></radialGradient>')


# every theme paints the same garden on a different ground
THEMES = {
    'parlour': dict(vbase=_lin('#eee3c6', '#e8dbbb', '#ddcda7'), centre=_centre('#f4ead0', .5, .16), vig=('#6e5236', .28),
                    washes=['#93ab8c', '#d99f96', '#e0c27a', '#9fb7b0', '#e6b896', '#b9c8a0', '#e0b2a0', '#cbc58f', '#e2a898', '#e0c07c'],
                    gold='#b8943f', gold_op=.8, paper='#e6d9b8', ripple='#a98c58', ghost=1.0, art_op=1.0,
                    mottle=('.6 .47 .28', 1.1, -.42, .30, 'multiply'), pap=('.42 .32 .2', .55, .5, 'multiply'), fibre='#a98f66', fibre_op=1.0),
    'sky': dict(vbase=_lin('#dfe9ee', '#d4e1e8', '#c4d5df'), centre=_centre('#e8f0f3', .5, .16), vig=('#41607a', .26),
                washes=['#8fb6d6', '#d4b3c0', '#a7c4b6', '#9dbbd8', '#c6d8e8', '#b4c9d8', '#d8bccb', '#cbd5b4', '#a9c3de', '#e0d1ae'],
                gold='#a8935a', gold_op=.75, paper='#d3e0e7', ripple='#8ea6b8', ghost=1.0, art_op=1.0,
                mottle=('.45 .55 .66', 1.1, -.42, .28, 'multiply'), pap=('.3 .38 .48', .55, .5, 'multiply'), fibre='#8fa3b3', fibre_op=1.0),
    'savanna': dict(vbase=_lin('#edd9bd', '#e5caa6', '#d6b88e'), centre=_centre('#f2e0c3', .5, .16), vig=('#7a4a28', .3),
                    washes=['#a9b27c', '#d9a07e', '#dcb35c', '#c99878', '#e0a98a', '#b9bf86', '#dc9f8c', '#d4be78', '#d99a7e', '#dcb45e'],
                    gold='#b58a3a', gold_op=.85, paper='#e3c9a6', ripple='#a8825a', ghost=1.0, art_op=1.0,
                    mottle=('.62 .44 .26', 1.1, -.42, .30, 'multiply'), pap=('.45 .3 .18', .55, .5, 'multiply'), fibre='#a98a62', fibre_op=1.0),
    'midnight': dict(vbase=_lin('#22303d', '#1a2631', '#121b24'), centre=_centre('#2b3b4a', .55, .2), vig=('#04090d', .45),
                     washes=['#2e5278', '#4a4a7a', '#2a6a6a', '#3a4f7a', '#5a4a6a', '#2a5a74', '#4d4575', '#355f6a', '#3a5a8a', '#6a5a3a'],
                     gold='#d1b06a', gold_op=.6, paper='#1a2631', ripple='#6f8aa5', ghost=.55, art_op=.9,
                     mottle=('.8 .86 .95', 1.1, -.5, .10, 'screen'), pap=('.8 .85 .92', .5, .16, 'screen'), fibre='#9db4c8', fibre_op=.35),
    'evergreen': dict(vbase=_lin('#203327', '#192a20', '#111e16'), centre=_centre('#2b4333', .55, .2), vig=('#030a05', .45),
                      washes=['#356a45', '#2a6a60', '#5a6a35', '#2f5a52', '#6a5a3a', '#3a6a4a', '#2a5a58', '#5f6a3a', '#3b6b55', '#6a5a35'],
                      gold='#d1b06a', gold_op=.6, paper='#192a20', ripple='#7aa086', ghost=.55, art_op=.9,
                      mottle=('.82 .92 .85', 1.1, -.5, .10, 'screen'), pap=('.82 .9 .84', .5, .16, 'screen'), fibre='#a2c0aa', fibre_op=.35),
}
T = THEMES['parlour']


# ------------------------------------------------------------------ curves
def cr_segments(pts):
    P = [pts[0]] + pts + [pts[-1]]
    segs = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        segs.append((p1, c1, c2, p2))
    return segs


def path_d(pts):
    s = cr_segments(pts)
    d = f'M{f(pts[0][0])} {f(pts[0][1])}'
    for _, c1, c2, p in s:
        d += f' C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p[0])} {f(p[1])}'
    return d


def sample(pts, n=22):
    out = []
    for p1, c1, c2, p2 in cr_segments(pts):
        for k in range(n):
            t = k / n
            mt = 1 - t
            out.append((mt ** 3 * p1[0] + 3 * mt * mt * t * c1[0] + 3 * mt * t * t * c2[0] + t ** 3 * p2[0],
                        mt ** 3 * p1[1] + 3 * mt * mt * t * c1[1] + 3 * mt * t * t * c2[1] + t ** 3 * p2[1]))
    out.append(pts[-1])
    return out


def along(poly, gap, start=0.0):
    """points (x, y, tangent-degrees, t 0..1) every `gap` units of arc length"""
    res = []
    acc = start
    total = sum(math.dist(poly[i], poly[i + 1]) for i in range(len(poly) - 1))
    run = 0.0
    for i in range(len(poly) - 1):
        a, b = poly[i], poly[i + 1]
        seg = math.dist(a, b)
        while acc <= run + seg and seg > 0:
            t = (acc - run) / seg
            ang = math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))
            res.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, ang, acc / max(total, 1)))
            acc += gap
        run += seg
    return res


# ------------------------------------------------------------------ elements
def leaf(x, y, ang, L, W, col, rng, vein=True, op=1.0):
    a, b = rng.uniform(.85, 1.15), rng.uniform(.85, 1.15)
    d = (f'M0 0 C{f(L*.22)} {f(-W*a)} {f(L*.68)} {f(-W*.95*a)} {f(L)} 0 '
         f'C{f(L*.68)} {f(W*.95*b)} {f(L*.22)} {f(W*b)} 0 0Z')
    o = LEAF[col][2]
    s = (f'<g transform="translate({f(x)} {f(y)}) rotate({f(ang)})" opacity="{op}">'
         f'<path d="{d}" fill="url(#lg-{col})" stroke="{o}" stroke-opacity=".5" stroke-width="1.1"/>')
    if vein:
        s += f'<path d="M0 0 Q{f(L*.5)} {f(-W*.1)} {f(L*.93)} 0" fill="none" stroke="{o}" stroke-opacity=".42" stroke-width=".9"/>'
        for t in (.28, .48, .66):
            s += (f'<path d="M{f(L*t)} {f(-W*.05)} L{f(L*(t+.14))} {f(-W*.5*a)} M{f(L*t)} {f(W*.05)} L{f(L*(t+.14))} {f(W*.5*b)}" '
                  f'fill="none" stroke="{o}" stroke-opacity=".26" stroke-width=".7"/>')
    return s + '</g>'


GLYPH = {
    'heart': 'M0 40 C-62 -4 -46 -46 -22 -46 C-8 -46 0 -36 0 -28 C0 -36 8 -46 22 -46 C46 -46 62 -4 0 40Z',
    'diamond': 'M0 -52 C10 -26 26 -10 42 0 C26 10 10 26 0 52 C-10 26 -26 10 -42 0 C-26 -10 -10 -26 0 -52Z',
    'spade': 'M0 -50 C56 -6 52 34 22 34 C10 34 3 28 0 20 C2 38 8 48 16 52 L-16 52 C-8 48 -2 38 0 20 C-3 28 -10 34 -22 34 C-52 34 -56 -6 0 -50Z',
    'club': ('M0 -14 C-10 -14 -16 -24 -16 -32 C-16 -44 -8 -50 0 -50 C8 -50 16 -44 16 -32 C16 -24 10 -14 0 -14Z '
             'M-8 8 C-20 12 -34 8 -34 -4 C-34 -16 -24 -22 -12 -20 C-6 -19 -2 -14 0 -10 '
             'C2 -14 6 -19 12 -20 C24 -22 34 -16 34 -4 C34 8 20 12 8 8 C6 24 10 44 18 52 L-18 52 C-10 44 -6 24 -8 8Z'),
}


def glyph(kind, x, y, s, rot, fill, op=.6, stroke=None):
    k = s / 100
    st = f' stroke="{stroke}" stroke-width="{f(1.2/k)}" stroke-opacity=".55"' if stroke else ''
    return (f'<path transform="translate({f(x)} {f(y)}) rotate({f(rot)}) scale({k:.3f})" d="{GLYPH[kind]}" '
            f'fill="{fill}" fill-opacity="{op}"{st}/>')


def petal(L, W):
    return (f'M0 0 C{f(-W)} {f(-L*.25)} {f(-W*.95)} {f(-L*.95)} 0 {f(-L)} '
            f'C{f(W*.95)} {f(-L*.95)} {f(W)} {f(-L*.25)} 0 0Z')


def centre(R, rng, n=9, dark=False):
    s = ''
    for _ in range(n):
        a = rng.uniform(0, 2 * math.pi)
        r = R * rng.uniform(.22, .42)
        x, y = math.cos(a) * r, math.sin(a) * r
        s += (f'<path d="M{f(math.cos(a)*R*.1)} {f(math.sin(a)*R*.1)} L{f(x)} {f(y)}" stroke="{BROWN}" stroke-opacity=".6" stroke-width=".9" fill="none"/>'
              f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(R*.045+1)}" fill="#d8b04e" stroke="{BROWN}" stroke-opacity=".5" stroke-width=".6"/>')
    c1, c2 = ('#6e523a', '#8f6f4e') if dark else ('#c79b3f', '#e8c96e')
    s = (f'<circle r="{f(R*.17)}" fill="{c1}" stroke="{BROWN}" stroke-opacity=".6" stroke-width=".8"/>'
         f'<circle r="{f(R*.09)}" fill="{c2}"/>') + s
    return s


def blossom(x, y, R, rot, col, rng, n=5):
    s = f'<g transform="translate({f(x)} {f(y)}) rotate({f(rot)})">'
    o = PET[col][2]
    for i in range(n):
        a = i * 360 / n + rng.uniform(-6, 6)
        Lp = R * rng.uniform(.92, 1.05)
        s += (f'<g transform="rotate({f(a)})"><path d="{petal(Lp, Lp*.64)}" fill="url(#pg-{col})" stroke="{o}" stroke-opacity=".55" stroke-width="1.1"/>'
              f'<path d="M0 {f(-Lp*.1)} L0 {f(-Lp*.6)} M{f(-Lp*.08)} {f(-Lp*.15)} L{f(-Lp*.17)} {f(-Lp*.5)} M{f(Lp*.08)} {f(-Lp*.15)} L{f(Lp*.17)} {f(-Lp*.5)}" '
              f'stroke="{o}" stroke-opacity=".3" stroke-width=".8" fill="none"/></g>')
    return s + centre(R, rng) + '</g>'


def anemone(x, y, R, rot, col, rng, n=7):
    s = f'<g transform="translate({f(x)} {f(y)}) rotate({f(rot)})">'
    o = PET[col][2]
    for i in range(n):
        a = i * 360 / n + rng.uniform(-8, 8)
        s += (f'<g transform="rotate({f(a)})"><path d="{petal(R, R*.5)}" fill="url(#pg-{col})" stroke="{o}" stroke-opacity=".55" stroke-width="1.1"/>'
              f'<path d="M0 {f(-R*.15)} L0 {f(-R*.7)}" stroke="{o}" stroke-opacity=".3" stroke-width=".8"/></g>')
    return s + centre(R * 1.05, rng, 14, dark=True) + '</g>'


def daisy(x, y, R, rot, col, rng, n=13):
    s = f'<g transform="translate({f(x)} {f(y)}) rotate({f(rot)})">'
    o = PET[col][2]
    for i in range(n):
        a = i * 360 / n + rng.uniform(-4, 4)
        s += f'<g transform="rotate({f(a)})"><path d="{petal(R, R*.2)}" fill="url(#pg-{col})" stroke="{o}" stroke-opacity=".5" stroke-width=".9"/></g>'
    s += (f'<circle r="{f(R*.24)}" fill="#d8aa43" stroke="{BROWN}" stroke-opacity=".6" stroke-width=".8"/>'
          f'<circle r="{f(R*.12)}" fill="#f0d27a"/></g>')
    return s


def bud(x, y, ang, R, col, rng):
    o = PET[col][2]
    s = f'<g transform="translate({f(x)} {f(y)}) rotate({f(ang+90)})">'
    s += f'<path d="{petal(R*1.5, R*.7)}" fill="url(#pg-{col})" stroke="{o}" stroke-opacity=".55" stroke-width="1"/>'
    s += f'<path d="M0 0 C{f(-R*.9)} {f(-R*.4)} {f(-R*.7)} {f(-R*1.2)} {f(-R*.05)} {f(-R*1.45)}" fill="none" stroke="{o}" stroke-opacity=".4" stroke-width=".8"/>'
    s += (f'<path d="M0 {f(R*.1)} C{f(-R*.9)} {f(-R*.1)} {f(-R*.9)} {f(R*.8)} 0 {f(R*.7)} C{f(R*.9)} {f(R*.8)} {f(R*.9)} {f(-R*.1)} 0 {f(R*.1)}Z" '
          f'fill="url(#lg-sage2)" stroke="{LEAF["sage2"][2]}" stroke-opacity=".5" stroke-width=".9"/>')
    return s + '</g>'


def berries(x, y, ang, rng, n=4, R=6.5):
    s = f'<g transform="translate({f(x)} {f(y)}) rotate({f(ang)})">'
    for i in range(n):
        a = rng.uniform(-50, 50)
        L = rng.uniform(16, 34)
        ex, ey = math.cos(math.radians(a)) * L, math.sin(math.radians(a)) * L
        r = R * rng.uniform(.8, 1.2)
        s += (f'<path d="M0 0 Q{f(ex*.5)} {f(ey*.3)} {f(ex)} {f(ey)}" stroke="{BROWN}" stroke-opacity=".7" stroke-width="1.1" fill="none"/>'
              f'<circle cx="{f(ex)}" cy="{f(ey)}" r="{f(r)}" fill="url(#bg-b)" stroke="#b25a48" stroke-opacity=".6" stroke-width=".9"/>'
              f'<circle cx="{f(ex-r*.3)}" cy="{f(ey-r*.3)}" r="{f(r*.28)}" fill="#fff" fill-opacity=".55"/>')
    return s + '</g>'


def sprig_dots(x, y, ang, rng, n=6):
    s = f'<g transform="translate({f(x)} {f(y)}) rotate({f(ang)})">'
    for i in range(n):
        a = rng.uniform(-55, 55)
        L = rng.uniform(18, 44)
        ex, ey = math.cos(math.radians(a)) * L, math.sin(math.radians(a)) * L
        s += (f'<path d="M0 0 L{f(ex)} {f(ey)}" stroke="{BROWN}" stroke-opacity=".5" stroke-width=".8"/>'
              f'<circle cx="{f(ex)}" cy="{f(ey)}" r="{f(rng.uniform(2.6,4.2))}" fill="#fbf3df" stroke="{GOLD}" stroke-opacity=".8" stroke-width=".8"/>')
    return s + '</g>'


def tendril(x, y, ang, R, flip, rng):
    pts = []
    for i in range(40):
        t = i / 39
        a = t * 3.2 * math.pi * flip
        r = R * (1 - t * .92)
        pts.append((math.cos(a) * r - R * (1 - 1) + t * R * 1.2, math.sin(a) * r))
    d = 'M' + ' L'.join(f'{f(px)} {f(py)}' for px, py in pts)
    return (f'<path transform="translate({f(x)} {f(y)}) rotate({f(ang)})" d="{d}" fill="none" stroke="{BROWN}" '
            f'stroke-opacity=".6" stroke-width="1.1" stroke-linecap="round"/>')


def suit_leaf(kind, x, y, s, rot, col, rng):
    o = LEAF[col][2]
    k = s / 100
    return (f'<path transform="translate({f(x)} {f(y)}) rotate({f(rot)}) scale({k:.3f})" d="{GLYPH[kind]}" '
            f'fill="url(#lgv-{col})" stroke="{o}" stroke-opacity=".55" stroke-width="{f(1.2/k)}"/>')


# ------------------------------------------------------------------ sprays
class Layers:
    def __init__(self):
        self.stems, self.leaves, self.flowers, self.fine = [], [], [], []


def stem(L, pts, w=3.2):
    d = path_d(pts)
    L.stems.append(f'<path d="{d}" fill="none" stroke="{BROWN}" stroke-opacity=".5" stroke-width="{w}" stroke-linecap="round"/>'
                   f'<path d="{d}" fill="none" stroke="#a3815c" stroke-opacity=".8" stroke-width="{w*.45:.1f}" stroke-linecap="round"/>')


def foliate(L, pts, rng, cols, gap=44, size=(58, 108), taper=.55, spread=(32, 62), start=26):
    poly = sample(pts)
    for i, (x, y, ang, t) in enumerate(along(poly, gap, start)):
        sc = 1 - taper * t
        for side in (-1, 1):
            if rng.random() < .12:
                continue
            Ln = rng.uniform(*size) * sc
            L.leaves.append(leaf(x, y, ang + side * rng.uniform(*spread), Ln, Ln * rng.uniform(.28, .4), rng.choice(cols), rng))
    # terminal leaf
    x, y, ang, _ = along(poly, 1, len(poly) and 0)[0] if False else (poly[-1][0], poly[-1][1],
        math.degrees(math.atan2(poly[-1][1] - poly[-3][1], poly[-1][0] - poly[-3][0])), 1)
    Ln = size[1] * .5
    L.leaves.append(leaf(x, y, ang + rng.uniform(-12, 12), Ln, Ln * .34, rng.choice(cols), rng))


def flower(L, kind, x, y, R, col, rng):
    fn = {'blossom': blossom, 'anemone': anemone, 'daisy': daisy}[kind]
    L.flowers.append(fn(x, y, R, rng.uniform(0, 360), col, rng))


def spray(rng, flowers, reach_x, reach_y):
    """A corner spray in local units; origin = the corner, +x along the top edge, +y down the left edge."""
    L = Layers()
    j = lambda a=14: rng.uniform(-a, a)
    cols = ['sage', 'sage2', 'olive', 'mint', 'blue']
    # main stems
    ax = [(92 + j(8), 92 + j(8)), (180 + j(), 50 + j()), (270 + j(), 92 + j()), (350 + j(), 52 + j()), (reach_x * .8 + j(), 86 + j()), (reach_x, 62 + j())]
    by = [(92 + j(8), 92 + j(8)), (52 + j(), 190 + j()), (92 + j(), 285 + j()), (54 + j(), 380 + j()), (88 + j(), reach_y * .8 + j()), (62 + j(), reach_y)]
    cz = [(92 + j(8), 92 + j(8)), (170 + j(), 160 + j()), (232 + j(), 214 + j()), (270 + j(), 286 + j())]
    dz = [(110, 108), (210 + j(), 118 + j()), (262 + j(), 170 + j(), )]
    for pts, w in ((ax, 3.4), (by, 3.4), (cz, 2.8)):
        stem(L, pts, w)
        foliate(L, pts, rng, cols + ['rosy'] if rng.random() < .5 else cols)
    # a second thin stem looping near the corner
    extra = [(92, 92), (40 + j(), 140), (96 + j(), 214 + j()), (170 + j(), 262 + j()), (236 + j(), 262 + j())]
    stem(L, extra, 2.2)
    foliate(L, extra, rng, cols, gap=40, size=(40, 74), taper=.4)
    # clusters of leaves radiating from the main flower
    for a in range(0, 360, 36):
        if 100 < a < 260 and rng.random() < .5:
            continue
        Ln = rng.uniform(86, 128)
        L.leaves.append(leaf(92, 92, a + rng.uniform(-14, 14) + 25, Ln, Ln * .34, rng.choice(cols), rng))
    # suit leaves tucked into the greenery
    kinds = ['club', 'heart', 'diamond', 'spade']
    for k, (px, py) in enumerate(((255 + j(), 72 + j()), (72 + j(), 262 + j()), (reach_x * .66, 44 + j()), (44 + j(), reach_y * .6))):
        kd = kinds[(k + rng.randrange(4)) % 4]
        col = 'rosy' if kd in ('heart', 'diamond') else rng.choice(['sage', 'sage2', 'blue'])
        L.leaves.append(suit_leaf(kd, px, py, rng.uniform(30, 40), rng.uniform(-40, 40), col, rng))
    # flowers: big one in the corner, a cluster, and smaller ones along the stems
    (k0, c0), (k1, c1), (k2, c2), (k3, c3) = flowers
    flower(L, k0, 90 + j(6), 92 + j(6), 66, c0, rng)
    flower(L, k1, 192 + j(), 148 + j(), 46, c1, rng)
    flower(L, k2, 140 + j(), 216 + j(), 40, c2, rng)
    flower(L, k3, 300 + j(), 80 + j(8), 34, c3, rng)
    flower(L, 'blossom', 76 + j(8), 330 + j(), 32, c1, rng)
    flower(L, 'daisy', reach_x * .88, 70 + j(8), 22, c2, rng)
    flower(L, 'daisy', 62 + j(8), reach_y * .86, 22, c3, rng)
    L.flowers.append(bud(cz[-1][0], cz[-1][1], 70, 12, c1, rng))
    L.flowers.append(bud(ax[-1][0], ax[-1][1], 0, 11, c0, rng))
    L.flowers.append(bud(by[-1][0], by[-1][1], 90, 11, c2, rng))
    # fine details
    for (px, py, an) in ((220, 52, -40), (330, 108, 30), (60, 230, 60), (112, 345, 20), (reach_x * .5, 100, 20), (96, reach_y * .52, 70)):
        L.fine.append(berries(px + j(6), py + j(6), an + j(20), rng, rng.choice([3, 4, 5])))
    for (px, py, an) in ((150, 70, -30), (60, 160, 70), (400, 80, 10), (84, 400, 80), (250, 140, 40)):
        L.fine.append(sprig_dots(px + j(8), py + j(8), an + j(25), rng))
    L.fine.append(tendril(150 + j(), 100, -10, 22, 1, rng))
    L.fine.append(tendril(100, 150 + j(), 80, 22, -1, rng))
    L.fine.append(tendril(reach_x * .55, 62, -20, 18, -1, rng))
    return L


def sprig(rng, length, flowers):
    """small spray growing in from an edge; origin on the edge, +y inward"""
    L = Layers()
    j = lambda a=10: rng.uniform(-a, a)
    cols = ['sage', 'sage2', 'olive', 'mint', 'blue']
    side = rng.choice([-1, 1])
    pts = [(0, 6), (side * 26 + j(), length * .3), (-side * 16 + j(), length * .6), (side * 12 + j(), length)]
    stem(L, pts, 2.8)
    foliate(L, pts, rng, cols, gap=38, size=(46, 90), taper=.45, start=20)
    for k, (px, py) in enumerate(((side * 40, length * .45), (-side * 36, length * .22))):
        kd = rng.choice(['club', 'heart', 'diamond', 'spade'])
        col = 'rosy' if kd in ('heart', 'diamond') else rng.choice(['sage', 'blue'])
        L.leaves.append(suit_leaf(kd, px, py, rng.uniform(26, 34), rng.uniform(-50, 50), col, rng))
    kd, col = flowers[0]
    flower(L, kd, pts[-1][0], pts[-1][1] + 6, 40, col, rng)
    kd, col = flowers[1]
    flower(L, kd, pts[1][0] + side * 22, pts[1][1], 26, col, rng)
    L.flowers.append(bud(pts[2][0] - side * 6, pts[2][1], 90 + side * 40, 10, flowers[1][1], rng))
    L.fine.append(berries(pts[2][0], pts[2][1] - 12, 100, rng, 4, 6))
    L.fine.append(sprig_dots(pts[1][0], pts[1][1] - 10, 90, rng, 5))
    return L


# ------------------------------------------------------------------ backdrop
DEFS = f'''
<linearGradient id="vbase" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf6e8"/><stop offset=".5" stop-color="#f7efdc"/><stop offset="1" stop-color="#f1e5ca"/></linearGradient>
<radialGradient id="centre" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#fffaf0" stop-opacity=".9"/><stop offset=".55" stop-color="#fffaf0" stop-opacity=".25"/><stop offset="1" stop-color="#fffaf0" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".78"><stop offset=".55" stop-color="#8b6b4e" stop-opacity="0"/><stop offset="1" stop-color="#8b6b4e" stop-opacity=".2"/></radialGradient>
<radialGradient id="fade" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#000"/><stop offset=".30" stop-color="#000"/><stop offset=".56" stop-color="#fff"/><stop offset="1" stop-color="#fff"/></radialGradient>
<radialGradient id="bg-b" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#f6b9a2"/><stop offset="1" stop-color="#d8745c"/></radialGradient>
{''.join(f'<linearGradient id="lg-{k}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{v[0]}"/><stop offset="1" stop-color="{v[1]}"/></linearGradient>' for k, v in LEAF.items())}
{''.join(f'<linearGradient id="lgv-{k}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="{v[0]}"/><stop offset="1" stop-color="{v[1]}"/></linearGradient>' for k, v in LEAF.items())}
{''.join(f'<linearGradient id="pg-{k}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="{v[0]}"/><stop offset=".55" stop-color="{v[1]}"/><stop offset="1" stop-color="{v[1]}"/></linearGradient>' for k, v in PET.items())}
<filter id="paint" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="3" seed="3" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="8" result="g"/>
  <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.5 0 0 0 .42" result="ga"/>
  <feComposite in="d" in2="ga" operator="in"/>
</filter>
<filter id="bleed" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="2" seed="11" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="14" result="d"/>
  <feGaussianBlur in="d" stdDeviation="7"/>
</filter>
<filter id="wash" filterUnits="userSpaceOnUse" x="-400" y="-400" width="4000" height="4000">
  <feTurbulence type="fractalNoise" baseFrequency="0.0035" numOctaves="3" seed="21" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="160" result="d"/>
  <feGaussianBlur in="d" stdDeviation="34"/>
</filter>
<filter id="wob" filterUnits="userSpaceOnUse" x="-50" y="-50" width="4000" height="4000">
  <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="5" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="5"/>
</filter>
<filter id="paperf" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" seed="5"/>
  <feColorMatrix type="matrix" values="0 0 0 0 .42  0 0 0 0 .32  0 0 0 0 .2  0 0 0 .6 -.14"/>
</filter>
<filter id="mottle" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.0032 0.0045" numOctaves="4" seed="9"/>
  <feColorMatrix type="matrix" values="0 0 0 0 .6  0 0 0 0 .47  0 0 0 0 .28  0 0 0 1.1 -.42"/>
</filter>
'''


def ripples(W, H, u, rng):
    """long flowing contour lines that hug each edge, fading inwards"""
    s = ''
    n = 7
    for edge in range(4):
        horizontal = edge in (0, 2)
        length = W if horizontal else H
        for i in range(n):
            d0 = (18 + i * 17) * u
            amp = (7 + i * 2.2) * u
            k = rng.uniform(1.6, 3.2) * math.pi / length * 2
            ph = rng.uniform(0, 6.28)
            pts = []
            steps = 90
            for t in range(steps + 1):
                p = t / steps * length
                off = d0 + amp * math.sin(k * p * 1.0 + ph) + amp * .5 * math.sin(k * p * 2.3 + ph * 1.7)
                if edge == 0: pts.append((p, off))
                elif edge == 2: pts.append((p, H - off))
                elif edge == 1: pts.append((W - off, p))
                else: pts.append((off, p))
            d = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts)
            op = .26 * (1 - i / (n + 1))
            s += f'<path d="{d}" fill="none" stroke="{T['ripple']}" stroke-opacity="{op:.3f}" stroke-width="{1.3*u:.2f}"/>'
    return s


def ghost_leaves(W, H, u, rng):
    """big pale blades far behind everything, like the faint grass in an old book plate"""
    s = ''
    m = min(W, H)
    for i in range(34):
        edge = rng.randrange(4)
        t = rng.random()
        depth = rng.uniform(-30, 190) * u
        if edge == 0: x, y, base = t * W, depth, 90
        elif edge == 2: x, y, base = t * W, H - depth, -90
        elif edge == 1: x, y, base = W - depth, t * H, 180
        else: x, y, base = depth, t * H, 0
        ang = base + rng.uniform(-38, 38)
        Ln = rng.uniform(260, 520) * u
        col = rng.choice(['sage', 'sage2', 'rosy', 'blue', 'olive'])
        d = f'M0 0 C{Ln*.25:.0f} {-Ln*.09:.0f} {Ln*.7:.0f} {-Ln*.07:.0f} {Ln:.0f} 0 C{Ln*.7:.0f} {Ln*.07:.0f} {Ln*.25:.0f} {Ln*.1:.0f} 0 0Z'
        s += (f'<g transform="translate({x:.0f} {y:.0f}) rotate({ang:.0f})" opacity="{rng.uniform(.10,.20)*T['ghost']:.2f}">'
              f'<path d="{d}" fill="{LEAF[col][1]}" stroke="{LEAF[col][0]}" stroke-opacity=".6" stroke-width="{1.6*u:.1f}"/>'
              f'<path d="M0 0 Q{Ln*.5:.0f} 0 {Ln*.95:.0f} 0" stroke="{LEAF[col][0]}" stroke-opacity=".5" stroke-width="{1.1*u:.1f}" fill="none"/></g>')
    return s


def washes(W, H, u, rng):
    m = min(W, H)
    C = T['washes']
    spec = [
        (0.02, 0.02, 480, 420, C[0], .42), (0.98, 0.03, 460, 400, C[1], .36),
        (0.03, 0.98, 470, 420, C[2], .42), (0.98, 0.97, 480, 430, C[3], .36),
        (0.5, -0.02, 520, 170, C[4], .30), (0.5, 1.02, 520, 170, C[5], .30),
        (-0.02, 0.5, 170, 520, C[6], .26), (1.02, 0.5, 170, 520, C[7], .28),
        (0.12, 0.2, 260, 230, C[8], .24), (0.9, 0.82, 260, 230, C[9], .26),
    ]
    s = ''
    for fx, fy, rx, ry, col, op in spec:
        s += f'<ellipse cx="{fx*W:.0f}" cy="{fy*H:.0f}" rx="{rx*u:.0f}" ry="{ry*u:.0f}" fill="{col}" fill-opacity="{op}"/>'
    return s


def border(W, H, u):
    i1, i2 = 30 * u, 44 * u
    r = 18 * u
    s = (f'<rect x="{i1:.1f}" y="{i1:.1f}" width="{W-2*i1:.1f}" height="{H-2*i1:.1f}" rx="{r:.1f}" fill="none" stroke="{T['gold']}" stroke-opacity="{T['gold_op']}" stroke-width="{2.4*u:.2f}"/>'
         f'<rect x="{i2:.1f}" y="{i2:.1f}" width="{W-2*i2:.1f}" height="{H-2*i2:.1f}" rx="{r*.6:.1f}" fill="none" stroke="{T['gold']}" stroke-opacity="{T['gold_op']*.7:.2f}" stroke-width="{1.1*u:.2f}"/>')
    # small suit ornaments sitting on the rule, one per edge centre
    for (x, y, kd) in ((W / 2, i1, 'diamond'), (W / 2, H - i1, 'diamond'), (i1, H / 2, 'diamond'), (W - i1, H / 2, 'diamond')):
        s += f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{15*u:.1f}" fill="{T['paper']}"/>' + glyph(kd, x, y, 19 * u, 0, T['gold'], .95)
    return s


def scatter(W, H, u, rng):
    """tiny suit-shaped petals and gold flecks drifting in the border band"""
    s = ''
    for i in range(46):
        edge = rng.randrange(4)
        t = rng.random()
        d = rng.uniform(60, 260) * u
        x, y = {0: (t * W, d), 2: (t * W, H - d), 1: (W - d, t * H), 3: (d, t * H)}[edge]
        kd = rng.choice(['heart', 'diamond', 'club', 'spade'])
        fill = {'heart': '#d9959a', 'diamond': '#eaa58f', 'club': '#86a07e', 'spade': '#8b6b4e'}[kd]
        s += glyph(kd, x, y, rng.uniform(11, 20) * u, rng.uniform(0, 360), fill, rng.uniform(.38, .6))
    for i in range(140):
        edge = rng.randrange(4)
        t = rng.random()
        d = rng.uniform(40, 280) * u
        x, y = {0: (t * W, d), 2: (t * W, H - d), 1: (W - d, t * H), 3: (d, t * H)}[edge]
        s += f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rng.uniform(1.2,3)*u:.1f}" fill="#d7b560" fill-opacity="{rng.uniform(.4,.8):.2f}"/>'
    return s


def fibres(W, H, rng):
    s = ''
    for i in range(260):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        a = rng.uniform(0, 6.28)
        L = rng.uniform(14, 46)
        c = (rng.uniform(-8, 8), rng.uniform(-8, 8))
        s += (f'<path d="M{x:.0f} {y:.0f} q{c[0]:.0f} {c[1]:.0f} {math.cos(a)*L:.0f} {math.sin(a)*L:.0f}" fill="none" '
              f'stroke="{T['fibre']}" stroke-opacity="{rng.uniform(.05,.14)*T['fibre_op']:.2f}" stroke-width="{rng.uniform(.6,1.2):.1f}"/>')
    return s


def build(W, H, theme='parlour', seed=7):
    global T
    T = THEMES[theme]
    rng = random.Random(seed)
    u = min(W, H) / 1000
    reach_x = min(430, W / (2.15 * u))
    reach_y = min(520, H / (2.15 * u))
    # per-corner flower choices: (kind, colour) x4
    sets = [
        [('blossom', 'rose'), ('anemone', 'cream'), ('blossom', 'blush'), ('daisy', 'blue')],
        [('blossom', 'coral'), ('blossom', 'gold'), ('anemone', 'blue'), ('daisy', 'cream')],
        [('anemone', 'gold'), ('blossom', 'rose'), ('blossom', 'cream'), ('daisy', 'coral')],
        [('blossom', 'blush'), ('anemone', 'blue'), ('blossom', 'coral'), ('daisy', 'gold')],
    ]
    corners = [
        (f'translate(0 0) scale({u})', rng_for(seed, 1)), (f'translate({W} 0) scale({-u} {u})', rng_for(seed, 2)),
        (f'translate(0 {H}) scale({u} {-u})', rng_for(seed, 3)), (f'translate({W} {H}) scale({-u} {-u})', rng_for(seed, 4)),
    ]
    sprays = []
    for k, (tf, r) in enumerate(corners):
        sprays.append((tf, spray(r, sets[k], reach_x, reach_y)))
    # edge sprigs in the free stretches between corner sprays
    sprigs = []
    sprig_sets = [[('blossom', 'blush'), ('daisy', 'cream')], [('anemone', 'blue'), ('blossom', 'gold')], [('blossom', 'coral'), ('daisy', 'blue')],
                  [('anemone', 'cream'), ('blossom', 'rose')]]
    n_sp = 0
    for edge in range(4):
        horizontal = edge in (0, 2)
        length = W if horizontal else H
        reach = reach_x if horizontal else reach_y
        free = length - 2 * (reach + 40) * u
        if free < 150 * u:
            continue
        count = max(1, int(free // (330 * u)))
        for i in range(count):
            p = (reach + 40) * u + free * (i + .5) / count
            r = rng_for(seed, 20 + n_sp)
            n_sp += 1
            tf = {0: f'translate({p:.0f} 0)', 2: f'translate({p:.0f} {H}) rotate(180)',
                  1: f'translate({W} {p:.0f}) rotate(90)', 3: f'translate(0 {p:.0f}) rotate(-90)'}[edge]
            sprigs.append((f'{tf} scale({u})', sprig(r, r.uniform(125, 165), sprig_sets[n_sp % 4])))

    def layer(name):
        out = ''
        for tf, L in sprays + sprigs:
            out += f'<g transform="{tf}">{"".join(getattr(L, name))}</g>'
        return out

    art = ''.join(layer(n) for n in ('stems', 'leaves', 'flowers', 'fine'))
    art += scatter(W, H, u, rng)
    r2 = rng_for(seed, 99)
    import re as _re
    defs = DEFS
    defs = _re.sub(r'<linearGradient id="vbase".*?</linearGradient>', T['vbase'], defs, flags=_re.S)
    defs = _re.sub(r'<radialGradient id="centre".*?</radialGradient>', T['centre'], defs, flags=_re.S)
    defs = _re.sub(r'<radialGradient id="vig".*?</radialGradient>',
                   f'<radialGradient id="vig" cx=".5" cy=".5" r=".78"><stop offset=".5" stop-color="{T["vig"][0]}" stop-opacity="0"/><stop offset="1" stop-color="{T["vig"][0]}" stop-opacity="{T["vig"][1]}"/></radialGradient>', defs, flags=_re.S)
    mc, ma, mb, mo, mblend = T['mottle']
    pc, pa, po, pblend = T['pap']
    def rgb(t): return ' '.join(f'0 0 0 0 {v}' if False else v for v in t.split())
    mr, mg, mbl = mc.split(); pr, pg, pbl = pc.split()
    defs = _re.sub(r'<filter id="paperf".*?</filter>', f'<filter id="paperf" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" seed="5"/><feColorMatrix type="matrix" values="0 0 0 0 {pr}  0 0 0 0 {pg}  0 0 0 0 {pbl}  0 0 0 {pa} -.14"/></filter>', defs, flags=_re.S)
    defs = _re.sub(r'<filter id="mottle".*?</filter>', f'<filter id="mottle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.0032 0.0045" numOctaves="4" seed="9"/><feColorMatrix type="matrix" values="0 0 0 0 {mr}  0 0 0 0 {mg}  0 0 0 0 {mbl}  0 0 0 {ma} {mb}"/></filter>', defs, flags=_re.S)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>{defs}
<mask id="edgemask" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="url(#fade)"/></mask>
<g id="art">{art}</g>
</defs>
<rect width="{W}" height="{H}" fill="url(#vbase)"/>
<g filter="url(#wash)">{washes(W, H, u, r2)}</g>
<rect width="{W}" height="{H}" fill="url(#centre)"/>
<g mask="url(#edgemask)"><g filter="url(#paint)" opacity=".9">{ghost_leaves(W, H, u, r2)}</g></g>
<g filter="url(#wob)">{ripples(W, H, u, r2)}</g>
<g filter="url(#wob)">{border(W, H, u)}</g>
<g mask="url(#edgemask)">
  <use href="#art" filter="url(#bleed)" opacity="{.45*T['art_op']:.2f}"/>
  <use href="#art" filter="url(#paint)" opacity="{T['art_op']}"/>
</g>
<rect width="{W}" height="{H}" fill="url(#vig)"/>
<rect width="{W}" height="{H}" filter="url(#mottle)" opacity="{mo}" style="mix-blend-mode:{mblend}"/>
<g>{fibres(W, H, r2)}</g>
<rect width="{W}" height="{H}" filter="url(#paperf)" opacity="{po}" style="mix-blend-mode:{pblend}"/>
</svg>'''
    return svg


def rng_for(seed, k):
    return random.Random(seed * 1000 + k)


async def render(svgs):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, (W, H, svg) in svgs.items():
            pg = await b.new_page(viewport={'width': W, 'height': H})
            await pg.set_content(f'<html><body style="margin:0;background:#fff">{svg}</body></html>')
            await pg.wait_for_timeout(400)
            await pg.screenshot(path=str(OUT_PNG / f'{name}.png'), clip={'x': 0, 'y': 0, 'width': W, 'height': H})
            await pg.close()
        await b.close()


def main():
    OUT_IMG.mkdir(parents=True, exist_ok=True)
    OUT_PNG.mkdir(parents=True, exist_ok=True)
    sizes = {'portrait': (1440, 2560), 'tall': (1290, 2796), 'landscape': (2560, 1440)}
    themes = [a for a in sys.argv[1:] if a in THEMES] or list(THEMES)
    only = [a for a in sys.argv[1:] if a in sizes] or list(sizes)
    from PIL import Image
    for th in themes:
        svgs = {}
        for sz in only:
            W, H = sizes[sz]
            name = f'bg-{th}-{sz}'
            svg = build(W, H, th)
            svgs[name] = (W, H, svg)
        asyncio.run(render(svgs))
        for name in svgs:
            im = Image.open(OUT_PNG / f'{name}.png').convert('RGB')
            im.save(OUT_IMG / f'{name}.webp', 'WEBP', quality=80, method=6)
            print(name, im.size, round((OUT_IMG / f'{name}.webp').stat().st_size / 1024), 'KB', flush=True)


if __name__ == '__main__':
    main()
