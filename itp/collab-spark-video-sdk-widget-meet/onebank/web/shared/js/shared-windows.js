var WINDOW_RESIZED_MESSAGE = 1001;
var WINDOW_MOVED_MESSAGE = 1002;
var WINDOW_RECTANGLE_UPDATED = 1003;
var WINDOW_CLOSED_MESSAGE = 1004;

var ANNOTATIONS_SET = 2001;
var ANNOTATION_ADDED = 2002;

var MOUSE_DOWN_MESSAGE =3001;
var MOUSE_UP_MESSAGE = 3002;
var MOUSE_DOUBLE_CLICK_MESSAGE = 3003;
var MOUSE_MOVE_MESSAGE = 3004;

var PUSH_DOCUMENT_MESSAGE = 4001;
var DOCUMENT_ZOOMED_LEVEL_CHANGED = 4002;
var PUSH_CONTENT_START = 4003;
var PUSH_CONTENT_CHUNK = 4004;
var PUSH_CONTENT_END = 4005;

var SNAPSHOT_START = 5001;
var SNAPSHOT_CHUNK = 5002;
var SNAPSHOT_END = 5003;

var INPUT_ELEMENTS_ON_PAGE = 6001;
var INPUT_ELEMENTS_POPULATED = 6002;
var INPUT_AT_LOCATION = 6003;
var INPUT_ELEMENT_CLICKED = 6004;

var SCROLL_UP_MESSAGE = 7001;
var SCROLL_DOWN_MESSAGE = 7002;

var OFF_ASSIST_MESSAGE = 8001;
var ON_ASSIST_MESSAGE = 8002;

var CURSOR_PING = 9001;
var SPOTLIGHT_CLEAR = 9002;

//Used for snapshots and pushed content
var DATA_CHUNK_SIZE = 8190;     //8192 minus 2 bytes for message type

var INPUT_ELEMENT_TYPES = [];

console.log("Loaded shared-windows.js");

function addClassSvg(element, clazz) {
    element.setAttribute("class", element.getAttribute("class") + " " + clazz);
}

function removeClassSvg(element, clazz) {
    var className = (element.getAttribute("class") + "").replace(clazz, "");
    element.setAttribute("class", className);
}

(function(){
INPUT_ELEMENT_TYPES[1] = "text";
INPUT_ELEMENT_TYPES[2] = "radio";
INPUT_ELEMENT_TYPES[3] = "checkbox";
    for (var i = 0; i < INPUT_ELEMENT_TYPES.length; i++) {
        if (INPUT_ELEMENT_TYPES[i]) {
            INPUT_ELEMENT_TYPES[INPUT_ELEMENT_TYPES[i]] = i;
        }
    }
}());

var IMAGE_FORMAT = [];
IMAGE_FORMAT[1] = "png";
IMAGE_FORMAT[2] = "jpeg";
IMAGE_FORMAT.PNG = IMAGE_FORMAT.indexOf("png");
IMAGE_FORMAT.JPEG = IMAGE_FORMAT.indexOf("jpeg");

var SVG_NAMESPACE = "http://www.w3.org/2000/svg";

var IGNORE_INTERACTION_FLAG = "ignore-interaction";

var isIE = function() {
    var userAgent = window.navigator.userAgent;

    if ((userAgent.indexOf('MSIE') > -1) || (userAgent.indexOf('Trident/') > -1)) {
        return true;
    }
    return false;
}

var getPixelValue = function(attribute, parentValue) {
    // Only handles px or %
    if (attribute.indexOf && attribute.indexOf("%") > -1) {
        return parseFloat(attribute) / 100 * parentValue;
    }
    return parseInt(attribute);
};

var fromString = function(string, payload) {
    payload = payload || new Uint8Array(string.length);
    for (var i = 0; i < string.length; i++) {
        payload[i] = string.charCodeAt(i);
    }
    return payload;
};

function deepCloneWithNameSpace(svg, el, ns) {
    var nsEl = svg.ownerDocument.createElementNS(ns, el.localName);

    Array.prototype.slice.call(el.attributes).forEach(function(attribute) {
        nsEl.setAttribute(attribute.name, attribute.value); 
    });

    while (el.firstChild) {
        if (el.firstChild.namespaceURI != ns) {
            nsEl.appendChild(deepCloneWithNameSpace(svg, el.firstChild, ns));
            el.removeChild(el.firstChild);
        } else {
            nsEl.appendChild(el.firstChild);
        }
    }

    return nsEl;
};

//Get the x and y coords of an HTML element.
//Taken from http://stackoverflow.com/questions/442404/retrieve-the-position-x-y-of-an-html-element
function getOffset( el ) {
    var _x = 0;
    var _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return { top: _y, left: _x };
}

//Pass a variable number of elements as arguments.  Get back the left, top, right, and bottom edges
//of the bounding box around the elements.
function getBoundingBox() {
	var elements = arguments;
	var minLeft = null;
	var minTop = null;
	var maxRight = null;
	var maxBottom = null;
	for (var i = 0; i < elements.length; i++) {
		var element = elements[i];
		if (element == null)
			continue;
		var offset = getOffset(element);
		var style = element.ownerDocument.defaultView.getComputedStyle(element);
		var left = offset.left;
		var top = offset.top;
		var width = parseFloat(style.width);
		var height = parseFloat(style.height);
		console.log("i = " + i + " -- left: " + left + "; top: " + top + "; width: " + width + "; height: " + height);
		var right = left + width;
		var bottom = top + height;
		if (minLeft == null || left < minLeft)
			minLeft = left;
		if (minTop == null || top < minTop)
			minTop = top;
		if (maxRight == null || right > maxRight)
			maxRight = right;
		if (maxBottom == null || bottom > maxBottom)
			maxBottom = bottom;
	}
	return { left:minLeft, top:minTop, right:maxRight, bottom:maxBottom };
}

