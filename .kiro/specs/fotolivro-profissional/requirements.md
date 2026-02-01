# Requirements Document

## Introduction

Este documento define os requisitos para o sistema de Editor de Fotolivros Profissional, uma plataforma completa para fotógrafos criarem fotolivros com qualidade gráfica profissional. O sistema oferece um fluxo completo desde a criação do projeto até a exportação para produção gráfica, com validações automáticas para reduzir erros de impressão.

## Glossário

- **Fotolivro**: Produto impresso personalizado contendo fotografias organizadas em páginas
- **Sangria (Bleed)**: Área extra além da borda de corte para garantir impressão até a borda
- **Área Segura (Safe Area)**: Região interna onde elementos importantes devem estar para não serem cortados
- **Lombada (Spine)**: Parte lateral do livro onde as páginas são encadernadas
- **Spread**: Visualização de duas páginas lado a lado (página dupla)
- **Gutter**: Margem interna próxima à encadernação
- **DPI Efetivo**: Resolução real da imagem considerando o tamanho de impressão
- **Preflight**: Verificação técnica dos arquivos antes da produção
- **PDF/X**: Padrão ISO para arquivos PDF destinados à impressão profissional
- **Guarda**: Páginas especiais no início e fim do livro que conectam o miolo à capa
- **Miolo**: Conjunto de páginas internas do fotolivro

## Análise de Conformidade - Sistema Atual vs Requisitos

### ✅ Implementado
- Autenticação básica (login/registro)
- Estrutura de templates
- Editor básico com canvas
- Catálogo de papéis e formatos
- Sistema de precificação básico
- Store de produção (estrutura)

### ⚠️ Parcialmente Implementado
- Editor de diagramação (falta: guias, réguas funcionais, snap, camadas)
- Gestão de páginas (falta: reordenação drag-and-drop, páginas especiais)
- Templates (falta: biblioteca completa, aplicação em lote)

### ❌ Não Implementado
- Cálculo automático de lombada
- Validações pré-impressão (DPI, área segura, perfil de cor)
- Exportação PDF profissional (capa/miolo separados, marcas de corte)
- Sistema de pedidos com status
- Modo spread (página dupla)
- Overlays visuais (sangria, área segura, gutter)
- Versionamento de projetos
- Bloqueio após envio para produção
- Páginas especiais (guarda, dedicatória)

---

## Requirements

### Requirement 1: Gestão de Projetos

**User Story:** As a fotógrafo, I want to create and manage photobook projects, so that I can organize my work and track progress.

#### Acceptance Criteria

1. WHEN a user creates a new project THEN the System SHALL generate a unique project identifier and store project metadata including name, creation date, and last modification date
2. WHEN a user saves a project THEN the System SHALL persist all project data including pages, elements, and configurations to storage within 3 seconds
3. WHEN a user opens an existing project THEN the System SHALL restore the complete project state including all pages and elements
4. WHEN a user duplicates a project THEN the System SHALL create an independent copy with a new identifier and "(Cópia)" suffix in the name
5. WHEN a project is modified THEN the System SHALL update the last modification timestamp and trigger auto-save after 30 seconds of inactivity

---

### Requirement 2: Configuração de Produto

**User Story:** As a fotógrafo, I want to configure my photobook specifications, so that I can create products that meet my quality requirements.

#### Acceptance Criteria

1. WHEN a user selects a product format THEN the System SHALL display available dimensions (20x20, 30x30, 20x30, A4) with corresponding specifications
2. WHEN a user selects a paper type THEN the System SHALL show only papers compatible with the selected format and display weight, finish, and price per page
3. WHEN a user selects a cover type THEN the System SHALL display available options (soft cover, hard cover, premium) with corresponding prices
4. WHEN a user configures page count THEN the System SHALL enforce even numbers only and validate against minimum (20) and maximum (200) limits for the selected format
5. WHEN a user changes product configuration THEN the System SHALL recalculate and display the updated price in real-time

---

### Requirement 3: Cálculo de Lombada

