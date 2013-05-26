/**
 * ApplicationPackageManager is a singleton 
 * responsible for extension packages.
 * 
 * TODO: dependency fetching.
 */
function ApplicationPackageManager() {
	
	var packages = {};
	var packageExports = {};
	
	function loadJS(package,text) {
		package.jsSources += "\n";
		package.jsSources += text;
	}
	function loadCSS(package,text) {
		package.cssSources += "\n";
		package.cssSources += text;
	}
	
	var extensionHandlers = {
		"js": loadJS,
		"css": loadCSS
	};
	
	/// Parses the package version string.
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
	}
	
	/// Returns true if the package version a is less than the package version b
	function versionLessThan(a,b) {
		var major  = a[0] < b[0];
		var minor = a[1] < b[1];
		return major || (major && minor) || (major && minor && a[2] < b[2]);
	}
	
	/// Returns true if the package version a is less than or equals to the package version b
	function versionLessEqualsThan(a,b) {
		var major  = a[0] <= b[0];
		var minor = a[1] <= b[1];
		return major || (major && minor) || (major && minor && a[2] <= b[2]);
	}
	
	/// Verifies the package.
	function verify(package) {
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
				for(var i = 0;i < value.length;++i) {
					if((typeof value[i]) !== "string")
						error("The files of the package must be an array of strings");
				}
				break;
			case "dependencies":
				if((typeof value) !== "object") {
					error("The dependencies of the package must be an object");
				}
				for (var key in value) {
					if((typeof value[key]) !== "string")
						error("The dependency version for '"+key+
							"' must be a string");
				}
				break;
			default:
				application.warning("Unknown package field '" + key + 
					"' - it will be ignored!");
				break;
			}
		}
	}
	
	/// Deletes a package.
	function deletePackage(packageName) {
		delete packages[packageName];
		if(packageName in packageExports) 
			delete packageExports[packageName];
	}
	
	/// Creates a new package
	function newPackage(package) {
		verify(package);
		package.jsSources = "";
		package.cssSources = "";
		package.enabled = true;
		if(package.name in packages) {
			var oldPackage = packages[package.name];
			var hasVersion = "version" in package;		
			var oldHasVersion = "version" in oldPackage;
			if((hasVersion && !oldHasVersion) || 
				(hasVersion && oldHasVersion && 
				versionLessThan(oldPackage.version,package.version)) ){
				//Update.
				deletePackage(package.name);
				application.log("The package '"+package.name+
					"' is being updated from version '"+
					(oldHasVersion? oldPackage.version:'')+"' to '"+
					package.version+"'");
			} else
				throw new Error("The package '"+package.name+
				"' is already installed!");
		}
		packages[package.name] = package;		
	}
	
	/// This is called when the package is executed to export it's stuff.
	function provide(packageName,stuff) {
		if(packageName in packageExports) {
			throw new Error(
				"Can't call 'export' more than once from the same package");
		}
		packageExports[packageName] = stuff;
	}
	
	/// Checks if a package with a given version is intalled
	function isInstalled(packageName,packageVersion) {
		if(!(packageName in packages)) return false;
		var hasVersion = "version" in packages[packageName];
		var acceptAnyVersion = packageVersion == "" || packageVersion == "*";
		if(acceptAnyVersion) return true;
		if(!hasVersion) return false;
		
		var acceptedVersion = parseVersion(packageVersion);
		var version = parseVersion(packages[packageName].version);
		return versionLessEqualsThan(acceptedVersion,version);
	}
	
	/// Checks if a packages with a given name is already running
	function isStarted(packageName) {
		if(!(packageName in packageExports)) return false;
		return true;
	}
	
	/// Checks package dependencies
	function checkDependencies(package, response) {
		if(!("dependencies" in package)) return;
		for (var key in package.dependencies) {
			var depVersion = package.dependencies[key];
			if(!isInstalled(key,depVersion) || !isStarted(key)) {
				response(key,depVersion);
			}
		}
	}
	
	/// Executes the package.
	function runPackage(package) {
		if(!package.enabled) return true;
		var success = true;
		checkDependencies(package, function(name, version) {
			application.error(
				"Couldn't start the package '"+package.name+
				"' - the dependency '"+name+"' "+version+
				" isn't installed"); 
			success = false;
		});
		if(!success) return;
		
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
			var result = f();
			if((typeof result) == "object")
				provide(package.name,result);
			else provide(package.name,{});
		} catch(e) {
			success = false;
			application.error(
				"Couldn't start the package '"+package.name+"' - " + e.message);
		}
		if(success) {
			application.log("Loaded the package '"+package.name+"'");
		}
		return success;
	}
	
	/// Saves all the packages and generates update event.
	function savePackages() {
		localStorage.setItem("application.packages",
			JSON.stringify(packages));
		application.raiseEvent('packages');		
	}
	
	/// Loads the packages and executes them.
	function loadPackages() {
		var data = localStorage.getItem("application.packages");
		if(!data) return;
		packages = JSON.parse(data);
		for (var package in packages) {
			if (packages.hasOwnProperty(package)) {
				runPackage(packages[package]);
			}
		}
		application.raiseEvent('packages');		
	}
	// load packages at startup.
	application.on('init',loadPackages);
	
	/// Reports an installation error.
	function installationError(name,error) {
		application.error("Failed to install a package '"+
			name+"' - "+error);		
	}
	
	/// Returns a file extension
	function getExtension(fname) {
		return fname.substr((~-fname.lastIndexOf(".") >>> 0) + 2);
	}
	
	function filenameToHandler(filename) {
		var ext = getExtension(filename);
		if(ext in extensionHandlers) {
			return extensionHandlers[ext];
		} else 
			throw new Error("The package manager can't load the file '"
			+filename+"' - the filetype isn't recognized");
	}
	
	/// Loads an extension file, be it source code or other stuff.
	function loadFile(text) {
		this.loader(this.package,text);
		if(this.last){
			this.self.components = null;
			this.self.entries = null;
			this.self.reader.close();	
			runPackage(this.package);
			savePackages();
		}
	}
	
	/// Installs and loads the other files after loading 'package.json'
	function loadPackageDotJSON(text) {
		try {
			var extension = JSON.parse(text);
			newPackage(extension);
		} catch(error) {
			installationError(this.name,error.message);
			this.reader.close();
			return;
		}
		
		if(!extension.files || !extension.files.length) {
			application.warning(
				"The package '"+this.name+"' has no files.");
			this.reader.close();
			return;	
		}
		
		// Find the files.
		try {
			var root = this.components.join("/");
			var files = [];
			for(var i = 0;i<extension.files.length;++i){
				var filename = extension.files[i];
				for(var j = 0;j<this.entries.length;++j){
					if(this.entries[j].directory) continue;
					if(this.entries[j].filename === root+"/"+filename) {
						files.push([j,filenameToHandler(filename)]);
						break;
					}
				}
			}
		} catch(error) {
			installationError(this.name,error.message);
			this.reader.close();
			return;
		}
		
		// Load the files
		if(!files.length) {
			this.reader.close();
			return;
		}
		
		for(var i = 0;i<files.length;++i) {
			this.entries[files[i][0]].getData(new zip.TextWriter('UTF-8'),
				loadFile.bind({
					package: extension,
					self: this,
					loader: files[i][1],
					last: i === (files.length-1)
				}));
		}	
	}
	
	/**
	 * Zip FS reader.
	 */
	function readZipFs(entries) {		
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
			installationError(this.name,
				" This is an invalid extension package ('package.json' is missing)!");
			this.reader.close();
			return;
		}
		this.components = components;
		this.entries = entries;
		
		entries[descriptorIndex].getData(new zip.TextWriter('UTF-8'),
			loadPackageDotJSON.bind(this));
	}
	
	function readZip(reader) {
		this.reader = reader;
		reader.getEntries(readZipFs.bind(this));		
	}
	