function SharedWindow(topic, element, parentWindow) {
    var _self = this;

    this.topic = topic;
    this.element = element;

    this.maxUpdateInterval = 100;

    this.parentWindow = parentWindow;
    this.width = _self.element.offsetWidth || _self.element.parentNode.offsetWidth;
    this.height = _self.element.offsetHeight || _self.element.parentNode.offsetHeight;

    this.children = [];

    this.messageHandlers = [];

    this.metadata = topic.metadata;

    this.moving = false;

    var documentEventListeners = [];

    _self.closed = function() {
        try {
            if (_self.parentWindow) {
                _self.element.parentNode.removeChild(_self.element);
            }
            _self.removeElementEventListeners();
        } catch(e) {
            console.warn(e);
        }
        
        if (_self.parentWindow) {
            _self.parentWindow.children.splice(_self.parentWindow.children.indexOf(_self), 1);
        }
        
        for (var i = _self.children.length; i > 0; i--) {
            _self.children[i - 1].closed();
        }
    };

    topic.subtopicClosed = function(closingSubtopic) {
        for (var i = 0; i < _self.children.length; i++) {
            if (_self.children[i].topic === closingSubtopic) {
                _self.children[i].closed();
                break;
            }
        }
    };

    _self.addDocumentEventListener = function(eventName, listener) {
        var eventDesc = {name : eventName, listener : listener};
        documentEventListeners.push(eventDesc);
        _self.element.ownerDocument.addEventListener(eventName, listener);
    };

    var elementEventListeners = [];
    _self.addElementEventListener = function(anElement, eventName, listener) {
        var eventDesc = {element : anElement, name : eventName, listener : listener};
        elementEventListeners.push(eventDesc);
        anElement.addEventListener(eventName, listener);
    };
    
    _self.removeElementEventListeners = function() {
        
        for (var j = 0; j< elementEventListeners.length; j++) {
            var elementEventDesc = elementEventListeners[j];
            elementEventDesc.element.removeEventListener(elementEventDesc.name, elementEventDesc.listener);
        }
        
        for (var i = 0; i < documentEventListeners.length; i++) {
            var docEventDesc = documentEventListeners[i];
            _self.element.ownerDocument.removeEventListener(docEventDesc.name, docEventDesc.listener);
        }
    };

    _self.ownerDocumentChanged = function() {
        for (var i = 0; i < documentEventListeners.length; i++) {
            var docEventDesc = documentEventListeners[i];
            _self.wrapEventListener(docEventDesc.name, _self.element.ownerDocument, docEventDesc.listener);
        }
        for (var j = 0; j< elementEventListeners.length; j++) {
            var elementEventDesc = elementEventListeners[j];
            _self.wrapEventListener(elementEventDesc.name, elementEventDesc.element, elementEventDesc.listener);
        }
        for (var k = 0; k < _self.children.length; k++) {
            _self.children[k].ownerDocumentChanged();
        }
    };
    
    _self.wrapEventListener = function(eventName, element, listener) {
        var listenerHandleName = "on" + eventName;
        // this can sometimes be a null object instead of undefined, if so, treat it as undefined and wipe it out
        if (typeof element[listenerHandleName] !== 'undefined' && element[listenerHandleName] != null) {
        
            var previousFunc = element[listenerHandleName];
            element[listenerHandleName] = function(event) {
                previousFunc(event);
                listener(event);
            }
        } else {
            console.log("event is empty, setting and not wrapping");
            element[listenerHandleName] = listener;
        }
    }

    _self.elementChanged = function(oldElement, newElement) {
        if (oldElement == _self.element) {
            _self.element = newElement;
        }
        for (var i = 0; i< elementEventListeners.length; i++) {
            var elementEventDesc = elementEventListeners[i];
            if (elementEventDesc.element === oldElement) {
                elementEventDesc.element = newElement;
                elementEventDesc.element.addEventListener(elementEventDesc.name, elementEventDesc.listener);
            }
        }
        // move any handles to the new window
        var handles = oldElement.getElementsByClassName("handle");
        for (var j = 0; j < handles.length; j++) {
            newElement.appendChild(handles[j]);
            // TODO we could refresh the listeners now, but we should expect the owner document changed call later anyway
        }
        // Move the new window to the location of the old
        newElement.style.top = oldElement.style.top;
        newElement.style.left = oldElement.style.left;
    };

    // Listen for subtopics
    topic.subtopicOpened = function(newSubtopic) {
        switch (newSubtopic.metadata.type) {
            case "shared-window":
                // There is a new child window which wasn't created locally
                var childDiv = _self.element.ownerDocument.createElement("div");
                childDiv.classList.add("child-shared-div");
                if (!newSubtopic.metadata.interactive) {
                    childDiv.classList.add("non-interactive");
                }
                
                if (newSubtopic.metadata.name == "draggable-agent-window") {
                    childDiv.classList.add("stay-on-top");
                }
                
                _self.element.appendChild(childDiv);
                
                _self.children.push(new ClientSharedWindow(newSubtopic, childDiv, _self));
                newSubtopic.join();
                break;
            case "annotation":
                var annotationImg = _self.element.ownerDocument.createElementNS(SVG_NAMESPACE, "svg");
                addClassSvg(annotationImg, "annotation-layer"); // ie doesn't support classList on svg
                _self.element.appendChild(annotationImg);
                _self.children.push(new AnnotationWindow(newSubtopic, annotationImg, _self));
                newSubtopic.join();
                break;
            case "spotlight":
                console.log("Subtopic Opened - Adding Spotlight SVG");
                var spotlightImg = _self.element.ownerDocument.createElementNS(SVG_NAMESPACE, "svg");
                addClassSvg(spotlightImg, "spotlight-layer"); //ie
                _self.element.appendChild(spotlightImg);
                _self.children.push(new SpotlightWindow(newSubtopic, spotlightImg, _self));
                newSubtopic.join();
                break;
        }
        

        
    };


    
    if (_self.metadata.moveable) {
        _self.element.classList.add("moveable");
        var moveHandle = _self.element.ownerDocument.createElement("div");
        moveHandle.classList.add("move-handle");
        moveHandle.classList.add("handle");
        moveHandle.setAttribute(IGNORE_INTERACTION_FLAG, "true");
        moveHandle.setAttribute("data-html2canvas-ignore", "true");
        _self.element.appendChild(moveHandle);
        
        _self.moveHandle = moveHandle;

        // add javascript listeners for mouse events to the parent div if this window can be moved
        var xStart;
        var yStart;
        var lastEvent;

        //The number of pixels on each side of the shared window that must remain visible.
        var mustRemainVisibleGlobalPixels = _self.metadata.mustRemainVisiblePixels;
        //(Optional) The number of pixels at the bottom of the shared window that must remain visible.
        //This can be different from the number of pixels on the other sides of the shared window that
        //must remain visible.
        var mustRemainVisibleBottomGlobalPixels = _self.metadata.mustRemainVisibleBottomPixels;
        
        _self.adjustPosition = function(xLocalDelta, yLocalDelta) {
        	console.log("In SharedWindow.adjustPosition().");
            var boundingBox = getBoundingBox(_self.element, _self.resizeHandle, _self.closeHandle, 
            		_self.moveHandle);

            console.log("Bounding box:");
            console.log(boundingBox);
            console.log("xLocalDelta = " + xLocalDelta + "; yLocalDelta = " + yLocalDelta);
            var parentWindowOffset = getOffset(_self.parentWindow.element);
            var parentLeft = parentWindowOffset.left;
            var parentTop = parentWindowOffset.top;
            var parentWindowElemStyle = _self.parentWindow.element.ownerDocument.defaultView.getComputedStyle(_self.parentWindow.element);
            var parentWidth = parseFloat(parentWindowElemStyle.width);
            var parentHeight = parseFloat(parentWindowElemStyle.height);
            var parentRight = parentLeft + parentWidth;
            var parentBottom = parentTop + parentHeight;
            console.log("parentLeft = " + parentLeft);
            console.log("parentWidth = " + parentWidth);
            console.log("parentHeight = " + parentHeight);
            
            var allowedOffScreenHorizPixels = 0;
            var allowedOffScreenVertPixels = 0;
            var allowedOffScreenTopPixels;
          	var boundingBoxWidth = boundingBox.right - boundingBox.left + 1;
        	var boundingBoxHeight = boundingBox.bottom - boundingBox.top + 1;
            if (mustRemainVisibleGlobalPixels != null) {
            	console.log("mustRemainVisibleGlobalPixels = " + mustRemainVisibleGlobalPixels);
            	var mustRemainVisibleHorizPixels = 
            		_self.scaleXToLocalPixels(mustRemainVisibleGlobalPixels); 
            	var mustRemainVisibleVertPixels = 
            		_self.scaleYToLocalPixels(mustRemainVisibleGlobalPixels);
            	console.log("mustRemainVisibleHorizPixels = " + mustRemainVisibleHorizPixels);
            	console.log("mustRemainVisibleVertPixels = " + mustRemainVisibleVertPixels);
            	allowedOffScreenHorizPixels = boundingBoxWidth - mustRemainVisibleHorizPixels;
            	allowedOffScreenVertPixels = boundingBoxHeight - mustRemainVisibleVertPixels;
            }
            if (mustRemainVisibleBottomGlobalPixels != null) {
            	var mustRemainVisibleBottomPixels = 
            		_self.scaleYToLocalPixels(mustRemainVisibleBottomGlobalPixels);
            	allowedOffScreenTopPixels = boundingBoxHeight - mustRemainVisibleBottomPixels;
            } else {
            	allowedOffScreenTopPixels = allowedOffScreenVertPixels;
            }
            
            if (boundingBox.left + xLocalDelta < parentLeft - allowedOffScreenHorizPixels) {
            	xLocalDelta = parentLeft - boundingBox.left - allowedOffScreenHorizPixels;
            }
            if (boundingBox.top + yLocalDelta < parentTop - allowedOffScreenTopPixels) {
            	yLocalDelta = parentTop - boundingBox.top - allowedOffScreenTopPixels;
            }
            if (boundingBox.right + xLocalDelta > 
            	parentRight + allowedOffScreenHorizPixels) 
            {
            	xLocalDelta = parentRight - boundingBox.right + allowedOffScreenHorizPixels;
            }
            if (boundingBox.bottom + yLocalDelta > 
            	parentBottom + allowedOffScreenVertPixels) 
            {
            	yLocalDelta = parentBottom - boundingBox.bottom + allowedOffScreenVertPixels;
            }

            console.log("Now xLocalDelta = " + xLocalDelta);
            
            // Convert to the global coordinate system
            var xGlobalDelta = _self.scaleXToGlobal(xLocalDelta);
            var yGlobalDelta = _self.scaleYToGlobal(yLocalDelta); //yLocalDelta / parseInt(div.offsetHeight) * parseInt(_self.drawCanvas.height);

            console.log("xGlobalDelta = " + xGlobalDelta);
            
            var top = _self.element.style.top;
            var left = _self.element.style.left;

            // In theory these values should actually be better, but they're rounded which causes some issues
            // they're still better than nothing though
            if (!top || !left) {
                top = _self.element.offsetTop;
                left = _self.element.offsetLeft;
            }

            var xPrevious = getPixelValue(left, _self.parentWindow.width);
            var yPrevious = getPixelValue(top, _self.parentWindow.height);

            console.log("xPrevious = " + xPrevious);
            
            var xNew = xPrevious + xGlobalDelta;
            var yNew = yPrevious + yGlobalDelta;
            
            console.log("xNew = " + xNew);

            var xNewLocal = _self.scaleXToLocal(xNew);
            var yNewLocal = _self.scaleYToLocal(yNew);
            
            console.log("xNewLocal = " + xNewLocal);
            
            console.log("old x (left) = " + left);
            console.log("setting left to " + xNewLocal);
            
            _self.element.style.left = xNewLocal;
            _self.element.style.top = yNewLocal;

            // Limit sending events to the max update interval
            var now = new Date();
            if ((lastEvent.getTime() + _self.maxUpdateInterval) < now.getTime()) {
                _self.sendMovedMessage(xNew, yNew);
                lastEvent = now;
            }
            event.preventDefault();
            event.stopPropagation();
        };
        
        var mouseMoveListener = function(event) {
            if (_self.moving) {
                // Calculate the delta in the local coordinate system
                var xLocalDelta = event.screenX - xStart;
                var yLocalDelta = event.screenY - yStart;
                
                xStart = event.screenX;
                yStart = event.screenY;

                _self.adjustPosition(xLocalDelta, yLocalDelta);
            }
        };

        var preventDefault = function(event) {
            if (_self.moving) {
                event.preventDefault();
            }
        };

        _self.addElementEventListener(moveHandle, "mousedown", function(event) {
            if (event.button == 0) {
                xStart = event.screenX;
                yStart = event.screenY;
                lastEvent = new Date();
                _self.moving = true;
                _self.element.parentNode.style.pointerEvents = "all";
                _self.element.style.transition = "";
                event.preventDefault();
                event.stopPropagation();
            }
        });
        _self.addElementEventListener(_self.element.parentNode, "mousemove", mouseMoveListener, false);
        _self.addDocumentEventListener("mousemove", preventDefault, false);
//        A variant of this block is needed in quirks mode because mouseup isn't triggered when the mouse is outside the browser window
//        element.ownerDocument.addEventListener("mouseout", function(event) {
//              With the "html" doctype the following line detects the mouse pointer leaving the browser window, if the mouse button is NOT down
//            if (!event.relatedTarget || event.relatedTarget == null) {
//              With no doctype (quirks mode?) the following line detects the mouse pointer leaving the browser window regardless of the state of the buttons
//            if (!event.relatedTarget || event.relatedTarget == element.ownerDocument.body.parentNode) {
//                removeListeners();
//            }
//        }, false);
        _self.addDocumentEventListener("mouseup", function(event) {
            if (event.button == 0 && _self.moving) {
                _self.moving = false;
                _self.element.parentNode.style.pointerEvents = "";
                var globalX = getPixelValue(_self.element.style.left, _self.parentWindow.width);
                var globalY = getPixelValue(_self.element.style.top, _self.parentWindow.height);
                _self.sendMovedMessage(globalX, globalY);
                event.preventDefault();
                event.stopPropagation();
            }
        });

        this.sendMovedMessage = function(xNew, yNew) {
            var movedMessage = new Int16Array(3);
            movedMessage[0] = WINDOW_MOVED_MESSAGE;
            movedMessage[1] = xNew;
            movedMessage[2] = yNew;
            topic.sendMessage(movedMessage);
        };
    }

    if (topic.metadata.resizeable) {
        // add handles and javascript listeners for mouse events to the parent div if this window can be resized
        var resizeHandle = _self.element.ownerDocument.createElement("div");
        resizeHandle.classList.add("handle");
        resizeHandle.classList.add("resize-handle");
        resizeHandle.setAttribute(IGNORE_INTERACTION_FLAG, "true");

        _self.resizeHandle = resizeHandle;
        
        _self.resizing = false;
        var startX;
        var startY;

        _self.addElementEventListener(resizeHandle, "mousedown", function(event){
            if(event.button === 0) {
                _self.resizing = true;
                _self.element.style.border = "2px solid black";
                startX = event.clientX;
                startY = event.clientY;
                event.preventDefault();
                event.stopPropagation();
            }
        });

        _self.addDocumentEventListener("mousemove", function(event) {
            if (_self.resizing) {
                var deltaX = event.clientX - startX;
                var deltaY = event.clientY - startY;

                var boundingBox = getBoundingBox(_self.element, _self.resizeHandle, _self.closeHandle, 
                		_self.moveHandle);

                console.log("Bounding box:");
                console.log(boundingBox);
                
                var parentWindowOffset = getOffset(_self.parentWindow.element);
                var parentLeft = parentWindowOffset.left;
                var parentTop = parentWindowOffset.top;
                var parentWindowElemStyle = _self.parentWindow.element.ownerDocument.defaultView.getComputedStyle(_self.parentWindow.element);
                var parentWidth = parseFloat(parentWindowElemStyle.width);
                var parentHeight = parseFloat(parentWindowElemStyle.height);
                var parentRight = parentLeft + parentWidth;
                var parentBottom = parentTop + parentHeight;
                console.log("deltaX = " + deltaX);
                console.log("parentLeft = " + parentLeft);
                console.log("parentWidth = " + parentWidth);

                // Make sure the user can't enlarge the window so the bottom or right edges hang outside
                // of the containing window.
                if (boundingBox.right + deltaX > parentRight) {
                	deltaX = parentRight - boundingBox.right;
                }
                if (boundingBox.bottom + deltaY > parentBottom) {
                	deltaY = parentBottom - boundingBox.bottom;
                }
                
                console.log("Now deltaX = " + deltaX);
             
                var scaledDeltaX = _self.scaleXToGlobal(deltaX);
                var scaledDeltaY = _self.scaleYToGlobal(deltaY);

                if (topic.metadata.maintainAspect) {
                    var elementAspect = _self.height / _self.width;

                    if (Math.abs(deltaY * elementAspect) > Math.abs(deltaX / elementAspect)) {
                        scaledDeltaX = scaledDeltaY / elementAspect;
                    } else {
                        scaledDeltaY = scaledDeltaX * elementAspect;
                    }
                }

                // TODO should we draw a resize guide showing the size the element will be once it's resized, or resize the actual element?
                // We should probably avoid resizing the actual content
                _self.resizeElement(scaledDeltaX, scaledDeltaY);
                event.preventDefault();
                event.stopPropagation();
                startX = event.clientX;
                startY = event.clientY;
            }
        });

        _self.addDocumentEventListener("mouseup", function(event) {
            if(event.button === 0 && _self.resizing) {
                _self.resizing = false;
                _self.element.style.border = "";
                _self.resizeElement(0, 0, 0);
                event.preventDefault();
                event.stopPropagation();
            }
        });

        _self.element.appendChild(resizeHandle);
    }

    if (topic.metadata.closeable) {
        // Add a close handle
        var closeHandle = _self.element.ownerDocument.createElement("div");
        closeHandle.classList.add("close-handle");
        closeHandle.classList.add("handle");
        closeHandle.setAttribute(IGNORE_INTERACTION_FLAG, "true");
        _self.addElementEventListener(closeHandle, "click", function(event) {
            _self.close();
            event.preventDefault();
            event.stopPropagation();
        });
        _self.element.appendChild(closeHandle);
        _self.closeHandle = closeHandle;
    }

    _self.close = function() {
        var closeMessage = new Int16Array(1);
        closeMessage[0] = WINDOW_CLOSED_MESSAGE;
        topic.sendMessage(closeMessage);
        _self.closed();
    };

    this.messageHandlers[WINDOW_CLOSED_MESSAGE] = function(message) {
        _self.closed();
    };

    if(topic.metadata.zoomable) {
        var zoomInHandle = _self.element.ownerDocument.createElement("div");
        zoomInHandle.classList.add("handle");
        zoomInHandle.classList.add("zoom-in-handle");
        _self.addElementEventListener(zoomInHandle, "click", function(event) {
            _self.zoomIn();
            event.preventDefault();
            event.stopPropagation();
        });
        zoomInHandle.setAttribute(IGNORE_INTERACTION_FLAG, "true");
        _self.element.appendChild(zoomInHandle);

        var zoomOutHandle = _self.element.ownerDocument.createElement("div");
        zoomOutHandle.classList.add("handle");
        zoomOutHandle.classList.add("zoom-out-handle");
        _self.addElementEventListener(zoomOutHandle, "click", function(event) {
            _self.zoomOut();
            event.preventDefault();
            event.stopPropagation();
        });
        zoomOutHandle.setAttribute(IGNORE_INTERACTION_FLAG, "true");
        _self.element.appendChild(zoomOutHandle);

        _self.zoomLevel = 100;

        var zoomLevelIndicator = _self.element.ownerDocument.createElement("input");
        zoomLevelIndicator.type = "text";
        zoomLevelIndicator.classList.add("handle");
        zoomLevelIndicator.classList.add("zoom-indicator");
        zoomLevelIndicator.setAttribute("ignore-interaction", "true");
        _self.element.appendChild(zoomLevelIndicator);

        _self.addElementEventListener(zoomLevelIndicator, "blur", function(event) {
            var indicatorValue = parseInt(zoomLevelIndicator.value);
            if (indicatorValue) {
                indicatorValue = Math.min(300, indicatorValue);
                indicatorValue = Math.max(25, indicatorValue);
                _self.zoomLevel = indicatorValue;
                _self.applyZoom();
            }
            zoomLevelIndicator.value = i18n.t("assistI18n:shared.formattedPercent", {"number": _self.zoomLevel});
        });

        _self.addElementEventListener(zoomLevelIndicator, "keypress", function(event) {
           if (event.keyCode == 13) {
               zoomLevelIndicator.blur();
           }
        });

        // This is here as the event listeners which send mouse events to the remote endpoint would normally prevent the default action.
        _self.addElementEventListener(zoomLevelIndicator,"click", zoomLevelIndicator.focus);

        _self.sendZoomLevelChangedMessage = function() {
            zoomLevelIndicator.value = i18n.t("assistI18n:shared.formattedPercent", {"number": _self.zoomLevel});
            var zoomInMessage = new Int16Array(2);
            zoomInMessage[0] = DOCUMENT_ZOOMED_LEVEL_CHANGED;
            zoomInMessage[1] = _self.zoomLevel;
            topic.sendMessage(zoomInMessage);
        };

        _self.zoomIn = function() {
            _self.zoomLevel = Math.min(_self.zoomLevel + (10 * Math.max(5, Math.round(_self.zoomLevel / 100))), 300);
            _self.applyZoom();
        };

        _self.zoomOut = function() {
            _self.zoomLevel = Math.max(_self.zoomLevel - (10 * Math.max(5, Math.round(_self.zoomLevel / 100))), 25);
            _self.applyZoom();
        };
        _self.applyZoom = function() {
            _self.sendZoomLevelChangedMessage();
        };

        _self.messageHandlers[DOCUMENT_ZOOMED_LEVEL_CHANGED] = function(message) {
            _self.zoomLevel = new Int16Array(message.buffer, 2, 1)[0];
            zoomLevelIndicator.value = i18n.t("assistI18n:shared.formattedPercent", {"number": _self.zoomLevel});
        };
    }

    this.shareSubWindow = function(elementToShare, metadata, createdCallBack) {
        metadata.type = "shared-window";
        topic.openSubtopic(metadata, function(newSubtopic){
            var newWindow = new HostSharedWindow(newSubtopic, elementToShare, _self);
            _self.children.push(newWindow);
            createdCallBack(newWindow, newSubtopic);
        });
    };

    this.sendResizedMessage = function() {
        var windowResizedMessage = new Int16Array(3);
        windowResizedMessage[0] = WINDOW_RESIZED_MESSAGE;
        windowResizedMessage[1] = _self.width;
        windowResizedMessage[2] = _self.height;
        topic.sendMessage(windowResizedMessage);
    };

    topic.messageReceived = function(source, payload) {
        // screen related message received
        var type = new Int16Array(payload.buffer, 0, 1)[0];
        if (_self.messageHandlers[type]) {
            _self.messageHandlers[type](payload);
        } else {
            console.log("Unhandled message of type: " + type + " in topic " + topic);
        }

    };

    this.sendSizeAndPosition = function() {
        // Force sending size and position, TODO link this to new members joining
        _self.sendResizedMessage();
        if (_self.parentWindow) {
            _self.sendMovedMessage(getPixelValue(_self.element.style.left), getPixelValue(_self.element.style.top));
        }
    };

    this.addAnnotationWindow = function(callBack) {
        var metadata = {};
        metadata.type = "annotation";
        topic.openSubtopic(metadata, function(newSubtopic){
            var annotationSvg = _self.element.ownerDocument.createElementNS(SVG_NAMESPACE, "svg");
            addClassSvg(annotationSvg, "annotation-layer"); // ie doesn't support classList on svg
            _self.element.appendChild(annotationSvg);
            var annotations = new AnnotationWindow(newSubtopic, annotationSvg, _self);
            _self.children.push(annotations);
            callBack(annotations);
        });
    };
    
    this.addSpotlightWindow = function(callBack) {
        var metadata = {};
        metadata.type = "spotlight";
        topic.openSubtopic(metadata, function(newSubtopic){
            var spotlightSvg = _self.element.ownerDocument.createElementNS(SVG_NAMESPACE, "svg");
            addClassSvg(spotlightSvg, "spotlight-layer"); // ie doesn't support classList on svg
            _self.element.appendChild(spotlightSvg);
            var spotlights = new SpotlightWindow(newSubtopic, spotlightSvg, _self);
            _self.children.push(spotlights);
            callBack(spotlights);
        });
    };
    
    //The reverse of scaleXToGlobal
    this.scaleXToLocalPixels = function(globalX) {
    	return globalX * (globalX / _self.scaleXToGlobal(globalX));
    }
    
    //The reverse of scaleYToGlobal
    this.scaleYToLocalPixels = function(globalY) {
    	return globalY * (globalY / _self.scaleYToGlobal(globalY));
    }
}

