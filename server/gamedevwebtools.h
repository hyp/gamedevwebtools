/**
 * Gamedevwebtools server - a library to connect your application to a 
 * web client which can be used to monitor/debug and modify the behavior
 * of your application.
 * 
 * Copyright (c) 2013 Alex Lorenz <hypothermia.frost@gmail.com>. 
 * All rights reserved.
 * Gamedevwebtools is licensed as 'AS IS', the full text of the license
 * agreement can be read in the file '../LICENSE.txt'.
 * 
 * Compilation options(via preprocessor defines):
 *   GAMEDEVWEBTOOLS_PLATFORM_BIG_ENDIAN:
 *     Define to compile the code for big endian architectures.
 * 
 *   GAMEDEVWEBTOOLS_CONSTEXPR:
 *     Define if your compiler doesn't support the C++11 constexpr keyword, 
 *     and the compiler isn't MSVC.
 */
#pragma once

#include <stddef.h>
#include <stdint.h>
#include <utility>

#ifndef GAMEDEVWEBTOOLS_CONSTEXPR
	#ifdef _MSC_VER
		#define GAMEDEVWEBTOOLS_CONSTEXPR inline
	#else
		#define GAMEDEVWEBTOOLS_CONSTEXPR constexpr
	#endif
#endif

namespace gamedevwebtools {
	
namespace logging {
	/** 
	 * The level of importance of the logging message sent to the client 
	 */
	enum Level {
		Trace,
		Debug,
		Information,
		Warning,
		Error,
		Critical,
		Fatal,	
	};
};
	
namespace core {
	
class HashTable;

namespace memory {

class Arena;

} }// core::memory

namespace network {
	
class Server;
class Listener;

namespace websocket {
	
class Server;

} } // network::websocket
	
/**
 * A message to send to the web client.
 */
class Message {
public:

	/** An individual field of the message containing some data */
	struct Field {
		union Value {
			bool boolean;
			int32_t i32;
			size_t  isz;
			double f64;
			const char *cstr;
			const void *ptr;
			
			GAMEDEVWEBTOOLS_CONSTEXPR Value(bool x) : boolean(x) {}
			GAMEDEVWEBTOOLS_CONSTEXPR Value(int32_t x) : i32(x) {}
			GAMEDEVWEBTOOLS_CONSTEXPR Value(size_t x) : isz(x) {}
			GAMEDEVWEBTOOLS_CONSTEXPR Value(double x) : f64(x) {}
			GAMEDEVWEBTOOLS_CONSTEXPR Value(const char *str) : cstr(str) {}
			GAMEDEVWEBTOOLS_CONSTEXPR Value(const void *p) : ptr(p) {}
			Value() {}
		};
		enum Type {
			t_boolean, t_i32, t_isz, t_f64, t_cstr, t_ptr
		};
		
	protected:
		const char *id;
		Type type;
		Value value;
	public:

		GAMEDEVWEBTOOLS_CONSTEXPR Field(const char *name,bool x) : 
			id(name),type(t_boolean),value(x) {}	
		GAMEDEVWEBTOOLS_CONSTEXPR Field(const char *name,int32_t x) : 
			id(name),type(t_i32),value(x) {}
		GAMEDEVWEBTOOLS_CONSTEXPR Field(const char *name,size_t x) : 
			id(name),type(t_isz),value(x) {}
		GAMEDEVWEBTOOLS_CONSTEXPR Field(const char *name,float x) : 
			id(name),type(t_f64),value(double(x)) {}
		GAMEDEVWEBTOOLS_CONSTEXPR Field(const char *name,double x) : 
			id(name),type(t_f64),value(x) {}
		GAMEDEVWEBTOOLS_CONSTEXPR Field(const char *name,const char *str) : 
			id(name),type(t_cstr),value(str) {}
		GAMEDEVWEBTOOLS_CONSTEXPR Field(const char *name,void *ptr) : 
			id(name),type(t_ptr),value(ptr) {}
			
