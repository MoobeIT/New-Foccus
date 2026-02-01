<template>
  <div class="editor">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <router-link to="/" class="logo">
          <div class="logo-icon">F</div>
          <span>Foccus</span>
        </router-link>
        <div class="separator"></div>
        <div class="project-info">
          <input v-model="projectName" class="project-input" />
          <span class="project-meta">{{ productInfo }} • {{ pages.length - 2 }} páginas ({{ (pages.length - 2) / 2 }} lâminas)</span>
        </div>
        <!-- Dimensões do Produto -->
        <div class="product-dimensions" v-if="productConfig">
          <span class="dim-item" title="Tamanho da página">📐 {{ formatDimension(productConfig.width) }} × {{ formatDimension(productConfig.height) }}cm</span>
          <span class="dim-item" title="Lombada calculada automaticamente">📏 {{ calculatedSpineWidth }}mm</span>
        </div>
      </div>
      <div class="header-center">
        <button class="nav-btn" @click="prevPage" :disabled="currentPage === 0">‹</button>
        <span class="page-info">
          <template v-if="isCoverView">Capa</template>
          <template v-else>{{ currentSpreadIndex * 2 + 1 }}-{{ currentSpreadIndex * 2 + 2 }} de {{ pages.length - 2 }}</template>
        </span>
        <button class="nav-btn" @click="nextPage" :disabled="currentPage >= totalSpreads">›</button>
      </div>
      <div class="header-right">
        <!-- Status de conexão com backend -->
        <div v-if="isConnectedToBackend" class="backend-status connected" title="Conectado ao servidor">
          <span class="status-dot"></span>
          <span v-if="isSavingToBackend" class="status-text">Salvando...</span>
          <span v-else-if="lastBackendSave" class="status-text">Salvo</span>
        </div>
        <div v-else class="backend-status local" title="Modo local">
          <span class="status-dot"></span>
          <span class="status-text">Local</span>
        </div>
        
        <div class="undo-redo">
          <button class="btn-icon" @click="undo" :disabled="!canUndo" title="Desfazer (Ctrl+Z)">↩</button>
          <button class="btn-icon" @click="redo" :disabled="!canRedo" title="Refazer (Ctrl+Y)">↪</button>
        </div>
        <button class="btn-icon" @click="showShortcuts = true" title="Atalhos de teclado">⌨️</button>
        <button class="btn-projects" @click="goToProjects" title="Meus Projetos">
          <span>📁</span>
          Projetos
        </button>
        <button class="btn-save" @click="saveProject" :disabled="isSavingToBackend">
          <span v-if="isSavingToBackend">⏳</span>
          <span v-else>💾</span>
          Salvar
        </button>
        <button class="btn-buy" @click="finishProject">🛒 Comprar</button>
      </div>
    </header>

    <div class="editor-body">
      <!-- Sidebar - Páginas -->
      <aside class="sidebar-pages">
        <div class="sidebar-header">
          <span>PÁGINAS</span>
          <div class="sidebar-btns">
            <button 
              class="btn-add" 
              @click="removePages" 
              :disabled="(pages.length - 2) <= (productConfig?.minPages || 20)" 
              :title="`Remover 2 páginas (mín: ${productConfig?.minPages || 20})`"
            >−</button>
            <button 
              class="btn-add" 
              @click="addPages" 
              :disabled="(pages.length - 2) >= (productConfig?.maxPages || 80)"
              :title="`Adicionar 2 páginas (máx: ${productConfig?.maxPages || 80})`"
            >+</button>
          </div>
        </div>
        <div class="pages-list">
          <!-- Capa Aberta (Contracapa + Lombada + Capa) -->
          <div 
            :class="['cover-thumb', { active: currentPage === 0 }]"
            @click="goToPage(0)"
          >
            <div class="cover-spread-preview">
              <div class="cover-fold-preview left"></div>
              <div class="cover-back-preview">
                <div v-for="el in backCoverElements" :key="el.id" class="thumb-el" :style="getThumbElStyle(el)">
                  <img v-if="el.type === 'image' && el.src" :src="el.src" />
                </div>
                <div v-if="!backCoverElements.length" class="cover-label-small">C</div>
              </div>
              <div class="cover-spine-preview" :style="{ width: Math.max(4, calculatedSpineWidth / 4) + 'px' }"></div>
              <div class="cover-front-preview">
                <div v-for="el in frontCoverElements" :key="el.id" class="thumb-el" :style="getThumbElStyle(el)">
                  <img v-if="el.type === 'image' && el.src" :src="el.src" />
                </div>
                <div v-if="!frontCoverElements.length" class="cover-label-small">F</div>
              </div>
              <div class="cover-fold-preview right"></div>
            </div>
            <span class="cover-num">Capa • {{ calculatedSpineWidth }}mm</span>
          </div>
          
          <!-- Spreads do miolo -->
          <div 
            v-for="spreadIdx in totalSpreads" 
            :key="spreadIdx"
            :class="['spread-thumb', { active: currentPage === spreadIdx }]"
            @click="goToPage(spreadIdx)"
          >
            <div class="spread-preview">
              <div class="spread-page left">
                <div v-for="el in pages[3 + (spreadIdx - 1) * 2]?.elements || []" :key="el.id" class="thumb-el" :style="getThumbElStyle(el)">
                  <img v-if="el.type === 'image' && el.src" :src="el.src" />
                </div>
              </div>
              <div class="spread-page right">
                <div v-for="el in pages[3 + (spreadIdx - 1) * 2 + 1]?.elements || []" :key="el.id" class="thumb-el" :style="getThumbElStyle(el)">
                  <img v-if="el.type === 'image' && el.src" :src="el.src" />
                </div>
              </div>
            </div>
            <span class="spread-num">{{ (spreadIdx - 1) * 2 + 1 }} - {{ (spreadIdx - 1) * 2 + 2 }}</span>
          </div>
        </div>
      </aside>

      <!-- Canvas -->
      <main class="canvas-container">
        <div class="canvas-toolbar">
          <button @click="zoomOut" class="zoom-btn">−</button>
          <span class="zoom-val">{{ Math.round(zoom * 100) }}%</span>
          <button @click="zoomIn" class="zoom-btn">+</button>
          <div class="toolbar-separator"></div>
          <button :class="['toolbar-btn', { active: showGrid }]" @click="showGrid = !showGrid" title="Mostrar grade">⊞</button>
          <button :class="['toolbar-btn', { active: showRulers }]" @click="showRulers = !showRulers" title="Mostrar réguas">📏</button>
          <button :class="['toolbar-btn', { active: snapToGrid }]" @click="snapToGrid = !snapToGrid" title="Snap to grid">🧲</button>
          <div class="toolbar-separator"></div>
          <button class="toolbar-btn" @click="clearCurrentPage" title="Limpar página">🗑️</button>
          <button class="toolbar-btn" @click="duplicateCurrentSpread" :disabled="isCoverView" title="Duplicar spread">📄</button>
          <button class="toolbar-btn" @click="showBackgroundPanel = true" title="Fundo da página">🎨</button>
          <button class="toolbar-btn" @click="showLayersPanel = !showLayersPanel" title="Camadas">📚</button>
          <div class="toolbar-separator"></div>
          <button class="toolbar-btn" @click="exportPDF" title="Exportar PDF">📥 PDF</button>
          <button class="toolbar-btn" @click="showPresentationMode = true" title="Apresentação">▶️</button>
          <button class="toolbar-btn btn-3d" @click="show3DPreview = true" title="Visualizar Álbum">
            <span class="icon-3d-anim">📖</span>
            <span>Preview</span>
          </button>
        </div>
        
        <div class="canvas-scroll" :class="{ 'with-rulers': showRulers }" @click.self="clearSelection" @wheel="handleWheel">
          <!-- Réguas -->
          <div v-if="showRulers" class="rulers-container">
            <div class="ruler-corner"></div>
            <div class="ruler ruler-horizontal">
              <div v-for="i in 20" :key="'h'+i" class="ruler-mark" :style="{ left: ((i - 1) * 50 * zoom) + 'px' }">
                <span>{{ (i - 1) * 50 }}</span>
              </div>
            </div>
            <div class="ruler ruler-vertical">
              <div v-for="i in 8" :key="'v'+i" class="ruler-mark" :style="{ top: ((i - 1) * 50 * zoom) + 'px' }">
                <span>{{ (i - 1) * 50 }}</span>
              </div>
            </div>
          </div>
          
          <div class="canvas-wrapper" :style="{ transform: `scale(${zoom})`, marginLeft: showRulers ? '30px' : '0', marginTop: showRulers ? '25px' : '0' }" @click.self="clearSelection">
            <!-- Guias Inteligentes -->
            <template v-if="smartGuides.length">
              <div 
                v-for="(guide, idx) in smartGuides" 
                :key="'guide-'+idx"
                :class="['smart-guide', guide.type === 'h' ? 'horizontal' : 'vertical']"
                :style="guide.type === 'h' ? { top: guide.pos + 'px' } : { left: guide.pos + 'px' }"
              ></div>
            </template>
            
            <!-- Vista da Capa Aberta (Contracapa + Lombada + Capa) -->
            <div v-if="isCoverView" class="cover-layout">
              <!-- Botão de Help -->
              <button class="help-toggle" :class="{ active: showCoverHelp }" @click="showCoverHelp = !showCoverHelp" title="Mostrar/ocultar guias">
                <span>❓</span>
                <span v-if="showCoverHelp">Ocultar Guias</span>
                <span v-else>Mostrar Guias</span>
              </button>
              
              <!-- Cotas Superiores (só mostra com help ativo) -->
              <div v-if="showCoverHelp" class="dimension-row top">
                <div class="dimension-line fold" :style="{ width: bleedSize + 'px' }">
                  <span class="dimension-value small">Sangria</span>
                </div>
                <div class="dimension-line" :style="{ width: pageWidth + 'px' }">
                  <span class="dimension-value">{{ formatDimension(productConfig?.width) }}cm</span>
                </div>
                <div class="dimension-line spine" :style="{ width: spineVisualWidth + 'px' }">
                  <span class="dimension-value">{{ calculatedSpineWidth }}mm</span>
                </div>
                <div class="dimension-line" :style="{ width: pageWidth + 'px' }">
                  <span class="dimension-value">{{ formatDimension(productConfig?.width) }}cm</span>
                </div>
                <div class="dimension-line fold" :style="{ width: bleedSize + 'px' }">
                  <span class="dimension-value small">Sangria</span>
                </div>
              </div>
              
              <div class="cover-main">
                <!-- Cota Lateral (só mostra com help ativo) -->
                <div v-if="showCoverHelp" class="dimension-col left">
                  <div class="dimension-line vertical" :style="{ height: pageHeight + 'px' }">
                    <span class="dimension-value">{{ formatDimension(productConfig?.height) }}cm</span>
                  </div>
                </div>
                
                <!-- Container da Capa Completa com Sangria -->
                <div class="cover-wrapper-outer">
                  <!-- Área de Sangria Superior -->
                  <div class="bleed-area bleed-top" :class="{ 'show-help': showCoverHelp }">
                    <span v-if="showCoverHelp" class="bleed-label">SANGRIA (área de corte)</span>
                  </div>
                  
                  <div class="cover-wrapper-middle">
                    <!-- Imagem Panorâmica de Fundo (quando fullCover ativo) -->
                    <div 
                      v-if="fullCoverImage" 
                      class="fullcover-background"
                      :style="{ backgroundImage: `url(${fullCoverImage})` }"
                    ></div>
                    
                    <!-- Área de Sangria Esquerda -->
                    <div class="bleed-area bleed-left" :class="{ 'show-help': showCoverHelp }">
                      <span v-if="showCoverHelp" class="bleed-label vertical">SANGRIA</span>
                    </div>
                    
                    <!-- Contracapa (verso) -->
                    <div 
                      class="page cover-back"
                      :class="{ dropping: dropSide === 'back', 'page-active': activeSide === 'left', 'has-fullcover': fullCoverImage }"
                      :style="getCoverPageStyle('cover-back')"
                      @click.self="activeSide = 'left'"
                      @dragover.prevent="onDragOver('back', $event)"
                      @dragleave="onDragLeave"
                      @drop.prevent="onDropCover($event, 'back')"
                    >
                      <div v-if="showGrid" class="page-grid"></div>
                      <!-- Label do canto -->
                      <div v-if="showCoverHelp" class="cover-label-corner">CONTRACAPA</div>
                      <!-- Área segura (margem interna) -->
                      <div v-if="showCoverHelp" class="safe-margin-indicator">
                        <span class="safe-label">Área Segura</span>
                      </div>
                      <!-- Elementos -->
                      <template v-for="el in backCoverElements" :key="el.id">
                        <div 
                          :class="['element', { selected: selected?.id === el.id, placeholder: el.type === 'image' && !el.src, locked: el.locked, 'fullcover-hidden': el.isFullCover && el.src && fullCoverImage }]"
                          :style="getElementStyle(el)"
                          @mousedown.stop="handleElementMouseDown($event, el, 'back')"
                          @dragover.prevent.stop="onElementDragOver($event, el, 'back')"
                          @dragleave.stop="onElementDragLeave"
                          @drop.prevent.stop="onElementDrop($event, el, 'back')"
                        >
                          <img v-if="el.type === 'image' && el.src" :src="el.src" :style="getImageStyle(el)" />
                          <div v-if="el.type === 'image' && !el.src" class="placeholder-content">
                            <span>📷</span>
                            <p>Arraste foto</p>
                          </div>
                          <div v-if="el.type === 'text'" class="text-content" :style="getTextStyle(el)" @dblclick="editText(el)">
                            <span v-if="editingId !== el.id">{{ el.content }}</span>
                            <textarea v-else v-model="el.content" @blur="stopEdit" autofocus></textarea>
                          </div>
                          <div v-if="el.type === 'sticker'" class="sticker-content">{{ el.content }}</div>
                          <div v-if="selected?.id === el.id && !el.locked" class="resize-handle" @mousedown.stop="startResize($event, el)"></div>
                          <div v-if="selected?.id === el.id && !el.locked" class="rotate-handle" @mousedown.stop="startRotate($event, el)">↻</div>
                        </div>
                      </template>
                      <!-- Placeholder vazio -->
                      <div v-if="!backCoverElements.length" class="page-empty">
                        <span>📷</span>
                        <p>Contracapa</p>
                      </div>
                      <!-- Drop zone -->
                      <div v-if="dropSide === 'back' && !dragOverElement" class="drop-zone">
                        <div class="drop-icon">+</div>
                      </div>
                    </div>

                    <!-- Lombada -->
                    <div 
                      class="cover-spine" 
                      :class="{ dropping: dropSide === 'spine', 'page-active': activeSide === 'spine', 'show-help': showCoverHelp, 'has-fullcover': spineHasFullCover }"
                      :style="getSpineStyle()"
                      @click.self="activeSide = 'spine'"
                      @dragover.prevent="onDragOver('spine', $event)"
                      @dragleave="onDragLeave"
                      @drop.prevent="onDropSpine($event)"
                    >
                      <!-- Sulcos laterais (esconder quando tem fullcover) -->
                      <div v-if="!spineHasFullCover" class="spine-groove left"></div>
                      <div v-if="!spineHasFullCover" class="spine-groove right"></div>
                      <!-- Conteúdo da lombada -->
                      <div class="spine-content" :class="{ 'fullcover-content': spineHasFullCover }">
                        <template v-for="el in spineElements" :key="el.id">
                          <div 
                            v-if="!(el.isFullCover && el.src && fullCoverImage)"
                            :class="['element spine-element', { selected: selected?.id === el.id, locked: el.locked, 'fullcover-element': el.isFullCover }]"
                            :style="getSpineElementStyle(el)"
                            @mousedown.stop="handleElementMouseDown($event, el, 'spine')"
                            @dragover.prevent.stop="onElementDragOver($event, el, 'spine')"
                            @dragleave.stop="onElementDragLeave"
                            @drop.prevent.stop="onElementDrop($event, el, 'spine')"
                          >
                            <img v-if="el.type === 'image' && el.src" :src="el.src" :style="getImageStyle(el)" />
                            <div v-if="el.type === 'image' && !el.src && el.isFullCover" class="placeholder-content fullcover-placeholder">
                              <span>📷</span>
                            </div>
                            <div v-if="el.type === 'text'" class="text-content spine-text-el" :style="getSpineTextStyle(el)" @dblclick="editText(el)">
                              <span v-if="editingId !== el.id">{{ el.content }}</span>
                              <textarea v-else v-model="el.content" @blur="stopEdit" autofocus class="spine-textarea"></textarea>
                            </div>
                            <div v-if="selected?.id === el.id && !el.locked" class="resize-handle small" @mousedown.stop="startResize($event, el)"></div>
                          </div>
                        </template>
                      </div>
                      <!-- Label da lombada (só com help e sem fullcover) -->
                      <div v-if="showCoverHelp && !spineHasFullCover" class="spine-label">LOMBADA</div>
                      <div v-if="showCoverHelp && !spineHasFullCover" class="spine-size-label">{{ calculatedSpineWidth }}mm</div>
                      <!-- Drop zone -->
                      <div v-if="dropSide === 'spine'" class="spine-drop-zone">
                        <span>+</span>
                      </div>
                    </div>

                    <!-- Capa (frente) -->
                    <div 
                      class="page cover-front"
                      :class="{ dropping: dropSide === 'front', 'page-active': activeSide === 'right', 'has-fullcover': fullCoverImage }"
                      :style="getCoverPageStyle('cover-front')"
                      @click.self="activeSide = 'right'"
                      @dragover.prevent="onDragOver('front', $event)"
                      @dragleave="onDragLeave"
                      @drop.prevent="onDropCover($event, 'front')"
                    >
                      <div v-if="showGrid" class="page-grid"></div>
                      <!-- Label do canto -->
                      <div v-if="showCoverHelp" class="cover-label-corner">CAPA</div>
                      <!-- Área segura -->
                      <div v-if="showCoverHelp" class="safe-margin-indicator">
                        <span class="safe-label">Área Segura</span>
                      </div>
                      <!-- Elementos -->
                      <template v-for="el in frontCoverElements" :key="el.id">
                        <div 
                          :class="['element', { selected: selected?.id === el.id, placeholder: el.type === 'image' && !el.src, locked: el.locked, 'fullcover-hidden': el.isFullCover && el.src && fullCoverImage }]"
                          :style="getElementStyle(el)"
                          @mousedown.stop="handleElementMouseDown($event, el, 'front')"
                          @dragover.prevent.stop="onElementDragOver($event, el, 'front')"
                          @dragleave.stop="onElementDragLeave"
                          @drop.prevent.stop="onElementDrop($event, el, 'front')"
                        >
                          <img v-if="el.type === 'image' && el.src" :src="el.src" :style="getImageStyle(el)" />
                          <div v-if="el.type === 'image' && !el.src" class="placeholder-content">
                            <span>📷</span>
                            <p>Arraste foto</p>
                          </div>
                          <div v-if="el.type === 'text'" class="text-content" :style="getTextStyle(el)" @dblclick="editText(el)">
                            <span v-if="editingId !== el.id">{{ el.content }}</span>
                            <textarea v-else v-model="el.content" @blur="stopEdit" autofocus></textarea>
                          </div>
                          <div v-if="el.type === 'sticker'" class="sticker-content">{{ el.content }}</div>
                          <div v-if="selected?.id === el.id && !el.locked" class="resize-handle" @mousedown.stop="startResize($event, el)"></div>
                          <div v-if="selected?.id === el.id && !el.locked" class="rotate-handle" @mousedown.stop="startRotate($event, el)">↻</div>
                        </div>
                      </template>
                      <!-- Placeholder vazio -->
                      <div v-if="!frontCoverElements.length" class="page-empty">
                        <span>📷</span>
                        <p>Capa</p>
                      </div>
                      <!-- Drop zone -->
                      <div v-if="dropSide === 'front' && !dragOverElement" class="drop-zone">
                        <div class="drop-icon">+</div>
                      </div>
                    </div>
                    
                    <!-- Área de Sangria Direita -->
                    <div class="bleed-area bleed-right" :class="{ 'show-help': showCoverHelp }">
                      <span v-if="showCoverHelp" class="bleed-label vertical">SANGRIA</span>
                    </div>
                  </div>
                  
                  <!-- Área de Sangria Inferior -->
                  <div class="bleed-area bleed-bottom" :class="{ 'show-help': showCoverHelp }">
                    <span v-if="showCoverHelp" class="bleed-label">SANGRIA (área de corte)</span>
                  </div>
                </div><!-- /cover-wrapper-outer -->
              </div><!-- /cover-main -->
              
              <!-- Legenda de Help -->
              <div v-if="showCoverHelp" class="cover-help-legend">
                <div class="legend-item">
                  <span class="legend-color safe"></span>
                  <span>Área Segura - textos e elementos importantes</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color bleed"></span>
                  <span>Sangria - imagens podem estender até aqui (será cortado)</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color spine"></span>
                  <span>Lombada - {{ calculatedSpineWidth }}mm ({{ (pages.filter(p => p.type === 'page').length) }} páginas)</span>
                </div>
              </div>
            </div><!-- /cover-layout -->

            <!-- Vista do Spread (Miolo) -->
            <div v-else class="spread-layout">
              <!-- Botão de Help -->
              <button class="help-toggle" :class="{ active: showCoverHelp }" @click="showCoverHelp = !showCoverHelp" title="Mostrar/ocultar guias">
                <span>❓</span>
                <span v-if="showCoverHelp">Ocultar Guias</span>
                <span v-else>Mostrar Guias</span>
              </button>
              
              <!-- Cotas Superiores (só mostra com help ativo) -->
              <div v-if="showCoverHelp" class="dimension-row top">
                <div class="dimension-line fold" :style="{ width: bleedSize + 'px' }">
                  <span class="dimension-value small">Sangria</span>
                </div>
                <div class="dimension-line" :style="{ width: pageWidth + 'px' }">
                  <span class="dimension-value">{{ formatDimension(productConfig?.width) }}cm</span>
                </div>
                <div class="dimension-line" :style="{ width: pageWidth + 'px' }">
                  <span class="dimension-value">{{ formatDimension(productConfig?.width) }}cm</span>
                </div>
                <div class="dimension-line fold" :style="{ width: bleedSize + 'px' }">
                  <span class="dimension-value small">Sangria</span>
                </div>
              </div>
              
              <div class="spread-main">
                <!-- Cota Lateral (só mostra com help ativo) -->
                <div v-if="showCoverHelp" class="dimension-col left">
                  <div class="dimension-line vertical" :style="{ height: pageHeight + 'px' }">
                    <span class="dimension-value">{{ formatDimension(productConfig?.height) }}cm</span>
                  </div>
                </div>
                
                <!-- Container do Spread com Sangria -->
                <div class="spread-wrapper-outer">
                  <!-- Área de Sangria Superior -->
                  <div class="bleed-area bleed-top" :class="{ 'show-help': showCoverHelp }">
                    <span v-if="showCoverHelp" class="bleed-label">SANGRIA (área de corte)</span>
                  </div>
                  
                  <div class="spread-wrapper-middle">
                    <!-- Área de Sangria Esquerda -->
                    <div class="bleed-area bleed-left" :class="{ 'show-help': showCoverHelp }">
                      <span v-if="showCoverHelp" class="bleed-label vertical">SANGRIA</span>
                    </div>
                    
                    <!-- Spread Layflat (páginas juntas) -->
                    <div class="spread-layflat">
                      <!-- Elementos do Spread (atravessam as duas páginas) -->
                      <template v-for="el in spreadElements" :key="el.id">
                        <div 
                          :class="['element spread-element', { selected: selected?.id === el.id, locked: el.locked }]"
                          :style="getSpreadElementStyle(el)"
                          @mousedown.stop="handleElementMouseDown($event, el, 'spread')"
                        >
                          <img v-if="el.type === 'image' && el.src" :src="el.src" :style="getImageStyle(el)" />
                          <div v-if="selected?.id === el.id && !el.locked" class="resize-handle" @mousedown.stop="startResize($event, el)"></div>
                          <div v-if="selected?.id === el.id && !el.locked" class="rotate-handle" @mousedown.stop="startRotate($event, el)">↻</div>
                        </div>
                      </template>
                      
                      <!-- Página Esquerda -->
                      <div 
                        class="page page-left layflat"
                        :class="{ dropping: dropSide === 'left', 'page-active': activeSide === 'left' }"
                        :style="getPageBackground(3 + currentSpreadIndex * 2)"
                        @click.self="activeSide = 'left'"
                        @dragover.prevent="onDragOver('left', $event)"
                        @dragleave="onDragLeave"
                        @drop.prevent="onDrop($event, 'left')"
                      >
                        <div v-if="showGrid" class="page-grid"></div>
                        <!-- Área segura (margem interna) -->
                        <div v-if="showCoverHelp" class="safe-margin-indicator page-safe">
                          <span class="safe-label">Área Segura</span>
                        </div>
                        <template v-for="el in leftPageElements" :key="el.id">
                          <div 
                            :class="['element', { selected: selected?.id === el.id, placeholder: el.type === 'image' && !el.src, locked: el.locked }]"
                            :style="getElementStyle(el)"
                            @mousedown.stop="handleElementMouseDown($event, el, 'left')"
                            @dragover.prevent.stop="onElementDragOver($event, el, 'left')"
                            @dragleave.stop="onElementDragLeave"
                            @drop.prevent.stop="onElementDrop($event, el, 'left')"
                          >
                            <img v-if="el.type === 'image' && el.src" :src="el.src" :style="getImageStyle(el)" />
                            <div v-if="el.type === 'image' && !el.src" class="placeholder-content">
                              <span>📷</span>
                              <p>Solte foto aqui</p>
                            </div>
                            <div v-if="el.type === 'text'" class="text-content" :style="getTextStyle(el)" @dblclick="editText(el)">
                              <span v-if="editingId !== el.id">{{ el.content }}</span>
                              <textarea v-else v-model="el.content" @blur="stopEdit" autofocus></textarea>
                            </div>
                            <div v-if="el.type === 'sticker'" class="sticker-content">{{ el.content }}</div>
                            <div v-if="selected?.id === el.id && !el.locked" class="resize-handle" @mousedown.stop="startResize($event, el)"></div>
                            <div v-if="selected?.id === el.id && !el.locked" class="rotate-handle" @mousedown.stop="startRotate($event, el)">↻</div>
                            <div v-if="dragOverElement === el.id" class="element-drop-zone"></div>
                          </div>
                        </template>
                        <div v-if="!leftPageElements.length" class="page-empty">
                          <span>📷</span>
                          <p>Arraste fotos aqui</p>
                        </div>
                        <div v-if="dropSide === 'left' && !dragOverElement" class="drop-zone">
                          <div class="drop-icon">+</div>
                        </div>
                      </div>
                      
                      <!-- Linha Central (divisão layflat) - Área de drop para fotos em página dupla -->
                      <div 
                        class="layflat-center" 
                        :class="{ 'show-help': showCoverHelp, 'dropping': dropSide === 'spread' }"
                        @dragover.prevent.stop="onDragOver('spread', $event)"
                        @dragleave.stop="onDragLeave"
                        @drop.prevent.stop="onDropSpread($event)"
                      >
                        <div class="layflat-line"></div>
                        <div v-if="dropSide === 'spread'" class="layflat-drop-hint">
                          <span>📷 Página Dupla</span>
                        </div>
                      </div>
                      
                      <!-- Página Direita -->
                      <div 
                        class="page page-right layflat"
                        :class="{ dropping: dropSide === 'right', 'page-active': activeSide === 'right' }"
                        :style="getPageBackground(3 + currentSpreadIndex * 2 + 1)"
                        @click.self="activeSide = 'right'"
                        @dragover.prevent="onDragOver('right', $event)"
                        @dragleave="onDragLeave"
                        @drop.prevent="onDrop($event, 'right')"
                      >
                        <div v-if="showGrid" class="page-grid"></div>
                        <!-- Área segura -->
                        <div v-if="showCoverHelp" class="safe-margin-indicator page-safe">
                          <span class="safe-label">Área Segura</span>
                        </div>
                        <template v-for="el in rightPageElements" :key="el.id">
                          <div 
                            :class="['element', { selected: selected?.id === el.id, placeholder: el.type === 'image' && !el.src, locked: el.locked }]"
                            :style="getElementStyle(el)"
                            @mousedown.stop="handleElementMouseDown($event, el, 'right')"
                            @dragover.prevent.stop="onElementDragOver($event, el, 'right')"
                            @dragleave.stop="onElementDragLeave"
                            @drop.prevent.stop="onElementDrop($event, el, 'right')"
                          >
                            <img v-if="el.type === 'image' && el.src" :src="el.src" :style="getImageStyle(el)" />
                            <div v-if="el.type === 'image' && !el.src" class="placeholder-content">
                              <span>📷</span>
                              <p>Solte foto aqui</p>
                            </div>
                            <div v-if="el.type === 'text'" class="text-content" :style="getTextStyle(el)" @dblclick="editText(el)">
                              <span v-if="editingId !== el.id">{{ el.content }}</span>
                              <textarea v-else v-model="el.content" @blur="stopEdit" autofocus></textarea>
                            </div>
                            <div v-if="el.type === 'sticker'" class="sticker-content">{{ el.content }}</div>
                            <div v-if="selected?.id === el.id && !el.locked" class="resize-handle" @mousedown.stop="startResize($event, el)"></div>
                            <div v-if="selected?.id === el.id && !el.locked" class="rotate-handle" @mousedown.stop="startRotate($event, el)">↻</div>
                            <div v-if="dragOverElement === el.id" class="element-drop-zone"></div>
                          </div>
                        </template>
                        <div v-if="!rightPageElements.length" class="page-empty">
                          <span>📷</span>
                          <p>Arraste fotos aqui</p>
                        </div>
                        <div v-if="dropSide === 'right' && !dragOverElement" class="drop-zone">
                          <div class="drop-icon">+</div>
                        </div>
                      </div>
                    </div><!-- /spread-layflat -->
                    
                    <!-- Área de Sangria Direita -->
                    <div class="bleed-area bleed-right" :class="{ 'show-help': showCoverHelp }">
                      <span v-if="showCoverHelp" class="bleed-label vertical">SANGRIA</span>
                    </div>
                  </div>
                  
                  <!-- Área de Sangria Inferior -->
                  <div class="bleed-area bleed-bottom" :class="{ 'show-help': showCoverHelp }">
                    <span v-if="showCoverHelp" class="bleed-label">SANGRIA (área de corte)</span>
                  </div>
                </div><!-- /spread-wrapper-outer -->
              </div><!-- /spread-main -->
              
              <!-- Legenda de Help -->
              <div v-if="showCoverHelp" class="cover-help-legend">
                <div class="legend-item">
                  <span class="legend-color safe"></span>
                  <span>Área Segura - textos e elementos importantes</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color bleed"></span>
                  <span>Sangria - imagens podem estender até aqui (será cortado)</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color center"></span>
                  <span>Centro do Spread - fotos podem atravessar (layflat)</span>
                </div>
              </div>
            </div><!-- /spread-layout -->
          </div><!-- /canvas-wrapper -->
        </div><!-- /canvas-scroll -->
        
        <!-- Painel de Camadas -->
        <div v-if="showLayersPanel" class="layers-panel">
          <div class="layers-header">
            <span>CAMADAS</span>
            <button @click="showLayersPanel = false">✕</button>
          </div>
          <div class="layers-list">
            <div 
              v-for="(el, idx) in currentPageElements" 
              :key="el.id"
              :class="['layer-item', { selected: selected?.id === el.id }]"
              @click="selectElementById(el.id)"
            >
              <span class="layer-icon">{{ el.type === 'image' ? '🖼️' : el.type === 'text' ? '✏️' : '⭐' }}</span>
              <span class="layer-name">{{ el.type === 'text' ? el.content?.substring(0, 15) : `${el.type} ${idx + 1}` }}</span>
              <button class="layer-btn" @click.stop="toggleElementLock(el)">{{ el.locked ? '🔒' : '🔓' }}</button>
              <button class="layer-btn" @click.stop="moveLayerUp(idx)" :disabled="idx === currentPageElements.length - 1">↑</button>
              <button class="layer-btn" @click.stop="moveLayerDown(idx)" :disabled="idx === 0">↓</button>
            </div>
            <div v-if="!currentPageElements.length" class="layers-empty">Nenhum elemento</div>
          </div>
        </div>
      </main>

      <!-- Painel Direito -->
      <aside class="panel-right">
        <div class="panel-tabs">
          <button :class="{ active: tab === 'fotos' }" @click="tab = 'fotos'" title="Fotos">
            <span class="tab-icon">📷</span>
            <span class="tab-label">Fotos</span>
          </button>
          <button :class="{ active: tab === 'layouts' }" @click="tab = 'layouts'" title="Layouts">
            <span class="tab-icon">📐</span>
            <span class="tab-label">Layouts</span>
          </button>
          <button :class="{ active: tab === 'texto' }" @click="tab = 'texto'" title="Texto">
            <span class="tab-icon">✏️</span>
            <span class="tab-label">Texto</span>
          </button>
          <button :class="{ active: tab === 'elementos' }" @click="tab = 'elementos'" title="Elementos">
            <span class="tab-icon">✨</span>
            <span class="tab-label">Elementos</span>
          </button>
          <button :class="{ active: tab === 'fundos' }" @click="tab = 'fundos'" title="Fundos">
            <span class="tab-icon">🎨</span>
            <span class="tab-label">Fundos</span>
          </button>
        </div>

        <!-- Fotos -->
        <div v-if="tab === 'fotos'" class="panel-content photos-panel">
          <!-- Header com contador -->
          <div class="panel-section-header">
            <h3>Minhas Fotos</h3>
            <span class="photo-count" v-if="photos.length">{{ photos.length }}</span>
          </div>
          
          <!-- Área de Upload Compacta -->
          <div 
            class="upload-zone" 
            :class="{ 'is-dragging': isDraggingFiles }"
            @click="$refs.fileInput.click()" 
            @dragover.prevent="isDraggingFiles = true"
            @dragleave="isDraggingFiles = false"
            @drop.prevent="handleUploadDrop($event)"
          >
            <input ref="fileInput" type="file" multiple accept="image/*" @change="handleUpload($event.target.files)" hidden />
            <div class="upload-zone-content">
              <span class="upload-icon-new">+</span>
              <span class="upload-text">Adicionar fotos</span>
            </div>
          </div>
          
          <!-- Ação Rápida: Montar Álbum -->
          <button 
            class="quick-action-btn" 
            @click="autoFillAlbum" 
            :disabled="photos.length === 0 || unusedPhotosCount === 0"
            v-if="photos.length > 0"
          >
            <span class="qa-icon">🪄</span>
            <span class="qa-text">Montar Álbum Automático</span>
            <span class="qa-badge" v-if="unusedPhotosCount > 0">{{ unusedPhotosCount }}</span>
          </button>
          
          <!-- Filtros (só mostra se tem fotos) -->
          <div v-if="photos.length > 0" class="photo-toolbar">
            <div class="filter-tabs">
              <button :class="{ active: photoFilter === 'all' }" @click="photoFilter = 'all'">
                Todas <span class="count">{{ photos.length }}</span>
              </button>
              <button :class="{ active: photoFilter === 'unused' }" @click="photoFilter = 'unused'">
                Disponíveis <span class="count">{{ unusedPhotosCount }}</span>
              </button>
              <button :class="{ active: photoFilter === 'favorites' }" @click="photoFilter = 'favorites'">
                ❤️ <span class="count">{{ photos.filter(p => p.favorite).length }}</span>
              </button>
            </div>
          </div>
          
          <!-- Grid de Fotos -->
          <div class="photos-grid-new" v-if="photos.length > 0">
            <div 
              v-for="photo in filteredPhotos" 
              :key="photo.id" 
              :class="['photo-card', { used: usedPhotoSrcs.has(photo.src), favorite: photo.favorite }]"
              draggable="true"
              @dragstart="onPhotoStart($event, photo)"
              @dragend="onPhotoEnd"
            >
              <img :src="photo.src" />
              <div class="photo-card-overlay">
                <button class="photo-btn fav" @click.stop="toggleFavorite(photo)">
                  {{ photo.favorite ? '❤️' : '🤍' }}
                </button>
                <button class="photo-btn del" @click.stop="deletePhoto(photo.id)">🗑️</button>
              </div>
              <div v-if="usedPhotoSrcs.has(photo.src)" class="used-indicator">✓</div>
            </div>
          </div>
          
          <!-- Estado Vazio -->
          <div v-else class="empty-state">
            <div class="empty-icon">📷</div>
            <p class="empty-title">Nenhuma foto</p>
            <p class="empty-desc">Arraste fotos aqui ou clique para adicionar</p>
          </div>
          
          <!-- Ferramentas Extras (colapsável) -->
          <details class="tools-section" v-if="photos.length > 0">
            <summary>🛠️ Mais ferramentas</summary>
            <div class="tools-grid">
              <button class="tool-btn" @click="autoSelectBestPhotos">
                <span>✨</span>
                <span>Selecionar melhores</span>
              </button>
              <button class="tool-btn" @click="autoOrganizePhotos">
                <span>📅</span>
                <span>Organizar por data</span>
              </button>
              <button class="tool-btn" @click="clearAllPhotos" v-if="photos.length > 0">
                <span>🗑️</span>
                <span>Limpar todas</span>
              </button>
            </div>
          </details>
        </div>

        <!-- Layouts -->
        <div v-if="tab === 'layouts'" class="panel-content">
          <!-- Seletor para Capa -->
          <div v-if="isCoverView" class="page-selector cover-selector">
            <button :class="{ active: coverLayoutMode === 'back' }" @click="coverLayoutMode = 'back'; activeSide = 'left'">Contracapa</button>
            <button :class="{ active: coverLayoutMode === 'front' }" @click="coverLayoutMode = 'front'; activeSide = 'right'">Capa</button>
            <button :class="{ active: coverLayoutMode === 'full' }" @click="coverLayoutMode = 'full'">Capa Inteira</button>
          </div>
          <!-- Seletor para Miolo -->
          <div v-else class="page-selector">
            <button :class="{ active: spreadLayoutMode === 'left' }" @click="spreadLayoutMode = 'left'; activeSide = 'left'">Pág. Esquerda</button>
            <button :class="{ active: spreadLayoutMode === 'right' }" @click="spreadLayoutMode = 'right'; activeSide = 'right'">Pág. Direita</button>
            <button :class="{ active: spreadLayoutMode === 'spread' }" @click="spreadLayoutMode = 'spread'">Página Dupla</button>
          </div>
          <p class="panel-hint">
            {{ getLayoutHint }} • Clique para aplicar
          </p>
          <!-- Opções de cor de fundo para lombada (removido - lombada sem cor) -->
          <div v-if="isCoverView && coverLayoutMode === 'full'">
            <div class="layouts-format-badge">
              Layouts de Capa Completa (Capa + Lombada + Contracapa)
            </div>
            <div class="layouts-grid">
              <div v-for="layout in fullCoverLayouts" :key="layout.id" class="layout-item layout-full" @click="applyFullCoverLayout(layout)">
                <div class="layout-preview-full">
                  <div class="preview-back"></div>
                  <div class="preview-spine"></div>
                  <div class="preview-front"></div>
                  <div v-for="(r, i) in layout.rects" :key="i" class="layout-rect" :style="rectToCSS(r)"></div>
                </div>
                <span>{{ layout.name }}</span>
              </div>
            </div>
          </div>
          <div v-else-if="!isCoverView && spreadLayoutMode === 'spread'">
            <div class="layouts-format-badge">
              Layouts de Página Dupla (Layflat)
            </div>
            <div class="layouts-grid">
              <div v-for="layout in spreadLayouts" :key="layout.id" class="layout-item layout-spread" @click="applySpreadLayout(layout)">
                <div class="layout-preview-spread">
                  <div class="preview-left"></div>
                  <div class="preview-right"></div>
                  <div v-for="(r, i) in layout.rects" :key="i" class="layout-rect" :style="rectToCSS(r)"></div>
                </div>
                <span>{{ layout.name }}</span>
              </div>
            </div>
          </div>
          <div v-else>
            <div class="layouts-format-badge">
              Formato: <strong>{{ albumFormat === 'landscape' ? 'Paisagem' : albumFormat === 'portrait' ? 'Retrato' : 'Quadrado' }}</strong>
              ({{ productConfig?.width || 300 }}×{{ productConfig?.height || 300 }}mm)
            </div>
            <div class="layouts-grid">
              <div v-for="layout in currentLayouts" :key="layout.id" class="layout-item" @click="applyLayout(layout)">
                <div class="layout-preview" :class="albumFormat">
                  <div v-for="(r, i) in layout.rects" :key="i" class="layout-rect" :style="rectToCSS(r)"></div>
                </div>
                <span>{{ layout.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Texto -->
        <div v-if="tab === 'texto'" class="panel-content">
          <!-- Seletor para Capa -->
          <div v-if="isCoverView" class="page-selector cover-selector">
            <button :class="{ active: activeSide === 'left' }" @click="activeSide = 'left'">Contracapa</button>
            <button :class="{ active: activeSide === 'spine' }" @click="activeSide = 'spine'">Lombada</button>
            <button :class="{ active: activeSide === 'right' }" @click="activeSide = 'right'">Capa</button>
          </div>
          <!-- Seletor para Miolo -->
          <div v-else class="page-selector">
            <button :class="{ active: activeSide === 'left' }" @click="activeSide = 'left'">Página Esquerda</button>
            <button :class="{ active: activeSide === 'right' }" @click="activeSide = 'right'">Página Direita</button>
          </div>
          <div v-if="activeSide === 'spine'" class="text-btns">
            <button @click="addSpineText"><strong>Texto Vertical</strong><small>Lombada</small></button>
          </div>
          <div v-else class="text-btns">
            <button @click="addText('title')"><strong>Título</strong><small>Grande</small></button>
            <button @click="addText('subtitle')"><span>Subtítulo</span><small>Médio</small></button>
            <button @click="addText('body')"><span>Texto</span><small>Normal</small></button>
          </div>
        </div>

        <!-- Elementos (antigo Stickers) -->
        <div v-if="tab === 'elementos'" class="panel-content">
          <p class="panel-hint">Clique para adicionar à página</p>
          
          <!-- Formas -->
          <div class="elements-section">
            <span class="section-title">Formas</span>
            <div class="shapes-grid">
              <button class="shape-btn" @click="addShape('rectangle')" title="Retângulo">▢</button>
              <button class="shape-btn" @click="addShape('circle')" title="Círculo">○</button>
              <button class="shape-btn" @click="addShape('line')" title="Linha">─</button>
              <button class="shape-btn" @click="addShape('arrow')" title="Seta">→</button>
            </div>
          </div>
          
          <!-- Stickers -->
          <div class="elements-section">
            <span class="section-title">Stickers</span>
            <div class="stickers-grid">
              <div v-for="sticker in stickers" :key="sticker.id" class="sticker-item" @click="addSticker(sticker)">
                {{ sticker.emoji }}
              </div>
            </div>
          </div>
        </div>

        <!-- Fundos -->
        <div v-if="tab === 'fundos'" class="panel-content">
          <p class="panel-hint">Selecione um fundo para a página {{ activeSide === 'left' ? 'esquerda' : 'direita' }}</p>
          <div class="backgrounds-section">
            <span class="section-title">Cores Sólidas</span>
            <div class="colors-grid">
              <div v-for="color in backgroundColors" :key="color" class="color-item" :style="{ background: color }" @click="setPageBackground(color)"></div>
            </div>
          </div>
          <div class="backgrounds-section">
            <span class="section-title">Gradientes</span>
            <div class="colors-grid">
              <div v-for="grad in backgroundGradients" :key="grad" class="color-item gradient" :style="{ background: grad }" @click="setPageBackground(grad)"></div>
            </div>
          </div>
          <div class="backgrounds-section">
            <span class="section-title">Padrões</span>
            <div class="patterns-grid">
              <div v-for="pattern in backgroundPatterns" :key="pattern.id" class="pattern-item" :style="{ background: pattern.css }" @click="setPageBackground(pattern.css)"></div>
            </div>
          </div>
          <button class="btn-clear-bg" @click="setPageBackground('')">Remover fundo</button>
        </div>

        <!-- Templates -->
        <div v-if="tab === 'templates'" class="panel-content">
          <p class="panel-hint">Templates prontos para o spread</p>
          <div class="templates-grid">
            <div v-for="template in spreadTemplates" :key="template.id" class="template-item" @click="applySpreadTemplate(template)">
              <div class="template-preview">
                <div class="template-page left">
                  <div v-for="(r, i) in template.left" :key="'l'+i" class="template-rect" :style="r"></div>
                </div>
                <div class="template-page right">
                  <div v-for="(r, i) in template.right" :key="'r'+i" class="template-rect" :style="r"></div>
                </div>
              </div>
              <span>{{ template.name }}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Barra de Propriedades Melhorada -->
    <footer v-if="selected" class="props-bar">
      <div class="props-section">
        <span class="props-title">{{ selected.type === 'image' ? '🖼️ Imagem' : selected.type === 'text' ? '✏️ Texto' : '⭐ Sticker' }}</span>
        <button class="btn-icon-tiny" :class="{ active: selected.locked }" @click="toggleLock" :title="selected.locked ? 'Desbloquear (L)' : 'Bloquear (L)'">🔒</button>
      </div>
      
      <div class="props-section">
        <span class="props-label">Posição</span>
        <div class="props-row">
          <div class="prop">
            <label>X</label>
            <input type="number" v-model.number="selected.x" @change="clampPosition" :disabled="selected.locked" />
          </div>
          <div class="prop">
            <label>Y</label>
            <input type="number" v-model.number="selected.y" @change="clampPosition" :disabled="selected.locked" />
          </div>
        </div>
      </div>

      <div class="props-section">
        <span class="props-label">Tamanho</span>
        <div class="props-row">
          <div class="prop">
            <label>L</label>
            <input type="number" v-model.number="selected.width" min="20" @change="clampSize" :disabled="selected.locked" />
          </div>
          <div class="prop">
            <label>A</label>
            <input type="number" v-model.number="selected.height" min="20" @change="clampSize" :disabled="selected.locked" />
          </div>
          <button class="btn-icon-small" @click="fitToPage" title="Ajustar à página" :disabled="selected.locked">⬜</button>
        </div>
      </div>

      <div class="props-section">
        <span class="props-label">Rotação</span>
        <div class="props-row">
          <button class="btn-icon-small" @click="rotateElement(-15)" title="Girar -15°" :disabled="selected.locked">↺</button>
          <input type="number" v-model.number="selected.rotation" class="input-tiny" :disabled="selected.locked" />
          <button class="btn-icon-small" @click="rotateElement(15)" title="Girar +15°" :disabled="selected.locked">↻</button>
        </div>
      </div>

      <div class="props-section">
        <span class="props-label">Alinhar</span>
        <div class="props-row">
          <button class="btn-icon-small" @click="alignElement('left')" title="Esquerda" :disabled="selected.locked">⬅</button>
          <button class="btn-icon-small" @click="alignElement('center-h')" title="Centro H" :disabled="selected.locked">↔</button>
          <button class="btn-icon-small" @click="alignElement('right')" title="Direita" :disabled="selected.locked">➡</button>
          <button class="btn-icon-small" @click="alignElement('top')" title="Topo" :disabled="selected.locked">⬆</button>
          <button class="btn-icon-small" @click="alignElement('center-v')" title="Centro V" :disabled="selected.locked">↕</button>
          <button class="btn-icon-small" @click="alignElement('bottom')" title="Base" :disabled="selected.locked">⬇</button>
        </div>
      </div>

      <div class="props-section" v-if="selected.type === 'image'">
        <span class="props-label">Efeitos</span>
        <div class="props-row">
          <select v-model="selected.filter" class="select-small" :disabled="selected.locked">
            <option value="">Normal</option>
            <option value="grayscale(100%)">P&B</option>
            <option value="sepia(100%)">Sépia</option>
            <option value="contrast(120%)">Contraste</option>
            <option value="brightness(110%)">Brilho</option>
            <option value="saturate(150%)">Saturado</option>
            <option value="blur(2px)">Desfoque</option>
          </select>
          <div class="prop">
            <label>Op</label>
            <input type="range" v-model.number="selected.opacity" min="0.1" max="1" step="0.1" class="input-range" :disabled="selected.locked" />
          </div>
        </div>
      </div>

      <div class="props-section" v-if="selected.type === 'image'">
        <span class="props-label">Borda</span>
        <div class="props-row">
          <input type="number" v-model.number="selected.borderWidth" min="0" max="20" class="input-tiny" placeholder="0" :disabled="selected.locked" />
          <input type="color" v-model="selected.borderColor" class="input-color-small" :disabled="selected.locked" />
          <input type="number" v-model.number="selected.borderRadius" min="0" max="50" class="input-tiny" placeholder="R" :disabled="selected.locked" />
          <button class="btn-icon-small" :class="{ active: selected.shadow }" @click="selected.shadow = !selected.shadow" title="Sombra" :disabled="selected.locked">◐</button>
        </div>
      </div>

      <div class="props-section" v-if="selected.type === 'image' && selected.src">
        <div class="props-row">
          <button class="btn-small" @click="openCropModal" :disabled="selected.locked">✂️ Crop</button>
          <button class="btn-small" @click="removeImage" :disabled="selected.locked">Remover</button>
          <button class="btn-small" @click="replaceImage" :disabled="selected.locked">Trocar</button>
        </div>
      </div>

      <template v-if="selected.type === 'text'">
        <div class="props-section">
          <span class="props-label">Fonte</span>
          <div class="props-row">
            <select v-model="selected.fontFamily" class="select-font" :disabled="selected.locked">
              <option v-for="f in fonts" :key="f">{{ f }}</option>
            </select>
            <input type="number" v-model.number="selected.fontSize" min="8" max="120" class="input-small" :disabled="selected.locked" />
          </div>
        </div>
        <div class="props-section">
          <span class="props-label">Estilo</span>
          <div class="props-row">
            <input type="color" v-model="selected.color" class="input-color" :disabled="selected.locked" />
            <button class="btn-icon-small" :class="{ active: selected.fontWeight === 'bold' }" @click="toggleBold" title="Negrito" :disabled="selected.locked">B</button>
            <button class="btn-icon-small" :class="{ active: selected.fontStyle === 'italic' }" @click="toggleItalic" title="Itálico" :disabled="selected.locked">I</button>
            <button class="btn-icon-small" :class="{ active: selected.textAlign === 'left' }" @click="selected.textAlign = 'left'" title="Esquerda" :disabled="selected.locked">◀</button>
            <button class="btn-icon-small" :class="{ active: selected.textAlign === 'center' }" @click="selected.textAlign = 'center'" title="Centro" :disabled="selected.locked">▬</button>
            <button class="btn-icon-small" :class="{ active: selected.textAlign === 'right' }" @click="selected.textAlign = 'right'" title="Direita" :disabled="selected.locked">▶</button>
          </div>
        </div>
      </template>

      <div class="props-section">
        <span class="props-label">Ações</span>
        <div class="props-row">
          <button class="btn-icon-small" @click="bringForward" title="Trazer para frente">↑</button>
          <button class="btn-icon-small" @click="sendBackward" title="Enviar para trás">↓</button>
          <button class="btn-icon-small" @click="copyElement" title="Copiar (Ctrl+C)">📋</button>
          <button class="btn-icon-small" @click="duplicateElement" title="Duplicar (Ctrl+D)">⧉</button>
        </div>
      </div>

      <button class="btn-delete" @click="deleteElement" :disabled="selected.locked">🗑️</button>
    </footer>

    <!-- Modal de Preview -->
    <div v-if="showPreview" class="preview-modal" @click.self="showPreview = false">
      <div class="preview-container">
        <div class="preview-header">
          <h2>{{ projectName }}</h2>
          <button class="preview-close" @click="showPreview = false">✕</button>
        </div>
        <div class="preview-content">
          <div class="preview-nav">
            <button @click="previewPage > 0 && previewPage--" :disabled="previewPage === 0">‹</button>
            <span>{{ previewPage === 0 ? 'Capa' : `Páginas ${(previewPage - 1) * 2 + 1}-${(previewPage - 1) * 2 + 2}` }}</span>
            <button @click="previewPage < totalSpreads && previewPage++" :disabled="previewPage >= totalSpreads">›</button>
          </div>
          
          <!-- Preview da Capa -->
          <div v-if="previewPage === 0" class="preview-spread preview-cover">
            <div class="preview-page">
              <div v-for="el in backCoverElements" :key="el.id" class="preview-el" :style="getPreviewStyle(el)">
                <img v-if="el.type === 'image' && el.src" :src="el.src" />
                <div v-if="el.type === 'text'" :style="getTextStyle(el)">{{ el.content }}</div>
              </div>
            </div>
            <div class="preview-spine">{{ projectName }}</div>
            <div class="preview-page">
              <div v-for="el in frontCoverElements" :key="el.id" class="preview-el" :style="getPreviewStyle(el)">
                <img v-if="el.type === 'image' && el.src" :src="el.src" />
                <div v-if="el.type === 'text'" :style="getTextStyle(el)">{{ el.content }}</div>
              </div>
            </div>
          </div>
          
          <!-- Preview do Miolo -->
          <div v-else class="preview-spread">
            <div class="preview-page">
              <div v-for="el in getPreviewPageElements(previewPage, 'left')" :key="el.id" class="preview-el" :style="getPreviewStyle(el)">
                <img v-if="el.type === 'image' && el.src" :src="el.src" />
                <div v-if="el.type === 'text'" :style="getTextStyle(el)">{{ el.content }}</div>
              </div>
            </div>
            <div class="preview-spine-inner"></div>
            <div class="preview-page">
              <div v-for="el in getPreviewPageElements(previewPage, 'right')" :key="el.id" class="preview-el" :style="getPreviewStyle(el)">
                <img v-if="el.type === 'image' && el.src" :src="el.src" />
                <div v-if="el.type === 'text'" :style="getTextStyle(el)">{{ el.content }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="preview-footer">
          <div class="preview-thumbs">
            <div 
              v-for="idx in totalSpreads + 1" 
              :key="idx - 1" 
              :class="['preview-thumb', { active: previewPage === idx - 1 }]"
              @click="previewPage = idx - 1"
            >
              {{ idx === 1 ? 'Capa' : `${(idx - 2) * 2 + 1}-${(idx - 2) * 2 + 2}` }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Apresentação -->
    <div v-if="showPresentationMode" class="presentation-modal" @keydown.escape="showPresentationMode = false" @keydown.left="presentationPrev" @keydown.right="presentationNext" tabindex="0" ref="presentationRef">
      <div class="presentation-content">
        <div class="presentation-spread">
          <div v-if="presentationPage === 0" class="presentation-cover">
            <div class="pres-page" :style="getPageBackground('cover-back')">
              <div v-for="el in backCoverElements" :key="el.id" class="pres-el" :style="getPreviewStyle(el)">
                <img v-if="el.type === 'image' && el.src" :src="el.src" />
                <div v-if="el.type === 'text'" :style="getTextStyle(el)">{{ el.content }}</div>
                <div v-if="el.type === 'sticker'" class="pres-sticker">{{ el.content }}</div>
              </div>
            </div>
            <div class="pres-spine">{{ projectName }}</div>
            <div class="pres-page" :style="getPageBackground('cover-front')">
              <div v-for="el in frontCoverElements" :key="el.id" class="pres-el" :style="getPreviewStyle(el)">
                <img v-if="el.type === 'image' && el.src" :src="el.src" />
                <div v-if="el.type === 'text'" :style="getTextStyle(el)">{{ el.content }}</div>
                <div v-if="el.type === 'sticker'" class="pres-sticker">{{ el.content }}</div>
              </div>
            </div>
          </div>
          <div v-else class="presentation-pages">
            <div class="pres-page" :style="getPageBackground(2 + (presentationPage - 1) * 2)">
              <div v-for="el in getPreviewPageElements(presentationPage, 'left')" :key="el.id" class="pres-el" :style="getPreviewStyle(el)">
                <img v-if="el.type === 'image' && el.src" :src="el.src" />
                <div v-if="el.type === 'text'" :style="getTextStyle(el)">{{ el.content }}</div>
                <div v-if="el.type === 'sticker'" class="pres-sticker">{{ el.content }}</div>
              </div>
            </div>
            <div class="pres-spine-inner"></div>
            <div class="pres-page" :style="getPageBackground(2 + (presentationPage - 1) * 2 + 1)">
              <div v-for="el in getPreviewPageElements(presentationPage, 'right')" :key="el.id" class="pres-el" :style="getPreviewStyle(el)">
                <img v-if="el.type === 'image' && el.src" :src="el.src" />
                <div v-if="el.type === 'text'" :style="getTextStyle(el)">{{ el.content }}</div>
                <div v-if="el.type === 'sticker'" class="pres-sticker">{{ el.content }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="presentation-controls">
          <button @click="presentationPrev" :disabled="presentationPage === 0">‹</button>
          <span>{{ presentationPage === 0 ? 'Capa' : `${(presentationPage - 1) * 2 + 1}-${(presentationPage - 1) * 2 + 2}` }} / {{ totalSpreads }}</span>
          <button @click="presentationNext" :disabled="presentationPage >= totalSpreads">›</button>
          <button class="pres-close" @click="showPresentationMode = false">✕</button>
        </div>
      </div>
    </div>

    <!-- Modal de Visualização Flipbook -->
    <AlbumFlipbook
      v-if="show3DPreview"
      :album-name="projectName"
      :width="productConfig?.width || 300"
      :height="productConfig?.height || 300"
      :page-count="pages.length - 2"
      :spreads="spreadsFor3D"
      :cover-front="coverFrontFor3D"
      :cover-back="coverBackFor3D"
      :pages="pages"
      @close="show3DPreview = false"
      @approve="handleApprove"
      @save-review="handleSaveReview"
    />

    <!-- Modal de Crop -->
    <div v-if="showCropModal && cropElement" class="crop-modal" @click.self="cancelCrop">
      <div class="crop-container">
        <div class="crop-header">
          <h3>✂️ Ajustar Imagem</h3>
          <button class="crop-close" @click="cancelCrop">✕</button>
        </div>
        <div class="crop-content">
          <div class="crop-preview">
            <div class="crop-image-container">
              <img 
                :src="cropElement.src" 
                :style="{
                  transform: `scale(${cropData.scale}) translate(${-cropData.x}%, ${-cropData.y}%)`,
                  transformOrigin: 'center center'
                }"
              />
            </div>
          </div>
          <div class="crop-controls">
            <div class="crop-control">
              <label>Zoom</label>
              <input type="range" v-model.number="cropData.scale" min="1" max="3" step="0.1" />
              <span>{{ Math.round(cropData.scale * 100) }}%</span>
            </div>
            <div class="crop-control">
              <label>Posição X</label>
              <input type="range" v-model.number="cropData.x" min="-50" max="50" step="1" />
              <span>{{ cropData.x }}%</span>
            </div>
            <div class="crop-control">
              <label>Posição Y</label>
              <input type="range" v-model.number="cropData.y" min="-50" max="50" step="1" />
              <span>{{ cropData.y }}%</span>
            </div>
          </div>
        </div>
        <div class="crop-footer">
          <button class="btn-cancel" @click="cancelCrop">Cancelar</button>
          <button class="btn-apply" @click="applyCrop">Aplicar</button>
        </div>
      </div>
    </div>

    <!-- Overlay de Exportação PDF -->
    <div v-if="exportingPDF" class="export-overlay">
      <div class="export-content">
        <div class="export-spinner"></div>
        <h3>Exportando PDF...</h3>
        <div class="export-progress">
          <div class="export-progress-bar" :style="{ width: exportProgress + '%' }"></div>
        </div>
        <span>{{ exportProgress }}%</span>
      </div>
    </div>

    <!-- Modal de Atalhos -->
    <div v-if="showShortcuts" class="shortcuts-modal" @click.self="showShortcuts = false">
      <div class="shortcuts-container">
        <div class="shortcuts-header">
          <h3>⌨️ Atalhos de Teclado</h3>
          <button class="shortcuts-close" @click="showShortcuts = false">✕</button>
        </div>
        <div class="shortcuts-content">
          <div class="shortcuts-section">
            <h4>Geral</h4>
            <div class="shortcut-item"><kbd>Ctrl</kbd> + <kbd>S</kbd> <span>Salvar projeto</span></div>
            <div class="shortcut-item"><kbd>Ctrl</kbd> + <kbd>Z</kbd> <span>Desfazer</span></div>
            <div class="shortcut-item"><kbd>Ctrl</kbd> + <kbd>Y</kbd> <span>Refazer</span></div>
            <div class="shortcut-item"><kbd>Esc</kbd> <span>Limpar seleção</span></div>
          </div>
          <div class="shortcuts-section">
            <h4>Elementos</h4>
            <div class="shortcut-item"><kbd>Delete</kbd> <span>Remover elemento</span></div>
            <div class="shortcut-item"><kbd>Ctrl</kbd> + <kbd>C</kbd> <span>Copiar</span></div>
            <div class="shortcut-item"><kbd>Ctrl</kbd> + <kbd>V</kbd> <span>Colar</span></div>
            <div class="shortcut-item"><kbd>Ctrl</kbd> + <kbd>D</kbd> <span>Duplicar</span></div>
            <div class="shortcut-item"><kbd>L</kbd> <span>Bloquear/Desbloquear</span></div>
            <div class="shortcut-item"><kbd>R</kbd> <span>Rotacionar +15°</span></div>
            <div class="shortcut-item"><kbd>Shift</kbd> + <kbd>R</kbd> <span>Rotacionar -15°</span></div>
          </div>
          <div class="shortcuts-section">
            <h4>Movimento</h4>
            <div class="shortcut-item"><kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> <span>Mover 1px</span></div>
            <div class="shortcut-item"><kbd>Shift</kbd> + <kbd>Setas</kbd> <span>Mover 10px</span></div>
          </div>
          <div class="shortcuts-section">
            <h4>Zoom</h4>
            <div class="shortcut-item"><kbd>Ctrl</kbd> + <kbd>Scroll</kbd> <span>Zoom in/out</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Salvamento -->
    <div v-if="showSaveModal" class="save-modal" @click.self="showSaveModal = false">
      <div class="save-container">
        <div class="save-header">
          <h3>💾 Salvar Projeto</h3>
          <button @click="showSaveModal = false">✕</button>
        </div>
        <div class="save-content">
          <div class="form-group">
            <label>Nome do Projeto</label>
            <input 
              v-model="saveProjectName" 
              type="text" 
              placeholder="Digite o nome do projeto..."
              @keydown.enter="confirmSaveProject"
              autofocus
            />
          </div>
          <p class="save-hint">
            Este nome será usado para identificar seu projeto na lista de projetos.
          </p>
        </div>
        <div class="save-actions">
          <button class="btn-cancel" @click="showSaveModal = false" :disabled="isSaving">
            Cancelar
          </button>
          <button class="btn-save-confirm" @click="confirmSaveProject" :disabled="isSaving || !saveProjectName.trim()">
            <span v-if="isSaving">⏳ Salvando...</span>
            <span v-else>💾 Salvar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Sucesso ao Salvar -->
    <div v-if="showSaveSuccessModal" class="save-modal" @click.self="showSaveSuccessModal = false">
      <div class="save-container success-modal">
        <div class="save-header">
          <h3>✅ Projeto Salvo!</h3>
          <button @click="showSaveSuccessModal = false">✕</button>
        </div>
        <div class="save-content">
          <div class="success-icon">✅</div>
          <p class="success-message">Seu projeto foi salvo com sucesso.</p>
          <p class="success-hint">O que deseja fazer agora?</p>
        </div>
        <div class="save-actions">
          <button class="btn-secondary" @click="goToProjects">
            📁 Ir para Projetos
          </button>
          <button class="btn-primary" @click="showSaveSuccessModal = false">
            ✏️ Continuar Editando
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import AlbumFlipbook from '../components/editor/AlbumFlipbook.vue'
import { purchaseFlowService, type ProjectData } from '@/services/purchaseFlow'

const router = useRouter()
const route = useRoute()

// ==========================================
// INTEGRAÇÃO COM BACKEND
// ==========================================
import { useEditorIntegration } from '../composables/useEditorIntegration'

const {
  backendProjectId,
  backendVersion,
  isConnectedToBackend,
  isSavingToBackend,
  isUploadingToBackend,
  backendError,
  lastBackendSave,
  backendProductConfig,
  calculatedSpineWidth,
  dpiWarnings,
  initBackendConnection,
  saveToBackend,
  uploadPhotoToBackend,
  uploadPhotosToBackend,
  validateImageDpi,
  getDpiWarning,
  calculateSpineWidth,
  createBackupVersion,
  startBackendAutoSave,
  stopBackendAutoSave,
} = useEditorIntegration()

// State
const projectName = ref('Meu Álbum de Casamento')
const localProjectId = ref<string | null>(null) // ID do projeto local para evitar duplicação
const spineText = ref('') // Texto da lombada (se vazio, usa projectName)
const currentPage = ref(0) // 0 = capa, 1+ = spreads do miolo
const zoom = ref(1.2)
const tab = ref('fotos')
const selected = ref<any>(null)
const editingId = ref<string | null>(null)
const dropSide = ref<string | null>(null)
const showPreview = ref(false)
const previewPage = ref(0)
const draggingPhoto = ref<any>(null)
const dragOverElement = ref<string | null>(null)
const activeSide = ref<'left' | 'right' | 'spine'>('left')

// Modos de layout
const spreadLayoutMode = ref<'left' | 'right' | 'spread'>('left')
const coverLayoutMode = ref<'back' | 'front' | 'full'>('front')

// Novos estados
const showGrid = ref(false)
const showRulers = ref(false)
const snapToGrid = ref(false)
const showLayersPanel = ref(false)
const showBackgroundPanel = ref(false)
const showPresentationMode = ref(false)
const show3DPreview = ref(false)
const presentationPage = ref(0)
const stickerCategory = ref('all')
const presentationRef = ref<HTMLElement | null>(null)
const showCoverHelp = ref(true) // Mostrar guias de ajuda na capa

// Tamanhos de sangria e lombada visual
const bleedSize = 15 // pixels para área de sangria
const spineVisualWidth = computed(() => Math.max(calculatedSpineWidth.value * 1.2, 20))

// Guias inteligentes
const showSmartGuides = ref(true)
const smartGuides = ref<{ type: 'h' | 'v'; pos: number }[]>([])

// Crop/Recorte de imagem
const showCropModal = ref(false)
const cropElement = ref<Element | null>(null)
const cropData = ref({ x: 0, y: 0, width: 100, height: 100, scale: 1 })

// Exportação PDF
const exportingPDF = ref(false)
const exportProgress = ref(0)

// Modal de atalhos
const showShortcuts = ref(false)

// Modal de salvamento
const showSaveModal = ref(false)
const showSaveSuccessModal = ref(false)
const saveProjectName = ref('')
const isSaving = ref(false)

// Múltipla seleção
const selectedElements = ref<Element[]>([])
const isMultiSelect = ref(false)

// Máscaras de forma
const showMasksPanel = ref(false)
const masks = [
  { id: 'none', name: 'Nenhuma', path: '' },
  { id: 'circle', name: 'Círculo', path: 'circle(50% at 50% 50%)' },
  { id: 'ellipse', name: 'Elipse', path: 'ellipse(50% 40% at 50% 50%)' },
  { id: 'heart', name: 'Coração', path: 'path("M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z")' },
  { id: 'star', name: 'Estrela', path: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' },
  { id: 'hexagon', name: 'Hexágono', path: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' },
  { id: 'diamond', name: 'Losango', path: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' },
  { id: 'rounded', name: 'Arredondado', path: 'inset(0 round 20px)' },
  { id: 'arch', name: 'Arco', path: 'ellipse(50% 100% at 50% 100%)' }
]

// Molduras decorativas
const showFramesPanel = ref(false)
const frames = [
  { id: 'none', name: 'Nenhuma', style: {} },
  { id: 'simple', name: 'Simples', style: { border: '3px solid #2D2A26' } },
  { id: 'double', name: 'Dupla', style: { border: '4px double #2D2A26' } },
  { id: 'gold', name: 'Dourada', style: { border: '5px solid #D4A574', boxShadow: 'inset 0 0 0 2px #F5E6D3' } },
  { id: 'silver', name: 'Prateada', style: { border: '5px solid #A8A8A8', boxShadow: 'inset 0 0 0 2px #E8E8E8' } },
  { id: 'vintage', name: 'Vintage', style: { border: '8px solid #8B7355', borderImage: 'linear-gradient(45deg, #8B7355, #D4A574, #8B7355) 1' } },
  { id: 'polaroid', name: 'Polaroid', style: { border: '10px solid #fff', borderBottom: '40px solid #fff', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' } },
  { id: 'shadow', name: 'Sombra', style: { boxShadow: '0 8px 25px rgba(0,0,0,0.3)' } },
  { id: 'glow', name: 'Brilho', style: { boxShadow: '0 0 20px rgba(212,119,92,0.5)' } }
]

// Cores para lombada
const spineColors = [
  { name: 'Padrão', value: 'linear-gradient(90deg, #8B7355 0%, #A08060 15%, #C9B99A 50%, #A08060 85%, #8B7355 100%)' },
  { name: 'Couro Marrom', value: 'linear-gradient(90deg, #5D4037 0%, #795548 50%, #5D4037 100%)' },
  { name: 'Couro Preto', value: 'linear-gradient(90deg, #1a1a1a 0%, #333 50%, #1a1a1a 100%)' },
  { name: 'Couro Branco', value: 'linear-gradient(90deg, #e8e8e8 0%, #fff 50%, #e8e8e8 100%)' },
  { name: 'Couro Vermelho', value: 'linear-gradient(90deg, #8B0000 0%, #B22222 50%, #8B0000 100%)' },
  { name: 'Couro Azul', value: 'linear-gradient(90deg, #1a237e 0%, #303f9f 50%, #1a237e 100%)' },
  { name: 'Couro Verde', value: 'linear-gradient(90deg, #1b5e20 0%, #2e7d32 50%, #1b5e20 100%)' },
  { name: 'Dourado', value: 'linear-gradient(90deg, #B8860B 0%, #DAA520 50%, #B8860B 100%)' },
  { name: 'Prateado', value: 'linear-gradient(90deg, #708090 0%, #C0C0C0 50%, #708090 100%)' },
  { name: 'Rosa', value: 'linear-gradient(90deg, #C71585 0%, #DB7093 50%, #C71585 100%)' },
]

// Modo escuro
const darkMode = ref(false)

// Minimap
const showMinimap = ref(true)

// Undo/Redo
const history = ref<string[]>([])
const historyIndex = ref(-1)
const maxHistory = 50

const saveToHistory = () => {
  const state = JSON.stringify(pages.value)
  // Remove estados futuros se estamos no meio do histórico
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }
  history.value.push(state)
  if (history.value.length > maxHistory) {
    history.value.shift()
  }
  historyIndex.value = history.value.length - 1
  hasUnsavedChanges.value = true
}

const undo = () => {
  if (historyIndex.value > 0) {
    historyIndex.value--
    pages.value = JSON.parse(history.value[historyIndex.value])
    selected.value = null
  }
}

const redo = () => {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    pages.value = JSON.parse(history.value[historyIndex.value])
    selected.value = null
  }
}

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < history.value.length - 1)

// Clipboard
const clipboard = ref<Element | null>(null)

// Auto-save & Changes tracking
const hasUnsavedChanges = ref(false)
const lastSaveTime = ref<Date | null>(null)
let autoSaveInterval: number | null = null

// Alignment guides
const showGuides = ref(false)
const guideX = ref<number | null>(null)
const guideY = ref<number | null>(null)

// Pages
interface Element {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  src?: string
  content?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
  fontStyle?: string
  textAlign?: string
  color?: string
  rotation?: number
  opacity?: number
  locked?: boolean
  filter?: string
  borderWidth?: number
  borderColor?: string
  borderRadius?: number
  shadow?: boolean
  mask?: string
  frame?: string
  textShadow?: string
  textOutline?: string
  // Crop properties
  cropX?: number
  cropY?: number
  cropWidth?: number
  cropHeight?: number
  cropScale?: number
  // Original image dimensions
  originalWidth?: number
  originalHeight?: number
  // Group
  groupId?: string
  // Spread element (atravessa as duas páginas no layflat)
  isSpreadElement?: boolean
  // Full cover (elemento que atravessa contracapa + lombada + capa)
  isFullCover?: boolean
  fullCoverIndex?: number
}
interface Page { 
  id: string
  type: 'cover-front' | 'cover-back' | 'page'
  elements: Element[]
  background?: string
}
const pages = ref<Page[]>([])
const PAGE_W = 420
const PAGE_H = 300

// Computed
const isCoverView = computed(() => currentPage.value === 0)
const currentSpreadIndex = computed(() => currentPage.value - 1) // índice do spread no miolo
// Total de spreads: páginas totais - capa - contracapa - lombada, dividido por 2
const totalSpreads = computed(() => {
  const innerPages = pages.value.filter(p => p.type === 'page').length
  return Math.max(0, Math.ceil(innerPages / 2))
})
const frontCoverElements = computed(() => pages.value.find(p => p.type === 'cover-front')?.elements || [])
const backCoverElements = computed(() => pages.value.find(p => p.type === 'cover-back')?.elements || [])
const spineElements = computed(() => pages.value.find(p => p.type === 'spine')?.elements || [])
const spineHasFullCover = computed(() => spineElements.value.some(el => el.isFullCover))

// Imagem panorâmica para fullCover (pega de qualquer elemento fullCover que tenha src)
const fullCoverImage = computed(() => {
  // Procurar em todas as páginas da capa por um elemento fullCover com imagem
  const allCoverElements = [...backCoverElements.value, ...spineElements.value, ...frontCoverElements.value]
  const fullCoverEl = allCoverElements.find(el => el.isFullCover && el.src)
  return fullCoverEl?.src || null
})

const spinePage = computed(() => pages.value.find(p => p.type === 'spine'))

// Dados para visualização 3D - extrai imagens com posição e tamanho
const extractImagesFromElements = (elements: any[]) => {
  return elements
    .filter((el: any) => el.type === 'image' && el.src)
    .map((el: any) => ({
      src: el.src,
      x: el.x || 0,
      y: el.y || 0,
      width: el.width || 200,
      height: el.height || 200
    }))
}

const coverFrontFor3D = computed(() => extractImagesFromElements(frontCoverElements.value))
const coverBackFor3D = computed(() => extractImagesFromElements(backCoverElements.value))

const spreadsFor3D = computed(() => {
  const result: { left: any[], right: any[] }[] = []
  const innerPages = pages.value.filter(p => p.type === 'page')
  
  for (let i = 0; i < innerPages.length; i += 2) {
    const leftPage = innerPages[i]
    const rightPage = innerPages[i + 1]
    
    result.push({
      left: extractImagesFromElements(leftPage?.elements || []),
      right: extractImagesFromElements(rightPage?.elements || [])
    })
  }
  
  return result
})

const leftPageElements = computed(() => {
  if (isCoverView.value) return []
  const idx = 3 + currentSpreadIndex.value * 2 // +3 para pular cover-front, spine e cover-back
  return pages.value[idx]?.elements.filter(el => !el.isSpreadElement) || []
})
const rightPageElements = computed(() => {
  if (isCoverView.value) return []
  const idx = 3 + currentSpreadIndex.value * 2 + 1
  return pages.value[idx]?.elements.filter(el => !el.isSpreadElement) || []
})

// Elementos que atravessam as duas páginas (layflat)
const spreadElements = computed(() => {
  if (isCoverView.value) return []
  const leftIdx = 3 + currentSpreadIndex.value * 2 // +3 para pular cover-front, spine e cover-back
  const leftPage = pages.value[leftIdx]
  // Spread elements são armazenados na página esquerda com flag isSpreadElement
  return leftPage?.elements.filter(el => el.isSpreadElement) || []
})

// Formatar dimensão (mm para cm)
const formatDimension = (mm: number | undefined) => {
  if (!mm) return '30'
  // Se já está em mm (valor maior que 100), converter para cm
  if (mm > 100) return (mm / 10).toFixed(0)
  // Se está em cm ou valor pequeno, retornar como está
  return mm.toString()
}

// Info do produto para exibição
const productInfo = computed(() => {
  if (productConfig.value) {
    const width = productConfig.value.width || 300
    const height = productConfig.value.height || 300
    const size = `${width}x${height}mm`
    const cover = productConfig.value.coverName || 
                  (productConfig.value.cover === 'couro' ? 'Couro' : 
                   productConfig.value.cover === 'tecido' ? 'Linho' : 'Capa Dura')
    return `${productConfig.value.productName || 'Álbum'} ${size} • ${cover}`
  }
  return 'Álbum 300x300mm'
})

// Fotos usadas/não usadas
const usedPhotoSrcs = computed(() => {
  const srcs = new Set<string>()
  pages.value.forEach(page => {
    page.elements.forEach(el => {
      if (el.type === 'image' && el.src) {
        srcs.add(el.src)
      }
    })
  })
  return srcs
})

const unusedPhotosCount = computed(() => {
  return photos.value.filter(p => !usedPhotoSrcs.value.has(p.src)).length
})

// Configurações do produto (carregadas do ProductDetail)
const productConfig = ref<any>(null)

// Dimensões dinâmicas da página baseadas no produto
const pageWidth = computed(() => {
  // Converter mm para pixels (usando 1mm = 3.78px aproximadamente para visualização)
  // Ou usar valores diretos se já estiverem em pixels
  const width = productConfig.value?.width || 300
  // Se o valor for em mm (menor que 500), converter para pixels de visualização
  // Escala: 1.4px por mm para boa visualização no editor
  if (width < 500) {
    return Math.round(width * 1.4)
  }
  return width
})

const pageHeight = computed(() => {
  const height = productConfig.value?.height || 300
  if (height < 500) {
    return Math.round(height * 1.4)
  }
  return height
})

// Estilo dinâmico para as páginas
const pageStyle = computed(() => ({
  width: `${pageWidth.value}px`,
  height: `${pageHeight.value}px`
}))

// Aspect ratio para thumbnails
const pageAspectRatio = computed(() => {
  return pageWidth.value / pageHeight.value
})

// Aspect ratio para spread (duas páginas lado a lado)
const spreadAspectRatio = computed(() => {
  return (pageWidth.value * 2) / pageHeight.value // duas páginas lado a lado
})

// Estilo para thumbnails de spread - não usar aspect ratio fixo
const spreadPreviewStyle = computed(() => ({}))

// Init
onMounted(async () => {
  // ==========================================
  // VERIFICAR SE É UM PROJETO EXISTENTE OU NOVO
  // ==========================================
  // Suportar tanto route.params quanto route.query para compatibilidade
  const projectIdFromUrl = route.params.projectId as string || route.params.id as string || route.query.projectId as string
  const isNewProject = !projectIdFromUrl // Se não tem ID na URL, é um novo projeto
  
  console.log('🚀 Editor iniciado:', { projectIdFromUrl, isNewProject })
  
  // ==========================================
  // CARREGAR PROJETO LOCAL DA LISTA (se ID começa com "local-")
  // ==========================================
  if (projectIdFromUrl && projectIdFromUrl.startsWith('local-')) {
    console.log('📂 Carregando projeto local da lista:', projectIdFromUrl)
    const projectsJson = localStorage.getItem('projects')
    if (projectsJson) {
      try {
        const projectsList = JSON.parse(projectsJson)
        const localProject = projectsList.find((p: any) => p.id === projectIdFromUrl)
        if (localProject) {
          projectName.value = localProject.name || 'Meu Álbum'
          pages.value = localProject.pages || []
          photos.value = localProject.photos || []
          localProjectId.value = projectIdFromUrl
          
          // Carregar configuração do produto se existir
          if (localProject.productSelection) {
            productConfig.value = {
              productId: localProject.productSelection.productId,
              productName: localProject.productSelection.productName,
              formatId: localProject.productSelection.formatId,
              formatName: localProject.productSelection.formatName,
              paperId: localProject.productSelection.paperId,
              paperName: localProject.productSelection.paperName,
              coverId: localProject.productSelection.coverTypeId,
              coverName: localProject.productSelection.coverTypeName,
              pages: localProject.productSelection.pages,
              basePrice: localProject.productSelection.basePrice,
              totalPrice: localProject.productSelection.totalPrice
            }
          }
          
          saveToHistory()
          console.log('✅ Projeto local carregado:', localProject.name, 'com', pages.value.length, 'páginas')
          
          // Pular o resto da inicialização de projeto
          // Auto-save local a cada 30 segundos
          autoSaveInterval = window.setInterval(() => {
            if (hasUnsavedChanges.value) {
              autoSave()
            }
          }, 30000)
          
          // Calcular lombada inicial baseado no número de páginas
          const mioloPages = pages.value.filter(p => p.type === 'page').length
          await calculateSpineWidth(mioloPages)
          console.log(`📏 Lombada inicial: ${calculatedSpineWidth.value}mm para ${mioloPages} páginas`)
          
          // Confirmação ao sair
          window.addEventListener('beforeunload', handleBeforeUnload)
          
          // Atalhos de teclado
          document.addEventListener('keydown', handleKeyboard)
          return // Sair do onMounted, projeto já carregado
        }
      } catch (e) {
        console.error('Erro ao carregar projeto local:', e)
      }
    }
  }
  
  // ==========================================
  // TENTAR CARREGAR DO BACKEND SE TIVER ID
  // ==========================================
  const backendResult = await initBackendConnection()
  
  // Carregar configurações do produto do localStorage (salvas pelo ProductDetail ou ProjectsSection)
  const savedConfig = localStorage.getItem('editor-product-config')
  if (savedConfig) {
    try {
      productConfig.value = JSON.parse(savedConfig)
      projectName.value = `Meu ${productConfig.value.productName || 'Álbum'}`
      console.log('📦 Configuração do produto carregada:', productConfig.value)
      console.log('📐 Dimensões da página:', {
        width: productConfig.value.width,
        height: productConfig.value.height,
        pageWidthPx: pageWidth.value,
        pageHeightPx: pageHeight.value
      })
    } catch (e) {
      console.error('Erro ao carregar configuração do produto:', e)
    }
  }
  
  if (backendResult && backendResult.pages.length > 0) {
    // Projeto carregado do backend com páginas existentes
    pages.value = backendResult.pages as Page[]
    
    // Usar o nome do projeto do backend
    if (backendResult.projectName) {
      projectName.value = backendResult.projectName
    }
    
    console.log('✅ Projeto carregado do backend:', projectName.value, 'com', pages.value.length, 'páginas')
    
    // Iniciar auto-save para backend
    startBackendAutoSave(
      () => projectName.value,
      () => pages.value,
      () => ({ zoom: zoom.value })
    )
    
    saveToHistory()
  } else if (backendResult) {
    // Projeto existe no backend mas não tem páginas ainda (recém-criado)
    console.log('📝 Projeto novo do backend, criando páginas iniciais...')
    
    // Determinar número de páginas do miolo
    const mioloPages = productConfig.value?.pages || 20
    
    // Capa frontal + Lombada + Contracapa + páginas de miolo
    pages.value = [
      { id: 'cover-front', type: 'cover-front', elements: [] },
      { id: 'spine', type: 'spine', elements: [], background: '' },
      { id: 'cover-back', type: 'cover-back', elements: [] },
      ...Array.from({ length: mioloPages }, (_, i) => ({ id: `p${i}`, type: 'page' as const, elements: [] }))
    ]
    
    // Iniciar auto-save para backend
    startBackendAutoSave(
      () => projectName.value,
      () => pages.value,
      () => ({ zoom: zoom.value })
    )
    
    // Salvar páginas iniciais no backend
    await saveToBackend(projectName.value, pages.value, { zoom: zoom.value })
    
    saveToHistory()
  } else if (isNewProject) {
    // ==========================================
    // NOVO PROJETO - Vindo da página de produto
    // NÃO carregar do localStorage, criar novo!
    // ==========================================
    console.log('🆕 Criando NOVO projeto (vindo da página de produto)')
    
    // Limpar projeto anterior do localStorage para evitar confusão
    localStorage.removeItem('album-project')
    localStorage.removeItem('album-project-autosave')
    
    // Determinar número de páginas do miolo
    const mioloPages = productConfig.value?.pages || 20
    
    // Capa frontal + Lombada + Contracapa + páginas de miolo
    pages.value = [
      { id: 'cover-front', type: 'cover-front', elements: [] },
      { id: 'spine', type: 'spine', elements: [], background: '' },
      { id: 'cover-back', type: 'cover-back', elements: [] },
      ...Array.from({ length: mioloPages }, (_, i) => ({ id: `p${i}`, type: 'page' as const, elements: [] }))
    ]
    
    // Limpar fotos anteriores
    photos.value = []
    
    // Salvar estado inicial
    saveToHistory()
  } else {
    // Fallback: tentar carregar do localStorage (caso offline com ID na URL)
    if (!loadProject()) {
      // Determinar número de páginas do miolo
      const mioloPages = productConfig.value?.pages || 20
      
      // Capa frontal + Lombada + Contracapa + páginas de miolo
      pages.value = [
        { id: 'cover-front', type: 'cover-front', elements: [] },
        { id: 'spine', type: 'spine', elements: [], background: '' },
        { id: 'cover-back', type: 'cover-back', elements: [] },
        ...Array.from({ length: mioloPages }, (_, i) => ({ id: `p${i}`, type: 'page' as const, elements: [] }))
      ]
      // Salvar estado inicial
      saveToHistory()
    }
  }
  
  // Auto-save local a cada 30 segundos
  autoSaveInterval = window.setInterval(() => {
    if (hasUnsavedChanges.value) {
      autoSave()
    }
  }, 30000)
  
  // Calcular lombada inicial baseado no número de páginas
  const mioloPages = pages.value.filter(p => p.type === 'page').length
  await calculateSpineWidth(mioloPages)
  console.log(`📏 Lombada inicial: ${calculatedSpineWidth.value}mm para ${mioloPages} páginas`)
  
  // Confirmação ao sair
  window.addEventListener('beforeunload', handleBeforeUnload)
  
  // Atalhos de teclado
  document.addEventListener('keydown', handleKeyboard)
})

// Keyboard shortcuts
const handleKeyboard = (e: KeyboardEvent) => {
  // Ignorar se estiver editando texto
  if (editingId.value || (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
    return
  }
  
  // Delete - remover elemento selecionado
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selected.value && !selected.value.locked) {
      e.preventDefault()
      deleteElement()
    }
  }
  
  // Ctrl+Z - Undo
  if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    undo()
  }
  
  // Ctrl+Shift+Z ou Ctrl+Y - Redo
  if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
    e.preventDefault()
    redo()
  }
  
  // Ctrl+D - Duplicar
  if (e.ctrlKey && e.key === 'd') {
    if (selected.value) {
      e.preventDefault()
      duplicateElement()
    }
  }
  
  // Ctrl+C - Copiar
  if (e.ctrlKey && e.key === 'c') {
    if (selected.value) {
      e.preventDefault()
      copyElement()
    }
  }
  
  // Ctrl+V - Colar
  if (e.ctrlKey && e.key === 'v') {
    if (clipboard.value) {
      e.preventDefault()
      pasteElement()
    }
  }
  
  // Ctrl+S - Salvar
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    saveProject()
  }
  
  // L - Bloquear/Desbloquear
  if (e.key === 'l' || e.key === 'L') {
    if (selected.value) {
      e.preventDefault()
      toggleLock()
    }
  }
  
  // R - Rotacionar 15 graus
  if (e.key === 'r' && !e.ctrlKey) {
    if (selected.value && !selected.value.locked) {
      e.preventDefault()
      rotateElement(e.shiftKey ? -15 : 15)
    }
  }
  
  // Escape - Limpar seleção
  if (e.key === 'Escape') {
    selected.value = null
    showPreview.value = false
  }
  
  // Setas - Mover elemento selecionado
  if (selected.value && !selected.value.locked && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault()
    const step = e.shiftKey ? 10 : 1
    switch (e.key) {
      case 'ArrowUp': selected.value.y = Math.max(0, selected.value.y - step); break
      case 'ArrowDown': selected.value.y = Math.min(PAGE_H - selected.value.height, selected.value.y + step); break
      case 'ArrowLeft': selected.value.x = Math.max(0, selected.value.x - step); break
      case 'ArrowRight': selected.value.x = Math.min(PAGE_W - selected.value.width, selected.value.x + step); break
    }
    saveToHistory()
  }
}

// Copiar/Colar
const copyElement = () => {
  if (!selected.value) return
  clipboard.value = JSON.parse(JSON.stringify(selected.value))
}

const pasteElement = () => {
  if (!clipboard.value) return
  const page = findPageWithElement(selected.value?.id) || getCurrentPage()
  if (!page) return
  
  const newEl = {
    ...clipboard.value,
    id: `el${Date.now()}`,
    x: clipboard.value.x + 20,
    y: clipboard.value.y + 20
  }
  page.elements.push(newEl)
  selected.value = newEl
  saveToHistory()
}

const getCurrentPage = (): Page | undefined => {
  if (isCoverView.value) {
    return pages.value.find(p => p.type === (activeSide.value === 'right' ? 'cover-front' : 'cover-back'))
  }
  const pageIdx = 3 + currentSpreadIndex.value * 2 + (activeSide.value === 'right' ? 1 : 0)
  return pages.value[pageIdx]
}

// Rotação
const rotateElement = (degrees: number) => {
  if (!selected.value || selected.value.locked) return
  selected.value.rotation = ((selected.value.rotation || 0) + degrees) % 360
  saveToHistory()
}

// Bloquear/Desbloquear
const toggleLock = () => {
  if (!selected.value) return
  selected.value.locked = !selected.value.locked
  saveToHistory()
}

// Alinhamento
const alignElement = (alignment: string) => {
  if (!selected.value || selected.value.locked) return
  switch (alignment) {
    case 'left': selected.value.x = 0; break
    case 'center-h': selected.value.x = Math.round((PAGE_W - selected.value.width) / 2); break
    case 'right': selected.value.x = PAGE_W - selected.value.width; break
    case 'top': selected.value.y = 0; break
    case 'center-v': selected.value.y = Math.round((PAGE_H - selected.value.height) / 2); break
    case 'bottom': selected.value.y = PAGE_H - selected.value.height; break
  }
  saveToHistory()
}

// Limpar página
const clearCurrentPage = () => {
  const page = getCurrentPage()
  if (!page) return
  if (page.elements.length === 0) return
  if (!confirm('Remover todos os elementos desta página?')) return
  page.elements = []
  selected.value = null
  saveToHistory()
}

// Duplicar página
const duplicateCurrentSpread = () => {
  if (isCoverView.value) return
  const leftIdx = 3 + currentSpreadIndex.value * 2
  const rightIdx = leftIdx + 1
  const leftPage = pages.value[leftIdx]
  const rightPage = pages.value[rightIdx]
  if (!leftPage || !rightPage) return
  
  const newLeft: Page = {
    id: `p${pages.value.length}`,
    type: 'page',
    elements: JSON.parse(JSON.stringify(leftPage.elements)).map((el: Element) => ({ ...el, id: `el${Date.now()}${Math.random()}` }))
  }
  const newRight: Page = {
    id: `p${pages.value.length + 1}`,
    type: 'page',
    elements: JSON.parse(JSON.stringify(rightPage.elements)).map((el: Element) => ({ ...el, id: `el${Date.now()}${Math.random()}` }))
  }
  
  pages.value.push(newLeft, newRight)
  saveToHistory()
}

// Auto-save
// Helper para salvar no localStorage com tratamento de quota
const saveToLocalStorage = (key: string, data: any): boolean => {
  try {
    const dataString = JSON.stringify(data)
    
    // Verificar tamanho (limite de ~5MB para localStorage)
    if (dataString.length > 5 * 1024 * 1024) {
      console.warn('⚠️ Dados muito grandes, salvando versão reduzida...')
      
      // Versão reduzida sem fotos em base64
      const reducedData = {
        ...data,
        photos: data.photos?.map((photo: any) => ({
          id: photo.id,
          // Manter apenas metadados, remover src base64
          width: photo.width,
          height: photo.height,
          favorite: photo.favorite,
          aiScore: photo.aiScore
        })) || [],
        pages: data.pages?.map((page: any) => ({
          ...page,
          elements: page.elements?.map((el: any) => ({
            ...el,
            src: el.src?.startsWith('data:') ? '[FOTO_BASE64_REMOVIDA]' : el.src
          })) || []
        })) || []
      }
      
      localStorage.setItem(key, JSON.stringify(reducedData))
      console.log('💾 Projeto salvo em versão reduzida (fotos removidas)')
      return true
    }
    
    localStorage.setItem(key, dataString)
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('❌ Quota do localStorage excedida')
      alert('⚠️ Espaço de armazenamento insuficiente. Algumas fotos podem não ser salvas.')
      
      // Tentar limpar dados antigos
      localStorage.removeItem('album-project-autosave')
      
      // Tentar salvar apenas estrutura
      try {
        const minimalData = {
          name: data.name,
          savedAt: data.savedAt,
          pageCount: data.pages?.length || 0,
          photoCount: data.photos?.length || 0
        }
        localStorage.setItem(key + '-minimal', JSON.stringify(minimalData))
        console.log('💾 Salvou apenas dados essenciais')
      } catch (e) {
        console.error('❌ Falha total no salvamento local')
      }
      
      return false
    } else {
      console.error('❌ Erro ao salvar no localStorage:', error)
      return false
    }
  }
}

const autoSave = () => {
  // Não salvar fotos no autosave para economizar espaço
  const projectData = {
    name: projectName.value,
    pages: pages.value.map(page => ({
      ...page,
      elements: page.elements.map(el => ({
        ...el,
        src: el.src?.startsWith('data:') ? '[AUTO_SAVE_SKIP]' : el.src
      }))
    })),
    photoCount: photos.value.length,
    savedAt: new Date().toISOString(),
    autoSaved: true
  }
  
  saveToLocalStorage('album-project-autosave', projectData)
}

// Confirmação ao sair
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (hasUnsavedChanges.value) {
    e.preventDefault()
    e.returnValue = 'Você tem alterações não salvas. Deseja sair?'
    return e.returnValue
  }
}

