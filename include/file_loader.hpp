#include <fstream>
#include <string>
#include "stdio.h"

// Source:
// https://badvertex.com/2012/11/20/how-to-load-a-glsl-shader-in-opengl-using-c.html
// https://stackoverflow.com/questions/32842617/read-glsl-shaders-from-file

// TODO: Create a "#include _file_" directive parser

std::string readFromFile(const char* file_path) {
    std::string content;
    std::ifstream file_stream(file_path, std::ios::in);

    if(!file_stream.is_open()) {
        printf("[FILE ERROR]: Could not read file '%s'. Does it exist?\n", file_path);
        exit(-1);
    }

    std::string line = "";
    while(!file_stream.eof()) {
        std::getline(file_stream, line);

        /* TODO:
        if (line[0] == "#") ... <recursive #include directive support>
        */

        content.append(line + "\n");
    }

    file_stream.close();

    printf("[FILES]: Successfully loaded from file: '%s'\n", file_path);
    return content;
}