/*jslint forin: true, es5: true */
/*global Components window OAuth XHR gBrowser XMLHttpRequest Base64 alert*/
/*
 * upload multipart data using xhr: http://mattn.kaoriya.net/software/lang/javascript/20090223173609.innerHTML
 * using formdata and xhr: https://developer.mozilla.org/En/XMLHttpRequest/Using_XMLHttpRequest#Using_FormData_objects
 */


var api = pixapi.init({key: oauth_consumer_key, secret: oauth_consumer_secret}),

    Cc = Components.classes,
    Ci = Components.interfaces,
    Cr = Components.results,

    prefManager       = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.pixImgUploader."),
    alertsService     = Cc["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService),

    defaultAlbumId,
    defaultAlbumTitle,

    pixImgUploader = {
    onLoad: function() {
        // initialization code
        this.initialized = true;
        //this.strings = document.getElementById("pixImgUploader-strings");

        //if (api.isLogin()) {
            //pixImgUploader.getAid();
        //}
    },

    onMenuItemCommand: function(e) {
        var node = document.popupNode;
        function upimg() {
            var f = pixImgUploader.getCache(node);
            api.uploadImg(defaultAlbumId, '', '', f, function () {
                alertsService.showAlertNotification("",  "Upload Complete", f.name + " to " + defaultAlbumTitle);
            });
        }
        if (!api.isLogin()) {
            pixImgUploader.getAid(upimg);
        } else {
            defaultAlbumId = prefManager.getCharPref('defaultAlbumId');
            defaultAlbumTitle = decodeURIComponent(prefManager.getCharPref('defaultAlbumTitle'));
            upimg();
        }
    },

    login: function login(cb) {
        api.oAuthLogin(cb);
    },

    getAid: function getAid(cb) {
        var parseAid = function (album) {
            if (album && album.sets) {
                defaultAlbumId = album.sets[1].id;
                defaultAlbumTitle = album.sets[1].title;
                prefManager.setCharPref('defaultAlbumId', defaultAlbumId);
                prefManager.setCharPref('defaultAlbumTitle', defaultAlbumTitle);
                if (typeof cb == 'function') {
                    cb.call();
                }
            }
        };
        api.getAlbumSets(parseAid);
    },

    getCache: function (target) {
        if (target.nodeName.toLowerCase() == 'img') {
            var req = new XMLHttpRequest(),
                xhr = new XMLHttpRequest(),
                filestream,
                type,
                abyte = [],
                abody, i;
            req.open('GET', target.src, false); 
            req.overrideMimeType('text/plain; charset=x-user-defined');
            req.send(null);
            if (req.status == 200) {
                filestream = req.responseText;
                for (i = 0; i < filestream.length; i++) {
                    abyte[i] = String.fromCharCode(filestream.charCodeAt(i) & 0xff); 
                }
                abody = abyte.join("");

                return {
                    name: parseUri(target.src).file,
                    size: abody.length,
                    type: req.getResponseHeader('Content-type'),
                    getAsBinary: function () {
                        return abody;
                    },
                    getAsDataURL: function () {
                    },
                    getAsText: function () {
                    }
                };
            }
        }
        return null;
    }
};

window.addEventListener("load", pixImgUploader.onLoad, false);