// Zoom com scroll
const handleWheel = (e: WheelEvent) => {
  if (e.ctrlKey) {
    e.preventDefault()
    if (e.deltaY < 0) {
      zoomIn()
    } else {
      zoomOut()
    }
  }
}

// Navigation
const prevPage = () => { if (currentPage.value > 0) currentPage.value-- }
const nextPage = () => { if (currentPage.value < totalSpreads.value) currentPage.value++ }
const goToPage = (idx: number) => { currentPage.value = idx }

// Zoom
const zoomIn = () => { if (zoom.value < 2.0) zoom.value = Math.round((zoom.value + 0.1) * 10) / 10 }
const zoomOut = () => { if (zoom.value > 0.3) zoom.value = Math.round((zoom.value - 0.1) * 10) / 10 }

// Photos
const photos = ref<{ id: string; src: string; width?: number; height?: number; assetId?: string; favorite?: boolean; aiScore?: number }[]>([])

// Filtros de fotos
const photoSearchQuery = ref('')
const photoFilter = ref('all')
const isDraggingFiles = ref(false)

// Computed para fotos filtradas
const filteredPhotos = computed(() => {
  let filtered = photos.value

  // Filtro por busca
  if (photoSearchQuery.value) {
    const query = photoSearchQuery.value.toLowerCase()
    filtered = filtered.filter(photo => 
      photo.id.toLowerCase().includes(query)
    )
  }

  // Filtro por tipo
  switch (photoFilter.value) {
    case 'unused':
      filtered = filtered.filter(photo => !usedPhotoSrcs.value.has(photo.src))
      break
    case 'favorites':
      filtered = filtered.filter(photo => photo.favorite)
      break
  }

  return filtered
})