**User Story:** As a fotógrafo, I want the spine width to be calculated automatically, so that my cover design fits perfectly.

#### Acceptance Criteria

1. WHEN a user sets the page count THEN the System SHALL calculate spine width using the formula: (pages × paper_thickness) + binding_tolerance
2. WHEN paper type changes THEN the System SHALL recalculate spine width based on the new paper thickness (stored in paper catalog)
3. WHEN spine width is calculated THEN the System SHALL display the value in millimeters with 0.5mm precision
4. WHEN cover type is hard cover THEN the System SHALL add 2mm tolerance to the calculated spine width
5. WHEN spine width changes THEN the System SHALL update the cover template dimensions automatically

---

### Requirement 4: Editor de Diagramação

**User Story:** As a fotógrafo, I want a professional layout editor, so that I can create high-quality designs with precision.

#### Acceptance Criteria

1. WHEN the editor loads THEN the System SHALL display rulers (horizontal and vertical) with millimeter markings and zoom-responsive scale
2. WHEN a user drags an element THEN the System SHALL show snap guides when the element aligns with other elements or page margins
3. WHEN a user selects an element THEN the System SHALL display resize handles and allow rotation with 15-degree snap increments
4. WHEN multiple elements exist THEN the System SHALL support layer ordering (bring to front, send to back, move up, move down)
5. WHEN a user enables guides overlay THEN the System SHALL display bleed area (red), safe area (green), and margins (blue) as semi-transparent overlays

---

### Requirement 5: Gestão de Páginas

**User Story:** As a fotógrafo, I want to manage pages efficiently, so that I can organize my photobook content.

#### Acceptance Criteria

1. WHEN a user adds a page THEN the System SHALL insert a blank page pair (2 pages) at the specified position maintaining even page count
2. WHEN a user removes a page THEN the System SHALL remove the page pair and renumber subsequent pages automatically
3. WHEN a user reorders pages THEN the System SHALL support drag-and-drop reordering in the page thumbnail panel
4. WHEN a user duplicates a page THEN the System SHALL create an exact copy including all elements and insert it after the original
5. WHEN page count reaches the format maximum THEN the System SHALL disable the add page button and display a warning message

---

### Requirement 6: Modo Spread (Página Dupla)

**User Story:** As a fotógrafo, I want to view and edit page spreads, so that I can design layouts that span across two pages.

#### Acceptance Criteria

1. WHEN spread mode is enabled THEN the System SHALL display two adjacent pages side by side with the spine/gutter area visible between them
2. WHEN an element crosses the gutter THEN the System SHALL display a warning indicator if faces or important content are positioned in the center 20mm zone
3. WHEN editing in spread mode THEN the System SHALL allow elements to span across both pages with proper coordinate handling
4. WHEN the user toggles view mode THEN the System SHALL switch between single page and spread view preserving element positions
5. WHEN exporting THEN the System SHALL split spread elements correctly across the two separate page files

---

### Requirement 7: Upload e Gestão de Imagens

**User Story:** As a fotógrafo, I want to upload and manage my photos, so that I can use them in my photobook designs.

#### Acceptance Criteria

1. WHEN a user uploads images THEN the System SHALL accept JPEG, PNG, and TIFF formats with maximum file size of 50MB per image
2. WHEN an image is uploaded THEN the System SHALL extract and store EXIF metadata including dimensions, color profile, and DPI
3. WHEN images are uploaded THEN the System SHALL generate thumbnails (150px, 300px, 600px) for performance optimization
4. WHEN a user drags an image to the canvas THEN the System SHALL place it at the drop position with automatic fit to container
5. WHEN an image is placed THEN the System SHALL calculate and display the effective DPI based on the print size

---

### Requirement 8: Validação de Resolução

**User Story:** As a fotógrafo, I want to be warned about low-resolution images, so that I can ensure print quality.

#### Acceptance Criteria

