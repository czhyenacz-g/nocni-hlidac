export interface AtmosphereStyle {
  saturation: number; // 1 = plná barva, 0 = černobílé
  contrast: number; // 1 = normální, vyšší = tvrdší kontrast
  flicker: boolean;
}

/** Převede tensionLevel na vizuální parametry. Volané z CSS custom properties, ne inline logikou v komponentách. */
export function tensionToAtmosphereStyle(tensionLevel: number): AtmosphereStyle {
  const saturation = Math.max(0.05, 1 - tensionLevel * 0.95);
  const contrast = 1 + tensionLevel * 0.5;
  const flicker = tensionLevel > 0.75;

  return { saturation, contrast, flicker };
}

export function atmosphereStyleToCssVars(style: AtmosphereStyle): Record<string, string> {
  return {
    "--atmosphere-saturation": String(style.saturation),
    "--atmosphere-contrast": String(style.contrast),
    "--atmosphere-flicker": style.flicker ? "1" : "0",
  };
}
