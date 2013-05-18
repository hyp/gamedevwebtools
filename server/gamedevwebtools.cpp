/**
 * Gamedevwebtools server - a library to connect your application to a 
 * web client which can be used to monitor/debug and modify the behavior
 * of your application.
 * 
 * Copyright (c) 2013 Alex Lorenz <hypothermia.frost@gmail.com>. 
 * All rights reserved.
 * Gamedevwebtools is licensed as 'AS IS', the full text of the license
 * agreement can be read in the file '../LICENSE.txt'.
 */
 
 /**
  * TODO: 
  * Websocket protocol recieving continuation frames.
  * Port to Mac OSX.
  * Port to Android and IOS.
  */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <assert.h>
#include <errno.h>
#include <ctype.h>
#include <limits>
#include <new>

#include "gamedevwebtools.h"

#ifndef _WIN32

	#include <unistd.h>
	#include <fcntl.h>
	#include <sys/types.h> 
	#include <sys/socket.h>
	#include <netinet/in.h>
	#include <netinet/tcp.h>

#else

	#define GAMEDEVWEBTOOLS_PLATFORM_WIN32
	
	#ifndef NOMINMAX
		#define NOMINMAX
	#endif
	#ifndef WIN32_LEAN_AND_MEAN
		#define WIN32_LEAN_AND_MEAN
	#endif

	#include <winsock2.h>
	#include <ws2tcpip.h>
	#include <iphlpapi.h>

#ifdef _MSC_VER
	#pragma comment(lib, "Ws2_32.lib")
#endif

#endif

#ifdef _MSC_VER
	#define snprintf _snprintf
#endif

#ifndef GAMEDEVWEBTOOLS_PLATFORM_BIG_ENDIAN
	#define GAMEDEVWEBTOOLS_PLATFORM_LITTLE_ENDIAN
#endif

/**---------------------------------------------------------------------
 * htonu64 && ntohu64 - byte order conversion for 64 bit integers
 * Websocket protocol may require 64 bit sizes.
 */
#ifndef GAMEDEVWEBTOOLS_NO_WEBSOCKETS
#ifndef GAMEDEVWEBTOOLS_PLATFORM_BIG_ENDIAN
static uint64_t htonu64(uint64_t x) {
	auto high = htonl(uint32_t(x >> 32ULL));
	auto low = htonl(uint32_t(x & 0xFFFFFFFFULL));
	return (uint64_t(low) << 32ULL) | uint64_t(high);
}
static uint64_t ntohu64(uint64_t x) {
	return htonu64(x);
}
#else
static uint64_t htonu64(uint64_t x) {
	return x;
}
static uint64_t ntonh64(uint64_t x) {
	return x;
}
#endif
#endif // GAMEDEVWEBTOOLS_NO_WEBSOCKETS

/*----------------------------------------------------------------------
 * Sha1 stuff.
 */
#ifndef GAMEDEVWEBTOOLS_NO_WEBSOCKETS
/*
 *  sha1.h
 *
 *  Copyright (C) 1998, 2009
 *  Paul E. Jones <paulej@packetizer.com>
 *  All Rights Reserved
 *
 *****************************************************************************
 *  $Id: sha1.h 12 2009-06-22 19:34:25Z paulej $
 *****************************************************************************
 *
 *  Description:
 *      This class implements the Secure Hashing Standard as defined
 *      in FIPS PUB 180-1 published April 17, 1995.
 *
 *      Many of the variable names in the SHA1Context, especially the
 *      single character names, were used because those were the names
 *      used in the publication.
 *
 *      Please read the file sha1.c for more information.
 *
 */

#ifndef _SHA1_H_
#define _SHA1_H_

/* 
 *  This structure will hold context information for the hashing
 *  operation
 */
typedef struct SHA1Context
{
    unsigned Message_Digest[5]; /* Message Digest (output)          */

    unsigned Length_Low;        /* Message length in bits           */
    unsigned Length_High;       /* Message length in bits           */

    unsigned char Message_Block[64]; /* 512-bit message blocks      */
    int Message_Block_Index;    /* Index into message block array   */

    int Computed;               /* Is the digest computed?          */
    int Corrupted;              /* Is the message digest corruped?  */
} SHA1Context;

/*
 *  Function Prototypes
 */
void SHA1Reset(SHA1Context *);
int SHA1Result(SHA1Context *);
void SHA1Input( SHA1Context *,
                const unsigned char *,
                unsigned);

#endif

 /*
 *  sha1.c
 *
 *  Copyright (C) 1998, 2009
 *  Paul E. Jones <paulej@packetizer.com>
 *  All Rights Reserved
 *
 *****************************************************************************
 *  $Id: sha1.c 12 2009-06-22 19:34:25Z paulej $
 *****************************************************************************
 *
 *  Description:
 *      This file implements the Secure Hashing Standard as defined
 *      in FIPS PUB 180-1 published April 17, 1995.
 *
 *      The Secure Hashing Standard, which uses the Secure Hashing
 *      Algorithm (SHA), produces a 160-bit message digest for a
 *      given data stream.  In theory, it is highly improbable that
 *      two messages will produce the same message digest.  Therefore,
 *      this algorithm can serve as a means of providing a "fingerprint"
 *      for a message.
 *
 *  Portability Issues:
 *      SHA-1 is defined in terms of 32-bit "words".  This code was
 *      written with the expectation that the processor has at least
 *      a 32-bit machine word size.  If the machine word size is larger,
 *      the code should still function properly.  One caveat to that
 *      is that the input functions taking characters and character
 *      arrays assume that only 8 bits of information are stored in each
 *      character.
 *
 *  Caveats:
 *      SHA-1 is designed to work with messages less than 2^64 bits
 *      long. Although SHA-1 allows a message digest to be generated for
 *      messages of any number of bits less than 2^64, this
 *      implementation only works with messages with a length that is a
 *      multiple of the size of an 8-bit character.
 *
 */
/*
 *  Define the circular shift macro
 */
#define SHA1CircularShift(bits,word) \
                ((((word) << (bits)) & 0xFFFFFFFF) | \
                ((word) >> (32-(bits))))

/* Function prototypes */
void SHA1ProcessMessageBlock(SHA1Context *);
void SHA1PadMessage(SHA1Context *);

/*  
 *  SHA1Reset
 *
 *  Description:
 *      This function will initialize the SHA1Context in preparation
 *      for computing a new message digest.
 *
 *  Parameters:
 *      context: [in/out]
 *          The context to reset.
 *
 *  Returns:
 *      Nothing.
 *
 *  Comments:
 *
 */
void SHA1Reset(SHA1Context *context)
{
    context->Length_Low             = 0;
    context->Length_High            = 0;
    context->Message_Block_Index    = 0;

    context->Message_Digest[0]      = 0x67452301;
    context->Message_Digest[1]      = 0xEFCDAB89;
    context->Message_Digest[2]      = 0x98BADCFE;
    context->Message_Digest[3]      = 0x10325476;
    context->Message_Digest[4]      = 0xC3D2E1F0;

    context->Computed   = 0;
    context->Corrupted  = 0;
}

/*  
 *  SHA1Result
 *
 *  Description:
 *      This function will return the 160-bit message digest into the
 *      Message_Digest array within the SHA1Context provided
 *
 *  Parameters:
 *      context: [in/out]
 *          The context to use to calculate the SHA-1 hash.
 *
 *  Returns:
 *      1 if successful, 0 if it failed.
 *
 *  Comments:
 *
 */
int SHA1Result(SHA1Context *context)
{

    if (context->Corrupted)
    {
        return 0;
    }

    if (!context->Computed)
    {
        SHA1PadMessage(context);
        context->Computed = 1;
    }

    return 1;
}

/*  
 *  SHA1Input
 *
 *  Description:
 *      This function accepts an array of octets as the next portion of
 *      the message.
 *
 *  Parameters:
 *      context: [in/out]
 *          The SHA-1 context to update
 *      message_array: [in]
 *          An array of characters representing the next portion of the
 *          message.
 *      length: [in]
 *          The length of the message in message_array
 *
 *  Returns:
 *      Nothing.
 *
 *  Comments:
 *
 */
void SHA1Input(     SHA1Context         *context,
                    const unsigned char *message_array,
                    unsigned            length)
{
    if (!length)
    {
        return;
    }

    if (context->Computed || context->Corrupted)
    {
        context->Corrupted = 1;
        return;
    }

    while(length-- && !context->Corrupted)
    {
        context->Message_Block[context->Message_Block_Index++] =
                                                (*message_array & 0xFF);

        context->Length_Low += 8;
        /* Force it to 32 bits */
        context->Length_Low &= 0xFFFFFFFF;
        if (context->Length_Low == 0)
        {
            context->Length_High++;
            /* Force it to 32 bits */
            context->Length_High &= 0xFFFFFFFF;
            if (context->Length_High == 0)
            {
                /* Message is too long */
                context->Corrupted = 1;
            }
        }

        if (context->Message_Block_Index == 64)
        {
            SHA1ProcessMessageBlock(context);
        }

        message_array++;
    }
}

/*  
 *  SHA1ProcessMessageBlock
 *
 *  Description:
 *      This function will process the next 512 bits of the message
 *      stored in the Message_Block array.
 *
 *  Parameters:
 *      None.
 *
 *  Returns:
 *      Nothing.
 *
 *  Comments:
 *      Many of the variable names in the SHAContext, especially the
 *      single character names, were used because those were the names
 *      used in the publication.
 *         
 *
 */
