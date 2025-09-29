/**
 * Page Load Time Tests (< 2s requirement)
 * Performance testing for frontend page loading
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { chromium, Browser, Page } from 'playwright'

interface PageLoadMetrics {
  url: string
  loadTime: number
  domContentLoaded: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number
  passed: boolean
}

class PageLoadTester {
  private browser: Browser | null = null
  private baseUrl: string = 'http://localhost:3000'
  private threshold: number = 2000 // 2 seconds

  async setup() {
    this.browser = await chromium.launch({ headless: true })
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close()
    }
  }

  /**
   * Test page load performance
   */
  async testPageLoad(url: string): Promise<PageLoadMetrics> {
    if (!this.browser) {
      throw new Error('Browser not initialized')
    }

    const page = await this.browser.newPage()
    const startTime = Date.now()

    try {
      // Enable performance monitoring
      await page.goto(`${this.baseUrl}${url}`, {
        waitUntil: 'networkidle'
      })

      // Measure load time
      const loadTime = Date.now() - startTime

      // Get performance metrics
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        const paintEntries = performance.getEntriesByType('paint')
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
          // Note: These would be measured with actual performance APIs in real implementation
          largestContentfulPaint: 0,
          cumulativeLayoutShift: 0,
          firstInputDelay: 0
        }
      })

      const result: PageLoadMetrics = {
        url,
        loadTime,
        domContentLoaded: metrics.domContentLoaded,
        firstContentfulPaint: metrics.firstContentfulPaint,
        largestContentfulPaint: metrics.largestContentfulPaint,
        cumulativeLayoutShift: metrics.cumulativeLayoutShift,
        firstInputDelay: metrics.firstInputDelay,
        passed: loadTime <= this.threshold
      }

      return result

    } finally {
      await page.close()
    }
  }

  /**
   * Test bundle size and optimization
   */
  async testBundlePerformance(url: string): Promise<{
    totalSize: number
    jsSize: number
    cssSize: number
    imageSize: number
    passed: boolean
  }> {
    if (!this.browser) {
      throw new Error('Browser not initialized')
    }

    const page = await this.browser.newPage()
    const resources: { url: string, size: number, type: string }[] = []

    // Monitor network requests
    page.on('response', async (response) => {
      try {
        const url = response.url()
        const headers = response.headers()
        const contentLength = headers['content-length']
        const size = contentLength ? parseInt(contentLength) : 0
        
        let type = 'other'
        if (url.endsWith('.js') || headers['content-type']?.includes('javascript')) {
          type = 'javascript'
        } else if (url.endsWith('.css') || headers['content-type']?.includes('text/css')) {
          type = 'css'
        } else if (headers['content-type']?.startsWith('image/')) {
          type = 'image'
        }

        resources.push({ url, size, type })
      } catch (error) {
        // Ignore errors in resource monitoring
      }
    })

    try {
      await page.goto(`${this.baseUrl}${url}`, {
        waitUntil: 'networkidle'
      })

      const totalSize = resources.reduce((sum, resource) => sum + resource.size, 0)
      const jsSize = resources.filter(r => r.type === 'javascript').reduce((sum, r) => sum + r.size, 0)
      const cssSize = resources.filter(r => r.type === 'css').reduce((sum, r) => sum + r.size, 0)
      const imageSize = resources.filter(r => r.type === 'image').reduce((sum, r) => sum + r.size, 0)

      // 500KB threshold as per requirements
      const passed = totalSize <= 500 * 1024

      return {
        totalSize,
        jsSize,
        cssSize,
        imageSize,
        passed
      }

    } finally {
      await page.close()
    }
  }

  /**
   * Test Core Web Vitals
   */
  async testCoreWebVitals(url: string): Promise<{
    lcp: number // Largest Contentful Paint
    fid: number // First Input Delay  
    cls: number // Cumulative Layout Shift
    passed: boolean
  }> {
    if (!this.browser) {
      throw new Error('Browser not initialized')
    }

    const page = await this.browser.newPage()

    try {
      await page.goto(`${this.baseUrl}${url}`)

      // Wait for page to be interactive
      await page.waitForLoadState('networkidle')

      // Get Core Web Vitals
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals = { lcp: 0, fid: 0, cls: 0 }
          
          // LCP observer
          if ('PerformanceObserver' in window) {
            new PerformanceObserver((list) => {
              const entries = list.getEntries()
              const lastEntry = entries[entries.length - 1]
              vitals.lcp = lastEntry.startTime
            }).observe({ entryTypes: ['largest-contentful-paint'] })

            // FID observer
            new PerformanceObserver((list) => {
              const entries = list.getEntries()
              entries.forEach((entry: any) => {
                vitals.fid = entry.processingStart - entry.startTime
              })
            }).observe({ entryTypes: ['first-input'] })

            // CLS observer
            new PerformanceObserver((list) => {
              const entries = list.getEntries()
              entries.forEach((entry: any) => {
                if (!entry.hadRecentInput) {
                  vitals.cls += entry.value
                }
              })
            }).observe({ entryTypes: ['layout-shift'] })
          }

          // Return vitals after a delay to collect measurements
          setTimeout(() => resolve(vitals), 3000)
        })
      })

      const passed = 
        vitals.lcp <= 2500 && // LCP should be <= 2.5s
        vitals.fid <= 100 &&  // FID should be <= 100ms
        vitals.cls <= 0.1     // CLS should be <= 0.1

      return {
        lcp: vitals.lcp,
        fid: vitals.fid,
        cls: vitals.cls,
        passed
      }

    } finally {
      await page.close()
    }
  }
}

