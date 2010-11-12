/*jslint forin: true, es5: true */
/*global Components window OAuth XHR gBrowser XMLHttpRequest Base64 alert*/
/*
 * upload multipart data using xhr: http://mattn.kaoriya.net/software/lang/javascript/20090223173609.innerHTML
 * using formdata and xhr: https://developer.mozilla.org/En/XMLHttpRequest/Using_XMLHttpRequest#Using_FormData_objects
 */


var oauth_consumer_key = '3f8d7aab86452992b12a0cb0d6b805ab',
    oauth_consumer_secret = 'c31ce58e4267489ec00bc0fc4a366fa9',

    api = pixapi.init({key: oauth_consumer_key, secret: oauth_consumer_secret}),

    Cc = Components.classes,
    Ci = Components.interfaces,
    Cr = Components.results,

    prefManager       = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.pixImgUploader."),
    CacheService      = Cc['@mozilla.org/network/cache-service;1'].getService(Ci.nsICacheService),
    BinaryInputStream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream),

    ICache            = Ci.nsICache,

    defaultAlbumId = null,

    pixImgUploader = {
    onLoad: function() {
        // initialization code
        this.initialized = true;
        //this.strings = document.getElementById("pixImgUploader-strings");

        if (api.isLogin) {
            pixImgUploader.getAid();
        }
    },

    onMenuItemCommand: function(e) {
        var node = document.popupNode;
        function upimg() {
            api.uploadImg(defaultAlbumId, '', '', pixImgUploader.getCache(node));
        }
        if (!defaultAlbumId) {
            pixImgUploader.getAid(upimg);
        } else {
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
