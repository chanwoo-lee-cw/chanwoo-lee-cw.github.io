---
created_at: 2026-07-02
updated_at: 2026-07-02
tags:
  - spring
  - circuit-breaker
  - resilience
  - fault-tolerance
---

# 서킷 브레이커 (Circuit Breaker)

## 서킷 브레이커란?

### 본래 사전적 정의

> 주가의 급격한 변동으로 주식시장의 붕괴를 막기 위해, 주가가 지나치게 폭락하게 되면 거래를 전면 중단하는 제도이다.

### 개발적인 의미

> 서킷 브레이커는 서로 다른 시스템 간의 연동 시 장애 전파 차단을 목적으로 한다. 연동 시 이상을 감지하고, 이상이 발생하면 연동을 차단하며, 이후 이상이 회복되면 자동으로 다시 연동하기 위한 기술이다.

즉, 시스템의 안정성 향상을 위해 사용한다. 분리된 서비스 간 통신에서 발생 가능한 장애 상황을 관리하고, 특정 서비스의 장애가 시스템 전체로 확산되지 못하도록 막기 위해 사용한다.

전기 회로의 누전 차단기의 한 곳에서 과부하가 걸렸을 때 차단기가 회로를 끊어 전체 정전(시스템 전체 장애)을 막는 것과 동일한 발상이다.

## 서킷 브레이커의 동작 방식

