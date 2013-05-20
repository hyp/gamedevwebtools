window.WebSocket = window.WebSocket || window.MozWebSocket;

/** Local storage fallback for older browsers */
if(!localStorage) {
	localStorage = {
		getItem: function(i){ return null; },
		setItem: function(i,v) {}
	};
	alert("Warning - local storage isn't supported!");
}

/** requestAnimationFrame fallback */
// Source: http://paulirish.com/2011/requestanimationframe-for-smart-animating/
((function() {
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame =
          window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
})());

if (window.File && window.FileReader && window.FileList && window.Blob) {
} else {
	alert("Your browser doesn't support file API!");
}