// Handle upload com drag and drop
const handleUploadDrop = (e: DragEvent) => {
  isDraggingFiles.value = false
  const files = e.dataTransfer?.files
  if (files) {
    handleUpload(files)
  }
}

// Limpar todas as fotos
const clearAllPhotos = () => {
  if (confirm('🗑️ Remover todas as fotos?\n\nIsso não afetará as fotos já usadas no álbum.')) {
    photos.value = []
    saveToHistory()
  }
}

// Upload de fotos - usa backend quando disponível
const handleUpload = async (files: FileList | null) => {
  if (!files) return
  
  const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'))
  if (fileArray.length === 0) return
  
  // Se conectado ao backend, fazer upload para o servidor
  if (isConnectedToBackend.value) {
    console.log('📤 Fazendo upload de', fileArray.length, 'fotos para o backend...')
    
    const uploadedPhotos = await uploadPhotosToBackend(fileArray, (current, total) => {
      console.log(`📤 Upload: ${current}/${total}`)
    })
    
    uploadedPhotos.forEach(photo => {
      photos.value.push({
        id: photo.id,
        src: photo.src,
        width: photo.width,
        height: photo.height,
        assetId: photo.assetId,
      })
    })
    
    console.log('✅ Upload concluído:', uploadedPhotos.length, 'fotos')
  } else {
    // Fallback: usar base64 local
    console.log('📦 Usando upload local (base64)')
    
    for (const file of fileArray) {
      const reader = new FileReader()
      reader.onload = e => {
        const src = e.target?.result as string
        
        // Obter dimensões
        const img = new Image()
        img.onload = () => {
          photos.value.push({
            id: `ph${Date.now()}${Math.random()}`,
            src,
            width: img.naturalWidth,
            height: img.naturalHeight,
          })
        }
        img.src = src
      }
      reader.readAsDataURL(file)
    }
  }
}

