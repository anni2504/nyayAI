#include "embed_provider.hpp"

#include <cstdlib>

#include "httplib.h"

namespace ydb {

namespace {
const std::string kEmptyErr = "";
}

OllamaEmbeddingProvider::OllamaEmbeddingProvider(std::string baseUrl,
                                                 std::string model,
                                                 int timeoutSec)
    : baseUrl_(std::move(baseUrl)), model_(std::move(model)), timeoutSec_(timeoutSec) {}

std::optional<std::vector<float>> OllamaEmbeddingProvider::embed(
    const std::string& text, std::string* errOut) const {
    if (text.empty()) {
        if (errOut) *errOut = jsonErr("empty text cannot be embedded");
        return std::nullopt;
    }
    // base URL may include a path; split host and prefix.
    std::string host = baseUrl_;
    std::string prefix;
    if (host.rfind("http://", 0) == 0) host = host.substr(7);
    else if (host.rfind("https://", 0) == 0) host = host.substr(8);
    auto slash = host.find('/');
    if (slash != std::string::npos) {
        prefix = host.substr(slash);
        host = host.substr(0, slash);
    }
    httplib::Client cli(host);
    cli.set_connection_timeout(timeoutSec_, 0);
    cli.set_read_timeout(timeoutSec_, 0);

    std::string escaped = Json::makeStr(text).dump();
    // Modern API first (/api/embed), input as an array.
    std::string req = "{\"model\":\"" + model_ + "\",\"input\":[" + escaped + "]}";
    httplib::Result res = cli.Post(prefix + "/api/embed", req, "application/json");
    if (!res || res->status != 200) {
        // Legacy fallback (/api/embeddings).
        std::string req2 = "{\"model\":\"" + model_ + "\",\"prompt\":" + escaped + "}";
        res = cli.Post(prefix + "/api/embeddings", req2, "application/json");
    }
    if (!res) {
        if (errOut) *errOut = jsonErr("ollama embedding request failed: httplib error");
        return std::nullopt;
    }
    if (res->status != 200) {
        if (errOut) *errOut = jsonErr("ollama embedding request failed with HTTP " +
                                      std::to_string(res->status));
        return std::nullopt;
    }
    try {
        Json body = Json::parse(res->body);
        // /api/embed -> {"embeddings": [[...]]}
        auto embeddings = body.at("embeddings");
        if (embeddings.isArray() && !embeddings.arr.empty()) {
            const Json& first = embeddings.arr.front();
            std::vector<float> v;
            v.reserve(first.arr.size());
            for (const auto& x : first.arr) {
                auto d = x.toDoubleOpt();
                if (!d) {
                    if (errOut) *errOut = jsonErr("ollama embedding element not a number");
                    return std::nullopt;
                }
                v.push_back((float)*d);
            }
            return v;
        }
        // /api/embeddings -> {"embedding": [...]}
        auto embedding = body.at("embedding");
        if (embedding.isArray() && !embedding.arr.empty()) {
            std::vector<float> v;
            v.reserve(embedding.arr.size());
            for (const auto& x : embedding.arr) {
                auto d = x.toDoubleOpt();
                if (!d) {
                    if (errOut) *errOut = jsonErr("ollama embedding element not a number");
                    return std::nullopt;
                }
                v.push_back((float)*d);
            }
            return v;
        }
        if (errOut) *errOut = jsonErr("unexpected ollama embedding response shape");
        return std::nullopt;
    } catch (const std::exception& e) {
        if (errOut) *errOut = jsonErr("bad ollama embedding response: " + std::string(e.what()));
        return std::nullopt;
    }
}

std::unique_ptr<EmbeddingProvider> makeEmbeddingProvider() {
    const char* url = std::getenv("VECTORDB_OLLAMA_URL");
    if (!url || !*url) return std::make_unique<NoopEmbeddingProvider>();
    const char* model = std::getenv("VECTORDB_OLLAMA_MODEL");
    std::string m = model && *model ? model : "nomic-embed-text";
    int timeout = 30;
    if (const char* t = std::getenv("VECTORDB_OLLAMA_TIMEOUT")) timeout = std::atoi(t);
    return std::make_unique<OllamaEmbeddingProvider>(url, m, timeout);
}

}  // namespace ydb