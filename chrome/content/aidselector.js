/*jslint forin: true, es5: true */
/*global Components window OAuth XHR gBrowser XMLHttpRequest Base64 alert*/


var api = pixapi.init({key: oauth_consumer_key, secret: oauth_consumer_secret}),

    Cc = Components.classes,
    Ci = Components.interfaces,
    Cr = Components.results,

    prefManager       = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.pixImgUploader."),
    alertsService     = Cc["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService),

    defaultAlbumId;

    pixImgUploader = {
    onLoad: function() {
        // initialization code
        this.initialized = true;
        //this.strings = document.getElementById("pixImgUploader-strings");

        function parseOptions (sets) {
            var menulist = document.getElementById('albumidpref'),
                i, j;
            defaultAlbumId = prefManager.getCharPref('defaultAlbumId');
            for (i in sets) {
                menulist.appendItem(sets[i].title, sets[i].id);
                if (defaultAlbumId == sets[i].id) {
                    j = i;
                }
            }
            menulist.selectedIndex = j;
        }
        if (api.isLogin()) {
            pixImgUploader.getAids(parseOptions);
        }
        document.getElementById('aiddone').addEventListener('click', function () {
            var menulist = document.getElementById('albumidpref');
            defaultAlbumId = menulist.value;
            defaultAlbumTitle = menulist.label;
            prefManager.setCharPref('defaultAlbumId', defaultAlbumId);
            prefManager.setCharPref('defaultAlbumTitle', encodeURIComponent(defaultAlbumTitle));
            window.close();
        }, false);
    },

    login: function login(cb) {
        api.oAuthLogin(cb);
    },

    getAids: function getAids(cb) {
        var parseAids = function (album) {
            if (album) {
                if (album.sets && album.total != album.sets.length) {
                    api.getAlbumSets({per_page: album.total}, parseAids);
                } else if (album.sets) {
                    defaultAlbumId = album.sets[1].id;
                    defaultAlbumTitle = album.sets[1].title;
                    if (typeof cb == 'function') {
                        cb.call(null, album.sets);
                    }
                }
            }
        };
        api.getAlbumSets({per_page: 100}, parseAids);
    },

};

window.addEventListener('load', pixImgUploader.onLoad, false);