SharedWindow.prototype = {
    remoteViewSizeChanged : function(width, height) {
        console.log("Remote view size changed for a view without a parent. New size is: " + width +" * " + height);
    },

    parentResized : function() {
        console.log("The parent of this element has been resized");
    }
};

function HostSharedWindow(topic, sharedElement, parentWindow) {
    SharedWindow.call(this, topic, sharedElement, parentWindow);
    var _self = this;

    _self.imageFormat = IMAGE_FORMAT.PNG;

    var screenData = {};
    // Size of chunks of image to send
    var size = 40;

    // The factor to scale the image by when sending
    var scaleFactor = 0.5;

    this.scaleXToGlobal = function(localX) {
        // No scaling for host
        return localX;
    };
    
    this.setImageQualityScaleFactor = function(factor) {
        scaleFactor = Math.min(1, Math.max(0, factor));
    };

    this.scaleYToGlobal = function(localY) {
        // No scaling for host
        return localY;
    };

    this.scaleXToLocal = function(globalX) {
        // No scaling but add the units
        return  globalX + "px";
    };

    this.scaleYToLocal = function(globalY) {
        // no scaling but add the units
        return  globalY + "px";
    };

    var sendRectangleUpdate = function (data, xOffset, yOffset, fullWidth, fullHeight, format) {
        var data = data
            .substring(data.indexOf(",") + 1);
        var binary = window.atob(data);
        var len = binary.length;

        var message = new Uint8Array(len + 12);
        var header = new Int16Array(message.buffer, 0, 6);
        header[0] = WINDOW_RECTANGLE_UPDATED;
        header[1] = xOffset;
        header[2] = yOffset;
        header[3] = fullWidth;
        header[4] = fullHeight;
        header[5] = format;
        var payload = new Uint8Array(message.buffer, 12);

        for (var i = 0; i < len; ++i) {
            payload[i] = binary.charCodeAt(i);
        }

        topic.sendMessage(message);
    };

    var screenData = {};
    var section = _self.element.ownerDocument.createElement('canvas');
    this.contentChanged = function(canvas, force) {
        var context = section.getContext("2d");

        var resized = canvas.height != _self.height || canvas.width != _self.width;
        _self.height = canvas.height;
        _self.width = canvas.width;
        
        if (force == true) {
            screenData = {};
        }
        
        var annotationWindow = null;
        var svg = null;
        for (var i = 0; i < _self.children.length; i++) {
        	if (_self.children[i] instanceof AnnotationWindow) {
        		annotationWindow = _self.children[i];
        		svg = annotationWindow.element;  //Is this correct?
                break;
        	}
        }
        
		var annotationLineEndpoints = [];
        if (svg != null) {
        	var pathElems = svg.getElementsByTagNameNS(SVG_NAMESPACE, "path");
        	for (var i = 0; i < pathElems.length; i++) {
        		var pathElem = pathElems[i];
        		var dAttr = pathElem.getAttribute("d");
        		var re = /\b[ML]\s+(\d+)\s+(\d+)/g;
        		var matches = re.exec(dAttr);
        		for (var j = 1; j < matches.length; j += 2) {
        			annotationLineEndpoints.push([matches[j], matches[j+1]]);
        		}
        	}
        }
        
        var alreadyClearedAnnotations = false;
        
        if (resized) {
            // Send the actual height and width to the topic.
            _self.sendResizedMessage();
            for (var i = 0; i < _self.children.length; i++) {
                _self.children[i].parentResized();
            }
            // Clear the cached data
            screenData = {};
            // As the screen has been effectively cleared, send a very low resolution
            // version of the whole screen to make the update seem faster/seemless
            context.canvas.width = Math.min(size * 3, _self.width);
            context.canvas.height = Math.min(size * 3, _self.height);
            context.drawImage(canvas, 0, 0, context.canvas.width, context.canvas.height);
            sendRectangleUpdate(section.toDataURL("image/"+IMAGE_FORMAT[_self.imageFormat]),
                0, 0, _self.width, _self.height, _self.imageFormat);

            // Not all shared windows have an annotation layer.
            if (annotationWindow) {
                annotationWindow.clear(true);
                alreadyClearedAnnotations = true;
            }
        }

        context.canvas.width = size;
        context.canvas.height = size;

        var sentData = false;
        for (var x = 0; x < _self.width; x += (size / scaleFactor)) {
            var blockWidth = Math.min(size / scaleFactor, _self.width - x);
            var x2 = x + blockWidth - 1;
            for (var y = 0; y < _self.height; y += (size / scaleFactor)) {
                var blockHeight = Math.min(size / scaleFactor, _self.height - y);
                var y2 = y + blockHeight - 1;

                context.clearRect(0, 0, size, size);
                context.drawImage(canvas, x, y, blockWidth, blockHeight, 0, 0, size, size);

                var imageChunk = section.toDataURL("image/"+IMAGE_FORMAT[_self.imageFormat]);
                var key = x + "," + y;
                
                if (screenData[key] == undefined) {
                    screenData[key] = "";
                }

                if (screenData[key] === imageChunk) {
                    // same data - do no send
                } else {
                    sentData = true;
                    screenData[key] = imageChunk;

                    sendRectangleUpdate(imageChunk,
                        x, y, blockWidth, blockHeight, _self.imageFormat);
                    
                    if (!alreadyClearedAnnotations && annotationWindow) {
                    	for (var i = 0; i < annotationLineEndpoints.length; i++) {
                    		var endpoint = annotationLineEndpoints[i];
                    		var ex = endpoint[0];
                    		var ey = endpoint[1];
                    		if (ex >= x && ex <= x2 && ey >= y && ey <= y2) {
                    			//Endpoint is in block, so clear the annotations
                    			console.log("Endpoint (" + ex + ", " + ey + ") is in block (" + 
                    					x + ", " + y + "); clearing annotations.");
                    			annotationWindow.clear(true);
                    			alreadyClearedAnnotations = true;
                    			break;
                    		}
                    	}
                    }
                }
            }
        }
    };

    if (topic.metadata.moveable) {
        this.messageHandlers[WINDOW_MOVED_MESSAGE] = function (message) {
            var location = new Int16Array(message.buffer, 2, 2);
            //   move this if it is not the (a?) top level window
            if (_self.parentWindow) {
                _self.element.style.transition = "top " + _self.maxUpdateInterval + ", left " + _self.maxUpdateInterval;
                _self.element.style.left = location[0] + "px";
                _self.element.style.top = location[1] + "px";
            }
        };
    }
    // We're the host so send the initial size and position
    _self.sendResizedMessage();
    if (_self.parentWindow) { // Only send the position if there is something for it to be relative to
        _self.sendMovedMessage(getPixelValue(_self.element.style.left, _self.parentWindow.width),
            getPixelValue(_self.element.style.top, _self.parentWindow.height));
    }
    var mouseDownElement;
    if (topic.metadata.interactive) {
        _self.element.classList.add("interactive");
        var dispatchMouseEvent = function(eventType, details) {
            var localX = details[0];
            var localY = details[1];
            var button;
            if (details.length == 3) {
                button = details[2];
            } else {
                button = null;
            }
            var rect = _self.element.getBoundingClientRect();
            var globalX = rect.left + localX;
            var globalY = rect.top + localY;
            var targetElement = _self.element.ownerDocument.elementFromPoint(globalX, globalY);
            if (targetElement && !targetElement.getAttribute(IGNORE_INTERACTION_FLAG)) {
                var event = targetElement.ownerDocument.createEvent('MouseEvents');
                event.initMouseEvent(eventType, true, true, targetElement.ownerDocument.defaultView, 1, 0, 0, globalX, globalY,
                    false, false, false, false, button, null);
                targetElement.dispatchEvent(event);
            }
            return targetElement;
        };

        this.messageHandlers[MOUSE_DOWN_MESSAGE] = function (message) {
            var details = new Int16Array(message.buffer, 2, 3);
            var targetElement = dispatchMouseEvent("mousedown", details);
            if (details[2] == 0) {
                mouseDownElement = targetElement;
            }
        };

        this.messageHandlers[MOUSE_UP_MESSAGE] = function (message) {
            var details = new Int16Array(message.buffer, 2, 3);
            var targetElement = dispatchMouseEvent("mouseup", details);
            if (details[2] == 0 && targetElement && targetElement == mouseDownElement) {
                var clickEvent = targetElement.ownerDocument.createEvent('MouseEvents');
                clickEvent.initEvent('click', true, true);
                clickEvent.assist_generated = true;
                targetElement.dispatchEvent(clickEvent);
            }
            mouseDownElement = null;
        };

        this.messageHandlers[MOUSE_DOUBLE_CLICK_MESSAGE] = function (message) {
            var mouseMessage = new Int16Array(message.buffer, 2, 2);
            dispatchMouseEvent("dblclick", mouseMessage);
        };

        this.messageHandlers[MOUSE_MOVE_MESSAGE] = function (message) {
            var mouseMessage = new Int16Array(message.buffer, 2, 2);
            dispatchMouseEvent("mousemove", mouseMessage);
        };
    }

    _self.messageHandlers[PUSH_DOCUMENT_MESSAGE] = function(message) {
        var payload = new Uint8Array(message.buffer, 2);
        var url = String.fromCharCode.apply(null, payload);
        topic.openSubtopic({type : "shared-window", moveable : true, resizeable : true, interactive : true, closeable : true, zoomable : true}, function(newTopic){
            var container = _self.element.ownerDocument.createElement("div");
            _self.element.appendChild(container);
            var documentWindow = new DocumentWindow(newTopic, container, _self, url);
            _self.children.push(documentWindow);
        });
    };

    _self.messageHandlers[PUSH_CONTENT_START] = function(message) {
        var payload = new Uint8Array(message.buffer, 2);
        _self.pushContentContentType = String.fromCharCode.apply(null, payload);
        _self.pushContentDataChunks = [];
    };
    
    _self.messageHandlers[PUSH_CONTENT_CHUNK] = function(message) {
    	var payload = new Uint8Array(message.buffer, 2);
    	_self.pushContentDataChunks[_self.pushContentDataChunks.length] = payload;
    };
    
    _self.messageHandlers[PUSH_CONTENT_END] = function(message) {
    	//Find total byte length of the pushed chunks
        var bytes = 0;
        for (var i = 0; i < _self.pushContentDataChunks.length; i++) {
            bytes += _self.pushContentDataChunks[i].byteLength;
        }
        //Combine chunks into one Uint8Array.
        var fullData = new Uint8Array(bytes);
        var nextOffset = 0;
        for (i = 0; i < _self.pushContentDataChunks.length; i++) {
            fullData.set(_self.pushContentDataChunks[i], nextOffset);
            nextOffset += _self.pushContentDataChunks[i].byteLength;
        }
        var dataUri = "data:" + _self.pushContentContentType + ";base64," + encode(fullData);
        console.log("Pushed content received.");

        topic.openSubtopic({type : "shared-window", moveable : true, resizeable : true, 
        		interactive : true, closeable : true, zoomable : true}, function(newTopic) {
            var container = _self.element.ownerDocument.createElement("div");
            _self.element.appendChild(container);
            console.log("Creating new document window.");
            var documentWindow = new DocumentWindow(newTopic, container, _self, dataUri);
            _self.children.push(documentWindow);
        });
    };


    var updateTimer;
    _self.scheduleObserver = function() {
        // configuration of the observer:
        var config = {
            attributes : true,
            childList : true,
            characterData : true,
            subtree : true,
            attributeOldValue : true
        };

        var observer = new MutationObserver(function(mutations) {
            var refresh = false;
            for (var i = 0; i < mutations.length && !refresh; i++) {
                var mutation = mutations[i];
                if (mutation.type == "attributes" && mutation.attributeName == "style") {
                    var oldStyle = mutation.oldValue;
                    if (oldStyle) {
                        oldStyle.top = mutation.target.style.top;
                        oldStyle.left = mutation.target.style.left;
                    }
                    // If the only thing that has changed is the position then don't redraw
                    refresh = (oldStyle == mutation.target.style);

                } else {
                    refresh = true;
                }
            }
            if (refresh) {
                _self.refreshContent();
            }
        });

        // pass in the target node, as well as the observer options
        observer.observe(_self.element, config);

        _self.closed = function() {
            try {
                if (_self.parentWindow) {
                    _self.element.parentNode.removeChild(_self.element);
                }
                observer.disconnect();
                _self.removeElementEventListeners();
            } catch(e) {
                console.warn(e);
            }
            
            //Clear annotations when a shared document window is closed.
            _self.clearAnnotations();
            
            if (_self.parentWindow) {
                _self.parentWindow.children.splice(_self.parentWindow.children.indexOf(_self), 1);
            }
            
            for (var i = _self.children.length; i > 0; i--) {
                _self.children[i - 1].closed();
            }
        };
    };
    
    _self.clearAnnotations = function() {
        var parent = _self.parentWindow;
        for (var i = 0; i < parent.children.length; i++) {
        	var x = parent.children[i];
        	if (x instanceof AnnotationWindow) {
        		x.clear(true);
        	}
        }
    };

    _self.refreshContent = function() {
        if (updateTimer) {
            clearTimeout(updateTimer);
        }
        updateTimer = setTimeout(function() {
            html2canvas(_self.element, {
                onrendered: _self.contentChanged,
                useCORS: true
            });
        }, 500);
    };

    _self.parentResized = function() {
        _self.sendMovedMessage(getPixelValue(_self.element.style.left, _self.parentWindow.width),
            getPixelValue(_self.element.style.top, _self.parentWindow.width));
    };

    _self.close = function() {
        var closeMessage = new Int16Array(1);
        closeMessage[0] = WINDOW_CLOSED_MESSAGE;
        topic.sendMessage(closeMessage);
        _self.closed();
    };

    _self.messageHandlers[WINDOW_RESIZED_MESSAGE] = function(message) {
        var newSize = new Int16Array(message.buffer, 2, 2);
        _self.element.style.width = newSize[0] + "px";
        _self.element.style.height = newSize[1] + "px";
        _self.refreshContent();
    };

    _self.resizeElement = function(deltaX, deltaY) {
        var newX = parseFloat(_self.element.style.width) + deltaX;
        var newY = parseFloat(_self.element.style.height) + deltaY;
        _self.element.style.width = _self.scaleXToLocal(newX);
        _self.element.style.height = _self.scaleYToLocal(newY);
        _self.refreshContent();
    };

    _self.messageHandlers[INPUT_AT_LOCATION] = function(message) {
        var location = new Int16Array(message.buffer, 2, 2);
        var x = location[0];
        var y = location[1];
        var payload = new Uint8Array(message.buffer, 6);
        var inputString = String.fromCharCode.apply(null, payload);
        // TODO if the top element is not appropriate we could hide it and check the one under it, continuing until we hit a valid element or the document body
        // then un-hide all of the hidden elements
        var targetElement = _self.element.ownerDocument.elementFromPoint(x, y);
        // TODO validate the target element, handle scenarios where it isn't a text input element
        targetElement.value = inputString;
        _self.refreshContent();
    };
    
    _self.messageHandlers[SCROLL_UP_MESSAGE] = function(message) {
        scrollBy(4, -1);
    };
    
    _self.messageHandlers[SCROLL_DOWN_MESSAGE] = function(message) {
        scrollBy(4, 1);
    };
    
    function scrollBy(divisor, multiplier) {
        var document = _self.element.ownerDocument;
        var window = document.defaultView;
        
        var viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        
        var quarterViewport = viewportHeight / divisor;
        window.scrollBy(0, (quarterViewport * multiplier));
    }
}

