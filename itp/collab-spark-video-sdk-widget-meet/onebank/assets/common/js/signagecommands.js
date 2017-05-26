SignageCommands =
{
	highlightElement: function(params)
	{
		var id = params[0];
		
		var element = getJqForId(id);

		element.fadeOut('fast', function()
		{ 
			element.fadeIn('fast', function()
		    {
				element.fadeOut('fast', function()
		    	{ 
					element.fadeIn('fast', function()
		    	    {
						element.fadeOut('fast', function()
		    	    	{ 
							element.fadeIn('fast'); 
		    	    	}); 
		    	    });
		    	});
		    });
		});
	},

	pulseElement: function(params)
	{
		SignageCommands.highlightElement(params);
	},
	
	clickElement: function(params)
	{
		var id = params[0];
		
		var aUnder = $("a", getJqForId(id))[0];
		
		if(aUnder != null)
		{
			aUnder.click();
			//var aUnderHref = $(aUnder).attr('href');
			//window.location.href = aUnderHref;
			return;
		}
		
		var to = getJqForId(id).closest("a").attr('href');
		
		if(to != null)
		{   
			to.click();
		    //window.location.href = to;
		}
	}
};

function getJqForId(id)
{
	return $("#" + id);
}
