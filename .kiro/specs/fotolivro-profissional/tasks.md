# Implementation Plan

## Phase 1: Core Infrastructure & Data Models

- [x] 1. Setup database schema and migrations








  - [ ] 1.1 Create Prisma schema for Project, Page, Element entities
    - Define Project model with all fields from design document

    - Define Page model with pageType enum and relationship to Project
    - Define Element model with polymorphic data (image/text/shape)
    - _Requirements: 1.1, 1.2, 1.3_

  - [x]* 1.2 Write property test for project save/load round-trip



    - **Property 1: Project Save/Load Round-Trip**
    - **Validates: Requirements 1.2, 1.3**



  - [ ] 1.3 Create Prisma schema for Product catalog entities
    - Define Product, Format, Paper, CoverType models
    - Define relationships and constraints

    - _Requirements: 2.1, 2.2, 19.1_
  - [ ] 1.4 Create Prisma schema for Order and Asset entities
    - Define Order model with status enum and timeline fields






    - Define Asset model with image metadata fields
    - _Requirements: 16.1, 7.1, 7.2_
  - [ ] 1.5 Create ProjectVersion model for versioning
    - Define version snapshot storage (JSONB)

    - Add isProduction flag for locked versions
    - _Requirements: 13.1, 13.5_
  - [ ] 1.6 Run migrations and seed initial data
    - Create migration files





    - Seed default products, formats, papers

    - _Requirements: 19.1, 19.2_


- [ ] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.




## Phase 2: Project Service & Core Business Logic

- [ ] 3. Implement Project Service
  - [x] 3.1 Create ProjectService with CRUD operations

    - Implement create, findById, update, delete methods

    - Add validation for project data
    - _Requirements: 1.1, 1.2, 1.3_

  - [x]* 3.2 Write property test for project duplication

    - **Property 2: Project Duplication Independence**
    - **Validates: Requirements 1.4**
  - [ ] 3.3 Implement project duplication with new ID
    - Deep clone project with new identifier
    - Add "(Cópia)" suffix to name
    - _Requirements: 1.4_



  - [ ]* 3.4 Write property test for modification timestamp
    - **Property 3: Modification Timestamp Update**
    - **Validates: Requirements 1.5**
  - [ ] 3.5 Implement auto-save mechanism
    - Add debounced save on changes
    - Store locally on connection loss


    - _Requirements: 21.1, 21.3_

- [ ] 4. Implement Page Management
  - [x] 4.1 Create page add/remove operations

    - Enforce even page count invariant
    - Handle page pair insertion/removal
    - _Requirements: 5.1, 5.2_
  - [ ]* 4.2 Write property test for page count invariant
    - **Property 5: Page Count Even Number Invariant**
    - **Validates: Requirements 2.4, 5.1, 5.2**
  - [x] 4.3 Implement page reordering with drag-and-drop support

    - Update page numbers on reorder

    - Preserve element content
    - _Requirements: 5.3_
  - [ ]* 4.4 Write property test for page reorder preservation
    - **Property 10: Page Reorder Content Preservation**
    - **Validates: Requirements 5.3**
  - [x] 4.5 Implement page duplication

    - Clone page with new ID
    - Copy all elements
    - _Requirements: 5.4_
  - [ ]* 4.6 Write property test for page duplication equivalence
    - **Property 11: Page Duplication Equivalence**





    - **Validates: Requirements 5.4**


- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


## Phase 3: Spine Calculation & Pricing


- [ ] 6. Implement Spine Width Calculator
  - [ ] 6.1 Create SpineCalculator service
    - Implement formula: (pages × thickness) + tolerance
    - Handle different cover types
    - _Requirements: 3.1, 3.2, 3.4_
  - [ ]* 6.2 Write property test for spine calculation formula
    - **Property 7: Spine Width Calculation Formula**
    - **Validates: Requirements 3.1, 3.2, 3.4**
  - [ ] 6.3 Implement spine precision rounding (0.5mm)
    - Round to nearest 0.5mm
    - _Requirements: 3.3_
  - [ ]* 6.4 Write property test for spine precision
    - **Property 8: Spine Width Precision**
    - **Validates: Requirements 3.3**
  - [ ] 6.5 Update cover template dimensions on spine change
    - Recalculate cover spread width
    - _Requirements: 3.5_

