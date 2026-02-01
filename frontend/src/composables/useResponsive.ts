import { ref, computed, onMounted, onUnmounted } from 'vue';

export interface BreakpointConfig {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
  touchSupport: boolean;
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
}

export interface ViewportInfo {
  width: number;
  height: number;
  breakpoint: keyof BreakpointConfig;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

const defaultBreakpoints: BreakpointConfig = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
};

export function useResponsive(breakpoints: Partial<BreakpointConfig> = {}) {
  const config = { ...defaultBreakpoints, ...breakpoints };
  
  // Estado reativo
  const windowWidth = ref(0);
  const windowHeight = ref(0);
  const devicePixelRatio = ref(1);
  
  // Informações do dispositivo
  const deviceInfo = ref<DeviceInfo>({
    type: 'desktop',
    orientation: 'landscape',
    pixelRatio: 1,
    touchSupport: false,
    platform: 'unknown',
  });

  // Computed properties
  const viewport = computed<ViewportInfo>(() => {
    const width = windowWidth.value;
    let breakpoint: keyof BreakpointConfig = 'xs';
    
    if (width >= config.xxl) breakpoint = 'xxl';
    else if (width >= config.xl) breakpoint = 'xl';
    else if (width >= config.lg) breakpoint = 'lg';
    else if (width >= config.md) breakpoint = 'md';
    else if (width >= config.sm) breakpoint = 'sm';
    
    return {
      width,
      height: windowHeight.value,
      breakpoint,
      isMobile: breakpoint === 'xs' || breakpoint === 'sm',
      isTablet: breakpoint === 'md',
      isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === 'xxl',
    };
  });

  // Breakpoint checks
  const isXs = computed(() => viewport.value.breakpoint === 'xs');
  const isSm = computed(() => viewport.value.breakpoint === 'sm');
  const isMd = computed(() => viewport.value.breakpoint === 'md');
  const isLg = computed(() => viewport.value.breakpoint === 'lg');
  const isXl = computed(() => viewport.value.breakpoint === 'xl');
  const isXxl = computed(() => viewport.value.breakpoint === 'xxl');

  // Size checks
  const isMobile = computed(() => viewport.value.isMobile);
  const isTablet = computed(() => viewport.value.isTablet);
  const isDesktop = computed(() => viewport.value.isDesktop);

  // Orientation
  const isPortrait = computed(() => windowHeight.value > windowWidth.value);
  const isLandscape = computed(() => windowWidth.value >= windowHeight.value);

  // Device capabilities
  const hasTouch = computed(() => deviceInfo.value.touchSupport);
  const isHighDPI = computed(() => devicePixelRatio.value > 1);
  const isRetina = computed(() => devicePixelRatio.value >= 2);

  // Platform checks
  const isIOS = computed(() => deviceInfo.value.platform === 'ios');
  const isAndroid = computed(() => deviceInfo.value.platform === 'android');
  const isMacOS = computed(() => deviceInfo.value.platform === 'macos');
  const isWindows = computed(() => deviceInfo.value.platform === 'windows');

  // Utility functions
  const detectDevice = (): DeviceInfo => {
    const userAgent = navigator.userAgent.toLowerCase();
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Detect platform
    let platform: DeviceInfo['platform'] = 'unknown';
    if (/iphone|ipad|ipod/.test(userAgent)) platform = 'ios';
    else if (/android/.test(userAgent)) platform = 'android';
    else if (/mac/.test(userAgent)) platform = 'macos';
    else if (/win/.test(userAgent)) platform = 'windows';
    else if (/linux/.test(userAgent)) platform = 'linux';

    // Detect device type
    let type: DeviceInfo['type'] = 'desktop';
    if (width <= config.sm || /mobile|phone/.test(userAgent)) {
      type = 'mobile';
    } else if (width <= config.lg || /tablet|ipad/.test(userAgent)) {
      type = 'tablet';
    }

    // Detect orientation
    const orientation: DeviceInfo['orientation'] = height > width ? 'portrait' : 'landscape';

    // Detect touch support
    const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    return {
      type,
      orientation,
      pixelRatio: window.devicePixelRatio || 1,
      touchSupport,
      platform,
    };
  };

  const updateDimensions = (): void => {
    windowWidth.value = window.innerWidth;
    windowHeight.value = window.innerHeight;
    devicePixelRatio.value = window.devicePixelRatio || 1;
    deviceInfo.value = detectDevice();
  };

  // Responsive utilities
  const getResponsiveValue = <T>(values: Partial<Record<keyof BreakpointConfig, T>>): T | undefined => {
    const breakpoint = viewport.value.breakpoint;
    const breakpointOrder: (keyof BreakpointConfig)[] = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'];
    
    // Find the first matching breakpoint value
    const currentIndex = breakpointOrder.indexOf(breakpoint);
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i];
      if (values[bp] !== undefined) {
        return values[bp];
      }
    }
    
    return undefined;
  };

  const matchBreakpoint = (query: string): boolean => {
    // Parse breakpoint queries like ">=md", "<lg", "sm-lg"
    if (query.includes('-')) {
      const [start, end] = query.split('-') as [keyof BreakpointConfig, keyof BreakpointConfig];
      const currentWidth = windowWidth.value;
      return currentWidth >= config[start] && currentWidth < config[end];
    }
    
    if (query.startsWith('>=')) {
      const bp = query.slice(2) as keyof BreakpointConfig;
      return windowWidth.value >= config[bp];
    }
    
    if (query.startsWith('<=')) {
      const bp = query.slice(2) as keyof BreakpointConfig;
      return windowWidth.value <= config[bp];
    }
    
    if (query.startsWith('>')) {
      const bp = query.slice(1) as keyof BreakpointConfig;
      return windowWidth.value > config[bp];
    }
    
    if (query.startsWith('<')) {
      const bp = query.slice(1) as keyof BreakpointConfig;
      return windowWidth.value < config[bp];
    }
    
    // Exact match
    return viewport.value.breakpoint === query;
  };

  // CSS classes helper
  const getResponsiveClasses = (baseClass: string): string[] => {
    const classes = [baseClass];
    const bp = viewport.value.breakpoint;
    
    classes.push(`${baseClass}--${bp}`);
    classes.push(`${baseClass}--${deviceInfo.value.type}`);
    classes.push(`${baseClass}--${deviceInfo.value.orientation}`);
    
    if (hasTouch.value) classes.push(`${baseClass}--touch`);
    if (isHighDPI.value) classes.push(`${baseClass}--hidpi`);
    if (deviceInfo.value.platform !== 'unknown') {
      classes.push(`${baseClass}--${deviceInfo.value.platform}`);
    }
    
    return classes;
  };

  // Media query helper
  const createMediaQuery = (query: string): MediaQueryList => {
    let mediaQuery = '';
    
    if (query.startsWith('>=')) {
      const bp = query.slice(2) as keyof BreakpointConfig;
      mediaQuery = `(min-width: ${config[bp]}px)`;
    } else if (query.startsWith('<=')) {
      const bp = query.slice(2) as keyof BreakpointConfig;
      mediaQuery = `(max-width: ${config[bp] - 1}px)`;
    } else if (query.includes('-')) {
      const [start, end] = query.split('-') as [keyof BreakpointConfig, keyof BreakpointConfig];
      mediaQuery = `(min-width: ${config[start]}px) and (max-width: ${config[end] - 1}px)`;
    } else {
      // Custom media query
      mediaQuery = query;
    }
    
    return window.matchMedia(mediaQuery);
  };

  // Performance optimization
  let resizeTimeout: number;
  const handleResize = (): void => {
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(updateDimensions, 100);
  };

  const handleOrientationChange = (): void => {
    // Delay to ensure dimensions are updated after orientation change
    setTimeout(updateDimensions, 200);
  };

  // Event listeners
  onMounted(() => {
    updateDimensions();
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Listen for pixel ratio changes (zoom, external monitor)
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mediaQuery.addEventListener('change', updateDimensions);
    }
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleOrientationChange);
    clearTimeout(resizeTimeout);
  });

  return {
    // Viewport info
    viewport: readonly(viewport),
    windowWidth: readonly(windowWidth),
    windowHeight: readonly(windowHeight),
    devicePixelRatio: readonly(devicePixelRatio),
    deviceInfo: readonly(deviceInfo),

    // Breakpoint checks
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    isXxl,

    // Size checks
    isMobile,
    isTablet,
    isDesktop,

    // Orientation
    isPortrait,
    isLandscape,

    // Device capabilities
    hasTouch,
    isHighDPI,
    isRetina,

    // Platform checks
    isIOS,
    isAndroid,
    isMacOS,
    isWindows,

    // Utilities
    getResponsiveValue,
    matchBreakpoint,
    getResponsiveClasses,
    createMediaQuery,
    updateDimensions,
  };
}