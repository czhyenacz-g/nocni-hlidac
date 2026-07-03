// Centrální seznam pozadí (CSS background-image na jednotlivých obrazovkách),
// ať cesta k souboru není duplikovaná natvrdo v každé komponentě zvlášť.
export const BACKGROUND_IMAGES = {
  menu: "/menu_bg.webp",
  play: "/play_background.webp",
  win: "/win1_background.webp",
} as const;

/**
 * Natvrdo stáhne obrázky do cache prohlížeče (přes `new Image()`), ať jsou
 * hotové, než je hráč reálně potřebuje — voláno z LoadingScreen.tsx, který má
 * i tak pár sekund "falešného" načítání navíc. Díky tomu se `play`/`win`
 * pozadí zobrazí okamžitě i při zhoršeném připojení později ve směně.
 */
export function preloadBackgroundImages(): void {
  if (typeof window === "undefined") return;
  for (const src of Object.values(BACKGROUND_IMAGES)) {
    const img = new Image();
    img.src = src;
  }
}
