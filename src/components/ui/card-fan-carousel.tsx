"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";

export interface CardItem {
  imgUrl: string;
  alt?: string;
  linkUrl?: string;
  title?: string;
  description?: string;
  tags?: string[];
  status?: string;
}

interface SocialCardsProps {
  cards: CardItem[];
}

const MAX_VISIBLE = 7;
const HALF = 3;

const FAN_POSITIONS = [
  { rot: -21, scale: 0.7756, x: -30, y: 7.3, zIndex: 1 },
  { rot: -14, scale: 0.8498, x: -22, y: 4.0, zIndex: 2 },
  { rot: -7,  scale: 0.9346, x: -11, y: 1.3, zIndex: 3 },
  { rot: 0,   scale: 1.0,    x: 0,   y: 0.0, zIndex: 10 },
  { rot: 7,   scale: 0.9346, x: 11,  y: 1.3, zIndex: 3 },
  { rot: 14,  scale: 0.8498, x: 22,  y: 4.0, zIndex: 2 },
  { rot: 21,  scale: 0.7756, x: 30,  y: 7.3, zIndex: 1 },
];

function getResponsiveMultiplier(width: number) {
  if (width < 480) return 0.28;
  if (width < 640) return 0.38;
  if (width < 768) return 0.5;
  if (width < 1024) return 0.75;
  return 1.0;
}

/**
 * Returns a multiplier (0..1] that scales y-offsets and entry animation
 * distances when the viewport is too short for the ideal layout height.
 */
function getHeightMultiplier(width: number) {
  // Ideal layout heights (in px at 16px root) matching the CSS breakpoints
  let idealPx: number;
  if (width < 480) idealPx = 22 * 16;       // 352px
  else if (width < 640) idealPx = 26 * 16;  // 416px
  else if (width < 768) idealPx = 28 * 16;  // 448px
  else if (width < 1024) idealPx = 34 * 16; // 544px
  else idealPx = 38 * 16;                    // 608px

  const available = window.innerHeight * 0.7; // 70vh budget
  if (available >= idealPx) return 1;
  return available / idealPx;
}

function getSlotConfig(totalCards: number, slot: number) {
  if (totalCards >= MAX_VISIBLE) return FAN_POSITIONS[slot];
  const center = totalCards >> 1;
  const distance = totalCards > 1 ? (slot - center) / center : 0;
  const absDistance = Math.abs(distance);
  return {
    rot: distance * 21,
    scale: 1.0 - 0.2244 * absDistance * absDistance,
    x: distance * 30,
    y: absDistance * absDistance * 7.3,
    zIndex: 10 - Math.abs(slot - center),
  };
}

const ARROW_CLASSES =
  "relative flex items-center justify-center rounded-full border-[1.5px] border-slate-300 bg-white/60 backdrop-blur-[16px] text-slate-500 cursor-pointer shrink-0 z-30 outline-none shadow-md hover:border-slate-400 hover:text-slate-900 hover:bg-white active:opacity-70 transition-all duration-300 before:content-[''] before:absolute before:inset-[3px] before:rounded-full before:border before:border-slate-200/[0.5] before:pointer-events-none";