![서킷 브레이커](https://velog.velcdn.com/images/alphanewbie/post/b4e22235-7224-43d7-b033-60b154afda98/image.png)

서킷 브레이커는 세 가지 상태를 가진다.

- **CLOSED (정상 상태)**
  - 모든 요청이 정상적으로 처리된다. 요청이 실패하면 실패가 집계된다.
  - 실패율(또는 느린 호출 비율)이 사전에 정의된 임계치에 도달하면 서킷 브레이커는 OPEN 상태로 전환된다.
- **OPEN (요청 차단)**
  - 이 상태에서는 실제 호출을 시도하지 않고 요청을 즉시 실패로 처리(fail-fast)하거나 폴백으로 흘려보낸다.
  - 이 상태는 `wait-duration-in-open-state`로 지정한 일정 시간 동안 지속된다.
- **HALF_OPEN (일부 요청만 허용)**
  - OPEN 상태에서 일정 시간이 지난 뒤, 서킷 브레이커는 제한된 수의 요청만 허용하여 대상 서비스가 복구되었는지 확인한다.
  - 허용된 호출들의 성공/실패를 집계한다.
    - 실패율이 임계치 미만이면 CLOSED 상태로 돌아간다.
    - 실패율이 임계치 이상이면 다시 OPEN 상태로 돌아간다.

### 주의할 점: OPEN → HALF_OPEN 전환은 자동이 아니다

기본값에서는 `wait-duration-in-open-state` 시간이 경과한 **이후 첫 호출이 들어올 때** 비로소 HALF_OPEN으로 전환된다. 즉 트래픽이 없으면 OPEN 상태에 계속 머무른다. 별도의 타이머 스레드 없이 호출 시점에 상태를 평가하는 방식이라 가볍다는 장점이 있다.

만약 호출이 없어도 시간이 지나면 자동으로 HALF_OPEN으로 넘기고 싶다면 `automatic-transition-from-open-to-half-open-enabled` 옵션을 켜야 한다. 이 옵션을 켜면 백그라운드 스레드가 전환을 담당한다.

## 실패율 집계

`minimum-number-of-calls`는 **실패율 계산을 시작하기 위한 최소 호출 수**를 말하며, 최소 N건 이상의 호출이 있을 때, 몇번의 실패했느냐에 따라 서킷을 열지를 결정한다
-> 이유 : 호출이 2건인데, 2번 실패했다고 바로 열어버리면 그건 그것대로 장애의 원인이 되기 때문이다.

서킷 브레이커가 "실패율 10%"를 판단하려면 무엇을 기준으로 100%를 잡는지가 중요하다. resilience4j는 두 가지 집계 방식(Sliding Window)을 제공한다.

- `sliding-window-type: COUNT_BASED`: 
  - 최근 N개의 호출을 기준으로 실패율을 계산한다. 
  - `sliding-window-size: 100`이면 최근 100건의 호출 중 실패 비율을 본다.
- `sliding-window-type: TIME_BASED`: 
  - 최근 N초 동안의 호출을 기준으로 실패율을 계산한다. 
  - `sliding-window-size: 100`이면 최근 100초간의 호출을 본다.


## 문제 및 고려 사항

- **폴백(Fallback) 처리**
  - 서킷 브레이커를 통해 작업을 호출하는 애플리케이션은, 작업을 사용할 수 없는 경우를 대비한 폴백 메커니즘도 반드시 같이 작성한다.
  - 동일한 작업을 다른 방법으로 수행하거나, 캐시된 데이터를 반환하거나, 사용자에게 예외를 알리고 나중에 다시 하도록 전달 할 수 있다.
- **예외 유형의 구분**
  - 서킷 브레이커는 예외 심각도에 따라 어떻게 처리할 지 결정할 수 있다. 어떤 예외는 실패로 집계하고(`record-exceptions`), 어떤 예외는 무시할 수 있다(`ignore-exceptions`). 
  - 예를 들어 비즈니스 검증 실패(잘못된 입력값)은 보통 서비스 입장에서의 장애가 아니기 때문에 무시하도록 할 수 있다.
- **모니터링**
  - 서킷 브레이커는 실패한 요청과 성공한 요청 모두에 대한 모니터링을 같이 만들어야 한다.

## 가용성을 위한 다른 선택들

서킷 브레이커는 가용성을 위해 사용할 수 있는 디자인 패턴중 하나이므로, 보통 다른 가능성과 함께 사용한다.

- **Retry (재시도)**: 일시적(transient) 장애에 대해 요청을 재시도한다. 단, 무분별한 재시도는 장애 상황을 악화시킬 수 있으므로 백오프(backoff)와 함께 쓰고, 서킷 브레이커와 결합할 때 적용 순서에 주의해야 한다.
- **Bulkhead (격벽)**: 동시 실행 호출 수를 제한하여, 한 다운스트림의 지연이 전체 스레드 풀을 잠식하는 것을 막는다. 배의 격벽이 한 구역의 침수가 배 전체로 번지는 것을 막는 것과 같은 발상이다.
- **RateLimiter (속도 제한)**: 단위 시간당 허용 호출 수를 제한하여 다운스트림을 보호하고, 초과 요청은 거부하거나 대기시킨다.
- **TimeLimiter (시간 제한)**: 호출이 일정 시간 안에 끝나지 않으면 강제로 중단하여, 느린 호출이 자원을 무한정 점유하지 못하게 한다.
- **Graceful Degradation (점진적 성능 저하)**: 장애 시 핵심 기능만 유지하고 부가 기능은 축소된 형태로 제공하는 설계 전략. 폴백이 이를 구현하는 한 방법이다.

이 패턴들은 서로 배타적이지 않다. 예를 들어 "TimeLimiter로 느린 호출을 끊고 → 서킷 브레이커가 이를 실패로 집계해 차단하고 → 폴백으로 캐시 응답을 내려준다"처럼 계층적으로 결합해서 사용할 수 있다.

## 서킷 브레이커의 적용

가장 자주 쓰이는 서킷 브레이커 라이브러리는 [Netflix Hystrix](https://github.com/Netflix/Hystrix)와 [resilience4j](https://github.com/resilience4j/resilience4j) 두 가지다. 나는 그중 resilience4j를 선택했고, 이유는 다음과 같다.

1. **유지보수 상태**
   - Netflix Hystrix: 2018년 이후 신규 기능 개발이 중단(maintenance mode)되었다.
   - resilience4j: 현재까지 활발하게 유지보수되고 있다.
2. **구현 방식의 차이**
   - Hystrix: 외부 시스템 호출을 반드시 `HystrixCommand`라는 클래스로 감싸야 한다.
   - resilience4j: 데코레이터(또는 애노테이션) 개념을 활용해, 기존 함수에 서킷 브레이커 기능을 덧씌우는 방식으로 적용할 수 있다.
3. **격리(isolation) 모델 — 사실 이게 본질적인 차이다**
   - Hystrix는 기본적으로 **스레드 풀 격리**를 사용한다. 각 의존성 호출을 별도 스레드 풀에서 실행해 격리 수준은 높지만 스레드 컨텍스트 스위칭 오버헤드가 따른다.
   - resilience4j는 서킷 브레이커 자체가 스레드 격리를 강제하지 않는다. 동시성 제한이 필요하면 별도의 `Bulkhead` 모듈로 분리해서 적용한다. 즉 필요한 기능만 조립하는 모듈식 설계라 가볍다.

> [!NOTE]
> resilience4j 2.x 버전은 Java 17 이상을 요구한다.

### 주로 참고한 문서

- [올리브영 기술블로그, 재고 스쿼드의 서킷 브레이커 적용기](https://oliveyoung.tech/2023-08-31/circuitbreaker-inventory-squad/)

### Gradle 설정

resilience4j는 기능별로 의존성이 나뉘어 있다. 전체 목록은 다음과 같다.

```kotlin
val resilience4jVersion = "2.2.0"

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // resilience4j
    // 1. CircuitBreaker : 기본 기능
    implementation("io.github.resilience4j:resilience4j-circuitbreaker:${resilience4jVersion}")
    // 2. @CircuitBreaker, @Retry 등 애노테이션 제공 (메서드 단위 적용 시 필요)
    implementation("io.github.resilience4j:resilience4j-annotations:${resilience4jVersion}")
    // 3. Spring Boot 3 : 자동 구성(AutoConfig) + AOP 어드바이스 연동 + application.yml 프로퍼티 바인딩
    implementation("io.github.resilience4j:resilience4j-spring-boot3:${resilience4jVersion}")
    // 4. Retry : 요청 실패 시 재시도 처리 기능
    implementation("io.github.resilience4j:resilience4j-retry:${resilience4jVersion}")
    // 5. RateLimiter : 제한치를 넘는 요청을 거부하거나 큐잉하는 기능
    implementation("io.github.resilience4j:resilience4j-ratelimiter:${resilience4jVersion}")
    // 6. TimeLimiter : 실행 시간 제한 설정 기능
    implementation("io.github.resilience4j:resilience4j-timelimiter:${resilience4jVersion}")
    // 7. Bulkhead : 동시 실행 횟수 제한 기능
    implementation("io.github.resilience4j:resilience4j-bulkhead:${resilience4jVersion}")
    // 8. Cache : 결과 캐싱 기능
    implementation("io.github.resilience4j:resilience4j-cache:${resilience4jVersion}")
}
```

필요한 것만 골라 쓰면 된다. 이번 예제에서는 Spring에서 서킷 브레이커를 애노테이션으로 적용하는 데 필요한 3개만 사용한다.

```kotlin
val resilience4jVersion = "2.2.0"

dependencies {
    // 서킷 브레이커 상태를 actuator 엔드포인트로 노출하기 위해 사용
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // resilience4j (Spring Boot 3 자동 구성 + 애노테이션)
    implementation("io.github.resilience4j:resilience4j-spring-boot3:${resilience4jVersion}")
}
```

`resilience4j-spring-boot3`는 내부적으로 `circuitbreaker`, `annotations` 등 핵심 모듈을 전이 의존성으로 가져오므로, 애노테이션 방식만 쓸 거라면 이 하나만 가져오면 된다.


### 설정 방식에 대한 결정

resilience4j를 Spring에서 적용하는 방법은 크게 두 가지다.

1. **애노테이션 방식**: `application.yml`에 인스턴스를 정의하고, 메서드에 `@CircuitBreaker` 애노테이션을 붙인다. 자동 구성된 레지스트리가 YAML 설정을 읽어 인스턴스를 생성한다.
2. **프로그래밍 방식**: `CircuitBreakerRegistry`와 `CircuitBreakerConfig`를 직접 Bean으로 만들고, 코드에서 `circuitBreaker.executeSupplier { ... }` 형태로 명시적으로 감싼다.

두 방식을 섞으면 자동 구성 레지스트리와 수동 Bean이 따로 놀게 되어, 애노테이션이 내가 만든 커스텀 설정을 참조하지 않는 문제가 발생할 수 있다.

### 환경 변수 (application.yml)

시간 관련 값은 `500ms`, `30s`처럼 단위를 반드시 붙혀야한다.

```yaml
# application-test.yml
resilience4j:
  circuitbreaker:
    configs:
      default:
        sliding-window-type: COUNT_BASED          # 호출 횟수 기준 집계
        sliding-window-size: 100                  # 최근 100건 기준으로 실패율 계산
        minimum-number-of-calls: 50               # 실패율 계산을 시작하기 위한 최소 호출 수
        failure-rate-threshold: 10                # 실패율 10% 이상이면 서킷 OPEN
        slow-call-duration-threshold: 500ms       # 500ms 이상 걸리면 느린 호출로 간주
        slow-call-rate-threshold: 10              # 느린 호출 비율 10% 이상이면 서킷 OPEN
        wait-duration-in-open-state: 30s          # OPEN -> HALF_OPEN 전환까지 대기 시간
        permitted-number-of-calls-in-half-open-state: 30   # HALF_OPEN에서 허용할 호출 수
        # 아래 예외들을 "실패"로 집계한다. (이게 서킷을 여는 기준이 된다)
        record-exceptions:
          - java.lang.RuntimeException
    instances:
      CB_TEST:
        base-config: default
```

#### 주요 설정 옵션 정리

옵션의 분류는 아래의 4가지로 나뉘게 된다.
1. 실패율 집계 기준
2. 서킷을 여는 임계치
3. OPEN/HALF_OPEN 동작
4. 예외 분류

| 옵션 | 기본값 | 분류 | 의미 |
| --- | --- | --- | --- |
| `sliding-window-type` | `COUNT_BASED` | 집계 기준 | 실패율을 **호출 건수(COUNT)** 기준으로 볼지 **시간(TIME)** 기준으로 볼지. (위 COUNT/TIME 설명 참고) |
| `sliding-window-size` | `100` | 집계 기준 | 윈도우 크기. COUNT면 100**건**, TIME이면 100**초**. |
| `minimum-number-of-calls` | `100` | 집계 기준 | 실패율 계산을 시작하는 최소 호출 수. 이 수에 못 미치면 실패율이 높아도 서킷을 열지 않는다. |
| `failure-rate-threshold` | `50`(%) | 임계치 | 실패율이 이 값 이상이면 OPEN으로 전환. |
| `slow-call-duration-threshold` | `60s` | 임계치 | 이 시간 이상 걸린 호출을 "느린 호출(slow call)"로 간주. (성공했어도 느리면 별도 집계) |
| `slow-call-rate-threshold` | `100`(%) | 임계치 | 느린 호출 비율이 이 값 이상이면 OPEN으로 전환. 즉 **에러는 안 나도 응답이 느리면** 서킷을 열 수 있다. |
| `wait-duration-in-open-state` | `60s` | OPEN 동작 | OPEN 상태를 유지하는 시간. 이 시간이 지나야 HALF_OPEN 후보가 된다. |
| `permitted-number-of-calls-in-half-open-state` | `10` | HALF_OPEN 동작 | HALF_OPEN에서 복구 여부를 떠보기 위해 허용하는 시험 호출 수. |
| `automatic-transition-from-open-to-half-open-enabled` | `false` | OPEN 동작 | OPEN → HALF_OPEN 전환을 호출 없이도 타이머로 자동 처리할지. (위 "주의할 점" 참고) |
| `record-exceptions` | (비어있음) | 예외 분류 | **실패로 집계할** 예외 화이트리스트. 비워두면 모든 예외를 실패로 본다. |
| `ignore-exceptions` | (비어있음) | 예외 분류 | 성공도 실패도 아닌 것으로 **무시할** 예외 블랙리스트. |


특히 `failure-rate-threshold`과 `slow-call-rate-threshold` 별개의 트리거이기 때문에

호출이 예외 없이 성공하더라도 응답이 `slow-call-duration-threshold`보다 느리면 느린 호출로 집계되고, 그 비율이 임계치를 넘으면 서킷이 열린다. 에러는 안 나는데 다운스트림이 점점 느려지는 상황을 막기 위한 장치

> [!WARNING]
> `record-exceptions`는 이 예외들을 실패로 집계하는 화이트리스트 
> `ignore-exceptions`는 이 예외들은 성공도 실패도 아닌 것으로 무시하겠다는 블랙리스트
> 만약 실패를 일으키는 예외(`RuntimeException`)를 `ignore-exceptions`에 넣어버리면, 가장 중요한 에러로 인한 서킷이 절대 열리지 않는다. 주의 필요

### Service


```kotlin
// com/example/demo/common/circuitbreaker/CircuitBreakerNames.kt
package com.example.demo.common.circuitbreaker

object CircuitBreakerNames {
    // application.yml의 resilience4j.circuitbreaker.instances.CB_TEST 와 이름이 일치해야 한다.
    const val CB_TEST = "CB_TEST"
}
```

```kotlin
// com/example/demo/service/CircuitBreakerService.kt
package com.example.demo.service

import com.example.demo.common.circuitbreaker.CircuitBreakerNames
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker
import mu.KotlinLogging
import org.springframework.stereotype.Service

@Service
class CircuitBreakerService {

    private val logger = KotlinLogging.logger {}

    @CircuitBreaker(name = CircuitBreakerNames.CB_TEST, fallbackMethod = "cbTestFallback")
    fun circuitBreakerTest(value: Boolean): Boolean {
        return when (value) {
            true -> true
            false -> throw RuntimeException("에러 발생")
        }
    }

    /**
     * 폴백 메서드.
     * 원본 메서드와 시그니처가 같아야 하며, 마지막 인자로 발생한 예외를 받는다.
     * 더 좁은 예외 타입(RuntimeException)이 더 넓은 타입(Exception)보다 우선 매칭된다.
     */
    fun cbTestFallback(value: Boolean, exception: RuntimeException): Boolean {
        logger.info { "[${exception.message}] RuntimeException 폴백 동작" }
        return false
    }

    fun cbTestFallback(value: Boolean, exception: Exception): Boolean {
        logger.info { "[${exception.message}] 일반 예외 폴백 동작" }
        return false
    }
}
```

> [!NOTE]
> 폴백 메서드는 원본 메서드와 동일한 파라미터 목록에 마지막 인자로 예외 타입을 추가한 형태. 기존의 에러 핸들러 처럼 겹치는 여러 에러 핸들러가 있는 경우엔 가장 정확한 풀백 메소드에서 처리한다.

### Test

```kotlin
import com.example.demo.common.circuitbreaker.CircuitBreakerNames
import com.example.demo.service.CircuitBreakerService
import io.github.resilience4j.circuitbreaker.CircuitBreaker
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles

@SpringBootTest
@ActiveProfiles("test")
class CircuitBreakerServiceTest @Autowired constructor(
    private val service: CircuitBreakerService,
    private val registry: CircuitBreakerRegistry,
) {

    @BeforeEach
    fun reset() {
        // 테스트 간 상태 오염을 막기 위해 서킷을 CLOSED로 초기화한다.
        registry.circuitBreaker(CircuitBreakerNames.CB_TEST).reset()
    }

    @Test
    @DisplayName("value=true 면 정상 리턴(true)")
    fun returnsTrueWhenValueIsTrue() {
        val result = service.circuitBreakerTest(true)
        assertThat(result).isTrue()
    }

    @Test
    @DisplayName("value=false 면 예외 발생 후 폴백이 호출되어 false 리턴")
    fun returnsFalseViaFallbackWhenValueIsFalse() {
        val result = service.circuitBreakerTest(false)
        assertThat(result).isFalse()
    }

    @Test
    @DisplayName("실패가 임계치를 넘으면 서킷이 OPEN으로 전환된다")
    fun opensCircuitWhenFailureThresholdExceeded() {
        val cb = registry.circuitBreaker(CircuitBreakerNames.CB_TEST)

        // minimum-number-of-calls(50) 이상 호출하여 실패율 계산을 트리거한다.
        // 모두 실패하므로 실패율 100% > failure-rate-threshold(10%) -> OPEN
        repeat(60) {
            service.circuitBreakerTest(false)
        }

        assertThat(cb.state).isEqualTo(CircuitBreaker.State.OPEN)
    }
}
```

### 운영 모니터링: Actuator 엔드포인트

`spring-boot-starter-actuator`를 의존성에 추가했으므로, 서킷 브레이커의 상태와 이벤트를 엔드포인트로 노출할 수 있다.

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health, circuitbreakers, circuitbreakerevents
  health:
    circuitbreakers:
      enabled: true
```

이렇게 설정하면 다음 엔드포인트로 상태를 확인할 수 있다.

- `GET /actuator/circuitbreakers` : 등록된 서킷 브레이커들의 현재 상태(CLOSED/OPEN/HALF_OPEN)
- `GET /actuator/circuitbreakerevents` : 상태 전환, 성공/실패 호출 등의 이벤트 로그
- `GET /actuator/health` : `health.circuitbreakers.enabled: true`로 켜면 서킷 상태가 헬스 체크에 포함된다.

운영 환경에서는 이 메트릭을 Prometheus/Grafana 등으로 수집하여 서킷이 열리는 순간을 알림으로 받도록 구성하면 장애 대응이 빨라진다.


## 참고 문헌

- [우아한형제들 기술블로그 - 서킷 브레이커](https://techblog.woowahan.com/15694)
- [resilience4j 공식 문서 - CircuitBreaker](https://resilience4j.readme.io/docs/circuitbreaker)
- [화해 기술블로그](https://blog.hwahae.co.kr/all/tech/14541)
- [Microsoft Learn - Circuit Breaker pattern](https://learn.microsoft.com/ko-kr/azure/architecture/patterns/circuit-breaker)
- [올리브영 기술블로그 - 재고 스쿼드의 서킷 브레이커](https://oliveyoung.tech/2023-08-31/circuitbreaker-inventory-squad)