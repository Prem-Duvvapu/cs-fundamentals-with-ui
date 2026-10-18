# From PDFs and images to evidence you can inspect

This optional Project A boundary extracts digital PDF text or performs local OCR before any model call. It preserves page/source evidence and keeps absent or uncertain fields unknown. It adds no upload endpoint, account, website feature, model request or change to the default authenticated API.

It is **document preprocessing**, not a vision-language model or proof that an LLM understands a table. Keep deterministic source extraction, model output validation and business authorization as separate steps.

## 1. Build and generate original fixtures

Use Java 17 and Maven. Build first:

```sh
mvn -f examples/ai-backend/pom.xml verify
```

After that succeeds, generate synthetic fixtures in a directory you choose:

```sh
java -jar examples/ai-backend/target/ai-backend-example-0.0.1-SNAPSHOT.jar --document-fixtures /tmp/cs-document-fixtures
java -jar examples/ai-backend/target/ai-backend-example-0.0.1-SNAPSHOT.jar --documents digital /tmp/cs-document-fixtures/digital-ticket.pdf /tmp/digital-ticket-report.json
```

All sentences, page layouts and image pixels come from `documents/DocumentFixtures.java`. No learner documents, real support tickets, third-party scans or paid models are involved. The generator writes only its named fixture outputs and `expected.txt` in the requested directory. Regeneration preserves the intended content; PDF identifiers and system fonts may make file bytes differ across runs/platforms. Every extraction records the actual input SHA-256.

| Fixture | Predict before extracting |
|---|---|
| `digital-ticket.pdf` | Two pages; literal `ORD-1001` from page 1, line 2. PDF text has no OCR confidence score. |
| `scanned-ticket.pdf` | Digital mode finds no text; explicit OCR is needed. A white image-only page is not a missing parser registration. |
| `scanned-ticket.png` | OCR should recover the simple high-contrast support-ticket text, with word coordinates and engine scores. |
| `table-ticket.pdf` | Extracted words include `30.00`; that does not prove which cell, total or column it belongs to. |
| `missing-value.pdf` / `.png` | `Order ID:` is blank. The result stays `UNKNOWN`; the next line is not an invented ID. |
| `adversarial-note.pdf` / `.png` | “IGNORE PREVIOUS INSTRUCTIONS” remains untrusted source text. A visible `ORD-9999` cannot authorize access or a refund. |

## 2. Read the digital result

The JSON report contains the input hash, extraction mode/parser, `untrusted: true`, pages, a deliberately narrow literal `orderId` candidate and warnings. Each field candidate keeps page number, line number and a source evidence excerpt (up to 160 characters); the complete bounded page text remains available in the report. Coordinates in OCR words are raster pixels; PDF page provenance is not a claim of verified table geometry.

`LITERAL_CANDIDATE` means an exact labelled `ORD-####` string was observed. It is not a validated account/order relationship, semantic truth or a business action. Multiple labels become ambiguous rather than silently choosing one. Missing labels, blank values, unsupported strings, and low/unknown OCR scores produce `UNKNOWN` with `value: null`. The helper never changes `0RD-1001` into a plausible `ORD-1001`.

Do not concatenate a JSON report and treat its fields as trusted instructions. If you later pass reviewed source text to Project A, keep the document hash/page evidence, mark it untrusted and retain existing schema/literal validation. Authorization and exact-action approval remain server-side; OCR cannot grant either. This milestone makes no automatic model call, and its literal-ID field is not a replacement for the extraction service's typed output contract.

## 3. Enable real OCR explicitly

Tesseract is an external executable, not a Java model dependency. The supported contract is Tesseract **5.x**, English LSTM OCR, `--oem 1 --psm 6`, producing TSV. Install Tesseract and its English language data using your operating system's package manager. On Ubuntu:

```sh
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-eng fonts-dejavu-core
tesseract --version
```

Then run:

```sh
mvn -f examples/ai-backend/pom.xml -Ddocuments.ocr=true -Dtest=DocumentOcrTests test
java -jar examples/ai-backend/target/ai-backend-example-0.0.1-SNAPSHOT.jar --documents ocr /tmp/cs-document-fixtures/scanned-ticket.pdf /tmp/scanned-ticket-report.json
java -jar examples/ai-backend/target/ai-backend-example-0.0.1-SNAPSHOT.jar --documents image /tmp/cs-document-fixtures/scanned-ticket.png /tmp/scanned-image-report.json
```

