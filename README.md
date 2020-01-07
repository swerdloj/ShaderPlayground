# Dependencies
- [GLEW](http://glew.sourceforge.net/)
- [SDL2](https://www.libsdl.org/download-2.0.php)
- OpenGL

# Build Instructions (Windows)

## G++
- Compiler flag ordering can prevent successul compilation
- Ensure flags (mainly for SDL2) are ordered properly
  - `SDL2main` before `SDL2`

Build Command:  
`g++ main.cpp -o test.exe -I C:/.../SDL2/include -I C:/.../glew/include -l m -L C:/.../SDL2/lib/x64 -l SDL2main -l SDL2 -L C:/.../glew/lib/Release/x64 -l glew32 -l opengl32`

## MSVC
- `#pragma comment(lib, "opengl32.lib")` will link OpenGL automatically
- Create project and link SDL2 & GLEW