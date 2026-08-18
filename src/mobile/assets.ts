/** Prefix for public assets, so the app works under a sub-path deploy too. */
export const assetBase = import.meta.env.BASE_URL;

export function publicAsset(path: string) {
  return `${assetBase}${path.replace(/^\//, "")}`;
}

export const mobileAssets = {
  iphoneBezel: publicAsset("assets/iphone/Bezel.png"),
  iphoneKeyboard: publicAsset("assets/iphone/Keyboard.png"),
  androidKeyboard: publicAsset("assets/android/Keyboard.png"),
  pixel10Bezel: publicAsset("assets/android/Pixel10.png"),
} as const;
