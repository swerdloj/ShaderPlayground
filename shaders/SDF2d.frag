#version 450 core

// Inputs
layout(location = 0) uniform vec2 u_screen_dimensions; // Screen dimensions (x, y)
layout(location = 1) uniform vec2 u_mouse_position; // Mouse position (x, y)
layout(location = 2) uniform float u_time; // Time in ms
layout(location = 3) uniform vec3 u_position; // User position
layout(location = 4) uniform float u_mouse_animation_state;
layout(location = 5) uniform vec4 u_test_button; // [width, height, center.x, center.y]
layout(location = 6) uniform float u_selector_animation_state;

// Output to the framebuffer
out vec4 out_color;

/*
#define LIGHT_NONE = -1;
#define LIGHT_GLOW = 1;
#define LIGHT_BLOOM = 2;
// etc...

// TODO: Replace the #defines with this
// TODO: Consider creating a separate struct for light and rendering that separately
struct Material {
    int light = LIGHT_NONE;
    vec4 light_color = vec4(0., 0., 0., 0.); // (Red, Green, Blue, Intensity)
    vec3 color = vec3(0.); // Material color (Red, Green, Blue) --> vec3(0.) will be transparent
};
*/

#define MAT_NONE -1
#define MAT_GLOWY 1
#define MAT_NORMAL 2

struct RayResult {
    float marched_distance; // total distance marched by the ray
    float min_distance; // minimum distance passed by an object
    bool collided; // whether the ray hit an object
    int material;
};

struct MapResult {
    float scene_distance;
    int material;
};

/* --------------------- SETTINGS --------------------- */

#define MAX_STEPS 50 // Maximum ray marching iterations
#define MAX_DISTANCE 70.0 // Maximum ray distance (like a far plane)
#define SURFACE_DISTANCE 0.001 // Object rendering accuracy
#define AA 2 // TODO: Anti aliasing amount

vec2 mouse_pos_normalized = (u_mouse_position.xy / u_screen_dimensions.xy - 0.5)*2. * vec2(u_screen_dimensions.x / u_screen_dimensions.y, 1.) - u_position.xy;

float sd_circle(vec2 point, float radius) {
    return length(point) - radius;
}

float sd_rect(vec2 point, vec2 size) {
    return max(abs(point.x) - size.x, abs(point.y) - size.y); // with interior distance (slower, but accurate)
}

// Blends two objects together (negative smoothness gets weird)
float sd_smooth_min(float dist1, float dist2, float smoothness) {
    float h = clamp(0.5 + 0.5*(dist2 - dist1) / smoothness, 0., 1.);
    return mix(dist2, dist1, h) - smoothness * h * (1. - h);
}

// Morphs between two objects (0.0 -> d1, 1.0 -> d2)
float sd_morph(float d1, float d2, float percentage) {
    return mix(d1, d2, percentage);
}

MapResult scene_add(MapResult obj1, MapResult obj2) {
    return obj1.scene_distance < obj2.scene_distance ? obj1 : obj2;
}

// TODO: This is assuming obj1 & obj2 have the same material
MapResult scene_smooth_min(MapResult obj1, MapResult obj2, float smoothness) {
    float d = sd_smooth_min(obj1.scene_distance, obj2.scene_distance, smoothness);
    return MapResult(d, obj1.material);
}

