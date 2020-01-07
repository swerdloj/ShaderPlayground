#version 450 core

// Inputs
layout(location = 0) uniform vec2 u_screen_dimensions; // Screen dimensions (x, y)
layout(location = 1) uniform vec2 u_mouse_position; // Mouse position (x, y)
layout(location = 2) uniform float u_time; // Time
layout(location = 3) uniform vec3 u_position; // User position
layout(location = 4) uniform float u_animation_state;

// Output to the framebuffer
out vec4 out_color;

/* --------------------- SETTINGS --------------------- */

#define MAX_STEPS 100 // Maximum ray marching iterations
#define MAX_DISTANCE 70. // Maximum ray distance (like a far plane)
#define SURFACE_DISTANCE 0.001 // Object rendering accuracy
#define AA 2 // TODO: Anti aliasing amount

/* --------------------- UTILITY --------------------- */

float sin_time_normalized = sin(u_time) * 0.5 + 0.5;

// Returns a matrix for rotating a 2d point by an angle
mat2 rotate(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2( c, -s,
                 s,  c );
}

/* --------------------- PRIMITIVES --------------------- */

// Capsule defined by two endpoints (a, b) and a radius
float sd_capsule(vec3 point, vec3 endpoint1, vec3 endpoint2, float radius) {
    vec3 capsule_segment = endpoint2 - endpoint1; // ab
    vec3 ap = point - endpoint1;

    float t = dot(capsule_segment, ap) / dot(capsule_segment, capsule_segment);

    // Keep t within the endpoint line segment. This is how far along the segment the point is
    t = clamp(t, 0., 1.); // removing the clamp gives infinite cylinder

    vec3 c = endpoint1 + t * capsule_segment;

    return length(point - c) - radius;
}

float sd_cylinder(vec3 point, vec3 endpoint1, vec3 endpoint2, float radius) {
    vec3 cylindrical_segment = endpoint2 - endpoint1; // ab
    vec3 ap = point - endpoint1;

    float t = dot(cylindrical_segment, ap) / dot(cylindrical_segment, cylindrical_segment);

    vec3 c = endpoint1 + t * cylindrical_segment;

    float x = length(point - c) - radius;
    float y = (abs(t - 0.5) - 0.5) * length(cylindrical_segment);

    float exterior_distance = length(max(vec2(x, y), 0.));
    float interior_distance = min(max(x, y), 0.);

    return exterior_distance + interior_distance;
}

// Torus defined by two circles: Outer, "revolving" ring, and inner ring
float sd_torus(vec3 point, float inner_radius, float ring_radius) {
    float x = length(point.xz) - inner_radius;
    return length(vec2(x, point.y)) - ring_radius;
}

// Box with ..
float sd_box(vec3 point, vec3 size) {
    // return length(max(abs(point) - size, 0.)); // no interior distance (faster, but glitchy)
    return max(max(abs(point.x) - size.x, abs(point.y) - size.y), abs(point.z) - size.z); // with interior distance (slower, but accurate)
}

// Sphere at a location with a radius
float sd_sphere(vec3 point, float radius) {
    return length(point) - radius;
}

// Simple xz plane
float sd_simple_plane(vec3 point, float plane_height) {
    return point.y - plane_height;
}

// Rotated plane facing `direction`
float sd_plane(vec3 point, vec3 direction) {
    return dot(point, normalize(direction));
}

/* --------------------- COMBINATORS --------------------- */

// Morphs between two objects (0.0 -> d1, 1.0 -> d2)
float sd_morph(float d1, float d2, float percentage) {
    return mix(d1, d2, percentage);
}

// Blends two objects together (negative smoothness gets weird)
float sd_smooth_min(float dist1, float dist2, float smoothness) {
    float h = clamp(0.5 + 0.5*(dist2 - dist1) / smoothness, 0., 1.);
    return mix(dist2, dist1, h) - smoothness * h * (1. - h);
}

// Adds an object to a scene
float sd_add(float dist1, float dist2) {
    return min(dist1, dist2);
}

// Cuts out object1 from object2
float sd_subtract(float dist1, float dist2) {
    return max(-dist1, dist2);
}

// Gives the intersection of two objects
float sd_intersect(float dist1, float dist2) {
    return max(dist1, dist2);
}

// Give an object a shell of specified radius.
// Note that this cannot be seen without an intersection (to reveal the inside of the object)
float sd_shell(float obj_dist, float thickness) {
    return abs(obj_dist) - thickness;
}

/* --------------------- SCENE --------------------- */

