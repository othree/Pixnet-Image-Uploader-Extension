/*jslint forin: true, es5: true */
/*global Components pixConn window OAuth XHR gBrowser XMLHttpRequest Base64 alert*/
/*
 * upload multipart data using xhr: http://mattn.kaoriya.net/software/lang/javascript/20090223173609.innerHTML
 * using formdata and xhr: https://developer.mozilla.org/En/XMLHttpRequest/Using_XMLHttpRequest#Using_FormData_objects
 */

var Cc = Components.classes,
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

        if (pixConn.isLogin) {
            pixImgUploader.getAid();
        }
    },

    onMenuItemCommand: function(e) {
        if (!pixConn.isLogin) {
            pixImgUploader.login(pixImgUploader.onMenuItemCommand);
        } else if (defaultAlbumId === null) {
            if (pixImgUploader.getAid()) {
                pixImgUploader.onMenuItemCommand();
            }
        } else {
            img = pixImgUploader.getCache(document.popupNode);
            pixConn.uploadImg(defaultAlbumId, 'XPI', '', img);
        }
    },

    login: function login(cb) {
        pixConn.oAuthLogin(cb);
    },

    getAid: function getAid() {
        if (pixConn.isLogin) {
            var album = pixConn.getAlbumSets();
            if (album && album.sets) {
                defaultAlbumId = album.sets[1].id;
                alert(defaultAlbumId);
                alert(defaultAlbumId);
                return true;
            }
        }
        return false;
    },

    getCache: function (target) {
        if (target.nodeName.toLowerCase() == 'img') {
            var req = new XMLHttpRequest(),
                xhr = new XMLHttpRequest(),
                filestream,
                type,
                abyte = [],
                abody;
            req.open('GET', target.src, false); 
            req.overrideMimeType('text/plain; charset=x-user-defined');
            req.send(null);
            if (req.status == 200) {
                alert(req.status);
                filestream = req.responseText;
                for (var i = 0; i < filestream.length; i++) {
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


var pixConn = {
    pixUrl: 'http://emma.pixnet.cc',
    getOAuthTokenUrl: 'http://emma.pixnet.cc/oauth/request_token',
    getOAuthAccessTokenUrl: 'http://emma.pixnet.cc/oauth/access_token',
    loginCallback: null,
    oAuthTokens: {
        oauth_token: prefManager.getCharPref('oauth_token'),
        oauth_token_secret: prefManager.getCharPref('oauth_token_secret')
    },
    isLogin: prefManager.getCharPref('oauth_token') !== '',
    oAuthSecret: {
        oauth_consumer_secret: 'c31ce58e4267489ec00bc0fc4a366fa9'
    },
    oAuthParameters: {
	    oauth_version: '1.0',
        oauth_consumer_key: '3f8d7aab86452992b12a0cb0d6b805ab',
        oauth_callback: '', 
        oauth_signature_method: 'HMAC-SHA1',
        oauth_signature: null
    },
    getTimestamp: function () {
        return Math.floor(new Date().getTime() / 1000);
    },
    authType: '',
    getOAuthInfo : function (method, url, tokenSecret, customParams, optoutParams) {
        var names = [],
            name;
        for (name in pixConn.oAuthParameters) {
            names.push(name);
        }
        if (!customParams) {
            customParams = {};
        }
        if (!optoutParams) {
            optoutParams = {};
        }
        for(name in customParams) {
            names.push(name);				
        }
        
        var accessor = {
            consumerSecret: pixConn.oAuthSecret.oauth_consumer_secret,
            tokenSecret: tokenSecret
        };

        var message = {
            action: url,
            method: method,
            parameters: []
        };

        for (var i=0; i < names.length; i++) {
            name = names[i];
            if (optoutParams[name]) {
                continue;
            }
            var value = pixConn.oAuthParameters[name];
            if (value === null || typeof value == "undefined") {
                value = customParams[name];
            }
            if (value === null || typeof value == "undefined") {
                continue;				
            }
            message.parameters.push([name, value]);
        }
        
        OAuth.setTimestampAndNonce(message);
        OAuth.SignatureMethod.sign(message, accessor);
        //message.parameterMap = OAuth.getParameterMap(message.parameters);
        message.authHeader   = OAuth.getAuthorizationHeader("", message.parameters);
        
        message.baseString   = OAuth.SignatureMethod.getBaseString(message);
        
        return message;

    },
    getAccessToken: function () {
        var that = this;
        that.http(pixConn.getOAuthAccessTokenUrl, 'POST', 
            {"oauth_verifier": pixConn.oAuthTokens.oauth_verifier, "oauth_token": pixConn.oAuthTokens.oauth_token}, 
            function () {
                XHR = this;
                that.parseRequestToken(XHR.responseText);
                that.oAuthTokens.getAccessToken = true;
                prefManager.setCharPref('oauth_token', that.oAuthTokens.oauth_token);
                prefManager.setCharPref('oauth_token_secret', that.oAuthTokens.oauth_token_secret);
                that.isLogin = true;
                if (typeof that.loginCallback == 'function') {
                    that.loginCallback.apply(that); //that is pixConn
                }
                return true;
            });
    },
    parseRequestToken: function (responseText) {
        var items = responseText.split('&');
        for (var i =0; i < items.length; i++){
            var namevalue = items[i].split('=');
            if (namevalue.length == 2) {
                pixConn.oAuthTokens[namevalue[0]]= decodeURIComponent(namevalue[1]);
            }
        } 
    },
    oAuthLogin : function(loginCallback) {
        var that = this;
        that.loginCallback = loginCallback;
        pixConn.oAuthTokens.oauth_token = '';
        pixConn.oAuthTokens.oauth_token_secret = '';

        that.http(pixConn.getOAuthTokenUrl, 'POST', {}, 
            function () {
                XHR = this;
                pixConn.parseRequestToken(XHR.responseText);
                gBrowser.addEventListener('load', function () {
                    gBrowser.removeEventListener('load', arguments.callee, false);
                    var tab = gBrowser.addTab(that.oAuthTokens.xoauth_request_auth_url),
                        aTab = gBrowser.selectedTab;
                    tab.addEventListener('load', function (event) {
                        gBrowser.selectedTab = tab;
                        var code = gBrowser.contentDocument.getElementById('oauth_verifier');
                        if (code) {
                            tab.removeEventListener('load', arguments.callee, false);
                            code = code.innerHTML;
                            gBrowser.selectedTab = aTab;
                            gBrowser.removeTab(tab);
                            that.oAuthTokens.oauth_verifier = code;
                            that.getAccessToken();
                        } else {
                            gBrowser.contentDocument.querySelector('input[name=username], input[name=password]').focus();
                        }
                    }, false);
                
                }, false);
            });
    },
    http: function (url, method, params, files, callback) {
        if (typeof callback == 'undefined' && typeof files == 'undefined' && typeof params == 'function') {
            callback = params;
            files = [];
            params = {};
        }
        if (typeof callback == 'undefined' && typeof files == 'function') {
            callback = files;
            files = [];
        }
        if (typeof params == 'undefined') {
            files = [];
            params = {};
        }
        var message = this.getOAuthInfo(method, url, pixConn.oAuthTokens.oauth_token_secret, params),
            signature = OAuth.getParameter(message.parameters, 'oauth_signature'),
            XHR = new XMLHttpRequest(),
            boundary = "pixpixpixpixpix",
            i, f, body;

        if (files && files.length > 0) {
            f = files[0];
            body = "";
            for (i in params) {
                body += "--" + boundary + "\r\n";  
                body += "Content-Disposition: form-data; name='" + i + "'\r\n\r\n";  
                body += params[i] + "\r\n";
            }
            body += "--" + boundary + "\r\n";  
            body += "Content-Disposition: form-data; name='upload_file'; filename='" + f.name + "'\r\n";  
            body += "Content-Type: " + f.type + "\r\n\r\n";
            body += f.getAsBinary() + "\r\n";
            body += "--" + boundary + "--";
        }

        XHR.open(method, url, false);

        XHR.setRequestHeader('User-Agent', 'Mozilla/5.0');
        if (f) {
            XHR.setRequestHeader('content-disposition',  'attachment; filename="' +  encodeURIComponent(f.name)  + '"'); 
            XHR.setRequestHeader("Content-Type", "multipart/form-data, boundary="+boundary); // simulate a file MIME POST request.
        } else {
            XHR.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }

        XHR.setRequestHeader(method, pixConn.getOAuthAccessTokenUrl + ' HTTP/1.1');
        XHR.setRequestHeader('Authorization', message.authHeader);
        params = 'oauth_signature=' + encodeURIComponent(Base64.encode(signature));
        //XHR.send(params);
        if (f) {
            //XHR.sendAsBinary(body);
            XHR.send(body);
        } else {
            XHR.send();
        }
        
        if (XHR.status == 200) {
            if (typeof callback == 'function') {
                callback.apply(XHR);
            }
            return XHR.responseText;
        } else {
            alert(XHR.responseText);
        }
    },
    getAlbumSets: function () {
        /*
         * Url: /album/sets
         * Method: GET
         */
        var url = this.pixUrl + '/album/sets',
            res = this.http(url, 'GET', {"oauth_token": pixConn.oAuthTokens.oauth_token});
        return JSON.parse(res);
    },
    uploadImg: function (aid, title, description, img) {
        /*
         * Url: /album/sets/[:set_id]/elements
         * Method: POST
         * Params:
         *   title
         *   description
         *   upload_file
         */
        var url = this.pixUrl + '/album/sets/' + aid + '/elements',
            res = this.http(url, 'POST', {"oauth_token": pixConn.oAuthTokens.oauth_token, "title": title, "description": description}, [img]);
        alert(res);
        return JSON.parse(res);
    }
};

window.addEventListener("load", pixImgUploader.onLoad, false);
