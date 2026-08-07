import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function GlobalSpotlight() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const setX = useRef<((value: number | string) => void) | null>(null);
  const setY = useRef<((value: number | string) => void) | null>(null);
  const pos = useRef({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;

    setX.current = gsap.quickSetter(el, '--global-x', 'px') as (value: number | string) => void;
    setY.current = gsap.quickSetter(el, '--global-y', 'px') as (value: number | string) => void;

    // Center initial position
    pos.current.x = window.innerWidth / 2;
    pos.current.y = window.innerHeight / 2;
    setX.current(pos.current.x);
    setY.current(pos.current.y);

    const handlePointerMove = (e: PointerEvent) => {
      setIsActive(true);

      gsap.to(pos.current, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.45,
        ease: 'power3.out',
        onUpdate: () => {
          setX.current?.(pos.current.x);
          setY.current?.(pos.current.y);
        },
        overwrite: true
      });

      if (fadeRef.current) {
        gsap.to(fadeRef.current, { opacity: 0, duration: 0.25, overwrite: true });
      }
    };

    const handlePointerLeave = () => {
      if (fadeRef.current) {
        gsap.to(fadeRef.current, {
          opacity: 1,
          duration: 0.6,
          overwrite: true
        });
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  const spotlightStyle: React.CSSProperties = {
    backdropFilter: 'grayscale(1) brightness(0.85)',
    WebkitBackdropFilter: 'grayscale(1) brightness(0.85)',
    background: 'rgba(0,0,0,0.001)',
    maskImage: 'radial-gradient(circle 350px at var(--global-x) var(--global-y), transparent 0%, transparent 15%, rgba(0,0,0,0.08) 30%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0.32) 60%, rgba(0,0,0,0.48) 75%, rgba(0,0,0,0.65) 88%, white 100%)',
    WebkitMaskImage: 'radial-gradient(circle 350px at var(--global-x) var(--global-y), transparent 0%, transparent 15%, rgba(0,0,0,0.08) 30%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0.32) 60%, rgba(0,0,0,0.48) 75%, rgba(0,0,0,0.65) 88%, white 100%)',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 10 // Above main layout content, below modals
  };

  const fadeStyle: React.CSSProperties = {
    ...spotlightStyle,
    maskImage: 'radial-gradient(circle 350px at var(--global-x) var(--global-y), white 0%, white 15%, rgba(255,255,255,0.90) 30%, rgba(255,255,255,0.78) 45%, rgba(255,255,255,0.65) 60%, rgba(255,255,255,0.50) 75%, rgba(255,255,255,0.32) 88%, transparent 100%)',
    WebkitMaskImage: 'radial-gradient(circle 350px at var(--global-x) var(--global-y), white 0%, white 15%, rgba(255,255,255,0.90) 30%, rgba(255,255,255,0.78) 45%, rgba(255,255,255,0.65) 60%, rgba(255,255,255,0.50) 75%, rgba(255,255,255,0.32) 88%, transparent 100%)',
    opacity: isActive ? 0 : 1,
    zIndex: 11
  };

  return (
    <>
      <div
        ref={overlayRef}
        style={spotlightStyle}
      />
      <div
        ref={fadeRef}
        style={fadeStyle}
        className="transition-opacity duration-[250ms]"
      />
    </>
  );
}
