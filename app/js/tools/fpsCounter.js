/**
 * FPS counter computes the FPS of the application by looking at frame dt.
 * 
 * Uses:
 *   span with id appFps
 * 
 */
 
function FpsCounterTool() {
	this.updateInterval = 1000; // ms
	
	this.average = 0;
	this.minimum = 100000;
	this.maximum = 0;
	
	this.averageText = $("#appFps span");

	function update(){
		this.averageText.text(this.average.toFixed(0));
		setTimeout(update.bind(this),this.updateInterval);
	};
	setTimeout(update.bind(this),this.updateInterval);
	
	application.on('connect',this.reset.bind(this));	
}
FpsCounterTool.prototype.reset = function() {
	this.average = 0;
	this.minimum = 100000;
	this.maximum = 0;	
}
FpsCounterTool.prototype.onFrame = function(frame) {
	var dt = (typeof frame.rawDt) === "number"? frame.rawDt : frame.dt;
	
	if(dt > 0.000001) {
		var fps = 1.0/dt;
		this.average = (this.average + fps) * 0.5;
		this.minimum = Math.min(this.minimum,fps);
		this.maximum = Math.max(this.maximum,fps);
	}
}
