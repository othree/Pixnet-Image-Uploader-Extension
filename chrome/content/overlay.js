var pixImgUploader = {
  onLoad: function() {
    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("pixImgUploader-strings");
    pixConn.oAuthLogin();
  },

  onMenuItemCommand: function(e) {
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    promptService.alert(window, this.strings.getString("helloMessageTitle"),
                                this.strings.getString("helloMessage"));
  },

  onToolbarButtonCommand: function(e) {
    // just reuse the function above.  you can change this, obviously!
    pixImgUploader.onMenuItemCommand(e);
  }
};

window.addEventListener("load", pixImgUploader.onLoad, false);

pixConn = {
    pixUrl: 'http://emma.pixnet.cc/',
    getOAuthTokenUrl: 'http://emma.pixnet.cc/oauth/request_token',
    getOAuthAccessTokenUrl: 'http://emma.pixnet.cc/oauth/access_token',
    oAuthTokens: {
        oauth_token: '',
        oauth_token_secret: 'c31ce58e4267489ec00bc0fc4a366fa9'
    },
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
    oAuthScope: 'http://emma.pixnet.cc/oauth/',
    authType: '',
    getOAuthInfo : function (method, url, tokenSecret, customParams, optoutParams) {
        var names = [];
        for (var name in pixConn.oAuthParameters) {
            names.push(name);
        }
        if (!customParams) {
            customParams = {};
        }
        if (!optoutParams) {
            optoutParams = {};
        }
        for(var name in customParams) {
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
            var name = names[i];
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
        var message = pixConn.getOAuthInfo('POST', pixConn.getOAuthAccessTokenUrl, pixConn.oAuthTokens['oauth_token_secret'],
            {"oauth_verifier": pixConn.oAuthTokens['oauth_verifier'],
             "oauth_token": pixConn.oAuthTokens['oauth_token']});

        pixConn.httpReq = new XMLHttpRequest();
        pixConn.httpReq.open("POST", pixConn.getOAuthAccessTokenUrl, false);
        pixConn.httpReq.setRequestHeader('User-Agent', 'Mozilla/5.0');
        pixConn.httpReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        pixConn.httpReq.setRequestHeader('POST', pixConn.getOAuthAccessTokenUrl + ' HTTP/1.1');
        pixConn.httpReq.setRequestHeader('Authorization', message.authHeader);
        pixConn.httpReq.send();
        if (pixConn.httpReq.status == 200){
            pixConn.parseRequestToken(pixConn.httpReq.responseText);
            pixConn.oAuthTokens['getAccessToken'] = true;
            return true;
        }
        return false;
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
    oAuthLogin : function() {
        alert('a');
        var message = pixConn.getOAuthInfo('POST', pixConn.getOAuthTokenUrl, '', {}),
            signature = OAuth.getParameter(message.parameters, 'oauth_signature');

        pixConn.httpReq = new XMLHttpRequest();
        pixConn.httpReq.open("POST", pixConn.getOAuthTokenUrl, false);
        pixConn.httpReq.setRequestHeader('User-Agent', 'Mozilla/5.0');
        pixConn.httpReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        pixConn.httpReq.setRequestHeader('POST', pixConn.getOAuthTokenUrl + ' HTTP/1.1');
        pixConn.httpReq.setRequestHeader('Authorization', message.authHeader);
        var params = 'oauth_signature=' + encodeURIComponent(Base64.encode(signature));
        pixConn.httpReq.send(params);
            alert(pixConn.httpReq.status);
        if (pixConn.httpReq.status == 200){
            pixConn.parseRequestToken(pixConn.httpReq.responseText);
            alert(pixConn.oAuthTokens["xoauth_request_auth_url"]);
            setTimeout(function () {
                var tab = gBrowser.addTab(pixConn.oAuthTokens["xoauth_request_auth_url"]);
                tab.addEventListener('load', function (event) {
                    gBrowser.selectedTab = tab;
                    var code = gBrowser.contentDocument.getElementById('oauth_verifier').innerHTML;
                    gBrowser.removeTab(tab);
                    alert(code);
                }, false);
            }, 100);
            //alert(pixConn.httpReq.responseText);
        }
    },
};