		/** 
		 * The is and as methods are used when recieving the messages.
		 */
		inline bool isBool() const { return type == t_boolean; }
		inline bool isInteger() const { return type == t_i32; }
		inline bool isReal() const {
			return type == t_i32 || type == t_f64; 
		}
		inline bool isString() const { return type == t_cstr; }
			
		inline bool asBool() const {
			return type == t_boolean? value.boolean : false;
		}
		inline int32_t asInteger() const {
			return type == t_i32? value.i32 : 0;
		}
		inline double asReal() const {
			return type == t_i32? double(value.i32) :
				(type == t_f64? value.f64 : 0.0);
		}
		inline const char *asString() const {
			return type == t_cstr? value.cstr : "";
		}
		
		/** Returns the name of the field */
		inline const char *name() const { return id; }
		
	protected:		
		Field() {}
		friend class Message;
		friend class Service;
	};
	
	Message(const char *type,const Field *fields,size_t count);
	Message(const char *type);
	Message(const char *type,const Field &a);
	Message(const char *type,const Field &a,const Field &b);
	Message(const char *type,const Field &a,const Field &b,
		const Field &c);
		
	inline const char *type() const;
	inline size_t fieldCount() const;
	inline const Field *fields() const;

protected:
	const char *name;
	const Field *fieldArray;
	size_t length;
	
	friend class Service;
private:
	enum { kMaxInlineFields = 3 };
	Field inlineStorage[kMaxInlineFields];
};

/** Returns the type of the message */
inline const char *Message::type() const { return name; }
/** Returns the amount of fields in this message */
inline size_t Message::fieldCount() const { return length; }
/** Returns the message's fields */
inline const Message::Field *Message::fields() const { return fieldArray; }

class MessageHandler {
public:
	virtual void handle() = 0;
};

/**
 * This service is responsible for sending messages and recieving messages
 * and data to and from the web clients.
 * 
 * Once an instance of the service was created, it is assumed that the address
 * of said instance will remain constant while the application is running.
 */
class Service {
public:
	
	/**
	 * Network options for the Server.
	 */
	struct NetworkOptions {
		/// The maximum amount of clients that are allowed to connect.
		/// Default: 8
		size_t maxConnectedClients;
		
		/// The port on which the server operates.
		/// Default: 8080
		int  port;
		
		/// Should the application freeze until the first client connects?
		/// Default: false
		bool blockUntilFirstClient;
		
		/// Should the server use ipv6?
		/// Default: false
		bool ipv6;
		
		/// Should the application handle the initialization and shutdown
		/// of the system networking libraries like WinSock?
		/// Default: true
		bool initializeSystemLibraries;
		
		/// The inital size of each sent messages buffer for each thread.
		/// Default: 4 KiB
		size_t threadMessageBufferInitialSize;
		
		GAMEDEVWEBTOOLS_CONSTEXPR NetworkOptions() :
			maxConnectedClients(8),port(8080),blockUntilFirstClient(false),
			ipv6(false),initializeSystemLibraries(true),
			threadMessageBufferInitialSize(4096) {}
	};
	
	/**
	 * The information about the application to send to the client.
	 */
	struct ApplicationInformation {
		const char *name;
		
		GAMEDEVWEBTOOLS_CONSTEXPR ApplicationInformation() :
			name("Unnamed application") {}
	};
	
	/** Constructor. NB: The service isn't initialized until init is called! */
	Service();
	/** Destructor. All memory and network resources used by the service are released */
	virtual ~Service();
	
	/**
	 * Initializes the service - starts the networking server, allocates
	 * buffers, etc. Should be called once straight after creation.
	 * 
	 * threadCount is the number of threads used by the application 
	 * which can send messages. It is assumed that it will never change
	 * while the application is running. It must be at least be 1. The
	 * default value is 1 meaning that the application intends to send
	 * messages only from one thread.
	 *
	 * Why call init and not just do it all in the constructor?
	 * - init may need to call onError which is a virtual function.
	 * - classes deriving from this class will need to construct the
	 *   options before calling init,
	 *   and it would be awkard to construct them before calling the
	 *   constructor.
	 */
	void init(
		const ApplicationInformation &appInfo = ApplicationInformation(),
		const NetworkOptions &netOptions = NetworkOptions(),
		size_t threadCount = 1);
	
