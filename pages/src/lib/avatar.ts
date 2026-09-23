// Client-safe avatar helpers. An account's `avatar` is either a "sheep-N"
// id (bundled SVG), an https URL (e.g. synced from the BlackSheep account),
// or a data:image URL from an uploaded picture.

// sheep-9..12 are PNG art (the custom silhouette set); 1..8 are bundled SVGs.
const PNG_SHEEP = new Set(["sheep-9", "sheep-10", "sheep-11", "sheep-12"]);

export function avatarSrc(avatar?: string | null): string {
  if (avatar && (avatar.startsWith("data:") || avatar.startsWith("https://"))) {
    return avatar;
  }
  const id = avatar || "sheep-1";
  return `/avatars/${id}.${PNG_SHEEP.has(id) ? "png" : "svg"}`;
}

export function isCustomAvatar(avatar?: string | null): boolean {
  return !!avatar && (avatar.startsWith("data:") || avatar.startsWith("https://"));
}

/** Read an image file, downscale to a small square data URL so it stores
 *  compactly in the accounts row instead of multi-MB blobs. */
export function readAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Pick an image file"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = 128;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      // center-crop to square
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image"));
    };
    img.src = url;
  });
}
