#include "legal_dataset.hpp"

#include <cstdio>
#include <random>

namespace ydb {

namespace {
uint64_t fnvHash(const std::string& s) {
    uint64_t h = 1469598103934665603ull;
    for (char c : s) {
        h ^= (unsigned char)c;
        h *= 1099511628211ull;
    }
    return h;
}

// Stable cluster centroid per practice area (independent of RNG stream so
// per-area clusters are reproducibly separable).
std::vector<float> areaCentroid(const std::string& area, int dim) {
    std::vector<float> c((size_t)dim, 0.0f);
    for (int i = 0; i < dim; ++i) {
        uint64_t h = fnvHash(area + "|" + std::to_string(i));
        double v = (double)(h % 10000) / 10000.0;  // [0,1)
        c[(size_t)i] = (float)((v - 0.5) * 2.0);   // [-1,1)
    }
    // Normalize so cosine clusters are comparable across areas.
    double n = 0.0;
    for (float x : c) n += (double)x * (double)x;
    n = std::sqrt(n);
    if (n > 1e-9) for (float& x : c) x = (float)((double)x / n);
    return c;
}
}  // namespace

std::vector<VectorRecord> LegalDataset::generate(size_t count, int dim,
                                                 uint64_t seed,
                                                 std::string* errOut) {
    if (count > 10000000) {
        if (errOut) *errOut = jsonErr("dataset count too large");
        return {};
    }
    if (dim <= 0 || dim > 4096) {
        if (errOut) *errOut = jsonErr("dataset dimension must be in [1, 4096]");
        return {};
    }

    static const char* kAreas[] = {"criminal_law",      "constitutional_law",
                                   "property_law",       "contract_law",
                                   "family_law",         "corporate_law"};
    static const char* kCourts[] = {"Supreme Court of India",
                                    "High Court of Karnataka",
                                    "High Court of Delhi",
                                    "High Court of Bombay",
                                    "City Civil Court, Mumbai",
                                    "District Courts of Bengaluru"};
    static const char* kJurisdiction[] = {"India",  "Karnataka", "Delhi",
                                          "Maharashtra", "National"};
    static const char* kDocTypes[] = {"judgment", "order", "statute",
                                      "article",  "notice", "petition"};
    static const char* kSources[] = {"case-law-supplier", "court-portal",
                                     "law-commission"};
    static const std::map<std::string, const char*> kActs = {
        {"criminal_law", "Bharatiya Nyaya Sanhita, 2023"},
        {"constitutional_law", "Constitution of India"},
        {"property_law", "Transfer of Property Act, 1882"},
        {"contract_law", "Indian Contract Act, 1872"},
        {"family_law", "Hindu Marriage Act, 1955"},
        {"corporate_law", "Companies Act, 2013"}};
    static const char* kTitleWords[] = {"R. v.", "State of", "In re", "Reliance v.",
                                        "Union of India v.", "Smt."};

    std::mt19937 rng(seed);
    std::uniform_int_distribution<int> cat(0, 5);
    std::uniform_int_distribution<int> court(0, 5);
    std::uniform_int_distribution<int> juris(0, 4);
    std::uniform_int_distribution<int> dtype(0, 5);
    std::uniform_int_distribution<int> src(0, 2);
    std::uniform_int_distribution<int> year(2016, 2025);
    std::uniform_int_distribution<int> sec(1, 120);
    std::uniform_int_distribution<int> page(1, 300);
    std::uniform_int_distribution<int> para(1, 24);
    std::uniform_int_distribution<int> word(0, 5);
    std::uniform_int_distribution<int> jitter(0, 100000);

    records.clear();
    perArea.clear();
    dimension = dim;
    this->seed = seed;

    std::vector<std::vector<float>> centroids(6);
    for (int a = 0; a < 6; ++a) centroids[(size_t)a] = areaCentroid(kAreas[a], dim);

    records.reserve(count);
    for (size_t i = 0; i < count; ++i) {
        VectorRecord r;
        const int a = cat(rng);
        const std::string area = kAreas[a];

        // Vector = centroid + bounded uniform jitter (deterministic).
        r.vector.resize((size_t)dim);
        for (int d = 0; d < dim; ++d) {
            double j = (double)jitter(rng) / 100000.0 * 2.0 - 1.0;  // [-1,1)
            r.vector[(size_t)d] = centroids[(size_t)a][(size_t)d] + (float)(j * 0.35);
        }

        r.dimension = dim;
        char caseBuf[32];
        std::snprintf(caseBuf, sizeof(caseBuf), "CASE-%06zu", i + 1);
        const std::string caseId = caseBuf;
        char advBuf[32];
        std::snprintf(advBuf, sizeof(advBuf), "ADV-%04d", (int)(i % 900 + 1));

        r.document_id = caseId;
        std::snprintf(caseBuf, sizeof(caseBuf), "c%04zu", i + 1);
        r.chunk_id = caseBuf;
        r.id = area + ":" + caseId + ":" + r.chunk_id;

        r.text_reference = "s3://nyayai-legal-corpus/corpus/" + area + "/" + caseId +
                           ".pdf#page=" + std::to_string(page(rng));

        const char* act = kActs.count(area) ? kActs.at(area) : "Act";
        r.metadata["country"] = "India";
        r.metadata["court"] = kCourts[court(rng)];
        r.metadata["jurisdiction"] = kJurisdiction[juris(rng)];
        r.metadata["document_type"] = kDocTypes[dtype(rng)];
        r.metadata["case_id"] = caseId;
        r.metadata["advocate_id"] = advBuf;
        r.metadata["advocate_name"] = "Advocate " + std::string(advBuf);
        r.metadata["practice_area"] = area;
        r.metadata["year"] = std::to_string(year(rng));
        r.metadata["source"] = kSources[src(rng)];
        r.metadata["title"] = std::string(kTitleWords[word(rng)]) + " " + caseId;
        r.metadata["act"] = act;
        r.metadata["section"] = std::to_string(sec(rng));
        r.metadata["page"] = std::to_string(page(rng));
        r.metadata["paragraph"] = std::to_string(para(rng));
        r.metadata["s3_bucket"] = "nyayai-legal-corpus";
        r.metadata["s3_key"] = "corpus/" + area + "/" + caseId + ".pdf";
        r.metadata["s3_version_id"] = "v1";

        records.push_back(std::move(r));
        perArea[area]++;
    }
    return records;
}

Json LegalDataset::summary() const {
    Json o = Json::makeObj();
    o["count"] = Json::makeNum((double)records.size());
    o["dimension"] = Json::makeNum(dimension);
    o["seed"] = Json::makeNum((double)seed);
    Json areas = Json::makeObj();
    for (const auto& kv : perArea) areas[kv.first] = Json::makeNum(kv.second);
    o["per_area"] = std::move(areas);
    return o;
}

}  // namespace ydb