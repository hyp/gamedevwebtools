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
	
	function parseVersion(vstring) {
		var digits = vstring.split(".");
		var numbers = [0,0,0];
		if(digits.length > 3){
			throw new Error("The package version is invalid");
		}
		for(var i = 0;i<digits.length;++i) {
			if(!digits[i].length) 
				throw new Error("The package version is invalid");
			for(var j = 0;j<digits[i].length;++j) {
				var c = digits[i].charCodeAt(j);
				if(c >= "0".charCodeAt(0) &&
				   c <= "9".charCodeAt(0)){
					continue;
				} else {
					throw new Error("The package version is invalid");
				}
			}
			numbers[i] = parseInt(digits[i],10);
		}
		return numbers;
	};
	
	function versionLessThan(a,b) {
		var major  = a[0] < b[0];
		var minor = a[1] < b[1];
		return major || (major && minor) || (major && minor && a[2] < b[2]);
	}
	
	this.internal = {
		packages: {},

		readzip: function(reader) {
			this.reader = reader;
			reader.getEntries(readZipFs.bind(this));		
		},
		
		// Creates a new package.
		newPackage: (function(package) {
			this.internal.verify(package);
			package.jsSources = "";
			package.cssSources = "";
			package.enabled = true;
			if(package.name in this.internal.packages) {
				var oldPackage = this.internal.packages[package.name];
				var hasVersion = "version" in package;		
				var oldHasVersion = "version" in oldPackage;
				if((hasVersion && !oldHasVersion) || 
					(hasVersion && oldHasVersion && 
					versionLessThan(oldPackage.version,package.version)) ){
					//Update.
					application.log("The package '"+package.name+
						"' is being updated from version '"+
						(oldHasVersion? oldPackage.version:'')+"' to '"+
						package.version+"'");
				} else
					throw new Error("The package '"+package.name+
					"' is already installed!");
			}
			this.internal.packages[package.name] = package;
		}).bind(this),
		
		// Verifies the package.
		verify: function(package) {
			function error(msg) {
				throw new Error(msg);
			}
			if((typeof package.name) !== "string") {
				error("The name of the package is missing");
			}
			for (var key in package) {
				var value = package[key];
				switch(key) {
				case "name": break;
				case "description":
					if((typeof value) !== "string")
						error("The description of the package must be a string");
					break;
				case "version":
					if((typeof value) !== "string")
						error("The version of the package must be a string");
					parseVersion(value);
					break;
				case "files":
					if(!Array.isArray(value)) {
						error("The files of the package must be an array");
					}
					break;
				case "dependencies":
					if(!Array.isArray(value)) {
						error("The dependencies of the package must be an array");
					}
					break;
				default:
					logging.message(logging.Local,logging.Warning,
						"Unknown package field '" + key + 
						"' - it will be ignored!");
					break;
				}
			}
		},
		
		extensions: {
			"js":  loadJS, 
			"css": loadCSS
		},
		
		// Executes the package.
		run: function(package) {
			if(!package.enabled) return true;
			var success = true;
			try {
				// See: http://stackoverflow.com/questions/707565/how-do-you-add-css-with-javascript
				function insertCss(code) {
					var style = document.createElement('style');
					style.type = 'text/css';

					if (style.styleSheet) {
						// IE
						style.styleSheet.cssText = code;
					} else {
						// Other browsers
						style.innerHTML = code;
					}
					document.getElementsByTagName("head")[0].appendChild(style);
				}
				
				if(package.cssSources.length)
					insertCss(package.cssSources);
				f = new Function(package.jsSources);
				f();
			} catch(e) {
				success = false;
				application.error(
					"Couldn't start the package '"+package.name+"' - " + e.message);
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
 */
ApplicationPackageManager.prototype.connectExtension = function(ext,loader) {
	if((typeof ext) !== "string") 
		throw new Error("extension must be a string");
	if((typeof loader) !== "function") 
		throw new Error("loader must be a function");
	if(ext in this.internal.extensions)
		throw new Error("The extension '"+ext+"' is already connected by another loader");
	
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
