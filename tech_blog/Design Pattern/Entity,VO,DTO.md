---
created_at: 2026-07-05
updated_at: 2026-07-05
tags:
  - entity
  - vo
  - dto
  - design-pattern
  - domain
---

# Entity, VO, DTO

## 들어가며

개발을 하다보면 데이터 클래스로 만드는 3가지의 클래스가 나온다. Entity와 VO와 DTO를 쓰다 보다보면 관성적으로 이 위치에선 Entity, 여기선 VO, 여기서는 DTO라는 이름의 객체를 생성해서 사용하게 된다.

셋 다 데이터를 담는 객체지만 도대체 왜 이름을 나눠 쓰고, 구별해서 쓰는 것인지에 대해 한번쯤 짚고 넘어가는게 좋을거 같아서 작성하게 되었다.



## Entity

>식별자(ID)로 구분되고, 시간에 따라 상태가 변하는 객체

엔티티는 고유한 식별자(보통 ID)로 구분되는 객체이다. 데이터 클래스 안의 다른 속성이 바뀌어도 ID가 같으면 같은 객체이고, 생성부터 소멸까지 상태가 변하는 생명주기를 갖는다.

```kotlin
@Entity
class Person(
    @Id @GeneratedValue
    val id: Long? = null,
  	var name: String,
  	var age: Int,
)
```

만약 상태가 `status = INIT`에서 `status = PAID`로 바뀌어도 동일한 주문이다. 동등성도 ID로만 판단한다. 이름과 나이가 같은 사람이 2명 있더라도 다른 사람인 것처럼, 값이 아니라 식별자의 동등성이 중요하다.

```kotlin
@Entity
class Person(
    @Id @GeneratedValue
    val id: Long? = null,
    var name: String,
    var age: Int,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is Person) return false
        return id != null && id == other.id
    }

    override fun hashCode(): Int = id?.hashCode() ?: 0
}

val person1 = Person(1, "Peter", 10)
val person2 = Person(1, "Peter", 11)

person1 == person2 // true

val person3 = Person(1, "Peter", 11)
val person4 = Person(2, "Peter", 11)

person3 == person4 // false
```

> [!IMPORTANT]
>
> 엔티티의 `equals`과 `hashCode`는 모든 필드가 아니라 식별자 기준으로 해야한다.



## VO(Value Object)

> 식별자 없이 값 자체가 정체성인 불변 객체

VO는 식별자가 없고, 가진 값들이 정체성인 객체를 말한다. 모든 속성이 같으면 같은 객체이고, 원칙적으로는 **불변 객체**이다.

```kotlin
@Embeddable
data class Money(
    val amount: Long,
    val currency: Currency,
) {
    operator fun plus(other: Money): Money {
        require(currency == other.currency) { "서로 다른 통화는 더할 수 없습니다." }
        return Money(amount + other.amount, currency)
    }
}
```

`Money(1000, KRW)`는 어디에서 만들고 사용하던 간에 언제나 동일한 1000원이다. `Money(5000, KRW)`객체를 만든다고 해도 1000원을 바꾸는게 아니라 5000원 객체를 새로 만드는 느낌이다.

### VO의 장점

1. **원시 타입의 과용으로 인한 컴파일 에러를 줄일 수 있다.**

```kotlin
fun charge(userId: Long, amount: Long) { ... }

// 옳은 코드
charge(1_000, 50_000)		// ID가 1000인 유저가 5만원을 결제하다.

// 에러가 있는 코드
charge(50_000, 1_000)		// ID가 50000인 유저가 1천원을 결제한다
```

두 값은 순서만 바뀌어도 대참사가 일어나게 된다.

```kotlin
@JvmInline 
value class User(val userId: Long)

@JvmInline 
value class Money(val amount: Long)

fun charge(user: User, amount: Money) { ... }

val user = User(1_000)
val money = Money(50_000)

// 옳은 코드
charge(user, money)		// ID가 1000인 유저가 5만원을 결제하다.

// 에러가 있는 코드
charge(money, user)		// Error
```

아예 잘못된 데이터가 들어가는걸 컴파일 시점에서 막을 수 있다.

2. **검증 로직이 한곳에 모을 수 있다.**

```kotlin
@JvmInline
value class Email(val value: String) {
    init {
        require(value.contains("@")) { "잘못된 이메일 형식: $value" }
    }
}
```



## DTO(Data Transfer Object)

> 계층과 시스템 경계를 넘어 데이터를 옮기는 객체

Controller와 Service 사이처럼 시스템 혹은 계층간의 데이터 전달이 목적인 객체이다. 로직 없이 데이터를 담기만 한다.

```kotlin
data class CreateOrderRequest(
    val productId: Long,
    val quantity: Int,
)

data class OrderResponse(
    val orderId: Long,
    val status: String,
    val totalAmount: Long,
)
```

> [!NOTE]
>
> 단, validation 자체는 허용되지만, 무언가를 처리하기 시작하는 비즈니스 로직은 넣지 않아야한다. 검증 로직도 가급적이면 지양해야한다.

```kotlin
// 혀옹된다
data class CreateOrderRequest(
    val productId: Long,
    val quantity: Int,
) {
    init {
        require(quantity > 0) { "주문 갯수가 0 이하일 수 없습니다." }
    }
}

// DTO 내에서 자체적으로 새로운 결과를 도출해 내기 때문에 권장되지 않는다.
data class CreateOrderRequest(
    val productId: Long,
    val quantity: Int,
) {
    val finalPrice get() = price * (1 - discountRate)
}
```


## VO와 DTO의 차이
 둘 다 `data class`라 가장 많이 혼동되기 때문에 한번 정리한다.

| 구분     | VO            | DTO              |
| ------ | ------------- | ---------------- |
| 목적     | 도메인 개념(값) 표현  | 계층·시스템 간 데이터 운반  |
| 행위(로직) | 가짐 (검증, 계산 등) | 없음 (단순 데이터)      |
| 동등성    | 값으로 판단, 의미 있음 | 보통 신경 쓰지 않음      |
| 위치     | 도메인 계층 안쪽     | 경계(API, 외부 통신)   |
| 불변성    | 원칙적으로 불변      | 상관없음 (관례상 불변 권장) |
요컨데, 둘의 차이는 보통 결정적 차이는 **로직의 유무**와 **구현 위치**다.

같은 이메일 문자열이라도, API 요청 바디에 담겨 들어오면 DTO의 필드고, 도메인 안에서 검증된 `Email` 타입으로 다뤄지면 VO다. 
형태가 아니라 무엇을 위해, 무엇을 책임지느냐에 따라 달라진다.


## Entity를 data class로 만들지 않는 이유

`data class`는 모든 프로퍼티 기반으로 `equals`/`hashCode`를 생성하는데, 이건 값이 같으면 같은 객체라 라는 의미의 VO의 equal이지, 식별자가 같으면 같은 객체다 라는 엔티티의 equal이 아니다.

JPA의 지연 로딩 프록시나 컬렉션과 같이 쓰면 버그로 이어질 수 있으므로 쓰지 않는다.

## 참고문헌
- [Entity vs DTO vs VO 개념 및 차이점 정리(with. 역할 분리)](https://dev-jwblog.tistory.com/148)
- [DTO와 VO 그리고 Entity의 차이 | 기록하는개발자](https://youngjinmo.github.io/2021/04/dto-vo-entity/)
- [DTO vs VO vs Entity](https://velog.io/@ygreenb/DTO-VO-Entity)