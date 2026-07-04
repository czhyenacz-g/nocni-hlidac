"use client";

import { useEffect, useState } from "react";
import { SceneBackgroundConfig } from "@/game/visuals/backgroundImages";

interface SceneBackgroundProps {
  scene: SceneBackgroundConfig;
}

/**
 * Vrstvené atmosférické pozadí obrazovky — viz game/visuals/backgroundImages.ts
 * pro definici konkrétní scény (menu/loading/play/death/win/about). Řeší dvě
 * nezávislé věci, obě "bez skoku":
 * - prolínání (crossfade) mezi 1-3 snímky, když jich scéna má víc než jeden
 *   (např. stejný obraz, jen jinak kouřící komín)
 * - volitelný jemný flicker/dimming (blikající kontrolka, ztlumené světlo),
 *   nezávislý na počtu snímků
 *
 * Renderuje se jako absolutně umístěná vrstva ZA obsahem obrazovky — rodič
 * (`<main>`) musí mít `position: relative`, obsah nad tím normální statické
 * pozicování. Skutečné prolnutí mezi dvěma obrázky potřebuje dva reálné DOM
 * elementy s opacity transition, ne jen CSS `background-image` na <main>
 * (tam by šlo jen o tvrdý střih).
 */
export default function SceneBackground({ scene }: SceneBackgroundProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (scene.frames.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((index) => (index + 1) % scene.frames.length);
    }, scene.holdMs);
    return () => clearInterval(interval);
  }, [scene.frames, scene.holdMs]);

  if (scene.frames.length === 0) return null;

  const flickerStyle = scene.flicker
    ? ({
        "--scene-flicker-min": scene.flicker.minBrightness,
        "--scene-flicker-max": scene.flicker.maxBrightness,
        animationDuration: `${scene.flicker.periodMs}ms`,
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      className={`absolute inset-0 overflow-hidden -z-10 ${scene.flicker ? "scene-background-flicker" : ""}`}
      style={flickerStyle}
      aria-hidden="true"
    >
      {scene.frames.map((frame, index) => (
        <div
          key={frame.src}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${frame.src})`,
            opacity: index === activeIndex ? 1 : 0,
            transition: `opacity ${scene.crossfadeMs}ms ease-in-out`,
          }}
        />
      ))}
      <div className="absolute inset-0" style={{ backgroundImage: scene.overlay }} />
    </div>
  );
}
