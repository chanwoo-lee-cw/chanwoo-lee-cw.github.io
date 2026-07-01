---
created_at: 2026-07-02
updated_at: 2026-07-02
tags:
  - spring
  - exception
  - error-handling
  - rfc7807
---

# Spring의 전역 예외 커스텀

## 시작하며

개발을 하다보면 커스텀 에러 메세지를 작성하는것은 반쯤 필수가 된다.

그렇지만, 이때 회사의 표준화된 에러 포멧이 있다면 좋겠지만, 이때 종종 내가 만들어야 하는 경우가 있는데 이때 회사 내의 표준화된 상태가 있으면 좋지만, 없으면 어떻게 해야되는지 고민을 하게 된다.

그래서 찾아보니 알게된 형태가 [RFC7807](https://datatracker.ietf.org/doc/html/rfc7807)라는 국제 표준 에러 포멧이 있어서 해당 부분을 구현하는 방법을 조사해보았다.

이를 통해 예외 핸들링에 대해 다시 한번 고민해보고, 다뤄볼 만한 기회가 됬으면 좋겠다.



## RFC 7807

### RFC 7807 란?

>RFC 7807은 HTTP API에서 문제 상세 정보를 표기하기 위한 표준 문서이다.
>즉, HTTP API에서 에러(문제) 응답을 보낼 때 일관된 JSON 형식의 표준을 정리한 문제이다



### RFC 7807를 선택한 이유

1. 에러를 리턴할 때, 공통적으로 표준화된 형태를 설정합으로써, 클라리언트 단을 개발하는 개발자가 쉽게 개발 할 수 있도록 한다.
2. 다양한 형태의 정보를 추가적으로 붙혀서 커스텀 할 수 있다는 것이 장점으로 생각되었다.



### RFC 7807

HTTP 상태 코드로는 종종 충분한 예외 정보를 전달하지 않기 때문에, 해당 부분을 보완하기 위해 나온 공용 표준이다.

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json
Content-Language: en

{
	"type": "https://example.com/probs/out-of-credit",
	"title": "You do not have enough credit.",
	"detail": "Your current balance is 30, but that costs 50.",
	"instance": "/account/12345/msgs/abc",
	"balance": 30,
	"accounts": ["/account/12345", "/account/67890"]
}
```

예제를 보면 알 수 있다.

- `type` (string) : 
  - 에러 유형을 식별하는 URI (ex. `https://example.com/probs/out-of-credit`)
    - 명시하지 않으면 `"about:blank"` 를 기본값으로 사용한다. -> 문제가 HTTP 상태 코드 외에는 추가적인 의미가 없음을 나타낸다.(ex. Bad Request, Not Found) 
  - 반드시 URI(Uniform Resource Identifier)여야 하지만, 실제로는 그 URI가 꼭 존재할 필요는 없고, 문제의 의미와 처리 방식을 알려주기만 하면 된다. - > 전역적으로 충돌 없는 네임스페이스를 보장하기 위해서
- `title` (string)
  - 에러에 대한 짧은 한 줄 설명.
  - 문제 발생시마다 동일한 정보가 와야한다
- `status` (number)
  - HTTP 상태 코드와 동일하다
  - 이 형식을 이해하지 이해하지 못하는 다른 HTTP 소프트웨어에게 동일한 상태 코드를 전달하기 위해 사용한다.
- `detail` (string)
  - 개발자가 보고서 원인을 확인할 수 있을 상세한 메세지
  - 디버깅 정보를 제공하기보단 클라이언트가 문제를 수정할 수 었도록 돕는데 중점을 두어야한다.
  - 단, 소비자는 정보를 얻기 위해 Detail을 분석해서는 안된다 -> 에러가 발생하기 쉬워진다.
- `instance` (string)
  - 문제의 특정 발생을 식별하는 URI 참조입니다. 참조가 해제될 경우 추가 정보를 제공할 수도 있고 제공하지 않을 수도 있다.



개발자는 `type`을 기본 식별자로 사용하며, `title`은 URI의 의미를 인식하지 못하고, 이를 발견할 수 없는 사용자에게만 권장된다.



### 장점

- API마다 다른 에러 구조를 쓰지 않고, 통일된 형태로 분석하기 쉽고, 처리하기 좋다.
- 표준 필드 외에도 서비스 상황에 맞게 추가 필드를 추가함으로써 유연하게 사용가능하다.
  - 예시) `balance`, `accounts` 같은 추가 정보



## `@RestControllerAdvice`

### `@RestControllerAdvice`란?

> 전역적인 `@RestController` 클래스가 공유하는 공통 로직을 정의할 때 사용한다. 보통 전역 예외 처리나 바인딩 설명, 모델 객체 등에 사용된다.

### 왜 필요한가?

Spring `@RestController` 의 요청을 보내면, Spring Default 에러 메세지가 돌아오게 된다.

하지만, 서버 환경에 따라 좀 더 상세한 메세지가 필요한 경우가 있고, 고객에게 상세한 메세지를 전달해야 하는 경우고 있고, 반대로 개발자가 상세한 에러 사유를 확인해봐야하는 경우도 있고, 여러 Server 환경을 다루는 경우 통일 에러 메세지를 보내줘야하는 경우가 있다.