HostSharedWindow.prototype = Object.create(SharedWindow.prototype);

function ClientSharedWindow(topic, containingDiv, parentWindow) {
    SharedWindow.call(this, topic, containingDiv, parentWindow);
    var _self = this;

    // add a canvas to the parent div to draw the remote view on
    _self.drawCanvas = _self.element.ownerDocument.createElement("canvas");
    // set appropriate CSS classes
    _self.drawCanvas.classList.add("remote-view-element");
    _self.drawCanvas.classList.add("drawing-layer");
    _self.element.classList.add("shared-window");
    _self.element.classList.add("active");

    _self.element.appendChild(_self.drawCanvas);
    
    if (topic.metadata.scrollable) {
            
        var sendMouseMessage = function(messageType, event) {
            var mouseMessage = new Int16Array(1);
            mouseMessage[0] = messageType;

            topic.sendMessage(mouseMessage);            
            event.preventDefault();
        };
        
        _self.scrollbarTop = _self.element.ownerDocument.createElement("div");
        _self.scrollbarTop.classList.add("scrollbar");
        _self.scrollbarTop.classList.add("top");
        
        _self.scrollbarBottom = _self.element.ownerDocument.createElement("div");
        _self.scrollbarBottom.classList.add("scrollbar");
        _self.scrollbarBottom.classList.add("bottom");
        
        _self.element.appendChild(_self.scrollbarTop);
        _self.element.appendChild(_self.scrollbarBottom);
        
        _self.addElementEventListener(_self.scrollbarTop, "click", function(event) {
            sendMouseMessage(SCROLL_UP_MESSAGE, event);
        });
        
        _self.addElementEventListener(_self.scrollbarBottom, "click", function(event) {
            sendMouseMessage(SCROLL_DOWN_MESSAGE, event);
        });

    }

    this.scaleXToGlobal = function(localX) {
        return localX / parseInt(_self.element.offsetWidth) * parseInt(_self.drawCanvas.width);
    };

    this.scaleYToGlobal = function(localY) {
        return localY / parseInt(_self.element.offsetHeight) * parseInt(_self.drawCanvas.height);
    };

    this.scaleXToLocal = function(globalX) {
        return (globalX / _self.parentWindow.width * 100) + "%"
    };

    this.scaleYToLocal = function(globalY) {
        return (globalY / _self.parentWindow.height * 100) + "%"
    };

    // TODO add a canvas or SVG to the parent div to draw annotations on and a subtopic to send them in



    this.parentResized = function() {
        _self.element.style.width = (_self.width / _self.parentWindow.width * 100) + "%";
        _self.element.style.height = (_self.height / _self.parentWindow.height * 100) + "%";
    };

    // assign message handlers
    this.messageHandlers[WINDOW_RESIZED_MESSAGE] = function(message) {
        var size = new Int16Array(message.buffer, 2, 2);
        var changed = false;
        _self.width = size[0];
        if (_self.drawCanvas.width != _self.width) {
            _self.drawCanvas.width = _self.width;
            changed = true;
        }
        _self.height = size[1];
        if(_self.drawCanvas.height != _self.height) {
            _self.drawCanvas.height = _self.height;
            changed = true;
        }
        if (_self.parentWindow) {
            // set the height and width if this isn't a top level window
            _self.element.style.width = (size[0] / _self.parentWindow.width * 100) + "%";
            _self.element.style.height = (size[1] / _self.parentWindow.height * 100) + "%";
        } else if (changed) {
            // call back if this is the (a?) top level window
            _self.remoteViewSizeChanged(size[0], size[1]);
        }
        for (var i = 0; i < _self.children.length; i++) {
            _self.children[i].parentResized();
        }
    };

    this.messageHandlers[WINDOW_MOVED_MESSAGE] = function(message) {
        var location = new Int16Array(message.buffer, 2, 2);
        //   move this if it is not the (a?) top level window
        if (_self.parentWindow) {
            _self.element.style.left = (location[0] / _self.parentWindow.width * 100) + "%";
            _self.element.style.top = (location[1] / _self.parentWindow.height * 100) + "%";
        }
    };

    this.messageHandlers[WINDOW_RECTANGLE_UPDATED] = function(message) {
        var header = new Int16Array(message.buffer, 2, 5);
        var xOffset = header[0];
        var yOffset = header[1];
        var scaledWidth = header[2];
        var scaledHeight = header[3];
        var format = IMAGE_FORMAT[header[4]];
        var imageData = new Uint8Array(message.buffer, 12);
        var base64 = "data:image/" + format + ";base64," + encode(imageData);
        loadBase64Image(_self.drawCanvas, base64, xOffset, yOffset, scaledWidth, scaledHeight);
    };

    if (topic.metadata.interactive) {
        _self.element.classList.add("interactive");

        var mouseDown = false;
        var sendMouseMessage = function(messageType, event, optionalParam) {
            if (!event.sentRemotely) {
                var boundingRect = _self.element.getBoundingClientRect();
                var messageSize = (optionalParam || optionalParam === 0) ? 4 : 3;
                var mouseMessage = new Int16Array(messageSize);
                mouseMessage[0] = messageType;
                mouseMessage[1] = _self.scaleXToGlobal(event.clientX - boundingRect.left);
                mouseMessage[2] = _self.scaleYToGlobal(event.clientY - boundingRect.top);
                if (optionalParam || optionalParam === 0) {
                    mouseMessage[3] = optionalParam;
                }
                topic.sendMessage(mouseMessage);
                event.sentRemotely = true;
            }
            event.preventDefault();
        };
        var lastSent;
        _self.addDocumentEventListener("mouseup", function(event) {
            if (!_self.moving) {
                if (event.button == 0) {
                    mouseDown = false;
                }
                sendMouseMessage(MOUSE_UP_MESSAGE, event, event.button);
            }
        }, false);
        _self.addElementEventListener(_self.element, "mousedown", function(event) {
            if (!_self.moving) {
                if (event.button == 0) {
                    mouseDown = true;
                }
                sendMouseMessage(MOUSE_DOWN_MESSAGE, event, event.button);
            }
        }, false);
        _self.addElementEventListener(_self.element, "mousemove", function(event) {
            if (!_self.moving && mouseDown) {
                var now = new Date();
                if (!(lastSent &&
                    (lastSent.getTime() + _self.maxUpdateInterval > now.getTime()))) {
                    sendMouseMessage(MOUSE_MOVE_MESSAGE, event);
                    lastSent = now;
                }
            }
        }, false);
        _self.addElementEventListener(_self.element, "dblclick", function(event) {
            if (!_self.moving) {
                sendMouseMessage(MOUSE_DOUBLE_CLICK_MESSAGE, event);
            }
        }, false);
    }

    this.disableInteraction = function() {
        _self.element.classList.remove("active");
    };

    this.enableInteraction = function() {
        _self.element.classList.add("active");
    };

    // Sends a message telling the windows host to create a new window containing the document
    // in the passed url
    this.pushDocument = function(docUrl) {
        var pushDocMessage = new Uint8Array(docUrl.length + 2);
        var header = new Int16Array(pushDocMessage.buffer, 0, 1);
        header[0] = PUSH_DOCUMENT_MESSAGE;
        var payload = new Uint8Array(pushDocMessage.buffer, 2);
        for (var i = 0; i < docUrl.length; i++) {
            payload[i] = docUrl.charCodeAt(i);
        }
        topic.sendMessage(pushDocMessage);
    };

    // Retrieves a document from the given url, and pushes that document to the consumer.  Sends a 
    // message telling the windows host to create a new window containing the document whose contents 
    // are pushed over the socket
    this.pushContent = function(docUrl) {
    	//Retrieve the document contents
    	var oReq = new XMLHttpRequest();
    	oReq.open("GET", docUrl, true);
    	oReq.responseType = "arraybuffer";

    	oReq.onreadystatechange = function(event) {
    		if (oReq.readyState == 4) {
    			if (oReq.status == 200) {
    				var contentType = oReq.getResponseHeader("content-type");
    				var arrayBuffer = oReq.response;
    				if (arrayBuffer == null) {
    					console.log("Error retrieving document: " + docUrl);
    					return;
    				}
    				var content = new Uint8Array(arrayBuffer);
    				//First send the start message, with the content type (mime type)
    				var startMessage = new Uint8Array(contentType.length + 2);
    				var startMessageHeader = new Int16Array(startMessage.buffer, 0, 1);
    				startMessageHeader[0] = PUSH_CONTENT_START;
    				var startMessagePayload = new Uint8Array(startMessage.buffer, 2);
    				for (var i = 0; i < contentType.length; i++) {
    					startMessagePayload[i] = contentType.charCodeAt(i);
    				}
    				topic.sendMessage(startMessage);
    				console.log("Sent content start indicator.");
    		
    				//Then send the data chunks
    				for (var pos = 0; pos < content.length; pos += DATA_CHUNK_SIZE) {
    					var chunkSize = Math.min(content.length - pos, DATA_CHUNK_SIZE)
    					var chunkMessage = new Uint8Array(chunkSize + 2);
    					var chunkMessageHeader = new Int16Array(chunkMessage.buffer, 0, 1);
    					chunkMessageHeader[0] = PUSH_CONTENT_CHUNK;
    					var endpos = pos + DATA_CHUNK_SIZE;
    					var chunkMessagePayload = new Uint8Array(chunkMessage.buffer, 2);
    					//Copy the image data into the chunk message
    					for (var b = 0; b < DATA_CHUNK_SIZE; b++) {
    						chunkMessagePayload[b] = content[pos + b];
    					}
    					topic.sendMessage(chunkMessage);
    					console.log("Sent content data chunk.");
    				}
            
    				//Finally send the end indicator
    				var endMessage = new Uint8Array(2);
    				var endMessageHeader = new Int16Array(endMessage.buffer, 0, 1);
    				endMessageHeader[0] = PUSH_CONTENT_END;
    				topic.sendMessage(endMessage);
    				console.log("Sent content end indicator.");
    			} else {
    				console.log("Error retrieving document: " + oReq.status + " " + oReq.statusText);
    			}
        	}
    	};
    	console.log("Attempting to retrieve document at url: " + docUrl);
    	oReq.send();
    };
    
    var scheduleResizedMessage = function(delay) {
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
        }
        resizeTimeout = setTimeout(_self.sendResizedMessage, delay);
    };

    var resizeTimeout;
    this.resizeElement =function(deltaX, deltaY, delay) {
        delay = delay | 200;
        var newX = _self.width + deltaX;
        var newY = _self.height + deltaY;
        _self.element.style.width = _self.scaleXToLocal(newX);
        _self.element.style.height = _self.scaleYToLocal(newY);
        _self.width = newX;
        _self.height = newY;
        scheduleResizedMessage(delay);
    };

    var valueToSend;
    var inputLocationDiv = _self.element.ownerDocument.createElement("DIV");
    inputLocationDiv.classList.add("input-location");
    inputLocationDiv.addEventListener("click", function(event){
        var boundingRect = _self.element.getBoundingClientRect();

        var inputAtLocationMessage = new Uint8Array(valueToSend.length + 6);
        var header = new Int16Array(inputAtLocationMessage.buffer, 0, 3);
        var payload = new Uint8Array(inputAtLocationMessage.buffer, 6, valueToSend.length);
        header[0] = INPUT_AT_LOCATION;
        header[1] = _self.scaleXToGlobal(event.clientX - boundingRect.left);
        header[2] = _self.scaleYToGlobal(event.clientY - boundingRect.top);
        for (var i = 0; i < valueToSend.length; i++) {
            payload[i] = valueToSend.charCodeAt(i);
        }
        inputLocationDiv.style.pointerEvents = "";
        valueToSend = undefined;
        _self.topic.sendMessage(inputAtLocationMessage);
    });

    _self.inputAtNextClickedLocation = function(inputString) {
        valueToSend = inputString;
        inputLocationDiv.style.pointerEvents = "all";
    };

    _self.element.appendChild(inputLocationDiv);


    _self.closed = function() {
        _self.removeElementEventListeners();
        if (_self.parentWindow) {
            _self.element.parentNode.removeChild(_self.element);
            _self.parentWindow.children.splice(_self.parentWindow.children.indexOf(_self), 1);
        } else {
            _self.element.removeChild(_self.drawCanvas);
            _self.element.removeChild(inputLocationDiv);
            if (topic.metadata.scrollable) {
                _self.element.removeChild(_self.scrollbarTop);
                _self.element.removeChild(_self.scrollbarBottom);
            }
        }
        for (var i = _self.children.length; i > 0; i--) {
            _self.children[i - 1].closed();
        }
    };
}

