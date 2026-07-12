"use client";

import { useEffect, useRef, useState } from "react";
import {
  CAMERA_MANUAL_PAN_CONFIG,
  CameraPanPoint,
  lerpCameraPan,
  normalizePointerPosition,
  resolveCameraPanTarget,
  shouldUseManualCameraMode,
} from "@/game/visuals/cameraManualPan";

interface CameraManualPanImageProps {
  src: string;
  /** Stejná auto-drift konfigurace jako běžný (ne-experimentální) obraz — viz cameraMotionConfig.ts, CameraView.tsx. */
  autoZoom: number;
  autoPanXPercent: number;
  autoPanYPercent: number;
  autoDurationMs: number;
  autoEasing: string;
}

// Experimentální vrstva nad existujícím kamerovým driftem (viz zadání
// "Experimentální ruční kamera", game/visuals/cameraManualPan.ts) — DVĚ
// vnořené transformace, ne jedna:
// - vnitřní <img> pořád nese stejnou CSS `camera-image-motion` animaci jako
//   dřív (auto drift, viz cameraMotionConfig.ts) — beze změny, jen se
//   dočasně pauzne (`animationPlayState`), když ruční vrstva převezme
//   kontrolu, a pokračuje přesně odtud, kde skončila, jakmile se ruční
//   vrstva vrátí zpátky k identitě (žádný přepočet/reset CSS animace).
// - vnější wrapper nese JS-řízený transform (perspective/rotate/translate/
//   scale) pro ruční pan — v klidu (mimo manuál) je to čistá identita, takže
//   auto drift na vnitřním <img> je vidět úplně beze změny.
// Cíleně mimo GameState — žádný dispatch, žádný vliv na gameplay.
export default function CameraManualPanImage({
  src,
  autoZoom,
  autoPanXPercent,
  autoPanYPercent,
  autoDurationMs,
  autoEasing,
}: CameraManualPanImageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // rAF loop čte/píše přes refy (ne React state), ať se neděje 60 re-renderů
  // za sekundu — jediný React state tady je debugInfo níže, a ten se
  // aktualizuje jen občas (throttled), ne každý frame.
  const pointerNormRef = useRef<CameraPanPoint>({ x: 0, y: 0 });
  const lastPointerMoveAtRef = useRef<number | null>(null);
  const currentPanRef = useRef<CameraPanPoint>({ x: 0, y: 0 });
  const isTouchDeviceRef = useRef(false);
  const prefersReducedMotionRef = useRef(false);

  const [debugInfo, setDebugInfo] = useState({ mode: "AUTO" as "AUTO" | "MANUAL", panX: 0, panY: 0 });

  useEffect(() => {
    isTouchDeviceRef.current = window.matchMedia("(pointer: coarse)").matches;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = reducedMotionQuery.matches;
    const handleReducedMotionChange = () => {
      prefersReducedMotionRef.current = reducedMotionQuery.matches;
    };
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);

    let frameId: number;
    let lastDebugUpdateAtMs = 0;

    const tick = (nowMs: number) => {
      const msSinceMove = lastPointerMoveAtRef.current === null ? null : nowMs - lastPointerMoveAtRef.current;
      const manualActive = shouldUseManualCameraMode({
        experimentEnabled: true,
        isTouchDevice: isTouchDeviceRef.current,
        prefersReducedMotion: prefersReducedMotionRef.current,
        msSinceLastPointerMove: msSinceMove,
        autoResumeDelayMs: CAMERA_MANUAL_PAN_CONFIG.autoResumeDelayMs,
      });

      const target = manualActive
        ? resolveCameraPanTarget(pointerNormRef.current.x, pointerNormRef.current.y, CAMERA_MANUAL_PAN_CONFIG)
        : { x: 0, y: 0 };

      currentPanRef.current = lerpCameraPan(currentPanRef.current, target, CAMERA_MANUAL_PAN_CONFIG.lerpFactor);
      const pan = currentPanRef.current;
      const settled = Math.abs(pan.x) < 0.05 && Math.abs(pan.y) < 0.05;

      if (wrapperRef.current) {
        const tiltY = (pan.x / CAMERA_MANUAL_PAN_CONFIG.maxPanX) * CAMERA_MANUAL_PAN_CONFIG.maxTiltYDeg;
        const tiltX = -(pan.y / CAMERA_MANUAL_PAN_CONFIG.maxPanY) * CAMERA_MANUAL_PAN_CONFIG.maxTiltXDeg;
        wrapperRef.current.style.transform =
          `perspective(${CAMERA_MANUAL_PAN_CONFIG.perspectivePx}px) ` +
          `rotateX(${tiltX.toFixed(3)}deg) rotateY(${tiltY.toFixed(3)}deg) ` +
          `translate(${pan.x.toFixed(2)}px, ${pan.y.toFixed(2)}px) ` +
          `scale(${CAMERA_MANUAL_PAN_CONFIG.scale})`;
      }
      // Auto CSS drift (na vnitřním <img>) pauzne, dokud ruční vrstva vede
      // NEBO dokud ještě dobíhá (settled === false) — jakmile obojí skončí,
      // auto animace pokračuje přesně z bodu, kde byla zmražená (browser to
      // řeší sám, žádný manuální reset transformu tady).
      if (imgRef.current) {
        imgRef.current.style.animationPlayState = manualActive || !settled ? "paused" : "running";
      }

      if (nowMs - lastDebugUpdateAtMs > 200) {
        lastDebugUpdateAtMs = nowMs;
        setDebugInfo({ mode: manualActive ? "MANUAL" : "AUTO", panX: pan.x, panY: pan.y });
      }

      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      reducedMotionQuery.removeEventListener("change", handleReducedMotionChange);
      // Reset lokálních target/current hodnot (viz zadání "úklid efektu") —
      // příští mount (nová kamera/znovu zapnutý experiment, viz `key` na
      // volajícím v CameraView.tsx) tak vždy začíná čistě od středu, ne s
      // hodnotou zamrzlou z předchozí kamery.
      pointerNormRef.current = { x: 0, y: 0 };
      lastPointerMoveAtRef.current = null;
      currentPanRef.current = { x: 0, y: 0 };
    };
  }, []);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    pointerNormRef.current = normalizePointerPosition(event.clientX, event.clientY, rect);
    lastPointerMoveAtRef.current = performance.now();
  }

  // Opuštění viewportu NEresetuje lastPointerMoveAtRef na `null` (to by
  // znamenalo okamžitý skok do středu) — necháme normální autoResumeDelayMs
  // časovač doběhnout stejně, jako by myš jen přestala hýbat (viz zadání
  // "nepřeskakuj okamžitě do středu").
  function handlePointerLeave() {}

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 h-full w-full"
      style={{ transformOrigin: "center center" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <img
        ref={imgRef}
        src={src}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover camera-image-motion"
        style={
          {
            "--camera-motion-zoom": autoZoom,
            "--camera-motion-pan-x": `${autoPanXPercent}%`,
            "--camera-motion-pan-y": `${autoPanYPercent}%`,
            animationDuration: `${autoDurationMs}ms`,
            animationTimingFunction: autoEasing,
          } as React.CSSProperties
        }
      />
      {/* Read-only debug hodnoty (viz zadání "11. Debug informace") — jen
          uvnitř kamerového viewportu, admin dostane experiment vůbec jen
          přes DebugPanel.tsx, běžné UI se to netýká. */}
      <div className="absolute bottom-1 right-1 text-[9px] text-amber-300/80 font-mono bg-black/50 px-1 pointer-events-none">
        {debugInfo.mode} · x{debugInfo.panX.toFixed(1)} y{debugInfo.panY.toFixed(1)} · zoom{" "}
        {CAMERA_MANUAL_PAN_CONFIG.scale.toFixed(2)}
      </div>
    </div>
  );
}
