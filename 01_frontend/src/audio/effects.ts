import { resolvedEffectParams } from "@hpi/shared";
import type { Effect, EffectKind } from "@hpi/shared";
import * as Tone from "tone";

/**
 * One insert device behind a uniform interface, like `Voice` for instruments.
 * The chain is rebuilt whenever its structure changes and only `set` is called
 * for a parameter tweak, so no per-kind bypass logic exists: a disabled effect
 * is simply not built.
 */
export type EffectUnit = {
  readonly id: string;
  readonly kind: EffectKind;
  readonly node: Tone.ToneAudioNode;
  set(params: Record<string, number | string>): void;
  dispose(): void;
};

type Params = Record<string, number | string>;
const num = (p: Params, key: string): number => p[key] as number;

export function createEffectUnit(effect: Effect): EffectUnit {
  const params = resolvedEffectParams(effect);
  const unit = build(effect, params);
  unit.set(params);
  return unit;
}

function build(effect: Effect, initial: Params): EffectUnit {
  const { id, kind } = effect;
  switch (kind) {
    case "eq3": {
      const node = new Tone.EQ3();
      return {
        id,
        kind,
        node,
        set: (p) => {
          node.low.value = num(p, "low");
          node.mid.value = num(p, "mid");
          node.high.value = num(p, "high");
          node.lowFrequency.value = num(p, "lowFrequency");
          node.highFrequency.value = num(p, "highFrequency");
        },
        dispose: () => node.dispose(),
      };
    }
    case "compressor": {
      const node = new Tone.Compressor();
      return {
        id,
        kind,
        node,
        set: (p) => {
          node.threshold.value = num(p, "threshold");
          node.ratio.value = num(p, "ratio");
          node.attack.value = num(p, "attack");
          node.release.value = num(p, "release");
          node.knee.value = num(p, "knee");
        },
        dispose: () => node.dispose(),
      };
    }
    case "distortion": {
      const node = new Tone.Distortion();
      return {
        id,
        kind,
        node,
        set: (p) => {
          node.distortion = num(p, "distortion");
          node.wet.value = num(p, "wet");
        },
        dispose: () => node.dispose(),
      };
    }
    case "chorus": {
      // The LFO has to be started or the chorus is a plain delay.
      const node = new Tone.Chorus().start();
      return {
        id,
        kind,
        node,
        set: (p) => {
          node.frequency.value = num(p, "frequency");
          node.delayTime = num(p, "delayTime");
          node.depth = num(p, "depth");
          node.wet.value = num(p, "wet");
        },
        dispose: () => node.dispose(),
      };
    }
    case "filter": {
      const node = new Tone.Filter();
      return {
        id,
        kind,
        node,
        set: (p) => {
          node.frequency.value = num(p, "frequency");
          node.Q.value = num(p, "Q");
          node.type = p["type"] as BiquadFilterType;
        },
        dispose: () => node.dispose(),
      };
    }
    case "delay": {
      const node = new Tone.FeedbackDelay();
      return {
        id,
        kind,
        node,
        set: (p) => {
          node.delayTime.value = num(p, "delayTime");
          node.feedback.value = num(p, "feedback");
          node.wet.value = num(p, "wet");
        },
        dispose: () => node.dispose(),
      };
    }
    case "reverb": {
      // Built with its final decay so the constructor's impulse response is the one that is kept.
      const node = new Tone.Reverb({ decay: num(initial, "decay"), preDelay: num(initial, "preDelay") });
      return {
        id,
        kind,
        node,
        set: (p) => {
          // Decay and pre-delay each regenerate the impulse response (briefly dry), so only write what changed.
          if (node.decay !== num(p, "decay")) node.decay = num(p, "decay");
          if (node.preDelay !== num(p, "preDelay")) node.preDelay = num(p, "preDelay");
          node.wet.value = num(p, "wet");
        },
        dispose: () => node.dispose(),
      };
    }
  }
}

/** Connects `input -> units... -> output`, dropping whatever the input and units were connected to before. */
export function wireChain(input: Tone.ToneAudioNode, units: readonly EffectUnit[], output: Tone.ToneAudioNode): void {
  input.disconnect();
  let previous = input;
  for (const unit of units) {
    unit.node.disconnect();
    previous.connect(unit.node);
    previous = unit.node;
  }
  previous.connect(output);
}

/** Resolves once every reverb in the chain has its impulse response, which the offline renderer must wait for. */
export function chainReady(units: readonly EffectUnit[]): Promise<void> {
  return Promise.all(units.filter((u) => u.node instanceof Tone.Reverb).map((u) => (u.node as Tone.Reverb).ready)).then(() => undefined);
}
