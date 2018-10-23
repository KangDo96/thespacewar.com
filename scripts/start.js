const child_process = require('child_process');
const path = require('path');

const USING_PM2 = true;

installNpmPackages();
startServer();

function installNpmPackages() {
    const clientPath = path.join(__dirname, '..', 'client');
    const serverPath = path.join(__dirname, '..', 'server');
    console.log(' (1/2) - Installing dependencies')
    child_process.execSync(`cd ${clientPath} && npm install && cd ${serverPath} && npm install`);
}

function startServer() {
    const serverFilePath = path.join(__dirname, '..', 'server', 'server.js');
    console.log(' (2/2) - Starting server')
    if (USING_PM2) {
        spawnIndependently('pm2', ['start', serverFilePath]);
    }
    else {
        spawnIndependently('node', [serverFilePath]);
    }
    console.log(' Done - Server instance is now running in the background')
}

function spawnIndependently(command, arguments) {
    const child = child_process.spawn(command, arguments, {
        detached: true,
        stdio: ['ignore']
    });
    child.unref();
}