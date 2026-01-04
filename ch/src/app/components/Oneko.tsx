"use client";

import { useEffect } from "react";

const ONEKO_ID = "ch-oneko";
const ONEKO_SRC = "/oneko.gif";
const SPRITE_SIZE = 32;

const SPRITE_SETS: Record<string, number[][]> = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  scratchSelf: [
    [-5, 0],
    [-6, 0],
    [-7, 0],
  ],
  scratchWallN: [
    [0, 0],
    [0, -1],
  ],
  scratchWallS: [
    [-7, -1],
    [-6, -2],
  ],
  scratchWallE: [
    [-2, -2],
    [-2, -3],
  ],
  scratchWallW: [
    [-4, 0],
    [-4, -1],
  ],
  tired: [[-3, -2]],
  sleeping: [
    [-2, 0],
    [-2, -1],
  ],
  N: [
    [-1, -2],
    [-1, -3],
  ],
  NE: [
    [0, -2],
    [0, -3],
  ],
  E: [
    [-3, 0],
    [-3, -1],
  ],
  SE: [
    [-5, -1],
    [-5, -2],
  ],
  S: [
    [-6, -3],
    [-7, -2],
  ],
  SW: [
    [-5, -3],
    [-6, -1],
  ],
  W: [
    [-4, -2],
    [-4, -3],
  ],
  NW: [
    [-1, 0],
    [-1, -1],
  ],
};

export default function Oneko() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (prefersReducedMotion?.matches) return;
    if (document.getElementById(ONEKO_ID)) return;

    const nekoEl = document.createElement("div");
    nekoEl.id = ONEKO_ID;
    nekoEl.setAttribute("aria-hidden", "true");
    Object.assign(nekoEl.style, {
      width: `${SPRITE_SIZE}px`,
      height: `${SPRITE_SIZE}px`,
      position: "fixed",
      pointerEvents: "none",
      left: "16px",
      top: "16px",
      zIndex: "2147483647",
      imageRendering: "pixelated",
      backgroundImage: `url(${ONEKO_SRC})`,
    });
    document.body.appendChild(nekoEl);

    let nekoPosX = 32;
    let nekoPosY = 32;
    let mousePosX = 32;
    let mousePosY = 32;
    let frameCount = 0;
    let idleTime = 0;
    let idleAnimation: string | null = null;
    let idleAnimationFrame = 0;
    let animationHandle = 0;
    let lastFrameTimestamp: number | null = null;

    const handleMouseMove = (event: MouseEvent) => {
      mousePosX = event.clientX;
      mousePosY = event.clientY;
    };
    document.addEventListener("mousemove", handleMouseMove);

    const cleanup = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (animationHandle) cancelAnimationFrame(animationHandle);
      nekoEl.remove();
    };

    const setSprite = (name: string, frame: number) => {
      const sprite = SPRITE_SETS[name] || SPRITE_SETS.idle;
      const coords = sprite[frame % sprite.length];
      nekoEl.style.backgroundPosition = `${coords[0] * SPRITE_SIZE}px ${coords[1] * SPRITE_SIZE}px`;
    };

    const resetIdleAnimation = () => {
      idleAnimation = null;
      idleAnimationFrame = 0;
    };

    const idle = () => {
      idleTime += 1;
      if (
        idleTime > 10 &&
        Math.floor(Math.random() * 200) === 0 &&
        idleAnimation == null
      ) {
        const options = ["sleeping", "scratchSelf"];
        if (nekoPosX < 32) options.push("scratchWallW");
        if (nekoPosY < 32) options.push("scratchWallN");
        if (nekoPosX > window.innerWidth - 32) options.push("scratchWallE");
        if (nekoPosY > window.innerHeight - 32) options.push("scratchWallS");
        idleAnimation = options[Math.floor(Math.random() * options.length)] || null;
      }

      switch (idleAnimation) {
        case "sleeping":
          if (idleAnimationFrame < 8) {
            setSprite("tired", 0);
            break;
          }
          setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
          if (idleAnimationFrame > 192) resetIdleAnimation();
          break;
        case "scratchWallN":
        case "scratchWallS":
        case "scratchWallE":
        case "scratchWallW":
        case "scratchSelf":
          setSprite(idleAnimation, idleAnimationFrame);
          if (idleAnimationFrame > 9) resetIdleAnimation();
          break;
        default:
          setSprite("idle", 0);
          return;
      }
      idleAnimationFrame += 1;
    };

    const stepFrame = () => {
      frameCount += 1;
      const diffX = nekoPosX - mousePosX;
      const diffY = nekoPosY - mousePosY;
      const distance = Math.sqrt(diffX * diffX + diffY * diffY);

      if (distance < 10 || distance < 48) {
        idle();
        return;
      }

      idleAnimation = null;
      idleAnimationFrame = 0;

      if (idleTime > 1) {
        setSprite("alert", 0);
        idleTime = Math.min(idleTime, 7);
        idleTime -= 1;
        return;
      }

      let direction = "";
      const vertical = diffY / distance;
      const horizontal = diffX / distance;
      if (vertical > 0.5) direction += "N";
      if (vertical < -0.5) direction += "S";
      if (horizontal > 0.5) direction += "W";
      if (horizontal < -0.5) direction += "E";
      direction = direction || "idle";
      setSprite(direction, frameCount);

      const stepSize = 10;
      nekoPosX -= (diffX / distance) * stepSize;
      nekoPosY -= (diffY / distance) * stepSize;
      nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);
      nekoPosY = Math.min(Math.max(16, nekoPosY), window.innerHeight - 16);
      nekoEl.style.left = `${nekoPosX - 16}px`;
      nekoEl.style.top = `${nekoPosY - 16}px`;
    };

    const onAnimationFrame = (timestamp: number) => {
      if (!nekoEl.isConnected) return;
      if (!lastFrameTimestamp) lastFrameTimestamp = timestamp;
      if (timestamp - lastFrameTimestamp > 100) {
        lastFrameTimestamp = timestamp;
        stepFrame();
      }
      animationHandle = requestAnimationFrame(onAnimationFrame);
    };

    animationHandle = requestAnimationFrame(onAnimationFrame);
    return cleanup;
  }, []);

  return null;
}
