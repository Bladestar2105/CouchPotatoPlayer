from pathlib import Path
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
BUILD_ROOT = ROOT / 'build'
PACKAGE_ROOT = BUILD_ROOT / 'asset-package'
STORE_ROOT = PACKAGE_ROOT / 'assets' / 'store'
STORE_IOS = STORE_ROOT / 'ios'
STORE_TVOS = STORE_ROOT / 'tvos'
BRAND_MARK_PATH = PACKAGE_ROOT / 'assets' / 'brand-mark.png'
BRAND_WORDMARK_PATH = PACKAGE_ROOT / 'assets' / 'brand-wordmark.png'
IOS_ICON_PATH = PACKAGE_ROOT / 'ios' / 'CouchPotatoPlayer' / 'Images.xcassets' / 'AppIcon.appiconset' / 'App-Icon-1024x1024@1x.png'
ZIP_PATH = BUILD_ROOT / 'CouchPotatoPlayer-assets.zip'

BG_HEX = '#E4E4E7'
BG = tuple(int(BG_HEX[i : i + 2], 16) for i in (1, 3, 5))


def fit_and_paste(canvas: Image.Image, image: Image.Image, ratio: float = 0.78) -> Image.Image:
    target_w = int(canvas.width * ratio)
    target_h = int(canvas.height * ratio)
    img = image.copy()
    img.thumbnail((target_w, target_h), Image.Resampling.LANCZOS)
    x = (canvas.width - img.width) // 2
    y = (canvas.height - img.height) // 2
    canvas.paste(img, (x, y), img if img.mode == 'RGBA' else None)
    return canvas


def create_store_assets(icon_src: Path):
    icon = Image.open(icon_src).convert('RGBA')

    STORE_IOS.mkdir(parents=True, exist_ok=True)
    STORE_TVOS.mkdir(parents=True, exist_ok=True)

    ios_marketing = Image.new('RGB', (1024, 1024), BG)
    fit_and_paste(ios_marketing, icon, ratio=0.82)
    ios_marketing.save(STORE_IOS / 'app-store-icon-1024.png')

    tv_targets = {
        'app-icon-small-400x240.png': (400, 240),
        'app-icon-large-1280x768.png': (1280, 768),
        'top-shelf-1920x720.png': (1920, 720),
        'top-shelf-wide-2320x720.png': (2320, 720),
    }

    for name, size in tv_targets.items():
        canvas = Image.new('RGB', size, BG)
        # keep icon compact for extra-wide banners
        ratio = 0.38 if size[0] > 1800 else 0.56
        fit_and_paste(canvas, icon, ratio=ratio)
        canvas.save(STORE_TVOS / name)


def _remove_background(image: Image.Image, tolerance: int = 4) -> Image.Image:
    px = image.load()
    corner = px[0, 0][:3]
    width, height = image.size
    data = []
    for y in range(height):
        for x in range(width):
            r, g, b, a = px[x, y]
            if abs(r - corner[0]) <= tolerance and abs(g - corner[1]) <= tolerance and abs(b - corner[2]) <= tolerance:
                data.append((r, g, b, 0))
            else:
                data.append((r, g, b, a))
    image.putdata(data)
    return image


def create_brand_wordmark(splash_src: Path):
    splash = _remove_background(Image.open(splash_src).convert('RGBA'))
    bbox = splash.getbbox()
    if not bbox:
        raise RuntimeError('Could not detect logo content in splash image.')
    cropped = splash.crop(bbox)
    max_width = 860
    if cropped.width > max_width:
        scale = max_width / cropped.width
        cropped = cropped.resize((max_width, int(cropped.height * scale)), Image.Resampling.LANCZOS)
    BRAND_WORDMARK_PATH.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(BRAND_WORDMARK_PATH)


def create_brand_mark(icon_src: Path):
    icon = _remove_background(Image.open(icon_src).convert('RGBA'))
    bbox = icon.getbbox()
    if not bbox:
        raise RuntimeError('Could not detect mark in icon image.')
    mark = icon.crop(bbox)
    target = 512
    if mark.width > target or mark.height > target:
        mark.thumbnail((target, target), Image.Resampling.LANCZOS)
    BRAND_MARK_PATH.parent.mkdir(parents=True, exist_ok=True)
    mark.save(BRAND_MARK_PATH)


def copy_ios_marketing_icon():
    IOS_ICON_PATH.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(STORE_IOS / 'app-store-icon-1024.png', IOS_ICON_PATH)


def create_zip_bundle():
    BUILD_ROOT.mkdir(parents=True, exist_ok=True)
    if PACKAGE_ROOT.exists():
        shutil.rmtree(PACKAGE_ROOT)
    PACKAGE_ROOT.mkdir(parents=True, exist_ok=True)
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()
    create_store_assets(ASSETS / 'icon.png')
    create_brand_wordmark(ASSETS / 'splash.png')
    create_brand_mark(ASSETS / 'icon.png')
    copy_ios_marketing_icon()
    shutil.make_archive(str(ZIP_PATH.with_suffix('')), 'zip', PACKAGE_ROOT)


if __name__ == '__main__':
    create_zip_bundle()
    print(f'Generated package root: {PACKAGE_ROOT}')
    print(f'ZIP bundle ready: {ZIP_PATH}')
