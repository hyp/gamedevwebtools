/**
 * Ui
 * 
 * This is a singleton responsible for the application's ui.
 */
var ui = null;
function Ui() {
	this.currentTool = null;
	this.currentSubTab = null;
	this.currentSubTabName = "";
	
	var opt = localStorage.getItem("ui.options");
	if(opt){
		this.options = JSON.parse(opt);
		this.applyOptions();
	} else 
		this.resetOptions();
	
	$(window).resize(function(){
		if(ui.currentTool && (typeof ui.currentTool.resize) === "function")
			ui.currentTool.resize();
	});
	
	// Application bar
	$(".applicationBar form").submit(function(){
		return false;
	});
	function connect() {
		application.connect($("#serverAddressInput").val());		
	}
	$("#serverAddressInput").val(application.options.autoConnectServer);
	$("#applicationNotConnectedControls button").click(connect);
	$("#serverAddressInput").jkey('enter',connect);
	
	application.on('change', function() {
		$("#appTitle b").text(application.information.name);
	});
	application.on('connected',function() {
		$("#applicationNotConnectedControls").hide();
		$("#applicationConnectedControls").show();	
	});
	application.on('disconnected',function() {
		$("#applicationConnectedControls").hide();
		$("#applicationNotConnectedControls").show();
	});
	application.on('activate',function() {
		if(application.active){
			$("#appActivateIcon").removeClass('icon-pause').addClass('icon-play');
			$("#appStepButton").show();
		} else {
			$("#appActivateIcon").removeClass('icon-play').addClass('icon-pause');
			$("#appStepButton").hide();		
		}
	});
	$("#appStepButton").click(function() {
		application.step();
	});
	
	
	// Utils
	this.utils = {
		resetPushButton: function(selector) {
			selector.removeClass("active");
		}
	};
	
	this.internal = {
		subTabCurrentButton: null,
		
		subTabCurrentButtonReset: (function() {
			if(this.internal.subTabCurrentButton !== null) {
				this.internal.subTabCurrentButton.removeClass("active");
				this.internal.subTabCurrentButton = null;
			}
		}).bind(this),
		
		connectSubTabButton: (function(selector,tool) {
			selector.click(function() {
				selector.addClass("active");
				ui.switchToTool(tool);
				ui.internal.subTabCurrentButton = selector;
			});
		})
	}
	
	// Keyboard shortcuts.
	this.shortcuts = [
	{key:'esc', name: 'Exit application',action: function(){
		application.quit();
	}},
	{key:'tab',name: 'Console', action: function(){
		ui.consoleTool.focus();
	}}
	];
	this.updateShortcuts();
	
	// Tools
	this.consoleTool = new ConsoleTool();
	this.keyboardButtonTool = new KeyboardButtonTool();
	this.consoleTool.onFocus(this.keyboardButtonTool.reset.bind(
		this.keyboardButtonTool));
	this.fpsCounterTool = new FpsCounterTool();
	application.data.frameDt.on(application.data.EventType.push,
		function(item) {
			ui.memoryUsage.setXValueMax(item[0]);
			ui.fpsCounterTool.onFrame({dt: item[1]/1000.0}); 
		}
	);
	
	this.frameDt = new FrameDtView();
	this.profilingResults = new ProfilingTimerView();
	this.profilingThreads =
		new ProfilingThreadView(application.data.frameTasksProfilingResults.arrays);
	application.data.frameTasksProfilingResults.on(application.data.EventType.any,
		(function() { this.update(true); }).bind(this.profilingThreads));
		
	this.memoryUsage = new MemoryUsageView();
	this.shaders = new TextInput("shadersView");
	
	// Profiling/Monitoring tab
	$("#tabProfiling a").click(function(){
		ui.showSubTab('tabProfiling');
	});
	this.internal.connectSubTabButton($("#tabProfilingTabGraph"),this.frameDt);
	this.internal.connectSubTabButton($("#tabProfilingTabThreads"),this.profilingThreads);
	this.internal.connectSubTabButton($("#tabProfilingTabTimers"),this.profilingResults);
	this.internal.connectSubTabButton($("#tabMonitorTabMemory"),this.memoryUsage);
	
	// Data/Assets tab
	$("#tabData a").click(function(){
		ui.showSubTab('tabData');
	});
	this.internal.connectSubTabButton($("#tabDataTabShaders"),this.shaders);
	
	// Options tab
	$("#tabOptions a").click(function(){
		ui.showSubTab('tabOptions');
		ui.switchToTool(ui.optionsView);
	});
	this.optionsView = new OptionsView($("#optionsView"));
	
	// Help tab
	$("#tabHelp a").click(function() {
		ui.showSubTab('tabHelp');
		ui.switchToTool(ui.helpView);
	});
	this.helpView = { widget: $("#helpView") };
	
	this.showSubTab('tabProfiling');
	
	/*
	 * Rendering loop.
	 * 
	 * Render using requestAnimationCallback because if the game has high
	 * FPS, we wouldn't want to redraw the tools on each frame.
	 */
	var self = this;
	(function renderloop(){
		requestAnimationFrame(renderloop);
		self.draw();
	})();
}
Ui.prototype.handle = function(msg,callback) {
	throw new Error("deprecated handle");
}
Ui.prototype.resetOptions = function() {
	this.options = { consoleHeight: 140 };
	this.applyOptions();
	this.saveOptions();
}
Ui.prototype.applyOptions = function() {
	if(this.options.consoleHeight > 0) {
		$("#logoutputView").height(this.options.consoleHeight);
	}
}
Ui.prototype.saveOptions = function() {
	localStorage.setItem("ui.options",JSON.stringify(this.options));
}
Ui.prototype.draw = function() {
	if(this.currentTool && (typeof this.currentTool.draw) == "function") {
		this.currentTool.draw();
	}
}
Ui.prototype.updateShortcuts = function() {
	var doc = $(document);
	doc.unbind('keydown.jkey');
	for(var i = 0;i<this.shortcuts.length;++i) {
		var shortcut = this.shortcuts[i];
		doc.jkey(shortcut.key,shortcut.action);
	}
}
Ui.prototype.showSubTab = function(subTab){
	if(this.currentSubTab){
		if(this.currentSubTabName == subTab) return;
		currentSubTabStr = subTab;
		this.currentSubTab.slideUp();
	}
	this.currentSubTabName = subTab;
	this.currentSubTab = $('#'+subTab+'Tabs');
	if(this.currentSubTab)
		this.currentSubTab.slideDown();
	this.internal.subTabCurrentButtonReset();
}
Ui.prototype.switchToTool = function(tool) {
	if(this.currentTool) {
		this.currentTool.widget.hide();
		if(this.currentTool.onHide)
			this.currentTool.onHide();
	}
	if(tool){
		tool.widget.show();
		if(tool.onShow)
			tool.onShow();
	}
	this.currentTool = tool;
	this.internal.subTabCurrentButtonReset();
}

