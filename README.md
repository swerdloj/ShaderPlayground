# Dependencies
- [GLEW](http://glew.sourceforge.net/)
- [SDL2](https://www.libsdl.org/download-2.0.php)
- OpenGL

# Shader Playground
## Usage
- See **Dependencies** above
- Modify `SDF2d.frag` with your shader
  - This can be renamed if updated in `main.cpp`
- Press **F5** to reload the shader
- I recommend using vscode with a glsl extension as your editor

## About
- MIT License
- Simple application for toying with shaders. The included uniforms are:
  - Mouse coordinates
  - Screen dimensions
  - Time
  - Camera Position (in 3D space, but no rotations)
- Using SDL2, more uniforms can easily be created and bound

# Build Instructions (Windows)

## G++
- Compiler flag ordering can prevent successul compilation
- Ensure flags (mainly for SDL2) are ordered properly
  - `SDL2main` before `SDL2`

Build Command:  (use your paths to SDL2 and GLEW)
`g++ main.cpp -o shader.exe -I C:/.../SDL2/include -I C:/.../glew/include -l m -L C:/.../SDL2/lib/x64 -l SDL2main -l SDL2 -L C:/.../glew/lib/Release/x64 -l glew32 -l opengl32`

## MSVC
- `#pragma comment(lib, "opengl32.lib")` will link OpenGL automatically
- Create project and link SDL2 & GLEW