float map(vec3 point) {
    float d = 1000.; // distance

    float plane_dist = sd_simple_plane(point, 0.);
    // plane_dist = sd_plane(point - vec3(0., 0., 0.), vec3(0., 1., 0));
    
    /* Stretch/squish */
    // vec3 sphere_position = point - vec3(0., 0.5, 0.);
    // sphere_position *= vec3(1., 4., 2.); // squash down the sphere -> messes with distances
    // float sphere_dist = sd_sphere(sphere_position, 0.8);
    // sphere_dist /= 4.; // Compensate for strecthing by dividing by largest of distortions -> decreases performance

    /* Subtraction & Intersection */
    vec3 sphere2_pos = point - vec3(0.5, 0.7, 0.);
    float sphere2_d = sd_sphere(sphere2_pos, 0.8);
    vec3 sphere3_pos = point - vec3(-0.5, 0.5, 0.);
    float sphere3_d = sd_sphere(sphere3_pos, 0.8);
    // Subtraction
    // d = max(-sphere3_d, sphere2_d); // Use sphere3 to mask *out* sphere2
    // Intersection
    // d = max(sphere3_d, sphere2_d); // Use sphere3 to mask *in* sphere2

    /* Rotation with Translation */
    vec3 box_position = point;
    box_position.xz *= rotate(u_time); // rotate before translate -> rotate about self
    box_position -= vec3(2., 1., 0); // translation after rotate -> rotate about point
    box_position.xz *= rotate(u_time); // rotate after translate -> rotate about translated self
    float box_dist = sd_box(box_position, vec3(1.));

    // float intersect_plane = sd_plane(point-vec3(0., 0.7, 0.), vec3(0.2, 1., -0.2));
    // d = sd_show_shell(sphere2_d, intersect_plane, 0.2);
    // d = sd_smooth_min(d, box_dist, sin(u_time)*0.5+0.5);

    /* Wave-ify */
    vec3 flag_position = point-vec3(-5., 2., 0.);
    flag_position.z += sin(flag_position.x * 2 + u_time*3.) * 0.2; // apply distortion, and remember to reduce distance later
    float flag = sd_box(flag_position, vec3(2., 2., 0.1));
    // d = min(flag*0.85, d);

    float d3 = sd_morph(flag*0.8, sd_sphere(flag_position, 0.5), sin_time_normalized*0.85);
    d = min(d, d3);

    /* Scaling (Dynamic) */
    vec3 box2_position = point-vec3(5., 1., 0.);
    // [mix -> big/small range], [smoothstep -> where to transform (does not need to be in cube bounds, will see effect as if the cube were larger)]
    float scale = mix(1., 2., smoothstep(-1. + sin_time_normalized, 1. + cos(u_time*3.)*0.5+0.5, box2_position.y)); 
    box2_position.xz *= scale;
    float box2 = sd_box(box2_position, vec3(1.)) / scale;
    d = min(d, box2*0.85); // note the need to account for distortions here
    
    /* Twisting (also scaling) */
    vec3 box3_position = point-vec3(0., 2., -6.);
    
    /* Mirroring (not free) */
    //box3_position.x = abs(box3_position.x); // can be any or multiple directions
    //box3_position.x -= 1.2; // distance from "mirror" (spaces out the mirrored objects)
    
    /* Space Folding */
    vec3 fold_plane = normalize(vec3(1.5, 1., 0.)); // plane about which to fold
    box3_position -= 2. * fold_plane * min(0., dot(point, fold_plane)); // fold about the plane
    // create new planes and fold more to create fractals, etc.
    
    // box3_position.xz *= rotate(box3_position.y * sin_time_normalized*1.2);
    box3_position.xz *= rotate(smoothstep(0., 1., box3_position.y * sin_time_normalized * 0.5)); // can also use smoothstep here to control where rotation occurs
    float box3_d = sd_box(box3_position, vec3(1.));
    d = min(d, box3_d*0.85);




    /* Displacement Mapping */
    float wavy_sphere = sd_sphere(point-vec3(0., 2., -1.), 1.);
    wavy_sphere -= sin(point.x*2.5 + u_time * 3.)*0.1; // displacement
    d = min(d, wavy_sphere * 0.9); // The more you distort an SDF, the slower you must march to avoid artifacting
    float d2 = sd_smooth_min(wavy_sphere, box_dist, cos(u_time) * 0.5 + 0.5);
    d = min(d, d2);

    d = min(d, plane_dist);
    return d;
}

/* --------------------- RENDERING --------------------- */

// TODO: Why is this the same as get_normal2 ?
vec3 get_normal(vec3 point) {
    vec2 epsilon = vec2(0.001, 0.);

    float dist = map(point);

    vec3 normal = dist - vec3(
        map(point - epsilon.xyy),
        map(point - epsilon.yxy),
        map(point - epsilon.yyx)
    );

    return normalize(normal);
}

// Obtain normals by calculating gradiants with a given epsilon
vec3 get_normal2(vec3 point) {
    vec2 epsilon = vec2(0.001, 0.); // Note that x = 0.001, y = 0.

    // epsilon.xyy creates vec3 by repeating y (swizzling) -> [0.001, 0., 0.]
    return normalize( vec3( 
                        map(point + epsilon.xyy) - map(point - epsilon.xyy), // x gradient
                        map(point + epsilon.yxy) - map(point - epsilon.yxy), // y gradient
                        map(point + epsilon.yyx) - map(point - epsilon.yyx)  // z gradient 
                    ) );
}