const deletePhoto = (id: string) => { photos.value = photos.value.filter(p => p.id !== id) }

// Novas funções de fotos
const toggleFavorite = (photo: any) => {
  photo.favorite = !photo.favorite
}

const editPhoto = (photo: any) => {
  // TODO: Abrir editor de foto
  alert('Editor de foto em desenvolvimento')
}

const showPhotoMenu = (photo: any, event: MouseEvent) => {
  // TODO: Menu de contexto
  console.log('Menu de contexto para foto:', photo.id)
}

// Funções de IA
const autoFillAlbum = async () => {
  if (photos.value.length === 0) {
    alert('📷 Adicione fotos primeiro!')
    return
  }
  
  const unusedPhotos = photos.value.filter(p => !usedPhotoSrcs.value.has(p.src))
  
  if (unusedPhotos.length === 0) {
    alert('✅ Todas as fotos já foram usadas!')
    return
  }
  
  const confirmMsg = `🪄 Montar álbum automaticamente?\n\n` +
    `• ${unusedPhotos.length} fotos não usadas\n` +
    `• ${pages.value.length - 2} páginas disponíveis\n\n` +
    `As fotos serão distribuídas em layouts profissionais.`
  
  if (!confirm(confirmMsg)) return
  
  // Obter dimensões do álbum
  const albumWidth = productConfig.value?.width || 300 // mm
  const albumHeight = productConfig.value?.height || 300 // mm
  const aspectRatio = albumWidth / albumHeight
  
  // Determinar orientação do álbum
  const isLandscape = aspectRatio > 1.1
  const isPortrait = aspectRatio < 0.9
  const isSquare = !isLandscape && !isPortrait
  
  console.log(`📐 Formato do álbum: ${albumWidth}x${albumHeight}mm (ratio: ${aspectRatio.toFixed(2)}) - ${isLandscape ? 'Paisagem' : isPortrait ? 'Retrato' : 'Quadrado'}`)
  
  // Layouts adaptativos baseados no formato do álbum
  const getAdaptiveLayouts = () => {
    // Margem padrão
    const m = 5 // margem em %
    const gap = 3 // espaço entre fotos em %
    
    if (isLandscape) {
      // Álbum paisagem (ex: 30x20cm) - favorece fotos horizontais
      return [
        // 1 foto panorâmica no spread
        { name: '1 Panorâmica', slots: [{ page: 'left', x: 0, y: 10, w: 200, h: 80 }] },
        // 2 fotos lado a lado (horizontais)
        { name: '2 Horizontais', slots: [
          { page: 'left', x: m, y: 15, w: 90, h: 70 },
          { page: 'right', x: m, y: 15, w: 90, h: 70 }
        ]},
        // 3 fotos - 1 grande + 2 empilhadas
        { name: '1+2 Horizontal', slots: [
          { page: 'left', x: m, y: m, w: 90, h: 90 },
          { page: 'right', x: m, y: m, w: 90, h: 43 },
          { page: 'right', x: m, y: 52, w: 90, h: 43 }
        ]},
        // 4 fotos em linha
        { name: '4 em Linha', slots: [
          { page: 'left', x: m, y: 20, w: 43, h: 60 },
          { page: 'left', x: 52, y: 20, w: 43, h: 60 },
          { page: 'right', x: m, y: 20, w: 43, h: 60 },
          { page: 'right', x: 52, y: 20, w: 43, h: 60 }
        ]},
        // 2 fotos grandes
        { name: '2 Grandes', slots: [
          { page: 'left', x: m, y: m, w: 90, h: 90 },
          { page: 'right', x: m, y: m, w: 90, h: 90 }
        ]},
        // 5 fotos - 1 grande + 4 pequenas
        { name: '1+4 Mix', slots: [
          { page: 'left', x: m, y: m, w: 90, h: 90 },
          { page: 'right', x: m, y: m, w: 43, h: 43 },
          { page: 'right', x: 52, y: m, w: 43, h: 43 },
          { page: 'right', x: m, y: 52, w: 43, h: 43 },
          { page: 'right', x: 52, y: 52, w: 43, h: 43 }
        ]},
        // 3 horizontais empilhadas
        { name: '3 Faixas', slots: [
          { page: 'left', x: m, y: m, w: 90, h: 28 },
          { page: 'left', x: m, y: 36, w: 90, h: 28 },
          { page: 'left', x: m, y: 67, w: 90, h: 28 }
        ]},
        // 6 fotos grid 3x2
        { name: '6 Grid', slots: [
          { page: 'left', x: m, y: m, w: 28, h: 43 },
          { page: 'left', x: 36, y: m, w: 28, h: 43 },
          { page: 'left', x: 67, y: m, w: 28, h: 43 },
          { page: 'left', x: m, y: 52, w: 28, h: 43 },
          { page: 'left', x: 36, y: 52, w: 28, h: 43 },
          { page: 'left', x: 67, y: 52, w: 28, h: 43 }
        ]},
      ]
    } else if (isPortrait) {
      // Álbum retrato (ex: 20x30cm) - favorece fotos verticais
      return [
        // 1 foto vertical grande
        { name: '1 Vertical', slots: [{ page: 'left', x: 10, y: 0, w: 180, h: 100 }] },
        // 2 fotos verticais lado a lado
        { name: '2 Verticais', slots: [
          { page: 'left', x: m, y: m, w: 90, h: 90 },
          { page: 'right', x: m, y: m, w: 90, h: 90 }
        ]},
        // 3 fotos - 2 em cima + 1 embaixo
        { name: '2+1 Vertical', slots: [
          { page: 'left', x: m, y: m, w: 43, h: 55 },
          { page: 'left', x: 52, y: m, w: 43, h: 55 },
          { page: 'left', x: m, y: 63, w: 90, h: 32 }
        ]},
        // 4 fotos em coluna
        { name: '4 Coluna', slots: [
          { page: 'left', x: 15, y: m, w: 70, h: 21 },
          { page: 'left', x: 15, y: 29, w: 70, h: 21 },
          { page: 'left', x: 15, y: 53, w: 70, h: 21 },
          { page: 'left', x: 15, y: 77, w: 70, h: 21 }
        ]},
        // 2 grandes verticais
        { name: '2 Grandes V', slots: [
          { page: 'left', x: m, y: m, w: 90, h: 90 },
          { page: 'right', x: m, y: m, w: 90, h: 90 }
        ]},
        // 5 fotos - 1 grande + 4 pequenas
        { name: '1+4 Vertical', slots: [
          { page: 'left', x: m, y: m, w: 90, h: 90 },
          { page: 'right', x: m, y: m, w: 43, h: 43 },
          { page: 'right', x: 52, y: m, w: 43, h: 43 },
          { page: 'right', x: m, y: 52, w: 43, h: 43 },
          { page: 'right', x: 52, y: 52, w: 43, h: 43 }
        ]},
        // 3 verticais lado a lado
        { name: '3 Colunas', slots: [
          { page: 'left', x: m, y: m, w: 28, h: 90 },
          { page: 'left', x: 36, y: m, w: 28, h: 90 },
          { page: 'left', x: 67, y: m, w: 28, h: 90 }
        ]},
        // 6 fotos grid 2x3
        { name: '6 Grid V', slots: [
          { page: 'left', x: m, y: m, w: 43, h: 28 },
          { page: 'left', x: 52, y: m, w: 43, h: 28 },
          { page: 'left', x: m, y: 36, w: 43, h: 28 },
          { page: 'left', x: 52, y: 36, w: 43, h: 28 },
          { page: 'left', x: m, y: 67, w: 43, h: 28 },
          { page: 'left', x: 52, y: 67, w: 43, h: 28 }
        ]},
      ]
    } else {
      // Álbum quadrado (ex: 30x30cm) - layouts balanceados
      return [
        // 1 foto grande centralizada
        { name: '1 Grande', slots: [{ page: 'left', x: 0, y: 0, w: 200, h: 100 }] },
        // 2 fotos lado a lado
        { name: '2 Lado a Lado', slots: [
          { page: 'left', x: m, y: m, w: 90, h: 90 },
          { page: 'right', x: m, y: m, w: 90, h: 90 }
        ]},
        // 3 fotos - 1 grande + 2 pequenas
        { name: '1+2', slots: [
          { page: 'left', x: m, y: m, w: 90, h: 90 },
          { page: 'right', x: m, y: m, w: 90, h: 43 },
          { page: 'right', x: m, y: 52, w: 90, h: 43 }
        ]},
        // 4 fotos em grid perfeito
        { name: '4 Grid', slots: [
          { page: 'left', x: m, y: m, w: 43, h: 43 },
          { page: 'left', x: 52, y: m, w: 43, h: 43 },
          { page: 'left', x: m, y: 52, w: 43, h: 43 },
          { page: 'left', x: 52, y: 52, w: 43, h: 43 }
        ]},
        // 2 fotos grandes
        { name: '2 Grandes', slots: [
          { page: 'left', x: m, y: m, w: 90, h: 90 },
          { page: 'right', x: m, y: m, w: 90, h: 90 }
        ]},
        // 3 fotos horizontais
        { name: '3 Empilhadas', slots: [
          { page: 'left', x: m, y: m, w: 90, h: 28 },
          { page: 'left', x: m, y: 36, w: 90, h: 28 },
          { page: 'left', x: m, y: 67, w: 90, h: 28 }
        ]},
        // 5 fotos - 1 grande + 4 pequenas
        { name: '1+4', slots: [
          { page: 'left', x: m, y: m, w: 90, h: 90 },
          { page: 'right', x: m, y: m, w: 43, h: 43 },
          { page: 'right', x: 52, y: m, w: 43, h: 43 },
          { page: 'right', x: m, y: 52, w: 43, h: 43 },
          { page: 'right', x: 52, y: 52, w: 43, h: 43 }
        ]},
        // 6 fotos em grid 3x2
        { name: '6 Grid', slots: [
          { page: 'left', x: m, y: m, w: 28, h: 43 },
          { page: 'left', x: 36, y: m, w: 28, h: 43 },
          { page: 'left', x: 67, y: m, w: 28, h: 43 },
          { page: 'left', x: m, y: 52, w: 28, h: 43 },
          { page: 'left', x: 36, y: 52, w: 28, h: 43 },
          { page: 'left', x: 67, y: 52, w: 28, h: 43 }
        ]},
        // 9 fotos em grid 3x3
        { name: '9 Grid', slots: [
          { page: 'left', x: m, y: m, w: 28, h: 28 },
          { page: 'left', x: 36, y: m, w: 28, h: 28 },
          { page: 'left', x: 67, y: m, w: 28, h: 28 },
          { page: 'left', x: m, y: 36, w: 28, h: 28 },
          { page: 'left', x: 36, y: 36, w: 28, h: 28 },
          { page: 'left', x: 67, y: 36, w: 28, h: 28 },
          { page: 'left', x: m, y: 67, w: 28, h: 28 },
          { page: 'left', x: 36, y: 67, w: 28, h: 28 },
          { page: 'left', x: 67, y: 67, w: 28, h: 28 }
        ]},
      ]
    }
  }
  
  const spreadLayouts = getAdaptiveLayouts()
  
  let photoIndex = 0
  const photosToUse = [...unusedPhotos]
  
  // Embaralhar layouts para variedade
  const shuffledLayouts = [...spreadLayouts].sort(() => Math.random() - 0.5)
  
  // Iterar pelos spreads (páginas 2 em diante, de 2 em 2)
  for (let spreadIdx = 0; spreadIdx < totalSpreads.value && photoIndex < photosToUse.length; spreadIdx++) {
    const leftPageIdx = 2 + spreadIdx * 2
    const rightPageIdx = leftPageIdx + 1
    
    // Pular se as páginas já têm elementos
    const leftPage = pages.value[leftPageIdx]
    const rightPage = pages.value[rightPageIdx]
    
    if (leftPage?.elements?.length > 0 || rightPage?.elements?.length > 0) {
      continue
    }
    
    // Escolher layout baseado em quantas fotos restam
    const remainingPhotos = photosToUse.length - photoIndex
    const suitableLayouts = shuffledLayouts.filter(l => l.slots.length <= remainingPhotos)
    
    if (suitableLayouts.length === 0) break
    
    // Escolher layout aleatório dos adequados
    const layout = suitableLayouts[Math.floor(Math.random() * suitableLayouts.length)]
    
    // Aplicar fotos nos slots do layout
    for (const slot of layout.slots) {
      if (photoIndex >= photosToUse.length) break
      
      const photo = photosToUse[photoIndex]
      const targetPageIdx = slot.page === 'left' ? leftPageIdx : rightPageIdx
      const targetPage = pages.value[targetPageIdx]
      
      if (!targetPage) continue
      
      // Converter porcentagem para pixels
      const pw = pageWidth.value
      const ph = pageHeight.value
      
      // Criar elemento de imagem com dimensões em pixels
      const newElement = {
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'image',
        src: photo.src,
        x: Math.round((slot.x / 100) * pw),
        y: Math.round((slot.y / 100) * ph),
        width: Math.round((slot.w / 100) * pw),
        height: Math.round((slot.h / 100) * ph),
        rotation: 0,
        opacity: 1,
        locked: false,
        assetId: photo.assetId
      }
      
      targetPage.elements.push(newElement)
      photoIndex++
    }
  }
  
  // Forçar atualização
  pages.value = [...pages.value]
  
  const usedCount = photoIndex
  const remainingCount = photosToUse.length - photoIndex
  const formatName = isLandscape ? 'paisagem' : isPortrait ? 'retrato' : 'quadrado'
  
  if (remainingCount > 0) {
    alert(`✅ Álbum montado!\n\n` +
      `• ${usedCount} fotos distribuídas\n` +
      `• ${remainingCount} fotos restantes\n` +
      `• Layouts otimizados para formato ${formatName}\n\n` +
      `Adicione mais páginas para usar todas as fotos.`)
  } else {
    alert(`✅ Álbum montado com sucesso!\n\n` +
      `• ${usedCount} fotos distribuídas em layouts profissionais\n` +
      `• Layouts otimizados para formato ${formatName}`)
  }
  
  // Salvar
  saveProject()
}

const autoSelectBestPhotos = async () => {
  if (photos.value.length === 0) return
  
  // Simular análise de IA
  alert('🤖 Analisando fotos com IA...')
  
  // Simular scores de IA
  photos.value.forEach(photo => {
    photo.aiScore = Math.floor(Math.random() * 40) + 60 // 60-100%
  })
  
  // Marcar as melhores como favoritas
  const bestPhotos = photos.value
    .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
    .slice(0, Math.min(10, Math.floor(photos.value.length * 0.3)))
  
  bestPhotos.forEach(photo => photo.favorite = true)
  
  alert(`✨ ${bestPhotos.length} melhores fotos selecionadas!`)
}

const autoOrganizePhotos = async () => {
  if (photos.value.length === 0) return
  alert('🎯 Organizando fotos por evento... (em desenvolvimento)')
}

const enhancePhotos = async () => {
  if (photos.value.length === 0) return
  alert('🎨 Melhorando qualidade das fotos... (em desenvolvimento)')
}

// Importação de fontes externas
const importFromLightroom = () => {
  alert('📸 Importação do Lightroom em desenvolvimento')
}

const importFromCloud = () => {
  alert('☁️ Importação do Google Drive em desenvolvimento')
}

// Drag photo to canvas
const onPhotoStart = (e: DragEvent, photo: any) => {
  draggingPhoto.value = photo
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.dropEffect = 'copy'
    e.dataTransfer.setData('text/plain', photo.id)
    e.dataTransfer.setData('application/json', JSON.stringify(photo))
    // Criar imagem de arraste
    const img = new Image()
    img.src = photo.src
    e.dataTransfer.setDragImage(img, 50, 50)
  }
}
const onPhotoEnd = () => { draggingPhoto.value = null; dropSide.value = null; dragOverElement.value = null }
const onDragOver = (side: string, e?: DragEvent) => {
  console.log('👆 onDragOver:', side)
  if (e && e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
  dropSide.value = side
}
const onDragLeave = (e: DragEvent) => { 
  // Só limpa se realmente saiu da área
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
    dropSide.value = null 
  }
}

// Drag sobre elementos (placeholders de layout)
const onElementDragOver = (e: DragEvent, el: Element, side: string) => {
  console.log('🔄 onElementDragOver:', { elementId: el.id, side })
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
  dragOverElement.value = el.id
  dropSide.value = side
}
const onElementDragLeave = () => {
  dragOverElement.value = null
}
const onElementDrop = (e: DragEvent, el: Element, side: string) => {
  console.log('🎯 onElementDrop chamado:', { elementId: el.id, side, elementWidth: el.width, elementHeight: el.height })
  e.preventDefault()
  e.stopPropagation()
  dragOverElement.value = null
  dropSide.value = null
  
  let photo = draggingPhoto.value
  if (!photo && e.dataTransfer) {
    try {
      const jsonData = e.dataTransfer.getData('application/json')
      if (jsonData) {
        photo = JSON.parse(jsonData)
      }
    } catch (err) {
      console.error('Erro ao parsear dados:', err)
    }
  }
  
  if (!photo || !photo.src) {
    console.log('❌ Sem foto para adicionar')
    return
  }
  
  console.log('📷 Foto:', { src: photo.src?.substring(0, 50), width: photo.width, height: photo.height })
  
  // Atualiza o elemento existente com a nova imagem
  el.src = photo.src
  
  // Guardar dimensões originais da foto para referência
  if (photo.width && photo.height) {
    el.originalWidth = photo.width
    el.originalHeight = photo.height
  }
  
  // Resetar qualquer crop anterior - deixar o CSS object-fit: cover fazer o trabalho
  el.cropX = 0
  el.cropY = 0
  el.cropScale = 1
  
  console.log('✅ Elemento atualizado:', { id: el.id, src: el.src?.substring(0, 50), width: el.width, height: el.height })
  
  // Se for fullCover, sincronizar com todos os elementos correspondentes (contracapa, lombada, capa)
  if (el.isFullCover && el.fullCoverIndex !== undefined) {
    const allPages = ['cover-front', 'cover-back', 'spine']
    allPages.forEach(pageType => {
      const page = pages.value.find(p => p.type === pageType)
      if (page) {
        page.elements.forEach(other => {
          if (other.id !== el.id && other.isFullCover && other.fullCoverIndex === el.fullCoverIndex) {
            other.src = photo.src
            if (photo.width && photo.height) {
              other.originalWidth = photo.width
              other.originalHeight = photo.height
            }
            other.cropX = 0
            other.cropY = 0
            other.cropScale = 1
            console.log('📐 Sincronizado com elemento:', other.id)
          }
        })
      }
    })
  }
  
  // Validar DPI se tiver dimensões da imagem
  if (photo.width && photo.height && el.width && el.height) {
    const dpiResult = validateImageDpi(
      el.id,
      photo.width,
      photo.height,
      el.width,
      el.height
    )
    
    // Mostrar aviso se qualidade for baixa
    if (dpiResult.quality === 'low' || dpiResult.quality === 'very_low') {
      console.warn(`⚠️ DPI baixo para elemento ${el.id}:`, dpiResult.message)
    }
  }
  
  draggingPhoto.value = null
  saveToHistory()
}

// Drop na capa (front ou back)
const onDropCover = (e: DragEvent, side: 'front' | 'back') => {
  console.log('🎯 onDropCover chamado, side:', side)
  e.preventDefault()
  e.stopPropagation()
  dropSide.value = null
  
  let photo = draggingPhoto.value
  console.log('📷 draggingPhoto:', photo)
  
  if (!photo && e.dataTransfer) {
    try {
      const jsonData = e.dataTransfer.getData('application/json')
      console.log('📦 jsonData:', jsonData)
      if (jsonData) {
        photo = JSON.parse(jsonData)
      }
    } catch (err) {
      console.error('Erro ao parsear dados:', err)
    }
  }
  
  if (!photo || !photo.src) {
    console.log('❌ Sem foto para adicionar')
    return
  }
  
  const page = pages.value.find(p => p.type === (side === 'front' ? 'cover-front' : 'cover-back'))
  if (!page) {
    console.log('❌ Página não encontrada')
    return
  }
  
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const dropX = (e.clientX - rect.left) / zoom.value
  const dropY = (e.clientY - rect.top) / zoom.value
  
  // Verificar se há um elemento vazio (placeholder de layout) no ponto de drop
  const emptyElement = page.elements.find(el => {
    if (el.type !== 'image' || el.src) return false
    // Verificar se o ponto de drop está dentro do elemento
    return dropX >= el.x && dropX <= el.x + el.width &&
           dropY >= el.y && dropY <= el.y + el.height
  })
  
  if (emptyElement) {
    // Preencher o placeholder existente
    console.log('📐 Preenchendo placeholder existente:', emptyElement.id)
    emptyElement.src = photo.src
    
    // Se for fullCover, também preencher o elemento correspondente na outra capa
    if (emptyElement.isFullCover) {
      const otherPage = pages.value.find(p => p.type === (side === 'front' ? 'cover-back' : 'cover-front'))
      if (otherPage) {
        // Usar fullCoverIndex para encontrar o elemento correspondente
        const otherEmpty = otherPage.elements.find(el => 
          el.type === 'image' && 
          !el.src && 
          el.isFullCover && 
          el.fullCoverIndex === emptyElement.fullCoverIndex
        )
        if (otherEmpty) {
          otherEmpty.src = photo.src
          console.log('📐 Também preenchido na outra capa:', otherEmpty.id)
        }
      }
    }
    
    draggingPhoto.value = null
    saveToHistory()
    console.log('✅ Placeholder preenchido com foto')
    return
  }
  
  // Se não há placeholder, verificar se há algum elemento vazio na página
  const anyEmptyElement = page.elements.find(el => el.type === 'image' && !el.src)
  if (anyEmptyElement) {
    console.log('📐 Preenchendo primeiro placeholder vazio:', anyEmptyElement.id)
    anyEmptyElement.src = photo.src
    
    // Se for fullCover, também preencher na outra capa
    if (anyEmptyElement.isFullCover) {
      const otherPage = pages.value.find(p => p.type === (side === 'front' ? 'cover-back' : 'cover-front'))
      if (otherPage) {
        const otherEmpty = otherPage.elements.find(el => 
          el.type === 'image' && 
          !el.src && 
          el.isFullCover && 
          el.fullCoverIndex === anyEmptyElement.fullCoverIndex
        )
        if (otherEmpty) {
          otherEmpty.src = photo.src
        }
      }
    }
    
    draggingPhoto.value = null
    saveToHistory()
    return
  }
  
  // Tamanho padrão da foto (50% da página)
  const pw = pageWidth.value
  const ph = pageHeight.value
  const defaultWidth = Math.min(180, pw * 0.5)
  const defaultHeight = Math.min(130, ph * 0.4)
  
  // Centralizar no ponto de drop, mas manter dentro da página
  let x = Math.max(0, dropX - defaultWidth / 2)
  let y = Math.max(0, dropY - defaultHeight / 2)
  
  // Garantir que não ultrapasse os limites da página
  x = Math.min(x, pw - defaultWidth)
  y = Math.min(y, ph - defaultHeight)
  
  page.elements.push({
    id: `el${Date.now()}`,
    type: 'image',
    src: photo.src,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(defaultWidth),
    height: Math.round(defaultHeight)
  })
  draggingPhoto.value = null
  saveToHistory()
  console.log('✅ Foto adicionada à', side, 'tamanho:', defaultWidth, 'x', defaultHeight)
}

const onDrop = (e: DragEvent, side: string) => {
  e.preventDefault()
  e.stopPropagation()
  dropSide.value = null
  
  // Tentar recuperar foto do dataTransfer se draggingPhoto estiver null
  let photo = draggingPhoto.value
  if (!photo && e.dataTransfer) {
    try {
      const jsonData = e.dataTransfer.getData('application/json')
      if (jsonData) {
        photo = JSON.parse(jsonData)
      }
    } catch (err) {
      console.error('Erro ao parsear dados:', err)
    }
  }
  
  if (!photo || !photo.src) return
  
  // Calcula o índice da página no miolo (+3 para pular cover-front, spine e cover-back)
  const pageIdx = 3 + currentSpreadIndex.value * 2 + (side === 'left' ? 0 : 1)
  const page = pages.value[pageIdx]
  if (!page) return
  
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = Math.max(10, (e.clientX - rect.left) / zoom.value - 90)
  const y = Math.max(10, (e.clientY - rect.top) / zoom.value - 65)
  
  page.elements.push({
    id: `el${Date.now()}`,
    type: 'image',
    src: photo.src,
    x: Math.round(x),
    y: Math.round(y),
    width: 180,
    height: 130
  })
  draggingPhoto.value = null
  saveToHistory()
}

// Drop no spread inteiro (para fotos que atravessam as duas páginas - layflat)
const onDropSpread = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  dropSide.value = null
  
  console.log('🎯 onDropSpread chamado')
  
  let photo = draggingPhoto.value
  if (!photo && e.dataTransfer) {
    try {
      const jsonData = e.dataTransfer.getData('application/json')
      if (jsonData) {
        photo = JSON.parse(jsonData)
        console.log('📷 Foto do dataTransfer:', photo)
      }
    } catch (err) {
      console.error('Erro ao parsear dados:', err)
    }
  }
  
  if (!photo || !photo.src) {
    console.log('❌ Sem foto para adicionar')
    return
  }
  
  // Spread elements são armazenados na página esquerda
  const leftIdx = 3 + currentSpreadIndex.value * 2
  const page = pages.value[leftIdx]
  if (!page) {
    console.log('❌ Página não encontrada')
    return
  }
  
  // Criar elemento que atravessa as duas páginas
  // Largura padrão = 80% do spread (duas páginas)
  const spreadWidth = pageWidth.value * 2
  const defaultWidth = spreadWidth * 0.8
  const defaultHeight = pageHeight.value * 0.6
  
  // Centralizar no spread
  const centerX = (spreadWidth - defaultWidth) / 2
  const centerY = (pageHeight.value - defaultHeight) / 2
  
  const newElement = {
    id: `spread${Date.now()}`,
    type: 'image',
    src: photo.src,
    x: Math.round(centerX),
    y: Math.round(centerY),
    width: Math.round(defaultWidth),
    height: Math.round(defaultHeight),
    isSpreadElement: true
  }
  
  page.elements.push(newElement)
  draggingPhoto.value = null
  saveToHistory()
  console.log('✅ Foto adicionada ao spread:', newElement)
}

// Estilo para elementos do spread (atravessam as duas páginas)
const getSpreadElementStyle = (el: Element) => {
  const style: any = {
    position: 'absolute',
    left: `${el.x}px`,
    top: `${el.y}px`,
    width: `${el.width}px`,
    height: `${el.height}px`,
    zIndex: 10,
    pointerEvents: 'auto'
  }
  if (el.rotation) {
    style.transform = `rotate(${el.rotation}deg)`
  }
  return style
}

// Selection
const clearSelection = () => { selected.value = null }
const selectElement = (el: Element, side: string) => {
  // Buscar a referência real do elemento nas páginas
  for (const page of pages.value) {
    const found = page.elements.find(e => e.id === el.id)
    if (found) {
      selected.value = found
      break
    }
  }
  if (side === 'left' || side === 'right') {
    activeSide.value = side as 'left' | 'right'
  }
}

// Drag element
let dragStartX = 0, dragStartY = 0, elStartX = 0, elStartY = 0
let isDragging = false
const startDrag = (e: MouseEvent, el: Element, side: string) => {
  selectElement(el, side)
  if (el.locked) return // Não permite arrastar elementos bloqueados
  dragStartX = e.clientX
  dragStartY = e.clientY
  elStartX = el.x
  elStartY = el.y
  isDragging = false
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', endDrag)
}

// Calcular guias inteligentes
const calculateSmartGuides = (el: Element) => {
  const guides: { type: 'h' | 'v'; pos: number }[] = []
  const SNAP_THRESHOLD = 8
  
  // Centro da página
  const centerX = PAGE_W / 2
  const centerY = PAGE_H / 2
  
  // Posições do elemento
  const elCenterX = el.x + el.width / 2
  const elCenterY = el.y + el.height / 2
  const elRight = el.x + el.width
  const elBottom = el.y + el.height
  
  // Guias de centro
  if (Math.abs(elCenterX - centerX) < SNAP_THRESHOLD) {
    guides.push({ type: 'v', pos: centerX })
    if (snapToGrid.value) el.x = centerX - el.width / 2
  }
  if (Math.abs(elCenterY - centerY) < SNAP_THRESHOLD) {
    guides.push({ type: 'h', pos: centerY })
    if (snapToGrid.value) el.y = centerY - el.height / 2
  }
  
  // Guias de borda
  if (Math.abs(el.x) < SNAP_THRESHOLD) {
    guides.push({ type: 'v', pos: 0 })
    if (snapToGrid.value) el.x = 0
  }
  if (Math.abs(elRight - PAGE_W) < SNAP_THRESHOLD) {
    guides.push({ type: 'v', pos: PAGE_W })
    if (snapToGrid.value) el.x = PAGE_W - el.width
  }
  if (Math.abs(el.y) < SNAP_THRESHOLD) {
    guides.push({ type: 'h', pos: 0 })
    if (snapToGrid.value) el.y = 0
  }
  if (Math.abs(elBottom - PAGE_H) < SNAP_THRESHOLD) {
    guides.push({ type: 'h', pos: PAGE_H })
    if (snapToGrid.value) el.y = PAGE_H - el.height
  }
  
  // Guias de alinhamento com outros elementos
  const page = getCurrentPage()
  if (page) {
    for (const other of page.elements) {
      if (other.id === el.id) continue
      
      const otherCenterX = other.x + other.width / 2
      const otherCenterY = other.y + other.height / 2
      const otherRight = other.x + other.width
      const otherBottom = other.y + other.height
      
      // Alinhamento horizontal
      if (Math.abs(el.x - other.x) < SNAP_THRESHOLD) {
        guides.push({ type: 'v', pos: other.x })
        if (snapToGrid.value) el.x = other.x
      }
      if (Math.abs(elRight - otherRight) < SNAP_THRESHOLD) {
        guides.push({ type: 'v', pos: otherRight })
        if (snapToGrid.value) el.x = otherRight - el.width
      }
      if (Math.abs(elCenterX - otherCenterX) < SNAP_THRESHOLD) {
        guides.push({ type: 'v', pos: otherCenterX })
        if (snapToGrid.value) el.x = otherCenterX - el.width / 2
      }
      
      // Alinhamento vertical
      if (Math.abs(el.y - other.y) < SNAP_THRESHOLD) {
        guides.push({ type: 'h', pos: other.y })
        if (snapToGrid.value) el.y = other.y
      }
      if (Math.abs(elBottom - otherBottom) < SNAP_THRESHOLD) {
        guides.push({ type: 'h', pos: otherBottom })
        if (snapToGrid.value) el.y = otherBottom - el.height
      }
      if (Math.abs(elCenterY - otherCenterY) < SNAP_THRESHOLD) {
        guides.push({ type: 'h', pos: otherCenterY })
        if (snapToGrid.value) el.y = otherCenterY - el.height / 2
      }
    }
  }
  
  return guides
}

