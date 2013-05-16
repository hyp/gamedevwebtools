
/**
 * Graph view plots a graph.
 */
function GraphView(widgetId,data,options) {
	if((typeof widgetId) !== "string") return;
	
	this.widget = $('#'+widgetId);
	var c = $("#"+widgetId+" div canvas");
	this.sel = c;
	this.canvas = c[0];
	this.innerWidth = 0;
	this.isVisible = false;
	this.needsRedraw = false;
	this.datas = data;
	
	if(options && options.labels && 
		(typeof options.labels) === "object"){
		this.labels = options.labels;
	} else this.labels = ["",""];
	this.useCustomXMax = false;
	this.xMaxContinuation = 0;
	
	//Currently selected point.
	this.curPoint = -1;
	this.curPointDataId = 0;
	
	this.yValueMin = 0; this.yValueMax = 60;
	this.xValueMin = 0; this.xValueMax = 0;
	this.xAxisOffset = 30;this.yAxisOffset = 30;
	
	// The viewport for the actuall graph
	this.viewX = 0;
	this.viewY = 0;
	this.viewWidth = 0;
	this.viewHeight = 0;
	
	// Components.
	this.viewComponent = new ViewportComponent(this,this.sel);	
	this.infoComponent = new ControlComponent(this,this.sel);
	// An array of points. (2x float32 per each point)
	this.points = [];
	for(var i = 0;i<data.length;++i) {
		this.points.push(null);
	}
	
	var self = this;
	this.sel.mouseleave(function(e) {
		var prev = self.curPoint;
		self.curPoint = -1;
		if(prev !== -1)
			self.needsRedraw = true;
	});
}
GraphView.prototype.axisUnits = 
	new Float32Array([0.25,0.5,1,5,10,20,50,100,1000]);
