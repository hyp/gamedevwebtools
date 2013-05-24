application.on('tools.create',function(){

/**
 * Keyboard button enables sending
 * the browser keyboard up and down events to the application.
 * 
 * Uses:
 *   button with id appKeyboardButton.
 * 
 * TODO:
 * 	 change on('disconnected') to on('beforedisconnected') to
 * 	 correctly send the keyup events on the keys which are currently down.
 */

function KeyboardButtonTool() {
	this.keys = new Uint8Array(256);
	for(var i = 0;i<this.keys.length;++i)
		this.keys[i] = 0;
	this.enabled = false;
	
	$(window).keydown(this.onKeyDown.bind(this));
	$(window).keyup(this.onKeyUp.bind(this));
	application.on('disconnected',this.reset.bind(this));	
	$("#appKeyboardButton").click((function(){
		this.enabled = !this.enabled;
		if(this.enabled === false) this.clearKeys();
	}).bind(this));
}
KeyboardButtonTool.prototype.clearKeys = function() {
	var send = application.isConnected();
	for(var i = 0;i<this.keys.length;++i){
		if(this.keys[i] === 1) {
			if(send) application.send("input.keyup",{"key": i});
			this.keys[i] = 0;
		}
	}
}
KeyboardButtonTool.prototype.reset = function() {
	this.clearKeys();
	this.enabled = false;
	ui.utils.resetPushButton($("#appKeyboardButton"));
}
KeyboardButtonTool.prototype.onKeyDown = function(event) {
	if(this.enabled) {
		var key = event.keyCode;
		if(key < this.keys.length && this.keys[key] === 0){
			this.keys[key] = 1;
			application.send("input.keydown",{"key": key});
		}
	}
}
KeyboardButtonTool.prototype.onKeyUp = function(event) {
	if(this.enabled) {
		var key = event.keyCode;
		if(key < this.keys.length && this.keys[key] === 1){
			this.keys[key] = 0;
			application.send("input.keyup",{"key": key});
		}
	}
}

application.tools.keyboardInputButton = new KeyboardButtonTool();
application.tools.console.onFocus(
	application.tools.keyboardInputButton.reset.bind(
		application.tools.keyboardInputButton));

});
