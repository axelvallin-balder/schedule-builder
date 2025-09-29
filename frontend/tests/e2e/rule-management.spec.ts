/// <reference types="cypress" />

// Test configuration and utilities for rule management
const RULE_TEST_CONFIG = {
  validationTimeout: 2000, // 2s for validation responses
  uiResponseTimeout: 200, // 200ms for UI responses
  ruleComplexityLevels: ['simple', 'medium', 'complex']
}

// Test data generators for rules
function generateRuleTestData() {
  return {
    simpleRules: [
      {
        id: 'no-double-math',
        name: 'No Double Math',
        type: 'constraint',
        description: 'Mathematics should not be scheduled twice on the same day',
        condition: 'subject === "Mathematics"',
        constraint: 'maxPerDay <= 1'
      },
      {
        id: 'teacher-lunch-break',
        name: 'Teacher Lunch Break',
        type: 'availability',
        description: 'All teachers must have lunch break between 12:00-13:00',
        condition: 'time >= "12:00" && time <= "13:00"',
        constraint: 'teacher.available === false'
      }
    ],
    mediumRules: [
      {
        id: 'group-dependency',
        name: 'Group Dependencies',
        type: 'dependency',
        description: 'Dependent groups must attend certain lessons together',
        condition: 'groups.some(group => group.dependentGroups.length > 0)',
        constraint: 'schedule.sameTime(group, dependentGroups)'
      },
      {
        id: 'room-capacity',
        name: 'Room Capacity Limits',
        type: 'resource',
        description: 'Room capacity must not be exceeded',
        condition: 'lesson.groupIds.length > 0',
        constraint: 'room.capacity >= groups.totalStudents'
      }
    ],
    complexRules: [
      {
        id: 'balanced-workload',
        name: 'Balanced Teacher Workload',
        type: 'optimization',
        description: 'Teachers should have evenly distributed workload across the week',
        condition: 'teacher.lessons.length > 0',
        constraint: 'Math.abs(dailyLessons - averageDaily) <= 1'
      }
    ],
    invalidRules: [
      {
        id: 'invalid-syntax',
        name: 'Invalid Syntax Rule',
        type: 'constraint',
        description: 'Rule with invalid syntax for testing error handling',
        condition: 'invalid.syntax.here ===',
        constraint: 'this.will.fail'
      }
    ]
  }
}