//----------------------------------------------------------------------
// Public:

	/**
	 * This can be called from inside the package to import some other packages
	 */
	this.require = function (packageName) {
		if(packageName in packageExports) {
			return packageExports[packageName];
		}
		else throw new Error("The package '"+packageName+"' wasn't found!");
	}
	
	/**
	 * Enables you to provide custom loaders for files inside extension packages.
	 */
	this.connectExtension = function(ext,loader) {
		if((typeof ext) !== "string") 
			throw new Error("extension must be a string");
		if((typeof loader) !== "function") 
			throw new Error("loader must be a function");
		if(ext in extensionHandlers)
			throw new Error("The extension '"+ext+
				"' is already connected by another loader");
		
		extensionHandlers[ext] = loader;		
	}

	/**
	 * Unistalls a package.
	 */
	this.unistall = function(packageName) {
		var package = packages[packageName];
		if(package) {
			deletePackage(packageName);
			savePackages();
			application.log(
				"The package '"+package.name+"' was unistalled. Please reload the page.");
		} else throw new Error("Unknow package "+packageName);
	}
	
	if(!zip) 
		throw new Error("Zip.js is missing!");
	zip.useWebWorkers = false;
		
	/**
	 * Installs an extension package from a file.
	 */
	this.installFile = (function(file) {
		zip.useWebWorkers = false;
		zip.createReader(new zip.BlobReader(file), 
		readZip.bind({ 
			name: file.name,
			packageManager: this,
			reader: null,
			entries: null,
			components: null,
		}), 
		function(error) {
			installationError(file.name,error);
		});
	}).bind(this);
	
	/**
	 * Downloads and installs an extension package from a url.
	 */
	this.installUrl = (function(url) {		
		try {
			zip.useWebWorkers = false;
			zip.createReader(new zip.HttpReader(url), 
			readZip.bind({ 
				name: url,
				packageManager: this,
				reader: null,
				entries: null,
				components: null,
			}), 
			function(error) {
				installationError(url,error);
			});
		} catch(exception) {
			installationError(url,error);
		}
	}).bind(this);
	
	/**
	 * Iterates over each installed package.
	 */
	this.forEach = function(f) {
		for (var package in packages) {
			if (packages.hasOwnProperty(package)) {
				f(packages[package]);
			}
		}
	}
}
