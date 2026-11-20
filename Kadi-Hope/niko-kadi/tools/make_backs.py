"""Card backs: six ornate SVG designs (100x140). Run: python3 tools/make_backs.py"""
import math, random, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'www', 'img', 'backs')
CREAM = '#f3ead2'

def frame(base, gold, field, extra='', med_fill=None, med=''):
    mf = med_fill or base
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140">
<defs><clipPath id="in"><rect x="4.500" y="4.500" width="91" height="131" rx="3.500"/></clipPath>
<radialGradient id="vg" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></radialGradient>{extra}</defs>
<rect width="100" height="140" rx="7" fill="{CREAM}"/>
<rect x="4.500" y="4.500" width="91" height="131" rx="3.500" fill="{base}"/>
<g clip-path="url(#in)">{field}<rect width="100" height="140" fill="url(#vg)"/></g>
<rect x="7.500" y="7.500" width="85" height="125" rx="2.500" fill="none" stroke="{gold}" stroke-width=".9"/>
<rect x="9.800" y="9.800" width="80.400" height="120.400" rx="1.500" fill="none" stroke="{gold}" stroke-width=".35"/>
<ellipse cx="50" cy="70" rx="25" ry="34" fill="{mf}" stroke="{gold}" stroke-width=".9"/>
<ellipse cx="50" cy="70" rx="22" ry="31" fill="none" stroke="{gold}" stroke-width=".35"/>
{med}
{''.join(f'<path d="M{x} {y}l2.400 3.200-2.400 3.200-2.400-3.200z" fill="{gold}"/>' for x, y in [(16, 17), (84, 17), (16, 123), (84, 123)])}
</svg>'''

def rosette(gold, base, petals=12, r=15, cx=50, cy=70):
    s = ''
    for i in range(petals):
        a = i * 360 / petals
        s += f'<ellipse cx="{cx}" cy="{cy - r * .55}" rx="{r * .2}" ry="{r * .5}" fill="{gold}" opacity=".9" transform="rotate({a} {cx} {cy})"/>'
    s += f'<circle cx="{cx}" cy="{cy}" r="{r * .38}" fill="{base}" stroke="{gold}" stroke-width=".7"/><circle cx="{cx}" cy="{cy}" r="{r * .16}" fill="{gold}"/>'
    return s

def rep(tile_w, tile_h, content, pid):
    return f'<pattern id="{pid}" width="{tile_w}" height="{tile_h}" patternUnits="userSpaceOnUse">{content}</pattern>'

# 1 royal damask: midnight navy + gold
def royal():
    g, b = '#d9b45c', '#14264d'
    fleur = f'<path d="M10 2c3 5 6 7 6 11 0 3.500-3 4.500-4.500 7 2 .5 4 2 4 4.500-2-1-3.800-.8-5.500 1.500-1.700-2.300-3.500-2.500-5.500-1.500 0-2.500 2-4 4-4.500C6.800 17.500 4 16.500 4 13c0-4 3-6 6-11z" fill="{g}" opacity=".55"/><circle cx="10" cy="12" r="1.400" fill="{b}"/>'
    pat = rep(20, 28, fleur + f'<g transform="translate(10 14)">{fleur}</g>', 'p')
    field = f'<rect width="100" height="140" fill="url(#p)"/>'
    return frame(b, g, field, pat, '#0e1c3c', rosette(g, '#0e1c3c', 12, 15))

# 2 guilloche: burgundy + gold interlaced waves
def guilloche():
    g, b = '#e0c07a', '#5a1426'
    paths = ''
    for k in range(10):
        ph = k * math.pi / 5
        pts = ' '.join(f'{"M" if i == 0 else "L"}{x:.1f} {70 + 62 * math.sin(x / 100 * 2 * math.pi * 1.5 + ph) * 0.6:.1f}' for i, x in enumerate(range(-4, 106, 2)))
        paths += f'<path d="{pts}" fill="none" stroke="{g}" stroke-width=".35" opacity=".55"/>'
    for k in range(10):
        ph = k * math.pi / 5
        pts = ' '.join(f'{"M" if i == 0 else "L"}{50 + 62 * math.sin(y / 140 * 2 * math.pi * 2 + ph) * 0.55:.1f} {y:.1f}'.replace('M', 'M', 1) for i, y in enumerate(range(-4, 146, 2)))
        paths += f'<path d="{pts}" fill="none" stroke="{g}" stroke-width=".3" opacity=".35"/>'
    return frame(b, g, paths, '', '#3f0d1b', rosette(g, '#3f0d1b', 16, 16))

# 3 art deco: emerald fans
def deco():
    g, b = '#e6c670', '#0f4a3a'
    fan = ''.join(f'<path d="M{10 - r} 10a{r} {r} 0 0 1 {2 * r} 0" fill="none" stroke="{g}" stroke-width=".5"/>' for r in (9, 6.500, 4, 1.600))
    pat = rep(20, 10, fan + f'<g transform="translate(10 5)">{fan}</g>', 'p')
    field = '<rect width="100" height="140" fill="url(#p)" opacity=".75"/>'
    rays = ''.join(f'<line x1="50" y1="70" x2="{50 + 40 * math.cos(math.radians(a)):.1f}" y2="{70 + 40 * math.sin(math.radians(a)):.1f}" stroke="{g}" stroke-width=".4"/>' for a in range(0, 360, 15))
    med = f'<clipPath id="m"><ellipse cx="50" cy="70" rx="22" ry="31"/></clipPath><g clip-path="url(#m)" opacity=".9">{rays}</g><circle cx="50" cy="70" r="9" fill="#0b3a2d" stroke="{g}" stroke-width=".9"/><path d="M50 62l5 8-5 8-5-8z" fill="{g}"/>'
    return frame(b, g, field, pat, '#0a3226', med)

# 4 maasai beadwork: bands of red, blue, white, black, orange
def beads():
    g, b = '#f0d27a', '#a3261f'
    cols = ['#a3261f', '#f4efe2', '#1d4f9c', '#171717', '#e07b1c', '#f4efe2', '#1d8a4c']
    field = ''
    y = 4
    i = 0
    while y < 138:
        h = 6
        c = cols[i % len(cols)]
        field += f'<rect x="0" y="{y}" width="100" height="{h}" fill="{c}"/>'
        # zigzag chevrons in contrasting colour
        zz = ' '.join(f'{x},{y + (h if (x // 6) % 2 else 0)}' for x in range(-6, 112, 6))
        field += f'<polyline points="{zz}" fill="none" stroke="{cols[(i + 3) % len(cols)]}" stroke-width="1.100" opacity=".9"/>'
        field += ''.join(f'<circle cx="{x}" cy="{y + h / 2}" r=".7" fill="#fff" opacity=".45"/>' for x in range(3, 100, 6))
        y += h
        i += 1
    med = f'<ellipse cx="50" cy="70" rx="20" ry="29" fill="#171717"/>' + rosette('#f4efe2', '#a3261f', 8, 15) + ''.join(f'<circle cx="{50 + 19 * math.cos(math.radians(a)):.1f}" cy="{70 + 28 * math.sin(math.radians(a)):.1f}" r="1.100" fill="#e07b1c"/>' for a in range(0, 360, 20))
    return frame(b, g, field, '', '#171717', med)

# 5 mandala: teal with big mandala
def mandala():
    g, b = '#e8cc82', '#0d4650'
    dots = rep(10, 10, f'<circle cx="5" cy="5" r=".9" fill="{g}" opacity=".5"/><circle cx="0" cy="0" r=".6" fill="{g}" opacity=".3"/><circle cx="10" cy="10" r=".6" fill="{g}" opacity=".3"/>', 'p')
    field = '<rect width="100" height="140" fill="url(#p)"/>'
    ring = ''
    for R, n, rr in [(27, 24, 1.600), (22, 18, 1.300)]:
        ring += ''.join(f'<circle cx="{50 + R * .88 * math.cos(math.radians(a)):.1f}" cy="{70 + R * 1.2 * math.sin(math.radians(a)):.1f}" r="{rr}" fill="{g}" opacity=".9"/>' for a in range(0, 360, 360 // n))
    petals = ''.join(f'<path d="M50 70C46 60 46 52 50 46c4 6 4 14 0 24z" fill="none" stroke="{g}" stroke-width=".7" transform="rotate({a} 50 70)"/>' for a in range(0, 360, 30))
    med = ring + petals + rosette(g, '#0a3a42', 8, 10)
    return frame(b, g, field, dots, '#0a3a42', med)

# 6 constellation: indigo night sky with gold stars and joined lines
def stars():
    g, b = '#f2d58a', '#1a1840'
    random.seed(7)
    pts = [(random.uniform(8, 92), random.uniform(8, 132)) for _ in range(46)]
    field = ''
    for i, (x, y) in enumerate(pts):
        near = sorted(pts, key=lambda p: (p[0] - x) ** 2 + (p[1] - y) ** 2)[1:3]
        for (u, v) in near[:1 + i % 2]:
            field += f'<line x1="{x:.1f}" y1="{y:.1f}" x2="{u:.1f}" y2="{v:.1f}" stroke="{g}" stroke-width=".25" opacity=".4"/>'
    for i, (x, y) in enumerate(pts):
        r = .5 + (i % 3) * .35
        field += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.2f}" fill="{g}" opacity="{.6 + (i % 4) * .1:.2f}"/>'
    moon = f'<path d="M58 49A22 22 0 1 0 58 91A17 17 0 1 1 58 49Z" fill="{g}"/>' + ''.join(f'<path d="M{x} {y}l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" fill="{g}"/>' for x, y in [(58, 62), (63, 74), (57, 82)])
    return frame(b, g, field, '', '#100f2c', moon)

for name, fn in [('royal', royal), ('guilloche', guilloche), ('deco', deco), ('beads', beads), ('mandala', mandala), ('stars', stars)]:
    open(os.path.join(OUT, name + '.svg'), 'w').write(fn())
print('ok')