- [ ] 7. Implement Price Calculator
  - [ ] 7.1 Enhance existing price calculator
    - Add format multiplier support
    - Add cover type pricing
    - _Requirements: 2.5_
  - [ ]* 7.2 Write property test for price calculation
    - **Property 6: Price Calculation Consistency**
    - **Validates: Requirements 2.5**
  - [ ] 7.3 Implement paper compatibility filtering
    - Filter papers by format compatibility
    - _Requirements: 2.2_
  - [ ]* 7.4 Write property test for paper filtering
    - **Property 4: Paper Compatibility Filtering**
    - **Validates: Requirements 2.2**

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


## Phase 4: Editor Canvas Enhancements

- [ ] 9. Implement Visual Guides & Overlays
  - [ ] 9.1 Add bleed area overlay (red, semi-transparent)
    - Calculate bleed boundaries from format
    - Toggle visibility
    - _Requirements: 4.5_
  - [ ] 9.2 Add safe area overlay (green, semi-transparent)
    - Calculate safe area from margins
    - Toggle visibility
    - _Requirements: 4.5_
  - [ ] 9.3 Add margin guides (blue lines)
    - Show top, right, bottom, left margins
    - _Requirements: 4.5_
  - [ ] 9.4 Add gutter/spine guide for spread mode
    - Show center gutter area
    - _Requirements: 6.1_

- [ ] 10. Implement Spread Mode
  - [ ] 10.1 Create spread view layout (two pages side by side)
    - Display adjacent pages
    - Show spine between pages
    - _Requirements: 6.1_
  - [ ] 10.2 Implement gutter warning detection
    - Detect elements crossing center 20mm zone
    - Show warning indicator
    - _Requirements: 6.2_
  - [x]* 10.3 Write property test for gutter warning

    - **Property 12: Gutter Warning Detection**
    - **Validates: Requirements 6.2**
  - [ ] 10.4 Implement view mode toggle (single/spread)
    - Preserve element positions on toggle
    - _Requirements: 6.4_
  - [x]* 10.5 Write property test for view mode invariant

    - **Property 13: View Mode Position Invariant**
    - **Validates: Requirements 6.4**

- [ ] 11. Implement Layer Management
  - [ ] 11.1 Add z-index management to elements
    - Track layer order per page
    - _Requirements: 4.4_

  - [ ] 11.2 Implement layer operations (front, back, up, down)
    - Bring to front, send to back
    - Move up, move down
    - _Requirements: 4.4_

  - [ ]* 11.3 Write property test for layer ordering
    - **Property 9: Layer Ordering Consistency**
    - **Validates: Requirements 4.4**

- [x] 12. Implement Snap & Alignment

  - [ ] 12.1 Add snap guides when dragging elements
    - Detect alignment with other elements
    - Detect alignment with margins
    - _Requirements: 4.2_
  - [ ] 12.2 Add rotation snap (15-degree increments)
    - Snap to 0, 15, 30, 45... degrees
    - _Requirements: 4.3_

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Asset Management & Validation

- [ ] 14. Implement Asset Upload Service
  - [ ] 14.1 Create asset upload endpoint with validation
    - Accept JPEG, PNG, TIFF
    - Validate max size 50MB
    - _Requirements: 7.1_
  - [ ] 14.2 Extract and store EXIF metadata
    - Parse EXIF data from images
    - Store dimensions, DPI, color profile
    - _Requirements: 7.2_
  - [ ]* 14.3 Write property test for EXIF extraction
    - **Property 28: Color Profile Detection**
    - **Validates: Requirements 20.1, 20.2**
  - [ ] 14.4 Generate thumbnails (150px, 300px, 600px)
    - Create multiple sizes on upload
    - Store in MinIO
    - _Requirements: 7.3_

