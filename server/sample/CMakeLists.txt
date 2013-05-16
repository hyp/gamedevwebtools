cmake_minimum_required(VERSION 2.6)

project(gamedevwebtools-server-sample)

if(NOT MSVC)
	add_definitions(-std=c++0x)
endif()
add_executable(sample sample.cpp ../gamedevwebtools.cpp)
target_link_libraries(sample SDL2)