	/**
	 * This method enables the service to send messages from multiple threads.
	 * 
	 * currentThreadId is a number, unique to each thread, 
	 * ranging from 0 to threadCount - 1 inclusive.
	 * 
	 * The default implementation assumes that the application only sends
	 * messages from one thread and that the currentThreadId is always 0.
	 */
	virtual size_t currentThreadId() const;
	
	/**
	* The service needs dynamic memory allocation to operate, 
	* and you can override onMalloc and onFree to provide you own 
	* memory management functions instead of the default malloc and free.
	* 
	* NB: ThreadSafety: These functions must be thread safe.
	* The allocated memory must be aligned with at least pointer alignment.
	*/
	virtual void *onMalloc(size_t size);
	virtual void onFree(void *ptr);
	
	/** Returns the number of clients connected ATM */
	inline size_t connectedClients() const;
	
	/** 
	 * Gathers the messages from the threads.
	 * frameTime - the time in seconds from the start of this frame to
	 *   the time the application has started.
	 * 
	 * NB: 
	 * Thread Safety:
	 *   This should be called only when the application can guarantee that 
	 *   no other threads can send messages and call update
	 *   while this call is taking place.
	 * 
	 * Efficiency considerations:
	 *   It's fast as it doesn't copy any buffers, 
	 *   since double buffering is used for the thread message buffers. 
	 *   May send some messages, but not every frame.
	 */
	void frameStart(double frameTime);
	
	/**
	 * Updates the network connections - accepts new clients,
	 * sends and recieves messages to and from the current clients.
	 * NB: Thread Safety: Can be called from any thread.
	 */
	void update();
	
	/**
	 * Sends a message.
	 * NB: Thread Safety: Can be called from any thread.
	 * Efficiency considerations: 
	 *   False sharing(cache line sharing)
	 *   may occur when called from different threads.
	 */
	void send(const Message &message);
	void send(const Message &message,const void *data,const size_t
		dataSize);
	

	/**
	 * The set of connect methods enable the user to recieve messages
	 * using custom handlers.
	 * 
	 * The application can only connect one handler for each distinct message type.
	 * NB:
	 * Memory considerations:
	 *   All the strings and the field array owned by the message are
	 *   valid only inside the provided function/method.
	 *   You have to copy the data if you want to preserve it.
	 * 
	 * Timing and Thread Safety:
	 *   The connect methods AREN'T thread safe and MUST be called only
	 *   from one thread.
	 * 
	 *   The functions/methods callbacks are called only from inside update.
	 */
	/** 
	 * The following four methods provide a binding between a message type
	 * and functions. */
	void connect(const char *messageType, 
		void (*function)());
	void connect(const char *messageType, 
		void (*function)(void *userData), void *data);
	void connect(const char *messageType, 
		void (*function)(const Message &message));
	void connect(const char *messageType, 
		void (*function)(void *userData, const Message &message), void *data);
		
	/** 
	 * The next four methods provide a binding between a message type
	 * and a method of an object. 
	 * The address of the object must remain constant.
	 */
	template<typename T>
	void connect(const char *messageType, 
		T &object, void (T::* method)());
		
	template<typename T>
	void connect(const char *messageType, 
		T &object, void (T::* method)(const Message &message));
		
	template<typename T>
	void connect(const char *messageType, 
		const T &object, void (T::* method)() const);
	
	template<typename T>
	void connect(const char *messageType, 
		const T &object, void (T::* method)(const Message &message) const);
	
	/**
	 * A callback for when a new client connects.
	 * NB: Timing and Thread Safety: Called only from inside update.
	 */
	virtual void onNewClient();
	