void SHA1ProcessMessageBlock(SHA1Context *context)
{
    const unsigned K[] =            /* Constants defined in SHA-1   */      
    {
        0x5A827999,
        0x6ED9EBA1,
        0x8F1BBCDC,
        0xCA62C1D6
    };
    int         t;                  /* Loop counter                 */
    unsigned    temp;               /* Temporary word value         */
    unsigned    W[80];              /* Word sequence                */
    unsigned    A, B, C, D, E;      /* Word buffers                 */

    /*
     *  Initialize the first 16 words in the array W
     */
    for(t = 0; t < 16; t++)
    {
        W[t] = ((unsigned) context->Message_Block[t * 4]) << 24;
        W[t] |= ((unsigned) context->Message_Block[t * 4 + 1]) << 16;
        W[t] |= ((unsigned) context->Message_Block[t * 4 + 2]) << 8;
        W[t] |= ((unsigned) context->Message_Block[t * 4 + 3]);
    }

    for(t = 16; t < 80; t++)
    {
       W[t] = SHA1CircularShift(1,W[t-3] ^ W[t-8] ^ W[t-14] ^ W[t-16]);
    }

    A = context->Message_Digest[0];
    B = context->Message_Digest[1];
    C = context->Message_Digest[2];
    D = context->Message_Digest[3];
    E = context->Message_Digest[4];

    for(t = 0; t < 20; t++)
    {
        temp =  SHA1CircularShift(5,A) +
                ((B & C) | ((~B) & D)) + E + W[t] + K[0];
        temp &= 0xFFFFFFFF;
        E = D;
        D = C;
        C = SHA1CircularShift(30,B);
        B = A;
        A = temp;
    }

    for(t = 20; t < 40; t++)
    {
        temp = SHA1CircularShift(5,A) + (B ^ C ^ D) + E + W[t] + K[1];
        temp &= 0xFFFFFFFF;
        E = D;
        D = C;
        C = SHA1CircularShift(30,B);
        B = A;
        A = temp;
    }

    for(t = 40; t < 60; t++)
    {
        temp = SHA1CircularShift(5,A) +
               ((B & C) | (B & D) | (C & D)) + E + W[t] + K[2];
        temp &= 0xFFFFFFFF;
        E = D;
        D = C;
        C = SHA1CircularShift(30,B);
        B = A;
        A = temp;
    }

    for(t = 60; t < 80; t++)
    {
        temp = SHA1CircularShift(5,A) + (B ^ C ^ D) + E + W[t] + K[3];
        temp &= 0xFFFFFFFF;
        E = D;
        D = C;
        C = SHA1CircularShift(30,B);
        B = A;
        A = temp;
    }

    context->Message_Digest[0] =
                        (context->Message_Digest[0] + A) & 0xFFFFFFFF;
    context->Message_Digest[1] =
                        (context->Message_Digest[1] + B) & 0xFFFFFFFF;
    context->Message_Digest[2] =
                        (context->Message_Digest[2] + C) & 0xFFFFFFFF;
    context->Message_Digest[3] =
                        (context->Message_Digest[3] + D) & 0xFFFFFFFF;
    context->Message_Digest[4] =
                        (context->Message_Digest[4] + E) & 0xFFFFFFFF;

    context->Message_Block_Index = 0;
}

/*  
 *  SHA1PadMessage
 *
 *  Description:
 *      According to the standard, the message must be padded to an even
 *      512 bits.  The first padding bit must be a '1'.  The last 64
 *      bits represent the length of the original message.  All bits in
 *      between should be 0.  This function will pad the message
 *      according to those rules by filling the Message_Block array
 *      accordingly.  It will also call SHA1ProcessMessageBlock()
 *      appropriately.  When it returns, it can be assumed that the
 *      message digest has been computed.
 *
 *  Parameters:
 *      context: [in/out]
 *          The context to pad
 *
 *  Returns:
 *      Nothing.
 *
 *  Comments:
 *
 */
void SHA1PadMessage(SHA1Context *context)
{
    /*
     *  Check to see if the current message block is too small to hold
     *  the initial padding bits and length.  If so, we will pad the
     *  block, process it, and then continue padding into a second
     *  block.
     */
    if (context->Message_Block_Index > 55)
    {
        context->Message_Block[context->Message_Block_Index++] = 0x80;
        while(context->Message_Block_Index < 64)
        {
            context->Message_Block[context->Message_Block_Index++] = 0;
        }

        SHA1ProcessMessageBlock(context);

        while(context->Message_Block_Index < 56)
        {
            context->Message_Block[context->Message_Block_Index++] = 0;
        }
    }
    else
    {
        context->Message_Block[context->Message_Block_Index++] = 0x80;
        while(context->Message_Block_Index < 56)
        {
            context->Message_Block[context->Message_Block_Index++] = 0;
        }
    }

    /*
     *  Store the message length as the last 8 octets
     */
    context->Message_Block[56] = (context->Length_High >> 24) & 0xFF;
    context->Message_Block[57] = (context->Length_High >> 16) & 0xFF;
    context->Message_Block[58] = (context->Length_High >> 8) & 0xFF;
    context->Message_Block[59] = (context->Length_High) & 0xFF;
    context->Message_Block[60] = (context->Length_Low >> 24) & 0xFF;
    context->Message_Block[61] = (context->Length_Low >> 16) & 0xFF;
    context->Message_Block[62] = (context->Length_Low >> 8) & 0xFF;
    context->Message_Block[63] = (context->Length_Low) & 0xFF;

    SHA1ProcessMessageBlock(context);
}

#endif // GAMEDEVWEBTOOLS_NO_WEBSOCKETS

/*----------------------------------------------------------------------
 * Core stuff.
 */
namespace gamedevwebtools {
namespace core {

/**
 * A small stack buffer for string and data building.
 */
struct Buffer {
	/** The maximum size of the data stored in the buffer */
	enum {
		kMaxLength = 4096
	};
	
	Buffer();
	
	void put(char c);
	void put(const char *str,size_t size);
	void put(const char *str);
	void putEscaped(const char *str);
	template<typename T>
	void fmt(const char *fmt,T t);
	void fmt(uint64_t x);
	
	inline size_t length();
	inline void* base();
	const char* cString();
	void reset();	
private:
	uint8_t *alloc;
	uint8_t *end;
	uint8_t inlineStorage[kMaxLength];
};

Buffer::Buffer() {
	alloc = inlineStorage;
	end = inlineStorage + sizeof(inlineStorage);
}
/** 
 * Appends a character to the buffer
 * NB:
 * Don't use put('\0'), because the \0 may not be appended if buffer is full
 * Instead use cString() to get the zero terminated string.
 */
void Buffer::put(char c) {
	if(alloc < end){
		*alloc = uint8_t(c);++alloc;
	}
}
/** Appends some bytes to the buffer */
void Buffer::put(const char *str,size_t size) {
	if(alloc + size < end) {
		memcpy(alloc,str,size);
		alloc += size;
	}
}
/** Appends a string to the buffer */
void Buffer::put(const char *str) {
	put(str,strlen(str));
}
/** Appends a string to the buffer, replacing " with \" */
void Buffer::putEscaped(const char *str) {
	for(;str[0] !='\0';++str,++alloc){
		if(alloc >= end) break;
		if(*str != '"') *alloc = uint8_t(*str);
		else {
			*alloc = '\\';
			++alloc;
			if(alloc >= end) break;
			*alloc = '"';
		}
	}
}
/** Appends a formatted string to the buffer. */
template<typename T>
void Buffer::fmt(const char *fmt,T t) {
	char dest[64];
	put(dest,snprintf(dest, 64, fmt, t));		
}
/** Printf doesn't support 64 bit integers without platform dependent hacks */
void Buffer::fmt(uint64_t x) {
	char dest[64];
	size_t offset = 0;
	do {
		dest[offset] = char(x % 10) + '0';
		x/=10;
		++offset;
	} while(x!=0);
	if(alloc + offset < end) {
		for(;offset > 0;--offset,++alloc) {
			*alloc = dest[offset-1];
		}
	}
}
/** Returns the start of the data contained in the buffer */
inline void* Buffer::base() { return inlineStorage; }
/** Returns the size of the data contained in the buffer */
inline size_t Buffer::length() { return size_t(alloc - inlineStorage); }
/** Resets the buffer */
void Buffer::reset() { alloc = inlineStorage; }
/** Returns a zero terminated string */
const char* Buffer::cString() {
	if(alloc < end){
		*alloc = '\0';
	} else *(end - 1) = '\0';
	return (const char*)inlineStorage;
}

/**
 * Text parsing utilities.
 */
namespace text {
	
static const char *skipSpaces(const char *begin,const char *end) {
	for(;begin < end && isspace(*begin);++begin) ;
	return begin;
}
	
} // text

namespace memory {

/**
 * Arena is a block of contiguos memory.
 */
class Arena {
public:
	Arena(Service *allocator,size_t preallocate = 0);
	~Arena();
	void *allocate(size_t size);
	void reset();
	void reset(size_t offset);
	void *base() const;
	void *top() const;
	size_t remaining() const;
	size_t size() const;
	size_t capacity() const;
	void grow(size_t size);
private:
	uint8_t *alloc,*end,*begin;
	Service *allocator;
};

Arena::Arena(Service *allocator,size_t preallocate) {
	begin = preallocate > 0? 
		(uint8_t*)allocator->onMalloc(preallocate) : nullptr;
	end = begin + preallocate;
	alloc = begin;
	this->allocator = allocator;
}
Arena::~Arena() {
	if(begin) allocator->onFree(begin);
	begin = end = alloc = nullptr;
}
/** Grows the arena by size bytes */
void Arena::grow(size_t size) {
	auto capacity = size_t(end - begin) 
		+ (size < 4096? 4096 : size + 4096);
	auto sz = size_t(alloc - begin);
	auto dest = (uint8_t*)allocator->onMalloc(capacity);
	memcpy(dest,begin,sz);
	allocator->onFree(begin);
	begin = dest;end = begin + capacity;
	alloc = begin + sz;
}
/** Allocates size bytes */
void *Arena::allocate(size_t size) {
	if((alloc + size) >= end) grow(size);
	auto p = alloc;
	alloc += size;
	return p;
}
/** Resets the amount of allocated bytes to zero */
void Arena::reset() { alloc = begin; }
/** */
void Arena::reset(size_t offset) {
	assert(offset <= size());
	alloc = begin + offset;
}
/** Returns the pointer which was returned in the first allocation */
void *Arena::base() const { return begin; }
/** Returns the amount of bytes that was allocated */
size_t Arena::size() const { return size_t(alloc - begin); }
/** Returns the top pointer which will be returned in the next allocation */
void *Arena::top() const { return alloc; }
/** Returns the amount of bytes remaining which are available for allocation */
size_t Arena::remaining() const { return size_t(end - alloc); }
/** Returns the maximum amount of bytes which can be allocated */
size_t Arena::capacity() const { return size_t(end - begin); }

} // memory

} } // gamedevwebtools::core

