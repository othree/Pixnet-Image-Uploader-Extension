/*jslint forin: true */

(function () {

//if (typeof OAuth == 'undefined') {
    //throw('oauth.js not include.');
//}

var Cc = Components.classes,
    Ci = Components.interfaces,
    Cr = Components.results,
    pixapiPref = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.pixapi.");

pixapi = {
    pixUrl: 'http://emma.pixnet.cc',
    getOAuthTokenUrl: 'http://emma.pixnet.cc/oauth/request_token',
    getOAuthAccessTokenUrl: 'http://emma.pixnet.cc/oauth/access_token',
    loginCallback: null,
    oAuthTokens: {
        oauth_token: pixapiPref.getCharPref('oauth_token'),
        oauth_token_secret: pixapiPref.getCharPref('oauth_token_secret')
    },
    oAuthSecret: {
        oauth_consumer_secret: ''
    },
    oAuthParameters: {
	    oauth_version: '1.0',
        oauth_consumer_key: '',
        oauth_callback: '', 
        oauth_signature_method: 'HMAC-SHA1',
        oauth_signature: null
    },
    getTimestamp: function () {
        return Math.floor(new Date().getTime() / 1000);
    },
    authType: '',
    isLogin: function () {
        return pixapiPref.getCharPref('oauth_token') !== '';
    },
    logout: function () {
        pixapiPref.setCharPref('oauth_token', '');
        pixapiPref.setCharPref('defaultAlbumId', '');
    },
    init: function (consumer) {
        var that = this;
        if (consumer.key && consumer.secret) {
            that.oAuthParameters.oauth_consumer_key = consumer.key;
            that.oAuthSecret.oauth_consumer_secret = consumer.secret;
            
            return that;
        } else {
            return false;
        }
    },
    getOAuthInfo : function (method, url, tokenSecret, customParams, optoutParams) {
        var names = [], name,
            accessor = {
                consumerSecret: pixapi.oAuthSecret.oauth_consumer_secret,
                tokenSecret: tokenSecret
            },
            message = {
                action: url,
                method: method,
                parameters: []
            },
            i, value;

        for (name in pixapi.oAuthParameters) {
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
        
        for (i=0; i < names.length; i++) {
            name = names[i];
            if (optoutParams[name]) {
                continue;
            }
            value = pixapi.oAuthParameters[name];
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
        that.http(pixapi.getOAuthAccessTokenUrl, 'POST', 
            {"oauth_verifier": pixapi.oAuthTokens.oauth_verifier, "oauth_token": pixapi.oAuthTokens.oauth_token}, 
            function () {
                XHR = this;
                that.parseRequestToken(XHR.responseText);
                that.oAuthTokens.getAccessToken = true;
                pixapiPref.setCharPref('oauth_token', that.oAuthTokens.oauth_token);
                pixapiPref.setCharPref('oauth_token_secret', that.oAuthTokens.oauth_token_secret);
                that.loggedin = true;
                if (typeof that.loginCallback == 'function') {
                    that.loginCallback.apply(that); //that is pixapi
                }
                return true;
            });
    },
    parseRequestToken: function (responseText) {
        var items = responseText.split('&');
        for (var i =0; i < items.length; i++){
            var namevalue = items[i].split('=');
            if (namevalue.length == 2) {
                pixapi.oAuthTokens[namevalue[0]]= decodeURIComponent(namevalue[1]);
            }
        } 
    },
    oAuthLogin : function(loginCallback) {
        var that = this;
        that.loginCallback = loginCallback;
        pixapi.oAuthTokens.oauth_token = '';
        pixapi.oAuthTokens.oauth_token_secret = '';

        that.http(pixapi.getOAuthTokenUrl, 'POST', {}, function () {
            XHR = this;
            pixapi.parseRequestToken(XHR.responseText);
            
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

        params.oauth_token = pixapi.oAuthTokens.oauth_token;

        var message = this.getOAuthInfo(method, url, pixapi.oAuthTokens.oauth_token_secret, params),
            signature = OAuth.getParameter(message.parameters, 'oauth_signature'),
            XHR = new XMLHttpRequest(),
            boundary = "pixpixpixpixpix",
            i, f, body = [];

        delete params.oauth_token;

        if (method == "POST") {
            for (i in params) {
                body.push("--" + boundary + "\r\n");  
                body.push("Content-Disposition: form-data; name='" + i + "'\r\n\r\n");  
                body.push(params[i] + "\r\n");
            }
            if (files && files.length > 0) {
                f = files[0];
                body.push("--" + boundary + "\r\n");  
                body.push("Content-Disposition: form-data; name='upload_file'; filename='" + f.name + "'\r\n");  
                body.push("Content-Type: " + f.type + "\r\n\r\n");
                body.push(f.getAsBinary() + "\r\n");
                body.push("--" + boundary + "--\r\n");
            }
            body = body.join("");
        } else {
            for (i in params) {
                body.push(encodeURIComponent(i) + '=' + encodeURIComponent(params[i]));  
            }
            if (body.length > 0) {
                url += ('?' + body.join('&'));
            }
            body = '';
        }

        //always async
        XHR.open(method, url, true);

        XHR.setRequestHeader('User-Agent', 'Mozilla/5.0');
        if (f) {
            XHR.setRequestHeader('Content-Disposition',  'attachment; filename="' +  encodeURIComponent(f.name)  + '"'); 
            XHR.setRequestHeader('Content-Type', 'multipart/form-data, boundary=' + boundary); // simulate a file MIME POST request.
        } else {
            //XHR.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            XHR.setRequestHeader('Content-Type', 'multipart/form-data, boundary=' + boundary); // simulate a file MIME POST request.
        }

        XHR.setRequestHeader(method, pixapi.getOAuthAccessTokenUrl + ' HTTP/1.1');
        XHR.setRequestHeader('Authorization', message.authHeader);
        XHR.onreadystatechange = function () {
            if (XHR.readyState == 4 && XHR.status == 200) {
                if (typeof callback == 'function') {
                    var data = [];
                    try {
                        data = [JSON.parse(XHR.responseText)];
                    } catch (e) {}
                    callback.apply(XHR, data);
                }
            }
        };

        if (method == "POST") {
            if (f) {
                XHR.sendAsBinary(body);
            } else {
                XHR.send(body);
            }
        } else {
            XHR.send(null);
        }
        
    },
    newAlbumSet: function (input, cb) {
        /*
         * Url: /album/sets
         * Method: POST
         */
        var args = arguments, 
            url;
        if (!pixapi.isLogin()) {
            pixapi.oAuthLogin(function () {
                pixapi.getAlbumSets.apply(this, args);
            });
        }
        url = pixapi.pixUrl + '/album/sets';
        setTimeout( function () {
            pixapi.http(url, 'POST', input, cb);
        }, 15); 
    },
    getAlbumSets: function (input, cb) {
        /*
         * Url: /album/sets
         * Method: GET
         */
        var args = arguments, 
            url;
        if (!pixapi.isLogin()) {
            pixapi.oAuthLogin(function () {
                pixapi.getAlbumSets.apply(this, args);
            });
        }
        url = pixapi.pixUrl + '/album/sets';
        setTimeout( function () {
            pixapi.http(url, 'GET', input, cb);
        }, 15); 
    },
    uploadImg: function (aid, title, description, img, cb) {
        /*
         * Url: /album/sets/[:set_id]/elements
         * Method: POST
         * Params:
         *   title
         *   description
         *   upload_file
         */
        var args = arguments, 
            url;
        if (!pixapi.isLogin()) {
            pixapi.oAuthLogin(function () {
                pixapi.uploadImg.apply(this, args);
            });
        }
        url = pixapi.pixUrl + '/album/sets/' + aid + '/elements';
        setTimeout( function () {
            pixapi.http(url, 'POST', {"title": title, "description": description}, [img], cb);
        }, 15); 
    }
};

})();
