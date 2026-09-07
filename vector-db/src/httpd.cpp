// NYAYAI vector database HTTP API (cpp-httplib).
// Endpoints: GET /health, GET /stats, POST /insert, POST /search,
// DELETE /delete/:id, GET /items, POST /index/rebuild, GET /index/info,
// POST /benchmark, POST /dataset/legal.
#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <string>

#include "benchmark.hpp"
#include "embed_provider.hpp"
#include "httplib.h"
#include "legal_dataset.hpp"
#include "vector_store.hpp"
#include "ydb_types.hpp"

using namespace ydb;

namespace {

const char kAppName[] = "nyayai-vdb";

void sendJson(httplib::Response& res, const Json& body, int status = 200) {
    res.status = status;
    res.set_header("Content-Type", "application/json; charset=utf-8");
    res.set_content(body.dump(), "application/json; charset=utf-8");
}

void sendError(httplib::Response& res, const std::string& msg, int status = 400) {
    Json o = Json::makeObj();
    o["status"] = Json::makeStr("error");
    o["error"] = Json::makeStr(msg);
    res.status = status;
    res.set_header("Content-Type", "application/json; charset=utf-8");
    res.set_content(o.dump(), "application/json; charset=utf-8");
}

bool parseBodyOr400(const httplib::Request& req, httplib::Response& res, Json& out,
                    std::string& errMsg) {
    if (req.body.empty()) {
        errMsg = jsonErr("empty request body");
        sendError(res, errMsg);
        return false;
    }
    try {
        Json v = Json::parse(req.body);
        if (!v.isObject()) {
            errMsg = jsonErr("request body must be a JSON object");
            sendError(res, errMsg);
            return false;
        }
        out = std::move(v);
        return true;
    } catch (const std::exception& e) {
        errMsg = jsonErr(std::string("invalid JSON: ") + e.what());
        sendError(res, errMsg);
        return false;
    }
}

int parseQueryInt(const httplib::Request& req, const char* name, int dflt, int lo,
                  int hi) {
    if (!req.has_param(name)) return dflt;
    int v = std::atoi(req.get_param_value(name).c_str());
    if (v < lo) v = lo;
    if (v > hi) v = hi;
    return v;
}

// Converts a JSON object of scalars into Metadata. Values may be strings,
// numbers or booleans; anything else is rejected.
bool metadataFromJson(const Json& obj, Metadata& out, std::string* err) {
    if (!obj.isObject()) {
        *err = jsonErr("metadata must be a JSON object");
        return false;
    }
    for (const auto& kv : obj.obj) {
        if (kv.second.isObject() || kv.second.isArray() || kv.second.isNull()) {
            *err = jsonErr("metadata value for '" + kv.first + "' must be a scalar");
            return false;
        }
        auto sv = kv.second.toStrOrNumOpt();
        if (!sv) {
            if (kv.second.isBool()) out[kv.first] = kv.second.b ? "true" : "false";
            else {
                *err = jsonErr("metadata value for '" + kv.first + "' not convertible to string");
                return false;
            }
        } else {
            out[kv.first] = *sv;
        }
    }
    return true;
}

const char* envOr(const char* key, const char* dflt) {
    const char* v = std::getenv(key);
    return (v && *v) ? v : dflt;
}

}  // namespace

