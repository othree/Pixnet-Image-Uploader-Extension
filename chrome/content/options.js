
var Cc = Components.classes,
    Ci = Components.interfaces,
    Cr = Components.results,

    prefManager       = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.pixImgUploader.");

window.addEventListener('load', function () {

    document.getElementById('choosealbum').addEventListener('click', function () {
        window.open('chrome://pixImgUploader/content/aidselector.xul', '', 'chrome');
    }, false);

    document.getElementById('logout').addEventListener('click', function () {
        pixapi.logout();
    }, false);

}, false);
