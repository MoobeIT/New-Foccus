<template>
  <div class="album-3d-viewer" ref="containerRef">
    <canvas ref="canvasRef"></canvas>
    
    <!-- Controls -->
    <div class="viewer-controls">
      <button class="control-btn" @click="toggleOpen" :title="isOpen ? 'Fechar álbum' : 'Abrir álbum'">
        {{ isOpen ? '📕' : '📖' }}
      </button>
      <button class="control-btn" @click="resetView" title="Resetar visualização">
        🔄
      </button>
    </div>
    
    <!-- Page Navigation -->
    <div v-if="isOpen" class="nav-controls">
      <button class="nav-btn" @click="prevSpread" :disabled="currentSpread <= 0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="page-info">
        <span class="page-label">{{ pageLabel }}</span>
        <span class="page-count">{{ currentSpread + 1 }} / {{ totalSpreads + 1 }}</span>
      </div>
      <button class="nav-btn" @click="nextSpread" :disabled="currentSpread >= totalSpreads">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>
    
    <!-- Info -->
    <div class="viewer-info">
      <span>🖱️ Arraste para rotacionar</span>
      <span>🔍 Scroll para zoom</span>
    </div>
    
    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Carregando visualização 3D...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

interface PageImage {
  src: string
  x: number
  y: number
  width: number
  height: number
}

interface Props {
  width?: number
  height?: number
  pageCount?: number
  spreads?: { left: PageImage[], right: PageImage[] }[]
  coverFront?: PageImage[]
  coverBack?: PageImage[]
}

const props = withDefaults(defineProps<Props>(), {
  width: 300,
  height: 300,
  pageCount: 20
})

const containerRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()
const loading = ref(true)
const currentSpread = ref(0)
const isOpen = ref(true)
const isAnimating = ref(false)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let bookGroup: THREE.Group
let coverGroup: THREE.Group
let pagesGroup: THREE.Group
let animationId: number

const totalSpreads = computed(() => Math.ceil(props.pageCount / 2))
const pageLabel = computed(() => {
  if (currentSpread.value === 0) return 'Capa'
  if (currentSpread.value === totalSpreads.value) return 'Contracapa'
  return `Páginas ${(currentSpread.value - 1) * 2 + 1}-${(currentSpread.value - 1) * 2 + 2}`
})

const SCALE = 0.003

const init = async () => {
  if (!containerRef.value || !canvasRef.value) return
  
  const container = containerRef.value
  const canvas = canvasRef.value
  const rect = container.getBoundingClientRect()

  // Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1918)

  // Camera
  camera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 100)
  camera.position.set(0, 1.5, 3)

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setSize(rect.width, rect.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  // Controls
  controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 1.5
  controls.maxDistance = 5
  controls.target.set(0, 0.3, 0)
  controls.maxPolarAngle = Math.PI / 1.8

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambient)

  const mainLight = new THREE.DirectionalLight(0xffffff, 1)
  mainLight.position.set(3, 5, 4)
  mainLight.castShadow = true
  mainLight.shadow.mapSize.width = 2048
  mainLight.shadow.mapSize.height = 2048
  scene.add(mainLight)

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
  fillLight.position.set(-3, 3, -2)
  scene.add(fillLight)

  // Ground/Table
  const groundGeo = new THREE.PlaneGeometry(8, 8)
  const groundMat = new THREE.MeshStandardMaterial({ 
    color: 0x2a2826,
    roughness: 0.8,
    metalness: 0.1
  })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.01
  ground.receiveShadow = true
  scene.add(ground)

  await createBook()
  loading.value = false
}

