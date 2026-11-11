/** Crops an image to a centred square and shrinks it, so the saved picture stays tiny (about 5-20 KB). */
export async function resizeToAvatar(file: File, size = 192): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 10 * 1024 * 1024) throw new Error("That image is too big. Pick one under 10 MB.");

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not read that image."));
      element.src = url;
    });

    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (side === 0) throw new Error("Could not read that image.");
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot resize images.");
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, size, size);

    // WebP is smallest. Some browsers cannot make it, so fall back to JPEG.
    for (const [type, quality] of [["image/webp", 0.85], ["image/jpeg", 0.85], ["image/jpeg", 0.65]] as const) {
      const dataUrl = canvas.toDataURL(type, quality);
      if (dataUrl.startsWith(`data:${type}`) && dataUrl.length * 0.75 < 55_000) return dataUrl;
    }
    throw new Error("Could not make that image small enough.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
