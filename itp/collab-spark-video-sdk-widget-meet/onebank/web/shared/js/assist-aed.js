(function(){
    const PING_MESSAGE_ID = 100;
    const PONG_MESSAGE_ID = 200;
    const JOIN_TOPIC_MESSAGE_ID = 10100;
    const LEAVE_TOPIC_MESSAGE_ID = 10200;
    const OPEN_TOPIC_MESSAGE_ID = 10300;
    const CLOSE_TOPIC_MESSAGE_ID = 10400;
    const SEND_MESSAGE_MESSAGE_ID = 20100;
    const TOPIC_LIST_MESSAGE_ID = 10000;
    const PARTICIPANT_LIST_MESSAGE_ID = 15000;
    // Send a ping 10 seconds after receiving the last PONG
    const pingDelay = 10000;

    window.AED = function() {

        var rootTopic;

        var topicSocket;

        var previousParticipantId;

        var participantId;

        var configuration;

        var topics = [];

        var participants = [];

        var pendingSubtopicCallbacks = [];

        var pingTimer;

        var sessionToken;

        var disconnect = function() {
            topicSocket.onclose = function(){};
            topicSocket.close();
            clearTimeout(pingTimer);
            rootTopic = undefined;
            topicSocket = undefined;
            previousParticipantId = undefined;
            participantId = undefined;
            topics = [];
            participants = [];
            pendingSubtopicCallbacks = [];
        };

        var messageHandlers = function () {
            var handlers = [];

            handlers[JOIN_TOPIC_MESSAGE_ID] = function(topicId, sourceId, payload){
                console.log("Join topic message received for topic " + topicId + " from " + sourceId);
                // add the participant to the topic
                var participant = participants[sourceId];
                if (!participant) {
                    var participantDesc = parseAsJson(payload);
                    var metadata = {};
                    if (participantDesc.metadata) {
                        metadata = JSON.parse(participantDesc.metadata);
                    }
                    participant = new Participant(sourceId, metadata);
                    participants[sourceId] = participant;
                }
                var topic = topics[topicId];
                topic.participants.push(participant);
                // Notify the topic call back
                topic.participantJoined(participant);

            };
            handlers[LEAVE_TOPIC_MESSAGE_ID] = function(topicId, sourceId, payload){
                console.log("Leave topic message received for topic " + topicId + " from " + sourceId);
                var topic = topics[topicId];
                var participant = participants[sourceId];
                topic.participants.splice(topic.participants.indexOf(participant), 1);
                topic.participantLeft(participant);
                if (topicId == 0) {
                    // The participant left the root topic and are therefore totally gone so forget them entirely
                    participants[sourceId] = undefined;
                }
            };
            handlers[OPEN_TOPIC_MESSAGE_ID] = function(topicId, sourceId, payload){
                console.log("Open topic message received for topic " + topicId + " from " + sourceId);

                var subtopicDesc = parseAsJson(payload);
                var parentTopic = topics[topicId];
                var owner = participants[sourceId];

                var metadata = {};
                if (subtopicDesc.metadata) {
                    metadata = JSON.parse(subtopicDesc.metadata);
                }
                if (topics[subtopicDesc.id]) {
                    // The topic already exists so we're reconnecting
                    // TODO consider comparing the metadata
                } else {
                    var subtopic = new Topic(subtopicDesc.id, owner, parentTopic, metadata, operations);
                    topics[subtopic.id] = subtopic;
                    parentTopic.subtopics.push(subtopic);
                    if (sourceId === participantId) {
                        pendingSubtopicCallbacks[topicId].callBackForTopic(subtopic);
                    } else {
                        parentTopic.subtopicOpened(subtopic);
                    }
                }
            };
            handlers[CLOSE_TOPIC_MESSAGE_ID] = function(topicId, sourceId, payload){
                console.log("Close topic message received for topic " + topicId + " from " + sourceId);
                var closedTopic = topics[topicId];
                var parentTopic = closedTopic.parent;
                if (!parentTopic) {
                    // No parent topic implies that this is the root topic
                    disconnect();
                } else {
                    parentTopic.subtopics.splice(parentTopic.subtopics.indexOf(closedTopic), 1);
                    topics[closedTopic.id] = undefined;
                    parentTopic.subtopicClosed(closedTopic);
                }
            };
            handlers[SEND_MESSAGE_MESSAGE_ID] = function(topicId, sourceId, payload){
                var topic = topics[topicId];
                var source = participants[sourceId];
                topic.messageReceived(source, new Uint8Array(payload));
            };
            handlers[TOPIC_LIST_MESSAGE_ID] = function(topicId, sourceId, payload){
                // The source of a topic list message is always us because it's our joining the topic which
                // causes it to be sent. So if we didn't know our own ID, set it now
                if (participantId && participantId != sourceId) {
                    // we've reconnected so store our old id so we can ignore it leaving topics
                    previousParticipantId = participantId;
                }
                participantId = sourceId;

                // Get the topic to which these subtopic belong
                var parentTopic = topics[topicId];

                parentTopic.joined = true;

                // parse payload as a JSON object containing all the subtopics
                var topicList = parseAsJson(payload);

                if (parentTopic.subtopics.length > 0) {
                    // We already knew about some subtopic in this topic. This implies we're reconnecting
                    var removeList = [];
                    for (var i = 0; i < parentTopic.subtopics.length; i++) {
                        // check that all the subtopics we expect to be there still are
                        var subtopic = parentTopic.subtopics[i];
                        var found = false;
                        for (var j = 0; j < topicList.length; j++) {
                            if (subtopic.id === topicList[j].id) {
                                // TODO check metatdata?
                                found = true;
                                if (subtopic.joined) {
                                    // we believe we should be joined to this subtopic, but we're not currently
                                    // so join it
                                    operations.joinTopic(subtopic.id);
                                }
                                break;
                            }
                        }
                        if (!found) {
                            removeList.push(i);
                        }
                    }
                    // Remove the topic in reverse order to avoid having to search for changed indices
                    for (i = removeList.length - 1; i >=0; i--) {
                        var removed = parentTopic.subtopics[removeList[i]];
                        parentTopic.subtopics.splice(removeList[i], 1);
                        parentTopic.subtopicClosed(removed);
                    }
                }

                for (var i = 0; i < topicList.length; i++) {
                    var topicDesc = topicList[i];
                    if (topics[topicDesc.id]) {
                        // We already knew about this subtopic, TODO should we check that we had the right parent and metadata for it?
                    } else {
                        var owner = participants[topicDesc.owner];

                        var metadata = {};
                        if (topicDesc.metadata) {
                            metadata = JSON.parse(topicDesc.metadata);
                        }
                        var aTopic = new Topic(topicDesc.id, owner, parentTopic, metadata, operations);
                        topics[aTopic.id] = aTopic;
                        parentTopic.subtopics.push(aTopic);
                        // TODO should this be done in a separate call? Or done after we've processed all the subtopics?
                        parentTopic.subtopicOpened(aTopic);
                    }
                }
            };
            handlers[PARTICIPANT_LIST_MESSAGE_ID] = function(topicId, sourceId, payload){
                // The source of a participant list message is always us because it's our joining the topic which
                // causes it to be sent. So if we didn't know our own ID, set it now
                if (!participantId) {
                    participantId = sourceId;
                }

                var parentTopic = topics[topicId];

                var participantList = parseAsJson(payload);

                var removeList = [];
                for (var i = 0; i < parentTopic.participants.length; i++) {
                    var participant = parentTopic.participants[i];
                    var found = false;
                    for (var j = 0; j < participantList.length; j++) {
                        if (participantList[j].id == participant.id) {
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        removeList.push(i);
                    }
                }
                var oldParticipantLeft = false;
                for (i = removeList.length - 1; i >= 0; i --) {
                    var removed = parentTopic.participants[removeList[i]];
                    parentTopic.participants.splice(removeList[i], 1);
                    if (removed.id == previousParticipantId && parentTopic.joined) {
                        oldParticipantLeft = true;
                    } else {
                        parentTopic.participantLeft(removed);
                    }
                }

                for (i = 0; i < participantList.length; i++) {
                    var participantDesc = participantList[i];
                    var aParticipant;
                    if (participants[participantDesc.id]) {
                        // we already knew about this participant, TODO consider checking metadata
                        aParticipant = participants[participantDesc.id];
                    } else {
                        var metadata = {};
                        if (participantDesc.metadata) {
                            metadata = JSON.parse(participantDesc.metadata);
                        }
                        aParticipant = new Participant(participantDesc.id, metadata);
                        participants[aParticipant.id] = aParticipant;
                    }
                    if (parentTopic.participants.indexOf(aParticipant) == -1) {
                        parentTopic.participants.push(aParticipant);
                        if (aParticipant.id == participantId && oldParticipantLeft) {
                            // We're not joining or leaving but just changing the id we're known by due to a reconnect
                        } else {
                            parentTopic.participantJoined(aParticipant);
                        }
                    }

                }

            };
            handlers[PONG_MESSAGE_ID] = function(topicId, sourceId, payload){
                // We got a PONG to our last ping
                clearTimeout(pingTimer);
                pingTimer = setTimeout(function() {
                    var pingMessage = new Uint16Array(3);
                    pingMessage[0] = PING_MESSAGE_ID;
                    pingMessage[1] = 0;
                    pingMessage[2] = participantId;
                    topicSocket.send(pingMessage);
                    pingTimer = setTimeout(function() {
                        // We haven't received a PONG in a reasonable time frame so reconnect the socket
                        console.log("Failed to receive a PONG, closing the websocket.");
                        topicSocket.close();
                        if (topicSocket.onclose) {
                            topicSocket.onclose(); // doesn't seem to always fire on close()
                        }
                    }, pingDelay);
                }, pingDelay);
            };
            return handlers;
        }();

        var _self = this;

        this.getWebSocket = function(topicId) {
            var toUrl;

            var host = window.location.host;
            if (window.location.protocol === "https:") {
                toUrl = "wss:";
            } else {
                toUrl = "ws:";
            }

            if (configuration && configuration.url) {
                host = configuration.url.replace(/(^https?:)?\/\//, "");

                var url = document.createElement("a");
                url.href = configuration.url;
                toUrl = (url.protocol == "http:") ? "ws:" : "wss:";
            }

            toUrl = toUrl + "//" + host + "/assistserver/topic?appkey=" + topicId + "&topic=" + topicId + "&sessionId=" + sessionToken;

            var webSocket = null;
            if ('WebSocket' in window) {
                webSocket = new WebSocket(toUrl);
            } else if ('MozWebSocket' in window) {
                webSocket = new MozWebSocket(toUrl);
            }

            if (webSocket != null) {
                webSocket.binaryType = "arraybuffer";
            }
            return webSocket;

        };

        var operations = new function() {
            this.openSubtopic = function(topicId, metadata, callBack) {
                if (!pendingSubtopicCallbacks[topicId]) {
                    pendingSubtopicCallbacks[topicId] = new SubtopicCallbacks();
                }
                pendingSubtopicCallbacks[topicId].addSubtopicCallback(metadata, callBack);

                sendWithJSON(topicId, metadata, OPEN_TOPIC_MESSAGE_ID);
            };

            this.closeTopic = function(topicId, metadata) {
                sendWithJSON(topicId, metadata, CLOSE_TOPIC_MESSAGE_ID);
            };

            this.joinTopic = function(topicId, metadata) {
                topics[topicId].joined = true;
                sendWithJSON(topicId, metadata, JOIN_TOPIC_MESSAGE_ID);
            };

            this.leaveTopic = function(topicId, metadata) {
                topics[topicId].joined = false;
                sendWithJSON(topicId, metadata, LEAVE_TOPIC_MESSAGE_ID);
                if (topicId == 0) {
                    disconnect();
                }
            };

            this.sendMessage = function(topicId, payload) {
                var message = new Uint8Array(payload.byteLength + 6);
                var header = new Uint16Array(message.buffer, 0, 3);
                var payloadView = new Uint8Array(message.buffer, 6, payload.byteLength);
                var uint8Payload;
                if (payload.buffer) {
                    uint8Payload = new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
                } else {
                    uint8Payload = new Uint8Array(payload);
                }
                payloadView.set(uint8Payload);
                header[0] = SEND_MESSAGE_MESSAGE_ID;
                header[1] = topicId;
                header[2] = participantId;
                topicSocket.send(message);
            };

            var sendWithJSON = function(topicId, metadata, messageType) {
                var dataString = unescape(encodeURIComponent(JSON.stringify(metadata)));
                var payloadLength = 0;
                if (dataString) {
                    payloadLength = dataString.length;
                }
                var message = new Uint8Array(payloadLength + 6);
                var header = new Uint16Array(message.buffer, 0, 3);
                if (dataString) {
                    var payload = new Uint8Array(message.buffer, 6, payloadLength);
                    setJsonPayload(dataString, payload);
                }
                header[0] = messageType;
                header[1] = topicId;
                header[2] = participantId;
                topicSocket.send(message);
            };
        };

        this.setConfig = function(config) {
            configuration = config;
        };

        this.connectRootTopic = function(topic, callback, token, reconnecting) {

            sessionToken = token;
            if (topicSocket) {
                topicSocket.onclose = function(){};
                topicSocket.close();
                clearTimeout(pingTimer);
            }
            if (!reconnecting) {
                // TODO clean up existing topics and participants
            }

            topicSocket = _self.getWebSocket(topic);
            if (!topicSocket) {
                alert('WebSocket is not supported by this browser.');
                return;
            }

            topicSocket.onopen = function() {
                if (reconnecting) {
                    // handle reconnection
                    console.log(" Info: Socket connection for topic " + topic + " reconnected.");
                } else {
                    console.log(" Info: Socket connection for topic " + topic + " opened.");
                    rootTopic = new Topic(0, undefined, undefined, {"type": "root"}, operations);
                    topics[0] = rootTopic;
                    callback(rootTopic);
                }
                messageHandlers[PONG_MESSAGE_ID]();
            };

            topicSocket.onmessage = function(event) {
                var header = new Uint16Array(event.data, 0, 3);

                var payload = undefined;
                if (event.data.byteLength > 6) {
                    payload = new Uint8Array(event.data, 6);
                }

                var messageType = header[0];
                var topicHeader = header[1];
                var sourceHeader = header[2];

                messageHandlers[messageType](topicHeader, sourceHeader, payload);
            };

            topicSocket.onclose = function() {
                console.log('Topic Socket Closed');
                topicSocket.onclose = function () {};
                console.log("Reconnection of Topic Socket after 3s");
                setTimeout(function() { _self.connectRootTopic(topic, function(){}, sessionToken, true); }, 3000);
            };
        };

        var parseAsJson = function (payload) {
            var payloadString = decodeURIComponent(escape(String.fromCharCode.apply(null, payload)));
            return JSON.parse(payloadString);
        };

        var setJsonPayload = function (metadata, payload) {
            for (var i = 0; i < metadata.length; i++) {
                payload[i] = metadata.charCodeAt(i);
            }
        };

        this.isMe = function(participant) {
            return participant.id == participantId;
        }
    };

    function Topic(id, owner, parent, metadata, operations) {

        var subtopics = [];
        var participants = [];

        this.parent = parent;

        this.id =  id;

        this.metadata = metadata;

        this.owner = owner;

        this.subtopics = subtopics;

        this.participants = participants;

        this.openSubtopic = function(metadata, callBack) {
            operations.openSubtopic(id, metadata, callBack);
        };

        this.closeTopic = function(payload) {
            // TODO check if we're the owner and don't try if we're not
            operations.closeTopic(id, payload);
        };

        this.join = function() {
            operations.joinTopic(id);
        };

        this.leave = function() {
            operations.leaveTopic(id);
        };

        this.sendMessage = function(payload) {
            operations.sendMessage(id, payload);
        }
    }

    Topic.prototype = {
        participantJoined : function(newParticipant) {
            console.log("New participant joined topic " + newParticipant.metadata);
        },

        participantLeft : function(leavingParticipant) {
            console.log("Participant left topic " + leavingParticipant.metadata);
        },

        subtopicOpened : function(newSubtopic) {
            console.log("New subtopic created " + newSubtopic.metadata);
        },

        subtopicClosed : function(closingSubtopic) {
            console.log("Subtopic closed " + closingSubtopic.metadata);
        },

        messageReceived : function(source, message) {
        }
    };

    function Participant(id, metadata) {
        this.id = id;
        this.metadata = metadata;
    };

    function SubtopicCallbacks() {

        var callBacks = {};

        this.addSubtopicCallback = function(metadata, callBack) {
            var key = getKeyFor(metadata);
            var metadataCallbacks = callBacks[key];
            if (!metadataCallbacks) {
                metadataCallbacks = [];
                callBacks[key] = metadataCallbacks;
            }
            metadataCallbacks.push(callBack);
        };

        this.callBackForTopic = function(subtopic)  {
            var key = getKeyFor(subtopic.metadata);
            var metadataCallbacks = callBacks[key];
            var callBack = metadataCallbacks.shift();
            if (metadataCallbacks.length == 0) {
                delete callBacks[key];
            }
            callBack(subtopic);
        };

        var getKeyFor = function(metadata) {
            for (var key in callBacks) {
                if (metadataEqual(metadata, key)) {
                    return key;
                }
            }
            return metadata;
        };

        var metadataEqual = function(m1, m2) {
            if (m1.length != m2.length) {
                return false;
            }
            for (var key in m1) {
                if (m1[key] !== m2[key]) {
                    return false;
                }
            }
            return true;
        };
    };
    window.AssistAED = new window.AED;

}());