ClientSharedWindow.prototype = Object.create(SharedWindow.prototype);

function loadBase64Image(canvas, src, x, y, width, height) {
    var img = new Image();

    img.src = src;
    img.onload = function() {
        var ctx = canvas.getContext('2d');

        ctx.drawImage(img, x, y, width, height);
    };
}

function encode(input, offset) {
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = offset || 0;

    while (i < input.length) {
        chr1 = input[i++];
        chr2 = i < input.length ? input[i++] : Number.NaN; // Not sure if the index
        chr3 = i < input.length ? input[i++] : Number.NaN; // checks are needed here

        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;

        if (isNaN(chr2)) {
            enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
            enc4 = 64;
        }
        output += keyStr.charAt(enc1) + keyStr.charAt(enc2) +
            keyStr.charAt(enc3) + keyStr.charAt(enc4);
    }
    return output;
}

function AnnotationWindow(topic, svg, parentWindow) {
    
    SharedWindow.call(this, topic, svg, parentWindow);
    var _self = this;

    var transform = svg.ownerDocument.createElementNS(SVG_NAMESPACE, "g");
    transform.setAttribute("stroke", "red");
    transform.setAttribute("stroke-width", 1);
    transform.setAttribute("fill", "none");

    svg.appendChild(transform);

    this.messageHandlers[ANNOTATION_ADDED] = function(message) {
        addAnnotations(message);
    };

    this.messageHandlers[ANNOTATIONS_SET] = function(message) {
        _self.clear(false);
        addAnnotations(message);
    };
    
    function addAnnotations(message) {
        var stringPayload = String.fromCharCode.apply(null, new Uint8Array(message.buffer, 2));
        var temp = svg.ownerDocument.createElementNS(SVG_NAMESPACE, "svg");
        
        var div = svg.ownerDocument.createElement("div"); // svg in IE doesn't support .innerHTML, but divs do
        div.innerHTML = stringPayload;
        
        if (div.firstChild) {
            temp.appendChild(div.firstChild);
        }
        
        while (temp.firstChild) {
            if (temp.firstChild.namespaceURI != SVG_NAMESPACE) {
                transform.appendChild(deepCloneWithNameSpace(svg, temp.firstChild, SVG_NAMESPACE));
                temp.removeChild(temp.firstChild);
            } else {
                transform.appendChild(temp.firstChild);
            }
        }
    }

    this.parentResized = function() {
        // TODO should we clear the annotations? They make little sense now...
        // Add the scale attribute if there is a parent to scale relative to
        if (_self.parentWindow) {
            var width = svg.parentNode.offsetWidth;
            var scale = (width / _self.parentWindow.width);
            transform.setAttribute("transform", "scale(" + scale + ")");
        }
    };


    _self.parentResized();

    var mousedown = false;
    var startX;
    var startY;
    var lastEvent;
    var boundingRect;
    _self.addElementEventListener(svg, "mousedown", function(event) {
        if (event.button == 0) {
            boundingRect = svg.parentNode.getBoundingClientRect();
            var scaleFactor = _self.parentWindow.width / svg.parentNode.offsetWidth;
            startX = Math.round((event.clientX - boundingRect.left) * scaleFactor);
            startY = Math.round((event.clientY - boundingRect.top) * scaleFactor);
            lastEvent = new Date();
            mousedown = true;
            event.preventDefault();
            event.stopPropagation();
        }
    }, false);

    var path;

    var drawPending = function() {
        if (path) {
            var div = path.ownerDocument.createElement("div");
            div.appendChild(deepCloneWithNameSpace(path, path, SVG_NAMESPACE));
            var pathString = div.innerHTML;
            var message = new Uint8Array(pathString.length + 2);
            var type = new Int16Array(message.buffer, 0, 1);
            type[0] = ANNOTATION_ADDED;
            var payload = new Uint8Array(message.buffer, 2);
            fromString(pathString, payload);
            topic.sendMessage(message);
            path = null;
        }
    };

    _self.addDocumentEventListener("mouseup", function(event) {
        mousedown = false;
        drawPending();
    }, false);

    _self.addElementEventListener(svg, "mousemove", function(event) {
        if (mousedown) {
            var scaleFactor = _self.parentWindow.width / svg.parentNode.offsetWidth;
            var pointX = Math.round((event.clientX - boundingRect.left) * scaleFactor);
            var pointY = Math.round((event.clientY - boundingRect.top) * scaleFactor);
            var now = new Date();

            path = path || svg.ownerDocument.createElementNS(SVG_NAMESPACE, "path");
            // For compactness we could drop most of the spaces and all but the first L
            var d = path.getAttribute("d") || "M " + startX + " " + startY;
            d += " L " + pointX + " " + pointY;
            path.setAttribute("d", d);
            // These could be applied in a transform or styled rather than specified every time
//            path.setAttribute("stroke", "red");
//            path.setAttribute("stroke-width", 1);
//            path.setAttribute("fill", "none");
            transform.appendChild(path);

            // Limit the sending of annotation updates to the MAX_ANNOTATION_INTERVAL
            if ((lastEvent.getTime() + _self.maxUpdateInterval) < now.getTime()) {
                drawPending();
                lastEvent = now;
                startX = pointX;
                startY = pointY;
            }
            event.preventDefault();
            event.stopPropagation();
        }
    }, false);

    this.clear = function(clearRemote) {
        try {
            while (transform.firstChild) {
                transform.removeChild(transform.firstChild);
            }
        } catch(e) {
            console.warn(e);
        }
        
        if (clearRemote) {
            var clearMessage = new Int16Array(1);
            clearMessage[0] = ANNOTATIONS_SET;
            topic.sendMessage(clearMessage);
        }
    };

    this.enableDrawing = function() {
        addClassSvg(svg, "active"); // ie doesn't support classList on svg
    };

    this.disableDrawing = function() {
        removeClassSvg(svg, "active"); // ie doesn't support classList on svg
    };

    var elementWindow = function() {
        var windowCandidates = [];
        windowCandidates.push(window);
        if (window.opener) {
            windowCandidates.push(window.opener);
        }
        // TODO also check iframes if there are any
        for (var i = 0; i < windowCandidates.length; i++) {
            if (windowCandidates[i].document == _self.element.ownerDocument)
            return windowCandidates[i];
        }
    }();

    if (elementWindow) {
        // TODO this won't be refreshed on navigation...
        _self.addElementEventListener(elementWindow, "resize", function() {
            _self.parentResized();
        });
    }
}

