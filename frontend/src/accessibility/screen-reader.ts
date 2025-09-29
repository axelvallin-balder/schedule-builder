/**
 * Screen Reader Compatibility Implementation
 * Provides comprehensive screen reader support for the Schedule Builder application
 */

// Screen Reader Service
export class ScreenReaderService {
  private announcements: HTMLElement[] = []
  private statusElement: HTMLElement | null = null
  private alertElement: HTMLElement | null = null

  constructor() {
    this.initializeScreenReaderElements()
    this.setupGlobalAnnouncements()
  }

  /**
   * Initialize screen reader specific elements
   */
  private initializeScreenReaderElements(): void {
    // Create status announcement area
    this.statusElement = this.createAnnouncementElement('status', 'polite')
    
    // Create alert announcement area
    this.alertElement = this.createAnnouncementElement('alert', 'assertive')
    
    // Add skip links
    this.addSkipLinks()
    
    // Setup page structure announcements
    this.announcePageStructure()
  }

  /**
   * Create announcement element for screen readers
   */
  private createAnnouncementElement(id: string, level: 'polite' | 'assertive'): HTMLElement {
    const element = document.createElement('div')
    element.id = `sr-${id}`
    element.setAttribute('aria-live', level)
    element.setAttribute('aria-atomic', 'true')
    element.className = 'sr-only'
    element.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `
    
    document.body.appendChild(element)
    return element
  }

  /**
   * Add skip navigation links
   */
  private addSkipLinks(): void {
    const skipContainer = document.createElement('div')
    skipContainer.className = 'skip-links'
    skipContainer.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      z-index: 1000;
    `

    const skipLinks = [
      { href: '#main-content', text: 'Skip to main content' },
      { href: '#navigation', text: 'Skip to navigation' },
      { href: '#schedule-grid', text: 'Skip to schedule' },
      { href: '#search', text: 'Skip to search' }
    ]

    skipLinks.forEach(link => {
      const skipLink = document.createElement('a')
      skipLink.href = link.href
      skipLink.textContent = link.text
      skipLink.className = 'skip-link'
      skipLink.style.cssText = `
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        position: absolute;
        top: -40px;
        left: 0;
        transition: top 0.3s;
      `
      
      skipLink.addEventListener('focus', () => {
        skipLink.style.top = '0'
      })
      
      skipLink.addEventListener('blur', () => {
        skipLink.style.top = '-40px'
      })

      skipContainer.appendChild(skipLink)
    })

    document.body.insertBefore(skipContainer, document.body.firstChild)
  }

