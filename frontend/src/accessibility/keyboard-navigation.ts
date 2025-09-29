/**
 * Keyboard Navigation Implementation
 * Provides comprehensive keyboard accessibility for the Schedule Builder application
 */

// Keyboard Navigation Service
export class KeyboardNavigationService {
  private keyboardShortcuts: Map<string, () => void> = new Map()
  private focusedElement: HTMLElement | null = null
  private trapFocus: boolean = false
  private focusableElements: HTMLElement[] = []

  constructor() {
    this.initializeKeyboardListeners()
    this.setupGlobalShortcuts()
  }

  /**
   * Initialize keyboard event listeners
   */
  private initializeKeyboardListeners(): void {
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this))
    document.addEventListener('focusin', this.handleFocusIn.bind(this))
    document.addEventListener('focusout', this.handleFocusOut.bind(this))
  }

  /**
   * Setup global keyboard shortcuts
   */
  private setupGlobalShortcuts(): void {
    // Navigation shortcuts
    this.registerShortcut('Alt+M', () => this.focusMainContent())
    this.registerShortcut('Alt+N', () => this.focusNavigation())
    this.registerShortcut('Alt+S', () => this.focusSearch())
    this.registerShortcut('Alt+H', () => this.focusHelp())
    
    // Schedule navigation
    this.registerShortcut('Ctrl+ArrowLeft', () => this.navigatePreviousWeek())
    this.registerShortcut('Ctrl+ArrowRight', () => this.navigateNextWeek())
    this.registerShortcut('Ctrl+Home', () => this.navigateToday())
    
    // Quick actions
    this.registerShortcut('Ctrl+N', () => this.createNewLesson())
    this.registerShortcut('Ctrl+S', () => this.saveSchedule())
    this.registerShortcut('Ctrl+F', () => this.openSearch())
    
    // Accessibility
    this.registerShortcut('Alt+?', () => this.showKeyboardHelp())
    this.registerShortcut('Escape', () => this.handleEscape())
  }

  /**
   * Register a keyboard shortcut
   */
  registerShortcut(combination: string, callback: () => void): void {
    this.keyboardShortcuts.set(combination, callback)
  }

  /**
   * Handle global keydown events
   */
  private handleGlobalKeydown(event: KeyboardEvent): void {
    const combination = this.getKeyCombination(event)
    
    if (this.keyboardShortcuts.has(combination)) {
      event.preventDefault()
      this.keyboardShortcuts.get(combination)!()
      return
    }

    // Handle special navigation keys
    if (this.trapFocus && (event.key === 'Tab')) {
      this.handleTabNavigation(event)
    }

    // Handle grid navigation for schedule
    if (this.isScheduleGrid(event.target as HTMLElement)) {
      this.handleScheduleGridNavigation(event)
    }
  }

  /**
   * Get key combination string
   */
  private getKeyCombination(event: KeyboardEvent): string {
    const parts: string[] = []
    
    if (event.ctrlKey) parts.push('Ctrl')
    if (event.altKey) parts.push('Alt')
    if (event.shiftKey) parts.push('Shift')
    if (event.metaKey) parts.push('Meta')
    
    parts.push(event.key)
    
    return parts.join('+')
  }

  /**
   * Handle tab navigation within focus trap
   */
  private handleTabNavigation(event: KeyboardEvent): void {
    if (this.focusableElements.length === 0) return

    const currentIndex = this.focusableElements.indexOf(document.activeElement as HTMLElement)
    let nextIndex: number

    if (event.shiftKey) {
      // Shift+Tab: go backwards
      nextIndex = currentIndex <= 0 ? this.focusableElements.length - 1 : currentIndex - 1
    } else {
      // Tab: go forwards
      nextIndex = currentIndex >= this.focusableElements.length - 1 ? 0 : currentIndex + 1
    }

    event.preventDefault()
    this.focusableElements[nextIndex].focus()
  }

  /**
   * Check if element is part of schedule grid
   */
  private isScheduleGrid(element: HTMLElement): boolean {
    return element.closest('[role="grid"]') !== null ||
           element.closest('.schedule-grid') !== null ||
           element.hasAttribute('data-schedule-cell')
  }

  /**
   * Handle schedule grid navigation
   */
  private handleScheduleGridNavigation(event: KeyboardEvent): void {
    const cell = event.target as HTMLElement
    const grid = cell.closest('[role="grid"]') as HTMLElement
    
    if (!grid) return

    const currentRow = parseInt(cell.getAttribute('aria-rowindex') || '1')
    const currentCol = parseInt(cell.getAttribute('aria-colindex') || '1')
    
    let newRow = currentRow
    let newCol = currentCol
    let handled = false

    switch (event.key) {
      case 'ArrowUp':
        newRow = Math.max(1, currentRow - 1)
        handled = true
        break
      case 'ArrowDown':
        newRow = currentRow + 1
        handled = true
        break
      case 'ArrowLeft':
        newCol = Math.max(1, currentCol - 1)
        handled = true
        break
      case 'ArrowRight':
        newCol = currentCol + 1
        handled = true
        break
      case 'Home':
        if (event.ctrlKey) {
          newRow = 1
          newCol = 1
        } else {
          newCol = 1
        }
        handled = true
        break
      case 'End':
        if (event.ctrlKey) {
          const lastCell = grid.querySelector('[aria-rowindex][aria-colindex]:last-child')
          if (lastCell) {
            newRow = parseInt(lastCell.getAttribute('aria-rowindex') || '1')
            newCol = parseInt(lastCell.getAttribute('aria-colindex') || '1')
          }
        } else {
          const rowCells = grid.querySelectorAll(`[aria-rowindex="${currentRow}"]`)
          if (rowCells.length > 0) {
            const lastCell = rowCells[rowCells.length - 1]
            newCol = parseInt(lastCell.getAttribute('aria-colindex') || '1')
          }
        }
        handled = true
        break
      case 'PageUp':
        newRow = Math.max(1, currentRow - 7) // Go up one week
        handled = true
        break
      case 'PageDown':
        newRow = currentRow + 7 // Go down one week
        handled = true
        break
      case 'Enter':
      case ' ':
        this.activateCell(cell)
        handled = true
        break
    }

    if (handled) {
      event.preventDefault()
      event.stopPropagation()
      
      if (newRow !== currentRow || newCol !== currentCol) {
        this.focusGridCell(grid, newRow, newCol)
      }
    }
  }

  /**
   * Focus a specific cell in the grid
   */
  private focusGridCell(grid: HTMLElement, row: number, col: number): void {
    const targetCell = grid.querySelector(`[aria-rowindex="${row}"][aria-colindex="${col}"]`) as HTMLElement
    if (targetCell) {
      targetCell.focus()
      
      // Announce the cell to screen readers
      this.announceGridPosition(row, col, targetCell)
    }
  }

  /**
   * Activate a cell (simulate click)
   */
  private activateCell(cell: HTMLElement): void {
    // First try to click any button or link inside the cell
    const interactive = cell.querySelector('button, a, [role="button"]') as HTMLElement
    if (interactive) {
      interactive.click()
      return
    }

    // Otherwise trigger a click on the cell itself
    cell.click()
    
    // If the cell has a data attribute for editing, enter edit mode
    if (cell.hasAttribute('data-editable')) {
      this.enterEditMode(cell)
    }
  }

  /**
   * Enter edit mode for a cell
   */
  private enterEditMode(cell: HTMLElement): void {
    const input = document.createElement('input')
    input.type = 'text'
    input.value = cell.textContent || ''
    input.className = 'cell-editor'
    
    // Set up event handlers for the input
    input.addEventListener('blur', () => this.exitEditMode(cell, input))
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.exitEditMode(cell, input)
      } else if (e.key === 'Escape') {
        cell.focus()
        input.remove()
      }
    })

    // Replace cell content with input
    cell.innerHTML = ''
    cell.appendChild(input)
    input.focus()
  }

  /**
   * Exit edit mode and save changes
   */
  private exitEditMode(cell: HTMLElement, input: HTMLInputElement): void {
    const newValue = input.value
    cell.innerHTML = newValue
    cell.focus()
    
    // Trigger a custom event for the value change
    cell.dispatchEvent(new CustomEvent('cellValueChanged', {
      detail: { value: newValue },
      bubbles: true
    }))
  }

  /**
   * Announce grid position to screen readers
   */
  private announceGridPosition(row: number, col: number, cell: HTMLElement): void {
    const announcement = `Row ${row}, Column ${col}. ${cell.textContent || 'Empty cell'}`
    this.announceToScreenReader(announcement)
  }

  /**
   * Announce text to screen reader
   */
  announceToScreenReader(text: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = text
    
    document.body.appendChild(announcement)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  /**
   * Focus management methods
   */
  private handleFocusIn(event: FocusEvent): void {
    this.focusedElement = event.target as HTMLElement
  }

  private handleFocusOut(event: FocusEvent): void {
    // Handle focus leaving elements
  }

  /**
   * Enable focus trap within a container
   */
  enableFocusTrap(container: HTMLElement): void {
    this.trapFocus = true
    this.focusableElements = this.getFocusableElements(container)
    
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus()
    }
  }

  /**
   * Disable focus trap
   */
  disableFocusTrap(): void {
    this.trapFocus = false
    this.focusableElements = []
  }

  /**
   * Get all focusable elements within a container
   */
  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="link"]:not([disabled])'
    ].join(', ')

    return Array.from(container.querySelectorAll(selectors))
      .filter(element => this.isVisible(element as HTMLElement)) as HTMLElement[]
  }

  /**
   * Check if element is visible
   */
  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element)
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0'
  }

  /**
   * Navigation shortcut implementations
   */
  private focusMainContent(): void {
    const main = document.querySelector('main, [role="main"], #main-content') as HTMLElement
    if (main) {
      main.focus()
      this.announceToScreenReader('Main content focused')
    }
  }

  private focusNavigation(): void {
    const nav = document.querySelector('nav, [role="navigation"]') as HTMLElement
    if (nav) {
      const firstLink = nav.querySelector('a, button') as HTMLElement
      if (firstLink) {
        firstLink.focus()
        this.announceToScreenReader('Navigation menu focused')
      }
    }
  }

  private focusSearch(): void {
    const search = document.querySelector('[role="search"] input, input[type="search"]') as HTMLElement
    if (search) {
      search.focus()
      this.announceToScreenReader('Search field focused')
    }
  }

  private focusHelp(): void {
    const help = document.querySelector('[aria-label*="help"], [title*="help"]') as HTMLElement
    if (help) {
      help.focus()
      this.announceToScreenReader('Help focused')
    }
  }

  private navigatePreviousWeek(): void {
    // Trigger previous week navigation
    const prevButton = document.querySelector('[aria-label*="previous week"]') as HTMLElement
    if (prevButton) {
      prevButton.click()
      this.announceToScreenReader('Navigated to previous week')
    }
  }

  private navigateNextWeek(): void {
    // Trigger next week navigation
    const nextButton = document.querySelector('[aria-label*="next week"]') as HTMLElement
    if (nextButton) {
      nextButton.click()
      this.announceToScreenReader('Navigated to next week')
    }
  }

  private navigateToday(): void {
    // Navigate to current week/day
    const todayButton = document.querySelector('[aria-label*="today"], [aria-label*="current"]') as HTMLElement
    if (todayButton) {
      todayButton.click()
      this.announceToScreenReader('Navigated to current week')
    }
  }

  private createNewLesson(): void {
    // Trigger new lesson creation
    const newButton = document.querySelector('[aria-label*="new lesson"], [aria-label*="add lesson"]') as HTMLElement
    if (newButton) {
      newButton.click()
      this.announceToScreenReader('New lesson dialog opened')
    }
  }

  private saveSchedule(): void {
    // Trigger schedule save
    const saveButton = document.querySelector('[aria-label*="save"]') as HTMLElement
    if (saveButton) {
      saveButton.click()
      this.announceToScreenReader('Schedule saved')
    }
  }

  private openSearch(): void {
    this.focusSearch()
  }

  private showKeyboardHelp(): void {
    // Show keyboard shortcuts help
    const helpDialog = document.querySelector('[role="dialog"][aria-label*="keyboard"]') as HTMLElement
    if (helpDialog) {
      helpDialog.focus()
    } else {
      this.createKeyboardHelpDialog()
    }
  }

  private handleEscape(): void {
    // Close any open dialogs/modals
    const dialog = document.querySelector('[role="dialog"]:not([hidden])') as HTMLElement
    if (dialog) {
      const closeButton = dialog.querySelector('[aria-label*="close"], .close-button') as HTMLElement
      if (closeButton) {
        closeButton.click()
      }
    }

    // Disable focus trap if active
    if (this.trapFocus) {
      this.disableFocusTrap()
    }
  }

  /**
   * Create keyboard help dialog
   */
  private createKeyboardHelpDialog(): void {
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-label', 'Keyboard shortcuts')
    dialog.setAttribute('aria-modal', 'true')
    dialog.className = 'keyboard-help-dialog'

    dialog.innerHTML = `
      <div class="dialog-content">
        <h2>Keyboard Shortcuts</h2>
        <div class="shortcuts-grid">
          <div class="shortcut-group">
            <h3>Navigation</h3>
            <ul>
              <li><kbd>Alt + M</kbd> - Focus main content</li>
              <li><kbd>Alt + N</kbd> - Focus navigation</li>
              <li><kbd>Alt + S</kbd> - Focus search</li>
              <li><kbd>Ctrl + ←/→</kbd> - Previous/Next week</li>
              <li><kbd>Ctrl + Home</kbd> - Go to today</li>
            </ul>
          </div>
          <div class="shortcut-group">
            <h3>Schedule Grid</h3>
            <ul>
              <li><kbd>Arrow keys</kbd> - Navigate cells</li>
              <li><kbd>Home/End</kbd> - First/Last cell in row</li>
              <li><kbd>Ctrl + Home/End</kbd> - First/Last cell in grid</li>
              <li><kbd>Page Up/Down</kbd> - Move by week</li>
              <li><kbd>Enter/Space</kbd> - Activate cell</li>
            </ul>
          </div>
          <div class="shortcut-group">
            <h3>Actions</h3>
            <ul>
              <li><kbd>Ctrl + N</kbd> - New lesson</li>
              <li><kbd>Ctrl + S</kbd> - Save schedule</li>
              <li><kbd>Ctrl + F</kbd> - Open search</li>
              <li><kbd>Escape</kbd> - Close dialog/cancel</li>
              <li><kbd>Alt + ?</kbd> - Show this help</li>
            </ul>
          </div>
        </div>
        <button class="close-button" aria-label="Close keyboard shortcuts help">Close</button>
      </div>
    `

    // Add styles
    const style = document.createElement('style')
    style.textContent = `
      .keyboard-help-dialog {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }
      .dialog-content {
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 800px;
        max-height: 80vh;
        overflow-y: auto;
      }
      .shortcuts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 24px;
        margin: 16px 0;
      }
      .shortcut-group h3 {
        margin-top: 0;
        margin-bottom: 8px;
        font-size: 18px;
      }
      .shortcut-group ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .shortcut-group li {
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      kbd {
        background: #f5f5f5;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 2px 6px;
        font-family: monospace;
        font-size: 12px;
      }
      .close-button {
        background: #007cba;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        float: right;
      }
    `

    document.head.appendChild(style)
    document.body.appendChild(dialog)

    // Setup close functionality
    const closeButton = dialog.querySelector('.close-button') as HTMLElement
    closeButton.addEventListener('click', () => {
      document.body.removeChild(dialog)
      document.head.removeChild(style)
    })

    // Enable focus trap
    this.enableFocusTrap(dialog)

    // Close on escape
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeButton.click()
      }
    })
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleGlobalKeydown.bind(this))
    document.removeEventListener('focusin', this.handleFocusIn.bind(this))
    document.removeEventListener('focusout', this.handleFocusOut.bind(this))
    this.keyboardShortcuts.clear()
  }
}