- [ ] 15. Implement DPI Validation
  - [ ] 15.1 Create effective DPI calculator
    - Formula: originalPixels / printSizeInches
    - Calculate on placement and resize
    - _Requirements: 7.5, 8.1_
  - [ ]* 15.2 Write property test for DPI calculation
    - **Property 14: Effective DPI Calculation**
    - **Validates: Requirements 7.5, 8.1**
  - [ ] 15.3 Implement DPI warning classification
    - Red: < 150 DPI
    - Yellow: 150-299 DPI
    - Green: >= 300 DPI
    - _Requirements: 8.2, 8.3, 8.4_
  - [ ]* 15.4 Write property test for DPI classification
    - **Property 15: DPI Warning Classification**
    - **Validates: Requirements 8.2, 8.3, 8.4**
  - [ ] 15.5 Add visual DPI indicator on images
    - Show colored overlay/badge
    - _Requirements: 8.2, 8.3, 8.4_

- [ ] 16. Implement Safe Area Validation
  - [ ] 16.1 Create safe area boundary checker
    - Detect elements outside safe area
    - _Requirements: 9.1_
  - [ ]* 16.2 Write property test for safe area detection
    - **Property 16: Safe Area Violation Detection**
    - **Validates: Requirements 9.1, 9.2, 9.5**
  - [ ] 16.3 Add visual warning for safe area violations
    - Show warning indicator on elements
    - _Requirements: 9.2_

- [ ] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


## Phase 6: Text Elements & Templates

- [ ] 18. Enhance Text Element Support
  - [ ] 18.1 Implement text formatting options
    - Font family, size, weight, style
    - Color, alignment, line height
    - _Requirements: 10.1, 10.2_
  - [ ] 18.2 Implement text overflow detection
    - Detect when text exceeds container
    - Show visual indicator
    - _Requirements: 10.5_
  - [ ]* 18.3 Write property test for text overflow
    - **Property 17: Text Overflow Detection**
    - **Validates: Requirements 10.5**
  - [ ] 18.4 Add text near edge warning
    - Warn when text within 3mm of safe area
    - _Requirements: 10.3_

- [ ] 19. Implement Template System
  - [ ] 19.1 Create template browsing with filters
    - Filter by product type, category
    - Search by name/tags
    - _Requirements: 11.1_
  - [ ] 19.2 Implement template application to page
    - Replace layout, preserve images where possible
    - _Requirements: 11.2_
  - [ ]* 19.3 Write property test for template image preservation
    - **Property 18: Template Application Image Preservation**
    - **Validates: Requirements 11.2**
  - [ ] 19.4 Implement batch template application
    - Apply to multiple selected pages
    - _Requirements: 11.3_
  - [ ] 19.5 Implement custom template saving
    - Save current layout as personal template
    - _Requirements: 11.5_

- [x] 20. Implement Special Pages


  - [ ] 20.1 Add guard pages (front/back) on project creation
    - Auto-include based on product config

    - _Requirements: 12.1_
  - [x] 20.2 Implement title and dedication page insertion

    - Insert at correct positions
    - _Requirements: 12.2, 12.3_

  - [ ] 20.3 Implement special page count handling
    - Exclude from display count, include in total
    - _Requirements: 12.4_
  - [ ]* 20.4 Write property test for special page counting
    - **Property 19: Special Page Count Exclusion**
    - **Validates: Requirements 12.4**

- [ ] 21. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 7: Versioning & Project Locking



- [ ] 22. Implement Project Versioning
  - [ ] 22.1 Create version snapshot on save
    - Store complete project state as JSON
    - Auto-increment version number
    - _Requirements: 13.1_
  - [ ]* 22.2 Write property test for version completeness
    - **Property 20: Version Snapshot Completeness**
    - **Validates: Requirements 13.1, 13.3**
  - [ ] 22.3 Implement version history retrieval
    - Return last 20 versions
    - Include timestamps and summaries
    - _Requirements: 13.2_
  - [ ] 22.4 Implement version restoration
    - Create new version from restored state
    - Preserve history
    - _Requirements: 13.3_
  - [ ] 22.5 Implement old version cleanup
    - Remove versions older than 30 days
    - Keep at least 5 most recent
    - _Requirements: 13.4_

