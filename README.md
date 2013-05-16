Gamedev web tools
--------------------------

A set of browser based tools for game development.

Right now it primarily consists of tools useful for monitoring and profiling a game.
Internet connection is **not** required and it works with Chrome, Firefox and Opera.

#### Screenshots

- [Monitoring](http://gamedevwebtools.github.io/screenshots/monitoring.png)
- [Frame delta time](http://gamedevwebtools.github.io/screenshots/framedt.png)
- [Memory usage](http://gamedevwebtools.github.io/screenshots/memory.png)
- [Task and thread profiler](http://gamedevwebtools.github.io/screenshots/tasks.png)
- [Timer profiling results](http://gamedevwebtools.github.io/screenshots/times.png)

### Usage

Open app/index.html in your browser to access the browser based client.

Alternatively you can visit [http://gamedevwebtools.github.io](http://gamedevwebtools.github.io).

To provide a sample data generating server for the browser client, compile and run the  application located in the server/sample directory (VS project is included in vsproject folder, and CMakeLists.txt is provided for linux or a custom vs projects).

### Tools

**Console:** shows the application's log, provides a way to send custom messages to the application.

**Time graph:** can show show the raw and filtered frame delta time values.

**Memory usage:** displays the memory usage of each allocator/subsystem.

**Task and thread profiler:** displays the timings for the CPU based tasks with relation to the thread they run on. Uses the left mouse button to pan and the right mouse button to zoom in and out.

**Timing results:** useful for displaying specific profiling results.

**Keyboard button:** sends the browser keyboard input events to your application.

### Implementation/protocol details

Gamedev web tools uses Websockets to send binary messages with JSON headers between the application and the web clients. The communication occurs in this manner:

**1)** A message header is encoded as a JSON object, and a propery 'type' is added to it to represent the type of this message. If a message intends to carry any additional binary data (some game assets for example), then a property 'dataSize' is added to the object to represent the size of the binary data included with this message. The message header object can only have number, boolean and string properties, it doesn't allow any embedded arrays (Will be changed in the future to allow sending values of type float4 and the like) or objects.

**2)** The length of the message header is then added to the message. It may not exceed 65535 bytes, and it is encoded with two bytes as [ length % 256 , length / 256 ].

**3)** Then the JSON message header is added to the message.

**4)** After that, any additional binary data is added to the message.

**5)** Finally, the message or messages are send over the websockets layer as a websockets binary message.

A list of currently used message types and expected properties can be seen in the file docs/messages.md

### Integration with your game/game engine

You'll need to integrate gamedevwebtools server into your application/engine to take advantage of it's functionality.

A server written in C++ is provided with gamedevwebtools. It currenly works on Windows and Linux, but it should theoretically (as long as the sockets work) work on Android and Mac/iOS platforms.

The server consists of just one C++ code file with no external dependencies, and you can add it directly to your project/makefile. 
It includes all the networking and JSON related code.
It provides support for multithreading and custom allocators.
Some of the features from C++ 11 are utiliized, so make sure you add the possibly required compiler switch to your makefile. The documentation for the classes and methods is included inside gamedevwebtools.h.

A sample application which integrates with the server is located in the folder server/sample.

### Possible future features

* Memory watch/edit tool.
* Streaming of backbuffer directly to the browser (realtime?)
* Input simulation tools - simulate touch screens, joysticks and accelerometers.
* Integration with some debugging tools to enable in browser debugging.
* Extensions for the browser client to allow custom messages and creation of domain-specific tools.
* Tools which will enable live modification of game assets - GLSL shaders, scripts, images, meshes, etc.
* OpenGLES mirroring for debugging purposes via WebGL.
* GPU debugging and profiling tools.
* Integration with various game engines/frameworks.

Contributors are welcome to this project.

### About

Copyright (c) 2013 Alex Lorenz <hypothermia.frost@gmail.com>. All rights reserved.
 
Gamedevwebtools is licensed as 'AS IS', the full text of the license agreement can be read in the file 'LICENSE.txt'.

The browser client is built using jquery, jkey and bootstrap. Some bootstrap provided [Glyphicons](http://glyphicons.com) are also utilized.