const onDrag = (e: MouseEvent) => {
  if (!selected.value || selected.value.locked) return
  const dx = e.clientX - dragStartX
  const dy = e.clientY - dragStartY
  // Só começa a arrastar se moveu mais de 3px
  if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
    isDragging = true
  }
  if (isDragging) {
    // Determinar limites baseado no tipo de elemento
    const maxPageWidth = selected.value.isSpreadElement ? pageWidth.value * 2 : pageWidth.value
    const maxPageHeight = pageHeight.value
    
    let newX = Math.round(elStartX + dx / zoom.value)
    let newY = Math.round(elStartY + dy / zoom.value)
    
    // Limitar para não sair da página
    newX = Math.max(0, Math.min(newX, maxPageWidth - selected.value.width))
    newY = Math.max(0, Math.min(newY, maxPageHeight - selected.value.height))
    
    selected.value.x = newX
    selected.value.y = newY
    
    // Calcular e mostrar guias inteligentes
    if (showSmartGuides.value) {
      smartGuides.value = calculateSmartGuides(selected.value)
    }
  }
}
const endDrag = () => {
  if (isDragging) {
    saveToHistory()
  }
  isDragging = false
  smartGuides.value = [] // Limpar guias
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', endDrag)
}

// Resize
let resizeStartX = 0, resizeStartY = 0, startW = 0, startH = 0
let resizeElement: Element | null = null
let resizePageWidth = 0, resizePageHeight = 0

const startResize = (e: MouseEvent, el: Element) => {
  // Garantir que estamos usando a referência correta
  selectElement(el, '')
  if (!selected.value) return
  resizeStartX = e.clientX
  resizeStartY = e.clientY
  startW = selected.value.width
  startH = selected.value.height
  resizeElement = selected.value
  
  // Determinar o tamanho máximo baseado no tipo de página
  if (resizeElement.isSpreadElement) {
    // Spread elements podem ocupar as duas páginas
    resizePageWidth = pageWidth.value * 2
    resizePageHeight = pageHeight.value
  } else {
    resizePageWidth = pageWidth.value
    resizePageHeight = pageHeight.value
  }
  
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', endResize)
}
const onResize = (e: MouseEvent) => {
  if (!selected.value) return
  
  const deltaX = (e.clientX - resizeStartX) / zoom.value
  const deltaY = (e.clientY - resizeStartY) / zoom.value
  
  let newWidth = Math.round(startW + deltaX)
  let newHeight = Math.round(startH + deltaY)
  
  // Tamanho mínimo
  newWidth = Math.max(50, newWidth)
  newHeight = Math.max(50, newHeight)
  
  // Tamanho máximo (não pode ultrapassar a página)
  const maxWidth = resizePageWidth - selected.value.x
  const maxHeight = resizePageHeight - selected.value.y
  
  newWidth = Math.min(newWidth, maxWidth)
  newHeight = Math.min(newHeight, maxHeight)
  
  selected.value.width = newWidth
  selected.value.height = newHeight
  
  // Calcular guias durante resize também
  if (showSmartGuides.value) {
    smartGuides.value = calculateSmartGuides(selected.value)
  }
}
const endResize = () => {
  saveToHistory()
  smartGuides.value = [] // Limpar guias
  resizeElement = null
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', endResize)
}

// Delete
const deleteElement = () => {
  if (!selected.value) return
  pages.value.forEach(p => { p.elements = p.elements.filter(el => el.id !== selected.value.id) })
  selected.value = null
  saveToHistory()
}

// Funções de edição avançada
const clampPosition = () => {
  if (!selected.value) return
  selected.value.x = Math.max(0, Math.min(PAGE_W - selected.value.width, selected.value.x))
  selected.value.y = Math.max(0, Math.min(PAGE_H - selected.value.height, selected.value.y))
}

const clampSize = () => {
  if (!selected.value) return
  selected.value.width = Math.max(20, selected.value.width)
  selected.value.height = Math.max(20, selected.value.height)
}

const fitToPage = () => {
  if (!selected.value) return
  selected.value.x = 0
  selected.value.y = 0
  selected.value.width = PAGE_W
  selected.value.height = PAGE_H
}

const removeImage = () => {
  if (!selected.value || selected.value.type !== 'image') return
  selected.value.src = ''
}

const replaceImage = () => {
  if (!selected.value || selected.value.type !== 'image') return
  // Abre o seletor de arquivos
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e: any) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (selected.value) {
        selected.value.src = ev.target?.result as string
      }
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

// Crop de imagem
const openCropModal = () => {
  if (!selected.value || selected.value.type !== 'image' || !selected.value.src) return
  cropElement.value = { ...selected.value }
  cropData.value = {
    x: selected.value.cropX || 0,
    y: selected.value.cropY || 0,
    width: selected.value.cropWidth || 100,
    height: selected.value.cropHeight || 100,
    scale: selected.value.cropScale || 1
  }
  showCropModal.value = true
}

const applyCrop = () => {
  if (!selected.value || !cropElement.value) return
  selected.value.cropX = cropData.value.x
  selected.value.cropY = cropData.value.y
  selected.value.cropWidth = cropData.value.width
  selected.value.cropHeight = cropData.value.height
  selected.value.cropScale = cropData.value.scale
  showCropModal.value = false
  cropElement.value = null
  saveToHistory()
}

const cancelCrop = () => {
  showCropModal.value = false
  cropElement.value = null
}

const toggleBold = () => {
  if (!selected.value || selected.value.type !== 'text') return
  selected.value.fontWeight = selected.value.fontWeight === 'bold' ? 'normal' : 'bold'
}

const toggleItalic = () => {
  if (!selected.value || selected.value.type !== 'text') return
  selected.value.fontStyle = selected.value.fontStyle === 'italic' ? 'normal' : 'italic'
}

const bringForward = () => {
  if (!selected.value) return
  const page = findPageWithElement(selected.value.id)
  if (!page) return
  const idx = page.elements.findIndex(el => el.id === selected.value.id)
  if (idx < page.elements.length - 1) {
    const temp = page.elements[idx]
    page.elements[idx] = page.elements[idx + 1]
    page.elements[idx + 1] = temp
  }
}

const sendBackward = () => {
  if (!selected.value) return
  const page = findPageWithElement(selected.value.id)
  if (!page) return
  const idx = page.elements.findIndex(el => el.id === selected.value.id)
  if (idx > 0) {
    const temp = page.elements[idx]
    page.elements[idx] = page.elements[idx - 1]
    page.elements[idx - 1] = temp
  }
}

const duplicateElement = () => {
  if (!selected.value) return
  const page = findPageWithElement(selected.value.id)
  if (!page) return
  const newEl = { 
    ...selected.value, 
    id: `el${Date.now()}`,
    x: selected.value.x + 20,
    y: selected.value.y + 20
  }
  page.elements.push(newEl)
  selected.value = newEl
}

const findPageWithElement = (elId: string): Page | undefined => {
  return pages.value.find(p => p.elements.some(el => el.id === elId))
}

// Text
const fonts = [
  'Georgia', 'Arial', 'Times New Roman', 'Verdana', 'Playfair Display',
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Dancing Script', 'Pacifico', 'Great Vibes', 'Lobster', 'Satisfy',
  'Merriweather', 'Libre Baskerville', 'Cormorant Garamond'
]
const addText = (type: string) => {
  const configs: any = {
    title: { content: 'Título', fontSize: 32, fontFamily: 'Georgia' },
    subtitle: { content: 'Subtítulo', fontSize: 20, fontFamily: 'Georgia' },
    body: { content: 'Seu texto aqui...', fontSize: 14, fontFamily: 'Arial' }
  }
  const cfg = configs[type]
  
  let page: Page | undefined
  if (isCoverView.value) {
    // Na capa: left = contracapa, right = capa frontal
    page = pages.value.find(p => p.type === (activeSide.value === 'right' ? 'cover-front' : 'cover-back'))
  } else {
    const pageIdx = 3 + currentSpreadIndex.value * 2 + (activeSide.value === 'right' ? 1 : 0)
    page = pages.value[pageIdx]
  }
  
  if (page) {
    page.elements.push({
      id: `txt${Date.now()}`, type: 'text', x: 30, y: 30, width: 200, height: 50,
      content: cfg.content, fontSize: cfg.fontSize, fontFamily: cfg.fontFamily, color: '#2D2A26'
    })
    saveToHistory()
  }
}
const editText = (el: Element) => { editingId.value = el.id }
const stopEdit = () => { 
  editingId.value = null
  saveToHistory()
}

// Definir cor de fundo da lombada
const setSpineBackground = (color: string) => {
  const spine = pages.value.find(p => p.type === 'spine')
  if (spine) {
    spine.background = color
    saveToHistory()
  }
}

// Adicionar texto na lombada
const addSpineText = () => {
  const spine = pages.value.find(p => p.type === 'spine')
  if (!spine) return
  
  const newText = {
    id: `txt-spine-${Date.now()}`,
    type: 'text',
    content: projectName.value || 'Meu Álbum',
    x: 10, // % da largura
    y: 10, // % da altura
    width: 80, // % da largura
    height: 80, // % da altura
    fontSize: 14,
    fontFamily: 'Georgia, serif',
    fontWeight: '700',
    color: '#4A4540',
    rotation: 0,
    opacity: 1,
    locked: false
  }
  
  spine.elements.push(newText)
  selected.value = newText
  activeSide.value = 'spine'
  saveToHistory()
}

// Detectar formato do álbum
const albumFormat = computed(() => {
  const w = productConfig.value?.width || 300
  const h = productConfig.value?.height || 300
  const ratio = w / h
  if (ratio > 1.15) return 'landscape' // Paisagem
  if (ratio < 0.85) return 'portrait'  // Retrato
  return 'square' // Quadrado
})

// Layouts de Capa - Adaptativos
const coverLayouts = computed(() => {
  const format = albumFormat.value
  
  // Layouts base que funcionam para todos os formatos
  const baseLayouts = [
    { id: 'c1', name: 'Foto Cheia', rects: [{ left: '0%', top: '0%', width: '100%', height: '100%' }] },
    { id: 'c2', name: 'Com Margem', rects: [{ left: '8%', top: '8%', width: '84%', height: '84%' }] },
  ]
  
  if (format === 'landscape') {
    // Layouts otimizados para paisagem (horizontal)
    return [
      ...baseLayouts,
      { id: 'c3', name: 'Centralizada', rects: [{ left: '10%', top: '5%', width: '80%', height: '90%' }] },
      { id: 'c4', name: 'Panorama', rects: [{ left: '5%', top: '15%', width: '90%', height: '70%' }] },
      { id: 'c5', name: '2 Horizontal', rects: [{ left: '3%', top: '8%', width: '46%', height: '84%' }, { left: '51%', top: '8%', width: '46%', height: '84%' }] },
      { id: 'c6', name: '3 Colunas', rects: [{ left: '3%', top: '8%', width: '30%', height: '84%' }, { left: '35%', top: '8%', width: '30%', height: '84%' }, { left: '67%', top: '8%', width: '30%', height: '84%' }] },
      { id: 'c7', name: 'Grande + 2', rects: [{ left: '3%', top: '5%', width: '60%', height: '90%' }, { left: '65%', top: '5%', width: '32%', height: '44%' }, { left: '65%', top: '51%', width: '32%', height: '44%' }] },
      { id: 'c8', name: 'Foto + Título', rects: [{ left: '5%', top: '5%', width: '90%', height: '75%' }] },
    ]
  } else if (format === 'portrait') {
    // Layouts otimizados para retrato (vertical)
    return [
      ...baseLayouts,
      { id: 'c3', name: 'Centralizada', rects: [{ left: '5%', top: '10%', width: '90%', height: '80%' }] },
      { id: 'c4', name: 'Retrato Central', rects: [{ left: '15%', top: '5%', width: '70%', height: '90%' }] },
      { id: 'c5', name: '2 Vertical', rects: [{ left: '8%', top: '3%', width: '84%', height: '46%' }, { left: '8%', top: '51%', width: '84%', height: '46%' }] },
      { id: 'c6', name: '3 Linhas', rects: [{ left: '8%', top: '3%', width: '84%', height: '30%' }, { left: '8%', top: '35%', width: '84%', height: '30%' }, { left: '8%', top: '67%', width: '84%', height: '30%' }] },
      { id: 'c7', name: 'Grande + 2', rects: [{ left: '5%', top: '3%', width: '90%', height: '60%' }, { left: '5%', top: '65%', width: '44%', height: '32%' }, { left: '51%', top: '65%', width: '44%', height: '32%' }] },
      { id: 'c8', name: 'Foto + Título', rects: [{ left: '10%', top: '5%', width: '80%', height: '70%' }] },
    ]
  } else {
    // Layouts para quadrado
    return [
      ...baseLayouts,
      { id: 'c3', name: 'Centralizada', rects: [{ left: '12%', top: '12%', width: '76%', height: '76%' }] },
      { id: 'c4', name: 'Círculo', rects: [{ left: '15%', top: '15%', width: '70%', height: '70%' }] },
      { id: 'c5', name: '2 Horizontal', rects: [{ left: '5%', top: '10%', width: '44%', height: '80%' }, { left: '51%', top: '10%', width: '44%', height: '80%' }] },
      { id: 'c6', name: '2 Vertical', rects: [{ left: '10%', top: '5%', width: '80%', height: '44%' }, { left: '10%', top: '51%', width: '80%', height: '44%' }] },
      { id: 'c7', name: '4 Grid', rects: [{ left: '5%', top: '5%', width: '44%', height: '44%' }, { left: '51%', top: '5%', width: '44%', height: '44%' }, { left: '5%', top: '51%', width: '44%', height: '44%' }, { left: '51%', top: '51%', width: '44%', height: '44%' }] },
      { id: 'c8', name: 'Foto + Título', rects: [{ left: '10%', top: '5%', width: '80%', height: '72%' }] },
    ]
  }
})

// Layouts de Página (Miolo) - Adaptativos
const pageLayouts = computed(() => {
  const format = albumFormat.value
  
  // Layouts base
  const baseLayouts = [
    { id: 'p1', name: 'Foto Cheia', rects: [{ left: '0%', top: '0%', width: '100%', height: '100%' }] },
    { id: 'p2', name: 'Com Margem', rects: [{ left: '5%', top: '5%', width: '90%', height: '90%' }] },
  ]
  
  if (format === 'landscape') {
    // Layouts para páginas paisagem
    return [
      ...baseLayouts,
      { id: 'p3', name: 'Centralizada', rects: [{ left: '8%', top: '3%', width: '84%', height: '94%' }] },
      { id: 'p4', name: '2 Colunas', rects: [{ left: '3%', top: '5%', width: '46%', height: '90%' }, { left: '51%', top: '5%', width: '46%', height: '90%' }] },
      { id: 'p5', name: '3 Colunas', rects: [{ left: '2%', top: '5%', width: '31%', height: '90%' }, { left: '35%', top: '5%', width: '30%', height: '90%' }, { left: '67%', top: '5%', width: '31%', height: '90%' }] },
      { id: 'p6', name: '2 Linhas', rects: [{ left: '5%', top: '3%', width: '90%', height: '46%' }, { left: '5%', top: '51%', width: '90%', height: '46%' }] },
      { id: 'p7', name: '4 Grid', rects: [{ left: '3%', top: '3%', width: '46%', height: '46%' }, { left: '51%', top: '3%', width: '46%', height: '46%' }, { left: '3%', top: '51%', width: '46%', height: '46%' }, { left: '51%', top: '51%', width: '46%', height: '46%' }] },
      { id: 'p8', name: '6 Grid', rects: [{ left: '2%', top: '3%', width: '31%', height: '46%' }, { left: '35%', top: '3%', width: '30%', height: '46%' }, { left: '67%', top: '3%', width: '31%', height: '46%' }, { left: '2%', top: '51%', width: '31%', height: '46%' }, { left: '35%', top: '51%', width: '30%', height: '46%' }, { left: '67%', top: '51%', width: '31%', height: '46%' }] },
      { id: 'p9', name: 'Grande + 2', rects: [{ left: '3%', top: '5%', width: '60%', height: '90%' }, { left: '65%', top: '5%', width: '32%', height: '44%' }, { left: '65%', top: '51%', width: '32%', height: '44%' }] },
      { id: 'p10', name: '2 + Grande', rects: [{ left: '3%', top: '5%', width: '32%', height: '44%' }, { left: '3%', top: '51%', width: '32%', height: '44%' }, { left: '37%', top: '5%', width: '60%', height: '90%' }] },
      { id: 'p11', name: 'Panorama', rects: [{ left: '0%', top: '20%', width: '100%', height: '60%' }] },
      { id: 'p12', name: '1 + 3 Abaixo', rects: [{ left: '3%', top: '3%', width: '94%', height: '60%' }, { left: '3%', top: '65%', width: '30%', height: '32%' }, { left: '35%', top: '65%', width: '30%', height: '32%' }, { left: '67%', top: '65%', width: '30%', height: '32%' }] },
      { id: 'p13', name: '3 Acima + 1', rects: [{ left: '3%', top: '3%', width: '30%', height: '32%' }, { left: '35%', top: '3%', width: '30%', height: '32%' }, { left: '67%', top: '3%', width: '30%', height: '32%' }, { left: '3%', top: '37%', width: '94%', height: '60%' }] },
      { id: 'p14', name: 'Colagem', rects: [{ left: '3%', top: '3%', width: '46%', height: '60%' }, { left: '51%', top: '3%', width: '46%', height: '35%' }, { left: '51%', top: '40%', width: '46%', height: '57%' }, { left: '3%', top: '65%', width: '46%', height: '32%' }] },
    ]
  } else if (format === 'portrait') {
    // Layouts para páginas retrato
    return [
      ...baseLayouts,
      { id: 'p3', name: 'Centralizada', rects: [{ left: '3%', top: '8%', width: '94%', height: '84%' }] },
      { id: 'p4', name: '2 Linhas', rects: [{ left: '5%', top: '3%', width: '90%', height: '46%' }, { left: '5%', top: '51%', width: '90%', height: '46%' }] },
      { id: 'p5', name: '3 Linhas', rects: [{ left: '5%', top: '2%', width: '90%', height: '31%' }, { left: '5%', top: '35%', width: '90%', height: '30%' }, { left: '5%', top: '67%', width: '90%', height: '31%' }] },
      { id: 'p6', name: '2 Colunas', rects: [{ left: '3%', top: '5%', width: '46%', height: '90%' }, { left: '51%', top: '5%', width: '46%', height: '90%' }] },
      { id: 'p7', name: '4 Grid', rects: [{ left: '3%', top: '3%', width: '46%', height: '46%' }, { left: '51%', top: '3%', width: '46%', height: '46%' }, { left: '3%', top: '51%', width: '46%', height: '46%' }, { left: '51%', top: '51%', width: '46%', height: '46%' }] },
      { id: 'p8', name: '6 Grid', rects: [{ left: '3%', top: '2%', width: '46%', height: '31%' }, { left: '51%', top: '2%', width: '46%', height: '31%' }, { left: '3%', top: '35%', width: '46%', height: '30%' }, { left: '51%', top: '35%', width: '46%', height: '30%' }, { left: '3%', top: '67%', width: '46%', height: '31%' }, { left: '51%', top: '67%', width: '46%', height: '31%' }] },
      { id: 'p9', name: 'Grande + 2', rects: [{ left: '5%', top: '3%', width: '90%', height: '60%' }, { left: '5%', top: '65%', width: '44%', height: '32%' }, { left: '51%', top: '65%', width: '44%', height: '32%' }] },
      { id: 'p10', name: '2 + Grande', rects: [{ left: '5%', top: '3%', width: '44%', height: '32%' }, { left: '51%', top: '3%', width: '44%', height: '32%' }, { left: '5%', top: '37%', width: '90%', height: '60%' }] },
      { id: 'p11', name: 'Faixa Central', rects: [{ left: '5%', top: '25%', width: '90%', height: '50%' }] },
      { id: 'p12', name: '1 + 2 Abaixo', rects: [{ left: '5%', top: '3%', width: '90%', height: '62%' }, { left: '5%', top: '67%', width: '44%', height: '30%' }, { left: '51%', top: '67%', width: '44%', height: '30%' }] },
      { id: 'p13', name: '2 Acima + 1', rects: [{ left: '5%', top: '3%', width: '44%', height: '30%' }, { left: '51%', top: '3%', width: '44%', height: '30%' }, { left: '5%', top: '35%', width: '90%', height: '62%' }] },
      { id: 'p14', name: 'Colagem', rects: [{ left: '3%', top: '3%', width: '60%', height: '46%' }, { left: '65%', top: '3%', width: '32%', height: '46%' }, { left: '3%', top: '51%', width: '32%', height: '46%' }, { left: '37%', top: '51%', width: '60%', height: '46%' }] },
    ]
  } else {
    // Layouts para páginas quadradas
    return [
      ...baseLayouts,
      { id: 'p3', name: 'Centralizada', rects: [{ left: '10', top: '10', width: '80', height: '80' }] },
      { id: 'p4', name: '2 Horizontal', rects: [{ left: '3', top: '8', width: '46', height: '84' }, { left: '51', top: '8', width: '46', height: '84' }] },
      { id: 'p5', name: '2 Vertical', rects: [{ left: '8', top: '3', width: '84', height: '46' }, { left: '8', top: '51', width: '84', height: '46' }] },
      { id: 'p6', name: '3 Colunas', rects: [{ left: '3', top: '8', width: '30', height: '84' }, { left: '35', top: '8', width: '30', height: '84' }, { left: '67', top: '8', width: '30', height: '84' }] },
      { id: 'p7', name: '3 Linhas', rects: [{ left: '8', top: '3', width: '84', height: '30' }, { left: '8', top: '35', width: '84', height: '30' }, { left: '8', top: '67', width: '84', height: '30' }] },
      { id: 'p8', name: '4 Grid', rects: [{ left: '3', top: '3', width: '46', height: '46' }, { left: '51', top: '3', width: '46', height: '46' }, { left: '3', top: '51', width: '46', height: '46' }, { left: '51', top: '51', width: '46', height: '46' }] },
      { id: 'p9', name: '6 Grid', rects: [{ left: '3', top: '3', width: '30', height: '46' }, { left: '35', top: '3', width: '30', height: '46' }, { left: '67', top: '3', width: '30', height: '46' }, { left: '3', top: '51', width: '30', height: '46' }, { left: '35', top: '51', width: '30', height: '46' }, { left: '67', top: '51', width: '30', height: '46' }] },
      { id: 'p10', name: '9 Grid', rects: [{ left: '3', top: '3', width: '30', height: '30' }, { left: '35', top: '3', width: '30', height: '30' }, { left: '67', top: '3', width: '30', height: '30' }, { left: '3', top: '35', width: '30', height: '30' }, { left: '35', top: '35', width: '30', height: '30' }, { left: '67', top: '35', width: '30', height: '30' }, { left: '3', top: '67', width: '30', height: '30' }, { left: '35', top: '67', width: '30', height: '30' }, { left: '67', top: '67', width: '30', height: '30' }] },
      { id: 'p11', name: 'Grande + 2', rects: [{ left: '3', top: '3', width: '62', height: '94' }, { left: '67', top: '3', width: '30', height: '46' }, { left: '67', top: '51', width: '30', height: '46' }] },
      { id: 'p12', name: '2 + Grande', rects: [{ left: '3', top: '3', width: '30', height: '46' }, { left: '3', top: '51', width: '30', height: '46' }, { left: '35', top: '3', width: '62', height: '94' }] },
      { id: 'p13', name: '1 + 3 Abaixo', rects: [{ left: '3', top: '3', width: '94', height: '62' }, { left: '3', top: '67', width: '30', height: '30' }, { left: '35', top: '67', width: '30', height: '30' }, { left: '67', top: '67', width: '30', height: '30' }] },
      { id: 'p14', name: 'Colagem', rects: [{ left: '3', top: '3', width: '46', height: '62' }, { left: '51', top: '3', width: '46', height: '30' }, { left: '51', top: '35', width: '46', height: '62' }, { left: '3', top: '67', width: '46', height: '30' }] },
      { id: 'p15', name: '4 Colunas', rects: [{ left: '3', top: '8', width: '22', height: '84' }, { left: '27', top: '8', width: '22', height: '84' }, { left: '51', top: '8', width: '22', height: '84' }, { left: '75', top: '8', width: '22', height: '84' }] },
      { id: 'p16', name: '4 Linhas', rects: [{ left: '8', top: '3', width: '84', height: '22' }, { left: '8', top: '27', width: '84', height: '22' }, { left: '8', top: '51', width: '84', height: '22' }, { left: '8', top: '75', width: '84', height: '22' }] },
      { id: 'p17', name: '12 Grid', rects: [{ left: '3', top: '3', width: '30', height: '22' }, { left: '35', top: '3', width: '30', height: '22' }, { left: '67', top: '3', width: '30', height: '22' }, { left: '3', top: '27', width: '30', height: '22' }, { left: '35', top: '27', width: '30', height: '22' }, { left: '67', top: '27', width: '30', height: '22' }, { left: '3', top: '51', width: '30', height: '22' }, { left: '35', top: '51', width: '30', height: '22' }, { left: '67', top: '51', width: '30', height: '22' }, { left: '3', top: '75', width: '30', height: '22' }, { left: '35', top: '75', width: '30', height: '22' }, { left: '67', top: '75', width: '30', height: '22' }] },
      { id: 'p18', name: 'Grande + 3', rects: [{ left: '3', top: '3', width: '64', height: '94' }, { left: '69', top: '3', width: '28', height: '30' }, { left: '69', top: '35', width: '28', height: '30' }, { left: '69', top: '67', width: '28', height: '30' }] },
      { id: 'p19', name: 'Mosaico', rects: [{ left: '3', top: '3', width: '46', height: '46' }, { left: '51', top: '3', width: '46', height: '22' }, { left: '51', top: '27', width: '22', height: '70' }, { left: '75', top: '27', width: '22', height: '70' }, { left: '3', top: '51', width: '46', height: '46' }] },
    ]
  }
})

// Computed para layouts baseado na view atual
const currentLayouts = computed(() => isCoverView.value ? coverLayouts.value : pageLayouts.value)

// Stickers
const allStickers = [
  { id: 's1', emoji: '❤️', category: 'love' },
  { id: 's2', emoji: '💕', category: 'love' },
  { id: 's3', emoji: '💖', category: 'love' },
  { id: 's4', emoji: '💗', category: 'love' },
  { id: 's5', emoji: '💘', category: 'love' },
  { id: 's6', emoji: '💝', category: 'love' },
  { id: 's7', emoji: '🌸', category: 'nature' },
  { id: 's8', emoji: '🌺', category: 'nature' },
  { id: 's9', emoji: '🌻', category: 'nature' },
  { id: 's10', emoji: '🌹', category: 'nature' },
  { id: 's11', emoji: '🍃', category: 'nature' },
  { id: 's12', emoji: '🌿', category: 'nature' },
  { id: 's13', emoji: '⭐', category: 'celebration' },
  { id: 's14', emoji: '✨', category: 'celebration' },
  { id: 's15', emoji: '🎉', category: 'celebration' },
  { id: 's16', emoji: '🎊', category: 'celebration' },
  { id: 's17', emoji: '🎈', category: 'celebration' },
  { id: 's18', emoji: '🎁', category: 'celebration' },
  { id: 's19', emoji: '👶', category: 'love' },
  { id: 's20', emoji: '💒', category: 'love' },
  { id: 's21', emoji: '🦋', category: 'nature' },
  { id: 's22', emoji: '🌈', category: 'nature' },
  { id: 's23', emoji: '☀️', category: 'nature' },
  { id: 's24', emoji: '🌙', category: 'nature' },
]
const stickers = computed(() => stickerCategory.value === 'all' ? allStickers : allStickers.filter(s => s.category === stickerCategory.value))

// Backgrounds
const backgroundColors = ['#FFFFFF', '#F5F5F5', '#FFF8E7', '#FFF0F5', '#F0FFF0', '#F0F8FF', '#FFF5EE', '#FFFAF0', '#F5FFFA', '#E6E6FA', '#FFE4E1', '#FFEFD5']
const backgroundGradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(180deg, #fff1eb 0%, #ace0f9 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
]
const backgroundPatterns = [
  { id: 'dots', css: 'radial-gradient(circle, #ddd 1px, transparent 1px)', size: '10px 10px' },
  { id: 'lines', css: 'repeating-linear-gradient(0deg, #eee, #eee 1px, transparent 1px, transparent 10px)' },
  { id: 'grid', css: 'linear-gradient(#eee 1px, transparent 1px), linear-gradient(90deg, #eee 1px, transparent 1px)', size: '20px 20px' },
  { id: 'diagonal', css: 'repeating-linear-gradient(45deg, #f5f5f5, #f5f5f5 10px, #fff 10px, #fff 20px)' },
]

// Spread Templates
const spreadTemplates = [
  { id: 't1', name: 'Clássico', left: [{ left: '5%', top: '5%', width: '90%', height: '90%' }], right: [{ left: '5%', top: '5%', width: '90%', height: '90%' }] },
  { id: 't2', name: 'Panorama', left: [{ left: '0%', top: '20%', width: '100%', height: '60%' }], right: [{ left: '0%', top: '20%', width: '100%', height: '60%' }] },
  { id: 't3', name: 'Galeria', left: [{ left: '5%', top: '5%', width: '44%', height: '44%' }, { left: '51%', top: '5%', width: '44%', height: '44%' }, { left: '5%', top: '51%', width: '90%', height: '44%' }], right: [{ left: '5%', top: '5%', width: '90%', height: '44%' }, { left: '5%', top: '51%', width: '44%', height: '44%' }, { left: '51%', top: '51%', width: '44%', height: '44%' }] },
  { id: 't4', name: 'Destaque', left: [{ left: '5%', top: '5%', width: '90%', height: '90%' }], right: [{ left: '5%', top: '5%', width: '44%', height: '44%' }, { left: '51%', top: '5%', width: '44%', height: '44%' }, { left: '5%', top: '51%', width: '44%', height: '44%' }, { left: '51%', top: '51%', width: '44%', height: '44%' }] },
  { id: 't5', name: 'Minimalista', left: [{ left: '15%', top: '15%', width: '70%', height: '70%' }], right: [{ left: '15%', top: '15%', width: '70%', height: '70%' }] },
  { id: 't6', name: 'Mosaico', left: [{ left: '3%', top: '3%', width: '30%', height: '46%' }, { left: '35%', top: '3%', width: '30%', height: '46%' }, { left: '67%', top: '3%', width: '30%', height: '46%' }, { left: '3%', top: '51%', width: '46%', height: '46%' }, { left: '51%', top: '51%', width: '46%', height: '46%' }], right: [{ left: '3%', top: '3%', width: '46%', height: '46%' }, { left: '51%', top: '3%', width: '46%', height: '46%' }, { left: '3%', top: '51%', width: '30%', height: '46%' }, { left: '35%', top: '51%', width: '30%', height: '46%' }, { left: '67%', top: '51%', width: '30%', height: '46%' }] },
]

