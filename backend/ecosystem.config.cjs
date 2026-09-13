// ============================================================
// DecisionOS Backend — PM2 Production Process Manager Config
// ============================================================
// Usage:
//   pm2 start ecosystem.config.cjs --env production
//   pm2 reload ecosystem.config.cjs --update-env
//   pm2 status
// ============================================================

module.exports = {
  apps: [
    {
      name: 'decisionos-backend',
      script: 'src/server.js',
      instances: process.env.PM2_INSTANCES || 'max', // Scale to all available CPU cores
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '600M', // Auto-restart worker if memory exceeds 600MB
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 10,
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      listen_timeout: 10000,
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
