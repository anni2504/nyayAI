# NYAYAI custom C++ vector database build.
# Targets: make all | make server | make tests | make api | make bench
CXX      ?= clang++
CXXFLAGS ?= -std=c++17 -O2 -Wall -Wextra -pthread
INC       = -Isrc -Ithird_party
SRC       = src/ydb_types.cpp src/brute_force.cpp src/hnsw.cpp \
            src/kd_tree.cpp src/vector_store.cpp src/legal_dataset.cpp \
            src/benchmark.cpp src/embed_provider.cpp
OBJ       = $(SRC:src/%.cpp=build/%.o)
BIN_DIR   = build

.PHONY: all server tests api bench clean

all: server tests

$(BIN_DIR):
	mkdir -p $(BIN_DIR)

$(BIN_DIR)/%.o: src/%.cpp | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $(INC) -c $< -o $@

server: $(BIN_DIR)/vector-db-server

$(BIN_DIR)/vector-db-server: $(OBJ) src/httpd.cpp | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $(INC) $(OBJ) src/httpd.cpp -o $@

tests: $(BIN_DIR)/vector-db-tests

$(BIN_DIR)/vector-db-tests: $(OBJ) tests/self_test.cpp | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $(INC) $(OBJ) tests/self_test.cpp -o $@

# Deterministic in-process suite (no network/services).
test: tests
	./$(BIN_DIR)/vector-db-tests

# API integration suite (spawns the server, curl + python3 assertions).
api: server
	bash tests/api_test.sh

# Standalone benchmark tool + a representative measured run.
bench: $(BIN_DIR)/vector-db-bench

$(BIN_DIR)/vector-db-bench: $(OBJ) src/bench_main.cpp | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $(INC) $(OBJ) src/bench_main.cpp -o $@

bench-run: bench
	./$(BIN_DIR)/vector-db-bench 2000 64 200 10 100 cosine 42 0

clean:
	rm -rf $(BIN_DIR)