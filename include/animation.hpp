// TODO: Animation registry
//  All animations must be registered and associated with an object
//  They can then be reset simultaneously
// Confirm that this is necessary

struct Animator {
    Easing easing; // Which easing function to use
    float key_frame; // Key frame for switching animation/style
    float start_time; // When the animation started
    float duration; // How long the animation is
};

// Easing functions available to the user
enum Easing {
    Linear,
    Cubic,
    Quadratic,
    Exponential,
    Sine,
    // TODO: Add more easings
};


// TODO: Completion callback
class Animation {
    /* DATA */

public:
    bool animating; // Whether the animation should be going
    float start_time; // Time when animation began
    // TODO: Ensure this becomes seconds
    float duration; // Animation length
private:

    /* METHODS */

public:
    Animation(float animation_duration) {
        animating = false;
        start_time = -1.0f;
        duration = animation_duration;
    }

    // Begin animating
    void start(float time) {
        animating = true;
        start_time = time;
    }

    // Advance the animation forward, ending it if past duration
    float progress(float current_time) {
        if (start_time < 0.0f) {
            return 0.0f;
        }

        float progress = (current_time - start_time) / duration;
        if (progress > 1.0f) {
            animating = false;
            return 0.0f;
        }

        return progress;
    }

    // TODO: How to explain this? How to interface with this feature?
    // Ideally, this would be working user-specified easing functions & states
    void bounce(float current_time) {
        if (!animating) return;

        float percentage = progress(current_time);
        // FIXME: This is only true for the mouse as defined in SDF2d.frag
        if (percentage > 0.5f) {
            // Sets start_time such that progress(current_time) == 1 - percentage
            start_time = duration * (percentage - 1.0f) + current_time;
        }
    }

    // Reset the animation (and stop it)
    void reset() {
        animating = false;
        start_time = -1.0f;
    }
private:

};