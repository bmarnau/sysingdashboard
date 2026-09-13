# Management-Wallboard Contract Track

This directory contains the versioned external data contract planning for the Management-Wallboard.

Current draft:

- `v0.1-draft/`

Related planning identifiers:

- `INT-CONTRACT-01` - external management data contract,
- Issue #123 - Management-Wallboard idea,
- Draft PR #124 - concept/documentation branch.

The contract track is deliberately separated from runtime implementation. It may evolve in parallel without changing the active BSF sprint order.

Rules:

- no productive secrets or credentials,
- no internal Supabase/Azure table contract exposed to the producer,
- no runtime endpoint implied by a draft schema,
- every version receives its own immutable package once shared externally,
- examples remain synthetic,
- production contract 1.0 requires BSF-04/BSF-05 review.