AnnotationWindow.prototype = Object.create(SharedWindow.prototype);

function DocumentWindow(topic, containingDiv, parentWindow, url) {
    var _self = this;
    HostSharedWindow.call(this, topic, containingDiv, parentWindow);
    _self.element.classList.add("document-window");
    var viewDiv = _self.element.ownerDocument.createElement("div");
    viewDiv.classList.add("shared-document-view");
    _self.element.appendChild(viewDiv);
    function showError(errorMessage, docFrame, isImage) {
    	if (docFrame == null) {
    		docFrame = _self.element.ownerDocument.createElement("div");
            docFrame.classList.add("document-frame");
    	}
    	var errSpan = _self.element.ownerDocument.createElement("span");
    	errSpan.classList.add("shared-document-error");
    	var shareTargetType = i18n.t("assistI18n:error.shareFail.targetType" + ((isImage == true) ? ".image" : ".document"));
    	var formattedMessage = "<p>";
    
        console.log("errormsg: " + errorMessage);
        
    	formattedMessage += i18n.t("assistI18n:error.shareFail.message", {"targetType":shareTargetType}) + "</p>";
        formattedMessage += "<p>" + i18n.t("assistI18n:error.shareFail.error", {"error":("" + errorMessage)});
    	
    	formattedMessage += "</p>";
  	    errSpan.innerHTML = formattedMessage;
    	
    	docFrame.appendChild(errSpan);
    	var errBoxWidth = 550;
    	var errBoxHeight = 175;
		var errBoxX = (_self.parentWindow.width - errBoxWidth) / 2;
		_self.element.style.left = errBoxX + "px";
		var errBoxY = (_self.parentWindow.height - errBoxHeight) / 2;
		_self.element.style.top = errBoxY + "px";
		_self.sendMovedMessage(errBoxX, errBoxY);
		_self.width = errBoxWidth + "px";
		_self.element.style.width = _self.width;
		_self.height = errBoxHeight + "px";
		_self.element.style.height = _self.height;
        viewDiv.appendChild(docFrame);
    }
    
    function handleDocumentUrl(url, contentType) {
    	console.log("In handleDocumentUrl(); contentType = " + contentType);
    	if (contentType.indexOf("image/") == 0) {
    		// This is an image of some sort so display it as such
    		var image = _self.element.ownerDocument.createElement("img");
    		image.onload = function() {
    			// Determine the optimal starting size for this image
    			// Calculate the aspect ratio of the image and the parent window to determine the bounding dimention
    			var imageAspect = image.naturalHeight / image.naturalWidth;
    			var parentAspect = parentWindow.height / parentWindow.width;
	
    			var height;
    			var width;
    			if (imageAspect > parentAspect) {
    				// the image has a narrower aspect than the parent so limit it to 80% of the parents height
    				height = Math.min(image.naturalHeight, (parentWindow.height * 0.8));
    				width = height / imageAspect;
    			} else {
    				// the image has the same or a wider aspect than the parent so limit it to 80% of the parents width
    				width = Math.min(image.naturalWidth, (parentWindow.width * 0.8));
    				height = width * imageAspect;
    			}
    			_self.height = height;
    			_self.width = width;
    			_self.element.style.height = height + "px";// parentWindow.height * 100 + "%";
    			_self.element.style.width =  width + "px"; // parentWindow.width * 100 + "%";
	
    			// If this is an image format we can encode in to then it's probably a good idea to do so
    			var imageFormat = IMAGE_FORMAT.indexOf(contentType.substring(6));
    			if (imageFormat) {
    				_self.imageFormat = imageFormat;
    			}
    			// To start stick it in the center
    			_self.element.style.top = ((_self.parentWindow.height - _self.height) / 2) + "px";
    			_self.element.style.left = ((_self.parentWindow.width - _self.width) / 2) + "px";
	
    			viewDiv.appendChild(image);

    			_self.sendSizeAndPosition();
    			_self.refreshContent();

    			_self.applyZoom = function() {
    				_self.sendZoomLevelChangedMessage();
    				image.height = _self.zoomLevel * image.naturalHeight / 100;
    				image.width = _self.zoomLevel * image.naturalWidth / 100;
    				// Flick the auto overflow off and back on so that the scrollbars are not counted when
    				// determining if scroll bars are needed. (I.e. so we don't sometimes have scroll bars at 100%)
    				viewDiv.style.overflow = "hidden";
    				setTimeout(function(){viewDiv.style.overflow = "";}, 1);
    			};
    			_self.applyZoom();
    		};
	        image.setAttribute("src", url);
	        image.onerror = function() {
	        	console.log("Error loading or parsing image file.");
	            showError(null, null, true);
	        };
	    } else {
	        _self.pdfDoc = null;
	        var renderPage = function(page, canvas) {
	        	var viewport = page.getViewport(2);
	            canvas.height = viewport.height;
	//          canvas.style.height = viewport.height / 2 + "px";
	            canvas.width = viewport.width;
	            canvas.style.width = viewport.width / 2 + "px";
	            var context = canvas.getContext("2d");
	            var renderContext = {
	            		canvasContext: context,
	                    viewport: viewport
	            };
	            page.render(renderContext);
	        };
	
	        var getAndRenderPage = function(pdfDoc, pageNum, pageCanvas) {
	            pdfDoc.getPage(pageNum).then(function(page) {
	            	renderPage(page, pageCanvas);
	            });
	        };
	                
	                
	        // TODO check for "application/pdf" mime type or just assume?
	        if (contentType.indexOf("application/pdf") == 0) {
	            var docFrame = _self.element.ownerDocument.createElement("div");
	            docFrame.classList.add("document-frame");
	            console.log("About to try to load and render pdf document.");
	            try {
	            	PDFJS.getDocument(url).then(function(pdfDoc) {
	            		_self.pdfDoc = pdfDoc;
	            		for (var i = 1; i <= pdfDoc.numPages; i++) {
	            			var pageCanvas = _self.element.ownerDocument.createElement("canvas");
	            			docFrame.appendChild(pageCanvas);
	            			getAndRenderPage(pdfDoc, i, pageCanvas);
	            		}
	            	}).catch(function(err) {
	            		//This is called if an error occurs in pdf loading or parsing
	            		console.log("PDF loading or parsing error: " + err);
	            		showError(err, docFrame, false);
	            	});
	            } catch (err) {
	            	console.log("PDF loading or parsing error: " + err);
                    showError(err, docFrame, false);
	            }
	            var newX = _self.parentWindow.width * 0.1;
	            _self.element.style.left = newX + "px";
	            var newY = _self.parentWindow.height * 0.1;
	            _self.element.style.top = newY + "px";
	            _self.sendMovedMessage(newX, newY);
	            _self.width = _self.parentWindow.width * 0.8 + "px";
	            _self.element.style.width = _self.width;
	            _self.height = _self.parentWindow.height * 0.8 + "px";
	            _self.element.style.height = _self.height;
	                    
	            viewDiv.appendChild(docFrame);
	
	            _self.applyZoom = function() {
	            	_self.sendZoomLevelChangedMessage();
	            	var canvases = docFrame.getElementsByTagName("canvas");
	            	for (var i = 0; i < canvases.length; i++) {
	            		var canvas = canvases[i];
	                    // Currently rendering at 200% and then letting the browser scale, this should look fairly good zoomed
	                    // but won't need to be re-rendered, which seems to cause some issues (like the pdf being rendered back to front and upside down)
	                    canvas.style.width = canvas.width * _self.zoomLevel / 200 + "px";
	//                  _self.pdfDoc.getPage(i+1).then(function(page){
	//                      renderPage(page, canvases[page.pageInfo.pageIndex]);
	//                  });
	                }
	                _self.refreshContent();
	            };
	            _self.applyZoom();
	        }
	    }
	            
	    //Clear annotations when shared document window is opened.
	    _self.clearAnnotations();
	
	    _self.messageHandlers[DOCUMENT_ZOOMED_LEVEL_CHANGED] = function(message) {
	    	_self.zoomLevel = new Int16Array(message.buffer, 2, 1)[0];
	    	_self.element.getElementsByClassName("zoom-indicator")[0].textContent = i18n.t("assistI18n:shared.formattedPercent", {"number": _self.zoomLevel});
	    	_self.applyZoom();
	    };
	}

    console.log("url = " + url);
    var dataRegex = /^data:(.*?);/;
    var matches = dataRegex.exec(url);
    if (matches != null) {
    	var contentType = matches[1];
    	console.log("Data url... calling handleDocumentUrl()");
    	handleDocumentUrl(url, contentType);
    } else {
    	var getRequest = new XMLHttpRequest();
    	getRequest.open("get", url, true);
    	getRequest.onreadystatechange = function(event) {
    		if (getRequest.readyState == 4) {
    			if (getRequest.status == 200) {
    				var contentType = getRequest.getResponseHeader("Content-Type");
    				console.log("contentType = " + contentType);
    				handleDocumentUrl(url, contentType);
    			} else {
            		console.log("Error retrieving document: " + getRequest.status + " " + getRequest.statusText);
            		var errorMessage = getRequest.status + " " + getRequest.statusText;
            		showError(errorMessage, null, false);
            	}
    		}
    	};
        getRequest.send(null);
    }
    

    _self.addElementEventListener(viewDiv, "scroll", function(event) {
        _self.refreshContent();
        //Clear annotations when shared document is scrolled.
        _self.clearAnnotations();
    });

    var scrolling = false;
    var startX;
    var startY;
    _self.addElementEventListener(viewDiv, "mousedown", function(event) {
        if (event.button == 0) {
            scrolling = true;
            startX = event.clientX;
            startY = event.clientY;
            event.preventDefault();
            event.stopPropagation();
        }
    });
        
    _self.addDocumentEventListener("mousemove", function(event) {
       if (scrolling) {
           var deltaX = startX - event.clientX;
           var deltaY = startY - event.clientY;
           viewDiv.scrollLeft += deltaX;
           viewDiv.scrollTop += deltaY;
           event.preventDefault();
           event.stopPropagation();
           startX = event.clientX;
           startY = event.clientY;
       }
    });

    _self.addDocumentEventListener("mouseup", function(event) {
       if (event.button == 0) {
           scrolling = false;
       }
    });

    _self.scheduleObserver();
    
    _self.clearAnnotations = function() {
        var parent = _self.parentWindow;
        for (var i = 0; i < parent.children.length; i++) {
        	var x = parent.children[i];
        	if (x instanceof AnnotationWindow) {
        		x.clear(true);
        	}
        }
    };
};

