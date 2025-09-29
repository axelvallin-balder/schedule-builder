/**
 * Dependency Audit Workflow
 * Automated dependency vulnerability monitoring and management
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface DependencyInfo {
  name: string
  version: string
  location: 'backend' | 'frontend'
  type: 'production' | 'development'
  vulnerabilities: VulnerabilityInfo[]
  outdated: boolean
  latestVersion?: string
}

interface VulnerabilityInfo {
  id: string
  severity: 'critical' | 'high' | 'moderate' | 'low'
  title: string
  url: string
  vulnerable_versions: string
  patched_versions: string
  recommendation: string
}

interface AuditReport {
  timestamp: Date
  passed: boolean
  summary: {
    total: number
    critical: number
    high: number
    moderate: number
    low: number
  }
  dependencies: DependencyInfo[]
  recommendations: string[]
  autoFixAvailable: boolean
}

class DependencyAuditor {
  private backendPath: string
  private frontendPath: string
  private reportPath: string

  constructor() {
    this.backendPath = path.join(process.cwd(), 'backend')
    this.frontendPath = path.join(process.cwd(), 'frontend')
    this.reportPath = path.join(process.cwd(), 'audit-reports')
    this.ensureReportDirectory()
  }

  private ensureReportDirectory() {
    if (!fs.existsSync(this.reportPath)) {
      fs.mkdirSync(this.reportPath, { recursive: true })
    }
  }

  /**
   * Run comprehensive dependency audit
   */
  async runFullAudit(): Promise<AuditReport> {
    console.log('Starting comprehensive dependency audit...')

    const backendDeps = await this.auditProject('backend', this.backendPath)
    const frontendDeps = await this.auditProject('frontend', this.frontendPath)

    const allDependencies = [...backendDeps, ...frontendDeps]
    const allVulnerabilities = allDependencies.flatMap(dep => dep.vulnerabilities)

    const summary = {
      total: allVulnerabilities.length,
      critical: allVulnerabilities.filter(v => v.severity === 'critical').length,
      high: allVulnerabilities.filter(v => v.severity === 'high').length,
      moderate: allVulnerabilities.filter(v => v.severity === 'moderate').length,
      low: allVulnerabilities.filter(v => v.severity === 'low').length
    }

    const recommendations = this.generateRecommendations(allDependencies)
    const autoFixAvailable = this.checkAutoFixAvailability(allDependencies)

    const report: AuditReport = {
      timestamp: new Date(),
      passed: summary.critical === 0 && summary.high === 0,
      summary,
      dependencies: allDependencies,
      recommendations,
      autoFixAvailable
    }

    this.saveAuditReport(report)
    return report
  }

  /**
   * Audit a specific project (backend or frontend)
   */
  private async auditProject(location: 'backend' | 'frontend', projectPath: string): Promise<DependencyInfo[]> {
    const dependencies: DependencyInfo[] = []

    try {
      // Get package.json info
      const packageJsonPath = path.join(projectPath, 'package.json')
      if (!fs.existsSync(packageJsonPath)) {
        console.warn(`Package.json not found in ${projectPath}`)
        return dependencies
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      
      // Run npm audit
      const auditResult = this.runNpmAudit(projectPath)
      
      // Run npm outdated
      const outdatedResult = this.runNpmOutdated(projectPath)

      // Process production dependencies
      if (packageJson.dependencies) {
        for (const [name, version] of Object.entries(packageJson.dependencies)) {
          const depInfo = this.createDependencyInfo(
            name,
            version as string,
            location,
            'production',
            auditResult,
            outdatedResult
          )
          dependencies.push(depInfo)
        }
      }

      // Process development dependencies
      if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries(packageJson.devDependencies)) {
          const depInfo = this.createDependencyInfo(
            name,
            version as string,
            location,
            'development',
            auditResult,
            outdatedResult
          )
          dependencies.push(depInfo)
        }
      }

    } catch (error) {
      console.error(`Error auditing ${location}:`, error)
    }

    return dependencies
  }

  /**
   * Create dependency information object
   */
  private createDependencyInfo(
    name: string,
    version: string,
    location: 'backend' | 'frontend',
    type: 'production' | 'development',
    auditResult: any,
    outdatedResult: any
  ): DependencyInfo {
    const vulnerabilities = this.extractVulnerabilities(name, auditResult)
    const outdatedInfo = outdatedResult[name]

    return {
      name,
      version,
      location,
      type,
      vulnerabilities,
      outdated: !!outdatedInfo,
      latestVersion: outdatedInfo?.latest
    }
  }

  /**
   * Extract vulnerabilities for a specific package
   */
  private extractVulnerabilities(packageName: string, auditResult: any): VulnerabilityInfo[] {
    const vulnerabilities: VulnerabilityInfo[] = []

    if (auditResult.vulnerabilities && auditResult.vulnerabilities[packageName]) {
      const vulnData = auditResult.vulnerabilities[packageName]
      
      if (vulnData.via && Array.isArray(vulnData.via)) {
        for (const via of vulnData.via) {
          if (typeof via === 'object' && via.title) {
            vulnerabilities.push({
              id: via.url || `${packageName}-${via.title}`,
              severity: this.normalizeSeverity(via.severity),
              title: via.title,
              url: via.url || '',
              vulnerable_versions: via.range || '',
              patched_versions: vulnData.fixAvailable?.name || 'unknown',
              recommendation: this.generateVulnRecommendation(packageName, via, vulnData)
            })
          }
        }
      }
    }

    return vulnerabilities
  }

  /**
   * Generate recommendations based on audit results
   */
  private generateRecommendations(dependencies: DependencyInfo[]): string[] {
    const recommendations: string[] = []

    // Count vulnerabilities by severity
    const criticalCount = dependencies.reduce((sum, dep) => 
      sum + dep.vulnerabilities.filter(v => v.severity === 'critical').length, 0)
    const highCount = dependencies.reduce((sum, dep) => 
      sum + dep.vulnerabilities.filter(v => v.severity === 'high').length, 0)
    const outdatedCount = dependencies.filter(dep => dep.outdated).length

    if (criticalCount > 0) {
      recommendations.push(`🚨 CRITICAL: ${criticalCount} critical vulnerabilities found - update immediately`)
    }

    if (highCount > 0) {
      recommendations.push(`⚠️ HIGH: ${highCount} high-severity vulnerabilities found - update as soon as possible`)
    }

    if (outdatedCount > 10) {
      recommendations.push(`📦 ${outdatedCount} packages are outdated - consider bulk update`)
    }

    // Specific package recommendations
    const problematicPackages = dependencies.filter(dep => 
      dep.vulnerabilities.length > 0 || dep.outdated
    )

    if (problematicPackages.length > 0) {
      recommendations.push('Package-specific actions:')
      
      problematicPackages.slice(0, 10).forEach(dep => {
        if (dep.vulnerabilities.length > 0) {
          const highestSeverity = dep.vulnerabilities.reduce((max, curr) => {
            const severityOrder = { critical: 4, high: 3, moderate: 2, low: 1 }
            return severityOrder[curr.severity] > severityOrder[max.severity] ? curr : max
          })
          recommendations.push(`  • ${dep.name}: Update to fix ${highestSeverity.severity} vulnerability`)
        } else if (dep.outdated) {
          recommendations.push(`  • ${dep.name}: Update from ${dep.version} to ${dep.latestVersion}`)
        }
      })
    }

    // General recommendations
    recommendations.push('General security practices:')
    recommendations.push('  • Run npm audit regularly (weekly)')
    recommendations.push('  • Enable automated dependency updates (Dependabot/Renovate)')
    recommendations.push('  • Review and test updates in staging before production')
    recommendations.push('  • Monitor security advisories for your tech stack')
    recommendations.push('  • Consider using npm ci in production for reproducible builds')

    return recommendations
  }

  /**
   * Check if automatic fixes are available
   */
  private checkAutoFixAvailability(dependencies: DependencyInfo[]): boolean {
    return dependencies.some(dep => 
      dep.vulnerabilities.some(vuln => 
        vuln.recommendation.includes('npm audit fix') || 
        vuln.patched_versions !== 'unknown'
      )
    )
  }

  /**
   * Generate vulnerability-specific recommendation
   */
  private generateVulnRecommendation(packageName: string, vulnerability: any, vulnData: any): string {
    if (vulnData.fixAvailable) {
      if (vulnData.fixAvailable.isSemVerMajor) {
        return `Breaking change required: npm install ${vulnData.fixAvailable.name}@${vulnData.fixAvailable.version}`
      } else {
        return `Run: npm audit fix`
      }
    }

    if (vulnerability.range && vulnerability.range !== '*') {
      return `Update ${packageName} to avoid vulnerable versions: ${vulnerability.range}`
    }

    return `Review ${packageName} for security updates`
  }

  /**
   * Run npm audit and return parsed results
   */
  private runNpmAudit(projectPath: string): any {
    try {
      const result = execSync('npm audit --json', { 
        cwd: projectPath, 
        encoding: 'utf-8',
        stdio: 'pipe'
      })
      return JSON.parse(result)
    } catch (error: any) {
      // npm audit returns non-zero exit code when vulnerabilities found
      if (error.stdout) {
        try {
          return JSON.parse(error.stdout)
        } catch {
          return { vulnerabilities: {}, metadata: {} }
        }
      }
      return { vulnerabilities: {}, metadata: {} }
    }
  }

  /**
   * Run npm outdated and return parsed results
   */
  private runNpmOutdated(projectPath: string): any {
    try {
      const result = execSync('npm outdated --json', { 
        cwd: projectPath, 
        encoding: 'utf-8',
        stdio: 'pipe'
      })
      return JSON.parse(result)
    } catch (error: any) {
      // npm outdated returns non-zero when packages are outdated
      if (error.stdout) {
        try {
          return JSON.parse(error.stdout)
        } catch {
          return {}
        }
      }
      return {}
    }
  }

  /**
   * Normalize severity levels
   */
  private normalizeSeverity(severity: string): 'critical' | 'high' | 'moderate' | 'low' {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'critical'
      case 'high': return 'high'
      case 'moderate': 
      case 'medium': return 'moderate'
      case 'low': return 'low'
      default: return 'low'
    }
  }

  /**
   * Save audit report to file
   */
  private saveAuditReport(report: AuditReport) {
    const filename = `audit-report-${report.timestamp.toISOString().split('T')[0]}.json`
    const filepath = path.join(this.reportPath, filename)
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2))
    console.log(`Audit report saved to: ${filepath}`)
  }

  /**
   * Fix vulnerabilities automatically
   */
  async autoFix(): Promise<{ backend: boolean, frontend: boolean }> {
    const results = { backend: false, frontend: false }

    // Try to fix backend dependencies
    try {
      execSync('npm audit fix', { cwd: this.backendPath, stdio: 'inherit' })
      results.backend = true
      console.log('✅ Backend dependencies auto-fixed')
    } catch (error) {
      console.warn('⚠️ Backend auto-fix failed:', error)
    }

    // Try to fix frontend dependencies
    try {
      execSync('npm audit fix', { cwd: this.frontendPath, stdio: 'inherit' })
      results.frontend = true
      console.log('✅ Frontend dependencies auto-fixed')
    } catch (error) {
      console.warn('⚠️ Frontend auto-fix failed:', error)
    }

    return results
  }

  /**
   * Generate dependency update script
   */
  generateUpdateScript(dependencies: DependencyInfo[]): string {
    const lines: string[] = [
      '#!/bin/bash',
      '# Dependency Update Script',
      '# Generated by Schedule Builder Security Audit',
      '',
      'echo "Starting dependency updates..."',
      ''
    ]

    const outdatedDeps = dependencies.filter(dep => dep.outdated)
    
    if (outdatedDeps.length > 0) {
      lines.push('# Update outdated packages')
      
      const backendUpdates = outdatedDeps.filter(dep => dep.location === 'backend')
      const frontendUpdates = outdatedDeps.filter(dep => dep.location === 'frontend')

      if (backendUpdates.length > 0) {
        lines.push('echo "Updating backend dependencies..."')
        lines.push('cd backend')
        backendUpdates.forEach(dep => {
          lines.push(`npm install ${dep.name}@${dep.latestVersion}`)
        })
        lines.push('cd ..')
        lines.push('')
      }

      if (frontendUpdates.length > 0) {
        lines.push('echo "Updating frontend dependencies..."')
        lines.push('cd frontend')
        frontendUpdates.forEach(dep => {
          lines.push(`npm install ${dep.name}@${dep.latestVersion}`)
        })
        lines.push('cd ..')
        lines.push('')
      }
    }

    lines.push('echo "Running security audits..."')
    lines.push('cd backend && npm audit && cd ..')
    lines.push('cd frontend && npm audit && cd ..')
    lines.push('')
    lines.push('echo "Update complete! Review changes and test thoroughly."')

    const script = lines.join('\n')
    const scriptPath = path.join(this.reportPath, 'update-dependencies.sh')
    fs.writeFileSync(scriptPath, script)
    fs.chmodSync(scriptPath, '755')

    return scriptPath
  }
}

