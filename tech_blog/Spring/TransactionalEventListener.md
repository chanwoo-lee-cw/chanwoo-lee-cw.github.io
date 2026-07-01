---
created_at: 2026-07-02
updated_at: 2026-07-02
tags:
  - spring
  - transaction
  - event
  - event-listener
---

# TransactionalEventListener

## `@TransactionalEventListener` 어노테이션이란?

> `@TransactionalEventListener` 는 Spring에서 트랜잭션의 상태에 따라 이벤트를 처리할 수 있게 해주는 어노테이션입니다.

`@TransactionalEventListener` 는 데이터베이스 트랜잭션이 완료되는 시점(커밋, 롤백 등)에 따라 이벤트를 처리할 수 있습니다.

즉, 트랜젝션의 종료를 기준으로 이벤트의 실행 시점을 제어하기 위한 방법이다.



## 동작 시점

| phase              | 설명                                                    |
| ------------------ | ------------------------------------------------------- |
| `AFTER_COMMIT`     | **기본값.** 트랜잭션이 정상적으로 커밋된 후 이벤트 실행 |
| `AFTER_ROLLBACK`   | 트랜잭션이 롤백된 후 이벤트 실행                        |
| `AFTER_COMPLETION` | 트랜잭션의 커밋 또는 롤백 후 무조건 실행                |
| `BEFORE_COMMIT`    | 트랜잭션이 커밋되기 직전에 실행                         |



## 활용 예제

### 오더 후 이메일 발송 Slack 발행

```kotlin
data class OrderCreateSlackEventDto(
    val orderId: Long,
  	val userName: String
   	val userEmail: String
  	val orderPrice: BigInteger,
) : ApplicationEvent(orderId)
```

```kotlin
@Service
class OrderService(
  	private val orderRepository: OrderRepository
    private val publisher: ApplicationEventPublisher
) {
    @Transactional
    fun createOrder(orderDto: OrderDto) {
      	val order = Order.from(orderDto)
        orderRepository.save(order)
        publisher.publishEvent(OrderCreateSlackEvent(order.id))
    }
}
```

```kotlin
@Component
class OrderEventHandler {
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    fun sendOrderCreateSlackMessage(eventDto: OrderCreateSlackEvent) {
      	// TODO 슬랙 발송 이벤트 추가
    }
}
```

`createOrder`가 전부 끝나고, 커밋이 완료된 이후에  `sendOrderCreateSlackMessage` 메소드가 실행이 된다.

-> 즉, 정상적으로 커밋된 경우에만 알림이 전송된다.



### 이슈 발생시 클린 업

```kotlin
@Component
class CleanupHandler {
    @TransactionalEventListener(phase = TransactionPhase.AFTER_ROLLBACK)
    fun cleanupAfterFailure(event: OrderCreatedEvent) {
        println("주문 생성 실패. 임시 파일 삭제 등 정리 작업 수행")
    }
}
```



## 동작 원리

`@TransactionalEventListener` 는 `TransactionSynchronizationManager` 에 등록되어, 트랜잭션 완료 시점에 맞춰서 실행된다.

즉, 아래와 같은 순서로 처리된다.

1. `@Transactional` 메서드 실행
2. `publishEvent()` 호출
3. 이벤트는 곧바로 실행되지 않고, “트랜잭션이 끝났을 때 실행할 작업”으로 큐에 등록됨
4. 커밋/롤백 시점에 phase 조건에 따라 실제 실행됨

그래서, 만약 트랙젝션이 실행되지 않으면 실행되지 않는다. 예를 들면, 아예 트랜젝션으로 감싸지지 않은 메소드나, 트랜젝션으로 감싸져 있더라도 DB 접근을 하는 등의 트렌젝션을 실행하지 않으면 실행되지 않는다.

하지만, 이런 경우에도 실행하는 방법은 있는데, `fallbackExecution = true` 옵션으로 트랜잭션 외부에서 실행 할 수 있다.

```kotlin
@TransactionalEventListener(fallbackExecution = true)
fun handleWithoutTx(event: SomeEvent) {
    println("트랜잭션이 없어도 실행됨")
}
```



## ApplicationEvent

> Spring에서 발생하는 이벤트를 나타내는 객체, 해당 이벤트를 객체로 만들어서 다른 컴포넌트가 처리할 수 있도록 한다.

즉, 이벤트를 `Publisher → Event → Listener` 순서를 통해 비동기적으로 처리할 수 있도록 한다.

1. 서비스A가 서비스B를 직접 호출하지 않고, 이벤트를 통해 전달함으로써 결합도를 낮출 수 있다.
2. 비동기 처리
3. Spring 내부 알림 시스템으로도 사용 가능하다.



### ApplicationEvent의 기본 구조

```java
public class MyEvent extends ApplicationEvent {
    private final String message;

    public MyEvent(Object source, String message) {
        super(source);
        this.message = message;
    }

    public String getMessage() {
        return message;
    }
}
```

Spring 4.2 이전까지는 반드시 `ApplicationEvent` 클래스를 상속해야 했지만, 그 이후 버전부터는 단순히 data 클래스도 정상적으로 작동한다.



```kotlin
data class OrderCreateSlackEvent(
    val orderId: Long,
  	val userName: String
   	val userEmail: String
  	val orderPrice: BigInteger,
) : ApplicationEvent(orderId)
```

```kotlin
data class OrderCreateSlackEvent(
    val orderId: Long,
  	val userName: String
   	val userEmail: String
  	val orderPrice: BigInteger,
)
```

위의 두 클래스는 이벤트 발행하는 기능으로는 동일하게 기능한다.

안 붙혔더라도 내부적으로 동일하게 `ApplicationEvent`를 붙혀서 처리한다.



## ApplicationEventMulticaster

> Spring 내부에서 ApplicationEventPublisher가 이벤트를 publish 하면, 리스너들에게 이벤트를 broadcast 하는 주체

`Publisher → Event → ApplicationEventMulticaster →  Listener` 흐름으로 처리한다.



## 참고 문헌

- [https://wildeveloperetrain.tistory.com/246](https://wildeveloperetrain.tistory.com/246)
- [https://mangkyu.tistory.com/292](https://mangkyu.tistory.com/292)
- [https://blog.naver.com/gngh0101/222020512119](https://blog.naver.com/gngh0101/222020512119)