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
    onImageLoad?: () => void;
}

const IMG_WIDTH = 90;  
const IMG_HEIGHT = 127; 

function FlipCard({ src, index, total, phase, scatterPos, containerSize, morphProgress, scrollRotate, allImages, onImageLoad }: FlipCardProps) {
    const isMobile = containerSize.width < 768;
    const [spin, setSpin] = useState(0);
    const [imageIndex, setImageIndex] = useState(index);
    
    // Calculate initial angles to set up lap tracking
    const initialStep = 360 / total;
    const initialAngle = (index * initialStep) + scrollRotate.get();
    const prevLapRef = useRef(Math.floor((initialAngle + 180) / 360));
    const prevAngleRef = useRef(initialAngle);

    useMotionValueEvent(scrollRotate, "change", (latestRotation: number) => {
        if (phase !== "circle" && phase !== "arc") return;
        
        const step = 360 / total;
        const currentAngle = (index * step) + latestRotation;
        const currentLap = Math.floor((currentAngle + 180) / 360);
        const prevLap = prevLapRef.current;
        const prevAngle = prevAngleRef.current;
        
        // Only swap images when spinning backward and passing the back of the wheel (crossing 180 deg)
        if (currentAngle < prevAngle) {
            if (currentLap < prevLap) {
                const lapsCrossed = prevLap - currentLap;
                setImageIndex(prev => prev + (lapsCrossed * total));
            }
        }
        
        prevLapRef.current = currentLap;
        prevAngleRef.current = currentAngle;
    });

    const safeIndex = imageIndex % Math.max(1, allImages.length);
    const nextSafeIndex = (imageIndex + total) % Math.max(1, allImages.length);
    
    const currentSrc = allImages[safeIndex] || src;
    const nextSrc = allImages[nextSafeIndex] || src;

    const transformValues = useTransform([morphProgress, scrollRotate], ([m, r]: any) => {
        let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };
        
        if (phase === "scatter") {
            target = scatterPos;
        } else if (phase === "line") {
            const lineSpacing = 70;
            const lineTotalWidth = total * lineSpacing;
            const lineX = index * lineSpacing - lineTotalWidth / 2;
            target = { x: lineX, y: 0, rotation: 0, scale: 1, opacity: 1 };
        } else {
            const minDimension = Math.min(containerSize.width, containerSize.height);
            const step = 360 / total;
            const currentAngle = (index * step) + r;

            const circleRadius = Math.min(minDimension * 0.35, 350);
            const circleRad = (currentAngle * Math.PI) / 180;
            const circlePos = {
                x: Math.cos(circleRad) * circleRadius,
                y: Math.sin(circleRad) * circleRadius,
                rotation: currentAngle + 90,
            };

            const radiusX = isMobile ? containerSize.width * 0.4 : containerSize.width * 0.32;
            const radiusY = isMobile ? 60 : Math.min(containerSize.height * 0.15, 130);
            const rad = (currentAngle * Math.PI) / 180;
            
            const xPos = Math.sin(rad) * radiusX;
            const zPos = Math.cos(rad);
            const yPos = zPos * radiusY;
            
            const arcPos = {
                x: xPos,
                y: yPos + (isMobile ? 50 : Math.min(containerSize.height * 0.12, 100)), 
                rotation: xPos * 0.05,
                scale: (isMobile ? 0.9 : 1.3) + (zPos * (isMobile ? 0.3 : 0.4)),
            };

            target = {
                x: circlePos.x * (1 - m) + arcPos.x * m,
                y: circlePos.y * (1 - m) + arcPos.y * m,
                rotation: circlePos.rotation * (1 - m) + arcPos.rotation * m,
                scale: 1 * (1 - m) + arcPos.scale * m,
                opacity: 1,
            };
        }
        return target;
    });

    const x = useTransform(transformValues, (t: any) => t.x);
    const y = useTransform(transformValues, (t: any) => t.y);
    const rotate = useTransform(transformValues, (t: any) => t.rotation);
    const scale = useTransform(transformValues, (t: any) => t.scale);
    const opacity = useTransform(transformValues, (t: any) => t.opacity);
    const zIndex = useTransform(scale, (s: any) => Math.round(s * 100000));

    const [isLoaded, setIsLoaded] = useState(false);
    const [hasReportedLoad, setHasReportedLoad] = useState(false);
    
    // Double-buffering state for rock-solid crossfades without unmounting
    const [imgA, setImgA] = useState(currentSrc);
    const [imgB, setImgB] = useState(currentSrc);
    const [showA, setShowA] = useState(true);

    useEffect(() => {
        if (currentSrc !== imgA && currentSrc !== imgB) {
            if (showA) {
                setImgB(currentSrc);
            } else {
                setImgA(currentSrc);
            }
        }
    }, [currentSrc, imgA, imgB, showA]);

    const handleLoadA = () => {
        setIsLoaded(true);
        if (!hasReportedLoad) {
            setHasReportedLoad(true);
            onImageLoad?.();
        }
        if (imgA === currentSrc) setShowA(true);
    };

    const handleLoadB = () => {
        setIsLoaded(true);
        if (!hasReportedLoad) {
            setHasReportedLoad(true);
            onImageLoad?.();
        }
        if (imgB === currentSrc) setShowA(false);
    };

    return (
        <motion.div
            style={{
                position: "absolute",
                width: IMG_WIDTH,
                height: IMG_HEIGHT,
                x, y, rotate, scale, opacity, zIndex,
                willChange: "transform",
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
                    src={imgA}
                    alt={`hero-${index}-a`}
                    referrerPolicy="no-referrer"
                    onLoad={handleLoadA}
                    className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 group-hover:scale-105 will-change-transform ${showA ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                    style={{ WebkitBackfaceVisibility: "hidden", backfaceVisibility: "hidden" }}
                />

                {/* Buffer B */}
                <img
                    src={imgB}
                    alt={`hero-${index}-b`}
                    referrerPolicy="no-referrer"
                    onLoad={handleLoadB}
                    className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 group-hover:scale-105 will-change-transform ${!showA ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                    style={{ WebkitBackfaceVisibility: "hidden", backfaceVisibility: "hidden" }}
                />
            </motion.div>
        </motion.div>
    );
}

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
    const containerRef = useRef<HTMLDivElement>(null);
    let displayImages = images.length > 0 ? images.map(img => img.thumbnailLink?.replace('=s220', '=s300') || "") : IMAGES;
    
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
        // Create 20 batches of shuffled images (enough for 20 laps before repeating the exact pattern)
        for (let i = 0; i < 20; i++) {
            // First batch should be unshuffled (or minimally shuffled) if we want initial load to match
            // But shuffling all batches ensures random distribution.
            const shuffled = [...displayImages].sort(() => Math.random() - 0.5);
            
            // If displayImages is less than currentTotal, we need to pad the batch 
            // so each lap has exactly currentTotal distinct slots.
            let batch = [...shuffled];
            while (batch.length < currentTotal) {
                batch = [...batch, ...shuffled.sort(() => Math.random() - 0.5)];
            }
            
            // Ensure each batch perfectly aligns with the currentTotal boundary
            pool.push(...batch.slice(0, Math.max(currentTotal, displayImages.length)));
        }
        setInfiniteImages(pool);
    }, [images, currentTotal]);

    // Use infiniteImages if ready, else fallback to a minimally valid array
    const allImages = infiniteImages.length > 0 ? infiniteImages : displayImages;
    const activeImages = allImages.slice(0, currentTotal);
    const isFullyLoaded = loadedCount >= activeImages.length;

    useEffect(() => {
        if (!containerRef.current) return;
        const handleResize = (entries: ResizeObserverEntry[]) => {
            for (const entry of entries) {
                setContainerSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        };
        const observer = new ResizeObserver(handleResize);
        observer.observe(containerRef.current);
        setContainerSize({
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight,
        });
        return () => observer.disconnect();
    }, []);

    const morphProgress = useMotionValue(0);
    const scrollRotate = useMotionValue(0);
    // Remove useSpring for scrollRotate to prevent physics wiggle at exactly 180 degrees
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

        const runAnimationSequence = async () => {
            let currentRot = 0;
            while (!isCancelled) {
                // 1. Forward Spin: 120 deg over 20 seconds (maintaining 6 deg/sec speed).
                await animate(scrollRotate, currentRot + 120, { duration: 20, ease: "linear" });
                if (isCancelled) break;
                currentRot += 120;
                
                // 2. Fast Rewind: -360 deg over 2.5 seconds. (Trigger image swap on all cards)
                await animate(scrollRotate, currentRot - 360, { duration: 2.5, ease: "easeInOut" });
                if (isCancelled) break;
                currentRot -= 360;
            }
        };

        const timer3 = setTimeout(() => {
            setIntroPhase("arc");
            animate(morphProgress, 1, { duration: 1.5, ease: "easeInOut" });
            runAnimationSequence();
        }, 1000);

        return () => { 
            clearTimeout(timer3); 
            isCancelled = true;
        };
    }, [morphProgress, scrollRotate]);

    // Caption Rotation
    useEffect(() => {
        if (!mounted) return;
        const delay = captionIndex === 0 ? 10000 : 4000;
        const timer = setTimeout(() => {
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

    // Removed local state morphValue and rotateValue for performance

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
                        className="absolute inset-0 z-[200] bg-slate-100/90"
                    />
                )}
            </AnimatePresence>
            
            <div className={`flex h-full w-full flex-col items-center justify-center perspective-1000 transition-all duration-1000 ${isFullyLoaded ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}>

                <motion.div
                    style={{ opacity: contentOpacity, y: contentY }}
                    className="absolute top-[10%] z-10 flex flex-col items-center justify-center text-center pointer-events-none px-4 min-h-[120px]"
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={captionIndex}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                            className="flex flex-col items-center"
                        >
                            <h2 className="text-3xl md:text-5xl font-semibold text-gray-900 tracking-tight mb-4">
                                {CAPTIONS[captionIndex].title}
                            </h2>
                            <p className="text-sm md:text-base text-gray-600 max-w-lg leading-relaxed">
                                {CAPTIONS[captionIndex].subtitle}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
                <div className="relative flex items-center justify-center w-full h-full">
                    {/* Center Logo with 3D depth effect (cards will pass in front and behind it) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
                        className="absolute pointer-events-none drop-shadow-2xl"
                        style={{ 
                            zIndex: isMobileView ? 90000 : 130000, // Matches the center line of the arc based on new zIndex precision
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
                            onImageLoad={() => setLoadedCount(c => c + 1)}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