/*----------------------------------------------------------------------
 * Tcp sockets
 */
#ifndef GAMEDEVWEBTOOLS_NO_TCP

namespace gamedevwebtools {
namespace network {
	
#ifndef GAMEDEVWEBTOOLS_PLATFORM_WIN32
	typedef int Socket;
	static GAMEDEVWEBTOOLS_CONSTEXPR 
	Socket invalidSocket() { return -1; }
#else
	typedef SOCKET Socket;
	static GAMEDEVWEBTOOLS_CONSTEXPR
	Socket invalidSocket() { return INVALID_SOCKET; }
#endif

/** The IP version protocol to use */
enum IP {
	IPvDefault,
	IPv4,
	IPv6,
};
	
/** 
 * A nonblocking socket server.
 */
class Server {
public:
	enum ErrorCode {
		ErrorNone,
		ErrorSocket,
		ErrorBind,
		ErrorAccept,
		ErrorNoConnections,
	};

	Server(IP ip = IPvDefault);
	~Server();
	void close();
	ErrorCode listen(int port);
	ErrorCode accept(Listener &listener);
	
private:
	Socket socket;
	ErrorCode error;
	IP ipv;
};

/**
 * A nonblocking socket listener.
 */
class Listener {
public:
	Listener();
	~Listener();
	void   close();
	bool   write(const void *data,size_t size);
	size_t read (void *data,size_t size);
	
protected:
	Socket socket;
	friend class Server;
};

/** */
static int osErrorCode() {
#ifdef GAMEDEVWEBTOOLS_PLATFORM_WIN32
	return WSAGetLastError();
#else
	return errno;
#endif	
}

/** Initializes the networking */
static bool init() {
#ifdef GAMEDEVWEBTOOLS_PLATFORM_WIN32
	WSADATA wsaData;
	int iResult;

	// Initialize Winsock
	iResult = WSAStartup(MAKEWORD(2,2), &wsaData);
	if (iResult != 0) {
		return false;
	}
#endif
	return true;
}
static void shutdown() {
#ifdef GAMEDEVWEBTOOLS_PLATFORM_WIN32
	WSACleanup();
#endif
}

Server::Server(IP ip) {
	error = ErrorNone;
	
	ipv = ip;
	socket = invalidSocket();
}
void Server::close() {
#ifndef GAMEDEVWEBTOOLS_PLATFORM_WIN32
	if(socket >= 0) {
		::close(socket);
	}
#else
	if(socket != invalidSocket())
		closesocket(socket);
#endif
	socket = invalidSocket();
}
Server::~Server() {
	close();
}

/** Listens at a given port */
Server::ErrorCode Server::listen(int port) {
	if(error != ErrorNone) return error;
	assert(port <= std::numeric_limits<uint16_t> :: max());
	
#ifndef GAMEDEVWEBTOOLS_PLATFORM_WIN32
	socket = ::socket(ipv == IPv6? AF_INET6 : AF_INET, SOCK_STREAM, 0);
	if(socket < 0){
		error = ErrorSocket;
		return error;
	}
	// Non-blocking, reuse, TCP nodelay
	int one = 1;
	::setsockopt(socket, SOL_SOCKET, SO_REUSEADDR, &one, sizeof(one));
	::setsockopt(socket, IPPROTO_TCP, TCP_NODELAY, &one, sizeof(one));
	auto current = ::fcntl(socket, F_GETFL);
	::fcntl(socket, F_SETFL, O_NONBLOCK | current);
	
	sockaddr_in serverAddress;
	memset(&serverAddress, 0,sizeof(serverAddress));
	serverAddress.sin_family = AF_INET;
	serverAddress.sin_addr.s_addr = INADDR_ANY;
	serverAddress.sin_port = htons(uint16_t(port));
	if (::bind(socket, (sockaddr *) &serverAddress,
		sizeof(serverAddress)) < 0) {
		error = ErrorBind;
		::close(socket);
		socket = invalidSocket();
		return error;
	}
	::listen(socket,5);
#else

	addrinfo *result = NULL, *ptr = NULL, hints;

	ZeroMemory(&hints, sizeof (hints));
	hints.ai_family = ipv == IPv6? AF_INET6 : AF_INET;
	hints.ai_socktype = SOCK_STREAM;
	hints.ai_protocol = IPPROTO_TCP;
	hints.ai_flags = AI_PASSIVE;
	
	core::Buffer portString;
	portString.fmt("%d",port);

	// Resolve the local address and port to be used by the server
	auto iResult = getaddrinfo(NULL, portString.cString(), 
		&hints, &result);
	if (iResult != 0) {
		error = ErrorSocket;
		return error;
	}
	socket = ::socket(result->ai_family, 
		result->ai_socktype, result->ai_protocol);
	
	if (socket == INVALID_SOCKET) {
		error = ErrorSocket;
		return error;
	}
	// Non-blocking, TCP nodelay
	char one = 1;
	::setsockopt(socket, IPPROTO_TCP, TCP_NODELAY, &one, sizeof(one));
	u_long iMode=1;
	ioctlsocket(socket,FIONBIO,&iMode); 
	
	iResult = ::bind(socket, result->ai_addr, 
		(int)result->ai_addrlen);
	if (iResult == SOCKET_ERROR) {
		error = ErrorBind;
		freeaddrinfo(result);		
		closesocket(socket);
		socket = invalidSocket();
		return error;
	}
	
	freeaddrinfo(result);
	
	if ( ::listen( socket, SOMAXCONN ) == SOCKET_ERROR ) {
		error = ErrorBind;
		closesocket(socket);
		socket = invalidSocket();
		return error;
	}

#endif
	return ErrorNone;
}

/** 
 * Tries to accepts a client. Returns 
 * ErrorNone if a new client was accepted or
 * ErrorNoConnections if no new clients want to connect.
 */
Server::ErrorCode Server::accept(Listener &listener) {
	if(error != ErrorNone) return error;
	
#ifndef GAMEDEVWEBTOOLS_PLATFORM_WIN32
	sockaddr_in clientAddress;
	socklen_t clientAddressLength = sizeof(clientAddress);
	
	auto con = ::accept(socket,(sockaddr *) &clientAddress,
		&clientAddressLength);	
	if(con < 0){
		auto e = errno;
		// Non blocking - no connections - return.
		if(e == EWOULDBLOCK || e == EAGAIN) return ErrorNoConnections;
#else
	// Accept a client socket
	Socket con = ::accept(socket, NULL, NULL);
	if (con == INVALID_SOCKET) {
		auto e = WSAGetLastError();
		// Non blocking - no connections - return.
		if(e == WSAEWOULDBLOCK) return ErrorNoConnections;
#endif
		// Another error - return.
		return ErrorAccept;
	}

	// Non-blocking, No SIGPIPE, TCP nodelay

#ifndef GAMEDEVWEBTOOLS_PLATFORM_WIN32
	int one = 1;
	::setsockopt(con, IPPROTO_TCP, TCP_NODELAY, &one, sizeof(one));
	//Not on linux:
	//::setsockopt(con, SOL_SOCKET, SO_NOSIGPIPE, &one, sizeof(one));
	auto current = ::fcntl(con, F_GETFL);
	::fcntl(con, F_SETFL, O_NONBLOCK | current);
#else
	char one = 1;
	::setsockopt(con, IPPROTO_TCP, TCP_NODELAY, &one, sizeof(one));
	u_long iMode=1;
	ioctlsocket(con,FIONBIO,&iMode); 
#endif
	
	listener.socket = con;
	return ErrorNone;
}

Listener::Listener() : socket(invalidSocket()) {}
Listener::~Listener() {
	close();
}
void   Listener::close() {
#ifndef GAMEDEVWEBTOOLS_PLATFORM_WIN32
	if(socket >= 0){
		::close(socket);
	}
#else
	if(socket != invalidSocket())
		closesocket(socket);
#endif
	socket = invalidSocket();
}

/** Writes bytes to the socket. */
bool Listener::write(const void *data,size_t size) {
#ifndef GAMEDEVWEBTOOLS_PLATFORM_WIN32
	assert(socket >= 0);
	
	auto n = ::send(socket,data,size,MSG_NOSIGNAL);
#else
	assert(socket != invalidSocket());
	auto n = ::send(socket, 
		(const char*)data, size, 0);
#endif
	return n > 0 && size_t(n) == size;
}
/** Reads bytes from the socket. Returns the amount of bytes read. */
size_t Listener::read (void *data,size_t size) {
	if(size > size_t(std::numeric_limits<int>::max())) return 0;
#ifndef GAMEDEVWEBTOOLS_PLATFORM_WIN32
	assert(socket >= 0);
	int n = ::read(socket, (char*) data, int(size));
#else
	assert(socket != invalidSocket());
	auto n = ::recv(socket, 
		(char*)data, int(size), 0);
#endif
	if(n < 0) return 0;
	return size_t(n);

}

} } // gamedevwebtools::network

#endif // GAMEDEVWEBTOOLS_NO_TCP

/*----------------------------------------------------------------------
 * Websockets.
 */
#ifndef GAMEDEVWEBTOOLS_NO_WEBSOCKETS

namespace gamedevwebtools {
namespace network {
namespace websocket {
	
/** Websocket protocol frame types. */
enum OpCode {
	Continuation = 0x0,
	Text         = 0x1,
	Binary       = 0x2,
	
