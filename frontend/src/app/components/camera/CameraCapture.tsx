"use client";

import { useEffect, useRef, useState } from "react";

import {
  MAX_FRAME_BYTES,
  MAX_FRAME_PIXELS,
  stripBase64Prefix,
  validateBase64Size,
} from "@/lib/validators";

export type CapturedFrame = {
  base64: string;
  width: number;
  height: number;
};

type CameraCaptureProps = {
  isActive: boolean;
  captureDelayMs?: number;
  canCapture?: boolean;
  onFrame: (frame: CapturedFrame) => void;
  onError?: (message: string) => void;
  onReady?: () => void;
  className?: string;
};

const DEFAULT_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: "user",
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
};

function getScaledSize(width: number, height: number, maxPixels: number) {
  const total = width * height;
  if (total <= maxPixels) {
    return { width, height };
  }
  const scale = Math.sqrt(maxPixels / total);
  return {
    width: Math.floor(width * scale),
    height: Math.floor(height * scale),
  };
}

export default function CameraCapture({
  isActive,
  captureDelayMs = 400,
  canCapture = true,
  onFrame,
  onError,
  onReady,
  className,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          DEFAULT_CONSTRAINTS,
        );
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
          onReady?.();
        }
      } catch (error) {
        onError?.("Unable to access the camera. Please check permissions.");
      }
    };

    startCamera();

    return () => {
      cancelled = true;
    };
  }, [isActive, onError, onReady]);

  useEffect(() => {
    if (!isActive || !ready) {
      return;
    }

    const capture = () => {
      if (!canCapture) {
        return;
      }
      const video = videoRef.current;
      if (!video) {
        return;
      }
      if (video.readyState < 2) {
        return;
      }

      const rawWidth = video.videoWidth || 1280;
      const rawHeight = video.videoHeight || 720;
      const { width, height } = getScaledSize(
        rawWidth,
        rawHeight,
        MAX_FRAME_PIXELS,
      );

      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvasRef.current = canvas;

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = stripBase64Prefix(dataUrl);

      if (!validateBase64Size(base64, MAX_FRAME_BYTES)) {
        onError?.("Frame exceeds size limit. Move closer to the camera.");
        return;
      }

      onFrame({ base64, width, height });
    };

    intervalRef.current = window.setInterval(capture, captureDelayMs);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, ready, captureDelayMs, canCapture, onFrame, onError]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-3xl bg-[#0b1c30] shadow-soft">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-56 w-44 rounded-[2rem] border-2 border-white/80" />
        </div>
        {!ready && (
          <div className="absolute inset-0 grid place-items-center bg-black/40 text-xs font-semibold uppercase tracking-[0.3em] text-white">
            Loading camera
          </div>
        )}
      </div>
    </div>
  );
}
