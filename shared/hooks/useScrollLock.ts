"use client";

import { useEffect } from "react";

let lockCount = 0;
let previousOverflow = "";

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) {
      return;
    }

    lockCount += 1;
    if (lockCount === 1) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [active]);
}
