---
created_at: 2026-07-02
updated_at: 2026-07-02
tags:
  - spring
  - aop
  - proxy
---

# Spring AOP

## AOP란?

> **AOP(Aspect-Oriented Programming)** 방식은 **관심사의 분리를 실현하기 위한 모듈화 기법**
>
> 핵심 비즈니스 로직과 공통 관심사를 분리함으로써 코드의 유지보수성, 재사용성, 가독성을 향상시킨다.



객체 지향 프로그래밍 패러다임을 보완하는 기술로써 **메소드나 객체의 기능을 핵심 관심사(Core Concern)와 공통 관심사(Cross-cutting Concern)로 나누어 프로그래밍하는 것**

- 핵심 비즈니스와 공통 관심사
  - 핵심 관심사 : 각 객체가 가져야할 본래 기능
  - 공통 관심사 : 여러 객체에서 공통적으로 사용되는 코드
- 핵심 비즈니스 로직 외에 공통적으로 반복되는 부가기능(로깅, 보안, 트랜젝션, 예외 처리 등)을 모듈화 해서 처리한다.
- 공통 관심사를 따로 분리함으로써 매번 작성하지 않거나, 유지보수 효율성을 샹승 시킨다.



## 구조


![](https://velog.velcdn.com/images/alphanewbie/post/d4c6a0bb-1636-4c0c-9328-99ecf8590f36/image.png)


![](https://velog.velcdn.com/images/alphanewbie/post/26845140-957e-43cc-a903-f9395139e883/image.png)



## Spring AOP의 주요 개념

###  JointPoint

- Advice가 적용될 수 있는 지점
- Spring AOP에서는 프록시 패턴을 사용하기 때문에 메소드 실행 포인트만 JointPoint로 이야기 한다.
- 즉, 실행 중 추가 기능이 적용될 수 있는 지점을 의미하고, Spring AOP에서는 메서드 실행 시점만 해당
  - Spring AOP는 프록시 기반으로 동작하기 때문에, 즉 `@After` 같은 기능도 사실상 해당 메소드를 아예 둘러싸 버린다음에 메소드가 끝난 후에 코드를 실행하는 방식으로 기능한다.
- 필드 접근, 생성자 호출, static 메서드 등은 지원하지 않는다.



### Pointcut

- Join Point 중 실제 Advice가 실행될 지점을 필터링하는 표현식
- 조인 포인트 중에서 어드바이스가 적용될 위치
- Join Point 중 Advice가 실행될 지점을 지정하는 **표현식 기반 필터**.
- AspectJ 표준 문법을 기반의, `execution`, `within`, `@annotation` 등을 이용할 수 있다.



### Advice

- 조인 포인트에서 수행되는 코드를 의미
- Aspect를 언제 핵심 코드에 적용할지 정의
- 시스템 전체 Aspect에 API 호출 제공
- Advice 유형
  - `@Before` : 메소드 진입 전에 실행
  - `@After` : 메소드 종료 후에 실행
  - `@AfterReturning` : 정상 종료 시 실행
  - `@AfterThrowing` : 예외 발생 시 실행
  - `@Around` : 메소드 전과 후를 감싸고, `proceed()`로 실제 호출 제어한다.
    - 유일하게 메소드 실행 자체를 제어할 수 있어서, 만약 `proceed()`를 호출하지 않으면 메소드가 실행되지 않는다.
    - 실행 시간 측정, 트랜잭션 롤백, try-catch 등 복합적인 제어가 필요할 때 자주 사용한다.



### Aspect

- Proxy 로직과 Advice, Pointcut을 묶는 단위

- 여러 객체에 공통으로 적용되는 기능 (공통 기능)
- 어드바이스(Advice) + 포인트 컷(PointCut)을 모듈화 하여 애플리케이션에 포함되는 횡단 기능(Cross-cutting Concerns)



### Weaving

- Advice를 실제 코드에 연결하는 과정
- Spring AOP는 런타임 시 프록시 객체를 생성하여 부가기능을 삽입하여, Spring Bean으로 등록된 객체에만 적용



## 표현식

### 기본 문법 구조

```
execution(modifiers-pattern? return-type-pattern declaring-type-pattern? method-name-pattern(param-pattern) throws-pattern?)
```



### 구성 요소별 설명

| 요소                     | 예시                            | 설명                              |
| ------------------------ | ------------------------------- | --------------------------------- |
| `modifiers-pattern`      | `public`, `private`, `*`        | 접근 제한자 (`*`는 아무 제한자나) |
| `return-type-pattern`    | `String`, `void`, `*`           | 리턴 타입                         |
| `declaring-type-pattern` | `com.example.service.MyService` | 메서드를 선언한 클래스            |
| `method-name-pattern`    | `getUser`, `*`, `save*`         | 메서드 이름                       |
| `param-pattern`          | `()`, `(..)`, `(String)`, `(*)` | 파라미터 패턴                     |
| `throws-pattern`         | `throws IOException`            | 예외 지정 (거의 사용 안 함)       |



| 표현식 종류        | 용도                                                 |
| ------------------ | ---------------------------------------------------- |
| `execution(...)`   | 메서드 실행 시점 기준 (가장 많이 사용)               |
| `within(...)`      | 클래스 범위 기준                                     |
| `@annotation(...)` | 어노테이션 기준 (ex. `@Transactional`이 붙은 메서드) |



### 예제

```kotlin
// 모든 메서드에 적용
"execution(* *(..))"

// 모든 public 메서드
"execution(public * *(..))"

// UserService의 모든 메서드
"execution(* com.example.service.UserService.*(..))"

// com.example 패키지 및 하위 패키지의 *Service 클래스에 있는 모든 메서드
"execution(* com.example..*Service.*(..))"

// 리턴타입이 String이고, 파라미터가 String 하나인 getUser 메서드
"execution(String com.example.service.UserService.getUser(String))"

// 첫 번째 파라미터가 String인 모든 메서드
"execution(* *(String, ..))"

// 모든 public 메서드
"execution(public * *(..))"

// 모든 서비스 메서드 실행 전
"execution(* com.example.service..*(..))"

// 모든 Controller 내 메서드 실행 후
"execution(* com.example.controller..*(..))"

// 리턴이 List 타입인 메서드만
"execution(java.util.List com.example..*.*(..))"

// 메서드 이름이 find로 시작
"execution(* *..*.find*(..))"

// 특정 어노테이션이 붙은 메서드만
"@annotation(com.example.Logged)"
```



## 예제

### Logging

```kotlin
@Aspect
@Component
class LoggingAspect {

    val logger = KotlinLogging.logger {  }

  	// com.example.demo.controller의 모든 메소드 실행 전 실행
    @Before("execution(* com.example.demo.controller..*(..))")
    fun logBefore(joinPoint: JoinPoint) {
        logger.info { "[${joinPoint.signature.name}] Start method" }
    }

    // com.example.demo.service 모든 메소드에서 에러 발생 후 실행
    @AfterThrowing("execution(* com.example.demo.service..*(..))")
    fun logAfterException(joinPoint: JoinPoint) {
        logger.info { "[${joinPoint.signature.name}] throw Error, args : ${joinPoint.args}" }
    }
}
```



### 시간 측정

```kotlin
@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
annotation class MeasureRuntime{}
```

```kotlin
@Aspect
@Component
class MeasureRuntimeAspect {
    val log = KotlinLogging.logger { }

  	// MeasureRuntime라는 어노테이션이 붙은 모든 메소드 실행 후 작성
    @Around("@annotation(com.example.demo.aop.annotation.MeasureRuntime)")
    fun measureRuntime(joinPoint: ProceedingJoinPoint): Any? {
        val startTime = System.currentTimeMillis();
        val result = joinPoint.proceed()
        val endTime = System.currentTimeMillis();
        log.info { "[${joinPoint.signature.name}] 실행 시간 : ${endTime - startTime}ms" }
        return result
    }

}
```



![](https://velog.velcdn.com/images/alphanewbie/post/27975c75-62ee-4541-b5f1-3c9baee0ea88/image.png)



## 참고 문헌

- [https://velog.io/@developer_khj/Spring-AOP-개념과-Spring-AOP적용](https://velog.io/@developer_khj/Spring-AOP-개념과-Spring-AOP적용)
- [https://adjh54.tistory.com/133](https://adjh54.tistory.com/133)
- [https://ittrue.tistory.com/232](https://ittrue.tistory.com/232)