DocumentWindow.prototype = Object.create(HostSharedWindow.prototype);

function SpotlightWindow(topic, svg, parentWindow) {
    SharedWindow.call(this, topic, svg, parentWindow);
    var _self = this;

    this.messageHandlers[CURSOR_PING] = function(message) {
        cursorPing(message);
    };
    
    this.messageHandlers[SPOTLIGHT_CLEAR] = function(message) {
        try {
            _self.clear(false); 
        } catch (e) {
            console.warn(e);
        }
    };
    
    function cursorPing(message) {
        //var stringPayload = String.fromCharCode.apply(null, new Uint8Array(message.buffer, 2));
    	var mess16 = new Int16Array(message.buffer, 0, 3);
    	var pointX = mess16[1];
    	var pointY = mess16[2];
    	console.log("Drawing spotlight at (" + pointX + "," + pointY + ").");
    	var temp = svg.ownerDocument.createElementNS(SVG_NAMESPACE, "svg");
        
        var cursorPointGroup = svg.ownerDocument.createElementNS(SVG_NAMESPACE, "g");
        cursorPointGroup.setAttribute("transform", "translate(" + pointX + "," + pointY + ")");
        temp.appendChild(cursorPointGroup);

        cursorPoint = svg.ownerDocument.createElementNS(SVG_NAMESPACE, "circle");
        cursorPoint.setAttribute("r", 1);
        cursorPoint.setAttribute("fill", "#f00");
        cursorPointGroup.appendChild(cursorPoint);
    
        while (temp.firstChild) {
            if (temp.firstChild.namespaceURI != SVG_NAMESPACE) {
                svg.appendChild(deepCloneWithNameSpace(svg, temp.firstChild, SVG_NAMESPACE));
                temp.removeChild(temp.firstChild);
            } else {
                svg.appendChild(temp.firstChild);
            }
        }
    }
    
    var scale;
    this.parentResized = function() {
        if (_self.parentWindow) {
            var width = svg.parentNode.offsetWidth;
            scale = (width / _self.parentWindow.width);
        }
    };
    
    _self.parentResized();
    
    _self.addElementEventListener(svg, "mousedown", function(event) {
        if (event.button === 0) {
            var boundingRect = svg.parentNode.getBoundingClientRect();
            var scaleFactor = _self.parentWindow.width / svg.parentNode.offsetWidth;
            
            var pointX = Math.round((event.clientX - boundingRect.left) * scaleFactor);
            var pointY = Math.round((event.clientY - boundingRect.top) * scaleFactor);

            var cursorPointGroup = svg.ownerDocument.createElementNS(SVG_NAMESPACE, "g");
            cursorPointGroup.setAttribute("transform", "translate(" + pointX + "," + pointY + ")");
            svg.appendChild(cursorPointGroup);

            cursorPoint = svg.ownerDocument.createElementNS(SVG_NAMESPACE, "circle");
            cursorPoint.setAttribute("r", 1);
            cursorPoint.setAttribute("fill", "#f00");
            cursorPointGroup.appendChild(cursorPoint);
            
            var div = cursorPointGroup.ownerDocument.createElement("div");
            div.appendChild(deepCloneWithNameSpace(cursorPointGroup, cursorPointGroup, SVG_NAMESPACE));
            var cursorPointString = div.innerHTML;
            var message = new Uint8Array(6);
            var mess16 = new Int16Array(message.buffer, 0, 3);
            mess16[0] = CURSOR_PING;
            mess16[1] = pointX;
            mess16[2] = pointY;
            topic.sendMessage(message);

            // Set the scale according to the screenshare size.
            // We only want to do this on the agent side.
            // The transform ordering is important, Scaling must 
            // come before the translate.
            cursorPointGroup.setAttribute("transform", "scale(" + scale + ") translate(" + pointX + "," + pointY + ")");
            svg.appendChild(cursorPointGroup);

            event.preventDefault();
            event.stopPropagation();
        }
    }, false);

    this.clear = function(clearRemote) {
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
        
        if (clearRemote) {
            var clearMessage = new Int16Array(1);
            clearMessage[0] = SPOTLIGHT_CLEAR;
            topic.sendMessage(clearMessage);
        }
    };

    this.enableSpotlight = function() {
        _self.clear(true);
        addClassSvg(svg, "active"); // ie doesn't support classList on svg
    };

    this.disableSpotlight = function() {
        _self.clear(true);
        removeClassSvg(svg, "active"); // ie doesn't support classList on svg
    };

    var elementWindow = function() {
        var windowCandidates = [];
        windowCandidates.push(window);
        if (window.opener) {
            windowCandidates.push(window.opener);
        }
        // TODO also check iframes if there are any
        for (var i = 0; i < windowCandidates.length; i++) {
            if (windowCandidates[i].document == _self.element.ownerDocument)
            return windowCandidates[i];
        }
    }();

    if (elementWindow) {
        // TODO this won't be refreshed on navigation...
        _self.addElementEventListener(elementWindow, "resize", function() {
            _self.parentResized();
        });
    }
};

SpotlightWindow.prototype = Object.create(SharedWindow.prototype);