export default function SocialCards({ cards }: SocialCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);
  const hasEntered = useRef(false);
  const directionRef = useRef<"left" | "right" | null>(null);
  const prevVisible = useRef<Set<number>>(new Set());

  const totalCards = cards.length;
  const needsPagination = totalCards > 1; // Show arrows and allow click if more than 1 card
  const [centerIndex, setCenterIndex] = useState(0);

  const getVisibleMap = useCallback((center: number) => {
    const map = new Map<number, number>();
    if (totalCards <= 1) {
      cards.forEach((_, i) => map.set(i, i));
      return map;
    }
    const slotCount = Math.min(MAX_VISIBLE, totalCards);
    const half = Math.floor(slotCount / 2);
    for (let slot = 0; slot < slotCount; slot++) {
      map.set(((center + slot - half) % totalCards + totalCards) % totalCards, slot);
    }
    return map;
  }, [totalCards, cards]);

  const cycle = useCallback((direction: "left" | "right") => {
    if (isAnimating.current || !needsPagination) return;
    isAnimating.current = true;
    directionRef.current = direction;
    setCenterIndex(prev =>
      direction === "right" ? (prev + 1) % totalCards : (prev - 1 + totalCards) % totalCards
    );
  }, [totalCards, needsPagination]);

  const goToIndex = useCallback((targetIndex: number) => {
    if (isAnimating.current || !needsPagination || targetIndex === centerIndex) return;
    
    const diff = (targetIndex - centerIndex + totalCards) % totalCards;
    const direction = diff <= totalCards / 2 ? "right" : "left";

    isAnimating.current = true;
    directionRef.current = direction;
    setCenterIndex(targetIndex);
  }, [centerIndex, totalCards, needsPagination]);

  const handleCardClick = (e: React.MouseEvent, cardIndex: number) => {
    if (cardIndex !== centerIndex) {
      e.preventDefault();
      goToIndex(cardIndex);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !totalCards) return;

    const cardElements = Array.from(container.querySelectorAll<HTMLElement>(".fan-card"));
    if (!cardElements.length) return;

    const visibleMap = getVisibleMap(centerIndex);
    const previouslyVisible = prevVisible.current;
    const direction = directionRef.current;
    const isFirstMount = !hasEntered.current;
    const multiplier = getResponsiveMultiplier(window.innerWidth);
    const hMult = getHeightMultiplier(window.innerWidth);
    const slotCount = Math.min(MAX_VISIBLE, totalCards);
    const config = (slot: number) => getSlotConfig(slotCount, slot);

    if (isFirstMount) isAnimating.current = true;

    let completedCount = 0;
    const visibleCount = visibleMap.size;
    const onCardDone = () => {
      if (++completedCount >= visibleCount) {
        isAnimating.current = false;
        if (isFirstMount) hasEntered.current = true;
      }
    };

    cardElements.forEach((card, cardIndex) => {
      const slot = visibleMap.get(cardIndex);
      const wasVisible = previouslyVisible.has(cardIndex);

      if (slot !== undefined) {
        const { x, y, rot, scale, zIndex } = config(slot);
        const target = {
          x: `${x * multiplier}rem`,
          y: `${y * hMult}rem`,
          rotation: rot,
          scale,
          opacity: 1,
          zIndex,
        };

        if (isFirstMount) {
          gsap.set(card, { x: 0, y: `${12 * hMult}rem`, rotation: 0, scale: 0.5, opacity: 0 });
          gsap.to(card, { ...target, duration: 1.2, ease: "elastic.out(1.05,.78)", delay: 0.2 + slot * 0.06, onComplete: onCardDone });
        } else if (!wasVisible) {
          const enterX = direction === "right" ? 40 : -40;
          gsap.set(card, { x: `${enterX}rem`, y: `${y * hMult}rem`, rotation: direction === "right" ? 30 : -30, scale: 0.5, opacity: 0 });
          gsap.to(card, { ...target, duration: 0.6, ease: "power2.out", onComplete: onCardDone });
        } else {
          gsap.to(card, { ...target, duration: 0.5, ease: "power2.out", onComplete: onCardDone });
        }
      } else if (wasVisible) {
        const exitX = direction === "right" ? -40 : 40;
        gsap.to(card, { x: `${exitX}rem`, opacity: 0, scale: 0.5, rotation: direction === "right" ? -30 : 30, duration: 0.4, ease: "power2.in", zIndex: 0 });
      } else if (isFirstMount) {
        gsap.set(card, { opacity: 0, scale: 0.3, x: 0, y: 0, zIndex: 0 });
      }
    });

    prevVisible.current = new Set(visibleMap.keys());

    // Hover interactions
    const visibleEntries: { el: HTMLElement; slot: number }[] = [];
    cardElements.forEach((el, i) => {
      const slot = visibleMap.get(i);
      if (slot !== undefined) visibleEntries.push({ el, slot });
    });
    visibleEntries.sort((a, b) => a.slot - b.slot);

    let activeSlot: number | null = null;
    let leaveTimer: NodeJS.Timeout | null = null;
    const centerSlot = visibleEntries.length >> 1;

    const updateHoverLayout = (hoveredSlot: number | null) => {
      const mult = getResponsiveMultiplier(window.innerWidth);
      const hM = getHeightMultiplier(window.innerWidth);

      visibleEntries.forEach(({ el, slot }) => {
        const base = config(slot);
        let targetX = base.x * mult;
        let targetY = base.y * hM;
        let targetRot = base.rot;
        let targetScale = base.scale;
        let delay = 0;

        if (hoveredSlot !== null) {
          const distance = Math.abs(slot - hoveredSlot);
          delay = distance * 0.02;

          if (slot === hoveredSlot) {
            targetY -= 2.5 * hM;
            targetScale *= 1.08;
          } else {
            const normalized = centerSlot > 0 ? (slot - centerSlot) / centerSlot : 0;
            const pushStrength = 8 * (1 - Math.abs(normalized)) * (1 + 0.2 * Math.max(0, 3 - distance));

            if (slot < hoveredSlot) {
              targetX -= pushStrength * mult;
              targetRot -= 3 / (distance + 1);
            } else {
              targetX += pushStrength * mult;
              targetRot += 3 / (distance + 1);
            }

            if (slot === visibleEntries.length - 1 && hoveredSlot < centerSlot) targetY -= 1 * hM;
            if (slot === 0 && hoveredSlot > centerSlot) targetY -= 1 * hM;
          }
        } else {
          delay = Math.abs(slot - centerSlot) * 0.02;
        }

        gsap.to(el, {
          x: `${targetX}rem`, y: `${targetY}rem`, rotation: targetRot, scale: targetScale,
          duration: 0.5, delay, ease: "elastic.out(1,.75)", overwrite: "auto",
        });
        gsap.set(el, { zIndex: base.zIndex });
      });
    };

    const enterHandlers = visibleEntries.map(({ el, slot }) => {
      const handler = () => {
        if (isAnimating.current) return;
        if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
        if (activeSlot !== slot) { activeSlot = slot; updateHoverLayout(slot); }
      };
      el.addEventListener("mouseenter", handler);
      return { el, handler };
    });

    const onMouseLeave = () => {
      if (isAnimating.current) return;
      if (leaveTimer) clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => { activeSlot = null; updateHoverLayout(null); }, 50);
    };
    container.addEventListener("mouseleave", onMouseLeave);

    const onResize = () => { if (!isAnimating.current) updateHoverLayout(activeSlot); };
    window.addEventListener("resize", onResize);

    return () => {
      enterHandlers.forEach(({ el, handler }) => el.removeEventListener("mouseenter", handler));
      container.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", onResize);
      if (leaveTimer) clearTimeout(leaveTimer);
    };
  }, [centerIndex, totalCards, getVisibleMap, needsPagination]);

  if (!totalCards) return null;

  const chevron = (direction: "left" | "right") => (
    <svg className="relative z-[2] w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={direction === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
    </svg>
  );

  return (
    <section className="flex flex-col items-center w-full py-2 lg:py-4 px-4 md:px-8 relative z-20 overflow-visible">
      <div className="flex items-center justify-center w-full max-w-[90rem]">
        <div ref={containerRef} className="fan-layout flex relative justify-center items-center w-full max-w-[80rem] h-[380px] md:h-[550px] lg:h-[650px] xl:h-[700px]">
          {cards.map((card, index) => {
            const image = (
              <div className="relative w-full h-full overflow-hidden rounded-[32px] shadow-2xl group bg-white">
                {/* Soft overlay to make image feel 'softer' */}
                <div className="absolute inset-0 bg-white/5 mix-blend-overlay z-15 pointer-events-none" />
                <img 
                  src={card.imgUrl} 
                  loading="lazy" 
                  alt={card.alt || `Card ${index}`} 
                  onError={(e) => { e.currentTarget.src = "/PCC%20Photo%20Club.webp"; }}
                  className="absolute inset-0 w-full h-full object-cover z-10 transition-transform duration-700 group-hover:scale-105 contrast-[0.95] brightness-[1.05] saturate-[1.1]" 
                  referrerPolicy="no-referrer"
                />
                
                <div className="absolute inset-x-0 top-0 p-4 md:p-6 z-20 flex justify-end items-start gap-2 bg-gradient-to-b from-black/80 via-black/30 to-transparent pb-16 pointer-events-none">
                  {card.status === "Alumni" && (
                    <span className="px-3 py-1 bg-red-500/80 backdrop-blur-md rounded-full text-white text-[10px] md:text-sm font-semibold border border-red-400/50 shadow-sm">
                      ศิษย์เก่า
                    </span>
                  )}
                  {card.description && (
                    <span className="px-3 py-1 bg-slate-700/70 backdrop-blur-md rounded-full text-white/95 text-[10px] md:text-sm font-semibold border border-slate-500/50 shadow-sm truncate max-w-[40%]">
                      {card.description}
                    </span>
                  )}
                </div>
                
                {/* Bottom Overlay: Name & Team Tags */}
                <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 z-20 flex flex-col justify-end items-start bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-32 pointer-events-none">
                  {card.title && (
                    <span className="text-white font-bold text-lg md:text-2xl drop-shadow-md truncate w-full mb-3">{card.title}</span>
                  )}
                  {card.tags && card.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-end justify-start w-full">
                      {card.tags.map((tag, i) => {
                      let tagColor = "bg-white/20 border-white/30 text-white";
                      if (tag.includes("วิดีโอ") || tag.toLowerCase().includes("video")) tagColor = "bg-blue-500/80 border-blue-400 text-white";
                      if (tag.includes("ถ่ายรูป") || tag.toLowerCase().includes("photo")) tagColor = "bg-orange-500/80 border-orange-400 text-white";
                      if (tag.includes("ไลฟ์") || tag.toLowerCase().includes("live")) tagColor = "bg-red-500/80 border-red-400 text-white";

                      return (
                        <span key={i} className={`px-3 py-1 backdrop-blur-md rounded-full text-[10px] md:text-sm font-semibold border shadow-sm ${tagColor}`}>
                          {tag}
                        </span>
                      );
                    })}
                    </div>
                  )}
                </div>
              </div>
            );
            return card.linkUrl ? (
              <a key={index} href={card.linkUrl} onClick={(e) => handleCardClick(e, index)} target={card.linkUrl.startsWith("http") ? "_blank" : "_self"} rel="noopener noreferrer" className="fan-card block cursor-pointer w-[240px] h-[340px] md:w-[340px] md:h-[480px] lg:w-[400px] lg:h-[560px] xl:w-[440px] xl:h-[600px] absolute">{image}</a>
            ) : (
              <div key={index} onClick={(e) => handleCardClick(e, index)} className="fan-card block cursor-pointer w-[240px] h-[340px] md:w-[340px] md:h-[480px] lg:w-[400px] lg:h-[560px] xl:w-[440px] xl:h-[600px] absolute">{image}</div>
            );
          })}
        </div>
      </div>

      {needsPagination && (
        <div className="flex items-center justify-center gap-4 mt-2 md:mt-4 z-30">
          <button className={`${ARROW_CLASSES} w-10 h-10 md:w-12 md:h-12`} onClick={() => cycle("left")} aria-label="Previous">
            {chevron("left")}
          </button>
          <div className="flex items-center gap-2 mx-4">
            {cards.map((_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === centerIndex ? "bg-slate-800 scale-[1.3]" : "bg-slate-300"}`} />
            ))}
          </div>
          <button className={`${ARROW_CLASSES} w-10 h-10 md:w-12 md:h-12`} onClick={() => cycle("right")} aria-label="Next">
            {chevron("right")}
          </button>
        </div>
      )}
    </section>
  );
}
