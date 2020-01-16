// TODO: Animation registry
//  All animations must be registered and associated with an object
//  They can then be reset simultaneously
// Confirm that this is necessary

// Easing functions available to the user
enum Easing {
    Linear,
    Cubic,
    Quadratic,
    Exponential,
    Sine,
    // TODO: Add more easings
};

struct Animator {
    Easing easing; // Which easing function to use
    float key_frame; // Key frame for switching animation/style
    float start_time; // When the animation started
    float duration; // How long the animation is
};



// TODO: Completion callback
class Animation {
    /* DATA */

public:
    bool animating; // Whether the animation should be going
    Uint32 start_time; // Time when animation began
    // TODO: Ensure this becomes seconds
    Uint32 duration; // Animation length
private:

    /* METHODS */

public:
    Animation(Uint32 animation_duration) {
        this->animating = false;
        this->start_time = 0;
        this->duration = animation_duration;
    }

    // Begin animating
    void start(Uint32 time) {
        this->animating = true;
        this->start_time = time;
    }

    // Advance the animation forward, ending it if past duration
    float progress(Uint32 current_time) {
        if (this->start_time <= 0) {
            return 0.0f;
        }

        float progress = (float)(current_time - this->start_time) / (float)this->duration;
        if (progress > 1.0f) {
            this->animating = false;
            return 0.0f;
        }

        return progress;
    }

    // TODO: How to explain this? How to interface with this feature?
    // Ideally, this would be working user-specified easing functions & states
    void bounce(Uint32 current_time) {
        if (!this->animating) return;

        float percentage = progress(current_time);
        // FIXME: This is only true for the mouse as defined in SDF2d.frag
        if (percentage > 0.5f) {
            // Sets start_time such that progress(current_time) == 1 - percentage
            this->start_time = this->duration * (percentage - 1.0f) + current_time;
        }
    }

    // Reset the animation (and stop it)
    void reset() {
        this->animating = false;
        this->start_time = 0;
    }
private:

};