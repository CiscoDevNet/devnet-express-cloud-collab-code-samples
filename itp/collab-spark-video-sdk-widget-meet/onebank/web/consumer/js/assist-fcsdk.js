;(function() {
     
    var configuration;
    
    window.AssistFCSDK = {
        init : function(config, newCallCallback) {

            configuration = config;

            var request = new XMLHttpRequest();

            var url = "/assistserver/";
             if (configuration.getSessionToken()) {
                 if (configuration.getCorrelationId()) {
                     initUC(configuration.getSessionToken(), configuration.getCorrelationId(), newCallCallback);
                     return;
                 }
                 var postData = "type=get&targetServer=" + configuration.getTargetServer()
                     + "&originServer=" + configuration.getOriginServer()
                     + "&sessionToken=" + configuration.getSessionToken();
                 url += "session";
             } else {
                var postData = "type=create&targetServer=" + configuration.getTargetServer()
                    + "&originServer=" + configuration.getOriginServer();
                url += "consumer";
            }

            if (configuration.getUrl()) {
                url = configuration.getUrl() + url;
            }
            
            request.open("POST", url, true);
            request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

            request.onreadystatechange = function () {
                if (request.readyState == 4) {
                    if (request.status == 200) {
                        var result = JSON.parse(request.responseText);
                        var correlationId = result.address;
                        var sessionToken = result.token;
                        configuration.setSessionToken(sessionToken);
                        initUC(sessionToken, correlationId, newCallCallback);
                    }
                }
            };

            request.send(postData);
        },
        
        destroySession : function() {
        	AssistSDK.sourceWindow.console.log("Making request to destroy session.");
        	
            var request = new XMLHttpRequest();

            var url = "/assistserver/consumer";
            
            request.open("DELETE", url, true);

            request.onreadystatechange = function () {
                if (request.readyState == 4) {
                    AssistSDK.sourceWindow.console.log("Status: " + request.status + " " + request.statusText);
                	if (request.status == 200) {
                		AssistSDK.sourceWindow.console.log("Response text: " + request.responseText);
                	}
                }
            };
            
            request.send(null);
        }
    };
    
    function initUC(sessionToken, correlationId, newCallCallback) {

        UC.onInitialisedFailed = function() {
        };

        UC.onInitialised = function() {
            var call = initCall(correlationId, newCallCallback);
            call.dial(true, (configuration.getVideoMode() == "full"));
        };
        var hasLocalMedia = false;
        UC.start(sessionToken, configuration.getStunServers());
        var webcamStatus = document.getElementById('webcamStatus');
        var content = document.getElementById("content");
        if (content) {
            var contentStyle = window.getComputedStyle(content, null);
            window.resizeTo(parseInt(contentStyle.getPropertyValue("width")) + 20, parseInt(contentStyle.getPropertyValue("height")) + 120);
        }
        setTimeout(function() { // Wait a second before displaying the prompt for local media in case it has already been granted
            if (!hasLocalMedia) {
                if (webcamStatus) {
                    webcamStatus.classList.add("assist_webcam_requested");
                }
                if (content) {
                    content.classList.add("assist_with_webcam_request");
                    var contentStyle = window.getComputedStyle(content, null);
                    window.resizeTo(parseInt(contentStyle.getPropertyValue("width")) + 20, parseInt(contentStyle.getPropertyValue("height")) + 120);
                }
            }
        }, 200);
        UC.phone.onLocalMediaStream = function(localMediaStream) {
            hasLocalMedia = true;
            if (webcamStatus) {
                webcamStatus.classList.remove("assist_webcam_requested");
                webcamStatus.classList.add("assist_webcam_allowed");
            }
            if (content) {
                content.classList.remove("assist_with_webcam_request");
                var contentStyle = window.getComputedStyle(content, null);
                window.resizeTo(parseInt(contentStyle.getPropertyValue("width")) + 20, parseInt(contentStyle.getPropertyValue("height")) + 60);
            }
            document.getElementById("status").textContent = i18n.t("assistI18n:popup.status.connecting");
            try {
                AssistSDK.sourceWindow.AssistSDK.onWebcamUseAccepted();
            } 
            catch (e) {}
        };
    }
    
    function initCall(correlationId, newCallCallback) {
        var currentCall = UC.phone.createCall(configuration.getDestination());
        
        newCallCallback(currentCall, correlationId);

        return currentCall;
    }
    
    // pre-load scripts if needed
    (function() {
        var configuration = AssistConfig; // don't really want inter-module dependencies (until we formalise a better way)
        
        if (configuration.hasDestination()) {
            var baseUrl = configuration.getUrl() || "";
            AssistUtils.loadScript(baseUrl + "/gateway/adapter.js");
            AssistUtils.loadScript(baseUrl + "/gateway/fusion-client-sdk.js");
        }
    })();
    
})();