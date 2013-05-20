/**
 * Gamedevwebtools - main.js.
 * 
 * This is a client side application.
 */

var logging = {
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

/**
 * Application.
 * 
 * This is a singleton responsible for communication between the client
 * and the actual application.
 */
var application = null;
function Application() {
	// Information.
	this.name = "";
	this.threadCount = 2;
	this.active = true;
	
	this.packageManager = new ApplicationPackageManager();
	
	this.ws = null;//websocket object.
	if(window)
		window.onbeforeunload = (function(){
			if(this.ws) {
				this.ws.onclose = function() {};
				this.ws.close();
			}
		}).bind(this);
		
	var opt = localStorage.getItem('application.options');
	if(opt){
		this.options = JSON.parse(opt);
	} else this.resetOptions();
	
	// message handlers.
	this.handlers = {};
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
	this.handle("monitoring.frame", function(val){
		frameData.push(frameData.arrays.dt,[val.t,val.dt*1000.0]);
		if((typeof val.rawDt) === "number")
			frameData.push(frameData.arrays.rawDt,[val.t,val.rawDt*1000.0]);
	});
	this.handle("monitoring.memory", function(val) {
		// Convert B to MiB
		data.pushMemoryUsage(val.name,[val.t,val.size/(1024*1024)]);
	});
	this.handle("profiling.result", function(val){
		data.push(data["profiling.result"],val);
	});
	this.handle("profiling.task", function(val){
		frameData.pushTaskProfilingTime(val);
	});
	this.handle("logging.msg", function(val) {
		logging.message(logging.Remote,
		(typeof val.lvl) == "number"? val.lvl : logging.Fatal,
		(typeof val.msg) == "string"? val.msg : "");
	});
	this.handle("application.information",function(info) {
		var change = false;
		if((typeof info.name) == "string") {
			application.name = info.name;
			change = true;
		}
		if((typeof info.threadCount) == "number") {
			application.threadCount = info.threadCount;
			change = true;
		}
		if(change) application.raiseEvent('change');
	});
	
	// connection event handlers.
	this.eventHandlers = {};
	this.disconnectTypes = {
		possible: 0,
		expected: 1,
		unexpected: 2,
	};
	this.disconnectType = this.disconnectTypes.unexpected;
	this.on('connected',function() {
		application.disconnectType = application.disconnectTypes.unexpected;
		data.reset();
		frameData.reset();
	});
	this.on("disconnected",function(event) {
		if(application.disconnectType == 2)
			application.error('The connection to the application was lost');
		else if(application.disconnectType == 1) 
			application.log('Disconnected from the application.');
		application.disconnectType = application.disconnectTypes.unexpected;
		application.ws = null;
	});
}
Application.prototype.resetOptions = function() {
	this.options = {
		autoConnect: true,
		autoConnectServer: 'localhost:8080',
		probeForRunningApplications: true
	};
	this.applyOptions();
	this.saveOptions();
}
Application.prototype.applyOptions = function() {
	this.resetProbing();
}
Application.prototype.saveOptions = function() {
	localStorage.setItem("application.options",
		JSON.stringify(this.options));
}
Application.prototype.on = function(event,callback) {
	if((typeof callback) !== "function"){
		this.error("application.on needs a function callback");
	}
	if(event in this.eventHandlers){
		this.eventHandlers[event].push(callback);
	} else {
		this.eventHandlers[event] = [ callback ];
	}
}
Application.prototype.removeEventHandler = function(event,callback) {
	if(!(event in this.eventHandlers)) return;
	if((typeof callback) !== "function") {
		this.error("application.removeEvent needs a valid callback id.");
	}
	if(event in this.eventHandlers){
		var callbacks = this.eventHandlers[event];
		for(var i = 0;i<callbacks.length;++i) {
			if(callbacks[i] === callback) {
				callbacks.splice(i,1);
			}
		}
	}
}
Application.prototype.raiseEvent = function(event) {
	if(event in this.eventHandlers){
		var callbacks = this.eventHandlers[event];
		for(var i = 0;i<callbacks.length;++i)
			callbacks[i]();
	}
}
Application.prototype.handle = function(msg,callback) {
	if((typeof callback) !== "function"){
		this.error("application.handle needs a function callback");
	}
	if(msg in this.handlers){
		this.error("The message '"+msg+"' already has a handler");
	}
	else this.handlers[msg] = callback;
}
Application.prototype.tryToConnect = function() {
	this.disconnectType = this.disconnectTypes.possible;
	this.connect(this.options.autoConnectServer);
}
Application.prototype.resetProbing = function() {
	if(!this.options.probeForRunningApplications) return;
	
	function probe() {
		if(!application.options.probeForRunningApplications){
			application.probeForConnectionRunning = false;
			return;
		}
		if(application.ws === null) application.tryToConnect();
		application.probeForConnectionRunning = true;
		setTimeout(probe,1000);
	};
	if(this.probeForConnectionRunning === false) {
		setTimeout(probe,1000);
		this.probeForConnectionRunning = true;
	}
}
Application.prototype.onInit = function() {
	// packages.
	this.packageManager.internal.load();
	
	this.probeForConnectionRunning = false;
	this.resetProbing();
	if(this.options.autoConnect !== true) return;
	
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
	
	this.on('connected',onConnected);
	this.on('disconnected',onDisconnected);
	this.disconnectType = this.disconnectTypes.possible;
	this.connect(this.options.autoConnectServer);
}
Application.prototype.log = function(msg) {
	logging.message(logging.Local,logging.Information,msg);
}
Application.prototype.error = function(msg) {
	logging.message(logging.Local,logging.Error,msg);
}
Application.prototype.isConnected = function() {
	return this.ws !== null;
}
Application.prototype.unknownMessageError = function(msg,object) {
	this.error("Unknown message - " + JSON.stringify(object));	
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
			var handler = data.handlers[object.type];
			var binaryDataLength = object.dataSize;
			if(handler) {
				handler(object,new Uint8Array(this.result,offset,binaryDataLength));
			} else application.unknownMessageError(object);
			offset += binaryDataLength;
		} else {	
			// Act based on the header.
			var handler = application.handlers[object.type];
			if(handler) handler(object);
			else application.unknownMessageError(object);
		}
		handler = ui.handlers[object.type];
		if(handler) handler(object);
	}
};
Application.prototype.connect = function(server) {			
	this.ws = new WebSocket('ws://' + server);
	this.ws.onopen = function() {
		application.log('Connected to ws://' + server);
		application.raiseEvent('connected');
	};
	this.ws.onmessage = function(message){
		var reader = new FileReader();
		reader.onloadend = parseMessages;
		reader.readAsArrayBuffer(message.data);
	};			
	this.ws.onclose = function(event){ 
		application.raiseEvent('disconnected');
	}
	// Store the address.
	this.options.autoConnectServer = server;
	this.saveOptions();
}
Application.prototype.disconnect = function() {
	if(this.ws){
		this.disconnectType = this.disconnectTypes.expected;
		this.ws.close();
	}
}
Application.prototype.send = function(type,value) {
	if(this.ws === null){
		this.error("Can't send a message '"+type+"' - the application isn't connected!");
		return;
	}
	if(!value) value = {};
	value.type = type;
	
	var object = JSON.stringify(value);
	if(object.length > 0xFFFF) {
		this.error("Can't send a message longer than 0xFFFF bytes");
		return;
	}
	var buffer = new ArrayBuffer(object.length + 2);
	var u8view = new Uint8Array (buffer);
	u8view[0] = object.length % 256;
	u8view[1] = object.length / 256;
	for(var i = 0;i<object.length;++i){
		u8view[i+2] = object.charCodeAt(i);
	}
	this.ws.send(buffer);	
}
Application.prototype.activate = function() {
	this.send('application.service.activate');
	this.raiseEvent('activate');
	this.active = !this.active;
}
Application.prototype.quit = function() {
	this.disconnectType = this.disconnectTypes.expected;
	this.send('application.service.quit');
}
Application.prototype.step = function() {
	this.send('application.service.step');
}
Application.prototype.loadExtension = function(path) {
	if(window)
		$("body").append('<script src="'+path+'"></script>');
}

