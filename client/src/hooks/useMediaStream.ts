import { useEffect, useRef } from 'react';

export function useMediaStream() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startStream = async (stream: MediaStream) => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  };

  const stopStream = (stream: MediaStream) => {
    stream.getTracks().forEach((track) => track.stop());
  };

  const captureFrame = (): Blob | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return null;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    ctx.drawImage(videoRef.current, 0, 0);

    let blob: Blob | null = null;
    canvasRef.current.toBlob((b) => {
      blob = b;
    });

    return blob;
  };

  return {
    videoRef,
    canvasRef,
    startStream,
    stopStream,
    captureFrame,
  };
}