MapResult map(vec2 point) {
    MapResult result = MapResult(MAX_DISTANCE + 1., MAT_NONE); // This should never be returned, but if it is, the march will end
    
    vec2 circle1_pos = point;
    MapResult circle1 = MapResult( sd_circle(circle1_pos, 0.2), MAT_GLOWY );
    circle1.scene_distance -= sin(point.x*9. + u_time * 0.005)*0.02; // Displacement mapping (wavy)
    
    MapResult box1 = MapResult( sd_rect(point-vec2(-0.6, 0.5), vec2(0.2)), MAT_GLOWY );
    result = scene_add(result, box1);
    MapResult circle2 = MapResult( sd_circle(point-vec2(-0.6, 0.5), 0.2), MAT_GLOWY );
    float box_morph = sd_morph(box1.scene_distance, circle2.scene_distance, sin(u_time*0.002)*0.5 + 0.5);

    result.scene_distance = sd_smooth_min(circle1.scene_distance, box_morph, 0.2);

    // "UI" Testing
    vec2 test_button_size = u_test_button.xy;
    vec2 test_button_size_max = test_button_size + 0.10;
    // Temporary linear easing
    if (u_selector_animation_state < 0.5) {
        test_button_size = mix(test_button_size, test_button_size_max, u_selector_animation_state);
    } else {
        test_button_size = mix(test_button_size_max, test_button_size, u_selector_animation_state);
    }
    MapResult test_button = MapResult( sd_rect(point - u_test_button.zw, test_button_size), MAT_GLOWY );
    result = scene_add(result, test_button);
    

    vec2 button1_pos = point - vec2(0.85, 0.7);
    vec2 button2_pos = point - vec2(0.85, 0.35);

    MapResult button1 = MapResult( sd_rect(button1_pos, vec2(0.2, 0.1)), MAT_GLOWY );
    MapResult button2 = MapResult( sd_rect(button2_pos, vec2(0.2, 0.1)), MAT_GLOWY );
    result = scene_add(result, button1);
    result = scene_add(result, button2);

    vec2 selector1_pos = button1_pos;
    vec2 selector2_pos = button2_pos;
    MapResult selector1 = MapResult( sd_rect(selector1_pos, vec2(0.25, 0.15)), MAT_GLOWY );
    MapResult selector2 = MapResult( sd_rect(selector2_pos, vec2(0.25, 0.15)), MAT_GLOWY );

    result.scene_distance = min(result.scene_distance, sd_morph(selector1.scene_distance, selector2.scene_distance, sin(u_time*.002)*0.5 + 0.5));
    
    // TODO: Transition on mouse-hover
    // if () {
        
    // }
    
    float mouse_size = 0.05;
    float mouse_size_max = 0.10;
    
    // Temporary linear easing
    if (u_mouse_animation_state < 0.5) {
        mouse_size = mix(mouse_size, mouse_size_max, u_mouse_animation_state);
    } else {
        mouse_size = mix(mouse_size_max, mouse_size, u_mouse_animation_state);
    }

    // TODO: Implement easing functions on CPU (here is VERY expensive)
    // if (u_animation_state < 0.5) { // Grow
    //     float t = u_animation_state / (0.5/2.);
    //     if (t < 1.) {
    //         mouse_size = 0.03/2.*t*t*t + mouse_size;
    //     } else {
    //         t -= 2.;
    //         mouse_size = 0.03/2.*(t*t*t + 2.) + mouse_size;
    //     }
    // } 
    // else { // Shrink
    //     float t = u_animation_state / (1./2.);
    //     if (t < 1.) {
    //         mouse_size = 0.03/2.*t*t*t + mouse_size;
    //     } else {
    //         t -= 2.;
    //         mouse_size = 0.03/2.*(t*t*t + 2.) + mouse_size;
    //     }
    // }

    MapResult mouse = MapResult( sd_circle(point - mouse_pos_normalized, mouse_size), MAT_GLOWY ); 
    result = scene_smooth_min(result, mouse, 0.1);

    // d = sd_smooth_min(d, mouse, 0.3);

    return result;
}

RayResult march(vec2 ray_origin, vec2 ray_direction) {
    // float marched_distance = 0.;
    // float min_distance = 100.;

    RayResult raycast = RayResult(0., 100., false, MAT_NONE);
    MapResult scene;

    for (int i = 0; i < MAX_STEPS; ++i) {
        vec2 current_position = ray_origin + ray_direction*raycast.marched_distance;
        scene = map(current_position);

        raycast.marched_distance += scene.scene_distance;

        raycast.min_distance = min(raycast.min_distance, abs(scene.scene_distance));

        if (raycast.marched_distance > MAX_DISTANCE || abs(scene.scene_distance) < SURFACE_DISTANCE) {
            raycast.collided = true;
            break;
        }
    }
    
    raycast.material = scene.material; // TODO: This feels redundant

    return raycast;
}

// https://www.shadertoy.com/view/3s3GDn
// This is a stylized glow
float get_glow(float dist, float radius, float intensity) {
    return pow(radius/dist, 1.-intensity);
}

// This is more like bloom using inverse square law
float get_glow2(float dist, float intensity) {
    return pow( dist, -2. ) * intensity; // power / radius^2
}

void main() {
    vec2 uv = (gl_FragCoord.xy / u_screen_dimensions.xy - 0.5) * 2.; // -0.5 to 0.5, then -1 to 1
    uv.x *= u_screen_dimensions.x / u_screen_dimensions.y; // Aspect ratio

    vec3 color = vec3(0.); // Start with no color, then add color as we process the pixel

    vec3 object_color = vec3(0.2, 0.1, 0.5)*2.; // TODO: Move this to be defined per shape in map()
    // RayResult result = march(uv, vec2(0.));
    RayResult result = march(uv - u_position.xy, vec2(0.));

    // color = vec3(smoothstep(0.3, 0., result.marched_distance)) * object_color; // Aliased object

    // TODO: Separate out lighting like for 3d SDFs, and do another ray-cast for the lighting
    if (result.material == MAT_GLOWY) {
        vec3 light_color = vec3(1.3, 0.7, 3.)*2.;
        // color += get_glow(result.min_distance, 0.003, 0.01) * light_color;
        color += get_glow2(result.min_distance, 0.00005) * light_color;
    }
    else if (result.material == MAT_NORMAL) {
        color += vec3(smoothstep(0.3, 0., result.marched_distance)) * object_color;
    }

    // Gamma correction
    color = pow( clamp(color, 0., 1.), vec3(0.4545) );
	
	// if( mod(gl_FragCoord.y, 6.) < 2.) {
	// 	color -= vec3(0.01);
	// }
	
    out_color = vec4(color, 1.);
}