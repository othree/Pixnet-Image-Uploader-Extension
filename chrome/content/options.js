window.addEventListener('load', function () {

    document.getElementById('choosealbum').addEventListener('click', function () {
        window.open('chrome://pixImgUploader/content/aidselector.xul', '', 'chrome');
    }, false);

}, false);