// Current page elements for layers panel
const currentPageElements = computed(() => {
  const page = getCurrentPage()
  return page?.elements || []
})

// Converte valores de layout para CSS (adiciona % se necessário)
const rectToCSS = (r: any) => ({
  left: String(r.left).includes('%') ? r.left : `${r.left}%`,
  top: String(r.top).includes('%') ? r.top : `${r.top}%`,
  width: String(r.width).includes('%') ? r.width : `${r.width}%`,
  height: String(r.height).includes('%') ? r.height : `${r.height}%`
})

// Hint de layout baseado no modo atual
const getLayoutHint = computed(() => {
  if (isCoverView.value) {
    if (coverLayoutMode.value === 'full') return 'Layouts de Capa Completa'
    return coverLayoutMode.value === 'front' ? 'Layouts de Capa' : 'Layouts de Contracapa'
  }
  if (spreadLayoutMode.value === 'spread') return 'Layouts de Página Dupla (Layflat)'
  return spreadLayoutMode.value === 'left' ? 'Layouts Página Esquerda' : 'Layouts Página Direita'
})

// Layouts de Spread (página dupla - layflat)
const spreadLayouts = computed(() => [
  { id: 'sp1', name: 'Foto Cheia', rects: [{ left: '0', top: '0', width: '100', height: '100' }] },
  { id: 'sp2', name: 'Com Margem', rects: [{ left: '3', top: '5', width: '94', height: '90' }] },
  { id: 'sp3', name: 'Panorama', rects: [{ left: '0', top: '15', width: '100', height: '70' }] },
  { id: 'sp4', name: '2 Fotos', rects: [{ left: '2', top: '5', width: '47', height: '90' }, { left: '51', top: '5', width: '47', height: '90' }] },
  { id: 'sp5', name: 'Grande + 2', rects: [{ left: '2', top: '3', width: '60', height: '94' }, { left: '64', top: '3', width: '34', height: '46' }, { left: '64', top: '51', width: '34', height: '46' }] },
  { id: 'sp6', name: '3 Colunas', rects: [{ left: '2', top: '5', width: '31', height: '90' }, { left: '35', top: '5', width: '30', height: '90' }, { left: '67', top: '5', width: '31', height: '90' }] },
  { id: 'sp7', name: '4 Grid', rects: [{ left: '2', top: '3', width: '47', height: '46' }, { left: '51', top: '3', width: '47', height: '46' }, { left: '2', top: '51', width: '47', height: '46' }, { left: '51', top: '51', width: '47', height: '46' }] },
  { id: 'sp8', name: 'Centro Grande', rects: [{ left: '15', top: '10', width: '70', height: '80' }] },
])

// Layouts de Capa Completa (capa + lombada + contracapa)
const fullCoverLayouts = computed(() => [
  { id: 'fc1', name: 'Foto Inteira', rects: [{ left: '0', top: '0', width: '100', height: '100' }] },
  { id: 'fc2', name: 'Com Margem', rects: [{ left: '3', top: '5', width: '94', height: '90' }] },
  { id: 'fc3', name: 'Capa + Contracapa', rects: [{ left: '2', top: '5', width: '45', height: '90' }, { left: '53', top: '5', width: '45', height: '90' }] },
  { id: 'fc4', name: 'Panorama', rects: [{ left: '0', top: '20', width: '100', height: '60' }] },
])

// Aplicar layout de spread (página dupla)
const applySpreadLayout = (layout: any) => {
  const leftIdx = 3 + currentSpreadIndex.value * 2
  const page = pages.value[leftIdx]
  if (!page) return
  
  const spreadWidth = pageWidth.value * 2
  const ph = pageHeight.value
  
  const parseVal = (val: string) => parseFloat(String(val).replace('%', ''))
  
  // Remover spread elements antigos
  page.elements = page.elements.filter(el => !el.isSpreadElement)
  
  // Adicionar novos spread elements
  layout.rects.forEach((r: any, i: number) => {
    page.elements.push({
      id: `spread${Date.now()}${i}`,
      type: 'image',
      src: '',
      x: Math.round(parseVal(r.left) / 100 * spreadWidth),
      y: Math.round(parseVal(r.top) / 100 * ph),
      width: Math.round(parseVal(r.width) / 100 * spreadWidth),
      height: Math.round(parseVal(r.height) / 100 * ph),
      isSpreadElement: true
    })
  })
  saveToHistory()
}

// Aplicar layout de capa completa
const applyFullCoverLayout = (layout: any) => {
  // Para capa completa, criamos elementos que cobrem toda a área visível
  const pw = pageWidth.value
  const ph = pageHeight.value
  const spineW = calculatedSpineWidth.value || 20
  const totalWidth = pw * 2 + spineW
  
  const parseVal = (val: string) => parseFloat(String(val).replace('%', ''))
  
  // Limpar elementos das duas capas e lombada
  const coverFront = pages.value.find(p => p.type === 'cover-front')
  const coverBack = pages.value.find(p => p.type === 'cover-back')
  const spine = pages.value.find(p => p.type === 'spine')
  
  if (coverFront) coverFront.elements = []
  if (coverBack) coverBack.elements = []
  if (spine) spine.elements = []
  
  // Para cada retângulo do layout, criar elementos nas capas e lombada
  layout.rects.forEach((r: any, i: number) => {
    const leftPercent = parseVal(r.left)
    const topPercent = parseVal(r.top)
    const widthPercent = parseVal(r.width)
    const heightPercent = parseVal(r.height)
    
    // Calcular posições absolutas no spread completo
    const absLeft = leftPercent / 100 * totalWidth
    const absTop = topPercent / 100 * ph
    const absWidth = widthPercent / 100 * totalWidth
    const absHeight = heightPercent / 100 * ph
    
    // Verificar se o elemento atravessa a lombada
    const crossesSpine = absLeft < pw + spineW && absLeft + absWidth > pw
    
    // Criar elemento na contracapa (área esquerda: 0 a pw)
    if (absLeft < pw && coverBack) {
      const localX = absLeft
      const localWidth = Math.min(absWidth, pw - absLeft)
      
      coverBack.elements.push({
        id: `fc-back-${Date.now()}-${i}`,
        type: 'image',
        src: '',
        x: Math.round(localX),
        y: Math.round(absTop),
        width: Math.round(localWidth),
        height: Math.round(absHeight),
        isFullCover: crossesSpine,
        fullCoverIndex: i
      })
    }
    
    // Criar elemento na lombada (área central: pw a pw + spineW)
    if (crossesSpine && spine) {
      const spineStart = pw
      const spineEnd = pw + spineW
      const elementStart = Math.max(absLeft, spineStart)
      const elementEnd = Math.min(absLeft + absWidth, spineEnd)
      
      spine.elements.push({
        id: `fc-spine-${Date.now()}-${i}`,
        type: 'image',
        src: '',
        x: 0,
        y: Math.round(absTop),
        width: Math.round(spineW),
        height: Math.round(absHeight),
        isFullCover: true,
        fullCoverIndex: i
      })
    }
    
    // Criar elemento na capa (área direita: pw + spineW até totalWidth)
    const capaStart = pw + spineW
    if (absLeft + absWidth > capaStart && coverFront) {
      const startInCapa = Math.max(0, absLeft - capaStart)
      const endInCapa = Math.min(pw, absLeft + absWidth - capaStart)
      const localWidth = endInCapa - startInCapa
      
      coverFront.elements.push({
        id: `fc-front-${Date.now()}-${i}`,
        type: 'image',
        src: '',
        x: Math.round(startInCapa),
        y: Math.round(absTop),
        width: Math.round(localWidth),
        height: Math.round(absHeight),
        isFullCover: crossesSpine,
        fullCoverIndex: i
      })
    }
  })
  
  console.log('📐 Layout de capa completa aplicado:', layout.name)
  console.log('   Contracapa elementos:', coverBack?.elements.length)
  console.log('   Lombada elementos:', spine?.elements.length)
  console.log('   Capa elementos:', coverFront?.elements.length)
  
  saveToHistory()
}

const applyLayout = (layout: any) => {
  let page: Page | undefined
  if (isCoverView.value) {
    page = pages.value.find(p => p.type === (activeSide.value === 'right' ? 'cover-front' : 'cover-back'))
    console.log('📐 Aplicando layout na capa:', activeSide.value === 'right' ? 'cover-front' : 'cover-back')
  } else {
    const pageIdx = 3 + currentSpreadIndex.value * 2 + (activeSide.value === 'right' ? 1 : 0)
    page = pages.value[pageIdx]
    console.log('📐 Aplicando layout na página:', pageIdx)
  }
  
  if (page) {
    // Usar dimensões dinâmicas da página
    const pw = pageWidth.value
    const ph = pageHeight.value
    
    console.log('📏 Dimensões da página:', { pw, ph })
    
    // Função para extrair número (remove % se existir)
    const parseVal = (val: string) => parseFloat(String(val).replace('%', ''))
    
    page.elements = layout.rects.map((r: any, i: number) => {
      const element = {
        id: `ph${Date.now()}${i}`, 
        type: 'image', 
        src: '',
        x: Math.round(parseVal(r.left) / 100 * pw),
        y: Math.round(parseVal(r.top) / 100 * ph),
        width: Math.round(parseVal(r.width) / 100 * pw),
        height: Math.round(parseVal(r.height) / 100 * ph)
      }
      console.log('📦 Elemento criado:', element)
      return element
    })
    saveToHistory()
  }
}

// Add pages (sempre de 2 em 2, respeitando limite máximo)
const addPages = async () => {
  const mioloPages = pages.value.filter(p => p.type === 'page').length
  const maxPages = productConfig.value?.maxPages || 80
  
  // Verificar se já atingiu o limite
  if (mioloPages >= maxPages) {
    alert(`⚠️ Limite máximo de ${maxPages} páginas atingido para este formato.`)
    return
  }
  
  // Adicionar 2 páginas (1 lâmina)
  pages.value.push({ id: `p${pages.value.length}`, type: 'page', elements: [] })
  pages.value.push({ id: `p${pages.value.length}`, type: 'page', elements: [] })
  saveToHistory()
  
  // Recalcular lombada
  const newMioloPages = pages.value.length - 2
  await calculateSpineWidth(newMioloPages)
  
  console.log(`📄 Páginas: ${newMioloPages} (${newMioloPages / 2} lâminas) | Lombada: ${calculatedSpineWidth.value}mm`)
}

// Add sticker to current page
const addSticker = (sticker: { id: string; emoji: string }) => {
  const page = getCurrentPage()
  if (!page) return
  
  page.elements.push({
    id: `stk${Date.now()}`,
    type: 'sticker',
    content: sticker.emoji,
    x: 50 + Math.random() * 100,
    y: 50 + Math.random() * 100,
    width: 60,
    height: 60
  })
  saveToHistory()
}

// Add shape to current page
const addShape = (shapeType: string) => {
  const page = getCurrentPage()
  if (!page) return
  
  const shapes: Record<string, any> = {
    rectangle: { width: 100, height: 60, background: '#D4775C', borderRadius: 4 },
    circle: { width: 60, height: 60, background: '#D4775C', borderRadius: '50%' },
    line: { width: 100, height: 4, background: '#2D2A26', borderRadius: 2 },
    arrow: { width: 80, height: 20, content: '→' }
  }
  
  const shape = shapes[shapeType] || shapes.rectangle
  
  page.elements.push({
    id: `shape${Date.now()}`,
    type: 'shape',
    shapeType,
    x: 50 + Math.random() * 100,
    y: 50 + Math.random() * 100,
    ...shape
  })
  saveToHistory()
}

// Set page background
const setPageBackground = (bg: string) => {
  const page = getCurrentPage()
  if (!page) return
  page.background = bg
  saveToHistory()
}

// Get page background style with dynamic dimensions
const getPageBackground = (pageIdOrType: string | number) => {
  let page: Page | undefined
  if (typeof pageIdOrType === 'string') {
    page = pages.value.find(p => p.type === pageIdOrType)
  } else {
    page = pages.value[pageIdOrType]
  }
  
  // Sempre incluir dimensões dinâmicas
  const style: any = {
    width: `${pageWidth.value}px`,
    height: `${pageHeight.value}px`
  }
  
  if (page?.background) {
    style.background = page.background
  }
  
  return style
}

// Get spine style
const getSpineStyle = () => {
  const spine = spinePage.value
  const style: any = {
    width: `${spineVisualWidth.value}px`,
    height: `${pageHeight.value}px`
  }
  
  if (spine?.background) {
    style.background = spine.background
  }
  
  return style
}

// Get cover page style (with dimensions)
const getCoverPageStyle = (pageType: string) => {
  const page = pages.value.find(p => p.type === pageType)
  const style: any = {
    width: `${pageWidth.value}px`,
    height: `${pageHeight.value}px`
  }
  
  if (page?.background) {
    style.background = page.background
  }
  
  return style
}

// Get spine element style (vertical orientation)
const getSpineElementStyle = (el: Element) => {
  const spineWidth = Math.max(calculatedSpineWidth.value * 1.5, 25)
  
  // Para elementos fullCover, ocupar toda a lombada
  if (el.isFullCover) {
    const style: any = {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '100%',
      height: '100%',
    }
    if (el.rotation) style.transform = `rotate(${el.rotation}deg)`
    if (el.opacity !== undefined && el.opacity !== 1) style.opacity = el.opacity
    return style
  }
  
  const style: any = {
    position: 'absolute',
    left: `${(el.x / 100) * spineWidth}px`,
    top: `${(el.y / 100) * pageHeight.value}px`,
    width: `${(el.width / 100) * spineWidth}px`,
    height: `${(el.height / 100) * pageHeight.value}px`,
  }
  if (el.rotation) style.transform = `rotate(${el.rotation}deg)`
  if (el.opacity !== undefined && el.opacity !== 1) style.opacity = el.opacity
  return style
}

// Get spine text style (vertical text)
const getSpineTextStyle = (el: Element) => {
  return {
    writingMode: 'vertical-rl',
    textOrientation: 'mixed',
    fontSize: `${el.fontSize || 12}px`,
    fontFamily: el.fontFamily || 'inherit',
    fontWeight: el.fontWeight || '600',
    color: el.color || '#4A4540',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    textShadow: '0 1px 0 rgba(255,255,255,0.3)',
  }
}

// Handle drop on spine
const onDropSpine = async (e: DragEvent) => {
  dropSide.value = null
  
  const spine = pages.value.find(p => p.type === 'spine')
  if (!spine) return
  
  // Check if dropping a photo from sidebar
  if (draggingPhoto.value) {
    const spineWidth = Math.max(calculatedSpineWidth.value * 1.5, 25)
    const newElement = {
      id: `img-${Date.now()}`,
      type: 'image',
      src: draggingPhoto.value.src,
      x: 10, // % da largura da lombada
      y: 10, // % da altura
      width: 80, // % da largura
      height: 30, // % da altura
      rotation: 0,
      opacity: 1,
      locked: false,
      assetId: draggingPhoto.value.assetId
    }
    spine.elements.push(newElement)
    saveToHistory()
    return
  }
  
  // Handle file drop
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        const photo = await uploadPhotoToBackend(file)
        if (photo) {
          photos.value.push(photo)
          const newElement = {
            id: `img-${Date.now()}`,
            type: 'image',
            src: photo.src,
            x: 10,
            y: 10,
            width: 80,
            height: 30,
            rotation: 0,
            opacity: 1,
            locked: false,
            assetId: photo.assetId
          }
          spine.elements.push(newElement)
        }
      }
    }
    saveToHistory()
  }
}

// Get image style (for masks/crop)
const getImageStyle = (el: Element) => {
  const style: any = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center center'
  }
  
  // Para elementos fullCover, ajustar a posição da imagem para criar efeito panorâmico
  if (el.isFullCover && el.fullCoverIndex !== undefined) {
    const pw = pageWidth.value
    const spineW = calculatedSpineWidth.value || 20
    const totalWidth = pw * 2 + spineW
    
    // Determinar se este elemento está na contracapa, lombada ou capa pelo ID
    const isBackCover = el.id.includes('back')
    const isSpine = el.id.includes('spine')
    const isFrontCover = el.id.includes('front')
    
    if (isBackCover) {
      // Contracapa: mostrar a parte esquerda da imagem
      const backRatio = pw / totalWidth * 100
      style.objectPosition = `${backRatio / 2}% center`
    } else if (isSpine) {
      // Lombada: mostrar a parte central da imagem
      style.objectPosition = `center center`
    } else if (isFrontCover) {
      // Capa: mostrar a parte direita da imagem
      const frontStart = (pw + spineW) / totalWidth * 100
      const frontCenter = frontStart + ((pw / totalWidth * 100) / 2)
      style.objectPosition = `${frontCenter}% center`
    }
  }
  
  // Aplicar posição de crop se definido (para ajuste fino pelo usuário)
  if (el.cropX || el.cropY) {
    const posX = 50 - (el.cropX || 0)
    const posY = 50 - (el.cropY || 0)
    style.objectPosition = `${posX}% ${posY}%`
  }
  
  if (el.mask) {
    style.clipPath = el.mask
  }
  return style
}

// Apply spread template
const applySpreadTemplate = (template: { id: string; name: string; left: any[]; right: any[] }) => {
  if (isCoverView.value) return
  
  const leftIdx = 2 + currentSpreadIndex.value * 2
  const rightIdx = leftIdx + 1
  const leftPage = pages.value[leftIdx]
  const rightPage = pages.value[rightIdx]
  
  // Usar dimensões reais da página (do produto ou padrão)
  const pw = pageWidth.value || PAGE_W
  const ph = pageHeight.value || PAGE_H
  
  if (leftPage) {
    leftPage.elements = template.left.map((r: any, i: number) => ({
      id: `ph${Date.now()}${i}l`,
      type: 'image',
      src: '',
      x: Math.round(parseFloat(r.left) / 100 * pw),
      y: Math.round(parseFloat(r.top) / 100 * ph),
      width: Math.round(parseFloat(r.width) / 100 * pw),
      height: Math.round(parseFloat(r.height) / 100 * ph)
    }))
  }
  
  if (rightPage) {
    rightPage.elements = template.right.map((r: any, i: number) => ({
      id: `ph${Date.now()}${i}r`,
      type: 'image',
      src: '',
      x: Math.round(parseFloat(r.left) / 100 * pw),
      y: Math.round(parseFloat(r.top) / 100 * ph),
      width: Math.round(parseFloat(r.width) / 100 * pw),
      height: Math.round(parseFloat(r.height) / 100 * ph)
    }))
  }
  
  saveToHistory()
}

// Handle element mouse down (for multi-select with Shift)
const handleElementMouseDown = (e: MouseEvent, el: Element, side: string) => {
  // TODO: Implement multi-select with Shift key
  // For now, just select and start drag
  startDrag(e, el, side)
}

// Start rotation
let rotateStartAngle = 0
let elStartRotation = 0
const startRotate = (e: MouseEvent, el: Element) => {
  selectElement(el, '')
  if (!selected.value || selected.value.locked) return
  
  const rect = (e.target as HTMLElement).closest('.element')?.getBoundingClientRect()
  if (!rect) return
  
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  rotateStartAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI
  elStartRotation = selected.value.rotation || 0
  
  document.addEventListener('mousemove', onRotate)
  document.addEventListener('mouseup', endRotate)
}

const onRotate = (e: MouseEvent) => {
  if (!selected.value) return
  
  // Find element center
  const elements = document.querySelectorAll('.element.selected')
  if (!elements.length) return
  const rect = elements[0].getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  
  const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI
  const deltaAngle = currentAngle - rotateStartAngle
  selected.value.rotation = Math.round(elStartRotation + deltaAngle)
}

const endRotate = () => {
  saveToHistory()
  document.removeEventListener('mousemove', onRotate)
  document.removeEventListener('mouseup', endRotate)
}

// Select element by ID (for layers panel)
const selectElementById = (id: string) => {
  for (const page of pages.value) {
    const found = page.elements.find(e => e.id === id)
    if (found) {
      selected.value = found
      break
    }
  }
}

// Toggle element lock from layers panel
const toggleElementLock = (el: Element) => {
  el.locked = !el.locked
  saveToHistory()
}

// Move layer up (increase z-index)
const moveLayerUp = (idx: number) => {
  const page = getCurrentPage()
  if (!page || idx >= page.elements.length - 1) return
  const temp = page.elements[idx]
  page.elements[idx] = page.elements[idx + 1]
  page.elements[idx + 1] = temp
  saveToHistory()
}

// Move layer down (decrease z-index)
const moveLayerDown = (idx: number) => {
  const page = getCurrentPage()
  if (!page || idx <= 0) return
  const temp = page.elements[idx]
  page.elements[idx] = page.elements[idx - 1]
  page.elements[idx - 1] = temp
  saveToHistory()
}

// Presentation navigation
const presentationPrev = () => {
  if (presentationPage.value > 0) {
    presentationPage.value--
  }
}

const presentationNext = () => {
  if (presentationPage.value < totalSpreads.value) {
    presentationPage.value++
  }
}

// Handle album approval
const handleApprove = () => {
  show3DPreview.value = false
  alert('✅ Álbum aprovado! O fotógrafo será notificado.')
  // TODO: Implementar lógica de aprovação real
  // - Salvar status de aprovação no backend
  // - Enviar notificação para o fotógrafo
  // - Redirecionar para página de confirmação
}

// Handle save review from approval viewer
const handleSaveReview = async (reviewData: { statuses: Record<number, string>, comments: Record<number, any[]>, finished?: boolean, needsRevision?: boolean }) => {
  try {
    // Salvar dados de revisão no projeto
    const projectData = {
      ...pages.value,
      reviewData: {
        statuses: reviewData.statuses,
        comments: reviewData.comments,
        lastUpdated: new Date().toISOString(),
        finished: reviewData.finished || false,
        needsRevision: reviewData.needsRevision || false
      }
    }
    
    // Se tiver projeto no backend, salvar lá
    if (currentProjectId.value) {
      await saveProjectToBackend()
    }
    
    console.log('Review saved:', reviewData)
    
    if (reviewData.finished) {
      show3DPreview.value = false
    }
  } catch (error) {
    console.error('Error saving review:', error)
    alert('Erro ao salvar revisão. Tente novamente.')
  }
}

// Export PDF
const exportPDF = async () => {
  if (exportingPDF.value) return
  
  exportingPDF.value = true
  exportProgress.value = 0
  
  try {
    // Usar dimensões do produto ou padrão
    const pageW = productConfig.value?.width || 300
    const pageH = productConfig.value?.height || 300
    
    // PDF em formato paisagem para spreads (2 páginas lado a lado)
    const pdfWidth = pageW * 2
    const pdfHeight = pageH
    
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    })
    
    const totalPages = totalSpreads.value + 1 // +1 para capa
    const originalPage = currentPage.value
    const originalZoom = zoom.value
    const originalShowHelp = showCoverHelp.value
    
    // Desativar guias e ajustar zoom para captura limpa
    showCoverHelp.value = false
    zoom.value = 1
    await nextTick()
    
    for (let i = 0; i <= totalSpreads.value; i++) {
      currentPage.value = i
      await nextTick()
      
      // Aguardar renderização completa
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Selecionar o elemento correto baseado na página
      let targetEl: HTMLElement | null = null
      
      if (i === 0) {
        // Capa - capturar o cover-wrapper-outer
        targetEl = document.querySelector('.cover-wrapper-outer') as HTMLElement
      } else {
        // Miolo - capturar o spread-wrapper-outer
        targetEl = document.querySelector('.spread-wrapper-outer') as HTMLElement
      }
      
      // Fallback para o canvas-wrapper se não encontrar
      if (!targetEl) {
        targetEl = document.querySelector('.canvas-wrapper') as HTMLElement
      }
      
      if (targetEl) {
        try {
          const canvas = await html2canvas(targetEl, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            imageTimeout: 15000
          })
          
          const imgData = canvas.toDataURL('image/jpeg', 0.92)
          
          if (i > 0) {
            pdf.addPage([pdfWidth, pdfHeight], 'landscape')
          }
          
          // Calcular dimensões para manter proporção
          const canvasRatio = canvas.width / canvas.height
          const pdfRatio = pdfWidth / pdfHeight
          
          let finalWidth, finalHeight, x, y
          
          if (canvasRatio > pdfRatio) {
            // Imagem mais larga - ajustar pela largura
            finalWidth = pdfWidth
            finalHeight = pdfWidth / canvasRatio
            x = 0
            y = (pdfHeight - finalHeight) / 2
          } else {
            // Imagem mais alta - ajustar pela altura
            finalHeight = pdfHeight
            finalWidth = pdfHeight * canvasRatio
            x = (pdfWidth - finalWidth) / 2
            y = 0
          }
          
          pdf.addImage(imgData, 'JPEG', x, y, finalWidth, finalHeight)
        } catch (canvasError) {
          console.error('Erro ao capturar página', i, canvasError)
        }
      }
      
      exportProgress.value = Math.round(((i + 1) / totalPages) * 100)
    }
    
    // Restaurar estado
    currentPage.value = originalPage
    zoom.value = originalZoom
    showCoverHelp.value = originalShowHelp
    
    // Salvar PDF
    const fileName = `${projectName.value.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`
    pdf.save(fileName)
    
    alert('✅ PDF exportado com sucesso!')
  } catch (error) {
    console.error('Erro ao exportar PDF:', error)
    alert('❌ Erro ao exportar PDF. Tente novamente.')
  } finally {
    exportingPDF.value = false
    exportProgress.value = 0
  }
}

// Remove pages (sempre de 2 em 2, respeitando limite mínimo)
const removePages = async () => {
  const mioloPages = pages.value.length - 2 // Páginas atuais do miolo
  const minPages = productConfig.value?.minPages || 20
  
  // Verificar se já atingiu o limite mínimo
  if (mioloPages <= minPages) {
    alert(`⚠️ Mínimo de ${minPages} páginas (${minPages / 2} lâminas) para este formato.`)
    return
  }
  
  // Remove as últimas 2 páginas (1 lâmina)
  pages.value.pop()
  pages.value.pop()
  
  // Ajusta página atual se necessário
  if (currentPage.value > totalSpreads.value) {
    currentPage.value = totalSpreads.value
  }
  saveToHistory()
  
  // Recalcular lombada
  const newMioloPages = pages.value.length - 2
  await calculateSpineWidth(newMioloPages)
  
  console.log(`📄 Páginas: ${newMioloPages} (${newMioloPages / 2} lâminas) | Lombada: ${calculatedSpineWidth.value}mm`)
}

// Styles
const getElementStyle = (el: Element) => {
  const style: any = {
    left: el.x + 'px',
    top: el.y + 'px',
    width: el.width + 'px',
    height: el.height + 'px'
  }
  if (el.rotation) style.transform = `rotate(${el.rotation}deg)`
  if (el.opacity !== undefined && el.opacity !== 1) style.opacity = el.opacity
  if (el.filter) style.filter = el.filter
  if (el.borderWidth) {
    style.border = `${el.borderWidth}px solid ${el.borderColor || '#000'}`
    if (el.borderRadius) style.borderRadius = el.borderRadius + 'px'
  }
  if (el.shadow) style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
  return style
}
const getTextStyle = (el: Element) => ({ 
  fontSize: (el.fontSize || 14) + 'px', 
  fontFamily: el.fontFamily || 'Arial', 
  fontWeight: el.fontWeight || 'normal',
  fontStyle: el.fontStyle || 'normal',
  textAlign: el.textAlign || 'left',
  color: el.color || '#2D2A26' 
})
const getThumbElStyle = (el: Element) => {
  const pw = pageWidth.value || PAGE_W
  const ph = pageHeight.value || PAGE_H
  return { 
    left: (el.x / pw * 100) + '%', 
    top: (el.y / ph * 100) + '%', 
    width: (el.width / pw * 100) + '%', 
    height: (el.height / ph * 100) + '%' 
  }
}

// Preview
const getPreviewStyle = (el: Element) => {
  const pw = pageWidth.value || PAGE_W
  const ph = pageHeight.value || PAGE_H
  return {
    position: 'absolute' as const,
    left: (el.x / pw * 100) + '%',
    top: (el.y / ph * 100) + '%',
    width: (el.width / pw * 100) + '%',
    height: (el.height / ph * 100) + '%'
  }
}
const getPreviewPageElements = (spreadIdx: number, side: 'left' | 'right') => {
  const pageIdx = 2 + (spreadIdx - 1) * 2 + (side === 'left' ? 0 : 1)
  return pages.value[pageIdx]?.elements || []
}

// Actions
// Função auxiliar para salvar na lista de projetos (para aparecer em "Meus Projetos")
const saveToProjectsList = () => {
  try {
    // Usar ID existente ou criar um novo apenas na primeira vez
    if (!localProjectId.value && !backendProjectId.value) {
      localProjectId.value = `local-${Date.now()}`
    }
    const projectId = backendProjectId.value || localProjectId.value!
    
    // Criar dados do projeto no formato esperado pelo purchaseFlowService
    const projectData: ProjectData = {
      id: projectId,
      name: projectName.value,
      productSelection: {
        productId: productConfig.value?.productId || 'album-casamento',
        productName: productConfig.value?.productName || 'Álbum',
        formatId: productConfig.value?.formatId,
        formatName: productConfig.value?.formatName,
        paperId: productConfig.value?.paperId,
        paperName: productConfig.value?.paperName,
        coverTypeId: productConfig.value?.coverId,
        coverTypeName: productConfig.value?.coverName,
        pages: pages.value.filter(p => p.type === 'page').length,
        includeCase: false,
        basePrice: productConfig.value?.basePrice || 299,
        formatMultiplier: 1,
        paperAdjustment: 0,
        coverPrice: 0,
        extraPagesPrice: 0,
        totalPrice: productConfig.value?.totalPrice || 299,
        thumbnailUrl: undefined
      },
      pages: pages.value,
      photos: photos.value,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'editing'
    }
    
    // Buscar projetos existentes
    const existingProjects = purchaseFlowService.getProjectsFromStorage()
    const existingIndex = existingProjects.findIndex(p => p.id === projectId)
    
    if (existingIndex > -1) {
      // Atualizar projeto existente
      existingProjects[existingIndex] = {
        ...existingProjects[existingIndex],
        ...projectData,
        createdAt: existingProjects[existingIndex].createdAt // Manter data de criação original
      }
    } else {
      // Adicionar novo projeto
      existingProjects.push(projectData)
    }
    
    // Salvar lista atualizada
    localStorage.setItem('projects', JSON.stringify(existingProjects))
    console.log('✅ Projeto salvo na lista de projetos:', projectName.value, 'ID:', projectId)
  } catch (error) {
    console.error('❌ Erro ao salvar na lista de projetos:', error)
  }
}

const saveProject = async () => {
  // Se já está conectado ao backend, salvar diretamente sem modal
  if (isConnectedToBackend.value && backendProjectId.value) {
    isSaving.value = true
    
    const success = await saveToBackend(
      projectName.value,
      pages.value,
      { zoom: zoom.value }
    )
    
    isSaving.value = false
    
    if (success) {
      hasUnsavedChanges.value = false
      lastSaveTime.value = new Date()
      
      // Salvar na lista de projetos para aparecer em "Meus Projetos"
      saveToProjectsList()
      
      // Mostrar opções após salvar
      showSaveSuccessModal.value = true
    } else {
      alert('❌ Erro ao salvar projeto. Tente novamente.')
    }
    return
  }
  
  // Se não está conectado ao backend, abrir modal para definir nome
  saveProjectName.value = projectName.value
  showSaveModal.value = true
}

