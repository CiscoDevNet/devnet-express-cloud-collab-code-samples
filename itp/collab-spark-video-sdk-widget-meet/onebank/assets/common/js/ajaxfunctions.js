// Ajax page-load utility methods
function switchCss(cssFile, loadIntoDoc)
{
	var html = $(loadIntoDoc).children();
	var head = html.children("head");

	var oldlink = $("#css-swappable", head);

    var newlink = $("<link></link>",
        {
    	    rel  : "stylesheet",
    	    type : "text/css",
    	    id   : "css-swappable",
    	    href : cssFile });
    
    oldlink.detach();
        
    newlink.appendTo(head);
}

function loadBody(data, loadIntoDoc, session)
{
	var ajaxParam = "&ajax=true";
	  
	var page = "";
	
	if(data == undefined || data == null || data.length == 0)// || data.page == null)
	{
	    // Make this the first parameter
		ajaxParam = "?ajax=true";	
	}
	else
	{
		page = data;
	}
	
	$.ajax(window.location + page + ajaxParam,
   	    {
   		    success:function(data, textStatus, jqXHR)
   		    {   		    	
   		        var datajson = eval("(" + data + ")");
   		        
   		        var cssfile = datajson.css;
   		        
   		        switchCss(cssfile, loadIntoDoc);
   		        
   		        loadJs(datajson.script);
   		        
   		        var content = datajson.content;
   		        
   		        var ext = $("#extents", loadIntoDoc)[0];
   		        ext.innerHTML = content;
   		        
                ajaxifyLinks(loadIntoDoc, session);
                                
                var updates = {};
                
                // TODO - This does not need to be updated frequently. Move it to just after Unity.init
                updates.page = window.location.href;
                
                updates.menu = page.substring(page.indexOf("=") + 1);
                		    	
   		    	Unity.submitUpdates(session, updates);
   		    }
   	    });
}

function ajaxifyLinks(loadIntoDoc, session)
{	
	if(loadIntoDoc.defaultView != window.top)
	{
		// TODO Temporary hack - submenus are broken
	    // We are in a frame. Links must do nothing
		$(loadIntoDoc).find(".option a").click(function()
	    { return false; });  	
	}
	else
	{
        $(loadIntoDoc).find(".option a").click(function()
        {  	
    	    // If there is a callback, run it and clear it
        	if(Ajax.onNavigateAway != null)
        	{
        		Ajax.onNavigateAway();    		
    		    Ajax.onNavigateAway = null;
    	    }
    	
         	var link = $(this).attr("href");
    	    	
     	    loadBody(link, loadIntoDoc, session);
    	    	
     	    return false;
        });
	}
}

function loadJs(file)
{
	if(file == "")
	{
		//  Nothing to do here
	    return;	
	}

	$.ajax(
	    {
	        type: "GET",
            url: file,
            dataType: "script"
            	// TODO Do we need to pass in the document and use it as context for the callback? Is context even valid in this case?
        });  
}