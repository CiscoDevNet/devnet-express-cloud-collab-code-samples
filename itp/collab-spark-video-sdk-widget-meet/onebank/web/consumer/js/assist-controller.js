
var SESSION_DATA_NAME = "assist-session-config";
var controllerWindow;

var statusDiv = document.getElementById("status");
var screenData = {};
var observer;

window.AssistSDK = {
    sourceWindow : null,
    desination : null,
    supportDiv : null,
    video : null,
    divX : 20,
    divY : 20,
    localVideo : null,
    remoteVideo : null,
    nameDiv : null,
    currentCall : null,
    statusDiv : null,
    updateScheduled : false,
    fullWidth : 0,
    fullHeight : 0,
    glassPane : null,
    socketClosed : true,
    jQuery : null,
    loaded : false,
    cleanUpStack : new Array(),
    universalTimeout : null,
    agentPictureUrl : null,
    muted : false,
    renderVideoWindow : true,

    rootTopic : null,
    screenShareWindow : null,
    videoWindowTopic : null,
    videoWindow : null,
    cqClasses : ["no-call", "call-quality-good", "call-quality-moderate", "call-quality-poor"],
    inputTopic : null,
    inputUid : 0,
    inputElements : [],

    screenShareAllowed : false,

    startSupport : function() {      
        var config = window.AssistConfig;
        AssistSDK.sourceWindow = window.opener;

        window.onunload = function() {
            AssistSDK.endSupport();
        };
        
        if (config == false) {
            return;
        }
        
        if (config.hasVideo()) {
            if (!navigator.mozGetUserMedia && !navigator.webkitGetUserMedia) {
                alert(i18n.t("assistI18n:error.noWebRTC"));
                throw new Error("Browser does not appear to be WebRTC-capable");
            }
        }
        
        if (config.getSessionToken()) {
            AssistSDK.start(config);
        } else {
            var request = new XMLHttpRequest();

            var url = "/assistserver/consumer";
            var postData = "type=create&targetServer=" + config.getTargetServer()
                         + "&originServer=" + config.getOriginServer();

            if (config.getCorrelationId()) {
                postData = postData + "&username=" + config.getCorrelationId();
            }

            if (config.getUrl()) {
                url = config.getUrl() + url;
            }
            
            request.open("POST", url, true);
            request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

            request.onreadystatechange = function () {
                if (request.readyState == 4) {
                    if (request.status == 200) {
                        var result = JSON.parse(request.responseText);
                        var correlationId = result.address;
                        var sessionToken = result.token;
                        config.setSessionToken(sessionToken);
                        AssistSDK.start(config); 
                    }
                }
            };

            request.send(postData);
        }
    },

    allowScreenShare : function() {
        AssistSDK.screenShareAllowed = true;
        if (AssistSDK.rootTopic) {
            AssistSDK.startScreenShare();
        }
    },

    start : function(config) {
        if (config.hasDestination()) {
            console.log("Connecting with the following destination: " + config.getDestination());
            AssistSDK.connectWithAudio(config);
        }
        else {
            console.log("Connecting with following correlation ID: " + config.getCorrelationId());
            AssistSDK.connectWithoutAudio(config);
        }
    },

    log : function(message) {
        console.log(message);   
    },

    reconnect : function(source) {
    	AssistSDK.isOnRecognizedAssistPage = true;
    	if (!AssistSDK.isOnAssistPages) {
    		AssistSDK.isOnAssistPages = true;
    		AssistSDK.sendOnAssistPagesMessage();
    	}
        AssistSDK.sourceWindow = source;
        AssistSDK.createRemoteUI((AssistConfig.hasVideo() == false)); //expects "true" if no video
        AssistSDK.updateScreen(true);
    },

    endSupport : function() {
        AssistSDK.log("Unloading assist window");
        AssistConfig.unset();
        
        if (AssistSDK.glassPane != undefined) {
            AssistSDK.glassPane.parentNode.removeChild(AssistSDK.glassPane);
        }

        if (AssistSDK.currentCall != undefined) {
            if (AssistSDK.currentCall != null) {
                AssistSDK.currentCall.end();
                AssistFCSDK.destroySession();
                AssistSDK.currentCall = null;
            }
        }

        for (var index in AssistSDK.cleanUpStack) {
            AssistSDK.cleanUpStack[index]();
        }
        AssistSDK.cleanUpStack = new Array();
        
        if (AssistSDK.sourceWindow && AssistSDK.sourceWindow.AssistSDK.onEndSupport) {
            try {
                AssistSDK.sourceWindow.AssistSDK.onEndSupport();
            } 
            catch(e) {}
        }

        window.close();
    },

    displayModal : function(message) {
        var document = AssistSDK.sourceWindow.document;
        var modalContainer = document.createElement("div");
        modalContainer.id = "assist-support-rejected-modal";
        document.body.appendChild(modalContainer);

        var modal = document.createElement("div");

        modalContainer.appendChild(modal);

        var p = document.createElement("p");
        p.innerHTML = message;
        modal.appendChild(p);

        var input = document.createElement("input");
        input.type = "button";
        input.value = i18n.t("assistI18n:button.ok");
        p.appendChild(input);

        input.addEventListener("click", function(event) {
            var doc = event.target.ownerDocument;
            var modal = doc.getElementById("assist-support-rejected-modal");
            modal.parentNode.removeChild(modal);
            
        }, false);
    },

    displaySupportBusyModal : function() {
    	 AssistSDK.displayModal(i18n.t("assistI18n:notice.noAgents"));
    },
    
    setAgentName : function(agentName) {
        AssistSDK.log("Setting agentName to " + agentName);
        if (!agentName || agentName == 'undefined') {
            return;
        }

        AssistSDK.agentName = agentName;
        if (AssistSDK.nameDiv != null) {
            AssistSDK.nameDiv.firstChild.nodeValue = agentName;
        }
    },

    setAgentText : function(agentText) {
        AssistSDK.log("Setting agentText (tagline) to " + agentText);
        if (!agentText || agentText == 'undefined') {
            return;
        }
        
        AssistSDK.agentText = agentText;
        if (AssistSDK.taglineDiv != null) {
            AssistSDK.taglineDiv.firstChild.nodeValue = agentText;
        }
    },

    setAgentPicture : function(agentPictureUrl) {
        AssistSDK.log("Setting agentPictureUrl to " + agentPictureUrl);
        if (!agentPictureUrl || agentPictureUrl == 'undefined') {
            return;
        }

        AssistSDK.agentPictureUrl = agentPictureUrl;
        if ((AssistSDK.picture !== null) && (typeof AssistSDK.picture !== "undefined")) {
            AssistSDK.picture.setAttribute("src", agentPictureUrl);
        }
    },

    drawAnnotation : function() {
    },

    getAnnotationWindow : function() {
    	for (var i = 0; i < AssistSDK.screenShareWindow.children.length; i++) {
    		var child = AssistSDK.screenShareWindow.children[i];
    		if (child instanceof AnnotationWindow)
    			return child;
    	}
    	return null;
    },
    
    getSpotlightWindow : function() {
        for (var i = 0; i < AssistSDK.screenShareWindow.children.length; i++) {
    		var child = AssistSDK.screenShareWindow.children[i];
    		if (child instanceof SpotlightWindow)
    			return child;
    	}
    	return null;
    },

    clearAnnotations : function() {
        var annotationWindow = AssistSDK.getAnnotationWindow();
        if (annotationWindow != null) {
        	annotationWindow.clear(true);
        }
        
        var spotlightWindow = AssistSDK.getSpotlightWindow();
        if (spotlightWindow != null) {
            spotlightWindow.clear(true);
        }
    },

    capture : function(callback) {
        AssistSDK.log("Capture screen and send");
        html2canvas(AssistSDK.sourceWindow.document.body, callback);
    },

    updateScreen : function(force) {
        if (window == null) {
            //The connection window has already been closed; can't send the screen
            return;
        }
        var updateScheduled = AssistSDK.updateScheduled;
        if (updateScheduled == true) {
            AssistSDK.log("update already scheduled, not rendering");
            return;
        }

        if (observer != undefined) {
            if (observer != null) {
                observer.disconnect();
            }
        }

        AssistSDK.fullWidth = AssistSDK.sourceWindow.innerWidth;
        AssistSDK.fullHeight = AssistSDK.sourceWindow.innerHeight;

        AssistSDK.capture({
            onrendered : function(canvas) {
                if (AssistSDK.screenShareWindow) {
                    try {  // strip off scrollbar space
                        var clientWidth = AssistSDK.sourceWindow.document.documentElement.clientWidth;
                        var clientHeight = AssistSDK.sourceWindow.document.documentElement.clientHeight;
                        
                        if (canvas.width > clientWidth || canvas.height > clientHeight) {
                            
                            var croppedCanvas = document.createElement("canvas");
                            croppedCanvas.width = clientWidth;
                            croppedCanvas.height = clientHeight;
                            
                            var context = croppedCanvas.getContext("2d");
                            context.drawImage(canvas, 0, 0);
                            canvas = croppedCanvas;
                        }
                    }
                    catch(e) {
                    }
                    
                    AssistSDK.scheduleObserver();
                    AssistSDK.screenShareWindow.contentChanged(canvas, force);
                }
            },
            width: AssistSDK.fullWidth,
            height: AssistSDK.fullHeight,
            useCORS: true
        });
    },

    scheduleObserver : function() {
        // configuration of the observer:
        
        var config = {
            attributes : true,
            childList : true,
            characterData : true,
            subtree : true
        };

        var isChildOf = function(candidateChild, candidateParent) {
            var parentNode = candidateChild.parentNode;
            if (parentNode) {
                if (parentNode == candidateParent) {
                    return true;
                } else {
                    return isChildOf(parentNode, candidateParent);
                }
            } else {
                return false;
            }
        };

        if (observer == null || typeof observer === 'undefined') {
            AssistSDK.log("init observer");
            observer = new MutationObserver(function(mutations) {
                var rerender = true;
                for (var i = 0; i < mutations.length; i++) {
                    var mutation = mutations[i];
                    if (mutation.target == AssistSDK.supportDiv) {
                        rerender = false;
                        observer.takeRecords();
                        break;
                    }
                    if (mutation.target == AssistSDK.glassPane || isChildOf(mutation, AssistSDK.glassPane)) {
                        rerender = false;
                        observer.takeRecords();
                        break;
                    }
                }

                if (rerender == true) {
                    clearTimeout(AssistSDK.universalTimeout);
                    AssistSDK.log("do rerender (mutations)");
                    AssistSDK.universalTimeout = setTimeout(AssistSDK.updateScreen, 500);
                }

            });
        }

        console.log("scheduling observer");
        // pass in the target node, as well as the observer options
        observer.observe(AssistSDK.sourceWindow.document.body, config);
    },

    registerScrollListeners : function() {
        var eventTarget;
        var $ = AssistSDK.jQuery;
        var document = AssistSDK.sourceWindow.document;
        var window = AssistSDK.sourceWindow;
        var scroll = "scroll";
        var ns = ".assist";
        var scrollX = -1;
        var scrollY = -1;

        function doRender(event) {
            AssistSDK.log("do rerender (listeners)");
            clearTimeout(AssistSDK.universalTimeout);
            AssistSDK.universalTimeout = setTimeout(AssistSDK.updateScreen, 750);
        }

        function documentScrollCallback(event) {
        	console.log("In documentScrollCallback()");
            if (event.target == document || event.target == document.body) {
                var newScrollX = window.pageXOffset;
                var newScrollY = window.pageYOffset;

                // this is all a hack to figure out whether the scroll is legitimate or triggered
                // by html2canvas, in which case, the sum scroll will be 0 (without this we loop)
                if (scrollX != newScrollX || scrollY != newScrollY) {
                    scrollX = newScrollX;
                    scrollY = newScrollY;
                    doRender(event);
                }
                
                console.log("Clearing annotations...");
                AssistSDK.clearAnnotations();
            }
        }

        function mousewheelScroll(event) {
            // the $(document).scroll(doRender); line will catch these so don't bother
            if (event.target !== document && event.target !== document.body) {
                doRender(event);
            }
        }

        function keyDown(event) {
            switch (event.which) {
                case 33: // page up
                case 34: // page down
                case 37: // left
                case 38: // up
                case 39: // right
                case 40: // down
                    doRender(event);
                    return;
                default: return;
            }
        }

        function mouseDown(event) {
            eventTarget = event.target;
            if (event.target !== document && event.target !== document.body) {
                $(eventTarget).on(scroll + ns, function(event) {
                    //$(eventTarget).off(ns);
                    doRender(event);
                });
            }
        }

        function mouseUp(event) {
            $(eventTarget).off(ns);
        }

        $(document).scroll(documentScrollCallback);
        $(document.body).on("mousewheel DOMMouseScroll", mousewheelScroll);
        $(document.body).keydown(keyDown);
        $(document.body).mousedown(mouseDown);
        $(document.body).mouseup(mouseUp);

        (function prepareCleanUp() {
            function doCleanUp() {
                $(document).off("scroll", documentScrollCallback);
                $(document.body).off("mousewheel DOMMouseScroll", mousewheelScroll);
                $(document.body).off("keydown", keyDown);
                $(document.body).off("mousedown", mouseDown);
                $(document.body).off("mouseup", mouseUp);
                $(eventTarget).off(ns);
                clearTimeout(AssistSDK.universalTimeout);
            }

            AssistSDK.cleanUpStack.push(doCleanUp);
        })();

    },

    setupVideoWindowObserver : function() {
        var videoWindow = AssistSDK.supportDiv;
        var $ = AssistSDK.jQuery;

        var config = {
            attributes : true,
            childList : true,
            characterData : true,
            subtree : true
        };

        var timeout;
        var windowObserver = new MutationObserver(function(mutations) {
            if (AssistSDK.renderVideoWindow !== false) {
                clearTimeout(timeout);
                timeout = setTimeout(AssistSDK.updateVideoWindow, 500);
            } else {
                AssistSDK.renderVideoWindow = true;
            }
        });
        windowObserver.observe(videoWindow, config);

        AssistSDK.updateVideoWindow = function(force) {
            if (window.getComputedStyle(videoWindow).display == "none") {
                // TODO Don't display, either create a new message type or send a resize with 0 x and y
            } else {
                windowObserver.disconnect();
                observer.disconnect();
                html2canvas(videoWindow, {
                    overrideIgnore: true,
                    onrendered: function(canvas) {
                        if (AssistSDK.videoWindow) {
                            AssistSDK.scheduleObserver();
                            AssistSDK.videoWindow.contentChanged(canvas, force);
                        }
                    },
                    useCORS: true
                });
            }
        };
    
        (function prepareCleanUp() {
            function doCleanUp() {
                clearTimeout(timeout);
                windowObserver.disconnect();
                observer.disconnect();
            }

            AssistSDK.cleanUpStack.push(doCleanUp);
        })();
        
        AssistSDK.updateVideoWindow();
    },

    mapInputElements: function(document) {
        // TODO find all the input elements in the passed document and figure out the most appropriate label for each of them
        // We could use getElementsByTagName("*") here and then filter but the resultant list would be live so the index of an element could change
        // Which won't work for us, hence this awkward solution
        var findInputs = function(element) {
            var inputs = [];
            if (element.childNodes && element.childNodes.length > 0) {
                for (var i =  0; i < element.childNodes.length; i++) {
                    inputs = inputs.concat(findInputs(element.childNodes[i]));
                }
            }
            if (element.tagName == "INPUT" || element.tagName == "SELECT" || element.tagName == "TEXTAREA") {
                inputs[inputs.length] = element;
            }
            // Sort the inputs by tab-index
            // TODO this sort function may not be appropriate as it is not guaranteed to be stable and we are relying on its stability
            inputs.sort(function(a, b) {
                var val = a - b;
                if (val < 0 && a < 0) {
                    return 1; // a is -1, b is not so b is first
                } else if (val > 0 && b < 0) {
                    return -1; // b is -1, a is not so a is first
                }
                return val;
            });
            return inputs;
        };
        var inputs = findInputs(document);
        var labels = document.getElementsByTagName("label");

        var inputDescriptors = [];
        // TODO this could be more efficient but should be pretty fast anyway
        for (var i = 0; i < inputs.length; i++) {
            var input = inputs[i];
            var label = undefined;
            var type;
            if (input.tagName == "INPUT") {
                type = input.getAttribute("type");
            } else {
                type = input.tagName.toLowerCase();
            }
            if (input.id) {
                for (var j = 0; j < labels.length; j++) {
                    if (labels[j].getAttribute("for") == input.id) {
                        label = labels[j].innerText;
                        break;
                    }
                }
            }
            // TODO we may need to define a special attribute which can be used to label inputs which otherwise end up with a rubbish label
            if (!label) {
                label = input.getAttribute("title");
            }
            if (!label && type == "radio") {
                label = input.getAttribute("value");
            }
            if (!label) {
                label = input.getAttribute("name");
            }
            if (!label) {
                label = input.id;
            }
            // There is no point sending a descriptor to the agent if we have absolutely no label so only continue if we have some sort of descriptor
            // Except if it is a list box which might be sufficiently self explanatory
            if (label || type == "select") {
                var elementInputDescriptor = {type: type, label: label, index: i};
                // TODO Add type specific initial value attributes
                switch (type) {
                    case "radio":
                        elementInputDescriptor.radioGroup = input.getAttribute("name");
                        // fall through
                    case "checkbox":
                        elementInputDescriptor.checked = input.getAttribute("checked");
                        break;
                    case "text":
                    case "textarea":
                        var pattern = input.getAttribute("pattern");
                        if (pattern) {
                            elementInputDescriptor.pattern = pattern;
                        }
                        // fall through
                    case "email":
                        var value = input.getAttribute("value");
                        if (value) {
                            elementInputDescriptor.value = value;
                        }
                        var placeholder = input.getAttribute("placeholder");
                        if (placeholder) {
                            elementInputDescriptor.placeholder = placeholder;
                        }
                        break;
                    case "password":
                    case "submit":
                        continue;
                    case "select":
                        var options = input.getElementsByTagName("option");
                        var optionDescs = [];
                        for (var j = 0; j < options.length; j++) {
                            optionDescs[optionDescs.length] = {value: options[j].value, label: options[j].textContent};
                        }
                        elementInputDescriptor.options = optionDescs;
                        break;
                    }
                inputDescriptors[inputDescriptors.length] = elementInputDescriptor;
                input.addEventListener("change", function() {
                    var inputElement = input;
                    var descriptor = elementInputDescriptor;
                    var inputType = type;
                    return function () {
                        switch (inputType) {
                            case "text":
                            case "textarea":
                            case "select":
                                descriptor.value = inputElement.value;
                                break;
                            case "radio":
                            case "checkbox":
                                descriptor.checked = inputElement.checked;
                                break;
                        }
                        // Send an updated descriptor to the agent
                        var updateDescriptor = {screenId: AssistSDK.inputDescriptor.screenId, descriptors: [descriptor]};
                        var descriptorString = JSON.stringify(updateDescriptor);
                        var message = new Uint8Array(descriptorString.length + 2);
                        var header = new Int16Array(message.buffer, 0, 2);
                        header[0] = INPUT_ELEMENTS_POPULATED;
                        var payload = new Uint8Array(message.buffer, 2);
                        for (var i = 0; i < descriptorString.length; i++) {
                            payload[i] = descriptorString.charCodeAt(i);
                        }
                        AssistSDK.inputTopic.sendMessage(message);
                        AssistSDK.updateScreen();
                    }
                }());
                if (type == "text" || type == "textarea" || type == "email") {
                    input.addEventListener("click", function () {
                        var elementDescriptor = elementInputDescriptor;
                        return function (event) {
                            // If the click event was sent from the remote endpoint then notify the
                            if (event.assist_generated && AssistSDK.inputTopic && AssistSDK.inputDescriptor) {
                                // update placeholder
                                var inputElement = AssistSDK.inputElements[elementDescriptor.index];
                                var placeholder = inputElement.getAttribute("placeholder") || inputElement.value;
                                if (placeholder) {
                                    elementDescriptor.placeholder = placeholder;
                                }
                                var desc = {screenId: AssistSDK.inputDescriptor.screenId, clicked: elementDescriptor};
                                var descString = JSON.stringify(desc);
                                var message = new Uint8Array(descString.length + 6);
                                var header = new Int16Array(message.buffer, 0, 3);
                                header[0] = INPUT_ELEMENT_CLICKED;
                                // These values will probably be slightly off, but being able to see the remote text box behind
                                // is generally better anyway
                                var bounds = event.target.getBoundingClientRect();
                                header[1] = bounds.left;
                                header[2] = bounds.top;
                                var payload = new Uint8Array(message.buffer, 6);
                                for (var i = 0; i < descString.length; i++) {
                                    payload[i] = descString.charCodeAt(i);
                                }
                                AssistSDK.inputTopic.sendMessage(message);
                            }
                        };
                    }());
                }
            }
        }
        if (inputDescriptors.length > 0) {
            AssistSDK.inputElements = inputs;
            // We need a unique ID to prevent data for one form being used to populate another
            var pageId = ++AssistSDK.inputUid;
            AssistSDK.inputDescriptor = {screenId: pageId, descriptors: inputDescriptors};
            // Create the form info topic under the screen share topic if it doesn't already exist
            var sendInputDescriptor = function () {
                var jsonPayload = JSON.stringify(AssistSDK.inputDescriptor);
                var message = new Uint8Array(jsonPayload.length + 2);
                var header = new Int16Array(message.buffer, 0, 1);
                var payload = new Uint8Array(message.buffer, 2);
                header[0] = INPUT_ELEMENTS_ON_PAGE;
                for (var i = 0; i < jsonPayload.length; i++) {
                    payload[i] = jsonPayload.charCodeAt(i);
                }
                AssistSDK.inputTopic.sendMessage(message);
            };
            if (AssistSDK.inputTopic && AssistUtils.hasAgent(AssistSDK.inputTopic)) {
                sendInputDescriptor();
            } else {
                var metadata = {type: "input"};
                // We're not a member of an input topic so create a new one
                AssistSDK.rootTopic.openSubtopic(metadata, function (subtopic) {
                    AssistSDK.inputTopic = subtopic;
                    subtopic.participantJoined = function (newParticipant) {
                        if (newParticipant.metadata.role == "agent") {
                            sendInputDescriptor();
                        }
                    };
                    subtopic.messageReceived = function(source, message) {
                        var type = new Int16Array(message.buffer, 0, 1)[0];

                        switch (type) {
                            case INPUT_ELEMENTS_POPULATED:
                                var messagePayload = new Uint8Array(message.buffer, 2);
                                var populatedElementsString = String.fromCharCode.apply(null, messagePayload);
                                var populatedElements = JSON.parse(populatedElementsString);
                                if (populatedElements.screenId != AssistSDK.inputUid) {
                                    // The populated element description refers to a form on another page, ignore it
                                    return;
                                }
                                var alteredElements = populatedElements.descriptors;
                                for (var i = 0; i < alteredElements.length; i++) {
                                    var altered = alteredElements[i];
                                    var element = AssistSDK.inputElements[altered.index];
                                    var type;
                                    if (element.tagName == "INPUT") {
                                        type = element.getAttribute("type");
                                    } else {
                                        type = element.tagName.toLowerCase();
                                    }
                                    switch (type) {
                                        case "text":
                                        case "select":
                                        case "textarea":
                                        case "email":
                                            element.value = altered.value;
                                            break;
                                        case "radio":
                                        case "checkbox":
                                            element.checked = altered.checked;
                                            break;
                                    }
                                    if (altered.clickNext) {
                                        // In order to try to simulate tabbing through the document naturally, find the next element in the tab order
                                        // and if it is a form element, simulate an agent click on it.
                                        // This is not really possible but grabbing the next element in the descriptor list should be a good proxy
                                        for (var i = 0; i < AssistSDK.inputDescriptor.descriptors.length; i++) {
                                            if (altered.index == AssistSDK.inputDescriptor.descriptors[i].index) {
                                                for(var nextDescriptorIndex = i + 1; nextDescriptorIndex < AssistSDK.inputDescriptor.descriptors.length; nextDescriptorIndex++ ) {
                                                    var nextDescriptor = AssistSDK.inputDescriptor.descriptors[nextDescriptorIndex];
                                                    if (nextDescriptor) {
                                                        var nextElement = AssistSDK.inputElements[nextDescriptor.index];
                                                        if (nextElement.tagName == "TEXTAREA" ||
                                                            (nextElement.tagName == "INPUT" && (nextElement.getAttribute("type") == "text") || nextElement.getAttribute("type") == "email")) {
                                                            var bounds = nextElement.getBoundingClientRect();
                                                            var viewWidth = AssistSDK.sourceWindow.innerWidth;// || document.body.clientWidth;
                                                            var viewHeight = AssistSDK.sourceWindow.innerHeight;// || document.body.clientHeight;
                                                            var scrollX = (window.pageXOffset === undefined ? AssistSDK.sourceWindow.document.body.scrollLeft : AssistSDK.sourceWindow.pageXOffset);
                                                            var scrollY = (window.pageYOffset === undefined ? AssistSDK.sourceWindow.document.body.scrollTop : AssistSDK.sourceWindow.pageYOffset);
                                                            if (bounds.top > scrollY && bounds.bottom < (scrollY + viewHeight)
                                                                && bounds.left > scrollX && bounds.bottom < (scrollX + viewWidth)) {
                                                                // Only send the click if the element is entirely visible
                                                                var desc = {screenId: AssistSDK.inputDescriptor.screenId, clicked: nextDescriptor};
                                                                var descString = JSON.stringify(desc);
                                                                var message = new Uint8Array(descString.length + 6);
                                                                var header = new Int16Array(message.buffer, 0, 3);
                                                                header[0] = INPUT_ELEMENT_CLICKED;
                                                                // These values will probably be slightly off, but being able to see the remote text box behind
                                                                // is generally better anyway
                                                                header[1] = bounds.left;
                                                                header[2] = bounds.top;
                                                                var payload = new Uint8Array(message.buffer, 6);
                                                                for (var i = 0; i < descString.length; i++) {
                                                                    payload[i] = descString.charCodeAt(i);
                                                                }
                                                                AssistSDK.inputTopic.sendMessage(message);
                                                                break;
                                                            }
                                                        }
                                                    }
                                                }
                                                break;
                                            }
                                        }
                                    }
                                }
                                break;
                        }
                        clearTimeout(AssistSDK.universalTimeout);
                        AssistSDK.log("Scheduling a screen update (Form filled)");
                        AssistSDK.universalTimeout = setTimeout(AssistSDK.updateScreen, 500);
                    };
                });
            }
        } else {
            // There are no inputs to send so clear the descriptors and leave the input topic if there is one
            if (AssistSDK.inputTopic) {
                AssistSDK.inputTopic.leave();
                AssistSDK.inputTopic = undefined;

            }
            AssistSDK.inputDescriptor = {};
        }
    },

    createRemoteUI : function(skipVideo) {
        screenData = {};
        AssistSDK.log("TOPICSOCKET: " + AssistSDK.topicSocket);

        if (AssistSDK.rootTopic) {
            // If we already have a root topic connected then find and transmit any forms
            AssistSDK.mapInputElements(AssistSDK.sourceWindow.document.body);
        }
        jQueryLoaded($);

        (function loadCSS() {
            if (document.getElementById("ASSIST-CSS") != null) {
                return;
            }

            AssistUtils.loadCSS(AssistSDK.sourceWindow.document, AssistUtils.getSdkPath() + "css/assist.css", "ASSIST-CSS");
            AssistUtils.loadCSS(AssistSDK.sourceWindow.document, AssistUtils.getSdkPath() + "../shared/css/shared-window.css");
            if (typeof i18n !== "undefined" && i18n !== null && AssistUtils.isRTL(i18n.lng())) {
                AssistUtils.loadCSS(AssistSDK.sourceWindow.document, AssistUtils.getSdkPath() + "css/rtl.css");
                AssistUtils.loadCSS(AssistSDK.sourceWindow.document, AssistUtils.getSdkPath() + "../shared/css/shared-window-rtl.css");
            }
        })();

        (function addPageUnloadListeners() {
            if ("onpagehide" in window) {
                AssistSDK.sourceWindow.addEventListener("pagehide",
                    AssistSDK.handleUnload, false);
            } else {
                AssistSDK.sourceWindow.addEventListener("unload",
                    AssistSDK.handleUnload, false);
            }

            (function prepareCleanUp() {
                function doCleanUp() {
                    if ("onpagehide" in window) {
                        AssistSDK.sourceWindow.removeEventListener("pagehide", AssistSDK.handleUnload, false);
                    } else {
                        AssistSDK.sourceWindow.removeEventListener("unload", AssistSDK.handleUnload, false);
                    }
                }

                AssistSDK.cleanUpStack.push(doCleanUp);
            })();
        })();

        // don't proceed until jQuery has loaded
        function jQueryLoaded(jQuery) {
            console.log("jQuery loaded callback");

            AssistSDK.jQuery = jQuery;

            if (AssistSDK.glassPane) {
                // TODO handle failure of the adoptNode call

                // We need to re-create the support DIV (or probably just the video element, but we already have the code to replace the whole thing)
                // because a video element which has been on another document will not continue to play (it'll just freeze on the last frame it played
                // or if the src is re-set it will render a single frame from the source)
                if (window.chrome) {
                    var oldSupportDiv = AssistSDK.supportDiv;
                    AssistSDK.glassPane.removeChild(oldSupportDiv);
                }
                
                AssistSDK.glassPane = AssistSDK.sourceWindow.document.adoptNode(AssistSDK.glassPane);
                
                if (window.chrome) {
                    // create a new Support DIV
                    AssistSDK.createSupportDiv(AssistSDK.remoteVideo);
                    if (AssistSDK.videoWindow) {
                        AssistSDK.videoWindow.elementChanged(oldSupportDiv, AssistSDK.supportDiv);
                    }
                }
                
                AssistSDK.updateScreen();
            } else {
                AssistSDK.glassPane = document
                    .createElement("div");
                AssistSDK.glassPane.id = "glass-pane";
                AssistSDK.glassPane.setAttribute("data-html2canvas-ignore", "true");
                console.log("Creating glass pane");
                
                AssistSDK.createSupportDiv((skipVideo == false));
  
                AssistSDK.glassPane.appendChild(AssistSDK.supportDiv);
                //If in mid-call (reconnected), redraw connection quality indicator.
                if (AssistSDK.currentCall != null) {
                    AssistSDK.currentCall.onConnectionQualityChanged(AssistSDK.connectionQuality);
                }
            }

            AssistSDK.sourceWindow.document.body.appendChild(AssistSDK.glassPane);
            AssistSDK.sourceWindow.focus();
            AssistSDK.scheduleObserver();

            if (AssistSDK.screenShareWindow) {
                AssistSDK.glassPane.appendChild(AssistSDK.supportDiv);
                AssistSDK.screenShareWindow.ownerDocumentChanged();
            }

            AssistSDK.video.play();
            AssistSDK.registerScrollListeners();
            
            function resizeUpdate() {
                clearTimeout(AssistSDK.universalTimeout);
                AssistSDK.log("do rerender (resize)");
                AssistSDK.universalTimeout = setTimeout(AssistSDK.updateScreen, 500);
            }

            // TODO: this might trigger two canvas renders when we only really want one (plus the window render)
            AssistSDK.sourceWindow.addEventListener("resize", resizeUpdate, false);

            ;(function prepareCleanUp() {
                function doCleanUp() {
                    AssistSDK.sourceWindow.removeEventListener("resize", resizeUpdate, false);
                }

                AssistSDK.cleanUpStack.push(doCleanUp);
            })();
        }
    },

    createSupportDiv : function(withVideo) {
    
        var className;
        if (!withVideo) {
            className = "without-video";
            if (AssistSDK.usingAudio) {
                className = className + " audio-only";
            } else {
            className = className + " without-audio";
            }
        } else {
            className = "with-video";
        }

        AssistSDK.supportDiv = AssistSDK.sourceWindow.document
            .createElement("div");
        AssistSDK.supportDiv.id = "assist-sdk";
        AssistSDK.supportDiv.setAttribute("data-html2canvas-ignore", "true");
        AssistSDK.supportDiv.className = className;
        AssistSDK.supportDiv.style.top = AssistSDK.divY + "px";
        AssistSDK.supportDiv.style.left = AssistSDK.divX + "px";

        AssistSDK.video = document.createElement("video");
        AssistSDK.video.id = "video";
        AssistSDK.video.autoplay = "true";
        AssistSDK.supportDiv.appendChild(AssistSDK.video);

        var previewContainer = AssistSDK.sourceWindow.document.createElement("div");
        previewContainer.id = "previewContainer";
        previewContainer.style.visibility = "hidden";
        AssistSDK.previewContainer = previewContainer;
        var previewView = AssistSDK.sourceWindow.document.createElement("video");
        previewView.id = "preview";
        previewView.setAttribute("autoplay", "autoplay");
        previewView.setAttribute("muted", "muted");
        AssistSDK.previewView = previewView;
        AssistSDK.glassPane.appendChild(previewContainer);
        AssistSDK.previewContainer.appendChild(previewView);
        AssistSDK.setPreviewContainerBounds();    
        $(AssistSDK.sourceWindow).on("resize", AssistSDK.handleWindowResize);
        (function prepareCleanUp() {
            function doCleanUp() {
                $(AssistSDK.sourceWindow).off("resize", AssistSDK.handleWindowResize);
            }
            AssistSDK.cleanUpStack.push(doCleanUp);
        })();
        
        var previewCloseHandle = AssistSDK.sourceWindow.document.createElement("div");
        previewCloseHandle.classList.add("close-handle");
        previewCloseHandle.classList.add("handle");
        previewCloseHandle.setAttribute("ignore-interaction", true);
        previewCloseHandle.onclick = AssistSDK.hidePreview;
        AssistSDK.previewCloseHandle = previewCloseHandle;
        AssistSDK.previewContainer.appendChild(previewCloseHandle);
       
        var snapshotButton = AssistSDK.sourceWindow.document.createElement("div");
        snapshotButton.id = "snapshot-button";
        snapshotButton.onclick = AssistSDK.takeSnapshot;
        AssistSDK.snapshotButton = snapshotButton;
        AssistSDK.previewContainer.appendChild(snapshotButton);

        AssistSDK.nameDiv = AssistSDK.sourceWindow.document.createElement("div");
        AssistSDK.nameDiv.id = "name-div";
        var agentName = AssistSDK.agentName;
        AssistSDK.log("agentName is " + agentName);
        if (agentName == null)
            agentName = "";
        var agentNameNode = AssistSDK.sourceWindow.document.createTextNode(agentName);
        AssistSDK.nameDiv.appendChild(agentNameNode);
        AssistSDK.supportDiv.appendChild(AssistSDK.nameDiv);
        
        if (withVideo) {
        	var menuButton = AssistSDK.sourceWindow.document.createElement("div");
        	menuButton.id = "menu-button";
        	menuButton.classList.add("button");
        	menuButton.onclick = AssistSDK.toggleMenu;
        	AssistSDK.supportDiv.appendChild(menuButton);
        	AssistSDK.menuButton = menuButton;
        	var menuDiv = AssistSDK.sourceWindow.document.createElement("div");
        	menuDiv.id = "menu";
        	menuDiv.style.visibility = "hidden";
        	AssistSDK.supportDiv.appendChild(menuDiv);
        	AssistSDK.menuDiv = menuDiv;
            var mute = AssistSDK.sourceWindow.document.createElement("div");
            mute.id = "mute-button";
            mute.classList.add("unmuted");
            mute.classList.add("button");
            mute.onclick = AssistSDK.toggleMute;
            AssistSDK.menuDiv.appendChild(mute);
            AssistSDK.muteButton = mute;
            var br = AssistSDK.sourceWindow.document.createElement("br");
            AssistSDK.menuDiv.appendChild(br);
            var cameraButton = AssistSDK.sourceWindow.document.createElement("div");
            cameraButton.id = "camera-button";
            cameraButton.classList.add("button");
            cameraButton.onclick = AssistSDK.prepareSnapshot;
            AssistSDK.menuDiv.appendChild(cameraButton);
            AssistSDK.cameraButton = cameraButton;
        } else if (AssistSDK.usingAudio) {
            var mute = AssistSDK.sourceWindow.document.createElement("div");
            mute.id = "mute-button";
            //mute.textContent = i18n.t("assistI18n:button.mute");
            mute.classList.add("unmuted");
            mute.classList.add("button");
            mute.onclick = AssistSDK.toggleMute;
            AssistSDK.supportDiv.appendChild(mute);
            AssistSDK.muteButton = mute;
        } else {
            AssistSDK.picture = AssistSDK.sourceWindow.document.createElement("img");
            AssistSDK.picture.id = "picture";
            var agentPictureUrl = AssistSDK.agentPictureUrl;
            AssistSDK.log("agentPictureUrl is " + agentPictureUrl);
            if (agentPictureUrl != null) {
                    AssistSDK.picture.setAttribute("src", agentPictureUrl);
            }
                           
            AssistSDK.supportDiv.appendChild(AssistSDK.picture);
        }
        
        var end = AssistSDK.sourceWindow.document.createElement("div");
        end.id = "end-button";
        //end.textContent = i18n.t("assistI18n:button.end");
        end.onclick = AssistSDK.endSupport;
        end.classList.add("button");
        AssistSDK.supportDiv.appendChild(end);
        AssistSDK.endButton = end;
    
        AssistSDK.statusDiv = AssistSDK.sourceWindow.document
            .createElement("div");
        AssistSDK.statusDiv.id = "status-div";
        AssistSDK.statusDiv.innerHTML = "<center>" + i18n.t("assistI18n:popup.status.connecting") + "</center>";
        AssistSDK.supportDiv.appendChild(AssistSDK.statusDiv);
        AssistSDK.statusDiv.style.visibility = "visible";
        
        if (withVideo) {        
            AssistSDK.video.style.visibility = "hidden";
            
            if (AssistSDK.remoteVideo != null) {
                var URL = AssistSDK.sourceWindow.webkitURL || AssistSDK.sourceWindow.URL;
                AssistSDK.video.src = URL.createObjectURL(AssistSDK.remoteVideo);
                AssistSDK.video.style.visibility = "visible";
                AssistSDK.statusDiv.style.visibility = "hidden";
            }
        }
    },
    
    toggleMenu : function() {
    	AssistSDK.menuDiv.style.visibility = 
    		(AssistSDK.menuDiv.style.visibility == "hidden") ? "visible" : "hidden";
    },

    toggleMute : function() {
        if (AssistSDK.muted == false) {
            AssistSDK.muted = true;
            //AssistSDK.muteButton.textContent = i18n.t("assistI18n:button.unmute");
            AssistSDK.muteButton.classList.remove("unmuted");
            AssistSDK.muteButton.classList.add("muted");
            if (AssistSDK.currentCall != null) {
                AssistSDK.currentCall.setLocalMediaEnabled(false, false);
            }
        } else {
            AssistSDK.muted = false;
            if (AssistSDK.currentCall != null) {
                AssistSDK.currentCall.setLocalMediaEnabled(true, true);
            }
            //AssistSDK.muteButton.textContent = i18n.t("assistI18n:button.mute");
            AssistSDK.muteButton.classList.remove("muted");
            AssistSDK.muteButton.classList.add("unmuted");
        }
    },
    
    prepareSnapshot : function() {
    	console.log("In prepareSnapshot().");
    	AssistSDK.menuDiv.style.visibility = "hidden";
    	AssistSDK.previewContainer.style.visibility = "visible";
    },
    
    hidePreview : function() {
    	AssistSDK.previewContainer.style.visibility = "hidden";
    },
    
    takeSnapshot : function() {
    	console.log("In takeSnapshot().");
    	var snapshotCanvas = document.createElement("canvas");
    	var previewViewComputedStyle = getComputedStyle(AssistSDK.previewView);
    	snapshotCanvas.width = parseInt(previewViewComputedStyle.width);
    	snapshotCanvas.height = parseInt(previewViewComputedStyle.height);
    	var ctx = snapshotCanvas.getContext("2d");
    	ctx.drawImage(AssistSDK.previewView, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
    	var dataURL = snapshotCanvas.toDataURL("image/jpeg");
    	var base64ImageData = dataURL.substr("data:image/jpeg;base64,".length);
    	var imageData = AssistSDK.base64DecToArr(base64ImageData);
    	console.log("Binary image data array created.");
    	AssistSDK.previewContainer.style.visibility = "hidden";
    	AssistSDK.sendSnapshot(imageData);
    },
    
    sendSnapshot : function(imageData) {
    	//First send the start indicator
        var startMessage = new Uint8Array(2);
        var startMess16 = new Int16Array(startMessage.buffer, 0, 1);
        startMess16[0] = SNAPSHOT_START;
        AssistSDK.snapshotTopic.sendMessage(startMessage);
        console.log("Sent snapshot start indicator.");
        
        //Then send the data chunks
        for (var pos = 0; pos < imageData.length; pos += DATA_CHUNK_SIZE) {
        	var chunkSize = Math.min(imageData.length - pos, DATA_CHUNK_SIZE)
        	var chunkMessage = new Uint8Array(chunkSize + 2);
        	var chunkMess16 = new Int16Array(chunkMessage.buffer, 0, 1);
        	chunkMess16[0] = SNAPSHOT_CHUNK;
        	var endpos = pos + DATA_CHUNK_SIZE;
        	//Copy the image data into the chunk message
        	for (var b = 0; b < DATA_CHUNK_SIZE; b++) {
        		chunkMessage[b + 2] = imageData[pos + b];
        	}
        	AssistSDK.snapshotTopic.sendMessage(chunkMessage);
        	console.log("Sent snapshot image data chunk.");
        }
        
        //Finally send the end indicator
        var endMessage = new Uint8Array(2);
        var endMess16 = new Int16Array(endMessage.buffer, 0, 1);
        endMess16[0] = SNAPSHOT_END;
        AssistSDK.snapshotTopic.sendMessage(endMessage);
        console.log("Sent snapshot end indicator.");
    },
    
    // Base64 decoding helper function
    b64ToUint6 : function(nChr) {

      return nChr > 64 && nChr < 91 ?
          nChr - 65
        : nChr > 96 && nChr < 123 ?
          nChr - 71
        : nChr > 47 && nChr < 58 ?
          nChr + 4
        : nChr === 43 ?
          62
        : nChr === 47 ?
          63
        :
          0;

    },

    /* Base64 string to array of bytes decoding */
    base64DecToArr : function(sBase64, nBlocksSize) {
      var
        sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, ""), nInLen = sB64Enc.length,
        nOutLen = nBlocksSize ? Math.ceil((nInLen * 3 + 1 >> 2) / nBlocksSize) * nBlocksSize : nInLen * 3 + 1 >> 2, 
        taBytes = new Uint8Array(nOutLen);

      for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
        nMod4 = nInIdx & 3;
        nUint24 |= AssistSDK.b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 18 - 6 * nMod4;
        if (nMod4 === 3 || nInLen - nInIdx === 1) {
          for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
            taBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
          }
          nUint24 = 0;

        }
      }

      return taBytes;
    },
    
    handleWindowResize : function() {
    	AssistSDK.setPreviewContainerBounds();
    	//Make sure agent window is within bounds.
    	for (var i = 0; i < AssistSDK.screenShareWindow.children.length; i++) {
    		var win = AssistSDK.screenShareWindow.children[i];
    		if (win.metadata.moveable) {
    			win.adjustPosition(0, 0);
    		}
    	}
    },
    
    //Set the size and position of the snapshot preview viewport
    setPreviewContainerBounds : function() {
    	var previewContainer = AssistSDK.previewContainer;
    	
        var windowWidth = AssistSDK.sourceWindow.innerWidth;
        var windowHeight = AssistSDK.sourceWindow.innerHeight;
        var previewVideoNaturalWidth = 640;
        var previewVideoNaturalHeight = 480;
        // Determine the optimal starting size for this video
        // Calculate the aspect ratio of the video and the parent window to determine the 
        // bounding dimension
        var imageAspect = previewVideoNaturalHeight / previewVideoNaturalWidth;
        var windowAspect = windowHeight / windowWidth;

        var previewHeight;
        var previewWidth;
        if (imageAspect > windowAspect) {
            // the image has a narrower aspect than the parent so limit it to 80% of the 
        	// parents height
            previewHeight = Math.min(previewVideoNaturalHeight, (windowHeight * 0.8));
            previewWidth = previewHeight / imageAspect;
        } else {
            // the image has the same or a wider aspect than the parent so limit it to 80% of 
        	// the parents width
            previewWidth = Math.min(previewVideoNaturalWidth, (windowWidth * 0.8));
            previewHeight = previewWidth * imageAspect;
        }
        previewContainer.style.height = previewHeight + "px";// parentWindow.height * 100 + "%";
        previewContainer.style.width =  previewWidth + "px"; // parentWindow.width * 100 + "%";

        console.log("windowWidth = " + windowWidth);
        console.log("previewWidth = " + previewWidth);
        console.log("Setting previewContainer.style.top to " + ((windowHeight - previewHeight) / 2) + "px");
        console.log("Setting previewContainer.style.left to " + ((windowWidth - previewWidth) / 2) + "px");
        // Stick it in the center
        previewContainer.style.top = ((windowHeight - previewHeight) / 2) + "px";
        previewContainer.style.left = ((windowWidth - previewWidth) / 2) + "px";
    },

    handleUnload : function() {
        AssistSDK.log("In handleUnload()");
        AssistSDK.clearAnnotations();
        AssistSDK.isOnRecognizedAssistPage = false;
        setTimeout(AssistSDK.checkPage, 4000);
    },
    
    checkPage : function() {
        try {
            if (AssistSDK.sourceWindow.document.readyState !== "complete") {
                // Page not ready, but we're allowed to know that, which is promising. Try again later
                setTimeout(AssistSDK.checkPage, 500);
                return;
            }
        } catch (error) {
            // An error occurred trying to read the documents ready state, suggesting that we're not
            // on an assist enabled page.
        }
    	if (!AssistSDK.isOnRecognizedAssistPage) {
    		AssistSDK.isOnAssistPages = false;
    		AssistSDK.sendOffAssistPagesMessage();
        	alert(i18n.t("assistI18n:notice.navigateAwayAssist"));
        }
    },
    
    sendOffAssistPagesMessage : function() {
        var offAssistMessage = new Int16Array(1);
        offAssistMessage[0] = OFF_ASSIST_MESSAGE;
        AssistSDK.screenShareTopic.sendMessage(offAssistMessage);
    },
    
    sendOnAssistPagesMessage : function() {
    	var onAssistMessage = new Int16Array(1);
    	onAssistMessage[0] = ON_ASSIST_MESSAGE;
    	AssistSDK.screenShareTopic.sendMessage(onAssistMessage);
    },

    setCallQuality : function (cqIndicator, cqClass) {
        for (var i = 0; i < AssistSDK.cqClasses.length; i++) {
            if (cqClass != AssistSDK.cqClasses[i]) {
                cqIndicator.classList.remove(AssistSDK.cqClasses[i])
            } else {
                cqIndicator.classList.add(AssistSDK.cqClasses[i]);
            }
        }
    },
    
    connectWithAudio : function(configuration) {

        var usingAgentVideo = configuration.hasVideo();
        AssistSDK.usingAudio = true;

        // create the UI in the actual window being supported
        AssistSDK.createRemoteUI((usingAgentVideo == false)); // createRemoteUI expects true if NOT using video ("skipVideo")
               
        AssistFCSDK.init(configuration, function(newCall, correlationId) {
            AssistSDK.currentCall = newCall;
        
            configuration.setCorrelationId(correlationId);
            
            newCall.onRemoteMediaStream = function(remoteMediaStream) {
                AssistSDK.remoteVideo = remoteMediaStream;

                var URL = AssistSDK.sourceWindow.webkitURL || AssistSDK.sourceWindow.URL;
                AssistSDK.video.src = URL.createObjectURL(AssistSDK.remoteVideo);
                
            };
            
            newCall.onLocalMediaStream = function(localMediaStream) {
            	AssistSDK.localVideo = localMediaStream;

            	var URL = AssistSDK.sourceWindow.webkitURL || AssistSDK.sourceWindow.URL;
            	AssistSDK.previewView.src = URL.createObjectURL(AssistSDK.localVideo);
            };
            
            newCall.onInCall = function() {
                console.log("In onInCall()");

                AssistSDK.video.style.visibility = "visible";
                AssistSDK.statusDiv.style.visibility = "hidden";
                statusDiv.textContent = i18n.t("assistI18n:popup.status.connected");
                
                AssistSDK.connectWebSocket(configuration);
                try {
                    AssistSDK.sourceWindow.AssistSDK.onConnectionEstablished();
                } 
                catch(e) {}
            };

            newCall.onEnded = function() {
            	AssistSDK.currentCall = null;
                AssistSDK.endSupport();
                AssistFCSDK.destroySession();
            };

            newCall.onCallFailed = function(message) {
                AssistSDK.endSupport();
                AssistSDK.sourceWindow.console.log("Called failed: " + message);
           	 	AssistSDK.displayModal(i18n.t("assistI18n:notice.callFailed"));
            };

            newCall.onConnectionQualityChanged = function(quality) {
                AssistSDK.connectionQuality = quality;
                
                var cqIndicator = AssistSDK.sourceWindow.document.getElementById(
                    "call-quality-indicator");
                if (cqIndicator == null) {
                    cqIndicator = AssistSDK.sourceWindow.document.createElement("div");
                    cqIndicator.id = "call-quality-indicator";
 
                    AssistSDK.supportDiv.appendChild(cqIndicator);
                }
                var qualityClass;
                if (quality >= 90) {
                    qualityClass = AssistSDK.cqClasses[1];
                } else if (quality >= 70) {
                    qualityClass = AssistSDK.cqClasses[2];
                } else {
                    qualityClass = AssistSDK.cqClasses[3];
                }
                AssistSDK.setCallQuality(cqIndicator, qualityClass);
            };

            newCall.onBusy = newCall.onNotFound = newCall.onTimeout = function() {
                console.log("call was busy or not found");
                AssistSDK.displaySupportBusyModal();
                AssistSDK.endSupport();
            };
        });

        // return focus to the original window
        AssistSDK.sourceWindow.focus();
    },
       
    connectWithoutAudio : function(configuration) {
        AssistSDK.usingAudio = false;

        // create the UI in the actual window being supported
        AssistSDK.createRemoteUI(true);
        AssistSDK.connectWebSocket(configuration);
        statusDiv.innerHTML = i18n.t("assistI18n:popup.status.connected");
        
        try {
            AssistSDK.sourceWindow.AssistSDK.onConnectionEstablished();
        } 
        catch(e) {}
        
        // return focus to the original window
        AssistSDK.sourceWindow.focus();
    },

    promptToAllowScreenShare: function () {
        if (!AssistSDK.screenShareTopic && window.confirm(i18n.t("assistI18n:notice.promptToAllowScreenShare"))){
            AssistSDK.allowScreenShare();
        }
    },

    connectWebSocket : function(configuration) {
        AssistSDK.log("In connectWebSocket()");
        
        AssistAED.setConfig({ "url" : configuration.getUrl() });
        AssistAED.connectRootTopic(configuration.getCorrelationId(), function(rootTopic) {
            // Add the screen share subtopic
            AssistSDK.rootTopic = rootTopic;

            if (AssistSDK.screenShareAllowed) {
                AssistAED.startScreenShare();
            }
            
            rootTopic.openSubtopic({"type":"snapshot"}, function(newTopic) {
            	AssistSDK.snapshotTopic = newTopic;
            });
            
            // Listen for pushed urls
            rootTopic.messageReceived = function(source, messageBytes) {
                var messageString = String.fromCharCode.apply(null, messageBytes);
                var message = JSON.parse(messageString);
                switch (message.type) {
                    case "url":
                    AssistSDK.sourceWindow.location.href = message.url;
                        break;
                    case "requestScreenShare":
                        AssistSDK.promptToAllowScreenShare();
                        break;
                }
            }
        }, configuration.getSessionToken());
   },

    startScreenShare : function() {
        function setImageQualityScaleFactor(hostSharedWindow) {
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.onreadystatechange = function() {
                if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                    try {
                        var jsonConfig = JSON.parse(xmlHttp.responseText);
                        var quality = parseFloat(jsonConfig.scaleFactor);

                        if (!isNaN(quality)) {
                            hostSharedWindow.setImageQualityScaleFactor(quality);
                        }
                    } catch(e) {
                        console.log("error parsing json for image quality config");
                    }
                }
            };
            xmlHttp.open("GET", window.AssistConfig.getUrl() + "/assistserver/rest/config/consumer", true);
            xmlHttp.send();
        };

        AssistSDK.rootTopic.openSubtopic({"type":"shared-window", "interactive":"true", "scrollable":"true"}, function(newTopic) {
            var glassPaneContainerDiv = AssistSDK.glassPane;
            AssistSDK.screenShareWindow = new HostSharedWindow(newTopic, glassPaneContainerDiv);
            setImageQualityScaleFactor(AssistSDK.screenShareWindow);
            AssistSDK.screenShareTopic = newTopic;

            newTopic.participantJoined = function(newScreenParticipant) {
                if (newScreenParticipant.metadata.role == "agent") {
                    AssistSDK.setAgentName(newScreenParticipant.metadata.name);
                    AssistSDK.setAgentPicture(newScreenParticipant.metadata.avatar);
                    AssistSDK.setAgentText(newScreenParticipant.metadata.text);
                }
                // A new participant joined, send a resize event with the current size and a full screen refresh
                // force the sending of a resized event and a full refresh
                clearTimeout(AssistSDK.universalTimeout);
                AssistSDK.log("do rerender (new participant)");
                AssistSDK.universalTimeout = setTimeout(function() { AssistSDK.updateScreen(true) }, 500);
                AssistSDK.screenShareWindow.sendSizeAndPosition();
                // TODO Take the agent metadata and populate the agents data
            };

            if (window.getComputedStyle(AssistSDK.supportDiv).display !== "none") {
                AssistSDK.screenShareWindow.shareSubWindow(AssistSDK.supportDiv, {moveable: true, name:"draggable-agent-window", mustRemainVisiblePixels: 90, mustRemainVisibleBottomPixels: 120
                    //                    , resizeable: true, maintainAspect: true
                }, function(newWindow, newSubtopic) {
                    AssistSDK.videoWindow = newWindow;
                    newSubtopic.participantJoined = function(newVideoParticipant) {
                        setTimeout(function () {
                            AssistSDK.updateVideoWindow(true);
                            AssistSDK.videoWindow.sendSizeAndPosition();
                        }, 500);
                    };
                });
                AssistSDK.setupVideoWindowObserver();
            }

            // Look for and transmit form data
            AssistSDK.mapInputElements(AssistSDK.sourceWindow.document.body);
        });
    },

    sendEndSupportMessage : function() {
        AssistSDK.rootTopic.leave();
	}
	
};
