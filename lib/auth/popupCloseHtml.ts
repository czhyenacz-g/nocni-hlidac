import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { AUTH_POPUP_ERROR_MESSAGE_TYPE, AUTH_POPUP_SUCCESS_MESSAGE_TYPE } from "./authPopupMessageTypes";

/**
 * Malá HTML stránka pro popup OAuth flow (viz zadání "6. Popup OAuth flow"
 * — "Callback ... vykresli malou HTML stránku, ta zavolá
 * window.opener?.postMessage(...) ... window.close()"). `targetOrigin` musí
 * být VŽDY čistý `protocol+host` (viz lib/auth/returnTargets.ts#getAuthReturnOrigin)
 * — tenhle modul si to navíc sám znovu ověří (`new URL(...).origin`, viz
 * `buildPopupCloseResponse` níže), ať špatné volající použití nikdy nepošle
 * postMessage na URL s cestou/query/hashem. Zpráva nese jen statický typ
 * signálu (`OBJECT13_AUTH_SUCCESS`/`OBJECT13_AUTH_ERROR`, viz
 * ./authPopupMessageTypes.ts — SERVER-ONLY modul, tenhle soubor používá
 * `node:crypto`/`next/server`, proto klientský kód importuje konstanty
 * odjinud), NIKDY auth data/user objekt/session — ta zůstává výhradně v
 * HttpOnly cookie.
 */
export { AUTH_POPUP_SUCCESS_MESSAGE_TYPE, AUTH_POPUP_ERROR_MESSAGE_TYPE };

interface RenderPopupCloseHtmlParams {
  success: boolean;
  /** Přesný origin (protocol+host) — viz getAuthReturnOrigin("itch"). */
  targetOrigin: string;
  /** Bezpečný odkaz zpět (smí obsahovat cestu), zobrazený i když se `window.opener` nepodaří použít (viz zadání "7. Popup blocked fallback"). */
  fallbackUrl: string;
}

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderPopupCloseHtml(params: RenderPopupCloseHtmlParams & { nonce: string }): string {
  const { success, targetOrigin, fallbackUrl, nonce } = params;

  // Defense-in-depth — i kdyby volající omylem předal celou URL s cestou/
  // query/hashem, tady se to VŽDY zúží na čistý origin (viz zadání "vždy
  // odvoď pouze new URL(validatedReturnUrl).origin", "nikdy neposílej jako
  // targetOrigin URL s path, query nebo hashem").
  const safeTargetOrigin = new URL(targetOrigin).origin;
  const safeFallbackHref = escapeHtmlAttribute(fallbackUrl);

  const heading = success ? "Přihlášení proběhlo úspěšně" : "Přihlášení se nezdařilo";
  const message = success
    ? "Tohle okno se má automaticky zavřít. Pokud se nezavře samo, klidně ho zavři a vrať se do hry."
    : "Zkus to prosím znovu. Pokud se okno nezavře samo, zavři ho ručně.";
  // Statická konstanta, ne interpolovaný/odvozený řetězec (viz zadání
  // "message type je statická konstanta") — `JSON.stringify` na `messageType`
  // níže je jen bezpečný způsob, jak literál dostat do JS zdrojáku, hodnota
  // sama nikdy nepochází z requestu.
  const messageType = success ? AUTH_POPUP_SUCCESS_MESSAGE_TYPE : AUTH_POPUP_ERROR_MESSAGE_TYPE;

  return `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Noční hlídač — Discord přihlášení</title>
<style nonce="${nonce}">
body { margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#111214;color:#e5e7eb;font-family:'Courier New',monospace;text-align:center;padding:24px;box-sizing:border-box; }
p { margin: 0 0 8px; }
p.heading { font-weight:bold;letter-spacing:0.05em;text-transform:uppercase; }
p.message { color:#9ca3af;font-size:13px;max-width:320px; }
a { color:#93c5fd; }
</style>
</head>
<body>
<div>
<p class="heading">${heading}</p>
<p class="message">${message}</p>
<p><a href="${safeFallbackHref}">Pokračovat</a></p>
</div>
<script nonce="${nonce}">
(function () {
  try {
    if (window.opener) {
      window.opener.postMessage(${JSON.stringify({ type: messageType })}, ${JSON.stringify(safeTargetOrigin)});
      window.close();
    }
  } catch (err) {
    // Tichý no-op — chybějící/nedostupný opener (viz zadání "pokud window.opener
    // není dostupný, zobraz stručnou úspěšnou stránku a nabídni odkaz zpět"),
    // stránka výše už odkaz na fallbackUrl zobrazuje bez ohledu na tenhle blok.
  }
})();
</script>
</body>
</html>`;
}

/**
 * Jediné místo, které skládá popup close HTML DO celé odpovědi (viz zadání
 * "4. Zabezpeč popup callback HTML") — vlastní náhodný `nonce` na
 * response (ne sdílený/statický), `Content-Security-Policy` povoluje jen
 * tenhle jeden `<script>`/`<style>` přes nonce, žádné širší `script-src`.
 * `Cache-Control: no-store` — stránka nese jednorázový OAuth výsledek, nikdy
 * se nesmí vrátit z cache. `Referrer-Policy: no-referrer` — URL (může nést
 * `?code=...` z Discordu ve `document.referrer` odkud se stránka otevřela)
 * se nikde dál neprozradí.
 */
export function buildPopupCloseResponse(params: RenderPopupCloseHtmlParams): NextResponse {
  const nonce = randomBytes(16).toString("base64");
  const html = renderPopupCloseHtml({ ...params, nonce });
  const csp = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    `style-src 'nonce-${nonce}'`,
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": csp,
    },
  });
}
