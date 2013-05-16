

/**
 * ProfilingThreadView.
 */
function ProfilingThreadView() {
	this.widget = $("#profilingThreadView");
	var c = $("#profilingThreadView div canvas");
	this.sel = c;
	this.canvas = c[0];
	this.innerWidth = 0;
	this.pixelsPerSecond = 1000 * ((200)/10);
	this.isVisible = false;
	this.needsRedraw = false;
	// Components.
	this.viewComponent = new ViewportComponent(this,this.sel);
	this.viewComponent.updateScalingLimits(0.1,1,300,1);
	this.infoComponent = new ControlComponent(this,this.sel);
	this.popupComponent = new PopupComponent(this,this.sel);
	// Styles.
	this.styles = [
		"#049cdb",
		"#46a546",
		"#9d261d",
		"#ffc40d",
		"#f89406",
		"#c3325f",
		"#7a43b6"
	];
	// Stores the maximum depth for each thread.
	this.threadDepth = null;
	this.threadLayout = null;
	this.visibleFrames = null;
}
ProfilingThreadView.prototype.onShow = function() {
	this.isVisible = true;
	this.resize();
};
ProfilingThreadView.prototype.onHide = function() {
	this.isVisible = false;
}
ProfilingThreadView.prototype.onControlComponentMouseMove = function(event) {
	var cell = this.getCellAt(event.x,event.y);
	if(cell){
		//console.log('Cell ' + cell.name);
	}
}
ProfilingThreadView.prototype.onControlComponentClick = function(event) {
	var cell = this.getCellAt(event.x,event.y);
	if(cell){
		var str= '<h4>' + cell.name + 
		'</h4><b>Duration:</b><span class="popupInfo">' 
		+ (cell.dt*1000).toFixed(3) +
		'ms</span><br><b>Start:</b><span class="popupInfo">'
		+ (cell.t*1000).toFixed(3) + 'ms</span>';
		this.popupComponent.show(str,event.pageX,event.pageY);
	} else 	this.popupComponent.hide();
}
ProfilingThreadView.prototype.onControlComponentDoubleClick = 
function(event) {
	var cell = this.getCellAt(event.x,event.y);
	if(cell){
		
	}
}
ProfilingThreadView.prototype.onViewportComponentUpdate = function() {
	this.popupComponent.hide();
	this.needsRedraw = true;
}
ProfilingThreadView.prototype.resize = function() {
	if(!this.isVisible) return;
	this.canvas.width = this.sel.innerWidth();
	this.canvas.height = 400;
	
	this.needsRedraw = true;
	this.draw();
}
/// Compute inner size in terms of time.
ProfilingThreadView.prototype.computeInnerSize = function() {
	var fdata = frameData.arrays.taskProfiles;
	if(!fdata.length) return 0;
	var scaleX = this.pixelsPerSecond;
	var threadCount = application.threadCount;
	
	var x = 0;
	
	var lastTT = 0;
	for(var i = 0;i<fdata.length;++i) {
		var t = 0;var tt = 0;
		var data = fdata[i];
		// Compute the frameTime.
		for(var j = 0;j<data.length;++j){
			if(data[j].dt > t){
				t = data[j].dt;
				tt = data[j].t;
			}
		}
		// Compute the width of the frame.
		t = t * scaleX;
		if(i!=0){
			tt=(tt-lastTT)*scaleX;
			lastTT = tt;
		} else tt = 0;
		x+=t+tt;
	}
	
	return [x,0];
}
ProfilingThreadView.prototype.update = function(autoscroll) {
	this.innerWidth = this.computeInnerSize()[0];
	var viewmaxx = this.innerWidth - this.canvas.width;
	this.viewComponent.updateTranslationLimits(0,0,this.innerWidth,0);
	if(autoscroll){
		this.viewComponent.translationX = viewmaxx;
	}
	this.needsRedraw = true;
}
/// Layout the visible frames in terms of time and view.
ProfilingThreadView.prototype.layoutFrames = function() {
	var fdata = frameData.arrays.taskProfiles;
	if(!fdata.length){
		this.visibleFrames = null;
		return;
	}
	
	var threadCount = application.threadCount;
	var scaleX = this.pixelsPerSecond * this.viewComponent.scaleX;
	
	// Reset thread depth.
	if(!this.threadDepth || this.threadDepth.length < threadCount)
		this.threadDepth = new Int32Array(threadCount);
	for(var i = 0;i<threadCount;++i){
		this.threadDepth[i] = 0;
	}
	var threadDepths = this.threadDepth;
	
	// Layout the cells.
	var cells = [];
	var viewx = this.viewComponent.translationX*this.viewComponent.scaleX;
	var viewxmax = viewx + this.canvas.width;
	
	var x = 0;	
	var lastTT = 0;
	for(var i = 0;i<fdata.length;++i) {
		var t = 0;var tt = 0;
		var data = fdata[i];
		// Compute the frameTime.
		for(var j = 0;j<data.length;++j){
			if(data[j].dt > t){
				t = data[j].dt;
				tt = data[j].t;
			}
		}
		// Compute the width of the frame.
		t = t * scaleX;
		if(i!=0){
			tt=(tt-lastTT) * scaleX;
			lastTT = tt;
		} else tt = 0;
		// Clipping.
		if((x+t) < viewx ||
			x > viewxmax){
			x+=t+tt;
			continue;
		}
		// Bucket the frame timing results into thread buckets.
		var buckets = [];
		for(var j = 0;j<threadCount;++j){
			buckets.push([]);
		}		
		for(var j = 0;j<data.length;++j) { 
			buckets[data[j].thread].push(data[j]);
		}
		// Compute the max depth for each thread.
		for(var j = 0;j<threadCount;++j){
			for(var k = 0;k<buckets[j].length;++k){
				var depth = buckets[j][k].depth+1;
				if(depth > threadDepths[j]){
					 threadDepths[j] = depth;
				}
			}
		}
		cells.push([x-viewx,t,buckets]);
		x+=t+tt;
	}
	
	this.visibleFrames = cells;
}
ProfilingThreadView.prototype.layoutThreads = function() {
	var threadCount = application.threadCount;
	
	if(!this.threadLayout || this.threadLayout.length < threadCount)
		this.threadLayout = new Float32Array(threadCount);
	var threadLayout = this.threadLayout;
	var threadDepths = this.threadDepth;
	
	//Layout the threads.
	var y = 10;
	var threadSeparation = this.canvas.height/(threadCount);
	var bestY;
	for(var i = 0;i<threadCount;++i){
		if(i != 0){
			if(y < bestY) y = bestY;
			else y += 20;
		}
		threadLayout[i] = y;
		bestY = y + threadSeparation;
		y += (20+1) * threadDepths[i];
	}	
}
ProfilingThreadView.prototype.foreachCell = function(f) {
	var frames = this.visibleFrames;
	if(!frames) return;
	var threadLayout = this.threadLayout;
	var scaleX = this.pixelsPerSecond * this.viewComponent.scaleX;
	for(var i = 0;i<frames.length;++i){
		var frame = frames[i];
		var x = frame[0];
		var threads = frame[2];
		
		for(var j = 0;j<threads.length;++j){
			var cells = threads[j];
			if(!cells.length) continue;
			var y = threadLayout[cells[0].thread];
			for(var k = 0;k<cells.length;++k){
				var elem = cells[k];
				var elemY     = Math.floor(y + (20+1) * elem.depth);
				var elemX     = Math.round(x + elem.t*scaleX);
				var elemWidth = Math.floor(elem.dt*scaleX);
				if(elemWidth < 1) elemWidth = 1;
				if(f(elem,elemX,elemY,elemWidth,20))
					return;
			}
		}
	}	
}
ProfilingThreadView.prototype.getCellAt = function(x,y) {
	var result = null;
	this.foreachCell(function(cell,cx,cy,cw,ch) {
		if(x >= cx && x <= (cx + cw) && y >= cy && y <= (cy + ch)){
			result = cell;
			return true;
		}
		return false;
	});
	return result;
}
ProfilingThreadView.prototype.draw = function() {
	if(!this.isVisible || !this.needsRedraw) return;
	this.needsRedraw = false;
	var ctx=this.canvas.getContext("2d");
	//Set the font.
	ctx.font="14px Arial";
	var fdata = frameData.arrays.taskProfiles;
	if(!fdata.length) return;
	//var textColour = this.sel.css('color');
	//if(!textColour) 
	textColour = "#FFFFFF";
	
	var threadCount = application.threadCount;
	var pixelsPerSecond = this.pixelsPerSecond;
	
	this.layoutFrames();
	var cells = this.visibleFrames;
	var threadDepths = this.threadDepth;
	this.layoutThreads();
	var threadLayout = this.threadLayout;

	
	//Background.
	ctx.fillStyle="#FFFFFF";
	ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);		
	
	//Draw the thread lines.
	ctx.strokeStyle = "#A0A0A0";
	ctx.lineWidth = 2;
	for(var i = 0;i<threadCount;++i){
		var y = Math.floor(threadLayout[i] + 10);
		ctx.beginPath()
		ctx.moveTo(0,y);
		ctx.lineTo(ctx.canvas.width,y);
		ctx.stroke();			
	}
	
	//Draw the frame lines
	ctx.strokeStyle = "#A0A0A0";
	ctx.lineWidth = 1;
	for(var i = 0;i<cells.length;++i){
		var x = Math.floor(cells[i][0]);
		ctx.beginPath();
		ctx.moveTo(x,0);
		ctx.lineTo(x,ctx.canvas.height);
		ctx.stroke();	
		
		/*ctx.fillStyle=textColour;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText("100",x,ctx.canvas.height-10);*/
	}
	
	//Draw the cells.
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'left';
	var scaleX = this.pixelsPerSecond * this.viewComponent.scaleX;
	if(!cells) return;
	for(var i = 0;i<cells.length;++i){
		var cell = cells[i];
		var x = cell[0];
		var buckets = cell[2];
				
		for(var j = 0;j<buckets.length;++j){
			var bucket = buckets[j];
			if(!bucket.length) continue;
			var y = threadLayout[bucket[0].thread];
			for(var k = 0;k<bucket.length;++k){
				var elem = bucket[k];
				var elemY     = Math.floor(y + (20+1) * elem.depth);
				var elemX     = Math.round(x + elem.t*scaleX);
				var elemWidth = Math.floor(elem.dt*scaleX);
				if(elemWidth < 1) elemWidth = 1;
				
				//Rectangle			
				var hash = 0;
				for (var l = 0; l < elem.name.length; l++) {
					var char = elem.name.charCodeAt(l);
					hash = ((hash<<5)-hash)+char;
					hash = hash & hash; // Convert to 32bit integer
				}
				ctx.fillStyle = this.styles[hash%this.styles.length];
				ctx.fillRect(elemX,elemY,elemWidth,20);
				
				//Label	
				ctx.fillStyle=textColour;
				var str = elem.name + " " + 
						(elem.dt*1000).toFixed(3) +" ms";
				var metrics = ctx.measureText(str);
				if((metrics.width+2) > elemWidth){
					str = elem.name;
					metrics = ctx.measureText(str);
					// Check if the text fits.
					if((metrics.width+2) > elemWidth) continue;
				}				
				ctx.fillText(str,elemX+10,elemY+10);
			}
		}
	}
}
