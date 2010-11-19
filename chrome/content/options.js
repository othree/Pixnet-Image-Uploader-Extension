
var oauth_consumer_key = '3f8d7aab86452992b12a0cb0d6b805ab',
    oauth_consumer_secret = 'c31ce58e4267489ec00bc0fc4a366fa9',

    api = pixapi.init({key: oauth_consumer_key, secret: oauth_consumer_secret}),

    Cc = Components.classes,
    Ci = Components.interfaces,
    Cr = Components.results,

    prefManager       = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.pixImgUploader."),
    alertsService     = Cc["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService);

window.addEventListener('load', function () {

    var choosealbum = document.getElementById('choosealbum'),
        logout      = document.getElementById('logout'),
        login       = document.getElementById('login');
    function loggedout() {
        window.close();
    }
    function loggedin() {
        login.style.display = 'block';
        logout.style.display = 'none';
        choosealbum.style.display = 'none';
    }

    choosealbum.addEventListener('click', function () {
        window.open('chrome://pixImgUploader/content/aidselector.xul', '', 'chrome');
    }, false);

    logout.addEventListener('click', function () {
        api.logout();
        alertsService.showAlertNotification("",  "Logout", "Logout Complete");
        loggedout();
    }, false);

    login.addEventListener('click', function () {
        api.login(loggedin);
    }, false);

    if (!api.isLogin()) {
        loggedout();
    }

}, false);
