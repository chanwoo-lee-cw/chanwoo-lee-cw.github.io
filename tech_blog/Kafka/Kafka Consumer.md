---
created_at: 2026-07-05
updated_at: 2026-07-05
tags:
  - kafka
  - consumer
  - message-queue
---

# Kafka Consumer

## Kafka Consumer란?

> Kafka Broker속에 있는 카프카 토픽의 데이터를 가져와 소비하는 클라이언트



## 기본 개념

- 컨슈머는 Kafka 토픽에 발행된 레코드를 구독하고, poll()을 통해 메세지를 가져온다.
  - Kafka는 Pull 방식
- 풀링 구조로 동작하기 때문에 푸시 방식과는 달리 컨슈머가 원하는 속도로 데이터를 가져올 수 있다.

 

## 카프카의 컨슈머 그룹

컨슈머 그룹은 동일한 그룹 ID를 동유하는 소비자 그룹이다. 같은 그룹의 소비자가 토픽을 소비하면 모든 기록이 단 한명의 소비자에게만 전달된다.

각 토픽은 하나 이상의 파티션으로 구성되는데, 새로운 소비자가 시작되면 컨슈머 그룹에 가입하며 되며, 카프카는 각 파티션이 해당 그룹의 컨슈머만 소비하도록 보장한다.

따라서, 두개의 파티션이 있고 한 그룹에 하나의 컨슈머만 있다면 그 컨슈머는 두 파티션의 레코드를 모두 소비하게 된다.



### 컨슈머 그룹과 파티션 배분

- 컨슈머 그룹을 사용해 여러 인스턴스가 파티션 별로 메세지를 분산 처리할 수 있다.
- **각 파티션은 동일 그룹 내에서 하나의 컨슈머에게만 할당**된다.
- 그룹 내 **컨슈머 수 > 파티션**인 경우, 일부는 **유후 상태**가 된다.
- 서로 다른 컨슈머 그룹이라면 동일 메세지를 독립적으로 읽을 수 있다.
  - 예를 들면, 회원가입을 처리하는 부분과, 회원가입 요청이 왔다고 내부에 알려주는 시스템은 별개의 컨슈머 그룹으로 설정



### 파티션 할당 및 리밸런싱

- Consumer가 조인하거나 떠날때, Kafka는 `Coordinator`가 `Partition`을 재분배한다.
- 리밸런싱은 일시적으로 메세지들을 파티션으로 재배치하기 때문에 Consume 중단이 일어날 수 있다.

- 파티션 할당 계획

  - Range : 각 토픽 파티션에 묶어서 돌아가며 할당한다.

  - Round-Robin : 모든 토픽의 파티션을 합쳐서 정렬한 다음에 각각 소비자에게 분배한다.



### Offset 커밋 전략

- `enable.auto.commit` = true 일 때는 consumer가 poll() 후 일정 주기로 자동 커밋 (default: 5초)
  - 단점: 중복 처리 혹은 유실 가능성 있다.
- 수동 커밋 (`commitSync`, `commitAsync`)를 사용할 경우 **정확히 한 번 처리**를 구현하기 위해 처리 완료 후 커밋



## 카프카 컨슈머의 주요 속성

- `bootstrap.server` : 연결할 브로커의 주소 목록. 전체적인 주소를 넣을 필요는 없고, 소비자가 나머지 브로커를 파악할 수 있을 정도만 입력해도 충분하다.
- `key.deserializer` : 레코드의 키를 역직렬화 하는 클래스 지정. 스트링 -> 자바의 클래스로 역 직렬화
- `value.deserializer` : 레코드의 값을 역직렬화하는 클래스를 지정
- `group.id` : 현재 자신이 속해 있는 소비자 그룹의 ID, 전체 클러스터 내에서 유일해야한다.
- `enable.auto.commit` : 폴링 후 자동으로 offset 커밋할지 여부 결정
- `max.poll.records` : poll 호출시 최대 가져올 레코드 수 지정
- `max.poll.interval.ms` : 연속적인 `poll()` 





## 참고 문헌

- [https://www.instaclustr.com/blog/a-beginners-guide-to-kafka-consumers]
- [https://developer.confluent.io/courses/architecture/consumer-group-protocol](https://developer.confluent.io/courses/architecture/consumer-group-protocol)