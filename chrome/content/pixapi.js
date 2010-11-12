/*jslint forin: true */

var pixapiPref = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.pixapi.");

pixapi = {
    pixUrl: 'http://emma.pixnet.cc',
    getOAuthTokenUrl: 'http://emma.pixnet.cc/oauth/request_token',
    getOAuthAccessTokenUrl: 'http://emma.pixnet.cc/oauth/access_token',
    loginCallback: null,
    oAuthTokens: {
        oauth_token: pixapiPref.getCharPref('oauth_token'),
        oauth_token_secret: pixapiPref.getCharPref('oauth_token_secret')
    },
    isLogin: pixapiPref.getCharPref('oauth_token') !== '',
    oAuthSecret: {
        oauth_consumer_secret: 'c31ce58e4267489ec00bc0fc4a366fa9'
    },
    oAuthParameters: {
	    oauth_version: '1.0',
        oauth_consumer_key: '3f8d7aab86452992b12a0cb0d6b805ab',
        oauth_callback: 'chrome://piximguploader/content/pixapi.xul', 
        oauth_signature_method: 'HMAC-SHA1',
        oauth_signature: null
    },
    getTimestamp: function () {
        return Math.floor(new Date().getTime() / 1000);
    },
    authType: '',
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
                that.isLogin = true;
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

        that.http(pixapi.getOAuthTokenUrl, 'POST', {}, 
            function () {
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
        var message = this.getOAuthInfo(method, url, pixapi.oAuthTokens.oauth_token_secret, params),
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
            body += "--" + boundary + "--\r\n";
        }

        XHR.open(method, url, true);

        XHR.setRequestHeader('User-Agent', 'Mozilla/5.0');
        if (f) {
            XHR.setRequestHeader('content-disposition',  'attachment; filename="' +  encodeURIComponent(f.name)  + '"'); 
            XHR.setRequestHeader("Content-Type", "multipart/form-data, boundary="+boundary); // simulate a file MIME POST request.
        } else {
            XHR.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }

        XHR.setRequestHeader(method, pixapi.getOAuthAccessTokenUrl + ' HTTP/1.1');
        XHR.setRequestHeader('Authorization', message.authHeader);
        params = 'oauth_signature=' + encodeURIComponent(Base64.encode(signature));
        //XHR.send(params);
        if (f) {
            XHR.sendAsBinary(body);
            //XHR.send(body);
        } else {
            XHR.send('oauth_callback=' + pixapi.oAuthParameters.oauth_callback);
            //XHR.send();
        }
        
        XHR.onreadystatechange = function () {
            if (XHR.status == 200) {
                if (typeof callback == 'function') {
                    callback.call(XHR, XHR.responseText);
                }
            }
        };
        
        return true;
    },
    getAlbumSets: function (cb) {
        /*
         * Url: /album/sets
         * Method: GET
         */
        var url = this.pixUrl + '/album/sets';
        this.http(url, 'GET', {"oauth_token": pixapi.oAuthTokens.oauth_token}, null, cb);
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
        var url = this.pixUrl + '/album/sets/' + aid + '/elements';
        this.http(url, 'POST', {"oauth_token": pixapi.oAuthTokens.oauth_token, "title": title, "description": description}, [img], cb);
    }
};