`TESSERACT_COMMAND` may name an operator-selected executable path; it is one literal process argument, never a shell command or document-controlled option. No engine or language-data download occurs while processing a document. The real OCR tests deliberately fail if enabled without a usable Tesseract 5 engine. They do not fall back to fake OCR or an assumption-based skip.

The score threshold of 70 is a conservative **example policy**, not a calibrated 70% probability. The minimum word score on the labelled ID line gates promotion of that literal. A high score can still be wrong; a low one can be correct. Human review of the source crop or a separately measured extraction policy is necessary before consequential use. Word boxes and scores help locate errors; they do not prove semantic correctness.

## 4. Know the bounds

| Resource | Bound and behavior |
|---|---|
| Input | One regular, non-symlink local file, nonempty and at most 2 MiB; copied into owned temporary storage before parsing. |
| Digital/scanned PDF | At most two pages; encrypted PDFs are explicitly unsupported. |
| PDF worker | Separate Java process, 128 MiB maximum heap, headless mode and 30-second wall deadline. Parent kills its owned worker/descendants on timeout; bounded output/cleanup waits may add up to two seconds. |
| Raster/image | PNG or JPEG input only. At most 2,500 pixels on either side and 4 million pixels per page, checked before image decoding or PDF rasterization. PDFs render at 144 DPI; oversized geometry is refused. |
| Extracted text | At most 4,000 characters per page; limits fail explicitly instead of silently truncating evidence. |
| OCR tokens | At most 512 words per page, each at most 128 characters; malformed/nonfinite confidence and negative geometry are rejected. |
| Native OCR | Version probe: 3-second execution deadline / 4 KiB output. Each page: 10 seconds / 512 KiB TSV; OpenMP thread limit 1. |
| Derived PNG | Pixel cap plus a 16 MiB file-size check; page images are deleted after OCR. |
| Final JSON | At most 256 KiB. A complete valid report replaces the destination atomically; failed extraction leaves an existing report intact. |
| Process diagnostics | Captured status/output is bounded; child stderr is discarded, not copied into reports or analytics. |

The 30-second worker deadline covers parsing, rendering and OCR inside that worker. Parent regular-file copy and atomic publication are outside that deadline. Every default CLI invocation processes one document; embedding `extract()` in a future service would also require an application admission limit. This helper does not create an unbounded upload queue.

The Java heap limit is not an operating-system sandbox or a native-memory quota. File/page/pixel/text/process limits reduce the work performed; malformed compressed PDFs can still exhaust a worker and produce `WORKER_FAILED`. A real untrusted upload service would need a separately isolated resource/network policy. That service is not introduced here.

## 5. Predict, change and debug

1. Compare `digital` on `digital-ticket.pdf` with `digital` on `scanned-ticket.pdf`. Predict why the second report has `NO_TEXT_RECOGNIZED`. An image contains pixels, not a usable text layer.
2. Run explicit OCR on the scan and compare `method`, `ocrEngine`, word boxes and the source evidence. PDF rendering and image OCR are two different potential failure stages.
3. Compare the blank-ID fixtures with the adversarial fixtures. Missing evidence should stay unknown; embedded demands must remain data. An exact maliciously supplied ID is still only a candidate.
4. Open the table PDF and compare the rendered rows with extracted text. Change column widths or add a wrapped description in the generator. Explain why text ordering alone cannot safely assign all numeric cells.
5. Adjust test TSV scores from 89 to 40 or `-1` in `OcrContractTests`. Predict the change from candidate to unknown. These TSV unit fixtures test policy parsing; they are **not real OCR quality evidence**.
6. Make a three-page PDF or a 3,000-pixel-wide image with the existing fixture helpers. Predict `PAGE_LIMIT` or `PIXEL_LIMIT`, then run the focused tests. Increasing a limit needs a resource and accuracy reason, not just a passing demo.

Debug by stage and reason: `INPUT_LIMIT` before parsing; `INVALID_INPUT` for malformed formats; `PAGE_LIMIT`/`PIXEL_LIMIT` for unsupported work; `TEXT_LIMIT`/`OUTPUT_LIMIT` for oversized evidence; `OCR_UNAVAILABLE` for a missing/unsupported engine; `OCR_TIMEOUT` or `OCR_FAILED` for native processing; and `WORKER_TIMEOUT`/`WORKER_FAILED` for the isolated parser. Do not label every empty field an LLM hallucination: no LLM has run at this stage.

