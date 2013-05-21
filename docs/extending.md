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
* dependencies - an array of package names and versions.

Example:

	{
		"name": "sample",
		"files": ["sample.js"],
		"version": "1.0",
		"description": "Just a sample package"
	}
	
### Client API

TODO

### TODO

Dependencies.
