/// <reference types="cypress" />

// Test configuration and utilities
const TEST_CONFIG = {
  scheduleGenerationTimeout: 10000, // 10s for schedule generation
  uiResponseTimeout: 200, // 200ms for UI responses
  performanceBenchmarkRuns: 5
}

// Test data generators
function generateTestScheduleData() {
  return {
    courses: [
      { id: '1', name: 'Mathematics', teacherId: 'teacher1', groupIds: ['group1'], weeklyHours: 4 },
      { id: '2', name: 'Physics', teacherId: 'teacher2', groupIds: ['group2'], weeklyHours: 3 },
      { id: '3', name: 'Chemistry', teacherId: 'teacher3', groupIds: ['group1', 'group2'], weeklyHours: 2 }
    ],
    teachers: [
      { id: 'teacher1', name: 'John Smith', subjectIds: ['math'] },
      { id: 'teacher2', name: 'Jane Doe', subjectIds: ['physics'] },
      { id: 'teacher3', name: 'Bob Wilson', subjectIds: ['chemistry'] }
    ],
    groups: [
      { id: 'group1', name: 'Class 9A', classId: 'class1' },
      { id: 'group2', name: 'Class 9B', classId: 'class2' }
    ],
    constraints: {
      maxLessonsPerDay: 8,
      lessonDuration: 45,
      breakDuration: 15,
      workingHours: { start: '08:15', end: '16:00' }
    }
  }
}