	Close        = 0x8,
	Ping         = 0x9,
	Pong         = 0xA	
};

enum ParseState {
	ParseOk,
	ParseIncomplete,
	ParseError
};

/**
 * websocket::Server - this class is responsible for sending and recieving
 * websocket messages to and from a SINGLE client.
 * 
 * A SINGLE client limitation causes inefficiencies when sending identical
 * messages to multiple clients, 
 * but the resulting code is simpler and more self contained.
 */
class Server {
public:
	Server(Service *allocator,Listener *listener);
	
	void update();
	void write(const void *data,size_t size);
	std::pair<uint8_t*,size_t> messages();
	void close();
	bool isClosed() const;
	bool hasErrors() const;
	size_t memoryUsage() const;

	Listener *net;
private:
	enum State {
		Default,
		Error,
		WaitingForHandshake,
		Handshake,
		Closed,
	};
	
	State state;
	core::memory::Arena readBuffer; // Buffer for raw network bytes.
	core::memory::Arena wsReadBuffer; // Buffer for parsed ws messages.
	core::memory::Arena writeBuffer;
	
	ParseState onHttpHeader(const char *header,size_t headerLength,
		const char* data,size_t dataLength);
	ParseState parseHandshake(const char *begin,size_t length);
	void handshake();
	void abortConnection(int code,const char *reason);
	