const confirmSaveProject = async (): Promise<boolean> => {
  if (!saveProjectName.value.trim()) {
    alert('Por favor, digite um nome para o projeto')
    return false
  }

  isSaving.value = true
  
  // Atualizar nome do projeto
  projectName.value = saveProjectName.value.trim()
  
  // Se não está conectado ao backend mas está autenticado, criar projeto primeiro
  if (!isConnectedToBackend.value && localStorage.getItem('accessToken')) {
    console.log('🆕 Criando novo projeto no backend...')
    
    try {
      const response = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          name: projectName.value,
          productId: productConfig.value?.productId,
          formatId: productConfig.value?.formatId,
          paperId: productConfig.value?.paperId,
          coverTypeId: productConfig.value?.coverId,
          pageCount: pages.value.filter(p => p.type === 'page').length
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        const newProjectId = result.data?.id || result.id
        
        if (newProjectId) {
          console.log('✅ Projeto criado no backend:', newProjectId)
          
          // Atualizar URL sem recarregar a página
          window.history.replaceState({}, '', `/editor/${newProjectId}`)
          
          // Salvar páginas no projeto recém-criado
          const saveResponse = await fetch(`/api/v1/editor/project/${newProjectId}/save`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({
              name: projectName.value,
              pages: pages.value,
              settings: { zoom: zoom.value }
            })
          })
          
          if (saveResponse.ok) {
            // Salvar localmente como backup
            // Quando criamos no backend, o backendProjectId se torna o ID principal
            // Limpar localProjectId para evitar conflitos
            localProjectId.value = null
            
            const projectData = {
              name: projectName.value,
              pages: pages.value,
              photos: photos.value,
              savedAt: new Date().toISOString(),
              backendProjectId: newProjectId,
              localProjectId: null
            }
            saveToLocalStorage('album-project', projectData)
            
            // Salvar na lista de projetos para aparecer em "Meus Projetos"
            saveToProjectsList()
            
            hasUnsavedChanges.value = false
            lastSaveTime.value = new Date()
            showSaveModal.value = false
            isSaving.value = false
            showSaveSuccessModal.value = true
            
            console.log('✅ Projeto salvo com sucesso!')
            return true
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao criar projeto:', error)
    }
  }
  
  // Tentar salvar no backend se já conectado
  if (isConnectedToBackend.value) {
    console.log('💾 Salvando projeto no backend...')
    
    const success = await saveToBackend(
      projectName.value,
      pages.value,
      { zoom: zoom.value }
    )
    
    if (success) {
      // Também salvar localmente como backup
      // Quando salvamos no backend, limpar localProjectId para evitar conflitos
      localProjectId.value = null
      
      const projectData = {
        name: projectName.value,
        pages: pages.value,
        photos: photos.value,
        savedAt: new Date().toISOString(),
        backendProjectId: backendProjectId.value,
        backendVersion: backendVersion.value,
        localProjectId: null
      }
      
      const saved = saveToLocalStorage('album-project', projectData)
      
      hasUnsavedChanges.value = false
      lastSaveTime.value = new Date()
      showSaveModal.value = false
      isSaving.value = false
      
      // Salvar na lista de projetos para aparecer em "Meus Projetos"
      saveToProjectsList()
      
      // Mostrar opções após salvar
      showSaveSuccessModal.value = true
      
      console.log('✅ confirmSaveProject retornando true (backend)')
      return true
    } else {
      // Se falhou no backend, avisar mas salvar localmente
      console.warn('⚠️ Falha ao salvar no backend, salvando localmente')
    }
  }
  
  // Fallback: salvar apenas localmente
  // Garantir que temos um ID local
  if (!localProjectId.value) {
    localProjectId.value = `local-${Date.now()}`
  }
  
  const projectData = {
    name: projectName.value,
    pages: pages.value,
    photos: photos.value,
    savedAt: new Date().toISOString(),
    localProjectId: localProjectId.value
  }
  
  const saved = saveToLocalStorage('album-project', projectData)
  
  // Salvar na lista de projetos para aparecer em "Meus Projetos"
  saveToProjectsList()
  
  hasUnsavedChanges.value = false
  lastSaveTime.value = new Date()
  showSaveModal.value = false
  isSaving.value = false
  
  if (saved) {
    showSaveSuccessModal.value = true
  } else {
    alert('⚠️ Projeto salvo parcialmente (espaço insuficiente)')
  }
  console.log('✅ confirmSaveProject retornando true (local)')
  return true
}

const loadProject = () => {
  const saved = localStorage.getItem('album-project')
  if (saved) {
    try {
      const data = JSON.parse(saved)
      
      // Verificar se o projeto salvo é o mesmo que está sendo aberto
      // Suportar tanto route.params quanto route.query
      const projectIdFromUrl = route.params.projectId as string || route.params.id as string || route.query.projectId as string
      if (projectIdFromUrl && data.backendProjectId && data.backendProjectId !== projectIdFromUrl) {
        console.log('⚠️ Projeto no localStorage é diferente do solicitado, ignorando cache local')
        return false
      }
      
      projectName.value = data.name || 'Meu Álbum'
      pages.value = data.pages || []
      photos.value = data.photos || []
      
      // Carregar ID do projeto local se existir
      if (data.localProjectId) {
        localProjectId.value = data.localProjectId
      }
      
      saveToHistory()
      hasUnsavedChanges.value = false
      console.log('✅ Projeto carregado do localStorage:', data.name)
      return true
    } catch (e) {
      console.error('Erro ao carregar projeto:', e)
    }
  }
  return false
}

const goToProjects = () => {
  // Verificar se há alterações não salvas
  if (hasUnsavedChanges.value) {
    if (confirm('Você tem alterações não salvas. Deseja salvar antes de sair?')) {
      saveProject()
    }
  }
  showSaveSuccessModal.value = false
  router.push('/studio/projects')
}

const finishProject = async () => {
  console.log('🔄 finishProject chamado')
  
  // Verificar se o projeto tem nome
  if (!projectName.value.trim()) {
    console.log('⚠️ Projeto sem nome, abrindo modal')
    saveProjectName.value = 'Meu Álbum'
    showSaveModal.value = true
    return
  }
  
  // Se não está autenticado, pedir para fazer login
  if (!localStorage.getItem('accessToken')) {
    alert('Por favor, faça login para salvar e finalizar seu projeto.')
    router.push('/login')
    return
  }
  
  console.log('💾 Salvando projeto antes de finalizar...')
  saveProjectName.value = projectName.value
  
  // Salvar projeto
  const saved = await confirmSaveProject()
  
  console.log('💾 Resultado do salvamento:', saved)
  
  if (saved) {
    // Fechar modal de sucesso se estiver aberto
    showSaveSuccessModal.value = false
    
    // Obter projectId da URL atual (pode ter sido atualizada durante o salvamento)
    const currentPath = window.location.pathname
    const pathMatch = currentPath.match(/\/editor\/([^/]+)/)
    const projectId = pathMatch ? pathMatch[1] : (route.params.projectId || route.params.id || backendProjectId.value)
    
    console.log('🛒 Adicionando ao carrinho e indo para checkout, projectId:', projectId)
    
    if (!projectId || projectId === 'null' || projectId === 'undefined') {
      console.error('❌ ProjectId não encontrado')
      alert('Erro: ID do projeto não encontrado. Tente salvar novamente.')
      return
    }
    
    try {
      // Ir para o carrinho com o projeto
      await router.push(`/cart?add=${projectId}`)
      console.log('✅ Redirecionamento para carrinho concluído')
    } catch (error) {
      console.error('❌ Erro no redirecionamento:', error)
      window.location.href = `/cart?add=${projectId}`
    }
  } else {
    console.log('❌ Falha no salvamento')
    alert('Erro ao salvar o projeto. Tente novamente.')
  }
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', endDrag)
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', endResize)
  document.removeEventListener('mousemove', onRotate)
  document.removeEventListener('mouseup', endRotate)
  document.removeEventListener('keydown', handleKeyboard)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval)
  }
})
</script>