	/**
	 * An error callback.
	 * NB: Thread Safety: must be thread safe.
	 */
	virtual void onError(const char *errorString);
private:
	void send(const uint8_t *data,size_t size,size_t binaryDataSize,
		const void *binaryData);
	size_t parse(char *message,size_t size);
	void recieve(uint8_t *data,size_t size);
	size_t computeMemoryUsage();
	
	bool checkForNewClient();
	void removeClient(size_t i);
	
	void safeInsert(core::HashTable *hash,const char *key);
	void methodConnect(void (*dispatch)(const void *,const Message &),
		const void *callback,size_t callbackSize);
	
	bool active_;
	core::memory::Arena *threadMessageBuffers;
	core::memory::Arena *threadMessageBackBuffers;
	size_t threadCount;
	core::HashTable *messageTypeMapping;
	core::memory::Arena *messageHandlers;
	
	network::Server *server;
	size_t clientCount;
	size_t activeClientCount;
	network::Listener *clients;
	network::websocket::Server *wsclients;
	
	size_t memusage;
	ApplicationInformation info;
	bool netInit;
};

inline size_t Service::connectedClients() const { 
	return activeClientCount; 
}

template<typename T>
void Service::connect(const char *messageType, 
	T &object, void (T::* method)(const Message &message))
{
	safeInsert(messageTypeMapping,messageType);
	struct Wrapper {
		void (T::* method)(const Message &);
		T &object;
		
		GAMEDEVWEBTOOLS_CONSTEXPR Wrapper(T &obj) : object(obj) {}
		static void dispatch(const void *data,const Message &msg){
			auto self = (const Wrapper*)data;
			(self->object.*(self->method))(msg);
		}
	};
	Wrapper wrapper(object);wrapper.method = method;
	methodConnect(&Wrapper::dispatch,&wrapper,sizeof(Wrapper));
}

template<typename T>
void Service::connect(const char *messageType, 
	T &object, void (T::* method)())
{
	safeInsert(messageTypeMapping,messageType);
	struct Wrapper {
		void (T::* method)();
		T &object;
		
		GAMEDEVWEBTOOLS_CONSTEXPR Wrapper(T &obj) : object(obj) {}
		static void dispatch(const void *data,const Message &msg){
			auto self = (const Wrapper*)data;
			(self->object.*(self->method))();
		}
	};
	Wrapper wrapper(object);wrapper.method = method;
	methodConnect(&Wrapper::dispatch,&wrapper,sizeof(Wrapper));
}

template<typename T>
void Service::connect(const char *messageType, 
	const T &object, void (T::* method)(const Message &message) const)
{
	safeInsert(messageTypeMapping,messageType);
	struct Wrapper {
		void (T::* method)(const Message &) const;
		const T &object;
		
		GAMEDEVWEBTOOLS_CONSTEXPR Wrapper(const T &obj) : object(obj) {}
		static void dispatch(const void *data,const Message &msg){
			auto self = (const Wrapper*)data;
			(self->object.*(self->method))(msg);
		}
	};
	Wrapper wrapper(object);wrapper.method = method;
	methodConnect(&Wrapper::dispatch,&wrapper,sizeof(Wrapper));
}

template<typename T>
void Service::connect(const char *messageType, 
	const T &object, void (T::* method)() const)
{
	safeInsert(messageTypeMapping,messageType);
	struct Wrapper {
		void (T::* method)() const;
		const T &object;
		
		GAMEDEVWEBTOOLS_CONSTEXPR Wrapper(const T &obj) : object(obj) {}
		static void dispatch(const void *data,const Message &msg){
			auto self = (const Wrapper*)data;
			(self->object.*(self->method))();
		}
	};
	Wrapper wrapper(object);wrapper.method = method;
	methodConnect(&Wrapper::dispatch,&wrapper,sizeof(Wrapper));
}

} // gamedevwebtools.