function FrameData() {
	this.frameCount = 200;
	this.arrays = {
		dt: [], rawDt: [], taskProfiles: [[]]
	};
	this.support = {
		taskProfiles: {
			lastFrameId: 0,
			lastFrameOffset: 0
		}
	};
}
FrameData.prototype.reset = function() {
	
	this.arrays.dt.length = 0;
	this.arrays.rawDt.length = 0;
	this.arrays.taskProfiles.length = 1;
	this.arrays.taskProfiles[0] = [];
	
	this.support.taskProfiles.lastFrameId = 0;
	this.support.taskProfiles.lastFrameOffset = 0;
}
FrameData.prototype.push = function (data,value) {
	if(data.length < this.frameCount){
		data.push(value);
	} else {
		data.splice(0,1);
		var last = this.frameCount - 1;
		data[last] = value;
	}
};
FrameData.prototype.pushTaskProfilingTime = function(val) {
	var index = this.support.taskProfiles.lastFrameOffset;
	var frameId = val.frame;
	
	if(frameId > this.support.taskProfiles.lastFrameId) {
		++index;
		if(index >= this.frameCount) {
			index = this.frameCount - 1;
			this.arrays.taskProfiles.splice(0,1);
			this.arrays.taskProfiles[index] = [];
		}
		else if(index >= this.arrays.taskProfiles.length) {
			this.arrays.taskProfiles.push([]); 
		}
		this.support.taskProfiles.lastFrameOffset = index;
		this.support.taskProfiles.lastFrameId = frameId;
	}
	this.arrays.taskProfiles[index].push(val);
};
var frameData = new FrameData();

function Data() {
	this["profiling.result"] = [];
	this.memoryUsage = {};
	this.memoryUsage.arrays = [];
	this.memoryUsage.allocators = {};
	this.memoryUsage.max = 0;
	this.memoryUsage.getAllocator = function(index) {
		var self = data.memoryUsage.allocators;
		for (var key in self) {
			if (self.hasOwnProperty(key)) {
				if(self[key] === index) return key;
			}
		}
		return null;
	};
	
	this.handlers = {
		"data.shader": function(object,bytes) {
			//console.log('Got shader:' + data.utf8toString(bytes));
		}
	};
}
Data.prototype.utf8toString = function(bytes) {
	var str = "";
	var offset = 0;
	for(var end = bytes.length;offset<end;++offset) {
		str += String.fromCharCode(bytes[offset]);
	}
	return str;
}
Data.prototype.reset = function() {
	this["profiling.result"].length = 0;
	this.memoryUsage.arrays.length = 0;
	this.memoryUsage.allocators = {};
	this.memoryUsage.max = 0;
}
Data.prototype.pushMemoryUsage = function(name,val) {
	if(!(name in this.memoryUsage.allocators)){
		this.memoryUsage.allocators[name] = this.memoryUsage.arrays.length;
		this.memoryUsage.arrays.push([]);
	}
	if(val[1] > this.memoryUsage.max)
		this.memoryUsage.max = val[1];
	this.memoryUsage.arrays[this.memoryUsage.allocators[name]].push(val);
}
Data.prototype.push = function(array,value) {
	array.push(value);
}
var data = new Data();

$(document).ready(function () {

	application = new Application();
	ui = new Ui();
	
	application.onInit();
});