	size_t emitHeader(uint8_t header[],OpCode opcode,size_t size);
	void parseData(const uint8_t *data,size_t size,bool isFinal,
		bool isMasked,uint32_t mask);
	void pong(const void *data,size_t size);
	void ws();
};

Server::Server(Service *allocator,Listener *listener)
	: readBuffer(allocator,4096), writeBuffer(allocator,4096),
	wsReadBuffer(allocator,4096)
{
	assert(allocator);
	assert(listener);
	state = WaitingForHandshake;
	net = listener;
}

bool Server::isClosed() const { return state == Closed; }
bool Server::hasErrors() const { return state == Error; }
size_t Server::memoryUsage() const {
	return readBuffer.capacity() + wsReadBuffer.capacity() + 
	writeBuffer.capacity();
}

/** Returns the data from the recieved message frames. */
std::pair<uint8_t*,size_t> Server::messages() {
	return std::make_pair((uint8_t*)wsReadBuffer.base(),wsReadBuffer.size());
}

/** Updates the connection. */
void Server::update() {
	if(state == WaitingForHandshake) handshake();
	else if(state == Default) ws();
}

/*
 * HTTP handshaking.
 */
static void base64Encode(core::Buffer &dest,const uint8_t *data,size_t length) {
	const char base64[64] = {
		'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
		'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
		'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
		'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
		'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
		'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
		'w', 'x', 'y', 'z', '0', '1', '2', '3',
		'4', '5', '6', '7', '8', '9', '+', '/' }; 
		
	size_t l3 = (length/3)*3;//Length to lowest 3.
	uint8_t c[4];
	size_t i = 0;

	for(;i<l3;i+=3){
		c[0] = data[i]>>2;
		c[1] = (data[i]<<4 | (data[i+1]>>4)) & 0x3f;
		c[2] = (data[i+1]<<2 | (data[i+2]>>6)) & 0x3f;
		c[3] = data[i+2] & 0x3f;
		dest.put(base64[c[0]]);dest.put(base64[c[1]]);
		dest.put(base64[c[2]]);dest.put(base64[c[3]]);
	}
	switch(length%3){
		case 0: break;
		case 1:
			c[0] = data[i]>>2;
			c[1] = (data[i]<<4) & 0x3f;
			dest.put(base64[c[0]]);dest.put(base64[c[1]]);
			dest.put('=');dest.put('=');
			break;
		case 2:
			c[0] = data[i]>>2;
			c[1] = (data[i]<<4 | (data[i+1]>>4)) & 0x3f;
			c[2] = (data[i+1]<<2) & 0x3f;	
			dest.put(base64[c[0]]);dest.put(base64[c[1]]);
			dest.put(base64[c[2]]);dest.put('=');
			break;		
	}
}

/** Called from parseHandshake on each HTTP header */
ParseState Server::onHttpHeader(const char *header,size_t headerLength,
	const char *data,size_t dataLength) {
	if(state != Handshake) return ParseOk;
	
	auto id = "Sec-WebSocket-Key";
	auto idLen = strlen(id);
	if(idLen == headerLength && memcmp(header,id,idLen) == 0) {
		using namespace core::text;
		
		auto begin = data;
		auto end = data+dataLength;
		begin = skipSpaces(begin,end);
		
		core::Buffer key;
		
		//Base 64 key.
		for(;begin < end && (isalnum(*begin) || 
			begin[0] == '+' || begin[0] == '/');++begin) key.put(*begin);
		if(begin < end){
			if(begin[0] == '='){ 
				key.put('=');
				++begin;
				if(begin < end && begin[0] == '=') key.put('=');
			}
		}
		
		//Websockets specification GUID.
		key.put("258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
		
		//Sha1
		SHA1Context sha;
		SHA1Reset(&sha);
		SHA1Input(&sha, (const unsigned char *) key.base(), 
			key.length());
		if (!SHA1Result(&sha)){
			return ParseError;
		}
		
		core::Buffer response;
		response.put("HTTP/1.1 101 Switching Protocols\r\n");
		response.put("Upgrade: websocket\r\n");
		response.put("Connection: Upgrade\r\n");
		response.put("Sec-WebSocket-Accept: ");
		
		//Encode in the sha1 result in base 64.
		for(int i = 0; i < 5 ; i++){
			sha.Message_Digest[i] = htonl(sha.Message_Digest[i]);
		}
		base64Encode(response,(const uint8_t*)sha.Message_Digest,20);

		response.put("\r\n\r\n");
		net->write(response.base(),response.length());
	}
	return ParseOk;
}

/** Iterate the string until : and skip : */
static ParseState skipUntilColon(const char *&begin,const char *end) {
	for(;begin < end && (begin[0] != ':');++begin) ;
	if(begin >= end) return ParseIncomplete;
	++begin;
	return ParseOk;
}
/** Iterate the string until \r\n and skip \r\n */
static ParseState skipUntilNewline(const char *&begin,const char *end) {
start:
	for(;begin < end && (begin[0] != '\r');++begin) ;
	if(begin >= end) return ParseIncomplete;
	++begin;
	if(begin >= end)  return ParseIncomplete;
	if(begin[0] != '\n') goto start;//Need more.
	++begin;
	return ParseOk;
}
/** 
 * Returns ParseOk if the first two characters in a string are
 * \r\n, ParseError if they aren't, and ParseIncomplete if the string isn't
 * long enough */
static ParseState matchNewline(const char *begin,const char *end){
	if((begin + 1) >= end) return ParseIncomplete;
	if((begin[0] == '\r') && (begin[1] == '\n')) return ParseOk;
	return ParseError;
}

/** Parses a HTTP GET request */
ParseState Server::parseHandshake(const char *begin,size_t length) {
	if(length < 6) return ParseIncomplete; //Need more data.
	
	const char* end = begin + length;
	
	if( begin[0] != 'G' || begin[1] != 'E' || begin[2] != 'T' ){
		return ParseError;
	}
	auto state = skipUntilNewline(begin,end);
	if(state != ParseOk) return state;
	state = matchNewline(begin,end);
	if(state == ParseIncomplete) return state;
	if(state == ParseOk) return ParseError; //Needs headers.
	// Headers.
	for(;;){
		//Last empty line.
		state = matchNewline(begin,end);
		if(state != ParseError) return state;
		
		auto headerStart = begin;
		state = skipUntilColon(begin,end);
		if(state != ParseOk) break; // No more headers.
		auto headerLen = size_t(begin-1 - headerStart);
		auto dataStart = begin;
		state = skipUntilNewline(begin,end);
		if(state != ParseOk) return state;
		state = onHttpHeader(headerStart,headerLen,dataStart,
			size_t(begin - 2 - dataStart));
		if(state != ParseOk) return state;
	}
	
	return ParseOk;
}
/** Sends a HTTP response to the client indicating a failure in handshaking */
void Server::abortConnection(int code,const char *reason) {
	core::Buffer response;
	response.put("HTTP/1.1 ");
	response.fmt("%d",code);
	response.put(" ");
	response.put(reason);
	response.put("\r\nContent-type: text/html\r\n\r\n");
	net->write(response.base(),response.length());
}
/** update hanshake - process the http handshake recieved from the client */
void Server::handshake() {
	if(!readBuffer.remaining()){
		readBuffer.grow(1024);
	}
	auto n = net->read(readBuffer.top(), readBuffer.remaining());
	if(n == 0 && readBuffer.size() == 0) {
		return;
	}
	readBuffer.allocate(n);
	auto parseState = parseHandshake((const char*)readBuffer.base(),
		readBuffer.size());

	if(parseState == ParseOk) {
		state = Handshake;
		// Reparse again, this time parsing the headers.
		if(parseHandshake((const char*)readBuffer.base(),
			readBuffer.size()) != ParseOk) 
		{
			state = Error;
			abortConnection(400,"Bad Request");
		}
		// Handshake complete - move to websocket state.
		else {
			readBuffer.reset();
			state = Default;
		}
	}
	else if(parseState == ParseError){
		state = Error;
		abortConnection(400,"Bad Request");
	}
}

/*
 * Websocket protocol. 
 */
enum {
	FinalFrame = 0x80 //byte 0
};
enum {
	MaskedFrame = 0x80 //byte 1
};
enum {
	// Byte 1.
	FrameU8MaxLength = 125,
	FrameU16LengthId = 126,
	FrameU64LengthId = 127
};
/** Generate a websocket message header. */
size_t Server::emitHeader(uint8_t header[],OpCode opcode,size_t size) {
	header[0] = uint8_t(opcode) | uint8_t(FinalFrame);
	if(size <= size_t(FrameU8MaxLength)) {
		header[1] = uint8_t(size);
		return 2;
	} else if(size <= size_t(std::numeric_limits<uint16_t>::max())){
		header[1] = uint8_t(FrameU16LengthId);
		auto l = htons(uint16_t(size));
		memcpy(header+2,&l,2);
		return 4;
	} else {
		//Highest bit must be 0
		assert(uint64_t(size) <= 
			uint64_t(std::numeric_limits<int64_t>::max()));
		header[1] = uint8_t(FrameU64LengthId);
		auto l = htonu64(uint64_t(size));
		memcpy(header+2,&l,8);
		return 10;
	}
}
/** Write some data using websocket protocol */
void Server::write(const void *data,size_t size) {
	uint8_t header[10];
	auto headerSize = emitHeader(header,Binary,size);

	auto dest = (uint8_t*)writeBuffer.allocate(size + headerSize);
	memcpy(dest,header,headerSize);
	memcpy(dest+headerSize,data,size);
}
/** Close the websocket connection by sending an appropriate message */
void Server::close() {
	if(state == Default){
		uint8_t header[10];
		auto size = emitHeader(header,Close,0);
		net->write(header,size);
	}
	state = Closed;
}
/** Respond to a websocket PING message */
void Server::pong(const void *data,size_t size) {
	uint8_t header[10];
	auto headerSize = emitHeader(header,Pong,size);
	net->write(header,headerSize);
	if(size) net->write(data,size);
}

struct Header {
	OpCode opcode;
	bool isFinal;
	bool isMasked;
	size_t headerLength;
	size_t payloadSize;
	uint32_t mask;
	
	inline size_t totalSize() { return headerLength + payloadSize; }
};
/** 
 * Parses the websocket message header.
 * The resulting header contains headerLength which indicates the size
 * of the message header, and payloadSize which indicates the size of the
 * data that this message stores */
static ParseState parse(Header &header,uint8_t *data,size_t size) {
	if(size < 2) return ParseIncomplete;
	
	// First byte
	auto byte = data[0];
	auto op  = byte & 0xF; //First 4 bits.
	auto rsv = (byte >> 4) & 0x7; //Next 3 bits.
	header.isFinal = (byte & uint8_t(FinalFrame)) != 0? true : false; //Last bit.
	
	// Verify
	bool isValid = 
		(op >= Continuation && op <= Binary) ||
		(op >= Close && op <= Pong);
	isValid = isValid && (rsv == 0);
	if(!isValid){
		return ParseError;
	}
	header.opcode = OpCode(op);
	
	// Second byte
	byte = data[1];
	header.isMasked = (byte & uint8_t(MaskedFrame)) != 0? true : false; //Last bit.
	byte &= 0x7F; //First 7 bits.
	
	// Decode message length
	header.headerLength = 2;
	if(byte == FrameU16LengthId){
		if(size < 4) return ParseIncomplete;
		uint16_t u16;
		memcpy(&u16,data+2,2);
		header.payloadSize = size_t(ntohs(u16));
		header.headerLength = 4;
	} else if(byte == FrameU64LengthId){
		if(size < 10) return ParseIncomplete;
		uint64_t u64;
		memcpy(&u64,data+2,8);
		if(u64 >= uint64_t(std::numeric_limits<size_t>::max())) {
			return ParseError;
		}
		header.payloadSize = size_t(ntohu64(u64));
		header.headerLength = 10;
	} else 
		header.payloadSize = size_t(byte);
	
	// Get optional mask.
	if(header.isMasked) {
		if(size < header.headerLength + 4) return ParseIncomplete;
		memcpy(&header.mask,data+header.headerLength,4);
		header.headerLength+=4;
	}
	if(size < header.headerLength + header.payloadSize) 
		return ParseIncomplete;
	
	return ParseOk;
}
/** Parses the message data */
void Server::parseData(const uint8_t *data,size_t size,bool isFinal,
	bool isMasked,uint32_t mask) 
{
	auto dest = (uint8_t*)wsReadBuffer.allocate(size);
	if(isMasked){
		uint8_t maskBytes[4];
		memcpy(maskBytes,&mask,4);
		for(size_t i = 0;i<size;++i)
			dest[i] = data[i] ^ maskBytes[i%4];
	} else {
		memcpy(dest,data,size);
	}
}

/** 
 * update WebSocket - send and recieve websocket messages 
 * via the network listener.
 * 
 * TODO: Recieving continuation frames.
 * */
void Server::ws() { 
	if(writeBuffer.size()) {
		if(!net->write(writeBuffer.base(),writeBuffer.size())) {
			state = Error;
			return;
		}
		writeBuffer.reset();
	}
	
	// Read the raw byte stream.
	while(true) {
		auto n = net->read(readBuffer.top(),readBuffer.remaining());
		if(!n) break;
		readBuffer.allocate(n);
		if(!readBuffer.remaining()) readBuffer.grow(1024);
	}
	
	// Read the message stream.
	wsReadBuffer.reset();
	auto begin = (uint8_t*)readBuffer.base();
	auto sz = readBuffer.size();
	size_t offset = 0;
	while(offset < sz) {
		Header header;
		auto state = parse(header,begin + offset,sz);
		if(state == ParseOk) {
			if(header.opcode == Binary && header.isFinal){
				parseData(begin + offset + header.headerLength,
					header.payloadSize,header.isFinal,header.isMasked,
					header.mask);
			}
			else if(header.opcode == Ping && header.isFinal){
				pong(begin + offset + header.headerLength,
				header.payloadSize);			
			}
			else if(header.opcode == Close) {
				this->state = Closed;
				readBuffer.reset();
				break;
			} else {
				offset = 0;
				readBuffer.reset();
				this->state = Error;
				break;				
			}
			offset += header.totalSize();
		} else if(state == ParseIncomplete) {
			// Keep waiting.
			break;
		} else {
			offset = 0;
			readBuffer.reset();
			this->state = Error;
			break;
		}
	}
	if(offset == sz) {
		readBuffer.reset();
	}
}

} } } // gamedevwebtools::network::websocket

#endif // GAMEDEVWEBTOOLS_NO_WEBSOCKETS

typedef uint32_t Fnv32_t;

/*
 * hash_32 - 32 bit Fowler/Noll/Vo FNV-1a hash code
 *
 * @(#) $Revision: 5.1 $
 * @(#) $Id: hash_32a.c,v 5.1 2009/06/30 09:13:32 chongo Exp $
 * @(#) $Source: /usr/local/src/cmd/fnv/RCS/hash_32a.c,v $
 *
 ***
 *
 * Fowler/Noll/Vo hash
 *
 * The basis of this hash algorithm was taken from an idea sent
 * as reviewer comments to the IEEE POSIX P1003.2 committee by:
 *
 *      Phong Vo (http://www.research.att.com/info/kpv/)
 *      Glenn Fowler (http://www.research.att.com/~gsf/)
 *
 * In a subsequent ballot round:
 *
 *      Landon Curt Noll (http://www.isthe.com/chongo/)
 *
 * improved on their algorithm.  Some people tried this hash
 * and found that it worked rather well.  In an EMail message
 * to Landon, they named it the ``Fowler/Noll/Vo'' or FNV hash.
 *
 * FNV hashes are designed to be fast while maintaining a low
 * collision rate. The FNV speed allows one to quickly hash lots
 * of data while maintaining a reasonable collision rate.  See:
 *
 *      http://www.isthe.com/chongo/tech/comp/fnv/index.html
 *
 * for more details as well as other forms of the FNV hash.
 ***
 *
 * To use the recommended 32 bit FNV-1a hash, pass FNV1_32A_INIT as the
 * Fnv32_t hashval argument to fnv_32a_buf() or fnv_32a_str().
 *
 ***
 *
 * Please do not copyright this code.  This code is in the public domain.
 *
 * LANDON CURT NOLL DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE,
 * INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO
 * EVENT SHALL LANDON CURT NOLL BE LIABLE FOR ANY SPECIAL, INDIRECT OR
 * CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF
 * USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 * OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THIS SOFTWARE.
 *
 * By:
 *	chongo <Landon Curt Noll> /\oo/\
 *      http://www.isthe.com/chongo/
 *
 * Share and Enjoy!	:-)
 */

/*
 * 32 bit FNV-1 and FNV-1a non-zero initial basis
 *
 * The FNV-1 initial basis is the FNV-0 hash of the following 32 octets:
 *
 *              chongo <Landon Curt Noll> /\../\
 *
 * NOTE: The \'s above are not back-slashing escape characters.
 * They are literal ASCII  backslash 0x5c characters.
 *
 * NOTE: The FNV-1a initial basis is the same value as FNV-1 by definition.
 */
#define FNV1_32_INIT ((Fnv32_t)0x811c9dc5)
#define FNV1_32A_INIT FNV1_32_INIT

/*
 * 32 bit magic FNV-1a prime
 */
#define FNV_32_PRIME ((Fnv32_t)0x01000193)

/*
 * fnv_32a_str - perform a 32 bit Fowler/Noll/Vo FNV-1a hash on a string
 *
 * input:
 *	str	- string to hash
 *	hval	- previous hash value or 0 if first call
 *
 * returns:
 *	32 bit hash as a static hash type
 *
 * NOTE: To use the recommended 32 bit FNV-1a hash, use FNV1_32A_INIT as the
 *  	 hval arg on the first call to either fnv_32a_buf() or fnv_32a_str().
 */
Fnv32_t
fnv_32a_str(const char *str, Fnv32_t hval)
{
    const unsigned char *s = (const unsigned char *)str;	/* unsigned string */

    /*
     * FNV-1a hash each octet in the buffer
     */
    while (*s) {

	/* xor the bottom with the current octet */
	hval ^= (Fnv32_t)*s++;

	/* multiply by the 32 bit FNV magic prime mod 2^32 */
	hval *= FNV_32_PRIME;
    }

    /* return our new hash value */
    return hval;
}

/*----------------------------------------------------------------------
 * A Robin hood hashing table
 */
namespace gamedevwebtools {
namespace core {

class HashTable {
public:
enum {
	kInitialCapacity = 256, //Should be a power of two
	kLoadFactorPercentage = 90,
	kInvalidIndex = 0xFFFFFFFF,
};
enum {
	kInvalidValue = 0xFFFFFFFF
};
private:
 
struct Element {
	uint32_t hash;
	uint32_t value;
	const char *key;
};

Element *buffer;
uint32_t capacity;
uint32_t resizeThreshold;
uint32_t mask;
uint32_t size;
Service *allocator;

static uint32_t hashKey(const char *key) {
	auto h = fnv_32a_str(key,FNV1_32A_INIT);
	// MSB is used to indicate a deleted element
	h &= 0x7fffffff;
	// Dont return a zero hash.
	h |= h == 0? 1 : 0;
	return h;
}

static bool isDeleted(uint32_t hash) {
	// MSB set indicates that this hash is a "tombstone"
	return (hash >> 31) != 0;	
}

inline uint32_t desiredPosition(uint32_t hash) const {
	return hash & mask;
}

uint32_t probeDistance(uint32_t hash, uint32_t slotIndex) const {
	return (slotIndex + capacity - desiredPosition(hash)) & mask;
}
 
// alloc buffer according to currently set capacity
void alloc() {	
	buffer = (Element*)(allocator->onMalloc(capacity*sizeof(Element)));
	for(uint32_t i = 0; i < capacity; ++i) 
		buffer[i].hash = 0;
	resizeThreshold = (capacity * kLoadFactorPercentage) / 100;
	mask = capacity - 1;
}

void grow() {
	auto old = buffer;
	auto oldCapacity = capacity;
	capacity*=2;
	alloc();
	// Rehash the old entries.
	for(uint32_t i = 0; i < oldCapacity; ++i) {
		auto hash = old[i].hash;
		if(hash != 0 && !isDeleted(hash))
			insertHelper(hash,old[i].key,old[i].value);
	}
	allocator->onFree(old);
}

void insertHelper(uint32_t hash, const char *key, uint32_t value) {
	auto pos = desiredPosition(hash);
	uint32_t dist = 0;
	for(;;) {
		auto elemHash = buffer[pos].hash;
		if(elemHash == 0) {
			buffer[pos].hash = hash;
			buffer[pos].value = value;
			buffer[pos].key = key;
			return;
		}

		// If the existing elem has probed less than us, then swap places with existing
		// elem, and keep going to find another slot for that elem.
		int existingElemProbeDistance = probeDistance(elemHash, pos);
		if (existingElemProbeDistance < dist) {
			if(isDeleted(elemHash)) {
				buffer[pos].hash = hash;
				buffer[pos].value = value;
				buffer[pos].key = key;
				return;				
			}
			//Swap
			buffer[pos].hash = hash; hash = elemHash;
			elemHash = buffer[pos].value;
			buffer[pos].value = value; value = elemHash;
			dist = existingElemProbeDistance;
			auto oldKey = buffer[pos].key;
			buffer[pos].key = key; key = oldKey;
		}

		pos = (pos+1) & mask;
		++dist;
	}
}

uint32_t lookupIndex(const char *key) const {
	const uint32_t hash = hashKey(key);
	auto pos = desiredPosition(hash);
	uint32_t dist = 0;
	for(;;) {
		if(buffer[pos].hash == 0) 
			return kInvalidIndex;
		else if(dist > probeDistance(buffer[pos].hash, pos))
			return kInvalidIndex;
		else if(buffer[pos].hash == hash && !strcmp(buffer[pos].key,key))
			return pos;
			
		pos = (pos+1) & mask;
		++dist;
	}
	return kInvalidIndex;
}
 
 
public:

HashTable(Service *allocator)
: buffer(nullptr), size(0), capacity(kInitialCapacity) {
	this->allocator = allocator;
	alloc();
}

~HashTable() {
	if(buffer) allocator->onFree(buffer);
}

void insert(const char *key, uint32_t value) {
	size+=1;
	if(size >= resizeThreshold) grow();
	insertHelper(hashKey(key),key,value);
}

const uint32_t find(const char *key) {
	auto idx = lookupIndex(key);
	return idx != kInvalidIndex? buffer[idx].value : kInvalidValue;
}

void remove(const char *key) {
	auto idx = lookupIndex(key);
	if(idx == kInvalidIndex) return;
	buffer[idx].hash |= 0x80000000; // Mark as deleted.
	size-=1;
}

size_t memoryUsage() const {
	return capacity*sizeof(Element);
}

};

} } // gamedevwebtools::core

/*----------------------------------------------------------------------
 * Actual tooling service. 
 */
namespace gamedevwebtools {

Message::Message(const char *type,const Field *fields,size_t count) {
	this->name = type;this->fieldArray = fields;this->length = count;
}
Message::Message(const char *type) {
	this->name = type;this->fieldArray = nullptr;this->length = 0;
}
Message::Message(const char *type,const Field &a) {
	this->name = type;this->fieldArray = inlineStorage;this->length = 1;
	inlineStorage[0] = a;
}
Message::Message(const char *type,const Field &a,const Field &b) {
	this->name = type;this->fieldArray = inlineStorage;this->length = 2;
	inlineStorage[0] = a;inlineStorage[1] = b;
}
Message::Message(const char *type,const Field &a,const Field &b,
	const Field &c) {
	this->name = type;this->fieldArray = inlineStorage;this->length = 3;
	inlineStorage[0] = a;inlineStorage[1] = b;inlineStorage[2] = c;
}

/**
 * The messaging service uses double buffering to send messages.
 */
Service::Service() {
	threadMessageBackBuffers = threadMessageBuffers = nullptr;
	server = nullptr;
	clients = nullptr;
	clientCount = 0;
	activeClientCount = 0;
	threadCount = 0;
	active_ = false;
	memusage = 0;
}

void Service::init(
	const ApplicationInformation &appInfo,
	const NetworkOptions &netOptions,
	size_t threadCount) 
{
	if(threadCount < 1){
		assert(false && "Thread count must be at least 1!");
		threadCount = 1;
	}
	this->threadCount = threadCount;
	
	//Get the thread message buffers.
	
	threadMessageBuffers = (core::memory::Arena*)
		onMalloc(sizeof(core::memory::Arena)*threadCount);
	threadMessageBackBuffers = (core::memory::Arena*)
		onMalloc(sizeof(core::memory::Arena)*threadCount);
	auto initialSize = netOptions.threadMessageBufferInitialSize;
	assert(initialSize > 0);
	for(size_t i = 0;i <  threadCount;++i) {
		new(threadMessageBuffers + i) 
			core::memory::Arena(this,initialSize);
		new(threadMessageBackBuffers + i) 
			core::memory::Arena(this,initialSize);
	}
	
	messageTypeMapping =
		new(onMalloc(sizeof(core::HashTable))) core::HashTable(this);
	messageHandlers =
		new(onMalloc(sizeof(core::memory::Arena))) core::memory::Arena(this,4096);
	
	assert(netOptions.maxConnectedClients > 0);
	
	netInit = netOptions.initializeSystemLibraries;
	if(netInit)
		network::init();
	
	// Create a networking server.
	server = new(onMalloc(sizeof(network::Server)))
		network::Server(netOptions.ipv6? network::IPv6 : network::IPvDefault);
		
	// Allocate networking clients.
	clientCount = netOptions.maxConnectedClients;
	activeClientCount = 0;
	clients = (network::Listener*)onMalloc(
		sizeof(network::Listener)*clientCount);
#ifndef GAMEDEVWEBTOOLS_NO_WEBSOCKETS
	wsclients = (network::websocket::Server*)onMalloc(
		sizeof(network::websocket::Server)*clientCount);
#endif
	
	info = appInfo;
	
	// Start listening.
	auto port = netOptions.port;
	auto result = server->listen(port);
	if(result != network::Server::ErrorNone) {
		core::Buffer str;
		str.put("The network server failed to listen on port ");
		str.fmt("%d",port);
		str.put(" - error code: ");
		str.fmt("%d",int(result));
		str.put(", OS error code: ");
		str.fmt("%d",network::osErrorCode());
		onError(str.cString());
		active_ = false;
	} else active_ = true;
	
	// Block until the first client connects.
	if(active_ && netOptions.blockUntilFirstClient) {
		while(!checkForNewClient()) ;//Wait.
	}
}

Service::~Service() {
	assert(threadCount > 0 && "gamedevwebtools::Service wasn't initialized!");
	
	for(size_t i = 0;i < activeClientCount;++i) {
#ifndef GAMEDEVWEBTOOLS_NO_WEBSOCKETS
		wsclients[i].~Server();
#endif
		clients[i].~Listener();
	}
	server->~Server();
	
	for(size_t i = 0;i < threadCount;++i) {
		threadMessageBackBuffers[i].~Arena();
		threadMessageBuffers[i].~Arena();
	}
	
	messageTypeMapping->~HashTable();
	messageHandlers->~Arena();
	onFree(messageTypeMapping);
	onFree(messageHandlers);
	
	activeClientCount = 0;
#ifndef GAMEDEVWEBTOOLS_NO_WEBSOCKETS
	onFree(wsclients);
#endif
	onFree(clients);
	onFree(server);
	onFree(threadMessageBackBuffers);
	onFree(threadMessageBuffers);
	
	if(netInit)
		network::shutdown();
}

/** Checks for new incoming connections and accepts the new client */
bool Service::checkForNewClient() {
	if(activeClientCount < clientCount){
		//Check for new connections.
		new(clients+activeClientCount) network::Listener();
		auto result = server->accept(clients[activeClientCount]);
		if(result == network::Server::ErrorNone){
#ifndef GAMEDEVWEBTOOLS_NO_WEBSOCKETS
			new(wsclients + activeClientCount) 
				network::websocket::Server(this,
					clients + activeClientCount);
#endif
			activeClientCount++;
			send(Message("application.information",
				Message::Field("name",info.name),
				Message::Field("threadCount",threadCount)));
			onNewClient();
			return true;
		} else {
			clients[activeClientCount].~Listener();
			if(result != network::Server::ErrorNoConnections){
				onError("The network server failed to accept a new"
					"connection");
			}
		}
	}
	return false;	
}

/** 
 * Removes a client from the client array 
 * and releases the networking resources for that client */
void Service::removeClient(size_t i) {
	assert(i < activeClientCount);

#ifndef GAMEDEVWEBTOOLS_NO_WEBSOCKETS
	wsclients[i].~Server();
#endif
	clients[i].~Listener();
	
	// Move the array elements.
	for(auto j = i+1;j<activeClientCount;++j){
#ifndef GAMEDEVWEBTOOLS_NO_WEBSOCKETS
		memcpy(&wsclients[j-1],&wsclients[j],
			sizeof(network::websocket::Server));
		// NB: Patch the listener pointer.
		wsclients[j-1].net = &clients[j-1];
#endif
		memcpy(&clients[j-1],&clients[j],sizeof(network::Listener));
	}
	activeClientCount--;
}

size_t Service::computeMemoryUsage() {
	size_t size =
		sizeof(core::memory::Arena)*threadCount*2 +
		sizeof(network::Listener)*clientCount + 
		sizeof(network::Server) +
#ifndef GAMEDEVWEBTOOLS_NO_WEBSOCKETS
		sizeof(network::websocket::Server)*clientCount;
#else
		0;
#endif
	for(size_t i = 0;i < threadCount;++i) {
		size += threadMessageBuffers[i].capacity();
		size += threadMessageBackBuffers[i].capacity();
	}
	size += messageTypeMapping->memoryUsage();
	size += messageHandlers->capacity();
	for(size_t i = 0;i < activeClientCount;++i) 
		size += wsclients[i].memoryUsage();
	return size;
}

void Service::frameStart(double frameTime) {
	if(!active_) return;
	
	//Swap the buffers.
	auto back = threadMessageBackBuffers;
	threadMessageBackBuffers = threadMessageBuffers;
	threadMessageBuffers = back;
	
	auto memoryUsage = computeMemoryUsage();
	if(memusage != memoryUsage) {
		memusage = memoryUsage;
		send(Message("monitoring.memory",
			Message::Field("name","gamedevwebtools"),
			Message::Field("t",frameTime),
			Message::Field("size",memusage)));
	}
}

void Service::update() {
	checkForNewClient();
	
	// Write the thread message buffers.
	for(size_t i = 0;i < threadCount;++i) {
		auto begin = threadMessageBackBuffers[i].base();
		auto size  = threadMessageBackBuffers[i].size();
		
		for(size_t j = 0;j < activeClientCount;++j) {
#ifndef GAMEDEVWEBTOOLS_NO_WEBSOCKETS
			wsclients[j].write(begin,size);
#else
			// Transport messages over TCP.
			clients[j].write(begin,size);
#endif
		}
		threadMessageBackBuffers[i].reset();
	}
	
#ifndef GAMEDEVWEBTOOLS_NO_WEBSOCKETS
	// Transport messages over Websockets.
	for(size_t i = 0; i < activeClientCount; ++i) {
		wsclients[i].update();
		if(wsclients[i].hasErrors()){
			core::Buffer str;
			str.put("A websocket connection has "
				"encountered a protocol error and has to be shutdown");
			onError(str.cString());
			wsclients[i].close();
		} else {
			auto msg = wsclients[i].messages();
			recieve(msg.first,msg.second);
		}
	}
	for(size_t i = 0; i < activeClientCount; ++i){
		if(wsclients[i].isClosed()) {
			removeClient(i);
			break;
		}
	}
#endif
}

void *Service::onMalloc(size_t size) {
	return ::malloc(size);
}
void Service::onFree(void *ptr) {
	::free(ptr);
}

/* Send a message. */
void Service::send(const Message &message) {
	send(message,nullptr,0);
}
void Service::send(const Message &message,const void *data,const size_t
	dataSize) 
{
	if(!active_) return;
	
	core::Buffer dest;
    dest.put("{\"type\":\"");
    dest.putEscaped(message.name);
    dest.put('"');
    for(size_t i = 0;i<message.length;++i) {
		auto field = message.fieldArray[i];
		dest.put(",\"");
		dest.putEscaped(field.id);
		dest.put("\":");
		switch(field.type) {
		case Message::Field::t_boolean:
			dest.put(field.value.boolean? "true": "false");
			break;
		case Message::Field::t_i32:
			dest.fmt("%d",field.value.i32);
			break;
		case Message::Field::t_isz:
			dest.fmt(uint64_t(field.value.isz));
			break;
		case Message::Field::t_f64:
			dest.fmt("%g",field.value.f64);
			break;
		case Message::Field::t_cstr:
			dest.put('"');
			dest.putEscaped(field.value.cstr);
			dest.put('"');
			break;
		case Message::Field::t_ptr:
			dest.put('"');
			dest.fmt("%p",field.value.ptr);
			dest.put('"');
			break;
		}
	}
	if(dataSize) {
		 dest.put(",\"dataSize\":");
		 dest.fmt(uint64_t(dataSize));
	}
	dest.put('}');
	send((const uint8_t*)dest.base(),dest.length(),dataSize,data);		
}

void Service::send(const uint8_t *data,size_t size,size_t binaryDataSize,
	const void *binaryData) 
{	
	assert(size <= 0xFFFF);
	
	// Compute total size.
	auto totalSize = size + 2;
	
	// Allocate the memory for the message.
	auto threadId = currentThreadId();
	assert(threadId < threadCount); //Enforce the threadId contract.
	auto dest = 
		(uint8_t*)threadMessageBuffers[threadId].allocate(totalSize+binaryDataSize);
	
	// Header - little endian.
	dest[0] = uint8_t(size&0xFF);
	dest[1] = uint8_t((size/256)&0xFF);
	// Write the message.
	memcpy(dest+2,data,size);
	if(binaryDataSize)
		memcpy(dest+2+size,binaryData,binaryDataSize);
}
size_t Service::currentThreadId() const {
	return 0;
}

/* Recieve a message */
static void parsingError(Service *self,const char *error){
	core::Buffer buffer;
	buffer.put("JSON parsing error: ");
	buffer.put(error);
	self->onError(buffer.cString());
}

static bool expect(const char *begin,const char *end,Service *self,char c){
	if(begin < end && begin[0] == c) return true;
	core::Buffer error;
	error.put("expected a character '");
	error.put(c);
	if(begin < end){
		error.put("' instead of '");
		error.put(begin[0]);
	}
	error.put("'");
	parsingError(self,error.cString());
	return false;
}
static bool match(const char *begin,const char *end,char c){
	return begin < end && begin[0] == c;
}
static bool match(const char *begin,const char *end,const char *str,size_t len) {
	if((begin + len) <= end){
		return !memcmp(begin,str,len);
	}
	return false;
}
static bool isEscapeChar(char c) {
	return c == '"' || c == '\\' || c == '/' || c == 'b' || c == 'f' ||
	c == 'n' || c == 'r' || c == 't';
}
/* NB - doesn't support \u */
static char decodeEscapeSequence(char c) {
	switch(c){
	case 'b': return '\b';
	case 'f': return '\f';
	case 'n': return '\n';
	case 'r': return '\r';
	case 't': return '\t';
	}
	//'"', '\', '/'
	return c;
}
static char* parseString(char *begin,const char *end,const char *&str) {
	bool zeroTerminated = false;
	bool needsEscaping = false;
	auto dest = begin+1;
	str = dest;
	for(++begin;begin < end;++begin){
		auto c = *begin;
		if(c == '"'){
			*begin = '\0';//Zero terminate.
			++begin;
			zeroTerminated = true;
			break;
		} else if(c == '\\' &&
			(begin+1) < end && isEscapeChar(*(begin+1)))
		{
			++begin;
			needsEscaping = true;
		}
	}
	if(!zeroTerminated) {
		if(dest < end) *dest = '\0';
		else {
			dest = dest - 1;
			*dest = '\0';
			str = dest; //NB: important to return a valid pointer.
			return begin;
		}
	}
	if(!needsEscaping) return begin;
	
	// Escape sequences.
	for(auto src = dest;*src != '\0';++src,++dest) {
		auto c = *src;
		if(c == '\\' && isEscapeChar(*(src+1))) {
			++src;
			*dest = decodeEscapeSequence(*src);
		}
		else *dest = c;
	}
	*dest = '\0';
	
	return begin;
}
static double setExponent(double x,int32_t exponent) {
	union bin64 {
		double real;
		uint64_t bits;
	};
	bin64 value;
	value.real = x;
	value.bits = (value.bits & (~0X7FF0000000000000ULL)) | //clear exp
		(uint64_t(exponent + 1023) << uint64_t(52));
	return value.real;
}
static char* parseNumber(Service *self, char *begin,
	const char *end, const char *keyStr, Message::Field &result) 
{
	int32_t integer = 0;
	enum {
		Negative = 1, Frac = 2, Exp = 4, NegativeExp = 8
	};
	uint32_t state = 0;
	if(*begin == '-'){
		state = Negative;
		++begin;
	}
	if(begin >= end){
		parsingError(self,"Expecting a digit after '-'");
		return begin;
	}
	for(;begin<end;++begin){
		if(isdigit(*begin)){
			integer = (*begin - '0') + integer * 10;
			continue;
		} else if(*begin == '.') 
			state |= Frac;
		else if(*begin == 'e' || *begin == 'E') 
			state |= Exp;
		break;
	}
	if(state & Negative) integer = -integer;
	if((state & (Frac|Exp)) == 0){
		result = Message::Field(keyStr,integer);
		return begin;
	}
	
	++begin;
	double real = double(integer);
	if(state & Frac) {
		if(begin >= end) {
			parsingError(self,"Expecting a digit after '.'");
			return begin;			
		}
		for(double scale = 0.1;begin<end;++begin, scale *= 0.1){
			if(isdigit(*begin)){
				real += double(*begin - '0') * scale;
				continue;
			}
			else if(*begin == 'e' || *begin == 'E') {
				++begin;
				state |= Exp;
			}
			break;
		}
	}
	if(state & Exp) {
		integer = 0;
		if(begin >= end) {
			parsingError(self,"Expecting a digit or '+'/'-' after 'e'/'E'");
			return begin;
		}
		if(*begin == '+') ++begin;
		else if(*begin == '-') {
			state |= NegativeExp;
			++begin;
		}
		for(;begin<end && isdigit(*begin);++begin){
			integer = (*begin - '0') + integer * 10;
		}
		real = setExponent(real, state & NegativeExp? -integer : integer);
	}
	result = Message::Field(keyStr,real);
	return begin;
}

static char *skipSpaces(char *begin,const char *end) {
	for(;begin < end && isspace(*begin);++begin) ;
	return begin;
}

struct ParseResult {
	enum { kMaxFields = 32 };
	