1. WHEN an image is placed or resized THEN the System SHALL calculate effective DPI using formula: (original_pixels / print_size_inches)
2. WHEN effective DPI is below 150 THEN the System SHALL display a red warning overlay on the image with "Low Resolution" label
3. WHEN effective DPI is between 150 and 300 THEN the System SHALL display a yellow warning overlay with "Acceptable" label
4. WHEN effective DPI is 300 or above THEN the System SHALL display a green indicator with "Optimal" label
5. WHEN generating preflight report THEN the System SHALL list all images with DPI below 200 as warnings

---

### Requirement 9: Validação de Área Segura

**User Story:** As a fotógrafo, I want to be warned about elements outside safe areas, so that important content is not cut during printing.

#### Acceptance Criteria

1. WHEN an element is positioned THEN the System SHALL check if any part extends beyond the safe area boundaries
2. WHEN text is within 5mm of the trim edge THEN the System SHALL display a warning indicator on the element
3. WHEN faces are detected near the gutter THEN the System SHALL display a warning about potential visibility issues
4. WHEN an element extends into the bleed area THEN the System SHALL allow it but mark it as "extends to bleed" in the preflight report
5. WHEN generating preflight report THEN the System SHALL list all elements with safe area violations

---

### Requirement 10: Gestão de Texto

**User Story:** As a fotógrafo, I want to add and format text, so that I can include captions and titles in my photobook.

#### Acceptance Criteria

1. WHEN a user adds a text element THEN the System SHALL create an editable text box with default font (Arial, 14pt, black)
2. WHEN a user edits text THEN the System SHALL provide font family, size (8-72pt), color, alignment, and style (bold, italic) options
3. WHEN text is positioned near edges THEN the System SHALL display a warning if within 3mm of the safe area boundary
4. WHEN a font is used THEN the System SHALL embed the font in the exported PDF or convert text to outlines
5. WHEN text overflows its container THEN the System SHALL display a visual indicator and warning in the preflight report

---

### Requirement 11: Templates e Layouts

**User Story:** As a fotógrafo, I want to use pre-designed templates, so that I can create professional layouts quickly.

#### Acceptance Criteria

1. WHEN a user browses templates THEN the System SHALL display templates filtered by product type, category, and number of photo slots
2. WHEN a user applies a template THEN the System SHALL replace the current page layout with the template structure preserving existing images where possible
3. WHEN a user applies a template to multiple pages THEN the System SHALL batch-apply the template to selected pages
4. WHEN a template contains placeholder images THEN the System SHALL display drop zones for user images
5. WHEN a user saves a custom layout THEN the System SHALL store it as a personal template for future use

---

### Requirement 12: Páginas Especiais

**User Story:** As a fotógrafo, I want to include special pages, so that my photobook has a professional editorial structure.

#### Acceptance Criteria

1. WHEN a project is created THEN the System SHALL automatically include front and back guard pages based on product configuration
2. WHEN a user adds a title page THEN the System SHALL insert it at position 1 (after front guard) with a dedicated template
3. WHEN a user adds a dedication page THEN the System SHALL insert it at position 2 with text-focused template
4. WHEN special pages are present THEN the System SHALL exclude them from the regular page count display but include in total
5. WHEN exporting THEN the System SHALL include special pages in the correct sequence with appropriate bleed settings

---

### Requirement 13: Versionamento de Projetos

**User Story:** As a fotógrafo, I want to track project versions, so that I can recover previous states if needed.

#### Acceptance Criteria

1. WHEN a project is saved THEN the System SHALL create a version snapshot with timestamp and auto-generated version number
2. WHEN a user views version history THEN the System SHALL display the last 20 versions with timestamps and change summaries
3. WHEN a user restores a version THEN the System SHALL create a new version from the restored state preserving the version history
4. WHEN storage limit is reached THEN the System SHALL remove versions older than 30 days keeping at least the 5 most recent
5. WHEN a project is sent for production THEN the System SHALL create a locked "production" version that cannot be modified

---

### Requirement 14: Exportação PDF Profissional

**User Story:** As a fotógrafo, I want to export production-ready PDFs, so that the print shop receives files that meet their specifications.

#### Acceptance Criteria

