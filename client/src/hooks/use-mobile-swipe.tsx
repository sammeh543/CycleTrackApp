import { useState, TouchEvent } from 'react';

interface UseMobileSwipeProps {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeResult {
  containerProps: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchEnd: (e: TouchEvent) => void;
  };
}

const useMobileSwipe = ({
  threshold = 50,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown
}: UseMobileSwipeProps): SwipeResult => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Only trigger if the swipe is long enough
    if (absX < threshold && absY < threshold) return;

    // Determine if the swipe is horizontal or vertical
    if (absX > absY) {
      // Horizontal swipe
      if (deltaX > 0) {
        onSwipeLeft && onSwipeLeft();
      } else {
        onSwipeRight && onSwipeRight();
      }
    } else {
      // Vertical swipe
      if (deltaY > 0) {
        onSwipeUp && onSwipeUp();
      } else {
        onSwipeDown && onSwipeDown();
      }
    }

    setTouchStart(null);
  };

  return {
    containerProps: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd
    }
  };
};

export default useMobileSwipe;
