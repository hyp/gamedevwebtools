/**
 * Handles data.
 */
function ApplicationData() {
	var data = this;
	
	/**
	 * An event type which a collection can emit.
	 */
	this.EventType = {
		/**
		 * Push event - a new item is added to the collection.
		 * Not all collections can emit this event.
		 */
		push: 0,
		
		/**
		 * Change event - the data in the collection changes.
		 * All collections support this event.
		 */
		change: 1,
		
		/**
		 * Any event - either push or a change event.
		 */
		any: 2
	};
	
	/**
	 * The type of data which collection stores.
	 */
	this.Type = {
		/**
		 * Ordinary data
		 */
		ordinary: 0,
		
		/**
		 * Per frame data - the data in this collection updates each frame.
		 */
		eachFrame: 1
	};
	
	function bindChangeCallback(changeCallbacks,event,callback) {
		if((typeof callback) !== "function")
			throw new Error("A function callback is expected");
		if((typeof event) !== "number" || (event < 0 || event > 2))
			throw new Error("The event must be a valid event type");
		switch(event) {
		case 0: //push
			throw new Error("push callback isn't supported by this collection");
			break;
		case 1: //change
		case 2: //any
			changeCallbacks.push(callback); break;
		}
	}
	function bindPushChangeCallback(pushCallbacks,changeCallbacks,
		event,callback)
	{
		if((typeof callback) !== "function")
			throw new Error("A function callback is expected");
		if((typeof event) !== "number" || (event < 0 || event > 2))
			throw new Error("The event must be a valid event type");
		switch(event) {
		case 0: //push
			pushCallbacks.push(callback); break;
		case 1: //change
			changeCallbacks.push(callback); break;
		case 2: //any
			pushCallbacks.push(callback); 
			changeCallbacks.push(callback);
			break;
		}		
	}
		
		
	/**
	 * Management policies dictate how long data is stored, etc.
	 */
	this.managementPolicies = {
		/**
		 * This number describes the amount of frames for which to store
		 * the per frame data.
		 */
		frameDataLimit: 200,
	};
	
	/**
	 * An array collection.
	 * 
	 * dataType - 
	 * 	application.data.Type.ordinary or 
	 * 	application.data.Type.eachFrame
	 */
	this.ArrayCollection = function(dataType) {
		//dataType = core.checkEnumValue(dataType,
		dataType = dataType || 0;
		
		var pushCallbacks = [];
		var changeCallbacks = [];
		
		this.array = [];
		var self = this;
		
		/**
		 * Binds a listener to a change event.
		 */
		this.on = function(event,callback) {
			bindPushChangeCallback(pushCallbacks,changeCallbacks,event,
				callback);
		}
		
		/**
		 * Pushes an item to an array.
		 */
		if(dataType == 0) { //ordinary
			this.push = function(item) {
				self.array.push(item);
				for(var i = 0;i<pushCallbacks.length;++i)
					pushCallbacks[i](item);
			}
		} else { //perframe.
			this.push = function(item) {
				var limit = application.data.managementPolicies.frameDataLimit;
				
				if(self.array.length < limit){
					self.array.push(item);
				} else {
					self.array.splice(0,1);
					self.array[limit - 1] = item;
				}
				for(var i = 0;i<pushCallbacks.length;++i)
					pushCallbacks[i](item);
			}
		}
		
		/**
		 * Clears an array.
		 */
		this.clear = function() {
			self.array.length = 0;
			for(var i = 0;i<changeCallbacks.length;++i)
				changeCallbacks[i](self.array);			
		}
		
		// Automatic reset.
		application.on('data.reset',(function() {
			this.clear();
		}).bind(this));
	}
	
	/**
	 * A specialized version of an array collection.
	 * It manages the data based on the frame data management policy,
	 * stores an array of arrays representing frames and the frame arrays,
	 * and accepts multiple items in one frame based on a given frameId.
	 */
	this.ArrayEachFrameMultiCollection = function() {
		var pushCallbacks = [];
		var changeCallbacks = [];
		
		this.arrays = [[]];
		var self = this;
		var lastFrameId = 0;
		var lastFrameOffset = 0;
		
		/**
		 * Binds a listener to a change event.
		 */
		this.on = function(event,callback) {
			bindPushChangeCallback(pushCallbacks,changeCallbacks,event,
				callback);
		}
		
		/**
		 * Pushes an item to an array.
		 */
		this.push = function(frameId,item) {
			var limit = application.data.managementPolicies.frameDataLimit;
			
			if(frameId > lastFrameId) {
				++lastFrameOffset;
				if(lastFrameOffset >= limit) {
					lastFrameOffset = limit - 1;
					self.arrays.splice(0,1);
					self.arrays[lastFrameOffset] = [];
				}
				else if(lastFrameOffset >= self.arrays.length) {
					self.arrays.push([]); 
				}
				lastFrameId = frameId;
			}
			self.arrays[lastFrameOffset].push(item);
			for(var i = 0;i<pushCallbacks.length;++i)
				pushCallbacks[i](item);
		}
		
		/**
		 * Clears an array.
		 */
		this.clear = function() {
			self.arrays.length = 1;
			self.arrays[0] = [];
			
			lastFrameId = 0;
			lastFrameOffset = 0;
			for(var i = 0;i<changeCallbacks.length;++i)
				changeCallbacks[i](self.arrays);
		}
		
		// Automatic reset.
		application.on('data.reset',(function() {
			this.clear();
		}).bind(this));		
	}

	/**
	 * A collection of memory allocation/deallocation events.
	 */
	this.MemoryUsageCollection = function() {
		this.arrays = [];
		this.allocators = {};
		this.max = 0;
		var self = this;
		
		var changeCallbacks = [];
		
		this.push =	function (name,time,amount) {
			if(!(name in self.allocators)){
				self.allocators[name] = self.arrays.length;
				self.arrays.push([]);
			}
			if(amount > self.max)
				self.max = amount;
			self.arrays[self.allocators[name]].push([time,amount]);
			for(var i = 0;i<changeCallbacks.length;++i)
				changeCallbacks[i](self.array);		
		}
		this.on = function(event,callback) {
			bindChangeCallback(changeCallbacks,event,callback);
		}
		this.clear = function() {
			self.arrays.length = 0;
			self.allocators = {};
			self.max = 0;
			for(var i = 0;i<changeCallbacks.length;++i)
				changeCallbacks[i](self.array);		
		}
		
		// Automatic reset.
		application.on('data.reset',(function() {
			this.clear();
		}).bind(this));
	}
	this.MemoryUsageCollection.prototype.getAllocator = function(index) {
		var self = this.allocators;
		for (var key in self) {
			if (self.hasOwnProperty(key)) {
				if(self[key] === index) return key;
			}
		}
		return null;
	}
	
	/// frame dt
	this.frameDt = new this.ArrayCollection(this.Type.eachFrame);
	/// frame raw(unfiltered) dt
	this.frameRawDt = new this.ArrayCollection(this.Type.eachFrame);
	/// profiling results
	this.profilingResults = new this.ArrayCollection;
	/// memory usage
	this.memoryUsage = new this.MemoryUsageCollection;
	/// task profiling results.
	this.frameTasksProfilingResults = 
		new this.ArrayEachFrameMultiCollection;
	
	function utf8toString (bytes) {
		var str = "";
		var offset = 0;
		for(var end = bytes.length;offset<end;++offset) {
			str += String.fromCharCode(bytes[offset]);
		}
		return str;
	}
	
	/**
	 * Resets the data.
	 */
	this.reset = function() {
		application.raiseEvent('data.reset');
	}
	
	// Message handlers.
	application.handle("profiling.result", function(val){
		data.profilingResults.push(val);
	});
	application.handle("profiling.task", function(val){
		data.frameTasksProfilingResults.push(val.frame,val);
	});
	application.handle("monitoring.memory", function(val) {
		// Convert B to MiB
		data.memoryUsage.push(val.name,val.t,val.size/(1024*1024));
	});
	application.handle("monitoring.frame", function(val){
		// Convert s to ms.
		data.frameDt.push([val.t,val.dt*1000.0]);
		if((typeof val.rawDt) === "number")
			data.frameRawDt.push([val.t,val.rawDt*1000.0]);
	});
}