const createBook = async () => {
  bookGroup = new THREE.Group()
  coverGroup = new THREE.Group()
  pagesGroup = new THREE.Group()

  const w = props.width * SCALE
  const h = props.height * SCALE
  const pageThickness = 0.003
  const coverThickness = 0.008
  const spineWidth = 0.06 + (props.pageCount * 0.001)

  // Materials
  const coverMat = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    roughness: 0.6,
    metalness: 0.1
  })

  const pageMat = new THREE.MeshStandardMaterial({
    color: 0xFAF8F5,
    roughness: 0.9,
    metalness: 0
  })

  const spineMat = new THREE.MeshStandardMaterial({
    color: 0x654321,
    roughness: 0.7
  })

  // Front Cover
  const frontCoverGeo = new THREE.BoxGeometry(w, h, coverThickness)
  const frontCover = new THREE.Mesh(frontCoverGeo, coverMat.clone())
  frontCover.position.set(w/2 + spineWidth/2, h/2, 0)
  frontCover.castShadow = true
  frontCover.name = 'frontCover'
  coverGroup.add(frontCover)

  // Back Cover
  const backCoverGeo = new THREE.BoxGeometry(w, h, coverThickness)
  const backCover = new THREE.Mesh(backCoverGeo, coverMat.clone())
  backCover.position.set(-w/2 - spineWidth/2, h/2, 0)
  backCover.castShadow = true
  backCover.name = 'backCover'
  coverGroup.add(backCover)

  // Spine
  const spineGeo = new THREE.BoxGeometry(spineWidth, h, coverThickness * 2)
  const spine = new THREE.Mesh(spineGeo, spineMat)
  spine.position.set(0, h/2, -coverThickness)
  spine.castShadow = true
  coverGroup.add(spine)

  // Pages stack (when closed)
  const pagesStackGeo = new THREE.BoxGeometry(w - 0.01, h - 0.01, spineWidth - 0.02)
  const pagesStack = new THREE.Mesh(pagesStackGeo, pageMat)
  pagesStack.position.set(0, h/2, 0)
  pagesStack.name = 'pagesStack'
  pagesGroup.add(pagesStack)

  // Left page (visible when open)
  const leftPageGeo = new THREE.BoxGeometry(w, h, pageThickness)
  const leftPage = new THREE.Mesh(leftPageGeo, pageMat.clone())
  leftPage.position.set(-w/2 - 0.002, h/2, pageThickness)
  leftPage.castShadow = true
  leftPage.name = 'leftPage'
  leftPage.visible = isOpen.value
  pagesGroup.add(leftPage)

  // Right page (visible when open)
  const rightPageGeo = new THREE.BoxGeometry(w, h, pageThickness)
  const rightPage = new THREE.Mesh(rightPageGeo, pageMat.clone())
  rightPage.position.set(w/2 + 0.002, h/2, pageThickness)
  rightPage.castShadow = true
  rightPage.name = 'rightPage'
  rightPage.visible = isOpen.value
  pagesGroup.add(rightPage)

  bookGroup.add(coverGroup)
  bookGroup.add(pagesGroup)
  bookGroup.rotation.x = -0.15
  scene.add(bookGroup)

  await updateBookState()
  await renderCurrentSpread()
}

const updateBookState = () => {
  if (!coverGroup || !pagesGroup) return

  const w = props.width * SCALE
  const frontCover = coverGroup.getObjectByName('frontCover') as THREE.Mesh
  const backCover = coverGroup.getObjectByName('backCover') as THREE.Mesh
  const pagesStack = pagesGroup.getObjectByName('pagesStack') as THREE.Mesh
  const leftPage = pagesGroup.getObjectByName('leftPage') as THREE.Mesh
  const rightPage = pagesGroup.getObjectByName('rightPage') as THREE.Mesh

  if (isOpen.value) {
    // Open state - covers spread out
    frontCover.position.x = w/2 + 0.002
    frontCover.rotation.y = 0
    backCover.position.x = -w/2 - 0.002
    backCover.rotation.y = 0
    pagesStack.visible = false
    leftPage.visible = true
    rightPage.visible = true
  } else {
    // Closed state - covers together
    const spineWidth = 0.06 + (props.pageCount * 0.001)
    frontCover.position.x = w/2 + spineWidth/2
    frontCover.rotation.y = 0
    backCover.position.x = -w/2 - spineWidth/2
    backCover.rotation.y = 0
    pagesStack.visible = true
    leftPage.visible = false
    rightPage.visible = false
  }
}

const toggleOpen = () => {
  if (isAnimating.value) return
  isOpen.value = !isOpen.value
  animateOpenClose()
}

const animateOpenClose = () => {
  isAnimating.value = true
  const duration = 500
  const start = Date.now()
  const w = props.width * SCALE
  const spineWidth = 0.06 + (props.pageCount * 0.001)

  const frontCover = coverGroup.getObjectByName('frontCover') as THREE.Mesh
  const backCover = coverGroup.getObjectByName('backCover') as THREE.Mesh
  const pagesStack = pagesGroup.getObjectByName('pagesStack') as THREE.Mesh
  const leftPage = pagesGroup.getObjectByName('leftPage') as THREE.Mesh
  const rightPage = pagesGroup.getObjectByName('rightPage') as THREE.Mesh

  const startFrontX = frontCover.position.x
  const startBackX = backCover.position.x
  const targetFrontX = isOpen.value ? w/2 + 0.002 : w/2 + spineWidth/2
  const targetBackX = isOpen.value ? -w/2 - 0.002 : -w/2 - spineWidth/2

  const animateStep = () => {
    const elapsed = Date.now() - start
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)

    frontCover.position.x = startFrontX + (targetFrontX - startFrontX) * eased
    backCover.position.x = startBackX + (targetBackX - startBackX) * eased

    if (progress >= 0.5) {
      pagesStack.visible = !isOpen.value
      leftPage.visible = isOpen.value
      rightPage.visible = isOpen.value
    }

    if (progress < 1) {
      requestAnimationFrame(animateStep)
    } else {
      isAnimating.value = false
      if (isOpen.value) renderCurrentSpread()
    }
  }

  animateStep()
}