1. WHEN a user exports for production THEN the System SHALL generate separate PDF files for cover and interior pages
2. WHEN generating PDFs THEN the System SHALL include 3mm bleed on all edges and embed all fonts used
3. WHEN crop marks option is enabled THEN the System SHALL add registration marks and crop marks at 3mm offset from trim
4. WHEN exporting cover PDF THEN the System SHALL include front, spine, and back as a single spread with calculated dimensions
5. WHEN export completes THEN the System SHALL name files using pattern: {PROJECT_NAME}__{TYPE}__{FORMAT}__{PAGES/SPINE}mm.pdf

---

### Requirement 15: Checklist Pré-Impressão

**User Story:** As a fotógrafo, I want a preflight checklist, so that I can verify my project meets print requirements before ordering.

#### Acceptance Criteria

1. WHEN a user requests preflight check THEN the System SHALL analyze all pages and generate a comprehensive report within 30 seconds
2. WHEN images have DPI below 200 THEN the System SHALL list them as errors with page number and element identifier
3. WHEN elements violate safe area THEN the System SHALL list them as warnings with specific boundary violations
4. WHEN pages are empty THEN the System SHALL list them as errors if product rules prohibit empty pages
5. WHEN all checks pass THEN the System SHALL display a green "Ready for Production" status and enable the order button

---

### Requirement 16: Sistema de Pedidos

**User Story:** As a fotógrafo, I want to submit orders for production, so that I can have my photobooks printed.

#### Acceptance Criteria

1. WHEN a user initiates checkout THEN the System SHALL display order summary including product specs, page count, calculated spine, paper type, and total price
2. WHEN a user confirms order THEN the System SHALL create an order record with status "Submitted" and attach the exported PDFs
3. WHEN order is submitted THEN the System SHALL lock the project version preventing further edits to the production files
4. WHEN order status changes THEN the System SHALL notify the user via email and in-app notification
5. WHEN an order is rejected THEN the System SHALL display the rejection reason and specific corrections needed

---

### Requirement 17: Fluxo de Produção

**User Story:** As a operador de pré-impressão, I want to review and approve orders, so that only quality-verified files go to production.

#### Acceptance Criteria

1. WHEN an order is received THEN the System SHALL add it to the preflight review queue with priority based on submission time
2. WHEN an operator reviews an order THEN the System SHALL display the PDFs with annotation tools for marking issues
3. WHEN an operator approves an order THEN the System SHALL update status to "Approved" and move it to the production queue
4. WHEN an operator rejects an order THEN the System SHALL require a rejection reason and notify the customer with specific feedback
5. WHEN production completes THEN the System SHALL update status to "Completed" and record the completion timestamp

---

### Requirement 18: Perfis e Permissões

**User Story:** As a administrador, I want to manage user roles, so that users have appropriate access to system features.

#### Acceptance Criteria

1. WHEN a user registers THEN the System SHALL assign the "Photographer" role by default with project creation and ordering permissions
2. WHEN an admin assigns "Operator" role THEN the System SHALL grant access to the preflight review queue and approval functions
3. WHEN an admin assigns "Admin" role THEN the System SHALL grant access to product catalog management, user management, and system settings
4. WHEN a user accesses a feature THEN the System SHALL verify role permissions before allowing the action
5. WHEN permissions are insufficient THEN the System SHALL display an "Access Denied" message and log the attempt

---

### Requirement 19: Catálogo de Produtos (Admin)

**User Story:** As a administrador, I want to manage the product catalog, so that I can offer appropriate products to customers.

#### Acceptance Criteria

1. WHEN an admin creates a product THEN the System SHALL require format dimensions, page limits, available papers, and base price
2. WHEN an admin configures paper options THEN the System SHALL allow setting thickness (for spine calculation), price per page, and compatible formats
3. WHEN an admin sets pricing rules THEN the System SHALL support base price, per-page price, cover type multipliers, and quantity discounts
4. WHEN an admin deactivates a product THEN the System SHALL hide it from new projects but preserve existing projects using it
5. WHEN product configuration changes THEN the System SHALL not affect existing orders but apply to new projects

---

### Requirement 20: Gestão de Cor

