"use client";

import { ReactNode, useState } from "react";
import { DeathSequenceConfig, DeathSequenceImageFit } from "@/game/death/deathSequenceConfig";
import { DEATH_SEQUENCE_IMAGE_OPTIONS } from "@/game/death/deathSequenceImages";

export type DeathTestControlsProps = {
  config: DeathSequenceConfig;
  onChange: (config: DeathSequenceConfig) => void;
  onPlayFullscreen: () => void;
  onPlayInline: () => void;
  onReset: () => void;
};

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-300">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="text-amber-400 tabular-nums">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-amber-500"
      />
    </label>
  );
}

function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-300">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="pixel-panel bg-gray-900 text-gray-200 text-xs px-2 py-1"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-gray-300">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-amber-500"
      />
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-gray-700 pt-3 first:border-t-0 first:pt-0">
      <h2 className="text-xs uppercase tracking-widest text-gray-500">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

/**
 * Ovládací panel pro `/death-test` (viz zadání "6. úkol") — jen mění
 * `DeathSequenceConfig` přes `onChange`, žádnou vlastní herní/audio logiku
 * neobsahuje. Posuvníky jsou obyčejné `input type="range"` (žádná externí UI
 * knihovna, viz zadání).
 */
export default function DeathTestControls({ config, onChange, onPlayFullscreen, onPlayInline, onReset }: DeathTestControlsProps) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showCopyFallback, setShowCopyFallback] = useState(false);

  function update<K extends keyof DeathSequenceConfig>(key: K, value: DeathSequenceConfig[K]) {
    onChange({ ...config, [key]: value });
  }

  async function handleCopyConfig() {
    const json = JSON.stringify(config, null, 2);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard API not available");
      await navigator.clipboard.writeText(json);
      setCopyFeedback("Config zkopírován do schránky.");
      setShowCopyFallback(false);
    } catch {
      // Clipboard API může selhat (chybějící oprávnění, nezabezpečený
      // kontext apod., viz zadání) — nesmí to hodit stránku, jen ukázat
      // fallback textarea, ze které jde config zkopírovat ručně.
      console.warn("[DeathTestControls] clipboard API selhalo, zobrazuji fallback textarea.");
      setShowCopyFallback(true);
      setCopyFeedback(null);
    }
  }

  return (
    <div className="pixel-panel p-4 flex flex-col gap-4 text-gray-200">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onPlayFullscreen} className="pixel-button px-3 py-2 text-xs">
          Přehrát ve fullscreen
        </button>
        <button type="button" onClick={onPlayInline} className="pixel-button px-3 py-2 text-xs">
          Přehrát bez fullscreen
        </button>
        <button type="button" onClick={onReset} className="pixel-button px-3 py-2 text-xs">
          Reset na default
        </button>
        <button type="button" onClick={handleCopyConfig} className="pixel-button px-3 py-2 text-xs">
          Zkopírovat config
        </button>
      </div>

      <p className="text-[11px] text-gray-500 leading-snug">
        Nový výchozí flow: <span className="text-amber-400">blackout → white flash → monster image</span> (+ GAME OVER nad
        obrázkem). „SIGNÁL ZTRACEN“ je jen volitelná mezivrstva, defaultně vypnutá.
      </p>

      {copyFeedback && <p className="text-xs text-green-400">{copyFeedback}</p>}
      {showCopyFallback && (
        <textarea
          readOnly
          value={JSON.stringify(config, null, 2)}
          className="pixel-panel w-full h-32 text-[10px] font-mono p-2 text-gray-300"
          onFocus={(event) => event.currentTarget.select()}
        />
      )}

      <Section title="Timing">
        <SliderRow label="preDeathDelayMs" value={config.preDeathDelayMs} min={0} max={5000} onChange={(v) => update("preDeathDelayMs", v)} />
        <SliderRow label="silenceMs" value={config.silenceMs} min={0} max={3000} onChange={(v) => update("silenceMs", v)} />
        <SliderRow label="whiteFlashAtMs" value={config.whiteFlashAtMs} min={0} max={3000} onChange={(v) => update("whiteFlashAtMs", v)} />
        <SliderRow
          label="whiteFlashDurationMs"
          value={config.whiteFlashDurationMs}
          min={0}
          max={1000}
          onChange={(v) => update("whiteFlashDurationMs", v)}
        />
        <SliderRow label="redFlashAtMs" value={config.redFlashAtMs} min={0} max={1500} onChange={(v) => update("redFlashAtMs", v)} />
        <SliderRow
          label="redFlashDurationMs"
          value={config.redFlashDurationMs}
          min={0}
          max={1500}
          onChange={(v) => update("redFlashDurationMs", v)}
        />
        <SliderRow label="shakeAtMs" value={config.shakeAtMs} min={0} max={3000} onChange={(v) => update("shakeAtMs", v)} />
        <SliderRow label="shakeDurationMs" value={config.shakeDurationMs} min={0} max={2000} onChange={(v) => update("shakeDurationMs", v)} />
        <SliderRow label="deathFrameAtMs" value={config.deathFrameAtMs} min={0} max={3000} onChange={(v) => update("deathFrameAtMs", v)} />
        <SliderRow label="gameOverAtMs" value={config.gameOverAtMs} min={500} max={5000} onChange={(v) => update("gameOverAtMs", v)} />
      </Section>

      <Section title="Visual">
        <SliderRow
          label="whiteFlashOpacity"
          value={config.whiteFlashOpacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => update("whiteFlashOpacity", v)}
        />
        <SliderRow
          label="redFlashOpacity"
          value={config.redFlashOpacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => update("redFlashOpacity", v)}
        />
        <SliderRow label="shakeIntensity" value={config.shakeIntensity} min={0} max={100} onChange={(v) => update("shakeIntensity", v)} />
        <SliderRow
          label="darknessOpacity"
          value={config.darknessOpacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => update("darknessOpacity", v)}
        />
        <SliderRow
          label="noiseOpacity"
          value={config.noiseOpacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => update("noiseOpacity", v)}
        />
      </Section>

      <Section title="Death image">
        <SelectRow
          label="deathImageId"
          value={config.deathImageId}
          options={DEATH_SEQUENCE_IMAGE_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
          onChange={(v) => update("deathImageId", v)}
        />
        <SelectRow<DeathSequenceImageFit>
          label="deathImageFit"
          value={config.deathImageFit}
          options={[
            { value: "cover", label: "cover" },
            { value: "contain", label: "contain" },
          ]}
          onChange={(v) => update("deathImageFit", v)}
        />
        <ToggleRow label="deathImageEnabled" checked={config.deathImageEnabled} onChange={(v) => update("deathImageEnabled", v)} />
        <SliderRow
          label="deathImageAtMs"
          value={config.deathImageAtMs}
          min={0}
          max={4000}
          onChange={(v) => update("deathImageAtMs", v)}
        />
        <SliderRow
          label="deathImageOpacity"
          value={config.deathImageOpacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => update("deathImageOpacity", v)}
        />
      </Section>

      <Section title="Blackout">
        <SliderRow
          label="blackoutDurationMs"
          value={config.blackoutDurationMs}
          min={0}
          max={3000}
          onChange={(v) => update("blackoutDurationMs", v)}
        />
        <SliderRow
          label="blackoutOpacity"
          value={config.blackoutOpacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => update("blackoutOpacity", v)}
        />
      </Section>

      <Section title="Game over">
        <ToggleRow
          label="gameOverOverlayEnabled"
          checked={config.gameOverOverlayEnabled}
          onChange={(v) => update("gameOverOverlayEnabled", v)}
        />
      </Section>

      <Section title="Signal lost">
        <ToggleRow label="signalLostEnabled" checked={config.signalLostEnabled} onChange={(v) => update("signalLostEnabled", v)} />
      </Section>

      <Section title="Audio">
        <SliderRow
          label="deathSoundAtMs"
          value={config.deathSoundAtMs}
          min={0}
          max={4000}
          onChange={(v) => update("deathSoundAtMs", v)}
        />
        <SliderRow label="deathVolume" value={config.deathVolume} min={0} max={1} step={0.01} onChange={(v) => update("deathVolume", v)} />
        <SliderRow
          label="impactVolume"
          value={config.impactVolume}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => update("impactVolume", v)}
        />
        <SliderRow label="roarVolume" value={config.roarVolume} min={0} max={1} step={0.01} onChange={(v) => update("roarVolume", v)} />
        <SliderRow
          label="glitchVolume"
          value={config.glitchVolume}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => update("glitchVolume", v)}
        />
      </Section>

      <Section title="Přepínače">
        <ToggleRow label="whiteFlashEnabled" checked={config.whiteFlashEnabled} onChange={(v) => update("whiteFlashEnabled", v)} />
        <ToggleRow label="redFlashEnabled" checked={config.redFlashEnabled} onChange={(v) => update("redFlashEnabled", v)} />
        <ToggleRow label="shakeEnabled" checked={config.shakeEnabled} onChange={(v) => update("shakeEnabled", v)} />
        <ToggleRow label="cutAmbientInstantly" checked={config.cutAmbientInstantly} onChange={(v) => update("cutAmbientInstantly", v)} />
        <ToggleRow label="reducedFlashes" checked={config.reducedFlashes} onChange={(v) => update("reducedFlashes", v)} />
        <ToggleRow label="showPhaseDebug" checked={config.showPhaseDebug} onChange={(v) => update("showPhaseDebug", v)} />
      </Section>
    </div>
  );
}
