application.on('tools.create',function() {

/**
 * Delta time graph - 
 * plots raw and filtered(if present) dt for last N frames.
 * 
 * Uses:
 * 	 tab with id profilingTimeGraphView.
 *   application.data.frameDt, application.data.frameRawDt]
 */
function FrameDtView() {
	FrameDtView.superclass.constructor.call(this,
	'profilingTimeGraphView',
	[application.data.frameDt.array, application.data.frameRawDt.array],
	{
		labels: [
		["Frame start (s): ","DT (ms): "],
		["Frame start (s): ","Raw(unfiltered) DT (ms): "] ]
	});
	// Plot 0 to 60 ms.
	this.setYValueLimits(0,60);
	application.data.frameDt.on(application.data.EventType.any,
		this.update.bind(this));
	application.data.frameRawDt.on(application.data.EventType.any,
		this.update.bind(this));
}
core.extend(FrameDtView,GraphView);

/**
 * Memory usage graph -
 * plots the memory usage for individual subsystems throughout the
 * life of the application.
 * 
 * Uses:
 *   tab with id memoryUsageGraphView.
 *   application.data.memoryUsage
 */
function MemoryUsageView() {
	MemoryUsageView.superclass.constructor.call(this,
	'memoryUsageGraphView',
	application.data.memoryUsage.arrays,
	{
		labels: [["Time (s): ","Memory (MiB): "]]
	});
	this.setYValueLimits(0,1);
	this.pointInformation = function(index,point) {
		return application.data.memoryUsage.getAllocator(index);
	}
	
	application.data.memoryUsage.on(application.data.EventType.any,
		this.update.bind(this));
}
core.extend(MemoryUsageView,GraphView);
MemoryUsageView.prototype.update = function() {
	// SetYLimits.
	var max = application.data.memoryUsage.max;
	if(max < 1)
		this.setYValueLimits(0,1);
	else 
		this.setYValueLimits(0,max + 1);
	MemoryUsageView.superclass.update.call(this);
}

/**
 * A table consisting of profiling times.
 * Uses:
 *   application.data.profilingResults
 */
function ProfilingTimerView() {
	this.widget = $("#profilingResultsView");
	this.tableBody =  $("#profilingResultsView table tbody");
	
	function itemToHtml(val) {
		return '<tr><td>'+
		val.name+'</td><td>'+val.samples+
		'<td>'+(val.mean*1000.0).toFixed(3)+' ms</td>'+
		'<td>'+(val.median*1000.0).toFixed(3)+' ms</td>'+
		'<td>'+(val.stddev*1000.0).toFixed(3)+' ms</td>'+
		'<td>'+(val.total*1000.0).toFixed(3)+' ms</td>'+
		'</td></tr>';
	}
	var self = this;
	application.data.profilingResults.on(application.data.EventType.push,
	function(item){
		self.tableBody.append(itemToHtml(item));
	});
	application.data.profilingResults.on(application.data.EventType.change,
	function(data){
		var html = '';
		for(var i = 0;i<data.length;++i)
			html += itemToHtml(data[i]);
		self.tableBody.html(html);
	});
}


application.tools.frameDt = new FrameDtView();
application.tools.memoryUsage = new MemoryUsageView();
application.data.frameDt.on(application.data.EventType.push,
	function(item) {
		application.tools.memoryUsage.setXValueMax(item[0]);
	});

application.tools.profilingThreads =
	new ProfilingThreadView(application.data.frameTasksProfilingResults.arrays);
application.data.frameTasksProfilingResults.on(application.data.EventType.any,
	(function() { this.update(true); }).bind(application.tools.profilingThreads));
	
application.tools.profilingResults = new ProfilingTimerView();

});