**User Story:** As a fotógrafo, I want color management guidance, so that my printed photos match my expectations.

#### Acceptance Criteria

1. WHEN an image is uploaded THEN the System SHALL detect and store the color profile (sRGB, Adobe RGB, CMYK, or untagged)
2. WHEN an image has no color profile THEN the System SHALL assume sRGB and display a warning indicator
3. WHEN exporting for production THEN the System SHALL convert all images to the configured output profile (default: sRGB)
4. WHEN color profiles are inconsistent THEN the System SHALL list affected images in the preflight report with conversion warnings
5. WHEN an admin configures output settings THEN the System SHALL allow setting the target color profile and rendering intent

---

### Requirement 21: Salvamento Automático

**User Story:** As a fotógrafo, I want my work saved automatically, so that I don't lose progress due to unexpected issues.

#### Acceptance Criteria

1. WHEN a user makes changes THEN the System SHALL queue an auto-save after 30 seconds of inactivity
2. WHEN auto-save executes THEN the System SHALL save the complete project state without interrupting user workflow
3. WHEN connection is lost THEN the System SHALL store changes locally and sync when connection is restored
4. WHEN the browser closes unexpectedly THEN the System SHALL offer to restore the last auto-saved state on next visit
5. WHEN auto-save fails THEN the System SHALL display a non-blocking warning and retry after 60 seconds

---

### Requirement 22: Preview e Visualização

**User Story:** As a fotógrafo, I want to preview my photobook, so that I can see how it will look when printed.

#### Acceptance Criteria

1. WHEN a user enters preview mode THEN the System SHALL display pages in a flip-book style navigation
2. WHEN previewing THEN the System SHALL hide all guides, overlays, and editing controls showing only the final design
3. WHEN a user views the cover THEN the System SHALL display a 3D mockup showing front, spine, and back together
4. WHEN previewing spreads THEN the System SHALL show realistic page curvature near the spine
5. WHEN a user exits preview THEN the System SHALL return to the editor at the same page position

---

### Requirement 23: Desempenho com Projetos Grandes

**User Story:** As a fotógrafo, I want the editor to perform well with large projects, so that I can create photobooks with many pages.

#### Acceptance Criteria

1. WHEN a project has more than 50 pages THEN the System SHALL use virtualized rendering showing only visible pages in the thumbnail panel
2. WHEN loading a large project THEN the System SHALL display a progress indicator and load pages incrementally
3. WHEN editing THEN the System SHALL maintain 60fps interaction responsiveness for drag, resize, and zoom operations
4. WHEN memory usage exceeds 500MB THEN the System SHALL unload non-visible page assets and reload on demand
5. WHEN exporting large projects THEN the System SHALL process pages in batches showing progress percentage

---

### Requirement 24: Backup e Retenção

**User Story:** As a fotógrafo, I want my projects backed up, so that I can access them even after extended periods.

#### Acceptance Criteria

1. WHEN a project is saved THEN the System SHALL store it in redundant storage with automatic backup
2. WHEN a project is inactive for 6 months THEN the System SHALL notify the user before archiving to cold storage
3. WHEN a user requests an archived project THEN the System SHALL restore it within 24 hours and notify when ready
4. WHEN a project is deleted THEN the System SHALL retain it in recoverable state for 30 days before permanent deletion
5. WHEN storage quota is exceeded THEN the System SHALL notify the user and suggest archiving old projects

---

### Requirement 25: Auditoria e Logs

**User Story:** As a administrador, I want activity logs, so that I can track important system events and troubleshoot issues.

#### Acceptance Criteria

1. WHEN a user exports a project THEN the System SHALL log the event with user ID, project ID, export type, and timestamp
2. WHEN an order status changes THEN the System SHALL log the transition with previous status, new status, and actor
3. WHEN an admin modifies product catalog THEN the System SHALL log the change with before/after values
4. WHEN a login attempt fails THEN the System SHALL log the attempt with IP address and timestamp
5. WHEN an admin queries logs THEN the System SHALL support filtering by date range, user, event type, and project

