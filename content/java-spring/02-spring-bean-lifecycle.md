# Spring IoC Container, Bean Lifecycles & Auto-Configuration

## 🟢 Beginner Level

### What is the Spring IoC Container?
The **Inversion of Control (IoC) Container** is the core engine of the Spring Framework. It manages the complete lifecycle of application objects (**Spring Beans**), performing Dependency Injection (DI) via Constructor or Field Injection.

```
Spring Component Scanning (@Component, @Service, @Repository, @Controller)
                               │
                               ▼
            ┌──────────────────────────────────────┐
            │        Spring IoC Container          │
            │   - ApplicationContext               │
            │   - BeanFactory                      │
            └──────────────────┬───────────────────┘
                               ▼
                 Fully Injected Spring Beans
```

---

## 🟡 Intermediate Level

### Spring Bean Lifecycle Pipeline (Step-by-Step)

When the Spring `ApplicationContext` initializes, every Bean passes through an explicit 11-step lifecycle pipeline:

```
 1. Bean Definition Loading (@Component)
 2. Bean Instantiation (Constructor Invocation)
 3. Populate Properties (Dependency Injection @Autowired)
 4. BeanNameAware.setBeanName()
 5. BeanFactoryAware.setBeanFactory()
 6. ApplicationContextAware.setApplicationContext()
 7. BeanPostProcessor.postProcessBeforeInitialization()
 8. @PostConstruct / InitializingBean.afterPropertiesSet()
 9. BeanPostProcessor.postProcessAfterInitialization() (AOP Proxy Wrapping!)
10. BEAN IS READY FOR USE
11. @PreDestroy / DisposableBean.destroy() (Context Shutdown)
```

---

## 🔴 Expert Level

### Spring Boot Auto-Configuration Mechanics (`@EnableAutoConfiguration`)

Spring Boot auto-configuration automatically configures beans based on classpath dependencies using `@EnableAutoConfiguration` and `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`.

#### Conditional Annotations Evaluation Order
1. `@ConditionalOnClass`: Configures bean ONLY if specific class is present on classpath.
2. `@ConditionalOnMissingBean`: Configures bean ONLY if user has NOT defined a custom `@Bean`.
3. `@ConditionalOnProperty`: Evaluates `application.properties` configuration flags.

```java
@AutoConfiguration
@ConditionalOnClass(DataSource.class)
public class DataSourceAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public DataSource dataSource() {
        return new HikariDataSource(); // Default Hikari Connection Pool
    }
}
```

### Interview Questions

1. **Why does Spring create AOP proxies (CGLIB / JDK Dynamic Proxies) during `BeanPostProcessor.postProcessAfterInitialization`?**
   - *Answer*: Annotations like `@Transactional`, `@Async`, and `@Cacheable` require intercepting method calls. Spring wraps the raw bean instance inside a proxy class that handles transaction `commit()` / `rollback()` before and after method invocation.

2. **What is the difference between Prototype scope and Singleton scope bean destruction in Spring?**
   - *Answer*: Spring manages the COMPLETE lifecycle of Singleton beans, including calling `@PreDestroy`. However, Spring does NOT manage the complete lifecycle of Prototype beans—it instantiates and injects them, but `@PreDestroy` callbacks are NOT invoked upon context shutdown!