describe('Schedule Generation E2E Tests', () => {
  beforeEach(() => {
    // Navigate to the schedule builder application
    cy.visit('/')
    
    // Clear any existing data and set up test data
    cy.window().then((win) => {
      win.localStorage.clear()
      win.sessionStorage.clear()
    })
  })

  describe('Basic Schedule Generation', () => {
    it('should generate a basic schedule successfully', () => {
      const testData = generateTestScheduleData()
      
      // Set up test data via API or UI
      cy.get('[data-testid="create-new-schedule"]').click()
      cy.get('[data-testid="schedule-form"]').should('be.visible')
      
      // Fill in schedule details
      cy.get('[data-testid="schedule-name"]').type('Test Schedule 1')
      cy.get('[data-testid="schedule-year"]').type('2024')
      cy.get('[data-testid="schedule-semester"]').type('Fall')
      
      // Add courses
      testData.courses.forEach((course) => {
        cy.get('[data-testid="add-course"]').click()
        cy.get('[data-testid="course-name"]').type(course.name)
        cy.get('[data-testid="course-teacher"]').select(course.teacherId)
        cy.get('[data-testid="course-hours"]').type(course.weeklyHours.toString())
        
        // Select groups
        course.groupIds.forEach((groupId) => {
          cy.get(`[data-testid="course-group-${groupId}"]`).check()
        })
        
        cy.get('[data-testid="save-course"]').click()
      })
      
      // Measure schedule generation performance
      const startTime = Date.now()
      
      cy.get('[data-testid="generate-schedule"]').click()
      cy.get('[data-testid="schedule-grid"]', { timeout: TEST_CONFIG.scheduleGenerationTimeout })
        .should('be.visible')
        .then(() => {
          const duration = Date.now() - startTime
          cy.log(`Schedule Generation Performance: ${duration}ms`)
          
          // Performance assertion
          expect(duration).to.be.lessThan(5000) // Should be under 5 seconds
        })
      
      // Verify schedule was generated
      cy.get('[data-testid="lesson-card"]').should('have.length.at.least', 1)
      
      // Verify schedule structure
      cy.get('[data-testid="lesson-card"]').then(($lessons) => {
        const scheduleData = Array.from($lessons).map((card) => ({
          subject: card.getAttribute('data-subject'),
          teacher: card.getAttribute('data-teacher'),
          group: card.getAttribute('data-group'),
          time: card.getAttribute('data-time'),
          day: card.getAttribute('data-day')
        }))
        
        expect(scheduleData.length).to.be.greaterThan(0)
        expect(scheduleData.every((lesson: any) => lesson.subject && lesson.teacher)).to.be.true
      })
    })

    it('should handle multiple schedule alternatives', () => {
      cy.get('[data-testid="create-new-schedule"]').click()
      cy.get('[data-testid="schedule-form"]').should('be.visible')
      
      // Set up basic schedule data
      cy.get('[data-testid="schedule-name"]').type('Alternative Test Schedule')
      
      // Enable alternative generation
      cy.get('[data-testid="generate-alternatives"]').check()
      cy.get('[data-testid="max-alternatives"]').type('3')
      
      const startTime = Date.now()
      
      cy.get('[data-testid="generate-schedule"]').click()
      cy.get('[data-testid="schedule-alternatives"]', { timeout: TEST_CONFIG.scheduleGenerationTimeout })
        .should('be.visible')
        .then(() => {
          const duration = Date.now() - startTime
          cy.log(`Alternative Generation Performance: ${duration}ms`)
          
          // Performance check
          expect(duration).to.be.lessThan(8000) // Alternatives may take longer
        })
      
      // Verify alternatives were generated
      cy.get('[data-testid="schedule-alternative"]').should('have.length.at.least', 1)
      cy.get('[data-testid="schedule-alternative"]').should('have.length.at.most', 3)
      
      // Test switching between alternatives
      cy.get('[data-testid="schedule-alternative"]').first().click()
      cy.get('[data-testid="active-schedule"]').should('be.visible')
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle impossible scheduling constraints', () => {
      cy.get('[data-testid="create-new-schedule"]').click()
      
      // Set up impossible constraints
      cy.get('[data-testid="schedule-name"]').type('Impossible Schedule')
      
      // Add conflicting courses (same teacher, same time)
      cy.get('[data-testid="add-course"]').click()
      cy.get('[data-testid="course-name"]').type('Math Advanced')
      cy.get('[data-testid="course-teacher"]').select('teacher1')
      cy.get('[data-testid="course-hours"]').type('10') // Too many hours
      cy.get('[data-testid="save-course"]').click()
      
      cy.get('[data-testid="add-course"]').click()
      cy.get('[data-testid="course-name"]').type('Math Basic')
      cy.get('[data-testid="course-teacher"]').select('teacher1')
      cy.get('[data-testid="course-hours"]').type('10') // Same teacher, too many hours
      cy.get('[data-testid="save-course"]').click()
      
      // Attempt generation
      cy.get('[data-testid="generate-schedule"]').click()
      
      // Should show error or partial schedule
      cy.get('[data-testid="schedule-error"]', { timeout: 10000 }).should('be.visible')
      
      cy.get('[data-testid="error-message"]')
        .should('contain.text', 'scheduling constraints')
    })

    it('should handle teacher availability conflicts', () => {
      cy.get('[data-testid="create-new-schedule"]').click()
      
      // Set teacher working hours
      cy.get('[data-testid="manage-teachers"]').click()
      cy.get('[data-testid="edit-teacher-teacher1"]').click()
      cy.get('[data-testid="teacher-start-time"]').type('10:00')
      cy.get('[data-testid="teacher-end-time"]').type('12:00') // Very limited hours
      cy.get('[data-testid="save-teacher"]').click()
      
      // Try to schedule more courses than possible in available time
      cy.get('[data-testid="add-course"]').click()
      cy.get('[data-testid="course-name"]').type('Limited Schedule Test')
      cy.get('[data-testid="course-teacher"]').select('teacher1')
      cy.get('[data-testid="course-hours"]').type('5') // More than available
      cy.get('[data-testid="save-course"]').click()
      
      cy.get('[data-testid="generate-schedule"]').click()
      
      // Should handle gracefully
      cy.get('[data-testid="schedule-warnings"]', { timeout: 10000 }).should('be.visible')
      
      cy.get('[data-testid="warning-message"]').should(($warnings) => {
        const warnings = $warnings.toArray().map(el => el.textContent)
        expect(warnings.some((warning: any) => warning.includes('availability'))).to.be.true
      })
    })

    it('should handle large datasets efficiently', () => {
      // Generate large test dataset
      const largeDataset = {
        courses: Array.from({ length: 50 }, (_, i) => ({
          name: `Course ${i + 1}`,
          teacherId: `teacher${(i % 10) + 1}`,
          groupIds: [`group${(i % 20) + 1}`],
          weeklyHours: Math.floor(Math.random() * 4) + 1
        })),
        teachers: Array.from({ length: 10 }, (_, i) => ({
          name: `Teacher ${i + 1}`,
          id: `teacher${i + 1}`
        })),
        groups: Array.from({ length: 20 }, (_, i) => ({
          name: `Group ${i + 1}`,
          id: `group${i + 1}`
        }))
      }
      
      // Set up large dataset via API
      cy.window().then((win) => {
        // Mock API calls to set up data
        ;(win as any).testData = largeDataset
      })
      
      // Monitor initial memory
      cy.window().then((win) => {
        if ('memory' in win.performance) {
          const initialMemory = (win.performance as any).memory.usedJSHeapSize
          ;(win as any).initialMemory = initialMemory
        }
      })
      
      cy.get('[data-testid="import-large-dataset"]').click()
      cy.get('[data-testid="dataset-loaded"]').should('be.visible')
      
      const startTime = Date.now()
      
      cy.get('[data-testid="generate-schedule"]').click()
      cy.get('[data-testid="schedule-grid"]', { timeout: 15000 }) // Allow more time for large datasets
        .should('be.visible')
        .then(() => {
          const duration = Date.now() - startTime
          cy.log(`Large Dataset Generation Performance: ${duration}ms`)
          
          // Performance assertions
          expect(duration).to.be.lessThan(10000) // Should complete within 10 seconds
        })
      
      // Check memory usage
      cy.window().then((win) => {
        if ('memory' in win.performance && (win as any).initialMemory) {
          const finalMemory = (win.performance as any).memory.usedJSHeapSize
          const memoryIncrease = finalMemory - (win as any).initialMemory
          expect(memoryIncrease).to.be.lessThan(256 * 1024 * 1024) // Less than 256MB increase
        }
      })
      
      // Verify schedule was generated successfully
      cy.get('[data-testid="lesson-card"]').should('have.length.at.least', 1)
    })
  })

  describe('Performance Benchmarks', () => {
    it('should meet UI response time requirements', () => {
      cy.get('[data-testid="create-new-schedule"]').click()
      
      // Test various UI interactions and measure response times
      const interactions = [
        { selector: '[data-testid="add-course"]', action: 'click', name: 'Add Course' },
        { selector: '[data-testid="course-name"]', action: 'type', value: 'Test Course', name: 'Fill Course Name' },
        { selector: '[data-testid="course-teacher"]', action: 'select', value: 'teacher1', name: 'Select Teacher' },
        { selector: '[data-testid="save-course"]', action: 'click', name: 'Save Course' }
      ]
      
      interactions.forEach((interaction) => {
        const startTime = Date.now()
        
        if (interaction.action === 'click') {
          cy.get(interaction.selector).click().then(() => {
            const duration = Date.now() - startTime
            cy.log(`UI Response [${interaction.name}]: ${duration}ms`)
            expect(duration).to.be.lessThan(100) // UI should respond within 100ms
          })
        } else if (interaction.action === 'type') {
          cy.get(interaction.selector).type(interaction.value!).then(() => {
            const duration = Date.now() - startTime
            cy.log(`UI Response [${interaction.name}]: ${duration}ms`)
            expect(duration).to.be.lessThan(100)
          })
        } else if (interaction.action === 'select') {
          cy.get(interaction.selector).select(interaction.value!).then(() => {
            const duration = Date.now() - startTime
            cy.log(`UI Response [${interaction.name}]: ${duration}ms`)
            expect(duration).to.be.lessThan(100)
          })
        }
      })
    })

    it('should benchmark schedule generation performance', () => {
      const results: number[] = []
      
      // Run benchmark multiple times
      for (let i = 0; i < TEST_CONFIG.performanceBenchmarkRuns; i++) {
        cy.reload()
        cy.get('[data-testid="create-new-schedule"]').click()
        cy.get('[data-testid="schedule-name"]').type(`Benchmark Run ${i + 1}`)
        
        // Add standard test courses
        const testData = generateTestScheduleData()
        testData.courses.slice(0, 3).forEach((course) => { // Use subset for consistent testing
          cy.get('[data-testid="add-course"]').click()
          cy.get('[data-testid="course-name"]').type(course.name)
          cy.get('[data-testid="course-teacher"]').select(course.teacherId)
          cy.get('[data-testid="course-hours"]').type(course.weeklyHours.toString())
          cy.get('[data-testid="save-course"]').click()
        })
        
        const startTime = Date.now()
        
        cy.get('[data-testid="generate-schedule"]').click()
        cy.get('[data-testid="schedule-grid"]', { timeout: TEST_CONFIG.scheduleGenerationTimeout })
          .should('be.visible')
          .then(() => {
            const duration = Date.now() - startTime
            results.push(duration)
            cy.log(`Benchmark Run ${i + 1}: ${duration}ms`)
          })
      }
      
      // Calculate performance statistics after all runs
      cy.then(() => {
        const avgDuration = results.reduce((sum, duration) => sum + duration, 0) / results.length
        const maxDuration = Math.max(...results)
        const minDuration = Math.min(...results)
        
        // 95th percentile calculation
        const sortedResults = results.sort((a, b) => a - b)
        const p95Index = Math.floor(0.95 * results.length)
        const p95Duration = sortedResults[p95Index]
        
        cy.log('Performance Benchmark Results:')
        cy.log(`Average: ${avgDuration}ms`)
        cy.log(`Min: ${minDuration}ms`)
        cy.log(`Max: ${maxDuration}ms`)
        cy.log(`95th Percentile: ${p95Duration}ms`)
        
        // Performance assertions
        expect(avgDuration).to.be.lessThan(3000) // Average should be under 3 seconds
        expect(p95Duration).to.be.lessThan(5000) // 95th percentile should be under 5 seconds
        expect(maxDuration).to.be.lessThan(8000) // No run should exceed 8 seconds
      })
    })
  })

  describe('Accessibility and Error Handling', () => {
    it('should provide proper error messages for invalid inputs', () => {
      cy.get('[data-testid="create-new-schedule"]').click()
      
      // Test empty form submission
      cy.get('[data-testid="generate-schedule"]').click()
      cy.get('[data-testid="validation-errors"]').should('be.visible')
      
      cy.get('[data-testid="error-message"]').should(($errors) => {
        const errorMessages = $errors.toArray().map(el => el.textContent)
        expect(errorMessages.length).to.be.greaterThan(0)
        expect(errorMessages.some((msg: any) => msg.includes('required'))).to.be.true
      })
      
      // Test invalid data
      cy.get('[data-testid="schedule-name"]').clear() // Empty name
      cy.get('[data-testid="add-course"]').click()
      cy.get('[data-testid="course-hours"]').type('-1') // Invalid hours
      cy.get('[data-testid="save-course"]').click()
      
      cy.get('[data-testid="course-validation-error"]').should('be.visible')
    })

    it('should handle network errors gracefully', () => {
      // Simulate network failure
      cy.intercept('**/api/**', { forceNetworkError: true }).as('networkError')
      
      cy.get('[data-testid="create-new-schedule"]').click()
      cy.get('[data-testid="schedule-name"]').type('Network Error Test')
      cy.get('[data-testid="generate-schedule"]').click()
      
      // Should show network error message
      cy.get('[data-testid="network-error"]', { timeout: 5000 }).should('be.visible')
      
      cy.get('[data-testid="error-message"]')
        .should('contain.text', 'network')
    })

    it('should maintain keyboard navigation and ARIA labels', () => {
      cy.get('[data-testid="create-new-schedule"]').click()
      
      // Test keyboard navigation
      cy.get('body').trigger('keydown', { key: 'Tab' })
      cy.focused().should('have.attr', 'data-testid', 'schedule-name')
      
      cy.focused().trigger('keydown', { key: 'Tab' })
      cy.focused().should('have.attr', 'data-testid', 'schedule-year')
      
      // Test ARIA labels
      cy.get('[data-testid="schedule-form"]')
        .should('have.attr', 'role', 'form')
        .should('have.attr', 'aria-label')
      
      cy.get('[data-testid="add-course"]')
        .should('have.attr', 'aria-describedby')
    })
  })
})