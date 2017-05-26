function getParameterByName(haystack, name)
{
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(haystack);
    if(results == null)
    {
        return "";
    } 
    else
    {
        return decodeURIComponent(results[1].replace(/\+/g, " "));
    }
}

function getCookie(c_name)
{
    var cookies = document.cookie.split(";");
    
    for (var i = 0; i < cookies.length; i++)
    {
    	var cookie = cookies[i]; 
    	
        var name = cookie.substr(0, cookie.indexOf("="));
        name = name.replace(/^\s+|\s+$/g, "");
        
        if (name == c_name)
        {
        	var value = cookie.substr(cookie.indexOf("=") + 1);
            return unescape(value);
        }
    }
}