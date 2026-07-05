---
created_at: 2026-07-05
updated_at: 2026-07-05
tags:
  - outbox
  - design-pattern
  - msa
  - event-driven
  - transaction
---

# Outbox 패턴

## 들어가며

이전 회사에서 "DB에 데이터를 저장한 뒤 Kafka로 이벤트를 발행"하는 흐름을 설계한 적이 있다. 그때 가장 먼저 떠올랐던 문제는 DB 트랜잭션이 롤백됐는데 Kafka 메시지는 발행이 성공하는 경우였다. 그래서 TransactionalEventListener(AFTER_COMMIT)을 활용해, DB 커밋이 완료된 뒤에 Kafka 발행이 일어나도록 처리했다.

하지만 시간이 지나서 다시 생각해보니, 다른 경우, 즉 DB 커밋은 성공했는데 Kafka 발행이 실패하는 경우나 발행 직후 서버가 다운되는 경우는 생각하지 못했고, Kafka의 가용성을 지나치게 신뢰했고, 반대로 서버가 다운되는 경우 등등의 다양한 이슈를 상정 못했다는걸 알게 되었다.

그래서 그 부분에 대해 찾다가 Outbox 패턴을 알게 되었다. 그래서 이번엔 Outbox 패턴에 대해 공부해보았다.


## Outbox 패턴이란?

> DB 커밋과 Kafka 발행 같은 원자적으로 묶을 수 없는 문제를, 하나의 트랜잭션 안에 이벤트 발행의도를 같이 기록함으로써 해결한다.

즉, DB 트랜잭션과 메시지 브로커 사이의 일관성을 보장하기 위해 사용하는 패턴이다.

## 문제 상황

```kotlin
@Transactional
fun saveOrder(dto: OrderDto, items: List<LineItem>) {
    orderRepository.save(dto)           // DB INSERT
    kafkaTemplate.send(                 // Kafka publish
        "stock-change",
        StockChangeEventVo()
    )
}
```

이렇게 작성하면 아래와 같은 문제가 발생할 수 있다.

1. DB INSERT -> 성공, Kafka publish -> 실패
   - DB에 주문은 저장되었지만, Kafka 메시지는 발행이 안된다. 즉, 주문과 재고의 불일치
2. DB INSERT -> 실패, Kafka publish -> 성공
   - 아예 `orderRepository.save(dto)`에서 문제가 발생했으면 다행이지만, 그 이후의 DB 커밋하는 와중에 실패. 즉, 주문은 생성되지 않았지만 재고는 감소
3. Kafka publish 직후에 서버 다운
   - Kafka에 메시지를 보냈지만 ack를 받기 전에 죽으면, 재시도 시 중복 발행 위험이 생긴다. 상태를 알 수 없는 구간이 발생.

> **Dual Write** 문제란?
> 서로 다른 두 저장소(DB, Kafka)에 동시에 쓰는 작업의 원자성을 보장할 수 없는 문제를 말한다.

## 동작 원리

### 핵심 특징

트랜잭션 내에서 메시지 브로커에 직접 발행하는 것이 아니라, **발행할 메시지를 같은 DB의 outbox 테이블에 함께 INSERT**한다. 이후 별도 프로세스(Outbox Relay)로 이 테이블을 읽어서 메시지 브로커에 발행한다.

```kotlin
@Transactional
fun saveOrder(dto: OrderDto, items: List<LineItem>) {
    orderRepository.save(dto)           // DB INSERT

    outboxRepository.save(
        OutboxEvent(
            aggregateType = "Order",
            aggregateId = orderId,
            eventType = "StockChange",
            schemaSubject = "stock-changes-value",
            schemaVersion = 1,
            payload = objectMapper.writeValueAsString(event),
            createdAt = Instant.now(),
            publishedAt = null,
        )
    )
    // 두 INSERT가 같은 트랜잭션에서 atomic하게 커밋됨
}
```

즉, 두 기능은 같은 트랜잭션이라 같은 ACID로 묶인다. 또한, 별도의 프로세스, 즉 OutBox Relay가 아웃박스 테이블을 풀링해서 메시지를 발행합니다.

### OutboxEvent 스키마

실무에서 자주 쓰는 필드 구성은 대략 다음과 같다.

| 필드 | 설명 |
|---|---|
| `aggregateType` | 이벤트가 속한 도메인 (예: `Order`, `Payment`) |
| `aggregateId` | aggregate 식별자 (파티션 키로도 활용) |
| `eventType` | 이벤트 종류 (예: `StockChange`, `OrderCreated`) |
| `schemaSubject` | Schema Registry에서 스키마의 키 |
| `schemaVersion` | 어느 버전 스키마인지 |
| `payload` | 이벤트 내용 |
| `createdAt` | 생성 시간 |
| `publishedAt` | 발행 완료 시간 |

## 장단점

### 장점

1. Dual Write 문제 해결

DB 저장 -> Kafka 발행을 순차적으로 하면 둘 중 하나가 실패해서 데이터 불일치 상황이 발생한다. 이때 Outbox 이벤트 기록 자체가 하나의 트랜잭션의 일부가 되서 반드시 기록된다는걸 보장한다

2. At-least-once 보장

반대로 메시지 브로커가 장애가 나서 메시지가 유실이 되는 경우에 DB에 남아있기 때문에 메시지를 재전송하면 된다. 결제/주문 처럼 유실이 치명적인 도메인에서 특히 중요하다.

3. 메시징 인프라와 디커플링

서비스 로직 입장에서는 Kafka 클라이언트의 가용성/지연을 신경쓸 필요가 없다. DB에서 해당 메시지를 삭제하지 않는 한 비즈니스 트랜잭션은 성공한다.

