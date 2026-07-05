---
created_at: 2026-07-05
updated_at: 2026-07-05
tags:
  - spring
  - bean
  - ioc
  - kafka
---

# Spring의 Bean

## Bean 이란?

> Bean이란 스프링 컨테이너에 의해 관리되는 재사용 가능한 소프트웨어 컴포넌트
>
> 즉, 개발자가 직접 관리하는 객체가 아닌 Spring Container가 관리하는 객체를 말한다.

- Bean은 개발자가 직접 생성하지 않고, **Spring IoC 컨테이너가 관리**하는 자바 객체로서 컨테이너에 의해 생성, 초기화, 소멸 과정을 책임지는 객체를 의미한다.
- Bean은 인스턴스화된 객체를 의미하며, 스프링 컨테이너에 등록된 객체를 스프링 빈이라고 한다.
- **설정 방법**
  - **어노테이션 기반**: `@Component`, `@Service`, `@Repository`, `@Controller` 등을 사용
  - **자바 설정 기반**: `@Bean` 메서드로 등록 `@Configuration` 클래스 안에서 사용한다.

## Bean Scope

- singleton

```kotlin
@Scope("singleton")
@Component
public class SingletonBean {}
```

singleton으로 선언된 Bean은 스프링 컨테이너에서 한번만 생성되며, 스프링 컨테이너가 종료될 때 소멸된다. 스프링 빈은 하나의 공유 인스턴스만 관리되며, 모든 부분에서 해당 객체를 사용하면 동일한 객체를 사용하게 된다.
주로, 

- 상태가 없는 공유 객체
- 읽기 전용 상태의 객체 
- 쓰기가 가능한 상태를 지나면서도 사용빈도가 매우 높은 객체\

위의 용도로 주로 사용하게 된다.

아무것도 설정하지 않았을때의 Default 옵션



- prototype

```kotlin
@Scope("prototype")
@Component
public class HelloBean {}
```

prototype으로 선언된 Bean은 의존관계 주입이 이루어질 때마다 새로운 객체가 생성되어 의존관계 주입까지만 관여하고 더는 관리하지 않는 짧은 범위의 스코프이다.

프로토타입 빈은 스프린 컨테이너에 조회하면 스프링 컨테이너는 항상 새로운 인스턴스를 생성하여 반환한다.빈 소멸에 대해 스프링 컨테이너는 관여하지 않으며, Garbage Collector에 의해 소멸된다. 따라서 `@PreDestroy`와 같은 종료 메서드가 호출되지 않는다.

주로,

- 사용할 때마다 상태가 달라져야 하는 객체

- 쓰기가 가능한 상태가 있는 객체

용도로 사용한다.



- request

```kotlin
@Scope("request")
@Component
public class HelloBean {}
```

HTTP 요청 단위로 Bean이 생성되고, 요청이 끝나면 소멸한다. 그로인해서 각 요청마다 독립적인 Bean이 사용 가능하다.

즉, 같은 사용자의 요청이라도 첫 번째 요청과 두 번째 요청은 다른 Bean을 받는다.

주로,

- `HttpServletRequest` 와 밀접한 데이터(세션 쿠키 검증, 인증 정보 등)

용도로 사용한다.



### 기존 Singleton과 Bean Singleton

- Kotlin의 `object`
  - object의 공유 범위는 Classloader 기준으로 관리된다.
  - **JVM 클래스 로딩 시점**에 하나의 인스턴스가 생성되고, 이후에 전역적으로 공유된다 
  - DI불가능 하기 때문에 그냥 직접 접근해서 사용해야한다.
- Spring `singleton Bean`
  - Spring Singleton의 공유 범위는 ApplicationContext 기준으로 관리된다.
  - **Spring IoC 컨테이너 단위에서 관리**되고, 스프링 애플리케이션이 실행되면 해당 Bean은 하나만 만들어진다.
  - 웹 애플리케이션 뿐만 아니라 일반 애플리케이션 환경에서도 사용 가능
- Singleton Bean과 



