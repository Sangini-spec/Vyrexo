"use client";

import { useRef, useState, useCallback } from "react";

interface Tilt3DCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glowColor?: string;
}

export function Tilt3DCard({
  children,
  className = "",
  maxTilt = 8,
  glowColor = "rgba(90, 122, 160, 0.18)",
}: Tilt3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState("");
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Rotation angles (-maxTilt to +maxTilt)
      const rotateX = ((y - centerY) / centerY) * -maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      setTransformStyle(
        `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(6px) scale3d(1.015, 1.015, 1.015)`
      );

      setSpotlight({
        x,
        y,
        opacity: 1,
      });
    },
    [maxTilt]
  );

  const handleMouseLeave = useCallback(() => {
    setTransformStyle(
      "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)"
    );
    setSpotlight((prev) => ({ ...prev, opacity: 0 }));
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{
        transform: transformStyle,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Specular cursor reflection sheen */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-500 z-20"
        style={{
          opacity: spotlight.opacity,
          background: `radial-gradient(400px circle at ${spotlight.x}px ${spotlight.y}px, ${glowColor}, transparent 65%)`,
        }}
      />
      {children}
    </div>
  );
}
