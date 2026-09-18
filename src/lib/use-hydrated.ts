"use client";

import { useSyncExternalStore } from "react";

/**
 * False while rendering on the server and during the first browser render,
 * true afterwards.
 *
 * Needed because the server cannot know a choice that lives in the browser:
 * the theme, or the reading mode. Rendering the browser's answer straight away
 * would not match what the server sent, and React would throw the whole tree
 * away and start again.
 *
 * `useSyncExternalStore` is React's own tool for reading something outside
 * React. The older trick, setting state inside an effect, causes an extra
 * render of the whole tree and React now warns about it.
 */
const noop = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true, // in the browser
    () => false, // on the server, and on the first browser render
  );
}
