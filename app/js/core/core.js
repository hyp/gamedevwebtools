/**
 * The core module.
 */
var core = {

/**
 * Prototype based inheritance.
 */
extend: function (Child, Parent) {
	var F = function() { }
	F.prototype = Parent.prototype
	Child.prototype = new F()
	Child.prototype.constructor = Child
	Child.superclass = Parent.prototype
},

/**
 * Checks if a given value is a member of an enum object.
 * If the value is not a valid member of an enum, an Error is thrown.
 * If value is undefined, defaultValue is returned otherwise value is returned.
 */
checkEnumValue: function(value,enumObject,defaultValue) {
	if((typeof enumObject) !== "object")
		throw new Error("enumObject must an object");
	var valueType = typeof value;
	if(valueType === "undefined" && defaultValue) return defaultValue;
	else if(valueType === "number") {
		for(var key in enumObject) {
			if (enumObject.hasOwnProperty(key) && 
				enumObject[key] === value) {
				return value;
			}
		}
	}
	throw new Error("value isn't a member of enum");
}

};
