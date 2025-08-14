"use client";

import { initDraw } from "@/draw";
import { useEffect, useRef } from "react";

export function Canvas({
  roomId,
  socket,
}: {
  roomId: string;
  socket: WebSocket;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef?.current) {
      const canvas = canvasRef.current;

      initDraw(canvas, roomId, socket);
    }
  }, [canvasRef, roomId, socket]);

  return (
    <div>
      <canvas ref={canvasRef} width={1080} height={1000}></canvas>
      {/* <div className="fixed bottom-0 right-0">
        <button className="bg-white text-black">Rect</button>
        <button className="bg-white text-black">Circle</button>
      </div> */}
    </div>
  );
}
