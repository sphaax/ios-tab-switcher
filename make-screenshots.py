#!/usr/bin/env python3
"""Turn raw switcher screenshots into Chrome Web Store images (1280x800).

Each input image is scaled to fit inside 1280x800 without distortion and
centered on a black canvas (matching the switcher's background), so every
output is exactly the size the Web Store requires, with no cropping and a
seamless edge against the dark UI.

Usage:
    pip install Pillow
    python make-screenshots.py                # store-screenshots/raw -> store-screenshots/out
    python make-screenshots.py IN_DIR OUT_DIR # custom folders

Drop your raw captures (any size) into the input folder and run it. Outputs
are named screenshot-01.png, screenshot-02.png, ... in filename order.
"""
import os
import sys
from PIL import Image

WIDTH, HEIGHT = 1280, 800
BACKGROUND = (0, 0, 0)  # matches the switcher's black background
EXTS = {'.png', '.jpg', '.jpeg', '.webp'}


def process(src, dst):
    img = Image.open(src).convert('RGB')
    scale = min(WIDTH / img.width, HEIGHT / img.height)
    new_size = (round(img.width * scale), round(img.height * scale))
    resized = img.resize(new_size, Image.LANCZOS)
    canvas = Image.new('RGB', (WIDTH, HEIGHT), BACKGROUND)
    canvas.paste(resized, ((WIDTH - new_size[0]) // 2, (HEIGHT - new_size[1]) // 2))
    canvas.save(dst, 'PNG')


def main():
    root = os.path.dirname(os.path.abspath(__file__))
    in_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'store-screenshots', 'raw')
    out_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, 'store-screenshots', 'out')

    if not os.path.isdir(in_dir):
        os.makedirs(in_dir, exist_ok=True)
        print(f'Created {in_dir}\nPut your raw screenshots there and run again.')
        return

    files = sorted(f for f in os.listdir(in_dir)
                   if os.path.splitext(f)[1].lower() in EXTS)
    if not files:
        print(f'No images found in {in_dir} (accepted: {", ".join(sorted(EXTS))})')
        return

    os.makedirs(out_dir, exist_ok=True)
    for i, name in enumerate(files, 1):
        dst = os.path.join(out_dir, f'screenshot-{i:02d}.png')
        process(os.path.join(in_dir, name), dst)
        print(f'{name}  ->  {os.path.relpath(dst, root)}  (1280x800)')

    print(f'\n{len(files)} screenshot(s) ready in {out_dir}')
    print('Upload up to 5 of them in the Web Store listing.')


if __name__ == '__main__':
    main()
