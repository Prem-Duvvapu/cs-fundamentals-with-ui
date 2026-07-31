# Spring MVC Request Lifecycle & Security Filter Chains

## 🟢 Beginner Level

### What is Spring MVC?
**Spring MVC** is a Model-View-Controller framework built on the Servlet API that processes incoming HTTP requests using a central front-controller Servlet called **`DispatcherServlet`**.

```
Client Browser ──► Servlet Filter Chain ──► DispatcherServlet ──► Controller ──► Response
```

---

## 🟡 Intermediate Level

### Detailed Spring MVC Request Execution Pipeline

When an HTTP request reaches the server, it passes through 7 distinct components:

```
CLIENT HTTP REQUEST (e.g., GET /api/v1/users/101)
                    │
                    ▼
       ┌────────────────────────┐
       │   Servlet Filter Chain │ ◄── Spring Security Filters (Authentication / Authorization)
       └────────────┬───────────┘
                    ▼
       ┌────────────────────────┐
       │   DispatcherServlet    │ ◄── Front Controller
       └────────────┬───────────┘
                    ▼
       ┌────────────────────────┐
       │     HandlerMapping     │ ◄── Finds matching @GetMapping controller method
       └────────────┬───────────┘
                    ▼
       ┌────────────────────────┐
       │     HandlerAdapter     │ ◄── Invokes controller method with argument resolvers
       └────────────┬───────────┘
                    ▼
       ┌────────────────────────┐
       │  @RestController Method│ ◄── Executes Business Service logic
       └────────────┬───────────┘
                    ▼
       ┌────────────────────────┐
       │ HttpMessageConverter   │ ◄── Jackson converts Java DTO to JSON Response Body
       └────────────┬───────────┘
                    ▼
CLIENT HTTP RESPONSE (200 OK + JSON Body)
```

---

## 🔴 Expert Level

### Spring Security Filter Chain Architecture

Spring Security operates in a `FilterChainProxy` injected before `DispatcherServlet`:

```
Servlet Container ──► DelegatingFilterProxy ──► FilterChainProxy (SecurityFilterChain)
                                                       │
  ┌────────────────────────────────────────────────────┘
  ├─► 1. HeaderWriterFilter
  ├─► 2. CorsFilter / CsrfFilter
  ├─► 3. BearerTokenAuthenticationFilter (JWT Token Parsing)
  ├─► 4. UsernamePasswordAuthenticationFilter
  └─► 5. AuthorizationFilter (Role checking @PreAuthorize)
```

### Interview Questions

1. **How does `@ControllerAdvice` and `@ExceptionHandler` handle exceptions inside Spring MVC?**
   - *Answer*: If a controller method throws an unhandled exception, `DispatcherServlet` delegates the exception to `HandlerExceptionResolver` chains. `@ControllerAdvice` intercepts exceptions globally, transforming them into formatted JSON error responses (`ResponseEntity`).

2. **What is the performance benefit of `AsyncHandlerInterceptor` and `DeferredResult` in Spring MVC?**
   - *Answer*: It offloads long-running HTTP request processing from Tomcat Servlet threads to a background thread pool, freeing Tomcat threads to handle incoming connections.
