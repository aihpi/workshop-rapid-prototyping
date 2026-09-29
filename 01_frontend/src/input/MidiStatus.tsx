import { useUiStore } from "../state/index.ts";
import { connectMidi } from "./noteInput.ts";

/** Connect a MIDI keyboard on request, and the switch that hands the letter keys to the piano. */
export function MidiStatus() {
  const midiName = useUiStore((s) => s.midiName);
  const requested = useUiStore((s) => s.midiRequested);
  const armed = useUiStore((s) => s.pianoArmed);
  const setArmed = useUiStore((s) => s.setPianoArmed);
  return (
    <span className="midi-status">
      {requested ? (
        <span className="muted small" title="Web MIDI input. Chromium only; plug a keyboard in and it appears here.">
          MIDI: {midiName ?? "none"}
        </span>
      ) : (
        <button className="button ghost small" onClick={() => void connectMidi()} title="Ask the browser for MIDI access and listen to every connected keyboard. Chromium only.">
          Connect MIDI
        </button>
      )}
      <button
        className={`button ghost small ${armed ? "active" : ""}`}
        aria-pressed={armed}
        onClick={() => setArmed(!armed)}
        title="Play the sound panel's track from the computer keyboard: A W S E D F T G Y H U J K, Z and X for the octave. Letter shortcuts pause while this is on."
      >
        Keyboard piano
      </button>
    </span>
  );
}