- [ ] 23. Implement Production Lock
  - [ ] 23.1 Create production lock mechanism
    - Mark version as production
    - Prevent modifications
    - _Requirements: 13.5_
  - [ ]* 23.2 Write property test for production lock
    - **Property 21: Production Lock Immutability**
    - **Validates: Requirements 13.5, 16.3**
  - [ ] 23.3 Handle locked project access
    - Allow viewing, block editing
    - _Requirements: 13.5_

- [ ] 24. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


## Phase 8: Preflight & PDF Export

- [ ] 25. Implement Preflight Validator
  - [ ] 25.1 Create PreflightService with validation pipeline
    - Validate all pages and elements
    - Generate comprehensive report
    - _Requirements: 15.1_
  - [ ] 25.2 Implement DPI violation detection
    - List images with DPI < 200 as errors
    - _Requirements: 15.2, 8.5_
  - [ ] 25.3 Implement safe area violation detection
    - List elements outside safe area as warnings
    - _Requirements: 15.3_
  - [ ] 25.4 Implement empty page detection
    - List empty pages as errors
    - _Requirements: 15.4_
  - [ ]* 25.5 Write property test for preflight pass condition
    - **Property 25: Preflight Pass Condition**
    - **Validates: Requirements 15.5**
  - [ ] 25.6 Create preflight report UI
    - Display errors and warnings
    - Link to affected pages/elements
    - _Requirements: 15.1_

- [ ] 26. Implement PDF Generator
  - [ ] 26.1 Create PDFGeneratorService using pdf-lib
    - Setup PDF document creation
    - Configure page dimensions with bleed
    - _Requirements: 14.1, 14.2_
  - [ ]* 26.2 Write property test for PDF bleed dimensions
    - **Property 22: PDF Bleed Inclusion**
    - **Validates: Requirements 14.2**
  - [ ] 26.3 Implement interior PDF generation
    - Generate all pages with bleed
    - Embed fonts
    - _Requirements: 14.1, 14.2_
  - [ ] 26.4 Implement cover PDF generation
    - Generate front + spine + back as spread
    - Calculate correct dimensions
    - _Requirements: 14.4_
  - [ ]* 26.5 Write property test for cover spread dimensions
    - **Property 23: Cover PDF Spread Dimensions**
    - **Validates: Requirements 14.4**
  - [ ] 26.6 Implement crop marks (optional)
    - Add registration and crop marks
    - 3mm offset from trim
    - _Requirements: 14.3_
  - [ ] 26.7 Implement file naming convention
    - Pattern: {NAME}__{TYPE}__{FORMAT}__{PAGES|SPINE}mm.pdf
    - _Requirements: 14.5_
  - [ ]* 26.8 Write property test for file naming
    - **Property 24: File Naming Convention**
    - **Validates: Requirements 14.5**

- [ ] 27. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 9: Order System

- [ ] 28. Implement Order Service
  - [ ] 28.1 Create OrderService with CRUD operations
    - Create order from project
    - Store product snapshot
    - _Requirements: 16.1, 16.2_
  - [ ] 28.2 Implement order submission flow
    - Validate preflight passes
    - Lock project version
    - Attach PDFs
    - _Requirements: 16.2, 16.3_
  - [ ] 28.3 Implement order status transitions
    - Validate state machine transitions
    - _Requirements: 17.3, 17.5_
  - [ ]* 28.4 Write property test for status transitions
    - **Property 26: Order Status Transition Validity**
    - **Validates: Requirements 17.3, 17.5**
  - [ ] 28.5 Implement order notification system
    - Notify on status changes
    - _Requirements: 16.4_

- [ ] 29. Implement Order Review (Admin)
  - [ ] 29.1 Create preflight review queue
    - List orders pending review
    - Priority ordering
    - _Requirements: 17.1_
  - [ ] 29.2 Implement order approval
    - Update status to approved
    - Move to production queue
    - _Requirements: 17.3_
  - [ ] 29.3 Implement order rejection
    - Require rejection reason
    - Notify customer
    - _Requirements: 17.4_
  - [ ]* 29.4 Write property test for rejection reason requirement
    - **Property: Rejection requires reason**
    - **Validates: Requirements 17.4**

- [ ] 30. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


