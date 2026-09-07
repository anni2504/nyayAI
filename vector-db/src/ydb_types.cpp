#include "ydb_types.hpp"

#include <cctype>
#include <cstdio>
#include <cstring>
#include <sstream>
#include <string_view>

namespace ydb {

// ---------------------------------------------------------------------------
// jsonErr
// ---------------------------------------------------------------------------
std::string jsonErr(const std::string& msg) { return msg; }

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------
class JsonParser {
public:
    explicit JsonParser(const std::string& text) : s_(text) {}

    Json parse() {
        skipWs();
        Json v = parseValue();
        skipWs();
        if (pos_ != s_.size())
            throw std::runtime_error(jsonErr("unexpected trailing characters"));
        return v;
    }

private:
    const std::string& s_;
    size_t pos_ = 0;

    void skipWs() {
        while (pos_ < s_.size() && std::isspace(static_cast<unsigned char>(s_[pos_])))
            ++pos_;
    }

    [[noreturn]] void fail(const std::string& m) const {
        throw std::runtime_error(jsonErr("JSON parse error at offset " +
                                         std::to_string(pos_) + ": " + m));
    }

    bool consume(char c) {
        if (pos_ < s_.size() && s_[pos_] == c) {
            ++pos_;
            return true;
        }
        return false;
    }

    std::string parseString() {
        if (!consume('"')) fail("expected '\"'");
        std::string out;
        while (true) {
            if (pos_ >= s_.size()) fail("unterminated string");
            char c = s_[pos_++];
            if (c == '"') break;
            if (c == '\\') {
                if (pos_ >= s_.size()) fail("unterminated escape");
                char e = s_[pos_++];
                switch (e) {
                    case '"': out.push_back('"'); break;
                    case '\\': out.push_back('\\'); break;
                    case '/': out.push_back('/'); break;
                    case 'b': out.push_back('\b'); break;
                    case 'f': out.push_back('\f'); break;
                    case 'n': out.push_back('\n'); break;
                    case 'r': out.push_back('\r'); break;
                    case 't': out.push_back('\t'); break;
                    case 'u': {
                        if (pos_ + 4 > s_.size()) fail("bad \\u escape");
                        unsigned cp = 0;
                        for (int i = 0; i < 4; ++i) {
                            char h = s_[pos_++];
                            cp <<= 4;
                            if (h >= '0' && h <= '9') cp |= (unsigned)(h - '0');
                            else if (h >= 'a' && h <= 'f') cp |= (unsigned)(h - 'a' + 10);
                            else if (h >= 'A' && h <= 'F') cp |= (unsigned)(h - 'A' + 10);
                            else fail("bad \\u hex digit");
                        }
                        if (cp < 0x80) out.push_back((char)cp);
                        else if (cp < 0x800) {
                            out.push_back((char)(0xC0 | (cp >> 6)));
                            out.push_back((char)(0x80 | (cp & 0x3F)));
                        } else if (cp < 0x10000) {
                            out.push_back((char)(0xE0 | (cp >> 12)));
                            out.push_back((char)(0x80 | ((cp >> 6) & 0x3F)));
                            out.push_back((char)(0x80 | (cp & 0x3F)));
                        } else {
                            fail("surrogate pairs not supported");
                        }
                        break;
                    }
                    default: fail("bad escape");
                }
            } else {
                out.push_back(c);
            }
        }
        return out;
    }

    Json parseNumber() {
        size_t start = pos_;
        if (consume('-')) {}
        while (pos_ < s_.size() &&
               (std::isdigit(static_cast<unsigned char>(s_[pos_])) || s_[pos_] == '.' ||
                s_[pos_] == 'e' || s_[pos_] == 'E' || s_[pos_] == '+' || s_[pos_] == '-'))
            ++pos_;
        std::string tok = s_.substr(start, pos_ - start);
        char* end = nullptr;
        double v = std::strtod(tok.c_str(), &end);
        if (!end || *end != '\0') fail("bad number");
        return Json::makeNum(v);
    }

