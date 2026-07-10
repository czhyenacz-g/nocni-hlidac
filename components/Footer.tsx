import Link from "next/link";
import { COPY } from "@/content/copy";
import { GAME_VERSION } from "@/game/balancing/constants";
import { BUILD_COMMIT } from "@/game/core/buildInfo";

// Nenápadná patička pro menu/prezentační stránky (MainMenuScreen, /about) —
// záměrně se nepoužívá na herních obrazovkách (GameScreen/LoadingScreen), aby
// nerušila hru. Texty jsou v content/copy.ts, ne natvrdo tady.
export default function Footer() {
  return (
    <footer className="w-full py-3 px-4 text-center text-[10px] text-gray-600">
      <p className="mb-1">
        <span className="text-gray-500">{COPY.footer.projectName}</span>
        {" · "}
        <Link href="/about" className="hover:text-gray-400 underline">
          {COPY.footer.aboutLinkLabel}
        </Link>
        {" · "}
        <span>{COPY.footer.comingSoonLabel}</span>
      </p>
      <p className="text-gray-700 italic mb-1">{COPY.footer.tagline}</p>
      <p>
        {GAME_VERSION} <span className="text-gray-700">({BUILD_COMMIT})</span> ·{" "}
        <a href={`mailto:${COPY.menu.authorEmail}`} className="hover:text-gray-400">
          {COPY.menu.authorEmail}
        </a>
      </p>
    </footer>
  );
}
