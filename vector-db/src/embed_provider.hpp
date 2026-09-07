// Embedding-provider abstraction. The vector DB never requires a provider:
// vectors arrive via the API. A provider only *optionally* converts raw text
// into vectors (dev/test via Ollama when VECTORDB_OLLAMA_URL is configured).
#pragma once

#include <optional>
#include <string>
#include <vector>

#include "ydb_types.hpp"

namespace ydb {

class EmbeddingProvider {
public:
    virtual ~EmbeddingProvider() = default;
    virtual const char* name() const = 0;
    // Returns the embedding, or nullopt with a message when unavailable.
    virtual std::optional<std::vector<float>> embed(const std::string& text,
                                                    std::string* errOut) const = 0;
    virtual Json info() const = 0;
};

// Always-present provider that answers unavailable (default when no external
// service is configured). Keeps the DB operational without any LLM coupling.
class NoopEmbeddingProvider : public EmbeddingProvider {
public:
    const char* name() const override { return "none"; }
    std::optional<std::vector<float>> embed(const std::string&,
                                            std::string* errOut) const override {
        if (errOut) *errOut = jsonErr("no embedding provider configured; supply a vector");
        return std::nullopt;
    }
    Json info() const override {
        Json o = Json::makeObj();
        o["provider"] = Json::makeStr("none");
        o["available"] = Json::makeBool(false);
        return o;
    }
};

// Optional Ollama embedding provider (nomic-embed-text by default). Built as a
// thin REST client over cpp-httplib; never constructed unless an
// Ollama-compatible endpoint is configured via env.
class OllamaEmbeddingProvider : public EmbeddingProvider {
public:
    explicit OllamaEmbeddingProvider(std::string baseUrl, std::string model,
                                     int timeoutSec = 30);
    const char* name() const override { return "ollama"; }
    std::optional<std::vector<float>> embed(const std::string& text,
                                            std::string* errOut) const override;
    Json info() const override {
        Json o = Json::makeObj();
        o["provider"] = Json::makeStr("ollama");
        o["available"] = Json::makeBool(true);
        o["base_url"] = Json::makeStr(baseUrl_);
        o["model"] = Json::makeStr(model_);
        return o;
    }

private:
    std::string baseUrl_;
    std::string model_;
    int timeoutSec_;
};

// Factory from environment (VECTORDB_OLLAMA_URL, VECTORDB_OLLAMA_MODEL).
std::unique_ptr<EmbeddingProvider> makeEmbeddingProvider();

}  // namespace ydb