import {useEffect, useRef, useState} from 'react';
import {useAtom} from 'jotai';
import {RobotDistanceAtom, RobotModeAtom} from '../../state/atoms';

export function Content() {
  const [distance] = useAtom(RobotDistanceAtom);
  const [mode] = useAtom(RobotModeAtom);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {facingMode: 'environment', width: {ideal: 1280}, height: {ideal: 720}},
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setCameraError(err instanceof Error ? err.message : 'Camera stream is unavailable.');
      }
    }

    void setupCamera();
  }, []);

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover grayscale-[20%] brightness-[1.1]"
      />

      {cameraError && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-center p-8">
          <div className="max-w-md border border-amber-500/30 bg-amber-950/20 rounded-md p-5">
            <div className="text-amber-300 text-[10px] uppercase font-black tracking-[0.25em] mb-2">Camera Offline</div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              {cameraError}. Close other camera users or grant browser camera permission, then reload BotiLive.
            </p>
          </div>
        </div>
      )}

      <div className="absolute top-5 left-5 flex flex-col gap-2.5">
        <div
          className={`flex flex-col bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-sm border-l-4 font-mono shadow-xl ${
            distance < 30 && distance !== -1 ? 'border-red-500 text-red-400' : 'border-cyan-500 text-cyan-400'
          }`}
        >
          <span className="text-[8px] uppercase tracking-tighter opacity-60">LIDAR_DIST</span>
          <span className="text-sm font-bold">{distance === -1 ? 'SCANNING' : `${distance}CM`}</span>
        </div>
        <div className="flex flex-col bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-sm border-l-4 border-zinc-500 font-mono text-zinc-300 shadow-xl">
          <span className="text-[8px] uppercase tracking-tighter opacity-60">FIRMWARE_MODE</span>
          <span className="text-sm font-bold uppercase">{mode}</span>
        </div>
      </div>

      <div className="absolute bottom-5 left-5 right-5 bg-black/50 backdrop-blur-sm p-3 border border-white/5 rounded flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-[pulse_1.5s_infinite] shadow-[0_0_8px_#22c55e]" />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold text-white tracking-widest">Optical Stream Active</span>
            <span className="text-[8px] font-mono text-zinc-500">RAW_BUFFER_640x480_MJPEG</span>
          </div>
        </div>
        <div className="px-2 py-0.5 bg-zinc-800 rounded text-[9px] text-zinc-500 uppercase font-bold">
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      {distance < 20 && distance !== -1 && (
        <div className="absolute inset-0 border-[10px] border-red-600/20 pointer-events-none animate-pulse flex items-center justify-center">
          <div className="bg-red-600 text-white px-6 py-2 rounded font-bold uppercase tracking-[0.5em] shadow-2xl">
            Collision Warning
          </div>
        </div>
      )}
    </div>
  );
}