4. 이벤트 재처리 / 감사 추적

outbox 테이블이 사실상 이벤트 로그라서, 디버깅이나 특정 시점부터의 재발행이 용이하다


### 단점

1. 복잡도 증가

릴레이 프로세스(폴링 워커 또는 Debezium 같은 CDC)가 추가된다. 
추가되는게 많은 만큼 운영해야 할 부분이 증가하고, 에러 추적이나 발생할 부분이 늘어난다.

1. 발행 지연

폴링 방식이면 폴링 주기만큼, CDC 방식이어도 binlog가 흘러가는 시간만큼 지연이 필연적으로 생길수 밖에 없고, 실시간성이 매우 중요한 케이스에는 부담.

3. 중복 발행 가능성

릴레이가 발행 후 "발행 완료" 마킹 직전에 죽으면 다음 사이클에서 같은 메시지를 보내기 때문에. 결국 컨슈머에서 재처리를 막는 기능, 즉 멱등성(idempotency)이 필수

4. 순서 보장의 어려움

멀티 인스턴스로 릴레이를 돌리면 발행 순서가 꼬일 수 있고, 같은 aggregate에 대한 이벤트 순서를 보장하려면 파티션 키 설계나 단일 릴레이 같은 추가 제약이 필요하다.

5. outbox 테이블 관리 비용

계속 쌓이면 테이블이 비대해지고 폴링 쿼리 성능이 떨어집니다. 발행 완료된 row를 주기적으로 아카이빙/삭제하는 배치가 필요해요. 트래픽이 높으면 outbox 테이블 자체의 관리 자체가 부담이 된다.

6. DB 부하 증가

모든 이벤트 발행이 DB write를 동반하니, 메시지 자체를 Kafka에 바로 쏘는 것보다 DB write 부하가 커진다.

## 폴링 vs CDC

Outbox 패턴에서 이벤트를 누가 Kafka로 발행하느냐가 차이

### 폴링(Polling) 방식

```kotlin
@Scheduled(fixedDelay = 1000)  // 1초마다
fun publishOutboxEvents() {
    val events = outboxRepository.findUnpublished(limit = 100)
    events.forEach { event ->
        kafkaTemplate.send(event.topic, event.payload)
        outboxRepository.markPublished(event.id)
    }
}
```

스케줄러나 Batch Job으로 정기적으로 outbox 테이블을 SELECT하는 방식이다.

**장점**

쉬운 구현
- Spring @Scheduled나 Quartz로 금방 만들 수 있다.
- 별도 인프라 필요 없음.

**단점**

지연 :
- 폴링 주기만큼 이벤트 발핼이 늦어진다.
- 평균적으로 폴링 주기의 1/2 만큼 지연이 발생

DB 부하 :
- 발행된 이벤트가 없어도 계속 테이블 조회. 
- 단점을 해소하고자 폴링 주기를 늘리면 지연이 늘어남

확장성:
- 워커를 여러대 띄우면 이벤트 중복 발행 문제


### CDC방식

DB의 트랜잭션 로그(MySQL의 binlog, PostgreSQL의 WAL)를 직접 읽어서 변경 사항을 캡처한다. 대표적 도구가 Debezium
```
[MySQL] → binlog → [Debezium Connector] → [Kafka Connect] → [Kafka 토픽]
```
outbox 테이블에 INSERT가 발생하면, binlog에 기록되고, Debezium이 그걸 거의 실시간으로 읽어서 Kafka로 흘려보낸다.

**장점**

실시간 메시지 :
- 폴링과 달리 binlog가 발생하는 순간 캡처하고 메시지를 발행하기 때문에 수십ms 정도의 지연 밖에 없다.

DB에 부하 거의 없다 :
- DB를 조회하는게 아니라, 로그를 읽는거라 DB에 부하가 거의 없다.

순서 보장 :
- binlog 순서 = 트랜잭션 커밋 순서

**단점**

인프라 복잡도:
- 구현이 어렵다.
- Kafka Connect 클러스터, Debezium 설정, 스키마 레지스트리 등 운영할 게 많다

장애 시 디버깅 어려움: 
- 추상화 계층이 많아서 어디서 막혔는지 추적이 힘들다.
```
[MySQL] 
   ↓ (binlog 생성)
[MySQL binlog 파일]
   ↓ (Debezium이 replica인 척 streaming)
[Debezium Connector]
   ↓ (Kafka Connect Worker 위에서 동작)
[Kafka Connect 클러스터]
   ↓ (변환, 직렬화)
[Schema Registry] (스키마 검증)
   ↓
[Kafka 토픽]
   ↓
[Consumer]
```

Avro + Schema Registry 사용 시 스키마 변경시 생길 수 있는 문제들:
- NOT NULL 컬럼을 default 없이 추가 : BACKWARD 호환성 위반. 예전 Producer가 보낸 메시지를 새 Consumer가 읽을 수 없다.
- 컬럼 삭제 : FORWARD 호환성 위반. 새 Producer가 보낸 메시지를 예전 Consumer가 읽을 수 없다.
- 컬럼 타입 변경 : FULL 호환성 위반. 타입이 바뀌면 직렬화에 문제가 생긴다.
- 컬럼명 변경 : FULL 호환성 위반. 사실 amount 필드 삭제 + total_amount 필드 추가와 다르지 않다.

## 풀링 vs. CDC

| 상황 | 기술 |
|---|---|
| 트래픽이 많지 않고 빠르게 시작하고 싶은 경우 | 폴링 |
| 실시간성과 DB 부하 절감이 둘 다 중요한 경우 | CDC |


> [!IMPORTANT]
> 사실 중요한 것은 어느쪽이던 Consumer 측에서 멱등성 처리가 중요하다
