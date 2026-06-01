"use client";

import { useEffect, useRef } from "react";

let lockCount = 0;
let savedScrollY = 0;
let savedBodyStyles: {
  overflow: string;
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  paddingRight: string;
} | null = null;

function lockBodyScroll() {
  const body = document.body;
  savedScrollY = window.scrollY;
  savedBodyStyles = {
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    paddingRight: body.style.paddingRight,
  };

  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;

  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${savedScrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";

  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

function unlockBodyScroll() {
  if (!savedBodyStyles) {
    return;
  }

  const body = document.body;
  const scrollY = savedScrollY;

  body.style.overflow = savedBodyStyles.overflow;
  body.style.position = savedBodyStyles.position;
  body.style.top = savedBodyStyles.top;
  body.style.left = savedBodyStyles.left;
  body.style.right = savedBodyStyles.right;
  body.style.width = savedBodyStyles.width;
  body.style.paddingRight = savedBodyStyles.paddingRight;
  savedBodyStyles = null;

  window.scrollTo(0, scrollY);
}

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) {
      return;
    }

    lockCount += 1;
    if (lockCount === 1) {
      lockBodyScroll();
    }

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        unlockBodyScroll();
      }
    };
  }, [active]);
}

let nextEscapeId = 0;
const escapeHandlers = new Map<number, () => void>();
let escapeStack: number[] = [];

function handleDocumentEscape(event: KeyboardEvent) {
  if (event.key !== "Escape") {
    return;
  }

  const topId = escapeStack[escapeStack.length - 1];
  if (topId === undefined) {
    return;
  }

  const onClose = escapeHandlers.get(topId);
  if (!onClose) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  onClose();
}

/** Only the most recently opened active sheet receives Escape. */
export function useSheetEscape(onClose: () => void, active = true) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) {
      return;
    }

    const id = nextEscapeId++;
    escapeHandlers.set(id, () => onCloseRef.current());
    escapeStack.push(id);

    if (escapeStack.length === 1) {
      document.addEventListener("keydown", handleDocumentEscape);
    }

    return () => {
      escapeStack = escapeStack.filter((entryId) => entryId !== id);
      escapeHandlers.delete(id);
      if (escapeStack.length === 0) {
        document.removeEventListener("keydown", handleDocumentEscape);
      }
    };
  }, [active]);
}
