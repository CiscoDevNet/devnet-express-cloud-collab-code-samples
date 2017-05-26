 ;(function() {
    
    var SESSION_DATA_NAME = "assist-session-config";
    
    var CONTROLLER_NAME = "assist-sdk";
    var CONTROLLER_PATH = "assets/assist.html";
    var CONTROLLER_WIDTH = "300";
    var CONTROLLER_HEIGHT = "100";
    
    var storage = localStorage || false;
    var sdkPath;
    var controllerWindow;
    
    function getOverriddenFunctions(global, funcName) {
        if (global && global[funcName]) {
            return global[funcName];
        }
        
        return function() {};
    }
    
    var onConnectionEstablishedCallback = getOverriddenFunctions(window.AssistSDK, "onConnectionEstablished");
    var onInSupportCallback = getOverriddenFunctions(window.AssistSDK, "onInSupport");
    var onWebcamUseAcceptedCallback = getOverriddenFunctions(window.AssistSDK, "onWebcamUseAccepted");
    var onEndSupportCallback = getOverriddenFunctions(window.AssistSDK, "onEndSupport");
    
    window.AssistSDK = {
        
        startSupport : function(configuration) {
            if (isObject(configuration) == false) {
                configuration = { "destination": configuration };
            }
            
            if (!configuration.url) { // if no url param present, use path SDK (this file) was loaded from
                var sdkPath = getSDKPath(configuration);
                
                var tmp = document.createElement("a");
                tmp.href = sdkPath;
                
                var port = (tmp.port) ? ":" + tmp.port : "";
                
                configuration.url = tmp.protocol + "//" + tmp.hostname + port; // even if proto/port aren't specified, we should get the defaults
            }
            
            setSessionData(configuration);
            onDocumentReady(function() {
                if (controllerWindow && controllerWindow.closed == false) { // if popup is active, don't start another session
                    return;
                }
                
                start(configuration);
            });    
        },
        
    	isBrowserSupported : function() {
        	var browser = getBrowser();
        	var version = getBrowserVersion();
        	console.log("Browser: " + browser + " " + version);
    		if (browser == "Chrome")
    			return version >= 33;
    		if (browser == "Firefox")
    			return version >= 28;
    		return false;
    	},
        
        endSupport : function() {
            if (controllerWindow && controllerWindow.AssistSDK) {
                controllerWindow.AssistSDK.endSupport();
            }
        },
    	
    	isVideoSupported : function() {
    		if (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia ||
    			navigator.msGetUserMedia)
    		{
    			return true;
    		}
    		return false;
    	},
        
        onConnectionEstablished : onConnectionEstablishedCallback,
        onInSupport : onInSupportCallback,
        onWebcamUseAccepted : onWebcamUseAcceptedCallback,
        onEndSupport : onEndSupportCallback
    };
    
    ;(function init() {
        setSDKPath();
                
        if (getSessionData()) {
            reconnectController(function(success) {
                if (success == false) {
                   removeSessionData();
               }
           });
        }
    })();
    
    function onDocumentReady(callback) {
        if (document.readyState === "complete") {
            callback();
        } else {
            window.addEventListener("DOMContentLoaded", callback, false);
        }
    }
    
    function isPopupOpen(win) {
    	return (typeof win !== 'undefined' && typeof win.AssistSDK !== 'undefined');
    }
    
    function start(configuration) {
        controllerWindow = window.open("", CONTROLLER_NAME, "width=" + CONTROLLER_WIDTH + ",height=" + CONTROLLER_HEIGHT);
        
        setTimeout(function() {
        	if (!isPopupOpen(controllerWindow)) {
            	if (configuration.popupBlocked != null) {
            		configuration.popupBlocked();
            	} else {
            		popupBlockedDefaultHandler(configuration);
            	}
            	return;
        	}
        }, 2500);
        
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function() {
        	if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
        		var xmlDoc = new DOMParser().parseFromString(xmlHttp.responseText, "text/html");
        		xmlDoc.getElementsByTagName("base")[0].href = getSDKPath(configuration);
        		if (typeof configuration.locale !== "undefined" && configuration.locale !== null) {
            		xmlDoc.getElementById("lang").textContent = "var lang='" + configuration.locale + "';";
            	}
        		if (configuration.popupCssUrl != null) {
        			xmlDoc.getElementById("Assist-popup-CSS").setAttribute("href", configuration.popupCssUrl);
        		}
        		controllerWindow.document.write("<!DOCTYPE html>\n" + xmlDoc.documentElement.outerHTML);
        		controllerWindow.document.close();
        		controllerWindow.config = configuration;
        	}
        }
            
        xmlHttp.open("GET", getSDKPath(configuration) + CONTROLLER_PATH, true);
        xmlHttp.send();
    }
    
    function setSessionData(val) {
        if (storage) {
            storage.setItem(SESSION_DATA_NAME, JSON.stringify(val));
        }
    }
		
    function removeSessionData() {
        if (storage) {
            storage.removeItem(SESSION_DATA_NAME);
        }
    }
    
    function getSessionData() {
        if (storage) {
            var val = storage.getItem(SESSION_DATA_NAME);
            if (val) {
                return JSON.parse(val);
            }
        }
        
        return false;
    }
    
    function reconnectController(callback) {

        onDocumentReady(function() {
            controllerWindow = window.open("", CONTROLLER_NAME);
            if (controllerWindow && controllerWindow.location.hostname == "") { // popup doesn't exist, can't reconnect
                controllerWindow.close();
                controllerWindow = null;
                removeSessionData();
                
                callback(false);
                return;
            }
            
            try {
                controllerWindow.AssistSDK.reconnect(window);
            } catch(e) {
                controllerWindow = null;
                removeSessionData();
                callback(false);
                return;
            }
            
            try {
                AssistSDK.onInSupport();
            } 
            catch(e) {}
            
            callback(true);
            return;
        });
        
        return;
    }
    
    function setSDKPath() {
        try {
            var scripts = document.getElementsByTagName('script');
            var src = scripts[scripts.length - 1].src; // last script should be us
            var path = src.substring(0, src.lastIndexOf("/") + 1); 
            var file = src.substring(src.lastIndexOf("/") + 1, src.length);

            if (file == "assist.js") { // need this check in case we've been uglified into some other script loader
                sdkPath = path;
            }
            
        } catch (e) {
        }
    }
    
    function getSDKPath(configuration) {
        if (configuration.sdkPath) {
            return configuration.sdkPath + "/";
        } else if (sdkPath) {
            return sdkPath;
        } else {
            return "assistsdk/"; // assume local
        }
    }
    
    function isObject(config) {
        if (typeof config === 'string') {
            return false;
        } else {
            return true;
        }
    }
    
    function popupBlockedDefaultHandler(configuration) {
    	var sdkPath = getSDKPath(configuration);
        loadCSS(document, sdkPath + "css/failure.css", "ASSIST-CSS");

        var assistNS = 'assistI18n';
        // TODO: renniks to review this
        if (typeof i18n === "undefined" || i18n === null) {
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.src = sdkPath + "../shared/js/thirdparty/i18next-1.7.4.min.js";
            document.body.appendChild(script);
            addAlertDiv(true, sdkPath);
        } else {
            var lang = getLocale();
            var langParts = lang.split("-");
            loadI18n(lang, langParts.length == 1);
            if (langParts.length > 1) {
                loadI18n(langParts[0], langParts[0] == "en");
            }
            if (langParts[0] != "en") {
                loadI18n("en", true);
            }
            addAlertDiv(false);
        }
        
        function addAlertDiv(initI18n, sdkPath) {
            if (typeof i18n !== "undefined" && i18n !== null) {
                if (initI18n) {
                    var lang = getLocale();
                    i18n.init({useCookie: false, ns:{namespaces:['assistI18n']}, lng:lang, fallbackLng: 'en', resGetPath: sdkPath + '../shared/locales/__ns__.__lng__.json'},
                            function(){addAlertDiv(false)});
                } else {
                	var div = document.createElement("div");
                	div.id = "popup-blocked-alert";
                	div.innerHTML = i18n.t("assistI18n:error.popupBlocked");
                	document.body.appendChild(div);
                }
            } else {
                setTimeout(function(){addAlertDiv(initI18n, sdkPath);}, 1000);
            }
        }
        
        function getLocale() {
            var lang = "en";
            if (typeof configuration.locale !== "undefined" && configuration.locale !== null) {
                lang = configuration.locale;
            }
            return lang;
        }

        function loadI18n(lang, addAlert) {
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.onreadystatechange = function() {
                if (xmlHttp.readyState == 4) {
                    if (xmlHttp.status == 200) {
                        var extraResources = JSON.parse(xmlHttp.responseText);
                        i18n.addResourceBundle(lang, assistNS, extraResources);
                    }
                    if (addAlert) {
                        addAlertDiv(false);
                    }
                }
            }
                
            xmlHttp.open("GET", getSDKPath(configuration) + '../shared/locales/' + assistNS + '.' + lang + '.json', true);
            xmlHttp.send();
        }
    }
    
    function loadCSS(document, url, id) {            
        var link = document.createElement("link");
        
        if (id) {
            link.id = id;
        }
        
        link.setAttribute("rel", "stylesheet");
        link.setAttribute("type", "text/css");
        link.setAttribute("href", url);
        document.getElementsByTagName("head")[0].appendChild(link);
    }
    
	//This method adapted from code at http://stackoverflow.com/questions/5916900/detect-version-of-browser
    function getBrowser() {
        var ua=navigator.userAgent,tem,M=ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || []; 
        if(/trident/i.test(M[1])){
            return 'IE';
        }   
        if(M[1]==='Chrome'){
            tem=ua.match(/\bOPR\/(\d+)/)
            if(tem!=null)   {return 'Opera';}
        }   
        M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
        if((tem=ua.match(/version\/(\d+)/i))!=null) {M.splice(1,1,tem[1]);}
        return M[0];
    }
    
	//This method adapted from code at http://stackoverflow.com/questions/5916900/detect-version-of-browser
	function getBrowserVersion() {
	    var ua=navigator.userAgent,tem,M=ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];                                                                                                                         
	    if(/trident/i.test(M[1])){
	        tem=/\brv[ :]+(\d+)/g.exec(ua) || [];
	        return (tem[1]||'');
	    }
	    if(M[1]==='Chrome'){
	        tem=ua.match(/\bOPR\/(\d+)/)
	        if(tem!=null)   {return tem[1];}
	    }   
	    M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
	    if((tem=ua.match(/version\/(\d+)/i))!=null) {M.splice(1,1,tem[1]);}
	    return M[1];
	}
	
 })();