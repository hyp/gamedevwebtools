Messages
------------

* gamedevwebtools.unhandled - the application doesn't understand this message.

* application.service.quit - instructs the application to exit.
* application.service.activate - instructs the application to activate/deactivate itself.
* application.service.step - if an application is currently deactivated, this message instructs the application to activate for just one frame.

* application.information - sends the information about the application to the web client.
  * threadCount: int - the number of threads used by the application.
  * OPTIONAL name: string - the name of the application.
  
* input.keydown and input.keyup - send for keyboard events, has properties:
  * key: int - keyCode (javascript keyCode value).

* application.log - send for logging output, has properties: 
  * lvl: int - the importance level of the message.
  * msg: string - a logging message.

* monitoring.frame - send each frame, has properties:
  * id: int - frameId.
  * t: real - frame starting time(seconds since first frame/application startup).
  * dt: real - delta time(the difference between the starting time of this frame and the starting time of the last frame).
  * OPTIONAL rawDt: real - it is used when 'dt' is smoothed/filtered.
  
* monitoring.memory - send when an amount of allocated memory changes, has properties:
  * name: string - the name of the memory subsystem that reports the change.
  * t: real - the time of the allocation in seconds(the current frame starting time).
  * size: real - the amount of bytes that are used by this memory subsystem.
	
* profiling.task - task profiling result.
  * name: string - the name of this task.
  * thread: int - thread id.
  * depth: int - the depth of this task relative to the outer task, e.g. outerTask has depth 0, and it calls innerTask which has depth 1.
  * t: real - starting time of this task since the frame start in seconds.
  * dt: real - the amount of time this task was running in seconds.
  * frame: int - frame id.
  
* profiling.timer - a single profiling result.
  * name: string - the name of this profiling timer.
  * samples: int - the amount of time samples that were taken.
  * mean: real - the mean time in seconds.
  * median: real - the median time in seconds.
  * total: real - the total time in seconds.
