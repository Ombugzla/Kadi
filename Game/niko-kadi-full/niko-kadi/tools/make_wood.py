#!/usr/bin/env python3
"""Paints a dark walnut plank tabletop for the 'Wood' table: www/img/wood.webp
Each plank gets its own grain (stretched fractal noise), tone, seams, a few knots and a lacquer sheen."""
import asyncio, math, random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_PNG = ROOT / 'tools' / 'out'
OUT = ROOT / 'www' / 'img' / 'wood.webp'
W, H = 1290, 2796


def lerp(a, b, t):
    return a + (b - a) * t


def plank_filter(i, rng, x0, w):
    # warm walnut family; every plank leans a little lighter/darker/redder
    k = rng.uniform(-.14, .18)
    red = rng.uniform(-.02, .05)
    dark = (.105 + k * .25 + red * .4, .062 + k * .16, .036 + k * .1)
    light = (.40 + k * .55 + red, .245 + k * .32, .135 + k * .2)
    d = [light[c] - dark[c] for c in range(3)]
    gain, off = 2.5, -0.55
    rows = ''
    for c in range(3):
        rows += f'{d[c]*gain:.4f} 0 0 0 {dark[c] + d[c]*off:.4f}  '
    fx = rng.uniform(.010, .017)
    fy = rng.uniform(.0007, .0012)
    seed = rng.randrange(1, 9999)
    return f'''<filter id="g{i}" filterUnits="userSpaceOnUse" x="{x0}" y="0" width="{w}" height="{H}" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="{fx:.4f} {fy:.5f}" numOctaves="5" seed="{seed}" result="n"/>
  <feColorMatrix in="n" type="matrix" values="{rows} 0 0 0 0 1"/>
</filter>
<filter id="p{i}" filterUnits="userSpaceOnUse" x="{x0}" y="0" width="{w}" height="{H}" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.9 0.025" numOctaves="2" seed="{seed + 5}" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 .03  0 0 0 0 .015  0 0 0 0 .005  0 0 0 -2.6 1.25"/>
</filter>
<filter id="f{i}" filterUnits="userSpaceOnUse" x="{x0}" y="0" width="{w}" height="{H}" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="{rng.uniform(.05,.085):.3f} 0.0014" numOctaves="3" seed="{seed + 11}" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 .05  0 0 0 0 .025  0 0 0 0 .01  0 0 0 -3.4 1.55"/>
</filter>'''


def build():
    rng = random.Random(23)
    widths = []
    x = -40
    while x < W + 40:
        w = rng.uniform(150, 215)
        widths.append((x, w))
        x += w
    defs, body = '', ''
    for i, (x0, w) in enumerate(widths):
        defs += plank_filter(i, rng, x0, w)
        body += f'<rect x="{x0:.1f}" y="0" width="{w + .5:.1f}" height="{H}" filter="url(#g{i})"/>'
        body += f'<rect x="{x0:.1f}" y="0" width="{w + .5:.1f}" height="{H}" filter="url(#f{i})" opacity=".5"/>'
        body += f'<rect x="{x0:.1f}" y="0" width="{w + .5:.1f}" height="{H}" filter="url(#p{i})" opacity=".5"/>'
        # a knot or two per plank, drawn as warped concentric ellipses
        for _ in range(rng.choice([0, 0, 1, 1, 2])):
            cx, cy = x0 + rng.uniform(.25, .75) * w, rng.uniform(150, H - 150)
            rx, ry = rng.uniform(10, 17), rng.uniform(30, 48)
            body += f'<g filter="url(#warp)" opacity=".8">'
            for r in range(5):
                f = 1 + r * .55
                body += f'<ellipse cx="{cx:.0f}" cy="{cy:.0f}" rx="{rx*f:.1f}" ry="{ry*f:.1f}" fill="none" stroke="#1d0f07" stroke-opacity="{.5 - r*.08:.2f}" stroke-width="{1.4:.1f}"/>'
            body += f'<ellipse cx="{cx:.0f}" cy="{cy:.0f}" rx="{rx*.7:.1f}" ry="{ry*.7:.1f}" fill="#1a0d06" fill-opacity=".55"/></g>'
        # seams: dark gap, then a thin highlight on the plank edge
        body += f'<rect x="{x0 - 1.5:.1f}" y="0" width="3" height="{H}" fill="#0d0603" opacity=".9"/>'
        body += f'<rect x="{x0 + 1.5:.1f}" y="0" width="1.2" height="{H}" fill="#ffd9a0" opacity=".10"/>'
    # butt joints: a few planks are cut short and continued below
    for _ in range(9):
        x0, w = rng.choice(widths)
        y = rng.uniform(300, H - 300)
        body += f'<rect x="{x0:.1f}" y="{y - 1.5:.1f}" width="{w:.1f}" height="3" fill="#0d0603" opacity=".85"/>'
        body += f'<rect x="{x0:.1f}" y="{y + 1.5:.1f}" width="{w:.1f}" height="1.2" fill="#ffd9a0" opacity=".08"/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>{defs}
<filter id="warp" x="-50%" y="-50%" width="200%" height="200%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="12"/></filter>
<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe9c4" stop-opacity=".13"/><stop offset=".35" stop-color="#ffe9c4" stop-opacity="0"/><stop offset=".7" stop-color="#ffe9c4" stop-opacity=".05"/><stop offset="1" stop-color="#ffe9c4" stop-opacity="0"/></linearGradient>
<radialGradient id="pool" cx=".5" cy=".46" r=".62"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".16"/><stop offset="1" stop-color="#ffd9a0" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".78"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="#2a170c"/>
{body}
<rect width="{W}" height="{H}" fill="url(#sheen)"/>
<rect width="{W}" height="{H}" fill="url(#pool)"/>
<rect width="{W}" height="{H}" fill="url(#vig)"/>
</svg>'''


async def render(svg):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': W, 'height': H})
        await pg.set_content(f'<html><body style="margin:0">{svg}</body></html>')
        await pg.wait_for_timeout(500)
        await pg.screenshot(path=str(OUT_PNG / 'wood.png'), clip={'x': 0, 'y': 0, 'width': W, 'height': H})
        await b.close()


if __name__ == '__main__':
    OUT_PNG.mkdir(parents=True, exist_ok=True)
    (OUT_PNG / 'wood.svg').write_text(build())
    asyncio.run(render(build()))
    from PIL import Image
    im = Image.open(OUT_PNG / 'wood.png').convert('RGB')
    im.save(OUT, 'WEBP', quality=82, method=6)
    print('wood', im.size, round(OUT.stat().st_size / 1024), 'KB')
