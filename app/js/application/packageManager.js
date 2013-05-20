/**
 * ApplicationPackageManager is responsible for extension packages.
 * 
 * TODO: dependencies.
 */
function ApplicationPackageManager() {
	
	/**
	 * Zip FS reader.
	 */
	function readZipFs(entries) {
		function onError(name,error) {
			application.error("Failed to install a package '"+
				name+"' - "+error);
		}
		
		var descriptorIndex = -1;
		var components;
		for(var i = 0;i<entries.length;++i){
			if(entries[i].directory) continue;
			components = entries[i].filename.split('/');
			if(components.length && 
				components[components.length-1] === "package.json") {
				descriptorIndex = i;
				components.pop();
				break;
			}
		}
		if(descriptorIndex === -1) {
			onError(this.name," This is an invalid extension package ('package.json' is missing)!");
			this.reader.close();
			return;
		}
		this.components = components;
		this.entries = entries;
		
		function loadFile(text) {
			this.loader(this.package,text);
			if(this.last){
				this.self.components = null;
				this.self.entries = null;
				this.self.reader.close();	
				this.self.packageManager.internal.run(this.package);
				this.self.packageManager.internal.save();
			}
		}
		function getExtension(fname) {
			return fname.substr((~-fname.lastIndexOf(".") >>> 0) + 2);
		}
		
		entries[descriptorIndex].getData(new zip.TextWriter(),(function(text){
			try {
				var extension = JSON.parse(text);
				this.packageManager.internal.newPackage(extension);
			} catch(error) {
				onError(this.name,error.message);
				this.reader.close();
				return;
			}
			
			if(!extension.files || !extension.files.length) {
				logging.message(logging.Local,logging.Warning,
					"The package '"+this.name+"' has no files.");
				this.reader.close();
				return;	
			}
			
			// Find the files.
			var root = this.components.join("/");
			var files = [];
			for(var i = 0;i<extension.files.length;++i){
				var filename = extension.files[i];
				for(var j = 0;j<this.entries.length;++j){
					if(this.entries[j].directory) continue;
					if(this.entries[j].filename === root+"/"+filename) {
						var ext = this.packageManager.internal.extensions[
							getExtension(filename)];
						if(ext === undefined || ext === null) {
							application.error("Unrecognized file "+filename);
						} else files.push([j,ext]);
						break;
					}
				}
			}
			
			// Load the files
			if(!files.length) {
				this.reader.close();
				return;
			}
			
			for(var i = 0;i<files.length;++i) {
				this.entries[files[i][0]].getData(new zip.TextWriter(),
					loadFile.bind({
						package: extension,
						self: this,
						loader: files[i][1],
						last: i === (files.length-1)
					}));
			}			
		}).bind(this));
	}
	
	function loadJS(package,text) {
		package.jsSources += "\n";
		package.jsSources += text;
	}
	function loadCSS(package,text) {
		package.cssSources += "\n";
		package.cssSources += text;
	}
	
	this.internal = {
		packages: {},

		readzip: function(reader) {
			this.reader = reader;
			reader.getEntries(readZipFs.bind(this));		
		},
		
		// Creates a new package.
		newPackage: (function(package) {
			package.jsSources = "";
			package.cssSources = "";
			this.internal.verify(package);
			if(package.name in this.internal.packages) {
				throw new Error("The package '"+package.name+
					"' is already installed!");
			}
			this.internal.packages[package.name] = package;
		}).bind(this),
		
		// Verifies the package.
		verify: (function(package) {
			var error = null;
			if((typeof package.name) !== "string"){
				error = "The name of the package is missing";
			}
			if((typeof package.files) !== "undefined" &&
			   (typeof package.files) !== "object") {
				error = "The files of the package must be an array";
			}
			if(error) 
				throw new Error(error);
		}).bind(this),
		
		extensions: {
			"js":  loadJS, 
			"css": loadCSS
		},
		
		// Executes the package.
		run: function(package) {
			var success = true;
			try {
				eval(package.jsSources);
			} catch(e) {
				success = false;
				application.error(
					"Couldn't start the package '"+package.name+"' - " + e);
			}
			if(success) {
				application.log("Loaded the package '"+package.name+"'");
			}
			return success;
		},
		
		// Saves the packages.
		save: (function() {
			localStorage.setItem("application.packages",
				JSON.stringify(this.internal.packages));
			application.raiseEvent('packages');
		}).bind(this),
		
		// Loads and runs the packages.
		load: (function() {
			var data = localStorage.getItem("application.packages");
			if(!data) return;
			var packages = JSON.parse(data);
			this.internal.packages = packages;
			for (var package in packages) {
				if (packages.hasOwnProperty(package)) {
					this.internal.run(packages[package]);
				}
			}
			application.raiseEvent('packages');
		}).bind(this)
	}
}
/**
 * Enables you to provide custom loaders for files inside extension packages.
 * TODO: error
 */
ApplicationPackageManager.prototype.registerFileExtension = function(ext,loader) {
	if((typeof ext) !== "string") return;
	if((typeof loader) !== "function") return;
	if(ext in this.internal.extensions) return;
	
	this.internal.extensions[ext] = loader;
}
/**
 * Unistalls a package.
 */
ApplicationPackageManager.prototype.unistall = function(packageName) {
	var package = this.internal.packages[packageName];
	if(package) {
		delete this.internal.packages[packageName];
		this.internal.save();
		application.log(
			"The package '"+package.name+"' was unistalled. Please reload the page.");
	}
}
/**
 * Installs an extension package from a file.
 */
ApplicationPackageManager.prototype.installFile = function(file) {
	zip.useWebWorkers = false;
	zip.createReader(new zip.BlobReader(file), 
	(this.internal.readzip).bind({ 
		name: file.name,
		packageManager: this,
		reader: null,
		entries: null,
		components: null,
	}), 
	function(error) {
		application.error('application.packageManager - zip error: '+error);
	});
}
/**
 * Downloads and installs an extension package from a url.
 */
ApplicationPackageManager.prototype.installUrl = function(url) {
	function onError(error) {
		application.error("Failed to load a package from '"+url+"' - "+
			error);
	}
	
	try {
		zip.useWebWorkers = false;;
		zip.createReader(new zip.HttpReader(url), 
		(this.internal.readzip).bind({ 
			name: url,
			packageManager: this,
			reader: null,
			entries: null,
			components: null,
		}), 
		onError);
	} catch(exception) {
		onError(exception.message);
	}
}
/**
 * Iterates over each installed package.
 */
ApplicationPackageManager.prototype.foreachPackage = function(f) {
	for (var package in this.internal.packages) {
		if (this.internal.packages.hasOwnProperty(package)) {
			f(this.internal.packages[package]);
		}
	}
}