const renderCurrentSpread = async () => {
  if (!pagesGroup || !isOpen.value) return

  const w = props.width * SCALE
  const h = props.height * SCALE
  const leftPage = pagesGroup.getObjectByName('leftPage') as THREE.Mesh
  const rightPage = pagesGroup.getObjectByName('rightPage') as THREE.Mesh

  // Clear old textures
  clearPageTextures(leftPage)
  clearPageTextures(rightPage)

  if (currentSpread.value === 0) {
    // Cover view - show back cover on left, front cover on right
    await renderPageImages(leftPage, props.coverBack || [], w, h)
    await renderPageImages(rightPage, props.coverFront || [], w, h)
  } else if (currentSpread.value === totalSpreads.value) {
    // Last spread - back cover
    const lastSpreadIdx = totalSpreads.value - 1
    const lastSpread = props.spreads?.[lastSpreadIdx]
    await renderPageImages(leftPage, lastSpread?.left || [], w, h)
    await renderPageImages(rightPage, props.coverBack || [], w, h)
  } else {
    // Inner spread
    const spreadIndex = currentSpread.value - 1
    const spread = props.spreads?.[spreadIndex]
    if (spread) {
      await renderPageImages(leftPage, spread.left || [], w, h)
      await renderPageImages(rightPage, spread.right || [], w, h)
    }
  }
}

const clearPageTextures = (pageMesh: THREE.Mesh) => {
  if (!pageMesh) return
  const toRemove: THREE.Object3D[] = []
  pageMesh.children.forEach(child => toRemove.push(child))
  toRemove.forEach(child => {
    if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose()
    if ((child as THREE.Mesh).material) {
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
      if (mat.map) mat.map.dispose()
      mat.dispose()
    }
    pageMesh.remove(child)
  })
}

const renderPageImages = async (
  pageMesh: THREE.Mesh,
  images: PageImage[],
  pageW: number,
  pageH: number
) => {
  if (!pageMesh || !images.length) return

  const loader = new THREE.TextureLoader()

  for (const img of images) {
    if (!img.src) continue

    try {
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(img.src, resolve, undefined, reject)
      })

      texture.colorSpace = THREE.SRGBColorSpace

      // Calculate position and size relative to page
      const imgW = (img.width / props.width) * pageW
      const imgH = (img.height / props.height) * pageH
      const imgX = ((img.x + img.width/2) / props.width - 0.5) * pageW
      const imgY = (0.5 - (img.y + img.height/2) / props.height) * pageH

      const imgGeo = new THREE.PlaneGeometry(imgW, imgH)
      const imgMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.4,
        metalness: 0
      })

      const imgMesh = new THREE.Mesh(imgGeo, imgMat)
      imgMesh.position.set(imgX, imgY, 0.004)
      pageMesh.add(imgMesh)
    } catch (e) {
      console.warn('Failed to load image:', img.src)
    }
  }
}

const prevSpread = () => {
  if (currentSpread.value > 0 && !isAnimating.value) {
    animatePageTurn('prev')
  }
}

const nextSpread = () => {
  if (currentSpread.value < totalSpreads.value && !isAnimating.value) {
    animatePageTurn('next')
  }
}

const animatePageTurn = (direction: 'prev' | 'next') => {
  isAnimating.value = true
  
  // Simple transition for now
  setTimeout(() => {
    if (direction === 'next') {
      currentSpread.value++
    } else {
      currentSpread.value--
    }
    renderCurrentSpread()
    isAnimating.value = false
  }, 200)
}

const resetView = () => {
  if (controls) {
    controls.reset()
    camera.position.set(0, 1.5, 3)
    controls.target.set(0, 0.3, 0)
  }
}

const animate = () => {
  animationId = requestAnimationFrame(animate)
  if (controls) controls.update()
  if (renderer && scene && camera) renderer.render(scene, camera)
}

const handleResize = () => {
  if (!containerRef.value || !camera || !renderer) return
  const rect = containerRef.value.getBoundingClientRect()
  camera.aspect = rect.width / rect.height
  camera.updateProjectionMatrix()
  renderer.setSize(rect.width, rect.height)
}

onMounted(async () => {
  await nextTick()
  await init()
  animate()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) renderer.dispose()
})

watch(() => [props.spreads, props.coverFront, props.coverBack], () => {
  if (bookGroup && isOpen.value) renderCurrentSpread()
}, { deep: true })

watch(currentSpread, () => {
  if (isOpen.value) renderCurrentSpread()
})
</script>

<style scoped>
.album-3d-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 500px;
  background: linear-gradient(180deg, #1a1918 0%, #0f0e0d 100%);
  border-radius: 12px;
  overflow: hidden;
}

.album-3d-viewer canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
  cursor: grab;
}

.album-3d-viewer canvas:active {
  cursor: grabbing;
}

.viewer-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
}

.control-btn {
  width: 44px;
  height: 44px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(8px);
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.nav-controls {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(0, 0, 0, 0.8);
  padding: 12px 20px;
  border-radius: 40px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
}

.nav-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover:not(:disabled) {
  background: #D4775C;
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 140px;
}

.page-label {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.page-count {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.viewer-info {
  position: absolute;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1a1918;
  gap: 16px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #D4775C;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading p {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .viewer-info { display: none; }
  .nav-controls { padding: 10px 16px; gap: 12px; }
  .page-info { min-width: 100px; }
  .page-label { font-size: 12px; }
}
</style>
