"use client";

// Trvalý indikátor přihlášeného admin účtu (viz lib/auth/adminUsers.ts,
// zadání "ať je někde a stránce hry - třeba úplně nahoře všude zobrazeno") —
// vidět na VŠECH obrazovkách (menu/loading/briefing/hraní/smrt/výhra), ne
// jen během směny. Renderuje se JAKO SOUROZENEC `.atmosphere-root` v
// app/play/page.tsx, stejný "position: fixed potomek by se jinak nepřichytil
// ke skutečnému rohu viewportu" důvod jako AchievementToast.tsx — vlastní
// samostatný soubor (ne vnořené do žádné konkrétní screen komponenty), ať
// zůstane nezávislý na tom, která obrazovka se zrovna renderuje.
export default function AdminBadge() {
  return (
    <div className="fixed top-0 inset-x-0 z-[200] flex justify-center pointer-events-none">
      <div className="pixel-panel px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">Jsi ADMIN!</div>
    </div>
  );
}