즉, 복잡한 비즈니스 로직에서도 예외 상황을 안정적이고, 일관성 있는 메시지를 보낼 수 있도록 한다



### `@ControllerAdvice`와의 차이

- `@ControllerAdvice`: ModelAndView 객체를 반환한다.
- `@RestControllerAdvice`:  ResponseEntity나  JSON 형태로 응답할 수 있다.

다만, 요즘 서버 개발의 환경은 서버와 클라이언트단을 분리해서 보통 Json 형태의 데이터만 주고 받는 경향이 있으므로 `@RestControllerAdvice`를 위주로 확인해보았다.



## `@ExceptionHandler`

### `@ExceptionHandler`란?

> 컨트롤러에서 발생한 예외를 Catch 해서 사전에 정의해둔 메소드로 처리하게 한다.

해당 프로세스가 처리 중에 에러가 발생하는 경우 해당 어노테이션이 붙어 있는 부분에서 처리하도록 수정한다.



### 특징

- `@ExceptionHandler`는 가장 정확한 예외 타입부터 먼저 매칭된다
  - 예를들면, `Exception`와 `RuntimeException`를 처리하는 두 부분을 만들면 `RuntimeException`처리하는 부분에서 처리된다.
- 더 근처의 Scope를 우선적으로 처리한다.
  - 예를 들면, `@RestCotroller`와 `@RestControllerAdvice` 두 군데 모두 `CommonException` 처리부분을 만들어 둔다면 `@RestCotroller`를 우선적으로 처리한다.
- 여러 타입 처리가 가능하다 `@ExceptionHandler([commonExceptionHandler::class, RuntimeException::class])` 같이 배열로 등록 가능.
- `@Order`나 `Ordered`로 순서를 지정가능하다 숫자 작을수록 먼저 실행.
- 파라미터를 다양하게 지원한다
  - 필수 파라미터 : `Exception`
  - 선택 파라미터 : `HttpServletRequest/Response`, `WebRequest`, `Locale`, `BindingResult`



## Spring 구현

```kotlin
// common/exception/CommonException.kt
data class CommonException(
    val responseCode: ExceptionCode,
    override val cause: Throwable? = null,
    val customMessage: String? = responseCode.detail,
    val data: Any? = null
) : RuntimeException(customMessage ?: responseCode.detail, cause)
```

```kotlin
// common/exception/ExceptionCode.kt

import org.springframework.http.HttpStatus
import java.net.URI


const val URI_BLANK = "about:blank"

enum class ExceptionCode(
    val title: String,
    val httpStatus: HttpStatus,
    val detail: String? = null,
    val type: URI? = URI(URI_BLANK),
) {
    // 400 에러
    BAD_REQUEST("BAD REQUEST", HttpStatus.BAD_REQUEST, "잘못된 요청입니다."),
    NOT_FIND_ENTITY_BY_ID("NOT_FIND_ENTITY_BY_ID", HttpStatus.NOT_FOUND, "DB의 해당하는 데이터가 존재하지 않습니다.", URI("https://docs.test-api/errors/not-find-entity-by-id")),

    // 500 Error
    SERVER_ERROR("SERVER_ERROR", HttpStatus.INTERNAL_SERVER_ERROR),
}
```

```kotlin
// common/exception/ExceptionHandler.kt
import jakarta.servlet.http.HttpServletRequest
import mu.KotlinLogging
import org.springframework.http.ProblemDetail
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.net.URI
import java.util.Locale


@RestControllerAdvice
class ExceptionHandler {
    private val log = KotlinLogging.logger {}

    fun ProblemDetail.withTitle(title: String) = apply { this.title = title }
    fun ProblemDetail.withType(type: URI?) = apply { type?.let { this.type = type } }

    @ExceptionHandler(CommonException::class)
    fun commonExceptionHandler(
        exception: CommonException,
    ): ResponseEntity<ProblemDetail> {
        log.warn { exception }
        val problemDetail = ProblemDetail
            .forStatusAndDetail(exception.responseCode.httpStatus, exception.message)
            .withTitle(exception.responseCode.title)
            .withType(exception.responseCode.type)
        return ResponseEntity.of(
            problemDetail
        ).build()
    }

    @ExceptionHandler(Exception::class)
    fun exceptionHandler(
        exception: Exception,
        // 아래 2개는 선택값
        request: HttpServletRequest,
        locale: Locale?
    ): ResponseEntity<ProblemDetail> {
        log.warn { exception }
        val responseCode = ExceptionCode.SERVER_ERROR

        return ResponseEntity.of(
            ProblemDetail.forStatusAndDetail(responseCode.httpStatus, exception.message)
                .withTitle(responseCode.title)
        ).build()
    }
}
```





## 참고 문헌

- [https://datatracker.ietf.org/doc/html/rfc7807](https://datatracker.ietf.org/doc/html/rfc7807)
- [https://velog.io/@choicore/Spring-에서-전역-예외-커스텀-feat.-RFC-7807](https://velog.io/@choicore/Spring-에서-전역-예외-커스텀-feat.-RFC-7807)
- [https://news.hada.io/topic?id=21229](https://news.hada.io/topic?id=21229)
- [https://curiousjinan.tistory.com/entry/spring-boot-exception-handling](https://curiousjinan.tistory.com/entry/spring-boot-exception-handling)