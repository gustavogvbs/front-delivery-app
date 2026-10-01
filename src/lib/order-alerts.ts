import { useCallback, useEffect, useRef, useState } from "react";

import { readText, writeText } from "./storage";

/**
 * Aviso de pedido novo no painel: som curto (Web Audio, sem arquivo) com
 * preferência no localStorage. O navegador só libera áudio depois de uma
 * interação do usuário: o contexto é criado/retomado no clique do botão e em
 * qualquer toque/tecla na página.
 */
const PREF_KEY = "panel:sound";

type AudioCtor = typeof AudioContext;
const audioCtor = (): AudioCtor | null =>
  typeof window === "undefined"
    ? null
    : window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioCtor })
        .webkitAudioContext ??
      null;

let ctx: AudioContext | null = null;

function ensureContext(): AudioContext | null {
  const Ctor = audioCtor();
  if (!Ctor) return null;
  try {
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    return ctx;
  } catch {
    return null;
  }
}

/** Dois bipes curtos (~0,5 s). Sem permissão de áudio: não faz nada. */
export function playNewOrderSound(): boolean {
  const ac = ensureContext();
  if (!ac || ac.state !== "running") return false;
  const beep = (at: number, freq: number) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
    osc.connect(gain).connect(ac.destination);
    osc.start(at);
    osc.stop(at + 0.22);
  };
  const t = ac.currentTime;
  beep(t, 880);
  beep(t + 0.25, 1175);
  return true;
}

/** Preferência do som + estado "bloqueado até a próxima interação". */
export function useOrderSound() {
  const [enabled, setEnabled] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    setEnabled(readText("local", PREF_KEY) === "on");
  }, []);

  // Com o som ligado, qualquer toque ou tecla destrava o áudio.
  useEffect(() => {
    if (!enabled) return;
    const unlock = () => {
      const ac = ensureContext();
      if (ac?.state === "running") setBlocked(false);
      else
        void ac?.resume().then(
          () => setBlocked(false),
          () => undefined,
        );
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [enabled]);

  /** Chamar no clique do botão (é a interação que libera o áudio). */
  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    writeText("local", PREF_KEY, next ? "on" : "off");
    if (next) {
      const ac = ensureContext();
      // toca uma vez para confirmar (e destravar o áudio neste clique)
      void ac
        ?.resume()
        .then(() => {
          setBlocked(false);
          playNewOrderSound();
        })
        .catch(() => setBlocked(true));
    }
  }, [enabled]);

  const play = useCallback(() => {
    if (!enabled) return;
    if (!playNewOrderSound()) setBlocked(true);
  }, [enabled]);

  return { enabled, blocked, toggle, play };
}

/**
 * Detecta pedidos PENDENTES que ainda não tinham aparecido. A primeira carga
 * só registra os IDs (abrir o painel não "toca" os pedidos antigos).
 */
export function useNewPendingOrders<T extends { id: string }>(
  pending: T[] | undefined,
  onNew: (orders: T[]) => void,
) {
  const seen = useRef<Set<string> | null>(null);
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  useEffect(() => {
    if (!pending) return;
    if (seen.current === null) {
      seen.current = new Set(pending.map((o) => o.id));
      return;
    }
    const fresh = pending.filter((o) => !seen.current!.has(o.id));
    pending.forEach((o) => seen.current!.add(o.id));
    if (fresh.length) onNewRef.current(fresh);
  }, [pending]);
}
