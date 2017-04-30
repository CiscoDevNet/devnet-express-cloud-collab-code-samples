// Example of a POST request sent from the Tropo scripting platform
// Note that this example comes from : https://support.tropo.com/hc/en-us/articles/206241213-REST-POST-and-GET-in-each-Scripting-language
// 
// Quick setup : 
//   - go to http://requestb.in and create a new POST bin
//   - create a tropo scripting application pointing to this code 
//          https://raw.githubusercontent.com/CiscoDevNet/devnet-express-cloud-collab-code-samples/master/sd/collab-tropo-request-external-data-sd/tropo-post-request.py
//   - invoke the tropo application via its text or voice token URL
//         do not forget to add a requestBinId query parameter 
//         ex : https://api.tropo.com/1.0/sessions?action=create&token=XXXXXXXXXXXXXXXX&requestBinId=1k6xjg51
//
function post(url, options) {
    if(options.query) {
        url += "?";
        var delimiter = "";
        for(var propName in (options.query||{})) {
            url += (delimiter + (propName + "=" + escape(options.query[propName])));
            delimiter = "&";
        }
    }
    log("TROPO_POST_JS: posting to: " + url);
    var code;

    var body = options.body;
    if(body == null) {
        throw {message:"Body is required"};
    }

    try {

        // Open Connection
        var connection = new java.net.URL(url).openConnection();

        // Set timeout
        var timeout = options.timeout != null ? options.timeout : 10000;
        connection.setReadTimeout(timeout);
        connection.setConnectTimeout(timeout);

        // Method == POST
        connection.setRequestMethod("POST");

        // Set Content Type
        var contentType = options.contentType != null ? options.contentType : "text/plain";
        connection.setRequestProperty("Content-Type", contentType);

        // Set User Agent
        if (options.userAgent) {
            connection.setRequestProperty("User-Agent", options.userAgent);
        }
        
        // Set Content Length
        connection.setRequestProperty("Content-Length", body.length);

        // Silly Java Stuff
        connection.setUseCaches (false);
        connection.setDoInput(true);
        connection.setDoOutput(true); 

        //Send Post Data
        log("TROPO_POST_JS: writing body: " + body);
        var bodyWriter = new java.io.DataOutputStream(connection.getOutputStream());
        bodyWriter.writeBytes(body);
        bodyWriter.flush ();
        bodyWriter.close (); 

        log("TROPO_POST_JS: reading response");

        code = connection.getResponseCode();
    }
    catch(e) {
        throw {message:("Socket Exception or Server Timeout: " + e), code:0};
    }
    
    log("TROPO_POST_JS: read response code: " + code);
    if(code < 200 || code > 299) {
        throw {message:("Received non-2XX response: " + code), code:code};
    }
    log("TROPO_POST_JS: reading response contents");

    var is = null;
    try {
        is = connection.getInputStream();
        var contents = new String(org.apache.commons.io.IOUtils.toString(is));
        log("TROPO_POST_JS: read response contents: " + contents);
        return contents;
    }
    catch(e) {
        log("TROPO_POST_JS: failed to read server response");
        throw {message:("Failed to read server response"), code:0};
    }
    finally {
        try {if(is != null)is.close();} catch (err){}
        log("TROPO_POST_JS: post call completed");
    }
}

log("TROPO_POST_JS: before post");

// the 2nd argument is a map of options
// - the body property will be sent to RequestBin in plain text
// - the userAgent property is mandatory when posting to RequestBin. No userAgent would return a 403 (Unauthorized).
var response = post("http://requestb.in/" + requestbinId, { body : "Hello from Tropo", userAgent : "curl/7.51.0"});

log("TROPO_POST_JS: after post");