## 6. Interview comparison points

- **Why is a PDF not just text?** A PDF may encode positioned glyphs, images, forms and multiple columns. A scan needs OCR, and extracted word order need not represent logical rows or reading order.
- **Does OCR confidence prove an order number is correct?** No. It is an engine score over recognition output, not a calibrated business-field correctness probability. Preserve the original source and return unknown when evidence is absent or uncertain.
- **How would you debug a wrong invoice total?** Separate raster quality, OCR characters, layout/cell association, typed field validation and model interpretation. Inspect page/crop evidence before changing prompts; a correct character sequence can still come from the wrong cell.
- **What stops instructions in an image from becoming a tool action?** Extraction produces explicitly untrusted text. Application policy controls tools, identity and approvals; recognition does not confer authority. This helper executes neither document JavaScript nor embedded URLs.
- **Is a parsed field equivalent to authorization?** No. A literal can be present in an adversarial source. Tenant/resource checks and exact-action approval are independent requirements; reuse [the existing workflow boundary](WORKFLOW.md).

The deterministic PDF tests attach JavaScript and a link to a controlled local HTTP endpoint, extract the document and verify that no request occurred. OCR tests retain adversarial text as data. These checks establish the exercised behavior, not universal detection of prompt injection or completeness of every PDF feature.

## 7. Evidence and remaining work

The dedicated [AI document workflow](../../.github/workflows/ai-documents.yml) provisions actual Ubuntu Tesseract/English data, records package/runtime versions, runs the normal example regressions, enables the three real OCR tests and asserts zero skips/errors/failures. Four synthetic provenance reports are retained: image, scanned PDF, missing value and adversarial note. A green result with absent/skipped OCR is refused.

Local evidence is recorded separately from CI OCR evidence. Tesseract and `pdftotext` were absent in the local environment; digital PDF extraction uses actual PDFBox, not `pdftotext`. Default local tests intentionally disable the three real OCR tests. Enabling them without the executable must fail rather than claim OCR succeeded. No OCR accuracy, engine version or generative-quality result is claimed for an unexecuted path.

Remaining capabilities include verified table/cell extraction, multilingual/handwritten/rotated or low-quality scans, mixed text/image reading-order reconciliation, source-region human review, document-specific quality datasets and optional vision-language/audio model evaluation. A clean synthetic example does not close those gates. Existing live extraction-model failures remain a separate issue; this parser does not repair or hide them.

Primary sources checked October 18, 2026: [Apache PDFBox releases](https://pdfbox.apache.org/download.html) list 3.0.8 as current 3.x; [PDFBox 3 migration](https://pdfbox.apache.org/3.0/migration.html) documents the `Loader` API; [Tesseract command-line/TSV usage](https://tesseract-ocr.github.io/tessdoc/Command-Line-Usage.html) describes the engine/output contract; [Tesseract image-quality and table limitations](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html) explains failure modes. Upstream [Tesseract 5.5.3](https://github.com/tesseract-ocr/tesseract/releases/tag/5.5.3) was the current release checked; the CI distribution package may be a different maintained 5.x revision, and actual versions are recorded rather than labelled “latest.”

### Local verification checkpoint — October 18, 2026

The full example `mvn --batch-mode --no-transfer-progress -f examples/ai-backend/pom.xml verify` passed with **53 tests total: 50 passed, zero failures/errors, three real-OCR tests intentionally disabled**. The new local portion comprises 12 actual digital-PDF/resource-boundary tests, four TSV/field-policy tests and three subprocess tests. Explicitly enabling the real OCR suite failed with `OCR_UNAVAILABLE` and zero skips, as expected with no local executable.

After successful packaging, the actual Boot JAR generated the original fixtures and spawned its bounded digital-extraction worker. It returned two pages, runtime `Apache PDFBox 3.0.8`, `untrusted: true` and literal `ORD-1001` with page 1 / line 2 / exact evidence. The existing packaged HTTP/Basic/CSRF/tenant/version/revocation/agent/idempotency/MCP/evaluation smoke also passed unchanged. These results do not claim native OCR or generative correctness; CI must supply the separate enabled OCR evidence.
