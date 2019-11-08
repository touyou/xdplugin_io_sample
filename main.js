const application = require("application");
const uxp = require("uxp");
const fs = require("uxp").storage.localFileSystem;
const { Text, Color, ImageFill } = require("scenegraph");
const { alert, error, confirm } = require("./lib/dialogs.js");

// MARK: Helper

function xhrBinary(url) {
    return new Promise((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.onload = () => {
            if (req.status === 200) {
                try {
                    const arr = new Uint8Array(req.response);
                    resolve(arr);
                } catch (err) {
                    reject(`Couldnt parse response. ${err.message}, ${req.response}`);
                }
            } else {
                reject(`Request had an error: ${req.status}`);
            }
        }
        req.onerror = reject;
        req.onabort = reject;
        req.open('GET', url, true);
        req.responseType = "arraybuffer";
        req.send();
    });
}

function applyImageFill(selection, file) {
    const imageFill = new ImageFill(file);
    selection.items[0].fill = imageFill;
}

async function downloadimage(selection, jsonResponse) {
    try {
        const photoUrl = jsonResponse.message;
        const photoObj = await xhrBinary(photoUrl);
        const tempFolder = await fs.getTemporaryFolder();
        const tempFile = await tempFolder.createFile("tmp", { overwrite: true });
        await tempFile.write(photoObj, { format: uxp.storage.formats.binary });
        applyImageFill(selection, tempFile);
    } catch (err) {
        console.log("error");
        console.log(err.message);
    }
}

// MARK: Rendition

async function exportRendition(selection) {
    const folder = await fs.getFolder();
    const file = await folder.createFile("rendition.png");

    /**
     * @type {application.RenditionSettings[]}
     */
    let renditionSettings = [{
        node: selection.items[0],
        outputFile: file,
        type: application.RenditionType.PNG,
        scale: 2
    }];

    application.createRenditions(renditionSettings)
        .then(results => {
            // @ts-ignore
            console.log(`PNG rendition has been saved at ${results[0].outputFile.nativePath}`);
        })
        .catch(error => {
            console.log(error);
        });
}

// MARK: Read file

async function insertTextFromFileHandler(selection) {
    const aFile = await fs.getFileForOpening({ types: ["txt"] });
    if (!aFile) return;

    // @ts-ignore
    const contents = await aFile.read();

    const text = new Text();
    text.text = contents;
    // @ts-ignore
    text.styleRanges = [{
        length: contents.length,
        fill: new Color("#0000ff"),
        fontSize: 12
    }];

    selection.insertionParent.addChild(text);
    text.moveInParentCoordinates(10, 30);
}

// MARK: Network Requests

function applyImage(selection) {
    if (selection.items.length) {
        const url = "https://dog.ceo/api/breeds/image/random";
        return fetch(url)
            .then(function (response) {
                return response.json();
            })
            .then(function (jsonResponse) {
                return downloadimage(selection, jsonResponse);
            });
    } else {
        console.log("Please select a shape to apply the download image.");
    }
}

// MARK: Alert

async function showAlert() {
    await alert("Connect to the Internet", "In order to function correctly, this plugin requires access to the Internet. Please connect to a network that has Internet access.");
}

async function showError() {
    await error("Synchronization Failed", //[1]
        "Failed to synchronize all your changes with our server. Some changes may have been lost.",
        "Steps you can take:",
        "* Save your document",
        "* Check your network connection",
        "* Try again in a few minutes"); //[2]
}

async function showConfirm() {
    const feedback = await confirm("Enable Smart Filters?",
        "Smart filters are nondestructive and will preserve your original images.",
        ["Cancel", "Enable"]);
    switch (feedback.which) {
        case 0:
            showError();
            break;
        case 1:
            showAlert();
            break;
    }
}

module.exports = {
    commands: {
        exportRendition,
        "insertTextFromFileCommand": insertTextFromFileHandler,
        applyImage,
        showAlert,
        showError,
        showConfirm
    }
};
