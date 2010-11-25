
var api = pixapi.init({key: oauth_consumer_key, secret: oauth_consumer_secret}),

    Cc = Components.classes,
    Ci = Components.interfaces,
    Cr = Components.results,

    prefManager       = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.pixImgUploader."),
    alertsService     = Cc["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService);

window.addEventListener('load', function () {

    var choosealbum = document.getElementById('choosealbum'),
        logout      = document.getElementById('logout');
    
    function loggedout() {
        window.close();
    }
    function loggedin() {
        login.style.display = 'block';
        logout.style.display = 'none';
        choosealbum.style.display = 'none';
    }

    choosealbum.addEventListener('click', function () {
        window.open('chrome://pixImgUploader/content/aidselector.xul', '', 'chrome,centerscreen');
        window.close();
    }, false);

    logout.addEventListener('click', function () {
        api.logout();
        alertsService.showAlertNotification("",  "Logout", "Logout Complete");
        loggedout();
    }, false);

    if (!api.isLogin()) {
        setTimeout(function () {
            var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                    .getService(Components.interfaces.nsIWindowMediator),
                browserWindow = wm.getMostRecentWindow("navigator:browser");

            alert('Please login First');
            browserWindow.pixImgUploader.login();
            loggedout();
        }, 25);
    }

}, false);