  /**
   * Announce page structure to screen readers
   */
  private announcePageStructure(): void {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.announcePageLoad()
      })
    } else {
      this.announcePageLoad()
    }
  }

  /**
   * Announce page load
   */
  private announcePageLoad(): void {
    const pageTitle = document.title || 'Schedule Builder'
    const mainHeading = document.querySelector('h1')?.textContent || 'Application loaded'
    
    this.announce(`${pageTitle} page loaded. ${mainHeading}`, 'polite')
    
    // Announce navigation structure
    setTimeout(() => {
      this.announceNavigationStructure()
    }, 1000)
  }

  /**
   * Announce navigation structure
   */
  private announceNavigationStructure(): void {
    const nav = document.querySelector('nav, [role="navigation"]')
    if (!nav) return

    const navItems = nav.querySelectorAll('a, button')
    if (navItems.length > 0) {
      this.announce(`Navigation menu available with ${navItems.length} items`, 'polite')
    }
  }

  /**
   * Setup global announcement handlers
   */
  private setupGlobalAnnouncements(): void {
    // Listen for route changes
    this.setupRouteChangeAnnouncements()
    
    // Listen for form submission feedback
    this.setupFormAnnouncements()
    
    // Listen for error announcements
    this.setupErrorAnnouncements()
    
    // Listen for success announcements
    this.setupSuccessAnnouncements()
  }

  /**
   * Setup route change announcements
   */
  private setupRouteChangeAnnouncements(): void {
    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      this.announcePageChange()
    })

    // Listen for programmatic navigation (if using a router)
    this.observeUrlChanges()
  }

  /**
   * Observe URL changes for SPA navigation
   */
  private observeUrlChanges(): void {
    let lastUrl = location.href
    
    const observer = new MutationObserver(() => {
      const url = location.href
      if (url !== lastUrl) {
        lastUrl = url
        this.announcePageChange()
      }
    })

    observer.observe(document, { subtree: true, childList: true })
  }

  /**
   * Announce page change
   */
  private announcePageChange(): void {
    const pageTitle = document.title
    const mainHeading = document.querySelector('h1')?.textContent
    
    if (mainHeading) {
      this.announce(`Page changed to ${mainHeading}`, 'polite')
    } else if (pageTitle) {
      this.announce(`Navigated to ${pageTitle}`, 'polite')
    }
  }

  /**
   * Setup form announcements
   */
  private setupFormAnnouncements(): void {
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement
      const formName = form.getAttribute('aria-label') || form.getAttribute('name') || 'form'
      this.announce(`${formName} submitted`, 'polite')
    })

    // Listen for form validation errors
    document.addEventListener('invalid', (event) => {
      const input = event.target as HTMLInputElement
      const label = this.getInputLabel(input)
      this.announce(`Validation error in ${label}: ${input.validationMessage}`, 'assertive')
    }, true)
  }

  /**
   * Get label for input element
   */
  private getInputLabel(input: HTMLInputElement): string {
    // Try aria-label first
    if (input.getAttribute('aria-label')) {
      return input.getAttribute('aria-label')!
    }

    // Try associated label
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`)
      if (label) {
        return label.textContent || 'field'
      }
    }

    // Try parent label
    const parentLabel = input.closest('label')
    if (parentLabel) {
      return parentLabel.textContent || 'field'
    }

    return input.name || input.type || 'field'
  }

  /**
   * Setup error announcements
   */
  private setupErrorAnnouncements(): void {
    // Listen for custom error events
    document.addEventListener('app-error', (event: any) => {
      this.announce(`Error: ${event.detail.message}`, 'assertive')
    })

    // Listen for network errors
    window.addEventListener('error', (event) => {
      if (event.message) {
        this.announce('An error occurred. Please try again.', 'assertive')
      }
    })

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.announce('An error occurred. Please try again.', 'assertive')
    })
  }

  /**
   * Setup success announcements
   */
  private setupSuccessAnnouncements(): void {
    // Listen for custom success events
    document.addEventListener('app-success', (event: any) => {
      this.announce(`Success: ${event.detail.message}`, 'polite')
    })
  }

  /**
   * Announce text to screen readers
   */
  announce(text: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const element = priority === 'assertive' ? this.alertElement : this.statusElement
    
    if (!element) return

    // Clear previous announcement
    element.textContent = ''
    
    // Add new announcement after a brief delay to ensure it's announced
    setTimeout(() => {
      element.textContent = text
    }, 100)

    // Clear announcement after it's been read
    setTimeout(() => {
      element.textContent = ''
    }, 5000)
  }

  /**
   * Announce schedule cell information
   */
  announceScheduleCell(timeSlot: string, day: string, lesson?: any): void {
    let announcement = `${day} at ${timeSlot}`
    
    if (lesson) {
      announcement += `, ${lesson.subject}`
      if (lesson.teacher) announcement += ` with ${lesson.teacher}`
      if (lesson.room) announcement += ` in room ${lesson.room}`
      if (lesson.group) announcement += ` for ${lesson.group}`
    } else {
      announcement += ', empty time slot'
    }
    
    this.announce(announcement, 'polite')
  }

  /**
   * Announce schedule changes
   */
  announceScheduleChange(action: string, details: any): void {
    let announcement = ''
    
    switch (action) {
      case 'lesson-added':
        announcement = `Lesson added: ${details.subject} on ${details.day} at ${details.time}`
        break
      case 'lesson-removed':
        announcement = `Lesson removed: ${details.subject} on ${details.day} at ${details.time}`
        break
      case 'lesson-moved':
        announcement = `Lesson moved: ${details.subject} from ${details.from} to ${details.to}`
        break
      case 'schedule-saved':
        announcement = 'Schedule saved successfully'
        break
      case 'schedule-loaded':
        announcement = `Schedule loaded for ${details.period || 'current period'}`
        break
      default:
        announcement = `Schedule updated: ${action}`
    }
    
    this.announce(announcement, 'polite')
  }

  /**
   * Announce form field focus
   */
  announceFieldFocus(field: HTMLElement): void {
    const label = this.getFieldLabel(field)
    const required = field.hasAttribute('required') ? 'required' : 'optional'
    const type = field.getAttribute('type') || field.tagName.toLowerCase()
    
    let announcement = `${label}, ${type} field, ${required}`
    
    // Add current value if present
    const value = (field as HTMLInputElement).value
    if (value) {
      announcement += `, current value: ${value}`
    }
    
    // Add help text if present
    const helpId = field.getAttribute('aria-describedby')
    if (helpId) {
      const helpElement = document.getElementById(helpId)
      if (helpElement) {
        announcement += `, ${helpElement.textContent}`
      }
    }
    
    this.announce(announcement, 'polite')
  }

  /**
   * Get field label
   */
  private getFieldLabel(field: HTMLElement): string {
    // Try aria-label
    const ariaLabel = field.getAttribute('aria-label')
    if (ariaLabel) return ariaLabel

    // Try aria-labelledby
    const labelledBy = field.getAttribute('aria-labelledby')
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy)
      if (labelElement) return labelElement.textContent || 'field'
    }

    // Try associated label
    const fieldId = field.id
    if (fieldId) {
      const label = document.querySelector(`label[for="${fieldId}"]`)
      if (label) return label.textContent || 'field'
    }

    // Try parent label
    const parentLabel = field.closest('label')
    if (parentLabel) {
      const labelText = parentLabel.textContent || ''
      return labelText.replace(/[*:]/g, '').trim() || 'field'
    }

    return 'field'
  }

  /**
   * Announce dialog state
   */
  announceDialog(action: 'opened' | 'closed', dialogName: string): void {
    const announcement = `${dialogName} dialog ${action}`
    this.announce(announcement, 'polite')
  }

  /**
   * Announce loading state
   */
  announceLoading(isLoading: boolean, context?: string): void {
    const contextText = context ? ` for ${context}` : ''
    const announcement = isLoading ? `Loading${contextText}` : `Loading complete${contextText}`
    this.announce(announcement, 'polite')
  }

  /**
   * Announce search results
   */
  announceSearchResults(count: number, query: string): void {
    let announcement = ''
    
    if (count === 0) {
      announcement = `No results found for "${query}"`
    } else if (count === 1) {
      announcement = `1 result found for "${query}"`
    } else {
      announcement = `${count} results found for "${query}"`
    }
    
    this.announce(announcement, 'polite')
  }

  /**
   * Announce table navigation
   */
  announceTableNavigation(row: number, col: number, totalRows: number, totalCols: number): void {
    const announcement = `Row ${row} of ${totalRows}, column ${col} of ${totalCols}`
    this.announce(announcement, 'polite')
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    // Remove announcement elements
    if (this.statusElement) {
      document.body.removeChild(this.statusElement)
    }
    if (this.alertElement) {
      document.body.removeChild(this.alertElement)
    }

    // Remove skip links
    const skipLinks = document.querySelector('.skip-links')
    if (skipLinks) {
      document.body.removeChild(skipLinks)
    }
  }
}

// ARIA Helper utilities
export class AriaHelpers {
  /**
   * Set ARIA attributes for grid cells
   */
  static setGridCellAttributes(cell: HTMLElement, row: number, col: number, selected: boolean = false): void {
    cell.setAttribute('role', 'gridcell')
    cell.setAttribute('aria-rowindex', row.toString())
    cell.setAttribute('aria-colindex', col.toString())
    cell.setAttribute('tabindex', selected ? '0' : '-1')
    
    if (selected) {
      cell.setAttribute('aria-selected', 'true')
    } else {
      cell.removeAttribute('aria-selected')
    }
  }

  /**
   * Set ARIA attributes for form fields
   */
  static setFormFieldAttributes(field: HTMLElement, options: {
    label?: string
    required?: boolean
    invalid?: boolean
    describedBy?: string[]
  }): void {
    if (options.label) {
      field.setAttribute('aria-label', options.label)
    }
    
    if (options.required !== undefined) {
      field.setAttribute('aria-required', options.required.toString())
    }
    
    if (options.invalid !== undefined) {
      field.setAttribute('aria-invalid', options.invalid.toString())
    }
    
    if (options.describedBy && options.describedBy.length > 0) {
      field.setAttribute('aria-describedby', options.describedBy.join(' '))
    }
  }

  /**
   * Set ARIA attributes for buttons
   */
  static setButtonAttributes(button: HTMLElement, options: {
    label?: string
    pressed?: boolean
    expanded?: boolean
    controls?: string
    describedBy?: string
  }): void {
    if (options.label) {
      button.setAttribute('aria-label', options.label)
    }
    
    if (options.pressed !== undefined) {
      button.setAttribute('aria-pressed', options.pressed.toString())
    }
    
    if (options.expanded !== undefined) {
      button.setAttribute('aria-expanded', options.expanded.toString())
    }
    
    if (options.controls) {
      button.setAttribute('aria-controls', options.controls)
    }
    
    if (options.describedBy) {
      button.setAttribute('aria-describedby', options.describedBy)
    }
  }

  /**
   * Create accessible table structure
   */
  static createAccessibleTable(container: HTMLElement, options: {
    caption?: string
    headers?: string[]
    rowHeaders?: boolean
  }): void {
    container.setAttribute('role', 'table')
    
    if (options.caption) {
      container.setAttribute('aria-label', options.caption)
    }
    
    // Set up headers
    if (options.headers) {
      const headerRow = container.querySelector('[role="row"]:first-child')
      if (headerRow) {
        headerRow.setAttribute('role', 'row')
        const headers = headerRow.querySelectorAll('th, [role="columnheader"]')
        headers.forEach((header, index) => {
          header.setAttribute('role', 'columnheader')
          header.setAttribute('aria-colindex', (index + 1).toString())
        })
      }
    }
  }

  /**
   * Manage focus for modal dialogs
   */
  static manageFocusForDialog(dialog: HTMLElement): {
    trapFocus: () => void
    restoreFocus: () => void
  } {
    const previousFocus = document.activeElement as HTMLElement
    const focusableElements = dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>
    
    const firstFocusable = focusableElements[0]
    const lastFocusable = focusableElements[focusableElements.length - 1]

    const trapFocus = () => {
      if (firstFocusable) {
        firstFocusable.focus()
      }

      dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
              e.preventDefault()
              lastFocusable.focus()
            }
          } else {
            if (document.activeElement === lastFocusable) {
              e.preventDefault()
              firstFocusable.focus()
            }
          }
        }
      })
    }

    const restoreFocus = () => {
      if (previousFocus) {
        previousFocus.focus()
      }
    }

    return { trapFocus, restoreFocus }
  }
}

// Export utilities for Vue components
export const screenReaderUtils = {
  /**
   * Create screen reader only text
   */
  createSROnlyText(text: string): HTMLElement {
    const element = document.createElement('span')
    element.className = 'sr-only'
    element.textContent = text
    element.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `
    return element
  },

  /**
   * Generate accessible description for schedule cell
   */
  generateCellDescription(timeSlot: string, day: string, lesson?: any): string {
    let description = `${day} at ${timeSlot}`
    
    if (lesson) {
      description += `: ${lesson.subject}`
      if (lesson.teacher) description += ` with ${lesson.teacher}`
      if (lesson.room) description += ` in ${lesson.room}`
    } else {
      description += ': Empty time slot'
    }
    
    return description
  },

  /**
   * Generate accessible table caption
   */
  generateTableCaption(title: string, rows: number, cols: number): string {
    return `${title}. Table with ${rows} rows and ${cols} columns. Use arrow keys to navigate.`
  }
}

// Initialize global screen reader service
let globalScreenReaderService: ScreenReaderService | null = null

export function initializeScreenReader(): ScreenReaderService {
  if (!globalScreenReaderService) {
    globalScreenReaderService = new ScreenReaderService()
  }
  return globalScreenReaderService
}

export function getScreenReaderService(): ScreenReaderService | null {
  return globalScreenReaderService
}