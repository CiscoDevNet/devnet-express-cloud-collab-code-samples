if(window == window.top)
{

var palettes;

var QueryString = function () {
      // This function is anonymous, is executed immediately and
      // the return value is assigned to QueryString!
      var query_string = {};
      var query = window.location.search.substring(1);
      var vars = query.split("&");
      for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
            // If first entry with this name
        if (typeof query_string[pair[0]] === "undefined") {
          query_string[pair[0]] = pair[1];
            // If second entry with this name
        } else if (typeof query_string[pair[0]] === "string") {
          var arr = [ query_string[pair[0]], pair[1] ];
          query_string[pair[0]] = arr;
            // If third or later entry with this name
        } else {
          query_string[pair[0]].push(pair[1]);
        }
      }
        return query_string;
    } ();


function selectAgentId()
{
    var agent = sessionStorage.getItem("selectedAgentId");

    if (agent) {
        console.log("LiveAssist Calling agent: " + agent);
    } else {
        console.log("LiveAssist Calling agent: agent1");
        agent = "agent1";
    }

    return agent;
}

function updateUrlWithAgentId(baseUrl)
{
    var agent = getAgentIdToAppendToUrl();
    var newUrl = baseUrl + agent;
    return newUrl;
}

function getAgentIdToAppendToUrl()
{
    var agent = sessionStorage.getItem("selectedAgentId");

    if (agent == undefined || agent == '' || agent == 'undefined')
    {
        agent = '';
    }
    else
    {
        agent = "?agent=" + agent;
    }

    return agent;
}

function loadPage(baseUrl)
{
    window.location.href = updateUrlWithAgentId(baseUrl);
}

function storeAgentIdFromUrlParam()
{
    var agent = QueryString.agent;

    if (agent == undefined || agent == '' || agent == 'undefined')
    {
        agent = '';
    }

    sessionStorage.setItem("selectedAgentId", agent);
}

function landingPageLoaded()
{
    storeAgentIdFromUrlParam();
    var baseUrl = "onebank01.html";
    var pageToLoad = updateUrlWithAgentId(baseUrl);

    window.location.href = pageToLoad;
}

function oneBankPageLoaded(currentPage)
{
    storeAgentIdFromUrlParam();

    var loggedIn = sessionStorage.getItem("loggedIn");

    if (loggedIn != undefined && loggedIn == "true")
    {
        // Customer has already logged in
        sessionStorage.setItem("currentPage", currentPage);

        var customerName = sessionStorage.getItem("customerName");
        document.getElementById('loginUsername').value = customerName;

        var bcrumbs = sessionStorage.getItem("breadcrumbs");
        bcrumbs = bcrumbs + " > " + currentPage;
        sessionStorage.setItem("breadcrumbs", bcrumbs);
    }
}

function handleLoginFormKeyPress(event, currentPage)
{
    var key = event.keyCode || event.which;

    if (key == 13)
    {
        // Enter pressed
        customerLogin(currentPage);
    }
}

function customerLogin(currentPage)
{
    var customerName = document.getElementById('loginUsername').value;

    if (customerName != "alice" && customerName != "bob")
    {
        alert ("Please login with a valid user (alice or bob) before continuing");
        return false;
    }

    var numbers = {"alice":"02920005319", "bob":"+17418629875"};
    number = numbers[customerName];

    sessionStorage.clear();

    sessionStorage.setItem("loggedIn", true);
    sessionStorage.setItem("startTime", new Date());
    sessionStorage.setItem("currentPage", currentPage);
    sessionStorage.setItem("customerName", customerName);
    sessionStorage.setItem("number", number);
    sessionStorage.setItem("breadcrumbs", currentPage);
    sessionStorage.setItem("requiredAssistance", "");

    storeAgentIdFromUrlParam();

    Palettes.setVerbose(true);

    alert ("Successfully logged in as: " + customerName);
}

function unsupportedOperation()
{
    alert ("No action will be performed by this OneBank demo application");
}