/**
 * OptionsView.
 */
function OptionsView(widget) {
	this.widget = widget;
	
	
	this.checkbox($("#optionsAutoconnect"),application,
		application.options,"autoConnect");
	this.checkbox($("#optionsProbe"),application,
		application.options,"probeForRunningApplications");
		
	$("#optionsUiReset").click(function(){ ui.resetOptions(); });
	
	// extensions
	application.on('packages',function() {
		var destination = $("#optionsExtensions");
		var html = "";
		application.packages.forEach(function(package) {
			html += '<li><h5>'+package.name+' '+
				("version" in package? package.version : '')+
				'</h5><div><span>'+
				((typeof package.description) === "string"?
					package.description : "no description")+
				'</span><div class="pull-right"><button class="btn" onClick="application.packages.unistall(\''+
				package.name+
				'\')">Remove</button></div></div></li>';	
		});
		destination.html(html);
	});
	$("#optionsExtensionsNew").click(function() {
		$("#optionsExtensionNewFile").val('');
		$("#optionsExtensionNewFile").click();
	});
	$("#optionsExtensionNewFile").change(function(event) {
		var files = event.target.files;
		application.packages.installFile(files[0]);
	});
	$("#optionsExtensionsNewUrl").click(function() {
		$("#optionsExtensionsSearchBar").hide();
		$("#optionsExtensionsUrlBar").show();
	});
	$("#optionsExtensionsUrlBack").click(function() {
		$("#optionsExtensionsUrlBar").hide();
		$("#optionsExtensionsSearchBar").show();		
	});
	this.loadingNotSupported = false;
	$("#optionsExtensionsUrlGet").click((function() {
		if(this.loadingNotSupported)
			window.open($("#optionsExtensionsUrl").val(),'_blank');
		else 
			application.packages.installUrl(
				$("#optionsExtensionsUrl").val());		
	}).bind(this));
	if(window.location.protocol === "file:"){
		$("#optionsExtensionsUrlWarn").show();
		this.loadingNotSupported = true;
	}
}
OptionsView.prototype.checkbox = function(sel,control,map,key) {
	sel.prop('checked',map[key] === true);
	sel.change(function() {
		map[key] = sel.is(':checked');
		control.saveOptions();
	});
}
OptionsView.prototype.onShow = function() {
	if(false){
		/** Disabled shortcut editor */
		var shortcuts = ui.shortcuts;
		var str = "";
		for(var i = 0;i<shortcuts.length;++i) {
			var shortcut = shortcuts[i];
			str += '<dt>'+shortcut.name+
				'</dt><dd><input id="shortcut'+i
				+'" type="text" value="'+shortcut.key+'">'+
				"</input></dd>";
		}
		$("#optionsViewShortcuts").html(str);
		for(var i = 0;i<shortcuts.length;++i) {
			$("#shortcut" + i).change(function(){
				console.log('modified');
				return false;
			});
		}
	}	
}


function TextInput(widget) {
	this.widget = $("#"+widget);
	this.textarea = $("#"+widget+" div textarea");
}
TextInput.prototype.onShow = function() {
	this.resize();
}
TextInput.prototype.resize = function() {
}


