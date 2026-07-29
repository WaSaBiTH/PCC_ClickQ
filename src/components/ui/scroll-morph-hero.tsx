"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, useTransform, useSpring, useMotionValue, animate, AnimatePresence, useMotionValueEvent } from "framer-motion";

export type AnimationPhase = "scatter" | "line" | "circle" | "arc";

interface FlipCardProps {
    src: string;
    index: number;
    total: number;
    phase: AnimationPhase;
    scatterPos: any;
    containerSize: { width: number; height: number };
    morphProgress: any;
    scrollRotate: any;
    allImages: string[];
    onImageLoad?: (src: string) => void;
    globalLap: number;
}

const IMG_WIDTH = 90;  
const IMG_HEIGHT = 127; 

const FlipCard = React.memo(function FlipCard({ src, index, total, phase, scatterPos, containerSize, morphProgress, scrollRotate, allImages, onImageLoad, globalLap }: FlipCardProps) {
    const isMobile = containerSize.width < 768;
    const [spin, setSpin] = useState(0);
    
    const [localLap, setLocalLap] = useState(globalLap);

    useEffect(() => {
        if (globalLap > localLap) {
            // Stagger image swaps between 500ms and 1500ms based on index
            // This prevents all 20 images from updating simultaneously, avoiding framerate drops
            const delay = 500 + (index / total) * 1000;
            const timer = setTimeout(() => {
                setLocalLap(globalLap);
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [globalLap, localLap, index, total]);

    // Instead of swapping individually at 180 degrees, we swap sequentially via localLap
    const imageIndex = index + (localLap * total);

    const safeIndex = imageIndex % Math.max(1, allImages.length);
    const nextSafeIndex = (imageIndex + total) % Math.max(1, allImages.length);
    
    const currentSrc = allImages[safeIndex] || src;
    const nextSrc = allImages[nextSafeIndex] || src;

    const [fallbackMap, setFallbackMap] = useState<Record<string, string>>({});
    const resolvedCurrentSrc = fallbackMap[currentSrc] || currentSrc;
    const resolvedNextSrc = fallbackMap[nextSrc] || nextSrc;

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const z = useMotionValue(0);
    const rotate = useMotionValue(0);
    const scale = useMotionValue(1);
    const opacity = useMotionValue(1);

    const updateTransforms = (m: number, r: number) => {
        if (phase === "scatter") {
            x.set(scatterPos.x);
            y.set(scatterPos.y);
            z.set(0);
            rotate.set(scatterPos.rotation);
            scale.set(scatterPos.scale);
            opacity.set(scatterPos.opacity);
        } else if (phase === "line") {
            const lineSpacing = 70;
            const lineTotalWidth = total * lineSpacing;
            const lineX = index * lineSpacing - lineTotalWidth / 2;
            x.set(lineX);
            y.set(0);
            z.set(0);
            rotate.set(0);
            scale.set(1);
            opacity.set(1);
        } else {
            const minDimension = Math.min(containerSize.width, containerSize.height);
            const step = 360 / total;
            const currentAngle = (index * step) + r;

            const circleRadius = Math.min(minDimension * 0.35, 350);
            const circleRad = (currentAngle * Math.PI) / 180;
            const cx = Math.cos(circleRad) * circleRadius;
            const cy = Math.sin(circleRad) * circleRadius;
            const crot = currentAngle + 90;

            const radiusX = isMobile ? containerSize.width * 0.4 : containerSize.width * 0.32;
            const radiusY = isMobile ? 60 : Math.min(containerSize.height * 0.15, 130);
            const rad = (currentAngle * Math.PI) / 180;
            
            const xPos = Math.sin(rad) * radiusX;
            const zPos = Math.cos(rad);
            const yPos = zPos * radiusY;
            
            const ax = xPos;
            const ay = yPos + (isMobile ? 50 : Math.min(containerSize.height * 0.12, 100));
            const az = zPos * 100;
            const arot = xPos * 0.05;
            const ascale = (isMobile ? 0.9 : 1.3) + (zPos * (isMobile ? 0.3 : 0.4));

            x.set(cx * (1 - m) + ax * m);
            y.set(cy * (1 - m) + ay * m);
            z.set(0 * (1 - m) + az * m);
            rotate.set(crot * (1 - m) + arot * m);
            scale.set(1 * (1 - m) + ascale * m);
            opacity.set(1);
        }
    };

    useMotionValueEvent(scrollRotate, "change", (r: any) => {
        updateTransforms(morphProgress.get() as number, r as number);
    });

    useMotionValueEvent(morphProgress, "change", (m: any) => {
        updateTransforms(m as number, scrollRotate.get() as number);
    });

    // Run once on mount/update to set initial values
    useEffect(() => {
        updateTransforms(morphProgress.get() as number, scrollRotate.get() as number);
    }, [containerSize, phase]);

    const [isLoaded, setIsLoaded] = useState(false);
    const [hasReportedLoad, setHasReportedLoad] = useState(false);
    
    // Double-buffering state for rock-solid crossfades without unmounting
    const [imgA, setImgA] = useState(currentSrc);
    const [imgB, setImgB] = useState(currentSrc);
    const [showA, setShowA] = useState(true);

    const imgARef = useRef<HTMLImageElement>(null);
    const imgBRef = useRef<HTMLImageElement>(null);

    // 1. Manage the inactive buffer safely without infinite loops
    useEffect(() => {
        // The active buffer is the one currently shown
        const activeSrc = showA ? imgA : imgB;
        
        // If the active buffer already shows the current target, we can safely preload the next target
        // Otherwise, we MUST load the current target into the inactive buffer to catch up
        const targetSrc = (activeSrc === resolvedCurrentSrc) ? resolvedNextSrc : resolvedCurrentSrc;
        
        // Update the inactive buffer to the target
        if (showA && imgB !== targetSrc) {
            setImgB(targetSrc);
        } else if (!showA && imgA !== targetSrc) {
            setImgA(targetSrc);
        }
    }, [resolvedNextSrc, resolvedCurrentSrc, showA, imgA, imgB]);

    // 2. Swap to the inactive buffer if it matches currentSrc and is already fully loaded
    useEffect(() => {
        if (showA && resolvedCurrentSrc === imgB && imgBRef.current?.complete) {
            setShowA(false);
        } else if (!showA && resolvedCurrentSrc === imgA && imgARef.current?.complete) {
            setShowA(true);
        }
    }, [resolvedCurrentSrc, showA, imgA, imgB]);

    const handleLoadA = () => {
        setIsLoaded(true);
        if (!hasReportedLoad) {
            setHasReportedLoad(true);
        }
        onImageLoad?.(imgA);
        if (imgA === resolvedCurrentSrc && !showA) setShowA(true);
    };

    const handleLoadAError = () => {
        const brokenUrl = imgA;
        if (!fallbackMap[brokenUrl]) {
            // Pick a random fallback image from the API photos (allImages)
            const randomImage = allImages[Math.floor(Math.random() * allImages.length)];
            setFallbackMap(prev => ({ ...prev, [brokenUrl]: randomImage }));
            onImageLoad?.(brokenUrl); // Mark as loaded so it doesn't block the carousel
        }
    };

    const handleLoadB = () => {
        setIsLoaded(true);
        if (!hasReportedLoad) {
            setHasReportedLoad(true);
        }
        onImageLoad?.(imgB);
        if (imgB === resolvedCurrentSrc && showA) setShowA(false);
    };

    const handleLoadBError = () => {
        const brokenUrl = imgB;
        if (!fallbackMap[brokenUrl]) {
            // Pick a random fallback image from the API photos (allImages)
            const randomImage = allImages[Math.floor(Math.random() * allImages.length)];
            setFallbackMap(prev => ({ ...prev, [brokenUrl]: randomImage }));
            onImageLoad?.(brokenUrl);
        }
    };

    return (
        <motion.div
            style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                marginTop: -IMG_HEIGHT / 2,
                marginLeft: -IMG_WIDTH / 2,
                width: IMG_WIDTH,
                height: IMG_HEIGHT,
                x, y, z, rotate, scale, opacity,
                willChange: "transform",
                WebkitBackfaceVisibility: "hidden",
                backfaceVisibility: "hidden"
            }}
            className="cursor-pointer group"
            onClick={() => setSpin(spin + 360)}
        >
            <motion.div
                className={`relative h-full w-full rounded-xl overflow-hidden shadow-lg border-2 border-transparent group-hover:border-white transition-colors ${isLoaded ? 'bg-transparent' : 'bg-slate-200/50'}`}
                animate={{ rotateY: spin }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
            >
                {/* Skeleton Loading shimmer */}
                {!isLoaded && (
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-[pulse_1.5s_ease-in-out_infinite]" />
                )}
                
                {/* Buffer A */}
                <img
                    ref={imgARef}
                    src={imgA}
                    alt={`hero-${index}-a`}
                    referrerPolicy="no-referrer"
                    fetchPriority="high"
                    decoding="async"
                    onLoad={handleLoadA}
                    onError={handleLoadAError}
                    className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-150 group-hover:scale-105 will-change-transform ${showA ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                    style={{ WebkitBackfaceVisibility: "hidden", backfaceVisibility: "hidden" }}
                />

                {/* Buffer B */}
                <img
                    ref={imgBRef}
                    src={imgB}
                    alt={`hero-${index}-b`}
                    referrerPolicy="no-referrer"
                    fetchPriority="high"
                    decoding="async"
                    onLoad={handleLoadB}
                    onError={handleLoadBError}
                    className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-150 group-hover:scale-105 will-change-transform ${!showA ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                    style={{ WebkitBackfaceVisibility: "hidden", backfaceVisibility: "hidden" }}
                />
            </motion.div>
        </motion.div>
    );
});

const TOTAL_IMAGES = 20;
const MAX_SCROLL = 3000; 

const IMAGES = [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&q=80",
    "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=300&q=80",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&q=80",
    "https://images.unsplash.com/photo-1506765515384-028b60a970df?w=300&q=80",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=300&q=80",
    "https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?w=300&q=80",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&q=80",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&q=80",
    "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=300&q=80",
    "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=300&q=80",
    "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=300&q=80",
    "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=300&q=80",
    "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=300&q=80",
    "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=300&q=80",
    "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=300&q=80",
    "https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?w=300&q=80",
    "https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?w=300&q=80",
];

const CAPTIONS = [
    { title: "PCC Photo Club", subtitle: "ชมรมคนชอบลั่นชัตเตอร์ KMITLPCC" },
    { title: "เรียนไม่ยุ่ง มุ่งแต่ถ่ายรูป!", subtitle: "เก็บทุกโมเมนต์ฮาๆ และความทรงจำสุดป่วน" },
    { title: "ตากล้องวัยรุ่น พลังล้นเหลือ", subtitle: "ภาพสวยถูกใจ ฟีลลิ่งได้" },
    { title: "รับจบทุกงานกิจกรรม", subtitle: "ให้พวกเราช่วยบันทึกความทรงจำดีๆ ในงานของคุณนะ!" },
    { title: "แสงสวย มุมเป๊ะ", subtitle: "เรื่องหามุมถ่ายรูป ขอให้ไว้ใจพวกเรา มั้ง!" },
    { title: "ไม่ใช่แค่กดชัตเตอร์", subtitle: "แต่เราใส่ใจในทุกรายละเอียดของภาพที่คุณได้รับ" },
    { title: "รูปคู่ รูปเดี่ยว รูปหมู่", subtitle: "จัดให้ได้หมดตามที่คุณสั่ง แค่บอกคอนเซปต์มา" },
    { title: "สีสดใส มู้ดดีๆ", subtitle: "พร้อมแต่งภาพให้เสร็จสรรพ นำไปอัพลงโซเชียลต่อได้เลย" },
    { title: "เพื่อนถ่ายให้ไม่ถูกใจ?", subtitle: "ลองให้ตากล้องประจำชมรมเราจัดให้สิ รับรองว่าปัง!" },
    { title: "เก็บความประทับใจ", subtitle: "ในวันสำคัญของคุณ ด้วยรูปถ่ายคุณภาพจากฝีมือพวกเรา" }
];

const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

export default function IntroAnimation({ images = [] }: { images?: any[] }) {
    const [introPhase, setIntroPhase] = useState<AnimationPhase>("circle");
    const [mounted, setMounted] = useState(false);
    const [captionIndex, setCaptionIndex] = useState(0);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [loadedCount, setLoadedCount] = useState(0);
    
    const [globalLap, setGlobalLap] = useState(0);
    const globalLapRef = useRef(0);
    const incrementLap = () => {
        globalLapRef.current += 1;
        setGlobalLap(globalLapRef.current);
    };

    const loadedImagesRef = useRef<Set<string>>(new Set());
    const handleImageLoad = React.useCallback((src: string) => {
        loadedImagesRef.current.add(src);
        setLoadedCount(loadedImagesRef.current.size);
    }, []);
    
    const [isFullyLoaded, setIsFullyLoaded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    let displayImages = images.length > 0 ? images.map(img => img.thumbnailLink?.replace('=s220', '=s300') || "").filter(Boolean) : IMAGES;
    if (displayImages.length === 0) displayImages = IMAGES;
    
    const isMobileView = containerSize.width > 0 && containerSize.width < 768;
    const isTabletView = containerSize.width >= 768 && containerSize.width < 1024;
    const isLaptopView = containerSize.width >= 1024 && containerSize.width < 1280;
    const isMacAirView = containerSize.width >= 1280 && containerSize.width < 1600;
    const isExtraLargeView = containerSize.width >= 1600;
    
    let currentTotal = 18;
    if (isMobileView) currentTotal = 7;
    else if (isTabletView) currentTotal = 11; 
    else if (isLaptopView) currentTotal = 14;
    else if (isMacAirView) currentTotal = 16; // Perfectly spaced for 1280x800 Mac Air
    else if (isExtraLargeView) currentTotal = 20;

    // The arc math is designed for currentTotal images.
    // To create an infinite-feeling carousel where images actually change on every lap,
    // we create a huge array of shuffled batches.
    const [infiniteImages, setInfiniteImages] = useState<string[]>([]);
    
    useEffect(() => {
        if (displayImages.length === 0) return;
        
        let pool: string[] = [];
        for (let i = 0; i < 20; i++) {
            // First batch MUST perfectly match the initial displayImages to avoid crossfade on mount
            const shuffled = i === 0 
                ? [...displayImages] 
                : [...displayImages].sort(() => Math.random() - 0.5);
            
            let batch = [...shuffled];
            while (batch.length < currentTotal) {
                batch = [...batch, ...[...displayImages].sort(() => Math.random() - 0.5)];
            }
            
            pool.push(...batch.slice(0, Math.max(currentTotal, displayImages.length)));
        }
        setInfiniteImages(pool);
    }, [images, currentTotal]);

    // Use infiniteImages if ready, else fallback to a minimally valid array
    const allImages = infiniteImages.length > 0 ? infiniteImages : displayImages;
    const activeImages = allImages.slice(0, currentTotal);

    useEffect(() => {
        if (loadedCount >= activeImages.length && !isFullyLoaded && activeImages.length > 0) {
            const timer = setTimeout(() => setIsFullyLoaded(true), 1000);
            return () => clearTimeout(timer);
        }
    }, [loadedCount, activeImages.length, isFullyLoaded]);

    const uniqueImages = useMemo(() => Array.from(new Set(allImages)), [allImages]);

    useEffect(() => {
        if (!containerRef.current) return;
        const handleResize = (entries: ResizeObserverEntry[]) => {
            for (const entry of entries) {
                setContainerSize(prev => {
                    const newW = Math.round(entry.contentRect.width);
                    const newH = Math.round(entry.contentRect.height);
                    if (Math.abs(prev.width - newW) > 5 || Math.abs(prev.height - newH) > 5) {
                        return { width: newW, height: newH };
                    }
                    return prev;
                });
            }
        };
        const observer = new ResizeObserver(handleResize);
        observer.observe(containerRef.current);
        setContainerSize({
            width: Math.round(containerRef.current.offsetWidth),
            height: Math.round(containerRef.current.offsetHeight),
        });
        return () => observer.disconnect();
    }, []);

    const morphProgress = useMotionValue(0);
    const scrollRotate = useMotionValue(0);
    const mouseX = useMotionValue(0);
    const smoothMouseX = useSpring(mouseX, { stiffness: 30, damping: 20 });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            const relativeX = e.clientX - rect.left;
            const normalizedX = (relativeX / rect.width) * 2 - 1;
            mouseX.set(normalizedX * 100);
        };
        container.addEventListener("mousemove", handleMouseMove);
        return () => container.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX]);

    useEffect(() => {
        setMounted(true);
        let isCancelled = false;
        let timer3: NodeJS.Timeout;
        let checkTimeout: NodeJS.Timeout;
        let currentAnimation: any;

        const getNextLapUrls = (lap: number) => {
            const urls = [];
            for (let i = 0; i < currentTotal; i++) {
                const idx = (i + ((lap + 1) * currentTotal)) % Math.max(1, allImages.length);
                urls.push(allImages[idx]);
            }
            return urls;
        };

        const tryRewind = () => {
            if (isCancelled) return;
            
            const nextUrls = getNextLapUrls(globalLapRef.current);
            const isReady = nextUrls.every(url => loadedImagesRef.current.has(url));
            
            if (isReady) {
                const targetRot = scrollRotate.get() - 360;
                
                // Immediately increment globalLap. 
                // Each FlipCard will stagger its own update between 0.5s - 1.5s 
                // to prevent framerate drops and make the images ready by 2.0s
                incrementLap();
                
                playRewind(targetRot);
            } else {
                // Keep spinning forward, check again in 1 second
                checkTimeout = setTimeout(tryRewind, 1000);
            }
        };

        const playForward = () => {
            if (isCancelled) return;
            // Spin infinitely at 6 degrees per second (360000 degrees in 60000 seconds)
            currentAnimation = animate(scrollRotate, scrollRotate.get() + 360000, { 
                duration: 60000, 
                ease: "linear",
            });
            // Try to rewind after 20 seconds, but wait if images aren't loaded yet
            checkTimeout = setTimeout(tryRewind, 20000);
        };

        const playRewind = (targetRot: number) => {
            if (isCancelled) return;
            currentAnimation = animate(scrollRotate, targetRot, { 
                duration: 2.0,
                ease: "easeInOut",
                onComplete: () => playForward()
            });
        };

        if (isFullyLoaded) {
            timer3 = setTimeout(() => {
                if (isCancelled) return;
                setIntroPhase("arc");
                animate(morphProgress, 1, { duration: 1.5, ease: "easeInOut" });
                playForward();
            }, 800);
        }

        return () => { 
            if (timer3) clearTimeout(timer3); 
            if (checkTimeout) clearTimeout(checkTimeout);
            if (currentAnimation) currentAnimation.stop();
            isCancelled = true;
        };
    }, [morphProgress, scrollRotate, isFullyLoaded]);

    const prevCaptionIndexRef = useRef(0);

    // Caption Rotation
    useEffect(() => {
        if (!mounted) return;
        const delay = captionIndex === 0 ? 10000 : 6000;
        const timer = setTimeout(() => {
            prevCaptionIndexRef.current = captionIndex;
            setCaptionIndex((prev) => (prev + 1) % CAPTIONS.length);
        }, delay);
        return () => clearTimeout(timer);
    }, [mounted, captionIndex]);

    // Use deterministic pseudo-random to prevent React hydration mismatch between Server and Client
    const [scatterPositions] = useState(() =>
        Array.from({ length: 20 }).map((_, i) => {
            const pseudoRandom = (seed: number) => {
                const x = Math.sin(seed) * 10000;
                return x - Math.floor(x);
            };
            return {
                x: Math.round((pseudoRandom(i * 3 + 1) - 0.5) * 1500 * 100) / 100,
                y: Math.round((pseudoRandom(i * 3 + 2) - 0.5) * 1000 * 100) / 100,
                rotation: Math.round((pseudoRandom(i * 3 + 3) - 0.5) * 180 * 100) / 100,
                scale: 0.6,
                opacity: 0,
            };
        })
    );

    const contentOpacity = useTransform(morphProgress, [0.8, 1], [0, 1]);
    const contentY = useTransform(morphProgress, [0.8, 1], [20, 0]);

    return (
        <motion.div 
            ref={containerRef} 
            className="relative w-full h-full bg-transparent overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: mounted ? 1 : 0 }}
            transition={{ duration: 0.8 }}
        >
            <AnimatePresence>
                {!isFullyLoaded && mounted && (
                    <motion.div 
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0 z-[200] bg-slate-50/80 backdrop-blur-2xl pointer-events-none"
                    />
                )}
            </AnimatePresence>

            <div className={`flex h-full w-full flex-col items-center justify-center perspective-1000 transition-all duration-1000 ${isFullyLoaded ? 'scale-100 opacity-100' : 'scale-105 opacity-50'}`}>

                <motion.div
                    style={{ opacity: contentOpacity, y: contentY }}
                    className="absolute top-[10%] z-10 flex flex-col items-center justify-center text-center pointer-events-none px-4 min-h-[120px] w-full"
                >
                    <div className="relative w-full h-full flex items-center justify-center">
                        {CAPTIONS.map((caption, idx) => {
                            const isCurrent = captionIndex === idx;
                            const isPrev = prevCaptionIndexRef.current === idx;
                            let yPos = 15;
                            if (isCurrent) yPos = 0;
                            else if (isPrev) yPos = -15;

                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ 
                                        opacity: isCurrent ? 1 : 0, 
                                        y: yPos,
                                        zIndex: isCurrent ? 10 : 0,
                                        filter: isCurrent ? "blur(0px)" : "blur(4px)"
                                    }}
                                    transition={{ 
                                        duration: 0.5, 
                                        ease: "easeInOut",
                                        delay: isCurrent ? 0.5 : 0 // Sequential animation: exit first, then enter
                                    }}
                                    className="absolute flex flex-col items-center w-full"
                                >
                                    <h2 className="text-3xl md:text-5xl font-semibold text-gray-900 tracking-tight mb-4 drop-shadow-sm">
                                        {caption.title}
                                    </h2>
                                    <p className="text-sm md:text-base text-gray-600 max-w-lg leading-relaxed">
                                        {caption.subtitle}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
                <div className="relative flex items-center justify-center w-full h-full [transform-style:preserve-3d]">
                    {/* Center Logo with 3D depth effect (cards will pass in front and behind it) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={isFullyLoaded ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                        transition={{ duration: 1.5, delay: 1.2, ease: "easeOut" }}
                        className="absolute pointer-events-none drop-shadow-2xl"
                        style={{ 
                            z: 0, 
                            y: -40,       // Matches the carousel center yPos (moved up)
                        }}
                    >
                        <img 
                            src="/PCC%20Photo%20Club.webp" 
                            alt="PCC Photo Club Logo" 
                            className="w-48 md:w-72 lg:w-80 h-auto"
                        />
                    </motion.div>

                    {mounted && containerSize.width > 0 && activeImages.map((src, i) => (
                        <FlipCard
                            key={i}
                            src={src}
                            index={i}
                            total={currentTotal}
                            phase={introPhase} 
                            scatterPos={scatterPositions[i]}
                            containerSize={containerSize}
                            morphProgress={morphProgress}
                            scrollRotate={scrollRotate}
                            allImages={allImages}
                            onImageLoad={handleImageLoad}
                            globalLap={globalLap}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