float ray_march(vec3 ray_origin, vec3 ray_direction) {
    float marched_distance = 0;

    for (int i = 0; i < MAX_STEPS; ++i) {
        vec3 current_position = ray_origin + ray_direction * marched_distance;
        float scene_distance = map(current_position);
        marched_distance += scene_distance;

        // Do `abs(scene_distance)` to correct weird distortions caused by stepping into geometry (also prevents self-shadowing)
        // Note that this can have undesired effects when viewing geometry from inside (like the inside of a closed cube being lit)
        if (marched_distance > MAX_DISTANCE || abs(scene_distance) < SURFACE_DISTANCE) { // went to far or hit geometry
            break;
        }
    }

    return marched_distance;
}

/* --------------------- LIGHTING & SHADOWS --------------------- */

float get_diffused_light(vec3 point, vec3 light_position) {
    vec3 light_direction = normalize(light_position - point);
    vec3 normal = get_normal(point);

    float diffused_light = dot(normal, light_direction); // amount of light hitting (dot is like a lerp between -1 & 1 as weighted by angle difference)
    // clamp forces the input (1) to be the maxVal (3) if larger than, or minVal(2) if less than. Otherwise, input is unchanged. This is used for texture reasons?
    diffused_light = clamp(diffused_light, 0., 1.);

    // March from the current point to the light (but offset because we are "in" the surface)
    float dist = ray_march(point + normal*SURFACE_DISTANCE*2., light_direction);

    // If the point lies in shadow
    if (dist < length(light_position - point)) {
        diffused_light *= 0.1;
        // diffused_light *= 1.; // no shadow
    }

    return diffused_light;
}

/* --------------------- CAMERA --------------------- */

// "Rotates" the uv plane such that rays are fired from the camera's uv plane rather than the screen's uv plane
vec3 uv_to_camera_ray(vec2 uv, vec3 camera_origin, vec3 lookat_point, float camera_zoom) {
    vec3 forward = normalize(lookat_point - camera_origin); // Which direction (relative to the camera) is forward
    vec3 right   = normalize(cross(vec3(0., 1., 0.), forward)); // Which direction (relative to the camera) is right (using the +y plane)
    // Note that cross product of 2 unit vectors is also a unit vector
    vec3 up      = cross(forward, right); // Which direction (relative to the camera) is right

    //vec3 center = camera_origin + forward * camera_zoom; // Obtain the center of the screen (relative to the camera) while accounting for zoom (distance from origin to camera plane -> FOV)
    //vec3 intersection = center + uv.x*right + uv.y*up; // convert screen uv to be relative to the camera (where in the camera plane is the ray fired from)
    //vec3 ray_direction = intersection - camera_origin; // the direction to fire the ray from the camera

    // The above 3 lines simplify to the following (somehow)
    vec3 ray_direction = normalize(uv.x*right + uv.y*up + camera_zoom*forward);

    return ray_direction;
}

/* --------------------- MAIN --------------------- */

void main() {
    // Normalized uv on -1, 1
    vec2 uv = gl_FragCoord.xy / u_screen_dimensions.xy; // 0 to 1
    uv = (uv - 0.5) * 2.; // -0.5 to 0.5 -> -1 to 1 ()
    uv.x *= u_screen_dimensions.x / u_screen_dimensions.y; // Account for aspect ratio

    vec3 color = vec3(0.);

    // This is where the camera's center is located
    vec3 camera = vec3(0., 4., -5.); // Aligned to xy plane, and 2 units back in the z direction (looks at origin)
    
    // TODO: Player should move relative to the camera (forward shoud be forward, not always +z-axis)
    camera += u_position*3.;

    // TODO: Feels weird because always looking at sphere
    vec3 lookat = vec3(sin_time_normalized*0.8) + vec3((u_mouse_position.x/u_screen_dimensions.x - 0.5) * 10., -(u_mouse_position.y/u_screen_dimensions.y - 0.5) * 10., 0.); // Where our camera looks at from its origin (as in which direction the camera faces)
    
    vec3 ray_direction = uv_to_camera_ray(uv, camera, lookat, 2.);

    float dist = ray_march(camera, ray_direction);
    vec3 position = camera + ray_direction * dist; // TODO: Make this an `out` of ray_march

    // Simple diffused lighting
    vec3 light_position = vec3(-2., 7., -8.);
    // light_position.xz += vec2(sin(time), cos(time)) * 5.;
    float diffused_light = get_diffused_light(position, light_position);

    color = vec3(diffused_light);

    // Simple highlight/shadow toning
    // color = mix(vec3(0.1, 0.1, 0.3), vec3(1., 1., 1.), vec3(diffused_light));

    // Simple fog equations
    color = mix(color, vec3(0.1, 0.1, 0.2), 1. - exp(-0.001 * dist * dist));
    // color *= exp(-0.0008*dist*dist*dist);

    // Gamma correction 
    // NOTE: ALWAYS PUT THIS IN FIRST BEFORE TUNING LIGHTING/VISUALS, ETC.
    color = pow( clamp(color, 0., 1.), vec3(0.4545) ); // iq uses 0.45 or 0.4545 for (1.0 / 2.2) because "most monitors have a gamma of 2.2" -- clamp just forces darkest=0., brightest=1.
    // color = sqrt(color); // this works too, but what is the difference?

    out_color = vec4(color, 1.);
}