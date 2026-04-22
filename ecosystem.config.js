module.exports = {
  apps: [
    {
      name: 'onmec-api',
      script: 'dist/src/main.js',
      exec_mode: 'cluster',
      instances: 'max',
      env_production: {
        NODE_ENV: 'production',
        PORT: 8081,
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_memory_restart: '500M',
      restart_delay: 3000,
    },
  ],
};
