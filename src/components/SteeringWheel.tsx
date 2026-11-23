import React, { useCallback, useEffect, useRef, useState } from 'react';

interface SteeringWheelProps {
  externalSteer: number; // -1..1 from keyboard or replay
  onSteerChange: (steer: number) => void;
  disabled?: boolean;
}

const MAX_ANGLE_DEG = 115;

export const SteeringWheel: React.FC<SteeringWheelProps> = ({
  externalSteer,
  onSteerChange,
  disabled = false,
}) => {
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const lastPointerAngleRef = useRef(0);
  const accumulatedDegRef = useRef(0);
  const [dragAngleDeg, setDragAngleDeg] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const getPointerAngleDeg = (clientX: number, clientY: number): number => {
    const el = wheelRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  };

  const releaseWheel = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    accumulatedDegRef.current = 0;
    setIsDragging(false);
    setDragAngleDeg(0);
    onSteerChange(0);
  }, [onSteerChange]);

  useEffect(() => {
    if (disabled && draggingRef.current) {
      releaseWheel();
    }
  }, [disabled, releaseWheel]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setIsDragging(true);
    lastPointerAngleRef.current = getPointerAngleDeg(e.clientX, e.clientY);
    accumulatedDegRef.current = externalSteer * MAX_ANGLE_DEG;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || disabled) return;
    const angle = getPointerAngleDeg(e.clientX, e.clientY);
    let delta = angle - lastPointerAngleRef.current;
    // Wrap around +-180 boundary cleanly
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastPointerAngleRef.current = angle;

    const nextDeg = Math.max(
      -MAX_ANGLE_DEG,
      Math.min(MAX_ANGLE_DEG, accumulatedDegRef.current + delta)
    );
    accumulatedDegRef.current = nextDeg;
    setDragAngleDeg(nextDeg);

    const normalized = Math.max(-1, Math.min(1, nextDeg / MAX_ANGLE_DEG));
    onSteerChange(Math.abs(normalized) < 0.03 ? 0 : normalized);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    releaseWheel();
  };

  const displayAngle = isDragging ? dragAngleDeg : externalSteer * MAX_ANGLE_DEG;
  const normalizedDisplay = Math.max(-1, Math.min(1, displayAngle / MAX_ANGLE_DEG));

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-1.5 select-none">
      <div
        ref={wheelRef}
        role="slider"
        aria-label="Steering Wheel"
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={Math.round(normalizedDisplay * 100)}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full border border-white/15 bg-[#0a0c12]/80 touch-none ${
          disabled ? 'opacity-50 cursor-default' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* Subtle outer turn indicator ring */}
        <svg
          viewBox="0 0 120 120"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path
            d="M 22 26 A 52 52 0 0 1 98 26"
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="60" cy="8" r="2.2" fill="#f59e0b" />
        </svg>

        {/* Rotating Motorsport Steering Wheel */}
        <div
          style={{
            transform: `rotate(${displayAngle.toFixed(1)}deg)`,
            transition: isDragging ? 'none' : 'transform 110ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="pointer-events-none h-[84%] w-[84%] will-change-transform"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
            {/* Outer Grip Rim */}
            <circle
              cx="50"
              cy="50"
              r="41"
              fill="none"
              stroke="#1e2430"
              strokeWidth="11"
            />
            <circle
              cx="50"
              cy="50"
              r="41"
              fill="none"
              stroke="#334155"
              strokeWidth="1.5"
            />

            {/* 12-o'clock Amber Alignment Band */}
            <path
              d="M 45.5 9.2 A 41 41 0 0 1 54.5 9.2"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="11"
            />

            {/* Thumb Grip Bolsters (9 and 3 o'clock) */}
            <rect x="6" y="42" width="12" height="16" rx="4" fill="#273040" />
            <rect x="82" y="42" width="12" height="16" rx="4" fill="#273040" />

            {/* Brushed Metallic Y-Spokes */}
            <path
              d="M 15 47 L 42 47 L 42 54 L 15 54 Z"
              fill="#475569"
            />
            <path
              d="M 58 47 L 85 47 L 85 54 L 58 54 Z"
              fill="#475569"
            />
            <path
              d="M 45 58 L 55 58 L 54 88 L 46 88 Z"
              fill="#475569"
            />

            {/* Center Hub */}
            <circle cx="50" cy="50" r="14" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
            <circle cx="50" cy="50" r="5" fill="#f59e0b" />
          </svg>
        </div>
      </div>

      <span className="text-[11px] font-medium text-slate-400 tabular-nums">
        Steer {Math.round(displayAngle)}°
      </span>
    </div>
  );
};
