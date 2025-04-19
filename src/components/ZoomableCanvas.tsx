import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';  
import { motion, useMotionValue, useTransform, animate, useMotionValueEvent } from 'framer-motion';
import debounce from 'lodash/debounce';
import { useNavigate } from 'react-router-dom';
import { CARDS } from './cardData';

const ZOOM_SPEED = 0.15;
const MAX_ZOOM = 4;

// Constants for fixed canvas size
const CANVAS_WIDTH = 4000;  // pixels
const CANVAS_HEIGHT = 3000; // pixels
const CARD_SIZE = 256;      // pixels

// Add this constant near the top with other constants
const ZOOM_TRANSITION_MS = 150; // Slightly faster animation
const ZOOM_SPRING_CONFIG = { 
  stiffness: 400, 
  damping: 40,
  mass: 0.5 // Added for smoother motion
};

export default function ZoomableCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [activeCard, setActiveCard] = useState(0);
  const [debugPos, setDebugPos] = useState({ x: 0, y: 0 });
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const zoomMotion = useMotionValue(1);
  const navigate = useNavigate();

  // Calculate minimum zoom that ensures canvas fills viewport
  const getMinZoom = () => {
    if (!containerRef.current) return 0.25;
    const viewport = containerRef.current;
    const viewportWidth = viewport.offsetWidth;
    const viewportHeight = viewport.offsetHeight;
    
    return Math.max(
      viewportWidth / CANVAS_WIDTH,
      viewportHeight / CANVAS_HEIGHT
    );
  };
  
  // Define scale transform after getMinZoom is defined
  const scale = useTransform(
    zoomMotion,
    (v) => {
      const minZoom = getMinZoom();
      return Math.min(Math.max(v, minZoom), MAX_ZOOM);
    }
  );

  // Memoize the minZoom calculation
  const minZoom = useMemo(() => getMinZoom(), []);

  // Memoize constrainPosition function
  const memoizedConstrainPosition = useCallback((posX: number, posY: number, currentZoom: number) => {
    if (!containerRef.current) return { x: posX, y: posY };

    const viewport = containerRef.current;
    const viewportWidth = viewport.offsetWidth;
    const viewportHeight = viewport.offsetHeight;
    
    const effectiveZoom = Math.max(currentZoom, minZoom);
    const effectiveCanvasWidth = CANVAS_WIDTH * effectiveZoom;
    const effectiveCanvasHeight = CANVAS_HEIGHT * effectiveZoom;

    const minX = -(effectiveCanvasWidth - viewportWidth);
    const minY = -(effectiveCanvasHeight - viewportHeight);

    return {
      x: Math.min(0, Math.max(minX, posX)),
      y: Math.min(0, Math.max(minY, posY))
    };
  }, [minZoom]);

  // Optimize motion value event handlers
  useMotionValueEvent(x, "change", useCallback((latest) => {
    if (!containerRef.current) return;
    const viewportWidth = containerRef.current.offsetWidth;
    const viewportCenterX = (-latest + viewportWidth/2) / zoomMotion.get();
    setDebugPos(prev => ({ ...prev, x: Math.round(viewportCenterX) }));
  }, [zoomMotion]));

  useMotionValueEvent(y, "change", useCallback((latest) => {
    if (!containerRef.current) return;
    const viewportHeight = containerRef.current.offsetHeight;
    const viewportCenterY = (-latest + viewportHeight/2) / zoomMotion.get();
    setDebugPos(prev => ({ ...prev, y: Math.round(viewportCenterY) }));
  }, [zoomMotion]));

  // Initial positioning
  useEffect(() => {
    if (!containerRef.current) return;
    
    const viewport = containerRef.current;
    const viewportWidth = viewport.offsetWidth;
    const viewportHeight = viewport.offsetHeight;

    const targetZoom = getMinZoom() * 1.1;

    const centerX = -(CANVAS_WIDTH * targetZoom - viewportWidth) / 2;
    const centerY = -(CANVAS_HEIGHT * targetZoom - viewportHeight) / 2;

    x.set(centerX);
    y.set(centerY);
    zoomMotion.set(targetZoom);
    setZoom(targetZoom);
  }, [x, y, zoomMotion]);

  // Memoize and debounce navigation function
  const debouncedNavigateToCard = useMemo(
    () => debounce((cardIndex: number) => {
      if (cardIndex < 0 || cardIndex >= CARDS.length) return;
      if (!containerRef.current) return;

      const card = CARDS[cardIndex];
      const viewport = containerRef.current;
      const viewportWidth = viewport.offsetWidth;
      const viewportHeight = viewport.offsetHeight;

      const targetZoom = 1.5;

      const cardCenterX = (parseFloat(card.position.left) / 100 * CANVAS_WIDTH) + CARD_SIZE/2;
      const cardCenterY = (parseFloat(card.position.top) / 100 * CANVAS_HEIGHT) + CARD_SIZE/2;

      const targetX = viewportWidth/2 - cardCenterX * targetZoom;
      const targetY = viewportHeight/2 - cardCenterY * targetZoom;

      const { x: constrainedX, y: constrainedY } = memoizedConstrainPosition(targetX, targetY, targetZoom);

      Promise.all([
        animate(zoomMotion, targetZoom, {
          type: "spring",
          stiffness: 80,
          damping: 25,
          restDelta: 0.001
        }),
        animate(x, constrainedX, {
          type: "spring",
          stiffness: 80,
          damping: 25,
          restDelta: 0.001
        }),
        animate(y, constrainedY, {
          type: "spring",
          stiffness: 80,
          damping: 25,
          restDelta: 0.001
        })
      ]);

      setZoom(targetZoom);
      setActiveCard(cardIndex);
    }, 100), // 100ms debounce
    [memoizedConstrainPosition]
  );

  // Replace the wheel handler with this improved version
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (!containerRef.current) return;

    // Get current values
    const currentX = x.get();
    const currentY = y.get();
    const currentZoom = zoomMotion.get();
    
    // Calculate new zoom level with smoother delta
    const zoomDelta = -e.deltaY * ZOOM_SPEED / 100;
    const newZoom = currentZoom * Math.exp(zoomDelta);
    const clampedZoom = Math.min(Math.max(newZoom, minZoom), MAX_ZOOM);
    
    // If zoom didn't change, don't do anything
    if (clampedZoom === currentZoom) return;

    // Get mouse position relative to viewport
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate mouse position relative to the canvas in world space
    const mouseXCanvas = (mouseX - currentX) / currentZoom;
    const mouseYCanvas = (mouseY - currentY) / currentZoom;

    // Function to calculate position for a given zoom level
    const calculatePosition = (targetZoom: number) => {
      const newX = mouseX - mouseXCanvas * targetZoom;
      const newY = mouseY - mouseYCanvas * targetZoom;
      return memoizedConstrainPosition(newX, newY, targetZoom);
    };

    // Update position and zoom with synchronized animations
    animate(zoomMotion, clampedZoom, {
      type: "spring",
      ...ZOOM_SPRING_CONFIG,
      stiffness: Math.abs(zoomDelta) > 1.5 ? 800 : ZOOM_SPRING_CONFIG.stiffness,
      onUpdate: (latest) => {
        const { x: newX, y: newY } = calculatePosition(latest);
        x.set(newX);
        y.set(newY);
      },
      onComplete: () => {
        setZoom(clampedZoom);
      }
    });
    
  }, [minZoom, memoizedConstrainPosition, x, y, zoomMotion]);

  // Optimize keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let nextCard = activeCard;
      
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextCard = (activeCard + 1) % CARDS.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          nextCard = (activeCard - 1 + CARDS.length) % CARDS.length;
          break;
        default:
          return;
      }

      debouncedNavigateToCard(nextCard);
    };

    window.addEventListener('keydown', handleKeyDown, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      debouncedNavigateToCard.cancel();
    };
  }, [activeCard, debouncedNavigateToCard]);

  // Update dragConstraints to use memoized value
  const dragConstraints = useMemo(() => ({
    left: -(CANVAS_WIDTH * zoom - (containerRef.current?.offsetWidth ?? 0)),
    right: 0,
    top: -(CANVAS_HEIGHT * zoom - (containerRef.current?.offsetHeight ?? 0)),
    bottom: 0
  }), [zoom]);

  const handleCardClick = (cardId: number) => {
    // First zoom to the card
    debouncedNavigateToCard(cardId);
    
    // Then navigate to the card page after a short delay
    setTimeout(() => {
      navigate(`/card/${cardId}`);
    }, 500);
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-screen overflow-hidden"
      style={{ backgroundColor: '#fafafa' }}
      onWheel={handleWheel}
    >
      {/* Debug overlay */}
      <div className="fixed top-4 left-4 bg-black/70 text-white p-4 rounded-lg font-mono text-sm z-50">
        <div>Viewport Center: ({debugPos.x}, {debugPos.y})</div>
        <div>Canvas Center: ({CANVAS_WIDTH/2}, {CANVAS_HEIGHT/2})</div>
        <div>Current Zoom: {zoom.toFixed(2)}x</div>
        <div>Active Card: {activeCard}</div>
        <div>Card Center: ({
          Math.round(parseFloat(CARDS[activeCard].position.left) / 100 * CANVAS_WIDTH + CARD_SIZE/2)
        }, {
          Math.round(parseFloat(CARDS[activeCard].position.top) / 100 * CANVAS_HEIGHT + CARD_SIZE/2)
        })</div>
      </div>

      <motion.div
        drag
        dragMomentum={false}
        dragConstraints={dragConstraints}
        style={{
          x,
          y,
          scale,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundColor: '#f5f4ef',
          fontFamily: 'Times New Roman, serif'
        }}
        className="relative origin-[0_0]"
      >
        {/* Center marker */}
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute h-8 w-0.5 bg-red-500 -translate-y-1/2" />
            {/* Horizontal line */}
            <div className="absolute w-8 h-0.5 bg-red-500 -translate-x-1/2" />
          </div>
        </div>

        {CARDS.map((card, index) => (
          <motion.div 
            key={card.id}
            className={`absolute ${card.size} ${card.colorClass} ${card.shape || 'rounded-lg'} 
              backdrop-blur-sm shadow-lg ${index === activeCard ? 'ring-2 ring-blue-500' : ''}`}
            style={card.position}
            whileHover={{ scale: 1.05, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
            onClick={() => handleCardClick(card.id)}
          >
            <div className="p-6 text-slate-800 h-full flex flex-col justify-between">
              <h2 className="text-xl font-bold mb-2">{card.title}</h2>
              <p className="whitespace-pre-line">{card.description}</p>
            </div>
          </motion.div>
        ))}

        {/* Canvas border */}
        <div className="absolute inset-0 border-4 border-dashed border-slate-300/50" />
        
        {/* Enhanced grid pattern */}
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.1) 2px, transparent 0)`,
            backgroundSize: '80px 80px'
          }}
        />
      </motion.div>
    </div>
  );
}