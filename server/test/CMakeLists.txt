cmake_minimum_required(VERSION 2.6)

project(gamedevwebtools-server-test)

if(NOT MSVC)
	add_definitions(-std=c++0x)
endif()
add_executable(test test.cpp)
