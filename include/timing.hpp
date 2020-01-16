#include "SDL.h"

// Manages time in ms
class Timer {
public:
private:
    // Uint32 tick_rate = 0;
    Uint32 last_time = 0;

public:
    Timer(/*Uint32 tick_rate*/) {
        this->last_time = SDL_GetTicks();
        // this->tick_rate = tick_rate;
    }

    Uint32 delta_time() {
        Uint32 last_time_copy = this->last_time;
        this->last_time = SDL_GetTicks();
        return this->last_time - last_time_copy;
    }

    // TODO: Can use SDL2 to set timers with callbacks, etc.
};