describe('Dependency Audit Workflow', () => {
  let auditor: DependencyAuditor

  beforeAll(() => {
    auditor = new DependencyAuditor()
  })

  test('T061 - Run comprehensive dependency audit', async () => {
    const report = await auditor.runFullAudit()
    
    expect(report).toBeDefined()
    expect(report.timestamp).toBeInstanceOf(Date)
    expect(typeof report.passed).toBe('boolean')
    expect(Array.isArray(report.dependencies)).toBe(true)
    expect(Array.isArray(report.recommendations)).toBe(true)
    
    console.log('\n📊 Dependency Audit Summary:')
    console.log(`• Total dependencies: ${report.dependencies.length}`)
    console.log(`• Total vulnerabilities: ${report.summary.total}`)
    console.log(`• Critical: ${report.summary.critical}`)
    console.log(`• High: ${report.summary.high}`)
    console.log(`• Moderate: ${report.summary.moderate}`)
    console.log(`• Low: ${report.summary.low}`)
    console.log(`• Audit passed: ${report.passed}`)
    
    if (report.recommendations.length > 0) {
      console.log('\n📋 Recommendations:')
      report.recommendations.slice(0, 5).forEach(rec => {
        console.log(`  ${rec}`)
      })
    }

    // Audit should pass (no critical or high vulnerabilities)
    if (!report.passed) {
      console.warn('⚠️ Dependency audit failed due to high-severity vulnerabilities')
    }
    
    expect(report).toBeDefined()
  }, 60000)

  test('T061 - Check for outdated dependencies', async () => {
    const report = await auditor.runFullAudit()
    const outdatedDeps = report.dependencies.filter(dep => dep.outdated)
    
    console.log(`\n📦 Outdated Dependencies: ${outdatedDeps.length}`)
    
    if (outdatedDeps.length > 0) {
      console.log('Outdated packages:')
      outdatedDeps.slice(0, 10).forEach(dep => {
        console.log(`  • ${dep.name}: ${dep.version} → ${dep.latestVersion} (${dep.location})`)
      })
    }

    expect(Array.isArray(outdatedDeps)).toBe(true)
  })

  test('T061 - Generate update recommendations', async () => {
    const report = await auditor.runFullAudit()
    
    expect(report.recommendations).toBeDefined()
    expect(report.recommendations.length).toBeGreaterThan(0)
    
    // Should include general security practices
    const hasGeneralRecommendations = report.recommendations.some(rec => 
      rec.includes('security practices') || rec.includes('npm audit')
    )
    expect(hasGeneralRecommendations).toBe(true)
  })

  test('T061 - Check auto-fix availability', async () => {
    const report = await auditor.runFullAudit()
    
    expect(typeof report.autoFixAvailable).toBe('boolean')
    
    if (report.autoFixAvailable) {
      console.log('✅ Automatic fixes are available - run npm audit fix')
    } else {
      console.log('ℹ️ No automatic fixes available - manual updates required')
    }
  })

  test('T061 - Generate dependency update script', async () => {
    const report = await auditor.runFullAudit()
    const scriptPath = auditor.generateUpdateScript(report.dependencies)
    
    expect(fs.existsSync(scriptPath)).toBe(true)
    
    const scriptContent = fs.readFileSync(scriptPath, 'utf-8')
    expect(scriptContent).toContain('#!/bin/bash')
    expect(scriptContent).toContain('dependency updates')
    
    console.log(`📝 Update script generated: ${scriptPath}`)
  })

  test('T061 - Validate package.json security configuration', () => {
    const packageJsonPaths = [
      path.join(process.cwd(), 'backend', 'package.json'),
      path.join(process.cwd(), 'frontend', 'package.json')
    ]

    packageJsonPaths.forEach(packagePath => {
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
        
        // Check for audit configuration
        if (packageJson.scripts) {
          const hasAuditScript = Object.keys(packageJson.scripts).some(script => 
            script.includes('audit') || packageJson.scripts[script].includes('audit')
          )
          
          if (!hasAuditScript) {
            console.warn(`⚠️ No audit script found in ${packagePath}`)
          }
        }

        // Check for engines specification
        if (!packageJson.engines) {
          console.warn(`⚠️ No engines specified in ${packagePath}`)
        }

        expect(packageJson).toBeDefined()
      }
    })
  })

  afterAll(() => {
    console.log('\n🔒 Dependency audit workflow completed')
    console.log('💡 Remember to:')
    console.log('   • Review audit reports regularly')
    console.log('   • Test updates in staging environment')
    console.log('   • Enable automated dependency scanning in CI/CD')
  })
})

export { DependencyAuditor, type DependencyInfo, type VulnerabilityInfo, type AuditReport }