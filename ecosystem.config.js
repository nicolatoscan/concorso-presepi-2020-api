module.exports = {
    apps: [{
        name: 'rememo-api',
        script: './dist/index.js',
        instances: 'max',
        env: {
            NODE_ENV: 'development',
        },
        env_production: {
            NODE_ENV: 'production',
        }
    }]
};