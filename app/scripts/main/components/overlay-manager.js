'use strict';

/**
 * Modules
 * Node
 * @global
 * @constant
 */
const path = require('path');

/**
 * Modules
 * Electron
 * @global
 * @constant
 */
const electron = require('electron');

/**
 * Modules
 * External
 * @global
 * @constant
 */
const _ = require('lodash');
const appRootPath = require('app-root-path').path;
const electronSettings = require('electron-settings');


/**
 * Modules
 * Internal
 * @global
 * @constant
 */
const packageJson = require(path.join(appRootPath, 'package.json'));
const platformHelper = require(path.join(appRootPath, 'lib', 'platform-helper'));
const logger = require(path.join(appRootPath, 'lib', 'logger'))({ write: true });
const OverlayWindow = require(path.join(appRootPath, 'app', 'scripts', 'main', 'windows', 'overlay-window'));


/**
 * App
 * @global
 * @constant
 */
const appName = packageJson.name;


/**
 * Create reference for Overlays
 * @global
 */
global.overlays = {};


/**
 * Save Overlay Settings for each Display
 */
let persistConfiguration = () => {
    logger.debug('persistConfiguration');

    let savedOverlays = electronSettings.get('overlays');

    for (let i in global.overlays) {
        savedOverlays[global.overlays[i].displayId] = {
            alpha: global.overlays[i].alpha,
            color: global.overlays[i].color
        };
    }

    electronSettings.set('overlays', savedOverlays);
};

/**
 * Remove all Overlays
 * @param { Boolean } restart - relaunch app after removal
 */
let removeOverlays = (restart) => {
    logger.debug('removeOverlays');

    persistConfiguration();

    // Keep track of total number
    let overlayCount = Object.keys(global.overlays).length;
    let index = 1;

    for (let i in global.overlays) {
        // Check whether BrowserWindow is deleted or destroyed
        if (global.overlays[i].isDestroyed()) {
            return;
        }

        // After window close
        global.overlays[i].on('closed', () => {
            logger.debug('overlay:closed');

            // Remove reference
            global.overlays[i] = null;
            delete global.overlays[i];
            // Last window, restart app to reinitialize
            if (index === overlayCount) {
                if (restart) {
                    global.menubar.app.relaunch();
                    global.menubar.app.exit();
                }
            }

            index++;
        });

        // Close window
        global.overlays[i].close();
    }
};

/**
 * Remove and recreate all Overlays
 */
let resetOverlays = () => {
    logger.debug('resetOverlays');

    removeOverlays(true);
};

/**
 * Creates Overlay windows for all screens
 */
let createOverlays = () => {
    logger.debug('createOverlays');

    electron.screen.getAllDisplays().forEach(function(display) {
        global.overlays[display.id] = new OverlayWindow(display);
    });
};


/**
 * @listens appMenubar#before-quit
 */
global.menubar.app.on('before-quit', () => {
    logger.debug('menubar.app:before-quit');

    persistConfiguration();
});

/**
 * @listens Electron#app:ready
 */
global.menubar.app.on('ready', () => {
    logger.debug('menubar.app:ready');

    createOverlays();
});


/**
 * @exports
 */
module.exports = {
    create: createOverlays,
    persist: persistConfiguration,
    remove: removeOverlays,
    reset: resetOverlays
};