// Export utilities for Vue components
export const keyboardNavigationUtils = {
  /**
   * Create accessible grid cell props
   */
  createGridCellProps(rowIndex: number, colIndex: number, isSelected: boolean = false) {
    return {
      role: 'gridcell',
      tabindex: isSelected ? 0 : -1,
      'aria-rowindex': rowIndex,
      'aria-colindex': colIndex,
      'aria-selected': isSelected,
      'data-schedule-cell': true
    }
  },

  /**
   * Create accessible button props
   */
  createButtonProps(label: string, pressed?: boolean) {
    const props: any = {
      role: 'button',
      'aria-label': label,
      tabindex: 0
    }
    
    if (pressed !== undefined) {
      props['aria-pressed'] = pressed
    }
    
    return props
  },

  /**
   * Handle keyboard events for custom buttons
   */
  handleButtonKeydown(event: KeyboardEvent, callback: () => void) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      callback()
    }
  }
}

// Initialize global keyboard navigation service
let globalKeyboardService: KeyboardNavigationService | null = null

export function initializeKeyboardNavigation(): KeyboardNavigationService {
  if (!globalKeyboardService) {
    globalKeyboardService = new KeyboardNavigationService()
  }
  return globalKeyboardService
}

export function getKeyboardNavigationService(): KeyboardNavigationService | null {
  return globalKeyboardService
}