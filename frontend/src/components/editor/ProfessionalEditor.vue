<template>
  <div class="professional-editor">
    <!-- Top Toolbar -->
    <div class="top-toolbar">
      <div class="toolbar-section">
        <button class="btn-icon" @click="goBack" title="Voltar">
          <span>←</span>
        </button>
        <div class="project-info">
          <h1>{{ projectName }}</h1>
          <span class="product-type">{{ productType }}</span>
        </div>
      </div>

      <div class="toolbar-section center">
        <button class="btn-tool" :class="{ active: tool === 'select' }" @click="tool = 'select'">
          <span>⬚</span> Selecionar
        </button>
        <button class="btn-tool" :class="{ active: tool === 'text' }" @click="tool = 'text'">
          <span>T</span> Texto
        </button>
        <button class="btn-tool" :class="{ active: tool === 'image' }" @click="tool = 'image'">
          <span>🖼️</span> Imagem
        </button>
        <button class="btn-tool" :class="{ active: tool === 'shape' }" @click="tool = 'shape'">
          <span>◯</span> Forma
        </button>
      </div>

      <div class="toolbar-section">
        <div class="price-display">
          <span class="price-label">Preço:</span>
          <strong class="price-value">R$ {{ calculatedPrice.toFixed(2) }}</strong>
        </div>
        <button class="btn-secondary" @click="saveProject">💾 Salvar</button>
        <button class="btn-primary" @click="checkout">🛒 Finalizar</button>
      </div>
    </div>

    <!-- Main Layout -->
    <div class="editor-layout">
      <!-- Left Sidebar - Pages & Layouts -->
      <div class="left-sidebar">
        <div class="sidebar-tabs">
          <button :class="{ active: leftTab === 'pages' }" @click="leftTab = 'pages'">
            📄 Páginas
          </button>
          <button :class="{ active: leftTab === 'layouts' }" @click="leftTab = 'layouts'">
            🎨 Layouts
          </button>
        </div>

        <!-- Pages Panel -->
        <div v-if="leftTab === 'pages'" class="pages-panel">
          <div class="panel-header">
            <h3>Páginas ({{ pages.length }})</h3>
            <button class="btn-add" @click="addPage">+</button>
          </div>
          
          <div class="pages-grid">
            <div
              v-for="(page, index) in pages"
              :key="page.id"
              :class="['page-thumbnail', { active: currentPageIndex === index }]"
              @click="goToPage(index)"
            >
              <div class="page-number">{{ index + 1 }}</div>
              <div class="page-preview">
                <canvas :ref="el => pageThumbnails[index] = el" width="100" height="140"></canvas>
              </div>
              <button class="btn-delete" @click.stop="deletePage(index)">×</button>
            </div>
          </div>
        </div>

        <!-- Layouts Panel -->
        <div v-if="leftTab === 'layouts'" class="layouts-panel">
          <div class="panel-header">
            <h3>Layouts Disponíveis</h3>
          </div>
          
          <div class="layouts-grid">
            <div
              v-for="layout in availableLayouts"
              :key="layout.id"
              class="layout-card"
              @click="applyLayout(layout)"
              draggable="true"
              @dragstart="startLayoutDrag($event, layout)"
            >
              <div class="layout-preview">
                <div class="layout-visual" v-html="layout.preview"></div>
              </div>
              <span class="layout-name">{{ layout.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Center - Canvas Area -->
      <div class="canvas-area">
        <!-- Rulers -->
        <div class="ruler ruler-horizontal">
          <div v-for="i in 50" :key="i" class="ruler-mark" :style="{ left: (i * 20) + 'px' }">
            <span v-if="i % 5 === 0">{{ i }}</span>
          </div>
        </div>
        <div class="ruler ruler-vertical">
          <div v-for="i in 50" :key="i" class="ruler-mark" :style="{ top: (i * 20) + 'px' }">
            <span v-if="i % 5 === 0">{{ i }}</span>
          </div>
        </div>

        <!-- Canvas Container with Zoom -->
        <div class="canvas-wrapper" @wheel="handleZoom">
          <div class="canvas-container" :style="{ transform: `scale(${zoom})` }">
            <!-- Spread View (2 pages side by side) -->
            <div class="spread-view" v-if="viewMode === 'spread'">
              <!-- Left Page -->
              <div class="page-canvas left-page" :style="pageStyle">
                <div class="page-margins" :style="marginStyle">
                  <div class="margin-guide top"></div>
                  <div class="margin-guide right"></div>
                  <div class="margin-guide bottom"></div>
                  <div class="margin-guide left"></div>
                </div>
                
                <div
                  v-for="element in currentPage.elements"
                  :key="element.id"
                  :class="['canvas-element', element.type, { 
                    selected: selectedElement?.id === element.id,
                    'out-of-bounds': isOutOfBounds(element)
                  }]"
                  :style="getElementStyle(element)"
                  @mousedown="startDrag($event, element)"
                  @click.stop="selectElement(element)"
                >
                  <component :is="getElementComponent(element.type)" :element="element" />
                  
                  <!-- Resize Handles -->
                  <div v-if="selectedElement?.id === element.id" class="resize-handles">
                    <div class="handle nw" @mousedown.stop="startResize($event, element, 'nw')"></div>
                    <div class="handle ne" @mousedown.stop="startResize($event, element, 'ne')"></div>
                    <div class="handle sw" @mousedown.stop="startResize($event, element, 'sw')"></div>
                    <div class="handle se" @mousedown.stop="startResize($event, element, 'se')"></div>
                  </div>
                </div>
              </div>

              <!-- Spine (Lombada) -->
      