describe('Rule Management E2E Tests', () => {
  beforeEach(() => {
    // Navigate to the rule management section
    cy.visit('/rules')
    
    // Clear any existing data
    cy.window().then((win) => {
      win.localStorage.clear()
      win.sessionStorage.clear()
    })
  })

  describe('Rule Creation and Validation', () => {
    it('should create simple constraint rules successfully', () => {
      const testData = generateRuleTestData()
      
      testData.simpleRules.forEach((rule) => {
        cy.get('[data-testid="add-new-rule"]').click()
        cy.get('[data-testid="rule-form"]').should('be.visible')
        
        // Fill in rule details
        cy.get('[data-testid="rule-name"]').type(rule.name)
        cy.get('[data-testid="rule-type"]').select(rule.type)
        cy.get('[data-testid="rule-description"]').type(rule.description)
        
        // Set rule conditions and constraints
        cy.get('[data-testid="rule-condition"]').type(rule.condition)
        cy.get('[data-testid="rule-constraint"]').type(rule.constraint)
        
        // Validate rule syntax
        const startTime = Date.now()
        cy.get('[data-testid="validate-rule"]').click()
        cy.get('[data-testid="validation-result"]', { timeout: RULE_TEST_CONFIG.validationTimeout })
          .should('be.visible')
          .then(() => {
            const duration = Date.now() - startTime
            cy.log(`Rule Validation Performance: ${duration}ms`)
            expect(duration).to.be.lessThan(RULE_TEST_CONFIG.validationTimeout)
          })
        
        // Check validation success
        cy.get('[data-testid="validation-status"]')
          .should('contain.text', 'Valid')
          .should('have.class', 'success')
        
        // Save rule
        cy.get('[data-testid="save-rule"]').click()
        cy.get('[data-testid="rule-saved-notification"]').should('be.visible')
        
        // Verify rule appears in list
        cy.get('[data-testid="rules-list"]')
          .should('contain.text', rule.name)
        
        cy.get(`[data-testid="rule-item-${rule.id}"]`)
          .should('be.visible')
          .should('contain.text', rule.type)
      })
    })

    it('should handle complex rule creation with dependencies', () => {
      const testData = generateRuleTestData()
      const complexRule = testData.complexRules[0]
      
      cy.get('[data-testid="add-new-rule"]').click()
      cy.get('[data-testid="rule-form"]').should('be.visible')
      
      // Fill basic information
      cy.get('[data-testid="rule-name"]').type(complexRule.name)
      cy.get('[data-testid="rule-type"]').select(complexRule.type)
      cy.get('[data-testid="rule-description"]').type(complexRule.description)
      
      // Enable advanced options for complex rules
      cy.get('[data-testid="enable-advanced-options"]').check()
      cy.get('[data-testid="advanced-rule-options"]').should('be.visible')
      
      // Set priority and weight
      cy.get('[data-testid="rule-priority"]').select('high')
      cy.get('[data-testid="rule-weight"]').type('0.8')
      
      // Add dependencies
      cy.get('[data-testid="add-dependency"]').click()
      cy.get('[data-testid="dependency-rule"]').select('teacher-lunch-break')
      cy.get('[data-testid="dependency-type"]').select('requires')
      
      // Set rule logic
      cy.get('[data-testid="rule-condition"]').type(complexRule.condition)
      cy.get('[data-testid="rule-constraint"]').type(complexRule.constraint)
      
      // Test rule with preview
      cy.get('[data-testid="preview-rule"]').click()
      cy.get('[data-testid="rule-preview"]').should('be.visible')
      
      // Verify preview shows expected behavior
      cy.get('[data-testid="preview-results"]')
        .should('contain.text', 'Teacher workload')
        .should('contain.text', 'optimization')
      
      // Validate and save
      cy.get('[data-testid="validate-rule"]').click()
      cy.get('[data-testid="validation-status"]').should('contain.text', 'Valid')
      
      cy.get('[data-testid="save-rule"]').click()
      cy.get('[data-testid="rule-saved-notification"]').should('be.visible')
    })

    it('should validate rule syntax and show helpful error messages', () => {
      const testData = generateRuleTestData()
      const invalidRule = testData.invalidRules[0]
      
      cy.get('[data-testid="add-new-rule"]').click()
      
      // Fill in invalid rule
      cy.get('[data-testid="rule-name"]').type(invalidRule.name)
      cy.get('[data-testid="rule-type"]').select(invalidRule.type)
      cy.get('[data-testid="rule-condition"]').type(invalidRule.condition)
      cy.get('[data-testid="rule-constraint"]').type(invalidRule.constraint)
      
      // Attempt validation
      cy.get('[data-testid="validate-rule"]').click()
      
      // Should show validation errors
      cy.get('[data-testid="validation-result"]').should('be.visible')
      cy.get('[data-testid="validation-status"]')
        .should('contain.text', 'Invalid')
        .should('have.class', 'error')
      
      // Check error details
      cy.get('[data-testid="validation-errors"]').should('be.visible')
      cy.get('[data-testid="error-message"]')
        .should('contain.text', 'syntax')
        .should('contain.text', 'line')
      
      // Verify save is disabled
      cy.get('[data-testid="save-rule"]').should('be.disabled')
      
      // Test error highlighting in code editor
      cy.get('[data-testid="rule-condition"]')
        .should('have.class', 'error-highlight')
      
      // Test suggestion system
      cy.get('[data-testid="error-suggestions"]').should('be.visible')
      cy.get('[data-testid="suggestion-item"]').should('have.length.at.least', 1)
      
      // Apply a suggestion
      cy.get('[data-testid="suggestion-item"]').first().click()
      cy.get('[data-testid="rule-condition"]').should('not.have.class', 'error-highlight')
    })
  })

  describe('Rule Management Interface', () => {
    beforeEach(() => {
      // Set up some test rules
      const testData = generateRuleTestData()
      cy.window().then((win) => {
        (win as any).testRules = [...testData.simpleRules, ...testData.mediumRules]
      })
      
      // Load test rules into the interface
      cy.get('[data-testid="import-test-rules"]').click()
      cy.get('[data-testid="rules-loaded-notification"]').should('be.visible')
    })

    it('should display all rules in a organized list', () => {
      // Check rules are loaded and displayed
      cy.get('[data-testid="rules-list"]').should('be.visible')
      cy.get('[data-testid="rule-item"]').should('have.length.at.least', 4)
      
      // Test rule categories/filters
      cy.get('[data-testid="filter-by-type"]').select('constraint')
      cy.get('[data-testid="rule-item"][data-type="constraint"]').should('be.visible')
      cy.get('[data-testid="rule-item"][data-type="availability"]').should('not.be.visible')
      
      // Test search functionality
      cy.get('[data-testid="search-rules"]').type('Math')
      cy.get('[data-testid="rule-item"]').should('have.length', 1)
      cy.get('[data-testid="rule-item"]').should('contain.text', 'Mathematics')
      
      // Clear search
      cy.get('[data-testid="clear-search"]').click()
      cy.get('[data-testid="rule-item"]').should('have.length.at.least', 4)
    })

    it('should allow editing existing rules', () => {
      // Select a rule to edit
      cy.get('[data-testid="rule-item"]').first().within(() => {
        cy.get('[data-testid="edit-rule"]').click()
      })
      
      cy.get('[data-testid="rule-form"]').should('be.visible')
      cy.get('[data-testid="form-mode"]').should('contain.text', 'Edit')
      
      // Modify the rule
      cy.get('[data-testid="rule-name"]').clear().type('Updated Rule Name')
      cy.get('[data-testid="rule-description"]').clear().type('Updated description')
      
      // Validate modified rule
      cy.get('[data-testid="validate-rule"]').click()
      cy.get('[data-testid="validation-status"]').should('contain.text', 'Valid')
      
      // Save changes
      cy.get('[data-testid="save-rule"]').click()
      cy.get('[data-testid="rule-updated-notification"]').should('be.visible')
      
      // Verify changes in list
      cy.get('[data-testid="rules-list"]')
        .should('contain.text', 'Updated Rule Name')
        .should('contain.text', 'Updated description')
    })

    it('should support rule reordering and prioritization', () => {
      // Test drag and drop reordering
      cy.get('[data-testid="rule-item"]').first().as('firstRule')
      cy.get('[data-testid="rule-item"]').last().as('lastRule')
      
      // Get initial order
      cy.get('@firstRule').invoke('attr', 'data-rule-id').as('firstRuleId')
      cy.get('@lastRule').invoke('attr', 'data-rule-id').as('lastRuleId')
      
      // Perform drag and drop (simplified - in real test would use mouse events)
      cy.get('@firstRule').within(() => {
        cy.get('[data-testid="move-down"]').click().click() // Move down twice
      })
      
      // Verify order changed
      cy.get('[data-testid="rule-item"]').first().then(function() {
        expect(this.firstRuleId).not.to.equal(Cypress.$(this)[0].getAttribute('data-rule-id'))
      })
      
      // Test priority adjustment
      cy.get('[data-testid="rule-item"]').first().within(() => {
        cy.get('[data-testid="set-priority"]').click()
      })
      
      cy.get('[data-testid="priority-modal"]').should('be.visible')
      cy.get('[data-testid="priority-slider"]').invoke('val', 90).trigger('input')
      cy.get('[data-testid="apply-priority"]').click()
      
      // Verify priority indicator
      cy.get('[data-testid="rule-item"]').first()
        .should('have.attr', 'data-priority', '90')
        .within(() => {
          cy.get('[data-testid="priority-badge"]').should('contain.text', 'High')
        })
    })

    it('should handle rule deletion with confirmation', () => {
      // Count initial rules
      cy.get('[data-testid="rule-item"]').its('length').as('initialCount')
      
      // Attempt to delete a rule
      cy.get('[data-testid="rule-item"]').first().within(() => {
        cy.get('[data-testid="delete-rule"]').click()
      })
      
      // Should show confirmation dialog
      cy.get('[data-testid="delete-confirmation"]').should('be.visible')
      cy.get('[data-testid="confirm-delete"]').should('be.visible')
      cy.get('[data-testid="cancel-delete"]').should('be.visible')
      
      // Test cancel
      cy.get('[data-testid="cancel-delete"]').click()
      cy.get('[data-testid="delete-confirmation"]').should('not.exist')
      
      // Verify rule still exists
      cy.get('[data-testid="rule-item"]').then(function($items) {
        expect($items.length).to.equal(this.initialCount)
      })
      
      // Actually delete
      cy.get('[data-testid="rule-item"]').first().within(() => {
        cy.get('[data-testid="delete-rule"]').click()
      })
      
      cy.get('[data-testid="confirm-delete"]').click()
      cy.get('[data-testid="rule-deleted-notification"]').should('be.visible')
      
      // Verify rule count decreased
      cy.get('[data-testid="rule-item"]').then(function($items) {
        expect($items.length).to.equal(this.initialCount - 1)
      })
    })
  })

  describe('Rule Testing and Simulation', () => {
    beforeEach(() => {
      // Set up test rules and sample schedule data
      const testData = generateRuleTestData()
      cy.window().then((win) => {
        ;(win as any).testRules = testData.simpleRules
        ;(win as any).sampleSchedule = {
          lessons: [
            { id: '1', subject: 'Mathematics', teacher: 'teacher1', time: '09:00', day: 'Monday' },
            { id: '2', subject: 'Mathematics', teacher: 'teacher1', time: '14:00', day: 'Monday' },
            { id: '3', subject: 'Physics', teacher: 'teacher2', time: '12:30', day: 'Tuesday' }
          ]
        }
      })
    })

    it('should test rules against sample schedules', () => {
      // Load test data
      cy.get('[data-testid="import-test-rules"]').click()
      cy.get('[data-testid="load-sample-schedule"]').click()
      
      // Navigate to rule testing section
      cy.get('[data-testid="test-rules-tab"]').click()
      cy.get('[data-testid="rule-testing-panel"]').should('be.visible')
      
      // Select rules to test
      cy.get('[data-testid="select-all-rules"]').check()
      cy.get('[data-testid="selected-rules-count"]').should('contain.text', '2')
      
      // Run rule tests
      const startTime = Date.now()
      cy.get('[data-testid="run-rule-tests"]').click()
      cy.get('[data-testid="test-results"]', { timeout: 5000 })
        .should('be.visible')
        .then(() => {
          const duration = Date.now() - startTime
          cy.log(`Rule Testing Performance: ${duration}ms`)
          expect(duration).to.be.lessThan(5000)
        })
      
      // Analyze test results
      cy.get('[data-testid="test-summary"]').should('be.visible')
      cy.get('[data-testid="violations-found"]').should('contain.text', '1') // Double math rule violation
      cy.get('[data-testid="rules-passed"]').should('contain.text', '1')
      cy.get('[data-testid="rules-failed"]').should('contain.text', '1')
      
      // Check detailed violation reports
      cy.get('[data-testid="violation-details"]').should('be.visible')
      cy.get('[data-testid="violation-item"]').should('have.length', 1)
      
      cy.get('[data-testid="violation-item"]').first().within(() => {
        cy.get('[data-testid="violation-rule"]').should('contain.text', 'No Double Math')
        cy.get('[data-testid="violation-description"]').should('contain.text', 'Mathematics')
        cy.get('[data-testid="violation-severity"]').should('contain.text', 'Medium')
      })
    })

    it('should provide rule impact analysis', () => {
      // Load test rules
      cy.get('[data-testid="import-test-rules"]').click()
      
      // Navigate to impact analysis
      cy.get('[data-testid="impact-analysis-tab"]').click()
      cy.get('[data-testid="impact-analysis-panel"]').should('be.visible')
      
      // Select a rule for analysis
      cy.get('[data-testid="rule-selector"]').select('no-double-math')
      
      // Run impact analysis
      cy.get('[data-testid="analyze-impact"]').click()
      cy.get('[data-testid="impact-results"]').should('be.visible')
      
      // Check impact metrics
      cy.get('[data-testid="schedule-flexibility"]')
        .should('be.visible')
        .should('contain.text', '%')
      
      cy.get('[data-testid="constraint-conflicts"]')
        .should('be.visible')
        .should('contain.text', 'conflicts')
      
      cy.get('[data-testid="optimization-effect"]')
        .should('be.visible')
        .should('contain.text', 'effect')
      
      // Test rule combinations
      cy.get('[data-testid="test-combinations"]').check()
      cy.get('[data-testid="combination-partner"]').select('teacher-lunch-break')
      
      cy.get('[data-testid="analyze-combination"]').click()
      cy.get('[data-testid="combination-results"]').should('be.visible')
      
      cy.get('[data-testid="synergy-score"]')
        .should('be.visible')
        .should('contain.text', 'synergy')
    })

    it('should simulate rule performance under different scenarios', () => {
      // Set up performance simulation
      cy.get('[data-testid="performance-simulation-tab"]').click()
      cy.get('[data-testid="simulation-panel"]').should('be.visible')
      
      // Configure simulation parameters
      cy.get('[data-testid="scenario-size"]').select('medium') // 25 teachers, 50 groups
      cy.get('[data-testid="simulation-runs"]').type('10')
      cy.get('[data-testid="enable-stress-test"]').check()
      
      // Select rules to test
      cy.get('[data-testid="select-test-rules"]').click()
      cy.get('[data-testid="rule-selector-modal"]').should('be.visible')
      cy.get('[data-testid="rule-checkbox"]').each(($checkbox) => {
        cy.wrap($checkbox).check()
      })
      cy.get('[data-testid="apply-selection"]').click()
      
      // Run simulation
      const startTime = Date.now()
      cy.get('[data-testid="start-simulation"]').click()
      
      // Monitor progress
      cy.get('[data-testid="simulation-progress"]').should('be.visible')
      cy.get('[data-testid="progress-bar"]').should('be.visible')
      
      // Wait for completion
      cy.get('[data-testid="simulation-complete"]', { timeout: 30000 })
        .should('be.visible')
        .then(() => {
          const duration = Date.now() - startTime
          cy.log(`Simulation Performance: ${duration}ms`)
          expect(duration).to.be.lessThan(30000)
        })
      
      // Analyze simulation results
      cy.get('[data-testid="simulation-results"]').should('be.visible')
      
      // Performance metrics
      cy.get('[data-testid="avg-validation-time"]')
        .should('be.visible')
        .should('contain.text', 'ms')
      
      cy.get('[data-testid="success-rate"]')
        .should('be.visible')
        .should('contain.text', '%')
      
      cy.get('[data-testid="memory-usage"]')
        .should('be.visible')
        .should('contain.text', 'MB')
      
      // Bottleneck analysis
      cy.get('[data-testid="bottleneck-analysis"]').should('be.visible')
      cy.get('[data-testid="slow-rules"]').should('be.visible')
      
      // Export results
      cy.get('[data-testid="export-results"]').click()
      cy.get('[data-testid="export-format"]').select('json')
      cy.get('[data-testid="download-results"]').click()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors during rule operations', () => {
      // Simulate network failure
      cy.intercept('**/api/rules/**', { forceNetworkError: true }).as('networkError')
      
      // Attempt to create a rule
      cy.get('[data-testid="add-new-rule"]').click()
      cy.get('[data-testid="rule-name"]').type('Network Test Rule')
      cy.get('[data-testid="rule-type"]').select('constraint')
      cy.get('[data-testid="rule-condition"]').type('true')
      cy.get('[data-testid="rule-constraint"]').type('true')
      
      cy.get('[data-testid="save-rule"]').click()
      
      // Should show network error
      cy.get('[data-testid="network-error"]', { timeout: 5000 }).should('be.visible')
      cy.get('[data-testid="error-message"]').should('contain.text', 'network')
      
      // Test retry mechanism
      cy.get('[data-testid="retry-save"]').should('be.visible')
      
      // Restore network and retry
      cy.intercept('**/api/rules/**').as('networkRestored')
      cy.get('[data-testid="retry-save"]').click()
      
      cy.wait('@networkRestored')
      cy.get('[data-testid="rule-saved-notification"]').should('be.visible')
    })

    it('should handle concurrent rule editing conflicts', () => {
      // Simulate another user editing the same rule
      cy.window().then((win) => {
        // Mock WebSocket message for concurrent edit
        setTimeout(() => {
          const mockEvent = new MessageEvent('message', {
            data: JSON.stringify({
              type: 'rule_modified',
              ruleId: 'test-rule-1',
              userId: 'other-user',
              changes: { name: 'Concurrently Modified Rule' }
            })
          })
          ;(win as any).mockWebSocketMessage(mockEvent)
        }, 2000)
      })
      
      // Start editing a rule
      cy.get('[data-testid="import-test-rules"]').click()
      cy.get('[data-testid="rule-item"]').first().within(() => {
        cy.get('[data-testid="edit-rule"]').click()
      })
      
      cy.get('[data-testid="rule-name"]').clear().type('My Modified Rule')
      
      // Should detect concurrent modification
      cy.get('[data-testid="concurrent-edit-warning"]', { timeout: 5000 }).should('be.visible')
      cy.get('[data-testid="warning-message"]')
        .should('contain.text', 'Another user')
        .should('contain.text', 'modified')
      
      // Test conflict resolution options
      cy.get('[data-testid="view-changes"]').click()
      cy.get('[data-testid="changes-diff"]').should('be.visible')
      
      cy.get('[data-testid="merge-changes"]').should('be.visible')
      cy.get('[data-testid="overwrite-changes"]').should('be.visible')
      cy.get('[data-testid="discard-my-changes"]').should('be.visible')
      
      // Choose to merge
      cy.get('[data-testid="merge-changes"]').click()
      cy.get('[data-testid="merge-resolved-notification"]').should('be.visible')
    })

    it('should validate rule dependencies and circular references', () => {
      // Create rules with potential circular dependency
      const rules = [
        { id: 'rule-a', name: 'Rule A', depends: ['rule-b'] },
        { id: 'rule-b', name: 'Rule B', depends: ['rule-c'] },
        { id: 'rule-c', name: 'Rule C', depends: ['rule-a'] } // Circular dependency
      ]
      
      rules.forEach((rule) => {
        cy.get('[data-testid="add-new-rule"]').click()
        cy.get('[data-testid="rule-name"]').type(rule.name)
        cy.get('[data-testid="rule-type"]').select('constraint')
        cy.get('[data-testid="rule-condition"]').type('true')
        cy.get('[data-testid="rule-constraint"]').type('true')
        
        // Add dependencies
        rule.depends.forEach((dep) => {
          cy.get('[data-testid="add-dependency"]').click()
          cy.get('[data-testid="dependency-rule"]').last().type(dep)
        })
        
        cy.get('[data-testid="save-rule"]').click()
        
        if (rule.id === 'rule-c') {
          // Should detect circular dependency
          cy.get('[data-testid="circular-dependency-error"]').should('be.visible')
          cy.get('[data-testid="error-message"]')
            .should('contain.text', 'circular')
            .should('contain.text', 'dependency')
          
          // Should show dependency graph
          cy.get('[data-testid="show-dependency-graph"]').click()
          cy.get('[data-testid="dependency-graph"]').should('be.visible')
          cy.get('[data-testid="circular-path-highlight"]').should('be.visible')
        } else {
          cy.get('[data-testid="rule-saved-notification"]').should('be.visible')
        }
      })
    })
  })

  describe('Accessibility and User Experience', () => {
    it('should support keyboard navigation throughout the interface', () => {
      // Test main navigation
      cy.get('body').trigger('keydown', { key: 'Tab' })
      cy.focused().should('have.attr', 'data-testid', 'add-new-rule')
      
      cy.focused().trigger('keydown', { key: 'Enter' })
      cy.get('[data-testid="rule-form"]').should('be.visible')
      
      // Test form navigation
      cy.focused().should('have.attr', 'data-testid', 'rule-name')
      
      cy.focused().type('Keyboard Test Rule')
      cy.focused().trigger('keydown', { key: 'Tab' })
      cy.focused().should('have.attr', 'data-testid', 'rule-type')
      
      // Test escape to close
      cy.get('body').trigger('keydown', { key: 'Escape' })
      cy.get('[data-testid="rule-form"]').should('not.exist')
    })

    it('should provide comprehensive ARIA labels and screen reader support', () => {
      // Check main interface accessibility
      cy.get('[data-testid="rules-list"]')
        .should('have.attr', 'role', 'list')
        .should('have.attr', 'aria-label', 'Rules list')
      
      cy.get('[data-testid="rule-item"]').each(($item) => {
        cy.wrap($item)
          .should('have.attr', 'role', 'listitem')
          .should('have.attr', 'aria-describedby')
      })
      
      // Check form accessibility
      cy.get('[data-testid="add-new-rule"]').click()
      
      cy.get('[data-testid="rule-form"]')
        .should('have.attr', 'role', 'form')
        .should('have.attr', 'aria-label', 'Rule creation form')
      
      cy.get('[data-testid="rule-name"]')
        .should('have.attr', 'aria-label')
        .should('have.attr', 'aria-required', 'true')
      
      cy.get('[data-testid="rule-condition"]')
        .should('have.attr', 'aria-describedby')
        .should('have.attr', 'aria-invalid', 'false')
      
      // Test error state accessibility
      cy.get('[data-testid="save-rule"]').click() // Save empty form
      
      cy.get('[data-testid="validation-errors"]')
        .should('have.attr', 'role', 'alert')
        .should('have.attr', 'aria-live', 'polite')
      
      cy.get('[data-testid="rule-name"]')
        .should('have.attr', 'aria-invalid', 'true')
        .should('have.attr', 'aria-describedby')
    })

    it('should support high contrast and dark mode themes', () => {
      // Test dark mode toggle
      cy.get('[data-testid="theme-toggle"]').click()
      cy.get('body').should('have.class', 'dark-mode')
      
      // Verify contrast ratios (simplified check)
      cy.get('[data-testid="rule-item"]').first().should('be.visible')
      cy.get('[data-testid="add-new-rule"]')
        .should('have.css', 'background-color')
        .and('not.equal', 'rgba(0, 0, 0, 0)')
      
      // Test high contrast mode
      cy.get('[data-testid="accessibility-menu"]').click()
      cy.get('[data-testid="high-contrast"]').check()
      
      cy.get('body').should('have.class', 'high-contrast')
      
      // Verify focus indicators are visible
      cy.get('[data-testid="add-new-rule"]').focus()
      cy.get('[data-testid="add-new-rule"]')
        .should('have.css', 'outline-width')
        .and('not.equal', '0px')
    })
  })
})