function makeCall(requiredAssistance, agentToContact)
{
    var loggedIn = sessionStorage.getItem("loggedIn");

    if (loggedIn == undefined || loggedIn == '' || loggedIn == "false")
    {
        alert ("There is no user logged in. Please login before requesting contact with an agent.");
        return false;
    }

    var startTime = sessionStorage.getItem("startTime");

    var startTimeDecoded = new Date(startTime).getTime();

    var diff = Math.round((new Date().getTime() - startTimeDecoded) / 1000);
    var min = Math.floor(diff / 60);
    var sec = diff % 60;
    if((sec+"").length < 2) sec = "0"+sec;

    var sessionTime = min+"-"+sec;
    sessionStorage.setItem("sessionTime", sessionTime);

    sessionStorage.setItem("requiredAssistance", requiredAssistance);
    sessionStorage.setItem("agentToContact", agentToContact);

    sendToPalettes();
}

function sendToPalettes(){
    var url = "/assistserver/consumer?targetServer=" + getEncodedServerAddr();
    var request = new XMLHttpRequest();

    request.open("POST", url, true);
    request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            if (request.status == 200) {
                var result = JSON.parse(request.responseText);
                var token = result.token;
                var cid = result.address;

                sessionStorage.setItem("assistToken", token);
                sessionStorage.setItem("customerAni", cid);

                var info = collatePalettesData();
                var customerName = sessionStorage.getItem("customerName");

                Palettes.init("", "onebank-serviceconfig", "main", handleInit, handleError); // initialise palettes
                palettes.setContextData("main", cid, info, handleResult, handleError);
            }
        }
    };

    request.send();
}

function collatePalettesData()
{
    var customerAni = sessionStorage.getItem("customerAni");
    var currentPage = sessionStorage.getItem("currentPage");
    var customerName = sessionStorage.getItem("customerName");
    var sessionTime = sessionStorage.getItem("sessionTime");
    var requiredAssistance = sessionStorage.getItem("requiredAssistance");
    var number = sessionStorage.getItem("number");
    var bcrumbs = sessionStorage.getItem("breadcrumbs");
    var agentToContact = sessionStorage.getItem("agentToContact");

    var info = {"username" : customerName};
    info["ANI"] = customerAni;
    info["sessionTime"] = sessionTime;
    info["currentPage"] = currentPage;
    info["requiredAssistance"] = requiredAssistance;
    info["breadcrumbs"] = bcrumbs;
    info["agentToContact"] = agentToContact;

    return info;
}

function handleInit(palettesObj) {
    palettes = palettesObj;
}

this.handleResult = function(result) {
    console.log("Palettes data successfully submitted");

    var agentId = selectAgentId();
    var token = sessionStorage.getItem("assistToken");

    AssistSDK.startSupport({ destination: agentId, sessionToken: token });
}

function handleError(msg, e)
{
    if (e != undefined) msg = msg + " exception " + e

    if (msg == "wrong number of results 0")
    {
        msg = "Unable to determine any configured Palettes services";
    }

    alert("Error: " + msg);
}

function getEncodedServerAddr() {
    var protocol = window.location.protocol;
    var port = window.location.port;
    var hostname = window.location.hostname;

    var urlToEncode;
    if (port === "") {
        urlToEncode = protocol + "//" + hostname;
    } else {
        urlToEncode = protocol + "//" + hostname + ":" + port;
    }

    return encodeURIComponent(OneBankUtils.Base64.encode(urlToEncode));
}






window.OneBankUtils = {
    /**
     *
     *  Base64 encode / decode
     *  http://www.webtoolkit.info/
     *
     **/
    Base64 : {
    // private property
        _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

    // public method for encoding
        encode : function (input) {
            var output = "";
            var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            var i = 0;

            input = utf8_encode(input);

            while (i < input.length) {

                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);

                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;

                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }

                output = output +
                    this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                    this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

            }

            return output;

            function utf8_encode(string) {
                string = string.replace(/\r\n/g,"\n");
                var utftext = "";

                for (var n = 0; n < string.length; n++) {

                    var c = string.charCodeAt(n);

                    if (c < 128) {
                        utftext += String.fromCharCode(c);
                    }
                    else if((c > 127) && (c < 2048)) {
                        utftext += String.fromCharCode((c >> 6) | 192);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
                    else {
                        utftext += String.fromCharCode((c >> 12) | 224);
                        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
                }
                return utftext;
            }
        }
    }
}


}
