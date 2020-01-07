struct Point {
    float x, y;
};

class Button {
public:
    float width;
    float height;
    Point center;
private:

public:
    Button(float button_width, float button_height, Point button_center) {
        width = button_width;
        height = button_height;
        center = button_center;
    }

    Button(float button_width, float button_height, float x, float y) {
        width = button_width;
        height = button_height;
        center = Point {x , y};
    }

    bool contains(float x, float y) {
        if (   x < center.x + width/2.f  && x > center.x - width/2.f
            && y < center.y + height/2.f && y > center.y - height/2.f) 
        {
            return true;
        }

        return false;
    }

    bool contains(Point point) {
        return contains(point.x, point.y);
    }

    float* normalize(float window_width, float window_height) {
        float normalized_width = (width / window_width) * (window_width/window_height);
        float normalized_height = height / window_height;
        float normalized_x = (center.x / window_width - 0.5f) * 2.0f * window_width/window_height;
        float normalized_y = (center.y / window_height - 0.5f) * 2.0f;

        return new float[4] {normalized_width, normalized_height, normalized_x, normalized_y};
    }
private:
};

