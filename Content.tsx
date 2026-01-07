
import {useAtom} from 'jotai';
import React, {useEffect, useRef} from 'react';
import {RobotDistanceAtom, RobotModeAtom} from './atoms';

export function Content() {
  const [distance] = useAtom(RobotDistanceAtom);
  const [mode] = useAtom(RobotModeAtom);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: 640, height: 480 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    }
    setupCamera();
  }, []);

  return (
    <div className="w-full h-full relative bg-black flex items-center justify-center overflow-hidden border-2 border-[var(--border-color)] rounded-lg">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <div className={`bg-black/70 px-3 py-1 rounded border-l-4 font-mono text-sm ${distance < 30 ? 'border-red-500 text-red-400' : 'border-green-500 text-green-400'}`}>
          DIST: {distance === -1 ? '--' : `${distance}cm`}
        </div>
        <div className="bg-black/70 px-3 py-1 rounded border-l-4 border-blue-500 font-mono text-sm text-blue-300">
          MODE: {mode}
        </div>
      </div>
      
      <div className="absolute bottom-4 left-4 right-4 bg-black/60 p-2 border border-white/10 rounded backdrop-blur-sm">
        <div className="text-[10px] uppercase text-gray-400 mb-1">Optical Stream Status</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-mono text-white">LIVE FEED 640x480</span>
        </div>
      </div>
    </div>
  );
}
