#include "SDL.h"
#include "GL/glew.h"

// #include "stdio.h"

#include "file_loader.hpp"
#include "timing.hpp"

// NOTE: MSVC only
// Q: Why the "32" if this works for x64? (https://docs.microsoft.com/en-us/windows/win32/winprog64/process-interoperability)
#ifdef _MSC_VER
	#pragma comment(lib, "opengl32.lib")
	// NOTE: I linked glew32.lib in the project settings
	//pragma comment(lib, "glew32.lib")
#endif

/*	TODO:

	1) Log system (tag + message)
	2) Log timestamps (optional via #define?)
	3) Break into modules
*/

// Note: SDL_GetError() gives error string. Functions return negative error codes.
// Note: We are changing what the window points to (SDL_Window*), hence the double pointer (I don't really understand this)
void init(SDL_Window** window, SDL_GLContext* gl_context, int width, int height) {
	// Specify OpenGL version (4.5)
	// Q: Is this always needed? (See https://wiki.libsdl.org/SDL_GLattr)
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 4);
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 5);

	// Q: What does this do? The book mentioned something about prefering "core"
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE);

	// Initialize SDL with video (may need to change later such as with audio, etc.)
	if (SDL_Init(SDL_INIT_VIDEO) < 0) {
		SDL_ShowSimpleMessageBox(SDL_MESSAGEBOX_ERROR, "SDL2 Init Error", SDL_GetError(), NULL);
	}

	// Create SDL window
	*window = SDL_CreateWindow("OpenGL Test", SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED,
								width, height,
								SDL_WINDOW_SHOWN | SDL_WINDOW_RESIZABLE | SDL_WINDOW_OPENGL);

	if (window == NULL) {
		SDL_ShowSimpleMessageBox(SDL_MESSAGEBOX_ERROR, "SDL2 Window Error", SDL_GetError(), NULL);
	}

	// Obtain OpenGL context
	*gl_context = SDL_GL_CreateContext(*window);

	if (gl_context == NULL) {
		SDL_ShowSimpleMessageBox(SDL_MESSAGEBOX_ERROR, "GL Context Error", SDL_GetError(), NULL);
	}

	// Initialize glew
	const GLenum glew_error = glewInit();

	if (glew_error != GLEW_OK) {
		SDL_ShowSimpleMessageBox(SDL_MESSAGEBOX_ERROR, "GLEW init error", (const char*) glewGetErrorString(glew_error), NULL);
	}
}

// Compiles shaders, links program, and removes shaders. Returns compiled program
GLuint generate_program() {
	// All OpenGL programs *must* have a vertex shader and a fragment shader
	GLuint vertex_shader;
	GLuint fragment_shader;
	GLuint program; // This represents a "linked executable" GL program

	// This line is needed to keep the string in the stack
	// std::string vertex_shader_string = readFromFile("shaders/vertex.vert");
	std::string vertex_shader_string = readFromFile("shaders/screen_quad.vert");
	const GLchar* vertex_shader_source = vertex_shader_string.c_str();
	
	std::string fragment_shader_string = readFromFile("shaders/SDF2d.frag");
	const GLchar* fragment_shader_source = fragment_shader_string.c_str();

	// Create & compile vertex shader
	vertex_shader = glCreateShader(GL_VERTEX_SHADER); // creates empty shader object to accept source code for compilation
	// 1: Single source string, NULL: Source string is null-terminated
	glShaderSource(vertex_shader, 1, &vertex_shader_source, NULL); // gives shader source code to the shader object
	glCompileShader(vertex_shader); // compiles the shader source code

	// Create & compile fragment shader
	fragment_shader = glCreateShader(GL_FRAGMENT_SHADER);
	glShaderSource(fragment_shader, 1, &fragment_shader_source, NULL);
	glCompileShader(fragment_shader);

	// Create program, attach shaders to it, & link it (like when compiling C code)
	program = glCreateProgram(); // creates a program object to which shader objects can be attached
	glAttachShader(program, vertex_shader); // attaches a shader to the program object
	glAttachShader(program, fragment_shader);
	glLinkProgram(program); // links shader objects attached to a program together

	// Delete the shaders (they are now in the program)
	glDeleteShader(vertex_shader); // compiled shaders are binaries -> can delete the shader object now
	glDeleteShader(fragment_shader);

	printf("[GL PROGRAM]: GL program created\n");

	return program;
}

#ifdef DEBUG
void GLAPIENTRY debugCallback(GLenum source, GLenum type, GLuint id, GLenum severity, GLsizei length, const GLchar* message, const void* userParam) {
	SDL_ShowSimpleMessageBox(SDL_MESSAGEBOX_ERROR, "OpenGL Error", message, NULL);
}
#endif


