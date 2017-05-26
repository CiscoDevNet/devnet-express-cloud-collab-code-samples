
/**
 * constructor for palettes session
 * private - used by startSession below
 * @constructor
*/
function Palettes(hostUrl, service) {
    service._link = hostUrl + service._link
    this.service = service;
    Palettes.log("creating session for service :");
    Palettes.logify(service);
}

/* logging verbosity - a class variable */
Palettes.verbose = false;

/**
 * set verbose logging mode
 * @param {!boolean} verbose - flag to switch on logging to console
 */
Palettes.setVerbose = function(verbose) {
    Palettes.verbose = verbose;
}

/**
 * error callback
 * @callback Palettes~errorCallback
 * @param {string} errorMessage
 */

/**
 * initialisation callback
 * @callback Palettes~initCallback
 * @param {Object} palettes object
 */

/**
 * initialise Palettes - the callback will be passed the created palettes object
 * @param {!string} hostUrl the host url (e.g. http://palettes.example.com:8080)
 * @param {!string} applicationId the id of the application
 * @param {!string} serviceName the service name
 * @param {?Palettes~initCallback} handler callback function on success
 * @param {?Palettes~errorCallback} errHandler function called on error
 */
Palettes.init = function(hostUrl, applicationId, serviceName, handler, errHandler) {
    if (hostUrl == undefined) throw new Error("hostUrl must be specified");
    if (applicationId == undefined) throw new Error("applicationId must be specified");
    if (serviceName == undefined) throw new Error("serviceName must be specified");
    var listProcessor = function(serviceList) {
        if (serviceList.length != 1) {
            errHandler("wrong number of results " + serviceList.length);
            return;
        }
        var palettes = new Palettes(hostUrl, serviceList[0]);
        handler(palettes);
    };
    var query = "applicationId=" + applicationId + "&serviceName=" + serviceName;
    Palettes.getServiceList(hostUrl, query, listProcessor, errHandler); 
}

/**
 * get callback with list of service descriptors
 * only for internal tools
 * @private
 */
Palettes.getServiceList = function(hostUrl, query, handler, errHandler) {
        var resultProcessor = function(data) {
            if (data._type != "list:servicedescriptor") {
                errHandler("unexpected data type: " + data._type);
                return;
            }
            handler(data.values);
        };
        query = (query == undefined ? "" : query + "&") + "protocolVersion=1";
        var url = hostUrl + "/palettes_server/service?" + query;
        Palettes.ajax_send(url, "GET", undefined, resultProcessor, errHandler, false);
}

/**
 * @callback Palettes~dataCallback
 * @param {Object} result name/value pairs
 */

/**
 * perform operation to retrieve data from callcenter
 * callback will have name/value pairs passed as parameter
 * @param {string} dataSource the data source
 * @param {Object} values a set of name/value pairs to pass as input
 * @param {?Palettes~dataCallback} handler callback function to receive result
 * @param {?Palettes~errorCallback} errHandler function to call on error
 */
Palettes.prototype.retrieveData = function(dataSource, values, handler, errHandler) {
        var data = { "_type": "map", "values" : values };
        var url = this.service._link + "/" + encodeURIComponent(dataSource);
        Palettes.ajax_send(url, "POST", data, handler, errHandler, false);
}

/**
 * called to indicate operation succeeded
 * @callback Palettes~successCallback
 */
    
/**
 * perform operation to set call context data 
 * callback indicates successful completion
 * @param {string} route the route to use for the call
 * @param {!string} key the key to use for accessing the data
 * @param {Object} values a set of name/value pairs to pass as input
 * @param {?Palettes~successCallback} handler callback function on success
 * @param {?Palettes~errorCallback} errHandler function to call on error
 */
Palettes.prototype.setContextData = function(route, key, values, handler, errHandler) {
        var data = { "_type": "keyedMap", "key" : key, "values" : values };
        var url = this.service._link + "/" + encodeURIComponent(route);
        Palettes.ajax_send(url, "POST", data, handler, errHandler, false);
}

/**
 * end the current session
 */
Palettes.prototype.endSession = function() {
        Palettes.ajax_send(this.service._link, "DELETE", undefined, undefined, undefined, false);
}

/**
 * log a message
 * @param {!string} msg the message
 */
Palettes.log = function(msg) {
     if (console && console.log && Palettes.verbose) console.log(msg);
}

/**
 * convert an object to JSON and log it
 * @param {!Object} obj the object
 */
Palettes.logify = function(obj) {
        Palettes.log(JSON.stringify(obj, undefined, " "));
}
    
/**
 * send an ajax http request
 * @private
 */
Palettes.ajax_send = function(url, method, data, callback, errHandler, sync) {
    var ajaxObj;
    try {
        ajaxObj = new ActiveXObject('Msxml2.XMLHTTP')
    } catch (e1) {
        try {
            ajaxObj = new ActiveXObject('Microsoft.XMLHTTP')
        } catch (e2) {
            ajaxObj = new XMLHttpRequest()
        }
    }
    try {
        ajaxObj.open(method, url, sync);
        ajaxObj.onreadystatechange = function() {
            if (ajaxObj.readyState == 4) {
                if (ajaxObj.status == 200)  {
                    if (callback) {
                        try {
                            callback(JSON.parse(ajaxObj.responseText));
                        } catch(e){
                            callback(undefined);
                        }
                    }
                } else {
                    if(errHandler) {
                    	try {
                        	errHandler(ajaxObj.status, JSON.parse(ajaxObj.responseText));
                    	} catch(e) {
                    		errHandler(ajaxObj.status);
                    	}
                    	
                    }
                }
            }
        };
        if (method == 'POST') {
            ajaxObj.setRequestHeader('Content-Type', 'application/json');
        }
        if(data != undefined) data = JSON.stringify(data);
        ajaxObj.send(data)
    } catch(e) {
        if(errHandler) errHandler("failed to send", e);
    }
}