	const char *type;
	size_t count;
	Message::Field *fields;
	size_t binaryDataSize;
};
/** 
 * Parses a single JSON object.
 * Doesn't support arrays or embedded objects.
 * Doesn't support \u string escape sequence.
 */
static void parseJSON(Service *self, ParseResult &result, 
	char *message, size_t size)
{
	const char *end = message + size;
	result.count = 0;
	
	// Starting '{'
	auto begin = skipSpaces(message,end);
	if(!expect(begin,end,self,'{')) return;
	++begin;
	
	const char *type = nullptr;
	// Object
	for(int field = 0;begin < end;++field){
		
		// Key
		begin = skipSpaces(begin,end);
		if(field != 0) {
			if(!match(begin,end,',')) break;
			++begin;
			begin = skipSpaces(begin,end);
		}
		if(!expect(begin,end,self,'"')) return;
		const char *keyStr;
		begin = parseString(begin,end,keyStr);
		begin = skipSpaces(begin,end);
		if(!expect(begin,end,self,':')) return;
		++begin;
		
		// Value
		if(result.count >= ParseResult::kMaxFields) {
			parsingError(self,"JSON object has too many fields");
			return;
		}
		begin = skipSpaces(begin,end);
		if(match(begin,end,'"')) {
			const char *valueStr;
			begin = parseString(begin,end,valueStr);
			
			if(keyStr[0] == 't' && keyStr[1] == 'y' && keyStr[2] == 'p' &&
			   keyStr[3] == 'e') type = valueStr;
			else {
				result.fields[result.count] = 
					Message::Field(keyStr,valueStr);
				result.count++;
			}
		} else if(begin < end && (isdigit(begin[0]) || begin[0] == '-')) {
			begin = parseNumber(self, begin, end, keyStr, 
				result.fields[result.count]);
			result.count++;
		} else if(match(begin,end,"true",4)) {
			begin+=4;
			result.fields[result.count] = Message::Field(keyStr,true);
			result.count++;
		} else if(match(begin,end,"false",5)) {
			begin+=5;
			result.fields[result.count] = Message::Field(keyStr,false);
			result.count++;
		} else if(match(begin,end,"null",4)) 
			begin+=4; //Do nothing
		else {
			if(match(begin,end,'[') || match(begin,end,'{')) 
				parsingError(self,"Can't parse JSON array/object");
			else
				parsingError(self,"Invalid JSON");
			return;
		}
	}
	begin = skipSpaces(begin,end);
	if(!expect(begin,end,self,'}')) return;	
	//No errors.
	result.type = type;
}

typedef void (*BindingDispatchFunction)(const void *,const Message &);

size_t Service::parse(char *message,size_t size) {
	Message::Field fields[ParseResult::kMaxFields];
	ParseResult result;
	result.type = nullptr;
	result.fields = fields;
	result.binaryDataSize = 0;
	parseJSON(this, result, message, size);
	if(!result.type) return result.binaryDataSize;
		
	Message resultMsg(result.type,result.fields,result.count);
	
	auto handler = messageTypeMapping->find(result.type);
	if(handler != core::HashTable::kInvalidValue) {
		auto base = (uint8_t*)messageHandlers->base();
		(*((BindingDispatchFunction*)(base+handler))) (
			base + handler + sizeof(BindingDispatchFunction),resultMsg);
	}
	return result.binaryDataSize;
}

void Service::recieve(uint8_t *data,size_t size) {
	while(size){
		if(size < 2) break;
		size_t headerSize = size_t(data[0]) + size_t(data[1])*256;
		data+=2;size-=2;
		if(size < headerSize) break;
		auto binaryDataSize = parse((char*)data,headerSize);
		if(size < (headerSize + binaryDataSize)) break;
		headerSize+=binaryDataSize;
		data+=headerSize;
		size-=headerSize;
	}
}

struct FunctionCallback {
	void (*function)();
};
struct FunctionDataCallback {
	void (*function)(void *);
	void *data;
};
struct FunctionMsgCallback {
	void (*function)(const Message &);
};
struct FunctionDataMsgCallback {
	void (*function)(void *, const Message &);
	void *data;
};

static void dispatchFunction(const void *data,const Message &msg) {
	((const FunctionCallback*)data)->function ();
}
static void dispatchFunctionData(const void *data,const Message &msg) {
	auto self = ((const FunctionDataCallback*)data);
	self->function (self->data);
}
static void dispatchFunctionMsg(const void *data,const Message &msg) {
	((const FunctionMsgCallback*)data)->function (msg);
}
static void dispatchFunctionDataMsg(const void *data,const Message &msg) {
	auto self = ((const FunctionDataMsgCallback*)data);
	self->function (self->data, msg);
}

static uint32_t handlerOffset(const core::memory::Arena *arena) {
	auto offset = arena->size();
	assert(offset < size_t(core::HashTable::kInvalidValue));
	return uint32_t(offset);
}

void Service::safeInsert(core::HashTable *hash,const char *key){
	auto value = handlerOffset(messageHandlers);
	if(hash->find(key) == core::HashTable::kInvalidValue) {
		hash->insert(key, value);
		return;
	}
	core::Buffer buffer;
	buffer.put("Can't connect to '");
	buffer.put(key);
	buffer.put("' - this message type is already taken.");
	onError(buffer.cString());
}

void Service::connect(const char *messageType, 
	void (*function)()) 
{
	safeInsert(messageTypeMapping,messageType);
	auto f = (BindingDispatchFunction*)
		messageHandlers->allocate(sizeof(BindingDispatchFunction));
	auto args = (FunctionCallback*)
		messageHandlers->allocate(sizeof(FunctionCallback));
	*f = &dispatchFunction;
	args->function = function;
}
void Service::connect(const char *messageType, 
	void (*function)(void *userData), void *data) 
{
	safeInsert(messageTypeMapping,messageType);
	auto f = (BindingDispatchFunction*)
		messageHandlers->allocate(sizeof(BindingDispatchFunction));
	auto args = (FunctionDataCallback*)
		messageHandlers->allocate(sizeof(FunctionDataCallback));
	*f = &dispatchFunctionData;
	args->function = function;
	args->data = data;
}
void Service::connect(const char *messageType, 
	void (*function)(const Message &message))
{
	safeInsert(messageTypeMapping,messageType);
	auto f = (BindingDispatchFunction*)
		messageHandlers->allocate(sizeof(BindingDispatchFunction));
	auto args = (FunctionMsgCallback*)
		messageHandlers->allocate(sizeof(FunctionMsgCallback));
	*f = &dispatchFunctionMsg;
	args->function = function;	
}
void Service::connect(const char *messageType, 
	void (*function)(void *userData, const Message &message), void *data)
{
	safeInsert(messageTypeMapping,messageType);
	auto f = (BindingDispatchFunction*)
		messageHandlers->allocate(sizeof(BindingDispatchFunction));
	auto args = (FunctionDataMsgCallback*)
		messageHandlers->allocate(sizeof(FunctionDataMsgCallback));
	*f = &dispatchFunctionDataMsg;
	args->function = function;
	args->data = data;	
}
void Service::methodConnect(void (*dispatch)(const void *,const Message &),
	const void *callback,size_t callbackSize) 
{
	auto f = (BindingDispatchFunction*)
		messageHandlers->allocate(sizeof(BindingDispatchFunction));
	auto args = messageHandlers->allocate(callbackSize);
	*f = dispatch;
	memcpy(args,callback,callbackSize);
}

/* Default handlers */
void Service::onError(const char *errorString) {
	printf("gamedevwebtools::onError - %s\n",errorString);
}
void Service::onNewClient() {
}

} // gamedevwebtools