int main(int argc, char* argv[]) {

	/* Initialization */
	int window_width = 1200;
	int window_height = 800;

	SDL_GLContext gl_context = NULL;
	SDL_Window* window = NULL;
	init(&window, &gl_context, window_width, window_height);

	if (gl_context == NULL) {
		SDL_ShowSimpleMessageBox(SDL_MESSAGEBOX_ERROR, "OpenGL Context Error", "The OpenGL context was not initialized", NULL);
	} else if (window == NULL) {
		SDL_ShowSimpleMessageBox(SDL_MESSAGEBOX_ERROR, "Window Error", "The SDL window was not initialized", NULL);
	}

#ifdef DEBUG
	OpenGL debugging
	glEnable(GL_DEBUG_OUTPUT);
	glDebugMessageCallback(debugCallback, nullptr);
	glDebugMessageControl(GL_DONT_CARE, GL_DONT_CARE, GL_DONT_CARE, 0, nullptr, GL_TRUE);
	glDebugMessageControl(GL_DEBUG_SOURCE_API, GL_DEBUG_TYPE_ERROR, GL_DEBUG_SEVERITY_HIGH, 0, nullptr, GL_TRUE); 
#endif

	// These are defined at the very end of the class extension in the book (private:...)
	GLuint rendering_program = generate_program();
	GLuint vertex_array_object;
	// Q: I don't fully understand what these do
	glCreateVertexArrays(1, &vertex_array_object);
	glBindVertexArray(vertex_array_object);

	// Renderer is no longer needed with OpenGL.
	// Q: Can I still render over OpenGL though? Such as using sdl_ttf to draw text or similar.
	//	or, can I combine frame buffers? such as multiple gl programs + an SDL buffer?
	// SDL_Renderer* renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED);

	bool should_quit = false;
	SDL_Event event;

	const GLfloat DARK_PURPLE[] = { 50.0f/255.0f, 50/255.0f, 80/255.0f, 1.0f };
	
	// FIXME: This is now a Uint32 (change this in the shader & GL calls)
	GLint time_uniform = 0;

	bool pause_time = false;

	// Translations in [x, y, z]
	GLfloat translation_uniform[] = { 0.0f, 0.0f, 0.0f };
	// Window dimensions
	GLfloat window_dimensions_uniform[] = { window_width, window_height };
	// Mouse position
	GLfloat mouse_coords_uniform[] = { 0.0f, 0.0f };
	
	// Tell OpenGL which program object to use for rendering
	glUseProgram(rendering_program);
	

	// TODO: Keep mouse large while held down, only shrink when released
	bool fullscreen = false;
	Timer timer = Timer();

	while (!should_quit) {
		/* Clear frame here*/

		// Same as SDL_SetRenderDrawColor w/ SDL_RenderClear
		glClearBufferfv(GL_COLOR, 0, DARK_PURPLE);		

		/* Render/handle stuff here */
		// Q: How do callbacks work in C++? (to abstract this section away)
		while (SDL_PollEvent(&event)) {
			// Happens on window X-out
			if (event.type == SDL_QUIT || (event.type == SDL_KEYDOWN && event.key.keysym.sym == SDLK_ESCAPE)) {
				should_quit = true;
				// Don't want to `break` here because we may want to do something before quitting
			}
			// Handle windowing events
			else if (event.type == SDL_WINDOWEVENT) {
				if (event.window.event == SDL_WINDOWEVENT_RESIZED) {
					// TODO: Resize OpenGL drawable area
					SDL_GetWindowSize(window, &window_width, &window_height);
					window_dimensions_uniform[0] = window_width;
					window_dimensions_uniform[1] = window_height;

					// (x, y), 	Lower left corner of viewport
					// (w, h)   width & height of viewport
					glViewport(0, 0, window_width, window_height); // This will stretch the view to accommodate window. TODO: want to simply increase screen size (no scaling)
				}
			}
			// Note: SDL2 places (0, 0) at top right. OpenGL places it at bottom left.
			else if (event.type == SDL_MOUSEBUTTONDOWN) {
				if (event.button.button == SDL_BUTTON_LEFT) {
					printf("[MOUSE]: Left Click\n");
				}
			}
			else if (event.type == SDL_MOUSEBUTTONUP) {
			}

			else if (event.type == SDL_MOUSEMOTION) {
				//printf("[MOUSE]: Mouse at (%i, %i)\n", event.motion.x, event.motion.y);
				mouse_coords_uniform[0] = event.motion.x;
				mouse_coords_uniform[1] = window_dimensions_uniform[1] - event.motion.y;
			}

			// Handle key presses (rather than checking if a key is down)
			else if (event.type == SDL_KEYDOWN) {
				// Toggle cursor
				if (event.key.keysym.sym == SDLK_F1) {
					if (SDL_ShowCursor(SDL_QUERY) == SDL_DISABLE) {
						SDL_ShowCursor(SDL_ENABLE);
					} else {
						SDL_ShowCursor(SDL_DISABLE);
					}
				}
				// Simple shader hot-reloading
				else if (event.key.keysym.sym == SDLK_F5) {
					printf("[REFRESH]: Reloading GL program\n");
					rendering_program = generate_program();

					// Naive (bad) error checking
					if (glGetError() == 0) {
						glUseProgram(rendering_program);
					} else {
						printf("[GL PROGRAM ERROR]: Error generating program. Using previous.\n");
					}
				}
				// Toggle fullscreen
				// FIXME: Exiting fullscreen does not adjust window dimensions properly
				else if (event.key.keysym.sym == SDLK_F11) {
					fullscreen = !fullscreen;
					if (fullscreen) {
						SDL_SetWindowFullscreen(window, SDL_WINDOW_FULLSCREEN_DESKTOP);
					} else {
						SDL_SetWindowFullscreen(window, 0);
					}
				}
				// Reset values
				else if (event.key.keysym.sym == SDLK_r) {
					translation_uniform[0] = 0.f;
					translation_uniform[1] = 0.f;
					translation_uniform[2] = 0.f;
					time_uniform = 0;

					printf("[RESET]: Reset position and time\n");
				}
				// Pause time
				else if (event.key.keysym.sym == SDLK_SPACE) {
					pause_time = !pause_time;
					printf("[TIME]: %s time\n", pause_time ? "Paused" : "Unpaused");
				}
			}
		}
		
		// Handle Keyboard State (handle key presses above)
		const Uint8* key_state = SDL_GetKeyboardState(NULL);

		if (key_state[SDL_SCANCODE_F1]) {
			// TODO: Screenshot 
			// use another thread to save
		}
		if (key_state[SDL_SCANCODE_F2]) {
			// TODO: Begin GIF recording on first press, end on second
			// fill buffer on another thread with per-frame screenshots, then use ffmpeg?
		}
		// TODO: How to use these with collision checking (like for clicking buttons)?
		if (key_state[SDL_SCANCODE_W] || key_state[SDL_SCANCODE_UP]) { // up (positive y direction)
			translation_uniform[1] -= 0.01f;
		}
		if (key_state[SDL_SCANCODE_A] || key_state[SDL_SCANCODE_LEFT]) { // left (negative x direction)
			translation_uniform[0] += 0.01f;
		}
		if (key_state[SDL_SCANCODE_S] || key_state[SDL_SCANCODE_DOWN]) { // down (negative y direction)
			translation_uniform[1] += 0.01f;
		}
		if (key_state[SDL_SCANCODE_D] || key_state[SDL_SCANCODE_RIGHT]) { // right (positive x direction)
			translation_uniform[0] -= 0.01f;
		}
		// TODO: Better z-axis translations
		if (key_state[SDL_SCANCODE_LSHIFT]) { // in (positive z direction)
			translation_uniform[2] -= 0.01f;

			// Do not allow negative zoom (there is a +1.0f offset in the shader)
			if (translation_uniform[2] < -1.0f) {
				translation_uniform[2] = -1.0f;
			}
		}
		if (key_state[SDL_SCANCODE_LCTRL]) { // out (negative z direction)
			translation_uniform[2] += 0.01f;
		}

		/* Draw to screen here */

		// TODO: Camera should be processed *before* the fragment shader (technically, this would happen in the vertex shader)

		// TODO: Whatever can be calculated prior to the shader should be done on the CPU
		// Note that the index was also specified in the shader
		// glUniform#fv(layout, number of such vectors, pointer) --> the second number can be used to pass an multiple vectors from one array
		glUniform2fv(0, 1, window_dimensions_uniform); // Pass window dimensions [width, height]
		glUniform2fv(1, 1, mouse_coords_uniform); // Mouse coordinates in pixels
		glUniform1f( 2,    (float)time_uniform); // Time (random unit) TODO: use seconds
		glUniform3fv(3, 1, translation_uniform); // Move triangle

		// Draw a triangle
		glDrawArrays(GL_TRIANGLES, 0, 3); // sends vertices through the OpenGL pipeline
		
		// Draw frame
		SDL_GL_SwapWindow(window);
		

		/* Timing */

		// TODO: Have two time options: (1) for realtime (delta time), (2) for rendering (tick time once each frame)
		Uint32 delta_time = timer.delta_time();
		
		if (!pause_time) {
			time_uniform += delta_time;
		}

		const float delay = 1000.0f / 60.0f; // 60 FPS
		if (delta_time < (Uint32) delay) {
			SDL_Delay(delay - delta_time);
		}
	}

	/* Cleanup & Exit */
	printf("[END]: Quitting...\n");

	glDeleteVertexArrays(1, &vertex_array_object);
	glDeleteProgram(rendering_program);

	SDL_GL_DeleteContext(gl_context);
	SDL_DestroyWindow(window);
	SDL_Quit();
	return 0;
}