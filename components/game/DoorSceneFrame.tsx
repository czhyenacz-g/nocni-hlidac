import { ReactNode } from "react";

interface DoorFrame {
  src: string;
}

interface DoorSceneFrameProps {
  frames: DoorFrame[];
  activeIndex: number;
  crossfadeMs: number;
  children?: ReactNode;
}

/**
 * Lokální "scéna" jen pro DoorView — na rozdíl od SceneBackground
 * (components/SceneBackground.tsx, viz GameScreen.tsx u desk/generator) NENÍ
 * to full-viewport CSS pozadí přes bg-cover, ale reálný <img> uvnitř wrapperu
 * s pevným poměrem stran (16:9, `aspect-video`) a `object-contain`. Hotspot
 * dveří (`children`, viz DoorView.tsx) se pozicuje procentuálně vůči TOMUTO
 * wrapperu, ne vůči viewportu — obrázek i hotspot se tak vždy škálují spolu
 * (zoom prohlížeče, resize okna, libovolný poměr stran obrazovky). Se
 * SceneBackground/bg-cover by hotspot mohl "ujet" od obrázku, protože bg-cover
 * škáluje/ořezává obrázek přes celou šířku obrazovky nezávisle na velikosti
 * tohohle vnitřního divu — proto dveře záměrně tenhle jiný přístup.
 */
export default function DoorSceneFrame({ frames, activeIndex, crossfadeMs, children }: DoorSceneFrameProps) {
  return (
    <div className="relative mx-auto w-full aspect-video" style={{ maxWidth: "min(100%, 1100px)" }}>
      {frames.map((frame, index) => (
        <img
          key={frame.src}
          src={frame.src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-contain"
          style={{
            opacity: index === activeIndex ? 1 : 0,
            transition: `opacity ${crossfadeMs}ms ease-in-out`,
          }}
        />
      ))}
      {children}
    </div>
  );
}
