#include <stdio.h>
#include "../gamedevwebtools.cpp"

/**
 * Some basic unittests.
 */
int main() {
	printf("Running unittests\n");
	//64 bit hton/ntoh
	{
		uint64_t x = 0xB00B5000DEADBEEFULL;
#ifndef GAMEDEVWEBTOOLS_PLATFORM_BIG_ENDIAN
		assert(htonu64(x) == 0xEFBEADDE00500BB0ULL);
#endif
		assert(x == ntohu64(htonu64(x)));
	}
	
	//Buffer
	{
		using namespace gamedevwebtools::core;
		
		Buffer string;
		string.put("Hello world!");
		assert(string.length() == strlen("Hello world!"));
		assert(!strcmp(string.cString(),"Hello world!"));
		string.reset();
		assert(string.length() == 0);
		string.put('A');
		assert(string.length() == 1);
		assert(((char*)string.base())[0] == 'A');
		string.reset();
		string.fmt("%d",42);
		assert(!strcmp(string.cString(),"42"));
		string.reset();
		string.fmt(uint64_t(123456789123));
		assert(!strcmp(string.cString(),"123456789123"));
		string.reset();
		string.putEscaped("A \"string\"");
		assert(!strcmp(string.cString(),"A \\\"string\\\""));
	}
	
	//memory
	{
		using namespace gamedevwebtools::core::memory;
				
		class MallocAllocator : public gamedevwebtools::Service {
		public:
			int count;
			
			MallocAllocator() : count(0) {}
			void *onMalloc(size_t size) override {
				++count;
				return malloc(size);
			}
			void onFree(void *p) override {
				--count;
				return free(p);
			}
		};
		
		// Don't initialize, use only onMalloc and onFree, don't delete
		// so the destructor won't be called.
		auto alloc = new MallocAllocator;
		{
			Arena arena(alloc,4096);
			assert(alloc->count == 1);
			assert(arena.size() == 0);
			assert(arena.remaining() == 4096);
			assert(arena.base() == arena.top());
			
			auto p = arena.allocate(128);
			assert(arena.base() == p);
			assert(arena.size() == 128);
			assert(arena.remaining() == 4096 - 128);
			assert(alloc->count == 1);
			
			p = arena.allocate(4096);
			assert(arena.size() == 4096 + 128);
			assert(alloc->count == 1);
			
			arena.reset();
			assert(arena.size() == 0);
			assert(arena.base() == arena.top());
		}
		assert(alloc->count == 0);
	}
	
	//text
	{
		using namespace gamedevwebtools::core::text;
		
		auto str = "  Ab05cd \n\r\t35";
		auto begin = str;
		auto end = begin + strlen(begin);
		begin = skipSpaces(begin,end);
		assert(begin == str + 2);
	}
	
	//Base64.
	{
		using namespace gamedevwebtools::network::websocket;
		
		gamedevwebtools::core::Buffer result;
		auto str = "Man is distinguished, not only by his reason, "
			"but by this singular passion from other animals, "
			"which is a lust of the mind, "
			"that by a perseverance of delight in the continued and "
			"indefatigable generation of knowledge, "
			"exceeds the short vehemence of any carnal pleasure.";
		base64Encode(result,(const uint8_t*)str,strlen(str));
		assert(strcmp(result.cString(),
			"TWFuIGlzIGRpc3Rpbmd1aXNoZWQsIG5vdCBvbmx5IGJ5IGhpcyByZWFzb24sIGJ1dCBieSB0aGlz"
			"IHNpbmd1bGFyIHBhc3Npb24gZnJvbSBvdGhlciBhbmltYWxzLCB3aGljaCBpcyBhIGx1c3Qgb2Yg"
			"dGhlIG1pbmQsIHRoYXQgYnkgYSBwZXJzZXZlcmFuY2Ugb2YgZGVsaWdodCBpbiB0aGUgY29udGlu"
			"dWVkIGFuZCBpbmRlZmF0aWdhYmxlIGdlbmVyYXRpb24gb2Yga25vd2xlZGdlLCBleGNlZWRzIHRo"
			"ZSBzaG9ydCB2ZWhlbWVuY2Ugb2YgYW55IGNhcm5hbCBwbGVhc3VyZS4=") == 0); 
	}
	printf("Done\n");
	return 0;
}
