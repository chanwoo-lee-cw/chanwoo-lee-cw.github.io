---
created_at: 2026-07-02
updated_at: 2026-07-02
tags:
  - spring
  - filter
  - interceptor
  - servlet
---

# Filter와 Interceptor

## Filter란

> **서블릿 필터(Servlet Filter)**의 개념을 기반으로 하며, **HTTP 요청과 응답을 가로채서 전처리/후처리를 수행하는 컴포넌트**

Spring에서 Web Application에서 관리되는 영역으로 HTTP 요청을 컨트롤러에 전달하기 전에 처리할 수 있는 프레임 워크 기능이다.

Filter란 Web 애플리케이션에서 관리되는 영역으로 Client로 부터 오는 요청과 응답에 대해 최초/최종 단계의 위치이며 이를 통해 요청과 응답의 정보를 확인 및 변경, 그리고 처리를 할 수 있다.

주로 보안, 로깅, 인코딩 처리 등의 컨트롤러에 진입하기 전에 공통적인 처리가 필요할 때 사용된다.



## RequestContext의 처리 흐름



![RequestContext의 처리 흐름](https://velog.velcdn.com/images/alphanewbie/post/a2ba40b0-bbd0-4c89-b371-f6c99ac9d631/image.png)

스프링 프레임 워크는 들어온 요청이 DispatherServlet에 의해 컨트롤러에 매핑이 되는데, Filter는 이 요청이 DispatherServlet에 의해 다뤄지기 전, 후에 동작합니다. 또한, Filter는 FilterChain을 통해 여러 필터가 연쇄적으로 동작하게 할 수 있다.

즉, 스프링 컨테이너가 아닌 톰캣과 같은 웹 컨테이너에 의해 관리가 되는 것이다.



## Filter 구현

Filter 인터페이스에는 3개의 메소드가 있는데 이것의 구현에 따라 기능이 달라진다

- `init()` 
  - 컨테이너가 인스턴스 생성 후 한 번 호출하며 초기 설정 수행. 즉, 서비스 최초 실행 때 한번 실행된다
  - 비필수로 구현하지 않아도 default 기능을 사용한다

- `doFilter()`
  - 매 HTTP 요청이 디스패처 서블릿으로 전달되기 전에 웹 컨테이너에 의해 실행되는 메소드이다.
  - **chain.doFilter() 전**: 전처리 (예: 인증/로그/인코딩 세팅 등)
  - **chain.doFilter() 후**: 후처리 (예: 응답 압축/헤더 수정)
  - chain 호출을 생략하면 이후 서블릿/필터 실행을 막을 수 있음 → 보안용으로 활용
  - 필수로 override해야한다.

- `destroy()` 
  - 필터 제거 시 호출된다. 필터 객체를 제거하고 사용하는 자원을 반환하기 위한 메소드이다. 즉, Spring 서비스 종료때 실행된다.
  - 비필수로 구현하지 않아도 default 기능을 사용한다




```kotlin
import jakarta.servlet.*
import mu.KotlinLogging
import org.springframework.stereotype.Component


@Component
// @Component를 붙힘으로써 Spring이 알아서 등록하고 관리하도록 한다.
class TestFilter() : Filter {

    private val log = KotlinLogging.logger {}

    override fun init(filterConfig: FilterConfig) {
      	// 필터가 시작될때 호출되는 함수
        log.info { "Filter init" }
    }

    override fun doFilter(
        request: ServletRequest,
        response: ServletResponse,
        filterChain: FilterChain,
    ) {
        // Request 가 요청되었을 때 실행
        log.info { "doFilter start" }
        // ↑ 요청 전 단계
        filterChain.doFilter(request, response)
        // ↓ 응답 후 단계
        log.info { "doFilter end" }
    }

    override fun destroy() {
      	// 필터가 종료될 때 호출되는 함수
        log.info { "Filter Destroy" }
    }

}
```



![Filter의 log](https://velog.velcdn.com/images/alphanewbie/post/eb8a2b4c-e5ec-4614-a817-7bcff221fbc1/image.png)



### FilterChain

이름 그대로 필터 체인으로 여러개의 필터 흐름을 말한다, `doFilter()` 메서드를 통해 다음 필터 또는 최종 서블릿을 호출한다.

체인을 생략함으로써 이후 흐름을 차단한다. 보통 인증 실패나, IP차단 등에 사용한다.



## Interceptor란?

> DispatcherServlet이 컨트롤러를 호출하기 전과 후에 요청과 응답을 참조하거나 가공할 수 있는 기능을 제공한다.

DispatcherServlet이 Controller에 요청을 전달하기 전/후에 인터셉티가 요청을 참고하거나 가공할 수 있는 기능을 제공한다.

웹 컨테이너에 의존하는 Filter와는 다르게 Interceptor는 Spring Context에서 동작한다.

DispatcherServlet이 핸들러 매핑을 통해 Controller를 찾도록 요청하며, 실행 체인(HandlerExecutionChain)을 작성해서 돌려주는데, 여기서 1개 이상의 인터셉터가 등록되어 있다면 순차적으로 인터셉터들을 거쳐 컨트롤러가 실행되도록 하고, 인터셉터가 없다면 바로 컨트롤러를 실행한다.



## Interceptor의 구현

HandlerInterceptor 인터페이스에는 3개의 메소드가 있는데 이것의 구현에 따라 기능이 달라진다

- preHandle : 
  - Controller 호출 이전에 실행된다
  - `true` 반환시에 다음 Interceptor혹은 핸들러로 진행하고, 반대로 `False` 시 흐름이 종료된다.
- postHandle
  - Controller 메소드 실행 후, 랜더링 혹은 Response 포멧화 전에 실행된다
  - 최근에는 JSON 형태로 데이터를 제공하는 `@RestController` 를 사용하며 사용되지 않는다. 
- afterCompletion
  - **뷰 렌더링 후** 또는 요청 종료 시점 호출됨
  - 즉, 최종 결과를 생성하는 일을 포함해 모든 작업이 완료된 후에 실행된다.
  - 예외 처리나 리소스 정리 등에 적합



```kotlin
package com.example.demo.interceptor

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import mu.KotlinLogging
import org.springframework.lang.Nullable
import org.springframework.stereotype.Component
import org.springframework.web.servlet.HandlerInterceptor
import org.springframework.web.servlet.ModelAndView


@Component
class TestInterceptor : HandlerInterceptor {
    private val log = KotlinLogging.logger {}

    override fun preHandle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        handler: Any
    ): Boolean {
        log.info { "is preHandle!!!" }
        return true
    }

    override fun postHandle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        handler: Any,
        @Nullable modelAndView: ModelAndView?
    ) {
        log.info { "is postHandle!!!" }
    }

    override fun afterCompletion(
        request: HttpServletRequest,
        response: HttpServletResponse,
        handler: Any,
        @Nullable ex: Exception?
    ) {
        log.info { "is afterCompletion!!!" }
    }

}
```

```kotlin
package com.example.demo.common.config

import com.example.demo.interceptor.TestInterceptor
import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.InterceptorRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer


@Configuration
class WebConfig(
    val testInterceptor: TestInterceptor,
) : WebMvcConfigurer {
    override fun addInterceptors(registry: InterceptorRegistry) {
        registry.addInterceptor(testInterceptor)
            .addPathPatterns("/api/**")
    }
}
```



![Interceptor의 로그](https://velog.velcdn.com/images/alphanewbie/post/30abd04c-d033-43c0-aece-a556ffdda8ce/image.png)



## Filter와 Interceptor의 차이

### 실행 위치

- **Filter**
  - Servlet 컨테이너 레벨
  - DispatcherServlet 이전/이후 작동
- **Interceptor**
  - Spring MVC 레벨
  - DispatcherServlet ↔ Controller 사이에서 작동

### Request, Response 객체 조작 가능 여부

- **Filter**
  - Request와 Response를 조작 가능. Header, Body, Stream 모두 가로채고 수정가능하다.
  - 다음 요청을 위해 FilterChain을 호출해야한다.
- **Interceptor**
  - Interceptor에서도 Request/Response의 Header나 Attribute 수정은 가능하지만, Body 조작은 불가능하다
  - Boolean 형태의 리턴 값에 따라 실행 여부가 결정된다.

### 용도

- **Filter**
  - CORS 처리, 인증 토큰 검사 등 전역 설정
  - 요청/응답 헤더 조작, Response 압축, multipart 처리
  - 요청/응답 스트림 래핑 및 수정 가능
- **Interceptor**
  - 세부적인 보안 및 인증/인가 공통 작업
  - Controller 실행 전후 비즈니스 로직 삽입
  - API 실행 시간 측정 등



## OncePerRequestFilter란?

> HTTP Reqeust의 한번의 요청에 대해 한번만 실행하는 Filter

`OncePerRequestFilter`는 HTTP Reqeust의 한번의 요청에 대해 한번만 실행하는 클래스를 말하는 것으로, 보통 한번의 요청이 DispatcherServlet → ErrorController 등 여러 경로로 흐를 때 필터가 중복 호출되는 문제를 방지하기 위해 사용된다.

주로, 인증/인가, 요청/응답 로그를 찍어야하는 경우, CORS 처리, Request 래핑 (Body 재사용, 캐싱 등), 전역 공통 처리 (Trace ID 삽입, Locale 설정 등) 에 사용된다.



### OncePerRequestFilter 구현

- `doFilterInternal`
  - Filter의 `doFilter` 와 같은 기능으로써, 이 부분에 전후 처리 로직을 작성함으로써 구현한다.
  - 요청이 중복 실행되는 것을 자동으로 방지한다.
  - 필수로 구현해야한다.
- `shouldNotFilter`
  - 특정 조건에 따라 해당 필터를 사용하고 싶지 않을때 사용한다.
  - 반환 값이 `False`라면 필터를 실행하고, `true`반환시 해당 요청은 `doFilterInternal` 아예 실행하지 않는다.
  - 주로 특정 URL에 대해 필터를 사용하지 않거나, 인증 같은 경우에 테스트 서버라면 건너 뛰고 싶을 때 사용한다.



```kotlin
package com.example.demo.filter

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import mu.KotlinLogging
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class OnceTestRequestFilter: OncePerRequestFilter() {
    private val log = KotlinLogging.logger {}

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        log.info { "this is OnceTestRequestFilter Start" }
        filterChain.doFilter(request, response)
        log.info { "this is OnceTestRequestFilter end" }
    }

    override fun shouldNotFilter(request: HttpServletRequest): Boolean {
        // 아무것도 작성하지 않는다면 기본 값이 False이다
        log.info { "this is shouldNotFilter Start" }
        return false
    }
}
```



![OncePerRequestFilter 로그](https://velog.velcdn.com/images/alphanewbie/post/217ce6a2-f639-4460-862d-d150d4cfd7ea/image.png)





## 참고 문헌

- [https://gardeny.tistory.com/35](https://gardeny.tistory.com/35)
- [https://mangkyu.tistory.com/173](https://mangkyu.tistory.com/173)
- [https://velog.io/@ieejo716/Spring-Filter-Interceptor](https://velog.io/@ieejo716/Spring-Filter-Interceptor)
- [https://velog.io/@thing-zoo/Spring-Filter](https://velog.io/@thing-zoo/Spring-Filter)
- [https://dev-coco.tistory.com/173](https://dev-coco.tistory.com/173)
- [https://velog.io/@uiurihappy/Spring-인터셉터Interceptor와-필터Filter-차이](https://velog.io/@uiurihappy/Spring-인터셉터Interceptor와-필터Filter-차이)
- [https://junyharang.tistory.com/378](https://junyharang.tistory.com/378)