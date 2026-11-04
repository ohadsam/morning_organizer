#!/usr/bin/env python3
"""Builds web/icon.svg (the SonRise logo, wordmark converted to outlines so it never depends on an installed font) and web/icons/logo-maskable.svg.
Run: python3 scripts/make-logo.py  (needs fonttools and Inter-Bold.otf); then node scripts/make-icons.mjs renders the PNGs."""
import math, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT = '/usr/share/fonts/opentype/inter/Inter-Bold.otf'
f = TTFont(FONT); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm; hmtx = f['hmtx']
def word(text, size, x0, base, color_for):
    s = size / upm; x = x0; out = []
    for i, ch in enumerate(text):
        g = cmap[ord(ch)]; pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x, base)))
        out.append(f'<path fill="{color_for(i)}" d="{pen.getCommands()}"/>'); x += hmtx[g][0] * s - 1.5
    return out, x - x0
# measure then centre
_, w = word('SonRise', 112, 0, 0, lambda i: '#000')
size = 112; x0 = (512 - w) / 2; base = 432
glyphs, _ = word('SonRise', size, x0, base, lambda i: '#fff4d6' if i < 3 else '#ffd166')

cx, cy, R = 256, 292, 92
rays = []
for k in range(-4, 5):                       # nine rays over the upper half
    a = math.radians(90 - k * 20)
    x1, y1 = cx + math.cos(a) * (R + 22), cy - math.sin(a) * (R + 22); x2, y2 = cx + math.cos(a) * (R + 58), cy - math.sin(a) * (R + 58)
    rays.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"/>')
def svg(maskable):
    inner = f'''<g stroke="#ffe39a" stroke-width="15" stroke-linecap="round" opacity=".95">{''.join(rays)}</g>
<circle cx="{cx}" cy="{cy}" r="{R}" fill="url(#sun)"/>
<rect x="0" y="{cy}" width="512" height="{512-cy}" fill="url(#ground)"/>
<rect x="0" y="{cy}" width="512" height="5" fill="#ffd166" opacity=".9"/>
{''.join(glyphs)}'''
    if maskable: inner = f'<g transform="translate(256 256) scale(.74) translate(-256 -256)">{inner}</g>'
    clip = '<rect width="512" height="512" fill="url(#sky)"/>' if maskable else '<rect width="512" height="512" rx="112" fill="url(#sky)"/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="SonRise"><title>SonRise</title><defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2487"/><stop offset=".5" stop-color="#6c5ce7"/><stop offset=".62" stop-color="#ff9f6b"/><stop offset="1" stop-color="#ffd98a"/></linearGradient>
<radialGradient id="sun" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#fff2b8"/><stop offset="1" stop-color="#ffc233"/></radialGradient>
<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2470"/><stop offset="1" stop-color="#1c1856"/></linearGradient></defs>
{clip}{inner if not maskable else '<clipPath id="all"><rect width="512" height="512"/></clipPath><rect x="0" y="'+str(cy)+'" width="512" height="'+str(512-cy)+'" fill="url(#ground)"/>'+inner}</svg>'''
open('web/icon.svg', 'w').write(svg(False)); open('web/icons/logo-maskable.svg', 'w').write(svg(True))
print('ok', round(w))
