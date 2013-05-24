/**
 * Application.
 * 
 * This is a singleton responsible for communication between the client
 * and the actual application.
 */
var application = null;
(function() {

function Application() {

	if(application) {
		throw new Error("Application can only be created once!");
	}
	application = this;
	this.active = true;
	
	/// message handlers.
	handlers = {};
	
	/// eventHandlers
	eventHandlers = {};
	disconnectTypes = {
		possible: 0,
		expected: 1,
		unexpected: 2,
	};
	disconnectType = disconnectTypes.unexpected;
	
	/// The websocket server connection.
	var ws = null;
	if(window) {
		window.onbeforeunload = function(){
			if(ws) {
				ws.onclose = function() {};
				ws.close();
			}
		}
	}
	
	/// Connection retries.
	var probeForConnectionRunning = false;
	function tryToConnect() {
		disconnectType = disconnectTypes.possible;
		application.connect(application.options.autoConnectServer);
	}
	function resetProbing() {
		if(!application.options.probeForRunningApplications) return;
		function probe() {
			if(!application.options.probeForRunningApplications){
				probeForConnectionRunning = false;
				return;
			}
			if(ws === null) tryToConnect();
			probeForConnectionRunning = true;
			setTimeout(probe,1000);
		}
		if(probeForConnectionRunning === false) {
			setTimeout(probe,1000);
			probeForConnectionRunning = true;
		}
	}
	
	/// Parses the messages recieved from the server
	function unknownMessageError(msg,object) {
		application.error("Unknown message - " + JSON.stringify(object));	
	}
	function parseMessages () {
		var u8view = new Uint8Array(this.result);
		var offset = 0;
		while(offset < u8view.length){
			// Decode the message
			var textDataLength = u8view[offset] + u8view[offset+1]*256;
			offset+=2;
			
			var str = "";
			for(var end = offset + textDataLength;offset<end;++offset) {
				str += String.fromCharCode(u8view[offset]);
			}
			var object = JSON.parse(str);
			if((typeof object.dataSize) === "number"){
				var binaryDataLength = object.dataSize;
				object.binaryData = new Uint8Array(this.result,offset,
					binaryDataLength);
				offset += binaryDataLength;
			}
			// Act based on the header.
			var handler = handlers[object.type];
			if(handler) handler(object);
			else application.unknownMessageError(object);
		}
	}
	
//----------------------------------------------------------------------
// Public:
	
	/**
	 * Logging module.
	 */
	this.logging = {
		//Sources
		Local: 0,
		Remote: 1,
		
		//Levels
		Trace: 0,
		Debug: 1,
		Information: 2,
		Warning: 3,
		Error: 4,
		Critical: 5,
		Fatal: 6,
		
		message: function(source,level,str) {}
	};
	
	this.applyOptions = function() {
		resetProbing();
	}
	
	this.saveOptions = function() {
		localStorage.setItem("application.options",
			JSON.stringify(application.options));
	}
	
	this.resetOptions = function() {
		application.options = {
			autoConnect: true,
			autoConnectServer: 'localhost:8080',
			probeForRunningApplications: true
		};
		application.applyOptions();
		application.saveOptions();
	}


	/**
	 * Adds an information message to the log.
	 */
	this.log = function(msg) {
		this.logging.message(this.logging.Local,this.logging.Information,msg);
	}
	
	/**
	 * Adds an error message to the log.
	 */
	this.error = function(msg) {
		this.logging.message(this.logging.Local,this.logging.Error,msg);
	}
	
	/**
	 * Adds a warning message to the log.
	 */
	this.warning = function(msg) {
		this.logging.message(this.logging.Local,this.logging.Warning,msg);
	}

	/**
	 * Returns true is the application is connected to the server.
	 */
	this.isConnected = function() { return ws !== null; }

	/**
	 * Tries to connect to the server at the specified url.
	 */
	this.connect = function(url) {			
		ws = new WebSocket('ws://' + url);
		ws.onopen = function() {
			application.log('Connected to ws://' + url);
			application.raiseEvent('connected');
		};
		ws.onmessage = function(message){
			var reader = new FileReader();
			reader.onloadend = parseMessages;
			reader.readAsArrayBuffer(message.data);
		};			
		ws.onclose = function(event){ 
			application.raiseEvent('disconnected');
		}
		// Store the address.
		if(url !== application.options.autoConnectServer){
			application.options.autoConnectServer = url;
			application.saveOptions();
		}
	}
	
	/**
	 * Disconnect from the server.
	 */
	this.disconnect = function() {
		if(ws){
			application.disconnectType = application.disconnectTypes.expected;
			ws.close();
		}
	}
	
	/**
	 * Sends a message to the server.
	 */
	this.send = function(type,value) {
		if(ws === null){
			application.error("Can't send a message '"+type+"' - the application isn't connected!");
			return;
		}
		if(!value) value = {};
		value.type = type;
		
		var object = JSON.stringify(value);
		if(object.length > 0xFFFF) {
			application.error("Can't send a message longer than 0xFFFF bytes");
			return;
		}
		var buffer = new ArrayBuffer(object.length + 2);
		var u8view = new Uint8Array (buffer);
		u8view[0] = object.length % 256;
		u8view[1] = object.length / 256;
		for(var i = 0;i<object.length;++i){
			u8view[i+2] = object.charCodeAt(i);
		}
		ws.send(buffer);	
	}
	
	/**
	 * Binds a callback to the specified message type.
	 */
	this.handle = function(msg, callback) {
		if((typeof callback) !== "function"){
			throw new Error("application.handle needs a function callback");
			return;
		}
		if(msg in handlers){
			throw new Error("The message '"+msg+"' already has a handler");
			return;
		}
		else handlers[msg] = callback;		
	}
	
	/**
	 * Binds a callback to a certain event.
	 */
	this.on = function(event,callback) {
		if((typeof callback) !== "function"){
			throw new Error("application.on needs a function callback");
		}
		if(event in eventHandlers){
			eventHandlers[event].push(callback);
		} else {
			eventHandlers[event] = [ callback ];
		}
	}
	
	/**
	 * Removes a callback from a certain event.
	 */
	this.removeEventHandler = function(event,callback) {
		if((typeof callback) !== "function") {
			throw new Error("application.removeEventHandler needs a valid callback.");
		}
		if(event in eventHandlers){
			var callbacks = eventHandlers[event];
			for(var i = 0;i<callbacks.length;++i) {
				if(callbacks[i] === callback) {
					callbacks.splice(i,1);
				}
			}
		}
	}
	
	/**
	 * Emits event.
	 */
	this.raiseEvent = function(event) {
		if(event in eventHandlers){
			var callbacks = eventHandlers[event];
			for(var i = 0;i<callbacks.length;++i)
				callbacks[i]();
		}
	}
	
	/**
	 * Sends an activate message to the application.
	 */
	this.activate = function() {
		application.send('application.service.activate');
		application.raiseEvent('activate');
		application.active = !application.active;
	}
	
	/**
	 * Sends a shutdown message to the application.
	 */
	this.quit = function() {
		disconnectType = disconnectTypes.expected;
		application.send('application.service.quit');
	}
	
	/**
	 * Sends a step message to the application.
	 */
	this.step = function() {
		application.send('application.service.step');
	}
	
	/**
	 * Information.
	 */
	this.information = {
		name: "",
		threadCount: 2		
	};
	
	/**
	 * Package manager.
	 */
	this.packages = new ApplicationPackageManager();
	
	/**
	 * Data.
	 */
	this.data = new ApplicationData();
	
	/**
	 * Tool module.
	 */
	this.tools = {};
	
	// Retrive options
	var opt = localStorage.getItem('application.options');
	if(opt){
		this.options = JSON.parse(opt);
	} else this.resetOptions();
	
	// Autoconnect at startup.
	if(this.options.autoConnect === true) {
		this.on('init',function(){		
			function onConnected() {
				cleanup();
			}
			function onDisconnected() {
				application.log(
				"Couldn't connect to ws://"+
				application.options.autoConnectServer+"!");
				cleanup();
			}
			function cleanup() {
				application.removeEventHandler('connected',onConnected);
				application.removeEventHandler('disconnected',onDisconnected);
			}
			
			application.on('connected',onConnected);
			application.on('disconnected',onDisconnected);
			disconnectType = disconnectTypes.possible;
			application.connect(application.options.autoConnectServer);
		});
	}
	
	// Connection probing.
	this.on('init',resetProbing);
	
	// Default event handlers
	this.on('connected',function() {
		disconnectType = disconnectTypes.unexpected;
		application.data.reset();
	});
	this.on("disconnected",function(event) {
		if(disconnectType == disconnectTypes.unexpected)
			application.error('The connection to the application was lost');
		else if(disconnectType == disconnectTypes.expected) 
			application.log('Disconnected from the application.');
		disconnectType = disconnectTypes.unexpected;
		ws = null;
	});
	
	// Core message handlers.
	this.handle("gamedevwebtools.unhandled", function(msg) {
		application.error(
			"The application doesn't recognise the message with the type '"+
			msg.msgtype+"'");
	});
	this.handle("tooling.pipe.application.connected", function(frameId,val){
		application.log('The application connected to the piping server.');
	});
	this.handle("tooling.pipe.application.disconnected", function(frameId,val){
		application.log('The application disconnected from the piping server.');
	});
	this.handle("logging.msg", function(val) {
		application.logging.message(application.logging.Remote,
		(typeof val.lvl) == "number"? val.lvl : application.logging.Fatal,
		(typeof val.msg) == "string"? val.msg : "");
	});
	this.handle("application.information",function(info) {
		var change = false;
		if((typeof info.name) == "string") {
			application.information.name = info.name;
			change = true;
		}
		if((typeof info.threadCount) == "number") {
			application.information.threadCount = info.threadCount;
			change = true;
		}
		if(change) application.raiseEvent('change');
	});
}

new Application();
})();