GraphView.prototype.yAxisLabelMinHeight = 30;
GraphView.prototype.xAxisLabelMinWidth = 40;
GraphView.prototype.onViewportComponentUpdate = function() {
	this.needsRedraw = true;
}
GraphView.prototype.styles = [
	"#339966",
	"#336699",
	"#993366"
];
GraphView.prototype.onControlComponentMouseMove = function(event) {
	var point = this.getPointAt(event.x,event.y);
	var prev = this.curPoint;
	var prevData = this.curPointDataId;
	this.curPoint = point[0];
	this.curPointDataId = point[1];
	if(prev !== this.curPoint || prevData !== this.curPointDataId) {
		this.needsRedraw = true;
	}
}
GraphView.prototype.onShow = function() {
	this.isVisible = true;
	this.resize();
};
GraphView.prototype.onHide = function() {
	this.isVisible = false;
}
GraphView.prototype.resize = function() {
	if(!this.isVisible) return;
	this.canvas.width = this.sel.innerWidth();
	this.canvas.height = 400;
	
	// viewport
	this.viewX = this.xAxisOffset;
	this.viewY = 0;
	this.viewWidth = this.canvas.width - this.xAxisOffset;
	this.viewHeight = this.canvas.height - this.yAxisOffset;
	
	this.needsRedraw = true;
	this.draw();
}
GraphView.prototype.setYValueLimits = function(min,max) {
	this.yValueMin = min; this.yValueMax = max;
	this.xAxisOffset = 30;
	this.needsRedraw = true;
}
GraphView.prototype.setXValueMax = function(max) {
	this.xValueMax = max;
	this.useCustomXMax = true;
	this.update();
}
GraphView.prototype.update = function() {
	this.needsRedraw = true;
}
GraphView.prototype.layoutFrames = function() {
	var scaleX = 1;
	if(this.datas.length !== this.points.length) {
		this.points = [];
		for(var i = 0;i<this.datas.length;++i) {
			this.points.push(null);
		}
		this.curPoint = -1;
	}
	for(var k = 0;k<this.datas.length;++k){
		var data = this.datas[k];
		if(!data.length)
			continue;
		
		// Update the points array.
		if(!this.points[k] || this.points[k].length !== (data.length*2))
			this.points[k] = new Float32Array(data.length*2);
		var points = this.points[k];
		
		// Difference between the highest and the lowest value.
		var dx = data[0][0];
		for(var i = 0;i<data.length;++i){
			if(data[i][0] > dx) dx = data[i][0];
		}
		this.xValueMin = data[0][0];
		this.xValueMax = this.useCustomXMax === true?
			this.xValueMax : dx;
		dx = this.xValueMax - data[0][0];
		if(dx != 0){
			scaleX = this.viewWidth / dx;
		} else scaleX = 1;
		
		var viewx = this.viewX;//this.viewComponent.translationX*this.viewComponent.scaleX;	
		//var scaleX = this.pixelsPerSecond;// * this.viewComponent.scaleX;
		var scaleY = (1/(this.yValueMax - this.yValueMin)) * this.viewHeight;
		var j = 0;
		var firstx = data[0][0];
		var ymin = this.yValueMin;
		for(var i = 0;i<data.length;++i) {
			var point = data[i];
			points[j] = Math.round(viewx + (point[0] - firstx) * scaleX);		
			points[j+1] = this.viewHeight - 
				Math.round((point[1]-ymin) * scaleY);
			j+=2;
		}
		if(this.useCustomXMax) {
			this.xMaxContinuation = 
				Math.round(viewx + (this.xValueMax - firstx) * scaleX);	
		}
	}
	return scaleX;
}
GraphView.prototype.getPointAt = function(x,y) {
	var px,dy,dist;	
	var minDist = this.viewWidth*this.viewHeight;
	var min = -1;
	var minData = 0;
		
	for(var k = 0;k<this.points.length;++k){
		var points = this.points[k];
		if(!points) continue;
		for(var i = 0;i<points.length;i+=2){
			px = points[i] - x;py = points[i+1] - y;
			dist = px*px + py*py;
			if(dist < minDist){
				minDist = dist;
				min = i;
				minData = k;
			}
		}
	}
	return [min,minData];
}
GraphView.prototype.pointInformation = function(index,point) {
	return null;
}
GraphView.prototype.draw = function() {
	if(!this.isVisible || !this.needsRedraw) return;
	this.needsRedraw = false;	
	var ctx=this.canvas.getContext("2d");
	//Set the font.
	ctx.font="14px Arial";
	var textColour = this.sel.css('color');
	if(!textColour) textColour = "#000000";
	
	var scaleX = this.layoutFrames();
	
	//Background.
	ctx.fillStyle="#FFFFFF";
	ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
	
	//Axes
	ctx.strokeStyle = "#A0A0A0";
	ctx.lineWidth = 1;
	var y = this.viewY + this.viewHeight;
	
	ctx.beginPath();
	ctx.moveTo(this.viewX-1,this.viewY);
	ctx.lineTo(this.viewX-1,y);
	ctx.stroke();
	
	ctx.beginPath();
	ctx.moveTo(this.viewX,y);
	ctx.lineTo(this.viewX + this.viewWidth,y);
	ctx.stroke();		
	
	//Labels.
	ctx.fillStyle=textColour;
	ctx.strokeStyle = "#A0A0A0";
	ctx.textAlign = 'right';
	ctx.textBaseline = 'middle';
	
	var ymin = this.yValueMin;
	var ydiff = this.yValueMax - this.yValueMin;
	var scaleY = (1/ydiff) * this.viewHeight;
	var units = this.axisUnits;
	
	for(var i = 0;i<units.length;++i){
		var count = Math.ceil(ydiff/units[i]);
		if((this.viewHeight/count) > this.yAxisLabelMinHeight){
			scaleY = units[i] * scaleY;
			for(var j = 0;j<count;++j){
				y = this.viewHeight - Math.round(j*scaleY);	
				if(j != 0){
					ctx.beginPath();
					ctx.moveTo(this.viewX,y);
					ctx.lineTo(this.viewX + this.viewWidth,y);
					ctx.stroke();
				}
				
				ctx.fillText(''+(j*units[i] + ymin),this.viewX - 3,y);
			}
			break;
		}
	}
	

	
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';
	
	var xmin = this.xValueMin;
	var xdiff = this.xValueMax - this.xValueMin;
	if(xdiff >= 0.001){
		for(var i = 0;i<units.length;++i){
			var count = Math.ceil(xdiff/units[i]);
			if((this.viewWidth/count) > this.xAxisLabelMinWidth){
				var xroundedmin = Math.ceil(xmin/units[i])*units[i];
				xdiff = this.viewX +(xroundedmin - xmin) * scaleX;
				for(var j = 0;j<count;++j){
					y = xdiff + Math.round( (j*units[i]) * scaleX);
					ctx.beginPath();
					ctx.moveTo(y,this.viewY);
					ctx.lineTo(y,this.viewY + this.viewHeight);
					ctx.stroke();			
					
					ctx.fillText(''+(j*units[i]+xroundedmin),y,
						this.viewY + this.viewHeight + 2);
				}
			}
		}
	}
	
	//Points.
	var x,y,prevX,prevY;
	for(var j = 0;j<this.points.length;++j) {
		var points = this.points[j];
		if(!points || !points.length) continue;
		
		prevX = points[0];prevY = points[1];
		var style = this.styles[j % this.styles.length];
		ctx.strokeStyle = style;
		ctx.fillStyle   = style;
		ctx.fillRect(prevX-2,prevY-2,4,4);
		for(var i = 2;i<points.length;i+=2){
			x = points[i];y = points[i+1];
			ctx.beginPath();
			ctx.moveTo(prevX,prevY);
			ctx.lineTo(x,y);
			ctx.stroke();
			ctx.fillRect(x-2,y-2,4,4);
			prevX = x;prevY = y;
		}
		if(this.useCustomXMax) {
			ctx.beginPath();
			ctx.moveTo(prevX,prevY);
			ctx.lineTo(this.xMaxContinuation,prevY);
			ctx.stroke();			
		}
	}
	
	
	if(this.curPoint !== -1){
		x = this.points[this.curPointDataId][this.curPoint];
		y = this.points[this.curPointDataId][this.curPoint+1];
		ctx.fillStyle = this.styles[this.curPointDataId % 
			this.styles.length];
		ctx.fillRect(x-3,y-3,6,6);
		
		var point = this.curPoint/2;
		var strX = this.datas[this.curPointDataId][point][0].toFixed(3);
		var strY = this.datas[this.curPointDataId][point][1].toFixed(3);
		x = Math.max(ctx.measureText(strX).width,
			ctx.measureText(strY).width);
		var labels = this.labels.length === 1? this.labels[0] :
			this.labels[this.curPointDataId];
		y = Math.max(ctx.measureText(labels[0]).width,
			ctx.measureText(labels[1]).width);
		x = x+y;
		var info = this.pointInformation(this.curPointDataId,this.curPoint);
		if(info) {
			x = Math.max(x,ctx.measureText(info).width);
		}
		y = this.viewX + this.viewWidth - x;
		
		var textHeight = 40;
		var textY = this.viewY;
		if(info){
			textHeight += 20;
		}
		
		ctx.fillStyle = "#FFFFFF";
		
		ctx.fillRect(y - 3,textY,x+3,textHeight);
		if(info) textY += 20;
		
		ctx.fillStyle = textColour;
		ctx.textAlign = 'left';
		ctx.fillText(labels[0],y,textY);
		ctx.fillText(labels[1],y,textY + 20);
	
		ctx.fillStyle = this.styles[this.curPointDataId % 
			this.styles.length];
		if(info)
			ctx.fillText(info,y,textY-20);				
		ctx.textAlign = 'right';
		ctx.fillText(strX,
			this.viewX+this.viewWidth,textY);
		ctx.fillText(strY,
			this.viewX+this.viewWidth,textY + 20);
	}
}
