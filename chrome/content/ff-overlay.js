pixImgUploader.onFirefoxLoad = function(event) {
  document.getElementById("contentAreaContextMenu")
          .addEventListener("popupshowing", function (e){ pixImgUploader.showFirefoxContextMenu(e); }, false);
};

pixImgUploader.showFirefoxContextMenu = function(event) {
  // show or hide the menuitem based on what the context menu is on
  document.getElementById("context-pixImgUploader").hidden = gContextMenu.onImage;
};

window.addEventListener("load", pixImgUploader.onFirefoxLoad, false);
