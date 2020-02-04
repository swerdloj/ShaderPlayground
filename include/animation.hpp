// TODO: Animation registry
//  All animations must be registered and associated with an object
//  They can then be reset simultaneously
// Confirm that this is necessary

#include <functional>

// TODO: Implement
namespace EasingFunctions {
    // Simple, linear easing (same as `mix` from GLSL)
    float linear(float from, float to, float progress) {
        return from * (1.0f - progress) + to * progress;
    }

    float quadratic(float from, float to, float progress) {

        return 0.0f;
    }

    float quartic(float from, float to, float progress) {
        
        return 0.0f;
    }

    float exponential(float from, float to, float progress) {
        
        return 0.0f;
    }

    float sine(float from, float to, float progress) {
        
        return 0.0f;
    }
}

class IAnimatatable {
    /*virtual*/ std::optional<Animation> animation;
    virtual float animate();
};

// TODO: Completion callback
class Animation {
    /* DATA */
public:
    bool animating; // Whether the animation should be going
    Uint32 start_time; // Time when animation began
    // TODO: Ensure this becomes seconds
    Uint32 duration; // Animation length
    bool reversed;
    bool is_over; // whether the animation has ended
private:
    // Finish callback
    std::function<void()> on_finish = NULL;
    // Easing function (can be custom)
    float (*easing_function)(float from, float to, float progress);
    float from; // ease from this value
    float to;   // to this value

    /* METHODS */
public:
    Animation(Uint32 animation_duration, float from, float to, float (*easing_function)(float, float, float)) {
        this->animating = false;
        this->start_time = 0;
        this->duration = animation_duration;
        this->is_over = false;

        this->from = from;
        this->to = to;

        this->reversed = false;

        // TODO: Cannot call another constructor from constructor
        this->easing_function = easing_function;
    }

    // Assign a callback for when animation completes
    void with_on_finish(std::function<void()> on_finish_callback) {
        this->on_finish = on_finish_callback;
    }

    // TODO: Get rid of this function. It will cause nothing but issues later on.
    void reverse(Uint32 current_time) {
        // Swap to and from values
        std::swap(this->to, this->from);


        this->reversed = !this->reversed;

        if (this->is_over) {
            this->is_over = false;
            this->start_time = current_time;
        } else {
            this->start_time = this->duration * (this->progress(current_time) - 1.0f) + current_time;
        }
    }

    // Begin animating from start to final value ('from' to 'to')
    void start(Uint32 time) {
        this->animating = true;
        this->start_time = time;
        this->is_over = false;
    }

    // TODO: Easing key frames & values should be stored (from & to)
    float ease(Uint32 current_time) {
        if (this->is_over) {
            return this->to;
        }

        return this->easing_function( this->from, this->to, this->progress(current_time) );
    }

    // Reset the animation (and stop it)
    void reset() {
        if (this->reversed) {
            this->reverse(0); // swap to and from back to normal
        }

        this->is_over = false;

        this->animating = false;
        this->start_time = 0;
    }

    bool finished(Uint32 current_time) {
        return current_time > this->start_time + this->duration;
    }

private:
    // Advance the animation forward, ending it if past duration
    float progress(Uint32 current_time) {
        // Animation has not started
        if (this->start_time == 0) {
            return 0.0f;
        }

        // Percentage of completion
        float progress = (float)(current_time - this->start_time) / (float)this->duration;
        
        // Animation is now complete
        if (progress >= 1.0f) {
            if (this->reversed) {
                this->reversed = false;
            }

            this->animating = false;
            this->is_over = true;

            if (this->on_finish != NULL) {
                this->on_finish();
            }

            return 1.0f;
        }

        return progress;
    }

};