    Json parseValue() {
        if (pos_ >= s_.size()) fail("expected value");
        char c = s_[pos_];
        if (c == '{') {
            ++pos_;
            Json o = Json::makeObj();
            skipWs();
            if (consume('}')) return o;
            while (true) {
                skipWs();
                if (pos_ >= s_.size() || s_[pos_] != '"') fail("expected object key");
                std::string key = parseString();
                skipWs();
                if (!consume(':')) fail("expected ':'");
                skipWs();
                Json v = parseValue();
                o.obj[key] = std::move(v);
                skipWs();
                if (consume('}')) return o;
                if (!consume(',')) fail("expected ',' or '}'");
            }
        }
        if (c == '[') {
            ++pos_;
            Json a = Json::makeArr();
            skipWs();
            if (consume(']')) return a;
            while (true) {
                skipWs();
                a.arr.push_back(parseValue());
                skipWs();
                if (consume(']')) return a;
                if (!consume(',')) fail("expected ',' or ']'");
            }
        }
        if (c == '"') return Json::makeStr(parseString());
        if (c == 't') { pos_ += 4; return Json::makeBool(true); }
        if (c == 'f') { pos_ += 5; return Json::makeBool(false); }
        if (c == 'n') { pos_ += 4; return Json::null(); }
        if (c == '-' || std::isdigit(static_cast<unsigned char>(c))) return parseNumber();
        fail("unexpected character");
    }
};

Json Json::parse(const std::string& text) { return JsonParser(text).parse(); }

const Json& Json::at(const std::string& key) const {
    static const Json kNull = Json::null();
    auto it = obj.find(key);
    return it == obj.end() ? kNull : it->second;
}

Json& Json::operator[](const std::string& key) {
    if (type != Type::Obj) {
        obj.clear();
        type = Type::Obj;
    }
    return obj[key];
}

std::optional<double> Json::toDoubleOpt() const {
    if (type == Type::Num) return n;
    if (type == Type::Str) {
        try {
            size_t idx = 0;
            double v = std::stod(s, &idx);
            if (idx == s.size()) return v;
        } catch (...) {}
    }
    return std::nullopt;
}

std::optional<std::string> Json::toStringOpt() const {
    if (type == Type::Str) return s;
    return std::nullopt;
}

std::optional<std::string> Json::toStrOrNumOpt() const {
    if (type == Type::Str) return s;
    if (type == Type::Num) {
        // Deterministic formatting: integers printed without a decimal point.
        if (n == std::floor(n) && std::abs(n) < 9.007199254740992e15) {
            char buf[32];
            std::snprintf(buf, sizeof(buf), "%lld", (long long)n);
            return std::string(buf);
        }
        char buf[64];
        std::snprintf(buf, sizeof(buf), "%.10g", n);
        return std::string(buf);
    }
    return std::nullopt;
}

std::string jsonEscape(const std::string& in) {
    std::string out;
    for (char c : in) {
        switch (c) {
            case '"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            case '\b': out += "\\b"; break;
            case '\f': out += "\\f"; break;
            default:
                if (static_cast<unsigned char>(c) < 0x20) {
                    char buf[8];
                    std::snprintf(buf, sizeof(buf), "\\u%04x", (unsigned)c);
                    out += buf;
                } else {
                    out.push_back(c);
                }
        }
    }
    return out;
}

std::string Json::dump() const {
    switch (type) {
        case Type::Null: return "null";
        case Type::Bool: return b ? "true" : "false";
        case Type::Num: {
            if (n == std::floor(n) && std::abs(n) < 9.007199254740992e15) {
                char buf[32];
                std::snprintf(buf, sizeof(buf), "%lld", (long long)n);
                return buf;
            }
            char buf[64];
            std::snprintf(buf, sizeof(buf), "%.10g", n);
            return buf;
        }
        case Type::Str: return "\"" + jsonEscape(s) + "\"";
        case Type::Arr: {
            std::string out = "[";
            for (size_t i = 0; i < arr.size(); ++i) {
                if (i) out += ",";
                out += arr[i].dump();
            }
            return out + "]";
        }
        case Type::Obj: {
            std::string out = "{";
            bool first = true;
            for (const auto& kv : obj) {
                if (!first) out += ",";
                first = false;
                out += "\"" + jsonEscape(kv.first) + "\":" + kv.second.dump();
            }
            return out + "}";
        }
    }
    return "null";
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------
const char* metricName(Metric m) {
    switch (m) {
        case Metric::Cosine: return "cosine";
        case Metric::Euclidean: return "euclidean";
        case Metric::Manhattan: return "manhattan";
    }
    return "unknown";
}

bool metricFromString(const std::string& s, Metric& out) {
    std::string lower;
    for (char c : s) lower.push_back((char)std::tolower((unsigned char)c));
    if (lower == "cosine" || lower == "cos") { out = Metric::Cosine; return true; }
    if (lower == "euclidean" || lower == "euclid" || lower == "l2") { out = Metric::Euclidean; return true; }
    if (lower == "manhattan" || lower == "l1") { out = Metric::Manhattan; return true; }
    return false;
}

double toSimilarity(Metric m, double dist) {
    switch (m) {
        case Metric::Cosine:
            // dist = 1 - cos; similarity in [-1, 1]
            return std::max(-1.0, std::min(1.0, 1.0 - dist));
        default:
            return std::max(0.0, std::min(1.0, 1.0 / (1.0 + dist)));
    }
}

double metricDistance(Metric m, const std::vector<float>& a, const std::vector<float>& b) {
    const size_t d = std::min(a.size(), b.size());
    switch (m) {
        case Metric::Euclidean: {
            double sq = 0.0;
            for (size_t i = 0; i < d; ++i) {
                double diff = (double)a[i] - (double)b[i];
                sq += diff * diff;
            }
            return std::sqrt(sq);
        }
        case Metric::Manhattan: {
            double sum = 0.0;
            for (size_t i = 0; i < d; ++i)
                sum += std::fabs((double)a[i] - (double)b[i]);
            return sum;
        }
        case Metric::Cosine: {
            double dot = 0.0, na = 0.0, nb = 0.0;
            for (size_t i = 0; i < d; ++i) {
                dot += (double)a[i] * (double)b[i];
                na += (double)a[i] * (double)a[i];
                nb += (double)b[i] * (double)b[i];
            }
            na = std::sqrt(na);
            nb = std::sqrt(nb);
            if (na < 1e-9 || nb < 1e-9) return 1.0;  // undefined cosine -> max distance
            double cos = dot / (na * nb);
            cos = std::max(-1.0, std::min(1.0, cos));
            return 1.0 - cos;
        }
    }
    return 0.0;
}

const char* validation::codeMessage(Code c) {
    switch (c) {
        case Code::Ok: return "ok";
        case Code::WrongDimension: return "vector dimension does not match store dimension";
        case Code::ContainsNaN: return "vector contains NaN";
        case Code::ContainsInf: return "vector contains infinity";
        case Code::TooSmall: return "vector must have at least 1 component";
        case Code::ZeroNormQuery: return "cosine query vector has zero magnitude; cosine similarity is undefined";
    }
    return "unknown";
}

validation::Code validateVector(const std::vector<float>& v, int dim, Metric m, bool isQuery) {
    if (v.empty()) return validation::Code::TooSmall;
    if (dim > 0 && (int)v.size() != dim) return validation::Code::WrongDimension;
    double normSq = 0.0;
    for (float x : v) {
        if (std::isnan(x)) return validation::Code::ContainsNaN;
        if (std::isinf(x)) return validation::Code::ContainsInf;
        normSq += (double)x * (double)x;
    }
    if (isQuery && m == Metric::Cosine && normSq < 1e-12)
        return validation::Code::ZeroNormQuery;
    return validation::Code::Ok;
}

// ---------------------------------------------------------------------------
// VectorRecord
// ---------------------------------------------------------------------------
Json VectorRecord::toJson(const std::vector<std::string>& included_metadata_keys) const {
    Json o = Json::makeObj();
    o["id"] = Json::makeStr(id);
    o["document_id"] = Json::makeStr(document_id);
    o["chunk_id"] = Json::makeStr(chunk_id);
    o["dimension"] = Json::makeNum(dimension);
    o["text_reference"] = Json::makeStr(text_reference);
    o["created_at"] = Json::makeStr(created_at);
    o["updated_at"] = Json::makeStr(updated_at);
    o["embedding_model"] = Json::makeStr(embedding_model);
    o["embedding_version"] = Json::makeStr(embedding_version);

    // Full metadata object unless caller asked for a projection.
    if (included_metadata_keys.empty()) {
        Json md = Json::makeObj();
        for (const auto& kv : metadata) md[kv.first] = Json::makeStr(kv.second);
        o["metadata"] = std::move(md);
    } else {
        Json md = Json::makeObj();
        for (const auto& k : included_metadata_keys) {
            auto it = metadata.find(k);
            if (it != metadata.end()) md[k] = Json::makeStr(it->second);
        }
        o["metadata"] = std::move(md);
    }
    return o;
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------
Filter Filter::eq(std::string k, std::string v) { return Filter{std::move(k), Op::Eq, std::move(v)}; }

namespace {
int64_t toInt(const std::string& s, bool& ok) {
    ok = false;
    if (s.empty()) return 0;
    char* end = nullptr;
    long long v = std::strtoll(s.c_str(), &end, 10);
    if (!end || *end != '\0') return 0;
    // allow only canonical integer (no signs/whitespace beyond normal)
    ok = true;
    return (int64_t)v;
}
}  // namespace

bool Filter::matches(const Metadata& md) const {
    auto it = md.find(key);
    std::string actual;
    if (it == md.end()) {
        // A missing key is treated as an empty string (filterable, documented).
        actual = "";
    } else {
        actual = it->second;
    }

    switch (op) {
        case Op::Eq: return actual == value;
        case Op::Ne: return actual != value;
        case Op::Gt:
        case Op::Gte:
        case Op::Lt:
        case Op::Lte: {
            bool aok = false, bok = false;
            int64_t ai = toInt(actual, aok), bi = toInt(value, bok);
            if (aok && bok) {
                return op == Op::Gt ? ai > bi
                    : op == Op::Gte   ? ai >= bi
                    : op == Op::Lt    ? ai < bi
                                      : ai <= bi;
            }
            // Non-numeric fall back to lexicographic comparison.
            if (op == Op::Gt) return actual > value;
            if (op == Op::Gte) return actual >= value;
            if (op == Op::Lt) return actual < value;
            return actual <= value;
        }
    }
    return false;
}

std::optional<Filters> parseFilters(const Json& obj, std::string& errOut) {
    Filters out;
    if (!obj.isObject()) {
        errOut = jsonErr("filters must be a JSON object");
        return std::nullopt;
    }
    for (const auto& kv : obj.obj) {
        const Json& v = kv.second;
        Filter f;
        f.key = kv.first;
        if (v.isString()) {
            f.op = Filter::Op::Eq;
            f.value = v.s;
        } else if (v.isNumber() || v.isBool()) {
            auto sv = v.toStrOrNumOpt();
            f.op = Filter::Op::Eq;
            f.value = sv.value_or("");
        } else if (v.isObject()) {
            auto op = v.at("op").toStringOpt();
            auto val = v.at("value").toStrOrNumOpt();
            if (!op || !val) {
                errOut = jsonErr("filter object for key '" + kv.first +
                                 "' must have string 'op' and scalar 'value'");
                return std::nullopt;
            }
            if (*op == "eq") f.op = Filter::Op::Eq;
            else if (*op == "ne") f.op = Filter::Op::Ne;
            else if (*op == "gt") f.op = Filter::Op::Gt;
            else if (*op == "gte") f.op = Filter::Op::Gte;
            else if (*op == "lt") f.op = Filter::Op::Lt;
            else if (*op == "lte") f.op = Filter::Op::Lte;
            else {
                errOut = jsonErr("unknown filter op '" + *op + "' for key '" + kv.first + "'");
                return std::nullopt;
            }
            f.value = *val;
        } else {
            errOut = jsonErr("filter for key '" + kv.first +
                             "' must be a scalar or {op,value} object");
            return std::nullopt;
        }
        out.push_back(std::move(f));
    }
    return out;
}

}  // namespace ydb