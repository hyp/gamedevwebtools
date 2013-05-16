/**
 * Gamedevwebtools
 */
 
/**
 * ViewportComponent.
 * 
 * This component enables viewport keyboard/mouse/touch 
 * panning and/or zooming for canvas based views.
 */
function ViewportComponent(owner, widget) {
	this.isPaning = false;
	this.isZooming = false;

	// Starting coordinates for panning and zooming.
	this.panX = 0;
	this.panY = 0;
	this.zoomX = 0;
	this.zoomY = 0;
	
	// Translation
	this.translationX = 0;this.translationY = 0;
	this.translationMinX = 0;this.translationMinY = 0;
	this.translationMaxX = 0;this.translationMaxY = 0;
	this.prevTranslationX = 0;this.prevTranslationY = 0;	
	
	// Scaling
	this.scaleX = 1;this.scaleY = 1;
	this.prevScaleX = 0;this.prevScaleY = 0;
	this.scaleMinX = 1;this.scaleMinY = 1;
	this.scaleMaxX = 1;this.scaleMaxY = 1;
	
	this.owner = owner;
	this.widget = widget;
	widget.mousedown(this,function(e) {
		e.data.onMouseDown(e);
	});
	widget.mouseup  (this,function(e) {
		e.data.onMouseUp(e);
	});
	widget.mousemove(this,function(e) {
		e.data.onMouseMove(e);
	});
	widget.dblclick(this,function(e){
		e.data.onDoubleClick(e);
	});
	widget.bind('contextmenu',function(e) {
		return false;
	});
}
ViewportComponent.prototype.updateTranslation = function(x,y) {
	this.translationX = x;
	this.translationY = y;
	if(this.translationX > this.translationMaxX)
		this.translationX = this.translationMaxX;
	else if(this.translationX < this.translationMinX)
		this.translationX = this.translationMinX;
	if(this.translationY > this.translationMaxY)
		this.translationY = this.translationMaxY;
	else if(this.translationY < this.translationMinY)
		this.translationY = this.translationMinY;
}
ViewportComponent.prototype.updateTranslationLimits = 
function(minx,miny,maxx,maxy) {
	this.translationMinX = minx;
	this.translationMinY = miny;
	this.translationMaxX = maxx;
	this.translationMaxY = maxy;
}
ViewportComponent.prototype.updateScalingLimits = 
function(minx,miny,maxx,maxy) {
	this.scaleMinX = minx;
	this.scaleMinY = miny;
	this.scaleMaxX = maxx;
	this.scaleMaxY = maxy;
}
ViewportComponent.prototype.onDoubleClick = function(event) {
	this.scaleX = 1;
	this.scaleY = 1;
	this.isZooming = false;
	this.isPaning = false;
	this.owner.onViewportComponentUpdate();
}
ViewportComponent.prototype.onMouseDown = function(event) {
	if( event.button === 0){
		this.isPaning = true;
		this.panX = event.clientX;
		this.panY = event.clientY;
		this.prevTranslationX = this.translationX;
		this.prevTranslationY = this.translationY;
	} else if(event.button === 2){
		this.isZooming = true;
		this.zoomX = event.clientX;
		this.zoomY = event.clientY;
		this.prevScaleX = this.scaleX;
		this.prevScaleY = this.scaleY;
		this.widget.css("cursor","move");
	}
	
}
ViewportComponent.prototype.onMouseUp = function(event) {
	if(event.button === 0) 
		this.isPaning = false;
	else if(event.button === 2){
		this.isZooming = false;
		this.widget.css("cursor","default");
	}
}
ViewportComponent.prototype.onMouseMove = function(event) {
	if(this.isPaning) {
		var dx = event.clientX - this.panX;
		var dy = event.clientY - this.panY;
		this.updateTranslation(this.prevTranslationX - dx/this.scaleX,
			this.prevTranslationY - dy/this.scaleY);
		this.owner.onViewportComponentUpdate();
	} else if(this.isZooming) {
		var dx = event.clientX - this.zoomX;
		var dy = event.clientY - this.zoomY;

		dx *= Math.max(1,Math.log(this.scaleX))*0.01;
		this.scaleX = this.prevScaleX + dx;
		if(this.scaleX < this.scaleMinX) this.scaleX = this.scaleMinX;
		else if(this.scaleX > this.scaleMaxX) 
			this.scaleX = this.scaleMaxX;

		this.owner.onViewportComponentUpdate();
	}
}

/**
 * ControlComponent.
 * 
 * This component passes events back to the owner 
 * in local mouse coordinates.
 */
function ControlComponent(owner,widget) {
	this.owner = owner;
	this.widget = widget;

	widget.mousemove(this,function(e) {
		var self = e.data;
		var offset = self.widget.offset();
		e.x = e.pageX - offset.left;
		e.y = e.pageY - offset.top;
		var f = self.owner.onControlComponentMouseMove;
		if((typeof f) === "function")
			f.call(self.owner,e);
	});
	widget.click(this,function(e) {
		var self = e.data;
		var offset = self.widget.offset();
		e.x = e.pageX - offset.left;
		e.y = e.pageY - offset.top;
		var f = self.owner.onControlComponentClick;
		if((typeof f) === "function")
			f.call(self.owner,e);	
	});
	widget.dblclick(this,function(e) {
		var self = e.data;
		var offset = self.widget.offset();
		e.x = e.pageX - offset.left;
		e.y = e.pageY - offset.top;
		var f = self.owner.onControlComponentDoubleClick;
		if((typeof f) === "function")
			f.call(self.owner,e);			
	});
}

/**
 * PopupComponent.
 * 
 * This component enables display of popups.
 */
function PopupComponent(owner,widget) {
	this.owner = owner;
	this.widget = widget;
	this.hasPopover = false;
}
PopupComponent.prototype.current = null;
PopupComponent.prototype.hide = function() {
	if(this.hasPopover){
		this.widget.popover('destroy');	
		PopupComponent.prototype.current = null;
	}
}
PopupComponent.prototype.show = function(str,x,y) {
	if(this.hasPopover)
		this.widget.popover('destroy');
	this.widget.popover({trigger:'manual',html:true,content:str});
	this.widget.popover('show');
	var sel = $('.popover');
	sel.offset({top:y-sel.outerHeight()/2,left:x+20});
	this.hasPopover = true;
	PopupComponent.prototype.current = this;
}
