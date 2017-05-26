// This file is used to manage ajax pageloads

Ajax = 
{
    onNavigateAway : null,
    
    sessionId : null
};

//$(document).ready(function()
//{
//	Unity.createSession(loadInitialBody(session));
//});

function loadInitialBody(session, loadIntoDoc)
{
    Ajax.sessionId = session;

    if(loadIntoDoc == undefined || loadIntoDoc == null)
    {
        loadIntoDoc = document;	
    }
    
	var html = $(loadIntoDoc).children();
	html.find("#extents").html("");

    var urlParams = "";

    // First point after the skeleton has downloaded
    if(loadIntoDoc.defaultView != window.top)
    {
        // in a frame, there will be params
        urlParams = loadIntoDoc.defaultView.location.search;
    }
    
    loadBody(urlParams, loadIntoDoc, session);        
}