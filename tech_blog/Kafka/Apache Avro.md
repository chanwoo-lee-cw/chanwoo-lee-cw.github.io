---
created_at: 2026-07-05
updated_at: 2026-07-05
tags:
  - kafka
  - avro
  - serialization
  - schema
---

## Apache Avro

## Apache Avro란?

> Avro란 Apache에서 만든 **데이터 직렬화 시스템**으로써, 다량의 데이터를 효율적으로 저장하고 관리하기 위한 개방형 데이터 직렬화 프레임워크이다.
>
> Avro는 **JSON 스키마를 동봉한 상태로 데이터를 직렬화**하기 때문에, 읽을 때 별도의 스키마 사전 지식 없이도 데이터를 해석할 수 있습니다



## 특징

- Avro의 스키마는 **JSON 형식으로 정의**된다.
  - 직관적이며 사람이 읽기 쉽다.
- 데이터 자체는 일반적으로 **바이너리 인코딩**으로 직렬화된다.
  - 저장 효율성과 파싱 속도가 매우 뛰어나다.



## Avro의 정의

```json
{
  "namespace": "example.avro",
  "type": "record",
  "name": "User",
  "fields": [
    { "name": "name", "type": "string" },
    { "name": "favorite_number", "type": ["null","int"], "default": null },
    { "name": "favorite_color",  "type": ["null","string"], "default": null }
  ]
}
```

- Avro Schema는 JSON을 사용하여 정의한다. 
- Avro는 primitive 타입(null, boolean, int, long, float, double, bytes, string)과 record, enum, array, map, union, fixed 같은 복합 타입(complex types) 으로 구성된다.



### 스키마 설명

- `name` : 스키마의 이름으로 필수 요소이다.(String 형태를 가진다.)
- `namespace` : 패키지의 이름으로 선택요소이다.(String 형태를 가진다.)
- `doc` : 스키마의 설명으로 선택요소이다(String 형태를 가진다.)
- `aliases` : 이 레코드에 대한 대체 이름으로 선택요소이다.(String List 형태를 가진다.)
  - 이름을 바꾼 경우 구버전 이름을 나열해서 변경 리스크를 줄일 수 있다.
- `fields` : 이 레코드의 대한 스키마 포멧으로 필드 리스트를 나열한다. 필수요소로써 (String 리스트를 가진다.)



### `fields`의 하위 데이터

- `name` : 해당 필드의 이름으로 필수 요소이다(String 형태를 가진다.)
- `doc` : 필드에 대한 설명으로 선택요소이다(String 형태를 가진다.)
- `type` : 필드의 타입, 타입 스키마를 여러개 넣을 수 있다. 필수요소이다
- `default` : 필드가 안 들어왔을 때 들어갈 기본값, 선택값이다. (type에 따라 타입은 다르다)
- `order`: 필드 비교 시 사용할 정렬 기준을 정의합니다.
    - `ascending` (기본), `descending`, `ignore` 중 하나를 설정할 수 있다.
    - 주로 정렬 또는 비교 연산을 수행할 때 사용되며, 직렬화 순서에는 영향을 주지 않습니다.



## Schema Registry

- 함께 사용하면 중앙에서 스키마를 관리하고, 스키마 버전 간 호환성을 체계적으로 통제할 수 있다.

- **Writer Schema**와 **Reader Schema**를 서로 다르게 정의해도, Avro 런타임이 자동으로 필드 추가, 제거, 타입 변환 등을 해결해 줍니다. 전방 및 후방 호환성을 지원한다.
- 스키마 호환성(Compatibility Mode)은 `BACKWARD`, `FORWARD`, `FULL`, `NONE` 등을 설정할 수 있습니다.
- 일반적으로 Kafka 환경에서는 `Subject`별로 스키마를 버전 관리하며, 각 Producer/Consumer는 스키마 ID를 통해 참조합니다.
- 호환되지 않는 변경(예: 필드 타입 변경, 필수 필드 추가)은 런타임 예외를 유발할 수 있으므로 관리 전략이 필요합니다.





## 참고 문헌

- [https://blog.techeer.net/카프카-메시지에-스키마를-정의해-보자-apache-avro-7162e250ae69](https://blog.techeer.net/카프카-메시지에-스키마를-정의해-보자-apache-avro-7162e250ae69)
- [https://unit-15.tistory.com/166](https://unit-15.tistory.com/166)
- [https://en.wikipedia.org/wiki/Apache_Avro](https://en.wikipedia.org/wiki/Apache_Avro)