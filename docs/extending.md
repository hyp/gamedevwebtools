Extending Gamedev web tools - work in progress.
-------------------------------------------------

You can extend gamedevwebtools by writing custom extension packages
which can include javascript and css files.

An extension package is a zip file containining all of its source files.
It must have a file called package.json to describe the extension package.

You can take a look at some sample packages here:

* [hello world sample](http://github.com/gamedevwebtools/package-sample-hello-world)

### package.json
A file package.json describes the actual extension package. 
It's similar to the NPM package.json.

Fields:

* name - the name of the package. This field is mandatory.
* files - an array of filenames which this package uses. The files are loaded in
  the order of their apperance.
* version - the version of the package. The version must be a string in the format
  "x"/"x.x"/"x.x.x" where x is a string of digits(0-9).
* description - the description of the package.
* dependencies - a dictionary with keys which describe the name of the package
  and values which correspond to the desired version. The version can be "" or "*"
  to tell the package manager that any version will do.

Example:

	{
		"name": "sample",
		"files": ["sample.js"],
		"version": "1.0",
		"description": "Just a sample package"
		"dependencies": {
			"other": ""
		}
	}

### Dependencies.

You can use other packages in your package by using the following code: 

	var packageName = application.packages.require("packageName")

To export a set of functions/values from your package you should return
an object in one of your js files, for example.

	//my package.js
	return { doSomething: function() { application.log('Hello world!'); } }
	
After exporting, the exported object can be used by othe packages by using
application.packages.require.

### Client API

Gamedevwebtools provides a set of functions and classes which can be used
to write the extension packages.

TODO.

### TODO

Extension package server.
