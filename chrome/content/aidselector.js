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
    alertsService     = Cc["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService),

    defaultAlbumId = null;

pixImgUploader = {
    onLoad: function() {
        // initialization code
        this.initialized = true;
        //this.strings = document.getElementById("pixImgUploader-strings");

        function parseOptions (sets) {
            var menupopup = document.getElementById('albumidprefpopup'),
                option, i;
            for (i in sets) {
                option = document.createElement('menuitem');
                option.setAttribute('label', sets[i].title);
                option.setAttribute('value', sets[i].id);
                if (defaultAlbumId == sets[i].id) {
                    option.setAttribute('selected', 'true');
                }
                menupopup.appendChild(option);
            }
        }
        if (api.isLogin()) {
            pixImgUploader.getAids(parseOptions);
        }
        document.getElementById('aiddone').addEventListener('click', function () {
            var menupopup = document.getElementById('albumidpref');
            defaultAlbumId = menupopup.value;
            prefManager.setCharPref('defaultAlbumId', defaultAlbumId);
            window.close();
        }, false);
    },

    login: function login(cb) {
        api.oAuthLogin(cb);
    },

    getAids: function getAids(cb) {
        var parseAids = function (album) {
            if (album && album.sets) {
                defaultAlbumId = album.sets[1].id;
                if (typeof cb == 'function') {
                    cb.call(null, album.sets);
                }
            }
        };
        api.getAlbumSets(parseAids);
    },

};

window.addEventListener('load', pixImgUploader.onLoad, false);
