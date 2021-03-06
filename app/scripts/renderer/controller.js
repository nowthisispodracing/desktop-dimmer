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
const { ipcRenderer, remote } = electron;

/**
 * Modules
 * External
 * @global
 * @constant
 */
const appRootPath = require('app-root-path').path;
const electronSettings = require('electron-settings');
const tinycolor = require('tinycolor2');

/**
 * Modules
 * Internal
 * @global
 * @constant
 */
const domHelper = require(path.join(appRootPath, 'lib', 'dom-helper'));
const logger = require(path.join(appRootPath, 'lib', 'logger'))({ write: true });


/**
 * @global
 */
let menubar = remote.getGlobal('menubar');
let windows = remote.getGlobal('windows');
let overlays = remote.getGlobal('overlays');

/**
 * DOM Elements
 * @global
 */
let dom = {
    content: document.querySelector('.content'),
    inputList: document.querySelector('.display-control-list'),
    windowHeader: document.querySelector('.window-controls'),
    windowControls: {
        disable: document.querySelector('.window-controls .disable'),
        enable: document.querySelector('.window-controls .enable'),
        exit: document.querySelector('.window-controls .exit'),
        settings: document.querySelector('.window-controls .settings')
    },
    output: {
        alpha: document.querySelector('#alpha-output-id'),
        color: document.querySelector('#color-output-id'),
        displayId: document.querySelector('#value-displayid'),
    },
    input: {
        container: document.querySelector('.input-container'),
        display: document.querySelector('.display-container'),
        alpha: document.querySelector('input.alpha'),
        color: document.querySelector('input.color')
    }
};


/**
 * Get percentage strings from floating point
 */
let formatOutput = (value) => {
    logger.debug('formatOutput');

    return parseInt(100 * value) + ' %';
};

/**
 * Pass Slider changes to overlay
 */
let handleAttributeChange = (displayId, attribute, value) => {
    logger.debug('handleAttributeChange');

    let elControlList = document.querySelectorAll('.display-control-list__display-control');
    elControlList.forEach(function(elControl) {
        if (parseInt(elControl.dataset.displayId) === parseInt(displayId)) {
            // Update alpha percentage label
            if (attribute === 'alpha') {
                elControl.querySelector('form > output.alpha').value = formatOutput(value);
            }
        }
    });

    let overlay = remote.getGlobal('overlays')[displayId];

    if (overlay) {
        if (attribute === 'alpha') {
            overlay.setAlpha(value);
        }
        if (attribute === 'color') {
            overlay.setColor(tinycolor(value).toRgbString());
        }
    }
};

/**
 * Pass content size changes to native wrapper window
 */
let handleSizeChanges = () => {
    logger.debug('handleSizeChanges');

    let currentWidth = menubar.window.getSize()[0];
    let currentHeight = menubar.window.getSize()[1];
    let contentHeight = parseInt(dom.content.getBoundingClientRect().height);

    if (contentHeight !== currentHeight) {
        menubar.window.setSize(currentWidth, contentHeight);
    }
};

/**
 * Slider Movement
 */
let addDisplaySliders = () => {
    logger.debug('addDisplaySliders');

    let displayList = electron.screen.getAllDisplays();
    let overlayList = [];

    for (let o in overlays) {
        for (let d in displayList) {
            if (overlays[o].displayId === displayList[d].id) {
                overlayList.push(overlays[o]);
            }
        }
    }

    while (dom.inputList.firstChild) {
        dom.inputList.removeChild(dom.inputList.firstChild);
    }

    for (let i in overlayList) {

        let overlay = overlayList[i];

        let elControl = document.createElement('form');
        elControl.classList.add('display-control-list__display-control');
        elControl.dataset.displayId = overlay.displayId;
        dom.inputList.appendChild(elControl);

        let elOutput = document.createElement('output');
        elOutput.classList.add('alpha');
        elOutput.value = formatOutput(overlay.alpha);
        elControl.appendChild(elOutput);

        let elInputAlpha = document.createElement('input');
        elInputAlpha.classList.add('alpha');
        elInputAlpha.max = 0.92;
        elInputAlpha.min = 0;
        elInputAlpha.type = 'range';
        elInputAlpha.step = 0.01;
        elInputAlpha.value = overlay.alpha;
        elInputAlpha.addEventListener('input', function() {
            handleAttributeChange(overlay.displayId, 'alpha', elInputAlpha.value);
        }, false);
        elControl.appendChild(elInputAlpha);
    }

    handleSizeChanges();
    dom.inputList.style.opacity = 1;
};


/**
 * @listens Electron:ipcRenderer#controller-show
 */
ipcRenderer.on('controller-show', () => {
    logger.log('ipcRenderer#controller-show');

    addDisplaySliders();
});


/**
 * dom.windowControls.exit#click
 * @listens dom.windowControls.exit#MouseEvent:click
 */
dom.windowControls.exit.addEventListener('click', function() {
    logger.debug('dom.windowControls.exit#click');

    remote.app.quit();
}, false);

/**
 * dom.windowControls.settings#click
 * @listens dom.windowControls.settings#MouseEvent:click
 */
dom.windowControls.settings.addEventListener('click', function() {
    logger.debug('dom.windowControls.settings#click');

    windows.preferences.show();
}, false);

/**
 * dom.windowControls.enable#click
 * @listens dom.windowControls.enable#MouseEvent:click
 */
dom.windowControls.enable.addEventListener('click', function() {
    logger.debug('dom.windowControls.enable#click');

    dom.windowControls.enable.classList.add('hide');
    dom.windowControls.disable.classList.remove('hide');

    electronSettings.set('isEnabled', true);
    for (let i in overlays) {
        overlays[i].enable();
    }
}, false);

/**
 * dom.windowControls.disable#click
 * @listens dom.windowControls.disable#MouseEvent:click
 */
dom.windowControls.disable.addEventListener('click', function() {
    logger.debug('dom.windowControls.disable#click');

    dom.windowControls.enable.classList.remove('hide');
    dom.windowControls.disable.classList.add('hide');

    electronSettings.set('isEnabled', true);
    for (let i in overlays) {
        overlays[i].disable();
    }
}, false);


//noinspection JSValidateJSDoc
/**
 * Watch for size changes
 * @listens document#DOMContentLoaded
 */
document.addEventListener('DOMContentLoaded', function() {
    logger.debug('document#DOMContentLoaded');

    // Add platform name to <html>
    domHelper.addPlatformClass();

    // Add slider controls
    addDisplaySliders();

    if (electronSettings.get('isEnabled') === true) {
        dom.windowControls.enable.classList.add('hide');
    } else {
        dom.windowControls.disable.classList.add('hide');
    }
}, false);
