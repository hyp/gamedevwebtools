/**
	This is a sample application demonstrating sending and recieving messages in a dummy game loop.

	Build instructions:
	Windows - a visual studio project is included in the vsproject folder.
	Linux   - SDL2 and cmake are required to build the sample.
 */
#include <stdlib.h>
#include <math.h>
#include "../gamedevwebtools.h"

#ifndef _WIN32
	#include <SDL2/SDL.h>
#else
	#include "win_sdl.h"
#endif

double now() {
	auto c = SDL_GetPerformanceCounter();
	auto f = SDL_GetPerformanceFrequency();
	return (double)c / double(f);
}

class Alloc : public gamedevwebtools::core::memory::Allocator {
public:
	void *allocate(size_t size) override {
		return malloc(size);
	}
	void deallocate(void *p) override {
		return free(p);
	}
};
Alloc allocator;

int main() {
	SDL_Init(SDL_INIT_VIDEO);

	auto mainwindow = SDL_CreateWindow("Gamedevwebtools sample", 
		SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED,
		512, 512,  SDL_WINDOW_SHOWN);
	if (!mainwindow) {
		SDL_Quit();
		return 1;
	}
	
	// A dummy class demonstrating memory usage monitoring.
	class ArrayOfIntegers {
		int *ints;
		size_t count;
	public:
		size_t length() const { return count; }
		void length(size_t l){
			if(ints) delete[] ints;
			ints = new int[l];
			count = l;
		}
		
		ArrayOfIntegers() : ints(nullptr),count(0) {}
		~ArrayOfIntegers(){
			if(ints) delete[] ints;
		}
		
		size_t memoryUsage() const {
			return count * sizeof(int);
		}
	};
	ArrayOfIntegers ints;
	ints.length(1024*96);
	size_t intsPrevMemUsage = 0;
	
	using namespace gamedevwebtools;
	class SampleService : public Service {
	public:
		ArrayOfIntegers &ints;
		bool done;
		bool active;
		size_t prevMemUsage;
		
		
		SampleService(ArrayOfIntegers &integers) 
			: ints(integers),done(false),active(true) 
		{
			prevMemUsage = 0;
		}
		
		void onApplicationQuitMessage() override {
			printf("Exiting the application\n");
			done = true;
		}
		void onApplicationActivateMessage() override {
			active = !active;
			printf("Activating the application\n");
		}
		void onMessage(const Message &message) override {
			printf("Got message '%s'\n",message.type());
			if(!strcmp(message.type(),"print") && message.fieldCount() > 0) {
				printf("%s\n",message.fields()[0].asString());
			} else if(!strcmp(message.type(),"allocate") && message.fieldCount() > 0) {
				ints.length(message.fields()[0].asInteger());
			}
		}
		void onNewClient() override {
			printf("A new client has connected\n");
		}
	};
	Service::ApplicationInformation info;
	info.name = "Gamedevwebtools server sample";
	Service::NetworkOptions netOpts;
	netOpts.blockUntilFirstClient = true;
	SampleService service(ints);
	service.init(&allocator,info,netOpts);
	
	auto firstT = now();
	auto lastT = firstT;	
	uint32_t frameId = 0;
	float x = 0.0f;

	// A dummy game loop.
	while(!service.done) {
		if(service.active){
			auto t = now();
			auto dt = t - lastT;
			auto frameT = t - firstT;
			lastT = t;
			service.frameStart(frameT);
			
			// Frame timing information.
			service.send(Message("monitoring.frame",
				Message::Field("id",frameId),
				Message::Field("dt",dt),Message::Field("t",frameT)));
			
			// Print something to the log
			if((frameId % 50) == 0) {
				service.send(Message("logging.msg",
					Message::Field("lvl",logging::Information),
					Message::Field("msg","Welcome to the gamedevwebtools sample!")));
				service.send(Message("logging.msg",
					Message::Field("lvl",logging::Information),
					Message::Field("msg","Let's try sending some messages to the application:")));	
				service.send(Message("logging.msg",
					Message::Field("lvl",logging::Information),
					Message::Field("msg","Type 'application.send(\"print\",{msg:\"Hello world\"})' to make the application print some text.")));
				service.send(Message("logging.msg",
					Message::Field("lvl",logging::Information),
					Message::Field("msg","Type 'application.send(\"allocate\",{size:1024*52})' to make the application allocate some memory and then take a look at the memory usage graph.")));
				service.send(Message("logging.msg",
					Message::Field("lvl",logging::Information),
					Message::Field("msg","")));	
					
				service.send(Message("data.shader"),
					"GLSL hello world",strlen("GLSL hello world"));
			}
					
			// Some dummy task profiling times
			Message::Field fields[] = {
				Message::Field("thread",0),
				Message::Field("depth",0),
				Message::Field("t",0.0),
				Message::Field("dt",dt),
				Message::Field("frame",frameId),
				Message::Field("name","frame")
			};
			service.send(Message("profiling.task",fields,sizeof(fields)/sizeof(fields[0])));
			fields[1] = Message::Field("depth",1);
			fields[3] = Message::Field("dt",dt*0.5);
			fields[5] = Message::Field("name","some task");
			service.send(Message("profiling.task",fields,sizeof(fields)/sizeof(fields[0])));
			
			// Some memory usage information.
			if(intsPrevMemUsage != ints.memoryUsage()) {
				service.send(Message("monitoring.memory",
					Message::Field("name","ints"),
					Message::Field("t",frameT),
					Message::Field("size",ints.memoryUsage())));
				intsPrevMemUsage = ints.memoryUsage();
			}
			++frameId;
		}
		
		service.update();
		auto sleepTime = fabs(sin(x)*40.0f);
		x+=0.1f;
		SDL_Delay(int(sleepTime));
	}


	SDL_DestroyWindow(mainwindow);
	SDL_Quit();

	return 0;
}