## Bean의 종류

### `@Bean`

- **개발자가 직접 제어가 불가능한** 외부 라이브러리 등을 Bean으로 등록하려고 할 때 사용되는 어노테이션
- 메소드의 반환 값을 이용해 Bean을 생성한다.
- **메소드** 또는 **어노테이션** 단위에 붙일 수 있다.

```kotlin
@Configuration
class CommonConfig {
    @Bean
    fun beanTestArray(): ArrayList<Int> = arrayListOf(1, 2, 3)
}
```

```kotlin
@Configuration
class HelloPrintJobConfig(
    private val jobRepository: JobRepository,
) {

    @Bean
    fun printHelloJob(
        printHelloStep: Step
    ): Job {
        return JobBuilder("printHelloByKafkaJob", jobRepository)
            .incrementer(RunIdIncrementer())
            .validator(printHelloValidator())
            .listener(JobLoggerListener())
            .start(printHelloStep)
            .build()
    }
}
```

리턴 값이 수정할 수 없는 라이브러리인 Job을 Bean으로 사용한다.



### `@Component`

- **개발자가 직접 작성한 Class**를 Bean으로 등록하기 위한 어노테이션이다.

- `@ComponentScan` 선어에 의해 특정 패키지 안의 클래스들을 자동 스캔하여 `@Component` 어노테이션이 있는 클래스들에 대해서 Bean 인스턴스를 생성한다.
- Component에 대한 추가 정보가 없다면 Class의 이름을 camelCase로 변경한 것이 Bean id로 사용된다.
- `@Service`, `@Repository`, `@Controller`,` @Configuration` 모두 이 어노테이션의 일종이다.
- **클래스 또는 인터페이스 단위에 붙일 수 있다.**

```kotlin
@Component
class Person {
    
    fun printHello() {
        print("Hello")
    }
}
```



### `@Configuration`

- **설정 Class**를 Bean으로 등록하기 위한 어노테이션
- `@Component`와 비슷하지만, CGLIB 프록시로 싱글톤 보장 기능이 있다는 점이 다르다.
  - CGLIB 프록시 : 인터페이스가 없는 클래스를 상속을 통해 프록시 객체를 만들어주는 라이브러리
  - 즉, `@Configuration` 어노테이션이 붙으면 항상 싱글톤 Bean으로 생성되어서, 같은 클래스내에서 @Bean 메소드를 호출하더라도 동일한 싱글톤 Bean을 호출하게 된다.
- XML 설정 파일을 자바/코틀린 코드로 대체하는 역할을 한다

```kotlin
@Configuration
class QueryDslConfig {
    @PersistenceContext
    lateinit var entityManager: EntityManager

    @Bean
    fun queryFactory(): JPAQueryFactory = JPAQueryFactory(entityManager)
}
```



##  `@Bean`와 `@Component`의 차이

- @Bean
  - 개발자가 컨트롤이 불가능한 외부 라이브러리들을 Bean으로 등록하고 싶은 경우에 사용된다.
  - 메소드 또는 어노테이션 단위에 붙일 수 있다.
- @Component
  - 개발자가 직접 컨트롤이 불가능한 클래스들의 경우에만 사용된다.
  - 클래스 또는 인터페이스 단위에 붙일 수 있다.



## 참고 문헌

- [https://ittrue.tistory.com/221](https://ittrue.tistory.com/221)
- [https://ittrue.tistory.com/225](https://ittrue.tistory.com/225)
- [https://enterkey.tistory.com/m/300](https://enterkey.tistory.com/m/300)
- [https://developer-ellen.tistory.com/198](https://developer-ellen.tistory.com/198)
- [https://yooseong12.tistory.com/27](https://yooseong12.tistory.com/27)
- [https://velog.io/@rara_kim/Spring-어노테이션Annotation](https://velog.io/@rara_kim/Spring-어노테이션Annotation)
- [https://adjh54.tistory.com/311#2.%20%40Configuration-1-4](https://adjh54.tistory.com/311#2.%20%40Configuration-1-4)