int main() {
    Metric metric = Metric::Cosine;
    if (const char* m = std::getenv("VECTORDB_METRIC")) {
        if (metricFromString(m, metric) == false) {
            std::fprintf(stderr, "invalid VECTORDB_METRIC '%s'\n", m);
            return 1;
        }
    }
    const std::string dataDir = envOr("VECTORDB_DATA_DIR", "./data");
    const std::string fileName = envOr("VECTORDB_FILE", "vectors.vdb");
    const int port = std::atoi(envOr("VECTORDB_PORT", "5400"));
    const bool autosave = std::string(envOr("VECTORDB_AUTOSAVE", "1")) != "0";

    VectorStore store(metric, dataDir, fileName);
    store.setAutosave(autosave);

    std::string loadErr;
    if (!store.load(&loadErr)) {
        std::fprintf(stderr, "warning: %s\n", loadErr.c_str());
    }

    auto provider = makeEmbeddingProvider();

    httplib::Server svr;
    svr.set_error_handler([](const httplib::Request&, httplib::Response& res) {
        if (res.status != 400) {
            Json o = Json::makeObj();
            o["status"] = Json::makeStr("error");
            o["error"] = Json::makeStr("not found");
            res.status = 404;
            res.set_header("Content-Type", "application/json; charset=utf-8");
            res.set_content(o.dump(), "application/json; charset=utf-8");
        }
    });

    svr.Get("/", [](const httplib::Request&, httplib::Response& res) {
        res.set_content("nyayai-vdb - custom C++ vector database. See /health, "
                        "/stats, /index/info. API: POST /insert, POST /search, "
                        "DELETE /delete/:id, GET /items, POST /index/rebuild, "
                        "POST /benchmark, POST /dataset/legal.",
                        "text/plain");
    });

    svr.Get("/health", [&](const httplib::Request&, httplib::Response& res) {
        Json o = Json::makeObj();
        o["status"] = Json::makeStr("ok");
        o["service"] = Json::makeStr(kAppName);
        o["version"] = Json::makeStr(YDB_VERSION);
        o["vector_count"] = Json::makeNum((double)store.count());
        o["dimension"] = Json::makeNum(store.dimension());
        o["metric"] = Json::makeStr(metricName(store.metric()));
        o["index"] = Json::makeStr(store.activeIndexName());
        o["uptime_s"] = store.stats().at("uptime_s");
        o["persistence"] = Json::makeStr(store.dataFilePath());
        sendJson(res, o);
    });

    svr.Get("/stats", [&](const httplib::Request&, httplib::Response& res) {
        sendJson(res, store.stats());
    });

    svr.Post("/insert", [&](const httplib::Request& req, httplib::Response& res) {
        Json body;
        std::string err;
        if (!parseBodyOr400(req, res, body, err)) return;

        VectorRecord rec;
        rec.id = body.at("id").toStringOpt().value_or("");
        rec.document_id = body.at("document_id").toStringOpt().value_or("");
        if (rec.document_id.empty()) {
            sendError(res, jsonErr("document_id is required"));
            return;
        }
        rec.chunk_id = body.at("chunk_id").toStringOpt().value_or("");
        rec.text_reference = body.at("text_reference").toStringOpt().value_or("");
        rec.embedding_model = body.at("embedding_model").toStringOpt().value_or("");
        rec.embedding_version = body.at("embedding_version").toStringOpt().value_or("");

        const Json& vecJson = body.at("vector");
        if (vecJson.isArray()) {
            std::vector<float> v;
            v.reserve(vecJson.arr.size());
            for (const auto& x : vecJson.arr) {
                auto d = x.toDoubleOpt();
                if (!d) {
                    sendError(res, jsonErr("vector must contain only numbers"));
                    return;
                }
                v.push_back((float)*d);
            }
            rec.vector = std::move(v);
        } else {
            // Optional text embedding path (only if a provider is configured).
            const char* text = body.at("text").isString() ? body.at("text").s.c_str() : nullptr;
            if (!text || !*text) {
                sendError(res, jsonErr("vector array is required (or text with an "
                                       "embedding provider configured)"));
                return;
            }
            auto emb = provider->embed(text, &err);
            if (!emb) {
                sendError(res, jsonErr("embedding unavailable: " + err), 500);
                return;
            }
            rec.vector = std::move(*emb);
        }

        if (body.at("metadata").isObject()) {
            if (!metadataFromJson(body.at("metadata"), rec.metadata, &err)) {
                sendError(res, err);
                return;
            }
        }

        std::string storeErr;
        InsertResult r = store.upsert(rec, &storeErr);
        if (!r.created && !r.updated) {
            sendError(res, storeErr.empty() ? jsonErr("insert failed") : storeErr, 400);
            return;
        }
        Json o = Json::makeObj();
        o["status"] = Json::makeStr("ok");
        o["id"] = Json::makeStr(r.id);
        o["created"] = Json::makeBool(r.created);
        o["updated"] = Json::makeBool(r.updated);
        Json stored = Json::makeObj();
        VectorRecord saved;
        std::string gerr;
        if (store.get(r.id, &saved, &gerr)) {
            stored = saved.toJson({"document_id", "chunk_id", "dimension",
                                   "text_reference", "created_at", "updated_at"});
            stored.obj.erase("id");
        }
        o["record"] = std::move(stored);
        sendJson(res, o);
    });

    svr.Post("/search", [&](const httplib::Request& req, httplib::Response& res) {
        Json body;
        std::string err;
        if (!parseBodyOr400(req, res, body, err)) return;

        const Json& vecJson = body.at("vector");
        std::vector<float> q;
        if (vecJson.isArray()) {
            q.reserve(vecJson.arr.size());
            for (const auto& x : vecJson.arr) {
                auto d = x.toDoubleOpt();
                if (!d) {
                    sendError(res, jsonErr("vector must contain only numbers"));
                    return;
                }
                q.push_back((float)*d);
            }
        } else {
            const char* text = body.at("text").isString() ? body.at("text").s.c_str() : nullptr;
            if (!text || !*text) {
                sendError(res, jsonErr("vector array (or text) is required"));
                return;
            }
            auto emb = provider->embed(text, &err);
            if (!emb) {
                sendError(res, jsonErr("embedding unavailable: " + err), 500);
                return;
            }
            q = std::move(*emb);
        }

        Metric qm = store.metric();
        if (body.at("metric").isString() && !metricFromString(body.at("metric").s, qm)) {
            sendError(res, jsonErr("unknown metric"));
            return;
        }
        const std::string idx = body.at("index").isString() ? body.at("index").s : "";
        int topK = (int)body.at("top_k").toDoubleOpt().value_or(10.0);
        int ef = (int)body.at("ef").toDoubleOpt().value_or(0.0);
        bool includeVector = body.at("include_vector").toDoubleOpt().value_or(0.0) != 0.0;

        Filters filters;
        if (body.at("filters").isObject()) {
            auto maybeFilters = parseFilters(body.at("filters"), err);
            if (!maybeFilters) {
                sendError(res, err);
                return;
            }
            filters = std::move(*maybeFilters);
        }

        std::string sErr;
        SearchResponse sr = store.search(q, topK, idx, qm, filters, ef, includeVector, &sErr);
        if (!sr.ok) {
            sendError(res, sr.error.empty() ? sErr : sr.error);
            return;
        }
        sendJson(res, sr.body);
    });

    svr.Delete("/delete/:id", [&](const httplib::Request& req, httplib::Response& res) {
        auto it = req.path_params.find("id");
        if (it == req.path_params.end()) {
            sendError(res, jsonErr("missing id"), 400);
            return;
        }
        std::string err;
        if (!store.remove(it->second, &err)) {
            sendError(res, err.empty() ? jsonErr("record not found") : err, 404);
            return;
        }
        Json o = Json::makeObj();
        o["status"] = Json::makeStr("ok");
        o["deleted"] = Json::makeBool(true);
        o["id"] = Json::makeStr(it->second);
        sendJson(res, o);
    });

    svr.Get("/items", [&](const httplib::Request& req, httplib::Response& res) {
        int offset = parseQueryInt(req, "offset", 0, 0, 100000000);
        int limit = parseQueryInt(req, "limit", 100, 1, 10000);
        bool withVec = parseQueryInt(req, "include_vector", 0, 0, 1) == 1;
        auto recs = store.allRecords((size_t)offset, (size_t)limit);
        Json arr = Json::makeArr();
        for (const auto& r : recs) {
            Json item = r.toJson({"document_id", "chunk_id", "dimension",
                                  "text_reference", "created_at", "updated_at"});
            if (withVec) {
                Json vec = Json::makeArr();
                for (float x : r.vector) vec.arr.push_back(Json::makeNum(x));
                item["vector"] = std::move(vec);
            }
            arr.arr.push_back(std::move(item));
        }
        Json o = Json::makeObj();
        o["status"] = Json::makeStr("ok");
        o["offset"] = Json::makeNum(offset);
        o["limit"] = Json::makeNum((double)arr.arr.size());
        o["total"] = Json::makeNum((double)store.count());
        o["items"] = std::move(arr);
        sendJson(res, o);
    });

    svr.Post("/index/rebuild", [&](const httplib::Request& req, httplib::Response& res) {
        Json body;
        std::string err;
        if (req.body.empty()) body = Json::makeObj();
        else if (!parseBodyOr400(req, res, body, err)) return;
        std::string idx = body.at("index").toStringOpt().value_or("all");
        uint64_t seed = (uint64_t)body.at("seed").toDoubleOpt().value_or(42.0);
        std::string sErr;
        if (!store.rebuild(idx, &sErr, seed)) {
            sendError(res, sErr.empty() ? jsonErr("rebuild failed") : sErr, 400);
            return;
        }
        Json o = Json::makeObj();
        o["status"] = Json::makeStr("ok");
        o["index"] = Json::makeStr(idx);
        o["rebuilt_at"] = store.stats().at("persistence").at("last_rebuild_at");
        o["vectors"] = Json::makeNum((double)store.count());
        sendJson(res, o);
    });

    svr.Get("/index/info", [&](const httplib::Request&, httplib::Response& res) {
        sendJson(res, store.indexInfo());
    });

    svr.Post("/benchmark", [&](const httplib::Request& req, httplib::Response& res) {
        Json body;
        std::string err;
        if (!parseBodyOr400(req, res, body, err)) return;
        BenchmarkConfig cfg;
        cfg.count = (int)body.at("count").toDoubleOpt().value_or(1000.0);
        cfg.dim = (int)body.at("dimension").toDoubleOpt().value_or(64.0);
        cfg.topK = (int)body.at("top_k").toDoubleOpt().value_or(10.0);
        cfg.queries = (int)body.at("queries").toDoubleOpt().value_or(200.0);
        cfg.ef = (int)body.at("ef_search").toDoubleOpt().value_or(100.0);
        cfg.seed = (uint64_t)body.at("seed").toDoubleOpt().value_or(42.0);
        cfg.include_kdtree = body.at("include_kdtree").toDoubleOpt().value_or(0.0) != 0.0;
        if (body.at("metric").isString()) {
            if (!metricFromString(body.at("metric").s, cfg.metric)) {
                sendError(res, jsonErr("unknown metric"));
                return;
            }
        }
        std::string bErr;
        Json result = runBenchmark(cfg, &bErr);
        if (result.isNull()) {
            sendError(res, bErr.empty() ? jsonErr("benchmark failed") : bErr, 400);
            return;
        }
        sendJson(res, result);
    });

    svr.Post("/dataset/legal", [&](const httplib::Request& req, httplib::Response& res) {
        Json body;
        std::string err;
        if (!parseBodyOr400(req, res, body, err)) return;
        int count = (int)body.at("count").toDoubleOpt().value_or(1000.0);
        int dimension = (int)body.at("dimension").toDoubleOpt().value_or(64.0);
        uint64_t seed = (uint64_t)body.at("seed").toDoubleOpt().value_or(42.0);
        bool clear = body.at("clear").isBool() ? body.at("clear").b
                                                : body.at("clear").toDoubleOpt().value_or(0.0) != 0.0;
        if (store.count() > 0 && !clear) {
            sendError(res, jsonErr("store is not empty; pass {\"clear\": true} to replace"));
            return;
        }
        LegalDataset ds;
        auto recs = ds.generate((size_t)count, dimension, seed, &err);
        if (recs.empty() && count > 0) {
            sendError(res, err.empty() ? jsonErr("dataset generation failed") : err);
            return;
        }
        if (clear) {
            std::string clearErr;
            if (!store.clearAll(&clearErr)) {
                sendError(res, jsonErr("cannot clear store: " + clearErr), 500);
                return;
            }
        }
        store.setAutosave(false);
        for (const auto& r : recs) {
            std::string uErr;
            store.upsert(r, &uErr);
        }
        std::string sErr;
        bool saved = store.save(&sErr);
        store.setAutosave(true);
        if (!saved) {
            sendError(res, jsonErr("dataset persisted, final save failed: " + sErr), 500);
            return;
        }
        Json o = Json::makeObj();
        o["status"] = Json::makeStr("ok");
        o["loaded"] = Json::makeNum((double)recs.size());
        o["summary"] = ds.summary();
        sendJson(res, o);
    });

    std::fprintf(stderr, "nyayai-vdb listening on 127.0.0.1:%d (metric=%s, data=%s)\n",
                 port, metricName(metric), store.dataFilePath().c_str());
    svr.listen("127.0.0.1", port);
    return 0;
}