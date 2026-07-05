---
created_at: 2026-07-05
updated_at: 2026-07-05
tags:
  - kafka
  - producer
  - message-queue
---

# Kafka Producer

## Kafka Producer란?

> 사용자가 작성한 이벤트를 **파티션 단위 로그**에 기록하여 브로커에 전달하는 클라이언트 컴포넌트.
> 아파치 카프카 생태계 내에서 카프카 Topic에 메세지를 전송하는 클라이언트 애플리케이션.


## 카프카 프로듀서의 주요 업무

- **직렬화(Serialization)**: 메세지 키와 값을 바이트 배열로 변환.
- **파티셔닝(Partitioning)**: 각 레코드가 어떤 파티션으로 이동해야 하는지 결정.
- **배치, 압축(Batching & Buffering)**: 네트워크 사용을 최적화하기 위해 메세지를 그룹화.
- **재시도 및 오류 처리(Retries & Error Handling)**: 일시적인 실패 시 자동 재시도.
- **확인(acks)** : Kafka가 메세지 수신을 확인하는 기준.
  - `acks=0` : 프로듀서는 메세지를 보내고 수신 확인을 기다리지 않는다.
  - `acks=1` : 리더 브로커가 받아 저장하면 성공으로 친다.
  - `acks=all`(=`-1`) : 리더와 **ISR(In-Sync Replicas)에 속한 복제본**이 메세지를 저장해야 성공으로 간주한다. (모든 복제본이 아니라 동기화된 복제본 기준)


## 주요 구성 및 매개변수

- `bootstrap.servers` : 연결할 카프카 브로커의 주소 목록.
- `key.serializer` , `value.serializer`: 키와 값 객체를 바이트 배열로 직렬화하는 클래스.
	- 즉, 시리얼라이즈를 커스텀으로 하는 방법
- `batch.size`  : 파티션별 배치의 최대 크기(바이트)(즉, 한 파티션으로 보낼 메세지가 이 크기만큼 쌓이면 배치를 전송한다.)
- `linger.ms` : 배치를 보내기 전 대기 시간(즉, 배치가 가득 차지 않아도 이 시간이 지나면 전송한다.)
- `buffer.memory` : 프로듀서가 버퍼링할 수 있는 총 메모리.
- `enable.idempotence` : 중복 메세지 전송을 방지하고 파티션 단위로 정확히 한 번 기록을 보장하는 설정. (기본값은 `true`이다.)
- `acks` : Kafka가 메세지 수신을 확인하는 기준.
- `max.in.flight.requests.per.connection` : 응답을 받지 않은 채 한 연결에 보낼 수 있는 최대 요청 수. (순서 보장과 직결, 아래 참고)
- `compression.type` : 메시지 배치 압축 알고리즘 (`none`, `gzip`, `snappy`, `lz4`, `zstd`).


## 카프카 프로듀서의 처리 단계

### 직렬화

카프카는 메세지를 바이트 배열로 전송하므로, 프로듀서는 키와 값을 바이트 배열로 변환한다. 이를 위해 `key.serializer`, `value.serializer`를 설정한다.
- `key.serializer` : 키를 직렬화하는 데 사용. 일반적으로 `StringSerializer`나 `LongSerializer`를 사용한다. 키는 파티션 구분을 위한 값이라 복잡할 필요가 없다.
- `value.serializer` : 메세지 값을 직렬화. 보통 구조가 복잡하므로 Avro, JSON 등을 사용한다. (스키마 진화 관리를 위해 Avro + Schema Registry 조합을 자주 쓴다.)


### 파티셔닝

각 토픽을 여러 파티션으로 나눠 데이터를 분산 저장한다. 프로듀서는 메세지를 어떤 파티션에 보낼지 결정한다.
- **키가 있는 경우** : 키의 해시값을 기반으로 파티션을 결정한다. → 같은 키는 항상 같은 파티션으로 가므로 **파티션 내 순서가 보장**된다.
- **키가 없는 경우** : 기본 파티셔너는 Sticky Partitioning을 사용한다.
	- 한 배치가 가득 찰 때까지 같은 파티션으로 몰아 보낸 뒤, 다음 배치는 다른 파티션으로 전환한다.
	- 배치를 더 알차게 채워 요청 수를 줄이고 지연을 낮추기 위함. (장기적으로는 파티션 간 분포가 고르게 수렴한다.)


### 배치 및 압축

- **배치 크기(`batch.size`)**: 동일 파티션으로 보내는 메세지를 모아 하나의 배치로 전송한다.
- **지연 시간(`linger.ms`)**: 배치가 가득 차지 않아도 설정 시간 동안 메세지를 모아 배치를 만든다.
- **버퍼 메모리(`buffer.memory`)**: 프로듀서가 버퍼링할 수 있는 총 메모리. 버퍼가 가득 차면 `send()`가 블록되거나 `max.block.ms` 후 예외가 발생한다.
- **압축 유형(`compression.type`)**: 배치를 압축해 네트워크 사용량을 줄인다. (`none`, `gzip`, `snappy`, `lz4`, `zstd`)


