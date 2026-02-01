import { ref, computed, onMounted, onUnmounted } from 'vue';

export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  timestamp: number;
}

export interface GestureState {
  isActive: boolean;
  type: 'tap' | 'pan' | 'pinch' | 'rotate' | 'swipe' | null;
  startTime: number;
  duration: number;
  distance: number;
  angle: number;
  scale: number;
  rotation: number;
  velocity: { x: number; y: number };
  center: { x: number; y: number };
}

export interface TouchOptions {
  enablePan?: boolean;
  enablePinch?: boolean;
  enableRotate?: boolean;
  enableSwipe?: boolean;
  threshold?: {
    tap: number;
    pan: number;
    pinch: number;
    swipe: number;
  };
  preventDefault?: boolean;
}

export function useTouch(element: Ref<HTMLElement | null>, options: TouchOptions = {}) {
  const {
    enablePan = true,
    enablePinch = true,
    enableRotate = true,
    enableSwipe = true,
    threshold = {
      tap: 10,
      pan: 5,
      pinch: 0.1,
      swipe: 50,
    },
    preventDefault = true,
  } = options;

  // Estado dos toques
  const touches = ref<Map<number, TouchPoint>>(new Map());
  const gestureState = ref<GestureState>({
    isActive: false,
    type: null,
    startTime: 0,
    duration: 0,
    distance: 0,
    angle: 0,
    scale: 1,
    rotation: 0,
    velocity: { x: 0, y: 0 },
    center: { x: 0, y: 0 },
  });

  // Estado anterior para cálculos
  const previousState = ref<Partial<GestureState>>({});

  // Computed properties
  const touchCount = computed(() => touches.value.size);
  const isMultiTouch = computed(() => touchCount.value > 1);
  const primaryTouch = computed(() => {
    const touchArray = Array.from(touches.value.values());
    return touchArray[0] || null;
  });

  // Eventos
  const emit = defineEmits<{
    touchStart: [TouchEvent, GestureState];
    touchMove: [TouchEvent, GestureState];
    touchEnd: [TouchEvent, GestureState];
    tap: [{ x: number; y: number; duration: number }];
    doubleTap: [{ x: number; y: number }];
    longPress: [{ x: number; y: number }];
    pan: [{ deltaX: number; deltaY: number; velocity: { x: number; y: number } }];
    panStart: [{ x: number; y: number }];
    panEnd: [{ x: number; y: number; velocity: { x: number; y: number } }];
    pinch: [{ scale: number; center: { x: number; y: number } }];
    pinchStart: [{ center: { x: number; y: number } }];
    pinchEnd: [{ scale: number; center: { x: number; y: number } }];
    rotate: [{ rotation: number; center: { x: number; y: number } }];
    rotateStart: [{ center: { x: number; y: number } }];
    rotateEnd: [{ rotation: number; center: { x: number; y: number } }];
    swipe: [{ direction: 'up' | 'down' | 'left' | 'right'; velocity: number }];
  }>();

  // Utilitários
  const getDistance = (touch1: TouchPoint, touch2: TouchPoint): number => {
    const dx = touch2.x - touch1.x;
    const dy = touch2.y - touch1.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getAngle = (touch1: TouchPoint, touch2: TouchPoint): number => {
    return Math.atan2(touch2.y - touch1.y, touch2.x - touch1.x) * 180 / Math.PI;
  };

  const getCenter = (touchArray: TouchPoint[]): { x: number; y: number } => {
    const x = touchArray.reduce((sum, touch) => sum + touch.x, 0) / touchArray.length;
    const y = touchArray.reduce((sum, touch) => sum + touch.y, 0) / touchArray.length;
    return { x, y };
  };

  const getTouchPoint = (touch: Touch): TouchPoint => {
    const rect = element.value?.getBoundingClientRect();
    const x = touch.clientX - (rect?.left || 0);
    const y = touch.clientY - (rect?.top || 0);
    
    return {
      id: touch.identifier,
      x,
      y,
      startX: x,
      startY: y,
      timestamp: Date.now(),
    };
  };

  const updateGestureState = (): void => {
    const touchArray = Array.from(touches.value.values());
    const now = Date.now();

    if (touchArray.length === 0) {
      gestureState.value.isActive = false;
      gestureState.value.type = null;
      return;
    }

    gestureState.value.isActive = true;
    gestureState.value.duration = now - gestureState.value.startTime;
    gestureState.value.center = getCenter(touchArray);

    if (touchArray.length === 1) {
      const touch = touchArray[0];
      const deltaX = touch.x - touch.startX;
      const deltaY = touch.y - touch.startY;
      gestureState.value.distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Calcular velocidade
      const timeDelta = now - touch.timestamp;
      if (timeDelta > 0) {
        gestureState.value.velocity = {
          x: deltaX / timeDelta,
          y: deltaY / timeDelta,
        };
      }
    } else if (touchArray.length === 2) {
      const [touch1, touch2] = touchArray;
      const currentDistance = getDistance(touch1, touch2);
      const currentAngle = getAngle(touch1, touch2);
      
      if (previousState.value.distance) {
        gestureState.value.scale = currentDistance / previousState.value.distance;
      }
      
      if (previousState.value.angle !== undefined) {
        gestureState.value.rotation = currentAngle - previousState.value.angle;
      }
      
      previousState.value.distance = currentDistance;
      previousState.value.angle = currentAngle;
    }
  };

  // Detectar gestos
  const detectGesture = (): void => {
    const touchArray = Array.from(touches.value.values());
    
    if (touchArray.length === 1) {
      const touch = touchArray[0];
      const deltaX = touch.x - touch.startX;
      const deltaY = touch.y - touch.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > threshold.pan && enablePan) {
        gestureState.value.type = 'pan';
      }
    } else if (touchArray.length === 2) {
      const [touch1, touch2] = touchArray;
      const distance = getDistance(touch1, touch2);
      
      if (previousState.value.distance) {
        const scaleChange = Math.abs(distance - previousState.value.distance);
        if (scaleChange > threshold.pinch && enablePinch) {
          gestureState.value.type = 'pinch';
        }
      }
      
      if (enableRotate) {
        gestureState.value.type = 'rotate';
      }
    }
  };

  // Event handlers
  const handleTouchStart = (event: TouchEvent): void => {
    if (preventDefault) {
      event.preventDefault();
    }

    const now = Date.now();
    gestureState.value.startTime = now;

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const touchPoint = getTouchPoint(touch);
      touches.value.set(touch.identifier, touchPoint);
    }

    updateGestureState();
    emit('touchStart', event, { ...gestureState.value });

    // Detectar double tap
    if (touchCount.value === 1) {
      const lastTap = localStorage.getItem('lastTap');
      const lastTapTime = lastTap ? parseInt(lastTap) : 0;
      
      if (now - lastTapTime < 300) {
        emit('doubleTap', gestureState.value.center);
      }
      
      localStorage.setItem('lastTap', now.toString());
    }
  };

  const handleTouchMove = (event: TouchEvent): void => {
    if (preventDefault) {
      event.preventDefault();
    }

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const existingTouch = touches.value.get(touch.identifier);
      
      if (existingTouch) {
        const rect = element.value?.getBoundingClientRect();
        existingTouch.x = touch.clientX - (rect?.left || 0);
        existingTouch.y = touch.clientY - (rect?.top || 0);
      }
    }

    updateGestureState();
    detectGesture();

    // Emitir eventos específicos
    if (gestureState.value.type === 'pan' && enablePan) {
      const touch = primaryTouch.value;
      if (touch) {
        emit('pan', {
          deltaX: touch.x - touch.startX,
          deltaY: touch.y - touch.startY,
          velocity: gestureState.value.velocity,
        });
      }
    } else if (gestureState.value.type === 'pinch' && enablePinch) {
      emit('pinch', {
        scale: gestureState.value.scale,
        center: gestureState.value.center,
      });
    } else if (gestureState.value.type === 'rotate' && enableRotate) {
      emit('rotate', {
        rotation: gestureState.value.rotation,
        center: gestureState.value.center,
      });
    }

    emit('touchMove', event, { ...gestureState.value });
  };

  const handleTouchEnd = (event: TouchEvent): void => {
    if (preventDefault) {
      event.preventDefault();
    }

    const endedTouches: TouchPoint[] = [];

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const touchPoint = touches.value.get(touch.identifier);
      
      if (touchPoint) {
        endedTouches.push(touchPoint);
        touches.value.delete(touch.identifier);
      }
    }

    // Detectar gestos finais
    if (endedTouches.length > 0 && touchCount.value === 0) {
      const touch = endedTouches[0];
      const deltaX = touch.x - touch.startX;
      const deltaY = touch.y - touch.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const duration = Date.now() - gestureState.value.startTime;

      // Tap
      if (distance < threshold.tap && duration < 300) {
        emit('tap', {
          x: touch.x,
          y: touch.y,
          duration,
        });
      }

      // Long press
      if (distance < threshold.tap && duration > 500) {
        emit('longPress', {
          x: touch.x,
          y: touch.y,
        });
      }

      // Swipe
      if (distance > threshold.swipe && enableSwipe) {
        const velocity = distance / duration;
        let direction: 'up' | 'down' | 'left' | 'right';

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'right' : 'left';
        } else {
          direction = deltaY > 0 ? 'down' : 'up';
        }

        emit('swipe', { direction, velocity });
      }

      // Emitir eventos de fim
      if (gestureState.value.type === 'pan') {
        emit('panEnd', {
          x: touch.x,
          y: touch.y,
          velocity: gestureState.value.velocity,
        });
      } else if (gestureState.value.type === 'pinch') {
        emit('pinchEnd', {
          scale: gestureState.value.scale,
          center: gestureState.value.center,
        });
      } else if (gestureState.value.type === 'rotate') {
        emit('rotateEnd', {
          rotation: gestureState.value.rotation,
          center: gestureState.value.center,
        });
      }
    }

    updateGestureState();
    emit('touchEnd', event, { ...gestureState.value });
  };

  // Lifecycle
  onMounted(() => {
    if (element.value) {
      element.value.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
      element.value.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
      element.value.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });
      element.value.addEventListener('touchcancel', handleTouchEnd, { passive: !preventDefault });
    }
  });

  onUnmounted(() => {
    if (element.value) {
      element.value.removeEventListener('touchstart', handleTouchStart);
      element.value.removeEventListener('touchmove', handleTouchMove);
      element.value.removeEventListener('touchend', handleTouchEnd);
      element.value.removeEventListener('touchcancel', handleTouchEnd);
    }
  });

  return {
    // Estado
    touches: readonly(touches),
    gestureState: readonly(gestureState),
    touchCount,
    isMultiTouch,
    primaryTouch,

    // Métodos
    emit,
  };
}