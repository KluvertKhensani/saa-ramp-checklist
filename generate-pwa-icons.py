from pathlib import Path
from PIL import Image, ImageDraw

PROJECT_ROOT = Path(__file__).resolve().parent

SOURCE_CANDIDATES = [
    PROJECT_ROOT / "public" / "saa-logo.png",
    PROJECT_ROOT / "public" / "assets" / "saa-logo.png",
    PROJECT_ROOT / "public" / "images" / "saa-logo.png",
    PROJECT_ROOT / "src" / "assets" / "saa-logo.png",
    PROJECT_ROOT / "src" / "assets" / "SAA-logo.png",
]

OUTPUT_DIRECTORY = PROJECT_ROOT / "public" / "icons"
APPLE_ICON_PATH = PROJECT_ROOT / "public" / "apple-touch-icon.png"

NAVY = (11, 37, 69, 255)
GOLD = (245, 183, 0, 255)
WHITE = (255, 255, 255, 255)


def find_source_image():
    for candidate in SOURCE_CANDIDATES:
        if candidate.exists():
            return candidate

    image_extensions = {
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
    }

    matches = []

    for base_directory in [
        PROJECT_ROOT / "public",
        PROJECT_ROOT / "src",
    ]:
        if not base_directory.exists():
            continue

        for path in base_directory.rglob("*"):
            if (
                path.is_file()
                and path.suffix.lower() in image_extensions
                and any(
                    keyword in path.name.lower()
                    for keyword in [
                        "saa",
                        "logo",
                    ]
                )
            ):
                matches.append(path)

    if not matches:
        raise FileNotFoundError(
            "No PNG, JPG, JPEG, or WEBP SAA logo was found. "
            "Place the source logo at public/saa-logo.png and run the script again."
        )

    matches.sort(
        key=lambda path: path.stat().st_size,
        reverse=True,
    )

    return matches[0]


def resize_to_fit(image, maximum_width, maximum_height):
    resized = image.copy()
    resized.thumbnail(
        (maximum_width, maximum_height),
        Image.Resampling.LANCZOS,
    )
    return resized


def create_icon(source_image, size, maskable=False):
    canvas = Image.new(
        "RGBA",
        (size, size),
        NAVY,
    )

    draw = ImageDraw.Draw(canvas)

    accent_height = max(
        8,
        round(size * 0.055),
    )

    draw.rounded_rectangle(
        (
            round(size * 0.12),
            round(size * 0.82),
            round(size * 0.88),
            round(size * 0.82) + accent_height,
        ),
        radius=accent_height // 2,
        fill=GOLD,
    )

    if maskable:
        maximum_width = round(size * 0.64)
        maximum_height = round(size * 0.44)
    else:
        maximum_width = round(size * 0.74)
        maximum_height = round(size * 0.50)

    resized_logo = resize_to_fit(
        source_image,
        maximum_width,
        maximum_height,
    )

    white_panel_width = round(size * 0.82)
    white_panel_height = round(size * 0.56)

    panel_left = (size - white_panel_width) // 2
    panel_top = round(size * 0.18)
    panel_right = panel_left + white_panel_width
    panel_bottom = panel_top + white_panel_height

    panel_radius = round(size * 0.09)

    draw.rounded_rectangle(
        (
            panel_left,
            panel_top,
            panel_right,
            panel_bottom,
        ),
        radius=panel_radius,
        fill=WHITE,
    )

    logo_left = (
        size - resized_logo.width
    ) // 2

    logo_top = panel_top + (
        white_panel_height -
        resized_logo.height
    ) // 2

    canvas.alpha_composite(
        resized_logo,
        (
            logo_left,
            logo_top,
        ),
    )

    return canvas


def save_icon(image, path):
    image.convert("RGBA").save(
        path,
        format="PNG",
        optimize=True,
    )


def main():
    source_path = find_source_image()

    print(
        f"Using source logo: {source_path}"
    )

    source_image = Image.open(
        source_path
    ).convert("RGBA")

    OUTPUT_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )

    icon_192 = create_icon(
        source_image,
        192,
        maskable=False,
    )

    icon_512 = create_icon(
        source_image,
        512,
        maskable=False,
    )

    maskable_192 = create_icon(
        source_image,
        192,
        maskable=True,
    )

    maskable_512 = create_icon(
        source_image,
        512,
        maskable=True,
    )

    apple_icon = create_icon(
        source_image,
        180,
        maskable=True,
    )

    save_icon(
        icon_192,
        OUTPUT_DIRECTORY / "icon-192.png",
    )

    save_icon(
        icon_512,
        OUTPUT_DIRECTORY / "icon-512.png",
    )

    save_icon(
        maskable_192,
        OUTPUT_DIRECTORY / "icon-maskable-192.png",
    )

    save_icon(
        maskable_512,
        OUTPUT_DIRECTORY / "icon-maskable-512.png",
    )

    save_icon(
        apple_icon,
        APPLE_ICON_PATH,
    )

    print("Created:")
    print(
        OUTPUT_DIRECTORY /
        "icon-192.png"
    )
    print(
        OUTPUT_DIRECTORY /
        "icon-512.png"
    )
    print(
        OUTPUT_DIRECTORY /
        "icon-maskable-192.png"
    )
    print(
        OUTPUT_DIRECTORY /
        "icon-maskable-512.png"
    )
    print(APPLE_ICON_PATH)


if __name__ == "__main__":
    main()