## Phase 10: Permissions & Admin Features

- [ ] 31. Implement Role-Based Access Control
  - [ ] 31.1 Enhance user model with roles
    - Add role field (photographer, operator, admin)
    - Default to photographer on registration
    - _Requirements: 18.1_
  - [ ] 31.2 Create permission guard middleware
    - Check role permissions on routes
    - _Requirements: 18.4_
  - [ ]* 31.3 Write property test for access control
    - **Property 27: Role-Based Access Control**
    - **Validates: Requirements 18.4, 18.5**
  - [ ] 31.3 Implement permission denied handling
    - Return 403 with message
    - Log attempt
    - _Requirements: 18.5_

- [ ] 32. Implement Product Catalog Admin
  - [ ] 32.1 Create product management endpoints
    - CRUD for products, formats, papers
    - _Requirements: 19.1, 19.2_
  - [ ] 32.2 Implement product deactivation
    - Hide from new projects
    - Preserve existing projects
    - _Requirements: 19.4_
  - [ ] 32.3 Implement configuration isolation
    - Changes don't affect existing orders
    - _Requirements: 19.5_

- [ ] 33. Implement Audit Logging
  - [ ] 33.1 Create audit log service
    - Log exports, status changes, catalog changes
    - _Requirements: 25.1, 25.2, 25.3_
  - [ ]* 33.2 Write property test for audit completeness
    - **Property 29: Audit Log Completeness**
    - **Validates: Requirements 25.1, 25.2, 25.3, 25.4**
  - [ ] 33.3 Implement log query with filters
    - Filter by date, user, event type
    - _Requirements: 25.5_

- [ ] 34. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 11: Preview & UX Enhancements

- [ ] 35. Implement Preview Mode
  - [ ] 35.1 Create flip-book preview navigation
    - Page-by-page navigation
    - Hide editing controls
    - _Requirements: 22.1, 22.2_
  - [ ] 35.2 Implement preview mode state preservation
    - Return to same page on exit
    - _Requirements: 22.5_
  - [ ] 35.3 Create cover 3D mockup preview (optional)
    - Show front, spine, back together
    - _Requirements: 22.3_

- [ ] 36. Implement Checkout Flow
  - [ ] 36.1 Create order summary page
    - Display product specs, pricing
    - Show calculated spine
    - _Requirements: 16.1_
  - [ ] 36.2 Implement preflight check before checkout
    - Block if errors exist
    - Show warnings
    - _Requirements: 15.5_
  - [ ] 36.3 Create order confirmation flow
    - Submit order
    - Show success/tracking
    - _Requirements: 16.2_

- [ ] 37. Implement Order Tracking
  - [ ] 37.1 Create order history page
    - List user's orders
    - Show status timeline
    - _Requirements: 16.4_
  - [ ] 37.2 Implement rejection feedback display
    - Show reason and corrections needed
    - _Requirements: 16.5_

- [ ] 38. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 12: Performance & Polish

- [ ] 39. Implement Performance Optimizations
  - [ ] 39.1 Add virtualized page thumbnail rendering
    - Only render visible thumbnails
    - _Requirements: 23.1_
  - [ ] 39.2 Implement progressive project loading
    - Load pages incrementally
    - Show progress indicator
    - _Requirements: 23.2_
  - [ ] 39.3 Implement asset lazy loading
    - Load images on demand
    - Unload non-visible assets
    - _Requirements: 23.4_

- [ ] 40. Implement Offline Support
  - [ ] 40.1 Enhance local storage for offline edits
    - Store changes locally
    - Sync on reconnection
    - _Requirements: 21.3_
  - [ ] 40.2 Implement recovery on unexpected close
    - Detect unsaved changes
    - Offer restore on next visit
    - _Requirements: 21.4_

- [ ] 41. Final Integration Testing
  - [ ] 41.1 End-to-end flow testing
    - Create project → Edit → Preflight → Export → Order
  - [ ] 41.2 Performance testing with large projects
    - Test with 100+ pages
  - [ ] 41.3 Cross-browser testing
    - Chrome, Firefox, Safari, Edge

- [ ] 42. Final Checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.
