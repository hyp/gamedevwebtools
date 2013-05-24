application.on('tools.create',function(){

/**
 * Console tool.
 * 
 * Uses:
 *   div with id logoutputView
 */
function ConsoleTool() {
	this.history = [];
	this.historyIndex = 0;	
	
	this.selector = $("#logoutputView");
	this.selector.click(this.focus.bind(this));
	
	this.inputSelector = $("#logoutputView input");
	this.inputSelector.jkey('enter',this.onEnterKey.bind(this));
	this.inputSelector.jkey('up',this.onUpKey.bind(this));
	this.inputSelector.jkey('down',this.onDownKey.bind(this));
	
	this.logSizeBar = 
		new SizeBar($('#logoutputViewSizer'),$('#logoutputView'));
	this.logSizeBar.minHeight = 80;
	this.logSizeBar.onResize = function(width,height) {
		ui.options.consoleHeight = height;
		ui.saveOptions();
	}
	
	this.logHtml = '';
	this.logDepth = 0;
	application.logging.message = this.appendToLogOutput.bind(this);
}
ConsoleTool.prototype.logLevels = [
	"Trace","Debug","Information","Warning",
	"Error","Critical","Fatal"
];
ConsoleTool.prototype.logLevelStyles = [
	"","","label-information","label-warning",
	"label-important","label-important","label-important"
];
ConsoleTool.prototype.lineToHtml = function(source,level,str) {
	return (this.logDepth === 0? 
		'<span>': '<span class="viewLogInnerMessage">')+ 
		'<span class="label '+this.logLevelStyles[level]+
		'">'+
		(source == application.logging.Local? '<i class="icon-wrench"></i> ':'')+
		this.logLevels[level]+'</span><span class="viewLogMessage">'+
		str + '</span></span><br>';
}
ConsoleTool.prototype.appendToLogOutput = function(source,level,str){
	var html = this.lineToHtml(source,level,str);
	if(this.logDepth === 0) {
		$("#logoutputView div").append(html);
		this.showLastLine();
	} else this.logHtml += html;
}
ConsoleTool.prototype.execute = function(value) {
	if((typeof value) !== 'string' || value.length < 1) return;
	
	this.logHtml = '';
	this.logDepth = 1;
	var success = true;
	try{
		eval(value);
	} catch(e) {
		application.error("Couldn't evaluate '"+value+"'");
		success = false;
	}
	this.logDepth = 0;
	if(success)
		this.history.push(value);
	this.historyIndex = 0;
	$("#logoutputView div").append('<span><i class="icon-chevron-right"></i> '+
		value+'</span><br>');
	if(this.logHtml.length > 0)
		$("#logoutputView div").append(this.logHtml);
	
	this.showLastLine();
}
ConsoleTool.prototype.focus = function() {
	this.inputSelector.focus();
}
ConsoleTool.prototype.onFocus = function(handler) {
	this.inputSelector.focus(handler);
}
ConsoleTool.prototype.showLastLine = function() {
	this.selector.scrollTop(this.selector[0].scrollHeight);
}
ConsoleTool.prototype.onEnterKey = function() {
	this.execute(this.inputSelector.val());
	this.inputSelector.val('');		
}
ConsoleTool.prototype.onUpKey = function() {
	if(this.historyIndex < this.history.length) {
		this.historyIndex++;
		this.inputSelector.val(
			this.history[this.history.length - this.historyIndex]);
	}
}
ConsoleTool.prototype.onDownKey = function() {
	if(this.historyIndex > 0) {
		this.historyIndex--;
		var text = this.historyIndex === 0?
			'' : this.history[this.history.length - this.historyIndex];
		
		this.inputSelector.val(text);
	}
}

application.tools.console = new ConsoleTool();

});
