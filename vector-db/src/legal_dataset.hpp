// Deterministic synthetic legal corpus: six practice areas
// (criminal_law, constitutional_law, property_law, contract_law, family_law,
// corporate_law), seeded RNG, reproducible across runs. Records carry the full
// Phase 8 metadata surface (country/court/jurisdiction/document_type/case_id/
// advocate_id/practice_area/year/source/title/act/section/page/paragraph and
// s3 provenance).
#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "ydb_types.hpp"

namespace ydb {

struct LegalDataset {
    // Deterministic. count == number of chunks/vectors to generate.
    std::vector<VectorRecord> generate(size_t count, int dim, uint64_t seed,
                                       std::string* errOut);
    Json summary() const;  // per-area distribution + seed + dim

    int dimension = 0;
    uint64_t seed = 0;
    std::map<std::string, int> perArea;  // populated by generate()
    std::vector<VectorRecord> records;   // result of last generate()
};

}  // namespace ydb