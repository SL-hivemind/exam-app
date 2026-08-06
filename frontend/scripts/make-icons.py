"""Build a text-free, tight-cropped icon set from the metallic SL bolt.

One-off tool, NOT part of the build. Re-run it only when the source logo
changes; the generated files are committed.

    cd frontend/public
    python ../scripts/make-icons.py Sl-metalic-png.png .

Requires pillow and numpy. Outputs logo-mark.png (navbar and in-app use),
favicon.ico / favicon-32 / -192 / -512, and apple-touch-icon.png.


The source is a 1674x940 landscape image in which the mark occupies 41% of the
width and carries a baked-in "SL EXAMS" wordmark. At favicon size that leaves
the actual mark a handful of pixels across, and in the navbar objectFit:contain
fits the empty width rather than the logo.

The bolt is a single connected component and each text block is another, so the
wordmark is removed by keeping only the largest component. Interior metallic
highlights are near-white, so the silhouette is taken as "everything the
background flood cannot reach" — otherwise every highlight becomes a hole.
"""
import sys
from collections import deque

import numpy as np
from PIL import Image

SRC = sys.argv[1]
OUT = sys.argv[2]

im = Image.open(SRC).convert('RGBA')
arr = np.array(im)
rgb = arr[:, :, :3].astype(np.int16)
alpha = arr[:, :, 3]
h, w = alpha.shape

ink = (alpha > 40) & ~((rgb[:, :, 0] > 232) & (rgb[:, :, 1] > 232) & (rgb[:, :, 2] > 232))

# Background = the not-ink region reachable from the border. Anything else is
# an interior highlight and belongs to the mark.
bg = np.zeros((h, w), dtype=bool)
q = deque()
for x in range(w):
    for y in (0, h - 1):
        if not ink[y, x] and not bg[y, x]:
            bg[y, x] = True
            q.append((y, x))
for y in range(h):
    for x in (0, w - 1):
        if not ink[y, x] and not bg[y, x]:
            bg[y, x] = True
            q.append((y, x))
while q:
    cy, cx = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = cy + dy, cx + dx
        if 0 <= ny < h and 0 <= nx < w and not ink[ny, nx] and not bg[ny, nx]:
            bg[ny, nx] = True
            q.append((ny, nx))

# Not every unreachable region is part of the mark. The negative space between
# the two bolt halves is enclosed but is plainly background; the metallic
# highlights are enclosed and are plainly not. Size separates them cleanly —
# highlights are specks, the inner void is thousands of pixels.
HOLE_MAX = 1500
enclosed = (~ink) & (~bg)
seen = np.zeros((h, w), dtype=bool)
fill = np.zeros((h, w), dtype=bool)
ys_e, xs_e = np.nonzero(enclosed)
for sy, sx in zip(ys_e, xs_e):
    if seen[sy, sx]:
        continue
    stack = [(sy, sx)]
    seen[sy, sx] = True
    region = []
    while stack:
        cy, cx = stack.pop()
        region.append((cy, cx))
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and enclosed[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                stack.append((ny, nx))
    if len(region) <= HOLE_MAX:
        for cy, cx in region:
            fill[cy, cx] = True
    else:
        print(f'  left transparent: enclosed region of {len(region)} px (inner void)')

solid = ink | fill

# Largest connected component of `solid` is the bolt; the wordmark blocks are
# their own components and are simply not kept.
labels = np.zeros((h, w), dtype=np.int32)
best_label, best_size, best_box = 0, 0, None
nxt = 0
ys, xs = np.nonzero(solid)
for sy, sx in zip(ys, xs):
    if labels[sy, sx]:
        continue
    nxt += 1
    stack = [(sy, sx)]
    labels[sy, sx] = nxt
    n = 0
    y0 = y1 = sy
    x0 = x1 = sx
    while stack:
        cy, cx = stack.pop()
        n += 1
        y0, y1 = min(y0, cy), max(y1, cy)
        x0, x1 = min(x0, cx), max(x1, cx)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = nxt
                    stack.append((ny, nx))
    if n > best_size:
        best_label, best_size, best_box = nxt, n, (x0, y0, x1, y1)

mark = labels == best_label
x0, y0, x1, y1 = best_box
print(f'mark: {best_size} px, bbox x {x0}..{x1} y {y0}..{y1} ({x1-x0+1}x{y1-y0+1})')

out = arr.copy()
out[:, :, 3] = np.where(mark, 255, 0).astype(np.uint8)
cropped = Image.fromarray(out, 'RGBA').crop((x0, y0, x1 + 1, y1 + 1))

# Square canvas with a small margin so the mark reads as large as possible —
# the whole point of the exercise.
MARGIN = 0.05
side = int(max(cropped.size) * (1 + MARGIN * 2))
canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
canvas.paste(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2))
canvas = canvas.resize((1024, 1024), Image.LANCZOS)

canvas.save(f'{OUT}/logo-mark.png')
print(f'wrote logo-mark.png 1024x1024 (mark fills '
      f'{100 * cropped.height / side:.0f}% of the height)')

for size, name in [(512, 'favicon-512.png'), (192, 'favicon-192.png'), (32, 'favicon-32.png')]:
    canvas.resize((size, size), Image.LANCZOS).save(f'{OUT}/{name}')
    print(f'wrote {name}')

# iOS renders a transparent apple-touch-icon against black, so it gets an
# opaque tile — white, which is what the logo was designed against.
apple = Image.new('RGBA', (1024, 1024), (255, 255, 255, 255))
apple.alpha_composite(canvas)
apple.convert('RGB').resize((180, 180), Image.LANCZOS).save(f'{OUT}/apple-touch-icon.png')
print('wrote apple-touch-icon.png 180x180 (white tile)')

# Multi-resolution .ico: still what makes a favicon look crisp in several
# browsers, and it is the file browsers probe for by default.
canvas.save(f'{OUT}/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
print('wrote favicon.ico (16/32/48)')