### 재시도 및 오류 처리

- **재시도 횟수(`retries`)**: 전송 실패 시 재시도할 최대 횟수. 기본값 `Integer.MAX_VALUE`.
- **재시도 간격(`retry.backoff.ms`)**: 재시도 간 대기 시간. 기본값 100ms.
- **전송 시간 제한(`delivery.timeout.ms`)**: 전송이 성공/실패로 확정되기까지의 최대 시간. 기본값 120000ms(2분). `retries`가 매우 크더라도 실질적인 상한은 이 값이 결정한다.

**재시도와 순서 보장**
멱등성을 끈 상태(`enable.idempotence=false`)에서 `retries > 0`이고 `max.in.flight.requests.per.connection > 1`이면, 재시도 과정에서 **메세지 순서가 뒤바뀔 수 있다.**
(예: 요청 1 실패 → 요청 2 성공 → 요청 1 재전송 성공 → 1이 2 뒤에 기록됨)


> [!NOTE]
> `enable.idempotence` : 브로커가 시퀸스 넘버로 순서를 이중으로 확인한다.

### 확인 (acks)

- **`acks=0`**: 브로커의 Ack을 기다리지 않고 전송. 가장 빠르지만 메세지 손실 가능성이 있다.
- **`acks=1`**: 리더 브로커가 수신하면 Ack을 리턴한다. 리더 장애 시 아직 복제되지 않은 메세지는 손실될 수 있다.
- **`acks=all`(=`-1`)**: 리더와 **ISR에 속한 복제본**이 모두 수신해야 Ack을 리턴한다. 가장 높은 내구성, 가장 큰 지연.
	- 흐름: 리더가 메세지를 받으면 ISR 팔로워들이 이를 복제하고, ISR 조건(`min.insync.replicas`)을 충족하면 리더가 프로듀서에 최종 Ack을 보낸다.
	- `min.insync.replicas`와 함께 봐야 한다. 
	    - 예) `replication.factor=3`, `min.insync.replicas=2`이면 ISR이 2개 미만으로 떨어졌을 때 `acks=all` 쓰기는 실패한다
	    - 내구성이 더 우선이기 때문



### 멱등성 (Idempotence)

`enable.idempotence=true`이면 프로듀서가 **정확히 한 번** 기록되도록 보장한다(파티션 단위, 재시도로 인한 중복 방지).

- 동작 원리: 프로듀서마다 **PID(Producer ID)**를 부여하고, 각 (파티션) 메세지에 **시퀀스 넘버**를 붙인다. 브로커는 이미 받은 시퀀스보다 작거나 같은 메세지는 중복으로 보고 버리고, 갑자기 건너뛴 시퀀스는 거부한다. → 중복 제거 + 순서 보장.
- 활성화 시 `acks=all`, `retries>0`, `max.in.flight<=5`가 자동으로 적용된다.
- 단, 이는 **하나의 프로듀서 세션 + 단일 파티션** 범위의 보장이다. 여러 파티션/여러 메세지를 원자적으로 묶거나, 컨슈머→프로듀서 흐름까지 정확히 한 번을 보장하려면 **트랜잭션**이 필요하다.



### 트랜잭션 / EOS (Exactly-Once Semantics)

`transactional.id`를 설정하면 여러 파티션에 대한 쓰기를 하나의 원자적 트랜잭션으로 묶을 수 있다.

- `initTransactions()` → `beginTransaction()` → ... → `commitTransaction()` / `abortTransaction()`.
- 컨슈머 쪽에서 `isolation.level=read_committed`로 읽으면 커밋된 트랜잭션의 메세지만 소비한다.
- consume → process → produce 패턴(읽고 처리해 다시 produce)을 트랜잭션으로 묶고, 오프셋 커밋(`sendOffsetsToTransaction`)까지 같은 트랜잭션에 포함하면 **end-to-end exactly-once**가 성립한다.



## 참고 문헌

- https://gradus.tistory.com/75
- https://always-kimkim.tistory.com/entry/kafka101-producer
- [https://notes.kodekloud.com/docs/Event-Streaming-with-Kafka/Kafka-Producers-Consumers-The-Message-Flow/What-is-a-Kafka-Producer](https://notes.kodekloud.com/docs/Event-Streaming-with-Kafka/Kafka-Producers-Consumers-The-Message-Flow/What-is-a-Kafka-Producer)
- [https://kafka.apache.org/documentation/#producerconfigs](https://kafka.apache.org/documentation/#producerconfigs)
