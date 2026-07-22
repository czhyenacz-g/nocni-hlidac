const WAVEFORM_CHAR = "~";
const WAVEFORM_CHAR_COUNT = 6;

/**
 * Jednoduchá CSS "vlnovka" (viz zadání, styles/pixel.css#radio-waveform-char)
 * — přesně text z mockupu ("~ ~ ~ ~ ~ ~"), jen každý znak nezávisle jemně
 * bounce-uje se staggered delay. Čistě dekorativní (aria-hidden), žádná
 * externí animační knihovna.
 */
export default function RadioWaveform() {
  return (
    <div className="flex gap-1 text-gray-400 font-mono text-sm" aria-hidden="true">
      {Array.from({ length: WAVEFORM_CHAR_COUNT }).map((_, index) => (
        <span key={index} className="radio-waveform-char" style={{ animationDelay: `${index * 120}ms` }}>
          {WAVEFORM_CHAR}
        </span>
      ))}
    </div>
  );
}
