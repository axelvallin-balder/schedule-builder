/**
 * Security Scanning Pipeline
 * Automated security testing and vulnerability detection
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface SecurityScanResult {
  tool: string
  vulnerabilities: SecurityVulnerability[]
  summary: {
    critical: number
    high: number
    medium: number
    low: number
    total: number
  }
  scanTime: Date
  passed: boolean
}

interface SecurityVulnerability {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  file?: string
  line?: number
  recommendation: string
  cwe?: string
  cvss?: number
}

class SecurityScanner {
  private results: SecurityScanResult[] = []
  private reportPath: string

  constructor() {
    this.reportPath = path.join(process.cwd(), 'security-reports')
    this.ensureReportDirectory()
  }

  private ensureReportDirectory() {
    if (!fs.existsSync(this.reportPath)) {
      fs.mkdirSync(this.reportPath, { recursive: true })
    }
  }

  /**
   * Run dependency vulnerability scan
   */
  async scanDependencies(): Promise<SecurityScanResult> {
    const startTime = Date.now()
    const vulnerabilities: SecurityVulnerability[] = []

    try {
      // Run npm audit for backend
      const backendAudit = this.runNpmAudit('backend')
      vulnerabilities.push(...this.parseNpmAudit(backendAudit))

      // Run npm audit for frontend
      const frontendAudit = this.runNpmAudit('frontend')
      vulnerabilities.push(...this.parseNpmAudit(frontendAudit))

    } catch (error) {
      console.warn('Dependency scan warning:', error)
    }

    const result: SecurityScanResult = {
      tool: 'npm-audit',
      vulnerabilities,
      summary: this.calculateSummary(vulnerabilities),
      scanTime: new Date(),
      passed: vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0
    }

    this.results.push(result)
    this.saveReport(result, 'dependency-scan')
    return result
  }

  /**
   * Run static code analysis for security issues
   */
  async scanStaticCode(): Promise<SecurityScanResult> {
    const vulnerabilities: SecurityVulnerability[] = []

    // Scan for common security patterns
    const codeIssues = await this.scanCodePatterns()
    vulnerabilities.push(...codeIssues)

    // Scan TypeScript configuration
    const tsConfigIssues = this.scanTsConfig()
    vulnerabilities.push(...tsConfigIssues)

    // Scan environment variables
    const envIssues = this.scanEnvironmentSecurity()
    vulnerabilities.push(...envIssues)

    const result: SecurityScanResult = {
      tool: 'static-analysis',
      vulnerabilities,
      summary: this.calculateSummary(vulnerabilities),
      scanTime: new Date(),
      passed: vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0
    }

    this.results.push(result)
    this.saveReport(result, 'static-code-scan')
    return result
  }

  /**
   * Scan for secrets and sensitive data
   */
  async scanSecrets(): Promise<SecurityScanResult> {
    const vulnerabilities: SecurityVulnerability[] = []

    // Patterns to look for
    const secretPatterns = [
      {
        name: 'API Keys',
        pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['""][a-zA-Z0-9]{20,}['"]/gi,
        severity: 'high' as const
      },
      {
        name: 'Database URLs',
        pattern: /(postgres|mysql|mongodb):\/\/[^\s\'"]+/gi,
        severity: 'medium' as const
      },
      {
        name: 'JWT Secrets',
        pattern: /(?:jwt[_-]?secret|jwtsecret)\s*[:=]\s*['""][^'"]{16,}['"]/gi,
        severity: 'high' as const
      },
      {
        name: 'Private Keys',
        pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
        severity: 'critical' as const
      },
      {
        name: 'Hardcoded Passwords',
        pattern: /(?:password|passwd|pwd)\s*[:=]\s*['""][^'"]{8,}['"]/gi,
        severity: 'high' as const
      }
    ]

    const filesToScan = this.getSourceFiles()

    for (const filePath of filesToScan) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      for (const pattern of secretPatterns) {
        const matches = content.matchAll(pattern.pattern)
        
        for (const match of matches) {
          const lineNumber = this.findLineNumber(content, match.index || 0)
          
          vulnerabilities.push({
            id: `secret-${pattern.name.toLowerCase().replace(/\s+/g, '-')}-${filePath}:${lineNumber}`,
            severity: pattern.severity,
            title: `Potential ${pattern.name} Exposed`,
            description: `Found potential ${pattern.name.toLowerCase()} in source code`,
            file: filePath,
            line: lineNumber,
            recommendation: `Remove hardcoded secrets and use environment variables or secure secret management`,
            cwe: 'CWE-798'
          })
        }
      }
    }

    const result: SecurityScanResult = {
      tool: 'secret-scanner',
      vulnerabilities,
      summary: this.calculateSummary(vulnerabilities),
      scanTime: new Date(),
      passed: vulnerabilities.length === 0
    }

    this.results.push(result)
    this.saveReport(result, 'secret-scan')
    return result
  }

  /**
   * Scan Docker configuration if present
   */
  async scanDockerSecurity(): Promise<SecurityScanResult> {
    const vulnerabilities: SecurityVulnerability[] = []

    const dockerfilePaths = [
      'Dockerfile',
      'backend/Dockerfile',
      'frontend/Dockerfile'
    ]

    for (const dockerfilePath of dockerfilePaths) {
      if (fs.existsSync(dockerfilePath)) {
        const content = fs.readFileSync(dockerfilePath, 'utf-8')
        const lines = content.split('\n')

        lines.forEach((line, index) => {
          // Check for running as root
          if (line.trim().startsWith('USER root') || line.includes('USER 0')) {
            vulnerabilities.push({
              id: `docker-root-${dockerfilePath}:${index + 1}`,
              severity: 'medium',
              title: 'Container Running as Root',
              description: 'Container is configured to run as root user',
              file: dockerfilePath,
              line: index + 1,
              recommendation: 'Create and use a non-root user for container execution',
              cwe: 'CWE-250'
            })
          }

          // Check for unspecified image tags
          if (line.trim().startsWith('FROM') && !line.includes(':') && !line.includes('@sha256:')) {
            vulnerabilities.push({
              id: `docker-latest-tag-${dockerfilePath}:${index + 1}`,
              severity: 'low',
              title: 'Unspecified Image Tag',
              description: 'Using latest tag or no tag specified for base image',
              file: dockerfilePath,
              line: index + 1,
              recommendation: 'Specify exact version tags for reproducible builds',
              cwe: 'CWE-494'
            })
          }

          // Check for exposed sensitive ports
          if (line.trim().startsWith('EXPOSE')) {
            const port = line.split(' ')[1]
            const sensitiveOorts = ['22', '3306', '5432', '6379', '27017']
            if (sensitiveOorts.includes(port)) {
              vulnerabilities.push({
                id: `docker-sensitive-port-${dockerfilePath}:${index + 1}`,
                severity: 'medium',
                title: 'Sensitive Port Exposed',
                description: `Exposing potentially sensitive port ${port}`,
                file: dockerfilePath,
                line: index + 1,
                recommendation: 'Only expose necessary application ports',
                cwe: 'CWE-200'
              })
            }
          }
        })
      }
    }

    const result: SecurityScanResult = {
      tool: 'docker-security',
      vulnerabilities,
      summary: this.calculateSummary(vulnerabilities),
      scanTime: new Date(),
      passed: vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0
    }

    this.results.push(result)
    this.saveReport(result, 'docker-scan')
    return result
  }

  /**
   * Generate comprehensive security report
   */
  generateSecurityReport(): {
    passed: boolean
    summary: {
      totalVulnerabilities: number
      critical: number
      high: number
      medium: number
      low: number
    }
    recommendations: string[]
    results: SecurityScanResult[]
  } {
    const allVulnerabilities = this.results.flatMap(r => r.vulnerabilities)
    const summary = this.calculateSummary(allVulnerabilities)

    const recommendations = [
      'Regularly update dependencies to patch known vulnerabilities',
      'Implement proper secrets management (environment variables, key vaults)',
      'Use security headers and HTTPS in production',
      'Implement input validation and sanitization',
      'Set up automated security scanning in CI/CD pipeline',
      'Conduct regular security code reviews',
      'Implement proper authentication and authorization',
      'Monitor and log security events',
      'Use least privilege principle for user permissions',
      'Regularly backup data and test recovery procedures'
    ]

    const passed = summary.critical === 0 && summary.high === 0

    const report = {
      passed,
      summary: {
        totalVulnerabilities: summary.total,
        critical: summary.critical,
        high: summary.high,
        medium: summary.medium,
        low: summary.low
      },
      recommendations,
      results: this.results
    }

    this.saveReport(report, 'security-summary')
    return report
  }

  // Helper methods
  private runNpmAudit(directory: string): any {
    try {
      const result = execSync(`cd ${directory} && npm audit --json`, { encoding: 'utf-8' })
      return JSON.parse(result)
    } catch (error: any) {
      // npm audit returns non-zero exit code when vulnerabilities found
      if (error.stdout) {
        try {
          return JSON.parse(error.stdout)
        } catch {
          return { vulnerabilities: {} }
        }
      }
      return { vulnerabilities: {} }
    }
  }

  private parseNpmAudit(auditResult: any): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = []

    if (auditResult.vulnerabilities) {
      for (const [pkg, vuln] of Object.entries(auditResult.vulnerabilities as any)) {
        vulnerabilities.push({
          id: `npm-${pkg}-${vuln.via?.[0]?.url || 'unknown'}`,
          severity: this.mapNpmSeverity(vuln.severity),
          title: `${pkg} - ${vuln.via?.[0]?.title || 'Vulnerability'}`,
          description: vuln.via?.[0]?.source || 'Dependency vulnerability',
          recommendation: `Update ${pkg} to ${vuln.via?.[0]?.range || 'latest version'}`,
          cwe: vuln.via?.[0]?.cwe?.[0] || undefined,
          cvss: vuln.via?.[0]?.cvss?.score || undefined
        })
      }
    }

    return vulnerabilities
  }

  private async scanCodePatterns(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = []
    const files = this.getSourceFiles()

    const patterns = [
      {
        name: 'SQL Injection Risk',
        pattern: /(?:query|execute)\s*\(\s*['""`][^'""`]*\$\{[^}]+\}[^'""`]*['""`]/gi,
        severity: 'high' as const,
        cwe: 'CWE-89'
      },
      {
        name: 'XSS Risk',
        pattern: /innerHTML\s*=\s*.*\+/gi,
        severity: 'medium' as const,
        cwe: 'CWE-79'
      },
      {
        name: 'Eval Usage',
        pattern: /\beval\s*\(/gi,
        severity: 'high' as const,
        cwe: 'CWE-95'
      },
      {
        name: 'Insecure Random',
        pattern: /Math\.random\(\)/gi,
        severity: 'low' as const,
        cwe: 'CWE-330'
      }
    ]

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8')
      
      for (const pattern of patterns) {
        const matches = content.matchAll(pattern.pattern)
        
        for (const match of matches) {
          const lineNumber = this.findLineNumber(content, match.index || 0)
          
          vulnerabilities.push({
            id: `code-${pattern.name.toLowerCase().replace(/\s+/g, '-')}-${filePath}:${lineNumber}`,
            severity: pattern.severity,
            title: pattern.name,
            description: `Potential ${pattern.name.toLowerCase()} detected`,
            file: filePath,
            line: lineNumber,
            recommendation: this.getRecommendation(pattern.name),
            cwe: pattern.cwe
          })
        }
      }
    }

    return vulnerabilities
  }

  private scanTsConfig(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = []
    const tsConfigPaths = ['tsconfig.json', 'backend/tsconfig.json', 'frontend/tsconfig.json']

    for (const configPath of tsConfigPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
          
          // Check for strict mode
          if (!config.compilerOptions?.strict) {
            vulnerabilities.push({
              id: `ts-strict-${configPath}`,
              severity: 'low',
              title: 'TypeScript Strict Mode Disabled',
              description: 'TypeScript strict mode is not enabled',
              file: configPath,
              recommendation: 'Enable strict mode for better type safety',
              cwe: 'CWE-697'
            })
          }

          // Check for any type usage
          if (config.compilerOptions?.noImplicitAny === false) {
            vulnerabilities.push({
              id: `ts-implicit-any-${configPath}`,
              severity: 'low',
              title: 'Implicit Any Types Allowed',
              description: 'Implicit any types are allowed',
              file: configPath,
              recommendation: 'Enable noImplicitAny for better type safety',
              cwe: 'CWE-697'
            })
          }
        } catch (error) {
          // Invalid JSON
        }
      }
    }

    return vulnerabilities
  }

  private scanEnvironmentSecurity(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = []
    const envFiles = ['.env', '.env.local', '.env.example', 'backend/.env', 'frontend/.env']

    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, 'utf-8')
        const lines = content.split('\n')

        lines.forEach((line, index) => {
          // Check for potentially exposed secrets in .env files
          if (envFile !== '.env.example' && line.includes('=')) {
            const [key, value] = line.split('=')
            
            if (value && value.length > 10 && !value.startsWith('$')) {
              vulnerabilities.push({
                id: `env-secret-${envFile}:${index + 1}`,
                severity: 'medium',
                title: 'Potential Secret in Environment File',
                description: `Environment variable ${key} may contain hardcoded secret`,
                file: envFile,
                line: index + 1,
                recommendation: 'Use placeholder values in committed .env files',
                cwe: 'CWE-798'
              })
            }
          }
        })
      }
    }

    return vulnerabilities
  }

  private getSourceFiles(): string[] {
    const extensions = ['.ts', '.js', '.vue', '.json']
    const directories = ['backend/src', 'frontend', 'shared']
    const files: string[] = []

    const scanDirectory = (dir: string) => {
      if (!fs.existsSync(dir)) return

      const items = fs.readdirSync(dir)
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath)
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath)
        }
      }
    }

    for (const dir of directories) {
      scanDirectory(dir)
    }

    return files
  }

  private findLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length
  }

  private calculateSummary(vulnerabilities: SecurityVulnerability[]) {
    return vulnerabilities.reduce(
      (acc, vuln) => {
        acc[vuln.severity]++
        acc.total++
        return acc
      },
      { critical: 0, high: 0, medium: 0, low: 0, total: 0 }
    )
  }

  private mapNpmSeverity(npmSeverity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (npmSeverity) {
      case 'critical': return 'critical'
      case 'high': return 'high'
      case 'moderate': return 'medium'
      case 'low': return 'low'
      default: return 'low'
    }
  }

  private getRecommendation(patternName: string): string {
    const recommendations: Record<string, string> = {
      'SQL Injection Risk': 'Use parameterized queries or ORM methods to prevent SQL injection',
      'XSS Risk': 'Use safe DOM manipulation methods and sanitize user input',
      'Eval Usage': 'Avoid eval() function, use safer alternatives like JSON.parse() or Function constructor',
      'Insecure Random': 'Use crypto.randomBytes() or crypto.getRandomValues() for security-critical randomness'
    }
    
    return recommendations[patternName] || 'Review code for security implications'
  }

  private saveReport(data: any, filename: string) {
    const reportFile = path.join(this.reportPath, `${filename}-${Date.now()}.json`)
    fs.writeFileSync(reportFile, JSON.stringify(data, null, 2))
  }
}