describe('Page Load Time Tests (T066)', () => {
  let tester: PageLoadTester
  const testPages = [
    { path: '/', name: 'Home' },
    { path: '/schedules', name: 'Schedules' },
    { path: '/rules', name: 'Rules' },
    { path: '/collaboration', name: 'Collaboration' }
  ]

  beforeAll(async () => {
    tester = new PageLoadTester()
    await tester.setup()
  })

  afterAll(async () => {
    await tester.teardown()
  })

  test.each(testPages)('$name page loads within 2 seconds', async ({ path, name }) => {
    const metrics = await tester.testPageLoad(path)
    
    console.log(`\n📊 ${name} Page Performance:`)    
    console.log(`  • Load Time: ${metrics.loadTime}ms`)    
    console.log(`  • DOM Content Loaded: ${metrics.domContentLoaded}ms`)    
    console.log(`  • First Contentful Paint: ${metrics.firstContentfulPaint}ms`)    
    console.log(`  • Passed (< 2s): ${metrics.passed ? '✅' : '❌'}`)    
    
    expect(metrics.loadTime).toBeLessThanOrEqual(2000)
    expect(metrics.passed).toBe(true)
  }, 30000)

  test.each(testPages)('$name page bundle size within limits', async ({ path, name }) => {
    const bundle = await tester.testBundlePerformance(path)
    
    console.log(`\n📦 ${name} Bundle Analysis:`)    
    console.log(`  • Total Size: ${(bundle.totalSize / 1024).toFixed(1)}KB`)    
    console.log(`  • JavaScript: ${(bundle.jsSize / 1024).toFixed(1)}KB`)    
    console.log(`  • CSS: ${(bundle.cssSize / 1024).toFixed(1)}KB`)    
    console.log(`  • Images: ${(bundle.imageSize / 1024).toFixed(1)}KB`)    
    console.log(`  • Within 500KB limit: ${bundle.passed ? '✅' : '❌'}`)    
    
    expect(bundle.totalSize).toBeLessThanOrEqual(500 * 1024) // 500KB
    expect(bundle.passed).toBe(true)
  }, 30000)

  test.each(testPages)('$name page Core Web Vitals', async ({ path, name }) => {
    const vitals = await tester.testCoreWebVitals(path)
    
    console.log(`\n🎯 ${name} Core Web Vitals:`)    
    console.log(`  • Largest Contentful Paint: ${vitals.lcp.toFixed(1)}ms`)    
    console.log(`  • First Input Delay: ${vitals.fid.toFixed(1)}ms`)    
    console.log(`  • Cumulative Layout Shift: ${vitals.cls.toFixed(3)}`)    
    console.log(`  • All vitals good: ${vitals.passed ? '✅' : '❌'}`)    
    
    expect(vitals.lcp).toBeLessThanOrEqual(2500) // 2.5s
    expect(vitals.fid).toBeLessThanOrEqual(100)  // 100ms
    expect(vitals.cls).toBeLessThanOrEqual(0.1)  // 0.1
    expect(vitals.passed).toBe(true)
  }, 30000)

  test('Overall page performance summary', async () => {
    const results = await Promise.all(
      testPages.map(async (page) => {
        const metrics = await tester.testPageLoad(page.path)
        return {
          page: page.name,
          loadTime: metrics.loadTime,
          passed: metrics.passed
        }
      })
    )

    console.log('\n📈 Overall Performance Summary:')
    results.forEach(result => {
      console.log(`  • ${result.page}: ${result.loadTime}ms ${result.passed ? '✅' : '❌'}`)
    })

    const averageLoadTime = results.reduce((sum, r) => sum + r.loadTime, 0) / results.length
    const allPassed = results.every(r => r.passed)

    console.log(`  • Average Load Time: ${averageLoadTime.toFixed(1)}ms`)
    console.log(`  • All Pages Under 2s: ${allPassed ? '✅' : '❌'}`)

    expect(averageLoadTime).toBeLessThanOrEqual(2000)
    expect(allPassed).toBe(true)
  }, 60000)
})

export { PageLoadTester, type PageLoadMetrics }