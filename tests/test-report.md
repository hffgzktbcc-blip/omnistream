# OmniStream Cinema Video Player — E2E Test Execution Report

**Generated**: 2026-09-06T20:19:04.846Z  
**Total Tests**: 30 | **Passed**: 26 | **Failed**: 4 | **Pass Rate**: 86.7% | **Duration**: 113ms

## 1. Summary by Tier

| Tier | Description | Total | Passed | Failed | Pass Rate |
|---|---|---|---|---|---|
| Tier 3 | Cross-Feature Combinations (pairwise interactions) | 30 | 26 | 4 | 86.7% |

## 2. Summary by Feature

| Feature | Total | Passed | Failed | Status |
|---|---|---|---|---|
| F01+F03 | 1 | 1 | 0 | ✅ PASS |
| F03+F04 | 1 | 1 | 0 | ✅ PASS |
| F01+F05 | 1 | 1 | 0 | ✅ PASS |
| F02+F06 | 1 | 1 | 0 | ✅ PASS |
| F06+F08 | 1 | 1 | 0 | ✅ PASS |
| F08+F09 | 1 | 1 | 0 | ✅ PASS |
| F09+F10 | 1 | 1 | 0 | ✅ PASS |
| F10+F10 | 1 | 1 | 0 | ✅ PASS |
| F11+F19 | 1 | 1 | 0 | ✅ PASS |
| F12+F05 | 1 | 1 | 0 | ✅ PASS |
| F12+F13 | 1 | 1 | 0 | ✅ PASS |
| F14+F19 | 1 | 1 | 0 | ✅ PASS |
| F15+F06 | 1 | 1 | 0 | ✅ PASS |
| F16+F17 | 1 | 1 | 0 | ✅ PASS |
| F18+F19 | 1 | 1 | 0 | ✅ PASS |
| F19+F20 | 1 | 0 | 1 | ❌ FAIL |
| F20+F21 | 1 | 0 | 1 | ❌ FAIL |
| F21+F06 | 1 | 1 | 0 | ✅ PASS |
| F01+F12 | 1 | 1 | 0 | ✅ PASS |
| F01+F20 | 1 | 0 | 1 | ❌ FAIL |
| F08+F13 | 1 | 1 | 0 | ✅ PASS |
| F10+F06 | 1 | 1 | 0 | ✅ PASS |
| F05+F17 | 1 | 1 | 0 | ✅ PASS |
| F07+F21 | 1 | 1 | 0 | ✅ PASS |
| F23+F24 | 1 | 1 | 0 | ✅ PASS |
| F22+F23 | 1 | 1 | 0 | ✅ PASS |
| F24+F01 | 1 | 1 | 0 | ✅ PASS |
| F20+F20 | 1 | 0 | 1 | ❌ FAIL |
| F14+F10 | 1 | 1 | 0 | ✅ PASS |
| F09+F17 | 1 | 1 | 0 | ✅ PASS |

## 3. Failed Tests Diagnostics

### 1. [Tier 3] F19+F20 — T3.16: 5-Second progress records save to Cloud Watch History endpoint
- **Error**: `Expected values to be strictly equal:

404 !== 200
`

### 2. [Tier 3] F20+F21 — T3.17: Cloud Watch History retrieval feeds Exact-Second Resume lookup
- **Error**: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

### 3. [Tier 3] F01+F20 — T3.20: TV resolution season/episode matches Watch History composite ID tv_${id}
- **Error**: `Expected values to be strictly equal:

404 !== 200
`

### 4. [Tier 3] F20+F20 — T3.28: Local storage quota limit handled by preserving top 40 cloud entries
- **Error**: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

