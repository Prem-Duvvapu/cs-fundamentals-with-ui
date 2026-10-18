# Security milestone: validate JWTs without losing object authorization

This opt-in extension reuses Task Tracker and its existing project/owner model. Read the [Spring Security lesson](https://cs-fundamentals-with-ui.vercel.app/topic/spring-security) for sessions, JWT and OAuth terminology; the distinct exercise here is actual signature/claim validation over HTTP, key rotation, and permission failures.

**Versions checked 2026-10-18:** Java 17; Spring Boot 4.1.1; Boot-managed Spring Security 7.1.1 and Nimbus JOSE JWT 10.9.1. The POM adds the official `spring-boot-starter-security-oauth2-resource-server`; it does not manually assemble a second security framework. Private RSA keys and passwords are generated at runtime in tests and never committed.

A JWT is a signed claim envelope, not encryption, permission to every object, or proof that a complete OAuth flow exists. The local JWKS fixture serves actual public keys over an owned HTTP socket. The resource server verifies actual generated signatures. **There is no deployed OAuth authorization server, authorization-code/PKCE flow, OIDC login, refresh-token service, consent screen, revocation endpoint or cloud secret store.**

## 1. Keep credential boundaries explicit

Default startup remains the in-memory teaching app. The `jwt` profile includes `persistence,secure` and adds a higher-priority chain **only** when a request to the existing `/api/projects` routes contains an Authorization header beginning with Bearer. It does not introduce duplicate project controllers or another CRUD application.

| Request | Existing or added behavior |
|---|---|
| Basic credentials/session on `/api/projects` | Existing role/owner checks; mutations still require CSRF |
| Bearer header on `/api/projects` with `jwt` active | Stateless JWT validation plus read/write scope and existing owner checks |
| Invalid/expired Bearer token | 401; never fall through to Basic/session authentication |
| Valid Bearer token lacking required scope | 403; arbitrary `roles` claims do not grant access |
| Valid subject accessing another owner's project | 404 using the existing service query |
| Token only in URL query, form or cookie | Not a JWT credential source |
| Other routes | Existing security chains, profiles and rules |

CSRF is disabled only in the explicit-header stateless bearer chain: a browser does not automatically attach that bearer header as it does a cookie. Basic/session requests retain their original CSRF boundary. This is a teaching side-by-side arrangement; production services should document and minimize supported credential modes instead of accumulating accidental authentication fallbacks.

The trusted token's `sub` becomes the existing owner's name. The fixture deliberately uses `alice`, `bob`, and `viewer` to match the example identities. A real identity-provider migration needs an explicit `(issuer, subject)` mapping to internal owner IDs; usernames from unrelated identity realms must not silently collide. This lab trusts exactly one configured issuer and audience.

## 2. Run the actual transport tests

From the repository root, run these serially:

```bash
mvn -B -f examples/java-spring/task-tracker/pom.xml verify
python3 examples/java-spring/task-tracker/verify_http.py
python3 examples/java-spring/task-tracker/verify_http.py --observability
```

`JwtHttpTest` starts the actual Spring/Tomcat HTTP app and an owned local JWKS HTTP server. It generates private signing keys only in test memory, issues synthetic test tokens, makes actual requests and checks:

1. Valid read/write scopes work; another subject cannot read/delete an owned project.
2. Sending `owner`, `id`, or `version` in a create payload cannot override server-controlled ownership/identity/version. The response DTO does not expose owner fields. Existing DTOs ignore these extra fields; this is not a general property-policy engine.
3. A quote-containing name persists as data rather than changing the owner query. Basic still works independently and Basic mutations still fail without CSRF.
4. Wrong issuer/audience, expired/missing expiration, future `nbf`/`iat`, excessive lifetime and missing subject are rejected.
5. Wrong signature, HS256 instead of RS256 and unsigned tokens are rejected. Token `jku` does not select a key-fetch destination.
6. URL/cookie tokens and oversized bearer strings are not alternate authentication paths.
7. Rotation with old/new overlap accepts the new key, then removal of the old key becomes effective after the configured cache window.

`BoundedJwkSourceTest` exercises actual HTTP body/cache behavior separately: finite fetch budget, unknown-key throttling, overlap/removal with a controlled monotonic clock, oversized/private-key responses, forbidden redirects, a stalled body after headers and invalid source configuration. The JWT HTTP rotation test additionally uses real elapsed time and real signature validation. No `@WithMockUser` substitutes for JWT verification in these tests.

The two existing packaged smoke modes protect the original Basic/CSRF/owner/cache/metrics/migration behavior. The existing dedicated example workflow (`backend-observability.yml`) runs Maven plus both smokes whenever this module changes; a duplicate workflow is unnecessary. JWT validation evidence comes from the real HTTP integration tests, not from a packaged authorization-server deployment. Temporary databases, fixture sockets and worker threads belong to each test and are cleaned up; no external provider or paid resource is required.

## 3. Trace the decision

The resource server accepts only RS256 and an operator-configured JWKS destination. A required timestamp validator applies five seconds of skew. Additional checks require `exp`, `iat`, a bounded subject, the configured audience, nonfuture issuance, positive lifetime and a lifetime of at most ten minutes. `iss` must exactly match the configured issuer. A valid signature with the wrong issuer is still invalid for this API.

Scopes map to `SCOPE_projects:read` and `SCOPE_projects:write`. The trusted issuer grants these scopes; a client cannot obtain a scope by editing an unsigned payload because signature validation runs first. The resource server does not turn a user-supplied `roles` array into privileged framework roles.

A create request accepts `name` through the existing DTO; owner comes from authenticated identity, and the database generates ID/version. Every project/task lookup continues to check the authenticated owner through `ProjectService`, including mutations. Returning 404 for another owner's resource avoids disclosing its existence; it is not a replacement for an actual authorization predicate.

Authentication errors return a fixed `invalid_token` body; scope denials return `insufficient_scope`. Raw tokens, key material and untrusted claim values are not embedded in those responses or teaching telemetry. Do not enable HTTP header/body or security DEBUG logging around real credentials. Access tokens remain reusable bearer credentials during their validity window; the lab does **not** provide one-time-token replay prevention or signed-webhook deduplication.

## 4. JWKS availability, rotation and request bounds

Required operator settings when enabling `jwt` outside tests:

```text
TASK_TRACKER_JWKS_URI=http://127.0.0.1:<owned-fixture-port>/jwks
TASK_TRACKER_JWT_ISSUER=<the exact trusted synthetic issuer>
TASK_TRACKER_JWT_AUDIENCE=<the intended API audience>
TASK_TRACKER_ALICE_PASSWORD=<generated at runtime>
TASK_TRACKER_BOB_PASSWORD=<generated at runtime>
TASK_TRACKER_VIEWER_PASSWORD=<generated at runtime>
```

Tests provision these values automatically. There is no token-minting endpoint in the application. For manual exploration, run `JwtHttpTest` and change an original synthetic fixture; do not paste customer tokens into the repository. The loopback-only JWKS URL is an explicit lab restriction, not production provider configuration. It avoids DNS/redirect ambiguity here; a real HTTPS provider integration, TLS policy and network egress controls remain separate work.

| Bound | Implemented policy |
|---|---|
| Accepted bearer value | At most 4,096 characters, one Authorization header |
| JWKS destination | One explicit loopback IPv4 HTTP URI; no query/userinfo/fragment; no redirects; no token-selected URL |
| Connect / request / complete-response budget | 500 ms / 1 s / 1.2 s; future cancelled on deadline |
| Waiting for another refresh | At most 100 ms before failing closed |
| JWKS body / key set | 32 KiB; 1–4 public RSA keys, 2,048–4,096 bits, distinct bounded nonempty key IDs |
| Cache | 30 seconds by default; operator range 2–30 seconds |
| Unknown key ID | At most one refresh attempt per second; otherwise fail closed |
| Fetch attempts | Hard teaching cap of 64 logical fetches per process |

Known keys remain usable while the cache is fresh, including briefly after the issuer removes a key. At expiry, a fetch failure rejects tokens instead of using an unbounded stale cache. Unknown key IDs may trigger a bounded refresh; they never cause a fetch to a header-provided URL. Use a new key ID when changing key material, publish old/new public keys for the intended overlap, then remove the old key after valid clients have rotated. This cache window is not immediate revocation.

The hard fetch cap is deliberately suitable for a bounded exercise, **not production refresh management**. A long-lived process or unknown-key abuse can exhaust it; it then fails closed and needs a deliberate restart/reconfiguration. Production designs need monitored cache/refresh budgets, ingress abuse controls and recovery policy. There is no automatic network retry loop in this source; the JDK transport and whole-response deadline still determine the precise wire behavior.

## 5. Predict, change and debug

- **Predict:** change only `aud` while keeping a correctly signed token. **Answer:** 401, because signature validity does not make the token intended for this API.
- **Change:** remove `projects:write` but add `roles: [ROLE_ADMIN]`. **Answer:** mutation remains forbidden; scopes are explicitly mapped and the arbitrary roles claim is ignored.
- **Debug:** a valid new-key token fails immediately after rotation. Check the key ID, published overlap, refresh throttle, cache age, fetch budget and source availability before weakening signature validation. A reused old key ID can remain associated with the cached old material until expiry.
- **Debug:** a valid Alice token can list projects but Bob's project URL returns 404. **Answer:** authentication and scope succeeded; object authorization correctly rejected the resource. Do not remove the owner predicate to fix a client that copied the wrong ID.
- **Interview:** distinguish JWT validation, OAuth and object authorization. **Answer:** validation establishes a trusted, constrained claim set; OAuth defines delegated authorization flows; the service still enforces which operations and objects that principal may use. A JWKS fixture does not prove provider login, PKCE, refresh-token safety or logout/revocation.

## 6. OWASP Web Top 10:2025 — full category mapping

Sources and category names were rechecked against the official **2025** list on 2026-10-18. These are scoped control/evidence mappings, not certification or claims that each category is solved. **Tested** means the named fixture/control runs; **procedure/open** means work still requires implementation or operational review. OWASP lists are awareness guides, not exhaustive security requirements.

| Official category/source | Control or exercise in this example | Evidence and remaining boundary |
|---|---|---|
| [A01 Broken Access Control](https://top10.owasp.org/2025/A01_2025-Broken_Access_Control/) | Deny by default; owner queries, role/scope and legacy CSRF | **Tested:** `JwtHttpTest`, `ProjectMilestoneTest`, existing HTTP smoke. **Open:** broader policy/tenant review and abuse limits. |
| [A02 Security Misconfiguration](https://top10.owasp.org/2025/A02_2025-Security_Misconfiguration/) | Explicit opt-in profiles, loopback fixtures, restricted Actuator access | **Tested:** default absence, viewer denial and fixed key source. **Open:** production TLS/CORS/headers and deployment-configuration review. |
| [A03 Software Supply Chain Failures](https://top10.owasp.org/2025/A03_2025-Software_Supply_Chain_Failures/) | Boot-managed versions and reproducible Maven dependency inventory | **Procedure/open:** inspect advisories, provenance, build permissions and SBOM/attestation. A pinned version alone is not proof of a secure supply chain. |
| [A04 Cryptographic Failures](https://top10.owasp.org/2025/A04_2025-Cryptographic_Failures/) | Actual RSA signature/algorithm validation and bounded key rotation | **Tested:** wrong signature/algorithm, private-key JWKS rejection. **Open:** production transport/storage encryption and KMS/HSM lifecycle. |
| [A05 Injection](https://top10.owasp.org/2025/A05_2025-Injection/) | Existing JPA parameter binding and explicit request DTOs | **Tested:** quote-containing label and unchanged object ownership. **Open:** broader SQL/XSS/template/command-path review; this is not an injection scanner. |
| [A06 Insecure Design](https://top10.owasp.org/2025/A06_2025-Insecure_Design/) | Separate authentication, scopes and ownership; bounded trust boundary | **Procedure/open:** write a threat model, misuse cases, business invariants and recovery review. The boundary tests do not replace design review. |
| [A07 Authentication Failures](https://top10.owasp.org/2025/A07_2025-Authentication_Failures/) | Issuer/audience/timestamps/subject validation and safe credential source | **Tested:** `JwtHttpTest` negative claims and source cases. **Open:** full OAuth/OIDC flow, MFA, brute-force controls and session lifecycle review. |
| [A08 Software or Data Integrity Failures](https://top10.owasp.org/2025/A08_2025-Software_or_Data_Integrity_Failures/) | Signed claim verification and rejection of token-selected key source | **Tested:** real signature/key-source failures. **Open:** release artifact verification, unsafe deserialization review and replay-safe signed webhooks. |
| [A09 Security Logging and Alerting Failures](https://top10.owasp.org/2025/A09_2025-Security_Logging_and_Alerting_Failures/) | Fixed error responses and existing privacy-preserving observability exercise | **Tested:** no raw probe secrets in logs; alert decision arithmetic. **Open:** durable security audit trail, authorization-denial alerts and deployed response ownership. |
| [A10 Mishandling of Exceptional Conditions](https://top10.owasp.org/2025/A10_2025-Mishandling_of_Exceptional_Conditions/) | Bounded JWKS body/deadline/cache; failure does not bypass bearer validation | **Tested:** stalled-body/redirect/oversize rejection and fixed 401. **Open:** wider cancellation, saturation and fault-injection coverage. |

## 7. OWASP API Security Top 10:2023 — full category mapping

This is the separate **2023 API list**, not an attempted renaming of the Web 2025 list. The same implementation may address part of multiple categories while leaving substantial gaps.

| Official category/source | Control or exercise in this example | Evidence and remaining boundary |
|---|---|---|
| [API1 Broken Object Level Authorization](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/) | Check owner on every existing project/task access path | **Tested:** cross-owner read/delete and existing milestone tests. **Open:** exhaustive policy matrix for future resources. |
| [API2 Broken Authentication](https://api-security.owasp.org/editions/2023/en/0xa2-broken-authentication/) | Real JWT signature, issuer/audience/time checks | **Tested:** actual HTTP negative tokens. **Open:** provider issuance/login/refresh/revocation and credential-abuse defenses. |
| [API3 Broken Object Property Level Authorization](https://api-security.owasp.org/editions/2023/en/0xa3-broken-object-property-level-authorization/) | Request DTO allowlist; authenticated owner and generated ID/version | **Tested:** forged create fields cannot reassign ownership and response omits owner. **Open:** field policies for later sensitive resources; ignored fields are not generic policy enforcement. |
| [API4 Unrestricted Resource Consumption](https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption/) | Existing pagination limits plus bounded bearer/JWKS parsing, fetches and deadlines | **Tested:** finite HTTP/cache cases and page validation. **Open:** global/request-body limits, distributed rate limits and measured capacity. |
| [API5 Broken Function Level Authorization](https://api-security.owasp.org/editions/2023/en/0xa5-broken-function-level-authorization/) | Explicit read/write scopes and independent legacy roles | **Tested:** read-only principal cannot mutate; arbitrary roles claim does not grant scope. **Open:** complete function/role inventory as new endpoints land. |
| [API6 Unrestricted Access to Sensitive Business Flows](https://api-security.owasp.org/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/) | Identify repeated project creation and workflow abuse as separate risks | **Procedure/open:** business quotas, anti-automation, idempotency and step-up policies. JWT validity does not stop an authorized client automating a harmful flow. |
| [API7 Server Side Request Forgery](https://api-security.owasp.org/editions/2023/en/0xa7-server-side-request-forgery/) | Fixed loopback JWKS source; ignore token jku; reject redirects | **Tested:** wrong-source trap receives no calls. **Open:** production egress/DNS/TLS policy and review of any later arbitrary-URL feature. |
| [API8 Security Misconfiguration](https://api-security.owasp.org/editions/2023/en/0xa8-security-misconfiguration/) | Explicit profiles and unchanged Basic CSRF boundary | **Tested:** both existing smoke modes and scope/CSRF cases. **Open:** external deployment hardening and configuration-drift checks. |
| [API9 Improper Inventory Management](https://api-security.owasp.org/editions/2023/en/0xa9-improper-inventory-management/) | Inventory below records route/profile/authentication owners | **Documented/open:** keep deployed hosts/versions/deprecation inventory and detect drift. A Markdown table is not an automated live asset inventory. |
| [API10 Unsafe Consumption of APIs](https://api-security.owasp.org/editions/2023/en/0xaa-unsafe-consumption-of-apis/) | Validate JWKS status/body/key contract rather than blindly trusting HTTP 200 | **Tested:** body, private key, redirect and deadline failures. **Open:** schema/authorization/failure review for each future third-party API. |

## 8. Route and secret inventory for this milestone

| Route family | Availability | Authentication/owner boundary |
|---|---|---|
| `/api/tasks` | Existing teaching/persistence modes | Teaching route; production denies it |
| `/api/projects/**` | Existing `secure,persistence` controller | Basic/session with CSRF; opt-in JWT header requests use scopes; both retain owner service |
| `/api/csrf` | Existing secure mode | Authenticated Basic/session CSRF acquisition |
| `/api/observability/probe` | `observability` only | Synthetic fixture; secure mode requires learner role and CSRF |
| `/actuator/health/**` | Existing health probes | Limited public health; details remain hidden |
| `/actuator/metrics/**` | Exposed by production profile | Existing learner-role policy; viewer denied |

Private fixture keys exist only in test memory; public JWKS responses contain no private components. Runtime Basic passwords are generated for tests/smokes. This module does not read a committed secret file or deploy Vault/cloud secret management. A production procedure must define secret injection, access policies, redaction, rotation, incident revocation, backups and audit. Environment variables alone do not prove these operational controls.

A production security completion review also needs transport/browser hardening, dependency/provenance checks, real OAuth provider flow tests, account/session lifecycle, abuse controls, threat-model review, durable security audit/alert operations and independent security testing. Do not close those gaps because an OWASP category name appears in this document.

## Primary implementation reference

[Spring Security JWT resource-server reference](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html) documents signature/issuer/audience validation and scope mapping. The explicit bounded source and additional required-claim/lifetime policy above are this teaching application's choices, not a claim that all framework defaults enforce those exact limits.
