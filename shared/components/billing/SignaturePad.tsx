"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export type SignaturePadHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  toDataUrl: () => string | null;
};

type SignaturePadProps = {
  disabled?: boolean;
  onStroke?: () => void;
};

const STROKE_WIDTH = 2.5;
const STROKE_COLOR = "#0f172a";

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ disabled = false, onStroke }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const drawingRef = useRef(false);
    const hasStrokeRef = useRef(false);

    const getContext = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return null;
      }

      return canvas.getContext("2d");
    }, []);

    const resizeCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const width = Math.max(Math.floor(rect.width), 1);
      const height = Math.max(Math.floor(rect.height), 1);
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = STROKE_COLOR;
      context.lineWidth = STROKE_WIDTH;
    }, []);

    useEffect(() => {
      resizeCanvas();

      const container = containerRef.current;
      if (!container || typeof ResizeObserver === "undefined") {
        return;
      }

      const observer = new ResizeObserver(() => {
        if (!hasStrokeRef.current) {
          resizeCanvas();
        }
      });

      observer.observe(container);
      return () => observer.disconnect();
    }, [resizeCanvas]);

    const getPoint = useCallback(
      (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) {
          return null;
        }

        const rect = canvas.getBoundingClientRect();
        return {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
      },
      [],
    );

    const startStroke = useCallback(
      (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (disabled) {
          return;
        }

        const context = getContext();
        const point = getPoint(event);
        if (!context || !point) {
          return;
        }

        drawingRef.current = true;
        context.beginPath();
        context.moveTo(point.x, point.y);
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      [disabled, getContext, getPoint],
    );

    const continueStroke = useCallback(
      (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current || disabled) {
          return;
        }

        const context = getContext();
        const point = getPoint(event);
        if (!context || !point) {
          return;
        }

        context.lineTo(point.x, point.y);
        context.stroke();
        hasStrokeRef.current = true;
        onStroke?.();
      },
      [disabled, getContext, getPoint, onStroke],
    );

    const endStroke = useCallback(
      (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) {
          return;
        }

        drawingRef.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      },
      [],
    );

    const clear = useCallback(() => {
      const canvas = canvasRef.current;
      const context = getContext();
      if (!canvas || !context) {
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      hasStrokeRef.current = false;
    }, [getContext]);

    useImperativeHandle(
      ref,
      () => ({
        clear,
        isEmpty: () => !hasStrokeRef.current,
        toDataUrl: () => {
          const canvas = canvasRef.current;
          if (!canvas || !hasStrokeRef.current) {
            return null;
          }

          return canvas.toDataURL("image/png");
        },
      }),
      [clear],
    );

    return (
      <div
        ref={containerRef}
        className="h-44 w-full rounded-xl border border-slate-200 bg-white sm:h-52"
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none rounded-xl"
          aria-label="Signature drawing area"
          onPointerDown={startStroke}
          onPointerMove={continueStroke}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
        />
      </div>
    );
  },
);
