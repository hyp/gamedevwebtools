/**
 * Ui
 * 
 * This is a singleton responsible for the application's ui.
 */
var ui = null;
function Ui() {
	var opt = localStorage.getItem("ui.options");
	if(opt){
		this.options = JSON.parse(opt);
		this.applyOptions();
	} else 
		this.resetOptions();
	
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
	
	// Keyboard shortcuts.
	this.shortcuts = [
	{key:'esc', name: 'Exit application',action: function(){
		application.quit();
	}},
	{key:'tab',name: 'Console', action: function(){
		application.tools.console.focus();
	}}
	];
	this.updateShortcuts();	
	
	// currentSubTab 
	var currentSubTab = null;
	var currentSubTabButton = null;
	
	// Resets the sub tab button.
	function resetCurrentSubTab(){ 
		if(currentSubTabButton) {
			$(currentSubTabButton).removeClass("active");
			currentSubTabButton = null;
		}
	}
	
	// Current tool.
	var currentTool = null;
	$(window).resize(function(){
		if(currentTool && (typeof currentTool.resize) === "function")
			currentTool.resize();
	});
	function switchToTool (tool) {
		if(currentTool) {
			currentTool.widget.hide();
			if(currentTool.onHide)
				currentTool.onHide();
		}
		if(tool){
			tool.widget.show();
			if(tool.onShow)
				tool.onShow();
		}
		currentTool = tool;
		resetCurrentSubTab();
	}
	
	// Shows the sub tabs.
	function showSubTab(subTab) {
		if(currentSubTab){
			if(currentSubTab == subTab) return;
			$(currentSubTab).slideUp();
		}
		currentSubTab = subTab;
		if(currentSubTab !== null)
			$(currentSubTab).slideDown();
		resetCurrentSubTab();
	}
	// Connects a tab to subtabs.
	function connectTabToSubTabs(tabName) {
		var selfChildren = document.getElementById("tab"+tabName+"Tabs");
		var selfElement = document.getElementById("tab"+tabName);
		var link = selfElement.getElementsByTagName('a')[0];
		$(link).click(function() {
			showSubTab(selfChildren);
		});
		return selfChildren;
	}
	// Connects a tab to a tool
	function connectTabToTool(tabName,tool) {
		var selfElement = document.getElementById("tab"+tabName);
		var link = selfElement.getElementsByTagName('a')[0];
		$(link).click(function() {
			showSubTab(null);
			switchToTool(tool);
		});	
	}
	// Connects a subtab to a tool
	function connectSubTabToTool(tabName,subTabName,tool) {
		var selfElement = document.getElementById("tab"+tabName+"Tab"+
			subTabName);
		$(selfElement).click(function() {
			$(this).addClass("active");
			switchToTool(tool);
			currentSubTabButton = this;
		});
	}
	
	function subTabToHtml(name,subName) {
		return '<li><button id="tab'+name+'Tab'+subName+
			'" class="btn tabButton">'+subName+'</button></li>';
	}
	function tabToHtml(rootName,name) {
		return '<li id="tab'+name+
			'"><a data-toggle="tab">'+name+
			'</a></li><div id="tab'+name+
			'Tabs" class="tabButtonGroup"></div>';
	}
	function getTabByName(self,name) {
		if((typeof name) !== "string") 
			throw new Error("tabName must be a string");
		if(!(name in self.tabMapping))
			throw new Error("the tab doesn't exist");
		return self.tabMapping[name];		
	}
	function pushTab(self,tab) {
		if(!(tab instanceof Tab))
			throw new Error("tab must be a proper tab");
		if(tab.name in self.tabMapping)
			throw new Error("the tab with such name already exists");
		if(self.appendSelector === null)
			self.appendSelector = $(connectTabToSubTabs(self.name));
		self.appendSelector.append(self.template(self.name,tab.name));
		self.tabs.push(tab);
		self.tabMapping[tab.name] = tab;
		return this;
	}
	function findTabIndex(self,tab) {
		for(var i = 0;i < self.tabs.length;++i) {
			if(tab === self.tabs[i]) return i;
		}
		throw new Error("Couldn't find other tab");
	}
	function insertTab(self,tab,otherTab,after) {
		if(!(tab instanceof Tab))
			throw new Error("tab must be a proper tab");
		if(!(otherTab instanceof Tab))
			throw new Error("otherTab must be a proper tab");
		if(tab.name in self.tabMapping)
			throw new Error("the tab with such name already exists");
		if(tab.template === null) 
			selector = $(document.getElementById("tab"+self.name+"Tab"+
				otherTab.name));
		else
			selector = $(document.getElementById("tab"+otherTab.name));
		if(after) 
			selector.after(self.template(self.name,tab.name));
		else
			selector.before(self.template(self.name,tab.name));
		var i = findTabIndex(self,otherTab);
		self.tabs.splice(after? i+1: i,0,tab);
		self.tabMapping[tab.name] = tab;
		return this;
	}
	
	function Tab(name,selector,templateFunction) {
		this.name = name;
		this.tabs = [];
		this.tabMapping = {};
		this.appendSelector = selector;
		this.template = templateFunction;
		this.clickConnected = false;
	}
	var tabs = new Tab("",$("#tabBar"),tabToHtml);
	
	function newTab(name) {
		return new Tab(name,null,subTabToHtml);
	}
	function newSubTab(name) {
		return new Tab(name,null,null);
	}
	
	function TabInterface(tab) {
		this.connectToTool = function(tool) {
			connectTabToTool(tab.name,tool);
		}
	}
	function SubTabInterface(parent,tab) {
		this.connectToTool = function(tool) {
			connectSubTabToTool(parent.name,tab.name,tool);
		}
	}
	
	this.pushNewTab = function(name) {
		var tab = newTab(name);
		pushTab(tabs,tab);
		return new TabInterface(tab);
	}
	this.insertNewTabAfter = function(name,otherName) {
		var tab = newTab(name);
		insertTab(tabs,tab,tabs.tabMapping[otherName],true);
		return new TabInterface(tab);
	}
	this.insertNewTabBefore = function(name,otherName) {
		var tab = newTab(name);
		insertTab(tabs,tab,tabs.tabMapping[otherName],false);
		return new TabInterface(tab);
	}
	
	this.pushNewSubTab = function(parentName,name) {
		if(!(parentName in tabs.tabMapping))
			throw new Error("invalid parent tab");
		var parent = tabs.tabMapping[parentName];
		var tab = newSubTab(name);
		pushTab(tabs.tabMapping[parentName],tab);
		return new SubTabInterface(parent,tab);
	}
	this.insertNewSubTabAfter = function(parentName,name,otherName) {
		if(!(parentName in tabs.tabMapping))
			throw new Error("invalid parent tab");
		var parent = tabs.tabMapping[parentName];
		var tab = newSubTab(name);
		insertTab(parent,tab,parent.tabMapping[otherName],true);
		return new SubTabInterface(parent,tab);
	}
	this.insertNewSubTabBefore = function(parentName,name,otherName) {
		if(!(parentName in tabs.tabMapping))
			throw new Error("invalid parent tab");
		var parent = tabs.tabMapping[parentName];
		var tab = newSubTab(name);
		insertTab(parent,tab,parent.tabMapping[otherName],false);
		return new SubTabInterface(parent,tab);
	}
	/** Creates a new tool panel */
	this.newToolPanel = function(name) {
		$("#toolPanels").append('<div id="panel'+name+
			'" class="viewDiv dontShowAtStart"><h4>'+name+'</h4></div>');
		var element = document.getElementById("panel"+name);
		return {
			widget: $(element)
		}
	}
	

	// Tools
	application.raiseEvent('tools.create');
	this.shaders = new TextInput("shadersView");
	
	// Profiling/Monitoring tab
	connectTabToSubTabs("Monitor");
	connectSubTabToTool("Monitor","Graph",application.tools.frameDt);
	connectSubTabToTool("Monitor","Threads",application.tools.profilingThreads);
	connectSubTabToTool("Monitor","Timers",application.tools.profilingResults);
	connectSubTabToTool("Monitor","Memory",application.tools.memoryUsage);
	
	// Data/Assets tab
	//this.internal.connectSubTabButton($("#tabDataTabShaders"),this.shaders);
	
	// Options tab
	this.optionsView = new OptionsView($("#optionsView"));
	connectTabToTool("Options",this.optionsView);
	
	// Help tab
	this.helpView = { widget: $("#helpView") };
	connectTabToTool("Help",this.helpView);
	
	showSubTab(document.getElementById("tab"+"Monitor"+"Tabs"));	
	
	/*
	 * Rendering loop.
	 * 
	 * Render using requestAnimationCallback because if the game has high
	 * FPS, we wouldn't want to redraw the tools on each frame.
	 */
	(function renderloop(){
		requestAnimationFrame(renderloop);
		if(currentTool && (typeof currentTool.draw) == "function") {
			currentTool.draw();
		}
	})();
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
Ui.prototype.updateShortcuts = function() {
	var doc = $(document);
	doc.unbind('keydown.jkey');
	for(var i = 0;i<this.shortcuts.length;++i) {
		var shortcut = this.shortcuts[i];
		doc.jkey(shortcut.key,shortcut.action);
	}
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


