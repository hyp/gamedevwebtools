/**
 * Delta time graph - 
 * plots raw and filtered(if present) dt for last N frames.
 * 
 * Uses:
 * 	 tab with id profilingTimeGraphView.
 */
function FrameDtView() {
	FrameDtView.superclass.constructor.call(this,
	'profilingTimeGraphView',
	[frameData.arrays.dt, frameData.arrays.rawDt],
	{
		labels:[["Frame start (s): ","DT (ms): "],
				["Frame start (s): ","Raw(unfiltered) DT (ms): "]]
	});
	// Plot 0 to 60 ms.
	this.setYValueLimits(0,60);
}
core.extend(FrameDtView,GraphView);

/**
 * Memory usage graph -
 * plots the memory usage for individual subsystems throughout the
 * life of the application.
 * 
 * Uses:
 *   tab with id memoryUsageGraphView.
 */
function MemoryUsageView() {
	MemoryUsageView.superclass.constructor.call(this,
	'memoryUsageGraphView',
	data.memoryUsage.arrays,
	{
		labels: [["Time (s): ","Memory (MiB): "]]
	});
	this.setYValueLimits(0,1);
	this.pointInformation = function(index,point) {
		return data.memoryUsage.getAllocator(index);
	}
}
core.extend(MemoryUsageView,GraphView);
MemoryUsageView.prototype.update = function() {
	// SetYLimits.
	if(data.memoryUsage.max < 1)
		this.setYValueLimits(0,1);
	else 
		this.setYValueLimits(0,data.memoryUsage.max + 1);
	MemoryUsageView.superclass.update.call(this);
}

/**
 * A table consisting of profiling times.
 * TODO:
 *   a bit of refactoring.
 */
function ProfilingTimerView() {
	this.widget = $("#profilingResultsView");
	this.tableBody =  $("#profilingResultsView table tbody");
	this.appHandler =
		application.handlers["profiling.result"];
	var self = this;
	application.handlers["profiling.result"] = function(val){
		self.appHandler(val);
		self.tableBody.append('<tr><td>'+
		val.name+'</td><td>'+val.samples+
		'<td>'+(val.mean*1000.0).toFixed(3)+' ms</td>'+
		'<td>'+(val.median*1000.0).toFixed(3)+' ms</td>'+
		'<td>'+(val.stddev*1000.0).toFixed(3)+' ms</td>'+
		'<td>'+(val.total*1000.0).toFixed(3)+' ms</td>'+
		'</td></tr>');
	};
};
