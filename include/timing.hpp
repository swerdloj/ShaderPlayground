#include <chrono>


// FIXME: How to use Ui64 or Uint64 or whichever one it was
unsigned int time_in_ms() {
    using namespace std::chrono;
    return duration_cast<milliseconds>(system_clock::now().time_since_epoch()).count();
}