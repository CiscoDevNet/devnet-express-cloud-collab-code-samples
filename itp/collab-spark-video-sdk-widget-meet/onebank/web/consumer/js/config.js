;(function() {
    
    var SESSION_DATA_NAME = "assist-session-config";
    var storage = localStorage || false;

    window.AssistConfig = (function() {
    	
    	if (window.config) {
    		return new Config(window.config);
    	}
    	
        var configuration = storage.getItem(SESSION_DATA_NAME);
         
        if (configuration !== false || configuration !== "false") {
            return new Config(JSON.parse(configuration));
        } else {
            return false;
        }
    })();
    
    function Config(configuration) {
        this.hasVideo = function() {
            if ("correlationId" in configuration || configuration.videoMode == "none") {
                return false;
            }
            return true;
        };
        
        this.hasAudio = function() {
            if ("correlationId" in configuration) {
                return false;
            }
            return true;
        };
        
        this.hasDestination = function() {
            if ("destination" in configuration) {
                return true;
            }
            return false;
        };

        this.getSessionToken = function() {
            return configuration.sessionToken;
        };

        this.setSessionToken = function(sessionToken) {
            if (sessionToken && !configuration.sessionToken) {
                configuration.sessionToken = sessionToken;
            }
        };

        this.getDestination = function() {
            return configuration.destination;
        };
        
        this.getUrl = function() {
            return configuration.url;
        };
        
        this.getCorrelationId = function() {
            return configuration.correlationId;
        };
        
        this.setCorrelationId = function(correlationId) {
            configuration.correlationId = correlationId;
        };
        
        this.getVideoMode = function() {
            return configuration.videoMode || "full";
        };
        
        this.getStunServers = function() {
            return configuration.stunservers;
        };
        
        this.getTargetServer = function() {
            return getEncodedServerAddr(this.getUrl());
        };
        
        this.getOriginServer = function() {
            return getEncodedServerAddr();
        };
        
        this.getConnectionEstablished = function() {
        	return configuration.connectionEstablished;
        };
        
        this.unset = function() {
            if (storage) {
                storage.removeItem(SESSION_DATA_NAME);
            }
        }
        
        ;(function init() {
     
        })();
    }
    
    function getEncodedServerAddr(url) {
        var protocol = window.location.protocol;
        var port = window.location.port;
        var hostname = window.location.hostname;

        var urlToEncode;
        if (url == null) {
            if (port === "") {
                urlToEncode = protocol + "//" + hostname;
            } else {
                urlToEncode = protocol + "//" + hostname + ":" + port;
            }
        } else {
            urlToEncode = url;
        }

        return encodeURIComponent(AssistUtils.Base64.encode(urlToEncode));
    }
})();