<style scoped>
.editor { display: flex; flex-direction: column; height: 100vh; background: #F7F4EE; font-family: 'Inter', system-ui, sans-serif; }

/* Header */
.header { display: flex; align-items: center; justify-content: space-between; height: 60px; padding: 0 20px; background: #fff; border-bottom: 1px solid #EBE7E0; }
.header-left, .header-right { display: flex; align-items: center; gap: 12px; }
.logo { display: flex; align-items: center; gap: 8px; text-decoration: none; color: #2D2A26; }
.logo-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #D4775C, #E8956F); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; }
.logo span { font-weight: 600; font-size: 16px; }
.separator { width: 1px; height: 28px; background: #EBE7E0; }
.project-info { display: flex; flex-direction: column; }
.project-input { border: none; background: transparent; font-size: 15px; font-weight: 600; color: #2D2A26; padding: 4px 8px; border-radius: 6px; width: 220px; }
.project-input:hover, .project-input:focus { background: #F7F4EE; outline: none; }
.project-meta { font-size: 11px; color: #9A958E; margin-left: 8px; }

/* Product Dimensions in Header */
.product-dimensions { display: flex; align-items: center; gap: 12px; padding: 6px 12px; background: #F7F4EE; border-radius: 8px; margin-left: 12px; }
.dim-item { font-size: 12px; color: #6B6560; font-weight: 500; display: flex; align-items: center; gap: 4px; }

.header-center { display: flex; align-items: center; gap: 12px; }
.nav-btn { width: 36px; height: 36px; background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 8px; font-size: 20px; color: #6B6560; cursor: pointer; }
.nav-btn:hover:not(:disabled) { background: #EBE7E0; color: #2D2A26; }
.nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 14px; color: #6B6560; min-width: 100px; text-align: center; }
.btn-save { padding: 8px 16px; background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 8px; font-size: 13px; font-weight: 500; color: #6B6560; cursor: pointer; }
.btn-save:hover { background: #EBE7E0; color: #2D2A26; }
.btn-projects { padding: 8px 16px; background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 8px; font-size: 13px; font-weight: 500; color: #6B6560; cursor: pointer; display: flex; align-items: center; gap: 6px; }
.btn-projects:hover { background: #EBE7E0; color: #2D2A26; }
.btn-buy { 
  padding: 10px 24px; 
  background: linear-gradient(135deg, #22c55e, #16a34a); 
  border: none; 
  border-radius: 8px; 
  font-size: 14px; 
  font-weight: 600; 
  color: #fff; 
  cursor: pointer; 
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
  transition: all 0.2s;
}
.btn-buy:hover { 
  background: linear-gradient(135deg, #16a34a, #15803d); 
  box-shadow: 0 6px 16px rgba(34, 197, 94, 0.5);
  transform: translateY(-1px);
}
.btn-finish { padding: 8px 20px; background: linear-gradient(135deg, #D4775C, #C96B50); border: none; border-radius: 8px; font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; }
.btn-finish:hover { opacity: 0.9; }
.undo-redo { display: flex; gap: 4px; margin-right: 8px; }
.btn-icon { width: 32px; height: 32px; background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 6px; font-size: 14px; color: #6B6560; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-icon:hover:not(:disabled) { background: #EBE7E0; color: #2D2A26; }
.btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }

/* Backend Status Indicator */
.backend-status { display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; margin-right: 8px; }
.backend-status.connected { background: rgba(16, 185, 129, 0.1); color: #059669; }
.backend-status.local { background: rgba(245, 158, 11, 0.1); color: #D97706; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; }
.backend-status.connected .status-dot { background: #10B981; animation: pulse-green 2s infinite; }
.backend-status.local .status-dot { background: #F59E0B; }
.status-text { font-weight: 500; }
@keyframes pulse-green { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

/* Body */
.editor-body { display: flex; flex: 1; overflow: hidden; }

/* Sidebar Pages */
.sidebar-pages { width: 120px; background: #fff; border-right: 1px solid #EBE7E0; display: flex; flex-direction: column; }
.sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #EBE7E0; }
.sidebar-header span { font-size: 10px; font-weight: 700; color: #9A958E; letter-spacing: 0.5px; }
.sidebar-btns { display: flex; gap: 4px; }
.btn-add { width: 24px; height: 24px; background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 6px; font-size: 16px; color: #6B6560; cursor: pointer; }
.btn-add:hover:not(:disabled) { background: #EBE7E0; }
.btn-add:disabled { opacity: 0.4; cursor: not-allowed; }
.pages-list { flex: 1; overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 6px; min-height: 0; }
.spread-thumb { cursor: pointer; border-radius: 4px; border: 2px solid #EBE7E0; overflow: hidden; transition: all 0.15s; background: #fff; flex-shrink: 0; }
.spread-thumb:hover { border-color: #D4D0C8; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
.spread-thumb.active { border-color: #D4775C; box-shadow: 0 0 0 2px rgba(212,119,92,0.2); }
.spread-preview { display: flex; height: 36px; background: #f5f4f2; }
.spread-page { flex: 1; position: relative; background: #fff; margin: 2px; border-radius: 2px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
.spread-page.left { margin-right: 1px; }
.spread-page.right { margin-left: 1px; }
.thumb-el { position: absolute; background: #F0EBE3; overflow: hidden; border-radius: 1px; }
.thumb-el img { width: 100%; height: 100%; object-fit: cover; }
.spread-num { display: block; text-align: center; padding: 3px; font-size: 9px; font-weight: 600; color: #6B6560; background: #fafaf8; border-top: 1px solid #EBE7E0; }

/* Cover Thumbnail */
.cover-thumb { cursor: pointer; border-radius: 4px; border: 2px solid #EBE7E0; overflow: hidden; transition: all 0.15s; background: #fff; flex-shrink: 0; }
.cover-thumb:hover { border-color: #D4D0C8; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
.cover-thumb.active { border-color: #D4775C; box-shadow: 0 0 0 2px rgba(212,119,92,0.2); }
.cover-spread-preview { display: flex; height: 36px; background: #f5f4f2; border-radius: 3px; overflow: hidden; }
.cover-fold-preview { width: 3px; background: linear-gradient(90deg, #E0DCD5, #D0CCC5); }
.cover-fold-preview.left { border-right: 1px dashed #C4BFB5; }
.cover-fold-preview.right { border-left: 1px dashed #C4BFB5; }
.cover-spine-preview { min-width: 4px; background: #fff; border-left: 1px dashed #C4BFB5; border-right: 1px dashed #C4BFB5; }
.cover-back-preview, .cover-front-preview { flex: 1; position: relative; background: #fff; display: flex; align-items: center; justify-content: center; margin: 2px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
.cover-label-small { font-size: 9px; color: #bbb; font-weight: 600; }
.cover-preview { aspect-ratio: 1.4; background: #fff; position: relative; display: flex; align-items: center; justify-content: center; }
.cover-label { font-size: 20px; color: #9A958E; }
.cover-num { display: block; text-align: center; padding: 3px; font-size: 9px; font-weight: 600; color: #6B6560; background: #fafaf8; border-top: 1px solid #EBE7E0; }

/* Cover Spread (Capa Aberta) - Novo Design Profissional */
.cover-layout { position: relative; }

/* Botão de Help */
.help-toggle {
  position: absolute;
  top: -40px;
  right: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #fff;
  border: 1px solid #EBE7E0;
  border-radius: 6px;
  font-size: 12px;
  color: #6B6560;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
}
.help-toggle:hover { background: #F7F4EE; border-color: #D4775C; }
.help-toggle.active { background: #FEF3E2; border-color: #D4775C; color: #D4775C; }

/* Container externo com sangria */
.cover-wrapper-outer {
  display: flex;
  flex-direction: column;
  background: #E8E4DD;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 12px 50px rgba(45,42,38,0.2);
}

/* Áreas de Sangria (Bleed) */
.bleed-area {
  background: repeating-linear-gradient(
    45deg,
    #F5F2ED,
    #F5F2ED 4px,
    #EBE7E0 4px,
    #EBE7E0 8px
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.3s;
  pointer-events: none;
}
.bleed-area.show-help {
  background: repeating-linear-gradient(
    45deg,
    rgba(212,119,92,0.08),
    rgba(212,119,92,0.08) 4px,
    rgba(212,119,92,0.15) 4px,
    rgba(212,119,92,0.15) 8px
  );
}
.bleed-area.bleed-top, .bleed-area.bleed-bottom {
  height: 15px;
}
.bleed-area.bleed-left, .bleed-area.bleed-right {
  width: 15px;
}
.bleed-label {
  font-size: 8px;
  font-weight: 600;
  color: #D4775C;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.8;
}
.bleed-label.vertical {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

/* Container do meio (páginas + lombada) */
.cover-wrapper-middle {
  display: flex;
  position: relative;
}

/* Imagem panorâmica de fundo */
.fullcover-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-size: cover;
  background-position: center;
  z-index: 0;
  pointer-events: none;
}

/* Páginas da Capa */
.cover-back, .cover-front {
  background: #fff;
  position: relative;
  transition: box-shadow 0.2s;
  overflow: hidden;
  z-index: 1;
}
.cover-back { border-right: 1px solid rgba(0,0,0,0.08); }
.cover-front { border-left: 1px solid rgba(0,0,0,0.08); }
.cover-back.has-fullcover { border-right: none; background: transparent; }
.cover-front.has-fullcover { border-left: none; background: transparent; }
.cover-back.page-active, .cover-front.page-active {
  box-shadow: inset 0 0 0 3px rgba(212,119,92,0.3);
}

/* Quando há fullCover, tornar páginas transparentes */
.cover-wrapper-middle:has(.fullcover-background) .cover-back,
.cover-wrapper-middle:has(.fullcover-background) .cover-front {
  background: transparent;
  border: none;
}
.cover-wrapper-middle:has(.fullcover-background) .cover-spine {
  background: transparent;
  border: none;
}
.cover-wrapper-middle:has(.fullcover-background) .cover-spine .spine-groove {
  display: none;
}
/* Esconder elementos fullCover individuais quando há imagem de fundo */
.fullcover-hidden {
  display: none !important;
}

/* Label do canto */
.cover-label-corner {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 9px;
  font-weight: 600;
  color: #B8A398;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  z-index: 2;
  pointer-events: none;
}

/* Área Segura (margem interna) */
.safe-margin-indicator {
  position: absolute;
  inset: 15px;
  border: 1px dashed rgba(76,175,80,0.4);
  border-radius: 2px;
  pointer-events: none;
  z-index: 1;
}
.safe-label {
  position: absolute;
  bottom: -16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 8px;
  color: rgba(76,175,80,0.7);
  white-space: nowrap;
  background: #fff;
  padding: 0 4px;
}

/* Lombada */
.cover-spine { 
  min-width: 20px;
  background: #fff; 
  display: flex; 
  flex-direction: column;
  align-items: center; 
  justify-content: center; 
  cursor: pointer; 
  transition: all 0.3s;
  position: relative;
  border-left: 1px dashed #C4BFB5;
  border-right: 1px dashed #C4BFB5;
}
.cover-spine.has-fullcover {
  background: transparent;
  border-left: none;
  border-right: none;
}
.cover-spine:hover { 
  background: #FAFAFA;
}
.cover-spine.page-active {
  box-shadow: 0 0 0 3px rgba(212,119,92,0.4);
}
.cover-spine.show-help {
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 4px,
    rgba(139, 115, 85, 0.08) 4px,
    rgba(139, 115, 85, 0.08) 8px
  );
}
.spine-groove { 
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: #D4D0C8;
}
.spine-groove.left { left: 0; }
.spine-groove.right { right: 0; }
.spine-content { 
  flex: 1; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  padding: 8px 0;
  position: relative;
  width: 100%;
}
.spine-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-90deg);
  font-size: 8px;
  font-weight: 600;
  color: rgba(74,69,64,0.5);
  text-transform: uppercase;
  letter-spacing: 2px;
  white-space: nowrap;
}
.spine-size-label {
  position: absolute;
  bottom: 4px;
  font-size: 7px;
  font-weight: 600;
  color: rgba(74,69,64,0.6);
  background: rgba(255,255,255,0.5);
  padding: 1px 4px;
  border-radius: 2px;
}
.spine-drop-zone {
  position: absolute;
  inset: 4px 2px;
  border: 2px dashed #D4775C;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(212,119,92,0.1);
}
.spine-drop-zone span {
  font-size: 14px;
  color: #D4775C;
}

/* Elementos da Lombada */
.spine-element { 
  position: absolute !important;
  cursor: move;
}
.spine-element.selected {
  outline: 2px solid #D4775C;
}
.spine-text-el {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spine-textarea {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  width: 100%;
  height: 100%;
  background: rgba(255,255,255,0.9);
  border: 1px solid #D4775C;
  resize: none;
  font-size: inherit;
  font-family: inherit;
  text-align: center;
}

/* Legenda de Help */
.cover-help-legend {
  display: flex;
  gap: 20px;
  margin-top: 16px;
  padding: 12px 16px;
  background: #F7F4EE;
  border-radius: 8px;
  font-size: 11px;
  color: #6B6560;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
}
.legend-color.safe {
  border: 2px dashed rgba(76,175,80,0.6);
  background: rgba(76,175,80,0.1);
}
.legend-color.bleed {
  background: repeating-linear-gradient(45deg, rgba(212,119,92,0.1), rgba(212,119,92,0.1) 2px, rgba(212,119,92,0.2) 2px, rgba(212,119,92,0.2) 4px);
}
.legend-color.spine {
  background: linear-gradient(90deg, #8B7355, #C9B99A, #8B7355);
}

/* Spine options panel */
.spine-options {
  padding: 12px;
}
.spine-options h4 {
  font-size: 12px;
  color: #6B6560;
  margin: 0 0 10px 0;
}
.color-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 2px solid #EBE7E0;
  cursor: pointer;
  transition: all 0.2s;
}
.color-swatch:hover {
  border-color: #D4775C;
  transform: scale(1.1);
}
.btn-add-spine-text {
  width: 100%;
  padding: 10px;
  background: #D4775C;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-add-spine-text:hover {
  background: #C4674C;
}

/* Cover selector with 3 buttons */
.page-selector.cover-selector {
  display: flex;
  gap: 4px;
}
.page-selector.cover-selector button {
  flex: 1;
  font-size: 11px;
  padding: 6px 4px;
}

/* Indicador de Área Segura */
.safe-area-indicator {
  position: absolute;
  inset: 10px;
  border: 1px dashed rgba(212,119,92,0.3);
  border-radius: 2px;
  pointer-events: none;
  z-index: 0;
}
.safe-area-indicator::before {
  content: 'Área Segura';
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 8px;
  color: rgba(212,119,92,0.5);
  white-space: nowrap;
}

.cover-label-corner { position: absolute; top: 8px; left: 8px; font-size: 9px; font-weight: 600; color: #9A958E; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; z-index: 1; }

/* Dimension line for fold */
.dimension-line.fold { }
.dimension-line.fold .dimension-value.small { font-size: 8px; padding: 1px 4px; background: #EDE9E3; color: #9A958E; }

/* Cover View */
.cover-view { display: flex; justify-content: center; gap: 6px; }
.cover-page { background: #fff; border-radius: 4px; box-shadow: 0 8px 40px rgba(45,42,38,0.15); position: relative; }
.cover-page .page-empty { color: #C4BFB5; }
.cover-page .page-empty span { font-size: 48px; margin-bottom: 12px; }
.cover-page .page-empty p { font-size: 15px; font-weight: 500; color: #9A958E; margin: 0; }
.cover-page .page-empty small { font-size: 12px; margin-top: 6px; color: #C4BFB5; display: block; }

/* Canvas */
.canvas-container { flex: 1; display: flex; flex-direction: column; background: #E8E4DD; }
.canvas-toolbar { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; background: #F7F4EE; border-bottom: 1px solid #EBE7E0; }
.zoom-btn { width: 32px; height: 32px; background: #fff; border: 1px solid #EBE7E0; border-radius: 6px; font-size: 18px; color: #6B6560; cursor: pointer; }
.zoom-btn:hover { background: #EBE7E0; }
.zoom-val { font-size: 13px; color: #6B6560; min-width: 50px; text-align: center; }
.toolbar-separator { width: 1px; height: 24px; background: #EBE7E0; margin: 0 8px; }
.toolbar-btn { padding: 6px 12px; background: #fff; border: 1px solid #EBE7E0; border-radius: 6px; font-size: 12px; color: #6B6560; cursor: pointer; }
.toolbar-btn:hover:not(:disabled) { background: #EBE7E0; color: #2D2A26; }
.toolbar-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.canvas-scroll { flex: 1; overflow: auto; display: flex; align-items: center; justify-content: center; padding: 40px; }
.canvas-wrapper { transform-origin: center center; }

/* Layout com Cotas Técnicas */
.cover-layout, .spread-layout { display: flex; flex-direction: column; align-items: center; }
.cover-main, .spread-main { display: flex; align-items: center; }

/* Linhas de Cota */
.dimension-row { display: flex; gap: 6px; margin-bottom: 12px; }
.dimension-col { display: flex; align-items: center; margin-right: 12px; }
.dimension-line { position: relative; display: flex; align-items: center; justify-content: center; }
.dimension-line::before, .dimension-line::after { content: ''; position: absolute; background: #B8A398; }
/* Linha horizontal */
.dimension-line:not(.vertical)::before { left: 0; right: 0; top: 50%; height: 1px; }
.dimension-line:not(.vertical)::after { content: ''; width: 1px; height: 8px; top: calc(50% - 4px); left: 0; box-shadow: calc(100% - 1px) 0 0 0 #B8A398; }
/* Linha vertical */
.dimension-line.vertical::before { top: 0; bottom: 0; left: 50%; width: 1px; }
.dimension-line.vertical::after { content: ''; height: 1px; width: 8px; left: calc(50% - 4px); top: 0; box-shadow: 0 calc(100% - 1px) 0 0 #B8A398; }
.dimension-value { background: #FDFBF7; padding: 2px 8px; font-size: 11px; font-weight: 600; color: #6B6560; border-radius: 4px; white-space: nowrap; z-index: 1; }
.dimension-line.spine .dimension-value { background: #FEF3E2; color: #B8632E; }

.spread { display: flex; box-shadow: 0 8px 40px rgba(45,42,38,0.15); border-radius: 4px; overflow: hidden; }
.page { background: #fff; position: relative; cursor: pointer; transition: box-shadow 0.2s; }
.page-left { border-radius: 4px 0 0 4px; }
.page-right { border-radius: 0 4px 4px 0; }
.page-active { box-shadow: inset 0 0 0 3px rgba(212,119,92,0.3); }
.spine { width: 6px; background: linear-gradient(90deg, #E5E0D8, #F5F2ED, #E5E0D8); }
.page-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #C4BFB5; pointer-events: none; }
.page-empty span { font-size: 40px; margin-bottom: 8px; }
.page-empty p { font-size: 14px; }
.page.dropping { background: #FEF9F6; }
.drop-zone { position: absolute; inset: 10px; border: 3px dashed #D4775C; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: rgba(212,119,92,0.05); }
.drop-icon { width: 50px; height: 50px; background: #D4775C; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 28px; }

/* Spread Wrapper com Sangria (Miolo) */
.spread-wrapper-outer { display: flex; flex-direction: column; }
.spread-wrapper-middle { display: flex; }

/* Spread Layflat (páginas juntas) */
.spread-layflat { 
  display: flex; 
  box-shadow: 0 8px 40px rgba(45,42,38,0.15); 
  border-radius: 0;
  position: relative;
}
.spread-layflat .page.layflat { 
  border-radius: 0;
  overflow: hidden;
}
.spread-layflat .page-left.layflat { 
  border-right: none; 
}
.spread-layflat .page-right.layflat { 
  border-left: none; 
}

/* Elementos do Spread (atravessam as duas páginas) */
.spread-element {
  position: absolute !important;
  z-index: 15 !important;
  cursor: move;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}
.spread-element:hover {
  border-color: rgba(212, 119, 92, 0.5);
}
.spread-element.selected {
  border-color: #D4775C;
  box-shadow: 0 0 0 2px rgba(212, 119, 92, 0.3);
}
.spread-element img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

/* Linha Central Layflat - Área de drop para fotos em página dupla */
.layflat-center {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 40px;
  transform: translateX(-50%);
  z-index: 18;
  pointer-events: auto;
  cursor: pointer;
}
.layflat-line {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  transform: translateX(-50%);
  background: transparent;
}
.layflat-center.show-help .layflat-line {
  background: repeating-linear-gradient(
    0deg,
    #D4775C,
    #D4775C 4px,
    transparent 4px,
    transparent 8px
  );
  opacity: 0.5;
}
.layflat-center.dropping {
  background: rgba(212, 119, 92, 0.2);
  width: 80px;
}
.layflat-center.dropping .layflat-line {
  background: #D4775C;
  width: 4px;
}
.layflat-drop-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.15);
  white-space: nowrap;
  font-size: 12px;
  color: #D4775C;
  font-weight: 600;
}

/* Área Segura nas Páginas */
.safe-margin-indicator.page-safe {
  position: absolute;
  inset: 15px;
  border: 1px dashed rgba(34, 197, 94, 0.5);
  border-radius: 4px;
  pointer-events: none;
  z-index: 5;
}
.safe-margin-indicator.page-safe .safe-label {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(34, 197, 94, 0.1);
  color: rgba(34, 197, 94, 0.8);
  font-size: 8px;
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

/* Legenda - item centro */
.legend-color.center {
  background: repeating-linear-gradient(
    0deg,
    #D4775C,
    #D4775C 2px,
    transparent 2px,
    transparent 4px
  );
}

/* Elements */
.element { position: absolute; cursor: move; border: 2px solid transparent; transition: border-color 0.15s, transform 0.2s; overflow: hidden; }
.element:hover { border-color: #D4D0C8; }
.element.selected { border-color: #D4775C !important; }
.element.locked { cursor: not-allowed; }
.element.locked::after { content: '🔒'; position: absolute; top: 4px; right: 4px; font-size: 12px; background: rgba(255,255,255,0.9); padding: 2px 4px; border-radius: 4px; }
.element.placeholder { background: #F7F4EE; border: 2px dashed #D4D0C8; cursor: default; }
.element.placeholder:hover { border-color: #D4775C; background: #FEF9F6; }
.placeholder-content { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9A958E; pointer-events: none; }
.placeholder-content span { font-size: 24px; margin-bottom: 4px; opacity: 0.6; }
.placeholder-content p { font-size: 11px; margin: 0; }
.element img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
.element-drop-zone { position: absolute; inset: 0; background: rgba(212,119,92,0.15); border: 3px solid #D4775C; border-radius: 4px; pointer-events: none; }
.text-content { width: 100%; height: 100%; padding: 4px; }
.text-content textarea { width: 100%; height: 100%; border: 1px solid #D4775C; background: #fff; resize: none; font: inherit; padding: 4px; border-radius: 4px; }
.resize-handle { position: absolute; bottom: -6px; right: -6px; width: 12px; height: 12px; background: #D4775C; border: 2px solid #fff; border-radius: 2px; cursor: se-resize; }

/* Panel Right - Novo Design */
.panel-right { width: 280px; background: #FAFAF8; border-left: 1px solid #EBE7E0; display: flex; flex-direction: column; }

/* Tabs do Painel */
.panel-tabs { 
  display: flex; 
  background: #fff;
  border-bottom: 1px solid #EBE7E0; 
  padding: 8px 8px 0;
  gap: 2px;
}
.panel-tabs button { 
  flex: 1; 
  padding: 10px 4px 8px; 
  background: transparent; 
  border: none; 
  border-bottom: 2px solid transparent; 
  font-size: 10px; 
  color: #9A958E; 
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: all 0.2s;
  border-radius: 6px 6px 0 0;
}
.panel-tabs button:hover { color: #6B6560; background: #F7F4EE; }
.panel-tabs button.active { color: #D4775C; border-bottom-color: #D4775C; background: #FEF9F6; }
.tab-icon { font-size: 16px; }
.tab-label { font-size: 9px; font-weight: 500; }

.panel-content { flex: 1; overflow-y: auto; padding: 12px; }
.panel-hint { font-size: 11px; color: #9A958E; margin-bottom: 12px; }

/* Photos Panel - Novo Design */
.photos-panel { padding: 0 !important; display: flex; flex-direction: column; }

.panel-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 8px;
  background: #fff;
  border-bottom: 1px solid #EBE7E0;
}
.panel-section-header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #2D2A26;
}
.photo-count {
  background: #EBE7E0;
  color: #6B6560;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

/* Upload Zone Compacta */
.upload-zone {
  margin: 12px;
  padding: 16px;
  border: 2px dashed #D4D0C8;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}
.upload-zone:hover {
  border-color: #D4775C;
  background: #FEF9F6;
}
.upload-zone.is-dragging {
  border-color: #D4775C;
  background: #FEF3E2;
  border-style: solid;
}
.upload-zone-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.upload-icon-new {
  width: 28px;
  height: 28px;
  background: #D4775C;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 300;
}
.upload-text {
  font-size: 13px;
  font-weight: 500;
  color: #6B6560;
}

/* Quick Action Button */
.quick-action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 12px 12px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #D4775C, #E8956F);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.quick-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(212, 119, 92, 0.3);
}
.quick-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.qa-icon { font-size: 16px; }
.qa-text { flex: 1; text-align: left; }
.qa-badge {
  background: rgba(255,255,255,0.3);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}

/* Photo Toolbar */
.photo-toolbar {
  padding: 0 12px 8px;
  background: #fff;
  border-bottom: 1px solid #EBE7E0;
}
.filter-tabs {
  display: flex;
  gap: 4px;
}
.filter-tabs button {
  flex: 1;
  padding: 6px 8px;
  background: #F7F4EE;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 11px;
  color: #6B6560;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.filter-tabs button:hover {
  background: #EBE7E0;
}
.filter-tabs button.active {
  background: #2D2A26;
  color: #fff;
}
.filter-tabs .count {
  font-size: 10px;
  opacity: 0.7;
}

/* Photos Grid - Novo */
.photos-grid-new {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 12px;
  flex: 1;
  overflow-y: auto;
  align-content: start;
}
.photo-card {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: grab;
  background: #EBE7E0;
  transition: all 0.2s;
}
.photo-card:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.photo-card:active { cursor: grabbing; }
.photo-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.photo-card.used {
  opacity: 0.5;
}
.photo-card.favorite {
  box-shadow: 0 0 0 2px #D4775C;
}
.photo-card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}
.photo-card:hover .photo-card-overlay {
  opacity: 1;
}
.photo-btn {
  width: 24px;
  height: 24px;
  background: rgba(255,255,255,0.9);
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.photo-btn:hover {
  background: #fff;
  transform: scale(1.1);
}
.used-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 18px;
  height: 18px;
  background: #10B981;
  border-radius: 50%;
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}
.empty-title {
  font-size: 14px;
  font-weight: 600;
  color: #6B6560;
  margin: 0 0 4px;
}
.empty-desc {
  font-size: 12px;
  color: #9A958E;
  margin: 0;
}

/* Tools Section (colapsável) */
.tools-section {
  margin: 0 12px 12px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #EBE7E0;
}
.tools-section summary {
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #6B6560;
  cursor: pointer;
  list-style: none;
}
.tools-section summary::-webkit-details-marker {
  display: none;
}
.tools-section[open] summary {
  border-bottom: 1px solid #EBE7E0;
}
.tools-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  padding: 10px;
}
.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  background: #F7F4EE;
  border: 1px solid #EBE7E0;
  border-radius: 8px;
  font-size: 10px;
  color: #6B6560;
  cursor: pointer;
  transition: all 0.2s;
}
.tool-btn:hover {
  background: #EBE7E0;
  border-color: #D4775C;
}
.tool-btn span:first-child {
  font-size: 16px;
}

/* Page Selector */
.page-selector { display: flex; gap: 6px; margin-bottom: 12px; }
.page-selector button { 
  flex: 1; 
  padding: 8px 10px; 
  background: #fff; 
  border: 1px solid #EBE7E0; 
  border-radius: 8px; 
  font-size: 11px; 
  font-weight: 500; 
  color: #6B6560; 
  cursor: pointer; 
  transition: all 0.2s; 
}
.page-selector button:hover { border-color: #D4D0C8; background: #F7F4EE; }
.page-selector button.active { background: #D4775C; border-color: #D4775C; color: #fff; }

/* Layouts */
.layouts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-height: 400px; overflow-y: auto; padding-right: 4px; }
.layout-item { cursor: pointer; text-align: center; }
.layout-preview { 
  aspect-ratio: 1.4; 
  background: #fff; 
  border-radius: 6px; 
  position: relative; 
  border: 2px solid #EBE7E0; 
  transition: 0.2s;
  overflow: hidden;
}
.layout-preview.landscape { aspect-ratio: 1.5; }
.layout-preview.portrait { aspect-ratio: 0.75; }
.layout-preview.square { aspect-ratio: 1; }
.layout-item:hover .layout-preview { border-color: #D4775C; transform: scale(1.03); box-shadow: 0 2px 8px rgba(212,119,92,0.2); }
.layout-rect { position: absolute; background: #D4D0C8; border-radius: 2px; transition: background 0.2s; }
.layout-item:hover .layout-rect { background: #D4775C; opacity: 0.6; }
.layout-item span { display: block; font-size: 9px; color: #9A958E; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.layouts-format-badge { display: inline-block; padding: 2px 8px; background: #F7F4EE; border-radius: 10px; font-size: 10px; color: #6B6560; margin-bottom: 8px; }
.layouts-format-badge strong { color: #D4775C; }

/* Layout Preview Spread (página dupla) */
.layout-item.layout-spread { }
.layout-preview-spread {
  aspect-ratio: 2.8;
  background: #fff;
  border-radius: 6px;
  position: relative;
  border: 2px solid #EBE7E0;
  transition: 0.2s;
  overflow: hidden;
  display: flex;
}
.layout-preview-spread .preview-left,
.layout-preview-spread .preview-right {
  flex: 1;
  background: #FAFAFA;
  border: 1px dashed #E0E0E0;
}
.layout-preview-spread .preview-left { border-right: 1px dashed #D4775C; }
.layout-item.layout-spread:hover .layout-preview-spread { border-color: #D4775C; transform: scale(1.03); }
.layout-item.layout-spread:hover .layout-rect { background: #D4775C; opacity: 0.6; }

/* Layout Preview Full Cover (capa completa) */
.layout-item.layout-full { }
.layout-preview-full {
  aspect-ratio: 3;
  background: #fff;
  border-radius: 6px;
  position: relative;
  border: 2px solid #EBE7E0;
  transition: 0.2s;
  overflow: hidden;
  display: flex;
}
.layout-preview-full .preview-back,
.layout-preview-full .preview-front {
  flex: 1;
  background: #FAFAFA;
}
.layout-preview-full .preview-spine {
  width: 8px;
  background: #E8E4DC;
}
.layout-preview-full .preview-back { border-right: 1px solid #E0E0E0; }
.layout-preview-full .preview-front { border-left: 1px solid #E0E0E0; }
.layout-item.layout-full:hover .layout-preview-full { border-color: #D4775C; transform: scale(1.03); }
.layout-item.layout-full:hover .layout-rect { background: #D4775C; opacity: 0.6; }

/* Text */
.text-btns { display: flex; flex-direction: column; gap: 8px; }
.text-btns button { display: flex; flex-direction: column; align-items: flex-start; padding: 14px 16px; background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 10px; cursor: pointer; transition: 0.2s; }
.text-btns button:hover { background: #EBE7E0; border-color: #D4D0C8; }
.text-btns strong { font-size: 18px; color: #2D2A26; }
.text-btns span { font-size: 14px; color: #6B6560; }
.text-btns small { font-size: 11px; color: #9A958E; margin-top: 2px; }

/* Props Bar */
.props-bar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #fff; border-top: 1px solid #EBE7E0; flex-wrap: wrap; }
.props-section { display: flex; align-items: center; gap: 6px; padding: 0 8px; border-right: 1px solid #EBE7E0; }
.props-section:last-of-type { border-right: none; }
.props-title { font-size: 12px; font-weight: 600; color: #2D2A26; }
.props-label { font-size: 10px; color: #9A958E; text-transform: uppercase; margin-right: 4px; }
.props-row { display: flex; align-items: center; gap: 4px; }
.prop { display: flex; align-items: center; gap: 3px; }
.prop label { font-size: 10px; color: #9A958E; }
.prop input { background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 4px; padding: 4px 6px; font-size: 12px; color: #2D2A26; width: 50px; }
.prop input:focus { outline: none; border-color: #D4775C; }
.select-font { background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 4px; padding: 4px 6px; font-size: 12px; color: #2D2A26; width: 100px; }
.input-small { width: 45px !important; }
.input-tiny { width: 35px !important; background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 4px; padding: 4px; font-size: 11px; color: #2D2A26; text-align: center; }
.input-range { width: 50px; cursor: pointer; }
.input-color { width: 28px !important; height: 28px !important; padding: 2px !important; cursor: pointer; border-radius: 4px; }
.input-color-small { width: 24px !important; height: 24px !important; padding: 1px !important; cursor: pointer; border-radius: 4px; }
.select-small { background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 4px; padding: 4px; font-size: 11px; color: #2D2A26; }
.btn-icon-tiny { width: 22px; height: 22px; background: transparent; border: none; font-size: 12px; cursor: pointer; opacity: 0.6; }
.btn-icon-tiny:hover { opacity: 1; }
.btn-icon-tiny.active { opacity: 1; color: #D4775C; }
.btn-icon-small { width: 28px; height: 28px; background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 4px; font-size: 12px; color: #6B6560; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-icon-small:hover { background: #EBE7E0; }
.btn-icon-small.active { background: #D4775C; color: #fff; border-color: #D4775C; }
.btn-small { padding: 6px 10px; background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 4px; font-size: 11px; color: #6B6560; cursor: pointer; }
.btn-small:hover { background: #EBE7E0; }
.btn-delete { margin-left: auto; width: 36px; height: 36px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; color: #DC2626; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-delete:hover { background: #FEE2E2; }

/* Responsive */
@media (max-width: 1100px) { .sidebar-pages { width: 100px; } .panel-right { width: 200px; } }
@media (max-width: 900px) { .sidebar-pages { display: none; } }
@media (max-width: 700px) { .panel-right { display: none; } }

/* Preview Modal */
.preview-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
.preview-container { background: #1a1a1a; border-radius: 16px; max-width: 95vw; max-height: 95vh; display: flex; flex-direction: column; overflow: hidden; }
.preview-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid #333; }
.preview-header h2 { color: #fff; font-size: 18px; font-weight: 600; margin: 0; }
.preview-close { width: 36px; height: 36px; background: #333; border: none; border-radius: 8px; color: #fff; font-size: 18px; cursor: pointer; }
.preview-close:hover { background: #444; }
.preview-content { flex: 1; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 16px; overflow: auto; }
.preview-nav { display: flex; align-items: center; gap: 16px; }
.preview-nav button { width: 40px; height: 40px; background: #333; border: none; border-radius: 8px; color: #fff; font-size: 20px; cursor: pointer; }
.preview-nav button:hover:not(:disabled) { background: #444; }
.preview-nav button:disabled { opacity: 0.3; cursor: not-allowed; }
.preview-nav span { color: #fff; font-size: 14px; min-width: 120px; text-align: center; }
.preview-spread { display: flex; background: #fff; border-radius: 4px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); overflow: hidden; }
.preview-spread.preview-cover .preview-page { width: 300px; height: 214px; }
.preview-page { width: 300px; height: 214px; position: relative; background: #fff; }
.preview-spine { width: 20px; background: linear-gradient(90deg, #C9B99A, #D4C4A8, #C9B99A); display: flex; align-items: center; justify-content: center; writing-mode: vertical-rl; font-size: 9px; font-weight: 600; color: #6B6560; }
.preview-spine-inner { width: 4px; background: linear-gradient(90deg, #E5E0D8, #F5F2ED, #E5E0D8); }
.preview-el { overflow: hidden; }
.preview-el img { width: 100%; height: 100%; object-fit: cover; }
.preview-footer { padding: 16px 24px; border-top: 1px solid #333; }
.preview-thumbs { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.preview-thumb { padding: 8px 12px; background: #333; border: 2px solid transparent; border-radius: 6px; color: #999; font-size: 11px; cursor: pointer; }
.preview-thumb:hover { background: #444; color: #fff; }
.preview-thumb.active { border-color: #D4775C; color: #fff; background: #444; }

/* 3D Preview Modal */
.preview-3d-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
.preview-3d-wrapper { background: #0f0e0d; border-radius: 20px; width: 95vw; max-width: 1200px; height: 90vh; max-height: 800px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 80px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.1); }
.preview-3d-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.5); }
.preview-3d-header h2 { color: #fff; font-size: 18px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 10px; }
.preview-3d-close { width: 40px; height: 40px; background: rgba(255,255,255,0.1); border: none; border-radius: 10px; color: #fff; font-size: 20px; cursor: pointer; transition: all 0.2s; }
.preview-3d-close:hover { background: #D4775C; transform: scale(1.05); }
.preview-3d-body { flex: 1; padding: 0; overflow: hidden; background: #0f0e0d; }
.preview-3d-body > * { width: 100%; height: 100%; }
.preview-3d-footer { display: none; }

/* Button Preview */
.btn-preview { padding: 8px 16px; background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 8px; font-size: 13px; font-weight: 500; color: #6B6560; cursor: pointer; }
.btn-preview:hover { background: #EBE7E0; color: #2D2A26; }

/* Toolbar Button Active */
.toolbar-btn.active { background: #D4775C; color: #fff; border-color: #D4775C; }

/* 3D Button Special */
.toolbar-btn.btn-3d {
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #1a1a1a, #2d2a26);
  border: 2px solid #D4775C;
  color: #fff;
  padding: 6px 14px;
  font-weight: 600;
}

.toolbar-btn.btn-3d:hover {
  background: linear-gradient(135deg, #D4775C, #E8956F);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(212, 119, 92, 0.3);
}

.toolbar-btn.btn-3d .icon-3d-anim {
  animation: rotate3d 4s ease-in-out infinite;
}

@keyframes rotate3d {
  0%, 100% { transform: rotateY(0deg); }
  50% { transform: rotateY(20deg); }
}

/* Canvas with Rulers */
.canvas-scroll.with-rulers { position: relative; }

/* Rulers */
.rulers-container { position: sticky; top: 0; left: 0; z-index: 100; pointer-events: none; }
.ruler-corner { position: fixed; top: 113px; left: 180px; width: 30px; height: 25px; background: #E8E4DD; border-right: 1px solid #D4D0C8; border-bottom: 1px solid #D4D0C8; z-index: 102; }
.ruler { position: fixed; background: #F7F4EE; z-index: 101; }
.ruler-horizontal { top: 113px; left: 210px; right: 280px; height: 25px; border-bottom: 1px solid #D4D0C8; display: flex; align-items: flex-end; overflow: hidden; }
.ruler-vertical { top: 138px; left: 180px; bottom: 0; width: 30px; border-right: 1px solid #D4D0C8; overflow: hidden; }
.ruler-mark { position: absolute; font-size: 9px; color: #6B6560; font-family: monospace; }
.ruler-horizontal .ruler-mark { height: 100%; display: flex; align-items: flex-end; padding: 0 3px 2px; border-left: 1px solid #C4BFB5; }
.ruler-vertical .ruler-mark { width: 100%; display: flex; justify-content: flex-end; padding: 2px 3px 0; border-top: 1px solid #C4BFB5; }
.ruler-vertical .ruler-mark span { writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); }

/* Page Grid */
.page-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(212,119,92,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,119,92,0.1) 1px, transparent 1px); background-size: 20px 20px; pointer-events: none; z-index: 1; }

/* Layers Panel */
.layers-panel { position: absolute; right: 10px; top: 60px; width: 220px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); z-index: 100; overflow: hidden; }
.layers-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #F7F4EE; border-bottom: 1px solid #EBE7E0; }
.layers-header span { font-size: 11px; font-weight: 700; color: #6B6560; letter-spacing: 0.5px; }
.layers-header button { width: 24px; height: 24px; background: transparent; border: none; font-size: 14px; color: #9A958E; cursor: pointer; }
.layers-header button:hover { color: #2D2A26; }
.layers-list { max-height: 300px; overflow-y: auto; }
.layer-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #F0EBE3; cursor: pointer; transition: background 0.15s; }
.layer-item:hover { background: #F7F4EE; }
.layer-item.selected { background: #FEF9F6; border-left: 3px solid #D4775C; }
.layer-icon { font-size: 14px; }
.layer-name { flex: 1; font-size: 12px; color: #2D2A26; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.layer-btn { width: 22px; height: 22px; background: transparent; border: none; font-size: 11px; color: #9A958E; cursor: pointer; border-radius: 4px; }
.layer-btn:hover:not(:disabled) { background: #EBE7E0; color: #2D2A26; }
.layer-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.layers-empty { padding: 20px; text-align: center; font-size: 12px; color: #9A958E; }

/* Stickers */
.stickers-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 16px; }
.sticker-item { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 24px; background: #F7F4EE; border: 2px solid #EBE7E0; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
.sticker-item:hover { border-color: #D4775C; background: #FEF9F6; transform: scale(1.1); }
.sticker-categories { display: flex; gap: 6px; flex-wrap: wrap; }
.sticker-categories button { padding: 6px 12px; background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 20px; font-size: 11px; color: #6B6560; cursor: pointer; }
.sticker-categories button:hover { background: #EBE7E0; }
.sticker-categories button.active { background: #D4775C; color: #fff; border-color: #D4775C; }
.sticker-content { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 40px; }

/* Backgrounds */
.backgrounds-section { margin-bottom: 20px; }
.section-title { display: block; font-size: 11px; font-weight: 600; color: #6B6560; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
.colors-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
.color-item { aspect-ratio: 1; border-radius: 8px; cursor: pointer; border: 2px solid #EBE7E0; transition: all 0.15s; }
.color-item:hover { border-color: #D4775C; transform: scale(1.1); }
.color-item.gradient { border-radius: 8px; }
.patterns-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.pattern-item { aspect-ratio: 1; border-radius: 8px; cursor: pointer; border: 2px solid #EBE7E0; transition: all 0.15s; }
.pattern-item:hover { border-color: #D4775C; }
.btn-clear-bg { width: 100%; padding: 10px; background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 8px; font-size: 12px; color: #6B6560; cursor: pointer; margin-top: 12px; }
.btn-clear-bg:hover { background: #EBE7E0; }

/* Templates */
.templates-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.template-item { cursor: pointer; text-align: center; }
.template-preview { display: flex; gap: 2px; aspect-ratio: 2.8; background: #F7F4EE; border-radius: 8px; border: 2px solid #EBE7E0; padding: 4px; transition: all 0.15s; }
.template-item:hover .template-preview { border-color: #D4775C; }
.template-page { flex: 1; background: #fff; border-radius: 2px; position: relative; }
.template-rect { position: absolute; background: #D4D0C8; border-radius: 1px; }
.template-item span { display: block; font-size: 11px; color: #9A958E; margin-top: 6px; }

/* Presentation Modal */
.presentation-modal { position: fixed; inset: 0; background: #000; z-index: 2000; display: flex; align-items: center; justify-content: center; outline: none; }
.presentation-content { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.presentation-spread { display: flex; max-width: 90vw; max-height: 80vh; }
.presentation-cover, .presentation-pages { display: flex; box-shadow: 0 20px 80px rgba(0,0,0,0.5); border-radius: 4px; overflow: hidden; }
.pres-page { width: 45vw; max-width: 500px; aspect-ratio: 1.4; background: #fff; position: relative; }
.pres-spine { width: 30px; background: linear-gradient(90deg, #C9B99A, #D4C4A8, #C9B99A); display: flex; align-items: center; justify-content: center; writing-mode: vertical-rl; font-size: 12px; font-weight: 600; color: #6B6560; }
.pres-spine-inner { width: 6px; background: linear-gradient(90deg, #E5E0D8, #F5F2ED, #E5E0D8); }
.pres-el { position: absolute; overflow: hidden; }
.pres-el img { width: 100%; height: 100%; object-fit: cover; }
.pres-sticker { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; }
.presentation-controls { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 20px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 12px 24px; border-radius: 50px; }
.presentation-controls button { width: 44px; height: 44px; background: rgba(255,255,255,0.2); border: none; border-radius: 50%; color: #fff; font-size: 20px; cursor: pointer; transition: all 0.2s; }
.presentation-controls button:hover:not(:disabled) { background: rgba(255,255,255,0.3); }
.presentation-controls button:disabled { opacity: 0.3; cursor: not-allowed; }
.presentation-controls span { color: #fff; font-size: 14px; min-width: 100px; text-align: center; }
.pres-close { background: rgba(220,38,38,0.8) !important; }
.pres-close:hover { background: rgba(220,38,38,1) !important; }

/* Rotate Handle */
.rotate-handle { position: absolute; top: -30px; left: 50%; transform: translateX(-50%); width: 24px; height: 24px; background: #D4775C; border: 2px solid #fff; border-radius: 50%; cursor: grab; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
.rotate-handle:hover { background: #C96B50; }
.rotate-handle:active { cursor: grabbing; }

/* Smart Guides */
.smart-guide { position: absolute; z-index: 1000; pointer-events: none; }
.smart-guide.horizontal { left: 0; right: 0; height: 1px; background: #D4775C; box-shadow: 0 0 4px rgba(212,119,92,0.5); }
.smart-guide.vertical { top: 0; bottom: 0; width: 1px; background: #D4775C; box-shadow: 0 0 4px rgba(212,119,92,0.5); }

/* Crop Modal */
.crop-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; }
.crop-container { background: #fff; border-radius: 16px; max-width: 600px; width: 100%; overflow: hidden; }
.crop-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #EBE7E0; }
.crop-header h3 { margin: 0; font-size: 16px; color: #2D2A26; }
.crop-close { width: 32px; height: 32px; background: #F7F4EE; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
.crop-close:hover { background: #EBE7E0; }
.crop-content { padding: 20px; }
.crop-preview { width: 100%; aspect-ratio: 1.4; background: #F7F4EE; border-radius: 8px; overflow: hidden; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; }
.crop-image-container { width: 80%; height: 80%; overflow: hidden; border-radius: 4px; position: relative; }
.crop-image-container img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.1s; }
.crop-controls { display: flex; flex-direction: column; gap: 16px; }
.crop-control { display: flex; align-items: center; gap: 12px; }
.crop-control label { width: 80px; font-size: 13px; color: #6B6560; }
.crop-control input[type="range"] { flex: 1; cursor: pointer; }
.crop-control span { width: 50px; text-align: right; font-size: 12px; color: #9A958E; }
.crop-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 20px; border-top: 1px solid #EBE7E0; }
.btn-cancel { padding: 10px 20px; background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 8px; font-size: 13px; color: #6B6560; cursor: pointer; }
.btn-cancel:hover { background: #EBE7E0; }
.btn-apply { padding: 10px 20px; background: linear-gradient(135deg, #D4775C, #C96B50); border: none; border-radius: 8px; font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; }
.btn-apply:hover { opacity: 0.9; }

/* Export Overlay */
.export-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 3000; display: flex; align-items: center; justify-content: center; }
.export-content { text-align: center; color: #fff; }
.export-spinner { width: 60px; height: 60px; border: 4px solid rgba(255,255,255,0.2); border-top-color: #D4775C; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
@keyframes spin { to { transform: rotate(360deg); } }
.export-content h3 { margin: 0 0 20px; font-size: 18px; font-weight: 500; }
.export-progress { width: 300px; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden; margin-bottom: 12px; }
.export-progress-bar { height: 100%; background: linear-gradient(90deg, #D4775C, #E8956F); border-radius: 4px; transition: width 0.3s; }
.export-content span { font-size: 14px; color: rgba(255,255,255,0.7); }

/* Shortcuts Modal */
.shortcuts-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; }
.shortcuts-container { background: #fff; border-radius: 16px; max-width: 500px; width: 100%; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; }
.shortcuts-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #EBE7E0; }
.shortcuts-header h3 { margin: 0; font-size: 16px; color: #2D2A26; }
.shortcuts-close { width: 32px; height: 32px; background: #F7F4EE; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
.shortcuts-close:hover { background: #EBE7E0; }
.shortcuts-content { padding: 20px; overflow-y: auto; }
.shortcuts-section { margin-bottom: 20px; }
.shortcuts-section:last-child { margin-bottom: 0; }
.shortcuts-section h4 { font-size: 12px; font-weight: 600; color: #9A958E; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px; }
.shortcut-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #F0EBE3; }
.shortcut-item:last-child { border-bottom: none; }
.shortcut-item kbd { display: inline-block; padding: 4px 8px; background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 4px; font-size: 11px; font-family: monospace; color: #2D2A26; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.shortcut-item span { flex: 1; text-align: right; font-size: 13px; color: #6B6560; }

/* Save Modal */
.save-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; }
.save-container { background: #fff; border-radius: 16px; max-width: 480px; width: 100%; overflow: hidden; }
.save-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #EBE7E0; }
.save-header h3 { margin: 0; font-size: 18px; color: #2D2A26; }
.save-header button { width: 32px; height: 32px; background: #F7F4EE; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
.save-header button:hover { background: #EBE7E0; }
.save-content { padding: 24px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; color: #4A4744; margin-bottom: 8px; }
.form-group input { width: 100%; padding: 12px 16px; border: 1px solid #E5E0D8; border-radius: 10px; font-size: 15px; color: #2D2A26; transition: 0.2s; }
.form-group input:focus { outline: none; border-color: #D4775C; box-shadow: 0 0 0 3px rgba(212,119,92,0.1); }
.save-hint { font-size: 13px; color: #6B6560; margin: 0; }
.save-actions { display: flex; gap: 12px; padding: 20px 24px; border-top: 1px solid #EBE7E0; }
.btn-cancel { flex: 1; padding: 12px; background: #F7F4EE; color: #6B6560; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-cancel:hover:not(:disabled) { background: #EBE7E0; }
.btn-save-confirm { flex: 1; padding: 12px; background: linear-gradient(135deg, #D4775C, #C96B50); color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-save-confirm:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(212,119,92,0.3); }
.btn-save-confirm:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

/* Success Modal */
.success-modal .save-content { text-align: center; }
.success-icon { font-size: 48px; margin-bottom: 16px; }
.success-message { font-size: 16px; font-weight: 500; color: #2D2A26; margin: 0 0 8px 0; }
.success-hint { font-size: 14px; color: #6B6560; margin: 0; }
.save-actions .btn-secondary { flex: 1; padding: 12px; background: #F7F4EE; color: #4A4744; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
.save-actions .btn-secondary:hover { background: #EBE7E0; }
.save-actions .btn-primary { flex: 1; padding: 12px; background: linear-gradient(135deg, #D4775C, #C96B50); color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
.save-actions .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(212,119,92,0.3); }

/* Elements Panel */
.elements-section { margin-bottom: 20px; }
.elements-section:last-child { margin-bottom: 0; }
.shapes-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.shape-btn { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 24px; background: #F7F4EE; border: 2px solid #EBE7E0; border-radius: 10px; cursor: pointer; transition: all 0.15s; color: #6B6560; }
.shape-btn:hover { border-color: #D4775C; background: #FEF9F6; color: #D4775C; transform: scale(1.05); }

/* New Panel Design */
.panel-tabs-new { display: flex; gap: 4px; padding: 12px; background: #F7F4EE; border-bottom: 1px solid #EBE7E0; }
.panel-tab-new { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 8px; background: transparent; border: none; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
.panel-tab-new:hover { background: rgba(212,119,92,0.1); }
.panel-tab-new.active { background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.panel-tab-new .tab-icon { font-size: 18px; }
.panel-tab-new .tab-label { font-size: 10px; font-weight: 500; color: #6B6560; }
.panel-tab-new.active .tab-label { color: #D4775C; }

/* Upload Zone Compact */
.upload-zone-compact { margin: 12px; padding: 16px; background: linear-gradient(135deg, #FEF9F6, #F7F4EE); border: 2px dashed #D4775C; border-radius: 12px; text-align: center; cursor: pointer; transition: all 0.2s; }
.upload-zone-compact:hover { background: #FEF9F6; border-style: solid; }
.upload-zone-compact.dragging { background: #FEF9F6; border-style: solid; transform: scale(1.02); }
.upload-zone-compact .upload-icon { font-size: 28px; margin-bottom: 8px; }
.upload-zone-compact .upload-text { font-size: 13px; font-weight: 500; color: #D4775C; margin: 0; }
.upload-zone-compact .upload-hint { font-size: 11px; color: #9A958E; margin: 4px 0 0; }

/* Quick Actions */
.quick-actions { padding: 0 12px 12px; }
.btn-auto-fill { width: 100%; padding: 12px 16px; background: linear-gradient(135deg, #D4775C, #C96B50); border: none; border-radius: 10px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
.btn-auto-fill:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(212,119,92,0.3); }
.btn-auto-fill:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

/* Photo Filters */
.photo-filters { display: flex; gap: 4px; padding: 8px 12px; background: #F7F4EE; border-bottom: 1px solid #EBE7E0; }
.filter-tab { padding: 6px 12px; background: transparent; border: none; border-radius: 6px; font-size: 11px; font-weight: 500; color: #6B6560; cursor: pointer; transition: all 0.15s; }
.filter-tab:hover { background: rgba(212,119,92,0.1); }
.filter-tab.active { background: #D4775C; color: #fff; }
.filter-tab .count { margin-left: 4px; opacity: 0.7; }

/* Photo Cards New */
.photos-grid-new { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px; }
.photo-card-new { position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; cursor: grab; background: #F7F4EE; }
.photo-card-new img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s; }
.photo-card-new:hover img { transform: scale(1.05); }
.photo-card-new.used { opacity: 0.5; }
.photo-card-new.used::after { content: '✓'; position: absolute; top: 4px; right: 4px; width: 18px; height: 18px; background: #22C55E; border-radius: 50%; color: #fff; font-size: 10px; display: flex; align-items: center; justify-content: center; }
.photo-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.6), transparent); opacity: 0; transition: opacity 0.2s; display: flex; align-items: flex-end; justify-content: center; padding: 8px; gap: 4px; }
.photo-card-new:hover .photo-overlay { opacity: 1; }
.photo-overlay button { width: 28px; height: 28px; background: rgba(255,255,255,0.9); border: none; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.15s; }
.photo-overlay button:hover { background: #fff; transform: scale(1.1); }
.photo-overlay .btn-favorite { color: #EF4444; }
.photo-overlay .btn-delete { color: #6B6560; }

/* More Tools Section */
.more-tools { margin: 12px; }
.more-tools-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #F7F4EE; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
.more-tools-header:hover { background: #EBE7E0; }
.more-tools-header span { font-size: 12px; font-weight: 500; color: #6B6560; }
.more-tools-header .chevron { font-size: 10px; transition: transform 0.2s; }
.more-tools-header.expanded .chevron { transform: rotate(180deg); }
.more-tools-content { padding: 12px 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.tool-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 8px; background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
.tool-btn:hover { background: #FEF9F6; border-color: #D4775C; }
.tool-btn .tool-icon { font-size: 20px; }
.tool-btn .tool-label { font-size: 11px; color: #6B6560; }

/* Photos Empty State */
.photos-empty { padding: 40px 20px; text-align: center; }
.photos-empty .empty-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.5; }
.photos-empty .empty-text { font-size: 14px; color: #6B6560; margin: 0 0 4px; }
.photos-empty .empty-hint { font-size: 12px; color: #9A958E; margin: 0; }
</style>
