"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { SoundPack } from "./soundpack";

export interface UseKeyboardSoundOptions {
    /** Folder under /public containing this pack's config.json + audio, e.g. "/soundpacks/crystal-purple" */
    packPath: string;
    /** Volume multiplier 0–1 */
    volume?: number;
    /** Whether global keydown listening is active */
    enabled?: boolean;
    /** Also play a (usually quieter/different) sound on keyup, if the pack defines one */
    playOnKeyUp?: boolean;
}

export function useKeyboardSound({
    packPath,
    volume = 0.8,
    enabled = true,
    playOnKeyUp = false,
}: UseKeyboardSoundOptions) {
    const packRef = useRef<SoundPack | null>(null);
    const [readyFor, setReadyFor] = useState<string | null>(null);
    const [errorFor, setErrorFor] = useState<{ path: string; message: string } | null>(null);

    const isReady = readyFor === packPath;
    const error = errorFor?.path === packPath ? errorFor.message : null;

    // (Re)load whenever the pack path changes
    useEffect(() => {
        let cancelled = false;

        const pack = new SoundPack(packPath);
        packRef.current = pack;

        pack
            .load()
            .then(() => {
                if (!cancelled) setReadyFor(packPath);
            })
            .catch((err) => {
                console.log("[hook] load failed", packPath, err);
                if (!cancelled)
                    setErrorFor({
                        path: packPath,
                        message: err instanceof Error ? err.message : String(err),
                    });
            });

        return () => {
            cancelled = true;
        };
    }, [packPath]);

    /** Manually trigger the sound for a given browser KeyboardEvent.code (e.g. from a button click) */
    const playCode = useCallback(
        (code: string, phase: "down" | "up" = "down") => {
            if (!enabled || !packRef.current?.isLoaded) return;
            // Browsers require a user gesture to resume a suspended AudioContext
            const ctx = packRef.current.audioContext;
            if (ctx.state === "suspended") ctx.resume();
            packRef.current.playForCode(code, phase, volume);
        },
        [enabled, volume]
    );

    /** Convenience: play a sound not tied to a specific key (handy for a demo "press me" button) */
    const playClick = useCallback(() => playCode("Space", "down"), [playCode]);

    // Global keydown/keyup listeners
    useEffect(() => {
        if (!enabled) return;

        const handleDown = (e: KeyboardEvent) => {
            if (e.repeat) return; // avoid spamming sounds during key-repeat
            playCode(e.code, "down");
        };
        const handleUp = (e: KeyboardEvent) => {
            if (playOnKeyUp) playCode(e.code, "up");
        };

        window.addEventListener("keydown", handleDown);
        if (playOnKeyUp) window.addEventListener("keyup", handleUp);

        return () => {
            window.removeEventListener("keydown", handleDown);
            if (playOnKeyUp) window.removeEventListener("keyup", handleUp);
        };
    }, [enabled, playOnKeyUp, playCode]);

    return { playCode, playClick, isReady, error };
}