#pragma once
#include <stdint.h>

/** A small SDL compability layer */
#include <windows.h>
#define SDL_INIT_VIDEO 0
#define SDL_WINDOWPOS_CENTERED 0
#define SDL_WINDOW_SHOWN 0
void SDL_Quit() {
}
void SDL_Init(int) {
}
int SDL_CreateWindow(const char*,int,int,int,int,int) {
	return 1;
}
void SDL_DestroyWindow(int) {
}
uint64_t SDL_GetPerfomanceCounter () {
	uint64_t result;
	QueryPerformanceCounter((LARGE_INTEGER*)&result);
	return result;
}
uint64_t SDL_GetPerfomanceFrequency () {
	uint64_t result;
	QueryPerformanceFrequency((LARGE_INTEGER*)&result);
	return result;
}
void SDL_Delay(int ms) {
	Sleep(ms);
}
