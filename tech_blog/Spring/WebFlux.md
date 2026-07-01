---
created_at: 2026-07-02
updated_at: 2026-07-02
tags:
  - spring
  - webflux
  - reactive
  - async
  - non-blocking
---

# WebFlux

## WebFlux란?

> Spring boot에서 제공하는 비동기, 논블로킹 웹 프레임 워크

즉, 많은 요청을 동시에 처리해야하는 서비스에서, 쓰레드를 더 적게 사용하면서 효율적으로 동작하도록 만든 웹 기술



## WebFlux의 목표

- 비동기 및 이벤트 기반 프로그래밍을 통해 높은 확장성과 성능을 제공하는 것이다.
- 대량의 동시 연결 및 높은 부하에도 효과적으로 대응할 수 있도록 한다.



## MVC(Blocking) vs WebFlux(Non-Blocking)

### Spring MVC

```
Client ──> Tomcat Thread ──(대기)──> DB ──> 응답
            ↑ thread block
```

- 요청 1개당 쓰레드 1개 사용한다.
- 하나의 작업이 끝날때까지 쓰레드가 묶여있는다.
- 외부 API 요청시, 응답이 올때까지 쓰레드가 묶여있는다.
- 동시 접속이 많아지면 쓰레드가 늘어나서 서버가 느려진다.
- Tomcat Servlet 기반

### Spring WebFlux

```
Client ──> EventLoop ──(signal 등록)──> DB ──> EventLoop ──> 응답
            thread free
```

- 요청이 들어와도 쓰레드가 묶이지 않는다.
- 기다릴 필요가 있는 작업은 "콜백 신호"만 받고 쓰레드는 다른 작업 처리
- 적은 쓰레드로 많은 요청 처리한다.
- Reactive Streams 기반 (Mono, Flux)



## WebFlux의 특징

### 반응형 프로그래밍(Reactive Programming)

- 이벤트 중이시며, 쓰레드 대신 데이터 스트림에 초점을 맞춘다.
- 다량의 동시 요청을 처리하는 애플리케이션의 확장성과 응답성을 향상시키는데 효과적이다.

### 비동기 및 비차단

- Asynchronous 및 Non-Blocking I/O 방식을 사용하여 적은 수의 스레드로 많은 수의 동시 요청을 처리할 수 있다.
- Synchronous 및 Blocking을 사용하는 기존 서블릿(Servlet) 기반 Spring Web MVC 방식과 달리, 높은 처리량을 제공
- 스레드를 차단하지 않음으로써 적은 수의 쓰레드로 더 많은 요청을 처리할 수 있다.

### 함수형 프로그래밍

-  불변 데이터와 순수 함수를 사용하는 함수형 프로그래밍 스타일을 지향한다.
- 람다(Lambda)와 스트림(Stream)과 같은 기능적 추상화를 제공하여 반응형 코드를 보다 간결하고 읽기 쉽게 작성할 수 있다.

### Reactive Stream기반

WebFlux(Reactor)는 Reactive Streams 스펙 위에서 동작한다. Publisher가 데이터를 넣는게 아니라, Subscriber가 `request(n)`로 받을 수 있는 만큼만 가져온다.

- Publisher
  - 데이터를 생성하고, Subscriber에게 전송
- Subscriber
  - Publisher로부터 데이터를 받아들이고, 소비
- Subscription
  - Subscriber가 처리할 데이터의 양을 정의
- Backpressure
  - Subscriber가 처리 가능한 만큼만 요청해서, 부하를 줄이는 시스템

### 스프링 부트와의 통합

- Spring Boot 생태계와 완전히 통합되어 있어 강력한 자동 설정 기능을 제공한다.

### Mono / Flux

| 타입      | 처리 가능한 스트림 |
| --------- | ------------------ |
| `Mono<T>` | 0~1건              |
| `Flux<T>` | 0~N건              |



## WebFlux의 Scheduler와 Thread

Spring WebFlux에서는 기본 실행 쓰레드가 EventLoop를 기반으로 하기 때문에 Scheduler를 사용한다.

-> 즉, Scheduler는 Reactor가 제공하는 스레드 풀이다.



### subscribeOn()

- 파이프라인 전체에 영향을 준다.
  - 구독 시점을 다른 Scheduler에서 실행
  - Source가 데이터를 발행하는 시점과 그 이후의 기본 흐름을 다른 쓰레드에서 시작하도록 한다.
  - 체인의 어디에 두든 상관없이, 항상 최초 구독과 데이터 소스가 실행되는 쓰레드를 바꾼다
- 즉, Reactive 파이프라인의 시작점(thread context)을 정한다.

### publishOn()

- 해당 위치 이후의 downstream(아래쪽) 연산자만 영향을 받는다.
  - 파이프라인 중간에서 실행 쓰레드를 전환하고 싶을 때 사용.
  - publishOn 아래에 있는 모든 연산자는 그 Scheduler에서 실행한다.
- 즉, 체인 도중에 쓰레드를 바꾸는 용도로 쓴다.



### Scheduler가 중요한 이유

- WebFlux는 EventLoop(소수의 쓰레드)로 다수의 Reqeust를 처리한다.
- EventLoop에서 blocking 작업이 발생하는 경우에는,
  - EventLoop가 해당 작업을 기다리는 동안 다른 Reqeust 처리 지연.
- 즉, 이런 경우로 인한 성능 저하를 막기 위해, blocking 작업은 별도 쓰레드 풀로 격리해 실행한다.



##  참고 문헌

- [https://m.blog.naver.com/seek316/223311717538](https://m.blog.naver.com/seek316/223311717538)
- [https://techblog.woowahan.com/12903](https://techblog.woowahan.com/12903)
- [https://m.blog.naver.com/seek316/223311717538](https://m.blog.naver.com/seek316/223311717538)
- [https://adjh54.tistory.com/232#1.%20%EB%B0%98%EC%9D%91%ED%98%95%20%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%98%EB%B0%8D(Reactive%20Programming)-1-2](https://adjh54.tistory.com/232#1.%20%EB%B0%98%EC%9D%91%ED%98%95%20%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%98%EB%B0%8D(Reactive%20Programming)-1-2)
- [https://m.blog.naver.com/seek316/223311717538](https://m.blog.naver.com/seek316/223311717538)
- [https://trillium.tistory.com/193](https://trillium.tistory.com/193)