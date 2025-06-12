#!/usr/bin/env node

const { execSync } = require('child_process');
const chalk = require('chalk');

class TestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      functional: null
    };
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow,
      header: chalk.cyan.bold
    };
    console.log(colors[type](`${message}`));
  }

  async runTestSuite(name, command) {
    this.log(`\n🚀 Ejecutando pruebas ${name}...`, 'header');
    
    try {
      const startTime = Date.now();
      execSync(command, { stdio: 'inherit' });
      const duration = Date.now() - startTime;
      
      this.results[name] = { success: true, duration };
      this.log(`✅ Pruebas ${name} completadas en ${duration}ms`, 'success');
      return true;
    } catch (error) {
      const duration = Date.now() - this.startTime;
      this.results[name] = { success: false, duration, error: error.message };
      this.log(`❌ Pruebas ${name} fallaron`, 'error');
      return false;
    }
  }

  printSummary() {
    const totalDuration = Date.now() - this.startTime;
    
    this.log('\n📊 RESUMEN DE PRUEBAS', 'header');
    this.log('═'.repeat(50), 'info');
    
    Object.entries(this.results).forEach(([suite, result]) => {
      if (result) {
        const status = result.success ? '✅' : '❌';
        const duration = `${result.duration}ms`;
        this.log(`${status} ${suite.padEnd(12)} - ${duration}`, 
                 result.success ? 'success' : 'error');
      }
    });
    
    this.log('─'.repeat(50), 'info');
    this.log(`⏱️  Tiempo total: ${totalDuration}ms`, 'info');
    
    const failedTests = Object.values(this.results).filter(r => r && !r.success).length;
    const passedTests = Object.values(this.results).filter(r => r && r.success).length;
    
    if (failedTests === 0) {
      this.log('🎉 ¡Todas las pruebas pasaron!', 'success');
    } else {
      this.log(`⚠️  ${failedTests} suite(s) fallaron, ${passedTests} pasaron`, 'warning');
    }
  }

  async run() {
    this.log('🎯 Iniciando suite completo de pruebas', 'header');
    
    const testSuites = [
      { name: 'unit', command: 'npm run test:unit' },
      { name: 'integration', command: 'npm run test:integration' },
      { name: 'functional', command: 'npm run test:functional' }
    ];

    for (const suite of testSuites) {
      await this.runTestSuite(suite.name, suite.command);
    }

    this.printSummary();
    
    const hasFailures = Object.values(this.results).some(r => r && !r.success);
    process.exit(hasFailures ? 1 : 0);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  new TestRunner().run();
}

module.exports = TestRunner; 