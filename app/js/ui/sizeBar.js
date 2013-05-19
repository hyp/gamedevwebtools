/**
 * Sizebar is used to resize widgets.
 */
function SizeBar(barSelector, widgetSelector){
	this.widget = barSelector;
	this.widgetForResize = widgetSelector;
	
	this.isDragging = false;
	this.panX = 0;this.panY = 0;
	this.minHeight = 0;this.maxHeight = 0;
	
	this.widgetWidth = 0;this.widgetHeight = 0;
	
	this.widget.mousedown(this.onMouseDown.bind(this));
	$(document).mouseup  (this.onMouseUp.bind(this));
	$(document).mousemove(this.onMouseMove.bind(this));
}
SizeBar.prototype.onMouseDown = function(event) {
	this.panX = event.clientX;
	this.panY = event.clientY;
	this.widgetWidth = this.widgetForResize.width();
	this.widgetHeight = this.widgetForResize.height();
	this.isDragging = true;
}
SizeBar.prototype.onMouseUp = function(event) {
	this.isDragging = false;
}
SizeBar.prototype.onMouseMove = function(event) {
	if(this.isDragging){
		var dx = this.panX - event.clientX;
		var dy = this.panY - event.clientY;	
		var resultingHeight = this.widgetHeight + dy;
		if(resultingHeight > this.minHeight) {
			this.widgetForResize.height(this.widgetHeight + dy);
			if(this.onResize)
				this.onResize(this.widgetWidth,resultingHeight);
		}
	}
}