describe('Security Scanning Pipeline', () => {
  let scanner: SecurityScanner

  beforeAll(() => {
    scanner = new SecurityScanner()
  })

  test('T060 - Dependency vulnerability scan', async () => {
    const result = await scanner.scanDependencies()
    
    expect(result).toBeDefined()
    expect(result.tool).toBe('npm-audit')
    expect(Array.isArray(result.vulnerabilities)).toBe(true)
    
    // Log findings for review
    if (result.vulnerabilities.length > 0) {
      console.log(`Found ${result.vulnerabilities.length} dependency vulnerabilities`)
      result.vulnerabilities.forEach(vuln => {
        console.log(`- ${vuln.severity}: ${vuln.title}`)
      })
    }

    // Fail if critical or high severity vulnerabilities found
    const criticalOrHigh = result.vulnerabilities.filter(
      v => v.severity === 'critical' || v.severity === 'high'
    )
    
    if (criticalOrHigh.length > 0) {
      console.warn(`Found ${criticalOrHigh.length} critical/high severity vulnerabilities`)
    }
    
    expect(result.passed).toBe(true)
  }, 30000)

  test('T060 - Static code security analysis', async () => {
    const result = await scanner.scanStaticCode()
    
    expect(result).toBeDefined()
    expect(result.tool).toBe('static-analysis')
    expect(Array.isArray(result.vulnerabilities)).toBe(true)
    
    // Log findings
    if (result.vulnerabilities.length > 0) {
      console.log(`Found ${result.vulnerabilities.length} static code issues`)
      result.vulnerabilities.forEach(vuln => {
        console.log(`- ${vuln.severity}: ${vuln.title} (${vuln.file}:${vuln.line})`)
      })
    }

    // Document findings but don't fail build for static analysis
    expect(result).toBeDefined()
  })

  test('T060 - Secrets and sensitive data scan', async () => {
    const result = await scanner.scanSecrets()
    
    expect(result).toBeDefined()
    expect(result.tool).toBe('secret-scanner')
    expect(Array.isArray(result.vulnerabilities)).toBe(true)
    
    // Log any secrets found
    if (result.vulnerabilities.length > 0) {
      console.warn(`Found ${result.vulnerabilities.length} potential secrets in code`)
      result.vulnerabilities.forEach(vuln => {
        console.warn(`- ${vuln.severity}: ${vuln.title} (${vuln.file}:${vuln.line})`)
      })
    }

    // Secrets in code should fail the build
    expect(result.passed).toBe(true)
  })

  test('T060 - Docker security configuration scan', async () => {
    const result = await scanner.scanDockerSecurity()
    
    expect(result).toBeDefined()
    expect(result.tool).toBe('docker-security')
    expect(Array.isArray(result.vulnerabilities)).toBe(true)
    
    // Log Docker security issues
    if (result.vulnerabilities.length > 0) {
      console.log(`Found ${result.vulnerabilities.length} Docker security issues`)
      result.vulnerabilities.forEach(vuln => {
        console.log(`- ${vuln.severity}: ${vuln.title} (${vuln.file}:${vuln.line})`)
      })
    }

    // Document but don't fail for Docker issues
    expect(result).toBeDefined()
  })

  test('T060 - Generate comprehensive security report', async () => {
    const report = scanner.generateSecurityReport()
    
    expect(report).toBeDefined()
    expect(typeof report.passed).toBe('boolean')
    expect(typeof report.summary.totalVulnerabilities).toBe('number')
    expect(Array.isArray(report.recommendations)).toBe(true)
    expect(Array.isArray(report.results)).toBe(true)
    
    console.log('Security Scan Summary:')
    console.log(`- Total vulnerabilities: ${report.summary.totalVulnerabilities}`)
    console.log(`- Critical: ${report.summary.critical}`)
    console.log(`- High: ${report.summary.high}`)
    console.log(`- Medium: ${report.summary.medium}`)
    console.log(`- Low: ${report.summary.low}`)
    console.log(`- Overall passed: ${report.passed}`)
    
    // Security scan should pass (no critical/high vulnerabilities)
    expect(report.passed).toBe(true)
  })

  afterAll(() => {
    console.log('Security scanning pipeline completed')
  })
})

export { SecurityScanner, type SecurityScanResult, type SecurityVulnerability }